import glob
import typing
import fnmatch
import boto3


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


def filepaths_from_patterns(patterns: typing.List[str], s3=None) -> typing.List[str]:
    """Create filepaths from patterns."""
    filepaths = []
    for file_or_pattern in patterns:
        if file_or_pattern.startswith("s3://"):
            if s3 is None:
                s3 = boto3.client("s3")
            filepaths.extend(
                get_s3_files_for_pattern(client=s3, pattern=file_or_pattern)
            )
        elif file_or_pattern.startswith("http://"):
            # We have no way of handling wildcards for HTTP URLs.
            filepaths.append(file_or_pattern)
        else:
            filepaths.extend(glob.glob(file_or_pattern))
    return filepaths
