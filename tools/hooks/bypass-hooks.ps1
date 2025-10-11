#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Emergency hook bypass utility
    
.DESCRIPTION
    Allows bypassing Git hooks in emergency situations.
    Use very carefully - bypasses all quality gates!
    
.EXAMPLE
    .\bypass-hooks.ps1 -Commit "emergency fix"
    
.EXAMPLE  
    .\bypass-hooks.ps1 -Push
#>

param(
    [string]$Commit,
    [switch]$Push,
    [string]$Message = "Emergency bypass - review needed"
)

Write-Host ""
Write-Host "🚨 EMERGENCY HOOK BYPASS" -ForegroundColor Red
Write-Host "=" * 40 -ForegroundColor Yellow
Write-Host ""

if ($Commit) {
    Write-Host "⚠️  Bypassing pre-commit hooks..." -ForegroundColor Yellow
    Write-Host "   Reason: $Message" -ForegroundColor Gray
    Write-Host ""
    
    git commit -m "$Commit" --no-verify
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Emergency commit successful" -ForegroundColor Green
        Write-Host "🔍 IMPORTANT: Review this commit ASAP and fix any issues!" -ForegroundColor Red
    } else {
        Write-Host "❌ Emergency commit failed" -ForegroundColor Red
    }
}

if ($Push) {
    Write-Host "⚠️  Bypassing pre-push hooks..." -ForegroundColor Yellow
    Write-Host "   Reason: $Message" -ForegroundColor Gray
    Write-Host ""
    
    git push --no-verify
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Emergency push successful" -ForegroundColor Green
        Write-Host "🔍 IMPORTANT: Monitor CI/CD pipeline for failures!" -ForegroundColor Red
    } else {
        Write-Host "❌ Emergency push failed" -ForegroundColor Red
    }
}

if (-not $Commit -and -not $Push) {
    Write-Host "📋 Usage Examples:" -ForegroundColor Cyan
    Write-Host "   .\bypass-hooks.ps1 -Commit 'hotfix: critical security patch'" -ForegroundColor Gray
    Write-Host "   .\bypass-hooks.ps1 -Push -Message 'production emergency'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠️  Only use in genuine emergencies!" -ForegroundColor Yellow
}

Write-Host ""
