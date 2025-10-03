# Redis Quick Setup Script
# Ensures Redis is running with proper port mapping

Write-Host "🔴 Redis Setup for Lokifi" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not responding"
    }
    Write-Host "✅ Docker is running: $dockerVersion`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "`nPlease start Docker Desktop and run this script again.`n" -ForegroundColor Yellow
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

# Check if Redis container exists
Write-Host "Checking for existing Redis container..." -ForegroundColor Yellow
$existingContainer = docker ps -a --filter "name=lokifi-redis" --format "{{.Names}}" 2>$null

if ($existingContainer) {
    Write-Host "Found existing container: $existingContainer" -ForegroundColor Yellow

    # Check port mapping
    $portMapping = docker inspect lokifi-redis --format='{{range $p, $conf := .NetworkSettings.Ports}}{{$p}} -> {{(index $conf 0).HostPort}}{{end}}' 2>$null

    if ($portMapping -match "6379") {
        Write-Host "✅ Redis container has correct port mapping" -ForegroundColor Green

        # Check if running
        $isRunning = docker ps --filter "name=lokifi-redis" --format "{{.Names}}" 2>$null

        if ($isRunning) {
            Write-Host "✅ Redis is already running" -ForegroundColor Green
        } else {
            Write-Host "Starting Redis container..." -ForegroundColor Yellow
            docker start lokifi-redis
            Start-Sleep -Seconds 2
            Write-Host "✅ Redis started" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️  Container exists but has no/wrong port mapping" -ForegroundColor Yellow
        Write-Host "Removing old container..." -ForegroundColor Yellow
        docker rm -f lokifi-redis 2>$null
        $existingContainer = $null
    }
}

# Create new container if needed
if (-not $existingContainer -or ($portMapping -notmatch "6379")) {
    Write-Host "`nCreating new Redis container with proper configuration..." -ForegroundColor Yellow

    docker run -d `
        --name lokifi-redis `
        -p 6379:6379 `
        --restart unless-stopped `
        redis:7-alpine `
        redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Redis container created successfully" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "❌ Failed to create Redis container" -ForegroundColor Red
        exit 1
    }
}

# Test connection
Write-Host "`nTesting Redis connection..." -ForegroundColor Yellow
$testResult = docker exec lokifi-redis redis-cli ping 2>$null

if ($testResult -eq "PONG") {
    Write-Host "✅ Redis is responding: $testResult" -ForegroundColor Green
} else {
    Write-Host "⚠️  Redis test failed, waiting and retrying..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    $testResult = docker exec lokifi-redis redis-cli ping 2>$null

    if ($testResult -eq "PONG") {
        Write-Host "✅ Redis is now responding: $testResult" -ForegroundColor Green
    } else {
        Write-Host "❌ Redis is not responding properly" -ForegroundColor Red
        Write-Host "Check logs with: docker logs lokifi-redis" -ForegroundColor Yellow
    }
}

# Show container info
Write-Host "`n📊 Redis Container Info:" -ForegroundColor Cyan
docker ps --filter "name=lokifi-redis" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host "`n✅ Redis Setup Complete!" -ForegroundColor Green
Write-Host "`nConnection Details:" -ForegroundColor Cyan
Write-Host "  Host: localhost" -ForegroundColor White
Write-Host "  Port: 6379" -ForegroundColor White
Write-Host "  URL:  redis://localhost:6379/0" -ForegroundColor White

Write-Host "`n📝 Useful Commands:" -ForegroundColor Cyan
Write-Host "  Start:   docker start lokifi-redis" -ForegroundColor White
Write-Host "  Stop:    docker stop lokifi-redis" -ForegroundColor White
Write-Host "  Logs:    docker logs lokifi-redis -f" -ForegroundColor White
Write-Host "  CLI:     docker exec -it lokifi-redis redis-cli" -ForegroundColor White
Write-Host "  Test:    docker exec lokifi-redis redis-cli ping`n" -ForegroundColor White
