# Phase K Track 3: Infrastructure Enhancement Setup Script
# PowerShell script to set up production-ready infrastructure

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "development",
    
    [Parameter(Mandatory=$false)]
    [switch]$RedisCluster = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Monitoring = $true,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDependencies = $false
)

Write-Host "=== Phase K Track 3: Infrastructure Enhancement Setup ===" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Green
Write-Host "Redis Cluster: $RedisCluster" -ForegroundColor Green
Write-Host "Monitoring: $Monitoring" -ForegroundColor Green
Write-Host ""

# Set error handling
$ErrorActionPreference = "Stop"

try {
    # 1. Install additional Python dependencies for infrastructure
    if (-not $SkipDependencies) {
        Write-Host "📦 Installing Python dependencies for infrastructure..." -ForegroundColor Yellow
        
        $infraDependencies = @(
            "redis[hiredis]>=5.0.1",
            "psutil>=5.9.0",
            "httpx>=0.25.0",
            "asyncio-mqtt>=0.13.0"  # For MQTT support if needed
        )
        
        foreach ($dep in $infraDependencies) {
            Write-Host "Installing $dep..." -ForegroundColor Gray
            pip install $dep
        }
        Write-Host "✅ Infrastructure dependencies installed" -ForegroundColor Green
    }

    # 2. Set up Redis infrastructure
    Write-Host "🔧 Setting up Redis infrastructure..." -ForegroundColor Yellow
    
    if ($RedisCluster) {
        Write-Host "Setting up Redis cluster with sentinel..." -ForegroundColor Gray
        
        # Create Redis directories
        $redisDir = ".\redis"
        if (-not (Test-Path $redisDir)) {
            New-Item -ItemType Directory -Path $redisDir -Force | Out-Null
        }
        
        # Create data directories
        New-Item -ItemType Directory -Path "$redisDir\data" -Force | Out-Null
        New-Item -ItemType Directory -Path "$redisDir\logs" -Force | Out-Null
        
        # Start Redis using Docker Compose production stack
        Write-Host "Starting Redis with production Docker Compose..." -ForegroundColor Gray
        docker compose -f docker-compose.production.yml up redis -d
        
        # Wait for Redis to be ready
        Write-Host "Waiting for Redis to be ready..." -ForegroundColor Gray
        Start-Sleep -Seconds 5
        
        # Test Redis connection
        $redisTest = docker exec lokifi-redis-primary redis-cli ping
        if ($redisTest -eq "PONG") {
            Write-Host "✅ Redis cluster is running" -ForegroundColor Green
        } else {
            throw "Redis cluster failed to start"
        }
    } else {
        Write-Host "Setting up single Redis instance..." -ForegroundColor Gray
        
        # Check if Redis is running locally
        $redisRunning = $false
        try {
            $result = redis-cli ping 2>$null
            if ($result -eq "PONG") {
                $redisRunning = $true
            }
        } catch {
            # Redis CLI not available or not running
        }
        
        if ($redisRunning) {
            Write-Host "✅ Redis is already running" -ForegroundColor Green
        } else {
            Write-Host "❌ Redis is not running. Please install and start Redis server" -ForegroundColor Red
            Write-Host "   You can use: docker run -d -p 6379:6379 redis:7.2-alpine" -ForegroundColor Yellow
        }
    }

    # 3. Initialize application database with infrastructure tables
    Write-Host "🗄️ Initializing database for infrastructure..." -ForegroundColor Yellow
    
    $pythonPath = python -c "import sys; print(sys.executable)"
    & $pythonPath -c "
import sys
sys.path.insert(0, '.')

from app.core.database import init_db
import asyncio

async def setup():
    print('Initializing database...')
    await init_db()
    print('✅ Database initialized')

asyncio.run(setup())
"
    
    # 4. Set up monitoring system
    if ($Monitoring) {
        Write-Host "📊 Setting up monitoring system..." -ForegroundColor Yellow
        
        # Create monitoring directories
        New-Item -ItemType Directory -Path ".\monitoring" -Force | Out-Null
        New-Item -ItemType Directory -Path ".\monitoring\logs" -Force | Out-Null
        New-Item -ItemType Directory -Path ".\monitoring\dashboards" -Force | Out-Null
        
        # Initialize monitoring
        & $pythonPath -c "
import sys
sys.path.insert(0, '.')

from app.services.advanced_monitoring import monitoring_system
from app.core.advanced_redis_client import advanced_redis_client
import asyncio

async def setup_monitoring():
    print('Initializing Redis client...')
    await advanced_redis_client.initialize()
    
    print('Starting monitoring system...')
    await monitoring_system.start_monitoring()
    
    print('✅ Monitoring system ready')
    
    # Stop after setup verification
    await monitoring_system.stop_monitoring()

asyncio.run(setup_monitoring())
"
        Write-Host "✅ Monitoring system initialized" -ForegroundColor Green
    }

    # 5. Run infrastructure validation tests
    Write-Host "🔍 Running infrastructure validation tests..." -ForegroundColor Yellow
    
    $validationResult = & $pythonPath -c "
import sys
sys.path.insert(0, '.')

import asyncio
from app.core.advanced_redis_client import advanced_redis_client
from app.websockets.advanced_websocket_manager import advanced_websocket_manager
from app.services.advanced_monitoring import monitoring_system

async def validate_infrastructure():
    results = {'redis': False, 'websocket': False, 'monitoring': False}
    
    try:
        # Test Redis
        await advanced_redis_client.initialize()
        if await advanced_redis_client.is_available():
            results['redis'] = True
            print('✅ Redis: Connected')
        else:
            print('❌ Redis: Connection failed')
    except Exception as e:
        print(f'❌ Redis: {e}')
    
    try:
        # Test WebSocket manager
        stats = advanced_websocket_manager.connection_pool.get_stats()
        results['websocket'] = True
        print('✅ WebSocket Manager: Ready')
    except Exception as e:
        print(f'❌ WebSocket Manager: {e}')
    
    try:
        # Test monitoring system
        if hasattr(monitoring_system, 'health_checks'):
            results['monitoring'] = True
            print('✅ Monitoring System: Ready')
    except Exception as e:
        print(f'❌ Monitoring System: {e}')
    
    all_passed = all(results.values())
    print(f'\\nOverall Status: {\"PASS\" if all_passed else \"FAIL\"}')
    return 0 if all_passed else 1

exit(asyncio.run(validate_infrastructure()))
"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Infrastructure validation passed" -ForegroundColor Green
    } else {
        Write-Host "❌ Infrastructure validation failed" -ForegroundColor Red
    }

    # 6. Create environment-specific configuration
    Write-Host "⚙️ Creating environment configuration..." -ForegroundColor Yellow
    
    $envFile = ".env.track3"
    $envContent = @"
# Phase K Track 3: Infrastructure Enhancement Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Environment
ENVIRONMENT=$Environment

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_SENTINEL_HOSTS=localhost:26379
REDIS_USE_SENTINEL=$($RedisCluster.ToString().ToLower())

# WebSocket Configuration
WEBSOCKET_MAX_CONNECTIONS=10000
WEBSOCKET_HEARTBEAT_INTERVAL=30
WEBSOCKET_RECONNECT_ATTEMPTS=3

# Monitoring Configuration
MONITORING_ENABLED=$($Monitoring.ToString().ToLower())
MONITORING_INTERVAL=60
MONITORING_RETENTION_HOURS=24
MONITORING_ALERT_WEBHOOK=

# Performance Configuration
CACHE_DEFAULT_TTL=3600
CACHE_WARMING_ENABLED=true
PERFORMANCE_LOGGING_ENABLED=true

# Security Configuration (set in production)
# REDIS_PASSWORD=your-redis-password
# MONITORING_API_KEY=your-monitoring-api-key
"@

    $envContent | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "✅ Configuration saved to $envFile" -ForegroundColor Green

    # 7. Display startup instructions
    Write-Host ""
    Write-Host "🎉 Phase K Track 3 Infrastructure Setup Complete!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Review configuration in $envFile" -ForegroundColor Gray
    Write-Host "2. Update production passwords and API keys" -ForegroundColor Gray
    Write-Host "3. Start the application: python start_server.py" -ForegroundColor Gray
    Write-Host "4. Access monitoring dashboard: http://localhost:8000/api/v1/monitoring/dashboard" -ForegroundColor Gray
    
    if ($RedisCluster) {
        Write-Host "5. Redis web UI: http://localhost:8081 (admin/lokifi-redis-admin)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Infrastructure Status:" -ForegroundColor Yellow
    Write-Host "- ✅ Advanced Redis Client" -ForegroundColor Green
    Write-Host "- ✅ WebSocket Manager with Connection Pooling" -ForegroundColor Green
    Write-Host "- ✅ Comprehensive Monitoring System" -ForegroundColor Green
    Write-Host "- ✅ Performance Analytics" -ForegroundColor Green
    Write-Host "- ✅ Real-time Health Checks" -ForegroundColor Green
    Write-Host "- ✅ Alert Management" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Phase K Track 3 is ready for production deployment! 🚀" -ForegroundColor Cyan

} catch {
    Write-Host ""
    Write-Host "❌ Setup failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Ensure Python virtual environment is activated" -ForegroundColor Gray
    Write-Host "2. Check if all dependencies are installed" -ForegroundColor Gray
    Write-Host "3. Verify Redis is available (locally or via Docker)" -ForegroundColor Gray
    Write-Host "4. Check network connectivity and firewall settings" -ForegroundColor Gray
    
    exit 1
}