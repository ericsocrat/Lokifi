#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automated backup script for critical repository data
.DESCRIPTION
    Creates timestamped backups of:
    - Database schemas
    - Configuration files
    - Environment templates
    - Critical scripts
.NOTES
    Created: October 8, 2025
    Part of automation enhancement
#>

param(
    [string]$BackupDir = "backups",
    [switch]$IncludeDatabase,
    [switch]$Compress
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupPath = Join-Path $projectRoot $BackupDir
$currentBackup = Join-Path $backupPath "backup_$timestamp"

Write-Host ""
Write-Host "💾 Automated Backup Script" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray
Write-Host ""

# Create backup directory
if (-not (Test-Path $backupPath)) {
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
}

New-Item -ItemType Directory -Path $currentBackup -Force | Out-Null

Write-Host "📁 Backup location: $currentBackup" -ForegroundColor Yellow
Write-Host ""

# Backup configuration files
Write-Host "⚙️  Backing up configuration files..." -ForegroundColor Cyan
$configDir = Join-Path $currentBackup "configs"
New-Item -ItemType Directory -Path $configDir -Force | Out-Null

$configFiles = @(
    "docker-compose.yml",
    "docker-compose.dev.yml",
    "docker-compose.redis.yml",
    ".env.example",
    "frontend\.env.local.example",
    "backend\.env.example",
    ".vscode\settings.json",
    ".vscode\tasks.json"
)

$configCount = 0
foreach ($file in $configFiles) {
    $sourcePath = Join-Path $projectRoot $file
    if (Test-Path $sourcePath) {
        $destPath = Join-Path $configDir (Split-Path $file -Leaf)
        Copy-Item $sourcePath $destPath -Force
        $configCount++
        Write-Host "  ✅ $file" -ForegroundColor Green
    }
}

Write-Host "  📊 Backed up $configCount configuration files" -ForegroundColor White
Write-Host ""

# Backup critical scripts
Write-Host "📜 Backing up critical scripts..." -ForegroundColor Cyan
$scriptsBackupDir = Join-Path $currentBackup "scripts"
New-Item -ItemType Directory -Path $scriptsBackupDir -Force | Out-Null

$criticalScripts = @(
    "start-servers.ps1",
    "manage-redis.ps1",
    "setup-postgres.ps1",
    "test-api.ps1"
)

$scriptCount = 0
foreach ($script in $criticalScripts) {
    $sourcePath = Join-Path $projectRoot $script
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath (Join-Path $scriptsBackupDir $script) -Force
        $scriptCount++
        Write-Host "  ✅ $script" -ForegroundColor Green
    }
}

Write-Host "  📊 Backed up $scriptCount scripts" -ForegroundColor White
Write-Host ""

# Backup database schema (if requested)
if ($IncludeDatabase) {
    Write-Host "🗄️  Backing up database schema..." -ForegroundColor Cyan
    $dbBackupDir = Join-Path $currentBackup "database"
    New-Item -ItemType Directory -Path $dbBackupDir -Force | Out-Null
    
    # Copy Alembic migrations
    $migrationsPath = Join-Path $projectRoot "backend\alembic\versions"
    if (Test-Path $migrationsPath) {
        $destMigrations = Join-Path $dbBackupDir "migrations"
        Copy-Item $migrationsPath $destMigrations -Recurse -Force
        $migCount = (Get-ChildItem $destMigrations -File).Count
        Write-Host "  ✅ Backed up $migCount migration files" -ForegroundColor Green
    }
    
    # Copy models
    $modelsPath = Join-Path $projectRoot "backend\app\db\models.py"
    if (Test-Path $modelsPath) {
        Copy-Item $modelsPath (Join-Path $dbBackupDir "models.py") -Force
        Write-Host "  ✅ Backed up database models" -ForegroundColor Green
    }
    
    Write-Host ""
}

# Backup package files
Write-Host "📦 Backing up dependency manifests..." -ForegroundColor Cyan
$depsBackupDir = Join-Path $currentBackup "dependencies"
New-Item -ItemType Directory -Path $depsBackupDir -Force | Out-Null

$depFiles = @(
    @{ Source = "frontend\package.json"; Dest = "frontend-package.json" },
    @{ Source = "frontend\package-lock.json"; Dest = "frontend-package-lock.json" },
    @{ Source = "backend\requirements.txt"; Dest = "backend-requirements.txt" },
    @{ Source = "backend\pyproject.toml"; Dest = "backend-pyproject.toml" }
)

$depCount = 0
foreach ($dep in $depFiles) {
    $sourcePath = Join-Path $projectRoot $dep.Source
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath (Join-Path $depsBackupDir $dep.Dest) -Force
        $depCount++
        Write-Host "  ✅ $($dep.Dest)" -ForegroundColor Green
    }
}

Write-Host "  📊 Backed up $depCount dependency files" -ForegroundColor White
Write-Host ""

# Create backup manifest
$manifest = @{
    Timestamp = $timestamp
    BackupDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    ConfigFiles = $configCount
    Scripts = $scriptCount
    DependencyFiles = $depCount
    IncludedDatabase = $IncludeDatabase
    GitCommit = (git rev-parse HEAD 2>$null)
    GitBranch = (git branch --show-current 2>$null)
} | ConvertTo-Json

$manifest | Out-File (Join-Path $currentBackup "MANIFEST.json") -Encoding UTF8

Write-Host "📋 Backup manifest created" -ForegroundColor Green
Write-Host ""

# Compress if requested
if ($Compress) {
    Write-Host "🗜️  Compressing backup..." -ForegroundColor Cyan
    $zipPath = "$currentBackup.zip"
    Compress-Archive -Path $currentBackup -DestinationPath $zipPath -Force
    
    $zipSize = (Get-Item $zipPath).Length / 1MB
    Write-Host "  ✅ Compressed to: backup_$timestamp.zip" -ForegroundColor Green
    Write-Host "  📊 Size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor White
    Write-Host ""
    
    # Optionally remove uncompressed backup
    Write-Host "  🗑️  Remove uncompressed backup? (Y/N): " -ForegroundColor Yellow -NoNewline
    $response = Read-Host
    if ($response -eq "Y" -or $response -eq "y") {
        Remove-Item $currentBackup -Recurse -Force
        Write-Host "  ✅ Uncompressed backup removed" -ForegroundColor Green
    }
    Write-Host ""
}

# Clean old backups (keep last 10)
Write-Host "🧹 Cleaning old backups..." -ForegroundColor Cyan
$allBackups = Get-ChildItem $backupPath -Directory | Where-Object { $_.Name -match "^backup_\d{4}-\d{2}-\d{2}_\d{6}$" } | Sort-Object Name -Descending
$allZips = Get-ChildItem $backupPath -Filter "backup_*.zip" | Sort-Object Name -Descending

$keepCount = 10
$removedCount = 0

if ($allBackups.Count -gt $keepCount) {
    $toRemove = $allBackups | Select-Object -Skip $keepCount
    foreach ($old in $toRemove) {
        Remove-Item $old.FullName -Recurse -Force
        $removedCount++
    }
}

if ($allZips.Count -gt $keepCount) {
    $toRemove = $allZips | Select-Object -Skip $keepCount
    foreach ($old in $toRemove) {
        Remove-Item $old.FullName -Force
        $removedCount++
    }
}

if ($removedCount -gt 0) {
    Write-Host "  ✅ Removed $removedCount old backup(s)" -ForegroundColor Green
} else {
    Write-Host "  ✅ No old backups to remove" -ForegroundColor Green
}

Write-Host ""
Write-Host "=" * 50 -ForegroundColor Gray
Write-Host "✅ Backup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Location: $currentBackup" -ForegroundColor White
if ($Compress) {
    Write-Host "📦 Archive: backup_$timestamp.zip" -ForegroundColor White
}
Write-Host ""

exit 0
