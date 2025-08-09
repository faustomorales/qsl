PYTHON_EXEC:=uv run
TEST_SCOPE=tests/

.PHONY: build
init: ## Build local development environment
	mkdir -p .venv
	npm run --prefix qslwidgets install
	uv sync
	make build
	@$(PYTHON_EXEC) jupyter labextension develop --overwrite --no-build .
	@$(PYTHON_EXEC) jupyter nbextension install --sys-prefix --symlink --overwrite --py qsl
	@$(PYTHON_EXEC) jupyter nbextension enable --sys-prefix --py qsl
check:  ## Check code for formatting, linting, etc.
	@$(PYTHON_EXEC) pytest -s -v $(TEST_SCOPE)
	@$(PYTHON_EXEC) mypy qsl
	@$(PYTHON_EXEC) pylint qsl
	@$(PYTHON_EXEC) black --diff --check .
develop:  ## Watch/rebuild Jupyter / Eel UI elements.
	@$(PYTHON_EXEC) npm run --prefix qslwidgets watch
storybook:  ## Watch/rebuild isolated UI elements.
	npm run --prefix qslwidgets storybook
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
	npm run --prefix qslwidgets format
build:  # Build the frontend and integrate into the package
	npm run --prefix qslwidgets clean
	@$(PYTHON_EXEC) npm run --prefix qslwidgets build
package: build ## Make a local build of the Python package, source dist and wheel
	rm -rf dist
	uv build --wheel
publish-docs:
	cd docs && git init && git remote add origin git@github.com:faustomorales/qsl.git; git branch -m gh-pages && git add . && git commit --amend --no-edit && git push --force --set-upstream origin gh-pages
publish: package ## Publish the npm and pypi packages.
	cd qslwidgets && npm publish
	twine upload dist/*.whl