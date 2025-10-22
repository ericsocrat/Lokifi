# Docker Compose Validation Script (PowerShell)
# Validates all compose files for syntax errors and misconfigurations

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "`n🔍 Validating Docker Compose Files..." -ForegroundColor Cyan
Write-Host "=" -Repeat 60 -ForegroundColor Cyan

$errors = 0

# Function to validate a compose file
function Test-ComposeFile {
    param (
        [string]$FilePath,
        [string]$Description = ""
    )
    
    Write-Host "`n📄 Validating: $FilePath" -ForegroundColor Yellow
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "❌ File not found: $FilePath" -ForegroundColor Red
        return $false
    }
    
    # Check if file is valid YAML and compose syntax
    $output = docker compose -f $FilePath config --quiet 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $FilePath is valid" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $FilePath has syntax errors:" -ForegroundColor Red
        docker compose -f $FilePath config 2>&1 | Write-Host -ForegroundColor Red
        return $false
    }
}

# Validate all compose files
$files = @(
    "docker-compose.yml",
    "docker-compose.override.yml",
    "docker-compose.prod-minimal.yml",
    "docker-compose.production.yml"
)

foreach ($file in $files) {
    if (-not (Test-ComposeFile -FilePath $file)) {
        $errors++
    }
}

# Combined validation (yml + override)
Write-Host "`n📄 Validating: docker-compose.yml + override (auto-merge)" -ForegroundColor Yellow
$output = docker compose config --quiet 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Combined config is valid" -ForegroundColor Green
} else {
    Write-Host "❌ Combined config has errors:" -ForegroundColor Red
    docker compose config 2>&1 | Write-Host -ForegroundColor Red
    $errors++
}

# Check for common issues
Write-Host "`n🔍 Checking for common issues..." -ForegroundColor Cyan

# Check for version field (modern compose doesn't need it)
$filesWithVersion = Get-ChildItem "*.yml" | Select-String -Pattern "^version:" -SimpleMatch
if ($filesWithVersion) {
    Write-Host "⚠️  Warning: Found 'version:' field in:" -ForegroundColor Yellow
    $filesWithVersion | ForEach-Object { Write-Host "   - $($_.Filename)" -ForegroundColor Gray }
    Write-Host "   (Not required in Docker Compose v2, but not an error)" -ForegroundColor Gray
}

# Check for localhost in production files
$localhostRefs = Get-ChildItem "docker-compose.prod*.yml", "docker-compose.production.yml" | 
    Select-String -Pattern "localhost" -SimpleMatch
if ($localhostRefs) {
    Write-Host "`n⚠️  Warning: Found 'localhost' in production files:" -ForegroundColor Yellow
    $localhostRefs | ForEach-Object { 
        Write-Host "   - $($_.Filename):$($_.LineNumber)" -ForegroundColor Gray 
    }
    Write-Host "   (Verify this is intentional for production)" -ForegroundColor Gray
}

# Summary
Write-Host "`n" -NoNewline
Write-Host "=" -Repeat 60 -ForegroundColor Cyan
if ($errors -eq 0) {
    Write-Host "✅ All compose files are valid!" -ForegroundColor Green
    Write-Host "`n💡 Tip: Run 'docker compose config' to see merged configuration" -ForegroundColor Gray
    exit 0
} else {
    Write-Host "❌ Found $errors error(s)" -ForegroundColor Red
    Write-Host "`n💡 Fix the errors above and try again" -ForegroundColor Gray
    exit 1
}
