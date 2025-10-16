# Create Pull Requests for Phase 1.6 Tasks 2 & 3
# Run this after ensuring both branches are pushed

Write-Host "`n🚀 Creating Pull Requests for Phase 1.6`n" -ForegroundColor Cyan

# Check if branches exist
$branches = @(
    "feature/api-contract-testing",
    "feature/visual-regression-testing"
)

foreach ($branch in $branches) {
    $exists = git rev-parse --verify $branch 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Branch $branch does not exist locally" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Both branches exist locally`n" -ForegroundColor Green

# Display instructions
Write-Host "📋 To create PRs, open these URLs in your browser:`n" -ForegroundColor Yellow

Write-Host "PR #23 - API Contract Testing:" -ForegroundColor Cyan
Write-Host "https://github.com/ericsocrat/Lokifi/compare/main...feature/api-contract-testing`n" -ForegroundColor White

Write-Host "PR #24 - Visual Regression Testing:" -ForegroundColor Cyan
Write-Host "https://github.com/ericsocrat/Lokifi/compare/main...feature/visual-regression-testing`n" -ForegroundColor White

Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "1. Click 'Create pull request' button" -ForegroundColor White
Write-Host "2. Copy titles and descriptions from CHECK_PRS.md" -ForegroundColor White
Write-Host "3. Both branches are already pushed with all fixes" -ForegroundColor White
Write-Host "4. CI/CD will run automatically after PR creation`n" -ForegroundColor White

# Ask if user wants to open in browser
$response = Read-Host "Would you like to open these URLs in your browser? (Y/N)"
if ($response -eq 'Y' -or $response -eq 'y') {
    Start-Process "https://github.com/ericsocrat/Lokifi/compare/main...feature/api-contract-testing"
    Start-Sleep -Seconds 2
    Start-Process "https://github.com/ericsocrat/Lokifi/compare/main...feature/visual-regression-testing"
    Write-Host "`n✅ Opened PR creation pages in browser!" -ForegroundColor Green
}

Write-Host "`n📚 For full PR descriptions, see: CHECK_PRS.md`n" -ForegroundColor Cyan
