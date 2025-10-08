# ============================================
# CODEBASE ANALYZER V2 - Direct Execution Script
# Provides easy access to all V2 features
# ============================================

<#
.SYNOPSIS
    Quick access to enhanced codebase analyzer V2.0

.DESCRIPTION
    Wrapper script for easy invocation with all V2 features:
    - Multiple export formats (markdown, json, csv, html, all)
    - Regional cost adjustments (us, eu, asia, remote)
    - Risk-adjusted estimates (best/likely/worst case)
    - Git insights & quality metrics
    - Parallel processing for speed

.PARAMETER OutputFormat
    Export format: markdown (default), json, csv, html, or all

.PARAMETER Region
    Cost region: us (default), eu, asia, or remote

.PARAMETER Detailed
    Include detailed file-by-file analysis

.PARAMETER CompareWith
    Compare with previous report (provide path)

.EXAMPLE
    .\estimate.ps1
    Basic analysis with markdown output

.EXAMPLE
    .\estimate.ps1 -OutputFormat all -Region eu
    Full export with European cost rates

.EXAMPLE
    .\estimate.ps1 -OutputFormat json -Detailed
    JSON export with detailed file analysis

.EXAMPLE
    .\estimate.ps1 -CompareWith "docs\analysis\CODEBASE_ANALYSIS_V2_2025-10-07.md"
    Compare with previous analysis
#>

param(
    [ValidateSet('markdown', 'json', 'csv', 'html', 'all')]
    [string]$OutputFormat = 'markdown',
    
    [ValidateSet('us', 'eu', 'asia', 'remote')]
    [string]$Region = 'us',
    
    [switch]$Detailed,
    
    [string]$CompareWith = $null
)

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$analyzerPath = Join-Path $scriptDir "tools\scripts\analysis\codebase-analyzer-v2.ps1"

# Check if analyzer exists
if (-not (Test-Path $analyzerPath)) {
    Write-Error "❌ Analyzer not found at: $analyzerPath"
    Write-Host "Please ensure codebase-analyzer-v2.ps1 exists in tools/scripts/analysis/" -ForegroundColor Yellow
    exit 1
}

# Load and execute analyzer
. $analyzerPath

# Build parameters
$params = @{
    OutputFormat = $OutputFormat
    Region = $Region
}

if ($Detailed) { $params.Detailed = $true }
if ($CompareWith) { $params.CompareWith = $CompareWith }

# Execute analysis
Write-Host "`n🚀 Starting Enhanced Codebase Analysis V2.0...`n" -ForegroundColor Cyan
Invoke-CodebaseAnalysis @params
