import os
import shutil
import glob
import json
import typing
import base64
import fnmatch
import pathlib
import logging
import threading
import urllib.parse as up

import filetype

try:
    import numpy as np
except ImportError:
    np = None  # type: ignore

try:
    import cv2
except ImportError:
    cv2 = None  # type: ignore
try:
    import boto3
    import botocore
except ImportError:
    boto3, botocore = None, None

LOGGER = logging.getLogger(__name__)
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
    "gif",
]


def is_array(value: typing.Any):
    """Check if an object is a numpy array."""
    if np is not None and isinstance(value, np.ndarray):
        return True
    return False


def get_s3_files_for_pattern(client, pattern: str) -> typing.List[str]:
    """Get a list of S3 keys given a potential wildcard pattern
    (e.g., 's3://bucket/a/b/*/*.jpg')"""
    if "*" not in pattern:
        return [pattern]
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


def file2str(filepath: str):
    """Given a file, convert it to a base64 string."""
    if os.stat(filepath).st_size > 10e6:
        LOGGER.warning(
            "%s could not be transmitted because it was too large to base64 encode and your environment does not support shareable URLs.",
            filepath,
        )
        return None
    with open(filepath, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf8")
    return BASE64_PATTERN.format(
        type=filetype.guess(filepath).mime,
        data=encoded,
    )


# pylint: disable=no-member
def arr2str(image: "np.ndarray"):
    """Given an image array, convert it to a base64 string."""
    if cv2 is None:
        raise ValueError("Labeling arrays requires OpenCV.")
    return BASE64_PATTERN.format(
        type="image/png",
        data=base64.b64encode(cv2.imencode(".png", image)[1].tobytes()).decode("utf8"),
    )


def get_relpath(filepath, directory):
    """Convert a filepath to a relative path to a directory."""
    relpath = os.path.relpath(filepath, directory)
    if os.name == "nt":
        relpath = pathlib.PureWindowsPath(relpath).as_posix()
    return relpath


def build_url(
    target: typing.Union[str, "np.ndarray"],
    base: dict,
    get_tempdir: typing.Callable[[], str],
    allow_base64=True,
) -> str:
    """Build a notebook file URL using notebook configuration and a filepath or URL."""
    if target is None:
        return None
    missing_base = not base or not base.get("serverRoot") or not base.get("url")
    tfilepath = None
    if isinstance(target, str) and (
        target.lower().startswith("http://")
        or target.lower().startswith("https://")
        or target.startswith("data:")
    ):
        return target
    if is_array(target):
        tdir = get_tempdir()
        target = typing.cast("np.ndarray", target)
        if tdir is None or missing_base:
            return arr2str(target)
        tfilepath = os.path.join(tdir, str(hash(target.data.tobytes())) + ".png")
        if not os.path.isfile(tfilepath):
            cv2.imwrite(tfilepath, target)

    if isinstance(target, str) and target.lower().startswith("s3://"):
        s3 = get_s3()
        tdir = get_tempdir()
        segments = target.lower().replace("s3://", "").split("/")
        bucket = segments[0]
        key = "/".join(segments[1:])
        if tdir is None or missing_base:
            return s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": key},
                ExpiresIn=3600,
            )
        tfilepath = os.path.join(
            tdir,
            str(hash(target)) + os.path.splitext(segments[-1])[1],
        )
        if not os.path.isfile(tfilepath):
            s3.download_file(Bucket=bucket, Key=key, Filename=tfilepath)
    if isinstance(target, str) and os.path.isfile(target):
        if missing_base:
            return file2str(target) if allow_base64 else None
        if (
            ".." in get_relpath(target, os.path.expanduser(base["serverRoot"]))
            and get_tempdir() is not None
        ):
            tdir = get_tempdir()
            tfilepath = os.path.join(
                tdir, str(hash(target)) + os.path.splitext(target)[1]
            )
            if not os.path.isfile(tfilepath):
                shutil.copy(target, tfilepath)
        else:
            tfilepath = target
    if tfilepath is not None:
        return up.urljoin(
            base["url"],
            os.path.join(
                "files",
                get_relpath(tfilepath, os.path.expanduser(base["serverRoot"])),
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


def guess_type(target: typing.Union[str, "np.ndarray"]):
    """Guess the file type for a target."""
    if is_array(target):
        return "image"
    if isinstance(target, str) and target.lower().startswith("s3://"):
        ext = os.path.splitext(os.path.basename(target))[1][1:]
        return "image" if ext in IMAGE_EXTENSIONS else "video"
    if isinstance(target, str) and os.path.isfile(target):
        kind = filetype.guess(target)
        return "image" if kind.mime.startswith("image") else "video"
    return "image"
