import os
import json

import click

import qsl.serve as qs
import qsl.types as qt

from ._version import __version__


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
@click.argument("project_file")
@click.option("--host", "-h", default="127.0.0.1", help="Host at which to run labeling")
@click.option(
    "--port", "-p", default=5000, help="Port at which to run labeling", type=int
)
def simple_label(project_file: str, host: str, port: int):
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
        project = qs.launch_simple_app(
            host=host, port=port, project=qt.web.Project.parse_obj(json.loads(f.read()))
        )
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
