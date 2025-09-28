SHELL := /bin/bash
PYTHON := python
PIP := pip
VENV := .venv
VENV_BIN := $(VENV)/bin
VENV_PYTHON := $(VENV_BIN)/python
VENV_PIP := $(VENV_BIN)/pip

# Windows detection
ifeq ($(OS),Windows_NT)
    VENV_BIN := $(VENV)/Scripts
    VENV_PYTHON := $(VENV_BIN)/python.exe
    VENV_PIP := $(VENV_BIN)/pip.exe
endif

.PHONY: help setup install dev test lint format type-check clean run docker-build docker-run

help: ## Show this help message
	@echo "Fynix Backend Development Commands"
	@echo "=================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: $(VENV_BIN)/activate ## Create virtual environment and install dependencies
	@echo "✅ Environment setup complete"

$(VENV_BIN)/activate: requirements.txt
	@echo "Creating virtual environment..."
	$(PYTHON) -m venv $(VENV)
	$(VENV_PIP) install --upgrade pip setuptools wheel
	$(VENV_PIP) install -r requirements.txt
	@echo "Dependencies installed"

install: setup ## Install/update dependencies
	$(VENV_PIP) install -r requirements.txt

dev: setup ## Install development dependencies
	$(VENV_PIP) install -r requirements.txt

run: setup ## Start FastAPI development server
	$(VENV_PYTHON) -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test: setup ## Run all tests
	$(VENV_PYTHON) -m pytest tests/ -v --tb=short

test-cov: setup ## Run tests with coverage report
	$(VENV_PYTHON) -m pytest tests/ -v --cov=app --cov-report=html --cov-report=term-missing

lint: setup ## Run linting (ruff)
	$(VENV_PYTHON) -m ruff check .

lint-fix: setup ## Run linting with auto-fix
	$(VENV_PYTHON) -m ruff check . --fix

format: setup ## Format code with black
	$(VENV_PYTHON) -m black .
	$(VENV_PYTHON) -m ruff check . --fix

type-check: setup ## Run type checking with mypy
	$(VENV_PYTHON) -m mypy app/ --ignore-missing-imports

check: lint type-check test ## Run all checks (lint, type-check, test)

clean: ## Remove cache files and build artifacts
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
	find . -type d -name ".coverage" -delete
	find . -type d -name "htmlcov" -exec rm -rf {} +

clean-venv: ## Remove virtual environment
	rm -rf $(VENV)

reset: clean-venv setup ## Reset environment (clean + setup)

docker-build: ## Build Docker image
	docker build -t fynix-backend -f Dockerfile .

docker-run: ## Run Docker container
	docker run -p 8000:8000 --env-file .env fynix-backend

docker-dev: ## Run with development compose
	docker-compose up --build

# Production targets
prod-build: ## Build production Docker image
	docker build -t fynix-backend:prod -f Dockerfile.prod .

prod-run: ## Run production container
	docker run -p 8000:8000 --env-file .env fynix-backend:prod

# Database targets
db-init: setup ## Initialize database
	$(VENV_PYTHON) -c "from app.db import init_db; init_db()"

db-migrate: setup ## Run database migrations
	$(VENV_PYTHON) -m alembic upgrade head

# Utility targets
deps-update: ## Update requirements.txt with latest versions
	$(VENV_PIP) install --upgrade pip-tools
	$(VENV_PYTHON) -m piptools compile --upgrade requirements.in -o requirements.txt

deps-sync: ## Sync dependencies with requirements.txt
	$(VENV_PIP) install pip-tools
	$(VENV_PYTHON) -m piptools sync requirements.txt

shell: setup ## Open Python shell with app context
	$(VENV_PYTHON) -c "from app.main import app; import IPython; IPython.embed()"

version: ## Show versions of key dependencies
	@echo "Python: $$($(VENV_PYTHON) --version)"
	@echo "FastAPI: $$($(VENV_PYTHON) -c 'import fastapi; print(fastapi.__version__)')"
	@echo "aiohttp: $$($(VENV_PYTHON) -c 'import aiohttp; print(aiohttp.__version__)')"