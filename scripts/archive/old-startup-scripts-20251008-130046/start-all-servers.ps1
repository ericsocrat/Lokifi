# Lokifi - Start All Servers
# Automatically starts Redis, Backend, and Frontend with proper terminal naming

Write-Host "🚀 Lokifi - Starting All Servers" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Get the project root directory
$projectRoot = $PSScriptRoot
$redisDir = Join-Path $projectRoot "redis"
$backendDir = Join-Path $projectRoot "backend"
$frontendDir = Join-Path $projectRoot "frontend"

# ============================================
# 1. Start Redis Server
# ============================================
Write-Host "🔴 [1/3] Starting Redis Server..." -ForegroundColor Red

$redisScript = @"
Write-Host '🔴 Redis Server Starting...' -ForegroundColor Red
Write-Host '============================================' -ForegroundColor Green
Set-Location '$redisDir'
`$redisExe = 'redis-server.exe'
`$redisConf = 'redis.conf'

if (Test-Path `$redisExe) {
    Write-Host '✅ Redis executable found' -ForegroundColor Green
    Write-Host '🔐 Password: 23233' -ForegroundColor Yellow
    Write-Host '📡 Port: 6379' -ForegroundColor Cyan
    Write-Host ''
    & .\`$redisExe `$redisConf
} else {
    Write-Host '❌ Redis not found in redis/ directory' -ForegroundColor Red
    Write-Host '⚠️  Trying system Redis...' -ForegroundColor Yellow
    redis-server '$redisDir\redis.conf'
}
"@

# Start Redis in new terminal
Start-Process pwsh -ArgumentList "-NoExit", "-Command", $redisScript -WindowStyle Normal

Write-Host "✅ Redis terminal opened" -ForegroundColor Green
Write-Host ""
Start-Sleep -Seconds 2

# ============================================
# 2. Start Backend Server
# ============================================
Write-Host "🔧 [2/3] Starting Backend Server..." -ForegroundColor Blue

$backendScript = @"
Write-Host '🔧 Backend Server Starting...' -ForegroundColor Blue
Write-Host '============================================' -ForegroundColor Green
Set-Location '$backendDir'

# Activate virtual environment
if (Test-Path 'venv\Scripts\Activate.ps1') {
    Write-Host '🐍 Activating Python virtual environment...' -ForegroundColor Cyan
    & .\venv\Scripts\Activate.ps1
} else {
    Write-Host '⚠️  Virtual environment not found, creating...' -ForegroundColor Yellow
    python -m venv venv
    & .\venv\Scripts\Activate.ps1
    Write-Host '📦 Installing dependencies...' -ForegroundColor Cyan
    pip install -r requirements.txt
}

Write-Host ''
Write-Host '✅ Virtual environment activated' -ForegroundColor Green
Write-Host '🌟 Starting FastAPI Backend Server...' -ForegroundColor Magenta
Write-Host ''
Write-Host '📡 API: http://localhost:8000' -ForegroundColor Cyan
Write-Host '📚 Docs: http://localhost:8000/docs' -ForegroundColor Cyan
Write-Host '💚 Health: http://localhost:8000/api/health' -ForegroundColor Cyan
Write-Host ''

# Set PYTHONPATH to include backend directory
`$env:PYTHONPATH = '$backendDir'

# Start uvicorn
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"@

# Start Backend in new terminal
Start-Process pwsh -ArgumentList "-NoExit", "-Command", $backendScript -WindowStyle Normal

Write-Host "✅ Backend terminal opened" -ForegroundColor Green
Write-Host ""
Start-Sleep -Seconds 3

# ============================================
# 3. Start Frontend Server
# ============================================
Write-Host "🎨 [3/3] Starting Frontend Server..." -ForegroundColor Magenta

$frontendScript = @"
Write-Host '🎨 Frontend Server Starting...' -ForegroundColor Magenta
Write-Host '============================================' -ForegroundColor Green
Set-Location '$frontendDir'

# Check if node_modules exists
if (-not (Test-Path 'node_modules')) {
    Write-Host '📦 Installing dependencies...' -ForegroundColor Yellow
    npm install
}

Write-Host ''
Write-Host '✅ Dependencies ready' -ForegroundColor Green
Write-Host '🌟 Starting Next.js Development Server...' -ForegroundColor Cyan
Write-Host ''
Write-Host '🌐 Local: http://localhost:3000' -ForegroundColor Cyan
Write-Host '📱 Network: http://192.168.0.220:3000' -ForegroundColor Cyan
Write-Host ''

# Start Next.js
npm run dev
"@

# Start Frontend in new terminal
Start-Process pwsh -ArgumentList "-NoExit", "-Command", $frontendScript -WindowStyle Normal

Write-Host "✅ Frontend terminal opened" -ForegroundColor Green
Write-Host ""

# ============================================
# Summary
# ============================================
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "🎉 All Servers Started!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Server Status:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  🔴 Redis:    redis://localhost:6379" -ForegroundColor Red
Write-Host "     Password: 23233" -ForegroundColor Gray
Write-Host ""
Write-Host "  🔧 Backend:  http://localhost:8000" -ForegroundColor Blue
Write-Host "     API Docs: http://localhost:8000/docs" -ForegroundColor Gray
Write-Host "     Health:   http://localhost:8000/api/health" -ForegroundColor Gray
Write-Host ""
Write-Host "  🎨 Frontend: http://localhost:3000" -ForegroundColor Magenta
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tip: Each server is running in its own terminal window" -ForegroundColor Yellow
Write-Host "🛑 To stop a server, close its terminal or press Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
