# Lokifi Test Runner
# Comprehensive test execution with advanced features

param(
    [ValidateSet('all', 'backend', 'frontend', 'api', 'unit', 'integration', 'e2e', 'security', 'services')]
    [string]$Category = 'all',

    [string]$File,
    [string]$Match,
    [switch]$Smart,
    [switch]$Quick,
    [switch]$Coverage,
    [switch]$Gate,
    [switch]$PreCommit,
    [switch]$Parallel,
    [switch]$Verbose,
    [switch]$Watch,
    [int]$Timeout = 300
)

$ErrorActionPreference = "Continue"

# ============================================================================
# Configuration
# ============================================================================

$script:Config = @{
    RepoRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName
    BackendDir = Join-Path (Get-Item $PSScriptRoot).Parent.Parent.FullName "apps\backend"
    FrontendDir = Join-Path (Get-Item $PSScriptRoot).Parent.Parent.FullName "apps\frontend"
    TestResultsDir = Join-Path (Get-Item $PSScriptRoot).Parent.Parent.FullName "test-results"
    CacheDir = Join-Path (Get-Item $PSScriptRoot).Parent.Parent.FullName ".test-cache"
}

# ============================================================================
# Utility Functions
# ============================================================================

function Write-TestLog {
    param(
        [string]$Message,
        [ValidateSet('Info', 'Success', 'Warning', 'Error')]
        [string]$Level = 'Info'
    )

    $colors = @{
        'Info' = 'Cyan'
        'Success' = 'Green'
        'Warning' = 'Yellow'
        'Error' = 'Red'
    }

    $icons = @{
        'Info' = 'ℹ️'
        'Success' = '✅'
        'Warning' = '⚠️'
        'Error' = '❌'
    }

    Write-Host "$($icons[$Level]) $Message" -ForegroundColor $colors[$Level]
}

function Get-ChangedFiles {
    <#
    .SYNOPSIS
    Get files changed since last commit (for smart test selection)
    #>
    try {
        $changed = git diff --name-only HEAD
        $staged = git diff --cached --name-only
        $all = ($changed + $staged) | Sort-Object -Unique
        return $all
    } catch {
        Write-TestLog "Could not determine changed files: $_" -Level Warning
        return @()
    }
}

function Get-AffectedTests {
    param([string[]]$ChangedFiles)

    <#
    .SYNOPSIS
    Determine which tests are affected by changed files
    #>

    $affectedTests = @()

    foreach ($file in $ChangedFiles) {
        if ($file -match '^apps/backend/') {
            # Backend file changed
            if ($file -match 'app/api/routes/(\w+)\.py') {
                $module = $Matches[1]
                $affectedTests += "test_${module}_endpoints.py"
                $affectedTests += "test_${module}.py"
            }
            elseif ($file -match 'app/services/(\w+)\.py') {
                $module = $Matches[1]
                $affectedTests += "test_${module}.py"
            }
            elseif ($file -match 'app/models/(\w+)\.py') {
                # Model changes might affect multiple tests
                $affectedTests += "test_api.py"
            }
        }
        elseif ($file -match '^apps/frontend/') {
            # Frontend file changed
            if ($file -match 'src/components/(.+)\.(tsx?|jsx?)') {
                $component = $Matches[1]
                $affectedTests += "${component}.test.tsx"
                $affectedTests += "${component}.test.ts"
            }
        }
    }

    return $affectedTests | Sort-Object -Unique
}

function Initialize-TestEnvironment {
    <#
    .SYNOPSIS
    Ensure test environment is ready
    #>

    Write-TestLog "Initializing test environment..." -Level Info

    # Create directories
    if (-not (Test-Path $Config.TestResultsDir)) {
        New-Item -ItemType Directory -Path $Config.TestResultsDir -Force | Out-Null
    }

    if (-not (Test-Path $Config.CacheDir)) {
        New-Item -ItemType Directory -Path $Config.CacheDir -Force | Out-Null
    }

    # Set environment variables
    $env:TESTING = "true"
    $env:PYTEST_CURRENT_TEST = $true

    Write-TestLog "Environment ready" -Level Success
}

# ============================================================================
# Backend Test Functions
# ============================================================================

function Invoke-BackendTests {
    param(
        [string]$Category = 'all',
        [string]$File,
        [string]$Match,
        [switch]$Coverage,
        [switch]$Quick,
        [switch]$Verbose
    )

    Write-TestLog "Running backend tests..." -Level Info

    Push-Location $Config.BackendDir
    try {
        # Ensure virtual environment exists
        if (-not (Test-Path "venv\Scripts\python.exe")) {
            Write-TestLog "Virtual environment not found. Creating..." -Level Warning
            python -m venv venv
            & .\venv\Scripts\pip.exe install -r requirements.txt
        }

        # Set Python path
        $env:PYTHONPATH = $PWD.Path

        # Build pytest command
        $pytestArgs = @()

        # Category selection
        if ($Category -ne 'all') {
            $pytestArgs += "tests/$Category/"
        } else {
            $pytestArgs += "tests/"
        }

        # File selection
        if ($File) {
            $pytestArgs = @("tests/$File")
        }

        # Match pattern
        if ($Match) {
            $pytestArgs += "-k"
            $pytestArgs += $Match
        }

        # Verbosity
        if ($Verbose) {
            $pytestArgs += "-vv"
            $pytestArgs += "--tb=long"
        } else {
            $pytestArgs += "-v"
            $pytestArgs += "--tb=short"
        }

        # Coverage
        if ($Coverage) {
            $pytestArgs += "--cov=app"
            $pytestArgs += "--cov-report=html"
            $pytestArgs += "--cov-report=term"
            $pytestArgs += "--cov-report=json:$($Config.TestResultsDir)/backend-coverage.json"
        }

        # Quick mode (only fast tests)
        if ($Quick) {
            $pytestArgs += "-m"
            $pytestArgs += "not slow"
            $pytestArgs += "--timeout=10"
        }

        # Output
        $pytestArgs += "--junit-xml=$($Config.TestResultsDir)/backend-results.xml"

        Write-TestLog "pytest $($pytestArgs -join ' ')" -Level Info

        & .\venv\Scripts\python.exe -m pytest @pytestArgs

        $exitCode = $LASTEXITCODE

        if ($exitCode -eq 0) {
            Write-TestLog "Backend tests passed!" -Level Success
        } else {
            Write-TestLog "Backend tests failed with exit code $exitCode" -Level Error
        }

        return $exitCode

    } finally {
        Pop-Location
    }
}

# ============================================================================
# Frontend Test Functions
# ============================================================================

function Invoke-FrontendTests {
    param(
        [string]$Category = 'all',
        [string]$File,
        [string]$Match,
        [switch]$Coverage,
        [switch]$Quick,
        [switch]$Verbose,
        [switch]$Watch
    )

    Write-TestLog "Running frontend tests..." -Level Info

    Push-Location $Config.FrontendDir
    try {
        # Ensure node_modules exists
        if (-not (Test-Path "node_modules")) {
            Write-TestLog "node_modules not found. Installing..." -Level Warning
            npm install
        }

        # Build test command
        $testArgs = @("test")

        if (-not $Watch) {
            $testArgs += "--run"
        }

        # Category/File selection
        if ($Category -ne 'all' -and $Category -ne 'frontend') {
            $testArgs += "tests/$Category/"
        }

        if ($File) {
            $testArgs += $File
        }

        # Match pattern
        if ($Match) {
            $testArgs += "--testNamePattern"
            $testArgs += $Match
        }

        # Coverage
        if ($Coverage) {
            $testArgs += "--coverage"
            $testArgs += "--coverage.reporter=html"
            $testArgs += "--coverage.reporter=json-summary"
        }

        # Verbosity
        if ($Verbose) {
            $testArgs += "--reporter=verbose"
        }

        Write-TestLog "npm $($testArgs -join ' ')" -Level Info

        npm @testArgs

        $exitCode = $LASTEXITCODE

        if ($exitCode -eq 0) {
            Write-TestLog "Frontend tests passed!" -Level Success
        } else {
            Write-TestLog "Frontend tests failed with exit code $exitCode" -Level Error
        }

        return $exitCode

    } finally {
        Pop-Location
    }
}

# ============================================================================
# Smart Test Selection
# ============================================================================

function Invoke-SmartTests {
    Write-TestLog "Running smart test selection..." -Level Info

    $changedFiles = Get-ChangedFiles

    if ($changedFiles.Count -eq 0) {
        Write-TestLog "No files changed, running quick smoke tests..." -Level Warning
        return Invoke-QuickTests
    }

    Write-TestLog "Found $($changedFiles.Count) changed files" -Level Info

    $affectedTests = Get-AffectedTests -ChangedFiles $changedFiles

    if ($affectedTests.Count -eq 0) {
        Write-TestLog "No directly affected tests found, running category tests..." -Level Warning

        $backendChanged = $changedFiles | Where-Object { $_ -match '^apps/backend/' }
        $frontendChanged = $changedFiles | Where-Object { $_ -match '^apps/frontend/' }

        $exitCode = 0

        if ($backendChanged) {
            $exitCode = Invoke-BackendTests -Category 'api' -Quick
        }

        if ($frontendChanged -and $exitCode -eq 0) {
            $exitCode = Invoke-FrontendTests -Category 'components' -Quick
        }

        return $exitCode
    }

    Write-TestLog "Running $($affectedTests.Count) affected tests..." -Level Info

    # Run affected tests
    $exitCode = 0
    foreach ($test in $affectedTests) {
        if ($test -match '\.py$') {
            $result = Invoke-BackendTests -File $test
            if ($result -ne 0) { $exitCode = $result }
        } elseif ($test -match '\.(tsx?|jsx?)$') {
            $result = Invoke-FrontendTests -File $test
            if ($result -ne 0) { $exitCode = $result }
        }
    }

    return $exitCode
}

# ============================================================================
# Quick Tests
# ============================================================================

function Invoke-QuickTests {
    Write-TestLog "Running quick tests (< 10s per test)..." -Level Info

    $backendExit = Invoke-BackendTests -Quick -Category 'unit'

    if ($backendExit -eq 0) {
        $frontendExit = Invoke-FrontendTests -Quick -Category 'unit'
        return $frontendExit
    }

    return $backendExit
}

# ============================================================================
# Pre-commit Tests
# ============================================================================

function Invoke-PreCommitTests {
    Write-TestLog "Running pre-commit test suite..." -Level Info

    # Run fast, essential tests
    $tests = @(
        @{ Name = "Backend API"; Category = "api"; Type = "backend"; Quick = $true }
        @{ Name = "Backend Security"; Category = "security"; Type = "backend"; Quick = $true }
        @{ Name = "Frontend Components"; Category = "components"; Type = "frontend"; Quick = $true }
    )

    $allPassed = $true

    foreach ($test in $tests) {
        Write-TestLog "Running $($test.Name) tests..." -Level Info

        if ($test.Type -eq 'backend') {
            $result = Invoke-BackendTests -Category $test.Category -Quick:$test.Quick
        } else {
            $result = Invoke-FrontendTests -Category $test.Category -Quick:$test.Quick
        }

        if ($result -ne 0) {
            $allPassed = $false
            Write-TestLog "$($test.Name) tests failed!" -Level Error
        }
    }

    if ($allPassed) {
        Write-TestLog "All pre-commit tests passed!" -Level Success
        return 0
    } else {
        Write-TestLog "Some pre-commit tests failed" -Level Error
        return 1
    }
}

# ============================================================================
# Quality Gate Tests
# ============================================================================

function Invoke-GateTests {
    Write-TestLog "Running quality gate checks..." -Level Info

    # Run the enhanced CI protection script
    $ciScript = Join-Path $Config.RepoRoot "tools\ci-cd\enhanced-ci-protection.ps1"

    if (Test-Path $ciScript) {
        & $ciScript
        return $LASTEXITCODE
    } else {
        Write-TestLog "CI protection script not found at: $ciScript" -Level Error
        return 1
    }
}

# ============================================================================
# Main Execution Logic
# ============================================================================

function Invoke-TestRunner {
    Initialize-TestEnvironment

    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║           Lokifi Test Runner - Comprehensive Suite        ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""

    $startTime = Get-Date
    $exitCode = 0

    try {
        # Handle special modes
        if ($Smart) {
            $exitCode = Invoke-SmartTests
        }
        elseif ($PreCommit) {
            $exitCode = Invoke-PreCommitTests
        }
        elseif ($Gate) {
            $exitCode = Invoke-GateTests
        }
        elseif ($Quick) {
            $exitCode = Invoke-QuickTests
        }
        # Category-based execution
        elseif ($Category -eq 'all') {
            Write-TestLog "Running all tests..." -Level Info
            $backendExit = Invoke-BackendTests -File $File -Match $Match -Coverage:$Coverage -Verbose:$Verbose
            if ($backendExit -eq 0) {
                $exitCode = Invoke-FrontendTests -File $File -Match $Match -Coverage:$Coverage -Verbose:$Verbose -Watch:$Watch
            } else {
                $exitCode = $backendExit
            }
        }
        elseif ($Category -eq 'backend') {
            $exitCode = Invoke-BackendTests -File $File -Match $Match -Coverage:$Coverage -Verbose:$Verbose
        }
        elseif ($Category -eq 'frontend') {
            $exitCode = Invoke-FrontendTests -File $File -Match $Match -Coverage:$Coverage -Verbose:$Verbose -Watch:$Watch
        }
        else {
            # Specific category (api, unit, integration, etc.)
            $backendExit = Invoke-BackendTests -Category $Category -File $File -Match $Match -Coverage:$Coverage -Verbose:$Verbose
            $exitCode = $backendExit
        }

        $endTime = Get-Date
        $duration = $endTime - $startTime

        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
        Write-Host "║                     Test Run Complete                      ║" -ForegroundColor Cyan
        Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
        Write-Host ""
        Write-TestLog "Duration: $($duration.TotalSeconds.ToString('0.00'))s" -Level Info

        if ($exitCode -eq 0) {
            Write-TestLog "All tests passed! 🎉" -Level Success
        } else {
            Write-TestLog "Tests failed with exit code $exitCode" -Level Error
        }

        Write-Host ""

    } catch {
        Write-TestLog "Test runner encountered an error: $_" -Level Error
        $exitCode = 1
    }

    exit $exitCode
}

# ============================================================================
# Entry Point
# ============================================================================

Invoke-TestRunner
