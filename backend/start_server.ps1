# Fynix Backend Startup Script (Updated Dependencies v2.0)
# PowerShell script to start the Fynix backend servers
# All dependencies updated to latest versions (Sept 2025)

param(
    [string]$Server = "main",
    [int]$Port = 8002
)

Write-Host "🚀 Fynix Backend Startup Script v2.0" -ForegroundColor Green
Write-Host "Latest Dependencies: FastAPI 0.118.0, SQLAlchemy 2.0.43" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green

# Set Python path
$env:PYTHONPATH = "C:\Users\USER\Desktop\fynix\backend"

# Navigate to backend directory
Set-Location "C:\Users\USER\Desktop\fynix\backend"

# Check if virtual environment exists
if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "❌ Virtual environment not found at venv\Scripts\python.exe" -ForegroundColor Red
    Write-Host "Please ensure the virtual environment is set up correctly." -ForegroundColor Red
    exit 1
}

$pythonExe = ".\venv\Scripts\python.exe"

Write-Host "📋 Server: $Server, Port: $Port" -ForegroundColor Cyan

if ($Server.ToLower() -eq "main") {
    Write-Host "🌟 Starting Main Fynix Server on port $Port..." -ForegroundColor Yellow
    Write-Host "📡 Health endpoint: http://localhost:$Port/api/health" -ForegroundColor Cyan
    Write-Host "📚 API endpoints: http://localhost:$Port/docs" -ForegroundColor Cyan
    Write-Host "" 
    & $pythonExe -m uvicorn app.main:app --host 0.0.0.0 --port $Port --reload
}
elseif ($Server.ToLower() -eq "stress") {
    Write-Host "⚡ Starting Stress Test Server on port 8001..." -ForegroundColor Yellow
    Write-Host "📡 Health endpoint: http://localhost:8001/health" -ForegroundColor Cyan
    Write-Host ""
    & $pythonExe stress_test_server.py
}
elseif ($Server.ToLower() -eq "verify") {
    Write-Host "🔍 Running verification tests..." -ForegroundColor Yellow
    & $pythonExe verify_setup.py
}
else {
    Write-Host "❌ Unknown server type: $Server" -ForegroundColor Red
    Write-Host "Available options:" -ForegroundColor White
    Write-Host "  main    - Start main Fynix server (default port 8002)" -ForegroundColor White
    Write-Host "  stress  - Start stress test server (port 8001)" -ForegroundColor White
    Write-Host "  verify  - Run verification tests" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor White
    Write-Host "  powershell -ExecutionPolicy Bypass -File start_server.ps1 -Server main" -ForegroundColor Gray
    Write-Host "  powershell -ExecutionPolicy Bypass -File start_server.ps1 -Server main -Port 8000" -ForegroundColor Gray
    Write-Host "  powershell -ExecutionPolicy Bypass -File start_server.ps1 -Server stress" -ForegroundColor Gray
    Write-Host "  powershell -ExecutionPolicy Bypass -File start_server.ps1 -Server verify" -ForegroundColor Gray
    exit 1
}