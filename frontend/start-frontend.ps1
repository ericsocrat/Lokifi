# Lokifi Frontend Startup Script
# Starts the Next.js frontend development server

Write-Host "🎨 Starting Lokifi Frontend Server..." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

# Navigate to frontend directory
Set-Location $PSScriptRoot

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "🌟 Starting Frontend Development Server..." -ForegroundColor Yellow
Write-Host "🌐 Local: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📱 Network: http://$(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*','Ethernet*' | Select-Object -First 1 -ExpandProperty IPAddress):3000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start the development server
npm run dev
