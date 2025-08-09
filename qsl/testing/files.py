import importlib.resources

TEST_IMAGES = [
    importlib.resources.files("qsl").joinpath(f"testing/data/image{n}.jpg")
    for n in range(1, 11)
]

ROTATED_TEST_IMAGES = [
    {
        "angle": angle,
        "name": name,
        "filepath": importlib.resources.files("qsl").joinpath(
            f"testing/data/{name}.jpg"
        ),
    }
    for angle, name in [(0, "image3.jpg"), (-45, "image3.45ccw.jpg")]
]

TEST_VIDEOS = [
    importlib.resources.files("qsl").joinpath(f"testing/data/video{n}.jpg")
    for n in range(1, 3)
]
