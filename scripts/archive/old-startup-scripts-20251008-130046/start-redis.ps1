# Lokifi Redis Startup Script
# Starts Redis server (if needed)

Write-Host "🔴 Starting Redis Server..." -ForegroundColor Red
Write-Host "============================================" -ForegroundColor Green

# Check if Redis is installed
$redisPath = "redis\redis-server.exe"
$redisConfig = "redis\redis.conf"

if (Test-Path $redisPath) {
    Write-Host "✅ Redis found locally" -ForegroundColor Green
    
    if (Test-Path $redisConfig) {
        Write-Host "📋 Using configuration: $redisConfig" -ForegroundColor Cyan
        & $redisPath $redisConfig
    } else {
        Write-Host "⚠️  No config file found, using defaults" -ForegroundColor Yellow
        & $redisPath
    }
} else {
    Write-Host "❌ Redis not found locally" -ForegroundColor Red
    Write-Host ""
    Write-Host "Checking for system Redis installation..." -ForegroundColor Yellow
    
    # Try to find Redis in system PATH
    $redisCmd = Get-Command redis-server -ErrorAction SilentlyContinue
    
    if ($redisCmd) {
        Write-Host "✅ Found Redis in system PATH" -ForegroundColor Green
        redis-server
    } else {
        Write-Host "❌ Redis not installed" -ForegroundColor Red
        Write-Host ""
        Write-Host "Redis is optional for development. The app will work without it." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To install Redis:" -ForegroundColor Cyan
        Write-Host "1. Windows: Download from https://redis.io/download" -ForegroundColor White
        Write-Host "2. WSL: Run setup-redis-auto.ps1" -ForegroundColor White
        Write-Host ""
        Write-Host "Press any key to continue..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
}
