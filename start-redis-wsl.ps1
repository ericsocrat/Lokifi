# Start Redis in WSL2 and manage connection
# Run this script whenever you need Redis running

param(
    [switch]$UpdateEnv,
    [switch]$Stop,
    [switch]$Status,
    [switch]$Logs
)

Write-Host "🔴 Redis Manager (WSL2)" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if WSL is available
try {
    $wslTest = wsl echo "test" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "WSL not responding"
    }
} catch {
    Write-Host "❌ WSL is not available!" -ForegroundColor Red
    Write-Host "Please ensure WSL2 is installed and running.`n" -ForegroundColor Yellow
    exit 1
}

# Get WSL IP
$wslIp = (wsl hostname -I).Trim().Split()[0]
Write-Host "WSL IP Address: $wslIp`n" -ForegroundColor Cyan

# Handle different operations
if ($Stop) {
    Write-Host "Stopping Redis..." -ForegroundColor Yellow
    wsl sudo service redis-server stop
    Write-Host "✅ Redis stopped`n" -ForegroundColor Green
    exit 0
}

if ($Status) {
    Write-Host "Checking Redis status..." -ForegroundColor Yellow
    wsl sudo service redis-server status

    Write-Host "`nTesting connection from Windows..." -ForegroundColor Yellow
    $testScript = @"
import redis
import sys
try:
    r = redis.from_url('redis://${wslIp}:6379/0', socket_connect_timeout=2)
    if r.ping():
        print('✅ Connection successful!')
        sys.exit(0)
except Exception as e:
    print(f'❌ Connection failed: {e}')
    sys.exit(1)
"@

    $testScript | python -
    Write-Host ""
    exit 0
}

if ($Logs) {
    Write-Host "Showing Redis logs (Ctrl+C to exit)..." -ForegroundColor Yellow
    Write-Host ""
    wsl sudo tail -f /var/log/redis/redis-server.log
    exit 0
}

# Check if Redis is installed
Write-Host "Checking Redis installation..." -ForegroundColor Yellow
$redisInstalled = wsl which redis-server 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Redis is not installed in WSL!" -ForegroundColor Red
    Write-Host "Run: .\install-redis-wsl.ps1 first`n" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Redis is installed`n" -ForegroundColor Green

# Start Redis
Write-Host "Starting Redis..." -ForegroundColor Yellow
wsl sudo service redis-server start

Start-Sleep -Seconds 2

# Check if started successfully
$redisStatus = wsl sudo service redis-server status 2>&1
if ($redisStatus -match "is running") {
    Write-Host "✅ Redis is running`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  Redis may not have started correctly" -ForegroundColor Yellow
    Write-Host "Status: $redisStatus`n" -ForegroundColor Gray
}

# Test connection
Write-Host "Testing connection..." -ForegroundColor Yellow
$pingResult = wsl redis-cli -h $wslIp ping 2>&1
if ($pingResult -match "PONG") {
    Write-Host "✅ Redis responding: $pingResult`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  Connection test failed" -ForegroundColor Yellow
    Write-Host "Result: $pingResult`n" -ForegroundColor Gray
}

# Update .env if requested or if IP changed
if ($UpdateEnv -or $true) {
    $envPath = "backend\.env"
    if (Test-Path $envPath) {
        $currentEnv = Get-Content $envPath -Raw
        $currentRedisUrl = if ($currentEnv -match 'REDIS_URL=redis://([^:]+):') { $matches[1] } else { $null }

        if ($currentRedisUrl -ne $wslIp) {
            Write-Host "Updating backend/.env with new WSL IP..." -ForegroundColor Yellow

            $envContent = $currentEnv
            $envContent = $envContent -replace 'REDIS_URL=redis://[^:]+:', "REDIS_URL=redis://${wslIp}:"
            $envContent = $envContent -replace 'REDIS_HOST=.*', "REDIS_HOST=${wslIp}"

            $envContent | Set-Content $envPath -NoNewline
            Write-Host "✅ backend/.env updated with IP: $wslIp`n" -ForegroundColor Green
        }
    }
}

# Show connection info
Write-Host "📊 Connection Information:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Host:     $wslIp" -ForegroundColor White
Write-Host "Port:     6379" -ForegroundColor White
Write-Host "URL:      redis://${wslIp}:6379/0" -ForegroundColor White

# Test from Python
Write-Host "`n🐍 Testing from Python..." -ForegroundColor Cyan
$testScript = @"
import redis
try:
    r = redis.from_url('redis://${wslIp}:6379/0', socket_connect_timeout=2)
    if r.ping():
        print('✅ Python can connect to Redis')
        print(f'   Server info: Redis {r.info()["redis_version"]}')
        print(f'   Memory used: {r.info()["used_memory_human"]}')
except Exception as e:
    print(f'❌ Python connection failed: {e}')
    print('   Make sure backend dependencies are installed')
"@

$testScript | python - 2>&1

Write-Host "`n📝 Useful Commands:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Start:    .\start-redis-wsl.ps1" -ForegroundColor White
Write-Host "Stop:     .\start-redis-wsl.ps1 -Stop" -ForegroundColor White
Write-Host "Status:   .\start-redis-wsl.ps1 -Status" -ForegroundColor White
Write-Host "Logs:     .\start-redis-wsl.ps1 -Logs" -ForegroundColor White
Write-Host "CLI:      wsl redis-cli -h $wslIp" -ForegroundColor White

Write-Host "`n🎯 VS Code Redis Extension:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "1. Press Ctrl+Shift+P" -ForegroundColor White
Write-Host "2. Type 'Redis: Add Connection'" -ForegroundColor White
Write-Host "3. Enter host: $wslIp" -ForegroundColor White
Write-Host "4. Enter port: 6379`n" -ForegroundColor White

Write-Host "✅ Redis is ready!`n" -ForegroundColor Green
