# pylint: disable=too-many-ancestors,missing-function-docstring,unused-argument,too-many-return-statements
import os
import json
import typing
import logging
import threading
import numpy as np

import pkg_resources
import ipywidgets
import typing_extensions as tx
import traitlets as t
from . import files

TLS = threading.local()
LOGGER = logging.getLogger(__name__)
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


def module_version():
    """Load module version dynamically from package.json, falling
    back to a default value if it doesn't yet exist."""
    try:
        return json.loads(
            pkg_resources.resource_string("qsl", "ui/labextension/package.json")
        )["version"]
    except FileNotFoundError:
        return "0.0.0"


def deprecate(old, new):
    """Log a deprecation message."""
    LOGGER.warning("%s has been deprecated. Use %s instead.", old, new)


class MediaLabeler(ipywidgets.DOMWidget):
    """A widget for labeling a single image."""

    _model_name = t.Unicode("MediaLabelerModel").tag(sync=True)
    _model_module = t.Unicode(module_name).tag(sync=True)
    _model_module_version = t.Unicode(module_version()).tag(sync=True)
    _view_name = t.Unicode("MediaLabelerView").tag(sync=True)
    _view_module = t.Unicode(module_name).tag(sync=True)
    _view_module_version = t.Unicode(module_version()).tag(sync=True)

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

    def __init__(
        self,
        items=None,
        config=None,
        allow_config_change=True,
        batch_size=1,
        images=None,
    ):
        super().__init__(
            config=config,
            buttons={
                "config": allow_config_change,
                "next": True,
                "prev": True,
                "save": True,
                "delete": True,
                "ignore": True,
                "unignore": True,
            },
        )
        self._targets: typing.List[Target] = []
        self._allow_config_change = allow_config_change
        self.observe(self.handle_base_change, ["base"])
        self.observe(self.handle_action_change, ["action"])
        self.observe(self.handle_updated_change, ["updated"])
        self.observe(self.handle_states_change, ["states"])
        assert (
            items is not None or images is not None
        ), "You must provide a list of items to label."
        if images is not None:
            deprecate("The images argument", "items")
        self.items = items or images
        self.idx = 0
        self.batch_size = batch_size
        self.max_preload = 3
        has_json_path = [bool(item.get("jsonpath")) for item in self.items]
        assert all(has_json_path) or not any(
            has_json_path
        ), "Either all items must have a jsonpath key or none of them can."
        if any(has_json_path):
            self.items = [
                {
                    **item,
                    "labels": files.json_or_none(item["jsonpath"]),
                }
                for item in self.items
            ]
        self.update(True)

    @property
    def allow_config_change(self):
        return self._allow_config_change

    @allow_config_change.setter
    def allow_config_change(self, allow_config_change):
        self._allow_config_change = allow_config_change
        self.set_buttons()

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
            "prev": self.idx != 0,
            "next": (
                all(t["labeled"] or t["ignored"] for t in self.targets)
                and self.idx + 1 < len(self.items)
            ),
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
                files.build_url(target=t["target"], base=self.base, filetype=t["type"])
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
        if change["new"] == "next":
            self.next()
        if change["new"] == "prev":
            self.prev()
        if change["new"] == "delete":
            self.delete()
        if change["new"] == "ignore":
            self.ignore()
        if change["new"] == "unignore":
            self.unignore()
        self.action = ""

    def handle_updated_change(self, change):
        """Handles changes to the timestamp sentinel for saves."""
        self.save()

    def next(self):
        next_idx = self.targets[-1]["idx"] + 1
        if next_idx < len(self.items):
            self.idx = next_idx
            self.update(True)

    def prev(self):
        self.idx = max(self.idx - self.batch_size, 0)
        self.update(True)

    @property
    def idxs(self):
        includes_video = False
        for count, idx in enumerate(
            range(self.idx, min(self.idx + self.batch_size, len(self.items)))
        ):
            includes_video = (
                includes_video or self.items[idx].get("type", "image") == "video"
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
    def images(self):
        deprecate("images", "items")
        return self.items

    @images.setter
    def images(self, images):
        deprecate("images", "items")
        self.items = images

    @property
    def targets_and_items(self):
        for tIdx, iIdx in enumerate(self.idxs):
            yield self.targets[tIdx], self.items[iIdx]

    def save(self):
        for target, item in self.targets_and_items:
            if target["visible"] and target["selected"]:
                item["labels"] = self.labels
                if self.type == "image":
                    target["visible"] = False
                jsonpath = item.get("jsonpath")
                if jsonpath:
                    files.labels2json(item, jsonpath)
        if self.type == "image" and not any(t["visible"] for t in self.targets):
            self.next()
        else:
            self.update(False)

    def delete(self):
        for target, item in self.targets_and_items:
            if target["visible"] and target["selected"] and item.get("labels"):
                del item["labels"]
                jsonpath = item.get("jsonpath")
                if os.path.isfile(jsonpath):
                    os.remove(jsonpath)
        self.update(False)

    def ignore(self):
        for target, item in self.targets_and_items:
            if target["visible"] and target["selected"]:
                item["ignore"] = True
                target["visible"] = False
                if item.get("labels"):
                    del item["labels"]
                jsonpath = item.get("jsonpath")
                if jsonpath:
                    files.labels2json(item, jsonpath)
        if self.type == "image" and not any(t["visible"] for t in self.targets):
            self.next()
        else:
            self.update(False)

    def unignore(self):
        for target, item in self.targets_and_items:
            if target["visible"] and target["selected"]:
                item["ignore"] = False
                jsonpath = item.get("jsonpath")
                if jsonpath:
                    files.labels2json(item, jsonpath)
        self.update(False)

    def update(self, reset: bool):
        if reset:
            self.transitioning = True
        self.targets = [
            {
                "idx": idx,
                "target": self.items[idx].get("target"),
                "type": self.items[idx].get("type", "image"),
                "metadata": self.items[idx].get("metadata", {}),
                "selected": True if reset else self.targets[idx - self.idx]["selected"],
                "ignored": self.items[idx].get("ignore", False),
                "labeled": self.items[idx].get("labels") is not None,
                "labels": self.items[idx].get("labels", {}),
                "visible": True if reset else self.targets[idx - self.idx]["visible"],
            }
            for idx in self.idxs
        ]
        if reset:
            self.set_urls_and_type()
            self.transitioning = False
        base_item = next(i for t, i in self.targets_and_items if t["visible"])
        self.labels = (
            (
                base_item.get("labels")
                or base_item.get("defaults")
                or ({} if self.type == "image" else [])
            )
            if reset
            else self.labels
        )
        if self.base and self.idx + 1 < len(self.items):
            preload = []
            for preloadCandidate in self.items[self.idx + 1 :]:
                preloadUrl = files.build_url(
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
                    if item.get("labels") is not None or item.get("ignore", False)
                    else 0
                    for item in self.items
                ]
            )
            / len(self.items)
        )


class ImageSeriesLabeler(MediaLabeler):
    def __init__(self, *args, **kwargs):
        deprecate("ImageSeriesLabeler", "MediaLabeler")
        super().__init__(*args, **kwargs)


class ImageSeriesLabelerJSON(MediaLabeler):
    def __init__(self, *args, **kwargs):
        deprecate("ImageSeriesLabelerJSON", "MediaLabeler")
        super().__init__(*args, **kwargs)
