import setuptools

# An ugly hack to allow us to use a subdirectory for the qslwidgets package
# while appeasing https://github.com/jupyterlab/jupyterlab/blob/7d23ead2a51c44e261243f916e46dea46ae1b837/jupyterlab/federated_labextensions.py#L420
# when running `make init` for the first time.
if __name__ == "__main__":
    setuptools.setup(name="qsl")
