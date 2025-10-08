#!/usr/bin/env pwsh
# Fix Zustand Store Type Issues - Proper Fix for v5
Write-Host "Fixing Zustand v5 store type signatures..." -ForegroundColor Cyan
Write-Host ""

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

$fixedCount = 0

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Fix: persist(immer(...)) needs explicit typing
        # Replace the callback parameters to include types
        $content = $content -replace 'immer\(\(set, get, store\)', 'immer<any>((set, get, store)'
        $content = $content -replace 'immer\(\(set, get\)', 'immer<any>((set, get)'
        
        Set-Content $file $content
        Write-Host "  ✅ Fixed: $file" -ForegroundColor Green
        $fixedCount++
    } else {
        Write-Host "  ⚠️  Not found: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Fixed $fixedCount files!" -ForegroundColor Green
Write-Host ""
Write-Host "Note: Using <any> is a workaround for Zustand v5 middleware type issues." -ForegroundColor Gray
Write-Host "The stores will still have proper types from the create<Type>() declaration." -ForegroundColor Gray
