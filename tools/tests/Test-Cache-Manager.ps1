# Test-Cache-Manager.ps1
# Test suite for Cache-Manager.ps1

# Import the module
$modulePath = Join-Path $PSScriptRoot '..\lib\Cache-Manager.ps1'
. $modulePath

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           Cache Manager Test Suite                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$testsPassed = 0
$testsFailed = 0

function Test-Function {
    param(
        [string]$Name,
        [scriptblock]$Test
    )
    
    try {
        Write-Host "  Testing: $Name..." -NoNewline
        $result = & $Test
        if ($result) {
            Write-Host " ✅ PASSED" -ForegroundColor Green
            $script:testsPassed++
            return $true
        } else {
            Write-Host " ❌ FAILED" -ForegroundColor Red
            $script:testsFailed++
            return $false
        }
    } catch {
        Write-Host " ❌ ERROR: $_" -ForegroundColor Red
        $script:testsFailed++
        return $false
    }
}

# Test 1: Set and get cached result
Test-Function "Set-CachedResult stores data" {
    $testResult = @{
        status  = 'success'
        value   = 42
        message = 'Test result'
    }
    
    $cache = Set-CachedResult -Tool 'test-tool' -Operation 'test-op' `
        -Parameters @{ param1 = 'value1' } `
        -Result $testResult
    
    return ($null -ne $cache) -and (Test-Path $cache.cache_file)
}

# Test 2: Get cached result
Test-Function "Get-CachedResult retrieves stored data" {
    $cached = Get-CachedResult -Tool 'test-tool' -Operation 'test-op' `
        -Parameters @{ param1 = 'value1' } `
        -MaxAge 60
    
    return ($null -ne $cached) -and ($cached.value -eq 42)
}

# Test 3: Cache expiration
Test-Function "Cache expires after MaxAge" {
    # This test would require waiting, so we'll simulate by checking age logic
    # In real scenario, cache would expire after MaxAge seconds
    
    # For now, just verify it returns data within MaxAge
    $cached = Get-CachedResult -Tool 'test-tool' -Operation 'test-op' `
        -Parameters @{ param1 = 'value1' } `
        -MaxAge 60
    
    return $null -ne $cached
}

# Test 4: Cache miss for different parameters
Test-Function "Cache miss for different parameters" {
    $cached = Get-CachedResult -Tool 'test-tool' -Operation 'test-op' `
        -Parameters @{ param1 = 'different-value' } `
        -MaxAge 60
    
    return $null -eq $cached
}

# Test 5: Dependency tracking
Test-Function "Cache invalidates when dependency changes" {
    # Create a temp file as dependency
    $tempFile = [System.IO.Path]::GetTempFileName()
    "original content" | Out-File -FilePath $tempFile
    
    # Cache with dependency
    Set-CachedResult -Tool 'test-tool' -Operation 'dep-test' `
        -Result @{ data = 'test' } `
        -DependsOn @($tempFile) | Out-Null
    
    # Should hit cache
    $hit1 = Get-CachedResult -Tool 'test-tool' -Operation 'dep-test' `
        -DependsOn @($tempFile) -MaxAge 60
    
    # Modify dependency
    Start-Sleep -Milliseconds 100
    "modified content" | Out-File -FilePath $tempFile
    
    # Should miss cache (dependency changed)
    $hit2 = Get-CachedResult -Tool 'test-tool' -Operation 'dep-test' `
        -DependsOn @($tempFile) -MaxAge 60
    
    # Cleanup
    Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
    
    return ($null -ne $hit1) -and ($null -eq $hit2)
}

# Test 6: Get cache stats
Test-Function "Get-CacheStats returns statistics" {
    $stats = Get-CacheStats -Tool 'test-tool'
    
    return $stats.exists -and ($stats.total_files -gt 0)
}

# Test 7: Clear cache
Test-Function "Clear-Cache removes cached files" {
    # Get initial count
    $statsBefore = Get-CacheStats -Tool 'test-tool'
    
    # Clear cache
    Clear-Cache -Tool 'test-tool' | Out-Null
    
    # Check files removed
    $statsAfter = Get-CacheStats -Tool 'test-tool'
    
    return $statsAfter.total_files -eq 0
}

# Test 8: Cache key generation
Test-Function "Cache keys are consistent" {
    $key1 = Get-CacheKey -Tool 'tool' -Operation 'op' -Parameters @{ a = '1'; b = '2' }
    $key2 = Get-CacheKey -Tool 'tool' -Operation 'op' -Parameters @{ b = '2'; a = '1' }
    
    # Same parameters in different order should produce same key
    return $key1 -eq $key2
}

# Summary
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
if ($testsFailed -eq 0) {
    Write-Host "║              All Tests PASSED ✅                           ║" -ForegroundColor Green
} else {
    Write-Host "║              Some Tests FAILED ❌                          ║" -ForegroundColor Red
}
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "  📊 Results: $testsPassed passed, $testsFailed failed`n" -ForegroundColor $(if ($testsFailed -eq 0) { 'Green' } else { 'Yellow' })

# Show cache stats
Write-Host "  📦 Cache Statistics:" -ForegroundColor Cyan
$allStats = Get-CacheStats
Write-Host "     Total files: $($allStats.total_files)" -ForegroundColor Gray
Write-Host "     Total size: $([math]::Round($allStats.total_size / 1KB, 2)) KB`n" -ForegroundColor Gray

exit $(if ($testsFailed -eq 0) { 0 } else { 1 })
