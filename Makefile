# Prefix for running commands on the host vs in Docker (e.g., dev vs CI)
PYTHON_EXEC:=pipenv run
BACKEND_PORT = 5000
FRONTEND_PORT = 5001
TEST_SCOPE=tests/

.PHONY: build
init: ## Build local development environment
	mkdir -p .venv
	pipenv install
	yarn install
	yarn --cwd frontend install
	@$(PYTHON_EXEC) jupyter labextension develop --overwrite .
	@$(PYTHON_EXEC) jupyter nbextension install --sys-prefix --symlink --overwrite --py qsl
	@$(PYTHON_EXEC) jupyter nbextension enable --sys-prefix --py qsl
	# Folder needs to exist, it can be empty.
	mkdir -p ./qsl/frontend/static
check:  ## Check code for formatting, linting, etc.
	yarn --cwd frontend format-check
	@$(PYTHON_EXEC) pytest -s -v $(TEST_SCOPE)
	@$(PYTHON_EXEC) mypy qsl
	@$(PYTHON_EXEC) pylint qsl
	@$(PYTHON_EXEC) black --diff --check .
develop-widget:
	@$(PYTHON_EXEC) yarn watch
develop-app: ## Start local development on frontend and backend
	FRONTEND_PORT=$(FRONTEND_PORT) $(PYTHON_EXEC) qsl label --dev --host 0.0.0.0 --port $(BACKEND_PORT) & cd frontend && PORT=$(FRONTEND_PORT) REACT_APP_BACKEND_PORT=$(BACKEND_PORT) yarn start
clean:
	rm -rf dist build
lab:  ## Launch a jupyter lab instance 
	@$(PYTHON_EXEC) jupyter lab
notebook:  ## Launch a jupyter notebook instance
	@$(PYTHON_EXEC) jupyter notebook
format:  ## Format all files.
	@$(PYTHON_EXEC) black qsl
	yarn format
	yarn --cwd frontend format
build:  # Build the frontend and integrate into the package
	rm -rf dist
	@$(PYTHON_EXEC) yarn build
	rm -rf qsl/frontend
	SKIP_PREFLIGHT_CHECK=true yarn --cwd frontend build
	mv frontend/build qsl/frontend
package: build ## Make a local build of the Python package, source dist and wheel
	@$(PYTHON_EXEC) pyproject-build .

