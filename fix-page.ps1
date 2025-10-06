# Fix Asset Detail Page Script
Write-Host "Fixing Asset Detail Page..." -ForegroundColor Cyan

$backendFile = "c:\Users\USER\Desktop\lokifi\frontend\app\asset\[symbol]\page_backend.tsx"
$targetFile = "c:\Users\USER\Desktop\lokifi\frontend\app\asset\[symbol]\page.tsx"

if (Test-Path $backendFile) {
    Write-Host "Found backend file" -ForegroundColor Green
    Remove-Item $targetFile -Force -ErrorAction SilentlyContinue
    Copy-Item $backendFile $targetFile -Force
    Write-Host "SUCCESS! Asset page fixed!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Backend file not found" -ForegroundColor Red
}
