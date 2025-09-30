# Fynix Development Helper Script
# Usage: .\dev.ps1 [command]
# Examples: .\dev.ps1 start, .\dev.ps1 be, .\dev.ps1 test

param(
    [Parameter(Position = 0)]
    [string]$Command = "help",
    [Parameter(Position = 1)]
    [string]$Package = "",
    [Parameter(Position = 2)]
    [string]$Version = "",
    [switch]$Force
)

# Load dependency protection module
$protectionScript = Join-Path $PSScriptRoot "dependency_protection.ps1"
if (Test-Path $protectionScript) {
    . $protectionScript
}

# Colors for output
$Colors = @{
    Red     = "Red"
    Green   = "Green" 
    Yellow  = "Yellow"
    Blue    = "Blue"
    Cyan    = "Cyan"
    Magenta = "Magenta"
    White   = "White"
}

function Write-ColoredText {
    param([string]$Text, [string]$Color = "White")
    Write-Host $Text -ForegroundColor $Colors[$Color]
}

function Show-Help {
    Write-ColoredText "🚀 Fynix Development Commands (PowerShell)" "Cyan"
    Write-ColoredText "=========================================" "Cyan"
    Write-Host ""
    Write-ColoredText "🔥 Quick Start:" "Green"
    Write-ColoredText "  .\dev.ps1 start        - Setup and start both servers" "Yellow"
    Write-ColoredText "  .\dev.ps1 dev          - Start development servers" "Yellow"
    Write-ColoredText "  .\dev.ps1 be           - Backend only (FastAPI)" "Yellow"
    Write-ColoredText "  .\dev.ps1 fe           - Frontend only (Next.js)" "Yellow"
    Write-Host ""
    Write-ColoredText "🧪 Testing:" "Green"
    Write-ColoredText "  .\dev.ps1 test         - Run all tests" "Yellow"
    Write-ColoredText "  .\dev.ps1 test-be      - Backend tests only" "Yellow"
    Write-ColoredText "  .\dev.ps1 test-fe      - Frontend tests only" "Yellow"
    Write-Host ""
    Write-ColoredText "🔧 Code Quality:" "Green"
    Write-ColoredText "  .\dev.ps1 lint         - Lint all code" "Yellow"
    Write-ColoredText "  .\dev.ps1 format       - Format all code" "Yellow"
    Write-ColoredText "  .\dev.ps1 check        - Lint + test everything" "Yellow"
    Write-Host ""
    Write-ColoredText "📦 Setup:" "Green"
    Write-ColoredText "  .\dev.ps1 setup        - Initial environment setup" "Yellow"
    Write-ColoredText "  .\dev.ps1 install      - Install/update dependencies" "Yellow"
    Write-ColoredText "  .\dev.ps1 verify       - Verify all dependencies" "Yellow"
    Write-ColoredText "  .\dev.ps1 upgrade      - Upgrade all dependencies" "Yellow"
    Write-Host ""
    Write-ColoredText "🛡️  Dependency Protection:" "Green"
    Write-ColoredText "  .\dev.ps1 protect           - Initialize protection system" "Yellow"
    Write-ColoredText "  .\dev.ps1 protection-status - Show protection status" "Yellow"
    Write-ColoredText "  .\dev.ps1 snapshot          - Create version snapshot" "Yellow"
    Write-ColoredText "  .\dev.ps1 safe-install pip package [version] - Protected pip install" "Yellow"
    Write-ColoredText "  .\dev.ps1 safe-install npm package [version] - Protected npm install" "Yellow"
    Write-Host ""
    Write-ColoredText "🔍 Utilities:" "Green"
    Write-ColoredText "  .\dev.ps1 clean        - Clean caches" "Yellow"
    Write-ColoredText "  .\dev.ps1 status       - System health check" "Yellow"
    Write-ColoredText "  .\dev.ps1 upgrade      - Upgrade all dependencies" "Yellow"
    Write-ColoredText "  .\dev.ps1 clean        - Clean cache files" "Yellow"
    Write-ColoredText "  .\dev.ps1 reset        - Reset environments" "Yellow"
    Write-Host ""
    Write-ColoredText "ℹ️ Information:" "Green"
    Write-ColoredText "  .\dev.ps1 status       - Check system health" "Yellow"
    Write-ColoredText "  .\dev.ps1 logs         - Show recent logs" "Yellow"
    Write-ColoredText "  .\dev.ps1 version      - Show version info" "Yellow"
}

function Start-Backend {
    Write-ColoredText "🔧 Starting backend development server..." "Cyan"
    Set-Location backend
    $env:PYTHONPATH = $PWD.Path
    & .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
    Set-Location ..
}

function Start-Frontend {
    Write-ColoredText "🌐 Starting frontend development server..." "Cyan"
    Set-Location frontend
    npm run dev
    Set-Location ..
}

function Start-Development {
    Write-ColoredText "🔥 Starting Fynix development environment..." "Cyan"
    
    # Start backend in background
    Write-ColoredText "Starting backend server..." "Yellow"
    $backendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        Set-Location backend
        $env:PYTHONPATH = $PWD.Path
        & .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
    }
    
    Start-Sleep -Seconds 3
    
    # Start frontend in background
    Write-ColoredText "Starting frontend server..." "Yellow"
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        Set-Location frontend
        npm run dev
    }
    
    Write-ColoredText "✅ Both servers starting..." "Green"
    Write-ColoredText "🌐 Frontend: http://localhost:3000" "Blue"
    Write-ColoredText "🔧 Backend:  http://localhost:8000" "Blue"
    Write-ColoredText "Press Ctrl+C to stop..." "Yellow"
    
    # Wait for user interrupt
    try {
        Wait-Job -Job $backendJob, $frontendJob
    }
    finally {
        Stop-Job -Job $backendJob, $frontendJob
        Remove-Job -Job $backendJob, $frontendJob
    }
}

function Setup-Environment {
    Write-ColoredText "📦 Setting up Fynix development environment..." "Cyan"
    
    # Backend setup
    Write-ColoredText "Setting up backend..." "Yellow"
    Set-Location backend
    if (!(Test-Path "venv")) {
        python -m venv venv
    }
    & .\venv\Scripts\pip.exe install --upgrade pip setuptools wheel
    & .\venv\Scripts\pip.exe install -r requirements.txt
    Set-Location ..
    
    # Frontend setup
    Write-ColoredText "Setting up frontend..." "Yellow"
    Set-Location frontend
    npm install
    Set-Location ..
    
    Write-ColoredText "✅ Environment setup complete!" "Green"
}

function Run-Tests {
    param([string]$Type = "all")
    
    switch ($Type) {
        "all" {
            Write-ColoredText "🧪 Running all tests..." "Cyan"
            Run-Tests "backend"
            Run-Tests "frontend"
        }
        "backend" {
            Write-ColoredText "🧪 Running backend tests..." "Cyan"
            Set-Location backend
            $env:PYTHONPATH = $PWD.Path
            & .\venv\Scripts\python.exe -m pytest tests/ -v --tb=short
            Set-Location ..
        }
        "frontend" {
            Write-ColoredText "🧪 Running frontend tests..." "Cyan"
            Set-Location frontend
            npm run test:ci
            Set-Location ..
        }
    }
}

function Format-Code {
    Write-ColoredText "🎨 Formatting code..." "Cyan"
    
    # Backend formatting
    Write-ColoredText "Formatting backend..." "Yellow"
    Set-Location backend
    $env:PYTHONPATH = $PWD.Path
    & .\venv\Scripts\python.exe -m black .
    & .\venv\Scripts\python.exe -m ruff check . --fix
    Set-Location ..
    
    # Frontend formatting  
    Write-ColoredText "Formatting frontend..." "Yellow"
    Set-Location frontend
    npm run lint -- --fix 2>$null
    Set-Location ..
    
    Write-ColoredText "✅ Code formatted!" "Green"
}

function Clean-Cache {
    Write-ColoredText "🧹 Cleaning cache files..." "Cyan"
    
    # Backend cleanup
    Get-ChildItem -Path "backend" -Recurse -Name "__pycache__" | ForEach-Object { Remove-Item "backend\$_" -Recurse -Force }
    Get-ChildItem -Path "backend" -Recurse -Name "*.pyc" | ForEach-Object { Remove-Item "backend\$_" -Force }
    
    # Frontend cleanup
    if (Test-Path "frontend\.next") { Remove-Item "frontend\.next" -Recurse -Force }
    if (Test-Path "frontend\node_modules\.cache") { Remove-Item "frontend\node_modules\.cache" -Recurse -Force }
    
    Write-ColoredText "✅ Cache cleaned!" "Green"
}

function Verify-Dependencies {
    Write-ColoredText "🔍 Verifying all dependencies..." "Cyan"
    
    Set-Location backend
    $env:PYTHONPATH = $PWD.Path
    & .\venv\Scripts\python.exe dependency_verifier.py
    Set-Location ..
}

function Upgrade-Dependencies {
    Write-ColoredText "⬆️ Upgrading all dependencies..." "Cyan"
    
    # Backend upgrade
    Write-ColoredText "Upgrading backend dependencies..." "Yellow"
    Set-Location backend
    & .\venv\Scripts\pip.exe install --upgrade -r requirements.txt
    Set-Location ..
    
    # Frontend upgrade
    Write-ColoredText "Upgrading frontend dependencies..." "Yellow"
    Set-Location frontend
    npm update
    npm audit fix --force 2>$null
    Set-Location ..
    
    Write-ColoredText "✅ All dependencies upgraded!" "Green"
}

function Show-Status {
    Write-ColoredText "📊 Checking system status..." "Cyan"
    
    Write-ColoredText "Backend Health:" "Yellow"
    Set-Location backend
    $env:PYTHONPATH = $PWD.Path
    & .\venv\Scripts\python.exe -c "
import asyncio
from app.core.database import db_manager
from app.core.advanced_redis_client import advanced_redis_client

async def health_check():
    try:
        print('🔍 Database:', 'OK' if await db_manager.health_check() else 'FAIL')
    except:
        print('🔍 Database: FAIL')
    try:
        print('🔍 Redis:', 'OK' if await advanced_redis_client.health_check() else 'FAIL')
    except:
        print('🔍 Redis: FAIL')

asyncio.run(health_check())
"
    Set-Location ..
    
    Write-ColoredText "Frontend Status:" "Yellow"
    Write-ColoredText "Node.js: $(node --version)" "White"
    Write-ColoredText "npm: $(npm --version 2>$null)" "White"
}

# Main command dispatcher
switch ($Command.ToLower()) {
    "help" { Show-Help }
    "start" { 
        Setup-Environment
        Start-Development 
    }
    "dev" { Start-Development }
    "be" { Start-Backend }
    "backend" { Start-Backend }
    "fe" { Start-Frontend }
    "frontend" { Start-Frontend }
    "setup" { Setup-Environment }
    "install" { Setup-Environment }
    "verify" { Verify-Dependencies }
    "upgrade" { Upgrade-Dependencies }
    "test" { Run-Tests }
    "test-be" { Run-Tests "backend" }
    "test-fe" { Run-Tests "frontend" }
    "format" { Format-Code }
    "clean" { Clean-Cache }
    "status" { Show-Status }
    
    # Dependency Protection Commands
    "protect" { 
        if (Get-Command Start-DependencyProtection -ErrorAction SilentlyContinue) {
            Start-DependencyProtection
        }
        else {
            Write-ColoredText "Dependency protection module not loaded" "Red"
        }
    }
    "protection-status" { 
        if (Get-Command Show-ProtectionStatus -ErrorAction SilentlyContinue) {
            Show-ProtectionStatus
        }
        else {
            Write-ColoredText "Dependency protection module not loaded" "Red"
        }
    }
    "snapshot" { 
        if (Get-Command Start-DependencySnapshot -ErrorAction SilentlyContinue) {
            Start-DependencySnapshot
        }
        else {
            Write-ColoredText "Dependency protection module not loaded" "Red"
        }
    }
    "safe-install" { 
        if (!$Package) {
            Write-ColoredText "Usage: .\dev.ps1 safe-install <pip|npm> <package> [version] [-Force]" "Yellow"
            return
        }
        
        $manager = $Package
        $packageName = $Version
        $packageVersion = $args[0]
        
        if (Get-Command Install-ProtectedPackage -ErrorAction SilentlyContinue) {
            Install-ProtectedPackage -PackageManager $manager -Package $packageName -Version $packageVersion -Force:$Force
        }
        else {
            Write-ColoredText "Dependency protection module not loaded" "Red"
        }
    }
    
    default { 
        Write-ColoredText "Unknown command: $Command" "Red"
        Show-Help 
    }
}