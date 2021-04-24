import typing
import fnmatch


def get_s3_files_for_pattern(client, pattern: str) -> typing.List[str]:
    """Get a list of S3 keys given a potential wildcard pattern
    (e.g., 's3://bucket/a/b/*/*.jpg')"""
    segments = pattern.replace("s3://", "").split("/")
    bucket = segments[0]
    keypat = "/".join(segments[1:])
    prefix = "/".join(
        segments[1 : 1 + next(i for i, s in enumerate(segments[1:]) if "*" in s)]
    )
    keys = []
    for page in client.get_paginator("list_objects_v2").paginate(
        Bucket="qsl-test-bucket", Prefix=prefix
    ):
        if "Contents" not in page:
            break
        keys.extend(
            [
                e["Key"]
                for e in page["Contents"]
                if (e["Key"] != prefix or e["Key"] == pattern)
            ]
        )
    return [f"s3://{bucket}/{key}" for key in keys if fnmatch.fnmatch(key, keypat)]
