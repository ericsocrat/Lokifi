# One-Command Redis Setup for WSL
# This installs and starts Redis automatically (will prompt for sudo password once)

Write-Host "🔴 One-Command Redis Setup" -ForegroundColor Cyan
Write-Host "===========================`n" -ForegroundColor Cyan

Write-Host "This will install Redis in WSL and configure it for Windows." -ForegroundColor Yellow
Write-Host "You'll be prompted for your WSL sudo password once.`n" -ForegroundColor Yellow
Write-Host "Press Enter to continue or Ctrl+C to cancel..." -ForegroundColor Gray
Read-Host

# Combined installation and configuration command
Write-Host "Installing and configuring Redis..." -ForegroundColor Yellow
Write-Host "(This may take 1-2 minutes)`n" -ForegroundColor Gray

# Check if already installed
$isInstalled = wsl which redis-server 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Redis is already installed`n" -ForegroundColor Green
} else {
    # Install Redis
    wsl bash -c "sudo apt-get update -qq && sudo apt-get install -y redis-server redis-tools"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Installation failed!`n" -ForegroundColor Red
        Write-Host "Please make sure:" -ForegroundColor Yellow
        Write-Host "1. WSL is working: wsl echo test" -ForegroundColor White
        Write-Host "2. You entered the correct sudo password`n" -ForegroundColor White
        exit 1
    }
    Write-Host "✅ Redis installed`n" -ForegroundColor Green
}

# Configure Redis
Write-Host "Configuring Redis..." -ForegroundColor Yellow
wsl bash -c "sudo sed -i 's/^bind 127.0.0.1 ::1/bind 0.0.0.0/' /etc/redis/redis.conf 2>/dev/null || sudo sed -i 's/^bind 127.0.0.1/bind 0.0.0.0/' /etc/redis/redis.conf"
wsl bash -c "sudo sed -i 's/^protected-mode yes/protected-mode no/' /etc/redis/redis.conf"
Write-Host "✅ Redis configured`n" -ForegroundColor Green

# Start Redis
Write-Host "Starting Redis..." -ForegroundColor Yellow
wsl sudo service redis-server start
Start-Sleep -Seconds 2

# Get WSL IP
$wslIp = (wsl hostname -I).Trim().Split()[0]
Write-Host "✅ WSL IP: $wslIp`n" -ForegroundColor Cyan

# Test connection
Write-Host "Testing connection..." -ForegroundColor Yellow
$pingResult = wsl redis-cli -h $wslIp ping 2>$null
if ($pingResult -eq "PONG") {
    Write-Host "✅ Redis is working!`n" -ForegroundColor Green
} else {
    Write-Host "⚠️ Connection test failed, retrying...`n" -ForegroundColor Yellow
    wsl sudo service redis-server restart
    Start-Sleep -Seconds 3
    $pingResult = wsl redis-cli -h $wslIp ping 2>$null
    if ($pingResult -eq "PONG") {
        Write-Host "✅ Redis is now working!`n" -ForegroundColor Green
    } else {
        Write-Host "❌ Still having issues. Check WSL Redis status:`n" -ForegroundColor Red
        wsl sudo service redis-server status
        exit 1
    }
}

# Update backend/.env
Write-Host "Updating backend/.env..." -ForegroundColor Yellow
$envPath = "backend\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw

    # Update Redis URL
    if ($envContent -match 'REDIS_URL=') {
        $envContent = $envContent -replace 'REDIS_URL=redis://[^:]+:([0-9]+)(/[0-9]+)?', "REDIS_URL=redis://${wslIp}:`$1`$2"
    } else {
        $envContent += "`nREDIS_URL=redis://${wslIp}:6379/0"
    }

    # Update Redis Host
    if ($envContent -match 'REDIS_HOST=') {
        $envContent = $envContent -replace 'REDIS_HOST=.*', "REDIS_HOST=${wslIp}"
    } else {
        $envContent += "`nREDIS_HOST=${wslIp}"
    }

    $envContent | Set-Content $envPath -NoNewline
    Write-Host "✅ backend/.env updated`n" -ForegroundColor Green
} else {
    Write-Host "⚠️ backend/.env not found`n" -ForegroundColor Yellow
}

# Create start-redis.ps1
Write-Host "Creating start-redis.ps1..." -ForegroundColor Yellow
$startScript = @"
# Start Redis (run this before backend)
`$wslIp = (wsl hostname -I).Trim().Split()[0]
Write-Host "Starting Redis at `$wslIp..." -ForegroundColor Yellow
wsl sudo service redis-server start 2>`$null
Start-Sleep -Seconds 1
`$ping = wsl redis-cli -h `$wslIp ping 2>`$null
if (`$ping -eq "PONG") {
    Write-Host "✅ Redis is running at `$wslIp:6379`n" -ForegroundColor Green

    # Update .env if IP changed
    `$envPath = "backend\.env"
    if (Test-Path `$envPath) {
        `$envContent = Get-Content `$envPath -Raw
        if (`$envContent -notmatch "REDIS_HOST=`$wslIp") {
            `$envContent = `$envContent -replace 'REDIS_URL=redis://[^:]+:', "REDIS_URL=redis://`${wslIp}:"
            `$envContent = `$envContent -replace 'REDIS_HOST=.*', "REDIS_HOST=`$wslIp"
            `$envContent | Set-Content `$envPath -NoNewline
            Write-Host "📝 Updated backend/.env with new IP`n" -ForegroundColor Cyan
        }
    }
} else {
    Write-Host "❌ Redis is not responding`n" -ForegroundColor Red
    Write-Host "Try: wsl sudo service redis-server status`n" -ForegroundColor Yellow
}
"@
$startScript | Set-Content "start-redis.ps1"
Write-Host "✅ Created start-redis.ps1`n" -ForegroundColor Green

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

Write-Host "📊 Connection Info:" -ForegroundColor Cyan
Write-Host "  URL:  redis://${wslIp}:6379/0" -ForegroundColor White
Write-Host "  Host: $wslIp" -ForegroundColor White
Write-Host "  Port: 6379`n" -ForegroundColor White

Write-Host "🎯 VS Code Redis Extension:" -ForegroundColor Cyan
Write-Host "  Press Ctrl+Shift+P → 'Redis: Add Connection'" -ForegroundColor White
Write-Host "  Host: $wslIp | Port: 6379`n" -ForegroundColor White

Write-Host "📝 Daily Usage:" -ForegroundColor Cyan
Write-Host "  1. Run: .\start-redis.ps1" -ForegroundColor White
Write-Host "  2. Start backend: cd backend && python -m uvicorn app.main:app --reload" -ForegroundColor White
Write-Host "  3. Look for: '✅ Redis initialized' in logs`n" -ForegroundColor White

Write-Host "🧪 Test Now:" -ForegroundColor Cyan
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  python -c `"import redis; r = redis.from_url('redis://${wslIp}:6379'); print('✅ Works!' if r.ping() else '❌ Failed')`"`n" -ForegroundColor White

Write-Host "⚠️ Note: WSL IP may change after reboot." -ForegroundColor Yellow
Write-Host "   If Redis stops working, run: .\start-redis.ps1 (it auto-updates the IP)`n" -ForegroundColor Yellow

Write-Host "🚀 Ready to start backend!" -ForegroundColor Green
