# pylint: disable=too-many-lines
import os
import uuid
import time
import tempfile
import logging
import decimal
import sqlite3
import contextlib
import threading
import itertools
import typing

import boto3
import uvicorn  # type: ignore
import pkg_resources
import fastapi
import fastapi.staticfiles
import fastapi.middleware.cors
from authlib.integrations import starlette_client  # type: ignore
from starlette.config import Config
from starlette.requests import Request
from starlette.middleware.sessions import SessionMiddleware
import sqlalchemy as sa

from .types import web, orm

LOGGER = logging.getLogger(__name__)
FRONTEND_DIRECTORY = pkg_resources.resource_filename("qsl", "frontend")


class OAuthConfig(typing.NamedTuple):
    name: str
    client: starlette_client.OAuth
    userinfo_query_key: str
    username_key: str


class AppConfig(typing.NamedTuple):
    single_project: typing.Optional[int]


tls = threading.local()

# pylint: disable=unused-argument
@sa.event.listens_for(sa.engine.Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Set SQLite to enforce foreign keys."""
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# Borrowed from https://github.com/wizeline/sqlalchemy-pagination
def paginate(query, page: int, page_size: typing.Optional[int]):
    """Get a page of results for a query."""
    if page_size is None:
        return query.all()
    if page <= 0:
        raise AttributeError("page needs to be >= 1")
    if page_size <= 0:
        raise AttributeError("page_size needs to be >= 1")
    return query.limit(page_size).offset((page - 1) * page_size).all()


@contextlib.contextmanager
def build_session(engine):
    """Build a session using a thread-local session maker."""
    if not hasattr(tls, "create_session"):
        tls.create_session = sa.orm.sessionmaker(
            bind=engine,
            autocommit=False,
            autoflush=False,
        )
    session = sa.orm.scoped_session(tls.create_session)
    try:
        yield session
        session.commit()  # pylint: disable=no-member
    except:
        session.rollback()  # pylint: disable=no-member
        raise
    finally:
        session.close()  # pylint: disable=no-member


def add_context(
    engine: sa.engine.Engine, oauth=None, frontend_port=None, single_project: int = None
):
    """Add database, S3, Oauth, and frontend port configuration to requests."""

    def middleware(request: fastapi.Request, call_next):
        request.state.engine = engine
        request.state.s3 = boto3.client("s3")
        request.state.oauth = oauth
        request.state.frontend_port = frontend_port
        request.state.single_project = single_project
        response = call_next(request)
        return response

    return middleware


def get_session(request: Request):
    """Provide a transactional scope around a series of operations."""
    with build_session(request.state.engine) as session:
        yield session


def get_single_project(request: Request) -> typing.Optional[int]:
    """Get the single project if we are in single project mode."""
    return request.state.single_project


def get_s3(request: Request):
    """Provide an s3 client"""
    return request.state.s3


def get_oauth(request: Request) -> OAuthConfig:
    """Provide Ouath configuration."""
    return request.state.oauth


def get_frontend_port(request: Request):
    """Get the frontend port for the app."""
    return request.state.frontend_port


def get_current_user(
    request: Request, session: sa.orm.Session = fastapi.Depends(get_session)
):
    """A dependency to get the current user."""
    try:
        return web.User(
            id=request.session["user"]["id"],
            name=request.session["user"]["name"],
            isAdmin=request.session["user"]["isAdmin"],
        )
    except Exception as e:
        raise fastapi.HTTPException(401, detail="Not logged in") from e


LeveledLabel = typing.TypeVar("LeveledLabel", orm.BoxLabel, orm.ImageLevelLabel)


def convert_label_group_to_labels(
    config_group: web.LabelConfigurationGroup,
    label_class: typing.Type[LeveledLabel],
    label_group: web.LabelGroup,
) -> typing.List[LeveledLabel]:
    """Convert a labeling group (box- or image-level) into a list of
    labels."""
    labels = []
    for label_type in orm.LabelType:
        for label_name, label in getattr(label_group, label_type.name).items():
            if label is None:
                continue
            current_config = getattr(config_group, label_type.name)[label_name]
            if label_type == orm.LabelType.single:
                labels.append(
                    label_class(
                        config_id=current_config.id,
                        selected_id=current_config.options[label].id,
                    )
                )
            elif label_type == orm.LabelType.multiple:
                labels.extend(
                    label_class(
                        config_id=current_config.id,
                        selected_id=current_config.options[selection].id,
                    )
                    for selection in label
                )
            elif label_type == orm.LabelType.text:
                labels.append(label_class(config_id=current_config.id, text=label))
    return labels


# pylint: disable=singleton-comparison
def build_images_query(session: sa.orm.Session, project_id=None):
    """Get a query for images that accounts for labeled and unlabeled images."""
    query = (
        session.query(
            orm.Image.id.label("image_id"),
            orm.Image.project_id.label("project_id"),
            sa.cast(
                sa.func.sum(orm.UserImageLabelCollection.id != None) > 0, sa.Integer
            ).label("labeled"),
        )
        .join(orm.UserImageLabelCollection, isouter=True)
        .group_by(orm.Image.id)
    )
    if project_id is not None:
        query = query.filter(orm.Image.project_id == project_id)
    return query


def get_project(
    project_id: int,
    session: sa.orm.Session = fastapi.Depends(get_session),
    user_id: web.User = fastapi.Depends(get_current_user),
) -> web.Project:
    """Get the project configuration."""
    project = session.query(orm.Project).filter(orm.Project.id == project_id).first()
    if project is None:
        raise fastapi.HTTPException(status_code=404, detail="Project not found.")
    configs = (
        session.query(orm.LabelConfig, orm.LabelOption)
        .join(orm.LabelOption, isouter=True)
        .filter(orm.LabelConfig.project_id == project_id)
        .all()
    )
    images = (
        build_images_query(session=session, project_id=project_id)
        .subquery()
        .alias("images")
    )
    image_summary = session.query(
        sa.func.count(images.c.image_id), sa.func.sum(images.c.labeled)
    ).first()
    if image_summary is None:
        n_images, n_labeled = 0, 0
    else:
        n_images, n_labeled = image_summary
    labeling = web.LabelingConfiguration(
        image=web.LabelGroup(single={}, multiple={}, text={}),
        box=web.LabelGroup(single={}, multiple={}, text={}),
    )
    for config, option in configs:
        subgroup = getattr(getattr(labeling, config.level.name), config.label_type.name)
        if config.label_type.name in ["single", "multiple"]:
            subconfig = subgroup.get(
                config.name, web.SelectLabelConfiguration(options={}, id=config.id)
            )
            if option is not None:
                subconfig.options = {
                    **subconfig.options,
                    option.name: web.LabelOption(
                        shortcut=option.shortcut, id=option.id
                    ),
                }
            subgroup[config.name] = subconfig
        elif config.label_type.name == "text":
            subgroup[config.name] = web.TextLabelConfiguration(id=config.id)
    return web.Project(
        labelingConfiguration=labeling,
        id=project_id,
        name=project.name,
        nImages=n_images,
        nLabeled=n_labeled,
    )


def set_config_for_project(
    labelingConfiguration: web.LabelingConfiguration,
    session: sa.orm.Session,
    project_id: int,
    ignore_existing=False,
):
    """Set the labeling configuration for a project, optionally ignoring existing IDs."""
    for level, label_type in itertools.product(orm.Level, orm.LabelType):
        for config_name, input_config in getattr(
            getattr(labelingConfiguration, level.name), label_type.name
        ).items():
            if input_config.id is not None and not ignore_existing:
                if label_type is orm.LabelType.text:
                    # Text inputs don't have any configuration to update.
                    continue
                for option_name, option_config in input_config.options.items():
                    if option_config.id is not None:
                        continue
                    session.add(
                        orm.LabelOption(
                            config_id=input_config.id,
                            name=option_name,
                            shortcut=option_config.shortcut,
                        )
                    )
            else:
                session.add(
                    orm.LabelConfig(
                        name=config_name,
                        label_type=label_type,
                        level=level,
                        project_id=project_id,
                        options=[]
                        if label_type == orm.LabelType.text
                        else [
                            orm.LabelOption(
                                name=option_name, shortcut=option_config.shortcut
                            )
                            for option_name, option_config in input_config.options.items()
                        ],
                    )
                )


def create_project(
    project: web.Project,
    session: sa.orm.Session = fastapi.Depends(get_session),
    user: web.User = fastapi.Depends(get_current_user),
) -> web.Project:
    """Create a new project."""
    project_orm = orm.Project(name=project.name)
    session.add(project_orm)
    session.commit()
    if project.labelingConfiguration is not None:
        set_config_for_project(
            labelingConfiguration=project.labelingConfiguration,
            project_id=project_orm.id,
            ignore_existing=True,
            session=session,
        )
        session.commit()
    return get_project(project_id=project_orm.id, session=session)


def delete_project(
    project_id: int,
    session: sa.orm.Session = fastapi.Depends(get_session),
    user: web.User = fastapi.Depends(get_current_user),
):
    """Delete a project."""
    if not user.isAdmin:
        raise fastapi.HTTPException(
            403, detail="Only administrators may delete project."
        )
    session.query(orm.Project).filter((orm.Project.id == project_id)).delete(
        synchronize_session=False
    )
    session.commit()


def update_project(
    project_id: int,
    project: web.Project,
    session: sa.orm.Session = fastapi.Depends(get_session),
    user: web.User = fastapi.Depends(get_current_user),
) -> web.Project:
    """Update the configuration for a project."""
    current_project = (
        session.query(orm.Project).filter(orm.Project.id == project_id).first()
    )
    if current_project is None:
        raise fastapi.HTTPException(404, "Project not found.")
    if current_project.name != project.name:
        current_project.name = project.name  # Updates the project name
    if project.labelingConfiguration is not None:
        set_config_for_project(
            labelingConfiguration=project.labelingConfiguration,
            session=session,
            project_id=project_id,
        )
    session.commit()
    return get_project(project_id=project_id, session=session)


def list_projects(
    session: sa.orm.Session = fastapi.Depends(get_session),
    user: web.User = fastapi.Depends(get_current_user),
) -> typing.List[web.Project]:
    """List available projects."""
    images = build_images_query(session=session).subquery().alias("images")
    return [
        web.Project(
            id=project.id, name=project.name, nImages=n_images, nLabeled=n_labeled
        )
        for project, n_images, n_labeled in session.query(
            orm.Project, sa.func.count(images.c.image_id), sa.func.sum(images.c.labeled)
        )
        .join(images, images.c.project_id == orm.Project.id, isouter=True)
        .group_by(orm.Project.id)
        .all()
    ]


def create_images(
    group: web.ImageGroup,
    project_id: int,
    session: sa.orm.Session = fastapi.Depends(get_session),
    user: web.User = fastapi.Depends(get_current_user),
) -> typing.List[web.Image]:
    """Add images to a project."""
    project = get_project(project_id=project_id, session=session)
    now = time.time()
    assert (
        project.labelingConfiguration is not None
    ), "Did not find labeling configuratin for project."
    images = [
        orm.Image(
            filepath=filepath,
            project_id=project_id,
            last_access=typing.cast(decimal.Decimal, now),
        )
        for filepath in group.files
    ]
    for image in images:
        session.add(image)

    if group.defaults:
        session.add(
            orm.DefaultImageLabelCollection(
                images=images,
                image_level_labels=convert_label_group_to_labels(
                    config_group=project.labelingConfiguration.image,
                    label_class=orm.ImageLevelLabel,
                    label_group=group.defaults.image,
                ),
                box_level_labels=[
                    orm.Box(
                        x=typing.cast(decimal.Decimal, box.x),
                        y=typing.cast(decimal.Decimal, box.y),
                        w=typing.cast(decimal.Decimal, box.w),
                        h=typing.cast(decimal.Decimal, box.h),
                        points="|".join([f"{p.x},{p.y}" for p in box.points])
                        if box.points
                        else None,
                        labels=convert_label_group_to_labels(
                            config_group=project.labelingConfiguration.box,
                            label_class=orm.BoxLabel,
                            label_group=box.labels,
                        ),
                    )
                    for box in group.defaults.boxes
                ],
            )
        )
    session.commit()
    return [web.Image(id=image.id, filepath=image.filepath) for image in images]


def list_images(
    page: int = 1,
    limit: int = None,
    max_labels: int = None,
    project_id: int = None,
    exclude: typing.Optional[typing.List[int]] = fastapi.Query(None),
    session: sa.orm.Session = fastapi.Depends(get_session),
    shuffle: bool = False,
    exclude_ignored: bool = False,
    user: web.User = fastapi.Depends(get_current_user),
) -> typing.List[web.Image]:
    """Get a list of images.

    Args:
        limit: The number of results to return.
        max_labels: Return images with a maximum number of existing (non-default)
            users having labeled them.
        exclude: A list of image IDs to exclude from the list.
    """
    if shuffle:
        order_by = [
            orm.Image.default_image_label_collection_id.desc(),
            orm.Image.last_access.asc(),
            orm.Image.id,
        ]
    else:
        order_by = [orm.Image.id]
    unignored_user_labels = sa.orm.aliased(orm.UserImageLabelCollection)
    current_user_labels = sa.orm.aliased(orm.UserImageLabelCollection)
    user_label_count = sa.func.count(unignored_user_labels.user_id)
    status = sa.sql.expression.case(
        [
            (
                sa.func.max(current_user_labels.ignored) == 1,
                "ignored",
            ),
            (sa.func.count(current_user_labels.user_id) == 1, "labeled"),
        ],
        else_="unlabeled",
    )
    query = (
        session.query(orm.Image, user_label_count, status)
        .select_from(orm.Image)
        .filter(orm.Image.project_id == project_id)
        .order_by(*order_by)
        .join(
            unignored_user_labels,
            (unignored_user_labels.image_id == orm.Image.id)
            & (~unignored_user_labels.ignored),
            isouter=True,
        )
        .join(
            current_user_labels,
            (current_user_labels.image_id == orm.Image.id)
            & (current_user_labels.user_id == user.id),
            isouter=True,
        )
        .group_by(orm.Image.id)
    )
    if max_labels is not None and max_labels > -1:
        query = query.having(user_label_count <= max_labels)
    if exclude is not None:
        query = query.filter(orm.Image.id.notin_(exclude))
    if exclude_ignored:
        query = query.having(status != "ignored")
    if limit is not None:
        query = query.limit(limit)
    entries = paginate(query, page=page, page_size=limit)
    if shuffle:
        now = time.time()
        for image, _, _ in entries:
            image.last_access = now
    session.commit()

    return [
        web.Image(id=image.id, filepath=image.filepath, labels=labels, status=status)
        for image, labels, status in entries
    ]


def get_file(
    project_id: int,
    image_id: int,
    session: sa.orm.Session = fastapi.Depends(get_session),
    s3=fastapi.Depends(get_s3),
    user: web.User = fastapi.Depends(get_current_user),
) -> typing.Union[fastapi.responses.FileResponse, fastapi.responses.RedirectResponse]:
    """Get an image file."""
    image = (
        session.query(orm.Image)
        .filter((orm.Image.id == image_id) & (orm.Image.project_id == project_id))
        .first()
    )
    if image is None:
        raise fastapi.HTTPException(404, detail="File not found")
    filepath = image.filepath
    if filepath.startswith("s3://"):
        segments = filepath.replace("s3://", "").split("/")
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": segments[0], "Key": "/".join(segments[1:])},
            ExpiresIn=3600,
        )
        return fastapi.responses.RedirectResponse(
            url, headers={"Cache-Control": "max-age=30"}
        )
    if filepath.startswith("http://") or filepath.startswith("https://"):
        return fastapi.responses.RedirectResponse(
            filepath, headers={"Cache-Control": "max-age=30"}
        )
    return fastapi.responses.FileResponse(
        filepath, headers={"Cache-Control": "max-age=0"}
    )


def update_label_group_with_label(
    label_group: web.LabelGroup,
    config: orm.LabelConfig,
    label: typing.Union[orm.ImageLevelLabel, orm.BoxLabel],
    label_option: orm.LabelOption = None,
):
    """Update a label group with a new label entry."""
    if config.label_type == orm.LabelType.single:
        label_group.single[config.name] = (
            label_option.name if label_option is not None else None
        )
    elif config.label_type == orm.LabelType.multiple:
        label_group.multiple[config.name] = label_group.multiple.get(
            config.name, []
        ) + ([label_option.name] if label_option is not None else [])
    elif config.label_type == orm.LabelType.text:
        label_group.text[config.name] = label.text if label is not None else None


def get_labels(
    project_id: int,
    image_id: int,
    user: web.User = fastapi.Depends(get_current_user),
    session: sa.orm.Session = fastapi.Depends(get_session),
) -> web.ImageLabels:
    """Get the labels for an image."""
    labels = web.ImageLabels(
        image=web.LabelGroup(single={}, multiple={}, text={}),
        default=True,
        boxes=[],
        ignored=False,
    )
    box_lookup: typing.Dict[int, web.Box] = {}

    for (
        _,
        _,
        _,
        user_collection,
        user_ignored,
        _,
        config,
        image_label,
        image_label_option,
        box,
        box_label,  # pylint: disable=unused-variable
        box_label_option,  # pylint: disable=unused-variable
    ) in query_labels(
        session=session, project_id=project_id, image_id=image_id, user_id=user.id
    ):
        if user_collection is not None:
            # We have a user collection.
            labels.default = False
        if user_collection is not None:
            labels.ignored = user_ignored
        if config.level == orm.Level.image:
            update_label_group_with_label(
                label_group=labels.image,
                config=config,
                label=image_label,
                label_option=image_label_option,
            )
        elif (config.level == orm.Level.box) and box is not None:
            points = (
                [
                    web.Point(**dict(zip(["x", "y"], point.split(","))))
                    for point in box.points.split("|")
                ]
                if box.points
                else None
            )
            box_web = box_lookup.get(
                box.id,
                web.Box(
                    id=box.id,
                    x=box.x,
                    y=box.y,
                    w=box.w,
                    h=box.h,
                    points=points,
                    labels=web.LabelGroup(single={}, multiple={}, text={}),
                ),
            )
            update_label_group_with_label(
                label_group=box_web.labels,
                config=config,
                label=box_label,
                label_option=box_label_option,
            )
            box_lookup[box.id] = box_web
    labels.boxes = list(box_lookup.values())
    return labels


def delete_labels(
    project_id: int,
    image_id: int,
    user: web.User = fastapi.Depends(get_current_user),
    session: sa.orm.Session = fastapi.Depends(get_session),
) -> web.ImageLabels:
    """Delete user labels for an image."""
    # Delete existing labels for this user.
    session.query(orm.UserImageLabelCollection).filter(
        (orm.UserImageLabelCollection.image_id == image_id)
        & (orm.UserImageLabelCollection.user_id == user.id)
    ).delete(synchronize_session=False)
    session.commit()
    return get_labels(
        image_id=image_id, project_id=project_id, user=user, session=session
    )


def set_labels(
    project_id: int,
    image_id: int,
    labels: web.ImageLabels,
    user: web.User = fastapi.Depends(get_current_user),
    session: sa.orm.Session = fastapi.Depends(get_session),
) -> web.ImageLabels:
    """Assign user labels for an image."""
    # Delete existing labels for this user.
    session.query(orm.UserImageLabelCollection).filter(
        (orm.UserImageLabelCollection.image_id == image_id)
        & (orm.UserImageLabelCollection.user_id == user.id)
    ).delete(synchronize_session=False)
    if labels.ignored:
        assert user.id is not None, "User data is incomplete."
        collection = orm.UserImageLabelCollection(
            user_id=user.id, image_id=image_id, ignored=True
        )
    else:
        config = get_project(
            project_id=project_id, session=session
        ).labelingConfiguration
        assert config is not None, "No configuration found for project."
        assert user.id is not None, "No user found."
        collection = orm.UserImageLabelCollection(
            user_id=user.id,
            image_id=image_id,
            ignored=False,
            image_level_labels=convert_label_group_to_labels(
                config_group=config.image,
                label_class=orm.ImageLevelLabel,
                label_group=labels.image,
            ),
            box_level_labels=[
                orm.Box(
                    x=typing.cast(decimal.Decimal, box.x),
                    y=typing.cast(decimal.Decimal, box.y),
                    w=typing.cast(decimal.Decimal, box.w),
                    h=typing.cast(decimal.Decimal, box.h),
                    points="|".join([f"{p.x},{p.y}" for p in box.points])
                    if box.points
                    else None,
                    labels=convert_label_group_to_labels(
                        config_group=config.box,
                        label_class=orm.BoxLabel,
                        label_group=box.labels,
                    ),
                )
                for box in labels.boxes
            ],
        )
    # Add the new label collection.
    session.add(collection)
    session.commit()
    labels.default = False
    return labels


def query_labels(
    session: sa.orm.Session,
    project_id: int = None,
    image_id: int = None,
    user_id: int = None,
):
    """Build a label query."""
    image_level_option_tbl = sa.orm.aliased(orm.LabelOption)
    box_level_option_tbl = sa.orm.aliased(orm.LabelOption)
    conditions = []
    if project_id is not None:
        conditions.append(orm.Image.project_id == project_id)
    if image_id is not None:
        conditions.append(orm.Image.id == image_id)
    if user_id is not None:
        conditions.append(
            orm.UserImageLabelCollection.user_id == user_id
            or orm.DefaultImageLabelCollection.id is not None
        )
    collections = (
        session.query(
            orm.Image.id.label("image_id"),
            orm.Image.filepath.label("filepath"),
            orm.UserImageLabelCollection.user_id.label("user_id"),
            orm.UserImageLabelCollection.ignored.label("ignored"),
            orm.Image.project_id.label("project_id"),
            orm.DefaultImageLabelCollection.id.label("default_collection"),
            orm.UserImageLabelCollection.id.label("user_collection"),
        )
        .select_from(orm.Image)
        .join(orm.DefaultImageLabelCollection, isouter=True)
        .join(
            orm.UserImageLabelCollection,
            (orm.UserImageLabelCollection.image_id == orm.Image.id)
            & orm.UserImageLabelCollection.user_id
            == user_id,
            isouter=True,
        )
        .filter(*conditions)
        .subquery()
        .alias("collections")
    )
    return (
        session.query(
            collections.c.image_id,
            collections.c.filepath,
            collections.c.user_id,
            collections.c.user_collection,
            collections.c.ignored,
            collections.c.default_collection,
            orm.LabelConfig,
            orm.ImageLevelLabel,
            image_level_option_tbl,
            orm.Box,
            orm.BoxLabel,
            box_level_option_tbl,
        )
        .select_from(collections)
        .join(
            orm.LabelConfig,
            (collections.c.project_id == orm.LabelConfig.project_id),
        )
        .join(
            orm.ImageLevelLabel,
            sa.sql.expression.case(
                [
                    (
                        collections.c.user_collection,
                        collections.c.user_collection
                        == orm.ImageLevelLabel.user_image_label_collection_id,
                    )
                ],
                else_=collections.c.default_collection
                == orm.ImageLevelLabel.default_image_label_collection_id,
            )
            & (orm.ImageLevelLabel.config_id == orm.LabelConfig.id),
            isouter=True,
        )
        .join(
            image_level_option_tbl,
            image_level_option_tbl.id == orm.ImageLevelLabel.selected_id,
            isouter=True,
        )
        .join(
            orm.Box,
            sa.sql.expression.case(
                [
                    (
                        collections.c.user_collection,
                        collections.c.user_collection
                        == orm.Box.user_image_label_collection_id,
                    )
                ],
                else_=collections.c.default_collection
                == orm.Box.default_image_label_collection_id,
            ),
            isouter=True,
        )
        .join(
            orm.BoxLabel,
            (orm.BoxLabel.box_id == orm.Box.id)
            & (orm.BoxLabel.config_id == orm.LabelConfig.id),
            isouter=True,
        )
        .join(
            box_level_option_tbl,
            box_level_option_tbl.id == orm.BoxLabel.selected_id,
            isouter=True,
        )
        .all()
    )


def export_project(
    project_id: int,
    user: web.User = fastapi.Depends(get_current_user),
    session: sa.orm.Session = fastapi.Depends(get_session),
) -> web.Project:
    """Export a project with its labels."""
    label_mapping: typing.Dict[
        int, typing.Dict[int, typing.Tuple[web.LabelGroup, typing.Dict[int, web.Box]]]
    ] = {}
    default_label_mapping: typing.Dict[
        int, typing.Tuple[web.LabelGroup, typing.Dict[int, web.Box]]
    ] = {}
    filepath_mapping: typing.Dict[int, str] = {}
    for query_user_id in [u.id for u in list_users(session=session, user=user)] + [
        None
    ]:
        for (
            image_id,
            image_filepath,
            user_id,
            _,
            user_ignored,
            _,
            config,
            image_label,
            image_label_option,
            box,
            box_label,  # pylint: disable=unused-variable
            box_label_option,  # pylint: disable=unused-variable
        ) in query_labels(
            session=session, project_id=project_id, image_id=None, user_id=query_user_id
        ):
            filepath_mapping[image_id] = image_filepath
            if user_id is None and query_user_id is not None:
                # We're looking for a specific user's labels
                # but this is a default label.
                continue
            if user_id is not None and user_ignored:
                # This is a user-specific label but the user
                # chose to ignore the image.
                continue
            if query_user_id is not None:
                labels, box_lookup = label_mapping.get(image_id, {}).get(
                    user_id,
                    (web.LabelGroup(single={}, multiple={}, text={}), {}),
                )
            else:
                labels, box_lookup = default_label_mapping.get(
                    image_id, (web.LabelGroup(single={}, multiple={}, text={}), {})
                )
            if config.level == orm.Level.image:
                update_label_group_with_label(
                    label_group=labels,
                    config=config,
                    label=image_label,
                    label_option=image_label_option,
                )
            elif (config.level == orm.Level.box) and box is not None:
                box_web = box_lookup.get(
                    box.id,
                    web.Box(
                        id=box.id,
                        x=box.x,
                        y=box.y,
                        w=box.w,
                        h=box.h,
                        labels=web.LabelGroup(single={}, multiple={}, text={}),
                        points=[
                            web.Point(**dict(zip(["x", "y"], point.split(","))))
                            for point in box.points.split("|")
                        ]
                        if box.points
                        else None,
                    ),
                )
                update_label_group_with_label(
                    label_group=box_web.labels,
                    config=config,
                    label=box_label,
                    label_option=box_label_option,
                )
                box_lookup[box.id] = box_web
            if (query_user_id is not None) and (image_id not in label_mapping):
                label_mapping[image_id] = {user_id: (labels, box_lookup)}
            elif (query_user_id is not None) and (
                user_id not in label_mapping[image_id]
            ):
                label_mapping[image_id][user_id] = (labels, box_lookup)
            elif (query_user_id is None) and (image_id not in default_label_mapping):
                default_label_mapping[image_id] = (labels, box_lookup)
    project = get_project(project_id=project_id, session=session)
    project.labels = [
        web.ExportedImageLabels(
            imageId=image_id,
            filepath=filepath,
            labels=[
                web.ExportedUserLabels(
                    userId=user_id,
                    labels=web.ImageLabels(
                        image=image_labels,
                        boxes=list(box_lookup.values()),
                        default=False,
                    ),
                )
                for user_id, (image_labels, box_lookup) in label_mapping[
                    image_id
                ].items()
            ]
            if image_id in label_mapping
            else [],
            defaultLabels=web.ImageLabels(
                image=default_label_mapping[image_id][0],
                boxes=list(default_label_mapping[image_id][1].values()),
                default=True,
            )
            if image_id in default_label_mapping
            else None,
        )
        for image_id, filepath in filepath_mapping.items()
    ]
    return project


def get_my_user(user: web.User = fastapi.Depends(get_current_user)) -> web.User:
    """Get the current user configuration."""
    return user


def create_user(
    new_user: web.User,
    existing_user: web.User = fastapi.Depends(get_current_user),
    session: sa.orm.Session = fastapi.Depends(get_session),
) -> web.User:
    """Create a new user."""
    assert existing_user.isAdmin, "Only admin users can create new users."
    new_user_orm = orm.User(name=new_user.name, is_admin=new_user.isAdmin)
    session.add(new_user_orm)
    session.commit()
    return web.User(
        name=new_user_orm.name, id=new_user_orm.id, isAdmin=new_user.isAdmin
    )


def list_users(
    session: sa.orm.Session = fastapi.Depends(get_session),
    user: web.User = fastapi.Depends(get_current_user),
) -> typing.List[web.User]:
    """List existing users."""
    return [
        web.User(name=user.name, id=user.id, isAdmin=user.is_admin)
        for user in session.query(orm.User).all()
    ]


async def login(request: Request, oauth=fastapi.Depends(get_oauth)):
    """Log a user in."""
    redirect_uri = request.url_for("auth")
    if oauth is not None:
        return await oauth.client.provider.authorize_redirect(request, redirect_uri)
    # Authentication is disabled, skip to the auth callback.
    return fastapi.responses.RedirectResponse(url="/auth/callback")


def auth_config(
    user: web.User = fastapi.Depends(get_current_user),
    oauth: OAuthConfig = fastapi.Depends(get_oauth),
    single_project: int = fastapi.Depends(get_single_project),
) -> web.AuthConfig:
    """Get the authentication configuration for the application."""
    return web.AuthConfig(
        provider=oauth.name if oauth is not None else None,
        singleProject=single_project,
    )


async def auth(
    request: Request,
    session: sa.orm.Session = fastapi.Depends(get_session),
    oauth: OAuthConfig = fastapi.Depends(get_oauth),
    frontend_port: typing.Optional[str] = fastapi.Depends(get_frontend_port),
):
    """Authenticate a user after login (i.e., a callback)"""
    if oauth is None:
        # Authentication is disabled, so we just assume we're using the first user.
        user = session.query(orm.User).first()
    else:
        token = await oauth.client.provider.authorize_access_token(request)
        resp = await oauth.client.provider.get(oauth.userinfo_query_key, token=token)
        resp.raise_for_status()
        name = resp.json()[oauth.username_key]
        user = session.query(orm.User).filter(orm.User.name == name).first()
    if user is None:
        raise fastapi.HTTPException(401, "Could not find user.")
    request.session["user"] = {
        "id": user.id,
        "name": user.name,
        "isAdmin": user.is_admin,
    }
    if frontend_port is not None:
        return fastapi.responses.RedirectResponse(
            url=f"http://localhost:{frontend_port}/"
        )
    return fastapi.responses.RedirectResponse(url="/")


def frontend(path: str):
    """Paths for the frontend."""
    local = os.path.join(FRONTEND_DIRECTORY, path)
    if os.path.isfile(local):
        return fastapi.responses.FileResponse(local)
    return fastapi.responses.FileResponse(
        os.path.join(FRONTEND_DIRECTORY, "index.html")
    )


def build_oauth(
    provider_name: str, single_project: bool = False, **kwargs
) -> typing.Optional[OAuthConfig]:
    """Build an oauth configuration."""
    if provider_name is None:
        return None
    if provider_name == "github":
        client = starlette_client.OAuth()
        client.register(
            name="provider",
            api_base_url="https://api.github.com/",
            access_token_url="https://github.com/login/oauth/access_token",
            authorize_url="https://github.com/login/oauth/authorize",
            userinfo_endpoint="https://api.github.com/user",
            client_kwargs={"scope": "user:email"},
            **kwargs,
        )
        return OAuthConfig(
            client=client,
            name=provider_name,
            userinfo_query_key="user",
            username_key="login",
        )
    if provider_name == "google":
        client = starlette_client.OAuth()
        client.register(
            name="provider",
            api_base_url="https://openidconnect.googleapis.com/v1/",
            server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
            client_kwargs={"scope": "email"},
            **kwargs,
        )
        return OAuthConfig(
            client=client,
            name=provider_name,
            userinfo_query_key="userinfo",
            username_key="email",
        )
    raise NotImplementedError(f"Unsupported Oauth provider: {provider_name}.")


def mock_user_middleware(user: web.User):
    """Middleware to automatically insert the user for the simple app."""

    def middleware(request: fastapi.Request, call_next):
        request.session["user"] = user.dict()
        return call_next(request)

    return middleware


def default_startup(app: fastapi.FastAPI):
    """Default startup for a full implementation of QSL."""

    def startup():
        CONFIG = Config(".env")
        frontend_port = None
        connection_string = CONFIG(
            "DB_CONNECTION_STRING", str, "sqlite:///qsl-labeling.db"
        )
        initial_user = CONFIG("OAUTH_INITIAL_USER", str, "Default User")
        engine = sa.create_engine(
            connection_string,
            echo=False,
            connect_args={"check_same_thread": False},
        )
        orm.BaseModel.metadata.create_all(engine)
        oauth = build_oauth(
            provider_name=CONFIG("OAUTH_PROVIDER", str, None),
            client_id=CONFIG("OAUTH_CLIENT_ID", str, None),
            client_secret=CONFIG("OAUTH_CLIENTS_ECRET", str, None),
        )

        if CONFIG("DEVELOPMENT_MODE", bool, False):
            # We're in development mode and need to let the live frontend
            # access the backend.
            frontend_port = CONFIG("FRONTEND_PORT", str, "5000")
            app.add_middleware(
                fastapi.middleware.cors.CORSMiddleware,
                allow_origins=[
                    f"http://localhost:{frontend_port}",
                ],
                allow_credentials=True,
                allow_methods=["*"],
                allow_headers=["*"],
            )

        with build_session(engine) as session:
            user = next(
                (
                    user
                    for user in list_users(session=session)
                    if user.name == initial_user
                ),
                None,
            )
            if user is None:
                user = create_user(
                    new_user=web.User(name=initial_user, isAdmin=True),
                    existing_user=web.User(name="Dummy User", isAdmin=True),
                    session=session,
                )
            if oauth is None:
                LOGGER.warning("Starting application with no authentication.")
                app.middleware("http")(mock_user_middleware(user))
        app.middleware("http")(
            add_context(
                engine=engine,
                oauth=oauth,
                frontend_port=frontend_port,
                single_project=CONFIG("SINGLE_PROJECT", int, None),
            )
        )
        app.add_middleware(
            SessionMiddleware,
            secret_key=CONFIG("SESSION_SECRET_KEY", str, str(uuid.uuid4())),
            session_cookie="qsl-session",
        )

    return startup


def build_app():
    """Build the QSL app."""
    app = fastapi.FastAPI()
    app.get("/api/v1/projects/{project_id}")(get_project)
    app.post("/api/v1/projects/{project_id}")(update_project)
    app.post("/api/v1/projects/{project_id}/images")(create_images)
    app.get("/api/v1/projects/{project_id}/images")(list_images)
    app.get("/api/v1/projects/{project_id}/images/{image_id}/file")(get_file)
    app.get("/api/v1/projects/{project_id}/images/{image_id}/labels")(get_labels)
    app.delete("/api/v1/projects/{project_id}/images/{image_id}/labels")(delete_labels)
    app.post("/api/v1/projects/{project_id}/images/{image_id}/labels")(set_labels)
    app.mount(
        "/static",
        fastapi.staticfiles.StaticFiles(
            directory=os.path.join(FRONTEND_DIRECTORY, "static")
        ),
        name="frontend-static",
    )
    app.get("/api/v1/projects/{project_id}/export")(export_project)
    app.post("/api/v1/projects")(create_project)
    app.delete("/api/v1/projects/{project_id}")(delete_project)
    app.get("/api/v1/projects")(list_projects)
    app.post("/api/v1/users")(create_user)
    app.get("/auth/login")(login)
    app.get("/api/v1/users")(list_users)
    app.get("/api/v1/auth/config")(auth_config)
    app.get("/api/v1/users/me")(get_my_user)
    app.get("/auth/callback")(auth)
    app.get("/{path:path}")(frontend)
    return app


def launch_app(host: str, port: int, log_level: str, dev: bool):
    """Launch the full QSL app."""
    uvicorn.run(
        "qsl.serve:default_app",
        host=host,
        port=port,
        log_level=log_level,
        reload=dev,
        reload_dirs=[os.path.dirname(__file__)],
    )


def launch_simple_app(host: str, port: int, project: web.Project):
    """Launch a simplified version of the QSL app."""
    user = web.User(name="Default User", id=1, isAdmin=True)
    with tempfile.TemporaryDirectory() as tdir:
        db_conn_string = f"sqlite:///{tdir}/qsl.db"
        engine = sa.create_engine(db_conn_string)
        orm.BaseModel.metadata.create_all(engine)
        with build_session(engine) as session:
            project_id = create_project(project=project, session=session).id
            assert project_id is not None, "Did not get a project ID."
            user = create_user(
                new_user=web.User(name="Default User", isAdmin=True),
                existing_user=web.User(name="Dummy User", isAdmin=True),
                session=session,
            )
            if project.labels:
                default_groups: typing.Dict[web.ImageLabels, typing.Any] = {}
                no_defaults: typing.List[web.ExportedImageLabels] = []
                filepath_to_user_labels: typing.Dict[str, web.ImageLabels] = {}
                for image in project.labels:
                    if (
                        image.defaultLabels is not None
                        and image.defaultLabels not in default_groups
                    ):
                        default_groups[image.defaultLabels] = {
                            "defaults": image.defaultLabels,
                            "images": [image],
                        }
                    elif image.defaultLabels is not None:
                        default_groups[image.defaultLabels]["images"].append(image)
                    else:
                        no_defaults.append(image)
                    if not image.labels:
                        continue
                    if image.labels:
                        for labels in image.labels:
                            if labels.userId != 1:
                                raise ValueError(
                                    "For simple projects, only one user is supported."
                                )
                            filepath_to_user_labels[image.filepath] = labels.labels
                # Create images without defaults.
                filepath_to_id: typing.Dict[str, int] = {}
                for saved in create_images(
                    group=web.ImageGroup(
                        files=[image.filepath for image in no_defaults]
                    ),
                    project_id=project_id,
                    session=session,
                    user=user,
                ):
                    assert saved.id is not None, "Failed to get an image ID."
                    filepath_to_id[saved.filepath] = saved.id

                # Create images with defaults.
                for defaultSet in default_groups.values():
                    for saved in create_images(
                        group=web.ImageGroup(
                            files=[image.filepath for image in defaultSet["images"]],
                            defaults=defaultSet["defaults"],
                        ),
                        project_id=project_id,
                        session=session,
                        user=user,
                    ):
                        assert saved.id is not None, "Failed to get an image ID."
                        filepath_to_id[saved.filepath] = saved.id

                # Set user labels.
                for filepath, user_labels in filepath_to_user_labels.items():
                    set_labels(
                        project_id=project_id,
                        image_id=filepath_to_id[filepath],
                        labels=user_labels,
                        user=user,
                        session=session,
                    )
        os.environ["DB_CONNECTION_STRING"] = db_conn_string
        os.environ["OAUTH_INITIAL_USER"] = user.name
        os.environ["SINGLE_PROJECT"] = str(project_id)
        uvicorn.run(
            "qsl.serve:default_app",
            host=host,
            port=port,
        )
        with build_session(engine) as session:
            return export_project(user=user, project_id=project_id, session=session)
        engine.dispose()


default_app = build_app()
default_app.on_event("startup")(default_startup(default_app))
