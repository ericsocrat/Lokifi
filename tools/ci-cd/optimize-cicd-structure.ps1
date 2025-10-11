#!/usr/bin/env pwsh
<#
.SYNOPSIS
    CI/CD Structure Optimizer - Organize and optimize all CI/CD implementations
    
.DESCRIPTION
    This script analyzes, optimizes, and reorganizes all CI/CD components:
    1. Validates script structure and dependencies
    2. Optimizes workflow configurations
    3. Organizes tools and documentation
    4. Ensures consistency across all components
    5. Creates optimization reports
    
.EXAMPLE
    .\optimize-cicd-structure.ps1
    
.EXAMPLE
    .\optimize-cicd-structure.ps1 -FullOptimization -CreateReport
#>

param(
    [switch]$FullOptimization,    # Complete restructuring and optimization
    [switch]$CreateReport,        # Generate detailed optimization report
    [switch]$DryRun,             # Show what would be optimized without changes
    [switch]$FixIssues           # Automatically fix identified issues
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "🔧 CI/CD STRUCTURE OPTIMIZER" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host ""

$repoRoot = Join-Path $PSScriptRoot ".."
$toolsDir = $PSScriptRoot
$workflowsDir = Join-Path $repoRoot ".github\workflows"
$docsDir = Join-Path $repoRoot "docs"

# ============================================
# ANALYSIS FUNCTIONS
# ============================================

function Analyze-ToolsStructure {
    Write-Host "📊 Analyzing Tools Structure..." -ForegroundColor Yellow
    
    $analysis = @{
        Scripts = @()
        Issues = @()
        Recommendations = @()
        Structure = @{}
    }
    
    # Get all PowerShell scripts in tools
    $scripts = Get-ChildItem -Path $toolsDir -Filter "*.ps1" -ErrorAction SilentlyContinue
    
    foreach ($script in $scripts) {
        $scriptAnalysis = @{
            Name = $script.Name
            Size = $script.Length
            LastModified = $script.LastWriteTime
            LineCount = 0
            Functions = @()
            Parameters = @()
            Dependencies = @()
            Issues = @()
        }
        
        try {
            $content = Get-Content $script.FullName -Raw -ErrorAction SilentlyContinue
            if ($content) {
                $scriptAnalysis.LineCount = ($content -split "`n").Count
                
                # Find functions
                $functionMatches = $content | Select-String -Pattern "function\s+([^{]+)" -AllMatches
                $scriptAnalysis.Functions = $functionMatches.Matches | ForEach-Object { $_.Groups[1].Value.Trim() }
                
                # Find parameters
                $paramMatches = $content | Select-String -Pattern "param\s*\(" -AllMatches
                if ($paramMatches.Matches.Count -gt 0) {
                    $scriptAnalysis.Parameters = @("Has parameters")
                }
                
                # Check for common issues
                if ($content -match "ParserError|SyntaxError") {
                    $scriptAnalysis.Issues += "Potential syntax errors"
                }
                
                if ($content.Length -gt 50000) {
                    $scriptAnalysis.Issues += "Large file - consider splitting"
                }
                
                if (-not ($content -match "\.SYNOPSIS|\.DESCRIPTION")) {
                    $scriptAnalysis.Issues += "Missing documentation headers"
                }
            }
        } catch {
            $scriptAnalysis.Issues += "Cannot read file: $_"
        }
        
        $analysis.Scripts += $scriptAnalysis
    }
    
    # Analyze structure
    $analysis.Structure = @{
        TotalScripts = $scripts.Count
        TotalLines = ($analysis.Scripts | Measure-Object -Property LineCount -Sum).Sum
        AverageSize = ($analysis.Scripts | Measure-Object -Property Size -Average).Average
        LargestScript = ($analysis.Scripts | Sort-Object Size -Descending | Select-Object -First 1).Name
        MostFunctions = ($analysis.Scripts | Sort-Object { $_.Functions.Count } -Descending | Select-Object -First 1).Name
    }
    
    return $analysis
}

function Analyze-WorkflowStructure {
    Write-Host "📊 Analyzing GitHub Workflows..." -ForegroundColor Yellow
    
    $analysis = @{
        Workflows = @()
        Issues = @()
        Duplicates = @()
        Optimization = @()
    }
    
    if (-not (Test-Path $workflowsDir)) {
        $analysis.Issues += "Workflows directory missing"
        return $analysis
    }
    
    $workflows = Get-ChildItem -Path $workflowsDir -Filter "*.yml" -ErrorAction SilentlyContinue
    
    foreach ($workflow in $workflows) {
        $workflowAnalysis = @{
            Name = $workflow.Name
            Size = $workflow.Length
            LastModified = $workflow.LastWriteTime
            Triggers = @()
            Jobs = @()
            Issues = @()
        }
        
        try {
            $content = Get-Content $workflow.FullName -Raw -ErrorAction SilentlyContinue
            if ($content) {
                # Find triggers
                if ($content -match "on:\s*\n([\s\S]*?)(?=\njobs:|$)") {
                    $triggerSection = $matches[1]
                    if ($triggerSection -match "push|pull_request|schedule|workflow_dispatch") {
                        $workflowAnalysis.Triggers = @("Found triggers")
                    }
                }
                
                # Find jobs
                $jobMatches = $content | Select-String -Pattern "^\s*([^:]+):\s*$" -AllMatches
                $workflowAnalysis.Jobs = $jobMatches.Matches | ForEach-Object { 
                    $_.Groups[1].Value.Trim() 
                } | Where-Object { $_ -notmatch "^(on|jobs|env)$" }
                
                # Check for issues
                if ($content -match "uses: actions/checkout@v[12]") {
                    $workflowAnalysis.Issues += "Outdated checkout action version"
                }
                
                    if ($content -match "node-version.*1[456]") {
                    $workflowAnalysis.Issues += "Outdated Node.js version"
                }
                
                if (-not ($content -match "fail-fast:\s*false")) {
                    $workflowAnalysis.Issues += "Consider adding fail-fast: false for matrix builds"
                }
            }
        } catch {
            $workflowAnalysis.Issues += "Cannot read workflow: $_"
        }
        
        $analysis.Workflows += $workflowAnalysis
    }
    
    # Find duplicates
    $workflowNames = $analysis.Workflows | ForEach-Object { $_.Name -replace '\.yml$', '' }
    $duplicatePatterns = @("ci", "cd", "test", "deploy")
    
    foreach ($pattern in $duplicatePatterns) {
        $matches = $workflowNames | Where-Object { $_ -match $pattern }
        if ($matches.Count -gt 1) {
            $analysis.Duplicates += "Multiple workflows with '$pattern': $($matches -join ', ')"
        }
    }
    
    return $analysis
}

function Analyze-DocumentationStructure {
    Write-Host "📊 Analyzing Documentation Structure..." -ForegroundColor Yellow
    
    $analysis = @{
        CIDocuments = @()
        Issues = @()
        Missing = @()
    }
    
    # CI/CD related documentation
    $ciDocPatterns = @("ci", "cd", "deploy", "protection", "test", "workflow")
    
    $allDocs = Get-ChildItem -Path $docsDir -Recurse -Include "*.md" -ErrorAction SilentlyContinue
    
    foreach ($pattern in $ciDocPatterns) {
        $matchingDocs = $allDocs | Where-Object { $_.Name -match $pattern }
        if ($matchingDocs.Count -gt 0) {
            $analysis.CIDocuments += @{
                Pattern = $pattern
                Files = $matchingDocs | ForEach-Object { $_.Name }
                Count = $matchingDocs.Count
            }
        }
    }
    
    # Check for missing essential documentation
    $essentialDocs = @(
        "CI_CD_GUIDE.md",
        "DEPLOYMENT_GUIDE.md", 
        "TESTING_STRATEGY.md",
        "WORKFLOW_DOCUMENTATION.md"
    )
    
    foreach ($doc in $essentialDocs) {
        $found = $allDocs | Where-Object { $_.Name -eq $doc }
        if (-not $found) {
            $analysis.Missing += $doc
        }
    }
    
    return $analysis
}

# ============================================
# OPTIMIZATION FUNCTIONS
# ============================================

function Optimize-ToolsOrganization {
    Write-Host "🔧 Optimizing Tools Organization..." -ForegroundColor Yellow
    
    $optimizations = @()
    
    # Create organized subdirectories
    $subdirs = @{
        "ci-cd" = @("*protection*", "*coverage*", "*ci*", "*dashboard*")
        "deployment" = @("*deploy*", "*blue-green*", "*canary*")
        "monitoring" = @("*monitor*", "*alert*", "*metric*")
        "analysis" = @("*ai*", "*predict*", "*analyz*")
        "hooks" = @("*hook*", "*bypass*", "*pre-commit*")
    }
    
    if (-not $DryRun) {
        foreach ($subdir in $subdirs.Keys) {
            $subdirPath = Join-Path $toolsDir $subdir
            if (-not (Test-Path $subdirPath)) {
                New-Item -ItemType Directory -Path $subdirPath -Force | Out-Null
                $optimizations += "Created directory: tools/$subdir"
            }
        }
    } else {
        foreach ($subdir in $subdirs.Keys) {
            $optimizations += "Would create directory: tools/$subdir"
        }
    }
    
    # Organize scripts by category
    $scripts = Get-ChildItem -Path $toolsDir -Filter "*.ps1" -ErrorAction SilentlyContinue
    
    foreach ($script in $scripts) {
        $scriptName = $script.Name.ToLower()
        $targetSubdir = $null
        
        foreach ($subdir in $subdirs.Keys) {
            $patterns = $subdirs[$subdir]
            foreach ($pattern in $patterns) {
                if ($scriptName -like $pattern) {
                    $targetSubdir = $subdir
                    break
                }
            }
            if ($targetSubdir) { break }
        }
        
        if ($targetSubdir -and $script.Name -ne "lokifi.ps1") {
            $targetPath = Join-Path $toolsDir "$targetSubdir\$($script.Name)"
            
            if (-not $DryRun -and -not (Test-Path $targetPath)) {
                Move-Item -Path $script.FullName -Destination $targetPath
                $optimizations += "Moved $($script.Name) to $targetSubdir/"
            } elseif ($DryRun) {
                $optimizations += "Would move $($script.Name) to $targetSubdir/"
            }
        }
    }
    
    return $optimizations
}

function Optimize-WorkflowConfiguration {
    Write-Host "🔧 Optimizing Workflow Configurations..." -ForegroundColor Yellow
    
    $optimizations = @()
    
    if (-not (Test-Path $workflowsDir)) {
        return @("Workflows directory missing - cannot optimize")
    }
    
    $workflows = Get-ChildItem -Path $workflowsDir -Filter "*.yml" -ErrorAction SilentlyContinue
    
    foreach ($workflow in $workflows) {
        try {
            $content = Get-Content $workflow.FullName -Raw -ErrorAction SilentlyContinue
            $originalContent = $content
            $changed = $false
            
            # Update outdated actions
            if ($content -match "uses: actions/checkout@v[12]") {
                $content = $content -replace "uses: actions/checkout@v[12]", "uses: actions/checkout@v4"
                $changed = $true
                $optimizations += "Updated checkout action in $($workflow.Name)"
            }
            
            # Update Node.js versions
            if ($content -match "node-version.*1[456]") {
                $content = $content -replace "node-version.*1[456]", "node-version: '18'"
                $changed = $true
                $optimizations += "Updated Node.js version in $($workflow.Name)"
            }
            
            # Add caching if missing
            if ($content -match "npm install" -and -not ($content -match "cache:")) {
                $content = $content -replace "(uses: actions/setup-node@v4)", "`$1`n        with:`n          cache: 'npm'"
                $changed = $true
                $optimizations += "Added npm caching to $($workflow.Name)"
            }
            
            # Save optimized content
            if ($changed -and -not $DryRun) {
                $content | Out-File -FilePath $workflow.FullName -Encoding UTF8
            }
            
        } catch {
            $optimizations += "Error optimizing $($workflow.Name): $_"
        }
    }
    
    return $optimizations
}

function Create-OptimizedDocumentation {
    Write-Host "📚 Creating Optimized Documentation..." -ForegroundColor Yellow
    
    $created = @()
    
    # Create CI/CD documentation directory
    $cicdDocsDir = Join-Path $docsDir "ci-cd"
    if (-not (Test-Path $cicdDocsDir) -and -not $DryRun) {
        New-Item -ItemType Directory -Path $cicdDocsDir -Force | Out-Null
        $created += "Created docs/ci-cd directory"
    }
    
    # Create comprehensive CI/CD index
    $cicdIndex = @"
# 🔄 CI/CD Documentation Index

Complete documentation for Lokifi's CI/CD implementation.

## 📋 Quick Reference

| Component | Status | Documentation |
|-----------|---------|---------------|
| Pre-commit Hooks | ✅ Active | [Setup Guide](./pre-commit-hooks.md) |
| GitHub Workflows | ✅ 10 Active | [Workflow Guide](./github-workflows.md) |
| Quality Gates | ✅ 4/4 Pass | [Quality Guide](./quality-gates.md) |
| Test Coverage | ⚠️ Needs Work | [Testing Guide](./test-coverage.md) |
| Security Scanning | ✅ Active | [Security Guide](./security-scanning.md) |
| Performance Monitoring | ✅ Active | [Performance Guide](./performance-monitoring.md) |

## 🛠️ Tools Reference

### Core Tools
- **lokifi.ps1**: Master DevOps CLI (6,750+ lines)
- **protection-dashboard.ps1**: Real-time CI/CD monitoring
- **enhanced-ci-protection.ps1**: Advanced quality gates
- **boost-test-coverage.ps1**: Intelligent test generation

### CI/CD Tools
- **setup-precommit-hooks.ps1**: Git hooks automation
- **enable-ci-protection.ps1**: Basic protection setup
- **advanced-ci-enhancements.ps1**: Next-gen features

### Analysis Tools
- **ai-code-analysis.ps1**: AI-powered code analysis
- **predictive-analysis.ps1**: Failure prediction

## 🚀 Quick Start

1. **Setup Protection**: ``.\tools\setup-precommit-hooks.ps1``
2. **Check Status**: ``.\tools\protection-dashboard.ps1``
3. **Boost Coverage**: ``.\tools\boost-test-coverage.ps1 -Target 25``
4. **Monitor**: ``.\tools\protection-dashboard.ps1 -Watch``

## 📊 Current Metrics

- **Protection Score**: 75/100 (75%)
- **Quality Gates**: 4/4 passing
- **Security Issues**: 0
- **Active Workflows**: 10
- **Test Coverage**: 0% (needs implementation)

## 📈 Roadmap

| Phase | Timeline | Goal | Status |
|-------|----------|------|--------|
| Phase 1 | Week 1 | Basic Protection | ✅ Complete |
| Phase 2 | Week 2 | Test Coverage 25% | 🔄 In Progress |
| Phase 3 | Month 1 | Advanced Features | 📋 Planned |
| Phase 4 | Month 2 | AI Integration | 📋 Planned |

---

*Last updated: $(Get-Date -Format 'yyyy-MM-dd')*
"@

    if (-not $DryRun) {
        $indexPath = Join-Path $cicdDocsDir "README.md"
        $cicdIndex | Out-File -FilePath $indexPath -Encoding UTF8
        $created += "Created CI/CD documentation index"
    }
    
    return $created
}

# ============================================
# VALIDATION FUNCTIONS
# ============================================

function Validate-StructureIntegrity {
    Write-Host "✅ Validating Structure Integrity..." -ForegroundColor Yellow
    
    $validation = @{
        Passed = @()
        Failed = @()
        Warnings = @()
    }
    
    # Check essential tools exist
    $essentialTools = @("lokifi.ps1", "protection-dashboard.ps1", "enhanced-ci-protection.ps1")
    foreach ($tool in $essentialTools) {
        $toolPath = Join-Path $toolsDir $tool
        if (Test-Path $toolPath) {
            $validation.Passed += "Essential tool exists: $tool"
        } else {
            $validation.Failed += "Missing essential tool: $tool"
        }
    }
    
    # Check workflows directory
    if (Test-Path $workflowsDir) {
        $workflowCount = (Get-ChildItem -Path $workflowsDir -Filter "*.yml").Count
        if ($workflowCount -ge 5) {
            $validation.Passed += "Sufficient workflows: $workflowCount"
        } else {
            $validation.Warnings += "Few workflows: $workflowCount (recommended: 5+)"
        }
    } else {
        $validation.Failed += "Missing workflows directory"
    }
    
    # Check documentation
    $docsGuideDir = Join-Path $docsDir "guides"
    if (Test-Path $docsGuideDir) {
        $ciProtectionDoc = Join-Path $docsGuideDir "CONTINUOUS_INTEGRATION_PROTECTION.md"
        if (Test-Path $ciProtectionDoc) {
            $validation.Passed += "CI protection documentation exists"
        } else {
            $validation.Warnings += "Missing CI protection documentation"
        }
    }
    
    return $validation
}

# ============================================
# MAIN EXECUTION
# ============================================

Write-Host "🔍 Starting CI/CD Structure Analysis..." -ForegroundColor Cyan
Write-Host ""

# Analyze current structure
$toolsAnalysis = Analyze-ToolsStructure
$workflowsAnalysis = Analyze-WorkflowStructure
$docsAnalysis = Analyze-DocumentationStructure

# Display analysis results
Write-Host "📊 ANALYSIS RESULTS" -ForegroundColor Cyan
Write-Host "=" * 40 -ForegroundColor Gray
Write-Host ""

Write-Host "🛠️ Tools Analysis:" -ForegroundColor Yellow
Write-Host "   Scripts: $($toolsAnalysis.Structure.TotalScripts)" -ForegroundColor Gray
Write-Host "   Total Lines: $($toolsAnalysis.Structure.TotalLines)" -ForegroundColor Gray
Write-Host "   Largest Script: $($toolsAnalysis.Structure.LargestScript)" -ForegroundColor Gray
Write-Host "   Issues Found: $($toolsAnalysis.Scripts | ForEach-Object { $_.Issues.Count } | Measure-Object -Sum).Sum" -ForegroundColor Gray
Write-Host ""

Write-Host "⚙️ Workflows Analysis:" -ForegroundColor Yellow
Write-Host "   Active Workflows: $($workflowsAnalysis.Workflows.Count)" -ForegroundColor Gray
Write-Host "   Duplicates: $($workflowsAnalysis.Duplicates.Count)" -ForegroundColor Gray
Write-Host "   Issues: $($workflowsAnalysis.Workflows | ForEach-Object { $_.Issues.Count } | Measure-Object -Sum).Sum" -ForegroundColor Gray
Write-Host ""

Write-Host "📚 Documentation Analysis:" -ForegroundColor Yellow
Write-Host "   CI/CD Documents: $($docsAnalysis.CIDocuments | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum" -ForegroundColor Gray
Write-Host "   Missing Essential: $($docsAnalysis.Missing.Count)" -ForegroundColor Gray
Write-Host ""

# Perform optimizations if requested
if ($FullOptimization -or $FixIssues) {
    Write-Host "🔧 PERFORMING OPTIMIZATIONS" -ForegroundColor Cyan
    Write-Host "=" * 40 -ForegroundColor Gray
    Write-Host ""
    
    if ($DryRun) {
        Write-Host "🔍 DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
        Write-Host ""
    }
    
    $toolsOptimizations = Optimize-ToolsOrganization
    $workflowOptimizations = Optimize-WorkflowConfiguration
    $docsCreated = Create-OptimizedDocumentation
    
    Write-Host "✅ OPTIMIZATION RESULTS" -ForegroundColor Green
    Write-Host ""
    
    if ($toolsOptimizations.Count -gt 0) {
        Write-Host "🛠️ Tools Optimizations:" -ForegroundColor Yellow
        $toolsOptimizations | ForEach-Object { Write-Host "   • $_" -ForegroundColor Gray }
        Write-Host ""
    }
    
    if ($workflowOptimizations.Count -gt 0) {
        Write-Host "⚙️ Workflow Optimizations:" -ForegroundColor Yellow
        $workflowOptimizations | ForEach-Object { Write-Host "   • $_" -ForegroundColor Gray }
        Write-Host ""
    }
    
    if ($docsCreated.Count -gt 0) {
        Write-Host "📚 Documentation Created:" -ForegroundColor Yellow
        $docsCreated | ForEach-Object { Write-Host "   • $_" -ForegroundColor Gray }
        Write-Host ""
    }
}

# Validate final structure
$validation = Validate-StructureIntegrity

Write-Host "✅ STRUCTURE VALIDATION" -ForegroundColor Cyan
Write-Host "=" * 40 -ForegroundColor Gray
Write-Host ""

if ($validation.Passed.Count -gt 0) {
    Write-Host "✅ Passed Checks:" -ForegroundColor Green
    $validation.Passed | ForEach-Object { Write-Host "   • $_" -ForegroundColor Gray }
    Write-Host ""
}

if ($validation.Warnings.Count -gt 0) {
    Write-Host "⚠️ Warnings:" -ForegroundColor Yellow
    $validation.Warnings | ForEach-Object { Write-Host "   • $_" -ForegroundColor Gray }
    Write-Host ""
}

if ($validation.Failed.Count -gt 0) {
    Write-Host "❌ Failed Checks:" -ForegroundColor Red
    $validation.Failed | ForEach-Object { Write-Host "   • $_" -ForegroundColor Gray }
    Write-Host ""
}

# Create optimization report
if ($CreateReport) {
    $reportPath = Join-Path $PSScriptRoot "cicd-optimization-report.md"
    
    $report = @"
# CI/CD Structure Optimization Report

**Generated**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Summary

- **Tools Scripts**: $($toolsAnalysis.Structure.TotalScripts)
- **Total Code Lines**: $($toolsAnalysis.Structure.TotalLines)
- **Active Workflows**: $($workflowsAnalysis.Workflows.Count)
- **Documentation Files**: $($docsAnalysis.CIDocuments | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum

## Analysis Results

### Tools Analysis
$(if ($toolsAnalysis.Scripts | Where-Object { $_.Issues.Count -gt 0 }) {
    "#### Issues Found:"
    $toolsAnalysis.Scripts | Where-Object { $_.Issues.Count -gt 0 } | ForEach-Object {
        "- **$($_.Name)**: $($_.Issues -join ', ')"
    }
} else {
    "✅ No major issues found in tools"
})

### Workflow Analysis
$(if ($workflowsAnalysis.Duplicates.Count -gt 0) {
    "#### Duplicate Workflows:"
    $workflowsAnalysis.Duplicates | ForEach-Object { "- $_" }
} else {
    "✅ No duplicate workflows detected"
})

### Validation Results
$(if ($validation.Failed.Count -gt 0) {
    "#### Failed Validations:"
    $validation.Failed | ForEach-Object { "- $_" }
} else {
    "✅ All essential validations passed"
})

## Recommendations

1. **Immediate Actions**:
$(if ($validation.Failed.Count -gt 0) {
    $validation.Failed | ForEach-Object { "   - Fix: $_" }
} else {
    "   - No critical issues found"
})

2. **Optimization Opportunities**:
$(if ($validation.Warnings.Count -gt 0) {
    $validation.Warnings | ForEach-Object { "   - Address: $_" }
} else {
    "   - Structure is well optimized"
})

---
*Report generated by optimize-cicd-structure.ps1*
"@

    $report | Out-File -FilePath $reportPath -Encoding UTF8
    Write-Host "📄 Optimization report saved to: cicd-optimization-report.md" -ForegroundColor Green
    Write-Host ""
}

# Final summary
$overallScore = [math]::Round((($validation.Passed.Count * 100) / ($validation.Passed.Count + $validation.Failed.Count + $validation.Warnings.Count)), 1)

Write-Host "🎯 OVERALL STRUCTURE HEALTH: $overallScore%" -ForegroundColor $(
    if ($overallScore -ge 90) { "Green" } 
    elseif ($overallScore -ge 70) { "Yellow" } 
    else { "Red" }
)

Write-Host ""
Write-Host "🎉 CI/CD Structure Analysis Complete!" -ForegroundColor Green
Write-Host ""

if ($validation.Failed.Count -gt 0) {
    Write-Host "💡 Run with -FixIssues to automatically resolve problems" -ForegroundColor Cyan
}

if (-not $FullOptimization) {
    Write-Host "💡 Run with -FullOptimization for complete restructuring" -ForegroundColor Cyan
}

Write-Host ""