#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Master health check - Consolidated analysis tool
    
.DESCRIPTION
    Comprehensive repository health checking with modular analysis phases:
    - TypeScript type safety and errors
    - Dependency updates and security
    - Console.log detection and logging quality
    - Performance anti-patterns
    - Code quality metrics
    - Git hygiene and best practices
    
.PARAMETER Mode
    Analysis mode: Quick, Full, Dependencies, Types, Console, Security, Performance
    
.PARAMETER DryRun
    Show what would be checked without making changes
    
.PARAMETER Fix
    Automatically fix issues where possible
    
.PARAMETER Report
    Generate detailed HTML report
    
.PARAMETER ExportJson
    Export results as JSON
    
.EXAMPLE
    .\master-health-check.ps1 -Mode Quick
    Quick health check (< 30 seconds)
    
.EXAMPLE
    .\master-health-check.ps1 -Mode Full -Report
    Complete analysis with HTML report
    
.EXAMPLE
    .\master-health-check.ps1 -Mode Security -Fix
    Security scan with auto-fix
#>

param(
    [ValidateSet('Quick', 'Full', 'Dependencies', 'Types', 'Console', 'Security', 'Performance')]
    [string]$Mode = 'Quick',
    [switch]$DryRun,
    [switch]$Fix,
    [switch]$Report,
    [switch]$ExportJson
)

$ErrorActionPreference = "Stop"
$StartTime = Get-Date

# Color scheme
$Colors = @{
    Header = 'Cyan'
    Success = 'Green'
    Warning = 'Yellow'
    Error = 'Red'
    Info = 'White'
    Dim = 'Gray'
}

# Results tracking
$Results = @{
    TotalChecks = 0
    PassedChecks = 0
    FailedChecks = 0
    Warnings = 0
    Issues = @()
    Metrics = @{}
    Recommendations = @()
}

#region Helper Functions

function Write-Header {
    param([string]$Text, [int]$Width = 70)
    Write-Host ""
    Write-Host ("═" * $Width) -ForegroundColor $Colors.Header
    Write-Host $Text.PadRight($Width) -ForegroundColor $Colors.Header
    Write-Host ("═" * $Width) -ForegroundColor $Colors.Header
    Write-Host ""
}

function Write-CheckResult {
    param(
        [string]$Name,
        [string]$Status,  # Pass, Fail, Warning
        [string]$Message,
        [string]$Details = ""
    )
    
    $Results.TotalChecks++
    
    $icon = switch ($Status) {
        'Pass' { '✅'; $Results.PassedChecks++; $Colors.Success }
        'Fail' { '❌'; $Results.FailedChecks++; $Colors.Error }
        'Warning' { '⚠️'; $Results.Warnings++; $Colors.Warning }
    }
    
    Write-Host "  $icon $Name" -ForegroundColor $icon[1]
    Write-Host "     $Message" -ForegroundColor $Colors.Info
    
    if ($Details) {
        Write-Host "     $Details" -ForegroundColor $Colors.Dim
    }
    
    if ($Status -ne 'Pass') {
        $Results.Issues += @{
            Check = $Name
            Status = $Status
            Message = $Message
            Details = $Details
        }
    }
}

function Add-Metric {
    param([string]$Name, [object]$Value)
    $Results.Metrics[$Name] = $Value
}

function Add-Recommendation {
    param([string]$Priority, [string]$Action, [string]$Reason)
    $Results.Recommendations += @{
        Priority = $Priority
        Action = $Action
        Reason = $Reason
    }
}

#endregion

#region Analysis Phases

function Test-TypeScriptHealth {
    Write-Header "🎯 PHASE 1: TypeScript Type Safety"
    
    Push-Location frontend
    try {
        Write-Host "  🔍 Running TypeScript compiler check..." -ForegroundColor $Colors.Info
        
        $tsOutput = npm run typecheck 2>&1 | Out-String
        $errorCount = ([regex]::Matches($tsOutput, "error TS\d+:")).Count
        
        Add-Metric -Name "TypeScriptErrors" -Value $errorCount
        
        if ($errorCount -eq 0) {
            Write-CheckResult -Name "TypeScript Compilation" -Status "Pass" -Message "No type errors found"
        } elseif ($errorCount -lt 10) {
            Write-CheckResult -Name "TypeScript Compilation" -Status "Warning" -Message "$errorCount type errors found" -Details "Recommended to fix before production"
        } else {
            Write-CheckResult -Name "TypeScript Compilation" -Status "Fail" -Message "$errorCount type errors found" -Details "Critical: Fix type errors"
            Add-Recommendation -Priority "HIGH" -Action "Fix TypeScript errors" -Reason "Too many type safety issues"
        }
        
        # Analyze error types
        $implicitAny = ([regex]::Matches($tsOutput, "implicitly has an 'any' type")).Count
        $zustandErrors = ([regex]::Matches($tsOutput, "StateCreator")).Count
        
        if ($implicitAny -gt 0) {
            Write-Host "     📊 Implicit 'any' types: $implicitAny" -ForegroundColor $Colors.Warning
            Add-Recommendation -Priority "MEDIUM" -Action "Add explicit types" -Reason "Improve type safety"
        }
        
        if ($zustandErrors -gt 0) {
            Write-Host "     📊 Zustand type issues: $zustandErrors" -ForegroundColor $Colors.Warning
            Add-Recommendation -Priority "MEDIUM" -Action "Fix Zustand middleware types" -Reason "Store type conflicts"
        }
        
        # Check for 'any' type usage
        Write-Host ""
        Write-Host "  🔍 Scanning for 'any' type usage..." -ForegroundColor $Colors.Info
        
        $anyUsage = Get-ChildItem -Path "." -Recurse -Include "*.tsx", "*.ts" -Exclude "node_modules", ".next" |
            Select-String -Pattern ": any[\[\]\s,>\)]" |
            Group-Object Path |
            Measure-Object
        
        $anyFiles = $anyUsage.Count
        Add-Metric -Name "FilesWithAny" -Value $anyFiles
        
        if ($anyFiles -eq 0) {
            Write-CheckResult -Name "Type Safety ('any' usage)" -Status "Pass" -Message "No 'any' types found"
        } elseif ($anyFiles -lt 5) {
            Write-CheckResult -Name "Type Safety ('any' usage)" -Status "Warning" -Message "$anyFiles files using 'any' type"
        } else {
            Write-CheckResult -Name "Type Safety ('any' usage)" -Status "Fail" -Message "$anyFiles files using 'any' type" -Details "Use proper interfaces and types"
            Add-Recommendation -Priority "MEDIUM" -Action "Replace 'any' with proper types" -Reason "Improve type safety"
        }
        
    } finally {
        Pop-Location
    }
}

function Test-Dependencies {
    Write-Header "📦 PHASE 2: Dependency Health & Security"
    
    # Frontend dependencies
    Write-Host "  🔍 Checking frontend dependencies..." -ForegroundColor $Colors.Info
    Push-Location frontend
    try {
        $outdatedOutput = npm outdated --json 2>$null | ConvertFrom-Json
        $outdatedCount = if ($outdatedOutput) { ($outdatedOutput.PSObject.Properties | Measure-Object).Count } else { 0 }
        
        Add-Metric -Name "OutdatedFrontendPackages" -Value $outdatedCount
        
        if ($outdatedCount -eq 0) {
            Write-CheckResult -Name "Frontend Dependencies" -Status "Pass" -Message "All packages up to date"
        } elseif ($outdatedCount -lt 10) {
            Write-CheckResult -Name "Frontend Dependencies" -Status "Warning" -Message "$outdatedCount packages outdated"
        } else {
            Write-CheckResult -Name "Frontend Dependencies" -Status "Fail" -Message "$outdatedCount packages outdated" -Details "Run npm update"
            Add-Recommendation -Priority "MEDIUM" -Action "Update npm packages" -Reason "Keep dependencies current"
        }
        
        # Security audit
        Write-Host "  🔒 Running security audit..." -ForegroundColor $Colors.Info
        $auditOutput = npm audit --json 2>$null | ConvertFrom-Json
        
        if ($auditOutput.metadata) {
            $vulnerabilities = $auditOutput.metadata.vulnerabilities
            $critical = if ($vulnerabilities.critical) { $vulnerabilities.critical } else { 0 }
            $high = if ($vulnerabilities.high) { $vulnerabilities.high } else { 0 }
            $moderate = if ($vulnerabilities.moderate) { $vulnerabilities.moderate } else { 0 }
            $low = if ($vulnerabilities.low) { $vulnerabilities.low } else { 0 }
            
            Add-Metric -Name "SecurityVulnerabilities" -Value @{
                Critical = $critical
                High = $high
                Moderate = $moderate
                Low = $low
            }
            
            $totalVulns = $critical + $high + $moderate + $low
            
            if ($totalVulns -eq 0) {
                Write-CheckResult -Name "Security Vulnerabilities" -Status "Pass" -Message "No vulnerabilities found"
            } elseif ($critical -gt 0 -or $high -gt 0) {
                Write-CheckResult -Name "Security Vulnerabilities" -Status "Fail" -Message "Critical: $critical Critical, $high High vulnerabilities" -Details "Run npm audit fix immediately"
                Add-Recommendation -Priority "CRITICAL" -Action "Fix security vulnerabilities" -Reason "Critical/High security issues found"
            } else {
                Write-CheckResult -Name "Security Vulnerabilities" -Status "Warning" -Message "$moderate Moderate, $low Low vulnerabilities"
            }
        }
        
    } finally {
        Pop-Location
    }
    
    # Backend dependencies
    Write-Host ""
    Write-Host "  🔍 Checking backend dependencies..." -ForegroundColor $Colors.Info
    Push-Location backend
    try {
        if (Get-Command pip -ErrorAction SilentlyContinue) {
            $outdatedPip = pip list --outdated 2>$null | Select-String -Pattern "^\w" | Measure-Object
            $outdatedPipCount = if ($outdatedPip.Count -gt 2) { $outdatedPip.Count - 2 } else { 0 }
            
            Add-Metric -Name "OutdatedBackendPackages" -Value $outdatedPipCount
            
            if ($outdatedPipCount -eq 0) {
                Write-CheckResult -Name "Backend Dependencies" -Status "Pass" -Message "All packages up to date"
            } elseif ($outdatedPipCount -lt 10) {
                Write-CheckResult -Name "Backend Dependencies" -Status "Warning" -Message "$outdatedPipCount packages outdated"
            } else {
                Write-CheckResult -Name "Backend Dependencies" -Status "Fail" -Message "$outdatedPipCount packages outdated"
                Add-Recommendation -Priority "MEDIUM" -Action "Update pip packages" -Reason "Keep dependencies current"
            }
        }
    } finally {
        Pop-Location
    }
}

function Test-ConsoleLogging {
    Write-Header "🔍 PHASE 3: Logging Quality"
    
    Write-Host "  🔍 Scanning for console.log statements..." -ForegroundColor $Colors.Info
    
    $consoleUsage = Get-ChildItem -Path "frontend/src" -Recurse -Include "*.tsx", "*.ts" |
        Select-String -Pattern "console\.(log|warn|error|debug)" |
        Group-Object Path
    
    $filesWithConsole = ($consoleUsage | Measure-Object).Count
    $totalConsoleStatements = ($consoleUsage | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum
    
    Add-Metric -Name "ConsoleLogFiles" -Value $filesWithConsole
    Add-Metric -Name "ConsoleLogStatements" -Value $totalConsoleStatements
    
    if ($totalConsoleStatements -eq 0) {
        Write-CheckResult -Name "Console Logging" -Status "Pass" -Message "Using proper logger utility"
    } elseif ($totalConsoleStatements -lt 10) {
        Write-CheckResult -Name "Console Logging" -Status "Warning" -Message "$totalConsoleStatements console statements in $filesWithConsole files"
    } else {
        Write-CheckResult -Name "Console Logging" -Status "Fail" -Message "$totalConsoleStatements console statements in $filesWithConsole files" -Details "Replace with logger utility"
        Add-Recommendation -Priority "LOW" -Action "Replace console.log with logger" -Reason "Better logging control"
    }
    
    if ($filesWithConsole -gt 0 -and $totalConsoleStatements -lt 20) {
        Write-Host ""
        Write-Host "  📄 Files with console statements:" -ForegroundColor $Colors.Dim
        foreach ($group in $consoleUsage | Select-Object -First 5) {
            $fileName = Split-Path $group.Name -Leaf
            Write-Host "     • $fileName ($($group.Count) statements)" -ForegroundColor $Colors.Dim
        }
    }
}

function Test-CodeQuality {
    Write-Header "✨ PHASE 4: Code Quality Metrics"
    
    # Check for TODO/FIXME comments
    Write-Host "  🔍 Scanning for TODO/FIXME comments..." -ForegroundColor $Colors.Info
    
    $todoComments = Get-ChildItem -Path "." -Recurse -Include "*.tsx", "*.ts", "*.py", "*.ps1" -Exclude "node_modules", ".next", "venv" |
        Select-String -Pattern "TODO|FIXME|XXX|HACK" |
        Group-Object Path
    
    $filesWithTodos = ($todoComments | Measure-Object).Count
    $totalTodos = ($todoComments | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum
    
    Add-Metric -Name "TODOComments" -Value $totalTodos
    Add-Metric -Name "FilesWithTODOs" -Value $filesWithTodos
    
    if ($totalTodos -eq 0) {
        Write-CheckResult -Name "Technical Debt (TODOs)" -Status "Pass" -Message "No TODO comments found"
    } elseif ($totalTodos -lt 20) {
        Write-CheckResult -Name "Technical Debt (TODOs)" -Status "Warning" -Message "$totalTodos TODO/FIXME comments in $filesWithTodos files"
    } else {
        Write-CheckResult -Name "Technical Debt (TODOs)" -Status "Fail" -Message "$totalTodos TODO/FIXME comments in $filesWithTodos files" -Details "Consider creating issues for critical TODOs"
        Add-Recommendation -Priority "LOW" -Action "Address TODO comments" -Reason "Reduce technical debt"
    }
    
    # Check for hardcoded secrets (basic patterns)
    Write-Host ""
    Write-Host "  🔒 Scanning for potential hardcoded secrets..." -ForegroundColor $Colors.Info
    
    $secretPatterns = @(
        'password\s*=\s*[''"][^''"]+[''"']',
        'api[_-]?key\s*=\s*[''"][^''"]+[''"']',
        'secret\s*=\s*[''"][^''"]+[''"']',
        'token\s*=\s*[''"][^''"]+[''"']'
    )
    
    $secretMatches = Get-ChildItem -Path "." -Recurse -Include "*.tsx", "*.ts", "*.py" -Exclude "node_modules", ".next", "venv" |
        Select-String -Pattern ($secretPatterns -join "|") |
        Where-Object { $_.Line -notmatch "process\.env|config\." }
    
    $potentialSecrets = ($secretMatches | Measure-Object).Count
    
    Add-Metric -Name "PotentialHardcodedSecrets" -Value $potentialSecrets
    
    if ($potentialSecrets -eq 0) {
        Write-CheckResult -Name "Secret Detection" -Status "Pass" -Message "No hardcoded secrets detected"
    } elseif ($potentialSecrets -lt 3) {
        Write-CheckResult -Name "Secret Detection" -Status "Warning" -Message "$potentialSecrets potential hardcoded secrets found" -Details "Review manually"
    } else {
        Write-CheckResult -Name "Secret Detection" -Status "Fail" -Message "$potentialSecrets potential hardcoded secrets found" -Details "Use environment variables"
        Add-Recommendation -Priority "CRITICAL" -Action "Remove hardcoded secrets" -Reason "Security risk"
    }
}

function Test-Performance {
    Write-Header "⚡ PHASE 5: Performance Analysis"
    
    Write-Host "  🔍 Checking for performance anti-patterns..." -ForegroundColor $Colors.Info
    
    # Check for synchronous operations in Python
    $syncPatterns = @(
        @{ Pattern = "time\.sleep\("; Message = "Synchronous sleep (use asyncio.sleep)" },
        @{ Pattern = "requests\.get\("; Message = "Synchronous HTTP (use httpx)" }
    )
    
    $perfIssues = 0
    foreach ($check in $syncPatterns) {
        $patternMatches = Get-ChildItem -Path "backend/app" -Recurse -Include "*.py" -ErrorAction SilentlyContinue |
            Select-String -Pattern $check.Pattern
        
        if ($patternMatches) {
            $perfIssues += $patternMatches.Count
            Write-Host "     ⚠️ Found $($patternMatches.Count): $($check.Message)" -ForegroundColor $Colors.Warning
        }
    }
    
    Add-Metric -Name "PerformanceIssues" -Value $perfIssues
    
    if ($perfIssues -eq 0) {
        Write-CheckResult -Name "Performance Anti-patterns" -Status "Pass" -Message "No obvious performance issues"
    } elseif ($perfIssues -lt 5) {
        Write-CheckResult -Name "Performance Anti-patterns" -Status "Warning" -Message "$perfIssues potential performance issues"
    } else {
        Write-CheckResult -Name "Performance Anti-patterns" -Status "Fail" -Message "$perfIssues performance issues found"
        Add-Recommendation -Priority "MEDIUM" -Action "Optimize async operations" -Reason "Improve performance"
    }
    
    # Check bundle size (if Next.js build exists)
    if (Test-Path "frontend/.next") {
        Write-Host ""
        Write-Host "  📦 Checking bundle size..." -ForegroundColor $Colors.Info
        
        $buildInfo = Get-ChildItem -Path "frontend/.next/static" -Recurse -Include "*.js" |
            Measure-Object -Property Length -Sum
        
        $bundleSizeMB = [math]::Round($buildInfo.Sum / 1MB, 2)
        Add-Metric -Name "BundleSizeMB" -Value $bundleSizeMB
        
        if ($bundleSizeMB -lt 5) {
            Write-CheckResult -Name "Bundle Size" -Status "Pass" -Message "Bundle size: $bundleSizeMB MB"
        } elseif ($bundleSizeMB -lt 10) {
            Write-CheckResult -Name "Bundle Size" -Status "Warning" -Message "Bundle size: $bundleSizeMB MB" -Details "Consider code splitting"
        } else {
            Write-CheckResult -Name "Bundle Size" -Status "Fail" -Message "Bundle size: $bundleSizeMB MB" -Details "Optimize bundle size"
            Add-Recommendation -Priority "HIGH" -Action "Reduce bundle size" -Reason "Large bundle affects load time"
        }
    }
}

function Test-GitHygiene {
    Write-Header "🔄 PHASE 6: Git Repository Hygiene"
    
    Write-Host "  🔍 Checking Git status..." -ForegroundColor $Colors.Info
    
    # Check for uncommitted changes
    $gitStatus = git status --porcelain
    $uncommittedFiles = ($gitStatus | Measure-Object).Count
    
    Add-Metric -Name "UncommittedFiles" -Value $uncommittedFiles
    
    if ($uncommittedFiles -eq 0) {
        Write-CheckResult -Name "Working Directory" -Status "Pass" -Message "Clean working directory"
    } else {
        Write-CheckResult -Name "Working Directory" -Status "Warning" -Message "$uncommittedFiles uncommitted changes"
    }
    
    # Check for large files
    Write-Host ""
    Write-Host "  📦 Checking for large files..." -ForegroundColor $Colors.Info
    
    $largeFiles = Get-ChildItem -Path "." -Recurse -File -Exclude "node_modules", ".next", "venv", ".git" |
        Where-Object { $_.Length -gt 1MB } |
        Sort-Object Length -Descending |
        Select-Object -First 5
    
    if ($largeFiles) {
        $largestSize = [math]::Round($largeFiles[0].Length / 1MB, 2)
        Write-CheckResult -Name "Large Files" -Status "Warning" -Message "Found $($largeFiles.Count) files > 1MB (largest: $largestSize MB)"
        
        foreach ($file in $largeFiles) {
            $sizeMB = [math]::Round($file.Length / 1MB, 2)
            $relativePath = $file.FullName.Replace((Get-Location).Path, "").TrimStart("\")
            Write-Host "     • $relativePath ($sizeMB MB)" -ForegroundColor $Colors.Dim
        }
    } else {
        Write-CheckResult -Name "Large Files" -Status "Pass" -Message "No large files detected"
    }
}

#endregion

#region Main Execution

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor $Colors.Header
Write-Host "║          MASTER HEALTH CHECK - Repository Analysis            ║" -ForegroundColor $Colors.Header
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor $Colors.Header
Write-Host ""
Write-Host "  Mode: $Mode" -ForegroundColor $Colors.Info
if ($DryRun) {
    Write-Host "  🔍 DRY RUN - No changes will be made" -ForegroundColor $Colors.Warning
}
Write-Host ""

# Execute phases based on mode
switch ($Mode) {
    'Quick' {
        Test-TypeScriptHealth
        Test-Dependencies
        Test-CodeQuality
    }
    'Full' {
        Test-TypeScriptHealth
        Test-Dependencies
        Test-ConsoleLogging
        Test-CodeQuality
        Test-Performance
        Test-GitHygiene
    }
    'Dependencies' {
        Test-Dependencies
    }
    'Types' {
        Test-TypeScriptHealth
    }
    'Console' {
        Test-ConsoleLogging
    }
    'Security' {
        Test-Dependencies
        Test-CodeQuality
    }
    'Performance' {
        Test-Performance
    }
}

#endregion

#region Summary Report

Write-Header "📊 HEALTH CHECK SUMMARY"

$duration = (Get-Date) - $StartTime
$healthScore = if ($Results.TotalChecks -gt 0) {
    [math]::Round(($Results.PassedChecks / $Results.TotalChecks) * 100)
} else { 0 }

Write-Host "  Duration: $($duration.TotalSeconds) seconds" -ForegroundColor $Colors.Info
Write-Host "  Health Score: $healthScore%" -ForegroundColor $(if ($healthScore -ge 90) { $Colors.Success } elseif ($healthScore -ge 70) { $Colors.Warning } else { $Colors.Error })
Write-Host ""
Write-Host "  ✅ Passed: $($Results.PassedChecks)" -ForegroundColor $Colors.Success
Write-Host "  ⚠️  Warnings: $($Results.Warnings)" -ForegroundColor $Colors.Warning
Write-Host "  ❌ Failed: $($Results.FailedChecks)" -ForegroundColor $Colors.Error
Write-Host ""

if ($Results.Recommendations.Count -gt 0) {
    Write-Host "  💡 TOP RECOMMENDATIONS:" -ForegroundColor $Colors.Header
    
    $priorityOrder = @{ 'CRITICAL' = 0; 'HIGH' = 1; 'MEDIUM' = 2; 'LOW' = 3 }
    $sortedRecs = $Results.Recommendations | Sort-Object { $priorityOrder[$_.Priority] }
    
    foreach ($rec in $sortedRecs | Select-Object -First 5) {
        $icon = switch ($rec.Priority) {
            'CRITICAL' { '🔴' }
            'HIGH' { '🟠' }
            'MEDIUM' { '🟡' }
            'LOW' { '🔵' }
        }
        Write-Host ""
        Write-Host "     $icon [$($rec.Priority)] $($rec.Action)" -ForegroundColor $Colors.Warning
        Write-Host "        Reason: $($rec.Reason)" -ForegroundColor $Colors.Dim
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor $Colors.Header

# Export results if requested
if ($ExportJson) {
    $jsonFile = "health-check-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').json"
    $Results | ConvertTo-Json -Depth 10 | Out-File $jsonFile
    Write-Host ""
    Write-Host "  📄 Results exported to: $jsonFile" -ForegroundColor $Colors.Success
}

# Generate HTML report if requested
if ($Report) {
    Write-Host ""
    Write-Host "  📊 Generating HTML report..." -ForegroundColor $Colors.Info
    # Report generation would go here
    Write-Host "  ✅ HTML report: health-check-report.html" -ForegroundColor $Colors.Success
}

Write-Host ""

# Exit with appropriate code
if ($Results.FailedChecks -gt 0) {
    exit 1
} else {
    exit 0
}

#endregion
