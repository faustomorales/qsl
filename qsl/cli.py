import os

import uvicorn  # type: ignore
import click


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
    uvicorn.run(
        "qsl.serve:app",
        host=host,
        port=port,
        log_level=log_level,
        reload=dev,
        reload_dirs=[os.path.dirname(__file__)],
    )


cli.add_command(label)

if __name__ == "__main__":
    cli()
