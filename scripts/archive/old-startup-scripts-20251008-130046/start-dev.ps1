# Lokifi Development Environment Startup Script
# Starts both backend and frontend servers concurrently

Write-Host "🚀 Starting Lokifi Development Environment..." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Function to start a process in a new window
function Start-ServerWindow {
    param(
        [string]$Title,
        [string]$Command,
        [string]$WorkingDirectory
    )
    
    $psCommand = "powershell -NoExit -Command `"& { Set-Location '$WorkingDirectory'; $Command }`""
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& { Set-Location '$WorkingDirectory'; Write-Host '$Title' -ForegroundColor Green; Write-Host ''; $Command }" -WindowStyle Normal
}

# Get current directory
$rootDir = $PSScriptRoot

Write-Host "🔧 Starting Backend Server..." -ForegroundColor Yellow
Start-ServerWindow -Title "🚀 Lokifi Backend Server" -Command ".\start-backend.ps1" -WorkingDirectory "$rootDir\backend"

Start-Sleep -Seconds 2

Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Yellow
Start-ServerWindow -Title "🎨 Lokifi Frontend Server" -Command ".\start-frontend.ps1" -WorkingDirectory "$rootDir\frontend"

Write-Host ""
Write-Host "✅ Development servers are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "📍 Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "📍 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Tip: Close the server windows to stop the servers" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit this launcher..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
