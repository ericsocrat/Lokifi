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
    
    # Build comprehensive body
    $body = @()
    $body += ""
    
    # Frontend Section
    if ($categories.Frontend.Count -gt 0) {
        $body += "🎨 Frontend Changes:"
        if ($detailed) {
            $categories.Frontend | ForEach-Object { $body += "- $_" }
        } else {
            $categories.Frontend | Select-Object -First 5 | ForEach-Object { $body += "- $_" }
            if ($categories.Frontend.Count -gt 5) {
                $body += "- ... and $($categories.Frontend.Count - 5) more frontend files"
            }
        }
        $body += ""
    }
    
    # Backend Section
    if ($categories.Backend.Count -gt 0) {
        $body += "⚙️ Backend Changes:"
        if ($detailed) {
            $categories.Backend | ForEach-Object { $body += "- $_" }
        } else {
            $categories.Backend | Select-Object -First 5 | ForEach-Object { $body += "- $_" }
            if ($categories.Backend.Count -gt 5) {
                $body += "- ... and $($categories.Backend.Count - 5) more backend files"
            }
        }
        $body += ""
    }
    
    # Documentation Section
    if ($categories.Docs.Count -gt 0) {
        $body += "📚 Documentation:"
        if ($detailed) {
            $categories.Docs | ForEach-Object { $body += "- $_" }
        } else {
            $categories.Docs | Select-Object -First 5 | ForEach-Object { $body += "- $_" }
            if ($categories.Docs.Count -gt 5) {
                $body += "- ... and $($categories.Docs.Count - 5) more documentation files"
            }
        }
        $body += ""
    }
    
    # Scripts/Automation Section
    if ($categories.Scripts.Count -gt 0) {
        $body += "�️ Scripts & Automation:"
        if ($detailed) {
            $categories.Scripts | ForEach-Object { $body += "- $_" }
        } else {
            $categories.Scripts | Select-Object -First 5 | ForEach-Object { $body += "- $_" }
            if ($categories.Scripts.Count -gt 5) {
                $body += "- ... and $($categories.Scripts.Count - 5) more script files"
            }
        }
        $body += ""
    }
    
    # Styles Section
    if ($categories.Styles.Count -gt 0) {
        $body += "💅 Styles:"
        if ($detailed) {
            $categories.Styles | ForEach-Object { $body += "- $_" }
        } else {
            $categories.Styles | Select-Object -First 5 | ForEach-Object { $body += "- $_" }
            if ($categories.Styles.Count -gt 5) {
                $body += "- ... and $($categories.Styles.Count - 5) more style files"
            }
        }
        $body += ""
    }
    
    # Configuration Section
    if ($categories.Config.Count -gt 0) {
        $body += "� Configuration:"
        if ($detailed) {
            $categories.Config | ForEach-Object { $body += "- $_" }
        } else {
            $categories.Config | Select-Object -First 5 | ForEach-Object { $body += "- $_" }
            if ($categories.Config.Count -gt 5) {
                $body += "- ... and $($categories.Config.Count - 5) more config files"
            }
        }
        $body += ""
    }
    
    # Tests Section
    if ($categories.Tests.Count -gt 0) {
        $body += "🧪 Tests:"
        if ($detailed) {
            $categories.Tests | ForEach-Object { $body += "- $_" }
        } else {
            $categories.Tests | Select-Object -First 5 | ForEach-Object { $body += "- $_" }
            if ($categories.Tests.Count -gt 5) {
                $body += "- ... and $($categories.Tests.Count - 5) more test files"
            }
        }
        $body += ""
    }
    
    # Other Files Section
    if ($categories.Other.Count -gt 0) {
        $body += "📝 Other Changes:"
        if ($detailed) {
            $categories.Other | ForEach-Object { $body += "- $_" }
        } else {
            $categories.Other | Select-Object -First 5 | ForEach-Object { $body += "- $_" }
            if ($categories.Other.Count -gt 5) {
                $body += "- ... and $($categories.Other.Count - 5) more files"
            }
        }
        $body += ""
    }
    
    # Statistics Section
    $body += "📊 Change Statistics:"
    $body += "- Files modified: $($files.Count)"
    $body += "- Lines added: $($stats.TotalAdditions)"
    $body += "- Lines removed: $($stats.TotalDeletions)"
    $netChange = $stats.TotalAdditions - $stats.TotalDeletions
    if ($netChange -gt 0) {
        $body += "- Net change: +$netChange lines"
    } elseif ($netChange -lt 0) {
        $body += "- Net change: $netChange lines"
    } else {
        $body += "- Net change: 0 lines (refactor)"
    }
    $body += ""
    
    # File Categories Summary
    $body += "📂 File Categories:"
    if ($categories.Frontend.Count -gt 0) { $body += "- Frontend: $($categories.Frontend.Count) file(s)" }
    if ($categories.Backend.Count -gt 0) { $body += "- Backend: $($categories.Backend.Count) file(s)" }
    if ($categories.Docs.Count -gt 0) { $body += "- Documentation: $($categories.Docs.Count) file(s)" }
    if ($categories.Scripts.Count -gt 0) { $body += "- Scripts: $($categories.Scripts.Count) file(s)" }
    if ($categories.Styles.Count -gt 0) { $body += "- Styles: $($categories.Styles.Count) file(s)" }
    if ($categories.Config.Count -gt 0) { $body += "- Config: $($categories.Config.Count) file(s)" }
    if ($categories.Tests.Count -gt 0) { $body += "- Tests: $($categories.Tests.Count) file(s)" }
    if ($categories.Other.Count -gt 0) { $body += "- Other: $($categories.Other.Count) file(s)" }
    $body += ""
    
    # Footer
    $body += "✨ Auto-generated commit message"
    $body += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
    return @{
        Title = $title
        Body = ($body -join "`n")
        Full = "$title`n$($body -join "`n")"
    }
}# Main execution
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
