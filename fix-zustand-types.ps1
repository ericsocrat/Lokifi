# Fix Zustand Store Type Issues
Write-Host "Fixing Zustand store type signatures..." -ForegroundColor Cyan

$files = @(
    'frontend/lib/alertsV2.tsx',
    'frontend/lib/backtester.tsx',
    'frontend/lib/configurationSync.tsx',
    'frontend/lib/corporateActions.tsx',
    'frontend/lib/environmentManagement.tsx',
    'frontend/lib/integrationTesting.tsx',
    'frontend/lib/mobileA11y.tsx',
    'frontend/lib/monitoring.tsx',
    'frontend/lib/multiChart.tsx',
    'frontend/lib/observability.tsx',
    'frontend/lib/paperTrading.tsx',
    'frontend/lib/performance.tsx',
    'frontend/lib/progressiveDeployment.tsx',
    'frontend/lib/rollback.tsx',
    'frontend/lib/social.tsx',
    'frontend/lib/templates.tsx',
    'frontend/lib/watchlist.tsx'
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        # Remove generic type from immer middleware - let TypeScript infer it
        $content = $content -replace 'immer<([^>]+)>\(', 'immer('
        Set-Content $file $content
        Write-Host "  Fixed: $file" -ForegroundColor Green
    }
}

Write-Host "Done!" -ForegroundColor Green
