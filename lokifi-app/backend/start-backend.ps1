# Lokifi Backend Startup Script
# Starts the FastAPI backend server

Write-Host "🚀 Starting Lokifi Backend Server..." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

# Navigate to backend directory first
Set-Location $PSScriptRoot

# Set Python path to current directory
$env:PYTHONPATH = (Get-Location).Path
Write-Host "📂 PYTHONPATH: $env:PYTHONPATH" -ForegroundColor Gray

# Check if virtual environment exists
if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    .\venv\Scripts\pip.exe install -r requirements.txt
}

$pythonExe = ".\venv\Scripts\python.exe"

# Default port
$Port = 8000

Write-Host "🌟 Starting Backend Server on port $Port..." -ForegroundColor Yellow
Write-Host "📡 Health endpoint: http://localhost:$Port/api/health" -ForegroundColor Cyan
Write-Host "📚 API docs: http://localhost:$Port/docs" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start the server
& $pythonExe -m uvicorn app.main:app --host 0.0.0.0 --port $Port --reload
