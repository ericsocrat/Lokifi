@echo off
REM Fynix Local Development Startup Script
echo Starting Fynix Local Development Environment...

REM Set environment variables
set PYTHONPATH=C:\Users\USER\Desktop\fynix\backend
set ENVIRONMENT=development
set DEBUG=true

REM Start Redis (if Docker available)
echo Starting Redis...
docker run -d --name fynix-redis-dev -p 6379:6379 redis:alpine || echo "Redis start failed - continuing without Redis"

REM Start backend
echo Starting backend server...
cd backend
start "Fynix Backend" cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

REM Start frontend (if available)
if exist "frontend\package.json" (
    echo Starting frontend...
    cd ..\frontend
    start "Fynix Frontend" cmd /k "npm run dev"
)

echo Local development environment started!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo Redis: localhost:6379

pause
