import os
import math
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


def target2repr(target, ttype):
    """Convert any labling target to a string representation."""
    return (
        target
        if isinstance(target, str)
        else "numpy array"
        if files.is_array(target)
        else "time series"
        if ttype == "time-series"
        else ""
    )


def entry2hash(entry):
    if "target" in entry:
        target = entry["target"]
        if isinstance(target, str):
            return target
        if isinstance(target, dict):
            return hash(tuple(sorted(target.items())))
        raise ValueError("Unsupported target type for hashing.")
    if "metadata" in entry:
        return hash(tuple(sorted(entry["metadata"].items())))
    raise ValueError(f"Could not hash {entry}.")


def merge_items(exists, insert):
    """Merge two lists of items if there is an
    unambiguous way to do so."""
    try:
        exists_key, insert_key = [
            [entry2hash(entry) for entry in items] for items in [exists, insert]
        ]
        exists_map, insert_map = [
            {key: entry for entry, key in zip(items, keys)}
            for items, keys in [(exists, exists_key), (insert, insert_key)]
        ]
        combined = []
        for key in exists_key + list(set(insert_key).difference(exists_key)):
            entry_exists = exists_map.get(key)
            entry_insert = insert_map.get(key)
            if entry_exists and not entry_insert:
                combined.append(entry_exists)
            elif not entry_exists and entry_insert:
                combined.append(entry_insert)
            elif entry_exists and entry_insert:
                if entry_insert.get("metadata"):
                    entry_exists["metadata"] = entry_insert["metadata"]
                combined.append(entry_exists)
            else:
                raise ValueError("An error occurred merging lists.")
    except TypeError as exception:
        if "unhashable type" in exception.args[0]:
            raise ValueError(
                "Metadata dictionaries must be string-string maps. Targets must be strings."
            ) from exception
        raise exception
    return combined


class BaseMediaLabeler:
    """A widget for labeling media."""

    def __init__(
        self,
        items=None,
        config=None,
        allowConfigChange=True,
        batchSize=1,
        jsonpath=None,
        base=None,
        mode="light",
        advanceOnSave=True,
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
        items = items or []
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
                isinstance(item.get("target"), (type(None), str, dict))
                for item in items
            ), "Using a jsonpath is incompatible with raw array targets. Please remove the jsonpath argument. You can access labels by looking at `labeler.items`."
            jsondata = files.json_or_none(jsonpath)
            if jsondata is not None:
                items = merge_items(exists=jsondata["items"], insert=items)
                config = jsondata["config"]
                mode = jsondata.get("mode", mode)
                maxCanvasSize = jsondata.get("maxCanvasSize", maxCanvasSize)
                maxViewHeight = jsondata.get("maxViewHeight", maxViewHeight)
                allowConfigChange = jsondata.get("allowConfigChange", allowConfigChange)
                advanceOnSave = jsondata.get("advanceOnSave", advanceOnSave)
                batchSize = jsondata.get("batchSize", batchSize)
        assert items, "There must be at least one labeling target."
        self.mode = mode
        self.maxCanvasSize = maxCanvasSize
        self.maxViewHeight = maxViewHeight
        self.advanceOnSave = advanceOnSave
        self._targets: typing.List[Target] = []
        self._allowConfigChange = allowConfigChange
        self.config = config or {"image": [], "regions": []}
        self.items = items
        self.idx = 0
        self._sortedIdxs = list(range(len(items)))
        self.batchSize = batchSize
        self.maxPreload = 3
        self.previousIndexState = {
            "rows": [],
            "columns": [],
            "rowCount": 0,
            "page": 0,
            "rowsPerPage": 5,
            "sortModel": [],
        }
        self.indexState = self.previousIndexState
        self.progress = self.get_progress()
        self.indexState = self.get_index_state()
        self.advance_to_unlabeled()
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
    def sortedIdxs(self):
        if self.previousIndexState["sortModel"] != self.indexState["sortModel"]:
            sortKey = (
                self.indexState["sortModel"][0]["field"]
                if self.indexState["sortModel"]
                else None
            )
            unsorted = list(range(len(self.items)))
            if not sortKey:
                self._sortedIdxs = unsorted
            else:
                sortOrd = self.indexState["sortModel"][0]["sort"]
                if sortKey == "target":
                    keys = [
                        target2repr(item.get("target"), item.get("type", "image"))
                        for item in self.items
                    ]
                elif sortKey == "labeled":
                    keys = [
                        bool(item.get("labels") or item.get("ignored"))
                        for item in self.items
                    ]
                elif sortKey == "ignored":
                    keys = [bool(item.get("ignore")) for item in self.items]
                else:
                    keys = [
                        item.get("metadata", {}).get(sortKey) for item in self.items
                    ]
                self._sortedIdxs = [
                    idx
                    for _, idx in sorted(zip(keys, unsorted), reverse=sortOrd != "asc")
                ]
                self.previousIndexState["sortModel"] = self.indexState["sortModel"]
        return self._sortedIdxs

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
            (
                idx
                for idx in self.sortedIdxs
                if not self.items[idx].get("labels")
                and not self.items[idx].get("ignore")
            ),
            None,
        )
        if unlabeled is None:
            LOGGER.warning(
                "All items have already been labeled. Starting from beginning."
            )
            self.idx = self.sortedIdxs[0]
        else:
            self.idx = self.sortedIdxs[unlabeled]
        self.update(True)

    def get_index_state(self, reset_page=False):
        rowsPerPage = round(self.maxViewHeight / 70)
        page = (
            math.floor(self.sortedIdxs.index(self.idx) / rowsPerPage)
            if reset_page
            else self.indexState["page"]
        )
        startIdx = page * rowsPerPage
        endIdx = startIdx + rowsPerPage
        idxs = self.sortedIdxs[startIdx:endIdx]
        items = [self.items[idx] for idx in idxs]
        metadata_keys = list(
            set(flatten([item.get("metadata", {}).keys() for item in items]))
        )[:5]
        return {
            **self.indexState,
            "page": page,
            "rowCount": len(self.items),
            "rowsPerPage": rowsPerPage,
            "rows": [
                {
                    **{k: metadata.get(k) for k in metadata_keys},
                    "qslId": index,
                    "target": target2repr(target, ttype),
                    "labeled": "Yes" if labels or ignored else "No",
                    "ignored": "Yes" if ignored else "No",
                }
                for index, target, metadata, labels, ttype, ignored in [
                    (
                        idx,
                        item.get("target"),
                        item.get("metadata", {}),
                        item.get("labels", {}),
                        item.get("type", "image"),
                        item.get("ignore", False),
                    )
                    for idx, item in zip(idxs, items)
                ]
            ],
            "columns": [
                {
                    "field": "target",
                    "type": "string",
                    "flex": 1,
                    "headerName": "Target",
                },
                {"field": "labeled", "type": "string", "headerName": "Labeled"},
                {"field": "ignored", "type": "string", "headerName": "Ignored"},
            ]
            + [
                {
                    "field": k,
                    "type": "number"
                    if all(
                        k not in item.get("metadata", {})
                        or isinstance(item["metadata"][k], (float, int))
                        for item in self.items
                    )
                    else "string",
                    "flex": 1,
                }
                for k in metadata_keys
            ],
        }

    def set_buttons(self):
        self.buttons = {
            "prev": self.idx != self.sortedIdxs[0],
            "next": self.targets[-1]["idx"] != self.sortedIdxs[-1],
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
            includes_nonimage = False
            for count, sidx in enumerate(
                range(sidx - 1, max(0, sidx - self.batchSize) - 1, -1)
            ):
                includes_nonimage = (
                    includes_nonimage
                    or self.items[self.sortedIdxs[sidx]].get("type", "image") != "image"
                )
                if count == 0 or not includes_nonimage:
                    # We can always include at least one.
                    continue
                # We've hit a video in a batch. Do not allow this.
                sidx = sidx + 1
                break
            self.idx = self.sortedIdxs[sidx]
        self.update(True)

    @property
    def idxs(self):
        includes_nonimage = False
        sidx_initial = self.sortedIdxs.index(self.idx)
        for count, sidx in enumerate(
            range(sidx_initial, min(sidx_initial + self.batchSize, len(self.items)))
        ):
            includes_nonimage = (
                includes_nonimage
                or self.items[self.sortedIdxs[sidx]].get("type", "image") != "image"
            )
            if count == 0:
                # We can always include at least one.
                yield self.sortedIdxs[sidx]
            elif not includes_nonimage:
                # We can include an arbitrary number of non-videos.
                yield self.sortedIdxs[sidx]
            else:
                # We've hit a video in a batch. Do not allow this.
                break

    @property
    def targets_and_items(self):
        for tIdx, iIdx in enumerate(self.idxs):
            yield self.targets[tIdx], self.items[iIdx]

    def apply_action(self, value):
        if not value:
            return
        LOGGER.info("Handling %s action", value)
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
            self.indexState = self.get_index_state(reset_page=self.viewState != "index")
            self.previousIndexState = self.indexState
            self.viewState = "index"
        self.action = ""

    def save(self):
        for target, item in self.targets_and_items:
            if target["visible"] and target["selected"]:
                item["labels"] = self.labels
                item["ignore"] = False
                if item.get("type", "image") != "video":
                    target["visible"] = False
                jsonpath = item.get("jsonpath")
                if jsonpath:
                    files.labels2json(item, jsonpath)
        self.save_to_disk()
        if self.advanceOnSave and (
            not any(t["visible"] or (t["type"] == "video") for t in self.targets)
        ):
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
                    "advanceOnSave": self.advanceOnSave,
                },
                self.jsonpath,
            )

    def delete(self):
        for target, item in self.targets_and_items:
            if target["visible"] and target["selected"] and "labels" in item:
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
        if not any(t["visible"] or (t["type"] == "video") for t in self.targets):
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
        base_item = next(i for t, i in self.targets_and_items if t["visible"])
        self.labels: typing.Union[dict, list] = typing.cast(
            typing.Union[dict, list],
            (
                base_item.get("labels")
                or base_item.get("defaults")
                or ([] if base_item.get("type", "image") == "video" else {})
            ),
        )
        sIdx = self.sortedIdxs.index(self.idx)
        if self.base and sIdx + 1 < len(self.sortedIdxs):
            preload = []
            for iIdx in self.sortedIdxs[sIdx + 1 :]:
                preloadCandidate = self.items[iIdx]
                if preloadCandidate.get("type", "image") != "image":
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
        progress_before = self.progress
        progress_after = self.get_progress()
        if progress_after == 100 and progress_before < 100:
            self.message = "All items have been labeled."
        self.progress = progress_after
        self.viewState = "labeling"

    def get_progress(self):
        return (
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
