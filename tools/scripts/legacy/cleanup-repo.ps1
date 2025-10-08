#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Repository cleanup script - removes outdated branches and consolidates documentation
    
.DESCRIPTION
    This script will:
    1. Delete old dependabot branches from GitHub
    2. Archive outdated status/completion documents
    3. Clean up duplicate guide files
    4. Consolidate important documentation
    
.NOTES
    Run this from the repository root: .\cleanup-repo.ps1
    Creates backups before deleting anything
#>

param(
    [switch]$DryRun,
    [switch]$SkipBranches,
    [switch]$SkipDocs
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         LOKIFI REPOSITORY CLEANUP SCRIPT                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

# Create archive directory
$ArchiveDir = Join-Path $RepoRoot "docs/archive/old-status-docs"
if (-not (Test-Path $ArchiveDir)) {
    New-Item -ItemType Directory -Path $ArchiveDir -Force | Out-Null
    Write-Host "✅ Created archive directory: docs/archive/old-status-docs" -ForegroundColor Green
}

# ============================================================================
# STEP 1: Delete Old Dependabot Branches
# ============================================================================
if (-not $SkipBranches) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "STEP 1: Cleaning Up Old Dependabot Branches" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    $BranchesToDelete = @(
        "dependabot/github_actions/codecov/codecov-action-5",
        "dependabot/github_actions/actions/checkout-5",
        "dependabot/npm_and_yarn/frontend/jest/globals-30.2.0",
        "dependabot/npm_and_yarn/frontend/minor-and-patch-45881dd087",
        "dependabot/npm_and_yarn/frontend/minor-and-patch-48d710c9cf",
        "dependabot/npm_and_yarn/frontend/react-61e40ddca6",
        "dependabot/npm_and_yarn/frontend/testing-04db75ba47",
        "dependabot/npm_and_yarn/frontend/testing-4710dc2105",
        "dependabot/npm_and_yarn/frontend/zod-4.1.11",
        "dependabot/pip/backend/fastapi-0738b17991",
        "dependabot/pip/backend/minor-and-patch-b533e96e41",
        "dependabot/pip/backend/minor-and-patch-ba67a3f987",
        "dependabot/pip/backend/minor-and-patch-fb4baa64bf",
        "dependabot/pip/backend/redis-6.4.0",
        "dependabot/docker/backend/python-3.13-slim",
        "dependabot/docker/frontend/node-24-alpine"
    )

    Write-Host "Found $($BranchesToDelete.Count) dependabot branches to delete" -ForegroundColor Yellow
    Write-Host ""

    $DeletedCount = 0
    foreach ($branch in $BranchesToDelete) {
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would delete: origin/$branch" -ForegroundColor Gray
        } else {
            try {
                git push origin --delete $branch 2>$null
                Write-Host "  ✅ Deleted: origin/$branch" -ForegroundColor Green
                $DeletedCount++
            } catch {
                Write-Host "  ⚠️  Could not delete: origin/$branch (may not exist)" -ForegroundColor Yellow
            }
        }
    }

    if (-not $DryRun) {
        Write-Host ""
        Write-Host "✅ Deleted $DeletedCount remote branches" -ForegroundColor Green
        
        # Clean up local references
        Write-Host ""
        Write-Host "Pruning local references..." -ForegroundColor Cyan
        git fetch --prune
        Write-Host "✅ Local references pruned" -ForegroundColor Green
    }
}

# ============================================================================
# STEP 2: Archive Outdated Documentation Files
# ============================================================================
if (-not $SkipDocs) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "STEP 2: Archiving Outdated Documentation" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    # Files to archive (historical status/completion docs)
    $FilesToArchive = @(
        # Completion status files (keep only latest)
        "30_MINUTE_INTERVAL_COMPLETE.md",
        "ADD_ASSET_MODAL_COMPLETE.md",
        "API_KEY_SYSTEM_COMPLETE.md",
        "ASSET_DETAIL_FIXES_COMPLETE.md",
        "ASSET_DETAIL_PAGES_COMPLETE.md",
        "ASSET_ICONS_COMPLETE.md",
        "AUTH_COMPLETE_STATUS.md",
        "AUTH_OPTIMIZATION_COMPLETE.md",
        "AUTH_IMPLEMENTATION_COMPLETE.md",
        "BACKEND_OPTIMIZATION_COMPLETE.md",
        "DATABASE_MIGRATION_COMPLETE.md",
        "DEPLOYMENT_COMPLETE.md",
        "DOCKER_SETUP_COMPLETE.md",
        "ERRORS_FIXED_COMPLETE.md",
        "GIT_COMMIT_COMPLETE.md",
        "GLOBAL_LAYOUT_COMPLETE.md",
        "GLOBAL_LAYOUT_WITH_AUTH_COMPLETE.md",
        "IMPLEMENTATION_COMPLETE.md",
        "INTEGRATION_COMPLETE_SUMMARY.md",
        "MARKETS_AND_ASSET_ENHANCEMENT_COMPLETE.md",
        "MARKETS_PAGE_COMPLETE.md",
        "NEXT_STEPS_COMPLETE.md",
        "PERFORMANCE_GOOGLE_OAUTH_COMPLETE.md",
        "PHASE_1_COMPLETE_SUMMARY.md",
        "PHASE_3_COMPLETE.md",
        "PHASE_4_COMPLETE.md",
        "PHASE_5_COMPLETE.md",
        "PHASE_5_FINAL_SUMMARY.md",
        "PORTFOLIO_ADVANCED_V2_COMPLETE.md",
        "PORTFOLIO_LIVE_PRICES_COMPLETE.md",
        "PORTFOLIO_PAGE_ENHANCED_COMPLETE.md",
        "PORTFOLIO_REPLACEMENT_COMPLETE.md",
        "PROTECTED_ROUTES_COMPLETE.md",
        "REACT_QUERY_PHASE2_COMPLETE.md",
        "REAL_API_INTEGRATION_COMPLETE.md",
        "REAL_TIME_MARKET_DATA_INTEGRATION_COMPLETE.md",
        "REAL_TIME_PRICE_UPDATES_COMPLETE.md",
        "REDIS_SETUP_COMPLETE.md",
        "REDIS_SETUP_SUCCESS.md",
        "SCHEMA_FIX_COMPLETE.md",
        "SEARCH_FIX_COMPLETE.md",
        "SENTRY_ENABLED_COMPLETE.md",
        "SENTRY_RE_ENABLED_COMPLETE.md",
        "SENTRY_SETUP_COMPLETE.md",
        "SESSION_COMPLETE.md",
        "SIGNUP_IMPLEMENTATION_COMPLETE.md",
        "SSL_CERTIFICATE_FIX_COMPLETE.md",
        "TASKS_6_7_8_COMPLETE.md",
        "TASK_COMPLETE.md",
        "UUID_MIGRATION_COMPLETE.md",
        "WORLD_CLASS_ENHANCEMENTS_COMPLETE.md",
        "PHASE_6A_COMPLETE.md",
        
        # Error fix logs (historical)
        "AUTH_COOKIE_FIX.md",
        "AUTH_COOKIE_FIX_FINAL.md",
        "AUTH_ERROR_HANDLING_FIXED.md",
        "AUTH_FAILED_TO_FETCH_FIX.md",
        "AUTH_FAILED_TO_FETCH_FIX_FINAL.md",
        "AUTH_FINAL_SIMPLE.md",
        "AUTH_FIX_DEMO_MODE.md",
        "BACKEND_ERRORS_FIXED.md",
        "BACKEND_FIX_RESTART_NEEDED.md",
        "CORS_FIX_SUCCESS.md",
        "CORS_MIDDLEWARE_ORDER_FIXED.md",
        "CRYPTO_FIX_SUCCESS.md",
        "CRYPTO_MARKET_DATA_FIX_SUMMARY.md",
        "DOCKER_ERRORS_FIXED_COMPLETE.md",
        "DOCKER_ISSUES_FIXED.md",
        "ENV_FIX_APPLIED.md",
        "ERRORS_FIXED.md",
        "ERRORS_FIXED_SUMMARY.md",
        "ERROR_FIXES_SESSION2.md",
        "FINAL_GOOGLE_AUTH_FIX.md",
        "FIXES_IMPLEMENTATION_COMPLETE.md",
        "FIXES_STATUS.md",
        "FIX_COMPLETE_RESTART_NEEDED.md",
        "GOOGLE_AUTH_FIXED_COMPLETE.md",
        "GOOGLE_AUTH_FIXED_FINAL.md",
        "GOOGLE_AUTH_FIX_COMPLETE.md",
        "GOOGLE_AUTH_SCHEMA_FIX.md",
        "GOOGLE_OAUTH_ERROR_FIX.md",
        "GOOGLE_OAUTH_ERROR_FIX_FINAL.md",
        "GOOGLE_OAUTH_ID_TOKEN_FIX.md",
        "IMAGE_CONFIG_FIX.md",
        "REDIS_SERVERS_FIXED.md",
        "RESTART_TEST_FIX_COMPLETE.md",
        "SERVER_STARTUP_FIXED.md",
        
        # Duplicate summaries
        "COMPLETE_FIX_SUMMARY.md",
        "COMPLETE_SYSTEM_UPDATE.md",
        "COMPLETE_UI_UPGRADE_SUMMARY.md",
        "COMPREHENSIVE_FIXES_GUIDE.md",
        "EXECUTIVE_SUMMARY_TASKS_6_7_8.md",
        "FINAL_IMPLEMENTATION_SUMMARY.md",
        "FINAL_STATUS.md",
        "FINAL_STEPS.md",
        "FINAL_TASK_COMPLETE.md",
        "GIT_COMMIT_SUMMARY.md",
        "GIT_DEPLOYMENT_COMPLETE.md",
        "GLOBAL_HEADER_SUMMARY.md",
        "ICONS_AND_PRICES_SUMMARY.md",
        "IMPLEMENTATION_STATUS.md",
        "IMPLEMENTATION_STATUS_FINAL.md",
        "LATEST_UPDATE.md",
        "MISSION_ACCOMPLISHED.md",
        "SUCCESS_SUMMARY.md",
        "STEPS_COMPLETION_SUMMARY.md",
        "TASKS_6_7_8_ENHANCEMENTS_SUMMARY.md",
        "THIS_SESSION_SUMMARY.md",
        
        # Duplicate guides
        "QUICK_AUTH_TEMPLATE.md",
        "QUICK_FIX_SUMMARY.md",
        "QUICK_REFERENCE.md",
        "QUICK_START.md",
        "QUICK_START_DOCKER.md",
        "QUICK_START_REAL_APIS.md",
        "QUICK_START_SERVERS.md",
        "QUICK_STATUS.md",
        "RESTART_FRONTEND.md",
        "SERVERS_READY.md",
        "SERVERS_STARTED_COMPLETE.md",
        "SERVER_AUTOMATION_COMPLETE.md",
        "START_ALL_SERVERS_GUIDE.md",
        
        # Auth/OAuth duplicates (keep main implementation docs)
        "AUTH_OPTIMIZATION_IMPLEMENTED.md",
        "AUTH_OPTIMIZATION_SUMMARY.md",
        "AUTH_MODAL_CMC_IMPLEMENTATION.md",
        "GLOBAL_AUTH_IMPLEMENTATION.md",
        "GLOBAL_HEADER_OPTIMIZATION.md",
        "GOOGLE_AUTH_COMPLETE_STATUS.md",
        "GOOGLE_AUTH_DEBUG_GUIDE.md",
        "GOOGLE_OAUTH_CONFIGURED.md",
        "GOOGLE_OAUTH_READY.md",
        "VISUAL_AUTH_GUIDE.md",
        
        # Phase/progress docs (work completed)
        "PHASE_5_PROGRESS.md",
        "LIVE_MARKET_DATA_PROGRESS.md",
        "OPTIMIZATION_STATUS.md",
        "STOCK_FETCHING_STATUS.md",
        
        # Duplicate implementation guides
        "ADD_ASSETS_GUIDE.md",
        "ADD_ASSETS_IMPLEMENTATION.md",
        "BANK_CONNECTION_GUIDE.md",
        "BANK_CONNECTION_IMPLEMENTATION.md",
        "CRYPTO_ADDITION_FLOW.md",
        "CRYPTO_API_IMPLEMENTATION.md",
        "DASHBOARD_RESTORATION_PLAN.md",
        "FRONTEND_INTEGRATION_GUIDE.md",
        "FRONTEND_RESTART_GUIDE.md",
        "MARKET_DATA_QUICK_START.md",
        "PORTFOLIO_DASHBOARD_IMPLEMENTATION.md",
        "SIGNUP_IMPLEMENTATION_PLAN.md",
        "UNIVERSAL_SEARCH_IMPLEMENTATION.md",
        
        # Test/debug files
        "API_TEST_RESULTS.md",
        "SMOKE_TEST_REPORT.md",
        "TEST_API_CONNECTION.md",
        "TEST_AUTH_NOW.md",
        "VERIFICATION_CHECKLIST.md",
        
        # Asset pages comparison (outdated)
        "ASSET_PAGES_PREMIUM_UPGRADE.md",
        "ASSET_PAGES_VISUAL_COMPARISON.md",
        "PAGE_UPDATE_AUDIT.md",
        "UI_COMPARISON_GUIDE.md",
        
        # Duplicate current status
        "ALL_ERRORS_FIXED_OCT7.md",
        "ALL_ISSUES_RESOLVED.md",
        "CURRENT_STATUS.md",
        "DATABASE_STATUS.md",
        "REDIS_STATUS.md",
        
        # Misc
        "CONNECTING_BANK_ANIMATION.md",
        "DUPLICATE_PREVENTION_AND_BATCH_OPTIMIZATION.md",
        "HYBRID_ARCHITECTURE_PHASE1_COMPLETE.md",
        "IMMEDIATE_NEXT_STEPS.md",
        "NEXT_STEPS_PLAN.md",
        "PORTFOLIO_COLLAPSIBLE_SECTIONS.md",
        "PORTFOLIO_PAGES_LOCATION.md",
        "PRICE_DATA_UPDATED.md",
        "SYSTEM_CHECK_COMPLETE.md",
        "VSCODE_10000_CHANGES_EXPLAINED.md"
    )

    Write-Host "Found $($FilesToArchive.Count) documentation files to archive" -ForegroundColor Yellow
    Write-Host ""

    $ArchivedCount = 0
    foreach ($file in $FilesToArchive) {
        $SourcePath = Join-Path $RepoRoot $file
        if (Test-Path $SourcePath) {
            $DestPath = Join-Path $ArchiveDir $file
            
            if ($DryRun) {
                Write-Host "  [DRY RUN] Would archive: $file" -ForegroundColor Gray
            } else {
                Move-Item -Path $SourcePath -Destination $DestPath -Force
                Write-Host "  📦 Archived: $file" -ForegroundColor Green
                $ArchivedCount++
            }
        }
    }

    if (-not $DryRun) {
        Write-Host ""
        Write-Host "✅ Archived $ArchivedCount documentation files" -ForegroundColor Green
    }

    # ============================================================================
    # STEP 3: Delete Temporary/Debug Files
    # ============================================================================
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "STEP 3: Cleaning Up Temporary Files" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    $TempFilesToDelete = @(
        "check_db_path.py",
        "check_user.py",
        "create_tables.py",
        "quick_test.py",
        "test_auth.html",
        "test_direct.py",
        "test_login.json",
        "test_login.py",
        "test_register.py",
        "test_registration_debug.py",
        "test_websocket.html",
        "temp_restore_assets.tsx",
        "temp_restore_dashboard.tsx",
        "QUICK_REFERENCE.txt"
    )

    $DeletedTempCount = 0
    foreach ($file in $TempFilesToDelete) {
        $FilePath = Join-Path $RepoRoot $file
        if (Test-Path $FilePath) {
            if ($DryRun) {
                Write-Host "  [DRY RUN] Would delete: $file" -ForegroundColor Gray
            } else {
                Remove-Item -Path $FilePath -Force
                Write-Host "  🗑️  Deleted: $file" -ForegroundColor Green
                $DeletedTempCount++
            }
        }
    }

    if (-not $DryRun -and $DeletedTempCount -gt 0) {
        Write-Host ""
        Write-Host "✅ Deleted $DeletedTempCount temporary files" -ForegroundColor Green
    }
}

# ============================================================================
# STEP 4: Summary and Git Commands
# ============================================================================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "CLEANUP SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN COMPLETED - No changes were made" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To apply these changes, run:" -ForegroundColor Cyan
    Write-Host "  .\cleanup-repo.ps1" -ForegroundColor White
} else {
    Write-Host "✅ Repository cleanup completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Changes Made:" -ForegroundColor Cyan
    Write-Host "  • Deleted remote branches: $($BranchesToDelete.Count)" -ForegroundColor White
    Write-Host "  • Archived documentation files: $ArchivedCount" -ForegroundColor White
    Write-Host "  • Deleted temporary files: $DeletedTempCount" -ForegroundColor White
    Write-Host ""
    Write-Host "📁 Archived files location:" -ForegroundColor Cyan
    Write-Host "  docs/archive/old-status-docs/" -ForegroundColor White
    Write-Host ""
    Write-Host "🔄 Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Review the changes: git status" -ForegroundColor White
    Write-Host "  2. Commit the cleanup: git add -A && git commit -m 'chore: Clean up repository - archive old docs and remove outdated branches'" -ForegroundColor White
    Write-Host "  3. Push to GitHub: git push" -ForegroundColor White
}

Write-Host ""
Write-Host "✨ Done!" -ForegroundColor Green
Write-Host ""
