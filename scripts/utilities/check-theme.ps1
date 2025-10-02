# LOKIFI THEME CHECKER RUNNER
# Validates theme usage across all components

param(
    [switch]$Watch,
    [switch]$Fix,
    [switch]$Report
)

Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   LOKIFI THEME CHECKER" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Join-Path $PSScriptRoot "..\scripts\utilities\theme-checker.js"

if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Theme checker script not found at: $scriptPath" -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Run the theme checker
Write-Host "`nRunning theme checker...`n" -ForegroundColor Yellow

try {
    if ($Watch) {
        Write-Host "👀 Watch mode: Monitoring for file changes..." -ForegroundColor Cyan
        Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Gray

        while ($true) {
            node $scriptPath
            Write-Host "`n⏰ Waiting 10 seconds before next check..." -ForegroundColor Gray
            Start-Sleep -Seconds 10
        }
    } else {
        node $scriptPath
    }

    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
        Write-Host "`n✅ Theme check completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  Theme check completed with warnings" -ForegroundColor Yellow
    }

    if ($Report) {
        $reportPath = "docs\reports\theme-check-report.json"
        if (Test-Path $reportPath) {
            Write-Host "`n📊 Opening report..." -ForegroundColor Cyan
            code $reportPath
        }
    }

} catch {
    Write-Host "`n❌ Error running theme checker:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""
