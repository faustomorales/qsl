import click
from . import app, files


@click.group()
def cli():
    """The QSL CLI application."""


@click.command()
@click.argument("project", nargs=1)
@click.argument("targets", nargs=-1)
@click.option("-b", "--batch-size", "batchSize", default=None, type=int)
def label(project, targets, batchSize):
    """Launch the labeling application."""
    if not project.endswith(".json"):
        click.echo(
            f"The project path must end in *.json. Received {project}.", err=True
        )
        return
    app.start(
        items=[
            {"target": t, "type": files.guess_type(t)}
            for t in files.filepaths_from_patterns(targets)
        ],
        jsonpath=project,
        batchSize=batchSize,
    )


cli.add_command(label)

if __name__ == "__main__":
    cli()
