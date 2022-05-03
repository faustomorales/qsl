import os
import typing
import logging
import tempfile

import numpy as np
import typing_extensions as tx

from . import files

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


def deprecate(old, new):
    """Log a deprecation message."""
    LOGGER.warning("%s has been deprecated. Use %s instead.", old, new)


def merge_items(initial, insert):
    """Merge two lists of items if there is an
    unambiguous way to do so."""
    try:
        initialh, inserth = [
            [
                (entry.get("target"), tuple(entry.get("metadata", {}).items()))
                for entry in items
            ]
            for items in [initial, insert]
        ]
        add = [entry for entry, hval in zip(insert, inserth) if hval not in initialh]
        bad = [
            entry
            for entry, hval in zip(insert, inserth)
            if hval in initialh and entry.get("labels")
        ]
    except TypeError as exception:
        if "unhashable type" in exception.args[0]:
            raise ValueError(
                "Metadata dictionaries must be string-string maps. Targets must be strings."
            ) from exception
    if bad:
        raise ValueError(
            "Could not merge items because one of the targets have conflicting labels."
        )
    return initial + add


class BaseMediaLabeler:
    """A widget for labeling a single image."""

    def __init__(
        self,
        items=None,
        config=None,
        allow_config_change=True,
        batch_size=1,
        images=None,
        jsonpath=None,
        base=None,
    ):
        super().__init__()
        self.base = base
        self.config = config
        self.jsonpath = jsonpath
        self.action = ""
        self.preload = []
        self.mode = "light"
        self.maxCanvasSize = 512
        self.maxViewHeight = 512
        self.tempdir = None

        # Items needs to be handled specially depending
        # on if labeler-wide or items-specific jsonpaths
        # are provided.
        items = items or images or []
        jsonpath_item = [bool(item.get("jsonpath")) for item in items]
        if any(jsonpath_item):
            assert all(
                jsonpath_item
            ), "Either all items must have a jsonpath key or none of them can."
            assert (
                jsonpath is None
            ), "You cannot supply both item- and labeler-level JSON paths."
            items = [
                {
                    **item,
                    **(files.json_or_none(item["jsonpath"]) or {}),
                }
                for item in items
            ]
        if jsonpath is not None:
            assert all(
                isinstance(item.get("target"), (type(None), str)) for item in items
            ), "Using a jsonpath is incompatible with raw array targets. Please remove the jsonpath argument. You can access labels by looking at `labeler.items`."
            jsondata = files.json_or_none(jsonpath)
            if jsondata is not None:
                if config is not None:
                    LOGGER.warning(
                        "The project at %s exists. Ignoring supplied config and using config from file.",
                        jsonpath,
                    )
                items = merge_items(initial=jsondata["items"], insert=items)

        self._targets: typing.List[Target] = []
        self._allow_config_change = allow_config_change
        if images is not None:
            deprecate("The images argument", "items")
        self.items = items
        self.idx = 0
        self.batch_size = batch_size
        self.max_preload = 3
        self.update(True)

    def get_temporary_directory(self):
        if self.tempdir:
            return self.tempdir.name
        if self.base["serverRoot"] is not None:
            self.tempdir = (
                tempfile.TemporaryDirectory(  # pylint: disable=consider-using-with
                    prefix="qsl-temp", dir=os.path.expanduser(self.base["serverRoot"])
                )
            )
            return self.tempdir.name
        return None

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
        self.states = [
            {**typing.cast(dict, target), "target": None} for target in targets
        ]
        self.set_buttons()

    def set_buttons(self):
        self.buttons = {
            "prev": self.idx != 0,
            "next": (
                all(t["labeled"] or t["ignored"] for t in self.targets)
                and self.idx + 1 < len(self.items)
            ),
            "save": any(t["selected"] for t in self.states),
            "config": self._allow_config_change,
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
        self.save_to_disk()
        if self.type == "image" and not any(t["visible"] for t in self.targets):
            self.next()
        else:
            self.update(False)

    def save_to_disk(self):
        if self.jsonpath:
            files.labels2json(
                {"items": self.items, "config": self.config}, self.jsonpath
            )

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
        self.save_to_disk()
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
        self.save_to_disk()
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
        self.labels: typing.Union[dict, list] = typing.cast(
            typing.Union[dict, list],
            (
                base_item.get("labels")
                or base_item.get("defaults")
                or ({} if self.type == "image" else [])
            )
            if reset
            else self.labels,
        )
        if self.base and self.idx + 1 < len(self.items):
            preload = []
            for preloadCandidate in self.items[self.idx + 1 :]:
                preloadUrl = files.build_url(
                    preloadCandidate["target"],
                    base=self.base,
                    allow_base64=False,
                    get_tempdir=self.get_temporary_directory,
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
                files.build_url(
                    target=t["target"],
                    base=self.base,
                    get_tempdir=self.get_temporary_directory,
                )
                if t.get("target") is not None
                else None
                for t in self.targets
            ]
