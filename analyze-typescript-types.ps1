# ============================================
# Improve TypeScript Types in App Pages
# ============================================

Write-Host "`n🎯 Analyzing TypeScript Type Usage" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green

$appDir = Join-Path $PSScriptRoot "frontend\app"

Write-Host "`n🔍 Scanning for 'any' type usage..." -ForegroundColor Yellow

# Find files with any types
$anyUsage = Get-ChildItem -Path $appDir -Recurse -Include "*.tsx","*.ts" | 
    Select-String -Pattern ": any[\[\]\s,>\)]" | 
    Group-Object Path

Write-Host "`n📊 Files with 'any' type usage:" -ForegroundColor Cyan
$totalFiles = 0
$totalOccurrences = 0

foreach ($group in $anyUsage | Sort-Object Name) {
    $totalFiles++
    $count = $group.Count
    $totalOccurrences += $count
    $fileName = Split-Path $group.Name -Leaf
    $relativePath = $group.Name.Replace($appDir, "app").Replace("\", "/")
    
    Write-Host "  📄 $relativePath" -ForegroundColor White
    Write-Host "     Occurrences: $count" -ForegroundColor Gray
    
    # Show first few occurrences
    $group.Group | Select-Object -First 3 | ForEach-Object {
        $lineNum = $_.LineNumber
        $line = $_.Line.Trim()
        if ($line.Length -gt 80) {
            $line = $line.Substring(0, 77) + "..."
        }
        Write-Host "     L$lineNum : $line" -ForegroundColor DarkGray
    }
    
    if ($group.Count -gt 3) {
        Write-Host "     ... and $($group.Count - 3) more" -ForegroundColor DarkGray
    }
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Green
Write-Host "📈 Statistics" -ForegroundColor Cyan
Write-Host "  Files with 'any': $totalFiles" -ForegroundColor White
Write-Host "  Total occurrences: $totalOccurrences" -ForegroundColor White
Write-Host ""

# Provide recommendations
Write-Host "💡 Recommendations for Type Safety:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Define Proper Interfaces:" -ForegroundColor Cyan
Write-Host "   interface Asset {" -ForegroundColor Gray
Write-Host "     id: string;" -ForegroundColor Gray
Write-Host "     name: string;" -ForegroundColor Gray
Write-Host "     type: 'stock' | 'crypto' | 'metal';" -ForegroundColor Gray
Write-Host "     value: number;" -ForegroundColor Gray
Write-Host "   }" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Use Generic Types:" -ForegroundColor Cyan
Write-Host "   const handleData = <T>(data: T[]): void => {" -ForegroundColor Gray
Write-Host "     // Type-safe data handling" -ForegroundColor Gray
Write-Host "   }" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Type Guards for Safety:" -ForegroundColor Cyan
Write-Host "   function isStock(asset: Asset): asset is Stock {" -ForegroundColor Gray
Write-Host "     return asset.type === 'stock';" -ForegroundColor Gray
Write-Host "   }" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Unknown Over Any:" -ForegroundColor Cyan
Write-Host "   try { ... }" -ForegroundColor Gray
Write-Host "   catch (e: unknown) {  // Better than any" -ForegroundColor Gray
Write-Host "     if (e instanceof Error) { ... }" -ForegroundColor Gray
Write-Host "   }" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "✨ Benefits of Strong Typing:" -ForegroundColor Cyan
Write-Host "  ✅ Catch errors at compile time" -ForegroundColor Green
Write-Host "  ✅ Better IDE autocomplete" -ForegroundColor Green
Write-Host "  ✅ Safer refactoring" -ForegroundColor Green
Write-Host "  ✅ Self-documenting code" -ForegroundColor Green
Write-Host "  ✅ Easier onboarding" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green
