# 🧪 Quick Test Script - Scanning Modes

Write-Host "🧪 Testing Codebase Analyzer Scanning Modes" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host ""

# Source the analyzer
$analyzerPath = "c:\Users\USER\Desktop\lokifi\tools\scripts\analysis\codebase-analyzer.ps1"
. $analyzerPath

Write-Host "✅ Analyzer loaded!" -ForegroundColor Green
Write-Host ""

# Show menu
Write-Host "Select a test to run:" -ForegroundColor Cyan
Write-Host "  1. Full Scan (complete, ~60-90s)" -ForegroundColor White
Write-Host "  2. CodeOnly Scan (faster, ~30-45s)" -ForegroundColor White
Write-Host "  3. DocsOnly Scan (fast, ~5-10s)" -ForegroundColor White
Write-Host "  4. Quick Scan (very fast, ~15-20s)" -ForegroundColor White
Write-Host "  5. Search Scan (find TODOs)" -ForegroundColor White
Write-Host "  6. Custom Scan (Python only)" -ForegroundColor White
Write-Host "  7. Run All Tests (comprehensive)" -ForegroundColor Yellow
Write-Host ""

$choice = Read-Host "Enter choice (1-7)"

switch ($choice) {
    '1' {
        Write-Host "`n🌍 Testing Full Scan..." -ForegroundColor Cyan
        Invoke-CodebaseAnalysis -ScanMode Full -OutputFormat markdown
    }

    '2' {
        Write-Host "`n💻 Testing CodeOnly Scan..." -ForegroundColor Cyan
        Invoke-CodebaseAnalysis -ScanMode CodeOnly -OutputFormat markdown
    }

    '3' {
        Write-Host "`n📚 Testing DocsOnly Scan..." -ForegroundColor Cyan
        Invoke-CodebaseAnalysis -ScanMode DocsOnly -OutputFormat markdown
    }

    '4' {
        Write-Host "`n⚡ Testing Quick Scan..." -ForegroundColor Cyan
        Invoke-CodebaseAnalysis -ScanMode Quick -OutputFormat markdown
    }

    '5' {
        Write-Host "`n🔎 Testing Search Scan (looking for TODO, FIXME, BUG)..." -ForegroundColor Cyan
        Invoke-CodebaseAnalysis -ScanMode Search -SearchKeywords @('TODO', 'FIXME', 'BUG') -OutputFormat markdown
    }

    '6' {
        Write-Host "`n🎨 Testing Custom Scan (Python files only)..." -ForegroundColor Cyan
        Invoke-CodebaseAnalysis -ScanMode Custom -CustomIncludePatterns @('*.py') -OutputFormat markdown
    }

    '7' {
        Write-Host "`n🔬 Running All Tests..." -ForegroundColor Yellow
        Write-Host ""

        # Test 1: Full
        Write-Host "Test 1/6: Full Scan" -ForegroundColor Cyan
        $full = Measure-Command {
            Invoke-CodebaseAnalysis -ScanMode Full -OutputFormat json | Out-Null
        }
        Write-Host "  Time: $([math]::Round($full.TotalSeconds, 1))s" -ForegroundColor Gray
        Write-Host ""

        # Test 2: CodeOnly
        Write-Host "Test 2/6: CodeOnly Scan" -ForegroundColor Cyan
        $codeOnly = Measure-Command {
            Invoke-CodebaseAnalysis -ScanMode CodeOnly -OutputFormat json | Out-Null
        }
        Write-Host "  Time: $([math]::Round($codeOnly.TotalSeconds, 1))s" -ForegroundColor Gray
        $speedup = [math]::Round($full.TotalSeconds / $codeOnly.TotalSeconds, 1)
        Write-Host "  Speedup: ${speedup}x faster" -ForegroundColor Green
        Write-Host ""

        # Test 3: DocsOnly
        Write-Host "Test 3/6: DocsOnly Scan" -ForegroundColor Cyan
        $docsOnly = Measure-Command {
            Invoke-CodebaseAnalysis -ScanMode DocsOnly -OutputFormat json | Out-Null
        }
        Write-Host "  Time: $([math]::Round($docsOnly.TotalSeconds, 1))s" -ForegroundColor Gray
        $speedup = [math]::Round($full.TotalSeconds / $docsOnly.TotalSeconds, 1)
        Write-Host "  Speedup: ${speedup}x faster" -ForegroundColor Green
        Write-Host ""

        # Test 4: Quick
        Write-Host "Test 4/6: Quick Scan" -ForegroundColor Cyan
        $quick = Measure-Command {
            Invoke-CodebaseAnalysis -ScanMode Quick -OutputFormat json | Out-Null
        }
        Write-Host "  Time: $([math]::Round($quick.TotalSeconds, 1))s" -ForegroundColor Gray
        $speedup = [math]::Round($full.TotalSeconds / $quick.TotalSeconds, 1)
        Write-Host "  Speedup: ${speedup}x faster" -ForegroundColor Green
        Write-Host ""

        # Test 5: Search
        Write-Host "Test 5/6: Search Scan" -ForegroundColor Cyan
        $search = Measure-Command {
            Invoke-CodebaseAnalysis -ScanMode Search -SearchKeywords @('TODO') -OutputFormat json | Out-Null
        }
        Write-Host "  Time: $([math]::Round($search.TotalSeconds, 1))s" -ForegroundColor Gray
        Write-Host ""

        # Test 6: Custom
        Write-Host "Test 6/6: Custom Scan" -ForegroundColor Cyan
        $custom = Measure-Command {
            Invoke-CodebaseAnalysis -ScanMode Custom -CustomIncludePatterns @('*.py') -OutputFormat json | Out-Null
        }
        Write-Host "  Time: $([math]::Round($custom.TotalSeconds, 1))s" -ForegroundColor Gray
        Write-Host ""

        # Summary
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
        Write-Host "📊 TEST RESULTS SUMMARY" -ForegroundColor Green
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
        Write-Host ""
        Write-Host "Mode          Time      Speedup" -ForegroundColor Cyan
        Write-Host "─────────────────────────────────────" -ForegroundColor Blue
        Write-Host "Full          $([math]::Round($full.TotalSeconds, 1))s      baseline" -ForegroundColor White
        Write-Host "CodeOnly      $([math]::Round($codeOnly.TotalSeconds, 1))s      $([math]::Round($full.TotalSeconds / $codeOnly.TotalSeconds, 1))x faster" -ForegroundColor Green
        Write-Host "DocsOnly      $([math]::Round($docsOnly.TotalSeconds, 1))s       $([math]::Round($full.TotalSeconds / $docsOnly.TotalSeconds, 1))x faster" -ForegroundColor Green
        Write-Host "Quick         $([math]::Round($quick.TotalSeconds, 1))s      $([math]::Round($full.TotalSeconds / $quick.TotalSeconds, 1))x faster" -ForegroundColor Green
        Write-Host "Search        $([math]::Round($search.TotalSeconds, 1))s      comprehensive" -ForegroundColor Yellow
        Write-Host "Custom        $([math]::Round($custom.TotalSeconds, 1))s      depends" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "✅ All tests completed successfully!" -ForegroundColor Green
    }

    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Test complete!" -ForegroundColor Green
Write-Host ""
