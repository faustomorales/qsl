# Prefix for running commands on the host vs in Docker (e.g., dev vs CI)
PYTHON_EXEC:=poetry run
BACKEND_PORT = 5000
FRONTEND_PORT = 5001
TEST_SCOPE=tests/

init: ## Build local development environment
	poetry install
	yarn --cwd frontend install
	# Folder needs to exist, it can be empty.
	mkdir -p ./qsl/frontend/static

develop: ## Start local development on frontend and backend
	FRONTEND_PORT=$(FRONTEND_PORT) $(PYTHON_EXEC) qsl label --dev --host 0.0.0.0 --port $(BACKEND_PORT) & cd frontend && PORT=$(FRONTEND_PORT) REACT_APP_BACKEND_PORT=$(BACKEND_PORT) yarn start

lab:  ## Launch a jupyter lab instance 
	@$(PYTHON_EXEC) jupyter lab

format:
	@$(PYTHON_EXEC) black .
	yarn --cwd frontend format

check:  ## Check code for formatting, linting, etc.
	yarn --cwd frontend format-check
	@$(PYTHON_EXEC) pytest -s -v $(TEST_SCOPE)
	@$(PYTHON_EXEC) mypy --config-file mypy.ini qsl
	@$(PYTHON_EXEC) pylint qsl
	@$(PYTHON_EXEC) black --diff --check .

build:  # Build the frontend and integrate into the package
	rm -rf qsl/frontend
	@$(PYTHON_EXEC) yarn --cwd frontend build && mv frontend/build qsl/frontend

clean:
	rm -rf dist build

package: build ## Make a local build of the Python package, source dist and wheel
	@rm -rf dist
	@mkdir -p dist
	@$(EXEC) poetry build
