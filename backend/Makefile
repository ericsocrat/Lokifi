SHELL := /bin/bash
PYTHON := python
PIP := pip
VENV := venv
VENV_BIN := $(VENV)/bin
VENV_PYTHON := $(VENV_BIN)/python
VENV_PIP := $(VENV_BIN)/pip

# Windows detection and path adjustments
ifeq ($(OS),Windows_NT)
    VENV_BIN := $(VENV)/Scripts
    VENV_PYTHON := $(VENV_BIN)/python.exe
    VENV_PIP := $(VENV_BIN)/pip.exe
    PYTHONPATH := $(shell pwd)
    export PYTHONPATH
else
    export PYTHONPATH := $(shell pwd)
endif

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
PURPLE := \033[0;35m
CYAN := \033[0;36m
NC := \033[0m # No Color

.PHONY: help setup install dev test lint format type-check clean run docker-build docker-run

help: ## 🎯 Show available commands
	@echo -e "$(CYAN)🚀 Fynix Backend Development Commands$(NC)"
	@echo -e "$(CYAN)=====================================$(NC)"
	@echo ""
	@echo -e "$(GREEN)Quick Start:$(NC)"
	@echo -e "  $(YELLOW)make start$(NC)     - Setup everything and start server"
	@echo -e "  $(YELLOW)make dev$(NC)       - Start development server"
	@echo -e "  $(YELLOW)make test$(NC)      - Run all tests"
	@echo ""
	@echo -e "$(GREEN)Available Commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'

# === QUICK COMMANDS ===
start: setup run ## 🚀 Quick start: setup + run server
	@echo -e "$(GREEN)✅ Fynix backend started!$(NC)"

dev: setup ## 🔧 Start development server (short alias for run)
	@echo -e "$(CYAN)🔥 Starting development server...$(NC)"
	$(VENV_PYTHON) -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

s: dev ## ⚡ Super short alias for dev server

t: test ## ⚡ Quick test alias

l: lint-fix ## ⚡ Quick lint and fix

f: format ## ⚡ Quick format alias

# === SETUP ===
setup: $(VENV_BIN)/activate ## 🔧 Create virtual environment and install dependencies
	@echo -e "$(GREEN)✅ Environment setup complete$(NC)"

$(VENV_BIN)/activate: requirements.txt
	@echo -e "$(CYAN)📦 Creating virtual environment...$(NC)"
	$(PYTHON) -m venv $(VENV)
	$(VENV_PIP) install --upgrade pip setuptools wheel
	$(VENV_PIP) install -r requirements.txt
	@echo -e "$(GREEN)✅ Dependencies installed$(NC)"

install: setup ## 📦 Install/update dependencies
	$(VENV_PIP) install -r requirements.txt
	@echo -e "$(GREEN)✅ Dependencies updated$(NC)"

# === SERVER COMMANDS ===
run: setup ## 🚀 Start FastAPI development server
	@echo -e "$(CYAN)🚀 Starting Fynix backend server...$(NC)"
	$(VENV_PYTHON) -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

run-prod: setup ## 🏭 Start production server
	@echo -e "$(CYAN)🏭 Starting production server...$(NC)"
	$(VENV_PYTHON) -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

run-debug: setup ## 🐛 Start server with debug logging
	@echo -e "$(CYAN)🐛 Starting debug server...$(NC)"
	$(VENV_PYTHON) -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --log-level debug

# === TESTING ===
test: setup ## 🧪 Run all tests
	@echo -e "$(CYAN)🧪 Running tests...$(NC)"
	$(VENV_PYTHON) -m pytest tests/ -v --tb=short

test-fast: setup ## ⚡ Run tests in parallel (faster)
	@echo -e "$(CYAN)⚡ Running fast tests...$(NC)"
	$(VENV_PYTHON) -m pytest tests/ -v -n auto

test-cov: setup ## 📊 Run tests with coverage report
	@echo -e "$(CYAN)📊 Running tests with coverage...$(NC)"
	$(VENV_PYTHON) -m pytest tests/ -v --cov=app --cov-report=html --cov-report=term-missing

test-security: setup ## 🔒 Run security tests
	@echo -e "$(CYAN)🔒 Running security tests...$(NC)"
	$(VENV_PYTHON) test_security_features.py

test-stress: setup ## 💪 Run stress tests
	@echo -e "$(CYAN)💪 Running stress tests...$(NC)"
	$(VENV_PYTHON) stress_test_server.py

test-all: test test-security ## 🎯 Run comprehensive test suite

# === CODE QUALITY ===
lint: setup ## 🔍 Run linting (ruff)
	@echo -e "$(CYAN)🔍 Running linter...$(NC)"
	$(VENV_PYTHON) -m ruff check .

lint-fix: setup ## 🔧 Run linting with auto-fix
	@echo -e "$(CYAN)🔧 Running linter with auto-fix...$(NC)"
	$(VENV_PYTHON) -m ruff check . --fix

format: setup ## 🎨 Format code with black and ruff
	@echo -e "$(CYAN)🎨 Formatting code...$(NC)"
	$(VENV_PYTHON) -m black .
	$(VENV_PYTHON) -m ruff check . --fix
	@echo -e "$(GREEN)✅ Code formatted$(NC)"

type-check: setup ## 🔬 Run type checking with mypy
	@echo -e "$(CYAN)🔬 Running type checker...$(NC)"
	$(VENV_PYTHON) -m mypy app/ --ignore-missing-imports

check: lint type-check test ## ✅ Run all checks (lint, type-check, test)
	@echo -e "$(GREEN)✅ All checks passed!$(NC)"

# === DATABASE ===
db-init: setup ## 🗄️ Initialize database
	@echo -e "$(CYAN)🗄️ Initializing database...$(NC)"
	$(VENV_PYTHON) -c "from app.core.database import db_manager; import asyncio; asyncio.run(db_manager.initialize())"

db-migrate: setup ## 🔄 Run database migrations
	@echo -e "$(CYAN)🔄 Running database migrations...$(NC)"
	$(VENV_PYTHON) -m alembic upgrade head

db-reset: setup ## 🗑️ Reset database (WARNING: deletes all data)
	@echo -e "$(RED)🗑️ Resetting database...$(NC)"
	rm -f fynix.sqlite
	$(MAKE) db-init

# === DOCKER ===
docker-build: ## 🐳 Build Docker image
	@echo -e "$(CYAN)🐳 Building Docker image...$(NC)"
	docker build -t fynix-backend -f Dockerfile .

docker-run: ## 🐳 Run Docker container
	@echo -e "$(CYAN)🐳 Running Docker container...$(NC)"
	docker run -p 8000:8000 --env-file .env fynix-backend

docker-dev: ## 🐳 Run with development compose
	@echo -e "$(CYAN)🐳 Starting development containers...$(NC)"
	docker-compose up --build

docker-prod: ## 🐳 Run production containers
	@echo -e "$(CYAN)🐳 Starting production containers...$(NC)"
	docker-compose -f docker-compose.prod.yml up --build

# === MONITORING ===
monitor: ## 📊 Start monitoring services
	@echo -e "$(CYAN)📊 Starting monitoring...$(NC)"
	docker-compose -f docker-compose.monitoring.yml up -d

redis: ## 🔴 Start Redis server
	@echo -e "$(CYAN)🔴 Starting Redis...$(NC)"
	docker-compose -f docker-compose.redis.yml up -d

# === MAINTENANCE ===
clean: ## 🧹 Remove cache files and build artifacts
	@echo -e "$(CYAN)🧹 Cleaning cache files...$(NC)"
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name ".coverage" -delete 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	@echo -e "$(GREEN)✅ Cache cleaned$(NC)"

clean-venv: ## 🗑️ Remove virtual environment
	@echo -e "$(CYAN)🗑️ Removing virtual environment...$(NC)"
	rm -rf $(VENV)

reset: clean-venv setup ## 🔄 Reset environment (clean + setup)
	@echo -e "$(GREEN)✅ Environment reset complete$(NC)"

# === UTILITIES ===
deps-update: ## 📦 Update requirements.txt with latest versions
	@echo -e "$(CYAN)📦 Updating dependencies...$(NC)"
	$(VENV_PIP) install --upgrade pip-tools
	$(VENV_PYTHON) -m piptools compile --upgrade requirements.in -o requirements.txt

deps-sync: ## 🔄 Sync dependencies with requirements.txt
	$(VENV_PIP) install pip-tools
	$(VENV_PYTHON) -m piptools sync requirements.txt

shell: setup ## 🐍 Open Python shell with app context
	@echo -e "$(CYAN)🐍 Opening Python shell...$(NC)"
	$(VENV_PYTHON) -c "from app.main import app; import IPython; IPython.embed()"

version: ## ℹ️ Show versions of key dependencies
	@echo -e "$(CYAN)ℹ️ Version Information:$(NC)"
	@echo -e "Python: $$($(VENV_PYTHON) --version)"
	@echo -e "FastAPI: $$($(VENV_PYTHON) -c 'import fastapi; print(fastapi.__version__)' 2>/dev/null || echo 'Not installed')"
	@echo -e "aiohttp: $$($(VENV_PYTHON) -c 'import aiohttp; print(aiohttp.__version__)' 2>/dev/null || echo 'Not installed')"

logs: ## 📋 Show recent logs
	@echo -e "$(CYAN)📋 Recent logs:$(NC)"
	tail -n 50 logs/*.log 2>/dev/null || echo "No logs found"

health: setup ## 🏥 Check system health
	@echo -e "$(CYAN)🏥 Checking system health...$(NC)"
	$(VENV_PYTHON) -c "
import asyncio
from app.core.database import db_manager
from app.core.advanced_redis_client import advanced_redis_client

async def health_check():
    print('🔍 Database:', 'OK' if await db_manager.health_check() else 'FAIL')
    print('🔍 Redis:', 'OK' if await advanced_redis_client.health_check() else 'FAIL')

asyncio.run(health_check())
"

# === SHORTCUTS ===
status: health ## 📊 Alias for health check

# === FULL STACK COMMANDS ===
fullstack-dev: ## 🌐 Start both backend and frontend (requires terminal multiplexing)
	@echo -e "$(CYAN)🌐 Starting full stack development...$(NC)"
	@echo -e "$(YELLOW)Note: This requires running frontend separately$(NC)"
	@echo -e "$(YELLOW)Run 'cd ../frontend && npm run dev' in another terminal$(NC)"
	$(MAKE) dev

# Production builds
prod-build: ## 🏭 Build production Docker image
	docker build -t fynix-backend:prod -f Dockerfile.prod .

prod-run: ## 🏭 Run production container
	docker run -p 8000:8000 --env-file .env fynix-backend:prod