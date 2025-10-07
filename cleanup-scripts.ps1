#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Cleanup redundant startup scripts
    
.DESCRIPTION
    Removes duplicate/outdated startup scripts now that we have start-servers.ps1
    
.NOTES
    Run this from the repository root: .\cleanup-scripts.ps1
#>

param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         LOKIFI SCRIPT CLEANUP                              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

# Create archive directory for scripts
$ArchiveDir = Join-Path $RepoRoot "docs/archive/old-scripts"
if (-not (Test-Path $ArchiveDir)) {
    if (-not $DryRun) {
        New-Item -ItemType Directory -Path $ArchiveDir -Force | Out-Null
        Write-Host "✅ Created archive directory: docs/archive/old-scripts" -ForegroundColor Green
    } else {
        Write-Host "[DRY RUN] Would create: docs/archive/old-scripts" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Archiving Redundant Startup Scripts" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Scripts to archive (redundant with start-servers.ps1)
$ScriptsToArchive = @(
    # Duplicate launchers
    "start-all-servers.ps1",
    "start-dev.ps1",
    
    # Individual component scripts (called by main script)
    "start-backend.ps1",
    "start-backend-wsl.ps1",
    "start-redis.ps1",
    "start-redis-wsl.ps1",
    
    # Docker-specific (functionality in main script)
    "start-docker.ps1",
    
    # Outdated Redis setup scripts (now using Docker)
    "setup-redis.ps1",
    "setup-redis-auto.ps1",
    "setup-redis-simple.ps1",
    "install-redis-wsl.ps1",
    
    # Outdated Redis docs (now using Docker)
    "REDIS_SETUP_WINDOWS.md",
    "REDIS_WINDOWS_WSL_INFO.md"
)

Write-Host "📋 Scripts to archive:" -ForegroundColor Yellow
foreach ($script in $ScriptsToArchive) {
    Write-Host "   • $script" -ForegroundColor Gray
}
Write-Host ""

$ArchivedCount = 0
foreach ($script in $ScriptsToArchive) {
    $SourcePath = Join-Path $RepoRoot $script
    if (Test-Path $SourcePath) {
        $DestPath = Join-Path $ArchiveDir $script
        
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would archive: $script" -ForegroundColor Gray
            $ArchivedCount++
        } else {
            Move-Item -Path $SourcePath -Destination $DestPath -Force
            Write-Host "  📦 Archived: $script" -ForegroundColor Green
            $ArchivedCount++
        }
    } else {
        Write-Host "  ⚠️  Not found: $script" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN COMPLETED" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Would archive $ArchivedCount files" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To apply these changes, run:" -ForegroundColor Cyan
    Write-Host "  .\cleanup-scripts.ps1" -ForegroundColor White
} else {
    Write-Host "✅ Script cleanup completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Results:" -ForegroundColor Cyan
    Write-Host "  • Archived $ArchivedCount redundant scripts" -ForegroundColor White
    Write-Host ""
    Write-Host "📁 Archived location:" -ForegroundColor Cyan
    Write-Host "  docs/archive/old-scripts/" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 Scripts You Should Use Now:" -ForegroundColor Cyan
    Write-Host "  ✅ start-servers.ps1      - Start all services (MAIN LAUNCHER)" -ForegroundColor Green
    Write-Host "  ✅ manage-redis.ps1       - Manage Redis container" -ForegroundColor Green
    Write-Host "  ✅ test-api.ps1           - Test backend APIs" -ForegroundColor Green
    Write-Host "  ✅ cleanup-repo.ps1       - Clean up documentation" -ForegroundColor Green
    Write-Host "  ✅ cleanup-scripts.ps1    - This script" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔄 Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Review changes: git status" -ForegroundColor White
    Write-Host "  2. Commit: git add -A && git commit -m 'chore: Archive redundant startup scripts'" -ForegroundColor White
    Write-Host "  3. Push: git push" -ForegroundColor White
}

Write-Host ""
Write-Host "✨ Done!" -ForegroundColor Green
Write-Host ""
