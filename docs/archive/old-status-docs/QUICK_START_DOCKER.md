# 🚀 Quick Start Guide - Docker Redis Edition

## One Command to Start Everything

```powershell
.\start-servers.ps1
```

That's it! This will:
1. ✅ Start/create Redis Docker container
2. ✅ Start Backend (FastAPI)
3. ✅ Start Frontend (Next.js)

---

## What Changed?

### Redis Now Runs in Docker 🐳

**Benefits**:
- ✅ No manual Redis installation needed
- ✅ Auto-creates container on first run
- ✅ Data persists across restarts
- ✅ Auto-starts with Docker Desktop

**Requirements**:
- Docker Desktop installed and running
- That's it!

---

## Quick Commands

### Start All Servers
```powershell
.\start-servers.ps1
```

### Manage Redis
```powershell
.\manage-redis.ps1 status   # Check if running
.\manage-redis.ps1 stop     # Stop Redis
.\manage-redis.ps1 restart  # Restart Redis
.\manage-redis.ps1 logs     # View logs
.\manage-redis.ps1 shell    # Open Redis CLI
```

### Docker Commands
```powershell
docker ps                           # See all running containers
docker logs -f lokifi-redis         # Follow Redis logs
docker exec lokifi-redis redis-cli -a 23233 ping  # Test connection
docker stop lokifi-redis            # Stop Redis
docker start lokifi-redis           # Start Redis
```

---

## Access Points

After running `.\start-servers.ps1`:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health
- **Redis**: localhost:6379 (password: 23233)

---

## First Time Setup

### 1. Install Docker Desktop
Download: https://www.docker.com/products/docker-desktop

### 2. Start Docker Desktop
- Windows: Launch from Start Menu
- Wait for "Docker is running" notification

### 3. Start Servers
```powershell
cd C:\Users\USER\Desktop\lokifi
.\start-servers.ps1
```

### 4. Verify Everything Works
```powershell
# Check Redis
.\manage-redis.ps1 status
# Expected: ✅ Status: RUNNING

# Check Backend
curl http://localhost:8000/api/health
# Expected: {"status":"ok"}

# Check Frontend
start http://localhost:3000
```

---

## Troubleshooting

### "Docker not found"
**Solution**: Install Docker Desktop
- Download: https://www.docker.com/products/docker-desktop
- Install and restart computer

### "Docker is not running"
**Solution**: Start Docker Desktop
- Launch from Start Menu
- Wait for green icon in system tray

### Backend says "Redis not available"
**Solution**: Check Redis status
```powershell
.\manage-redis.ps1 status
# If not running:
.\manage-redis.ps1 start
```

### "Port 6379 already in use"
**Solution**: Check for other Redis instances
```powershell
# Stop old Redis container
docker ps -a | findstr redis
docker stop [container-name]

# Or use a different port
# Edit docker-compose.redis.yml: change "6379:6379" to "6380:6379"
```

---

## VS Code Integration

### Run All Servers from VS Code
1. Press `Ctrl+Shift+P`
2. Type "Run Task"
3. Select "🚀 Start All Servers"

### Run Redis Only
1. Press `Ctrl+Shift+P`
2. Type "Run Task"
3. Select "🔴 Start Redis Server (Docker)"

---

## Daily Workflow

### Morning
```powershell
# Start everything
.\start-servers.ps1

# Verify Redis
.\manage-redis.ps1 status
```

### During Development
- Frontend auto-reloads on file changes
- Backend auto-reloads on file changes
- Redis keeps running in background

### Evening
- Close Backend/Frontend terminals
- **Leave Redis running** (it will auto-start tomorrow!)

---

## Connection Details

### Redis
```
Host: localhost
Port: 6379
Password: 23233
URL: redis://:23233@localhost:6379/0
Container: lokifi-redis
```

### Backend `.env` (No changes needed)
```env
REDIS_URL=redis://:23233@localhost:6379/0
REDIS_PASSWORD=23233
```

---

## Documentation

- **REDIS_DOCKER_SETUP.md** - Complete Docker Redis guide
- **REDIS_DOCKER_AUTOMATION.md** - Automation details
- **SERVER_AUTOMATION_COMPLETE.md** - Server automation docs
- **CRYPTO_FIX_SUCCESS.md** - Latest crypto API fix

---

## Status Check

### Everything Working?
```powershell
# 1. Docker running?
docker ps

# 2. Redis running?
.\manage-redis.ps1 status

# 3. Backend running?
curl http://localhost:8000/api/health

# 4. Frontend running?
start http://localhost:3000

# 5. Crypto API working?
curl http://localhost:8000/api/crypto/market/overview
```

If all return success, you're good to go! 🎉

---

**Quick Reference**: 
- Start: `.\start-servers.ps1`
- Status: `.\manage-redis.ps1 status`
- Stop Redis: `docker stop lokifi-redis`
- Restart Redis: `docker restart lokifi-redis`

**Everything automated and ready to use!** 🚀🐳
