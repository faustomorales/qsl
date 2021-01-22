import os
import pkg_resources

from ..types import web

TEST_FILES = [
    pkg_resources.resource_filename(
        "qsl", os.path.join("testing", "data", f"image{n}.jpg")
    )
    for n in range(1, 11)
]

TEST_CONFIGURATION = web.InitializationConfiguration(
    imageGroups=[
        web.ImageGroup(
            files=TEST_FILES[0::2],
            defaults=web.ImageLabels.parse_obj(
                {
                    "image": {
                        "single": {"Size": "small"},
                        "multiple": {"Color": ["blue", "green"]},
                        "text": {},
                    },
                    "boxes": [],
                }
            ),
        ),
        web.ImageGroup(
            files=TEST_FILES[1::2],
            defaults=None,
        ),
    ],
    project=web.Project(
        name="test-project",
        labelingConfiguration=web.LabelingConfiguration.parse_obj(
            {
                "image": {
                    "single": {
                        "Size": {
                            "options": {
                                "small": {"shortcut": "s"},
                                "medium": {"shortcut": "m"},
                                "large": {"shortcut": "l"},
                            }
                        },
                        "Animal Type": {
                            "options": {
                                "Cat": {"shortcut": "c"},
                                "Dog": {"shortcut": "d"},
                            }
                        },
                    },
                    "multiple": {
                        "Color": {
                            "options": {
                                "red": {"shortcut": "r"},
                                "green": {"shortcut": "g"},
                                "blue": {"shortcut": "b"},
                            }
                        }
                    },
                    "text": {"Description": {}},
                },
                "box": {
                    "single": {},
                    "multiple": {
                        "Color": {
                            "options": {
                                "red": {"shortcut": "r"},
                                "green": {"shortcut": "g"},
                                "blue": {"shortcut": "b"},
                            }
                        }
                    },
                    "text": {},
                },
            }
        ),
    ),
)
