#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Quick CI/CD Protection Setup - Enable critical safeguards NOW
    
.DESCRIPTION
    Enables essential protection mechanisms to prevent breaking changes:
    1. Verifies GitHub Actions are active
    2. Tests pre-commit hooks
    3. Checks branch protection status
        $workflows = @()
        $workflows += Get-ChildItem -Path $workflowDir -Filter "*.yml" -File -ErrorAction SilentlyContinue
        $workflows += Get-ChildItem -Path $workflowDir -Filter "*.yaml" -File -ErrorAction SilentlyContinue
    5. Creates protection report
    
.EXAMPLE
    .\enable-ci-protection.ps1
    
.EXAMPLE
    .\enable-ci-protection.ps1 -SkipTests
#>

param(
    [switch]$SkipTests,
    [switch]$Force
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "🛡️ CI/CD PROTECTION SETUP" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host ""

# Import shared helpers if available
try {
    $commonPath = Join-Path $PSScriptRoot "lib/common.psm1"
    if (Test-Path $commonPath) { Import-Module $commonPath -Force }
} catch { }

$checks = @{
    Passed = 0
    Failed = 0
    Warnings = 0
}

# ============================================
# CHECK 1: GitHub Actions Status
    # lokifi.ps1 resides in the tools folder (one level up from ci-cd)
    $lokifiScript = Join-Path $PSScriptRoot "..\lokifi.ps1"
Write-Host "1️⃣ Checking GitHub Actions..." -ForegroundColor Yellow

try {
    $repoRoot = if (Get-Command Get-RepoRoot -ErrorAction SilentlyContinue) { Get-RepoRoot } else { Resolve-Path (Join-Path $PSScriptRoot "..\..") }
    $workflowDir = Join-Path $repoRoot ".github\workflows"
    
    if (Test-Path $workflowDir) {
        $workflows = Get-ChildItem -Path $workflowDir -Filter "*.yml" -ErrorAction SilentlyContinue
        
        Write-Host "   ✅ Found $($workflows.Count) workflow files:" -ForegroundColor Green
        foreach ($workflow in $workflows) {
            Write-Host "      - $($workflow.Name)" -ForegroundColor Gray
        }
        $checks.Passed++
        
        # Check if workflows are enabled on GitHub
        Write-Host ""
        Write-Host "   💡 To verify workflows are active:" -ForegroundColor Cyan
        Write-Host "      https://github.com/ericsocrat/Lokifi/actions" -ForegroundColor Gray
        
    } else {
        Write-Host "   ⚠️  No .github/workflows directory found" -ForegroundColor Yellow
        $checks.Warnings++
    }
} catch {
    Write-Host "   ❌ Error checking workflows: $_" -ForegroundColor Red
    $checks.Failed++
}

Write-Host ""

# ============================================
# CHECK 2: Pre-commit Hooks
# ============================================
Write-Host "2️⃣ Testing Pre-commit Validation..." -ForegroundColor Yellow

try {
    # lokifi.ps1 resides in the tools folder (one level up from ci-cd)
    $lokifiScript = Join-Path $PSScriptRoot "..\lokifi.ps1"
    
    if (Test-Path $lokifiScript) {
        Write-Host "   Testing lokifi.ps1 validate command..." -ForegroundColor Gray
        
        # Quick validation test (dry run)
        $testOutput = & $lokifiScript validate -Quick 2>&1
        
        if ($LASTEXITCODE -eq 0 -or $testOutput -match "validation") {
            Write-Host "   ✅ Pre-commit validation working" -ForegroundColor Green
            $checks.Passed++
        } else {
            Write-Host "   ⚠️  Validation command exists but may have issues" -ForegroundColor Yellow
            $checks.Warnings++
        }
    } else {
        Write-Host "   ❌ lokifi.ps1 not found" -ForegroundColor Red
        $checks.Failed++
    }
} catch {
    Write-Host "   ⚠️  Could not test validation: $_" -ForegroundColor Yellow
    $checks.Warnings++
}

Write-Host ""

# ============================================
# CHECK 3: Branch Protection Status
# ============================================
Write-Host "3️⃣ Checking Branch Protection..." -ForegroundColor Yellow

try {
    # Check if gh CLI is available
    $ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
    
    if ($ghInstalled) {
        Write-Host "   Checking GitHub branch protection..." -ForegroundColor Gray
        
        $protection = gh api repos/ericsocrat/Lokifi/branches/main/protection 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Branch protection is ENABLED on 'main'" -ForegroundColor Green
            $checks.Passed++
        } else {
            Write-Host "   ❌ Branch protection is NOT ENABLED on 'main'" -ForegroundColor Red
            Write-Host ""
            Write-Host "   🚨 CRITICAL: Enable branch protection NOW!" -ForegroundColor Red
            Write-Host "   📋 Steps:" -ForegroundColor Yellow
            Write-Host "      1. Go to: https://github.com/ericsocrat/Lokifi/settings/branches" -ForegroundColor Gray
            Write-Host "      2. Click 'Add branch protection rule'" -ForegroundColor Gray
            Write-Host "      3. Branch name pattern: main" -ForegroundColor Gray
            Write-Host "      4. Check: 'Require status checks to pass before merging'" -ForegroundColor Gray
            Write-Host "      5. Check: 'Require branches to be up to date'" -ForegroundColor Gray
            Write-Host "      6. Save changes" -ForegroundColor Gray
            $checks.Failed++
        }
    } else {
        Write-Host "   ⚠️  GitHub CLI (gh) not installed - cannot check automatically" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   📋 Manual check required:" -ForegroundColor Cyan
        Write-Host "      Visit: https://github.com/ericsocrat/Lokifi/settings/branches" -ForegroundColor Gray
        Write-Host "      Verify: 'main' branch has protection rules" -ForegroundColor Gray
        $checks.Warnings++
    }
} catch {
    Write-Host "   ⚠️  Could not check branch protection: $_" -ForegroundColor Yellow
    $checks.Warnings++
}

Write-Host ""

# ============================================
# CHECK 4: Test Coverage
# ============================================
Write-Host "4️⃣ Checking Test Coverage..." -ForegroundColor Yellow

if (-not $SkipTests) {
    try {
        # Resolve repository root and service paths
        $repoRoot = if (Get-Command Get-RepoRoot -ErrorAction SilentlyContinue) { Get-RepoRoot } else { Resolve-Path (Join-Path $PSScriptRoot "..\..") }
        
        # Backend tests
        $backendDir = Join-Path $repoRoot "backend"
        
        if (Test-Path $backendDir) {
            Push-Location $backendDir
            
            $testFiles = Get-ChildItem -Path "tests" -Filter "test_*.py" -Recurse -ErrorAction SilentlyContinue
            $testCount = $testFiles.Count
            
            Write-Host "   Backend test files: $testCount" -ForegroundColor Gray
            
            if ($testCount -gt 50) {
                Write-Host "   ✅ Good test coverage (50+ test files)" -ForegroundColor Green
                $checks.Passed++
            } elseif ($testCount -gt 20) {
                Write-Host "   ⚠️  Moderate coverage ($testCount test files)" -ForegroundColor Yellow
                Write-Host "      Recommendation: Add more tests" -ForegroundColor Gray
                $checks.Warnings++
            } else {
                Write-Host "   ❌ Low coverage ($testCount test files)" -ForegroundColor Red
                Write-Host "      🎯 Goal: 50+ test files for better protection" -ForegroundColor Gray
                $checks.Failed++
            }
            
            Pop-Location
        }
        
    # Frontend tests
    $frontendDir = Join-Path $repoRoot "frontend"
        
        if (Test-Path $frontendDir) {
            Push-Location $frontendDir
            
            $testFiles = Get-ChildItem -Path "." -Filter "*.test.*" -Recurse -ErrorAction SilentlyContinue
            $testCount = $testFiles.Count
            
            Write-Host "   Frontend test files: $testCount" -ForegroundColor Gray
            
            if ($testCount -gt 20) {
                Write-Host "   ✅ Good frontend test coverage" -ForegroundColor Green
            } elseif ($testCount -gt 5) {
                Write-Host "   ⚠️  Moderate frontend coverage" -ForegroundColor Yellow
            } else {
                Write-Host "   ⚠️  Low frontend coverage" -ForegroundColor Yellow
                Write-Host "      💡 Consider adding component tests" -ForegroundColor Gray
            }
            
            Pop-Location
        }
        
    } catch {
        Write-Host "   ⚠️  Could not analyze test coverage: $_" -ForegroundColor Yellow
        $checks.Warnings++
    }
} else {
    Write-Host "   ⏭️  Skipped (use without -SkipTests to check)" -ForegroundColor Gray
}

Write-Host ""

# ============================================
# CHECK 5: CI Configuration Files
# ============================================
Write-Host "5️⃣ Validating CI Configuration..." -ForegroundColor Yellow

$requiredWorkflows = @(
    "ci-cd.yml",
    "backend-ci.yml", 
    "frontend-ci.yml"
)

$foundWorkflows = 0
$workflowDir = Join-Path $PSScriptRoot "..\..\.github\workflows"

foreach ($workflow in $requiredWorkflows) {
    $workflowPath = Join-Path $workflowDir $workflow
    
    if (Test-Path $workflowPath) {
        Write-Host "   ✅ $workflow" -ForegroundColor Green
        $foundWorkflows++
    } else {
        Write-Host "   ⚠️  $workflow missing" -ForegroundColor Yellow
    }
}

if ($foundWorkflows -eq $requiredWorkflows.Count) {
    Write-Host ""
    Write-Host "   ✅ All core workflows configured" -ForegroundColor Green
    $checks.Passed++
} else {
    Write-Host ""
    Write-Host "   ⚠️  Some workflows missing (found $foundWorkflows/$($requiredWorkflows.Count))" -ForegroundColor Yellow
    $checks.Warnings++
}

Write-Host ""

# ============================================
# SUMMARY & RECOMMENDATIONS
# ============================================
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host ""
Write-Host "📊 PROTECTION STATUS SUMMARY" -ForegroundColor Cyan
Write-Host ""

$total = $checks.Passed + $checks.Failed + $checks.Warnings
$passRate = if ($total -gt 0) { [math]::Round(($checks.Passed / $total) * 100, 1) } else { 0 }

Write-Host "   ✅ Passed:   $($checks.Passed)" -ForegroundColor Green
Write-Host "   ⚠️  Warnings: $($checks.Warnings)" -ForegroundColor Yellow
Write-Host "   ❌ Failed:   $($checks.Failed)" -ForegroundColor Red
Write-Host ""
Write-Host "   Overall: $passRate% configured" -ForegroundColor $(if ($passRate -ge 80) { "Green" } elseif ($passRate -ge 60) { "Yellow" } else { "Red" })

Write-Host ""
Write-Host "🎯 PRIORITY ACTIONS" -ForegroundColor Yellow
Write-Host ""

$actions = @()

if ($checks.Failed -gt 0) {
    Write-Host "🔴 HIGH PRIORITY:" -ForegroundColor Red
    Write-Host ""
    
    # Check specific failures and provide actions
    $protection = gh api repos/ericsocrat/Lokifi/branches/main/protection 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   1. Enable branch protection on 'main' branch" -ForegroundColor White
        Write-Host "      → https://github.com/ericsocrat/Lokifi/settings/branches" -ForegroundColor Gray
        Write-Host ""
    }
    
    if ($testCount -lt 20) {
        Write-Host "   2. Increase test coverage (current: $testCount test files)" -ForegroundColor White
        Write-Host "      → Write tests for critical APIs and components" -ForegroundColor Gray
        Write-Host ""
    }
}

if ($checks.Warnings -gt 0) {
    Write-Host "🟡 RECOMMENDED:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   • Review all CI workflows are active on GitHub" -ForegroundColor White
    Write-Host "   • Add more test coverage (target: 60%+)" -ForegroundColor White
    Write-Host "   • Install GitHub CLI (gh) for automated checks" -ForegroundColor White
    Write-Host ""
}

Write-Host "📚 DOCUMENTATION:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Complete guide: docs\guides\CONTINUOUS_INTEGRATION_PROTECTION.md" -ForegroundColor Gray
Write-Host ""

# ============================================
# AUTO-FIX OPTIONS
# ============================================
if ($Force -and $checks.Failed -gt 0) {
    Write-Host "🔧 AUTO-FIX ATTEMPT" -ForegroundColor Cyan
    Write-Host ""
    
    $ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
    
    if ($ghInstalled) {
        Write-Host "Attempting to enable branch protection via GitHub CLI..." -ForegroundColor Yellow
        
        try {
            # Enable branch protection with minimal settings
            $protection = gh api repos/ericsocrat/Lokifi/branches/main/protection `
                --method PUT `
                --field required_status_checks='{"strict":true,"contexts":[]}' `
                --field enforce_admins=false `
                --field required_pull_request_reviews=null `
                --field restrictions=null 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ Branch protection enabled!" -ForegroundColor Green
            } else {
                Write-Host "   ❌ Could not enable automatically: $protection" -ForegroundColor Red
                Write-Host "   📋 Manual setup required" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   ❌ Error: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "   ⚠️  GitHub CLI not installed - cannot auto-fix" -ForegroundColor Yellow
        Write-Host "   Install: https://cli.github.com" -ForegroundColor Gray
    }
    
    Write-Host ""
}

# ============================================
# QUICK COMMANDS REFERENCE
# ============================================
Write-Host "⚡ QUICK COMMANDS" -ForegroundColor Cyan
Write-Host ""
Write-Host "   .\lokifi.ps1 validate       # Test pre-commit hooks" -ForegroundColor Gray
Write-Host "   .\lokifi.ps1 test           # Run test suite" -ForegroundColor Gray
Write-Host "   .\lokifi.ps1 analyze        # Check code quality" -ForegroundColor Gray
Write-Host "   .\lokifi.ps1 audit          # Full system audit" -ForegroundColor Gray
Write-Host ""

# Exit with appropriate code
if ($checks.Failed -gt 0) {
    exit 1
} elseif ($checks.Warnings -gt 0) {
    exit 0
} else {
    Write-Host "🎉 All protection mechanisms configured correctly!" -ForegroundColor Green
    Write-Host ""
    exit 0
}
