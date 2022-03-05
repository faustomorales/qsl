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
name = "qsl"

# Representative files that should exist after a successful build
jstargets = [
    os.path.join(HERE, name, "nbextension", "index.js"),
    os.path.join(HERE, name, "labextension", "package.json"),
]

builder = jp.npm_builder(HERE, build_cmd="build:prod")
cmdclass = jp.wrap_installers(
    pre_develop=builder,
    pre_dist=builder,
    ensured_targets=jstargets,
    skip_if_exists=jstargets,
)
setup_args = dict(
    name=name,
    description="Widgets for the QSL image labeling package.",
    version=jp.get_version(os.path.join(name, "version.py")),
    scripts=glob.glob(os.path.join("scripts", "*")),
    cmdclass=cmdclass,
    packages=setuptools.find_packages(),
    data_files=jp.get_data_files(
        data_specs=[
            ("share/jupyter/nbextensions/qslwidgets", "qsl/nbextension", "**"),
            ("share/jupyter/labextensions/qslwidgets", "qsl/labextension", "**"),
            ("share/jupyter/labextensions/qslwidgets", ".", "install.json"),
            ("etc/jupyter/nbconfig/notebook.d", ".", "qsl.json"),
        ]
    ),
    author="Fausto Morales",
    author_email="fausto@robinbay.com",
    url="https://github.com/faustomorales/qsl",
    license="BSD",
    platforms="Linux, Mac OS X, Windows",
    keywords=["Jupyter", "Widgets", "IPython"],
    classifiers=[
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.4",
        "Programming Language :: Python :: 3.5",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Framework :: Jupyter",
    ],
    include_package_data=True,
    python_requires=">=3.6",
    install_requires=["ipywidgets>=7.0.0", "typing_extensions"],
    extras_require={
        "app": [
            "pydantic",
            "fastapi",
            "uvicorn[standard]",
            "click",
            "aiofiles",
            "filetype",
            "async-exit-stack",
            "async-generator",
            "boto3",
            "sqlalchemy",
            "authlib",
            "itsdangerous",
            "httpx",
        ],
    },
    entry_points="""
        [console_scripts]
        qsl=qsl.cli:cli
    """,
)


if __name__ == "__main__":
    setuptools.setup(**setup_args)
