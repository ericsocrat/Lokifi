<#
.SYNOPSIS
    Test script for Common-Functions.ps1

.DESCRIPTION
    Validates that all shared functions work correctly
#>

[CmdletBinding()]
param()

# Import the common functions module (go up one directory from tests/)
$modulePath = Join-Path $PSScriptRoot '..\lib\Common-Functions.ps1'
Import-Module $modulePath -Force

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host '║           Common Functions Test Suite                     ║' -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$testsPassed = 0
$testsFailed = 0

# Test 1: Write-ToolMessage
Write-Host 'Test 1: Write-ToolMessage' -ForegroundColor Yellow
try {
    Write-ToolMessage 'Info message test' -Level Info
    Write-ToolMessage 'Success message test' -Level Success
    Write-ToolMessage 'Warning message test' -Level Warning
    Write-ToolMessage 'Error message test' -Level Error
    Write-ToolMessage 'Verbose message test' -Level Verbose
    Write-Host '  ✓ Write-ToolMessage works' -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "  ✗ Write-ToolMessage failed: $_" -ForegroundColor Red
    $testsFailed++
}

# Test 2: Show-ToolProgress
Write-Host "`nTest 2: Show-ToolProgress" -ForegroundColor Yellow
try {
    Show-ToolProgress -Activity 'Testing' -Status 'Running test 2' -PercentComplete 50
    Write-Progress -Activity 'Testing' -Completed
    Write-Host '  ✓ Show-ToolProgress works' -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "  ✗ Show-ToolProgress failed: $_" -ForegroundColor Red
    $testsFailed++
}

# Test 3: New-CIModeOutput
Write-Host "`nTest 3: New-CIModeOutput" -ForegroundColor Yellow
try {
    $output = New-CIModeOutput -ToolName 'test-runner' -Success $true -Results @{passed = 10; failed = 0 }
    if ($output.tool -eq 'test-runner' -and $output.success -eq $true -and $output.exit_code -eq 0) {
        Write-Host '  ✓ New-CIModeOutput works' -ForegroundColor Green
        Write-Host "    Sample output: $($output | ConvertTo-Json -Compress)" -ForegroundColor Gray
        $testsPassed++
    } else {
        throw 'Invalid output structure'
    }
} catch {
    Write-Host "  ✗ New-CIModeOutput failed: $_" -ForegroundColor Red
    $testsFailed++
}

# Test 4: New-CIModeOutput with warnings
Write-Host "`nTest 4: New-CIModeOutput (with warnings)" -ForegroundColor Yellow
try {
    $output = New-CIModeOutput -ToolName 'security-scanner' -Success $true -Warnings @('Deprecated API usage')
    if ($output.exit_code -eq 2 -and $output.warnings.Count -eq 1) {
        Write-Host '  ✓ New-CIModeOutput handles warnings correctly (exit code 2)' -ForegroundColor Green
        $testsPassed++
    } else {
        throw 'Exit code should be 2 for warnings'
    }
} catch {
    Write-Host "  ✗ New-CIModeOutput warning handling failed: $_" -ForegroundColor Red
    $testsFailed++
}

# Test 5: New-CIModeOutput with errors
Write-Host "`nTest 5: New-CIModeOutput (with errors)" -ForegroundColor Yellow
try {
    $output = New-CIModeOutput -ToolName 'codebase-analyzer' -Success $false -Errors @('File not found')
    if ($output.exit_code -eq 1 -and $output.errors.Count -eq 1) {
        Write-Host '  ✓ New-CIModeOutput handles errors correctly (exit code 1)' -ForegroundColor Green
        $testsPassed++
    } else {
        throw 'Exit code should be 1 for errors'
    }
} catch {
    Write-Host "  ✗ New-CIModeOutput error handling failed: $_" -ForegroundColor Red
    $testsFailed++
}

# Test 6: Get-ToolConfig
Write-Host "`nTest 6: Get-ToolConfig" -ForegroundColor Yellow
try {
    $config = Get-ToolConfig -ToolName 'test-runner' -DefaultConfig @{timeout = 300; parallel = $true }
    if ($config.timeout -eq 300) {
        Write-Host '  ✓ Get-ToolConfig works (loaded defaults)' -ForegroundColor Green
        Write-Host "    Config: timeout=$($config.timeout), parallel=$($config.parallel)" -ForegroundColor Gray
        $testsPassed++
    } else {
        throw 'Config loading failed'
    }
} catch {
    Write-Host "  ✗ Get-ToolConfig failed: $_" -ForegroundColor Red
    $testsFailed++
}

# Test 7: Test-ToolPath
Write-Host "`nTest 7: Test-ToolPath" -ForegroundColor Yellow
try {
    $validPath = Test-ToolPath $PSScriptRoot
    if ($validPath) {
        Write-Host '  ✓ Test-ToolPath works for valid paths' -ForegroundColor Green
        $testsPassed++
    } else {
        throw 'Valid path should return true'
    }
} catch {
    Write-Host "  ✗ Test-ToolPath failed: $_" -ForegroundColor Red
    $testsFailed++
}

# Test 8: Test-ToolPath (invalid path)
Write-Host "`nTest 8: Test-ToolPath (invalid path)" -ForegroundColor Yellow
try {
    $invalidPath = Test-ToolPath 'C:\NonExistent\Path\12345'
    Write-Host '  ✗ Test-ToolPath should have thrown for invalid path' -ForegroundColor Red
    $testsFailed++
} catch {
    Write-Host '  ✓ Test-ToolPath correctly rejects invalid paths' -ForegroundColor Green
    $testsPassed++
}

# Test 9: Measure-ToolPerformance
Write-Host "`nTest 9: Measure-ToolPerformance" -ForegroundColor Yellow
try {
    $duration = Measure-ToolPerformance { Start-Sleep -Milliseconds 100 }
    if ($duration -ge 90 -and $duration -le 200) {
        Write-Host "  ✓ Measure-ToolPerformance works (measured ~$([math]::Round($duration, 2))ms)" -ForegroundColor Green
        $testsPassed++
    } else {
        throw "Duration measurement seems incorrect: ${duration}ms"
    }
} catch {
    Write-Host "  ✗ Measure-ToolPerformance failed: $_" -ForegroundColor Red
    $testsFailed++
}

# Summary
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host '║                    Test Summary                            ║' -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$totalTests = $testsPassed + $testsFailed
$successRate = if ($totalTests -gt 0) { [math]::Round(($testsPassed / $totalTests) * 100, 2) } else { 0 }

Write-Host "  Total Tests:  $totalTests" -ForegroundColor White
Write-Host "  Passed:       $testsPassed" -ForegroundColor Green
Write-Host "  Failed:       $testsFailed" -ForegroundColor $(if ($testsFailed -gt 0) { 'Red' } else { 'Green' })
Write-Host "  Success Rate: $successRate%" -ForegroundColor $(if ($successRate -eq 100) { 'Green' } elseif ($successRate -ge 80) { 'Yellow' } else { 'Red' })

if ($testsFailed -eq 0) {
    Write-Host "`n✅ All tests passed! Common functions are ready to use.`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️ Some tests failed. Please review the errors above.`n" -ForegroundColor Yellow
    exit 1
}
