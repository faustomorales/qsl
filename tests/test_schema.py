import os
import tempfile

import fastapi.testclient

from qsl import serve
from qsl.testing.config import TEST_CONFIGURATION
from qsl.types import orm, web


def test_project_creation():
    tfile = tempfile.NamedTemporaryFile()
    filename = tfile.name
    os.environ["DB_CONNECTION_STRING"] = f"sqlite:///{filename}"
    with fastapi.testclient.TestClient(serve.default_app) as client:
        client.get("/auth/login")
        # If this fails it usually means that you left a .env file somewhere.
        _ = web.User.parse_obj(
            client.post(
                "/api/v1/users",
                data=web.User(name="new-test-user", isAdmin=True).json(),
            ).json()
        )
        project_x = TEST_CONFIGURATION.project
        project_id = web.Project.parse_obj(
            client.post(
                "/api/v1/projects", data=web.Project(name=project_x.name).json()
            ).json()
        ).id
        project_y = web.Project.parse_obj(
            client.post(f"/api/v1/projects/{project_id}", data=project_x.json()).json()
        )
        projects = [
            web.Project.parse_obj(project)
            for project in client.get("/api/v1/projects").json()
        ]
        assert len(projects) == 1
        assert projects[0].id == project_y.id
        project_z = web.Project.parse_obj(
            client.get(f"/api/v1/projects/{project_y.id}").json()
        )
        # Ensure that IDs are assigned.
        label = list(project_x.labelingConfiguration.image.single.keys())[0]
        assert project_x.labelingConfiguration.image.single[label].id is None
        assert project_y.labelingConfiguration.image.single[label].id is not None
        # Otherwise they should be the same.
        assert project_x == project_y == project_z

        # Add some images with default labels.
        groups = [
            [
                web.Image.parse_obj(image)
                for image in client.post(
                    f"/api/v1/projects/{project_y.id}/images", data=g.json()
                ).json()
            ]
            for g in TEST_CONFIGURATION.imageGroups
        ]
        assert len(groups[0]) == len(TEST_CONFIGURATION.imageGroups[0].files)
        assert len(groups[1]) == len(TEST_CONFIGURATION.imageGroups[1].files)

        id1 = groups[0][0].id
        id2 = groups[1][-1].id

        # There are defaults set for this image, so the labels
        # should *not* be blank.
        labels_1x = web.ImageLabels.parse_obj(
            client.get(f"/api/v1/projects/{project_y.id}/images/{id1}/labels").json()
        )
        assert labels_1x.image.single["Size"] is not None
        assert labels_1x.default

        # There are no defaults set for this image, so
        # the labels should be blank.
        labels_2x = web.ImageLabels.parse_obj(
            client.get(f"/api/v1/projects/{project_y.id}/images/{id2}/labels").json()
        )
        assert labels_2x.image.single["Size"] is None
        assert labels_1x.default

        # Change default label
        labels_1y = labels_1x.copy(deep=True)
        labels_1y.image.single["Size"] = next(
            k
            for k in project_y.labelingConfiguration.image.single["Size"].options.keys()
            if k != labels_1x.image.single["Size"]
        )
        client.post(
            f"/api/v1/projects/{project_y.id}/images/{id1}/labels",
            data=labels_1y.json(),
        ).json()
        labels_1z = web.ImageLabels.parse_obj(
            client.get(f"/api/v1/projects/{project_y.id}/images/{id1}/labels").json()
        )
        assert labels_1z.image == labels_1y.image
        assert not labels_1z.default

        labels_2y = labels_2x.copy(deep=True)
        box_key, box_config = list(
            project_z.labelingConfiguration.box.multiple.items()
        )[0]
        box_options = list(box_config.options.keys())
        labels_2y.boxes.append(
            web.Box(
                x=0.2,
                y=0.2,
                w=0.1,
                h=0.1,
                labels=web.LabelGroup(
                    single={},
                    text={},
                    multiple={box_key: [box_options[0], box_options[-1]]},
                ),
            )
        )
        client.post(
            f"/api/v1/projects/{project_y.id}/images/{id2}/labels",
            data=labels_2y.json(),
        )
        labels_2z = web.ImageLabels.parse_obj(
            client.get(f"/api/v1/projects/{project_y.id}/images/{id2}/labels").json()
        )
        assert len(labels_2z.boxes) == len(labels_2y.boxes) == 1
        # Ensure we can overwrite labels.
        client.post(
            f"/api/v1/projects/{project_y.id}/images/{id2}/labels",
            data=labels_2y.json(),
        )
