#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Organize repository files into proper directories
.DESCRIPTION
    Moves markdown documentation and scripts to organized folders
    - Optimization reports → docs/optimization-reports/
    - Guides → docs/guides/
    - Analysis scripts → scripts/analysis/
    - Cleanup scripts → scripts/cleanup/
    - Fix scripts → scripts/fixes/
.NOTES
    Created: October 8, 2025
    Part of Session 4 optimization
#>

Write-Host "🗂️  Repository Organization Script" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray
Write-Host ""

$projectRoot = $PSScriptRoot
$moveCount = 0

# Define file movements
$moves = @{
    # Optimization Reports
    "OPTIMIZATION_SESSION_3_COMPLETE.md" = "docs\optimization-reports\OPTIMIZATION_SESSION_3_COMPLETE.md"
    "OPTIMIZATION_COMPLETE.md" = "docs\optimization-reports\OPTIMIZATION_COMPLETE.md"
    "OPTIMIZATION_PROGRESS.md" = "docs\optimization-reports\OPTIMIZATION_PROGRESS.md"
    "CONTINUOUS_OPTIMIZATION_STATUS.md" = "docs\optimization-reports\CONTINUOUS_OPTIMIZATION_STATUS.md"
    "FINAL_OPTIMIZATION_REPORT.md" = "docs\optimization-reports\FINAL_OPTIMIZATION_REPORT.md"
    "CLEANUP_SUMMARY.md" = "docs\optimization-reports\CLEANUP_SUMMARY.md"
    
    # Guides
    "CODE_QUALITY_GUIDE.md" = "docs\guides\CODE_QUALITY_GUIDE.md"
    "ADVANCED_OPTIMIZATION_GUIDE.md" = "docs\guides\ADVANCED_OPTIMIZATION_GUIDE.md"
    "DEPLOYMENT_GUIDE.md" = "docs\guides\DEPLOYMENT_GUIDE.md"
    "DEVELOPMENT_SETUP.md" = "docs\guides\DEVELOPMENT_SETUP.md"
    "QUICK_START_GUIDE.md" = "docs\guides\QUICK_START_GUIDE.md"
    "QUICK_REFERENCE_GUIDE.md" = "docs\guides\QUICK_REFERENCE_GUIDE.md"
    "REDIS_DOCKER_SETUP.md" = "docs\guides\REDIS_DOCKER_SETUP.md"
    "POSTGRESQL_SETUP_GUIDE.md" = "docs\guides\POSTGRESQL_SETUP_GUIDE.md"
    
    # Analysis Scripts
    "analyze-and-optimize.ps1" = "scripts\analysis\analyze-and-optimize.ps1"
    "analyze-console-logging.ps1" = "scripts\analysis\analyze-console-logging.ps1"
    "analyze-typescript-types.ps1" = "scripts\analysis\analyze-typescript-types.ps1"
    
    # Cleanup Scripts
    "cleanup-repo.ps1" = "scripts\cleanup\cleanup-repo.ps1"
    "cleanup-scripts.ps1" = "scripts\cleanup\cleanup-scripts.ps1"
    "cleanup-final.ps1" = "scripts\cleanup\cleanup-final.ps1"
    
    # Fix Scripts
    "fix-zustand-proper.ps1" = "scripts\fixes\fix-zustand-proper.ps1"
    "fix-zustand-types.ps1" = "scripts\fixes\fix-zustand-types.ps1"
    "fix-implicit-any-alerts.ps1" = "scripts\fixes\fix-implicit-any-alerts.ps1"
    "fix-all-implicit-any.ps1" = "scripts\fixes\fix-all-implicit-any.ps1"
}

Write-Host "📋 Files to organize: $($moves.Count)" -ForegroundColor Yellow
Write-Host ""

foreach ($source in $moves.Keys) {
    $sourcePath = Join-Path $projectRoot $source
    $destPath = Join-Path $projectRoot $moves[$source]
    
    if (Test-Path $sourcePath) {
        $destDir = Split-Path $destPath -Parent
        
        # Ensure destination directory exists
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        # Move file
        try {
            Move-Item -Path $sourcePath -Destination $destPath -Force
            $moveCount++
            Write-Host "  ✅ Moved: $source" -ForegroundColor Green
            Write-Host "     → $($moves[$source])" -ForegroundColor Gray
        } catch {
            Write-Host "  ❌ Failed: $source" -ForegroundColor Red
            Write-Host "     Error: $_" -ForegroundColor DarkRed
        }
    } else {
        Write-Host "  ⏭️  Skipped: $source (not found)" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "=" * 50 -ForegroundColor Gray
Write-Host "✅ Organization complete!" -ForegroundColor Green
Write-Host "   Files moved: $moveCount" -ForegroundColor Cyan
Write-Host ""
Write-Host "📁 New structure:" -ForegroundColor Yellow
Write-Host "   docs/optimization-reports/ - Optimization session reports" -ForegroundColor White
Write-Host "   docs/guides/              - Setup and reference guides" -ForegroundColor White
Write-Host "   scripts/analysis/         - Code analysis tools" -ForegroundColor White
Write-Host "   scripts/cleanup/          - Repository cleanup tools" -ForegroundColor White
Write-Host "   scripts/fixes/            - Code fix automation" -ForegroundColor White
Write-Host ""
