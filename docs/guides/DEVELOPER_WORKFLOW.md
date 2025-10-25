# 🚀 Lokifi Developer Workflow Guide

**Last Updated**: October 19, 2025
**Purpose**: Simple, standard commands for all development tasks
**Philosophy**: Use industry-standard tools, no custom wrappers

---

## 📋 Quick Reference

### Daily Commands (Most Used)

```bash
# Start everything
docker-compose up

# Frontend development
cd apps/frontend
npm run dev              # Start dev server (http://localhost:3000)
npm run lint             # Check code quality

# Backend development
cd apps/backend
uvicorn app.main:app --reload  # Start dev server (http://localhost:8000)
black .                  # Format code

**📖 For testing commands:** See [`TESTING_GUIDE.md`](TESTING_GUIDE.md) for complete workflows

# Git workflow
git add .
git commit -m "feat: your message"  # Husky auto-runs lint-staged
git push
```

---

## 🏗️ Infrastructure

### Start/Stop Services

```bash
# Start all services (recommended)
docker-compose up

# Start in background
docker-compose up -d

# Start specific service
docker-compose up redis
docker-compose up postgres
docker-compose up backend

# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# Restart services
docker-compose restart

# View running services
docker-compose ps

# View logs
docker-compose logs -f          # All services
docker-compose logs -f backend  # Specific service
```

### Service Health Checks

```bash
# Redis
docker-compose exec redis redis-cli -a 23233 ping
# Expected: PONG

# PostgreSQL
docker-compose exec postgres pg_isready -U lokifi
# Expected: accepting connections

# Backend API (see API_REFERENCE.md for complete endpoint docs)
curl http://localhost:8000/api/health
# Expected: {"status":"healthy"}

# Frontend
curl http://localhost:3000
# Expected: HTML response
```

---

## 💻 Frontend Development

### Navigate to Frontend

```bash
cd apps/frontend
```

### Development Server

```bash
# Start dev server (with hot reload)
npm run dev
# → http://localhost:3000

# Start production build locally
npm run build
npm start
```

### Testing

**📖 For complete testing workflows:**
- [`TESTING_GUIDE.md`](TESTING_GUIDE.md) - Full testing strategies and command reference
- [`INTEGRATION_TESTS_GUIDE.md`](INTEGRATION_TESTS_GUIDE.md) - Integration testing guide

### Code Quality

```bash
# Lint code
npm run lint

# Lint and auto-fix
npm run lint -- --fix

# Type checking
npm run typecheck

# Format with Prettier (auto on commit via Husky)
npx prettier --write .
```

### Build & Deploy

```bash
# Production build
npm run build

# Analyze bundle size
npm run build -- --analyze

# Clean build artifacts
npm run clean
```

---

## ⚙️ Backend Development

### Navigate to Backend

```bash
cd apps/backend
```

### Environment Setup

**📖 For complete environment setup and dependency installation:** See [`../QUICK_START.md`](../QUICK_START.md) - Backend Setup section

### Development Server

```bash
# Setup environment first (see QUICK_START.md for venv activation)

# Start dev server (with hot reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# → http://localhost:8000

# Or use environment variable
$env:PYTHONPATH=(Get-Location).Path
python -m uvicorn app.main:app --reload
```

### Testing

**📖 For complete testing workflows:**
- [`TESTING_GUIDE.md`](TESTING_GUIDE.md) - Detailed testing workflows and best practices

### Code Quality

```bash
# Format code with Black
black .

# Check formatting (don't modify)
black --check .

# Lint with Ruff
ruff check .

# Lint and auto-fix
ruff check --fix .

# Type checking with mypy
mypy app/

# Sort imports with isort
isort .
```

### Database Management

```bash
# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "Add user table"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback one migration
docker-compose exec backend alembic downgrade -1

# View migration history
docker-compose exec backend alembic history

# View current version
docker-compose exec backend alembic current

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d postgres
docker-compose exec backend alembic upgrade head
```

---

## 🗄️ Database Operations

### PostgreSQL Access

```bash
# Connect to database
docker-compose exec postgres psql -U lokifi -d lokifi_db

# Run SQL file
docker-compose exec -T postgres psql -U lokifi -d lokifi_db < script.sql

# Backup database
docker-compose exec -T postgres pg_dump -U lokifi lokifi_db > backup_$(date +%Y%m%d).sql

# Restore database
docker-compose exec -T postgres psql -U lokifi lokifi_db < backup_20251019.sql

# View database size
docker-compose exec postgres psql -U lokifi -d lokifi_db -c "SELECT pg_size_pretty(pg_database_size('lokifi_db'));"
```

### Redis Access

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli -a 23233

# Inside Redis CLI:
# → PING              # Test connection
# → KEYS *            # List all keys
# → GET key           # Get value
# → SET key value     # Set value
# → FLUSHALL          # Clear all data (WARNING!)
# → INFO              # Server info
# → QUIT              # Exit

# Run Redis command directly
docker-compose exec redis redis-cli -a 23233 PING
docker-compose exec redis redis-cli -a 23233 KEYS "*"

# Monitor Redis commands in real-time
docker-compose exec redis redis-cli -a 23233 MONITOR

# Clear all Redis data
docker-compose exec redis redis-cli -a 23233 FLUSHALL
```

---

## 🔧 Git Workflow

### Standard Workflow

```bash
# Check status
git status

# Stage changes
git add .                           # All files
git add path/to/file.ts            # Specific file
git add apps/frontend/             # Specific directory

# Commit (Husky auto-runs lint-staged)
git commit -m "feat: add user authentication"

# Conventional commit types:
# feat:     New feature
# fix:      Bug fix
# docs:     Documentation
# style:    Code style (formatting)
# refactor: Code refactoring
# test:     Tests
# chore:    Build/config changes
# perf:     Performance improvement

# Push to remote
git push

# Pull latest changes
git pull

# Create branch
git checkout -b feature/new-feature

# Switch branch
git checkout main

# View commit history
git log --oneline --graph

# View changes
git diff                           # Unstaged changes
git diff --staged                  # Staged changes
git diff main                      # Compare with main branch
```

### Common Operations

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Stash changes
git stash
git stash pop

# Cherry-pick commit
git cherry-pick <commit-hash>

# Rebase on main
git checkout feature/branch
git rebase main

# Interactive rebase (edit last 3 commits)
git rebase -i HEAD~3

# Amend last commit
git commit --amend

# Amend without changing message
git commit --amend --no-edit
```

---

## 🐛 Debugging

### Frontend Debugging

```bash
# Check console output
npm run dev
# → Watch terminal for errors

# Run tests with debugging
npm test -- --inspect

# Check build errors
npm run build

# Analyze bundle
npm run build -- --analyze

# Check Next.js info
npx next info
```

### Backend Debugging

```bash
# Run with debug output
uvicorn app.main:app --reload --log-level debug

# Run tests with print statements
pytest -s

# Run with Python debugger
python -m pdb app/main.py

# Check dependencies
pip list

# Check for outdated packages
pip list --outdated
```

### Docker Debugging

```bash
# View container logs
docker-compose logs -f backend

# Execute command in container
docker-compose exec backend bash

# View container resource usage
docker stats

# Inspect container
docker inspect lokifi-backend-dev

# Restart specific service
docker-compose restart backend

# Rebuild container
docker-compose up --build backend

# Remove all containers and start fresh
docker-compose down
docker-compose up --build
```

---

## 🔒 Security & Dependencies

### Frontend Security

```bash
cd apps/frontend

# Check for vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Force fix (may break things)
npm audit fix --force

# Update dependencies
npm update

# Update specific package
npm update react
```

### Backend Security

```bash
cd apps/backend

# Check for vulnerabilities (install first: pip install pip-audit)
pip-audit

# Check specific package
pip show fastapi
```

**📖 For dependency updates:** See [`../QUICK_START.md`](../QUICK_START.md) for complete installation guide

### Container Security

```bash
# Scan container images (install trivy first)
trivy image lokifi-frontend-dev
trivy image lokifi-backend-dev

# Scan for secrets (install git-secrets first)
git secrets --scan

# Check Docker security
docker scan lokifi-backend-dev
```

---

## 📊 Monitoring & Performance

### Application Monitoring

```bash
# Frontend performance (in browser)
# → Open DevTools
# → Lighthouse tab
# → Run audit

# Backend performance
# → http://localhost:8000/docs (Swagger - API testing)
# → Python logging for error tracking

# Database performance
docker-compose exec postgres psql -U lokifi -d lokifi_db -c "SELECT * FROM pg_stat_activity;"
```

### Resource Monitoring

```bash
# View Docker resource usage
docker stats

# View disk usage
docker system df

# Clean up Docker resources
docker system prune              # Remove unused data
docker system prune -a           # Remove all unused images
docker volume prune              # Remove unused volumes
```

---

## 🎯 Common Workflows

### First Time Setup

```bash
# Quick setup commands
git clone https://github.com/ericsocrat/Lokifi.git
cd Lokifi && docker-compose up -d
```

**📖 For complete setup instructions:**
- [`QUICK_START.md`](../QUICK_START.md) - Complete installation and setup guide
- [`QUICK_START.md`](../QUICK_START.md) - Step-by-step getting started guide

### Daily Development

```bash
# Morning: Start everything
docker-compose up -d
cd apps/frontend && npm run dev

# During development: Run tests
npm test                    # Frontend (watch mode)
pytest --cov               # Backend (with coverage)

# Before commit: Check quality
npm run lint               # Frontend
black . && ruff check .    # Backend

# Commit
git add .
git commit -m "feat: your changes"
git push

# Evening: Stop everything
docker-compose down
```

### Creating a Feature

```bash
# 1. Create branch
git checkout -b feature/user-profile

# 2. Develop
# → Write code
# → Run tests: npm test / pytest
# → Check quality: npm run lint / black .

# 3. Commit
git add .
git commit -m "feat: add user profile page"

# 4. Push and create PR
git push -u origin feature/user-profile
# → Create PR on GitHub
# → Wait for CI checks
# → Request review
# → Merge when approved
```

### Fixing a Bug

```bash
# 1. Create branch
git checkout -b fix/login-validation

# 2. Reproduce bug
# → Write test that fails
# → Verify bug exists

# 3. Fix
# → Fix the code
# → Verify test passes
# → Manual testing

# 4. Commit and push
git add .
git commit -m "fix: correct email validation on login"
git push -u origin fix/login-validation
```

---

## 🆘 Troubleshooting

### "Port already in use"

```bash
# Find process using port
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# Kill process (Windows)
taskkill /PID <PID> /F

# Or use different port
npm run dev -- -p 3001
uvicorn app.main:app --reload --port 8001
```

### "Module not found"

**📖 For dependency installation and troubleshooting:**
- [`QUICK_START.md`](../QUICK_START.md) - Complete installation and troubleshooting guide

### "Docker container won't start"

```bash
# View logs
docker-compose logs backend

# Remove and rebuild
docker-compose down
docker-compose up --build

# Nuclear option (removes all data!)
docker-compose down -v
docker system prune -a
docker-compose up --build
```

### "Tests failing"

```bash
# Frontend - Clear cache
npm run test -- --clearCache

# Backend - Recreate environment (see QUICK_START.md for complete setup)
deactivate
Remove-Item -Recurse venv
# Follow Backend Setup steps in QUICK_START.md
pytest
```

**📖 For dependency installation:** See [`../QUICK_START.md`](../QUICK_START.md) for complete setup guide

### "Git commit blocked"

```bash
# Husky is running checks - fix the issues it reports

# Or temporarily bypass (use sparingly!)
git commit --no-verify -m "message"
```

---

## 📚 Additional Resources

### Documentation

- **Next.js**: https://nextjs.org/docs
- **FastAPI**: https://fastapi.tiangolo.com/
- **Docker Compose**: https://docs.docker.com/compose/
- **Vitest**: https://vitest.dev/
- **Pytest**: https://docs.pytest.org/

### Project Documentation

- `/docs/CODING_STANDARDS.md` - Code style guidelines
- `/docs/TEST_QUICK_REFERENCE.md` - Testing guide
- `/docs/REPOSITORY_STRUCTURE.md` - Project structure
- `/.github/workflows/` - CI/CD pipelines
- `/apps/frontend/README.md` - Frontend specifics
- `/apps/backend/README.md` - Backend specifics

### VS Code Tasks

```bash
# Press Ctrl+Shift+P → "Tasks: Run Task"
# Available tasks:
- 🔴 Start Redis Server (Docker)
- 🔧 Start Backend Server
- 🎨 Start Frontend Server
- 🚀 Start All Servers
```

---

## 💡 Pro Tips

### 1. Use VS Code Tasks
Instead of typing commands, use built-in tasks (Ctrl+Shift+P → Tasks: Run Task)

### 2. Set Up Aliases (Optional)
```bash
# In PowerShell profile ($PROFILE)
function dcu { docker-compose up $args }
function dcd { docker-compose down }
function dcr { docker-compose restart $args }

# Usage
dcu          # docker-compose up
dcd          # docker-compose down
dcr backend  # docker-compose restart backend
```

### 3. Use Git Hooks (Already Configured!)
Husky auto-runs lint-staged on commit - no manual linting needed!

### 4. Learn Docker Compose
It's the same across ALL projects - time well spent!

### 5. Standard Tools = Transferable Skills
Everything you learn here applies to your next project too!

---

## 🎯 Remember

**Keep It Simple**:
- ✅ Use standard tools
- ✅ No custom wrappers needed
- ✅ Industry-standard commands
- ✅ Works like every other modern project

**When in doubt**:
1. Check this guide
2. Check official docs (Next.js, FastAPI, etc.)
3. Ask the team
4. Google is your friend (standard tools have millions of answers!)

---

**Happy coding! 🚀**

*Last updated: October 19, 2025*
*Maintainer: Development Team*
