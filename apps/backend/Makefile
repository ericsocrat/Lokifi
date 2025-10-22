SHELL := pwsh.exe
.SHELLFLAGS := -NoProfile -Command

PYTHON := python
PIP := pip
VENV := venv
VENV_BIN := $(VENV)/bin
VENV_PYTHON := $(VENV_BIN)/python
VENV_PIP := $(VENV_BIN)/pip

# Windows detection and path adjustments
ifeq ($(OS),Windows_NT)
    SHELL := pwsh.exe
    .SHELLFLAGS := -NoProfile -Command
    VENV_BIN := $(VENV)/Scripts
    VENV_PYTHON := $(VENV_BIN)/python.exe
    VENV_PIP := $(VENV_BIN)/pip.exe
    PYTHONPATH := $(shell pwd)
    export PYTHONPATH
    RM := Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    MKDIR := New-Item -ItemType Directory -Force -Path
else
    export PYTHONPATH := $(shell pwd)
    RM := rm -rf
    MKDIR := mkdir -p
endif

.PHONY: help setup install dev test lint format type-check clean run docker-build docker-run docker-dev docker-prod docker-prod-full monitor redis

help: ## 🎯 Show available commands
	@Write-Host ""
	@Write-Host "🚀 Lokifi Backend Development Commands" -ForegroundColor Cyan
	@Write-Host "=======================================" -ForegroundColor Cyan
	@Write-Host ""
	@Write-Host "Quick Start:" -ForegroundColor Green
	@Write-Host "  make start      - Setup everything and start server" -ForegroundColor Yellow
	@Write-Host "  make dev        - Start development server" -ForegroundColor Yellow
	@Write-Host "  make test       - Run all tests" -ForegroundColor Yellow
	@Write-Host ""
	@Write-Host "Development:" -ForegroundColor Green
	@Write-Host "  make s          - Super short dev server alias" -ForegroundColor Yellow
	@Write-Host "  make t          - Quick test alias" -ForegroundColor Yellow
	@Write-Host "  make l          - Quick lint and fix" -ForegroundColor Yellow
	@Write-Host "  make f          - Quick format" -ForegroundColor Yellow
	@Write-Host ""
	@Write-Host "Setup:" -ForegroundColor Green
	@Write-Host "  make setup      - Create venv and install deps" -ForegroundColor Yellow
	@Write-Host "  make install    - Install/update dependencies" -ForegroundColor Yellow
	@Write-Host ""
	@Write-Host "Testing:" -ForegroundColor Green
	@Write-Host "  make test       - Run all tests" -ForegroundColor Yellow
	@Write-Host "  make test-fast  - Run tests in parallel" -ForegroundColor Yellow
	@Write-Host "  make test-cov   - Run with coverage" -ForegroundColor Yellow
	@Write-Host ""
	@Write-Host "Quality:" -ForegroundColor Green
	@Write-Host "  make lint       - Run linting" -ForegroundColor Yellow
	@Write-Host "  make format     - Format code" -ForegroundColor Yellow
	@Write-Host "  make type-check - Run mypy type checking" -ForegroundColor Yellow
	@Write-Host "  make type-check-strict - Run Pyright strict checking" -ForegroundColor Yellow
	@Write-Host "  make check      - Run all checks" -ForegroundColor Yellow
	@Write-Host ""
	@Write-Host "Database:" -ForegroundColor Green
	@Write-Host "  make db-init    - Initialize database" -ForegroundColor Yellow
	@Write-Host "  make db-migrate - Run migrations" -ForegroundColor Yellow
	@Write-Host "  make db-reset   - Reset database (⚠️ deletes data)" -ForegroundColor Yellow
	@Write-Host ""
	@Write-Host "Maintenance:" -ForegroundColor Green
	@Write-Host "  make clean      - Remove cache files" -ForegroundColor Yellow
	@Write-Host "  make health     - Check system health" -ForegroundColor Yellow
	@Write-Host "  make version    - Show versions" -ForegroundColor Yellow
	@Write-Host ""

# === QUICK COMMANDS ===
start: setup run ## 🚀 Quick start: setup + run server
	@Write-Host "✅ Lokifi backend started!" -ForegroundColor Green

dev: setup ## 🔧 Start development server (short alias for run)
	@Write-Host "🔥 Starting development server..." -ForegroundColor Cyan
	@Write-Host "📡 Server: http://127.0.0.1:8000" -ForegroundColor Blue
	@Write-Host "📖 API Docs: http://127.0.0.1:8000/docs" -ForegroundColor Blue
	$(VENV_PYTHON) -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

s: dev ## ⚡ Super short alias for dev server

t: test ## ⚡ Quick test alias

l: lint-fix ## ⚡ Quick lint and fix

f: format ## ⚡ Quick format alias

# === SETUP ===
setup: $(VENV_BIN)/activate ## 🔧 Create virtual environment and install dependencies
	@echo -e "$(GREEN)✅ Environment setup complete$(NC)"

$(VENV_BIN)/activate: requirements.txt
	@Write-Host "📦 Creating virtual environment..." -ForegroundColor Cyan
	@if (-not (Test-Path $(VENV))) { $(PYTHON) -m venv $(VENV) }
	$(VENV_PIP) install --upgrade pip setuptools wheel
	$(VENV_PIP) install -r requirements.txt
	@Write-Host "✅ Dependencies installed" -ForegroundColor Green

install: setup ## 📦 Install/update dependencies
	@Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
	$(VENV_PIP) install -r requirements.txt
	@Write-Host "✅ Dependencies updated" -ForegroundColor Green

# === SERVER COMMANDS ===
run: setup ## 🚀 Start FastAPI development server
	@echo -e "$(CYAN)🚀 Starting Lokifi backend server...$(NC)"
	$(VENV_PYTHON) -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

run-prod: setup ## 🏭 Start production server
	@echo -e "$(CYAN)🏭 Starting production server...$(NC)"
	$(VENV_PYTHON) -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

run-debug: setup ## 🐛 Start server with debug logging
	@echo -e "$(CYAN)🐛 Starting debug server...$(NC)"
	$(VENV_PYTHON) -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --log-level debug

# === TESTING ===
test: setup ## 🧪 Run all tests
	@Write-Host "🧪 Running tests..." -ForegroundColor Cyan
	$(VENV_PYTHON) -m pytest tests/ -v --tb=short

test-fast: setup ## ⚡ Run tests in parallel (faster)
	@Write-Host "⚡ Running fast tests..." -ForegroundColor Cyan
	$(VENV_PYTHON) -m pytest tests/ -v -n auto

test-cov: setup ## 📊 Run tests with coverage report
	@Write-Host "📊 Running tests with coverage..." -ForegroundColor Cyan
	$(VENV_PYTHON) -m pytest tests/ -v --cov=app --cov-report=html --cov-report=term-missing
	@Write-Host "📄 Coverage report: htmlcov/index.html" -ForegroundColor Blue

test-security: setup ## 🔒 Run security tests
	@echo -e "$(CYAN)🔒 Running security tests...$(NC)"
	$(VENV_PYTHON) test_security_features.py

test-stress: setup ## 💪 Run stress tests
	@echo -e "$(CYAN)💪 Running stress tests...$(NC)"
	$(VENV_PYTHON) stress_test_server.py

test-all: test test-security ## 🎯 Run comprehensive test suite

# === CODE QUALITY ===
lint: setup ## 🔍 Run linting (ruff)
	@Write-Host "🔍 Running linter..." -ForegroundColor Cyan
	$(VENV_PYTHON) -m ruff check .

lint-fix: setup ## 🔧 Run linting with auto-fix
	@Write-Host "🔧 Running linter with auto-fix..." -ForegroundColor Cyan
	$(VENV_PYTHON) -m ruff check . --fix
	@Write-Host "✅ Linting complete" -ForegroundColor Green

format: setup ## 🎨 Format code with black and ruff
	@Write-Host "🎨 Formatting code..." -ForegroundColor Cyan
	$(VENV_PYTHON) -m black .
	$(VENV_PYTHON) -m ruff check . --fix
	@Write-Host "✅ Code formatted" -ForegroundColor Green

type-check: setup ## 🔬 Run type checking with mypy
	@Write-Host "🔬 Running mypy type checker..." -ForegroundColor Cyan
	$(VENV_PYTHON) -m mypy app/
	@Write-Host "✅ Type checking complete" -ForegroundColor Green

type-check-strict: setup ## 🔬 Run strict type checking with Pyright
	@Write-Host "🔬 Running Pyright strict type checker..." -ForegroundColor Cyan
	npx pyright app/
	@Write-Host "✅ Strict type checking complete" -ForegroundColor Green

type-check-all: setup ## 🔬 Run all type checkers (mypy + Pyright)
	@Write-Host "🔬 Running all type checkers..." -ForegroundColor Cyan
	@Write-Host ""
	@Write-Host "=== Mypy ===" -ForegroundColor Yellow
	$(VENV_PYTHON) -m mypy app/
	@Write-Host ""
	@Write-Host "=== Pyright ===" -ForegroundColor Yellow
	npx pyright app/
	@Write-Host ""
	@Write-Host "✅ All type checking complete" -ForegroundColor Green

check: lint type-check test ## ✅ Run all checks (lint, type-check, test)
	@Write-Host "✅ All checks passed!" -ForegroundColor Green

# === DATABASE ===
db-init: setup ## 🗄️ Initialize database
	@echo -e "$(CYAN)🗄️ Initializing database...$(NC)"
	$(VENV_PYTHON) -c "from app.core.database import db_manager; import asyncio; asyncio.run(db_manager.initialize())"

db-migrate: setup ## 🔄 Run database migrations
	@echo -e "$(CYAN)🔄 Running database migrations...$(NC)"
	$(VENV_PYTHON) -m alembic upgrade head

db-reset: setup ## 🗑️ Reset database (WARNING: deletes all data)
	@echo -e "$(RED)🗑️ Resetting database...$(NC)"
	rm -f lokifi.sqlite
	$(MAKE) db-init

# === DOCKER ===
docker-build: ## 🐳 Build Docker image
	@echo -e "$(CYAN)🐳 Building Docker image...$(NC)"
	docker build -t lokifi-backend -f Dockerfile .

docker-run: ## 🐳 Run Docker container
	@echo -e "$(CYAN)🐳 Running Docker container...$(NC)"
	docker run -p 8000:8000 --env-file .env lokifi-backend

docker-dev: ## 🐳 Run with development compose
	@echo -e "$(CYAN)🐳 Starting development containers...$(NC)"
	cd ../../infra/docker && docker compose up --build

docker-prod: ## 🐳 Run production containers (minimal)
	@echo -e "$(CYAN)🐳 Starting production containers...$(NC)"
	cd ../../infra/docker && docker compose -f docker-compose.prod-minimal.yml up --build

docker-prod-full: ## 🐳 Run full production stack with monitoring
	@echo -e "$(CYAN)🐳 Starting full production stack...$(NC)"
	cd ../../infra/docker && docker compose -f docker-compose.production.yml up -d

# === MONITORING ===
monitor: ## 📊 Start full production stack with monitoring
	@echo -e "$(CYAN)📊 Starting production with monitoring...$(NC)"
	cd ../../infra/docker && docker compose -f docker-compose.production.yml up -d

redis: ## 🔴 Start Redis server
	@echo -e "$(CYAN)🔴 Starting Redis...$(NC)"
	cd ../../infra/docker && docker compose up -d redis

# === MAINTENANCE ===
clean: ## 🧹 Remove cache files and build artifacts
	@Write-Host "🧹 Cleaning cache files..." -ForegroundColor Cyan
	@Get-ChildItem -Recurse -Include "*.pyc" -ErrorAction SilentlyContinue | Remove-Item -Force
	@Get-ChildItem -Recurse -Include "__pycache__","*.egg-info",".pytest_cache",".mypy_cache",".coverage","htmlcov",".ruff_cache" -Directory -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
	@Write-Host "✅ Cache cleaned" -ForegroundColor Green

clean-venv: ## 🗑️ Remove virtual environment
	@Write-Host "🗑️ Removing virtual environment..." -ForegroundColor Cyan
	@if (Test-Path $(VENV)) { Remove-Item -Recurse -Force $(VENV) }
	@Write-Host "✅ Virtual environment removed" -ForegroundColor Green

reset: clean-venv setup ## 🔄 Reset environment (clean + setup)
	@Write-Host "✅ Environment reset complete" -ForegroundColor Green

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
	docker build -t lokifi-backend:prod -f Dockerfile.prod .

prod-run: ## 🏭 Run production container
	docker run -p 8000:8000 --env-file .env lokifi-backend:prod
