# Reset WSL Password Guide

Write-Host "🔧 WSL Password Reset Helper" -ForegroundColor Cyan
Write-Host "============================`n" -ForegroundColor Cyan

Write-Host "Follow these steps to reset your WSL password:`n" -ForegroundColor Yellow

Write-Host "STEP 1: Get your WSL username" -ForegroundColor Cyan
Write-Host "-------" -ForegroundColor Gray
Write-Host "Run this command:" -ForegroundColor Yellow
Write-Host "  wsl whoami`n" -ForegroundColor White

$username = wsl whoami
Write-Host "Your username is: $username`n" -ForegroundColor Green

Write-Host "STEP 2: Boot WSL as root (no password needed)" -ForegroundColor Cyan
Write-Host "-------" -ForegroundColor Gray
Write-Host "Run this command to open WSL as root:`n" -ForegroundColor Yellow
Write-Host "  wsl -u root`n" -ForegroundColor White

Write-Host "STEP 3: Reset your password" -ForegroundColor Cyan
Write-Host "-------" -ForegroundColor Gray
Write-Host "In the WSL terminal that opens, run:`n" -ForegroundColor Yellow
Write-Host "  passwd $username`n" -ForegroundColor White
Write-Host "Then enter your NEW password twice (typing won't show on screen, that's normal)`n" -ForegroundColor Gray

Write-Host "STEP 4: Exit and test" -ForegroundColor Cyan
Write-Host "-------" -ForegroundColor Gray
Write-Host "Type 'exit' to close the root session" -ForegroundColor Yellow
Write-Host "Then test your new password with:`n" -ForegroundColor Yellow
Write-Host "  wsl sudo echo 'Password works!'`n" -ForegroundColor White

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 QUICK METHOD - Run this now:`n" -ForegroundColor Green

Write-Host "wsl -u root" -ForegroundColor White -BackgroundColor DarkGray
Write-Host ""
Write-Host "Then in WSL, type:" -ForegroundColor Yellow
Write-Host "passwd $username" -ForegroundColor White -BackgroundColor DarkGray
Write-Host ""
Write-Host "Press Enter to open WSL as root now..." -ForegroundColor Yellow
$response = Read-Host

if ($response -eq "" -or $response -eq "y" -or $response -eq "Y") {
    Write-Host "`nOpening WSL as root..." -ForegroundColor Green
    Write-Host "Run this command: passwd $username`n" -ForegroundColor Cyan
    wsl -u root

    Write-Host "`n✅ Password should be reset!" -ForegroundColor Green
    Write-Host "Test it with: wsl sudo echo 'Works!'`n" -ForegroundColor Cyan
}
