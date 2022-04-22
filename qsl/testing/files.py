import os
import pkg_resources

TEST_IMAGES = [
    pkg_resources.resource_filename(
        "qsl", os.path.join("testing", "data", f"image{n}.jpg")
    )
    for n in range(1, 11)
]

TEST_VIDEOS = [
    pkg_resources.resource_filename(
        "qsl", os.path.join("testing", "data", f"video{n}.m4v")
    )
    for n in range(1, 3)
]
