# Server Startup Guide - Fixed

## ✅ Issues Fixed

All empty startup scripts have been recreated with proper functionality:

### Fixed Scripts:
1. ✅ `backend/start-backend.ps1` - Backend server startup
2. ✅ `frontend/start-frontend.ps1` - Frontend server startup
3. ✅ `start-dev.ps1` - Dual server launcher
4. ✅ `start-redis.ps1` - Redis server startup (optional)

---

## 🚀 Quick Start

### Option 1: Start Both Servers (Recommended)
```powershell
# From project root
.\start-dev.ps1
```
This will open two terminal windows:
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:3000

### Option 2: Start Servers Individually

#### Start Backend Only:
```powershell
cd backend
.\start-backend.ps1
```
- Server: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/api/health

#### Start Frontend Only:
```powershell
cd frontend
.\start-frontend.ps1
```
- Server: http://localhost:3000
- Will auto-install dependencies if needed

---

## 📋 Script Features

### Backend Script (`backend/start-backend.ps1`)
- ✅ Auto-creates virtual environment if missing
- ✅ Auto-installs dependencies if needed
- ✅ Sets correct PYTHONPATH
- ✅ Starts FastAPI with hot-reload
- ✅ Shows API endpoints and health check URLs

### Frontend Script (`frontend/start-frontend.ps1`)
- ✅ Auto-installs node_modules if missing
- ✅ Shows local and network URLs
- ✅ Starts Next.js dev server with hot-reload
- ✅ Displays network IP for mobile testing

### Dev Launcher (`start-dev.ps1`)
- ✅ Starts both servers in separate windows
- ✅ Proper startup sequence (backend first)
- ✅ Shows all access URLs
- ✅ Easy to stop (just close windows)

### Redis Script (`start-redis.ps1`)
- ✅ Checks for local Redis installation
- ✅ Falls back to system Redis
- ✅ Provides installation instructions
- ✅ Optional - app works without it

---

## 🔧 Manual Startup (Alternative)

If you prefer manual control:

### Backend:
```powershell
cd backend
.\venv\Scripts\activate
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend:
```powershell
cd frontend
npm run dev
```

---

## 🐛 Troubleshooting

### Backend Issues

**Problem**: Virtual environment not found
```powershell
cd backend
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
```

**Problem**: Port 8000 already in use
```powershell
# Find and kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Frontend Issues

**Problem**: Port 3000 already in use
```powershell
# Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Problem**: Dependencies not installed
```powershell
cd frontend
npm install
```

**Problem**: Build errors
```powershell
cd frontend
rm -r .next node_modules
npm install
npm run dev
```

---

## 📊 Server Status Check

### Check if Backend is Running:
```powershell
curl http://localhost:8000/api/health
```
Should return: `{"status": "ok"}`

### Check if Frontend is Running:
Open browser to: http://localhost:3000

---

## 🎯 Development Workflow

1. **Start Development Environment**:
   ```powershell
   .\start-dev.ps1
   ```

2. **Access Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/docs

3. **Make Changes**:
   - Frontend: Changes auto-reload (Hot Module Replacement)
   - Backend: Changes auto-reload (Uvicorn --reload)

4. **Stop Servers**:
   - Close the terminal windows, or
   - Press `Ctrl+C` in each terminal

---

## 🔒 Production Deployment

For production, use:
```powershell
.\deploy-local-prod.ps1
```

This uses optimized settings:
- No hot-reload
- Production builds
- Optimized assets
- Better performance

---

## 📝 Script Locations

```
lokifi/
├── start-dev.ps1              # 🚀 Main launcher (starts both)
├── start-redis.ps1            # 🔴 Optional Redis starter
├── backend/
│   └── start-backend.ps1      # 🔧 Backend starter
└── frontend/
    └── start-frontend.ps1     # 🎨 Frontend starter
```

---

## ✨ Features of New Scripts

### Auto-Detection
- ✅ Detects missing dependencies
- ✅ Creates virtual environments automatically
- ✅ Installs packages as needed

### User-Friendly Output
- ✅ Color-coded messages
- ✅ Clear progress indicators
- ✅ Helpful error messages
- ✅ Access URLs displayed

### Robust Error Handling
- ✅ Checks for prerequisites
- ✅ Provides fallback options
- ✅ Suggests solutions for common issues

---

## 🎓 Tips

1. **First Time Setup**: Just run `.\start-dev.ps1` - it handles everything!

2. **Development**: Keep both servers running while you code

3. **API Testing**: Use http://localhost:8000/docs for interactive API testing

4. **Mobile Testing**: Use the network URL shown in frontend output

5. **Clean Start**: Delete `.next` and `node_modules` folders if you have build issues

---

## 📞 Need Help?

If servers still won't start:

1. Check terminal output for specific errors
2. Ensure Python 3.11+ is installed: `python --version`
3. Ensure Node.js 18+ is installed: `node --version`
4. Check no other apps are using ports 3000 or 8000
5. Review the ERRORS_FIXED.md document

---

**Status**: ✅ All startup scripts fixed and ready to use!  
**Date**: October 3, 2025  
**Updated By**: GitHub Copilot
