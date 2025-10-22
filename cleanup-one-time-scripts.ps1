#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Cleanup one-time and legacy scripts from the repository

.DESCRIPTION
    Removes temporary analysis scripts, empty files, and legacy one-time fix scripts
    that are no longer needed. All files are preserved in Git history.

.PARAMETER DryRun
    Show what would be deleted without actually deleting

.EXAMPLE
    .\cleanup-one-time-scripts.ps1 -DryRun
    .\cleanup-one-time-scripts.ps1
#>

param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "`n🧹 ONE-TIME SCRIPTS CLEANUP`n" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Gray

if ($DryRun) {
    Write-Host "⚠️  DRY RUN MODE - No files will be deleted`n" -ForegroundColor Yellow
}

$deletedCount = 0
$deletedSize = 0

function Remove-ItemSafe {
    param(
        [string]$Path,
        [string]$Description,
        [switch]$Recurse
    )

    if (-not (Test-Path $Path)) {
        Write-Host "  ⏭️  Skip: $Description (not found)" -ForegroundColor Gray
        return
    }

    $item = Get-Item $Path
    $size = 0

    if ($item.PSIsContainer) {
        $size = (Get-ChildItem $Path -Recurse -File | Measure-Object -Property Length -Sum).Sum
        if ($null -eq $size) { $size = 0 }
    } else {
        $size = $item.Length
    }

    $sizeKB = [math]::Round($size / 1KB, 2)

    if ($DryRun) {
        Write-Host "  🔍 Would delete: $Description ($sizeKB KB)" -ForegroundColor Yellow
    } else {
        if ($Recurse) {
            Remove-Item $Path -Recurse -Force
        } else {
            Remove-Item $Path -Force
        }
        Write-Host "  ✅ Deleted: $Description ($sizeKB KB)" -ForegroundColor Green
        $script:deletedCount++
        $script:deletedSize += $size
    }
}

# 1. Root directory analysis scripts
Write-Host "📁 Cleaning root directory..." -ForegroundColor Cyan
Remove-ItemSafe "api-examples-analysis.js" "API examples analysis script"
Remove-ItemSafe "check-headings.js" "Heading checker script"
Remove-ItemSafe "quick-analysis.js" "Quick analysis script"
Remove-ItemSafe "test-regex.js" "Regex test script"
Remove-ItemSafe "test-todos.tmp" "TODO test file"

Write-Host ""

# 2. Empty script files
Write-Host "📁 Cleaning empty script files..." -ForegroundColor Cyan
Remove-ItemSafe "tools/scripts/fix-code-block-tags.ps1" "Empty fix script (v1)"
Remove-ItemSafe "tools/scripts/fix-code-block-tags-v2.ps1" "Empty fix script (v2)"
Remove-ItemSafe "tools/scripts/utilities/check-theme.ps1" "Empty theme checker"

Write-Host ""

# 3. Legacy scripts folder
Write-Host "📁 Cleaning legacy scripts..." -ForegroundColor Cyan
Remove-ItemSafe "tools/scripts/legacy" "Legacy scripts folder" -Recurse

Write-Host ""

# 4. Archive folders
Write-Host "📁 Cleaning archive folders..." -ForegroundColor Cyan
Remove-ItemSafe "tools/scripts/archive/consolidated-fix-scripts-20251008-101839" "Consolidated fix scripts archive" -Recurse
Remove-ItemSafe "tools/scripts/archive/obsolete-scripts-backup-20251008-100828" "Obsolete scripts backup" -Recurse
Remove-ItemSafe "tools/scripts/archive/old-startup-scripts-20251008-130046" "Old startup scripts backup" -Recurse
Remove-ItemSafe "tools/scripts/archive/obsolete-ci-cd-2025-10-19" "Obsolete CI/CD configs" -Recurse

Write-Host ""

# 5. Old reports (optional - review first)
Write-Host "📁 Handling old reports..." -ForegroundColor Cyan
if (Test-Path "tools/cicd-optimization-report.md") {
    $content = Get-Content "tools/cicd-optimization-report.md" -Raw
    if ($content.Length -lt 2000) {
        # Small file, likely outdated
        Remove-ItemSafe "tools/cicd-optimization-report.md" "Old CI/CD optimization report"
    } else {
        Write-Host "  ⚠️  Keeping: cicd-optimization-report.md (review manually)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Gray

if ($DryRun) {
    Write-Host "`n🔍 DRY RUN COMPLETE - No files were deleted" -ForegroundColor Yellow
    Write-Host "Run without -DryRun to actually delete files`n" -ForegroundColor Gray
} else {
    $totalSizeKB = [math]::Round($deletedSize / 1KB, 2)
    $totalSizeMB = [math]::Round($deletedSize / 1MB, 2)

    Write-Host "`n✅ CLEANUP COMPLETE!" -ForegroundColor Green
    Write-Host "   Deleted: $deletedCount items" -ForegroundColor White
    Write-Host "   Freed: $totalSizeKB KB ($totalSizeMB MB)`n" -ForegroundColor White

    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Review changes: git status" -ForegroundColor White
    Write-Host "   2. Commit: git commit -m 'chore: Remove one-time analysis and legacy scripts'" -ForegroundColor White
    Write-Host "   3. Push: git push`n" -ForegroundColor White
}
