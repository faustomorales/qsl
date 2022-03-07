import os
import pkg_resources

TEST_FILES = [
    pkg_resources.resource_filename(
        "qsl", os.path.join("testing", "data", f"image{n}.jpg")
    )
    for n in range(1, 11)
]
