# Install Redis in WSL2 for Windows Development
# This script installs and configures Redis in WSL2 to work with Windows applications

Write-Host "🔴 Installing Redis in WSL2" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if WSL is available
Write-Host "Checking WSL status..." -ForegroundColor Yellow
try {
    $wslStatus = wsl --status 2>&1
    Write-Host "✅ WSL is available`n" -ForegroundColor Green
} catch {
    Write-Host "❌ WSL is not installed!" -ForegroundColor Red
    Write-Host "Please install WSL2 first: wsl --install" -ForegroundColor Yellow
    exit 1
}

# Install Redis in WSL
Write-Host "Installing Redis in WSL..." -ForegroundColor Yellow
Write-Host "(This may take a few minutes on first run)`n" -ForegroundColor Gray

# Install Redis
Write-Host "📦 Updating package lists..." -ForegroundColor Gray
wsl sudo apt-get update -qq

Write-Host "📦 Installing Redis..." -ForegroundColor Gray
wsl sudo apt-get install -y redis-server redis-tools

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Installation failed!" -ForegroundColor Red
    exit 1
}

# Configure Redis for Windows access
Write-Host "🔧 Configuring Redis for Windows access..." -ForegroundColor Gray

# Backup original config
wsl sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup 2>$null

# Configure to listen on all interfaces
wsl sudo sed -i 's/^bind 127.0.0.1 ::1/bind 0.0.0.0/' /etc/redis/redis.conf
wsl sudo sed -i 's/^protected-mode yes/protected-mode no/' /etc/redis/redis.conf

# Enable persistence
wsl sudo sed -i 's/^appendonly no/appendonly yes/' /etc/redis/redis.conf

# Set memory limit
wsl bash -c "echo 'maxmemory 256mb' | sudo tee -a /etc/redis/redis.conf > /dev/null"
wsl bash -c "echo 'maxmemory-policy allkeys-lru' | sudo tee -a /etc/redis/redis.conf > /dev/null"

Write-Host "✅ Redis configured!" -ForegroundColor Green

# Check version
$version = wsl redis-server --version
Write-Host "Installed: $version`n" -ForegroundColor Cyan

Write-Host "`n✅ Redis installed successfully!`n" -ForegroundColor Green

# Get WSL IP address
Write-Host "Getting WSL IP address..." -ForegroundColor Yellow
$wslIp = (wsl hostname -I).Trim().Split()[0]
Write-Host "WSL IP: $wslIp`n" -ForegroundColor Cyan

# Create .env update instructions
Write-Host "📝 Configuration Steps:" -ForegroundColor Cyan
Write-Host "==============================`n" -ForegroundColor Cyan

Write-Host "1. Update backend/.env file:" -ForegroundColor Yellow
Write-Host "   REDIS_URL=redis://${wslIp}:6379/0" -ForegroundColor White
Write-Host "   REDIS_HOST=${wslIp}" -ForegroundColor White
Write-Host "   REDIS_PORT=6379`n" -ForegroundColor White

Write-Host "2. Configure VS Code Redis Extension:" -ForegroundColor Yellow
Write-Host "   - Press Ctrl+Shift+P" -ForegroundColor White
Write-Host "   - Type 'Redis: Add Connection'" -ForegroundColor White
Write-Host "   - Host: ${wslIp}" -ForegroundColor White
Write-Host "   - Port: 6379`n" -ForegroundColor White

# Offer to update .env automatically
Write-Host "Would you like to update backend/.env automatically? (Y/N): " -ForegroundColor Yellow -NoNewline
$response = Read-Host

if ($response -eq 'Y' -or $response -eq 'y') {
    $envPath = "backend\.env"
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath -Raw

        # Update Redis URL
        if ($envContent -match 'REDIS_URL=') {
            $envContent = $envContent -replace 'REDIS_URL=.*', "REDIS_URL=redis://${wslIp}:6379/0"
        } else {
            $envContent += "`nREDIS_URL=redis://${wslIp}:6379/0"
        }

        # Update Redis Host
        if ($envContent -match 'REDIS_HOST=') {
            $envContent = $envContent -replace 'REDIS_HOST=.*', "REDIS_HOST=${wslIp}"
        } else {
            $envContent += "`nREDIS_HOST=${wslIp}"
        }

        # Update Redis Port
        if ($envContent -notmatch 'REDIS_PORT=') {
            $envContent += "`nREDIS_PORT=6379"
        }

        $envContent | Set-Content $envPath -NoNewline
        Write-Host "✅ backend/.env updated!`n" -ForegroundColor Green
    } else {
        Write-Host "⚠️  backend/.env not found. Please create it manually.`n" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Setup Complete!`n" -ForegroundColor Green
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Run: .\start-redis-wsl.ps1 (to start Redis)" -ForegroundColor White
Write-Host "2. Start your backend server" -ForegroundColor White
Write-Host "3. Redis will be available at ${wslIp}:6379`n" -ForegroundColor White

Write-Host "Note: WSL IP may change after reboot." -ForegroundColor Yellow
Write-Host "If connection fails, run: .\start-redis-wsl.ps1 --update-env`n" -ForegroundColor Yellow
