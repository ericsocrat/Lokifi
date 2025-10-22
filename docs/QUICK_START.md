# 🚀 Lokifi Quick Start & Reference

**Last Updated:** October 20, 2025
**Purpose:** Complete quick reference for development and testing
**Status:** Production Ready

---

## ⚡ Quick Start Commands

### One-Command Start (Recommended)
```powershell
# Start ALL services at once
.\start-servers.ps1
```
This automatically:
- ✅ Starts Redis container (port 6379)
- ✅ Starts Backend FastAPI (port 8000)
- ✅ Starts Frontend Next.js (port 3000)

## Individual Service Management
```powershell
# Redis management
.\manage-redis.ps1 start    # Start Redis container
.\manage-redis.ps1 status   # Check status
.\manage-redis.ps1 logs     # View logs
.\manage-redis.ps1 shell    # Open Redis CLI
.\manage-redis.ps1 restart  # Restart container

# Backend (manual)
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (manual)
cd frontend
npm run dev
```

---

## 🌐 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main Lokifi application |
| **Backend API** | http://localhost:8000 | REST API endpoints |
| **API Docs** | http://localhost:8000/docs | Interactive Swagger documentation |
| **Health Check** | http://localhost:8000/api/v1/health | Service status monitoring |
| **Redis Insight** | http://localhost:8001 | Redis data browser (if installed) |

---

## 🧪 Quick Testing

### API Testing
```powershell
# Comprehensive API test suite
.\test-api.ps1

# Manual API testing
# See api/API_DOCUMENTATION.md for complete endpoint reference
curl http://localhost:8000/api/v1/health  # Health check
```

**📖 For complete API examples and documentation:**
- [`api/API_DOCUMENTATION.md`](api/API_DOCUMENTATION.md) - Complete API guide with all endpoints
- [`api/API_REFERENCE.md`](api/API_REFERENCE.md) - Comprehensive API reference

## Code Quality Checks
```powershell
# Frontend checks
cd frontend
npm run lint              # ESLint checking
npm run type-check        # TypeScript validation
npm run test              # Unit tests
npm run test:coverage     # Coverage report

# Backend checks
cd backend
pytest                    # All tests
pytest --cov             # With coverage
black . --check          # Format checking
ruff check               # Linting
```

---

## 📋 Development Features Tested

### ✅ Task 6: Historical Price Data & OHLCV Charts
- Historical data endpoints (`/assets/{symbol}/history`)
- OHLCV candlestick data (`/assets/{symbol}/ohlcv`)
- Chart visualization components
- Multiple time periods (1d, 1w, 1m, 3m, 1y)

### ✅ Task 7: Expanded Crypto Support
- 300+ cryptocurrencies supported
- CoinGecko integration for crypto prices
- Finnhub integration for stock data
- Unified asset discovery endpoint

### ✅ Task 8: WebSocket Real-Time Updates
- 30-second price update intervals
- Multi-asset subscription support
- Automatic connection management
- Real-time chart updates

---

## 🔧 Code Quality Automation

### Automatic Code Quality (On Save)
1. **ESLint** auto-fixes issues
2. **Prettier** formats code
3. **Import organization**
4. **Trailing whitespace** removal
5. **Final newline** addition

### Git Commit Automation (Pre-commit)
1. **Husky** triggers pre-commit hook
2. **lint-staged** processes staged files:
   - `next lint --fix` (TypeScript)
   - `prettier --write` (all supported files)
3. **Re-stages** fixed files
4. **Commits** only if all checks pass

**📖 For complete code quality setup:**
- [`guides/CODE_QUALITY.md`](guides/CODE_QUALITY.md) - Complete ESLint, Prettier, and Husky configuration

### Code Style Rules
- **Semicolons**: Required
- **Quotes**: Single quotes preferred
- **Line width**: 100 characters max
- **Tab width**: 2 spaces
- **Trailing commas**: ES5 style
- **TypeScript**: Strict mode enabled

---

## 🐳 Docker Commands

### Development (Docker Compose)
```powershell
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View service logs
docker-compose logs -f [service_name]

# Restart specific service
docker-compose restart backend
```

### Production Deployment
```powershell
## Build production images
docker-compose -f docker-compose.prod.yml build

## Deploy to production
docker-compose -f docker-compose.prod.yml up -d

## Check deployment status
docker-compose -f docker-compose.prod.yml ps
```

---

## 📚 Essential File Reference

### Core Documentation
- **`README.md`** - Project overview and setup
- **`START_HERE.md`** - Complete getting started guide
- **`DEVELOPER_WORKFLOW.md`** - Development best practices
- **`REPOSITORY_STRUCTURE.md`** - File organization guide

### Technical Guides
- **`docs/api/API_REFERENCE.md`** - Complete API documentation
- **`docs/guides/TESTING_GUIDE.md`** - Testing strategies and examples
- **`docs/guides/AUTOMATION.md`** - Development automation guide
- **`docs/security/README.md`** - Security configuration guide

### Configuration Files
- **`frontend/package.json`** - Frontend dependencies and scripts
- **`backend/requirements.txt`** - Python dependencies
- **`.vscode/settings.json`** - VS Code workspace configuration
- **`docker-compose.yml`** - Container orchestration

---

## 🛠️ Development Scripts

### Analysis & Optimization
```powershell
# Comprehensive code analysis (6-phase health check)
.\scripts\analysis\analyze-and-optimize.ps1

# TypeScript type safety analysis
.\scripts\analysis\analyze-typescript-types.ps1

# Console logging audit
.\scripts\analysis\analyze-console-logging.ps1
```

### Cleanup & Maintenance
```powershell
# Repository organization
.\scripts\cleanup\organize-repository.ps1

# Clean up old documentation
.\scripts\cleanup\cleanup-repo.ps1

# Fix TypeScript 'any' types
.\scripts\fixes\fix-all-implicit-any.ps1
```

---

## 🔍 Testing Features

### Testing Commands
```powershell
# Frontend quick tests
cd frontend && npm run test

# Backend quick tests
cd backend && pytest

# Coverage reports
npm run test:coverage  # Frontend
pytest --cov          # Backend
```

**📖 For complete testing documentation:**
- [`guides/TESTING_GUIDE.md`](guides/TESTING_GUIDE.md) - Complete testing strategies and commands
- [`guides/INTEGRATION_TESTS_GUIDE.md`](guides/INTEGRATION_TESTS_GUIDE.md) - Integration testing guide

---

## 🚨 Troubleshooting Quick Fixes

### Redis Issues
```powershell
# Check if Redis is running
docker ps | Select-String "redis"

# Restart Redis container
docker restart lokifi-redis

# View Redis logs
docker logs lokifi-redis

# Connect to Redis CLI
docker exec -it lokifi-redis redis-cli
```

### Backend Issues
```powershell
# Check backend logs
cd backend
python -c "import app.main; print('Backend imports OK')"

# Test database connection
python -c "from app.database import get_db; print('Database OK')"

# Manual dependency install
pip install -r requirements.txt
```

### Frontend Issues
```powershell
# Clear Node modules and reinstall
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# Check TypeScript compilation
npx tsc --noEmit

# Reset Next.js cache
npx next build --clean
```

### Pre-commit Hook Issues
```powershell
cd frontend

# Check Husky installation
npx husky --version

# Reinstall hooks if needed
npm run prepare
```

**📖 For detailed troubleshooting:**
- [`guides/CODE_QUALITY.md`](guides/CODE_QUALITY.md) - Complete pre-commit setup and troubleshooting
- [`guides/VSCODE_SETUP.md`](guides/VSCODE_SETUP.md) - IDE-specific quality tools setup

---

## 📊 Performance Testing

### Load Testing
```powershell
# API load testing (if k6 installed)
k6 run performance/api-load-test.js

# Frontend performance audit
cd frontend
npm run lighthouse

# Bundle size analysis
npm run analyze
```

### Monitoring Commands
```powershell
# Monitor API response times
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:8000/api/v1/health

# Monitor Redis memory usage
docker exec lokifi-redis redis-cli info memory

# Monitor container resource usage
docker stats --no-stream
```

---

## 🎯 Quick Validation Checklist

### ✅ Environment Ready
- [ ] Redis running on port 6379
- [ ] PostgreSQL accessible (if using)
- [ ] Backend responding on port 8000
- [ ] Frontend accessible on port 3000

### ✅ API Functionality
- [ ] Health check returns {"status": "ok"}
- [ ] Price data retrieval working
- [ ] Historical data endpoints functional
- [ ] WebSocket connections stable

### ✅ Code Quality
- [ ] ESLint passes without errors
- [ ] TypeScript compiles without errors
- [ ] All tests pass (frontend & backend)
- [ ] Pre-commit hooks functioning

### ✅ Development Workflow
- [ ] Git pre-commit hooks active
- [ ] VS Code settings applied
- [ ] Docker containers healthy
- [ ] Documentation up to date

---

## 📞 Getting Help

### Check These First
1. **Service logs** - Use `docker logs` or `npm run dev` output
2. **Health endpoints** - Verify all services are responding
3. **Configuration files** - Ensure environment variables are set
4. **Test suite** - Run tests to identify specific issues

### Common Solutions
- **Port conflicts**: Check if other services are using ports 3000, 8000, 6379
- **Permission errors**: Run PowerShell as Administrator for Docker commands
- **Module not found**: Reinstall dependencies with `npm install` or `pip install -r requirements.txt`
- **Git hook failures**: Reinstall with `npm run prepare` in frontend directory

---

**Remember**: This guide covers the most common development scenarios. For detailed implementation guides, see the specific documentation in `docs/guides/` directory! 🚀
