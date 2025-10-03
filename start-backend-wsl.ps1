# Start Backend in WSL (with Redis access)
Write-Host "🚀 Starting Lokifi Backend in WSL" -ForegroundColor Cyan
Write-Host "===================================`n" -ForegroundColor Cyan

# Ensure Redis is running
Write-Host "1️⃣ Checking Redis..." -ForegroundColor Yellow
wsl sudo systemctl start redis-server 2>$null
$redisPing = wsl redis-cli ping 2>$null
if ($redisPing -eq "PONG") {
    Write-Host "   ✅ Redis is running`n" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Redis not responding, trying to start...`n" -ForegroundColor Yellow
    wsl sudo systemctl restart redis-server
    Start-Sleep -Seconds 2
}

# Check Python in WSL
Write-Host "2️⃣ Checking Python in WSL..." -ForegroundColor Yellow
$pythonVersion = wsl python3 --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ $pythonVersion`n" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Python3 not found in WSL, installing...`n" -ForegroundColor Yellow
    wsl sudo apt-get install -y python3 python3-pip
}

# Start backend
Write-Host "3️⃣ Starting Backend Server..." -ForegroundColor Yellow
Write-Host "   Backend will be at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "   API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop`n" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

wsl bash -c @"
cd /mnt/c/Users/USER/Desktop/lokifi/backend
export PYTHONPATH=/mnt/c/Users/USER/Desktop/lokifi/backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"@
