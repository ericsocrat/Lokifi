# Common Functions Library for Lokifi Tools
# Version: 1.0.0
# Description: Shared utilities for all tools in the tools/ directory

<#
.SYNOPSIS
    Shows consistent progress information across all tools.

.DESCRIPTION
    Standardized progress reporting function that provides consistent UX
    across all Lokifi tools (test-runner, codebase-analyzer, security-scanner, etc.).

.PARAMETER Activity
    The main activity being performed (e.g., "Running Tests", "Analyzing Code")

.PARAMETER Status
    Current status message (e.g., "Processing file 5 of 100")

.PARAMETER PercentComplete
    Percentage complete (0-100)

.PARAMETER CurrentOperation
    Detailed description of current operation

.EXAMPLE
    Show-ToolProgress -Activity "Running Tests" -Status "Backend tests" -PercentComplete 50
#>
function Show-ToolProgress {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Activity,

        [Parameter(Mandatory = $true)]
        [string]$Status,

        [Parameter(Mandatory = $false)]
        [ValidateRange(0, 100)]
        [int]$PercentComplete = -1,

        [Parameter(Mandatory = $false)]
        [string]$CurrentOperation = ''
    )

    $params = @{
        Activity = $Activity
        Status   = $Status
    }

    if ($PercentComplete -ge 0) {
        $params['PercentComplete'] = $PercentComplete
    }

    if ($CurrentOperation) {
        $params['CurrentOperation'] = $CurrentOperation
    }

    Write-Progress @params
}

<#
.SYNOPSIS
    Writes formatted output with consistent color scheme.

.DESCRIPTION
    Standardized logging function that uses consistent colors:
    - Info: Cyan
    - Success: Green
    - Warning: Yellow
    - Error: Red
    - Verbose: Gray

.PARAMETER Message
    The message to display

.PARAMETER Level
    Message level (Info, Success, Warning, Error, Verbose)

.EXAMPLE
    Write-ToolMessage "Tests completed" -Level Success
#>
function Write-ToolMessage {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,

        [Parameter(Mandatory = $false)]
        [ValidateSet('Info', 'Success', 'Warning', 'Error', 'Verbose')]
        [string]$Level = 'Info'
    )

    $colorMap = @{
        Info    = 'Cyan'
        Success = 'Green'
        Warning = 'Yellow'
        Error   = 'Red'
        Verbose = 'Gray'
    }

    $color = $colorMap[$Level]
    Write-Host $Message -ForegroundColor $color
}

<#
.SYNOPSIS
    Converts tool output to CI/CD-friendly JSON format.

.DESCRIPTION
    Standardizes output format for CI/CD pipelines. Returns a hashtable
    that can be converted to JSON with proper exit codes.

.PARAMETER ToolName
    Name of the tool (test-runner, codebase-analyzer, etc.)

.PARAMETER Success
    Whether the operation succeeded

.PARAMETER Results
    Results data (hashtable)

.PARAMETER Errors
    Array of error messages

.PARAMETER Warnings
    Array of warning messages

.EXAMPLE
    $output = New-CIModeOutput -ToolName "test-runner" -Success $true -Results @{passed=10;failed=0}
    $output | ConvertTo-Json | Write-Host
#>
function New-CIModeOutput {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ToolName,

        [Parameter(Mandatory = $true)]
        [bool]$Success,

        [Parameter(Mandatory = $false)]
        [hashtable]$Results = @{},

        [Parameter(Mandatory = $false)]
        [string[]]$Errors = @(),

        [Parameter(Mandatory = $false)]
        [string[]]$Warnings = @()
    )

    # Determine exit code
    # 0 = success, 1 = error, 2 = warnings only
    $exitCode = if (-not $Success) { 1 }
    elseif ($Warnings.Count -gt 0) { 2 }
    else { 0 }

    return @{
        tool        = $ToolName
        timestamp   = (Get-Date -Format 'o')
        success     = $Success
        exit_code   = $exitCode
        results     = $Results
        errors      = $Errors
        warnings    = $Warnings
        duration_ms = 0  # Caller should update this
    }
}

<#
.SYNOPSIS
    Loads tool configuration from tools.config.json.

.DESCRIPTION
    Reads configuration from tools.config.json in project root.
    Falls back to default values if file doesn't exist.

.PARAMETER ToolName
    Name of the tool to load config for

.PARAMETER DefaultConfig
    Default configuration hashtable

.EXAMPLE
    $config = Get-ToolConfig -ToolName "test-runner" -DefaultConfig @{timeout=300}
#>
function Get-ToolConfig {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ToolName,

        [Parameter(Mandatory = $false)]
        [hashtable]$DefaultConfig = @{}
    )

    $configPath = Join-Path $PSScriptRoot '../../tools.config.json'

    if (Test-Path $configPath) {
        try {
            $configContent = Get-Content $configPath -Raw | ConvertFrom-Json
            if ($configContent.PSObject.Properties[$ToolName]) {
                $toolConfig = $configContent.$ToolName
                # Merge with defaults (config overrides defaults)
                foreach ($key in $toolConfig.PSObject.Properties.Name) {
                    $DefaultConfig[$key] = $toolConfig.$key
                }
            }
        } catch {
            Write-ToolMessage "Warning: Failed to load config from $configPath" -Level Warning
        }
    }

    return $DefaultConfig
}

<#
.SYNOPSIS
    Validates that a file path exists and is accessible.

.DESCRIPTION
    ValidateScript helper for parameter validation.

.PARAMETER Path
    Path to validate

.EXAMPLE
    [ValidateScript({Test-ToolPath $_})]
    [string]$FilePath
#>
function Test-ToolPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        throw "Path does not exist: $Path"
    }
    return $true
}

<#
.SYNOPSIS
    Measures execution time and returns duration.

.DESCRIPTION
    Helper for performance profiling. Use with Measure-Command.

.PARAMETER ScriptBlock
    Code to measure

.EXAMPLE
    $duration = Measure-ToolPerformance { Get-ChildItem -Recurse }
#>
function Measure-ToolPerformance {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$ScriptBlock
    )

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        & $ScriptBlock
    } finally {
        $stopwatch.Stop()
    }
    return $stopwatch.Elapsed.TotalMilliseconds
}

# Export functions
Export-ModuleMember -Function @(
    'Show-ToolProgress',
    'Write-ToolMessage',
    'New-CIModeOutput',
    'Get-ToolConfig',
    'Test-ToolPath',
    'Measure-ToolPerformance'
)
