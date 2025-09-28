# Quick Setup Script for PostgreSQL + Redis (Windows)
# Run this to set up local database for development

param(
    [switch]$Docker,
    [switch]$Native,
    [string]$PostgresPassword = "fynix123"
)

Write-Host "🚀 Fynix Database Setup" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

# Check if Docker is available
function Test-Docker {
    try {
        docker --version | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Setup using Docker (Recommended)
function Setup-Docker {
    Write-Host "🐳 Setting up PostgreSQL and Redis using Docker..." -ForegroundColor Yellow
    
    # Stop existing containers
    docker stop fynix-postgres fynix-redis 2>$null
    docker rm fynix-postgres fynix-redis 2>$null
    
    # Start PostgreSQL
    Write-Host "📊 Starting PostgreSQL container..."
    docker run -d `
        --name fynix-postgres `
        -e POSTGRES_PASSWORD=$PostgresPassword `
        -e POSTGRES_DB=fynix `
        -e POSTGRES_USER=fynix `
        -p 5432:5432 `
        postgres:15
    
    # Start Redis
    Write-Host "🔴 Starting Redis container..."
    docker run -d `
        --name fynix-redis `
        -p 6379:6379 `
        redis:7-alpine
    
    # Wait for services to start
    Write-Host "⏳ Waiting for services to start..."
    Start-Sleep 5
    
    # Update .env file
    $envContent = @"
# Updated by setup script
DATABASE_URL=postgresql+asyncpg://fynix:$PostgresPassword@localhost:5432/fynix
REDIS_URL=redis://localhost:6379/0
ENABLE_DATA_ARCHIVAL=true
ARCHIVE_THRESHOLD_DAYS=365
DELETE_THRESHOLD_DAYS=2555
"@
    
    Add-Content -Path ".env" -Value $envContent
    
    Write-Host "✅ Docker setup complete!" -ForegroundColor Green
    Write-Host "   PostgreSQL: localhost:5432 (user: fynix, password: $PostgresPassword)" -ForegroundColor Gray
    Write-Host "   Redis: localhost:6379" -ForegroundColor Gray
}

# Setup using native Windows installations
function Setup-Native {
    Write-Host "🖥️  Setting up PostgreSQL and Redis natively..." -ForegroundColor Yellow
    
    # Check if Chocolatey is available
    $chocoInstalled = Get-Command choco -ErrorAction SilentlyContinue
    
    if ($chocoInstalled) {
        Write-Host "📦 Installing PostgreSQL via Chocolatey..."
        choco install postgresql -y --params="/Password:$PostgresPassword"
        
        Write-Host "📦 Installing Redis via Chocolatey..."
        choco install redis-64 -y
        
        Write-Host "✅ Native setup complete!" -ForegroundColor Green
        Write-Host "   PostgreSQL: localhost:5432 (user: postgres, password: $PostgresPassword)" -ForegroundColor Gray
        Write-Host "   Redis: localhost:6379" -ForegroundColor Gray
    }
    else {
        Write-Host "❌ Chocolatey not found. Please install manually:" -ForegroundColor Red
        Write-Host "   1. PostgreSQL: https://www.postgresql.org/download/windows/" -ForegroundColor Gray
        Write-Host "   2. Redis: https://github.com/tporadowski/redis/releases" -ForegroundColor Gray
    }
}

# Test database connection
function Test-DatabaseConnection {
    Write-Host "🔍 Testing database connection..." -ForegroundColor Yellow
    
    try {
        & .\venv\Scripts\python.exe manage_db.py test-connection
        Write-Host "✅ Database connection successful!" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Database connection failed. Check your setup." -ForegroundColor Red
    }
}

# Run database migrations
function Run-Migrations {
    Write-Host "📊 Running database migrations..." -ForegroundColor Yellow
    
    try {
        & .\venv\Scripts\python.exe -m alembic upgrade head
        Write-Host "✅ Database migrations complete!" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Migration failed. Check your database setup." -ForegroundColor Red
    }
}

# Show storage metrics
function Show-Metrics {
    Write-Host "📈 Checking storage metrics..." -ForegroundColor Yellow
    
    try {
        & .\venv\Scripts\python.exe manage_db.py metrics
    }
    catch {
        Write-Host "❌ Could not retrieve metrics." -ForegroundColor Red
    }
}

# Main execution
if ($Docker -or (-not $Native -and (Test-Docker))) {
    Setup-Docker
}
elseif ($Native) {
    Setup-Native
}
else {
    Write-Host "❌ Docker not available and native setup not requested." -ForegroundColor Red
    Write-Host "   Use: .\setup_database.ps1 -Docker  (for Docker setup)" -ForegroundColor Gray
    Write-Host "   Use: .\setup_database.ps1 -Native (for native setup)" -ForegroundColor Gray
    exit 1
}

# Test and setup database
Write-Host "🔧 Configuring database..." -ForegroundColor Cyan
Test-DatabaseConnection
Run-Migrations
Show-Metrics

Write-Host ""
Write-Host "🎉 Database setup complete!" -ForegroundColor Green
Write-Host "   Run: python start_server.py" -ForegroundColor Gray
Write-Host "   Or:  python manage_db.py info" -ForegroundColor Gray