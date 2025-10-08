#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Final comprehensive repository cleanup
    
.DESCRIPTION
    Archives remaining duplicate and outdated documentation files
    Creates consolidated documentation structure
    
.NOTES
    Run from repository root: .\cleanup-final.ps1
#>

param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       LOKIFI FINAL COMPREHENSIVE CLEANUP                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

# Create archive directory
$ArchiveDir = Join-Path $RepoRoot "docs/archive/old-root-docs"
if (-not (Test-Path $ArchiveDir)) {
    if (-not $DryRun) {
        New-Item -ItemType Directory -Path $ArchiveDir -Force | Out-Null
        Write-Host "✅ Created archive directory: docs/archive/old-root-docs" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "CATEGORY 1: Duplicate Project Status Files" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Keep: PROJECT_STATUS_CONSOLIDATED.md (the new consolidated one)
# Archive these duplicates
$StatusFiles = @(
    "PROJECT_STATUS.md",
    "PROJECT_COMPLETION_SUMMARY.md",
    "ALL_SYSTEMS_OPERATIONAL.md"
)

Write-Host "Files to archive (keeping PROJECT_STATUS_CONSOLIDATED.md):" -ForegroundColor Yellow
foreach ($file in $StatusFiles) {
    Write-Host "  • $file" -ForegroundColor Gray
}
Write-Host ""

$ArchivedCount = 0
foreach ($file in $StatusFiles) {
    $SourcePath = Join-Path $RepoRoot $file
    if (Test-Path $SourcePath) {
        $DestPath = Join-Path $ArchiveDir $file
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would archive: $file" -ForegroundColor Gray
        } else {
            Move-Item -Path $SourcePath -Destination $DestPath -Force
            Write-Host "  📦 Archived: $file" -ForegroundColor Green
        }
        $ArchivedCount++
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "CATEGORY 2: Duplicate Setup/Guide Files" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Keep: QUICK_START_GUIDE.md, DEVELOPMENT_SETUP.md, DEPLOYMENT_GUIDE.md
# Archive these
$GuideFiles = @(
    "DASHBOARD_QUICK_START.md",
    "QUICK_TEST_GUIDE.md",
    "POSTGRESQL_SETUP.md",
    "COMPLETE_OPTIMIZATION_GUIDE.md",
    "DOCKER_VS_MANUAL.md"
)

Write-Host "Duplicate guides to archive:" -ForegroundColor Yellow
foreach ($file in $GuideFiles) {
    Write-Host "  • $file" -ForegroundColor Gray
}
Write-Host ""

foreach ($file in $GuideFiles) {
    $SourcePath = Join-Path $RepoRoot $file
    if (Test-Path $SourcePath) {
        $DestPath = Join-Path $ArchiveDir $file
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would archive: $file" -ForegroundColor Gray
        } else {
            Move-Item -Path $SourcePath -Destination $DestPath -Force
            Write-Host "  📦 Archived: $file" -ForegroundColor Green
        }
        $ArchivedCount++
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "CATEGORY 3: Specific Feature Implementation Docs" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# These should be in docs/implementation/ or archived
$ImplementationFiles = @(
    "DASHBOARD_LIVE_NET_WORTH_COMPLETE.md",
    "MASTER_MARKET_DATA_SYSTEM.md",
    "PHASE_5_API_INTEGRATION_GUIDE.md",
    "EXPANDING_TO_2070_ASSETS.md",
    "ASSETS_STOCK_FLOW.md",
    "ASSET_ICONS_AND_PRICES_STATUS.md",
    "ALL_PRICES_UPDATED_OCT_2025.md",
    "API_RATE_LIMIT_ANALYSIS.md"
)

Write-Host "Implementation docs to archive:" -ForegroundColor Yellow
foreach ($file in $ImplementationFiles) {
    Write-Host "  • $file" -ForegroundColor Gray
}
Write-Host ""

foreach ($file in $ImplementationFiles) {
    $SourcePath = Join-Path $RepoRoot $file
    if (Test-Path $SourcePath) {
        $DestPath = Join-Path $ArchiveDir $file
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would archive: $file" -ForegroundColor Gray
        } else {
            Move-Item -Path $SourcePath -Destination $DestPath -Force
            Write-Host "  📦 Archived: $file" -ForegroundColor Green
        }
        $ArchivedCount++
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "CATEGORY 4: OAuth/Auth Specific Docs" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Keep in docs/development/ or archive
$AuthFiles = @(
    "GOOGLE_OAUTH_IMPLEMENTATION.md",
    "GOOGLE_OAUTH_QUICK_SETUP.md"
)

Write-Host "OAuth docs to archive:" -ForegroundColor Yellow
foreach ($file in $AuthFiles) {
    Write-Host "  • $file" -ForegroundColor Gray
}
Write-Host ""

foreach ($file in $AuthFiles) {
    $SourcePath = Join-Path $RepoRoot $file
    if (Test-Path $SourcePath) {
        $DestPath = Join-Path $ArchiveDir $file
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would archive: $file" -ForegroundColor Gray
        } else {
            Move-Item -Path $SourcePath -Destination $DestPath -Force
            Write-Host "  📦 Archived: $file" -ForegroundColor Green
        }
        $ArchivedCount++
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "CATEGORY 5: Redis Duplicate Documentation" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Keep one Redis doc, archive others
$RedisFiles = @(
    "REDIS_DOCKER_AUTOMATION.md"
)

Write-Host "Redis duplicate docs:" -ForegroundColor Yellow
foreach ($file in $RedisFiles) {
    Write-Host "  • $file" -ForegroundColor Gray
}
Write-Host ""

foreach ($file in $RedisFiles) {
    $SourcePath = Join-Path $RepoRoot $file
    if (Test-Path $SourcePath) {
        $DestPath = Join-Path $ArchiveDir $file
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would archive: $file" -ForegroundColor Gray
        } else {
            Move-Item -Path $SourcePath -Destination $DestPath -Force
            Write-Host "  📦 Archived: $file" -ForegroundColor Green
        }
        $ArchivedCount++
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "CATEGORY 6: Roadmap/Planning Docs" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# These should be in docs/planning/
$PlanningFiles = @(
    "NEXT_STEPS.md",
    "NEXT_IMPLEMENTATION_ROADMAP.md",
    "FUTURE_ENHANCEMENTS_ROADMAP.md",
    "NEW_UI_FEATURES.md",
    "FRONTEND_READY.md",
    "FINAL_MANUAL_STEP.md"
)

Write-Host "Planning docs to archive:" -ForegroundColor Yellow
foreach ($file in $PlanningFiles) {
    Write-Host "  • $file" -ForegroundColor Gray
}
Write-Host ""

foreach ($file in $PlanningFiles) {
    $SourcePath = Join-Path $RepoRoot $file
    if (Test-Path $SourcePath) {
        $DestPath = Join-Path $ArchiveDir $file
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would archive: $file" -ForegroundColor Gray
        } else {
            Move-Item -Path $SourcePath -Destination $DestPath -Force
            Write-Host "  📦 Archived: $file" -ForegroundColor Green
        }
        $ArchivedCount++
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "CATEGORY 7: Obsolete Scripts & Files" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$ObsoleteFiles = @(
    "dev.ps1",
    "fix-asset-page.ps1",
    "fix-page.ps1",
    "reset-wsl-password.ps1",
    "docker-compose-dev.ps1",
    "deploy-local-prod.ps1",
    "test-login.json"
)

Write-Host "Obsolete scripts/files:" -ForegroundColor Yellow
foreach ($file in $ObsoleteFiles) {
    Write-Host "  • $file" -ForegroundColor Gray
}
Write-Host ""

foreach ($file in $ObsoleteFiles) {
    $SourcePath = Join-Path $RepoRoot $file
    if (Test-Path $SourcePath) {
        $DestPath = Join-Path $ArchiveDir $file
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would archive: $file" -ForegroundColor Gray
        } else {
            Move-Item -Path $SourcePath -Destination $DestPath -Force
            Write-Host "  📦 Archived: $file" -ForegroundColor Green
        }
        $ArchivedCount++
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
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  • Duplicate Status Files: 3" -ForegroundColor White
    Write-Host "  • Duplicate Guides: 5" -ForegroundColor White
    Write-Host "  • Implementation Docs: 8" -ForegroundColor White
    Write-Host "  • OAuth Docs: 2" -ForegroundColor White
    Write-Host "  • Redis Docs: 1" -ForegroundColor White
    Write-Host "  • Planning Docs: 6" -ForegroundColor White
    Write-Host "  • Obsolete Files: 7" -ForegroundColor White
    Write-Host "  • Total: ~32 files" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To apply changes, run:" -ForegroundColor Cyan
    Write-Host "  .\cleanup-final.ps1" -ForegroundColor White
} else {
    Write-Host "✅ Final cleanup completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Results:" -ForegroundColor Cyan
    Write-Host "  • Archived $ArchivedCount files" -ForegroundColor White
    Write-Host ""
    Write-Host "📁 Archived location:" -ForegroundColor Cyan
    Write-Host "  docs/archive/old-root-docs/" -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 Clean Root Directory!" -ForegroundColor Green
    Write-Host "  Only essential docs and scripts remain" -ForegroundColor White
    Write-Host ""
    Write-Host "🔄 Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Review: git status" -ForegroundColor White
    Write-Host "  2. Commit: git add -A && git commit -m 'chore: Final cleanup - archive remaining duplicate docs'" -ForegroundColor White
    Write-Host "  3. Push: git push" -ForegroundColor White
}

Write-Host ""
Write-Host "✨ Done!" -ForegroundColor Green
Write-Host ""
