# ============================================
# Replace Console.log with Proper Logging
# ============================================

Write-Host "`n🔧 Upgrading Console Statements to Proper Logging" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green

$targetFiles = @(
    "frontend\src\services\marketData.ts",
    "frontend\src\services\backendPriceService.ts",
    "frontend\src\lib\apiFetch.ts"
)

$replacements = @(
    @{
        Pattern = "console\.log\('🌐 apiFetch:"
        Replacement = "// Removed console.log - use logger.api instead"
        Description = "API fetch logging"
    },
    @{
        Pattern = "console\.log\('✅ WebSocket connected'\)"
        Replacement = "logger.websocket('Connected')"
        Description = "WebSocket connected"
    },
    @{
        Pattern = "console\.log\('WebSocket disconnected'\)"
        Replacement = "logger.websocket('Disconnected')"
        Description = "WebSocket disconnected"
    },
    @{
        Pattern = "console\.log\(\`🎉 \$\{message\.message\}\`\)"
        Replacement = "logger.info(message.message)"
        Description = "WebSocket messages"
    },
    @{
        Pattern = "console\.log\(\`✅ Subscribed to:"
        Replacement = "logger.websocket('Subscribed',"
        Description = "WebSocket subscriptions"
    },
    @{
        Pattern = "console\.log\(\`❌ Unsubscribed from:"
        Replacement = "logger.websocket('Unsubscribed',"
        Description = "WebSocket unsubscriptions"
    },
    @{
        Pattern = "console\.log\('🏓 Pong received'\)"
        Replacement = "logger.websocket('Pong received')"
        Description = "WebSocket pong"
    },
    @{
        Pattern = "console\.log\(\`Reconnecting in"
        Replacement = "logger.info(`Reconnecting in"
        Description = "WebSocket reconnect"
    },
    @{
        Pattern = "console\.warn\('Failed to fetch real prices"
        Replacement = "logger.warn('Failed to fetch real prices"
        Description = "Price fetch warnings"
    },
    @{
        Pattern = "console\.warn\('WebSocket not connected"
        Replacement = "logger.warn('WebSocket not connected"
        Description = "WebSocket warnings"
    },
    @{
        Pattern = "console\.error\('Error fetching real prices:"
        Replacement = "logger.error('Error fetching real prices:"
        Description = "Price fetch errors"
    },
    @{
        Pattern = "console\.error\('Failed to fetch"
        Replacement = "logger.error('Failed to fetch"
        Description = "General fetch errors"
    },
    @{
        Pattern = "console\.error\('WebSocket error:"
        Replacement = "logger.error('WebSocket error:"
        Description = "WebSocket errors"
    },
    @{
        Pattern = "console\.error\('Failed to parse WebSocket message:"
        Replacement = "logger.error('Failed to parse WebSocket message:"
        Description = "WebSocket parse errors"
    },
    @{
        Pattern = "console\.error\('Max reconnect attempts reached'\)"
        Replacement = "logger.error('Max reconnect attempts reached')"
        Description = "WebSocket max reconnect"
    },
    @{
        Pattern = "console\.error\('Reconnection failed:"
        Replacement = "logger.error('Reconnection failed:"
        Description = "WebSocket reconnection errors"
    }
)

Write-Host "`n📝 Note: This script identifies logging opportunities." -ForegroundColor Yellow
Write-Host "   Manual review recommended for context-specific logging." -ForegroundColor Yellow
Write-Host ""

$totalFound = 0
foreach ($file in $targetFiles) {
    $filePath = Join-Path $PSScriptRoot $file
    
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        $fileMatches = 0
        
        foreach ($replacement in $replacements) {
            $pattern = $replacement.Pattern
            if ($content -match $pattern) {
                $fileMatches++
                $totalFound++
            }
        }
        
        if ($fileMatches -gt 0) {
            Write-Host "  📄 $file" -ForegroundColor White
            Write-Host "     Found: $fileMatches console statements" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "  Total console statements found: $totalFound" -ForegroundColor White
Write-Host ""
Write-Host "💡 Recommendation:" -ForegroundColor Yellow
Write-Host "   1. Import logger: import { logger } from '@/src/utils/logger';" -ForegroundColor White
Write-Host "   2. Replace console.log with logger methods" -ForegroundColor White
Write-Host "   3. Use logger.debug for development-only logs" -ForegroundColor White
Write-Host "   4. Use logger.info for important information" -ForegroundColor White
Write-Host "   5. Use logger.warn for warnings" -ForegroundColor White
Write-Host "   6. Use logger.error for errors" -ForegroundColor White
Write-Host ""
Write-Host "✨ Benefits:" -ForegroundColor Cyan
Write-Host "   • Environment-aware logging (dev vs prod)" -ForegroundColor Green
Write-Host "   • Better performance (no logs in production)" -ForegroundColor Green
Write-Host "   • Structured logging for easier debugging" -ForegroundColor Green
Write-Host "   • Ready for error tracking integration" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green
