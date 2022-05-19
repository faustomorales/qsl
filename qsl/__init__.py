# Copyright (c) Fausto Morales.
# Distributed under the terms of the MIT License.

from .version import __version__

from .widgets import MediaLabeler
from .common import counts2bitmap


def _jupyter_labextension_paths():
    return [
        {
            "src": "ui/labextension",
            "dest": "qslwidgets",
        }
    ]


def _jupyter_nbextension_paths():
    return [
        {
            "section": "notebook",
            "src": "ui/nbextension",
            "dest": "qslwidgets",
            "require": "qslwidgets/extension",
        }
    ]
