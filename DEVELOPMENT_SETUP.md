# 🚀 Development Setup Guide

## 📋 Table of Contents
- [Quick Start](#quick-start)
- [Docker vs Manual](#docker-vs-manual)
- [Redis Setup](#redis-setup)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Start

### Option 1: Manual Setup (Recommended for Development)

```powershell
# 1. Start Redis (one-time per session)
docker start lokifi-redis

# 2. Start backend
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 3. Start frontend (new terminal)
cd frontend
npm run dev
```

**Or use VS Code tasks:**
- Press `Ctrl+Shift+P` → "Tasks: Run Task" → "🚀 Start Full Stack"
- Or press `Ctrl+Shift+R` to start backend

### Option 2: Full Docker Stack

```powershell
cd infrastructure/docker
docker-compose up -d
```

---

## 🐳 Docker vs Manual - When to Use What

### 🔧 Manual Setup (Development) - **RECOMMENDED** ✅

**Use when:**
- Actively coding and need hot reload
- Debugging with VS Code
- Testing API changes quickly
- Working on frontend UI

**Advantages:**
- ⚡ **Fast iteration** - No container rebuilds
- 🐛 **Better debugging** - Direct VS Code integration
- 🔄 **Hot reload** - Backend and frontend auto-refresh
- 💾 **Lower resource usage** - ~50% less RAM/CPU
- 📝 **Easier logs** - Direct console output

**Setup:**
```powershell
# One-time: Start Redis
docker start lokifi-redis

# Backend (auto-reloads on code changes)
cd backend && python -m uvicorn app.main:app --reload

# Frontend (auto-reloads on code changes)
cd frontend && npm run dev
```

### 🐳 Docker Setup (Production-like)

**Use when:**
- Testing production deployment
- Full integration testing
- Demonstrating to stakeholders
- CI/CD pipeline testing

**Advantages:**
- 🏗️ **Production parity** - Matches deployment environment
- 📦 **Isolated environment** - No local dependency conflicts
- 🔄 **Easy reset** - `docker-compose down -v` cleans everything
- 🌐 **Multi-service testing** - Test with Postgres, Redis, Nginx together

**Setup:**
```powershell
# Start everything
cd infrastructure/docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down
```

---

## 🔴 Redis Setup

### Why Redis is Required

Redis provides:
- ✅ **Caching** - API response caching, reducing database load
- ✅ **WebSocket state** - Real-time connection management
- ✅ **Rate limiting** - API request throttling
- ✅ **Session storage** - User session data
- ✅ **Pub/Sub** - Real-time notifications

### Manual Redis Setup (Easiest)

**Using Docker (Recommended):**

```powershell
# Check if Redis container exists
docker ps -a | Select-String redis

# If exists but stopped, start it:
docker start lokifi-redis

# If doesn't exist, create it:
docker run -d `
  --name lokifi-redis `
  -p 6379:6379 `
  redis:7-alpine

# Verify it's running
docker exec lokifi-redis redis-cli ping
# Should return: PONG
```

**Test Redis connection from backend:**

```powershell
# From project root
cd backend
python -c "import redis; r = redis.from_url('redis://localhost:6379/0'); print('✅ Connected:', r.ping())"
```

### Redis Extension for VS Code

I've added the Redis extension to your workspace. Install it:

1. Open VS Code
2. Press `Ctrl+Shift+X` (Extensions)
3. Search for "Redis" by Weijan Chen
4. Click Install (or it may auto-prompt since it's in recommendations)

**Using the extension:**
- Press `Ctrl+Shift+P` → "Redis: Add Connection"
- Host: `localhost`
- Port: `6379`
- Name: `Lokifi Local Redis`

Now you can:
- Browse Redis keys in the sidebar
- View cached data
- Monitor real-time connections
- Debug cache issues

### Environment Configuration

Your `.env` file should have:

```env
REDIS_URL=redis://localhost:6379/0
REDIS_HOST=localhost
REDIS_PORT=6379
```

✅ Already configured in `backend/.env`

---

## 🛠️ Development Workflow

### Daily Development Flow

```powershell
# 1. Start Redis (once per session)
docker start lokifi-redis

# 2. Start backend (terminal 1)
cd backend
python -m uvicorn app.main:app --reload
# Visit: http://localhost:8000/docs

# 3. Start frontend (terminal 2)
cd frontend
npm run dev
# Visit: http://localhost:3000
```

### Using VS Code Tasks

**Quick Access:**
- `Ctrl+Shift+R` - Start Backend Server
- `Ctrl+Shift+T` - Run Backend Tests
- `Ctrl+Shift+L` - Lint Backend

**Task Panel:**
1. Press `Ctrl+Shift+P`
2. Type "Tasks: Run Task"
3. Choose from 21 available tasks:

**Backend:**
- 🚀 Start Backend Server
- 🧪 Run Backend Tests
- 🧪 Run Backend Tests with Coverage
- 🔍 Lint Backend (Ruff)
- ✨ Format Backend (Black)

**Frontend:**
- ⚛️ Start Frontend Dev Server
- ⚛️ Build Frontend
- 🔍 Lint Frontend (ESLint)
- ✨ Format Frontend (Prettier)

**Full Stack:**
- 🚀 Start Full Stack (both servers)
- 📦 Install All Dependencies

**Database:**
- 🗄️ Database: Create Migration
- 🗄️ Database: Run Migrations
- 🗄️ Database: Rollback Migration

### Debugging

**Backend Debugging:**
1. Set breakpoints in Python files
2. Press `F5` or click Debug → "🚀 Backend: FastAPI (Debug)"
3. Make API request
4. Debugger stops at breakpoints

**Frontend Debugging:**
1. Add `debugger;` in TypeScript code
2. Open browser DevTools
3. Interact with UI
4. Debugger stops at statements

---

## 🔧 Troubleshooting

### Redis Connection Failed

**Symptom:** Backend logs show `⚠️ Redis unavailable`

**Solution:**
```powershell
# Check if Redis is running
docker ps | Select-String redis

# If not running, start it
docker start lokifi-redis

# Test connection
docker exec lokifi-redis redis-cli ping

# View Redis logs
docker logs lokifi-redis
```

### Backend Won't Start

**Symptom:** Server exits immediately or errors on startup

**Solutions:**

1. **Check if port 8000 is in use:**
   ```powershell
   # Find process using port 8000
   Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue |
     Select-Object OwningProcess

   # Kill it
   Stop-Process -Id <PID> -Force
   ```

2. **Check Python environment:**
   ```powershell
   cd backend
   python --version  # Should be 3.11+
   pip list | Select-String fastapi
   ```

3. **Check database:**
   ```powershell
   # Ensure lokifi.sqlite exists
   Test-Path backend/lokifi.sqlite

   # If migrations needed
   cd backend
   alembic upgrade head
   ```

### Frontend Won't Start

**Symptom:** `npm run dev` fails

**Solutions:**

1. **Clear and reinstall:**
   ```powershell
   cd frontend
   Remove-Item node_modules -Recurse -Force
   Remove-Item package-lock.json -Force
   npm install
   ```

2. **Check Node version:**
   ```powershell
   node --version  # Should be 18+ or 20+
   ```

3. **Check port 3000:**
   ```powershell
   Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
   ```

### Docker Issues

**Container won't start:**
```powershell
# View logs
docker logs lokifi-redis
docker logs <container-name>

# Restart Docker Desktop (if on Windows)
Restart-Service docker  # or restart Docker Desktop app

# Remove and recreate
docker rm lokifi-redis
docker run -d --name lokifi-redis -p 6379:6379 redis:7-alpine
```

**Port conflicts:**
```powershell
# List all Docker containers
docker ps -a

# Stop conflicting containers
docker stop <container-id>
```

### VS Code Extension Issues

**Extension not working:**
1. Press `Ctrl+Shift+P`
2. "Developer: Reload Window"
3. Check Output panel for extension errors

**Python extension issues:**
- Ensure Python interpreter is selected: `Ctrl+Shift+P` → "Python: Select Interpreter"
- Verify it's your virtual environment (if using one)

---

## 📊 Resource Comparison

| Aspect | Manual Setup | Docker Setup |
|--------|--------------|--------------|
| **Startup Time** | ~5 seconds | ~30 seconds |
| **RAM Usage** | ~500MB | ~1GB |
| **Hot Reload** | ✅ Instant | ❌ Requires rebuild |
| **Debugging** | ✅ Full VS Code support | ⚠️ Requires remote debugging |
| **Production Parity** | ⚠️ Some differences | ✅ Identical |
| **Setup Complexity** | Low | Medium |
| **Best For** | Daily development | Testing deployments |

---

## 🎯 Recommended Approach

### For 95% of Development Time: **Manual Setup** ✅

```powershell
# Morning routine:
docker start lokifi-redis
cd backend && python -m uvicorn app.main:app --reload &
cd frontend && npm run dev
```

### Before Major Releases: **Docker Testing** 🐳

```powershell
# Test production-like environment:
cd infrastructure/docker
docker-compose up -d
# Run integration tests
# Check Prometheus metrics
# Verify Nginx routing
docker-compose down
```

---

## 📚 Additional Resources

- [VS Code Setup Guide](.vscode/README.md) - Full VS Code configuration
- [API Documentation](docs/API_DOCUMENTATION.md) - Backend API reference
- [Quick Start](QUICK_START.md) - Automation scripts
- [Docker Infrastructure](infrastructure/README.md) - Production deployment

---

## ✅ Checklist: I'm Ready to Develop

- [ ] Redis container running: `docker ps | Select-String redis`
- [ ] Backend starts without errors: `cd backend && uvicorn app.main:app`
- [ ] Frontend loads: `cd frontend && npm run dev`
- [ ] API docs accessible: http://localhost:8000/docs
- [ ] Frontend loads: http://localhost:3000
- [ ] VS Code extensions installed (check recommendations popup)
- [ ] Can set breakpoints and debug in VS Code

**If all checked ✅, you're ready to code! 🚀**
