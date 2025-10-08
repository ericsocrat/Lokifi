# Quick Start Script - Redis Optional
# Starts Backend and Frontend (Redis optional)

Write-Host "🚀 Lokifi - Starting Servers" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

$projectRoot = $PSScriptRoot
$backendDir = Join-Path $projectRoot "backend"
$frontendDir = Join-Path $projectRoot "frontend"

# Check if Docker is available
$dockerAvailable = $false
if (Get-Command docker -ErrorAction SilentlyContinue) {
    # Check if Docker daemon is running by testing docker ps
    docker ps 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $dockerAvailable = $true
        Write-Host "✅ Docker found and running - will start Redis container" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Docker found but not running - please start Docker Desktop" -ForegroundColor Yellow
        Write-Host "   Starting Backend + Frontend only (app will work with reduced performance)" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Docker not found - starting Backend + Frontend only" -ForegroundColor Yellow
    Write-Host "   (App will work without Redis, with reduced performance)" -ForegroundColor Gray
}

Write-Host ""
Start-Sleep -Seconds 1

# ============================================
# Start Redis (Docker)
# ============================================
if ($dockerAvailable) {
    Write-Host "🔴 [1/3] Starting Redis Docker Container..." -ForegroundColor Red
    
    # Check if Redis container already exists
    $existingContainer = docker ps -a --filter "name=lokifi-redis" --format "{{.Names}}" 2>$null
    
    if ($existingContainer -eq "lokifi-redis") {
        Write-Host "   📦 Found existing Redis container" -ForegroundColor Cyan
        
        # Check if it's running
        $runningContainer = docker ps --filter "name=lokifi-redis" --format "{{.Names}}" 2>$null
        
        if ($runningContainer -eq "lokifi-redis") {
            Write-Host "   ✅ Redis container already running" -ForegroundColor Green
        } else {
            Write-Host "   ▶️  Starting existing Redis container..." -ForegroundColor Yellow
            docker start lokifi-redis | Out-Null
            Write-Host "   ✅ Redis container started" -ForegroundColor Green
        }
    } else {
        Write-Host "   🚀 Creating new Redis container..." -ForegroundColor Yellow
        docker run -d `
            --name lokifi-redis `
            -p 6379:6379 `
            -e REDIS_PASSWORD=23233 `
            redis:latest `
            redis-server --requirepass 23233 | Out-Null
        Write-Host "   ✅ Redis container created and started" -ForegroundColor Green
    }
    
    Write-Host "   🔐 Password: 23233" -ForegroundColor Cyan
    Write-Host "   📡 Port: 6379" -ForegroundColor Cyan
    Start-Sleep -Seconds 2
} else {
    Write-Host "⏭️  Skipping Redis (Docker not available)" -ForegroundColor Gray
}

Write-Host ""

# ============================================
# Start Backend
# ============================================
if ($dockerAvailable) {
    Write-Host "🔧 [2/3] Starting Backend Server..." -ForegroundColor Blue
} else {
    Write-Host "🔧 [1/2] Starting Backend Server..." -ForegroundColor Blue
}

$backendScript = @"
Write-Host '🔧 Backend Server (FastAPI)' -ForegroundColor Blue
Write-Host '============================================' -ForegroundColor Green
Set-Location '$backendDir'

if (Test-Path 'venv\Scripts\Activate.ps1') {
    Write-Host '🐍 Activating virtual environment...' -ForegroundColor Cyan
    & .\venv\Scripts\Activate.ps1
} else {
    Write-Host '⚠️  Creating virtual environment...' -ForegroundColor Yellow
    python -m venv venv
    & .\venv\Scripts\Activate.ps1
    Write-Host '📦 Installing dependencies...' -ForegroundColor Cyan
    pip install -r requirements.txt
}

Write-Host ''
Write-Host '✅ Environment ready' -ForegroundColor Green
Write-Host '🌟 Starting FastAPI server...' -ForegroundColor Magenta
Write-Host ''
Write-Host '📡 API: http://localhost:8000' -ForegroundColor Cyan
Write-Host '📚 Docs: http://localhost:8000/docs' -ForegroundColor Cyan
Write-Host '💚 Health: http://localhost:8000/api/health' -ForegroundColor Cyan
Write-Host ''

`$env:PYTHONPATH = '$backendDir'
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"@

Start-Process pwsh -ArgumentList "-NoExit", "-Command", $backendScript -WindowStyle Normal
Write-Host "✅ Backend terminal opened" -ForegroundColor Green
Write-Host ""
Start-Sleep -Seconds 3

# ============================================
# Start Frontend
# ============================================
if ($dockerAvailable) {
    Write-Host "🎨 [3/3] Starting Frontend Server..." -ForegroundColor Magenta
} else {
    Write-Host "🎨 [2/2] Starting Frontend Server..." -ForegroundColor Magenta
}

$frontendScript = @"
Write-Host '🎨 Frontend Server (Next.js)' -ForegroundColor Magenta
Write-Host '============================================' -ForegroundColor Green
Set-Location '$frontendDir'

if (-not (Test-Path 'node_modules')) {
    Write-Host '📦 Installing dependencies...' -ForegroundColor Yellow
    npm install
}

Write-Host ''
Write-Host '✅ Dependencies ready' -ForegroundColor Green
Write-Host '🌟 Starting Next.js development server...' -ForegroundColor Cyan
Write-Host ''
Write-Host '🌐 Local: http://localhost:3000' -ForegroundColor Cyan
Write-Host ''

npm run dev
"@

Start-Process pwsh -ArgumentList "-NoExit", "-Command", $frontendScript -WindowStyle Normal
Write-Host "✅ Frontend terminal opened" -ForegroundColor Green
Write-Host ""

# ============================================
# Summary
# ============================================
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "🎉 Servers Started!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

if ($dockerAvailable) {
    Write-Host "📋 Running Services:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  🔴 Redis:    redis://localhost:6379 (Docker)" -ForegroundColor Red
    Write-Host "     Password: 23233" -ForegroundColor Gray
    Write-Host "     Container: lokifi-redis" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "📋 Running Services (Redis: Skipped):" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "  🔧 Backend:  http://localhost:8000" -ForegroundColor Blue
Write-Host "     API Docs: http://localhost:8000/docs" -ForegroundColor Gray
Write-Host "     Health:   http://localhost:8000/api/health" -ForegroundColor Gray
Write-Host ""
Write-Host "  🎨 Frontend: http://localhost:3000" -ForegroundColor Magenta
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Backend/Frontend run in terminal windows" -ForegroundColor Yellow
Write-Host "🐳 Redis runs in Docker container 'lokifi-redis'" -ForegroundColor Yellow
Write-Host "🛑 To stop servers: Close terminals or press Ctrl+C" -ForegroundColor Yellow
Write-Host "🛑 To stop Redis: docker stop lokifi-redis" -ForegroundColor Yellow

if (-not $dockerAvailable) {
    Write-Host ""
    Write-Host "ℹ️  Redis is optional - app will work without it" -ForegroundColor Cyan
    Write-Host "   To use Redis: Install Docker Desktop and restart" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
