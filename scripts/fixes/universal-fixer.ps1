#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Universal TypeScript fixer - Consolidated fix automation
    
.DESCRIPTION
    Intelligent TypeScript issue detection and fixing:
    - Implicit 'any' type fixes
    - Zustand store type issues
    - Missing type annotations
    - Type safety improvements
    
.PARAMETER Target
    What to fix: Any (implicit any), Zustand (store types), All (everything)
    
.PARAMETER DryRun
    Show what would be fixed without making changes
    
.PARAMETER Backup
    Create backup before making changes (recommended)
    
.PARAMETER Scope
    File path or pattern to fix (default: all files)
    
.PARAMETER Interactive
    Prompt for confirmation before each fix
    
.EXAMPLE
    .\universal-fixer.ps1 -Target Any -Backup
    Fix all implicit 'any' types with backup
    
.EXAMPLE
    .\universal-fixer.ps1 -Target All -DryRun
    Show all fixes without applying them
    
.EXAMPLE
    .\universal-fixer.ps1 -Target Zustand -Interactive
    Fix Zustand issues with confirmation prompts
#>

param(
    [ValidateSet('Any', 'Zustand', 'All')]
    [string]$Target = 'All',
    [switch]$DryRun,
    [switch]$Backup,
    [switch]$Interactive,
    [string]$Scope = "frontend"
)

$ErrorActionPreference = "Stop"
$StartTime = Get-Date

# Color scheme
$Colors = @{
    Header = 'Cyan'
    Success = 'Green'
    Warning = 'Yellow'
    Error = 'Red'
    Info = 'White'
    Dim = 'Gray'
}

# Fix tracking
$Stats = @{
    FilesProcessed = 0
    FilesModified = 0
    FixesApplied = 0
    IssuesFound = 0
    BackupsCreated = 0
}

#region Helper Functions

function Write-Header {
    param([string]$Text, [int]$Width = 70)
    Write-Host ""
    Write-Host ("═" * $Width) -ForegroundColor $Colors.Header
    Write-Host $Text.PadRight($Width) -ForegroundColor $Colors.Header
    Write-Host ("═" * $Width) -ForegroundColor $Colors.Header
    Write-Host ""
}

function Backup-File {
    param([string]$FilePath)
    
    if (-not $Backup) { return }
    
    $backupDir = ".backups/$(Get-Date -Format 'yyyy-MM-dd')"
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }
    
    $fileName = Split-Path $FilePath -Leaf
    $timestamp = Get-Date -Format "HHmmss"
    $backupPath = Join-Path $backupDir "$fileName.$timestamp.bak"
    
    Copy-Item -Path $FilePath -Destination $backupPath -Force
    $Stats.BackupsCreated++
    
    Write-Host "     💾 Backup created: $backupPath" -ForegroundColor $Colors.Dim
}

function Confirm-Fix {
    param([string]$FilePath, [string]$Description)
    
    if (-not $Interactive) { return $true }
    
    Write-Host ""
    Write-Host "  ❓ Fix in '$FilePath'?" -ForegroundColor $Colors.Warning
    Write-Host "     $Description" -ForegroundColor $Colors.Info
    Write-Host "     Apply this fix? [Y/n/a/q] " -NoNewline -ForegroundColor $Colors.Warning
    
    $response = Read-Host
    
    switch ($response.ToLower()) {
        'y' { return $true }
        '' { return $true }  # Default to yes
        'a' { $script:Interactive = $false; return $true }  # All remaining
        'q' { Write-Host "  ⛔ Aborted by user" -ForegroundColor $Colors.Error; exit 0 }
        default { return $false }
    }
}

#endregion

#region Fix Patterns

# Zustand store fix patterns
$ZustandFixes = @(
    @{
        Name = "Zustand immer middleware typing"
        Pattern = "immer\(\(set, get, store\)"
        Replacement = "immer<any>((set, get, store)"
        Description = "Add type annotation to immer middleware"
    },
    @{
        Name = "Zustand immer middleware typing (no store)"
        Pattern = "immer\(\(set, get\)"
        Replacement = "immer<any>((set, get)"
        Description = "Add type annotation to immer middleware"
    },
    @{
        Name = "Zustand persist middleware typing"
        Pattern = "persist\(\(set, get\)"
        Replacement = "persist<any>((set, get)"
        Description = "Add type annotation to persist middleware"
    }
)

# Common implicit 'any' fix patterns
$ImplicitAnyFixes = @(
    @{
        Name = "Arrow function parameter"
        Pattern = "\(([a-zA-Z_`$][a-zA-Z0-9_`$]*)\) =>"
        Replacement = '($1: any) =>'
        Description = "Add type annotation to arrow function parameter"
        Condition = { param($line) $line -notmatch ': any\)' -and $line -notmatch ': \w+\)' }
    },
    @{
        Name = "Multiple arrow function parameters"
        Pattern = "\(([a-zA-Z_`$][a-zA-Z0-9_`$]*), ([a-zA-Z_`$][a-zA-Z0-9_`$]*)\) =>"
        Replacement = '($1: any, $2: any) =>'
        Description = "Add type annotations to arrow function parameters"
        Condition = { param($line) $line -notmatch ': any' }
    },
    @{
        Name = "Array callback - find"
        Pattern = "\.find\(([a-zA-Z_`$][a-zA-Z0-9_`$]*) =>"
        Replacement = '.find(($1: any) =>'
        Description = "Add type annotation to find callback"
        Condition = { param($line) $line -notmatch '\(.*: any\) =>' }
    },
    @{
        Name = "Array callback - filter"
        Pattern = "\.filter\(([a-zA-Z_`$][a-zA-Z0-9_`$]*) =>"
        Replacement = '.filter(($1: any) =>'
        Description = "Add type annotation to filter callback"
        Condition = { param($line) $line -notmatch '\(.*: any\) =>' }
    },
    @{
        Name = "Array callback - map"
        Pattern = "\.map\(([a-zA-Z_`$][a-zA-Z0-9_`$]*) =>"
        Replacement = '.map(($1: any) =>'
        Description = "Add type annotation to map callback"
        Condition = { param($line) $line -notmatch '\(.*: any\) =>' }
    },
    @{
        Name = "Array callback - forEach"
        Pattern = "\.forEach\(([a-zA-Z_`$][a-zA-Z0-9_`$]*) =>"
        Replacement = '.forEach(($1: any) =>'
        Description = "Add type annotation to forEach callback"
        Condition = { param($line) $line -notmatch '\(.*: any\) =>' }
    },
    @{
        Name = "Store set function"
        Pattern = "set\(\(state\) =>"
        Replacement = 'set((state: any) =>'
        Description = "Add type annotation to Zustand set callback"
        Condition = { param($line) $line -notmatch 'state: any' }
    }
)

#endregion

#region Fix Functions

function Fix-ZustandStores {
    Write-Header "🔧 FIXING: Zustand Store Type Issues"
    
    $storeFiles = Get-ChildItem -Path $Scope -Recurse -Include "*.tsx", "*.ts" -Exclude "node_modules", ".next" |
        Select-String -Pattern "create<.*>\(\s*(immer|persist)" |
        Select-Object -ExpandProperty Path -Unique
    
    Write-Host "  📁 Found $($storeFiles.Count) Zustand store files" -ForegroundColor $Colors.Info
    Write-Host ""
    
    foreach ($filePath in $storeFiles) {
        $Stats.FilesProcessed++
        $relativePath = $filePath.Replace((Get-Location).Path, "").TrimStart("\")
        
        Write-Host "  📄 Processing: $relativePath" -ForegroundColor $Colors.Info
        
        $content = Get-Content -Path $filePath -Raw
        $fixCount = 0
        
        foreach ($fix in $ZustandFixes) {
            if ($content -match $fix.Pattern) {
                $Stats.IssuesFound++
                
                if (Confirm-Fix -FilePath $relativePath -Description $fix.Description) {
                    if (-not $DryRun) {
                        if ($fixCount -eq 0) {
                            Backup-File -FilePath $filePath
                        }
                        $content = $content -replace $fix.Pattern, $fix.Replacement
                        $fixCount++
                        $Stats.FixesApplied++
                    }
                    
                    Write-Host "     ✅ Fixed: $($fix.Name)" -ForegroundColor $Colors.Success
                }
            }
        }
        
        if ($fixCount -gt 0 -and -not $DryRun) {
            Set-Content -Path $filePath -Value $content -NoNewline
            $Stats.FilesModified++
            Write-Host "     💾 Saved $fixCount fixes" -ForegroundColor $Colors.Success
        }
        
        if ($DryRun -and $fixCount -gt 0) {
            Write-Host "     [DRY RUN] Would apply $fixCount fixes" -ForegroundColor $Colors.Warning
        }
    }
}

function Fix-ImplicitAny {
    Write-Header "🔧 FIXING: Implicit 'any' Type Annotations"
    
    $tsFiles = Get-ChildItem -Path $Scope -Recurse -Include "*.tsx", "*.ts" -Exclude "node_modules", ".next"
    
    Write-Host "  📁 Scanning $($tsFiles.Count) TypeScript files" -ForegroundColor $Colors.Info
    Write-Host ""
    
    foreach ($file in $tsFiles) {
        $Stats.FilesProcessed++
        $relativePath = $file.FullName.Replace((Get-Location).Path, "").TrimStart("\")
        
        $content = Get-Content -Path $file.FullName -Raw
        $lines = Get-Content -Path $file.FullName
        $fixCount = 0
        $fileModified = $false
        
        # Check if file has implicit any issues
        $hasImplicitAny = $false
        foreach ($line in $lines) {
            foreach ($fix in $ImplicitAnyFixes) {
                if ($line -match $fix.Pattern) {
                    if (-not $fix.Condition -or (& $fix.Condition $line)) {
                        $hasImplicitAny = $true
                        break
                    }
                }
            }
            if ($hasImplicitAny) { break }
        }
        
        if (-not $hasImplicitAny) { continue }
        
        Write-Host "  📄 Processing: $relativePath" -ForegroundColor $Colors.Info
        
        foreach ($fix in $ImplicitAnyFixes) {
            $regexMatches = [regex]::Matches($content, $fix.Pattern)
            
            if ($regexMatches.Count -gt 0) {
                foreach ($match in $regexMatches) {
                    $lineContext = $content.Substring([Math]::Max(0, $match.Index - 50), [Math]::Min(100, $content.Length - [Math]::Max(0, $match.Index - 50)))
                    
                    # Apply condition check if exists
                    if ($fix.Condition) {
                        if (-not (& $fix.Condition $lineContext)) {
                            continue
                        }
                    }
                    
                    $Stats.IssuesFound++
                    
                    if (Confirm-Fix -FilePath $relativePath -Description "$($fix.Description): $($match.Value)") {
                        if (-not $DryRun) {
                            if ($fixCount -eq 0) {
                                Backup-File -FilePath $file.FullName
                            }
                            $content = $content.Replace($match.Value, [regex]::Replace($match.Value, $fix.Pattern, $fix.Replacement))
                            $fixCount++
                            $Stats.FixesApplied++
                            $fileModified = $true
                        }
                        
                        Write-Host "     ✅ Fixed: $($fix.Name)" -ForegroundColor $Colors.Success
                    }
                }
            }
        }
        
        if ($fileModified -and -not $DryRun) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            $Stats.FilesModified++
            Write-Host "     💾 Saved $fixCount fixes" -ForegroundColor $Colors.Success
        }
        
        if ($DryRun -and $fixCount -gt 0) {
            Write-Host "     [DRY RUN] Would apply $fixCount fixes" -ForegroundColor $Colors.Warning
        }
    }
}

#endregion

#region Main Execution

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor $Colors.Header
Write-Host "║          UNIVERSAL FIXER - TypeScript Issue Resolution        ║" -ForegroundColor $Colors.Header
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor $Colors.Header
Write-Host ""
Write-Host "  Target: $Target" -ForegroundColor $Colors.Info
Write-Host "  Scope: $Scope" -ForegroundColor $Colors.Info

if ($DryRun) {
    Write-Host "  🔍 DRY RUN - No changes will be made" -ForegroundColor $Colors.Warning
}
if ($Backup) {
    Write-Host "  💾 Backups enabled" -ForegroundColor $Colors.Success
}
if ($Interactive) {
    Write-Host "  ❓ Interactive mode - will prompt for confirmations" -ForegroundColor $Colors.Info
}

Write-Host ""

# Validate scope path
if (-not (Test-Path $Scope)) {
    Write-Host "❌ Error: Scope path '$Scope' does not exist" -ForegroundColor $Colors.Error
    exit 1
}

# Execute fixes based on target
switch ($Target) {
    'Zustand' {
        Fix-ZustandStores
    }
    'Any' {
        Fix-ImplicitAny
    }
    'All' {
        Fix-ZustandStores
        Fix-ImplicitAny
    }
}

#endregion

#region Summary Report

Write-Header "📊 FIX SUMMARY"

$duration = (Get-Date) - $StartTime

Write-Host "  Duration: $($duration.TotalSeconds) seconds" -ForegroundColor $Colors.Info
Write-Host ""
Write-Host "  📁 Files processed: $($Stats.FilesProcessed)" -ForegroundColor $Colors.Info
Write-Host "  📝 Files modified: $($Stats.FilesModified)" -ForegroundColor $(if ($Stats.FilesModified -gt 0) { $Colors.Success } else { $Colors.Dim })
Write-Host "  🔍 Issues found: $($Stats.IssuesFound)" -ForegroundColor $(if ($Stats.IssuesFound -gt 0) { $Colors.Warning } else { $Colors.Success })
Write-Host "  ✅ Fixes applied: $($Stats.FixesApplied)" -ForegroundColor $(if ($Stats.FixesApplied -gt 0) { $Colors.Success } else { $Colors.Dim })

if ($Backup) {
    Write-Host "  💾 Backups created: $($Stats.BackupsCreated)" -ForegroundColor $Colors.Info
}

Write-Host ""

if ($Stats.FixesApplied -gt 0) {
    Write-Host "  💡 Next steps:" -ForegroundColor $Colors.Header
    Write-Host "     1. Run TypeScript compiler to verify fixes" -ForegroundColor $Colors.Info
    Write-Host "     2. Test affected components" -ForegroundColor $Colors.Info
    Write-Host "     3. Commit changes if everything works" -ForegroundColor $Colors.Info
    
    if ($Backup) {
        Write-Host ""
        Write-Host "  ⚠️  If issues occur, backups are in '.backups/$(Get-Date -Format 'yyyy-MM-dd')'" -ForegroundColor $Colors.Warning
    }
}

if ($DryRun -and $Stats.IssuesFound -gt 0) {
    Write-Host "  🔄 Run without -DryRun to apply fixes" -ForegroundColor $Colors.Info
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor $Colors.Header
Write-Host ""

# Exit with appropriate code
if ($Stats.IssuesFound -gt 0 -and $Stats.FixesApplied -eq 0 -and -not $DryRun) {
    exit 1
} else {
    exit 0
}

#endregion
