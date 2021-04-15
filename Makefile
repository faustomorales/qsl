# Prefix for running commands on the host vs in Docker (e.g., dev vs CI)
PYTHON_EXEC:=poetry run
BACKEND_PORT = 5000
FRONTEND_PORT = 5001
TEST_SCOPE=tests/

init-poetry: ## Make a poetry virtualenv on the host
	poetry install

init-yarn:
	cd frontend && yarn install

init: ## Build local development environment
	make init-poetry
	make init-yarn
	# Folder needs to exist, it can be empty.
	mkdir -p ./qsl/frontend/static

develop: ## Start local development on frontend and backend
	FRONTEND_PORT=$(FRONTEND_PORT) $(PYTHON_EXEC) qsl label --dev --port $(BACKEND_PORT) & cd frontend && PORT=$(FRONTEND_PORT) REACT_APP_API_URL=http://localhost:$(BACKEND_PORT) yarn start

lab:  ## Launch a jupyter lab instance 
	@$(PYTHON_EXEC) jupyter lab

format:
	@$(PYTHON_EXEC) black .
	cd frontend && yarn format

check-frontend:  ## Check frontend code
	cd frontend && yarn format-check

check-backend:  ## Check backend code
	@$(PYTHON_EXEC) pytest -s -v $(TEST_SCOPE)
	@$(PYTHON_EXEC) mypy --config-file mypy.ini qsl
	@$(PYTHON_EXEC) pylint qsl
	@$(PYTHON_EXEC) black --diff --check .

build:  # Build the frontend and integrate into the package
	rm -rf qsl/frontend
	cd frontend && yarn build
	mv frontend/build qsl/frontend

package: ## Make a local build of the Python package, source dist and wheel
	@rm -rf dist
	@mkdir -p dist
	@$(EXEC) poetry build