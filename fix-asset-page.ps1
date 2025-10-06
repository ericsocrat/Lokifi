# 🔧 Fix Asset Detail Page - Automated Script
# This script replaces the corrupted page.tsx with the working page_backend.tsx

Write-Host "🔧 Fixing Asset Detail Page..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

$assetDir = "c:\Users\USER\Desktop\lokifi\frontend\app\asset\[symbol]"
$backendFile = Join-Path $assetDir "page_backend.tsx"
$targetFile = Join-Path $assetDir "page.tsx"
$backupFile = Join-Path $assetDir "page_corrupted_backup.tsx"

# Check if backend file exists
if (-not (Test-Path $backendFile)) {
    Write-Host "❌ ERROR: page_backend.tsx not found!" -ForegroundColor Red
    Write-Host "   Expected: $backendFile" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found working backend file" -ForegroundColor Green

# Backup corrupted file
if (Test-Path $targetFile) {
    Write-Host "📦 Backing up corrupted page.tsx..." -ForegroundColor Yellow
    Copy-Item $targetFile $backupFile -Force
    Write-Host "   Saved to: page_corrupted_backup.tsx" -ForegroundColor Gray
}

# Remove corrupted file
Write-Host "🗑️  Removing corrupted file..." -ForegroundColor Yellow
Remove-Item $targetFile -Force -ErrorAction SilentlyContinue

# Copy working file
Write-Host "📋 Copying working file..." -ForegroundColor Yellow
Copy-Item $backendFile $targetFile -Force

# Verify
if (Test-Path $targetFile) {
    $lines = (Get-Content $targetFile).Count
    Write-Host ""
    Write-Host "✅ SUCCESS! Asset Detail Page Fixed!" -ForegroundColor Green
    Write-Host "   File: $targetFile" -ForegroundColor White
    Write-Host "   Lines: $lines" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 Asset detail page now uses real backend data:" -ForegroundColor Cyan
    Write-Host "   ✅ Real crypto prices from CoinGecko" -ForegroundColor Green
    Write-Host "   ✅ Historical price charts" -ForegroundColor Green
    Write-Host "   ✅ WebSocket live updates" -ForegroundColor Green
    Write-Host "   ✅ Market statistics" -ForegroundColor Green
    Write-Host ""
    Write-Host "🧪 Test by visiting:" -ForegroundColor Yellow
    Write-Host "   http://localhost:3000/asset/BTC" -ForegroundColor White
    Write-Host "   http://localhost:3000/asset/ETH" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ ERROR: File copy failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
