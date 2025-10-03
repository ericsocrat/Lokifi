# 🎯 Docker vs Manual Development - Quick Decision Guide

## TL;DR: Use Manual Setup for Development ✅

**Quick Answer:** For daily development, **run manually with just Redis in Docker**. This gives you the best of both worlds:
- Fast iteration with hot reload
- Full debugging in VS Code
- Minimal resource usage
- Production-like Redis without overhead

---

## 📊 Comparison Table

| Feature | Manual + Redis Docker | Full Docker Stack |
|---------|----------------------|-------------------|
| **Startup Time** | 5 seconds | 30+ seconds |
| **Hot Reload** | ✅ Instant | ❌ Rebuild needed |
| **RAM Usage** | ~500MB | ~2GB |
| **CPU Usage** | Low | Medium |
| **VS Code Debugging** | ✅ Full support | ⚠️ Limited |
| **Logging** | ✅ Direct console | ⚠️ Docker logs |
| **Port Conflicts** | Rare | Common |
| **Production Parity** | ⚠️ 85% | ✅ 100% |
| **Best For** | ✅ **Development** | Testing/Staging |

---

## 🚀 Recommended Setup (Manual + Redis Docker)

### Why This Combo?

1. **Backend & Frontend Manual** → Fast iteration, hot reload, easy debugging
2. **Redis in Docker** → Production-like, no Windows Redis hassles, easy reset

### Quick Start

```powershell
# 1. Setup Redis (run once, or after PC restart)
.\setup-redis.ps1

# 2. Start backend (terminal 1)
cd backend
python -m uvicorn app.main:app --reload

# 3. Start frontend (terminal 2)
cd frontend
npm run dev
```

**Or use VS Code:**
- Press `Ctrl+Shift+P` → "Tasks: Run Task" → "🚀 Start Full Stack"
- Or press `Ctrl+Shift+R` for backend only

### What You Get

✅ **Backend hot reload** - Save Python file → Server restarts instantly
✅ **Frontend hot reload** - Save React file → Browser updates instantly
✅ **Full VS Code debugging** - Breakpoints, inspect variables, step through
✅ **Production-like Redis** - Same version/config as production
✅ **Low resource usage** - ~500MB RAM vs 2GB with full Docker

---

## 🐳 When to Use Full Docker

### Scenarios

1. **Integration Testing** - Test full stack together
2. **Pre-deployment Testing** - Verify production config
3. **Demonstrating to Stakeholders** - Show production-like environment
4. **Debugging Docker Issues** - When containers behave differently

### Setup

```powershell
# Start everything
cd infrastructure/docker
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop everything
docker-compose down
```

---

## 🔴 Redis Setup (Critical)

### Why Redis?

Your app **requires** Redis for:
- ✅ **Caching** - Speeds up API responses 10x
- ✅ **WebSocket state** - Real-time connections
- ✅ **Rate limiting** - Prevents API abuse
- ✅ **Session storage** - User authentication
- ✅ **Pub/Sub** - Live notifications

### Quick Redis Setup

**Option 1: Automated Script (Recommended)**

```powershell
# Run from project root
.\setup-redis.ps1
```

This script:
- ✅ Checks if Docker is running
- ✅ Creates Redis container with proper port mapping
- ✅ Configures memory limits and persistence
- ✅ Tests connection
- ✅ Sets auto-restart policy

**Option 2: Manual Docker Command**

```powershell
# Create and start Redis
docker run -d `
  --name lokifi-redis `
  -p 6379:6379 `
  --restart unless-stopped `
  redis:7-alpine

# Test it
docker exec lokifi-redis redis-cli ping
# Should return: PONG
```

**Option 3: Use Docker Compose**

```powershell
cd infrastructure/docker
docker-compose up -d redis
```

### Verify Redis is Working

```powershell
# 1. Check container is running
docker ps | Select-String redis

# 2. Test ping
docker exec lokifi-redis redis-cli ping

# 3. Test from Python
cd backend
python -c "import redis; print('✅' if redis.from_url('redis://localhost:6379').ping() else '❌')"
```

### Common Redis Issues

**Issue: "Connection refused"**

```powershell
# Check if Redis is running
docker ps | Select-String redis

# If not listed, start it
docker start lokifi-redis

# If still not working, recreate
docker rm -f lokifi-redis
.\setup-redis.ps1
```

**Issue: "Docker Desktop not running"**

1. Open Docker Desktop app
2. Wait for it to fully start (Docker icon stops animating)
3. Run `.\setup-redis.ps1`

**Issue: "Port 6379 already in use"**

```powershell
# Find what's using the port
Get-NetTCPConnection -LocalPort 6379 | Select-Object OwningProcess

# Kill the process
Stop-Process -Id <PID> -Force

# Or use different port
docker run -d --name lokifi-redis -p 6380:6379 redis:7-alpine
# Then update backend/.env: REDIS_URL=redis://localhost:6380/0
```

---

## 🛠️ Development Workflow

### Morning Routine

```powershell
# 1. Ensure Redis is running
docker start lokifi-redis

# 2. Start backend
cd backend && python -m uvicorn app.main:app --reload

# 3. Start frontend
cd frontend && npm run dev

# Now code! All changes auto-reload 🎉
```

### Making Code Changes

**Backend changes:**
1. Edit Python file
2. Save → Server auto-restarts (2 seconds)
3. Test in http://localhost:8000/docs

**Frontend changes:**
1. Edit React/TypeScript file
2. Save → Browser auto-updates (instant)
3. See changes at http://localhost:3000

### Debugging

**Backend:**
1. Set breakpoint in VS Code
2. Press `F5` → "🚀 Backend: FastAPI (Debug)"
3. Make API call
4. Debugger stops at breakpoint

**Frontend:**
1. Add `debugger;` in code or use browser DevTools
2. Open browser console
3. Interact with UI
4. Debugger pauses

---

## 📈 Performance Comparison

### Real Numbers (on typical dev machine)

**Manual Setup:**
- Backend startup: 3-5 seconds
- Frontend startup: 8-12 seconds
- Total RAM: 400-600MB
- Hot reload: <2 seconds
- Build time: N/A (not needed)

**Docker Setup:**
- Backend startup: 15-20 seconds
- Frontend startup: 20-30 seconds
- Total RAM: 1.5-2.5GB
- Hot reload: 10-15 seconds (rebuild)
- Build time: 2-5 minutes

**Winner:** Manual Setup for development 🏆

---

## ✅ Quick Checklist

Before you start coding:

- [ ] Docker Desktop running
- [ ] Redis container running: `docker ps | Select-String redis`
- [ ] Backend starts: `cd backend && uvicorn app.main:app`
- [ ] Frontend starts: `cd frontend && npm run dev`
- [ ] API docs accessible: http://localhost:8000/docs
- [ ] Frontend loads: http://localhost:3000
- [ ] VS Code extensions installed

**All green?** Start coding! 🚀

---

## 🎓 Pro Tips

1. **Keep Redis running** - Set `--restart unless-stopped` (done in `setup-redis.ps1`)
2. **Use VS Code tasks** - Faster than typing commands
3. **Monitor Redis in VS Code** - Install Redis extension to browse keys
4. **Check logs** - Backend logs show if Redis connected
5. **Use Docker for CI/CD** - Even if you develop manually

---

## 📚 Related Docs

- [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) - Full development guide
- [.vscode/README.md](.vscode/README.md) - VS Code configuration
- [QUICK_START.md](QUICK_START.md) - Quick commands

---

## 🎯 Final Recommendation

```
╔══════════════════════════════════════════════╗
║  FOR DEVELOPMENT: Manual + Redis Docker ✅   ║
║  FOR TESTING: Full Docker Stack 🐳          ║
╚══════════════════════════════════════════════╝
```

**Run this now:**
```powershell
.\setup-redis.ps1
```

Then use VS Code tasks or manual commands to start backend/frontend.

**Happy coding! 🚀**
