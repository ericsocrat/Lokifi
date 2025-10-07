# Start Lokifi Backend Server
Write-Host "🚀 Starting Lokifi Backend Server..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Navigate to backend directory
Set-Location -Path "$PSScriptRoot\backend"

# Check if virtual environment exists
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "✅ Activating virtual environment..." -ForegroundColor Green
    & .\venv\Scripts\Activate.ps1
} else {
    Write-Host "⚠️  Virtual environment not found. Using global Python." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📡 Starting server on http://localhost:8000" -ForegroundColor Cyan
Write-Host "📊 API Documentation: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "🔍 Health Check: http://localhost:8000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Set PYTHONPATH and start the server
$env:PYTHONPATH = (Get-Location).Path
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
