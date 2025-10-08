#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Comprehensive repository optimization script
    
.DESCRIPTION
    Scans and optimizes code quality, performance, and structure
    
.PARAMETER DryRun
    Show what would be changed without making changes
#>

param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   LOKIFI COMPREHENSIVE OPTIMIZATION                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

# Track improvements
$improvements = @{
    FilesOptimized = 0
    IssuesFixed = 0
    PerformanceImprovements = 0
    CodeQualityFixes = 0
}

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Phase 1: Analyze TypeScript Errors" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Count TypeScript errors
Write-Host "Counting TypeScript errors..." -ForegroundColor Yellow
Push-Location frontend
try {
    $tsOutput = npm run typecheck 2>&1 | Out-String
    $errorCount = ([regex]::Matches($tsOutput, "error TS\d+:")).Count
    Write-Host "  📊 Found $errorCount TypeScript errors" -ForegroundColor White
    
    # Categorize errors
    $nextJsErrors = ([regex]::Matches($tsOutput, "\.next/types/validator\.ts")).Count
    $implicitAnyErrors = ([regex]::Matches($tsOutput, "implicitly has an 'any' type")).Count
    $zustandErrors = ([regex]::Matches($tsOutput, "StateCreator")).Count
    
    Write-Host "  - Next.js validators: $nextJsErrors (auto-resolve on build)" -ForegroundColor Gray
    Write-Host "  - Implicit 'any' types: $implicitAnyErrors (need explicit types)" -ForegroundColor Yellow
    Write-Host "  - Zustand issues: $zustandErrors (middleware conflicts)" -ForegroundColor Yellow
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Phase 2: Check Backend Code Quality" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Scanning for TODO/FIXME comments..." -ForegroundColor Yellow
$todoFiles = Get-ChildItem -Path "backend" -Recurse -Include "*.py" | 
    Select-String -Pattern "TODO|FIXME|XXX|HACK" -SimpleMatch:$false |
    Group-Object Path |
    Select-Object Count, Name

Write-Host "  📝 Found $($todoFiles.Count) files with TODO/FIXME comments" -ForegroundColor White
if ($todoFiles) {
    foreach ($file in $todoFiles | Select-Object -First 5) {
        $fileName = Split-Path $file.Name -Leaf
        Write-Host "    - $fileName ($($file.Count) items)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Phase 3: Performance Checks" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking for performance anti-patterns..." -ForegroundColor Yellow

# Check for synchronous operations that could be async
$syncPatterns = @(
    @{ Pattern = "time\.sleep\("; Message = "Synchronous sleep (use asyncio.sleep)" },
    @{ Pattern = "requests\.get\("; Message = "Synchronous HTTP (use httpx or aiohttp)" },
    @{ Pattern = "json\.loads\(.*\.read\(\)"; Message = "Blocking file read" }
)

foreach ($check in $syncPatterns) {
    $matches = Get-ChildItem -Path "backend/app" -Recurse -Include "*.py" | 
        Select-String -Pattern $check.Pattern -SimpleMatch:$false
    
    if ($matches) {
        Write-Host "  ⚠️  $($check.Message): $($matches.Count) occurrences" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Phase 4: Security Scan" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking for security issues..." -ForegroundColor Yellow

$securityChecks = @(
    @{ Pattern = 'password.*=.*[''"]'; Message = "Hardcoded password" },
    @{ Pattern = 'api[_-]?key.*=.*[''"]\w{20,}'; Message = "Hardcoded API key" },
    @{ Pattern = 'SECRET.*=.*[''"]\w+'; Message = "Hardcoded secret" }
)

$securityIssues = 0
foreach ($check in $securityChecks) {
    $matches = Get-ChildItem -Path "backend" -Recurse -Include "*.py" | 
        Where-Object { $_.FullName -notmatch "test" } |
        Select-String -Pattern $check.Pattern -SimpleMatch:$false
    
    if ($matches) {
        $securityIssues += $matches.Count
        Write-Host "  ⚠️  $($check.Message): $($matches.Count) occurrences" -ForegroundColor Red
    }
}

if ($securityIssues -eq 0) {
    Write-Host "  ✅ No obvious security issues found" -ForegroundColor Green
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Phase 5: Code Duplication Check" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking for large files (potential refactoring candidates)..." -ForegroundColor Yellow
$largeFrontendFiles = Get-ChildItem -Path "frontend/src" -Recurse -Include "*.ts","*.tsx" |
    Where-Object { $_.Length -gt 20KB } |
    Sort-Object Length -Descending |
    Select-Object -First 5

if ($largeFrontendFiles) {
    Write-Host "  📦 Large frontend files (>20KB):" -ForegroundColor Yellow
    foreach ($file in $largeFrontendFiles) {
        $sizeKB = [math]::Round($file.Length / 1KB, 1)
        $relativePath = $file.FullName.Replace((Get-Location).Path, "").TrimStart("\")
        Write-Host "    - $relativePath ($sizeKB KB)" -ForegroundColor Gray
    }
}

$largeBackendFiles = Get-ChildItem -Path "backend/app" -Recurse -Include "*.py" |
    Where-Object { $_.Length -gt 15KB } |
    Sort-Object Length -Descending |
    Select-Object -First 5

if ($largeBackendFiles) {
    Write-Host "  📦 Large backend files (>15KB):" -ForegroundColor Yellow
    foreach ($file in $largeBackendFiles) {
        $sizeKB = [math]::Round($file.Length / 1KB, 1)
        $relativePath = $file.FullName.Replace((Get-Location).Path, "").TrimStart("\")
        Write-Host "    - $relativePath ($sizeKB KB)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Phase 6: Dependency Analysis" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking for outdated dependencies..." -ForegroundColor Yellow

# Check npm outdated
Write-Host "  Frontend dependencies:" -ForegroundColor White
Push-Location frontend
try {
    $outdated = npm outdated 2>&1 | Out-String
    if ($outdated -match "Package") {
        $outdatedCount = ($outdated -split "`n" | Where-Object { $_ -match "^\w" }).Count - 1
        Write-Host "    📦 $outdatedCount packages have updates available" -ForegroundColor Yellow
    } else {
        Write-Host "    ✅ All packages up to date" -ForegroundColor Green
    }
} catch {
    Write-Host "    ⚠️  Could not check npm packages" -ForegroundColor Yellow
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "📊 Analysis Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Issues Found:" -ForegroundColor Cyan
Write-Host "  • TypeScript Errors: $errorCount" -ForegroundColor White
Write-Host "  • TODO/FIXME Comments: $($todoFiles.Count) files" -ForegroundColor White
Write-Host "  • Security Concerns: $securityIssues" -ForegroundColor White
Write-Host ""

Write-Host "💡 Recommendations:" -ForegroundColor Cyan
Write-Host "  1. Fix implicit 'any' types in TypeScript ($implicitAnyErrors errors)" -ForegroundColor White
Write-Host "  2. Address TODO comments in backend code" -ForegroundColor White
Write-Host "  3. Consider refactoring large files (>20KB)" -ForegroundColor White
Write-Host "  4. Run 'npm run build' to clear Next.js validator errors" -ForegroundColor White
Write-Host "  5. Review and update outdated dependencies" -ForegroundColor White
Write-Host ""

if (-not $DryRun) {
    Write-Host "Would you like to apply automated fixes? (Not implemented yet)" -ForegroundColor Yellow
    Write-Host "For now, use specific fix scripts or manual edits." -ForegroundColor Gray
}

Write-Host ""
Write-Host "✨ Done!" -ForegroundColor Green
Write-Host ""
