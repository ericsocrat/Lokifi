#!/usr/bin/env pwsh
# Lokifi Development Automation Script
# Run common operations without manual approval

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'test', 'build', 'fix-ui', 'clean', 'restart', 'cleanup', 'check')]
    [string]$Action = 'dev'
)

function Start-Frontend {
    Write-Host "🚀 Starting Frontend (Next.js)..." -ForegroundColor Cyan
    Set-Location frontend
    npm run dev
}

function Start-Backend {
    Write-Host "🚀 Starting Backend (FastAPI)..." -ForegroundColor Cyan
    Set-Location backend
    & .\start-backend.ps1
}

function Restart-Dev {
    Write-Host "♻️ Restarting development servers..." -ForegroundColor Yellow

    # Kill existing processes
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next*" } | Stop-Process -Force
    Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*uvicorn*" } | Stop-Process -Force

    Start-Sleep -Seconds 2

    # Start fresh
    Start-Job -Name "Backend" -ScriptBlock {
        Set-Location $using:PWD\backend
        python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    }

    Start-Job -Name "Frontend" -ScriptBlock {
        Set-Location $using:PWD\frontend
        npm run dev
    }

    Write-Host "✅ Servers restarted!" -ForegroundColor Green
    Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
}

function Fix-UIIssues {
    Write-Host "🔧 Applying UI fixes and restarting..." -ForegroundColor Yellow

    # Clear Next.js cache
    Remove-Item -Path "frontend\.next" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "frontend\node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue

    # Restart
    Restart-Dev
}

function Start-Tests {
    Write-Host "🧪 Running tests..." -ForegroundColor Cyan
    Set-Location backend
    pytest tests/ -v
}

function Clean-Project {
    Write-Host "🧹 Cleaning project..." -ForegroundColor Yellow

    # Clean build artifacts
    Remove-Item -Path "frontend\.next" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "frontend\out" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "backend\__pycache__" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "backend\.pytest_cache" -Recurse -Force -ErrorAction SilentlyContinue

    # Clean logs
    Get-ChildItem -Path "." -Recurse -Filter "*.log" | Remove-Item -Force

    Write-Host "✅ Project cleaned!" -ForegroundColor Green
}

function Run-AutoCleanup {
    Write-Host "🧹 Running automated cleanup..." -ForegroundColor Cyan
    & ".\scripts\auto-cleanup.ps1"
}

function Check-Cleanup {
    Write-Host "🔍 Checking for files that need cleanup..." -ForegroundColor Cyan
    & ".\scripts\auto-cleanup.ps1" -DryRun
    Write-Host "`n💡 Run '.\dev.ps1 cleanup' to clean these files." -ForegroundColor Yellow
}

# Execute action
switch ($Action) {
    'dev' { Start-Frontend }
    'test' { Start-Tests }
    'fix-ui' { Fix-UIIssues }
    'clean' { Clean-Project }
    'restart' { Restart-Dev }
    'cleanup' { Run-AutoCleanup }
    'check' { Check-Cleanup }
    default { Start-Frontend }
}
