import os
import pkg_resources

TEST_IMAGES = [
    pkg_resources.resource_filename(
        "qsl", os.path.join("testing", "data", f"image{n}.jpg")
    )
    for n in range(1, 11)
]

ROTATED_TEST_IMAGES = [
    {
        "angle": angle,
        "name": name,
        "filepath": pkg_resources.resource_filename(
            "qsl", os.path.join("testing", "data", name)
        ),
    }
    for angle, name in [(0, "image3.jpg"), (-45, "image3.45ccw.jpg")]
]

TEST_VIDEOS = [
    pkg_resources.resource_filename(
        "qsl", os.path.join("testing", "data", f"video{n}.m4v")
    )
    for n in range(1, 3)
]
