SHELL := /bin/bash

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
PURPLE := \033[0;35m
CYAN := \033[0;36m
NC := \033[0m # No Color

# Project directories
BACKEND_DIR := backend
FRONTEND_DIR := frontend

.PHONY: help setup install dev test lint format clean docker-build docker-run

help: ## 🎯 Show available commands for Fynix full-stack
	@echo -e "$(CYAN)🚀 Fynix Full-Stack Development Commands$(NC)"
	@echo -e "$(CYAN)=======================================$(NC)"
	@echo ""
	@echo -e "$(GREEN)🔥 Quick Start:$(NC)"
	@echo -e "  $(YELLOW)make start$(NC)        - Setup and start both backend & frontend"
	@echo -e "  $(YELLOW)make dev$(NC)          - Start development servers"
	@echo -e "  $(YELLOW)make test$(NC)         - Run all tests"
	@echo ""
	@echo -e "$(GREEN)🛠️ Development:$(NC)"
	@echo -e "  $(YELLOW)make be$(NC)           - Backend only (FastAPI)"
	@echo -e "  $(YELLOW)make fe$(NC)           - Frontend only (Next.js)"
	@echo -e "  $(YELLOW)make api$(NC)          - Alias for backend"
	@echo -e "  $(YELLOW)make web$(NC)          - Alias for frontend"
	@echo ""
	@echo -e "$(GREEN)📦 Setup & Install:$(NC)"
	@echo -e "  $(YELLOW)make setup$(NC)        - Setup both environments"
	@echo -e "  $(YELLOW)make install$(NC)      - Install/update dependencies"
	@echo ""
	@echo -e "$(GREEN)🧪 Testing:$(NC)"
	@echo -e "  $(YELLOW)make test-be$(NC)      - Backend tests only"
	@echo -e "  $(YELLOW)make test-fe$(NC)      - Frontend tests only"
	@echo -e "  $(YELLOW)make test-e2e$(NC)     - End-to-end tests"
	@echo ""
	@echo -e "$(GREEN)🔧 Code Quality:$(NC)"
	@echo -e "  $(YELLOW)make lint$(NC)         - Lint both projects"
	@echo -e "  $(YELLOW)make format$(NC)       - Format both projects"
	@echo -e "  $(YELLOW)make check$(NC)        - Run all quality checks"
	@echo ""
	@echo -e "$(GREEN)🐳 Docker:$(NC)"
	@echo -e "  $(YELLOW)make docker$(NC)       - Build and run full stack"
	@echo -e "  $(YELLOW)make docker-prod$(NC)  - Production deployment"
	@echo ""
	@echo -e "$(GREEN)🧹 Maintenance:$(NC)"
	@echo -e "  $(YELLOW)make clean$(NC)        - Clean all cache files"
	@echo -e "  $(YELLOW)make reset$(NC)        - Reset environments"
	@echo ""
	@echo -e "$(GREEN)ℹ️ Information:$(NC)"
	@echo -e "  $(YELLOW)make status$(NC)       - Check system health"
	@echo -e "  $(YELLOW)make logs$(NC)         - Show recent logs"

# === QUICK START ===
start: setup dev ## 🚀 Quick start: setup everything and start development
	@echo -e "$(GREEN)🎉 Fynix full-stack started successfully!$(NC)"

dev: ## 🔥 Start both backend and frontend development servers
	@echo -e "$(CYAN)🔥 Starting Fynix development environment...$(NC)"
	@echo -e "$(YELLOW)Starting backend server...$(NC)"
	@cd $(BACKEND_DIR) && make dev &
	@sleep 3
	@echo -e "$(YELLOW)Starting frontend server...$(NC)"
	@cd $(FRONTEND_DIR) && npm run dev &
	@echo -e "$(GREEN)✅ Both servers starting...$(NC)"
	@echo -e "$(BLUE)🌐 Frontend: http://localhost:3000$(NC)"
	@echo -e "$(BLUE)🔧 Backend:  http://localhost:8000$(NC)"
	@echo -e "$(YELLOW)Press Ctrl+C to stop both servers$(NC)"

# === INDIVIDUAL SERVICES ===
be: ## 🔧 Start backend only (FastAPI)
	@echo -e "$(CYAN)🔧 Starting backend development server...$(NC)"
	@cd $(BACKEND_DIR) && make dev

fe: ## 🌐 Start frontend only (Next.js)
	@echo -e "$(CYAN)🌐 Starting frontend development server...$(NC)"
	@cd $(FRONTEND_DIR) && npm run dev

api: be ## 🔧 Alias for backend

web: fe ## 🌐 Alias for frontend

# === SETUP ===
setup: setup-backend setup-frontend ## 📦 Setup both backend and frontend environments
	@echo -e "$(GREEN)✅ Full-stack environment setup complete!$(NC)"

setup-backend: ## 📦 Setup backend Python environment
	@echo -e "$(CYAN)📦 Setting up backend environment...$(NC)"
	@cd $(BACKEND_DIR) && make setup

setup-frontend: ## 📦 Setup frontend Node.js environment
	@echo -e "$(CYAN)📦 Setting up frontend environment...$(NC)"
	@cd $(FRONTEND_DIR) && npm install

install: install-backend install-frontend ## 📦 Install/update all dependencies

install-backend: ## 📦 Install/update backend dependencies
	@echo -e "$(CYAN)📦 Installing backend dependencies...$(NC)"
	@cd $(BACKEND_DIR) && make install

install-frontend: ## 📦 Install/update frontend dependencies
	@echo -e "$(CYAN)📦 Installing frontend dependencies...$(NC)"
	@cd $(FRONTEND_DIR) && npm install

# === TESTING ===
test: test-backend test-frontend ## 🧪 Run all tests
	@echo -e "$(GREEN)✅ All tests completed!$(NC)"

test-be: test-backend ## 🧪 Run backend tests only

test-backend: ## 🧪 Run backend tests
	@echo -e "$(CYAN)🧪 Running backend tests...$(NC)"
	@cd $(BACKEND_DIR) && make test

test-fe: test-frontend ## 🧪 Run frontend tests only

test-frontend: ## 🧪 Run frontend tests
	@echo -e "$(CYAN)🧪 Running frontend tests...$(NC)"
	@cd $(FRONTEND_DIR) && npm run test:ci

test-e2e: ## 🎭 Run end-to-end tests
	@echo -e "$(CYAN)🎭 Running end-to-end tests...$(NC)"
	@cd $(FRONTEND_DIR) && npm run test:e2e

test-all: test test-e2e ## 🎯 Run comprehensive test suite

# === CODE QUALITY ===
lint: lint-backend lint-frontend ## 🔍 Lint both projects

lint-backend: ## 🔍 Lint backend code
	@echo -e "$(CYAN)🔍 Linting backend...$(NC)"
	@cd $(BACKEND_DIR) && make lint

lint-frontend: ## 🔍 Lint frontend code
	@echo -e "$(CYAN)🔍 Linting frontend...$(NC)"
	@cd $(FRONTEND_DIR) && npm run lint

format: format-backend format-frontend ## 🎨 Format both projects

format-backend: ## 🎨 Format backend code
	@echo -e "$(CYAN)🎨 Formatting backend...$(NC)"
	@cd $(BACKEND_DIR) && make format

format-frontend: ## 🎨 Format frontend code
	@echo -e "$(CYAN)🎨 Formatting frontend...$(NC)"
	@cd $(FRONTEND_DIR) && npm run lint -- --fix 2>/dev/null || true

check: lint test ## ✅ Run all quality checks

# === DATABASE ===
db-init: ## 🗄️ Initialize database
	@echo -e "$(CYAN)🗄️ Initializing database...$(NC)"
	@cd $(BACKEND_DIR) && make db-init

db-reset: ## 🗑️ Reset database
	@echo -e "$(RED)🗑️ Resetting database...$(NC)"
	@cd $(BACKEND_DIR) && make db-reset

# === DOCKER ===
docker: docker-build docker-run ## 🐳 Build and run full stack with Docker

docker-build: ## 🐳 Build Docker images
	@echo -e "$(CYAN)🐳 Building Docker images...$(NC)"
	@cd $(BACKEND_DIR) && make docker-build
	@cd $(FRONTEND_DIR) && docker build -t fynix-frontend .

docker-run: ## 🐳 Run Docker containers
	@echo -e "$(CYAN)🐳 Running Docker containers...$(NC)"
	docker-compose up --build

docker-prod: ## 🏭 Production Docker deployment
	@echo -e "$(CYAN)🏭 Starting production deployment...$(NC)"
	docker-compose -f docker-compose.prod.yml up --build

docker-dev: ## 🐳 Development Docker environment
	@echo -e "$(CYAN)🐳 Starting development containers...$(NC)"
	docker-compose up --build

# === MONITORING ===
monitor: ## 📊 Start monitoring services
	@echo -e "$(CYAN)📊 Starting monitoring...$(NC)"
	@cd $(BACKEND_DIR) && make monitor

redis: ## 🔴 Start Redis server
	@echo -e "$(CYAN)🔴 Starting Redis...$(NC)"
	@cd $(BACKEND_DIR) && make redis

# === MAINTENANCE ===
clean: clean-backend clean-frontend ## 🧹 Clean all cache files
	@echo -e "$(GREEN)✅ All cache cleaned!$(NC)"

clean-backend: ## 🧹 Clean backend cache
	@echo -e "$(CYAN)🧹 Cleaning backend cache...$(NC)"
	@cd $(BACKEND_DIR) && make clean

clean-frontend: ## 🧹 Clean frontend cache
	@echo -e "$(CYAN)🧹 Cleaning frontend cache...$(NC)"
	@cd $(FRONTEND_DIR) && npm run clean 2>/dev/null || rm -rf .next node_modules/.cache

reset: reset-backend reset-frontend ## 🔄 Reset both environments

reset-backend: ## 🔄 Reset backend environment
	@echo -e "$(CYAN)🔄 Resetting backend...$(NC)"
	@cd $(BACKEND_DIR) && make reset

reset-frontend: ## 🔄 Reset frontend environment
	@echo -e "$(CYAN)🔄 Resetting frontend...$(NC)"
	@cd $(FRONTEND_DIR) && rm -rf node_modules package-lock.json && npm install

# === UTILITIES ===
status: ## 📊 Check system health
	@echo -e "$(CYAN)📊 Checking system status...$(NC)"
	@echo -e "$(YELLOW)Backend Health:$(NC)"
	@cd $(BACKEND_DIR) && make health
	@echo -e "$(YELLOW)Frontend Status:$(NC)"
	@cd $(FRONTEND_DIR) && npm list --depth=0 | head -5

logs: ## 📋 Show recent logs
	@echo -e "$(CYAN)📋 Recent logs:$(NC)"
	@cd $(BACKEND_DIR) && make logs
	@echo -e "$(YELLOW)Frontend logs: Check browser console$(NC)"

version: ## ℹ️ Show version information
	@echo -e "$(CYAN)ℹ️ Fynix Version Information:$(NC)"
	@echo -e "$(YELLOW)Backend:$(NC)"
	@cd $(BACKEND_DIR) && make version
	@echo -e "$(YELLOW)Frontend:$(NC)"
	@cd $(FRONTEND_DIR) && node --version && npm --version

# === PRODUCTION ===
build: build-backend build-frontend ## 🏗️ Build production assets

build-backend: ## 🏗️ Build backend for production
	@echo -e "$(CYAN)🏗️ Building backend...$(NC)"
	@cd $(BACKEND_DIR) && make prod-build

build-frontend: ## 🏗️ Build frontend for production
	@echo -e "$(CYAN)🏗️ Building frontend...$(NC)"
	@cd $(FRONTEND_DIR) && npm run build

deploy: build ## 🚀 Deploy to production
	@echo -e "$(CYAN)🚀 Deploying to production...$(NC)"
	@echo -e "$(YELLOW)Run deployment scripts here$(NC)"

# === SHORTCUTS ===
s: dev ## ⚡ Super short alias for dev

t: test ## ⚡ Quick test alias

l: lint ## ⚡ Quick lint alias

f: format ## ⚡ Quick format alias

c: clean ## ⚡ Quick clean alias