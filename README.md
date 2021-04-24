# QSL: Quick and Simple Labeler

QSL is a simple image labeling tool. It supports batch and single image labeling using images stored locally, on the web, or in cloud storage (currently only S3).

## Getting Started

Install `qsl` using `pip install qsl`. _You cannot install `qsl` directly from the GitHub repository because the frontend assets must be built manually._

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

### Labeling Remotely Hosted Files

Note that QSL also supports labeling files hosted remotely in cloud storage (only AWS S3 is supported right now) or at a public URL. So, for example, if you want to label some files in an S3 bucket and on a web site, you can use the following command:

```bash
qsl simple-label 's3://my-bucket/images/*.jpg' 's3://my-bucket/other/*.jpg' 'http://my-site/image.jpg' my-qsl-project.json
```

Please note that paths like this must meet some criteria.

- On most platforms / shells, you must use quotes (as shown in the example).
- Your AWS credentials must be available in a form compatible with the default `boto3` credential-finding methods and that those credentials must support the `ListBucket` and `GetObject` actions.

### Advanced Use Cases
Documentation for more advanced use cases (e.g., batched labeling for images with shared default labels, hosting a central QSL server with multiple users, supporting authentication with Google or GitHub OAuth providers, etc.) is forthcoming.

# Development

1. Install Poetry.
2. Clone this repository.
3. Initialize your development environment using `make init`
4. Launch a live reloading version of the frontend and backend using `make develop`.
