import os
import typing
import logging
import tempfile

try:
    import numpy as np
except ImportError:
    np = None  # type: ignore
import typing_extensions as tx

from . import files

LOGGER = logging.getLogger(__name__)

Target = tx.TypedDict(
    "Target",
    {
        "idx": int,
        "target": typing.Union[str, "np.ndarray"],
        "type": tx.Literal["video", "image"],
        "metadata": dict,
        "visible": bool,
        "selected": bool,
        "ignored": bool,
        "labeled": bool,
        "labels": dict,
    },
)

# Taken from https://stackoverflow.com/questions/952914/how-to-make-a-flat-list-out-of-a-list-of-lists
def flatten(l: typing.List[typing.Any]):
    return [item for sublist in l for item in sublist]


def counts2bitmap(counts: typing.List[int], dimensions: typing.Dict) -> "np.ndarray":
    """Convert a COCO-style bitmap into a bitmap."""
    return (
        np.concatenate(
            [
                np.zeros(count, dtype="uint8") + 1 - (index % 2)
                for index, count in enumerate(counts)
            ]
        ).reshape((dimensions["height"], dimensions["width"]))
        * 255
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
        allowConfigChange=True,
        batchSize=1,
        images=None,
        jsonpath=None,
        base=None,
        mode="light",
        maxCanvasSize=512,
        maxViewHeight=512,
    ):
        super().__init__()
        self.base = base
        self.jsonpath = jsonpath
        self.action = ""
        self.preload = []
        self.tempdir = None
        self.viewState = "labeling"
        self.message = ""

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
                items = merge_items(initial=jsondata["items"], insert=items)
                config = jsondata["config"]
                mode = jsondata.get("mode", mode)
                maxCanvasSize = jsondata.get("maxCanvasSize", maxCanvasSize)
                maxViewHeight = jsondata.get("maxViewHeight", maxViewHeight)
                allowConfigChange = jsondata.get("allowConfigChange", allowConfigChange)
                batchSize = jsondata.get("batchSize", batchSize)
        assert items, "There must be at least one labeling target."
        self.mode = mode
        self.maxCanvasSize = maxCanvasSize
        self.maxViewHeight = maxViewHeight
        self._targets: typing.List[Target] = []
        self._allowConfigChange = allowConfigChange
        if images is not None:
            deprecate("The images argument", "items")
        self.config = config
        self.items = items
        self.idx = 0
        self.sortedIdxs = list(range(len(items)))
        self.batchSize = batchSize
        self.maxPreload = 3
        self.mediaIndex = self.get_media_index()
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
    def allowConfigChange(self):
        return self._allowConfigChange

    @allowConfigChange.setter
    def allowConfigChange(self, allowConfigChange):
        self._allowConfigChange = allowConfigChange
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

    def advance_to_unlabeled(self):
        unlabeled = next(
            (idx for idx in self.sortedIdxs if not self.items[idx].get("labels")), None
        )
        if unlabeled is None:
            LOGGER.warning(
                "All items have already been labeled. Starting from beginning."
            )
            self.idx = 0
        else:
            self.idx = self.sortedIdxs[unlabeled]
        self.update(True)

    def get_media_index(self):
        metadata_keys = list(
            set(flatten([item.get("metadata", {}).keys() for item in self.items]))
        )[:5]
        return {
            "rows": [
                {
                    **{k: metadata.get(k) for k in metadata_keys},
                    "qslId": index,
                    "target": target
                    if isinstance(target, str)
                    else "numpy array"
                    if files.is_array(target)
                    else "time series"
                    if ttype == "time-series"
                    else "",
                    "labeled": "Yes" if labels else "No",
                }
                for index, (target, metadata, labels, ttype) in enumerate(
                    [
                        (
                            item.get("target"),
                            item.get("metadata", {}),
                            item.get("labels", {}),
                            item.get("type", "image"),
                        )
                        for item in self.items
                    ]
                )
            ],
            "columns": [
                {
                    "field": "target",
                    "type": "string",
                    "flex": 1,
                    "headerName": "Target",
                },
                {"field": "labeled", "type": "string", "headerName": "Labeled"},
            ]
            + [{"field": k, "type": "string", "flex": 1} for k in metadata_keys],
        }

    def set_buttons(self):
        self.buttons = {
            "prev": self.idx != self.sortedIdxs,
            "next": (
                all(t["labeled"] or t["ignored"] for t in self.targets)
                and self.targets[-1]["idx"] != self.sortedIdxs[-1]
            ),
            "save": any(t["selected"] for t in self.states),
            "config": self._allowConfigChange,
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
        next_sidx = self.sortedIdxs.index(self.targets[-1]["idx"]) + 1
        if next_sidx < len(self.sortedIdxs):
            self.idx = self.sortedIdxs[next_sidx]
        self.update(True)

    def prev(self):
        sidx = self.sortedIdxs.index(self.idx)
        if sidx > 0:
            includes_video = False
            for count, sidx in enumerate(
                range(sidx - 1, max(0, sidx - self.batchSize) - 1, -1)
            ):
                includes_video = (
                    includes_video
                    or self.items[self.sortedIdxs[sidx]].get("type", "image") == "video"
                )
                if count == 0 or not includes_video:
                    # We can always include at least one.
                    continue
                # We've hit a video in a batch. Do not allow this.
                sidx = sidx + 1
                break
            self.idx = self.sortedIdxs[sidx]
        self.update(True)

    @property
    def idxs(self):
        includes_video = False
        sidx_initial = self.sortedIdxs.index(self.idx)
        for count, sidx in enumerate(
            range(sidx_initial, min(sidx_initial + self.batchSize, len(self.items)))
        ):
            includes_video = (
                includes_video
                or self.items[self.sortedIdxs[sidx]].get("type", "image") == "video"
            )
            if count == 0:
                # We can always include at least one.
                yield self.sortedIdxs[sidx]
            elif not includes_video:
                # We can include an arbitrary number of non-videos.
                yield self.sortedIdxs[sidx]
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

    def apply_action(self, value):
        if not value:
            return
        if value == "next":
            self.next()
        if value == "prev":
            self.prev()
        if value == "delete":
            self.delete()
        if value == "ignore":
            self.ignore()
        if value == "unignore":
            self.unignore()
        if value == "save":
            self.save()
        if value == "label":
            self.update(True)
            self.viewState = "labeling"
        if value == "index":
            self.mediaIndex = self.get_media_index()
            self.viewState = "index"
        self.action = ""

    def save(self):
        for target, item in self.targets_and_items:
            if target["visible"] and target["selected"]:
                item["labels"] = self.labels
                if self.type != "video":
                    target["visible"] = False
                jsonpath = item.get("jsonpath")
                if jsonpath:
                    files.labels2json(item, jsonpath)
        self.save_to_disk()
        if self.type != "video" and not any(t["visible"] for t in self.targets):
            self.next()
        else:
            self.update(False)

    def save_to_disk(self):
        if self.jsonpath:
            files.labels2json(
                {
                    "items": self.items,
                    "config": self.config,
                    "maxCanvasSize": self.maxCanvasSize,
                    "maxViewHeight": self.maxViewHeight,
                    "mode": self.mode,
                    "batchSize": self.batchSize,
                    "allowConfigChange": self.allowConfigChange,
                },
                self.jsonpath,
            )

    def delete(self):
        for target, item in self.targets_and_items:
            if target["visible"] and target["selected"] and item.get("labels"):
                del item["labels"]
                jsonpath = item.get("jsonpath")
                if jsonpath and os.path.isfile(jsonpath):
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
            self.viewState = "transitioning"
        self.targets = [
            {
                "idx": iIdx,
                "target": self.items[iIdx].get("target"),
                "type": self.items[iIdx].get("type", "image"),
                "metadata": self.items[iIdx].get("metadata", {}),
                "selected": True if reset else self.targets[tIdx]["selected"],
                "ignored": self.items[iIdx].get("ignore", False),
                "labeled": self.items[iIdx].get("labels") is not None,
                "labels": self.items[iIdx].get("labels", {}),
                "visible": True if reset else self.targets[tIdx]["visible"],
            }
            for tIdx, iIdx in enumerate(self.idxs)
        ]
        if reset:
            self.set_urls_and_type()
            self.viewState = "labeling"
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
        sIdx = self.sortedIdxs.index(self.idx)
        if self.base and sIdx + 1 < len(self.sortedIdxs):
            preload = []
            for iIdx in self.sortedIdxs[sIdx + 1 :]:
                preloadCandidate = self.items[iIdx]
                if preloadCandidate.get("type") == "time-series":
                    continue
                preloadUrl = files.build_url(
                    preloadCandidate.get("target"),
                    base=self.base,
                    allow_base64=False,
                    get_tempdir=self.get_temporary_directory,
                )
                if preloadUrl:
                    preload.append(preloadUrl)
                if len(preload) == self.maxPreload:
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
            self.type = (
                self.targets[0]["type"]
                if len(self.targets) > 0
                else self.targets[0].get("type", "image")
            )
            self.urls = [
                files.build_url(
                    target=t.get("target"),
                    base=self.base,
                    get_tempdir=self.get_temporary_directory,
                )
                if self.type != "time-series"
                else t["target"]
                for t in self.targets
            ]
