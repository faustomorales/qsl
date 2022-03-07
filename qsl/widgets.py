# pylint: disable=missing-function-docstring,unused-argument,too-many-return-statements
import os
import json
import base64
import typing
import pathlib
import logging
import threading
import urllib.parse as up
import pkg_resources
import ipywidgets
import traitlets as t
from . import file_utils

TLS = threading.local()
LOGGER = logging.getLogger(__name__)


module_name = "qslwidgets"
module_version = json.loads(
    pkg_resources.resource_string("qsl", "labextension/package.json")
)["version"]

Point = t.Dict(per_key_traits={"x": t.Float(), "y": t.Float()})
LabelData = t.Dict(value_trait=t.List(t.Unicode()), key_trait=t.Unicode())
PolygonLabel = t.Dict(per_key_traits={"labels": LabelData, "points": t.List(Point)})
BoxLabel = t.Dict(per_key_traits={"labels": LabelData, "pt1": Point, "pt2": Point})
LabelConfig = t.Dict(
    per_key_traits={
        "name": t.Unicode(),
        "displayName": t.Unicode(),
        "options": t.List(
            t.Dict(
                per_key_traits={
                    "name": t.Unicode(),
                    "displayName": t.Unicode(),
                    "shortcut": t.Unicode(),
                }
            )
        ),
        "multiple": t.Bool(False),
        "freeform": t.Bool(False),
    }
)

Config = t.Dict(
    per_key_traits={"image": t.List(LabelConfig), "regions": t.List(LabelConfig)}
)
MaskLabel = t.Dict(
    per_key_traits={
        "map": t.Dict(
            per_key_traits={
                "dimensions": t.Dict(
                    per_key_traits={"width": t.Int(), "height": t.Int()}
                ),
                "serialized": t.Unicode(),
            }
        ),
        "labels": LabelData,
    }
)

Labels = t.Dict(
    per_key_traits={
        "image": LabelData,
        "polygons": t.List(PolygonLabel),
        "masks": t.List(MaskLabel),
        "boxes": t.List(BoxLabel),
    }
)
Base = t.Dict(
    per_key_traits={
        "url": t.Unicode(),
        "serverRoot": t.Unicode(),
    }
)

Buttons = t.Dict(
    {"next": True, "prev": True, "save": True, "config": True, "delete": True},
    per_key_traits={
        "next": t.Bool().tag(sync=True),
        "prev": t.Bool(),
        "save": t.Bool(),
        "config": t.Bool(),
        "delete": t.Bool(),
    },
)


class BaseImageLabeler(ipywidgets.DOMWidget):
    """A widget for labeling a single image."""

    _model_name = t.Unicode("ImageLabelerModel").tag(sync=True)
    _model_module = t.Unicode(module_name).tag(sync=True)
    _model_module_version = t.Unicode(module_version).tag(sync=True)
    _view_name = t.Unicode("ImageLabelerView").tag(sync=True)
    _view_module = t.Unicode(module_name).tag(sync=True)
    _view_module_version = t.Unicode(module_version).tag(sync=True)

    url = t.Unicode(allow_none=True).tag(sync=True)
    config = Config.tag(sync=True)
    labels = Labels.tag(sync=True)
    updated = t.Float().tag(sync=True)
    action = t.Unicode("").tag(sync=True)
    base = Base.tag(sync=True)
    progress = t.Float(-1).tag(sync=True)
    mode = t.Unicode("light").tag(sync=True)
    buttons = Buttons.tag(sync=True)
    metadata = t.Dict(value_trait=t.Unicode(), key_trait=t.Unicode()).tag(sync=True)


def file2str(filepath: str):
    file_size = os.stat(filepath)
    if file_size.st_size > 10e6:
        encoded = base64.b64encode(
            pkg_resources.resource_string("qsl", "assets/local-file-error.png")
        ).decode("utf8")
    else:
        with open(filepath, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf8")
    return "data:image;charset=utf-8;base64," + encoded


def build_url(target: str, base: dict):
    """Build a notebook file URL using notebook configuration and a filepath or URL."""
    if target is None:
        return None
    if target.lower().startswith("s3://"):
        s3 = file_utils.get_s3()
        segments = target.lower().replace("s3://", "").split("/")
        return s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": segments[0], "Key": "/".join(segments[1:])},
            ExpiresIn=3600,
        )
    if target.startswith("http://") or target.startswith("https://"):
        return target
    if target.startswith("data:"):
        return target
    if os.path.isfile(target):
        if not base or not base.get("serverRoot") or not base.get("url"):
            return file2str(target)
        relpath = os.path.relpath(target, os.path.expanduser(base["serverRoot"]))
        if os.name == "nt":
            relpath = pathlib.PureWindowsPath(relpath).as_posix()
        if ".." in relpath:
            return file2str(target)
        return up.urljoin(
            base["url"],
            os.path.join(
                "files",
                relpath,
            ),
        )
    raise ValueError(f"Failed to load file at target: {target}")


class ImageLabeler(BaseImageLabeler):
    def __init__(
        self,
        target: str = None,
        config=None,
        labels=None,
        on_next: typing.Callable = None,
        on_prev: typing.Callable = None,
        on_save: typing.Callable = None,
        on_delete: typing.Callable = None,
        allow_config_change: bool = True,
    ):
        super().__init__(
            config=config or {"image": [], "regions": []},
            labels=labels or {},
            buttons={
                "config": allow_config_change,
                "next": on_next is not None,
                "prev": on_prev is not None,
                "save": on_save is not None,
                "delete": on_delete is not None,
            },
        )
        self._target = target
        self._on_next = on_next
        self._on_prev = on_prev
        self._on_save = on_save
        self._on_delete = on_delete
        self._allow_config_change = allow_config_change
        self.observe(self.handle_base_change, ["base"])
        self.observe(self.handle_action_change, ["action"])
        self.observe(self.handle_updated_change, ["updated"])

    @property
    def on_next(self):
        return self._on_next

    @on_next.setter
    def on_next(self, on_next):
        self._on_next = on_next
        self.buttons = {**self.buttons, "next": on_next is not None}

    @property
    def on_delete(self):
        return self._on_delete

    @on_delete.setter
    def on_delete(self, on_delete):
        self._on_delete = on_delete
        self.buttons = {**self.buttons, "delete": on_delete is not None}

    @property
    def on_prev(self):
        return self._on_prev

    @on_prev.setter
    def on_prev(self, on_prev):
        self._on_prev = on_prev
        self.buttons = {**self.buttons, "prev": on_prev is not None}

    @property
    def on_save(self):
        return self._on_save

    @on_save.setter
    def on_save(self, on_save):
        self._on_save = on_save
        self.buttons = {**self.buttons, "save": on_save is not None}

    @property
    def allow_config_change(self):
        return self._allow_config_change

    @allow_config_change.setter
    def allow_config_change(self, allow_config_change):
        self._allow_config_change = allow_config_change
        self.buttons = {**self.buttons, "config": allow_config_change}

    @property
    def target(self):
        return self._target

    @target.setter
    def target(self, target):
        self._target = target
        if self.base:
            self.url = build_url(self.target, self.base)

    def handle_base_change(self, change):
        """Handles setting a correct URL for a local file, if and when
        the the page base configuration is received."""
        self.url = build_url(self.target, self.base)

    def handle_action_change(self, change):
        """Handles changes to the action state."""
        if not change["new"]:
            return
        if self._on_next and change["new"] == "next":
            self._on_next()
        if self._on_prev and change["new"] == "prev":
            self._on_prev()
        if self._on_delete and change["new"] == "delete":
            self._on_delete()
        self.action = ""

    def handle_updated_change(self, change):
        """Handles changes to the timestamp sentinel for saves."""
        if self._on_save:
            self._on_save()


class ImageSeriesLabeler(ImageLabeler):
    def __init__(self, images, config=None, allow_config_change=True):
        super().__init__(
            config=config,
            allow_config_change=allow_config_change,
            on_next=self.next,
            on_prev=self.prev,
            on_save=self.save,
            on_delete=self.delete,
        )
        self.images = images
        self.idx = 0
        self.update()

    def next(self):
        self.idx += 1
        self.update()

    def prev(self):
        self.idx -= 1
        self.update()

    def save(self):
        self.images[self.idx]["labels"] = self.labels
        self.next()

    def delete(self):
        if "labels" in self.images[self.idx]:
            del self.images[self.idx]["labels"]
        self.update()

    def update(self):
        self.idx = max(min(self.idx, len(self.images) - 1), 0)
        image = self.images[self.idx]
        self.target = image["target"]
        self.labels = image.get("labels", image.get("defaults", {}))
        self.metadata = image.get("metadata", {})
        self.buttons = {
            "prev": self.idx != 0,
            "next": self.idx != (len(self.images) - 1),
            "save": True,
            "config": self.allow_config_change,
            "delete": "labels" in image,
        }
        self.progress = (
            100
            * sum([1 if "labels" in image else 0 for image in self.images])
            / len(self.images)
        )
