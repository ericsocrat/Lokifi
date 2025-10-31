# Baseline-Tracker.ps1
# Baseline tracking system for tool metrics history

<#
.SYNOPSIS
Track and compare tool metrics over time

.DESCRIPTION
Stores baseline metrics in .tool-baselines/ directory.
Compares current runs against historical data.
Detects regressions and improvements.

.EXAMPLE
$baseline = Save-Baseline -Tool 'test-runner' -Metrics $metrics
$comparison = Compare-Baseline -Tool 'test-runner' -CurrentMetrics $metrics
#>

function Get-BaselineDirectory {
    <#
    .SYNOPSIS
    Get or create the baseline storage directory
    #>
    # Store in tools/.baselines/ directory
    $baselineDir = Join-Path $PSScriptRoot '..\.baselines'
    if (-not (Test-Path $baselineDir)) {
        New-Item -ItemType Directory -Path $baselineDir -Force | Out-Null
    }
    return $baselineDir
}

function Save-Baseline {
    <#
    .SYNOPSIS
    Save current metrics as baseline

    .PARAMETER Tool
    Name of the tool (test-runner, codebase-analyzer, security-scanner)

    .PARAMETER Metrics
    Hashtable of metrics to save

    .PARAMETER Category
    Optional category/subcategory (e.g., 'frontend', 'backend', 'all')
    #>
    param(
        [Parameter(Mandatory)]
        [ValidateSet('test-runner', 'codebase-analyzer', 'security-scanner', 'setup-precommit-hooks')]
        [string]$Tool,

        [Parameter(Mandatory)]
        [hashtable]$Metrics,

        [string]$Category = 'default'
    )

    $baselineDir = Get-BaselineDirectory
    $toolDir = Join-Path $baselineDir $Tool
    if (-not (Test-Path $toolDir)) {
        New-Item -ItemType Directory -Path $toolDir -Force | Out-Null
    }

    $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $filename = "${Category}_${timestamp}.json"
    $filepath = Join-Path $toolDir $filename

    $baselineData = @{
        tool      = $Tool
        category  = $Category
        timestamp = (Get-Date -Format 'o')
        metrics   = $Metrics
        git       = @{
            branch = (git rev-parse --abbrev-ref HEAD 2>$null)
            commit = (git rev-parse --short HEAD 2>$null)
        }
    }

    $baselineData | ConvertTo-Json -Depth 10 | Out-File -FilePath $filepath -Encoding UTF8

    # Also save as "latest" for quick access
    $latestPath = Join-Path $toolDir "${Category}_latest.json"
    $baselineData | ConvertTo-Json -Depth 10 | Out-File -FilePath $latestPath -Encoding UTF8

    return @{
        saved_to     = $filepath
        latest_saved = $latestPath
        baseline     = $baselineData
    }
}

function Get-LatestBaseline {
    <#
    .SYNOPSIS
    Get the most recent baseline for a tool

    .PARAMETER Tool
    Name of the tool

    .PARAMETER Category
    Category/subcategory
    #>
    param(
        [Parameter(Mandatory)]
        [ValidateSet('test-runner', 'codebase-analyzer', 'security-scanner', 'setup-precommit-hooks')]
        [string]$Tool,

        [string]$Category = 'default'
    )

    $baselineDir = Get-BaselineDirectory
    $latestPath = Join-Path $baselineDir "$Tool\${Category}_latest.json"

    if (-not (Test-Path $latestPath)) {
        return $null
    }

    try {
        $baseline = Get-Content -Path $latestPath -Raw | ConvertFrom-Json
        return $baseline
    } catch {
        $errorMsg = $_.Exception.Message
        Write-Warning "Failed to load baseline from $latestPath : $errorMsg"
        return $null
    }
}

function Get-BaselineHistory {
    <#
    .SYNOPSIS
    Get historical baselines for trend analysis

    .PARAMETER Tool
    Name of the tool

    .PARAMETER Category
    Category/subcategory

    .PARAMETER Limit
    Maximum number of historical records to return
    #>
    param(
        [Parameter(Mandatory)]
        [ValidateSet('test-runner', 'codebase-analyzer', 'security-scanner', 'setup-precommit-hooks')]
        [string]$Tool,

        [string]$Category = 'default',

        [int]$Limit = 10
    )

    $baselineDir = Get-BaselineDirectory
    $toolDir = Join-Path $baselineDir $Tool

    if (-not (Test-Path $toolDir)) {
        return @()
    }

    $pattern = "${Category}_*.json"
    $files = Get-ChildItem -Path $toolDir -Filter $pattern |
    Where-Object { $_.Name -notlike '*_latest.json' } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First $Limit

    $history = @()
    foreach ($file in $files) {
        try {
            $data = Get-Content -Path $file.FullName -Raw | ConvertFrom-Json
            $history += $data
        } catch {
            $errorMsg = $_.Exception.Message
            Write-Warning "Failed to load baseline from $($file.FullName) : $errorMsg"
        }
    }

    return $history
}

function Compare-Baseline {
    <#
    .SYNOPSIS
    Compare current metrics against baseline

    .PARAMETER Tool
    Name of the tool

    .PARAMETER CurrentMetrics
    Current metrics to compare

    .PARAMETER Category
    Category/subcategory

    .PARAMETER Baseline
    Optional specific baseline to compare against (default: latest)
    #>
    param(
        [Parameter(Mandatory)]
        [ValidateSet('test-runner', 'codebase-analyzer', 'security-scanner', 'setup-precommit-hooks')]
        [string]$Tool,

        [Parameter(Mandatory)]
        [hashtable]$CurrentMetrics,

        [string]$Category = 'default',

        [object]$Baseline = $null
    )

    if (-not $Baseline) {
        $Baseline = Get-LatestBaseline -Tool $Tool -Category $Category
    }

    if (-not $Baseline) {
        return @{
            has_baseline = $false
            message      = "No baseline found for $Tool ($Category). This will be the first baseline."
            current      = $CurrentMetrics
        }
    }

    # Convert PSCustomObject to hashtable if needed
    $baselineMetrics = if ($Baseline.metrics -is [hashtable]) {
        $Baseline.metrics
    } else {
        $ht = @{}
        $Baseline.metrics.PSObject.Properties | ForEach-Object {
            $ht[$_.Name] = $_.Value
        }
        $ht
    }

    # Compare metrics
    $changes = @()
    $improvements = @()
    $regressions = @()

    foreach ($key in $CurrentMetrics.Keys) {
        if ($baselineMetrics.ContainsKey($key)) {
            $current = $CurrentMetrics[$key]
            $previous = $baselineMetrics[$key]

            # Skip non-numeric comparisons
            if ($current -isnot [int] -and $current -isnot [double] -and
                $previous -isnot [int] -and $previous -isnot [double]) {
                continue
            }

            $delta = $current - $previous
            $percentChange = if ($previous -ne 0) {
                [math]::Round(($delta / $previous) * 100, 2)
            } else {
                0
            }

            if ($delta -ne 0) {
                $change = @{
                    metric         = $key
                    previous       = $previous
                    current        = $current
                    delta          = $delta
                    percent_change = $percentChange
                    direction      = if ($delta -gt 0) { 'increased' } else { 'decreased' }
                }

                $changes += $change

                # Classify as improvement or regression based on metric type
                if (Test-IsImprovement -Metric $key -Delta $delta) {
                    $improvements += $change
                } elseif (Test-IsRegression -Metric $key -Delta $delta) {
                    $regressions += $change
                }
            }
        }
    }

    return @{
        has_baseline      = $true
        baseline_date     = $Baseline.timestamp
        baseline_commit   = $Baseline.git.commit
        changes           = $changes
        improvements      = $improvements
        regressions       = $regressions
        regression_count  = $regressions.Count
        improvement_count = $improvements.Count
        current           = $CurrentMetrics
        previous          = $baselineMetrics
    }
}

function Test-IsImprovement {
    <#
    .SYNOPSIS
    Determine if a metric change is an improvement
    #>
    param(
        [string]$Metric,
        [double]$Delta
    )

    # Metrics where increase is good
    $increaseIsGood = @(
        'passed', 'pass_rate', 'coverage', 'test_coverage',
        'security_score', 'maintainability_score', 'quality_score'
    )

    # Metrics where decrease is good
    $decreaseIsGood = @(
        'failed', 'errors', 'warnings', 'vulnerabilities',
        'technical_debt', 'technical_debt_days', 'duration',
        'duration_ms', 'execution_time'
    )

    foreach ($pattern in $increaseIsGood) {
        if ($Metric -like "*$pattern*") {
            return $Delta -gt 0
        }
    }

    foreach ($pattern in $decreaseIsGood) {
        if ($Metric -like "*$pattern*") {
            return $Delta -lt 0
        }
    }

    return $false
}

function Test-IsRegression {
    <#
    .SYNOPSIS
    Determine if a metric change is a regression
    #>
    param(
        [string]$Metric,
        [double]$Delta
    )

    # Metrics where decrease is bad
    $decreaseIsBad = @(
        'passed', 'pass_rate', 'coverage', 'test_coverage',
        'security_score', 'maintainability_score', 'quality_score'
    )

    # Metrics where increase is bad
    $increaseIsBad = @(
        'failed', 'errors', 'warnings', 'vulnerabilities',
        'technical_debt', 'technical_debt_days'
    )

    foreach ($pattern in $decreaseIsBad) {
        if ($Metric -like "*$pattern*") {
            return $Delta -lt 0
        }
    }

    foreach ($pattern in $increaseIsBad) {
        if ($Metric -like "*$pattern*") {
            return $Delta -gt 0
        }
    }

    return $false
}

function Format-BaselineComparison {
    <#
    .SYNOPSIS
    Format baseline comparison for human-readable output

    .PARAMETER Comparison
    Comparison result from Compare-Baseline
    #>
    param(
        [Parameter(Mandatory)]
        [hashtable]$Comparison
    )

    if (-not $Comparison.has_baseline) {
        return '📊 No baseline found. This will establish the first baseline.'
    }

    $output = @()
    $output += "`n╔═══════════════════════════════════════════════════════╗"
    $output += '║           📊 Baseline Comparison                      ║'
    $output += '╚═══════════════════════════════════════════════════════╝'
    $output += ''
    $output += "📅 Previous: $($Comparison.baseline_date)"
    $output += "🔗 Commit: $($Comparison.baseline_commit)"
    $output += ''

    if ($Comparison.improvements.Count -gt 0) {
        $output += "✅ Improvements ($($Comparison.improvements.Count)):"
        foreach ($change in $Comparison.improvements) {
            $output += "   • $($change.metric): $($change.previous) → $($change.current) ($($change.percent_change)%)"
        }
        $output += ''
    }

    if ($Comparison.regressions.Count -gt 0) {
        $output += "⚠️  Regressions ($($Comparison.regressions.Count)):"
        foreach ($change in $Comparison.regressions) {
            $output += "   • $($change.metric): $($change.previous) → $($change.current) ($($change.percent_change)%)"
        }
        $output += ''
    }

    if ($Comparison.changes.Count -eq 0) {
        $output += '✅ No significant changes detected'
    }

    return $output -join "`n"
}

# Export functions (only when loaded as a module)
if ($MyInvocation.MyCommand.CommandType -eq 'ExternalScript') {
    # Script is being dot-sourced, functions are already available
} else {
    Export-ModuleMember -Function @(
        'Save-Baseline',
        'Get-LatestBaseline',
        'Get-BaselineHistory',
        'Compare-Baseline',
        'Format-BaselineComparison'
    )
}
