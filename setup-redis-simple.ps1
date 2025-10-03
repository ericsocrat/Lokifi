# Simple Redis Setup via WSL
# This script helps you set up Redis in WSL without needing sudo in scripts

Write-Host "🔴 Redis via WSL2 - Manual Setup Helper" -ForegroundColor Cyan
Write-Host "==========================================`n" -ForegroundColor Cyan

Write-Host "📋 Step 1: Install Redis in WSL" -ForegroundColor Yellow
Write-Host "Copy and paste these commands in WSL terminal:`n" -ForegroundColor Gray
Write-Host "sudo apt-get update" -ForegroundColor White
Write-Host "sudo apt-get install -y redis-server redis-tools" -ForegroundColor White
Write-Host "`nPress Enter after you've done this..." -ForegroundColor Yellow
Read-Host

Write-Host "`n📋 Step 2: Configure Redis" -ForegroundColor Yellow
Write-Host "Copy and paste these commands in WSL terminal:`n" -ForegroundColor Gray
Write-Host "sudo sed -i 's/^bind 127.0.0.1 ::1/bind 0.0.0.0/' /etc/redis/redis.conf" -ForegroundColor White
Write-Host "sudo sed -i 's/^protected-mode yes/protected-mode no/' /etc/redis/redis.conf" -ForegroundColor White
Write-Host "sudo service redis-server start" -ForegroundColor White
Write-Host "`nPress Enter after you've done this..." -ForegroundColor Yellow
Read-Host

Write-Host "`n📋 Step 3: Get WSL IP Address" -ForegroundColor Yellow
$wslIp = (wsl hostname -I).Trim().Split()[0]
Write-Host "Your WSL IP: $wslIp`n" -ForegroundColor Cyan

Write-Host "📋 Step 4: Test Connection" -ForegroundColor Yellow
Write-Host "Testing Redis connection..." -ForegroundColor Gray
$pingResult = wsl redis-cli -h $wslIp ping 2>$null
if ($pingResult -eq "PONG") {
    Write-Host "✅ Redis is working!`n" -ForegroundColor Green
} else {
    Write-Host "❌ Connection failed. Make sure you completed Step 2.`n" -ForegroundColor Red
    Write-Host "Try running in WSL: sudo service redis-server status`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Step 5: Update backend/.env" -ForegroundColor Yellow
$envPath = "backend\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw

    # Update Redis configuration
    $envContent = $envContent -replace 'REDIS_URL=redis://[^:]+:([0-9]+)', "REDIS_URL=redis://${wslIp}:`$1"
    $envContent = $envContent -replace 'REDIS_HOST=.*', "REDIS_HOST=${wslIp}"

    $envContent | Set-Content $envPath -NoNewline
    Write-Host "✅ Updated backend/.env with IP: $wslIp`n" -ForegroundColor Green
} else {
    Write-Host "⚠️ backend/.env not found. Please create it with:`n" -ForegroundColor Yellow
    Write-Host "REDIS_URL=redis://${wslIp}:6379/0" -ForegroundColor White
    Write-Host "REDIS_HOST=${wslIp}" -ForegroundColor White
    Write-Host "REDIS_PORT=6379`n" -ForegroundColor White
}

Write-Host "✅ Setup Complete!`n" -ForegroundColor Green
Write-Host "📊 Connection Info:" -ForegroundColor Cyan
Write-Host "  Host: $wslIp" -ForegroundColor White
Write-Host "  Port: 6379" -ForegroundColor White
Write-Host "  URL:  redis://${wslIp}:6379/0`n" -ForegroundColor White

Write-Host "🎯 VS Code Redis Extension Setup:" -ForegroundColor Cyan
Write-Host "  1. Press Ctrl+Shift+P" -ForegroundColor White
Write-Host "  2. Type 'Redis: Add Connection'" -ForegroundColor White
Write-Host "  3. Host: $wslIp" -ForegroundColor White
Write-Host "  4. Port: 6379`n" -ForegroundColor White

Write-Host "📝 Daily Usage:" -ForegroundColor Cyan
Write-Host "  Before starting backend, ensure Redis is running:" -ForegroundColor White
Write-Host "  wsl sudo service redis-server start`n" -ForegroundColor White

Write-Host "⚠️ Note: WSL IP may change after reboot!" -ForegroundColor Yellow
Write-Host "If connection fails, re-run this script to update the IP.`n" -ForegroundColor Yellow

# Create daily startup script
$startupScript = @"
# Quick Redis Start
`$wslIp = (wsl hostname -I).Trim().Split()[0]
Write-Host "Starting Redis in WSL..." -ForegroundColor Yellow
wsl sudo service redis-server start
Start-Sleep -Seconds 1
`$ping = wsl redis-cli -h `$wslIp ping 2>`$null
if (`$ping -eq "PONG") {
    Write-Host "✅ Redis running at `$wslIp:6379`n" -ForegroundColor Green
} else {
    Write-Host "❌ Redis failed to start`n" -ForegroundColor Red
}
"@

$startupScript | Set-Content "start-redis.ps1"
Write-Host "Created start-redis.ps1 for daily use!" -ForegroundColor Green
Write-Host "Run .\start-redis.ps1 before starting your backend.`n" -ForegroundColor Cyan
