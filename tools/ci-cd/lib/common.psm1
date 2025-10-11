# Common CI/CD helper functions for Lokifi

$ErrorActionPreference = "SilentlyContinue"

function Get-RepoRoot {
    try {
        $root = git rev-parse --show-toplevel 2>$null
        if ($LASTEXITCODE -eq 0 -and $root) { return $root }
    } catch {}
    $dir = (Resolve-Path (Join-Path $PSScriptRoot ".."))
    while ($dir -and (Test-Path $dir)) {
        if (Test-Path (Join-Path $dir ".git")) { return $dir }
        $parent = Split-Path $dir -Parent
        if ($parent -eq $dir) { break }
        $dir = $parent
    }
    return (Resolve-Path (Join-Path $PSScriptRoot "..\.."))
}

function Get-WorkflowsCount {
    param([string]$RepoRoot = (Get-RepoRoot))
    $workflowsPath = Join-Path $RepoRoot ".github/workflows"
    $count = 0
    if (Test-Path $workflowsPath) {
        $count += (Get-ChildItem -Path $workflowsPath -Filter "*.yml" -File -ErrorAction SilentlyContinue).Count
        $count += (Get-ChildItem -Path $workflowsPath -Filter "*.yaml" -File -ErrorAction SilentlyContinue).Count
    }
    return $count
}

function Get-PreCommitHookStatus {
    param([string]$RepoRoot = (Get-RepoRoot))
    return (Test-Path (Join-Path $RepoRoot ".git/hooks/pre-commit"))
}

function Get-TestCoverageHeuristic {
    param([string]$RepoRoot = (Get-RepoRoot))

    # --- Path Discovery ---
    $backendPath = Join-Path $RepoRoot "backend"
    if (Test-Path (Join-Path $RepoRoot "apps/backend")) { $backendPath = Join-Path $RepoRoot "apps/backend" }

    $frontendPath = Join-Path $RepoRoot "frontend"
    if (Test-Path (Join-Path $RepoRoot "apps/frontend")) { $frontendPath = Join-Path $RepoRoot "apps/frontend" }

    # --- Backend Calculation ---
    $backendTests = 0
    $backendSources = 0
    $backendCoverage = 0
    if (Test-Path $backendPath) {
        $allPyFiles = Get-ChildItem -Path $backendPath -Filter "*.py" -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
            $_.FullName -notlike "*\venv\*" -and
            $_.FullName -notlike "*\node_modules\*" -and
            $_.FullName -notlike "*\.ruff_cache\*" -and
            $_.FullName -notlike "*\.pytest_cache\*" -and
            $_.FullName -notlike "*\__pycache__\*"
        }
        $backendTestFiles = @($allPyFiles | Where-Object { $_.Name -like "test_*.py" })

        $backendTestFilePaths = [System.Collections.Generic.HashSet[string]]::new(
            [System.StringComparer]::OrdinalIgnoreCase
        )
        foreach ($file in $backendTestFiles) {
            $null = $backendTestFilePaths.Add($file.FullName)
        }

        $backendSourceFiles = @($allPyFiles | Where-Object {
            (-not $backendTestFilePaths.Contains($_.FullName)) -and ($_.Name -ne "__init__.py")
        })

        $backendTests = $backendTestFiles.Count
        $backendSources = $backendSourceFiles.Count
        $backendCoverage = if ($backendSources -gt 0) { [math]::Round(($backendTests / $backendSources) * 100, 1) } else { 0 }
    }

    # --- Frontend Calculation ---
    $frontendTests = 0
    $frontendComponents = 0
    $frontendCoverage = 0
    if (Test-Path $frontendPath) {
        $allTsFiles = Get-ChildItem -Path $frontendPath -Filter "*.ts*" -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
            $_.FullName -notlike "*\node_modules\*" -and
            $_.FullName -notlike "*\dist\*" -and
            $_.FullName -notlike "*\build\*" -and
            $_.FullName -notlike "*\.next\*"
        }
        $frontendTestFiles = @($allTsFiles | Where-Object { $_.Name -like "*.test.ts*" -or $_.Name -like "*.spec.ts*" })

        $frontendTestFilePaths = [System.Collections.Generic.HashSet[string]]::new(
            [System.StringComparer]::OrdinalIgnoreCase
        )
        foreach ($file in $frontendTestFiles) {
            $null = $frontendTestFilePaths.Add($file.FullName)
        }

        $frontendSourceFiles = @($allTsFiles | Where-Object { -not $frontendTestFilePaths.Contains($_.FullName) })

        $frontendTests = $frontendTestFiles.Count
        $frontendComponents = $frontendSourceFiles.Count
        $frontendCoverage = if ($frontendComponents -gt 0) { [math]::Round(($frontendTests / $frontendComponents) * 100, 1) } else { 0 }
    }

    # --- Overall Calculation ---
    $totalSources = $backendSources + $frontendComponents
    $totalTests = $backendTests + $frontendTests
    $overall = if ($totalSources -gt 0) { [math]::Round(($totalTests / $totalSources) * 100, 1) } else { 0 }

    return @{
        Backend = @{ Coverage = $backendCoverage; Tests = $backendTests; Sources = $backendSources }
        Frontend = @{ Coverage = $frontendCoverage; Tests = $frontendTests; Sources = $frontendComponents }
        Overall = $overall
    }
}

function Get-SecurityStatusBasic {
    param([string]$RepoRoot = (Get-RepoRoot))
    $security = @{ Critical=0; High=0; Medium=0; Low=0; Total=0 }
    try {
        $backendPath = Join-Path $RepoRoot "backend"
        if (Test-Path $backendPath) {
            Push-Location $backendPath
            $safetyCheck = & pip show safety 2>$null
            if ($safetyCheck) {
                $safetyOutput = & safety check --json 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
                if ($safetyOutput -and $safetyOutput.vulnerabilities) {
                    foreach ($v in $safetyOutput.vulnerabilities) {
                        $security.Total++
                        switch ($v.severity) {
                            "critical" { $security.Critical++ }
                            "high" { $security.High++ }
                            "medium" { $security.Medium++ }
                            default { $security.Low++ }
                        }
                    }
                }
            }
            Pop-Location
        }
    } catch {}

    try {
        $frontendPath = Join-Path $RepoRoot "frontend"
        if (Test-Path $frontendPath) {
            Push-Location $frontendPath
            $auditOutput = & npm audit --json 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($auditOutput -and $auditOutput.vulnerabilities) {
                foreach ($prop in $auditOutput.vulnerabilities.PSObject.Properties) {
                    $data = $prop.Value
                    $security.Total++
                    switch ($data.severity) {
                        "critical" { $security.Critical++ }
                        "high" { $security.High++ }
                        "moderate" { $security.Medium++ }
                        default { $security.Low++ }
                    }
                }
            }
            Pop-Location
        }
    } catch {}

    return $security
}

Export-ModuleMember -Function Get-RepoRoot,Get-WorkflowsCount,Get-PreCommitHookStatus,Get-TestCoverageHeuristic,Get-SecurityStatusBasic
