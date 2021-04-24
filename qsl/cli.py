import os
import glob
import json
import typing

import boto3
import click

import qsl.serve as qs
import qsl.types as qt

from ._version import __version__
from . import file_utils


@click.group()
def cli():
    """The QSL CLI application."""


@click.command()
@click.option("--dev", help="Enable development mode.", is_flag=True, default=False)
@click.option("--host", "-h", default="127.0.0.1", help="Host at which to run labeling")
@click.option(
    "--port", "-p", default=5000, help="Port at which to run labeling", type=int
)
@click.option(
    "--log-level",
    "-l",
    default="info",
    help="The logging level for the labeling application.",
)
def label(host: str, port: int, log_level: str, dev: bool):
    """Launch the labeling application."""
    if dev:
        os.environ["DEVELOPMENT_MODE"] = "1"
    qs.launch_app(host=host, port=port, log_level=log_level, dev=dev)


@click.command()
@click.argument("files_to_add", nargs=-1)
@click.argument("project_file", nargs=1)
@click.option("--host", "-h", default="127.0.0.1", help="Host at which to run labeling")
@click.option(
    "--port", "-p", default=5000, help="Port at which to run labeling", type=int
)
def simple_label(
    files_to_add: typing.List[str], project_file: str, host: str, port: int
):
    """Launch the simplified labeling application."""
    if not os.path.isfile(project_file):
        click.echo("Did not find a project file. Creating a blank one.")
        with open(project_file, "w") as f:
            f.write(
                qt.web.Project(
                    name=os.path.splitext(os.path.basename(project_file))[0]
                ).json()
            )
    with open(project_file, "r") as f:
        project = qt.web.Project.parse_obj(json.loads(f.read()))
    if project.labels is None:
        project.labels = []
    incoming_filepaths = []
    s3 = None
    for file_or_pattern in files_to_add:
        if file_or_pattern.startswith("s3://"):
            if s3 is None:
                s3 = boto3.client("s3")
            incoming_filepaths.extend(
                file_utils.get_s3_files_for_pattern(client=s3, pattern=file_or_pattern)
            )
        elif file_or_pattern.startswith("http://"):
            # We have no way of handling wildcards for HTTP URLs.
            incoming_filepaths.append(file_or_pattern)
        else:
            incoming_filepaths.extend(glob.glob(file_or_pattern))
    project.labels.extend(
        [
            qt.web.ExportedImageLabels(
                filepath=filepath, default=None, imageId=None, labels=[]
            )
            for filepath in set(incoming_filepaths).difference(project.get_filepaths())
        ]
    )
    project = qs.launch_simple_app(host=host, port=port, project=project)
    with open(project_file, "w") as f:
        f.write(project.json())


@click.command()
def version():
    """Get the version number for qsl."""
    click.echo(__version__)


cli.add_command(label)
cli.add_command(simple_label)
cli.add_command(version)

if __name__ == "__main__":
    cli()
