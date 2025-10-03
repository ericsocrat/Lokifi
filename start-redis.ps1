# Start Redis (run this before backend if Redis isn't running)
$wslIp = (wsl hostname -I).Trim().Split()[0]
Write-Host "🔴 Starting Redis..." -ForegroundColor Yellow

# Check if already running
$status = wsl sudo systemctl is-active redis-server 2>$null
if ($status -eq "active") {
    Write-Host "✅ Redis is already running" -ForegroundColor Green
} else {
    wsl sudo systemctl start redis-server
    Start-Sleep -Seconds 2
}

# Test connection
$ping = wsl redis-cli -h $wslIp ping 2>$null
if ($ping -eq "PONG") {
    Write-Host "✅ Redis is running at $wslIp:6379`n" -ForegroundColor Green

    # Update .env if IP changed
    $envPath = "backend\.env"
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath -Raw
        if ($envContent -notmatch "REDIS_HOST=$wslIp") {
            $envContent = $envContent -replace 'REDIS_URL=redis://[^:]+:', "REDIS_URL=redis://${wslIp}:"
            $envContent = $envContent -replace 'REDIS_HOST=.*', "REDIS_HOST=$wslIp"
            $envContent | Set-Content $envPath -NoNewline
            Write-Host "📝 Updated backend/.env with new IP: $wslIp`n" -ForegroundColor Cyan
        }
    }
} else {
    Write-Host "❌ Redis is not responding" -ForegroundColor Red
    Write-Host "Try: wsl sudo systemctl status redis-server`n" -ForegroundColor Yellow
}
