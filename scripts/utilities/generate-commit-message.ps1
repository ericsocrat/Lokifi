# LOKIFI SMART COMMIT MESSAGE GENERATOR
# Generates comprehensive AI commit messages based on staged changes

param(
    [switch]$Detailed,
    [switch]$Json,
    [string]$Output
)

function Get-CommitType {
    param($files)
    
    $hasTheme = $files | Where-Object { $_ -match "theme" }
    $hasLogo = $files | Where-Object { $_ -match "logo|favicon" }
    $hasDocs = $files | Where-Object { $_ -match "^docs/" }
    $hasFrontend = $files | Where-Object { $_ -match "^frontend/" }
    $hasBackend = $files | Where-Object { $_ -match "^backend/" }
    $hasTests = $files | Where-Object { $_ -match "test|spec" }
    $hasStyles = $files | Where-Object { $_ -match "\.(css|scss|sass)$" }
    $hasConfig = $files | Where-Object { $_ -match "\.(json|yaml|yml|toml|config)$" }
    
    if ($hasTheme) { return @("feat", "theme", "update theme system") }
    if ($hasLogo) { return @("feat", "branding", "update logo assets") }
    if ($hasTests) { return @("test", "", "add/update tests") }
    if ($hasDocs -and $files.Count -lt 5) { return @("docs", "", "update documentation") }
    if ($hasStyles) { return @("style", "", "update styles") }
    if ($hasConfig) { return @("chore", "config", "update configuration") }
    if ($hasFrontend -and $hasBackend) { return @("feat", "fullstack", "update frontend and backend") }
    if ($hasFrontend) { return @("feat", "frontend", "update frontend components") }
    if ($hasBackend) { return @("feat", "backend", "update backend services") }
    
    return @("chore", "", "update files")
}

function Get-StagedFiles {
    $output = git diff --cached --name-only 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to get staged files. Make sure you have staged changes."
        exit 1
    }
    return $output | Where-Object { $_.Trim() -ne "" }
}

function Get-DiffStats {
    $stats = git diff --cached --numstat | ForEach-Object {
        if ($_ -match "^(\d+)\s+(\d+)\s+(.+)$") {
            [PSCustomObject]@{
                Additions = [int]$Matches[1]
                Deletions = [int]$Matches[2]
                File = $Matches[3]
            }
        }
    }
    
    $totalAdditions = ($stats | Measure-Object -Property Additions -Sum).Sum
    $totalDeletions = ($stats | Measure-Object -Property Deletions -Sum).Sum
    
    return @{
        TotalAdditions = $totalAdditions
        TotalDeletions = $totalDeletions
        PerFile = $stats
    }
}

function Get-FileCategories {
    param($files)
    
    $categories = @{
        Frontend = @()
        Backend = @()
        Docs = @()
        Config = @()
        Styles = @()
        Scripts = @()
        Tests = @()
        Other = @()
    }
    
    foreach ($file in $files) {
        if ($file -match "^frontend/") { $categories.Frontend += $file }
        elseif ($file -match "^backend/") { $categories.Backend += $file }
        elseif ($file -match "^docs/") { $categories.Docs += $file }
        elseif ($file -match "^scripts/") { $categories.Scripts += $file }
        elseif ($file -match "\.(css|scss|sass)$") { $categories.Styles += $file }
        elseif ($file -match "\.(json|yaml|yml|toml|config|env)$") { $categories.Config += $file }
        elseif ($file -match "(test|spec)") { $categories.Tests += $file }
        else { $categories.Other += $file }
    }
    
    return $categories
}

function Generate-CommitMessage {
    param(
        [array]$files,
        [hashtable]$stats,
        [hashtable]$categories,
        [bool]$detailed
    )
    
    $type, $scope, $description = Get-CommitType $files
    
    # Build title
    if ($scope) {
        $title = "${type}(${scope}): ${description}"
    } else {
        $title = "${type}: ${description}"
    }
    
    # Build body
    $body = @()
    $body += ""
    $body += "📦 Changes Summary:"
    $body += "- Files modified: $($files.Count)"
    $body += "- Lines added: $($stats.TotalAdditions)"
    $body += "- Lines removed: $($stats.TotalDeletions)"
    $body += ""
    
    if ($detailed) {
        # Add categorized file list
        if ($categories.Frontend.Count -gt 0) {
            $body += "🎨 Frontend Changes:"
            $categories.Frontend | ForEach-Object { $body += "- $_" }
            $body += ""
        }
        
        if ($categories.Backend.Count -gt 0) {
            $body += "⚙️ Backend Changes:"
            $categories.Backend | ForEach-Object { $body += "- $_" }
            $body += ""
        }
        
        if ($categories.Docs.Count -gt 0) {
            $body += "📚 Documentation:"
            $categories.Docs | ForEach-Object { $body += "- $_" }
            $body += ""
        }
        
        if ($categories.Config.Count -gt 0) {
            $body += "🔧 Configuration:"
            $categories.Config | ForEach-Object { $body += "- $_" }
            $body += ""
        }
        
        if ($categories.Styles.Count -gt 0) {
            $body += "💅 Styles:"
            $categories.Styles | ForEach-Object { $body += "- $_" }
            $body += ""
        }
        
        if ($categories.Scripts.Count -gt 0) {
            $body += "🛠️ Scripts:"
            $categories.Scripts | ForEach-Object { $body += "- $_" }
            $body += ""
        }
        
        if ($categories.Tests.Count -gt 0) {
            $body += "🧪 Tests:"
            $categories.Tests | ForEach-Object { $body += "- $_" }
            $body += ""
        }
        
        if ($categories.Other.Count -gt 0) {
            $body += "📝 Other:"
            $categories.Other | ForEach-Object { $body += "- $_" }
            $body += ""
        }
    } else {
        # Simple file list (first 20)
        $body += "📝 Modified Files:"
        $files | Select-Object -First 20 | ForEach-Object { $body += "- $_" }
        if ($files.Count -gt 20) {
            $body += "... and $($files.Count - 20) more files"
        }
        $body += ""
    }
    
    $body += "✨ Auto-generated commit message"
    
    return @{
        Title = $title
        Body = ($body -join "`n")
        Full = "$title`n$($body -join "`n")"
    }
}

# Main execution
try {
    Write-Host "🔍 Analyzing staged changes..." -ForegroundColor Cyan
    
    $stagedFiles = Get-StagedFiles
    
    if ($stagedFiles.Count -eq 0) {
        Write-Host "❌ No staged changes found. Use 'git add' to stage files first." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Found $($stagedFiles.Count) staged file(s)" -ForegroundColor Green
    
    $diffStats = Get-DiffStats
    $categories = Get-FileCategories $stagedFiles
    
    $message = Generate-CommitMessage -files $stagedFiles -stats $diffStats -categories $categories -detailed:$Detailed
    
    if ($Json) {
        # Output as JSON
        $jsonOutput = @{
            title = $message.Title
            body = $message.Body
            stats = @{
                files = $stagedFiles.Count
                additions = $diffStats.TotalAdditions
                deletions = $diffStats.TotalDeletions
            }
            categories = @{
                frontend = $categories.Frontend.Count
                backend = $categories.Backend.Count
                docs = $categories.Docs.Count
                config = $categories.Config.Count
                styles = $categories.Styles.Count
                scripts = $categories.Scripts.Count
                tests = $categories.Tests.Count
                other = $categories.Other.Count
            }
        } | ConvertTo-Json -Depth 10
        
        if ($Output) {
            $jsonOutput | Out-File -FilePath $Output -Encoding UTF8
            Write-Host "✓ Saved to: $Output" -ForegroundColor Green
        } else {
            Write-Output $jsonOutput
        }
    } else {
        # Output as text
        Write-Host "`n" + "="*80 -ForegroundColor Cyan
        Write-Host "📝 GENERATED COMMIT MESSAGE" -ForegroundColor Blue
        Write-Host "="*80 -ForegroundColor Cyan
        Write-Host ""
        Write-Host $message.Full
        Write-Host ""
        Write-Host "="*80 -ForegroundColor Cyan
        
        if ($Output) {
            $message.Full | Out-File -FilePath $Output -Encoding UTF8
            Write-Host "✓ Saved to: $Output" -ForegroundColor Green
        }
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
