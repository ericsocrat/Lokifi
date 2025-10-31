<#
.SYNOPSIS
    Example tool demonstrating enhanced Lokifi tool patterns.

.DESCRIPTION
    This is a reference implementation showing how to use the new common functions,
    configuration loading, CI/CD mode, and standardized patterns.

.PARAMETER Operation
    The operation to perform (analyze, test, report)

.PARAMETER CIMode
    Output machine-readable JSON for CI/CD pipelines

.PARAMETER DryRun
    Preview actions without executing them

.EXAMPLE
    .\example-tool.ps1 -Operation analyze
    Runs analysis with default configuration

.EXAMPLE
    .\example-tool.ps1 -Operation test -CIMode
    Runs tests and outputs JSON for CI/CD

.EXAMPLE
    .\example-tool.ps1 -Operation report -DryRun
    Previews report generation without creating files
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('analyze', 'test', 'report')]
    [string]$Operation = 'analyze',

    [Parameter(Mandatory = $false)]
    [switch]$CIMode,

    [Parameter(Mandatory = $false)]
    [switch]$DryRun
)

# Import common functions (go up one directory from tests/)
$modulePath = Join-Path $PSScriptRoot '..\lib\Common-Functions.ps1'
Import-Module $modulePath -Force

# Load configuration
$defaultConfig = @{
    timeout       = 300
    parallel      = $true
    output_format = 'markdown'
    verbose       = $false
}
$config = Get-ToolConfig -ToolName 'example-tool' -DefaultConfig $defaultConfig

# Track metrics
$startTime = Get-Date
$errors = @()
$warnings = @()
$results = @{}

# Header (skip in CI mode)
if (-not $CIMode) {
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host '║              Example Tool (Enhanced)                       ║' -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
}

try {
    # Show configuration (non-CI mode)
    if (-not $CIMode) {
        Write-ToolMessage 'Configuration loaded:' -Level Info
        Write-Host "  - Timeout: $($config.timeout)s" -ForegroundColor Gray
        Write-Host "  - Parallel: $($config.parallel)" -ForegroundColor Gray
        Write-Host "  - Output Format: $($config.output_format)" -ForegroundColor Gray
        Write-Host ''
    }

    # Dry run notice
    if ($DryRun) {
        Write-ToolMessage 'DRY RUN MODE - No changes will be made' -Level Warning
        Write-Host ''
    }

    # Perform operation
    switch ($Operation) {
        'analyze' {
            if (-not $CIMode) { Write-ToolMessage 'Starting analysis...' -Level Info }

            # Simulate analysis with progress
            $files = @('file1.ps1', 'file2.ps1', 'file3.ps1', 'file4.ps1', 'file5.ps1')
            $totalFiles = $files.Count

            for ($i = 0; $i -lt $totalFiles; $i++) {
                $file = $files[$i]
                $percent = [math]::Round((($i + 1) / $totalFiles) * 100)

                if (-not $CIMode) {
                    Show-ToolProgress -Activity 'Analyzing files' -Status "Processing $($file)" -PercentComplete $percent
                }

                # Simulate work
                if (-not $DryRun) {
                    Start-Sleep -Milliseconds 100
                }

                # Simulate finding issues
                if ($i -eq 2) {
                    $warnings += "Potential issue in $file"
                }
            }

            if (-not $CIMode) {
                Write-Progress -Activity 'Analyzing files' -Completed
                Write-ToolMessage 'Analysis complete!' -Level Success
            }

            $results = @{
                files_analyzed = $totalFiles
                issues_found   = $warnings.Count
                operation      = 'analyze'
            }
        }

        'test' {
            if (-not $CIMode) { Write-ToolMessage 'Running tests...' -Level Info }

            # Simulate test execution
            $duration = Measure-ToolPerformance {
                if (-not $DryRun) {
                    Start-Sleep -Milliseconds 500
                }
            }

            if (-not $CIMode) {
                Write-ToolMessage "Tests completed in $([math]::Round($duration, 2))ms" -Level Success
            }

            $results = @{
                tests_run    = 10
                tests_passed = 9
                tests_failed = 1
                duration_ms  = $duration
                operation    = 'test'
            }

            # Add a warning for failed test
            $warnings += '1 test failed: test_example_feature'
        }

        'report' {
            if (-not $CIMode) { Write-ToolMessage 'Generating report...' -Level Info }

            if ($DryRun) {
                if (-not $CIMode) {
                    Write-Host '  Would create: ./reports/example-report.md' -ForegroundColor Yellow
                    Write-Host '  Would create: ./reports/example-report.json' -ForegroundColor Yellow
                }
            } else {
                # Simulate report generation
                Start-Sleep -Milliseconds 200
                if (-not $CIMode) {
                    Write-ToolMessage 'Report generated successfully' -Level Success
                }
            }

            $results = @{
                report_format = $config.output_format
                dry_run       = $DryRun.IsPresent
                operation     = 'report'
            }
        }
    }

    $success = $true
} catch {
    $success = $false
    $errors += $_.Exception.Message

    if (-not $CIMode) {
        Write-ToolMessage "Error: $_" -Level Error
    }
}

# Calculate duration
$endTime = Get-Date
$duration = ($endTime - $startTime).TotalMilliseconds

# Output results
if ($CIMode) {
    # CI/CD mode: JSON output
    $output = New-CIModeOutput `
        -ToolName 'example-tool' `
        -Success $success `
        -Results $results `
        -Errors $errors `
        -Warnings $warnings

    $output.duration_ms = $duration

    $output | ConvertTo-Json -Depth 10 | Write-Host

    # Exit with appropriate code
    exit $output.exit_code
} else {
    # Human-readable output
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host '║                      Summary                               ║' -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

    Write-Host "  Operation:  $Operation" -ForegroundColor White
    Write-Host "  Status:     $(if ($success) { 'Success' } else { 'Failed' })" -ForegroundColor $(if ($success) { 'Green' } else { 'Red' })
    Write-Host "  Duration:   $([math]::Round($duration, 2))ms" -ForegroundColor White
    Write-Host "  Warnings:   $($warnings.Count)" -ForegroundColor $(if ($warnings.Count -gt 0) { 'Yellow' } else { 'Green' })
    Write-Host "  Errors:     $($errors.Count)" -ForegroundColor $(if ($errors.Count -gt 0) { 'Red' } else { 'Green' })

    if ($warnings.Count -gt 0) {
        Write-Host "`n  Warnings:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "    - $warning" -ForegroundColor Yellow
        }
    }

    if ($errors.Count -gt 0) {
        Write-Host "`n  Errors:" -ForegroundColor Red
        foreach ($error in $errors) {
            Write-Host "    - $error" -ForegroundColor Red
        }
    }

    Write-Host ''

    # Exit code
    if (-not $success) { exit 1 }
    elseif ($warnings.Count -gt 0) { exit 2 }
    else { exit 0 }
}
