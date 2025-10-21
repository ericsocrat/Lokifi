#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Cleanup documentation files - Remove archived, old, and duplicate files

.DESCRIPTION
    This script identifies and removes old/archived documentation files based on:
    1. Files in archive/ folders (completed work, no longer needed)
    2. Files marked as "old-" or "completed-" (archived status files)
    3. Duplicate summary/completion files identified by tests
    4. Files explicitly marked as eliminated in CONSOLIDATION_PROGRESS_REPORT.md

.PARAMETER DryRun
    Show what would be deleted without actually deleting

.PARAMETER Verbose
    Show detailed progress information

.EXAMPLE
    .\cleanup-docs.ps1 -DryRun
    Shows what would be deleted without making changes

.EXAMPLE
    .\cleanup-docs.ps1
    Actually deletes identified files
#>

param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📁 LOKIFI DOCUMENTATION CLEANUP SCRIPT" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No files will be deleted" -ForegroundColor Green
    Write-Host ""
}

# Track statistics
$stats = @{
    TotalScanned = 0
    ToDelete = 0
    Preserved = 0
    DeletedSize = 0
}

$filesToDelete = @()

# ═══════════════════════════════════════════════════════════
# CATEGORY 1: Archive Folders (Completed/Historical Work)
# ═══════════════════════════════════════════════════════════
Write-Host "📦 CATEGORY 1: Archive Folders" -ForegroundColor Magenta
Write-Host "───────────────────────────────────────────────────────────" -ForegroundColor Gray

$archiveFolders = @(
    "docs/archive",
    "docs/reports",
    "docs/testing",
    "docs/project-management",
    "docs/operations",
    "docs/implementation",
    "docs/optimization-reports",
    "docs/features",
    "docs/fixes",
    "docs/components",
    "docs/audit-reports",
    "docs/diagnostics",
    "docs/development",
    "docs/deployment",
    "docs/analysis"
)

foreach ($folder in $archiveFolders) {
    if (Test-Path $folder) {
        $files = Get-ChildItem -Path $folder -Filter "*.md" -Recurse -File
        foreach ($file in $files) {
            $stats.TotalScanned++
            $filesToDelete += $file
            if ($Verbose) {
                Write-Host "  ✓ $($file.FullName.Replace((Get-Location).Path + '\', ''))" -ForegroundColor DarkGray
            }
        }
        Write-Host "  Found $($files.Count) files in $folder" -ForegroundColor Yellow
    }
}

Write-Host ""

# ═══════════════════════════════════════════════════════════
# CATEGORY 2: Root-level Duplicate/Summary Files
# ═══════════════════════════════════════════════════════════
Write-Host "📄 CATEGORY 2: Root-level Completion/Summary Files" -ForegroundColor Magenta
Write-Host "───────────────────────────────────────────────────────────" -ForegroundColor Gray

$rootDuplicatePatterns = @(
    "*_COMPLETE.md",
    "*_SUMMARY.md",
    "*_ANALYSIS.md",
    "*_AUDIT*.md",
    "*_REPORT.md",
    "*_FIXES*.md",
    "*_IMPLEMENTATION*.md",
    "*_PROGRESS*.md",
    "*_STATUS*.md",
    "BATCH_*.md",
    "COMPONENT_*.md",
    "COMPREHENSIVE_*.md",
    "PHASE_*.md",
    "TASK_*.md",
    "SESSION_*.md",
    "WORKFLOW_*.md",
    "*_ENHANCEMENT*.md"
)

# Files to KEEP (essential or newly consolidated)
$keepFiles = @(
    "README.md",
    "INDEX.md",
    "QUICK_START.md",
    "CHECKLISTS.md",
    "CHECKLIST.md",
    "CODING_STANDARDS.md",
    "DEVELOPER_WORKFLOW.md",
    "NAVIGATION_GUIDE.md",
    "QUICK_REFERENCE.md",
    "AI_THEME_GUIDE.md"
)

foreach ($pattern in $rootDuplicatePatterns) {
    $files = Get-ChildItem -Path "docs" -Filter $pattern -File
    foreach ($file in $files) {
        $stats.TotalScanned++
        if ($keepFiles -notcontains $file.Name) {
            $filesToDelete += $file
            if ($Verbose) {
                Write-Host "  ✓ $($file.Name)" -ForegroundColor DarkGray
            }
        } else {
            $stats.Preserved++
            if ($Verbose) {
                Write-Host "  ⊘ $($file.Name) [PRESERVED]" -ForegroundColor Green
            }
        }
    }
}

Write-Host "  Found $($filesToDelete.Count - $stats.ToDelete) root-level files to remove" -ForegroundColor Yellow
$stats.ToDelete = $filesToDelete.Count
Write-Host ""

# ═══════════════════════════════════════════════════════════
# CATEGORY 3: Files Explicitly Marked as Eliminated
# ═══════════════════════════════════════════════════════════
Write-Host "🗑️  CATEGORY 3: Explicitly Eliminated Files" -ForegroundColor Magenta
Write-Host "───────────────────────────────────────────────────────────" -ForegroundColor Gray

$eliminatedFiles = @(
    "docs/SECURITY_ALERT_REPOSITORY.md",
    "docs/INTEGRATION_TESTS_GUIDE.md",
    "docs/START_HERE.md"
)

foreach ($file in $eliminatedFiles) {
    if (Test-Path $file) {
        $fileObj = Get-Item $file
        if ($filesToDelete -notcontains $fileObj) {
            $stats.TotalScanned++
            $filesToDelete += $fileObj
            Write-Host "  ✓ $($fileObj.Name)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""

# ═══════════════════════════════════════════════════════════
# SHOW SUMMARY
# ═══════════════════════════════════════════════════════════
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 SUMMARY" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$stats.ToDelete = $filesToDelete.Count
$totalSize = ($filesToDelete | Measure-Object -Property Length -Sum).Sum / 1MB

Write-Host "  Total Files Scanned:  $($stats.TotalScanned)" -ForegroundColor White
Write-Host "  Files to Delete:      $($stats.ToDelete)" -ForegroundColor Red
Write-Host "  Files Preserved:      $($stats.Preserved)" -ForegroundColor Green
Write-Host "  Space to Reclaim:     $([math]::Round($totalSize, 2)) MB" -ForegroundColor Yellow
Write-Host ""

# ═══════════════════════════════════════════════════════════
# DELETION CONFIRMATION & EXECUTION
# ═══════════════════════════════════════════════════════════
if ($filesToDelete.Count -eq 0) {
    Write-Host "✅ No files to delete!" -ForegroundColor Green
    exit 0
}

if ($DryRun) {
    Write-Host "🔍 DRY RUN COMPLETE - No files were deleted" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Files that WOULD be deleted:" -ForegroundColor Cyan
    Write-Host "───────────────────────────────────────────────────────────" -ForegroundColor Gray
    
    # Group by folder for better readability
    $grouped = $filesToDelete | Group-Object { Split-Path $_.FullName -Parent }
    foreach ($group in $grouped | Sort-Object Name) {
        $folderName = $group.Name.Replace((Get-Location).Path + '\', '')
        Write-Host ""
        Write-Host "  📁 $folderName ($($group.Count) files)" -ForegroundColor Yellow
        foreach ($file in $group.Group | Sort-Object Name) {
            Write-Host "     • $($file.Name)" -ForegroundColor DarkGray
        }
    }
    
    Write-Host ""
    Write-Host "To actually delete these files, run:" -ForegroundColor Cyan
    Write-Host "  .\tools\cleanup-docs.ps1" -ForegroundColor White
    Write-Host ""
    exit 0
}

# ACTUAL DELETION
Write-Host "⚠️  WARNING: About to delete $($filesToDelete.Count) files!" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to cancel, or any key to continue..." -ForegroundColor Red
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host ""

Write-Host "🗑️  Deleting files..." -ForegroundColor Red

$deleted = 0
$failed = 0

foreach ($file in $filesToDelete) {
    try {
        Remove-Item -Path $file.FullName -Force
        $deleted++
        if ($Verbose) {
            Write-Host "  ✓ Deleted: $($file.Name)" -ForegroundColor DarkGray
        } else {
            # Show progress
            if ($deleted % 50 -eq 0) {
                Write-Host "  Progress: $deleted / $($filesToDelete.Count)" -ForegroundColor Yellow
            }
        }
    } catch {
        $failed++
        Write-Host "  ✗ Failed: $($file.Name) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Clean up empty folders
Write-Host ""
Write-Host "🧹 Cleaning up empty folders..." -ForegroundColor Cyan

$emptyFolders = Get-ChildItem -Path "docs" -Directory -Recurse | 
    Where-Object { (Get-ChildItem -Path $_.FullName -Recurse -File).Count -eq 0 } |
    Sort-Object -Property FullName -Descending

foreach ($folder in $emptyFolders) {
    try {
        Remove-Item -Path $folder.FullName -Force -Recurse
        if ($Verbose) {
            Write-Host "  ✓ Removed empty folder: $($folder.Name)" -ForegroundColor DarkGray
        }
    } catch {
        Write-Host "  ✗ Failed to remove folder: $($folder.Name)" -ForegroundColor Red
    }
}

# ═══════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ CLEANUP COMPLETE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Files Deleted:     $deleted" -ForegroundColor Green
Write-Host "  Files Failed:      $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Gray" })
Write-Host "  Empty Folders:     $($emptyFolders.Count) removed" -ForegroundColor Yellow
Write-Host ""

# Show remaining file count
$remainingFiles = (Get-ChildItem -Path "docs" -Filter "*.md" -Recurse -File).Count
Write-Host "📊 Remaining markdown files: $remainingFiles" -ForegroundColor Cyan
Write-Host ""

if ($remainingFiles -lt 100) {
    Write-Host "🎉 SUCCESS! File count is now under 100!" -ForegroundColor Green
} else {
    Write-Host "⚠️  File count is still above 100. Additional cleanup may be needed." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run tests: cd apps/frontend && npm test -- tests/structure/docs-structure.test.ts --run" -ForegroundColor White
Write-Host "  2. Review remaining files: Get-ChildItem docs -Filter '*.md' -Recurse | Sort-Object DirectoryName" -ForegroundColor White
Write-Host "  3. Commit changes: git add docs/ && git commit -m 'docs: Clean up archived and duplicate files'" -ForegroundColor White
Write-Host ""
