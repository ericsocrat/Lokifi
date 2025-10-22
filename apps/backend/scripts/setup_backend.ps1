# Lokifi Backend Setup Script
# Complete setup for development environment

Param(
  [switch]$Force,
  [switch]$DevMode
)

Write-Host "`n🚀 Lokifi Backend Environment Setup" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Gray

$ErrorActionPreference = 'Stop'

# Check Python
Write-Host "🐍 Checking Python installation..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "   ✗ Python not found! Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

# Create or recreate virtual environment
if (!(Test-Path '.venv') -or $Force) {
  Write-Host "`n📦 Creating virtual environment (.venv)..." -ForegroundColor Yellow
  python -m venv .venv
  Write-Host "   ✓ Virtual environment created" -ForegroundColor Green
} else {
  Write-Host "`n📦 Virtual environment already exists" -ForegroundColor Green
  if ($Force) {
    Write-Host "   Use -Force to recreate" -ForegroundColor Gray
  }
}

Write-Host "`n🔧 Activating virtual environment..." -ForegroundColor Yellow
. .\.venv\Scripts\Activate.ps1
Write-Host "   ✓ Virtual environment activated" -ForegroundColor Green

Write-Host "`n⬆️  Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet
Write-Host "   ✓ Pip upgraded" -ForegroundColor Green

Write-Host "`n📚 Installing dependencies from requirements.txt..." -ForegroundColor Yellow
pip install -r requirements.txt --quiet
Write-Host "   ✓ Dependencies installed" -ForegroundColor Green

# Install dev dependencies if in dev mode
if ($DevMode) {
  Write-Host "`n🛠️  Installing development dependencies..." -ForegroundColor Yellow
  if (Test-Path 'requirements-dev.txt') {
    pip install -r requirements-dev.txt --quiet
    Write-Host "   ✓ Dev dependencies installed" -ForegroundColor Green
  } else {
    Write-Host "   ℹ️  requirements-dev.txt not found" -ForegroundColor Gray
  }
}

Write-Host "`n✅ Verifying core imports..." -ForegroundColor Yellow
$pyCode = @"
import sys
try:
    import fastapi, sqlalchemy, redis
    print(f"   ✓ FastAPI {fastapi.__version__}")
    print(f"   ✓ SQLAlchemy {sqlalchemy.__version__}")
    print(f"   ✓ Redis {redis.__version__}")
    print("   ✓ All imports successful")
except Exception as e:
    print(f"   ✗ Import verification failed: {e}")
    sys.exit(1)
"@
python -c $pyCode

Write-Host "`n📄 Checking .env file..." -ForegroundColor Yellow
if (-not (Test-Path '.env') -and (Test-Path '.env.example')) {
  Copy-Item .env.example .env
  Write-Host "   ✓ Created .env from template" -ForegroundColor Green
} elseif (Test-Path '.env') {
  Write-Host "   ✓ .env file exists" -ForegroundColor Green
} else {
  Write-Host "   ⚠️  No .env or .env.example found" -ForegroundColor Yellow
}

Write-Host "`n🎉 Setup Complete!" -ForegroundColor Green -BackgroundColor DarkGreen
Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Configure .env file with your settings" -ForegroundColor White
Write-Host "   2. Start Docker services: cd ../../infra/docker && docker compose up" -ForegroundColor White
Write-Host "   3. Run migrations: alembic upgrade head" -ForegroundColor White
Write-Host "   4. Start backend: ./scripts/start_server.ps1" -ForegroundColor White
Write-Host "`n💡 VS Code Setup:" -ForegroundColor Cyan
Write-Host "   Ctrl+Shift+P → Python: Select Interpreter → choose .venv" -ForegroundColor Gray
Write-Host "`n"
