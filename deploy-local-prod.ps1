#!/usr/bin/env pwsh
# Lokifi Local Production Deployment Script
# Deploys backend and frontend in production mode without Docker

param(
    [switch]$SkipBuild,
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Lokifi Production Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$ROOT_DIR = $PSScriptRoot
$BACKEND_DIR = Join-Path $ROOT_DIR "backend"
$FRONTEND_DIR = Join-Path $ROOT_DIR "frontend"

# Helper functions
function Write-Step {
    param([string]$Message)
    Write-Host "`n⚙️  $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Check prerequisites
Write-Step "Checking prerequisites..."

# Check WSL
try {
    wsl --status | Out-Null
    Write-Success "WSL is available"
} catch {
    Write-Error "WSL is not available. Please install WSL2."
    exit 1
}

# Check Redis
Write-Step "Checking Redis status..."
$redisRunning = wsl bash -c 'systemctl is-active redis-server 2>/dev/null'
if ($redisRunning -ne "active") {
    Write-Host "Starting Redis in WSL..." -ForegroundColor Yellow
    wsl sudo systemctl start redis-server
    Start-Sleep -Seconds 2
    Write-Success "Redis started"
} else {
    Write-Success "Redis is already running"
}

# Deploy Backend
if (-not $FrontendOnly) {
    Write-Step "Deploying Backend..."

    # Check if .env exists
    if (-not (Test-Path "$BACKEND_DIR\.env")) {
        Write-Error "Backend .env file not found. Please create it first."
        exit 1
    }

    # Install/update Python dependencies in WSL
    if (-not $SkipBuild) {
        Write-Host "Installing Python dependencies in WSL..." -ForegroundColor Cyan
        wsl bash -c "cd /mnt/c/Users/USER/Desktop/lokifi/backend && pip3 install -r requirements.txt --break-system-packages --quiet"
        Write-Success "Python dependencies installed"
    }

    # Run database migrations
    Write-Host "Running database migrations..." -ForegroundColor Cyan
    wsl bash -c "cd /mnt/c/Users/USER/Desktop/lokifi/backend && /home/ericsocrat/.local/bin/alembic upgrade head 2>&1" | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Database migrations completed"
    } else {
        Write-Host "⚠️  Migration warnings (may be ok if database is new)" -ForegroundColor Yellow
    }

    # Kill any existing backend processes
    Write-Host "Stopping existing backend processes..." -ForegroundColor Cyan
    wsl bash -c 'pkill -f "uvicorn app.main" || true'
    Start-Sleep -Seconds 2

    # Start backend in production mode
    Write-Host "Starting backend server in production mode..." -ForegroundColor Cyan
    Write-Host "Backend will run at: http://localhost:8000" -ForegroundColor Green

    # Create a service script
    $backendScript = @"
#!/bin/bash
cd /mnt/c/Users/USER/Desktop/lokifi/backend
export ENVIRONMENT=production
export PYTHONUNBUFFERED=1
/home/ericsocrat/.local/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 --log-level info
"@

    $backendScript | wsl bash -c 'cat > /tmp/start_backend_prod.sh && chmod +x /tmp/start_backend_prod.sh'

    # Start in background
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "wsl bash /tmp/start_backend_prod.sh" -WindowStyle Normal

    Start-Sleep -Seconds 3
    Write-Success "Backend deployment started"
}

# Deploy Frontend
if (-not $BackendOnly) {
    Write-Step "Deploying Frontend..."

    # Check if node_modules exists
    if (-not (Test-Path "$FRONTEND_DIR\node_modules") -or -not $SkipBuild) {
        Write-Host "Installing Node dependencies..." -ForegroundColor Cyan
        Push-Location $FRONTEND_DIR
        npm install --silent
        Pop-Location
        Write-Success "Node dependencies installed"
    }

    # Check if .env.local exists
    if (-not (Test-Path "$FRONTEND_DIR\.env.local")) {
        Write-Host "Creating default .env.local..." -ForegroundColor Yellow
        @"
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
"@ | Out-File -FilePath "$FRONTEND_DIR\.env.local" -Encoding utf8
    }

    # Build frontend for production
    if (-not $SkipBuild) {
        Write-Host "Building frontend for production..." -ForegroundColor Cyan
        Push-Location $FRONTEND_DIR
        npm run build
        Pop-Location
        Write-Success "Frontend built successfully"
    }

    # Kill any existing frontend processes
    Write-Host "Stopping existing frontend processes..." -ForegroundColor Cyan
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next*" } | Stop-Process -Force
    Start-Sleep -Seconds 2

    # Start frontend in production mode
    Write-Host "Starting frontend server in production mode..." -ForegroundColor Cyan
    Write-Host "Frontend will run at: http://localhost:3000" -ForegroundColor Green

    Push-Location $FRONTEND_DIR
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm run start" -WindowStyle Normal
    Pop-Location

    Start-Sleep -Seconds 3
    Write-Success "Frontend deployment started"
}

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Access your application:" -ForegroundColor Cyan
if (-not $FrontendOnly) {
    Write-Host "   Backend API:  http://localhost:8000" -ForegroundColor White
    Write-Host "   API Docs:     http://localhost:8000/docs" -ForegroundColor White
}
if (-not $BackendOnly) {
    Write-Host "   Frontend:     http://localhost:3000" -ForegroundColor White
}
Write-Host ""
Write-Host "📊 Monitor logs in the opened terminal windows" -ForegroundColor Yellow
Write-Host ""
Write-Host "🛑 To stop services, close the terminal windows or use:" -ForegroundColor Yellow
Write-Host "   - Backend: wsl bash -c 'pkill -f uvicorn'" -ForegroundColor White
Write-Host "   - Frontend: Get-Process node | Where-Object CommandLine -like '*next*' | Stop-Process" -ForegroundColor White
Write-Host ""
