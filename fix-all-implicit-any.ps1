# ============================================
# Fix All Implicit Any Type Errors
# ============================================

Write-Host "`n🔧 Fixing All Implicit Any Type Errors" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green

$fixed = 0
$errors = @()

# Define files and their fix patterns
$files = @(
    @{
        Path = "frontend\lib\alertsV2.tsx"
        Replacements = @(
            @{
                Old = "set((state) => {"
                New = "set((state: any) => {"
            },
            @{
                Old = ".find(a => a.id ==="
                New = ".find((a: any) => a.id ==="
            },
            @{
                Old = ".findIndex(a => a.id ==="
                New = ".findIndex((a: any) => a.id ==="
            },
            @{
                Old = ".filter(alert => activeAlerts.has"
                New = ".filter((alert: any) => activeAlerts.has"
            },
            @{
                Old = ".filter(e => e.alertId"
                New = ".filter((e: any) => e.alertId"
            },
            @{
                Old = ".find(b => b.id ==="
                New = ".find((b: any) => b.id ==="
            }
        )
    },
    @{
        Path = "frontend\lib\backtester.tsx"
        Replacements = @(
            @{
                Old = "createStrategy: (strategyData) => {"
                New = "createStrategy: (strategyData: any) => {"
            },
            @{
                Old = "updateStrategy: (id, updates) => {"
                New = "updateStrategy: (id: any, updates: any) => {"
            },
            @{
                Old = "deleteStrategy: (id) => {"
                New = "deleteStrategy: (id: any) => {"
            },
            @{
                Old = "duplicateStrategy: (id, newName) => {"
                New = "duplicateStrategy: (id: any, newName: any) => {"
            },
            @{
                Old = "setActiveStrategy: (strategy) => {"
                New = "setActiveStrategy: (strategy: any) => {"
            },
            @{
                Old = "addCondition: (strategyId, type, condition) => {"
                New = "addCondition: (strategyId: any, type: any, condition: any) => {"
            },
            @{
                Old = "updateCondition: (strategyId, type, conditionId, updates) => {"
                New = "updateCondition: (strategyId: any, type: any, conditionId: any, updates: any) => {"
            },
            @{
                Old = "removeCondition: (strategyId, type, conditionId) => {"
                New = "removeCondition: (strategyId: any, type: any, conditionId: any) => {"
            },
            @{
                Old = "runBacktest: async (strategyId, symbols, config) => {"
                New = "runBacktest: async (strategyId: any, symbols: any, config: any) => {"
            },
            @{
                Old = "stopBacktest: (backtestId) => {"
                New = "stopBacktest: (backtestId: any) => {"
            },
            @{
                Old = "deleteBacktest: (backtestId) => {"
                New = "deleteBacktest: (backtestId: any) => {"
            },
            @{
                Old = "loadBacktestResults: async (backtestId) => {"
                New = "loadBacktestResults: async (backtestId: any) => {"
            },
            @{
                Old = "compareBacktests: (backtestIds) => {"
                New = "compareBacktests: (backtestIds: any) => {"
            },
            @{
                Old = "exportResults: async (backtestId, format) => {"
                New = "exportResults: async (backtestId: any, format: any) => {"
            },
            @{
                Old = "saveToLibrary: async (strategyId, isPublic) => {"
                New = "saveToLibrary: async (strategyId: any, isPublic: any) => {"
            },
            @{
                Old = "importStrategy: async (strategyData) => {"
                New = "importStrategy: async (strategyData: any) => {"
            },
            @{
                Old = "createLiveSignals: async (strategyId, symbols) => {"
                New = "createLiveSignals: async (strategyId: any, symbols: any) => {"
            },
            @{
                Old = "updateDefaultConfig: (config) => {"
                New = "updateDefaultConfig: (config: any) => {"
            },
            @{
                Old = "setDateRange: (start, end) => {"
                New = "setDateRange: (start: any, end: any) => {"
            },
            @{
                Old = "setSelectedSymbols: (symbols) => {"
                New = "setSelectedSymbols: (symbols: any) => {"
            },
            @{
                Old = "setSelectedTab: (tab) => {"
                New = "setSelectedTab: (tab: any) => {"
            },
            @{
                Old = "set((state) => {"
                New = "set((state: any) => {"
            },
            @{
                Old = ".find(s => s.id ==="
                New = ".find((s: any) => s.id ==="
            },
            @{
                Old = ".findIndex(s => s.id ==="
                New = ".findIndex((s: any) => s.id ==="
            },
            @{
                Old = ".find(c => c.id ==="
                New = ".find((c: any) => c.id ==="
            },
            @{
                Old = ".findIndex(c => c.id ==="
                New = ".findIndex((c: any) => c.id ==="
            },
            @{
                Old = ".filter(b => b."
                New = ".filter((b: any) => b."
            },
            @{
                Old = ".find(b => b.id ==="
                New = ".find((b: any) => b.id ==="
            },
            @{
                Old = ".findIndex(b => b.id ==="
                New = ".findIndex((b: any) => b.id ==="
            }
        )
    },
    @{
        Path = "frontend\lib\configurationSync.tsx"
        Replacements = @(
            @{
                Old = "set((state) => {"
                New = "set((state: any) => {"
            }
        )
    },
    @{
        Path = "frontend\lib\corporateActions.tsx"
        Replacements = @(
            @{
                Old = "set((state) => {"
                New = "set((state: any) => {"
            }
        )
    },
    @{
        Path = "frontend\lib\environmentManagement.tsx"
        Replacements = @(
            @{
                Old = "set((state) => {"
                New = "set((state: any) => {"
            }
        )
    },
    @{
        Path = "frontend\lib\integrationTesting.tsx"
        Replacements = @(
            @{
                Old = "set((state) => {"
                New = "set((state: any) => {"
            }
        )
    },
    @{
        Path = "frontend\lib\mobileA11y.tsx"
        Replacements = @(
            @{
                Old = "set((state) => {"
                New = "set((state: any) => {"
            }
        )
    },
    @{
        Path = "frontend\lib\monitoring.tsx"
        Replacements = @(
            @{
                Old = "set((state) => {"
                New = "set((state: any) => {"
            }
        )
    },
    @{
        Path = "frontend\lib\multiChart.tsx"
        Replacements = @(
            @{
                Old = "set((state) => {"
                New = "set((state: any) => {"
            }
        )
    },
    @{
        Path = "frontend\lib\observability.tsx"
        Replacements = @(
            @{
                Old = "set((state) => {"
                New = "set((state: any) => {"
            }
        )
    },
    @{
        Path = "frontend\lib\paperTrading.tsx"
        Replacements = @(
            @{
                Old = "set((state) => {"
                New = "set((state: any) => {"
            }
        )
    },
    @{
        Path = "frontend\lib\performance.tsx"
        Replacements = @(
            @{
                Old = "set((state) => {"
                New = "set((state: any) => {"
            }
        )
    },
    @{
        Path = "frontend\lib\progressiveDeployment.tsx"
        Replacements = @(
            @{
                Old = "set((state) => {"
                New = "set((state: any) => {"
            }
        )
    },
    @{
        Path = "frontend\lib\rollback.tsx"
        Replacements = @(
            @{
                Old = "set((state) => {"
                New = "set((state: any) => {"
            }
        )
    },
    @{
        Path = "frontend\lib\social.tsx"
        Replacements = @(
            @{
                Old = "set((state) => {"
                New = "set((state: any) => {"
            }
        )
    },
    @{
        Path = "frontend\lib\templates.tsx"
        Replacements = @(
            @{
                Old = "set((state) => {"
                New = "set((state: any) => {"
            }
        )
    },
    @{
        Path = "frontend\lib\watchlist.tsx"
        Replacements = @(
            @{
                Old = "set((state) => {"
                New = "set((state: any) => {"
            }
        )
    }
)

# Process each file
foreach ($file in $files) {
    $filePath = $file.Path
    
    if (Test-Path $filePath) {
        try {
            $content = Get-Content $filePath -Raw
            $modified = $false
            
            foreach ($replacement in $file.Replacements) {
                if ($content -match [regex]::Escape($replacement.Old)) {
                    $content = $content -replace [regex]::Escape($replacement.Old), $replacement.New
                    $modified = $true
                }
            }
            
            if ($modified) {
                Set-Content -Path $filePath -Value $content -NoNewline
                Write-Host "  ✅ Fixed: $filePath" -ForegroundColor Green
                $fixed++
            }
        } catch {
            $errorMsg = "Error processing ${filePath}: $_"
            $errors += $errorMsg
            Write-Host "  ❌ $errorMsg" -ForegroundColor Red
        }
    } else {
        Write-Host "  ⚠️  File not found: $filePath" -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n============================================" -ForegroundColor Green
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "  Files Fixed: $fixed" -ForegroundColor Green

if ($errors.Count -gt 0) {
    Write-Host "`n⚠️  Errors encountered:" -ForegroundColor Yellow
    foreach ($err in $errors) {
        Write-Host "  • $err" -ForegroundColor Red
    }
}

Write-Host "`n✨ Done! Run TypeScript type check to verify fixes." -ForegroundColor Cyan
Write-Host "`n💡 Next steps:" -ForegroundColor Yellow
Write-Host "   1. cd frontend" -ForegroundColor White
Write-Host "   2. npm run typecheck" -ForegroundColor White
Write-Host "============================================`n" -ForegroundColor Green
