# QSL: Quick and Simple Labeler

QSL is a simple image labeling tool. It supports batch and single image labeling using images stored locally, on the web, or in cloud storage (currently only S3).

## Getting Started

Documentation for more advanced functions is forthcoming, but the following will get you started with basic labeling tasks.

1. Install using `pip install qsl`
2. Start the labeling application from a desired working directory using `qsl label --port <PORT>`. The application will be running at `http://localhost:<PORT>`.
3. Create your first labeling project, configure the labeling task with your desired classes, add images, and then start labeling in single image or batch mode.
4. Export labels for your project in JSON format.

# Development

1. Install Poetry.
2. Clone this repository.
3. Initialize your development environment using `make init`
4. Launch a live reloading version of the frontend and backend using `make develop`.
