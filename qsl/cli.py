import click
from . import app


@click.group()
def cli():
    """The QSL CLI application."""


@click.command()
@click.argument("project", nargs=1)
@click.argument("targets", nargs=-1)
def label(project, targets):
    """Launch the labeling application."""
    if not project.endswith(".json"):
        click.echo(
            f"The project path must end in *.json. Received {project}.", err=True
        )
        return
    app.start(jsonpath=project, targets=targets)


cli.add_command(label)

if __name__ == "__main__":
    cli()
