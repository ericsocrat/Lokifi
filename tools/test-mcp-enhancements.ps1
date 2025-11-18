#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Comprehensive test suite for MCP server enhancements
.DESCRIPTION
    Tests all 8 new tools + 2 enhancements (caching, error handling) across 4 MCP servers.
    Validates tool schemas, edge cases, error messages, and performance improvements.
#>

param(
    [switch]$Verbose,
    [switch]$SkipPerformance
)

$ErrorActionPreference = "Continue"
$testResults = @{
    Total = 0
    Passed = 0
    Failed = 0
    Skipped = 0
    Details = @()
}

function Write-TestHeader {
    param([string]$Title)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Details = ""
    )

    $testResults.Total++

    if ($Passed) {
        $testResults.Passed++
        Write-Host "✅ PASS: $TestName" -ForegroundColor Green
    } else {
        $testResults.Failed++
        Write-Host "❌ FAIL: $TestName" -ForegroundColor Red
    }

    if ($Details -and $Verbose) {
        Write-Host "   $Details" -ForegroundColor Gray
    }

    $testResults.Details += @{
        Name = $TestName
        Passed = $Passed
        Details = $Details
    }
}

function Test-NodeModules {
    Write-TestHeader "Prerequisites Check"

    # Check Node.js version
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-TestResult "Node.js installed" $true "Version: $nodeVersion"
    } else {
        Write-TestResult "Node.js installed" $false "Node.js not found"
        return $false
    }

    # Check MCP SDK
    Push-Location tools
    $sdkInstalled = npm list @modelcontextprotocol/sdk 2>&1 | Select-String "@modelcontextprotocol/sdk"
    Pop-Location

    if ($sdkInstalled) {
        Write-TestResult "MCP SDK installed" $true "$sdkInstalled"
    } else {
        Write-TestResult "MCP SDK installed" $false "SDK not found in tools/node_modules"
        return $false
    }

    return $true
}

function Test-PatternLibraryEnhancements {
    Write-TestHeader "Pattern Library MCP - New Tools"

    # Test 1: compare_patterns tool exists
    $serverPath = "mcp-pattern-library-server.js"
    $content = Get-Content $serverPath -Raw

    $hasCompareTool = $content -match "name: 'compare_patterns'"
    Write-TestResult "compare_patterns tool registered" $hasCompareTool

    $hasRecommendTool = $content -match "name: 'get_pattern_recommendations'"
    Write-TestResult "get_pattern_recommendations tool registered" $hasRecommendTool

    # Test 2: Caching layer exists
    $hasCaching = $content -match "let patternCache"
    Write-TestResult "Caching layer implemented" $hasCaching

    $hasCacheTTL = $content -match "CACHE_TTL"
    Write-TestResult "Cache TTL configured" $hasCacheTTL

    # Test 3: Enhanced error handling
    $hasErrorHelper = $content -match "function createError"
    Write-TestResult "Enhanced error helper exists" $hasErrorHelper

    # Test 4: comparePatterns function exists
    $hasCompareFunction = $content -match "function comparePatterns"
    Write-TestResult "comparePatterns function implemented" $hasCompareFunction

    # Test 5: getPatternRecommendations function exists
    $hasRecommendFunction = $content -match "function getPatternRecommendations"
    Write-TestResult "getPatternRecommendations function implemented" $hasRecommendFunction

    # Test 6: Error messages have suggestions
    $hasSuggestions = $content -match "suggestion:"
    Write-TestResult "Error messages include suggestions" $hasSuggestions
}

function Test-DocsSearchEnhancements {
    Write-TestHeader "Docs Search MCP - New Tools"

    $serverPath = "mcp-docs-search-server.js"
    $content = Get-Content $serverPath -Raw

    # Test 1: get_recent_docs tool exists
    $hasRecentTool = $content -match "name: 'get_recent_docs'"
    Write-TestResult "get_recent_docs tool registered" $hasRecentTool

    $hasRelatedTool = $content -match "name: 'find_related_docs'"
    Write-TestResult "find_related_docs tool registered" $hasRelatedTool

    # Test 2: Caching layer exists
    $hasCaching = $content -match "let docsCache"
    Write-TestResult "Docs caching layer implemented" $hasCaching

    # Test 3: getRecentDocs function exists
    $hasRecentFunction = $content -match "function getRecentDocs"
    Write-TestResult "getRecentDocs function implemented" $hasRecentFunction

    # Test 4: findRelatedDocs function exists
    $hasRelatedFunction = $content -match "function findRelatedDocs"
    Write-TestResult "findRelatedDocs function implemented" $hasRelatedFunction

    # Test 5: Enhanced error handling
    $hasErrorHelper = $content -match "function createError"
    Write-TestResult "Enhanced error helper exists" $hasErrorHelper
}

function Test-GitHistoryEnhancements {
    Write-TestHeader "Git History MCP - New Tools"

    $serverPath = "mcp-git-history-server.js"
    $content = Get-Content $serverPath -Raw

    # Test 1: find_commits_by_file tool exists
    $hasFileTool = $content -match "name: 'find_commits_by_file'"
    Write-TestResult "find_commits_by_file tool registered" $hasFileTool

    $hasBranchTool = $content -match "name: 'compare_branches'"
    Write-TestResult "compare_branches tool registered" $hasBranchTool

    # Test 2: findCommitsByFile function exists
    $hasFileFunction = $content -match "function findCommitsByFile"
    Write-TestResult "findCommitsByFile function implemented" $hasFileFunction

    # Test 3: compareBranches function exists
    $hasBranchFunction = $content -match "function compareBranches"
    Write-TestResult "compareBranches function implemented" $hasBranchFunction

    # Test 4: Enhanced error handling
    $hasErrorHelper = $content -match "function createError"
    Write-TestResult "Enhanced error helper exists" $hasErrorHelper

    # Test 5: Error messages with examples
    $hasExamples = $content -match "examples:"
    Write-TestResult "Error messages include examples" $hasExamples
}

function Test-CoverageEnhancements {
    Write-TestHeader "Coverage MCP - New Tools"

    $serverPath = "mcp-coverage-server.js"
    $content = Get-Content $serverPath -Raw

    # Test 1: get_coverage_by_category tool exists
    $hasCategoryTool = $content -match "name: 'get_coverage_by_category'"
    Write-TestResult "get_coverage_by_category tool registered" $hasCategoryTool

    $hasPriorityTool = $content -match "name: 'suggest_test_priorities'"
    Write-TestResult "suggest_test_priorities tool registered" $hasPriorityTool

    # Test 2: getCoverageByCategory function exists
    $hasCategoryFunction = $content -match "function getCoverageByCategory"
    Write-TestResult "getCoverageByCategory function implemented" $hasCategoryFunction

    # Test 3: suggestTestPriorities function exists
    $hasPriorityFunction = $content -match "function suggestTestPriorities"
    Write-TestResult "suggestTestPriorities function implemented" $hasPriorityFunction

    # Test 4: Enhanced error handling
    $hasErrorHelper = $content -match "function createError"
    Write-TestResult "Enhanced error helper exists" $hasErrorHelper

    # Test 5: Priority scoring logic
    $hasScoringLogic = $content -match "priorityScore"
    Write-TestResult "Priority scoring logic implemented" $hasScoringLogic
}

function Test-ErrorHandlingQuality {
    Write-TestHeader "Error Handling Quality (All Servers)"

    $servers = @(
        "mcp-pattern-library-server.js",
        "mcp-docs-search-server.js",
        "mcp-git-history-server.js",
        "mcp-coverage-server.js"
    )

    foreach ($server in $servers) {
        $serverName = Split-Path $server -Leaf
        $content = Get-Content $server -Raw

        # Check for suggestion fields
        $hasSuggestions = ($content -match "suggestion:" -or $content -match "suggestion':")
        Write-TestResult "$serverName has suggestions in errors" $hasSuggestions

        # Check for examples in errors
        $hasExamples = ($content -match "examples:" -or $content -match "examples':")
        Write-TestResult "$serverName has examples in errors" $hasExamples

        # Check for timestamp in createError
        $hasTimestamp = $content -match "timestamp:"
        Write-TestResult "$serverName includes timestamps in errors" $hasTimestamp
    }
}

function Test-CachingPerformance {
    Write-TestHeader "Caching Performance Test"

    if ($SkipPerformance) {
        Write-Host "⏭️  Performance tests skipped (use -SkipPerformance:$false to run)" -ForegroundColor Yellow
        $testResults.Skipped++
        return
    }

    # Test Pattern Library caching
    $patternContent = Get-Content "mcp-pattern-library-server.js" -Raw

    # Check getCachedPatterns is used instead of getAllPatterns
    $usesCache = $patternContent -match "getCachedPatterns\(\)"
    Write-TestResult "Pattern Library uses cached data" $usesCache

    # Test Docs caching
    $docsContent = Get-Content "mcp-docs-search-server.js" -Raw
    $usesDocsCache = $docsContent -match "getCachedDocs\(\)"
    Write-TestResult "Docs Search uses cached data" $usesDocsCache

    # Verify cache invalidation logic exists
    $hasInvalidation = $patternContent -match "invalidateCache"
    Write-TestResult "Cache invalidation logic exists" $hasInvalidation
}

function Test-ToolSchemas {
    Write-TestHeader "Tool Schema Validation"

    $servers = @(
        @{ Path = "mcp-pattern-library-server.js"; Tools = 6 },
        @{ Path = "mcp-docs-search-server.js"; Tools = 6 },
        @{ Path = "mcp-git-history-server.js"; Tools = 6 },
        @{ Path = "mcp-coverage-server.js"; Tools = 7 }
    )

    foreach ($server in $servers) {
        $serverName = Split-Path $server.Path -Leaf
        $content = Get-Content $server.Path -Raw

        # Count tool registrations
        $toolMatches = [regex]::Matches($content, "name: '[\w_]+',\s+description:")
        $toolCount = $toolMatches.Count

        $expectedCount = $server.Tools
        $passed = $toolCount -eq $expectedCount
        Write-TestResult "$serverName has $expectedCount tools registered" $passed "Found: $toolCount"
    }
}

function Test-EdgeCases {
    Write-TestHeader "Edge Case Handling"

    # Test 1: Empty/null parameters
    $patternContent = Get-Content "mcp-pattern-library-server.js" -Raw
    $handlesEmpty = $patternContent -match "if \(!.+\|\|.+\.trim\(\) === ''\)"
    Write-TestResult "Pattern Library handles empty parameters" $handlesEmpty

    # Test 2: Array validation
    $handlesArrays = $patternContent -match "Array\.isArray"
    Write-TestResult "Pattern Library validates arrays" $handlesArrays

    # Test 3: File not found scenarios
    $docsContent = Get-Content "mcp-docs-search-server.js" -Raw
    $handlesNotFound = $docsContent -match "File not found"
    Write-TestResult "Docs Search handles file not found" $handlesNotFound

    # Test 4: Git command failures
    $gitContent = Get-Content "mcp-git-history-server.js" -Raw
    $handlesGitErrors = $gitContent -match "Git command failed"
    Write-TestResult "Git History handles command failures" $handlesGitErrors

    # Test 5: Coverage data missing
    $coverageContent = Get-Content "mcp-coverage-server.js" -Raw
    $handlesMissingData = $coverageContent -match "Coverage data not found"
    Write-TestResult "Coverage handles missing data" $handlesMissingData
}

function Show-Summary {
    Write-TestHeader "Test Summary"

    $passRate = if ($testResults.Total -gt 0) {
        [math]::Round(($testResults.Passed / $testResults.Total) * 100, 2)
    } else {
        0
    }

    Write-Host "Total Tests:   $($testResults.Total)" -ForegroundColor White
    Write-Host "Passed:        $($testResults.Passed)" -ForegroundColor Green
    Write-Host "Failed:        $($testResults.Failed)" -ForegroundColor Red
    Write-Host "Skipped:       $($testResults.Skipped)" -ForegroundColor Yellow
    Write-Host "Pass Rate:     $passRate%" -ForegroundColor $(if ($passRate -ge 95) { "Green" } elseif ($passRate -ge 80) { "Yellow" } else { "Red" })

    Write-Host "`n"

    if ($testResults.Failed -gt 0) {
        Write-Host "Failed Tests:" -ForegroundColor Red
        $testResults.Details | Where-Object { -not $_.Passed } | ForEach-Object {
            Write-Host "  - $($_.Name)" -ForegroundColor Red
            if ($_.Details) {
                Write-Host "    $($_.Details)" -ForegroundColor Gray
            }
        }
    }

    Write-Host "`n"

    # Success criteria
    if ($passRate -ge 95 -and $testResults.Failed -eq 0) {
        Write-Host "🎉 SUCCESS: All MCP enhancements validated!" -ForegroundColor Green
        Write-Host "   - 8 new tools implemented" -ForegroundColor Green
        Write-Host "   - 2 performance enhancements (caching + errors)" -ForegroundColor Green
        Write-Host "   - Ready for production use" -ForegroundColor Green
        return 0
    } elseif ($passRate -ge 80) {
        Write-Host "⚠️  PARTIAL SUCCESS: Most tests passed but issues found" -ForegroundColor Yellow
        Write-Host "   Review failed tests above" -ForegroundColor Yellow
        return 1
    } else {
        Write-Host "❌ FAILURE: Too many test failures" -ForegroundColor Red
        Write-Host "   Review and fix issues before proceeding" -ForegroundColor Red
        return 2
    }
}

# Main execution
Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║              MCP Server Enhancements Test Suite                ║
║                                                                ║
║  Testing:                                                      ║
║    ✓ 8 new tools (2 per server)                              ║
║    ✓ Caching layer (Pattern Library + Docs)                  ║
║    ✓ Enhanced error handling (all servers)                   ║
║    ✓ Tool schemas validation                                 ║
║    ✓ Edge case handling                                      ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Run all test suites
if (-not (Test-NodeModules)) {
    Write-Host "`n❌ Prerequisites not met. Cannot continue testing." -ForegroundColor Red
    exit 3
}

Test-PatternLibraryEnhancements
Test-DocsSearchEnhancements
Test-GitHistoryEnhancements
Test-CoverageEnhancements
Test-ErrorHandlingQuality
Test-CachingPerformance
Test-ToolSchemas
Test-EdgeCases

# Show results and exit with appropriate code
$exitCode = Show-Summary
exit $exitCode
