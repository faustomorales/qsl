"""This module contains the types that are shared with the frontend as SQLAlchemy types (see frontend/src/machine/sharedTypes.ts)"""
import enum
import typing
import sqlalchemy as sa
import sqlalchemy.sql.type_api as satypes
import sqlalchemy.ext.declarative as saed

BaseModel = saed.declarative_base()

CASCADE = "all, delete, delete-orphan"

if typing.TYPE_CHECKING:
    T = typing.TypeVar("T")

    class SqlAlchemyEnum(
        satypes.TypeEngine[T]
    ):  # pylint: disable=unsubscriptable-object,redefined-outer-name
        def __init__(self, enum: typing.Type[T]) -> None:
            pass


else:
    SqlAlchemyEnum = sa.Enum


class Project(BaseModel):
    __tablename__ = "projects"

    id = sa.Column(sa.Integer, primary_key=True)
    name = sa.Column(sa.String, nullable=False)
    label_configs = sa.orm.relationship(
        "LabelConfig", cascade=CASCADE, back_populates="project", uselist=True
    )
    images = sa.orm.relationship(
        "Image", cascade=CASCADE, back_populates="project", uselist=True
    )


class Level(enum.Enum):
    image = 1
    box = 2


class LabelType(enum.Enum):
    single = 1
    multiple = 2
    text = 3


class LabelConfig(BaseModel):
    __tablename__ = "label_configs"
    __table_args__ = (sa.UniqueConstraint("name", "project_id", "level"),)
    id = sa.Column(sa.Integer, primary_key=True)
    name = sa.Column(sa.String, nullable=False)
    label_type = sa.Column(SqlAlchemyEnum(LabelType), nullable=False)
    level = sa.Column(SqlAlchemyEnum(Level), nullable=False)
    project_id = sa.Column(
        sa.Integer, sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    project = sa.orm.relationship("Project", back_populates="label_configs")
    options = sa.orm.relationship(
        "LabelOption", back_populates="config", cascade=CASCADE, uselist=True
    )
    image_level_labels = sa.orm.relationship(
        "ImageLevelLabel", back_populates="config", cascade=CASCADE, uselist=True
    )
    box_level_labels = sa.orm.relationship(
        "BoxLabel", back_populates="config", cascade=CASCADE, uselist=True
    )


class LabelOption(BaseModel):
    __tablename__ = "label_options"

    id = sa.Column(sa.Integer, primary_key=True)
    name = sa.Column(sa.String, nullable=False)
    shortcut = sa.Column(sa.String(length=1))
    config = sa.orm.relationship("LabelConfig", back_populates="options")
    config_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("label_configs.id", ondelete="CASCADE"),
        nullable=False,
    )


class Image(BaseModel):
    __tablename__ = "images"
    __table_args__ = (sa.UniqueConstraint("project_id", "filepath"),)
    id = sa.Column(sa.Integer, primary_key=True)
    default_image_label_collection_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("default_image_label_collections.id"),
        nullable=True,
    )
    last_access = sa.Column(sa.Float)
    project_id = sa.Column(
        sa.Integer, sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    project = sa.orm.relationship("Project", back_populates="images")
    text = sa.Column(sa.String)
    user_image_label_collections = sa.orm.relationship(
        "UserImageLabelCollection", back_populates="image", cascade=CASCADE
    )
    default_image_label_collection = sa.orm.relationship(
        "DefaultImageLabelCollection", back_populates="images"
    )
    filepath = sa.Column(sa.String, nullable=False)


class User(BaseModel):
    __tablename__ = "users"
    id = sa.Column(sa.Integer, primary_key=True)
    name = sa.Column(sa.String, nullable=False, unique=True)
    is_admin = sa.Column(sa.Boolean, nullable=False)
    image_label_collections = sa.orm.relationship(
        "UserImageLabelCollection",
        back_populates="user",
        cascade=CASCADE,
    )


class ImageLevelLabel(BaseModel):
    __tablename__ = "image_level_labels"
    __table_args__ = (
        sa.UniqueConstraint(
            "user_image_label_collection_id",
            "default_image_label_collection_id",
            "config_id",
        ),
    )
    id = sa.Column(sa.Integer, primary_key=True)
    config_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("label_configs.id", ondelete="CASCADE"),
        nullable=False,
    )
    selected_id = sa.Column(
        sa.Integer, sa.ForeignKey("label_options.id", ondelete="CASCADE")
    )
    user_image_label_collection_id = sa.Column(
        sa.Integer, sa.ForeignKey("user_image_label_collections.id", ondelete="CASCADE")
    )
    default_image_label_collection_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("default_image_label_collections.id", ondelete="CASCADE"),
    )
    text = sa.Column(sa.String)
    selected = sa.orm.relationship("LabelOption")
    user_image_label_collection = sa.orm.relationship(
        "UserImageLabelCollection", back_populates="image_level_labels"
    )
    default_image_label_collection = sa.orm.relationship(
        "DefaultImageLabelCollection", back_populates="image_level_labels"
    )
    config = sa.orm.relationship("LabelConfig", back_populates="image_level_labels")


class Box(BaseModel):
    __tablename__ = "boxes"
    id = sa.Column(sa.Integer, primary_key=True)
    x = sa.Column(sa.Float)
    y = sa.Column(sa.Float)
    w = sa.Column(sa.Float)
    h = sa.Column(sa.Float)
    points = sa.Column(sa.String)
    labels = sa.orm.relationship(
        "BoxLabel",
        back_populates="box",
        cascade=CASCADE,
        passive_deletes=True,
        uselist=True,
    )
    user_image_label_collection_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("user_image_label_collections.id", ondelete="CASCADE"),
        nullable=True,
    )
    default_image_label_collection_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("default_image_label_collections.id", ondelete="CASCADE"),
        nullable=True,
    )
    user_image_label_collection = sa.orm.relationship(
        "UserImageLabelCollection", back_populates="box_level_labels"
    )
    default_image_label_collection = sa.orm.relationship(
        "DefaultImageLabelCollection", back_populates="box_level_labels"
    )


class BoxLabel(BaseModel):
    __tablename__ = "box_labels"
    id = sa.Column(sa.Integer, primary_key=True)
    box_id = sa.Column(
        sa.Integer, sa.ForeignKey("boxes.id", ondelete="CASCADE"), nullable=False
    )
    config_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("label_configs.id", ondelete="CASCADE"),
        nullable=False,
    )
    selected_id = sa.Column(
        sa.Integer, sa.ForeignKey("label_options.id", ondelete="CASCADE")
    )
    text = sa.Column(sa.String)
    box = sa.orm.relationship("Box", back_populates="labels")
    selected = sa.orm.relationship("LabelOption")
    config = sa.orm.relationship("LabelConfig", back_populates="box_level_labels")


class UserImageLabelCollection(BaseModel):
    __tablename__ = "user_image_label_collections"
    __table_args__ = (sa.UniqueConstraint("user_id", "image_id"),)
    id = sa.Column(sa.Integer, primary_key=True)
    user_id = sa.Column(
        sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    image_id = sa.Column(
        sa.Integer, sa.ForeignKey("images.id", ondelete="CASCADE"), nullable=False
    )
    ignored = sa.Column(sa.Boolean, nullable=False)
    user = sa.orm.relationship("User", back_populates="image_label_collections")
    image_level_labels = sa.orm.relationship(
        "ImageLevelLabel",
        back_populates="user_image_label_collection",
        cascade=CASCADE,
        passive_deletes=True,
        uselist=True,
    )
    box_level_labels = sa.orm.relationship(
        "Box",
        back_populates="user_image_label_collection",
        cascade=CASCADE,
        passive_deletes=True,
        uselist=True,
    )
    image = sa.orm.relationship(
        "Image",
        back_populates="user_image_label_collections",
    )


class DefaultImageLabelCollection(BaseModel):
    __tablename__ = "default_image_label_collections"
    id = sa.Column(sa.Integer, primary_key=True)
    image_level_labels = sa.orm.relationship(
        "ImageLevelLabel",
        back_populates="default_image_label_collection",
        cascade=CASCADE,
        uselist=True,
    )
    box_level_labels = sa.orm.relationship(
        "Box",
        back_populates="default_image_label_collection",
        cascade=CASCADE,
        uselist=True,
    )
    images = sa.orm.relationship(
        "Image", back_populates="default_image_label_collection", uselist=True
    )
