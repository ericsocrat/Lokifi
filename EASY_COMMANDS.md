# 🚀 Fynix Development - Easy Commands

Since `make` is not installed on your Windows system, here are the optimized commands you can use directly:

## ⚡ Quick Copy-Paste Commands

### 🔥 Most Common Commands

```powershell
# Quick start backend (most used)
cd C:\Users\USER\Desktop\fynix\backend; $env:PYTHONPATH="C:\Users\USER\Desktop\fynix\backend"; .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Quick start frontend
cd C:\Users\USER\Desktop\fynix\frontend; npm run dev

# Run backend tests
cd C:\Users\USER\Desktop\fynix\backend; $env:PYTHONPATH="C:\Users\USER\Desktop\fynix\backend"; .\venv\Scripts\python.exe -m pytest tests/ -v

# Run frontend tests  
cd C:\Users\USER\Desktop\fynix\frontend; npm run test:ci
```

### 🛠️ Setup Commands

```powershell
# Setup backend (first time)
cd C:\Users\USER\Desktop\fynix\backend; python -m venv venv; .\venv\Scripts\pip.exe install -r requirements.txt

# Setup frontend (first time)
cd C:\Users\USER\Desktop\fynix\frontend; npm install

# Update backend dependencies
cd C:\Users\USER\Desktop\fynix\backend; .\venv\Scripts\pip.exe install -r requirements.txt

# Update frontend dependencies
cd C:\Users\USER\Desktop\fynix\frontend; npm install
```

## 🎯 Use Our Custom Scripts

### Method 1: PowerShell Script (Recommended)

```powershell
# Start backend only
.\dev.ps1 be

# Start frontend only  
.\dev.ps1 fe

# Start both (in sequence)
.\dev.ps1 dev

# Run tests
.\dev.ps1 test

# Check system health
.\dev.ps1 status
```

### Method 2: Batch Script (Simple)

```cmd
# Start backend
.\dev.bat be

# Start frontend
.\dev.bat fe

# Run tests
.\dev.bat test
```

## 🔧 Backend Commands (cd backend first)

```powershell
# Start development server
$env:PYTHONPATH="C:\Users\USER\Desktop\fynix\backend"; .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Run tests
$env:PYTHONPATH="C:\Users\USER\Desktop\fynix\backend"; .\venv\Scripts\python.exe -m pytest tests/ -v

# Run security tests
$env:PYTHONPATH="C:\Users\USER\Desktop\fynix\backend"; .\venv\Scripts\python.exe test_security_features.py

# Format code
$env:PYTHONPATH="C:\Users\USER\Desktop\fynix\backend"; .\venv\Scripts\python.exe -m black .

# Lint code
$env:PYTHONPATH="C:\Users\USER\Desktop\fynix\backend"; .\venv\Scripts\python.exe -m ruff check .

# Initialize database
$env:PYTHONPATH="C:\Users\USER\Desktop\fynix\backend"; .\venv\Scripts\python.exe -c "from app.core.database import db_manager; import asyncio; asyncio.run(db_manager.initialize())"

# Check health
$env:PYTHONPATH="C:\Users\USER\Desktop\fynix\backend"; .\venv\Scripts\python.exe -c "
import asyncio
from app.core.database import db_manager
from app.core.advanced_redis_client import advanced_redis_client

async def health_check():
    print('🔍 Database:', 'OK' if await db_manager.health_check() else 'FAIL')
    print('🔍 Redis:', 'OK' if await advanced_redis_client.health_check() else 'FAIL')

asyncio.run(health_check())
"
```

## 🌐 Frontend Commands (cd frontend first)

```powershell
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test:ci

# Run E2E tests
npm run test:e2e

# Lint code
npm run lint

# Type check
npm run typecheck
```

## 🐳 Docker Commands

```powershell
# Start with Docker (from root directory)
docker-compose up --build

# Production deployment
docker-compose -f docker-compose.prod.yml up --build

# Start monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Start Redis only
docker-compose -f docker-compose.redis.yml up -d
```

## 🎯 Super Short Aliases

Create these in your PowerShell profile for even faster access:

```powershell
# Add to your PowerShell profile ($PROFILE)
function fbe { cd C:\Users\USER\Desktop\fynix\backend; $env:PYTHONPATH="C:\Users\USER\Desktop\fynix\backend"; .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 }
function ffe { cd C:\Users\USER\Desktop\fynix\frontend; npm run dev }
function ftest { cd C:\Users\USER\Desktop\fynix; .\dev.ps1 test }
function fstatus { cd C:\Users\USER\Desktop\fynix; .\dev.ps1 status }
```

Then you can just type:
- `fbe` - Start backend
- `ffe` - Start frontend  
- `ftest` - Run tests
- `fstatus` - Check health

## 🚨 Most Important Commands (Pin These!)

### Daily Development
```powershell
# Backend development (copy this!)
cd C:\Users\USER\Desktop\fynix\backend; $env:PYTHONPATH="C:\Users\USER\Desktop\fynix\backend"; .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Frontend development (copy this!)
cd C:\Users\USER\Desktop\fynix\frontend; npm run dev

# Quick test (copy this!)
cd C:\Users\USER\Desktop\fynix; .\dev.ps1 test
```

### Troubleshooting
```powershell
# Check system health
cd C:\Users\USER\Desktop\fynix; .\dev.ps1 status

# Clean cache
cd C:\Users\USER\Desktop\fynix; .\dev.ps1 clean

# Reset environment (nuclear option)
cd C:\Users\USER\Desktop\fynix\backend; Remove-Item venv -Recurse -Force; python -m venv venv; .\venv\Scripts\pip.exe install -r requirements.txt
```

## 📝 Notes

- Backend runs on: http://localhost:8000
- Frontend runs on: http://localhost:3000  
- API docs: http://localhost:8000/docs
- All commands assume you're in the correct directory
- The PowerShell script `.\dev.ps1` is the easiest option
- For one-off commands, use the copy-paste versions above