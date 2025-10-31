# Test-Baseline-Tracker.ps1
# Test suite for Baseline-Tracker.ps1

# Import the module
$modulePath = Join-Path $PSScriptRoot '..\lib\Baseline-Tracker.ps1'
Import-Module $modulePath -Force

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host '║         Baseline Tracker Test Suite                       ║' -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$testsPassed = 0
$testsFailed = 0

function Test-Function {
    param(
        [string]$Name,
        [scriptblock]$Test
    )

    try {
        Write-Host "  Testing: $Name..." -NoNewline
        $result = & $Test
        if ($result) {
            Write-Host ' ✅ PASSED' -ForegroundColor Green
            $script:testsPassed++
            return $true
        } else {
            Write-Host ' ❌ FAILED' -ForegroundColor Red
            $script:testsFailed++
            return $false
        }
    } catch {
        Write-Host " ❌ ERROR: $_" -ForegroundColor Red
        $script:testsFailed++
        return $false
    }
}

# Test 1: Save baseline
Test-Function 'Save-Baseline creates baseline file' {
    $metrics = @{
        tests_passed = 45
        tests_failed = 2
        coverage     = 78.5
        duration_ms  = 12345
    }

    $result = Save-Baseline -Tool 'test-runner' -Metrics $metrics -Category 'test-category'

    return (Test-Path $result.saved_to) -and (Test-Path $result.latest_saved)
}

# Test 2: Get latest baseline
Test-Function 'Get-LatestBaseline retrieves saved baseline' {
    $baseline = Get-LatestBaseline -Tool 'test-runner' -Category 'test-category'

    return ($null -ne $baseline) -and ($baseline.metrics.tests_passed -eq 45)
}

# Test 3: Compare baseline (no changes)
Test-Function 'Compare-Baseline with identical metrics' {
    $currentMetrics = @{
        tests_passed = 45
        tests_failed = 2
        coverage     = 78.5
        duration_ms  = 12345
    }

    $comparison = Compare-Baseline -Tool 'test-runner' -CurrentMetrics $currentMetrics -Category 'test-category'

    return $comparison.has_baseline -and ($comparison.changes.Count -eq 0)
}

# Test 4: Compare baseline (with improvements)
Test-Function 'Compare-Baseline detects improvements' {
    $currentMetrics = @{
        tests_passed = 50  # Improved: 45 → 50
        tests_failed = 1   # Improved: 2 → 1
        coverage     = 82.0  # Improved: 78.5 → 82.0
        duration_ms  = 10000  # Improved: 12345 → 10000
    }

    $comparison = Compare-Baseline -Tool 'test-runner' -CurrentMetrics $currentMetrics -Category 'test-category'

    return $comparison.has_baseline -and
    ($comparison.improvements.Count -gt 0) -and
    ($comparison.regressions.Count -eq 0)
}

# Test 5: Compare baseline (with regressions)
Test-Function 'Compare-Baseline detects regressions' {
    $currentMetrics = @{
        tests_passed = 40  # Regression: 50 → 40
        tests_failed = 5   # Regression: 1 → 5
        coverage     = 75.0  # Regression: 82.0 → 75.0
        duration_ms  = 15000  # Regression: 10000 → 15000
    }

    $comparison = Compare-Baseline -Tool 'test-runner' -CurrentMetrics $currentMetrics -Category 'test-category'

    return $comparison.has_baseline -and
    ($comparison.regressions.Count -gt 0)
}

# Test 6: Get baseline history
Test-Function 'Get-BaselineHistory returns historical data' {
    # Save a few more baselines
    for ($i = 1; $i -le 3; $i++) {
        $metrics = @{
            tests_passed = 40 + $i
            coverage     = 75.0 + $i
        }
        Save-Baseline -Tool 'test-runner' -Metrics $metrics -Category 'test-category' | Out-Null
        Start-Sleep -Milliseconds 100  # Ensure different timestamps
    }

    $history = Get-BaselineHistory -Tool 'test-runner' -Category 'test-category' -Limit 5

    return $history.Count -ge 3
}

# Test 7: Format baseline comparison
Test-Function 'Format-BaselineComparison produces readable output' {
    $currentMetrics = @{
        tests_passed = 48
        tests_failed = 1
        coverage     = 80.0
    }

    $comparison = Compare-Baseline -Tool 'test-runner' -CurrentMetrics $currentMetrics -Category 'test-category'
    $formatted = Format-BaselineComparison -Comparison $comparison

    return ($formatted -match 'Baseline Comparison') -and ($formatted.Length -gt 50)
}

# Test 8: No baseline scenario
Test-Function 'Compare-Baseline handles missing baseline' {
    $metrics = @{
        new_metric = 100
    }

    $comparison = Compare-Baseline -Tool 'codebase-analyzer' -CurrentMetrics $metrics -Category 'nonexistent'

    return (-not $comparison.has_baseline) -and
    ($comparison.message -like '*No baseline found*')
}

# Test 9: Baseline directory creation
Test-Function 'Get-BaselineDirectory creates directory' {
    $baselineDir = Join-Path $PSScriptRoot '..\..\..\..\.tool-baselines'

    return Test-Path $baselineDir
}

# Summary
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
if ($testsFailed -eq 0) {
    Write-Host '║              All Tests PASSED ✅                           ║' -ForegroundColor Green
} else {
    Write-Host '║              Some Tests FAILED ❌                          ║' -ForegroundColor Red
}
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "  📊 Results: $testsPassed passed, $testsFailed failed`n" -ForegroundColor $(if ($testsFailed -eq 0) { 'Green' } else { 'Yellow' })

# Cleanup test files
Write-Host '  🧹 Cleaning up test files...' -ForegroundColor Gray
$testDir = Join-Path $PSScriptRoot '..\..\..\..\.tool-baselines\test-runner'
if (Test-Path $testDir) {
    Get-ChildItem -Path $testDir -Filter 'test-category*' | Remove-Item -Force
}

exit $(if ($testsFailed -eq 0) { 0 } else { 1 })
