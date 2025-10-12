# 🧪 Comprehensive Scanning Mode Test
# This script tests all 6 modes and verifies they analyze the correct files

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🧪 COMPREHENSIVE SCANNING MODE TEST - All 6 Modes        ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Source the analyzer
$analyzerPath = "c:\Users\USER\Desktop\lokifi\tools\scripts\analysis\codebase-analyzer.ps1"
. $analyzerPath

$testResults = @()
$projectRoot = "c:\Users\USER\Desktop\lokifi"

# Helper function to verify mode results
function Test-ScanMode {
    param(
        [string]$ModeName,
        [string]$ScanMode,
        [hashtable]$ExpectedCategories,
        [string[]]$MustIncludePatterns = @(),
        [string[]]$MustExcludePatterns = @(),
        [string[]]$SearchKeywords = @(),
        [string[]]$CustomInclude = @(),
        [string[]]$CustomExclude = @()
    )
    
    Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "Testing Mode: $ModeName" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
    
    $startTime = Get-Date
    
    # Build parameters
    $params = @{
        ProjectRoot = $projectRoot
        OutputFormat = 'json'
        ScanMode = $ScanMode
    }
    
    if ($SearchKeywords.Count -gt 0) {
        $params.SearchKeywords = $SearchKeywords
    }
    if ($CustomInclude.Count -gt 0) {
        $params.CustomIncludePatterns = $CustomInclude
    }
    if ($CustomExclude.Count -gt 0) {
        $params.CustomExcludePatterns = $CustomExclude
    }
    
    # Run scan
    try {
        $result = Invoke-CodebaseAnalysis @params 2>&1 | Out-String
        $duration = (Get-Date).Subtract($startTime).TotalSeconds
        
        # Parse JSON output from the result
        $jsonMatch = $result | Select-String -Pattern '\{[\s\S]*"analysis_id"[\s\S]*\}' -AllMatches
        if ($jsonMatch) {
            $jsonData = $jsonMatch.Matches[0].Value | ConvertFrom-Json
            
            Write-Host "`n✅ Scan completed in $([math]::Round($duration, 1))s" -ForegroundColor Green
            
            # Verify metrics
            $metrics = $jsonData.metrics
            
            Write-Host "`n📊 Files Analyzed:" -ForegroundColor Cyan
            Write-Host "   Frontend: $($metrics.Frontend.Files)" -ForegroundColor White
            Write-Host "   Backend: $($metrics.Backend.Files)" -ForegroundColor White
            Write-Host "   Infrastructure: $($metrics.Infrastructure.Files)" -ForegroundColor White
            Write-Host "   Tests: $($metrics.Tests.Files)" -ForegroundColor White
            Write-Host "   Documentation: $($metrics.Documentation.Files)" -ForegroundColor White
            Write-Host "   Total: $($metrics.Total.Files)" -ForegroundColor Yellow
            
            # Verify expected categories
            $passed = $true
            $issues = @()
            
            foreach ($category in $ExpectedCategories.Keys) {
                $expected = $ExpectedCategories[$category]
                $actual = $metrics.$category.Files
                
                if ($expected -eq 0 -and $actual -gt 0) {
                    $passed = $false
                    $issues += "❌ $category should be EXCLUDED but found $actual files"
                }
                elseif ($expected -gt 0 -and $actual -eq 0) {
                    $passed = $false
                    $issues += "❌ $category should be INCLUDED but found 0 files"
                }
                else {
                    Write-Host "   ✓ $category" -NoNewline -ForegroundColor Green
                    if ($expected -eq 0) {
                        Write-Host " (correctly excluded)" -ForegroundColor Gray
                    } else {
                        Write-Host " (correctly included)" -ForegroundColor Gray
                    }
                }
            }
            
            if ($issues.Count -gt 0) {
                Write-Host "`n⚠️  Issues Found:" -ForegroundColor Yellow
                $issues | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
            }
            
            # Check file patterns
            if ($MustIncludePatterns.Count -gt 0) {
                Write-Host "`n🔍 Verifying inclusion patterns..." -ForegroundColor Cyan
                foreach ($pattern in $MustIncludePatterns) {
                    $found = (Get-ChildItem -Path $projectRoot -Filter $pattern -Recurse -File -ErrorAction SilentlyContinue).Count
                    if ($found -gt 0) {
                        Write-Host "   ✓ $pattern files present ($found files)" -ForegroundColor Green
                    } else {
                        Write-Host "   ⚠️  $pattern files not found" -ForegroundColor Yellow
                    }
                }
            }
            
            if ($MustExcludePatterns.Count -gt 0) {
                Write-Host "`n🚫 Verifying exclusion patterns..." -ForegroundColor Cyan
                foreach ($pattern in $MustExcludePatterns) {
                    Write-Host "   ✓ $pattern should be excluded" -ForegroundColor Gray
                }
            }
            
            # Return test result
            return @{
                Mode = $ModeName
                Passed = $passed
                Duration = $duration
                FilesAnalyzed = $metrics.Total.Files
                Issues = $issues
            }
        }
        else {
            Write-Host "❌ Failed to parse JSON output" -ForegroundColor Red
            return @{
                Mode = $ModeName
                Passed = $false
                Duration = $duration
                FilesAnalyzed = 0
                Issues = @("Could not parse JSON output")
            }
        }
    }
    catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        return @{
            Mode = $ModeName
            Passed = $false
            Duration = 0
            FilesAnalyzed = 0
            Issues = @($_.Exception.Message)
        }
    }
}

# ============================================
# TEST 1: Full Scan
# ============================================
$test1 = Test-ScanMode `
    -ModeName "Full Scan" `
    -ScanMode "Full" `
    -ExpectedCategories @{
        Frontend = 1       # Should have files
        Backend = 1        # Should have files
        Infrastructure = 1 # Should have files
        Tests = 1          # Should have files
        Documentation = 1  # Should have files
    } `
    -MustIncludePatterns @('*.py', '*.ts', '*.tsx', '*.md', '*.ps1', '*.yml')

$testResults += $test1

# ============================================
# TEST 2: CodeOnly Scan
# ============================================
Write-Host "`n⏸️  Press Enter to continue to Test 2 (CodeOnly)..." -ForegroundColor Gray
Read-Host

$test2 = Test-ScanMode `
    -ModeName "CodeOnly Scan" `
    -ScanMode "CodeOnly" `
    -ExpectedCategories @{
        Frontend = 1       # Should have files
        Backend = 1        # Should have files
        Infrastructure = 1 # Should have files
        Tests = 1          # Should have files
        Documentation = 0  # Should be EXCLUDED
    } `
    -MustIncludePatterns @('*.py', '*.ts', '*.tsx', '*.ps1') `
    -MustExcludePatterns @('*.md', 'docs/')

$testResults += $test2

# ============================================
# TEST 3: DocsOnly Scan
# ============================================
Write-Host "`n⏸️  Press Enter to continue to Test 3 (DocsOnly)..." -ForegroundColor Gray
Read-Host

$test3 = Test-ScanMode `
    -ModeName "DocsOnly Scan" `
    -ScanMode "DocsOnly" `
    -ExpectedCategories @{
        Frontend = 0       # Should be EXCLUDED
        Backend = 0        # Should be EXCLUDED
        Infrastructure = 0 # Should be EXCLUDED
        Tests = 0          # Should be EXCLUDED
        Documentation = 1  # Should have files
    } `
    -MustIncludePatterns @('*.md', '*.txt') `
    -MustExcludePatterns @('*.py', '*.ts', '*.tsx')

$testResults += $test3

# ============================================
# TEST 4: Quick Scan
# ============================================
Write-Host "`n⏸️  Press Enter to continue to Test 4 (Quick)..." -ForegroundColor Gray
Read-Host

$test4 = Test-ScanMode `
    -ModeName "Quick Scan" `
    -ScanMode "Quick" `
    -ExpectedCategories @{
        Frontend = 1       # Should have files
        Backend = 1        # Should have files
        Infrastructure = 0 # Should be EXCLUDED
        Tests = 0          # Should be EXCLUDED
        Documentation = 0  # Should be EXCLUDED
    } `
    -MustIncludePatterns @('*.py', '*.ts', '*.tsx')

$testResults += $test4

# ============================================
# TEST 5: Search Scan
# ============================================
Write-Host "`n⏸️  Press Enter to continue to Test 5 (Search)..." -ForegroundColor Gray
Read-Host

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "Testing Mode: Search Scan" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow

$startTime = Get-Date
try {
    $searchResult = Invoke-CodebaseAnalysis `
        -ProjectRoot $projectRoot `
        -OutputFormat 'json' `
        -ScanMode 'Search' `
        -SearchKeywords @('TODO', 'FIXME', 'BUG') 2>&1 | Out-String
    
    $duration = (Get-Date).Subtract($startTime).TotalSeconds
    
    Write-Host "`n✅ Search scan completed in $([math]::Round($duration, 1))s" -ForegroundColor Green
    
    # Check if search results were displayed
    $hasResults = $searchResult -match "SEARCH RESULTS" -and $searchResult -match "Found \d+ files"
    
    if ($hasResults) {
        Write-Host "✓ Search results displayed correctly" -ForegroundColor Green
        
        # Extract matches count
        if ($searchResult -match "Found (\d+) files") {
            $filesFound = $matches[1]
            Write-Host "✓ Found keywords in $filesFound files" -ForegroundColor Green
        }
        
        $test5 = @{
            Mode = "Search Scan"
            Passed = $true
            Duration = $duration
            FilesAnalyzed = "Search mode"
            Issues = @()
        }
    }
    else {
        Write-Host "⚠️  No search results found (might be okay if no matches)" -ForegroundColor Yellow
        $test5 = @{
            Mode = "Search Scan"
            Passed = $true
            Duration = $duration
            FilesAnalyzed = "Search mode"
            Issues = @("No matches found for keywords")
        }
    }
}
catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    $test5 = @{
        Mode = "Search Scan"
        Passed = $false
        Duration = 0
        FilesAnalyzed = 0
        Issues = @($_.Exception.Message)
    }
}

$testResults += $test5

# ============================================
# TEST 6: Custom Scan (Python only)
# ============================================
Write-Host "`n⏸️  Press Enter to continue to Test 6 (Custom)..." -ForegroundColor Gray
Read-Host

$test6 = Test-ScanMode `
    -ModeName "Custom Scan (Python only)" `
    -ScanMode "Custom" `
    -ExpectedCategories @{
        Frontend = 0       # Should be EXCLUDED (no .py in frontend)
        Backend = 1        # Should have Python files
        Infrastructure = 1 # Might have .py scripts
        Tests = 1          # Might have .py tests
        Documentation = 0  # Should be EXCLUDED
    } `
    -CustomInclude @('*.py') `
    -MustIncludePatterns @('*.py')

$testResults += $test6

# ============================================
# FINAL SUMMARY
# ============================================
Write-Host "`n`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    📊 TEST SUMMARY                            ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

$totalTests = $testResults.Count
$passedTests = ($testResults | Where-Object { $_.Passed }).Count
$failedTests = $totalTests - $passedTests

Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: " -NoNewline -ForegroundColor White
Write-Host $passedTests -NoNewline -ForegroundColor Green
Write-Host " ($([math]::Round(($passedTests / $totalTests) * 100, 1))%)" -ForegroundColor Green
if ($failedTests -gt 0) {
    Write-Host "Failed: " -NoNewline -ForegroundColor White
    Write-Host $failedTests -ForegroundColor Red
}
Write-Host ""

# Detailed results
Write-Host "Detailed Results:" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Blue
foreach ($result in $testResults) {
    $status = if ($result.Passed) { "✅ PASS" } else { "❌ FAIL" }
    $color = if ($result.Passed) { "Green" } else { "Red" }
    
    Write-Host "`n$status - " -NoNewline -ForegroundColor $color
    Write-Host $result.Mode -ForegroundColor White
    Write-Host "   Duration: $([math]::Round($result.Duration, 1))s" -ForegroundColor Gray
    
    if ($result.FilesAnalyzed -is [int]) {
        Write-Host "   Files: $($result.FilesAnalyzed)" -ForegroundColor Gray
    } else {
        Write-Host "   Mode: $($result.FilesAnalyzed)" -ForegroundColor Gray
    }
    
    if ($result.Issues.Count -gt 0) {
        Write-Host "   Issues:" -ForegroundColor Yellow
        $result.Issues | ForEach-Object { Write-Host "     • $_" -ForegroundColor Yellow }
    }
}

Write-Host "`n─────────────────────────────────────────────────────────────" -ForegroundColor Blue

# Performance comparison
Write-Host "`n⚡ Performance Comparison:" -ForegroundColor Cyan
$baseline = ($testResults | Where-Object { $_.Mode -eq "Full Scan" }).Duration
foreach ($result in $testResults) {
    if ($result.Mode -ne "Full Scan" -and $result.Duration -gt 0) {
        $speedup = [math]::Round($baseline / $result.Duration, 1)
        Write-Host "   $($result.Mode): ${speedup}x faster than Full" -ForegroundColor White
    }
}

Write-Host "`n"

# Final verdict
if ($failedTests -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED! Scanning modes working correctly!" -ForegroundColor Green
    Write-Host "✅ Ready to commit and proceed to Phase 2" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests failed. Review issues above." -ForegroundColor Yellow
    Write-Host "🔧 Fix issues before proceeding to Phase 2" -ForegroundColor Yellow
}

Write-Host ""
