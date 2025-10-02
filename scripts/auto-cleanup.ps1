#!/usr/bin/env pwsh
# Auto-Cleanup Script
# Automatically organizes and cleans up old files to keep project tidy

param(
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [int]$DaysOld = 30
)

$script:cleaned = @()
$script:errors = @()

function Write-CleanupLog {
    param([string]$Message, [string]$Type = "Info")
    $color = switch($Type) {
        "Info" { "Cyan" }
        "Success" { "Green" }
        "Warning" { "Yellow" }
        "Error" { "Red" }
        default { "White" }
    }
    Write-Host "[$Type] $Message" -ForegroundColor $color
}

function Get-OldFiles {
    param([string]$Pattern, [string]$Path, [int]$Days)
    
    $cutoffDate = (Get-Date).AddDays(-$Days)
    Get-ChildItem -Path $Path -Filter $Pattern -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { 
            $_.LastWriteTime -lt $cutoffDate -and
            $_.FullName -notlike "*node_modules*" -and
            $_.FullName -notlike "*\.venv*" -and
            $_.FullName -notlike "*\venv*" -and
            $_.FullName -notlike "*\.git*" -and
            $_.FullName -notlike "*\.next*"
        }
}

function Move-ToArchive {
    param([System.IO.FileInfo]$File, [string]$ArchiveFolder)
    
    try {
        $relativePath = $File.FullName.Replace("$PWD\", "")
        
        if ($DryRun) {
            Write-CleanupLog "Would move: $relativePath → $ArchiveFolder" "Info"
            return
        }
        
        if (-not (Test-Path $ArchiveFolder)) {
            New-Item -ItemType Directory -Path $ArchiveFolder -Force | Out-Null
        }
        
        Move-Item -Path $File.FullName -Destination $ArchiveFolder -Force
        Write-CleanupLog "Archived: $relativePath" "Success"
        $script:cleaned += $relativePath
    }
    catch {
        Write-CleanupLog "Failed to archive $($File.Name): $_" "Error"
        $script:errors += $File.FullName
    }
}

function Remove-OldFile {
    param([System.IO.FileInfo]$File)
    
    try {
        $relativePath = $File.FullName.Replace("$PWD\", "")
        
        if ($DryRun) {
            Write-CleanupLog "Would delete: $relativePath" "Warning"
            return
        }
        
        Remove-Item -Path $File.FullName -Force
        Write-CleanupLog "Deleted: $relativePath" "Success"
        $script:cleaned += $relativePath
    }
    catch {
        Write-CleanupLog "Failed to delete $($File.Name): $_" "Error"
        $script:errors += $File.FullName
    }
}

Write-CleanupLog "🧹 Starting Auto-Cleanup..." "Info"
if ($DryRun) {
    Write-CleanupLog "DRY RUN MODE - No files will be modified" "Warning"
}

# 1. Clean old test reports
Write-CleanupLog "`n📊 Cleaning test reports..." "Info"
$testReports = Get-OldFiles -Pattern "*test_report*.json" -Path "backend" -Days $DaysOld
foreach ($file in $testReports) {
    Move-ToArchive -File $file -ArchiveFolder "docs\archive\analysis"
}

# 2. Clean old performance reports
Write-CleanupLog "`n⚡ Cleaning performance reports..." "Info"
$perfReports = Get-OldFiles -Pattern "*performance*.json" -Path "backend" -Days $DaysOld
foreach ($file in $perfReports) {
    Move-ToArchive -File $file -ArchiveFolder "docs\archive\analysis"
}

$perfReportsTxt = Get-OldFiles -Pattern "*performance*.txt" -Path "backend" -Days $DaysOld
foreach ($file in $perfReportsTxt) {
    Move-ToArchive -File $file -ArchiveFolder "docs\archive\analysis"
}

# 3. Clean old log files
Write-CleanupLog "`n📝 Cleaning old logs..." "Info"
$oldLogs = Get-OldFiles -Pattern "*.log" -Path "." -Days ($DaysOld * 2)
foreach ($file in $oldLogs) {
    if ($file.DirectoryName -notlike "*logs*") {
        Move-ToArchive -File $file -ArchiveFolder "logs\archive"
    }
}

# 4. Clean old backup files
Write-CleanupLog "`n💾 Cleaning backup files..." "Info"
$backups = Get-OldFiles -Pattern "*.bak*" -Path "." -Days $DaysOld
foreach ($file in $backups) {
    Remove-OldFile -File $file
}

# 5. Clean old temporary files
Write-CleanupLog "`n🗑️  Cleaning temporary files..." "Info"
$tempFiles = Get-ChildItem -Path "." -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { 
        ($_.Name -like "*.tmp" -or $_.Name -like "*.temp") -and
        $_.LastWriteTime -lt (Get-Date).AddDays(-7) -and
        $_.FullName -notlike "*node_modules*" -and
        $_.FullName -notlike "*\.venv*"
    }

foreach ($file in $tempFiles) {
    Remove-OldFile -File $file
}

# 6. Remove empty directories
Write-CleanupLog "`n📂 Removing empty directories..." "Info"
$emptyDirs = Get-ChildItem -Path . -Recurse -Directory -ErrorAction SilentlyContinue |
    Where-Object {
        $_.FullName -notlike "*node_modules*" -and
        $_.FullName -notlike "*\.venv*" -and
        $_.FullName -notlike "*\venv*" -and
        $_.FullName -notlike "*\.git*" -and
        $_.FullName -notlike "*\.next*" -and
        (Get-ChildItem $_.FullName -Force -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0
    } |
    Sort-Object -Property FullName -Descending

foreach ($dir in $emptyDirs) {
    try {
        $relativePath = $dir.FullName.Replace("$PWD\", "")
        
        if ($DryRun) {
            Write-CleanupLog "Would remove empty dir: $relativePath" "Warning"
            continue
        }
        
        Remove-Item -Path $dir.FullName -Force
        Write-CleanupLog "Removed empty directory: $relativePath" "Success"
        $script:cleaned += $relativePath
    }
    catch {
        # Ignore errors for directories that aren't actually empty
    }
}

# 7. Summary
Write-CleanupLog "`n✨ Cleanup Summary:" "Info"
Write-CleanupLog "Files processed: $($script:cleaned.Count)" "Success"

if ($script:errors.Count -gt 0) {
    Write-CleanupLog "Errors encountered: $($script:errors.Count)" "Error"
    Write-CleanupLog "Failed files:" "Error"
    $script:errors | ForEach-Object { Write-CleanupLog "  - $_" "Error" }
}

if ($DryRun) {
    Write-CleanupLog "`nRun without -DryRun to actually clean files" "Warning"
}
else {
    Write-CleanupLog "`n✅ Cleanup complete!" "Success"
}
