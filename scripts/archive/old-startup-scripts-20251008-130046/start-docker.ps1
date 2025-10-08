# Lokifi Docker Development Environment Startup
# Starts all services using Docker Compose

Write-Host "`n🚀 Lokifi Docker Development Environment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Check Docker
Write-Host "📦 Checking Docker..." -ForegroundColor Yellow
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker not installed!" -ForegroundColor Red
    Write-Host "   Install from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

try {
    docker ps | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running! Please start Docker Desktop" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down 2>$null

Write-Host ""
Write-Host "🚀 Starting services..." -ForegroundColor Cyan
docker-compose up -d

Write-Host ""
Write-Host "⏳ Waiting for services..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green

$services = @("lokifi-postgres-dev", "lokifi-redis-dev", "lokifi-backend-dev", "lokifi-frontend-dev")
foreach ($service in $services) {
    $status = docker ps --filter "name=$service" --format "{{.Status}}" 2>$null
    if ($status -like "*Up*") {
        Write-Host "   ✅ $service" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $service" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🌐 Access:" -ForegroundColor Cyan
Write-Host "   Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:   http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs:  http://localhost:8000/docs" -ForegroundColor White
Write-Host ""

Write-Host "📝 Commands:" -ForegroundColor Cyan
Write-Host "   Logs:    docker-compose logs -f" -ForegroundColor White
Write-Host "   Stop:    docker-compose down" -ForegroundColor White
Write-Host "   Restart: docker-compose restart [service]" -ForegroundColor White
Write-Host ""

$viewLogs = Read-Host "View logs? (y/N)"
if ($viewLogs -eq "y") {
    docker-compose logs -f
}
