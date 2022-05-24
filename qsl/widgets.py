# pylint: disable=too-many-ancestors,missing-function-docstring,unused-argument,too-many-return-statements
import json

import pkg_resources
import ipywidgets
import traitlets as t
from . import common

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


class MediaLabeler(common.BaseMediaLabeler, ipywidgets.DOMWidget):
    """A widget for labeling a series of media files. Please see the documentation
    in the README to see more about the different ways to configure it.

    Args:

        - items: This can be as simple as a list of {"target": "path/to/image.png"} objects. See READM for more information.
        - config: The labeling configuration. See README for more information.
        - allowConfigChange: Whether to allow the configuration to be edited from the UI.
        - maxCanvasSize: The maximum size for the segmentation mask canvas.
        - maxViewHeight: The maximum view height for the UI.
        - mode: The theme for the UI, one of "light" or "dark".
        - batchSize: The image labeling batch size.
        - jsonpath: The path to which we will save the configuration.
        - images: deprecated, use items instead.
        - allow_config_change: deprecated, use allowConfigChange.
        - batch_size: deprecated, use batchSize.
    """

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
    idx = t.Int(default_value=0).tag(sync=True)
    sortedIdxs = t.List(default_value=[]).tag(sync=True)
    viewState = t.Unicode("labeling").tag(sync=True)
    mediaIndex = t.Dict(default_value={"rows": [], "columns": []}).tag(sync=True)
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
    action = t.Unicode("").tag(sync=True)
    message = t.Unicode("").tag(sync=True)
    base = t.Dict(
        default_value={
            "url": None,
            "serverRoot": None,
        },
        allow_none=True,
    ).tag(sync=True)
    preload = t.List(trait=t.Unicode(), allow_none=True).tag(sync=True)
    maxCanvasSize = t.Int(default_value=512).tag(sync=True)
    maxViewHeight = t.Int(default_value=512).tag(sync=True)
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
        allowConfigChange=True,
        maxCanvasSize=512,
        maxViewHeight=512,
        mode="light",
        batchSize=1,
        jsonpath=None,
        images=None,
        allow_config_change=None,
        batch_size=None,
    ):
        if allow_config_change is not None:
            common.deprecate("allow_config_change", "allowConfigChange")
            allowConfigChange = allow_config_change
        if batch_size is not None:
            common.deprecate("batch_size", "batchSize")
            batchSize = batch_size
        super().__init__(
            items=items,
            config=config,
            allowConfigChange=allowConfigChange,
            batchSize=batchSize,
            maxCanvasSize=maxCanvasSize,
            maxViewHeight=maxViewHeight,
            mode=mode,
            jsonpath=jsonpath,
            images=images,
        )
        self.observe(self.handle_base_change, ["base"])
        self.observe(self.handle_action_change, ["action"])
        self.observe(self.handle_states_change, ["states"])

    def handle_states_change(self, change):
        self.targets = [
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
        self.apply_action(change["new"])


class ImageSeriesLabeler(MediaLabeler):
    def __init__(self, *args, **kwargs):
        common.deprecate("ImageSeriesLabeler", "MediaLabeler")
        super().__init__(*args, **kwargs)


class ImageSeriesLabelerJSON(MediaLabeler):
    def __init__(self, *args, **kwargs):
        common.deprecate("ImageSeriesLabelerJSON", "MediaLabeler")
        super().__init__(*args, **kwargs)
