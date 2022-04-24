import os
import glob
import json
import typing
import base64
import fnmatch
import pathlib
import threading
import urllib.parse as up

import filetype
import numpy as np
import pkg_resources

try:
    import cv2
except ImportError:
    cv2 = None  # type: ignore
try:
    import boto3
    import botocore
except ImportError:
    boto3, botocore = None, None

TLS = threading.local()
BASE64_PATTERN = "data:{type};charset=utf-8;base64,{data}"
IMAGE_EXTENSIONS = [
    "3gp",
    "mp4",
    "m4v",
    "mkv",
    "webm",
    "mov",
    "avi",
    "wmv",
    "mpg",
    "flv",
]


def get_s3_files_for_pattern(client, pattern: str) -> typing.List[str]:
    """Get a list of S3 keys given a potential wildcard pattern
    (e.g., 's3://bucket/a/b/*/*.jpg')"""
    segments = pattern.replace("s3://", "").split("/")
    bucket = segments[0]
    keypat = "/".join(segments[1:])
    prefix = "/".join(
        segments[
            1 : 1
            + next((i for i, s in enumerate(segments[1:]) if "*" in s), len(segments))
        ]
    )
    keys = []
    for page in client.get_paginator("list_objects_v2").paginate(
        Bucket=bucket, Prefix=prefix
    ):
        if "Contents" not in page:
            break
        keys.extend(
            [
                e["Key"]
                for e in page["Contents"]
                if (e["Key"] != prefix or e["Key"] == keypat)
            ]
        )
    return [f"s3://{bucket}/{key}" for key in keys if fnmatch.fnmatch(key, keypat)]


def get_s3():
    """Provide an s3 client"""
    if boto3 is None:
        raise ImportError("You must `pip install boto3 botocore` to use S3 files.")
    if not hasattr(TLS, "aws_session"):
        TLS.aws_session = boto3.session.Session()
    return TLS.aws_session.client(
        "s3", config=botocore.config.Config(signature_version="s3v4")
    )


def filepaths_from_patterns(patterns: typing.List[str], s3=None) -> typing.List[str]:
    """Create filepaths from patterns."""
    filepaths = []
    for file_or_pattern in patterns:
        if file_or_pattern.startswith("s3://"):
            if s3 is None:
                s3 = get_s3()
            filepaths.extend(
                get_s3_files_for_pattern(client=s3, pattern=file_or_pattern)
            )
        elif file_or_pattern.startswith("http://") or file_or_pattern.startswith(
            "https://"
        ):
            # We have no way of handling wildcards for HTTP URLs.
            filepaths.append(file_or_pattern)
        else:
            filepaths.extend(glob.glob(file_or_pattern))
    return filepaths


def json_or_none(filepath: str):
    """Try to load JSON from a path, returning None upon failure."""
    try:
        labels = (
            json.loads(pathlib.Path(filepath).read_text(encoding="utf8"))
            if os.path.isfile(filepath)
            else None
        )
    except json.JSONDecodeError:
        os.remove(filepath)
        labels = None
    return labels


def file2str(filepath: str, filetype: str):
    """Given a file, convert it to a base64 string."""
    if os.stat(filepath).st_size > 10e6:
        encoded = base64.b64encode(
            pkg_resources.resource_string("qsl", "ui/assets/local-file-error.png")
        ).decode("utf8")
    else:
        with open(filepath, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf8")
    return BASE64_PATTERN.format(type=filetype, data=encoded)


# pylint: disable=no-member
def arr2str(image: "np.ndarray"):
    """Given an image array, convert it to a base64 string."""
    if cv2 is None:
        raise ValueError("Labeling arrays requires OpenCV.")
    return BASE64_PATTERN.format(
        type="image",
        data=base64.b64encode(cv2.imencode(".png", image)[1].tobytes()).decode("utf8"),
    )


def build_url(
    target: typing.Union[str, np.ndarray],
    base: dict,
    filetype: str,
    allow_base64=True,
) -> str:
    """Build a notebook file URL using notebook configuration and a filepath or URL."""
    if target is None:
        return None
    if isinstance(target, np.ndarray):
        return arr2str(target)
    if target.lower().startswith("s3://"):
        s3 = get_s3()
        segments = target.lower().replace("s3://", "").split("/")
        return s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": segments[0], "Key": "/".join(segments[1:])},
            ExpiresIn=3600,
        )
    if (
        target.lower().startswith("http://")
        or target.lower().startswith("https://")
        or target.lower().startswith("data:")
    ):
        return target
    if os.path.isfile(target):
        if not base or not base.get("serverRoot") or not base.get("url"):
            return file2str(target, filetype) if allow_base64 else None
        relpath = os.path.relpath(target, os.path.expanduser(base["serverRoot"]))
        if os.name == "nt":
            relpath = pathlib.PureWindowsPath(relpath).as_posix()
        if ".." in relpath:
            return file2str(target, filetype) if allow_base64 else None
        return up.urljoin(
            base["url"],
            os.path.join(
                "files",
                relpath,
            ),
        )
    raise ValueError(f"Failed to load file at target: {target}")


def labels2json(labels, filepath):
    """Write labels to a JSON file."""
    dirname = os.path.dirname(filepath)
    if dirname:
        os.makedirs(dirname, exist_ok=True)
    with open(filepath, "w", encoding="utf8") as f:
        f.write(json.dumps(labels))


def guess_type(target: typing.Union[str, np.ndarray]):
    if isinstance(target, np.ndarray):
        return "image"
    if target.lower().startswith("s3://"):
        ext = os.path.splitext(os.path.basename("s3://foo/bar/baz.png"))[1][1:]
        return "image" if ext in IMAGE_EXTENSIONS else "video"
    if os.path.isfile(target):
        kind = filetype.guess(target)
        return "image" if kind.mime.startswith("image") else "video"
