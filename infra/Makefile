SHELL := pwsh.exe
.SHELLFLAGS := -NoProfile -Command

# Project directories (relative to infra/)
BACKEND_DIR := ../apps/backend
FRONTEND_DIR := ../apps/frontend
ROOT_DIR := ..

.PHONY: help setup install dev test lint format clean docker-build docker-run

help: ## 🎯 Show available commands for Lokifi full-stack
	@Write-Host ""
	@Write-Host "🚀 Lokifi Full-Stack Development Commands" -ForegroundColor Cyan
	@Write-Host "=========================================" -ForegroundColor Cyan
	@Write-Host ""
	@Write-Host "🔥 Quick Start:" -ForegroundColor Green
	@Write-Host "  make start         - Setup and start both backend & frontend" -ForegroundColor Yellow
	@Write-Host "  make dev           - Start development servers" -ForegroundColor Yellow
	@Write-Host "  make test          - Run all tests" -ForegroundColor Yellow
	@Write-Host ""
	@Write-Host "🛠️ Development:" -ForegroundColor Green
	@Write-Host "  make be            - Backend only (FastAPI)" -ForegroundColor Yellow
	@Write-Host "  make fe            - Frontend only (Next.js)" -ForegroundColor Yellow
	@Write-Host "  make api           - Alias for backend" -ForegroundColor Yellow
	@Write-Host "  make web           - Alias for frontend" -ForegroundColor Yellow
	@Write-Host ""
	@Write-Host "📦 Setup & Install:" -ForegroundColor Green
	@Write-Host "  make setup         - Setup both environments" -ForegroundColor Yellow
	@Write-Host "  make install       - Install/update dependencies" -ForegroundColor Yellow
	@Write-Host ""
	@Write-Host "🧪 Testing:" -ForegroundColor Green
	@Write-Host "  make test-be       - Backend tests only" -ForegroundColor Yellow
	@Write-Host "  make test-fe       - Frontend tests only" -ForegroundColor Yellow
	@Write-Host "  make test-e2e      - End-to-end tests" -ForegroundColor Yellow
	@Write-Host ""
	@Write-Host "🔧 Code Quality:" -ForegroundColor Green
	@Write-Host "  make lint          - Lint both projects" -ForegroundColor Yellow
	@Write-Host "  make format        - Format both projects" -ForegroundColor Yellow
	@Write-Host "  make check         - Run all quality checks" -ForegroundColor Yellow
	@Write-Host ""
	@Write-Host "🐳 Docker:" -ForegroundColor Green
	@Write-Host "  make docker        - Build and run full stack" -ForegroundColor Yellow
	@Write-Host "  make docker-prod   - Production deployment" -ForegroundColor Yellow
	@Write-Host ""
	@Write-Host "🧹 Maintenance:" -ForegroundColor Green
	@Write-Host "  make clean         - Clean all cache files" -ForegroundColor Yellow
	@Write-Host "  make reset         - Reset environments" -ForegroundColor Yellow
	@Write-Host ""
	@Write-Host "ℹ️ Information:" -ForegroundColor Green
	@Write-Host "  make status        - Check system health" -ForegroundColor Yellow
	@Write-Host "  make logs          - Show recent logs" -ForegroundColor Yellow
	@Write-Host ""

# === QUICK START ===
start: setup dev ## 🚀 Quick start: setup everything and start development
	@Write-Host "🎉 Lokifi full-stack started successfully!" -ForegroundColor Green

dev: ## 🔥 Start both backend and frontend development servers
	@Write-Host "🔥 Starting Lokifi development environment..." -ForegroundColor Cyan
	@Write-Host ""
	@Write-Host "⚠️ Note: Start servers in separate terminals:" -ForegroundColor Yellow
	@Write-Host "  Terminal 1: cd apps/backend && make dev" -ForegroundColor White
	@Write-Host "  Terminal 2: cd apps/frontend && npm run dev" -ForegroundColor White
	@Write-Host ""
	@Write-Host "Or use VS Code tasks:" -ForegroundColor Yellow
	@Write-Host "  Press Ctrl+Shift+P → 'Tasks: Run Task' → '🚀 Start All Servers'" -ForegroundColor White
	@Write-Host ""
	@Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Blue
	@Write-Host "🔧 Backend:  http://localhost:8000" -ForegroundColor Blue
	@Write-Host "📖 API Docs: http://localhost:8000/docs" -ForegroundColor Blue
	@Write-Host ""

# === INDIVIDUAL SERVICES ===
be: ## 🔧 Start backend only (FastAPI)
	@Write-Host "🔧 Starting backend development server..." -ForegroundColor Cyan
	@Set-Location $(BACKEND_DIR); make dev

fe: ## 🌐 Start frontend only (Next.js)
	@Write-Host "🌐 Starting frontend development server..." -ForegroundColor Cyan
	@Set-Location $(FRONTEND_DIR); npm run dev

api: be ## 🔧 Alias for backend

web: fe ## 🌐 Alias for frontend

# === SETUP ===
setup: setup-backend setup-frontend ## 📦 Setup both backend and frontend environments
	@Write-Host "✅ Full-stack environment setup complete!" -ForegroundColor Green

setup-backend: ## 📦 Setup backend Python environment
	@Write-Host "📦 Setting up backend environment..." -ForegroundColor Cyan
	@Set-Location $(BACKEND_DIR); make setup

setup-frontend: ## 📦 Setup frontend Node.js environment
	@Write-Host "📦 Setting up frontend environment..." -ForegroundColor Cyan
	@if (-not (Test-Path "$(FRONTEND_DIR)/node_modules")) { Set-Location $(FRONTEND_DIR); npm install } else { Write-Host "✅ Frontend already setup" -ForegroundColor Green }

install: install-backend install-frontend ## 📦 Install/update all dependencies

install-backend: ## 📦 Install/update backend dependencies
	@Write-Host "📦 Installing backend dependencies..." -ForegroundColor Cyan
	@Set-Location $(BACKEND_DIR); make install

install-frontend: ## 📦 Install/update frontend dependencies
	@Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Cyan
	@Set-Location $(FRONTEND_DIR); npm install

# === TESTING ===
test: test-backend test-frontend ## 🧪 Run all tests
	@Write-Host "✅ All tests completed!" -ForegroundColor Green

test-be: test-backend ## 🧪 Run backend tests only

test-backend: ## 🧪 Run backend tests
	@Write-Host "🧪 Running backend tests..." -ForegroundColor Cyan
	@Set-Location $(BACKEND_DIR); make test

test-fe: test-frontend ## 🧪 Run frontend tests only

test-frontend: ## 🧪 Run frontend tests
	@Write-Host "🧪 Running frontend tests..." -ForegroundColor Cyan
	@Set-Location $(FRONTEND_DIR); npm test

test-e2e: ## 🎭 Run end-to-end tests
	@Write-Host "🎭 Running end-to-end tests..." -ForegroundColor Cyan
	@Set-Location $(FRONTEND_DIR); npm run test:e2e

test-all: test test-e2e ## 🎯 Run comprehensive test suite

# === CODE QUALITY ===
lint: lint-backend lint-frontend ## 🔍 Lint both projects
	@Write-Host "✅ All linting passed!" -ForegroundColor Green

lint-backend: ## 🔍 Lint backend code
	@Write-Host "🔍 Linting backend..." -ForegroundColor Cyan
	@Set-Location $(BACKEND_DIR); make lint

lint-frontend: ## 🔍 Lint frontend code
	@Write-Host "🔍 Linting frontend..." -ForegroundColor Cyan
	@Set-Location $(FRONTEND_DIR); npm run lint

format: format-backend format-frontend ## 🎨 Format both projects
	@Write-Host "✅ All code formatted!" -ForegroundColor Green

format-backend: ## 🎨 Format backend code
	@Write-Host "🎨 Formatting backend..." -ForegroundColor Cyan
	@Set-Location $(BACKEND_DIR); make format

format-frontend: ## 🎨 Format frontend code
	@Write-Host "🎨 Formatting frontend..." -ForegroundColor Cyan
	@Set-Location $(FRONTEND_DIR); npm run format -ErrorAction SilentlyContinue

check: lint test ## ✅ Run all quality checks

# === DATABASE ===
db-init: ## 🗄️ Initialize database
	@Write-Host "🗄️ Initializing database..." -ForegroundColor Cyan
	@Set-Location $(BACKEND_DIR); make db-init

db-reset: ## 🗑️ Reset database
	@Write-Host "🗑️ Resetting database..." -ForegroundColor Red
	@Set-Location $(BACKEND_DIR); make db-reset

# === DOCKER ===
docker: docker-build docker-run ## 🐳 Build and run full stack with Docker

docker-build: ## 🐳 Build Docker images
	@Write-Host "🐳 Building Docker images..." -ForegroundColor Cyan
	@Set-Location $(BACKEND_DIR); make docker-build
	@Set-Location $(FRONTEND_DIR); docker build -t lokifi-frontend .

docker-run: ## 🐳 Run Docker containers
	@Write-Host "🐳 Running Docker containers..." -ForegroundColor Cyan
	@docker-compose up --build

docker-prod: ## 🏭 Production Docker deployment
	@Write-Host "🏭 Starting production deployment..." -ForegroundColor Cyan
	@docker-compose -f docker-compose.prod.yml up --build

docker-dev: ## 🐳 Development Docker environment
	@Write-Host "🐳 Starting development containers..." -ForegroundColor Cyan
	@docker-compose up --build

# === MONITORING ===
monitor: ## 📊 Start monitoring services
	@Write-Host "📊 Starting monitoring..." -ForegroundColor Cyan
	@Set-Location $(BACKEND_DIR); make monitor

redis: ## 🔴 Start Redis server
	@Write-Host "🔴 Starting Redis..." -ForegroundColor Cyan
	@Set-Location $(BACKEND_DIR); make redis

# === MAINTENANCE ===
clean: clean-backend clean-frontend ## 🧹 Clean all cache files
	@Write-Host "✅ All cache cleaned!" -ForegroundColor Green

clean-backend: ## 🧹 Clean backend cache
	@Write-Host "🧹 Cleaning backend cache..." -ForegroundColor Cyan
	@Set-Location $(BACKEND_DIR); make clean

clean-frontend: ## 🧹 Clean frontend cache
	@Write-Host "🧹 Cleaning frontend cache..." -ForegroundColor Cyan
	@if (Test-Path "$(FRONTEND_DIR)/.next") { Remove-Item -Recurse -Force "$(FRONTEND_DIR)/.next" }
	@if (Test-Path "$(FRONTEND_DIR)/node_modules/.cache") { Remove-Item -Recurse -Force "$(FRONTEND_DIR)/node_modules/.cache" }
	@if (Test-Path "$(FRONTEND_DIR)/.turbo") { Remove-Item -Recurse -Force "$(FRONTEND_DIR)/.turbo" }
	@Write-Host "✅ Frontend cache cleaned" -ForegroundColor Green

reset: reset-backend reset-frontend ## 🔄 Reset both environments

reset-backend: ## 🔄 Reset backend environment
	@Write-Host "🔄 Resetting backend..." -ForegroundColor Cyan
	@Set-Location $(BACKEND_DIR); make reset

reset-frontend: ## 🔄 Reset frontend environment
	@Write-Host "🔄 Resetting frontend..." -ForegroundColor Cyan
	@if (Test-Path "$(FRONTEND_DIR)/node_modules") { Remove-Item -Recurse -Force "$(FRONTEND_DIR)/node_modules" }
	@if (Test-Path "$(FRONTEND_DIR)/package-lock.json") { Remove-Item -Force "$(FRONTEND_DIR)/package-lock.json" }
	@Set-Location $(FRONTEND_DIR); npm install

# === UTILITIES ===
status: ## 📊 Check system health
	@Write-Host ""
	@Write-Host "📊 Checking system status..." -ForegroundColor Cyan
	@Write-Host ""
	@Write-Host "Backend Health:" -ForegroundColor Yellow
	@try { $$response = Invoke-WebRequest -Uri http://localhost:8000/health -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop; Write-Host "✅ Backend running" -ForegroundColor Green } catch { Write-Host "❌ Backend not running" -ForegroundColor Red }
	@Write-Host ""
	@Write-Host "Frontend Status:" -ForegroundColor Yellow
	@try { $$response = Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop; Write-Host "✅ Frontend running" -ForegroundColor Green } catch { Write-Host "❌ Frontend not running" -ForegroundColor Red }
	@Write-Host ""

logs: ## 📋 Show recent logs
	@Write-Host "📋 Recent logs:" -ForegroundColor Cyan
	@Set-Location $(BACKEND_DIR); make logs
	@Write-Host "💡 Frontend logs: Check browser console" -ForegroundColor Yellow

version: ## ℹ️ Show version information
	@Write-Host ""
	@Write-Host "ℹ️ Lokifi Version Information:" -ForegroundColor Cyan
	@Write-Host ""
	@Write-Host "Backend:" -ForegroundColor Yellow
	@Set-Location $(BACKEND_DIR); make version
	@Write-Host ""
	@Write-Host "Frontend:" -ForegroundColor Yellow
	@Write-Host "Node: $$(node --version)" -ForegroundColor White
	@Write-Host "npm:  $$(npm --version)" -ForegroundColor White
	@Write-Host ""

# === PRODUCTION ===
build: build-backend build-frontend ## 🏗️ Build production assets
	@Write-Host "✅ All production builds complete!" -ForegroundColor Green

build-backend: ## 🏗️ Build backend for production
	@Write-Host "🏗️ Building backend..." -ForegroundColor Cyan
	@Set-Location $(BACKEND_DIR); make prod-build

build-frontend: ## 🏗️ Build frontend for production
	@Write-Host "🏗️ Building frontend..." -ForegroundColor Cyan
	@Set-Location $(FRONTEND_DIR); npm run build

deploy: build ## 🚀 Deploy to production
	@Write-Host "🚀 Deploying to production..." -ForegroundColor Cyan
	@Write-Host "⚠️ Run deployment scripts here" -ForegroundColor Yellow

# === SHORTCUTS ===
s: dev ## ⚡ Super short alias for dev

t: test ## ⚡ Quick test alias

l: lint ## ⚡ Quick lint alias

f: format ## ⚡ Quick format alias

c: clean ## ⚡ Quick clean alias
