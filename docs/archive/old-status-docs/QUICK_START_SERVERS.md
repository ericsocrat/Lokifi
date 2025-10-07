# 🚀 Quick Start - Lokifi Servers

## Fastest Way to Start

```powershell
.\start-servers.ps1
```

This automatically starts:
- ✅ Backend (FastAPI) - Port 8000
- ✅ Frontend (Next.js) - Port 3000  
- ✅ Redis (if installed) - Port 6379

Each server opens in its own named terminal window.

---

## Access Your App

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **API Health**: http://localhost:8000/api/health

---

## What You Need

### Required
- ✅ Python 3.11+
- ✅ Node.js 18+

### Optional
- Redis (for better performance)

---

## Configuration

### Redis Password
- **Password**: `23233`
- **Files Updated**:
  - `redis/redis.conf`
  - `backend/.env`

### Environment Variables
- **Backend**: `backend/.env` (auto-created)
- **JWT Secret**: Secure random key generated

---

## Alternative Methods

### Method 1: VS Code Tasks
1. Press `Ctrl+Shift+P`
2. Type "Run Task"  
3. Select "🚀 Start All Servers"

### Method 2: Individual Scripts
```powershell
# Backend only
cd backend
.\start-backend.ps1

# Frontend only
cd frontend
.\start-frontend.ps1

# Redis only (if installed)
.\start-redis.ps1
```

---

## Troubleshooting

### Port Already in Use
```powershell
# Find process
netstat -ano | findstr :8000

# Kill process
taskkill /PID <PID> /F
```

### Redis Not Starting
Redis is optional. The app works without it (with reduced performance).

To install Redis:
- Windows: https://redis.io/download
- WSL: Run `setup-redis-auto.ps1`

---

## Full Documentation

See **START_ALL_SERVERS_GUIDE.md** for:
- Detailed configuration
- Security notes
- Performance tips
- Development workflow
- Advanced troubleshooting

---

## Quick Health Check

```powershell
# Backend
curl http://localhost:8000/api/health

# Redis (if installed)
redis-cli -a 23233 ping
```

---

**Status**: ✅ Ready to use  
**Setup Time**: < 1 minute  
**Auto-Configuration**: Yes 🎉
