"""Shared types between frontend and backend. See frontend/src/machine/sharedTypes.ts"""

import typing
import typing_extensions as tx

from pydantic import BaseModel  # pylint: disable=no-name-in-module


class LabelGroup(BaseModel):
    single: typing.Dict[str, typing.Optional[str]]
    multiple: typing.Dict[str, typing.List[str]]
    text: typing.Dict[str, typing.Optional[str]]


class Box(BaseModel):
    id: typing.Optional[int]
    x: float
    y: float
    w: float
    h: float
    labels: LabelGroup


class ImageLabels(BaseModel):
    image: LabelGroup
    boxes: typing.List[Box]
    default: typing.Optional[bool]
    ignored: typing.Optional[bool]


class LabelOption(BaseModel):
    shortcut: str
    id: typing.Optional[int]

    def __eq__(self, other):
        if self.__class__ != other.__class__:
            return False
        return other.shortcut == self.shortcut


class SelectLabelConfiguration(BaseModel):
    options: typing.Mapping[str, LabelOption]
    id: typing.Optional[int]

    def __eq__(self, other):
        if self.__class__ != other.__class__:
            return False
        return other.options == self.options


class TextLabelConfiguration(BaseModel):
    id: typing.Optional[int]

    def __eq__(self, other):
        if self.__class__ != other.__class__:
            return False
        return True


class LabelConfigurationGroup(BaseModel):
    single: typing.Dict[str, SelectLabelConfiguration]
    multiple: typing.Dict[str, SelectLabelConfiguration]
    text: typing.Dict[str, TextLabelConfiguration]

    def __eq__(self, other):
        if self.__class__ != other.__class__:
            return False
        return (
            self.single == other.single
            and self.multiple == other.multiple
            and self.text == other.text
        )


class LabelingConfiguration(BaseModel):
    image: LabelConfigurationGroup
    box: LabelConfigurationGroup

    def __eq__(self, other):
        if self.__class__ != other.__class__:
            return False
        return self.image == other.image and self.box == other.box


class User(BaseModel):
    id: typing.Optional[int]
    name: str
    isAdmin: bool


class Image(BaseModel):
    id: int
    filepath: str
    labels: typing.Optional[int]
    status: typing.Optional[tx.Literal["ignored", "labeled", "unlabeled"]]


class ImageGroup(BaseModel):
    files: typing.List[str]
    defaults: typing.Optional[ImageLabels]


class ExportedUserLabels(BaseModel):
    userId: int
    labels: ImageLabels


class ExportedImageLabels(BaseModel):
    imageId: int
    filepath: str
    labels: typing.List[ExportedUserLabels]


class Project(BaseModel):
    id: typing.Optional[int]
    name: str
    nImages: typing.Optional[int]
    nLabeled: typing.Optional[int]
    labelingConfiguration: typing.Optional[LabelingConfiguration]
    labels: typing.Optional[typing.List[ExportedImageLabels]]

    def __eq__(self, other):
        if self.__class__ != other.__class__:
            return False
        return self.labelingConfiguration == other.labelingConfiguration


class InitializationConfiguration(BaseModel):
    imageGroups: typing.List[ImageGroup]
    project: Project


class AuthConfig(BaseModel):
    provider: typing.Optional[tx.Literal["github", "google"]]
