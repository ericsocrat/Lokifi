# Lokifi Quick Start Script
# Run this script to start all services for local development

Write-Host "🚀 Starting Lokifi Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Check if Redis is running
Write-Host "📋 Checking Redis..." -ForegroundColor Yellow
try {
    $redisCheck = redis-cli ping 2>&1
    if ($redisCheck -match "PONG") {
        Write-Host "✅ Redis is running" -ForegroundColor Green
    } else {
        Write-Host "❌ Redis is not running. Starting Redis..." -ForegroundColor Red
        Write-Host "   Run: redis-server redis/redis.conf" -ForegroundColor Yellow
        Write-Host ""
    }
} catch {
    Write-Host "❌ Redis not found. Please install Redis." -ForegroundColor Red
    Write-Host "   Windows: choco install redis-64" -ForegroundColor Yellow
    Write-Host "   Or use Docker: docker run -d -p 6379:6379 redis:7-alpine" -ForegroundColor Yellow
    Write-Host ""
}

# Check Python version
Write-Host "📋 Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.10+" -ForegroundColor Red
    Write-Host ""
}

# Check Node version
Write-Host "📋 Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    Write-Host ""
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Backend check
Write-Host "🔧 Backend Status:" -ForegroundColor Cyan
$backendVenv = Test-Path "backend\venv"
if ($backendVenv) {
    Write-Host "✅ Virtual environment exists" -ForegroundColor Green
} else {
    Write-Host "❌ Virtual environment not found" -ForegroundColor Red
    Write-Host "   Creating virtual environment..." -ForegroundColor Yellow
    Set-Location backend
    python -m venv venv
    Write-Host "✅ Virtual environment created" -ForegroundColor Green
    Set-Location ..
}

$backendEnv = Test-Path "backend\.env"
if ($backendEnv) {
    Write-Host "✅ Backend .env file exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend .env file not found" -ForegroundColor Yellow
    Write-Host "   Copy backend\.env.example to backend\.env and configure it" -ForegroundColor Yellow
}

Write-Host ""

# Frontend check
Write-Host "🎨 Frontend Status:" -ForegroundColor Cyan
$frontendModules = Test-Path "frontend\node_modules"
if ($frontendModules) {
    Write-Host "✅ Node modules installed" -ForegroundColor Green
} else {
    Write-Host "❌ Node modules not found" -ForegroundColor Red
    Write-Host "   Installing dependencies..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
    Set-Location ..
}

$frontendEnv = Test-Path "frontend\.env.local"
if ($frontendEnv) {
    Write-Host "✅ Frontend .env.local file exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  Frontend .env.local file not found" -ForegroundColor Yellow
    Write-Host "   Creating default .env.local..." -ForegroundColor Yellow
    @"
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_DATA_PROVIDER=mock
NEXT_PUBLIC_ENVIRONMENT=development
"@ | Out-File -FilePath "frontend\.env.local" -Encoding UTF8
    Write-Host "✅ Created default .env.local" -ForegroundColor Green
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Start Redis (if not running):" -ForegroundColor Yellow
Write-Host "   redis-server redis\redis.conf" -ForegroundColor White
Write-Host ""
Write-Host "2. Start Backend (in new terminal):" -ForegroundColor Yellow
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "   python -m uvicorn main:app --reload" -ForegroundColor White
Write-Host ""
Write-Host "3. Start Frontend (in new terminal):" -ForegroundColor Yellow
Write-Host "   cd frontend" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "4. Access the application:" -ForegroundColor Yellow
Write-Host "   Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:   http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs:  http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Setup check complete! Follow the steps above to start Lokifi." -ForegroundColor Green
Write-Host ""

# Ask if user wants to start services
$response = Read-Host "Would you like to open terminals to start the services? (y/n)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host ""
    Write-Host "Opening terminals..." -ForegroundColor Cyan
    
    # Start Redis
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PWD'; Write-Host '🔴 Starting Redis...' -ForegroundColor Red; redis-server redis\redis.conf"
    
    Start-Sleep -Seconds 2
    
    # Start Backend
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host '⚙️  Starting Backend...' -ForegroundColor Blue; .\venv\Scripts\Activate.ps1; python -m uvicorn main:app --reload"
    
    Start-Sleep -Seconds 2
    
    # Start Frontend
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host '🎨 Starting Frontend...' -ForegroundColor Magenta; npm run dev"
    
    Write-Host ""
    Write-Host "✅ All terminals opened! Services are starting..." -ForegroundColor Green
    Write-Host "   Wait a few seconds and visit: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
}
