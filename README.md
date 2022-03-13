# QSL: Quick and Simple Labeler

![QSL Screenshot](https://raw.githubusercontent.com/faustomorales/qsl/main/docs/screenshot.png)

QSL is a simple, open-source image labeling tool that you can use as a standalone labeling application or as a Jupyter widget. It supports:

- Bounding box and polygon labeling.
- Segmentation mask labeling (Jupyter Widget only)
- Configurable keyboard shortcuts for labels.
- Loading images stored locally, on the web, or in cloud storage (currently only AWS S3).
- Pre-loading images in a queue to speed up labeling (standalone app only).
- Deployment as shared service with support for OAuth (currently only GitHub and Google)

Please note that that QSL is still under development and there are likely to be major bugs, breaking changes, etc. Bug reports and contributions are welcome!

## Getting Started

Install `qsl` using `pip install qsl`. _You cannot install `qsl` directly from the GitHub repository because the frontend assets must be built manually._

### Jupyter Widget

Check out the [Colab Notebook](https://colab.research.google.com/drive/1FUFt3fDs7BYpGI1E2z44L-zSRdoDtF8O?usp=sharing) for an example of how to use the Jupyter Widget.

### Standalone App

You can start a simple project labeling files from your machine using a command like the following.

```bash
qsl simple-label path/to/files/*.jpg my-qsl-project.json
```

Note that if `my-qsl-project.json` already exists and has files in it, these files will be added (the old files will still be in the project). If it does not exist, an empty project file will be created.

You can navigate to the the QSL labeling interface in a browser at `http://localhost:5000` (use the `--host` and `--port` flags to modify this). From the interface, click the link to `Configure project` to set which labels you want to apply to images. Labels can be applied at the `image` or `box` level. There are three kinds of labels you can use:

- _Single_: You select 0 or 1 entry from a list of options.
- _Multiple_: You select 0 or more entries from a list of options.
- _Text_: A free-form text field.

After configuring the project, you can immediately start labeling single images from the main project page. When you're done (or just want to pause) hit Ctrl+C at the prompt where you started QSL. The labels will be available in `my-qsl-project.json`. You can parse this yourself pretty easily, but you can also save yourself the trouble by using the data structures within QSL. For example, the following will load the image- and box-level labels for a project into a `pandas` dataframe.

```python
import pandas as pd
import qsl.types.web as qtw

with open("my-qsl-project.json", "r") as f:
    project = qtw.Project.parse_raw(f.read())

image_level_labels = pd.DataFrame(project.image_level_labels())
box_level_labels = pd.DataFrame(project.box_level_labels())
```

## Development

Create a dev environment using `make init`. Run widget development with live re-building using `make develop-widget`. Run app development using `make develop-app`. Changes to JavaScript/TypeScript require refreshing the browser. Changes to Python requires reloading the kernel (or running with `autoreload`).
