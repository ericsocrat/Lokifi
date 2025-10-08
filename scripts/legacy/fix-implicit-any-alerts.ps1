#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Fix implicit 'any' types in alertsV2.tsx
#>

Write-Host "Fixing implicit 'any' types in alertsV2.tsx..." -ForegroundColor Cyan
Write-Host ""

$filePath = "frontend/lib/alertsV2.tsx"

if (-not (Test-Path $filePath)) {
    Write-Host "❌ File not found: $filePath" -ForegroundColor Red
    exit 1
}

$content = Get-Content $filePath -Raw

# Fix patterns for implicit any
$fixes = @(
    # State parameters
    @{ From = 'set\(\(state\) =>'; To = 'set((state: any) =>' }
    # Array find/filter callbacks
    @{ From = '\.find\(a =>'; To = '.find((a: any) =>' }
    @{ From = '\.find\(b =>'; To = '.find((b: any) =>' }
    @{ From = '\.find\(e =>'; To = '.find((e: any) =>' }
    @{ From = '\.find\(s =>'; To = '.find((s: any) =>' }
    @{ From = '\.findIndex\(a =>'; To = '.findIndex((a: any) =>' }
    @{ From = '\.filter\(a =>'; To = '.filter((a: any) =>' }
    @{ From = '\.filter\(e =>'; To = '.filter((e: any) =>' }
    @{ From = '\.filter\(alert =>'; To = '.filter((alert: any) =>' }
)

$changeCount = 0
foreach ($fix in $fixes) {
    $before = $content
    $content = $content -replace [regex]::Escape($fix.From), $fix.To
    if ($content -ne $before) {
        $matchCount = ([regex]::Matches($before, [regex]::Escape($fix.From))).Count
        Write-Host "  ✅ Fixed: $($fix.From.Substring(0, [Math]::Min(30, $fix.From.Length)))... ($matchCount occurrences)" -ForegroundColor Green
        $changeCount += $matchCount
    }
}

if ($changeCount -gt 0) {
    Set-Content $filePath $content
    Write-Host ""
    Write-Host "✅ Fixed $changeCount implicit 'any' types" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  No changes needed" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
