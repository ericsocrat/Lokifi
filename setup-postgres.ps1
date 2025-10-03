#!/usr/bin/env pwsh
# setup-postgres.ps1 - One-command PostgreSQL setup for Lokifi

Write-Host "🐘 PostgreSQL Setup for Lokifi" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Green

# Check if Docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker not found!" -ForegroundColor Red
    Write-Host "Please install Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Write-Host "`nOr install PostgreSQL directly: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Docker found" -ForegroundColor Green

# Check if container already exists
$existing = docker ps -a --filter "name=lokifi-postgres" --format "{{.Names}}" 2>$null

if ($existing -eq "lokifi-postgres") {
    $running = docker ps --filter "name=lokifi-postgres" --format "{{.Names}}" 2>$null
    
    if ($running -eq "lokifi-postgres") {
        Write-Host "✅ PostgreSQL container already running!" -ForegroundColor Green
    } else {
        Write-Host "▶️  Starting existing PostgreSQL container..." -ForegroundColor Yellow
        docker start lokifi-postgres
        Write-Host "✅ PostgreSQL started!" -ForegroundColor Green
    }
} else {
    Write-Host "🚀 Creating PostgreSQL container..." -ForegroundColor Yellow
    
    docker run -d `
        --name lokifi-postgres `
        -e POSTGRES_USER=lokifi `
        -e POSTGRES_PASSWORD=lokifi2025 `
        -e POSTGRES_DB=lokifi `
        -p 5432:5432 `
        --restart unless-stopped `
        postgres:16-alpine
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL created and started!" -ForegroundColor Green
        Write-Host "`n⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    } else {
        Write-Host "❌ Failed to create PostgreSQL container" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n📋 PostgreSQL Connection Details:" -ForegroundColor Cyan
Write-Host "   Host: localhost" -ForegroundColor White
Write-Host "   Port: 5432" -ForegroundColor White
Write-Host "   Database: lokifi" -ForegroundColor White
Write-Host "   Username: lokifi" -ForegroundColor White
Write-Host "   Password: lokifi2025" -ForegroundColor White
Write-Host "`n   URL: postgresql+asyncpg://lokifi:lokifi2025@localhost:5432/lokifi" -ForegroundColor Gray

Write-Host "`n💡 Useful Commands:" -ForegroundColor Cyan
Write-Host "   Connect: docker exec -it lokifi-postgres psql -U lokifi -d lokifi" -ForegroundColor Gray
Write-Host "   Stop:    docker stop lokifi-postgres" -ForegroundColor Gray
Write-Host "   Start:   docker start lokifi-postgres" -ForegroundColor Gray
Write-Host "   Logs:    docker logs lokifi-postgres" -ForegroundColor Gray
Write-Host "   Remove:  docker rm -f lokifi-postgres" -ForegroundColor Gray

Write-Host "`n✅ PostgreSQL is ready!" -ForegroundColor Green
Write-Host "Next step: Run migrations with 'cd backend; python -m alembic upgrade head'" -ForegroundColor Yellow
