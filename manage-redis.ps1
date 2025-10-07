# Redis Docker Management Script
# Manages Redis container for Lokifi caching

param(
    [string]$Action = "start"
)

Write-Host "🐳 Redis Docker Manager" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Check if Docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker not found!" -ForegroundColor Red
    Write-Host "   Please install Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is running
$null = docker ps 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running!" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop and try again" -ForegroundColor Yellow
    exit 1
}

$containerName = "lokifi-redis"
$redisPassword = "23233"
$redisPort = "6379"

function Start-RedisContainer {
    Write-Host "🚀 Starting Redis container..." -ForegroundColor Cyan
    
    # Check if container exists
    $existingContainer = docker ps -a --filter "name=$containerName" --format "{{.Names}}" 2>$null
    
    if ($existingContainer -eq $containerName) {
        Write-Host "   📦 Found existing container '$containerName'" -ForegroundColor Yellow
        
        # Check if it's running
        $runningContainer = docker ps --filter "name=$containerName" --format "{{.Names}}" 2>$null
        
        if ($runningContainer -eq $containerName) {
            Write-Host "   ✅ Container already running!" -ForegroundColor Green
        } else {
            Write-Host "   ▶️  Starting existing container..." -ForegroundColor Yellow
            docker start $containerName | Out-Null
            Write-Host "   ✅ Container started!" -ForegroundColor Green
        }
    } else {
        Write-Host "   🆕 Creating new Redis container..." -ForegroundColor Yellow
        docker run -d `
            --name $containerName `
            -p ${redisPort}:6379 `
            -e REDIS_PASSWORD=$redisPassword `
            --restart unless-stopped `
            redis:latest `
            redis-server --requirepass $redisPassword | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Container created and started!" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Failed to create container" -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Host ""
    Write-Host "📋 Redis Connection Details:" -ForegroundColor Cyan
    Write-Host "   🔗 URL: redis://:${redisPassword}@localhost:${redisPort}/0" -ForegroundColor White
    Write-Host "   🔐 Password: $redisPassword" -ForegroundColor White
    Write-Host "   📡 Port: $redisPort" -ForegroundColor White
    Write-Host "   🐳 Container: $containerName" -ForegroundColor White
}

function Stop-RedisContainer {
    Write-Host "🛑 Stopping Redis container..." -ForegroundColor Yellow
    
    $runningContainer = docker ps --filter "name=$containerName" --format "{{.Names}}" 2>$null
    
    if ($runningContainer -eq $containerName) {
        docker stop $containerName | Out-Null
        Write-Host "   ✅ Container stopped" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Container not running" -ForegroundColor Gray
    }
}

function Restart-RedisContainer {
    Write-Host "🔄 Restarting Redis container..." -ForegroundColor Yellow
    docker restart $containerName | Out-Null
    Write-Host "   ✅ Container restarted" -ForegroundColor Green
}

function Remove-RedisContainer {
    Write-Host "🗑️  Removing Redis container..." -ForegroundColor Red
    
    # Stop if running
    $runningContainer = docker ps --filter "name=$containerName" --format "{{.Names}}" 2>$null
    if ($runningContainer -eq $containerName) {
        docker stop $containerName | Out-Null
    }
    
    # Remove container
    $existingContainer = docker ps -a --filter "name=$containerName" --format "{{.Names}}" 2>$null
    if ($existingContainer -eq $containerName) {
        docker rm $containerName | Out-Null
        Write-Host "   ✅ Container removed" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Container not found" -ForegroundColor Gray
    }
}

function Show-RedisStatus {
    Write-Host "📊 Redis Container Status:" -ForegroundColor Cyan
    Write-Host ""
    
    $existingContainer = docker ps -a --filter "name=$containerName" --format "{{.Names}}" 2>$null
    
    if ($existingContainer -eq $containerName) {
        $runningContainer = docker ps --filter "name=$containerName" --format "{{.Names}}" 2>$null
        
        if ($runningContainer -eq $containerName) {
            Write-Host "   ✅ Status: RUNNING" -ForegroundColor Green
            
            # Get container details
            $containerInfo = docker inspect $containerName | ConvertFrom-Json
            $uptime = $containerInfo.State.StartedAt
            
            Write-Host "   🐳 Container: $containerName" -ForegroundColor White
            Write-Host "   📡 Port: ${redisPort}:6379" -ForegroundColor White
            Write-Host "   ⏰ Started: $uptime" -ForegroundColor White
            
            # Test connection
            Write-Host ""
            Write-Host "   🔍 Testing connection..." -ForegroundColor Cyan
            $testResult = docker exec $containerName redis-cli -a $redisPassword ping 2>$null
            
            if ($testResult -eq "PONG") {
                Write-Host "   ✅ Connection successful!" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  Connection failed" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   ⏸️  Status: STOPPED" -ForegroundColor Yellow
            Write-Host "   💡 Run: .\manage-redis.ps1 start" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ❌ Container not found" -ForegroundColor Red
        Write-Host "   💡 Run: .\manage-redis.ps1 start" -ForegroundColor Gray
    }
}

function Show-RedisLogs {
    Write-Host "📜 Redis Container Logs (last 50 lines):" -ForegroundColor Cyan
    Write-Host ""
    docker logs --tail 50 $containerName
}

function Open-RedisShell {
    Write-Host "🐚 Opening Redis CLI..." -ForegroundColor Cyan
    Write-Host "   💡 Type 'exit' to quit" -ForegroundColor Gray
    Write-Host ""
    docker exec -it $containerName redis-cli -a $redisPassword
}

# Main logic
switch ($Action.ToLower()) {
    "start" {
        Start-RedisContainer
    }
    "stop" {
        Stop-RedisContainer
    }
    "restart" {
        Restart-RedisContainer
    }
    "remove" {
        Remove-RedisContainer
    }
    "status" {
        Show-RedisStatus
    }
    "logs" {
        Show-RedisLogs
    }
    "shell" {
        Open-RedisShell
    }
    default {
        Write-Host "Usage: .\manage-redis.ps1 [action]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Actions:" -ForegroundColor Cyan
        Write-Host "  start   - Start Redis container (default)" -ForegroundColor White
        Write-Host "  stop    - Stop Redis container" -ForegroundColor White
        Write-Host "  restart - Restart Redis container" -ForegroundColor White
        Write-Host "  remove  - Remove Redis container" -ForegroundColor White
        Write-Host "  status  - Show container status" -ForegroundColor White
        Write-Host "  logs    - Show container logs" -ForegroundColor White
        Write-Host "  shell   - Open Redis CLI shell" -ForegroundColor White
        Write-Host ""
        Write-Host "Examples:" -ForegroundColor Cyan
        Write-Host "  .\manage-redis.ps1 start" -ForegroundColor Gray
        Write-Host "  .\manage-redis.ps1 status" -ForegroundColor Gray
        Write-Host "  .\manage-redis.ps1 shell" -ForegroundColor Gray
    }
}

Write-Host ""
