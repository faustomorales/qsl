# QSL: Quick and Simple Labeler

![QSL Screenshot](https://raw.githubusercontent.com/faustomorales/qsl/main/docs/screenshot.png)

QSL is a simple, open-source media labeling tool that you can use as a Jupyter widget. It supports:

- Bounding box, polygon, and segmentation mask labeling for images and videos (with support for video segments).
- Configurable keyboard shortcuts for labels.
- Loading images stored locally, on the web, or in cloud storage (currently only AWS S3).
- Pre-loading images in a queue to speed up labeling.

Please note that that QSL is still under development and there are likely to be major bugs, breaking changes, etc. Bug reports and contributions are welcome!

## Getting Started

Install using `pip install qsl`.

Check out the [Colab Notebook](https://colab.research.google.com/drive/1FUFt3fDs7BYpGI1E2z44L-zSRdoDtF8O?usp=sharing) for an example of how to use the Jupyter Widget.

## Development

1. Create a local development environment using `make init`
2. Run widget development with live re-building using `make develop`
3. Run a Jupyter Lab instance using `make lab`. Changes to the JavaScript/TypeScript require a full refresh to take effect.