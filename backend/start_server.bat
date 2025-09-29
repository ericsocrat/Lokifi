@echo off
REM Fynix Backend Startup Script (Updated Dependencies v2.0)
REM Batch script to start the Fynix backend servers
REM All dependencies updated to latest versions (Sept 2025)

echo 🚀 Fynix Backend Startup Script v2.0
echo Latest Dependencies: FastAPI 0.118.0, SQLAlchemy 2.0.43
echo ============================================

cd /d "C:\Users\USER\Desktop\fynix\backend"

if not exist "venv\Scripts\python.exe" (
    echo ❌ Virtual environment not found at venv\Scripts\python.exe
    echo Please ensure the virtual environment is set up correctly.
    exit /b 1
)

set PYTHONPATH=C:\Users\USER\Desktop\fynix\backend

if "%1"=="main" (
    if "%2"=="" (
        set PORT=8002
    ) else (
        set PORT=%2
    )
    echo 🌟 Starting Main Fynix Server on port %PORT%...
    echo 📡 Health endpoint: http://localhost:%PORT%/api/health
    echo 📚 API endpoints: http://localhost:%PORT%/docs
    echo.
    venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port %PORT% --reload
) else if "%1"=="stress" (
    echo ⚡ Starting Stress Test Server on port 8001...
    echo 📡 Health endpoint: http://localhost:8001/health
    echo.
    venv\Scripts\python.exe stress_test_server.py
) else if "%1"=="verify" (
    echo 🔍 Running verification tests...
    venv\Scripts\python.exe verify_setup.py
) else (
    echo ❌ Unknown server type: %1
    echo Available options:
    echo   main [port]  - Start main Fynix server (default port 8002)
    echo   stress       - Start stress test server (port 8001)
    echo   verify       - Run verification tests
    echo.
    echo Examples:
    echo   start_server.bat main
    echo   start_server.bat main 8000
    echo   start_server.bat stress
    echo   start_server.bat verify
    exit /b 1
)