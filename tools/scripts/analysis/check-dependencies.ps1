#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automated dependency update checker
.DESCRIPTION
    Checks for outdated dependencies and security vulnerabilities
    - Frontend npm packages
    - Backend Python packages
    - Security vulnerability scan
    - Version compatibility check
.NOTES
    Created: October 8, 2025
    Part of automation enhancement
#>

param(
    [switch]$AutoUpdate,  # Automatically update safe packages
    [switch]$SecurityOnly,  # Only check security vulnerabilities
    [switch]$Detailed  # Show detailed version information
)

Write-Host ""
Write-Host "📦 Dependency Update Checker" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray
Write-Host ""

$projectRoot = $PSScriptRoot | Split-Path | Split-Path
$updateReport = @{
    Frontend = @{
        Outdated = @()
        Vulnerabilities = 0
    }
    Backend = @{
        Outdated = @()
        Vulnerabilities = 0
    }
}

# Frontend Dependencies
Write-Host "🎨 Checking Frontend Dependencies..." -ForegroundColor Yellow
Write-Host ""

Push-Location (Join-Path $projectRoot "frontend")
try {
    # Check for outdated packages
    if (-not $SecurityOnly) {
        Write-Host "  📋 Checking for outdated packages..." -ForegroundColor Cyan
        $outdated = npm outdated --json 2>$null | ConvertFrom-Json
        
        if ($outdated) {
            $outdatedCount = ($outdated.PSObject.Properties).Count
            Write-Host "  ⚠️  Found $outdatedCount outdated packages" -ForegroundColor Yellow
            
            if ($Detailed) {
                Write-Host ""
                $outdated.PSObject.Properties | ForEach-Object {
                    $pkg = $_.Value
                    $name = $_.Name
                    Write-Host "     $name" -ForegroundColor White
                    Write-Host "       Current: $($pkg.current)" -ForegroundColor Gray
                    Write-Host "       Wanted:  $($pkg.wanted)" -ForegroundColor Cyan
                    Write-Host "       Latest:  $($pkg.latest)" -ForegroundColor Green
                    Write-Host ""
                }
            }
            
            $updateReport.Frontend.Outdated = $outdated.PSObject.Properties.Name
        } else {
            Write-Host "  ✅ All packages up to date" -ForegroundColor Green
        }
    }
    
    # Security audit
    Write-Host ""
    Write-Host "  🔒 Running security audit..." -ForegroundColor Cyan
    $auditResult = npm audit --json 2>$null | ConvertFrom-Json
    
    if ($auditResult -and $auditResult.metadata) {
        $vulns = $auditResult.metadata.vulnerabilities
        $total = $vulns.total
        
        if ($total -gt 0) {
            Write-Host "  ❌ Found $total vulnerabilities:" -ForegroundColor Red
            if ($vulns.critical -gt 0) { Write-Host "     Critical: $($vulns.critical)" -ForegroundColor Red }
            if ($vulns.high -gt 0) { Write-Host "     High: $($vulns.high)" -ForegroundColor Yellow }
            if ($vulns.moderate -gt 0) { Write-Host "     Moderate: $($vulns.moderate)" -ForegroundColor Yellow }
            if ($vulns.low -gt 0) { Write-Host "     Low: $($vulns.low)" -ForegroundColor Gray }
            
            $updateReport.Frontend.Vulnerabilities = $total
            
            Write-Host ""
            Write-Host "  💡 To fix: npm audit fix" -ForegroundColor Cyan
            if ($vulns.critical -gt 0 -or $vulns.high -gt 0) {
                Write-Host "  ⚠️  For breaking changes: npm audit fix --force" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ✅ No security vulnerabilities" -ForegroundColor Green
        }
    }
    
    # Auto-update if requested
    if ($AutoUpdate -and $outdated -and -not $SecurityOnly) {
        Write-Host ""
        Write-Host "  🔄 Auto-updating safe packages..." -ForegroundColor Cyan
        npm update
        Write-Host "  ✅ Packages updated" -ForegroundColor Green
    }
    
} catch {
    Write-Host "  ❌ Error checking frontend dependencies" -ForegroundColor Red
    Write-Host "     $_" -ForegroundColor Gray
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "=" * 50 -ForegroundColor Gray
Write-Host ""

# Backend Dependencies
Write-Host "⚙️  Checking Backend Dependencies..." -ForegroundColor Yellow
Write-Host ""

Push-Location (Join-Path $projectRoot "backend")
try {
    # Check if pip-audit is available
    $pipAuditAvailable = Get-Command pip-audit -ErrorAction SilentlyContinue
    
    if (-not $SecurityOnly) {
        Write-Host "  📋 Checking for outdated packages..." -ForegroundColor Cyan
        $outdatedPip = pip list --outdated --format=json 2>$null | ConvertFrom-Json
        
        if ($outdatedPip -and $outdatedPip.Count -gt 0) {
            Write-Host "  ⚠️  Found $($outdatedPip.Count) outdated packages" -ForegroundColor Yellow
            
            if ($Detailed) {
                Write-Host ""
                $outdatedPip | ForEach-Object {
                    Write-Host "     $($_.name)" -ForegroundColor White
                    Write-Host "       Current: $($_.version)" -ForegroundColor Gray
                    Write-Host "       Latest:  $($_.latest_version)" -ForegroundColor Green
                    Write-Host ""
                }
            }
            
            $updateReport.Backend.Outdated = $outdatedPip.name
        } else {
            Write-Host "  ✅ All packages up to date" -ForegroundColor Green
        }
    }
    
    # Security audit
    Write-Host ""
    Write-Host "  🔒 Running security audit..." -ForegroundColor Cyan
    
    if ($pipAuditAvailable) {
        $auditOutput = pip-audit --format json 2>$null
        if ($auditOutput) {
            $auditData = $auditOutput | ConvertFrom-Json
            $vulnCount = $auditData.dependencies.Count
            
            if ($vulnCount -gt 0) {
                Write-Host "  ❌ Found $vulnCount vulnerabilities" -ForegroundColor Red
                
                if ($Detailed) {
                    $auditData.dependencies | ForEach-Object {
                        Write-Host "     $($_.name) $($_.version)" -ForegroundColor White
                        Write-Host "       Vulnerability: $($_.vulns[0].id)" -ForegroundColor Yellow
                    }
                }
                
                $updateReport.Backend.Vulnerabilities = $vulnCount
            } else {
                Write-Host "  ✅ No security vulnerabilities" -ForegroundColor Green
            }
        } else {
            Write-Host "  ✅ No security vulnerabilities" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️  pip-audit not installed" -ForegroundColor Yellow
        Write-Host "     Install: pip install pip-audit" -ForegroundColor Gray
    }
    
    # Auto-update if requested
    if ($AutoUpdate -and $outdatedPip -and $outdatedPip.Count -gt 0 -and -not $SecurityOnly) {
        Write-Host ""
        Write-Host "  🔄 Auto-updating safe packages..." -ForegroundColor Cyan
        pip install --upgrade pip
        $outdatedPip | ForEach-Object {
            pip install --upgrade $_.name
        }
        Write-Host "  ✅ Packages updated" -ForegroundColor Green
    }
    
} catch {
    Write-Host "  ❌ Error checking backend dependencies" -ForegroundColor Red
    Write-Host "     $_" -ForegroundColor Gray
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "=" * 50 -ForegroundColor Gray
Write-Host ""

# Summary Report
Write-Host "📊 Dependency Status Summary" -ForegroundColor Cyan
Write-Host ""

$totalOutdated = $updateReport.Frontend.Outdated.Count + $updateReport.Backend.Outdated.Count
$totalVulns = $updateReport.Frontend.Vulnerabilities + $updateReport.Backend.Vulnerabilities

Write-Host "  Frontend:" -ForegroundColor White
Write-Host "    Outdated: $($updateReport.Frontend.Outdated.Count) packages" -ForegroundColor $(if ($updateReport.Frontend.Outdated.Count -gt 0) { "Yellow" } else { "Green" })
Write-Host "    Vulnerabilities: $($updateReport.Frontend.Vulnerabilities)" -ForegroundColor $(if ($updateReport.Frontend.Vulnerabilities -gt 0) { "Red" } else { "Green" })
Write-Host ""

Write-Host "  Backend:" -ForegroundColor White
Write-Host "    Outdated: $($updateReport.Backend.Outdated.Count) packages" -ForegroundColor $(if ($updateReport.Backend.Outdated.Count -gt 0) { "Yellow" } else { "Green" })
Write-Host "    Vulnerabilities: $($updateReport.Backend.Vulnerabilities)" -ForegroundColor $(if ($updateReport.Backend.Vulnerabilities -gt 0) { "Red" } else { "Green" })
Write-Host ""

Write-Host "  Total:" -ForegroundColor White
Write-Host "    Outdated: $totalOutdated packages" -ForegroundColor $(if ($totalOutdated -gt 0) { "Yellow" } else { "Green" })
Write-Host "    Vulnerabilities: $totalVulns" -ForegroundColor $(if ($totalVulns -gt 0) { "Red" } else { "Green" })
Write-Host ""

# Recommendations
if ($totalVulns -gt 0) {
    Write-Host "🚨 SECURITY ACTION REQUIRED!" -ForegroundColor Red
    Write-Host "   Run: npm audit fix (frontend)" -ForegroundColor Yellow
    Write-Host "   Run: pip-audit (backend)" -ForegroundColor Yellow
    Write-Host ""
}

if ($totalOutdated -gt 5) {
    Write-Host "💡 Update Recommendation:" -ForegroundColor Cyan
    Write-Host "   Run this script with -AutoUpdate flag" -ForegroundColor White
    Write-Host "   Or manually: npm update && pip install --upgrade -r requirements.txt" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "✅ Dependency check complete!" -ForegroundColor Green
Write-Host ""

# Exit with error code if vulnerabilities found
if ($totalVulns -gt 0) {
    exit 1
}
exit 0
