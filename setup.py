#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Fausto Morales
# Distributed under the terms of the MIT License.

import os
import glob
import setuptools
import jupyter_packaging as jp

HERE = os.path.dirname(os.path.abspath(__file__))

# The name of the project
namepy = "qsl"
namejs = "qslwidgets"

# Representative files that should exist after a successful build
jstargets = [
    os.path.join(HERE, namepy, "ui", "nbextension", "index.js"),
    os.path.join(HERE, namepy, "ui", "labextension", "package.json"),
]

builder = jp.npm_builder(os.path.join(HERE, namejs), build_cmd="build")
cmdclass = jp.wrap_installers(
    pre_develop=builder,
    pre_dist=builder,
    ensured_targets=jstargets,
    skip_if_exists=jstargets,
)
setup_args = dict(
    name=namepy,
    description="A package for labeling image, video, and time series data quickly",
    version=jp.get_version(os.path.join(namepy, "version.py")),
    scripts=glob.glob(os.path.join("scripts", "*")),
    cmdclass=cmdclass,
    data_files=jp.get_data_files(
        data_specs=[
            ("share/jupyter/nbextensions/qslwidgets", "qsl/ui/nbextension", "**"),
            ("share/jupyter/labextensions/qslwidgets", "qsl/ui/labextension", "**"),
            ("share/jupyter/labextensions/qslwidgets", "qsl/ui/assets", "install.json"),
            ("etc/jupyter/nbconfig/notebook.d", "qsl/ui/assets", "qsl.json"),
        ]
    ),
    platforms="Linux, Mac OS X, Windows",
    keywords=["Jupyter", "Widgets", "IPython"],
    python_requires=">=3.6",
    entry_points="""
        [console_scripts]
        qsl=qsl.cli:cli
    """,
)


if __name__ == "__main__":
    setuptools.setup(**setup_args)
