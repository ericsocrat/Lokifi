#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Pre-commit hook automation script
.DESCRIPTION
    Runs automated checks before Git commits:
    - Code quality analysis
    - TypeScript type checking
    - Linting and formatting
    - Security scanning
    - TODO tracking
.NOTES
    Created: October 8, 2025
    Part of Session 4+ automation enhancement
#>

param(
    [switch]$SkipTypeCheck,
    [switch]$SkipAnalysis,
    [switch]$Quick
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "🔍 Pre-Commit Checks" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray
Write-Host ""

$allPassed = $true

# Check 1: TypeScript Type Check (unless skipped)
if (-not $SkipTypeCheck -and -not $Quick) {
    Write-Host "📘 TypeScript Type Check..." -ForegroundColor Yellow
    Push-Location (Join-Path $projectRoot "frontend")
    try {
        $result = npm run typecheck 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ TypeScript check passed" -ForegroundColor Green
        } else {
            Write-Host "  ❌ TypeScript errors found" -ForegroundColor Red
            Write-Host $result | Out-String
            $allPassed = $false
        }
    } catch {
        Write-Host "  ⚠️  TypeScript check failed to run" -ForegroundColor Yellow
        $allPassed = $false
    } finally {
        Pop-Location
    }
    Write-Host ""
}

# Check 2: Lint Staged Files (always)
Write-Host "🧹 Linting Staged Files..." -ForegroundColor Yellow
Push-Location (Join-Path $projectRoot "frontend")
try {
    $result = npx lint-staged 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Linting passed" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Linting errors found" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "  ⚠️  Linting failed to run" -ForegroundColor Yellow
} finally {
    Pop-Location
}
Write-Host ""

# Check 3: Security Scan for Sensitive Data (always)
Write-Host "🔒 Security Scan..." -ForegroundColor Yellow
$stagedFiles = git diff --cached --name-only
$securityIssues = @()

foreach ($file in $stagedFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw -ErrorAction SilentlyContinue
        if ($content) {
            # Check for common secrets
            if ($content -match '(?i)(api[_-]?key|secret[_-]?key|password|token|auth[_-]?token)\s*[:=]\s*[''"]?[a-zA-Z0-9_\-]{20,}') {
                $securityIssues += "  ⚠️  Potential secret in: $file"
            }
            # Check for hardcoded IPs
            if ($content -match '\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}' -and $file -notmatch '\.md$') {
                $securityIssues += "  ⚠️  Hardcoded IP in: $file"
            }
        }
    }
}

if ($securityIssues.Count -gt 0) {
    Write-Host "  ❌ Security issues detected:" -ForegroundColor Red
    $securityIssues | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
    $allPassed = $false
} else {
    Write-Host "  ✅ No security issues detected" -ForegroundColor Green
}
Write-Host ""

# Check 4: TODO Tracking (informational only)
if (-not $Quick) {
    Write-Host "📝 TODO Tracking..." -ForegroundColor Yellow
    $todoCount = 0
    foreach ($file in $stagedFiles) {
        if (Test-Path $file -and $file -match '\.(ts|tsx|py|js|jsx)$') {
            $todos = Select-String -Path $file -Pattern "TODO|FIXME|XXX|HACK" -ErrorAction SilentlyContinue
            if ($todos) {
                $todoCount += $todos.Count
            }
        }
    }
    
    if ($todoCount -gt 0) {
        Write-Host "  📋 Found $todoCount TODO comments in staged files" -ForegroundColor Yellow
        Write-Host "  💡 Consider addressing before commit or adding to backlog" -ForegroundColor Gray
    } else {
        Write-Host "  ✅ No TODO comments in staged files" -ForegroundColor Green
    }
    Write-Host ""
}

# Check 5: Quick Analysis (if not skipped)
if (-not $SkipAnalysis -and -not $Quick) {
    Write-Host "📊 Quick Code Analysis..." -ForegroundColor Yellow
    
    # Check for console.log in staged TypeScript files
    $consoleLogFiles = @()
    foreach ($file in $stagedFiles) {
        if ($file -match '\.tsx?$' -and $file -notmatch 'logger\.ts' -and (Test-Path $file)) {
            $hasConsoleLog = Select-String -Path $file -Pattern 'console\.(log|debug|info|warn|error)' -Quiet
            if ($hasConsoleLog) {
                $consoleLogFiles += $file
            }
        }
    }
    
    if ($consoleLogFiles.Count -gt 0) {
        Write-Host "  ⚠️  console.log found in:" -ForegroundColor Yellow
        $consoleLogFiles | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
        Write-Host "  💡 Consider using logger utility instead" -ForegroundColor Gray
    } else {
        Write-Host "  ✅ No console.log statements" -ForegroundColor Green
    }
    Write-Host ""
}

# Summary
Write-Host "=" * 50 -ForegroundColor Gray
if ($allPassed) {
    Write-Host "✅ All checks passed! Ready to commit." -ForegroundColor Green
    Write-Host ""
    exit 0
} else {
    Write-Host "❌ Some checks failed. Please fix issues before committing." -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 To skip checks (not recommended):" -ForegroundColor Yellow
    Write-Host "   git commit --no-verify" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
