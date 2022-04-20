# pylint: disable=too-many-ancestors,missing-function-docstring,unused-argument,too-many-return-statements
import os
import json
import base64
import typing
import pathlib
import logging
import threading
import urllib.parse as up

try:
    import cv2
    import numpy as np
except ImportError:
    cv2, np = None, None  # type: ignore
import pkg_resources
import ipywidgets
import typing_extensions as tx
import traitlets as t
from . import file_utils

TLS = threading.local()
LOGGER = logging.getLogger(__name__)
BASE64_PATTERN = "data:{type};charset=utf-8;base64,{data}"
Target = tx.TypedDict(
    "Target",
    {
        "idx": int,
        "target": typing.Union[str, np.ndarray],
        "type": tx.Literal["video", "image"],
        "metadata": dict,
        "visible": bool,
        "selected": bool,
        "ignored": bool,
        "labeled": bool,
        "labels": dict,
    },
)

module_name = "qslwidgets"
module_version = json.loads(
    pkg_resources.resource_string("qsl", "labextension/package.json")
)["version"]


class BaseImageLabeler(ipywidgets.DOMWidget):
    """A widget for labeling a single image."""

    _model_name = t.Unicode("ImageLabelerModel").tag(sync=True)
    _model_module = t.Unicode(module_name).tag(sync=True)
    _model_module_version = t.Unicode(module_version).tag(sync=True)
    _view_name = t.Unicode("ImageLabelerView").tag(sync=True)
    _view_module = t.Unicode(module_name).tag(sync=True)
    _view_module_version = t.Unicode(module_version).tag(sync=True)

    config = t.Dict(default_value={"image": [], "regions": []}, allow_none=True).tag(
        sync=True
    )
    states = t.List(default_value=[]).tag(sync=True)
    urls = t.List(default_value=[]).tag(sync=True)
    type = t.Unicode(default_value="image").tag(sync=True)
    transitioning = t.Bool(default_value=False).tag(sync=True)
    labels = t.Union(
        [
            t.Dict(
                default_value={
                    "image": {},
                    "polygons": [],
                    "masks": [],
                    "boxes": [],
                    "dimensions": None,
                },
                allow_none=True,
            ),
            t.List(default_value=[]),
        ]
    ).tag(sync=True)
    updated = t.Float().tag(sync=True)
    action = t.Unicode("").tag(sync=True)
    base = t.Dict(
        default_value={
            "url": None,
            "serverRoot": None,
        }
    ).tag(sync=True)
    preload = t.List(trait=t.Unicode(), allow_none=True).tag(sync=True)
    maxCanvasSize = t.Integer(default_value=512).tag(sync=True)
    showNavigation = t.Bool(default_value=True).tag(sync=True)
    progress = t.Float(-1).tag(sync=True)
    mode = t.Unicode("light").tag(sync=True)
    buttons = t.Dict(
        default_value={
            "next": True,
            "prev": True,
            "save": True,
            "config": True,
            "delete": True,
            "ignore": True,
            "unignore": True,
        },
    ).tag(sync=True)


def file2str(filepath: str, filetype: str):
    file_size = os.stat(filepath)
    if file_size.st_size > 10e6:
        encoded = base64.b64encode(
            pkg_resources.resource_string("qsl", "assets/local-file-error.png")
        ).decode("utf8")
    else:
        with open(filepath, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf8")
    return BASE64_PATTERN.format(type=filetype, data=encoded)


# pylint: disable=no-member
def arr2str(image: "np.ndarray"):
    return BASE64_PATTERN.format(
        type="image",
        data=base64.b64encode(cv2.imencode(".png", image)[1].tobytes()).decode("utf8"),
    )


def build_url(
    target: typing.Union[str, "np.ndarray"],
    base: dict,
    filetype: str,
    allow_base64=True,
):
    """Build a notebook file URL using notebook configuration and a filepath or URL."""
    if target is None:
        return None
    if np is not None and isinstance(target, np.ndarray):
        return arr2str(target)
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
            return file2str(target, filetype) if allow_base64 else None
        relpath = os.path.relpath(target, os.path.expanduser(base["serverRoot"]))
        if os.name == "nt":
            relpath = pathlib.PureWindowsPath(relpath).as_posix()
        if ".." in relpath:
            return file2str(target, filetype) if allow_base64 else None
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
        config,
        on_next: typing.Callable = None,
        on_prev: typing.Callable = None,
        on_save: typing.Callable = None,
        on_delete: typing.Callable = None,
        on_ignore: typing.Callable = None,
        on_unignore: typing.Callable = None,
        allow_config_change: bool = True,
    ):
        super().__init__(
            config=config,
            buttons={
                "config": allow_config_change,
                "next": on_next is not None,
                "prev": on_prev is not None,
                "save": on_save is not None,
                "delete": on_delete is not None,
                "ignore": on_ignore is not None,
                "unignore": on_unignore is not None,
            },
        )
        self._on_next = on_next
        self._on_prev = on_prev
        self._on_save = on_save
        self._on_delete = on_delete
        self._on_ignore = on_ignore
        self._on_unignore = on_unignore
        self._targets: typing.List[Target] = []
        self._allow_config_change = allow_config_change
        self.observe(self.handle_base_change, ["base"])
        self.observe(self.handle_action_change, ["action"])
        self.observe(self.handle_updated_change, ["updated"])
        self.observe(self.handle_states_change, ["states"])

    @property
    def on_next(self):
        return self._on_next

    @on_next.setter
    def on_next(self, on_next):
        self._on_next = on_next
        self.buttons = {**self.buttons, "next": on_next is not None}

    @property
    def on_ignore(self):
        return self._on_ignore

    @on_ignore.setter
    def on_ignore(self, on_ignore):
        self._on_ignore = on_ignore
        self.buttons = {**self.buttons, "ignore": on_ignore is not None}

    @property
    def on_unignore(self):
        return self._on_unignore

    @on_unignore.setter
    def on_unignore(self, on_unignore):
        self._on_unignore = on_unignore
        self.buttons = {**self.buttons, "unignore": on_unignore is not None}

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
    def targets(self) -> typing.List[Target]:
        return self._targets

    @targets.setter
    def targets(self, targets: typing.List[Target]):
        self._targets = targets
        self.states = [{**target, "target": None} for target in targets]
        self.set_buttons()

    def set_buttons(self):
        self.buttons = {
            **self.buttons,
            "save": any(t["selected"] for t in self.states),
            "config": self.allow_config_change,
            "delete": any(
                t["labeled"] and t["visible"] and t["selected"] for t in self.states
            ),
            "ignore": all(
                not (t["ignored"] or t["labeled"])
                for t in self.states
                if t["visible"] and t["selected"]
            ),
            "unignore": any(
                t["ignored"] and t["visible"] and t["selected"] for t in self.states
            ),
        }

    def set_urls_and_type(self):
        if self.base:
            assert (
                len(set(c["type"] for c in self.targets)) <= 1
            ), "Only one type of media is permitted in each batch."
            assert len(self.targets) <= 1 or all(
                c["type"] == "image" for c in self.targets
            ), "Only images can be be batch labeled."
            self.type = self.targets[0]["type"] if len(self.targets) > 0 else "image"
            self.urls = [
                build_url(target=t["target"], base=self.base, filetype=t["type"])
                if t.get("target") is not None
                else None
                for t in self.targets
            ]

    def handle_states_change(self, change):
        self._targets = [
            {**state, "target": target.get("target")}
            for target, state in zip(self.targets, self.states)
        ]
        self.set_buttons()

    def handle_base_change(self, change):
        """Handles setting a correct URL for a local file, if and when
        the the page base configuration is received."""
        self.set_urls_and_type()

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
        if self._on_ignore and change["new"] == "ignore":
            self._on_ignore()
        if self._on_unignore and change["new"] == "unignore":
            self._on_unignore()
        self.action = ""

    def handle_updated_change(self, change):
        """Handles changes to the timestamp sentinel for saves."""
        if self._on_save:
            self._on_save()


class ImageSeriesLabeler(ImageLabeler):
    def __init__(self, images, config=None, allow_config_change=True, batch_size=1):
        super().__init__(
            config=config,
            allow_config_change=allow_config_change,
            on_next=self.next,
            on_prev=self.prev,
            on_save=self.save,
            on_delete=self.delete,
            on_ignore=self.ignore,
            on_unignore=self.unignore,
        )
        self.images = images
        self.idx = 0
        self.batch_size = batch_size
        self.max_preload = 3
        self.update(True)

    def next(self):
        next_idx = self.targets[-1]["idx"] + 1
        if next_idx < len(self.images):
            self.idx = next_idx
            self.update(True)

    def prev(self):
        self.idx = max(self.idx - self.batch_size, 0)
        self.update(True)

    @property
    def idxs(self):
        includes_video = False
        for count, idx in enumerate(
            range(self.idx, min(self.idx + self.batch_size, len(self.images)))
        ):
            includes_video = (
                includes_video or self.images[idx].get("type", "image") == "video"
            )
            if count == 0:
                # We can always include at least one.
                yield idx
            elif not includes_video:
                # We can include an arbitrary number of non-videos.
                yield idx
            else:
                # We've hit a video in a batch. Do not allow this.
                break

    @property
    def targets_and_images(self):
        for tIdx, iIdx in enumerate(self.idxs):
            yield self.targets[tIdx], self.images[iIdx]

    def save(self):
        for target, image in self.targets_and_images:
            if target["visible"] and target["selected"]:
                image["labels"] = self.labels
                if self.type == "image":
                    target["visible"] = False
        if self.type == "image" and not any(t["visible"] for t in self.targets):
            self.next()
        else:
            self.update(False)

    def delete(self):
        for target, image in self.targets_and_images:
            if target["visible"] and target["selected"] and image.get("labels"):
                del image["labels"]
        self.update(False)

    def ignore(self):
        for target, image in self.targets_and_images:
            if target["visible"] and target["selected"]:
                image["ignore"] = True
                target["visible"] = False
                if image.get("labels"):
                    del image["labels"]
        if self.type == "image" and not any(t["visible"] for t in self.targets):
            self.next()
        else:
            self.update(False)

    def unignore(self):
        for target, image in self.targets_and_images:
            if target["visible"] and target["selected"]:
                image["ignore"] = False
        self.update(False)

    def update(self, reset: bool):
        if reset:
            self.transitioning = True
        self.targets = [
            {
                "idx": idx,
                "target": self.images[idx].get("target"),
                "type": self.images[idx].get("type", "image"),
                "metadata": self.images[idx].get("metadata", {}),
                "selected": True if reset else self.targets[idx - self.idx]["selected"],
                "ignored": self.images[idx].get("ignore", False),
                "labeled": self.images[idx].get("labels") is not None,
                "labels": self.images[idx].get("labels", {}),
                "visible": True if reset else self.targets[idx - self.idx]["visible"],
            }
            for idx in self.idxs
        ]
        if reset:
            self.set_urls_and_type()
            self.transitioning = False
        base_image = next(i for t, i in self.targets_and_images if t["visible"])
        self.labels = (
            (
                base_image.get("labels")
                or base_image.get("defaults")
                or ({} if self.type == "image" else [])
            )
            if reset
            else self.labels
        )
        self.on_prev = self.prev if self.idx != 0 else None
        self.on_next = (
            self.next
            if (
                all(t["labeled"] or t["ignored"] for t in self.targets)
                and self.idx + 1 < len(self.images)
            )
            else None
        )
        if self.base and self.idx + 1 < len(self.images):
            preload = []
            for preloadCandidate in self.images[self.idx + 1 :]:
                preloadUrl = build_url(
                    preloadCandidate["target"],
                    base=self.base,
                    filetype=preloadCandidate.get("type", "image"),
                    allow_base64=False,
                )
                if preloadUrl:
                    preload.append(preloadUrl)
                if len(preload) == self.max_preload:
                    break
            self.preload = preload
        self.update_progress()

    def update_progress(self):
        self.progress = (
            100
            * sum(
                [
                    1
                    if image.get("labels") is not None or image.get("ignore", False)
                    else 0
                    for image in self.images
                ]
            )
            / len(self.images)
        )


class ImageSeriesLabelerJSON(ImageSeriesLabeler):
    def __init__(self, images, **kwargs):
        assert all(
            bool(image.get("jsonpath")) for image in images
        ), "All images must have a jsonpath key."
        super().__init__(
            [
                {
                    **image,
                    "labels": file_utils.json_or_none(image["jsonpath"]),
                }
                for image in images
            ],
            **kwargs,
        )

    @staticmethod
    def write(labels, filepath):
        dirname = os.path.dirname(filepath)
        if dirname:
            os.makedirs(dirname, exist_ok=True)
        with open(filepath, "w", encoding="utf8") as f:
            f.write(json.dumps(labels))

    def save(self):
        for idx in self.idxs:
            self.write(self.labels, self.images[idx]["jsonpath"])
        super().save()

    def delete(self):
        for idx in self.idxs:
            filepath = self.images[idx]["jsonpath"]
            if os.path.isfile(filepath):
                os.remove(filepath)
        super().delete()

    def ignore(self):
        for idx in self.idxs:
            self.write(
                {**self.images[self.idx], "ignore": True, "labels": None},
                self.images[idx]["jsonpath"],
            )
        super().ignore()

    def unignore(self):
        for idx in self.idxs:
            self.write(
                {**self.images[idx], "ignore": False, "labels": None},
                self.images[idx]["jsonpath"],
            )
        super().unignore()
