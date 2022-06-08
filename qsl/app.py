import os
import typing
import eel
import bottle
import pkg_resources
from . import common, files


class MediaLabeler(common.BaseMediaLabeler):
    def __init__(
        self,
        items=None,
        jsonpath=None,
    ):
        super().__init__(
            items=items,
            jsonpath=jsonpath,
            base={
                "url": "http://localhost:8080",
                "serverRoot": os.getcwd(),
            },
        )
        self.set_urls_and_type()
        eel.expose(self.init)
        eel.expose(self.sync)

    def init(self, key):
        return getattr(self, key)

    def sync(self, key, value):
        setattr(self, key, value)
        if key == "states":
            self.targets = [
                {**state, "target": target.get("target")}
                for target, state in zip(self.targets, self.states)
            ]
            self.set_buttons()
        if key == "action":
            if not value:
                return
            self.apply_action(value)

    def __setattr__(self, key, value):
        eel.sync(key, value)  # pylint: disable=no-member
        super().__setattr__(key, value)


# pylint: disable=unused-variable
def start(jsonpath: str, targets: typing.List[str]):
    """Start Eel."""
    # A bit of a hack so that `files.build_url` works properly
    eel.BOTTLE_ROUTES = {
        "/files/<path:path>": (
            lambda path: bottle.static_file(path, root=os.getcwd()),
            {},
        ),
        **eel.BOTTLE_ROUTES,
    }
    eel.init(
        os.path.dirname(pkg_resources.resource_filename("qsl", "ui/eelapp/index.html")),
        [".js", ".html"],
    )
    labeler = MediaLabeler(
        items=[
            {"target": t, "type": files.guess_type(t)}
            for t in files.filepaths_from_patterns(targets)
        ],
        jsonpath=jsonpath,
    )
    eel.start(
        "index.html",
        mode="chrome-app",
        host="localhost",
        port=8080,
        size=(1280, 800),
    )
