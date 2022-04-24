PYTHON_EXEC:=pipenv run
TEST_SCOPE=tests/

.PHONY: build
init: ## Build local development environment
	mkdir -p .venv
	yarn --cwd qslwidgets install
	pipenv install
	@$(PYTHON_EXEC) jupyter labextension develop --overwrite .
	@$(PYTHON_EXEC) jupyter nbextension install --sys-prefix --symlink --overwrite --py qsl
	@$(PYTHON_EXEC) jupyter nbextension enable --sys-prefix --py qsl
check:  ## Check code for formatting, linting, etc.
	@$(PYTHON_EXEC) pytest -s -v $(TEST_SCOPE)
	@$(PYTHON_EXEC) mypy qsl
	@$(PYTHON_EXEC) pylint qsl
	@$(PYTHON_EXEC) black --diff --check .
develop:  ## Watch/rebuild UI elements.
	@$(PYTHON_EXEC) yarn --cwd qslwidgets watch
clean:  ## Clean out all build files.
	rm -rf dist build qslwidgets/lib qslwidgets/dist \
		qsl/ui/labextension \
		qsl/ui/nbextension/index.js* .*_cache
lab:  ## Launch a jupyter lab instance 
	@$(PYTHON_EXEC) jupyter lab
notebook:  ## Launch a jupyter notebook instance
	@$(PYTHON_EXEC) jupyter notebook
format:  ## Format all files.
	@$(PYTHON_EXEC) black qsl
	yarn --cwd qslwidgets format
build:  # Build the frontend and integrate into the package
	rm -rf dist
	@$(PYTHON_EXEC) yarn --cwd qslwidgets build
package: build ## Make a local build of the Python package, source dist and wheel
	@$(PYTHON_EXEC) pyproject-build .

