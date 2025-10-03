# Start All Servers - Complete Guide

## 🚀 Quick Start

### Method 1: PowerShell Script (Recommended)
```powershell
.\start-all-servers.ps1
```
This will open **3 separate terminal windows**:
1. 🔴 **Redis Server** (Port 6379, Password: 23233)
2. 🔧 **Backend Server** (Port 8000, FastAPI)
3. 🎨 **Frontend Server** (Port 3000, Next.js)

---

### Method 2: VS Code Tasks
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Run Task"
3. Select: **🚀 Start All Servers**

Or start individually:
- **🔴 Start Redis Server**
- **🔧 Start Backend Server**
- **🎨 Start Frontend Server**

---

## 📋 Server Details

### Redis Server
- **Port**: 6379
- **Password**: `23233`
- **Connection String**: `redis://:23233@localhost:6379/0`
- **Purpose**: Caching, WebSocket coordination, session storage

### Backend Server (FastAPI)
- **Port**: 8000
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs (Swagger UI)
- **Health**: http://localhost:8000/api/health
- **Tech**: Python, FastAPI, SQLAlchemy, Uvicorn

### Frontend Server (Next.js)
- **Port**: 3000
- **Local**: http://localhost:3000
- **Network**: Available on your local network IP
- **Tech**: React, Next.js 15, TypeScript, Tailwind CSS

---

## 🔧 Configuration Files Updated

### 1. Redis Configuration
**File**: `redis/redis.conf`
```properties
requirepass 23233
port 6379
bind 0.0.0.0
```

### 2. Backend Environment
**File**: `backend/.env`
```env
REDIS_URL=redis://:23233@localhost:6379/0
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=23233
```

### 3. VS Code Tasks
**File**: `.vscode/tasks.json`
- Task runner configuration
- Terminal naming
- Proper sequencing

---

## 🎯 Terminal Naming

Each server runs in its own terminal with a descriptive name:

| Terminal Name | Server | Icon |
|--------------|--------|------|
| 🔴 Redis Server | Redis | Red |
| 🔧 Backend Server (FastAPI) | Python API | Blue |
| 🎨 Frontend Server (Next.js) | React App | Magenta |

---

## 🛠️ Troubleshooting

### Redis Won't Start
```powershell
# Check if Redis directory exists
cd redis
ls

# If redis-server.exe is missing:
# Option 1: Download Redis for Windows
# Option 2: Use WSL with: wsl redis-server
```

### Backend Errors
```powershell
# Reinstall dependencies
cd backend
rm -r venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Frontend Errors
```powershell
# Clear and reinstall
cd frontend
rm -r node_modules, .next
npm install
npm run dev
```

### Port Already in Use
```powershell
# Find process using port
netstat -ano | findstr :8000  # Backend
netstat -ano | findstr :3000  # Frontend
netstat -ano | findstr :6379  # Redis

# Kill process
taskkill /PID <PID> /F
```

---

## 🔒 Security Notes

### Development Password
- **Redis Password**: `23233`
- ⚠️ **This is for LOCAL DEVELOPMENT ONLY**
- **Production**: Change to a strong password in:
  - `redis/redis.conf`
  - `backend/.env`

### JWT Secret
- Located in `backend/.env`
- Current: `sEsoJfw7PWH_z6OmkJRnJQFQT1fiaLLn9AUYAq_6lR8`
- **Production**: Generate new secret:
  ```powershell
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```

---

## 📊 Server Health Checks

### Check All Services
```powershell
# Redis
redis-cli -a 23233 ping
# Should return: PONG

# Backend
curl http://localhost:8000/api/health
# Should return: {"status": "ok"}

# Frontend
curl http://localhost:3000
# Should return: HTML content
```

---

## 🛑 Stopping Servers

### Stop All Servers
Close the terminal windows, or press `Ctrl+C` in each terminal.

### Via Task Manager
1. Press `Ctrl+Shift+Esc`
2. Find processes:
   - `redis-server.exe`
   - `python.exe` (uvicorn)
   - `node.exe` (Next.js)
3. End tasks

---

## ⚡ Performance Tips

### Redis Optimization
- Memory limit: 256MB (configured)
- Eviction: LRU (Least Recently Used)
- Persistence: Enabled with RDB snapshots

### Backend Optimization
- Hot reload: Enabled (development)
- Workers: 1 (development)
- Production: Use multiple workers with Gunicorn

### Frontend Optimization
- Fast Refresh: Enabled
- TypeScript: Incremental compilation
- Turbopack: Available with `--turbo` flag

---

## 📝 Development Workflow

### Daily Start
```powershell
# Start all servers
.\start-all-servers.ps1

# Or use VS Code Task: Ctrl+Shift+P → Run Task → 🚀 Start All Servers
```

### Making Changes
- **Frontend**: Hot reload automatic
- **Backend**: Hot reload automatic (with `--reload`)
- **Redis**: Requires restart only if config changes

### Testing
```powershell
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

---

## 🎓 Next Steps

1. ✅ Servers are running
2. 📖 Visit API docs: http://localhost:8000/docs
3. 🌐 Open frontend: http://localhost:3000
4. 🧪 Test health endpoint: http://localhost:8000/api/health
5. 🔐 Try authentication flows
6. 💾 Check Redis: `redis-cli -a 23233 ping`

---

## 📞 Support

### Common Issues
- **Port conflicts**: See "Port Already in Use" above
- **Missing dependencies**: Reinstall (see Troubleshooting)
- **Environment variables**: Check `backend/.env`

### Documentation
- **Backend API**: http://localhost:8000/docs
- **Project Docs**: See `docs/` folder
- **Redis Commands**: https://redis.io/commands

---

**Status**: ✅ All configurations complete  
**Date**: October 3, 2025  
**Ready for Development**: Yes 🎉
