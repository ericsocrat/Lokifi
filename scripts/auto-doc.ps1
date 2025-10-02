# Auto-Documentation Script
# Automatically routes documentation files to correct folders based on type

param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath,
    
    [Parameter(Mandatory=$false)]
    [string]$Type
)

$fileName = Split-Path $FilePath -Leaf
$content = Get-Content $FilePath -Raw -ErrorAction SilentlyContinue

# Auto-detect type if not specified
if (-not $Type) {
    if ($fileName -match "(FIX|BUG|ISSUE)") { $Type = "fixes" }
    elseif ($fileName -match "(TEST|SPEC)") { $Type = "testing" }
    elseif ($fileName -match "(PLAN|ROADMAP)") { $Type = "plans" }
    elseif ($fileName -match "(SECURITY|AUTH|VAULT)") { $Type = "security" }
    elseif ($fileName -match "(API|ENDPOINT)") { $Type = "api" }
    elseif ($fileName -match "(DEPLOY|PRODUCTION|INFRA)") { $Type = "operations" }
    elseif ($fileName -match "(DIAGNOSTIC|DEBUG|ANALYSIS)") { $Type = "diagnostics" }
    elseif ($fileName -match "(PHASE|COMPLETE|REPORT)") { $Type = "archive" }
    else { $Type = "development" }
}

# Move to appropriate folder
$targetFolder = "docs\$Type"
if (-not (Test-Path $targetFolder)) {
    New-Item -ItemType Directory -Path $targetFolder -Force | Out-Null
}

$targetPath = Join-Path $targetFolder $fileName
Move-Item -Path $FilePath -Destination $targetPath -Force
Write-Host "✅ Auto-filed: $fileName → $Type/"
