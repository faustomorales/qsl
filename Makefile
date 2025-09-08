PYTHON_EXEC:=uv run
TEST_SCOPE=tests/

init: ## Build local development environment
	npm run --prefix qslwidgets install
	uv sync
	make build
check:  ## Check code for formatting, linting, etc.
	@$(PYTHON_EXEC) pytest -s -v $(TEST_SCOPE)
	@$(PYTHON_EXEC) mypy qsl
	@$(PYTHON_EXEC) pylint qsl
	@$(PYTHON_EXEC) black --diff --check .
lab:  ## Launch a jupyter lab instance 
	@$(PYTHON_EXEC) jupyter lab
format:  ## Format all files.
	@$(PYTHON_EXEC) black qsl
build: ## Make a local build of the Python package and wheel
	rm -rf dist qslwidgets/dist
	@$(PYTHON_EXEC) npm run --prefix qslwidgets build
	uv build
