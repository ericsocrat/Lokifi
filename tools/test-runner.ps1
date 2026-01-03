<#
.SYNOPSIS
    Comprehensive test runner for Lokifi frontend and backend with advanced orchestration

.DESCRIPTION
    The test-runner.ps1 script provides intelligent test execution with multiple modes:

    🎯 EXECUTION MODES:
    - Smart: Run only tests for changed files (git diff)
    - PreCommit: Pre-commit validation (frontend linting + backend tests)
    - Coverage: Full test suite with coverage reporting
    - Quick: Fast frontend unit tests only
    - Watch: Continuous test execution on file changes
    - DryRun: Show what would run without executing
    - SelfTest: Validate environment setup

    📊 FEATURES:
    - Environment validation (Python, Node.js, npm, git)
    - File logging with timestamps (infra/logs/test-runner.log)
    - Parallel execution support
    - Category filtering (all, backend, frontend, api, unit, integration, e2e)
    - File-specific and pattern-based test selection

.PARAMETER Category
    Test category to run: 'all', 'backend', 'frontend', 'api', 'unit', 'integration', 'e2e', 'security', 'services'
    Default: 'all'

.PARAMETER File
    Run tests for a specific file (path relative to repo root)

.PARAMETER Match
    Run tests matching a specific pattern (test name or file pattern)

.PARAMETER Smart
    Run only tests for files changed since last commit (git diff)

.PARAMETER Quick
    Fast execution mode (frontend unit tests only, no coverage)

.PARAMETER Coverage
    Run full test suite with coverage reporting

.PARAMETER Gate
    Run quality gate checks (coverage thresholds)

.PARAMETER PreCommit
    Pre-commit validation mode (linting + critical tests)

.PARAMETER Parallel
    Enable parallel test execution (faster but uses more resources)

.PARAMETER Verbose
    Enable verbose output with detailed logging

.PARAMETER Watch
    Watch mode - continuously run tests on file changes

.PARAMETER DryRun
    Show what would be executed without running tests

.PARAMETER SelfTest
    Validate environment setup (Python, Node.js, npm, git)

.PARAMETER CIMode
    CI/CD mode - output machine-readable JSON with standardized exit codes

.PARAMETER Timeout
    Maximum execution time in seconds (default: 300)

.EXAMPLE
    .\tools\test-runner.ps1 -Smart
    Run tests only for changed files

.EXAMPLE
    .\tools\test-runner.ps1 -PreCommit
    Run pre-commit validation checks

.EXAMPLE
    .\tools\test-runner.ps1 -Category backend -Coverage
    Run backend tests with coverage

.EXAMPLE
    .\tools\test-runner.ps1 -File "apps/frontend/components/Dashboard.tsx"
    Run tests for a specific file

.EXAMPLE
    .\tools\test-runner.ps1 -SelfTest
    Validate environment setup

.NOTES
    File: test-runner.ps1
    Author: Lokifi Development Team
    Last Updated: October 22, 2025
    Requires: PowerShell 5.1+, Python 3.11+, Node.js 18+

.LINK
    https://github.com/ericsocrat/Lokifi
#>

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
    [switch]$FastCheck,
    [switch]$Quiet,
    [switch]$Parallel,
    [switch]$Verbose,
    [switch]$Watch,
    [switch]$DryRun,
    [switch]$SelfTest,
    [switch]$CIMode,
    [int]$Timeout = 300,
    [int]$CoverageThreshold = 15,
    [switch]$GenerateReport
)

$ErrorActionPreference = 'Continue'

# Import common functions for CI/CD mode
if ($CIMode) {
    $modulePath = Join-Path $PSScriptRoot 'lib\Common-Functions.ps1'
    if (Test-Path $modulePath) {
        Import-Module $modulePath -Force
    }
}

# ============================================================================
# Configuration
# ============================================================================

$script:Paths = @{
    RepoRoot            = (Get-Item $PSScriptRoot).Parent.FullName
    BackendDir          = Join-Path (Get-Item $PSScriptRoot).Parent.FullName 'apps\backend'
    FrontendDir         = Join-Path (Get-Item $PSScriptRoot).Parent.FullName 'apps\frontend'
    BackendTestResults  = Join-Path (Get-Item $PSScriptRoot).Parent.FullName 'apps\backend\test-results'
    FrontendTestResults = Join-Path (Get-Item $PSScriptRoot).Parent.FullName 'apps\frontend\test-results'
    LogFile             = Join-Path (Get-Item $PSScriptRoot).Parent.FullName 'infra\logs\test-runner.log'
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

    # Skip colored output in CI mode
    if ($script:CIMode) {
        return
    }

    $colors = @{
        'Info'    = 'Cyan'
        'Success' = 'Green'
        'Warning' = 'Yellow'
        'Error'   = 'Red'
    }

    $icons = @{
        'Info'    = 'ℹ️'
        'Success' = '✅'
        'Warning' = '⚠️'
        'Error'   = '❌'
    }

    $logMessage = "$($icons[$Level]) $Message"
    Write-Host $logMessage -ForegroundColor $colors[$Level]

    # Also log to file with timestamp (if LogFile is configured)
    if ($script:Paths.LogFile) {
        $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        Add-Content -Path $script:Paths.LogFile -Value "[$timestamp] [$Level] $Message" -ErrorAction SilentlyContinue
    }
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
            } elseif ($file -match 'app/services/(\w+)\.py') {
                $module = $Matches[1]
                $affectedTests += "test_${module}.py"
            } elseif ($file -match 'app/models/(\w+)\.py') {
                # Model changes might affect multiple tests
                $affectedTests += 'test_api.py'
            }
        } elseif ($file -match '^apps/frontend/') {
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

    # Use script-level paths configuration
    $Config = $script:Paths

    Write-TestLog 'Initializing test environment...' -Level Info

    # Validate environment first
    $pythonFound = Get-Command python -ErrorAction SilentlyContinue
    $nodeFound = Get-Command node -ErrorAction SilentlyContinue

    if (-not $pythonFound) {
        Write-TestLog 'Python not found in PATH' -Level Warning
    }
    if (-not $nodeFound) {
        Write-TestLog 'Node.js not found in PATH' -Level Warning
    }

    # Verify directories exist
    if (-not (Test-Path $Config.BackendDir)) {
        Write-TestLog "Backend directory not found: $($Config.BackendDir)" -Level Warning
    }
    if (-not (Test-Path $Config.FrontendDir)) {
        Write-TestLog "Frontend directory not found: $($Config.FrontendDir)" -Level Warning
    }

    # Create test results directories for each app
    if (-not (Test-Path $Config.BackendTestResults)) {
        New-Item -ItemType Directory -Path $Config.BackendTestResults -Force | Out-Null
    }

    if (-not (Test-Path $Config.FrontendTestResults)) {
        New-Item -ItemType Directory -Path $Config.FrontendTestResults -Force | Out-Null
    }

    # Set environment variables
    $env:TESTING = 'true'
    $env:PYTEST_CURRENT_TEST = $true

    Write-TestLog 'Environment ready' -Level Success
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
        [switch]$Verbose,
        [switch]$Quiet
    )

    # Use script-level paths configuration
    $Config = $script:Paths

    Write-TestLog 'Running backend tests...' -Level Info

    Push-Location $Config.BackendDir
    try {
        # Ensure virtual environment exists
        if (-not (Test-Path 'venv\Scripts\python.exe')) {
            Write-TestLog 'Virtual environment not found. Creating...' -Level Warning
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
            $pytestArgs += 'tests/'
        }

        # File selection
        if ($File) {
            $pytestArgs = @("tests/$File")
        }

        # Match pattern
        if ($Match) {
            $pytestArgs += '-k'
            $pytestArgs += $Match
        }

        # Verbosity and coverage terminal output
        if ($Quiet) {
            $pytestArgs += '-q'
            $pytestArgs += '--tb=no'
            $pytestArgs += '--no-header'
            # Quiet: suppress verbose coverage table, just show summary percentage
            $pytestArgs += '--cov-report='
        } elseif ($Verbose) {
            $pytestArgs += '-vv'
            $pytestArgs += '--tb=long'
            $pytestArgs += '--cov-report=term-missing'
        } else {
            $pytestArgs += '-v'
            $pytestArgs += '--tb=short'
            $pytestArgs += '--cov-report=term-missing'
        }

        # Additional coverage outputs (if explicitly requested)
        if ($Coverage) {
            $pytestArgs += '--cov=app'
            $pytestArgs += '--cov-report=html'
            $pytestArgs += "--cov-report=json:$($Config.BackendTestResults)/backend-coverage.json"
        }

        # Quick mode (only fast tests)
        if ($Quick) {
            $pytestArgs += '-m'
            $pytestArgs += 'not slow'
            $pytestArgs += '--timeout=10'
        }

        # Disable warnings causing exit code failures (warnings are logged but don't fail tests)
        $pytestArgs += '--disable-warnings'

        # Output
        $pytestArgs += "--junit-xml=$($Config.BackendTestResults)/backend-results.xml"

        Write-TestLog "pytest $($pytestArgs -join ' ')" -Level Info

        & .\venv\Scripts\python.exe -m pytest @pytestArgs | Out-Host

        $exitCode = $LASTEXITCODE

        if ($exitCode -eq 0) {
            Write-TestLog 'Backend tests passed!' -Level Success
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
        [switch]$Watch,
        [switch]$Quiet
    )

    # Use script-level paths configuration
    $Config = $script:Paths

    Write-TestLog 'Running frontend tests...' -Level Info

    Push-Location $Config.FrontendDir
    try {
        # Ensure node_modules exists
        if (-not (Test-Path 'node_modules')) {
            Write-TestLog 'node_modules not found. Installing...' -Level Warning
            npm install
        }

        # Build test command - need '--' to separate npm args from vitest args
        $testArgs = @('test', '--')

        if (-not $Watch) {
            $testArgs += '--run'
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
            $testArgs += '--testNamePattern'
            $testArgs += $Match
        }

        # Coverage
        if ($Coverage) {
            $testArgs += '--coverage'
            $testArgs += '--coverage.reporter=html'
            $testArgs += '--coverage.reporter=json-summary'
        }

        # Verbosity - use dot reporter for quiet mode (minimal output)
        if ($Quiet) {
            $testArgs += '--reporter=dot'
        } elseif ($Verbose) {
            $testArgs += '--reporter=verbose'
        }

        Write-TestLog "npm $($testArgs -join ' ')" -Level Info

        # In Quiet mode, suppress stderr (expected errors from tests)
        if ($Quiet) {
            npm @testArgs 2>$null | Out-Host
        } else {
            npm @testArgs | Out-Host
        }

        $exitCode = $LASTEXITCODE

        if ($exitCode -eq 0) {
            Write-TestLog 'Frontend tests passed!' -Level Success
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
    Write-TestLog 'Running smart test selection...' -Level Info

    $changedFiles = Get-ChangedFiles

    if ($changedFiles.Count -eq 0) {
        Write-TestLog 'No files changed, running quick smoke tests...' -Level Warning
        return Invoke-QuickTests
    }

    Write-TestLog "Found $($changedFiles.Count) changed files" -Level Info

    $affectedTests = Get-AffectedTests -ChangedFiles $changedFiles

    if ($affectedTests.Count -eq 0) {
        Write-TestLog 'No directly affected tests found, running category tests...' -Level Warning

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
    Write-TestLog 'Running quick tests (< 10s per test)...' -Level Info

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

function Invoke-FastQualityChecks {
    <#
    .SYNOPSIS
    Run fast quality checks for pre-commit validation (lint, format, typecheck)
    #>
    Write-TestLog 'Running fast quality checks...' -Level Info
    $Config = $script:Paths
    $allPassed = $true
    $startTime = Get-Date

    # Frontend quality checks
    Write-Host ''
    Write-Host '📦 Frontend Quality Checks' -ForegroundColor Cyan
    Write-Host '─────────────────────────────' -ForegroundColor Gray

    Push-Location $Config.FrontendDir
    try {
        # TypeScript type checking
        Write-Host '  🔍 TypeScript type checking...' -ForegroundColor White -NoNewline
        $typecheckOutput = npm run typecheck 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host ' ✅' -ForegroundColor Green
        } else {
            Write-Host ' ❌' -ForegroundColor Red
            $allPassed = $false
            if (-not $Quiet) { Write-Host $typecheckOutput -ForegroundColor Red }
        }

        # ESLint
        Write-Host '  🔍 ESLint checking...' -ForegroundColor White -NoNewline
        $lintOutput = npm run lint 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host ' ✅' -ForegroundColor Green
        } else {
            Write-Host ' ❌' -ForegroundColor Red
            $allPassed = $false
            if (-not $Quiet) { Write-Host $lintOutput -ForegroundColor Red }
        }
    } finally {
        Pop-Location
    }

    # Backend quality checks
    Write-Host ''
    Write-Host '🐍 Backend Quality Checks' -ForegroundColor Cyan
    Write-Host '─────────────────────────────' -ForegroundColor Gray

    Push-Location $Config.BackendDir
    try {
        # Activate virtual environment
        $venvActivate = Join-Path $Config.BackendDir 'venv\Scripts\Activate.ps1'
        if (Test-Path $venvActivate) {
            & $venvActivate
        }

        # Ruff linting
        Write-Host '  🔍 Ruff linting...' -ForegroundColor White -NoNewline
        $ruffOutput = ruff check . 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host ' ✅' -ForegroundColor Green
        } else {
            Write-Host ' ❌' -ForegroundColor Red
            $allPassed = $false
            if (-not $Quiet) { Write-Host $ruffOutput -ForegroundColor Red }
        }

        # Black formatting check
        Write-Host '  🔍 Black formatting...' -ForegroundColor White -NoNewline
        $blackOutput = black . --check 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host ' ✅' -ForegroundColor Green
        } else {
            Write-Host ' ❌' -ForegroundColor Red
            $allPassed = $false
            if (-not $Quiet) { Write-Host $blackOutput -ForegroundColor Red }
        }
    } finally {
        Pop-Location
    }

    $duration = (Get-Date) - $startTime
    Write-Host ''
    Write-Host "⏱️  Duration: $($duration.TotalSeconds.ToString('F2'))s" -ForegroundColor Gray
    Write-Host ''

    if ($allPassed) {
        Write-Host '✅ All quality checks passed! 🎉' -ForegroundColor Green
        Write-TestLog 'Fast quality checks passed!' -Level Success
        return 0
    } else {
        Write-Host '❌ Quality checks failed!' -ForegroundColor Red
        Write-TestLog 'Fast quality checks failed' -Level Error
        return 1
    }
}

function Invoke-PreCommitTests {
    Write-TestLog 'Running pre-commit test suite...' -Level Info

    # Run fast, essential tests
    $tests = @(
        @{ Name = 'Backend API'; Category = 'api'; Type = 'backend'; Quick = $true }
        @{ Name = 'Backend Security'; Category = 'security'; Type = 'backend'; Quick = $true }
        @{ Name = 'Frontend Components'; Category = 'components'; Type = 'frontend'; Quick = $true }
    )

    $allPassed = $true
    $startTime = Get-Date

    foreach ($test in $tests) {
        if (-not $Quiet) {
            Write-TestLog "Running $($test.Name) tests..." -Level Info
        }

        if ($test.Type -eq 'backend') {
            $result = Invoke-BackendTests -Category $test.Category -Quick:$test.Quick -Quiet:$Quiet
        } else {
            $result = Invoke-FrontendTests -Category $test.Category -Quick:$test.Quick -Quiet:$Quiet
        }

        if ($result -ne 0) {
            $allPassed = $false
            Write-TestLog "$($test.Name) tests failed!" -Level Error
        }
    }

    $duration = (Get-Date) - $startTime

    if (-not $Quiet) {
        Write-Host ''
        Write-Host "⏱️  Duration: $($duration.TotalSeconds.ToString('F2'))s" -ForegroundColor Gray
    }

    if ($allPassed) {
        Write-TestLog 'All pre-commit tests passed!' -Level Success
        return 0
    } else {
        Write-TestLog 'Some pre-commit tests failed' -Level Error
        return 1
    }
}

# ============================================================================
# Quality Gate Tests
# ============================================================================

function Invoke-GateTests {
    # Use script-level paths configuration
    $Config = $script:Paths

    Write-TestLog 'Running quality gate checks...' -Level Info

    # Run the enhanced CI protection script
    $ciScript = Join-Path $Config.RepoRoot 'tools\test-runner.ps1'

    if (Test-Path $ciScript) {
        & $ciScript
        return $LASTEXITCODE
    } else {
        Write-TestLog "CI protection script not found at: $ciScript" -Level Error
        return 1
    }
}

# ============================================================================
# Self-Test & Diagnostics
# ============================================================================

function Invoke-SelfTest {
    <#
    .SYNOPSIS
    Run self-diagnostics on the test runner
    #>

    # Use script-level paths configuration
    $Config = $script:Paths

    Write-Host ''
    Write-Host '╔════════════════════════════════════════════════════════════╗' -ForegroundColor Cyan
    Write-Host '║           Test Runner Self-Diagnostics                     ║' -ForegroundColor Cyan
    Write-Host '╚════════════════════════════════════════════════════════════╝' -ForegroundColor Cyan
    Write-Host ''

    $allPassed = $true

    # Test 1: Environment check
    Write-TestLog 'Test 1: Environment validation' -Level Info
    $pythonFound = Get-Command python -ErrorAction SilentlyContinue
    $nodeFound = Get-Command node -ErrorAction SilentlyContinue
    $npmFound = Get-Command npm -ErrorAction SilentlyContinue
    $gitFound = Get-Command git -ErrorAction SilentlyContinue

    if ($pythonFound) {
        $pythonVersion = python --version 2>&1
        Write-Host "  ✓ Python: $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host '  ✗ Python: Not found' -ForegroundColor Red
        $allPassed = $false
    }

    if ($nodeFound) {
        $nodeVersion = node --version
        Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host '  ✗ Node.js: Not found' -ForegroundColor Red
        $allPassed = $false
    }

    if ($npmFound) {
        $npmVersion = npm --version
        Write-Host "  ✓ npm: v$npmVersion" -ForegroundColor Green
    } else {
        Write-Host '  ✗ npm: Not found' -ForegroundColor Red
        $allPassed = $false
    }

    if ($gitFound) {
        $gitVersion = git --version
        Write-Host "  ✓ $gitVersion" -ForegroundColor Green
    } else {
        Write-Host '  ✗ Git: Not found' -ForegroundColor Red
        $allPassed = $false
    }

    Write-Host ''

    # Test 2: Directory structure
    Write-TestLog 'Test 2: Directory structure' -Level Info
    $dirs = @(
        @{Name = 'Repo Root'; Path = $Config.RepoRoot }
        @{Name = 'Backend'; Path = $Config.BackendDir }
        @{Name = 'Frontend'; Path = $Config.FrontendDir }
    )

    foreach ($dir in $dirs) {
        if (Test-Path $dir.Path) {
            Write-Host "  ✓ $($dir.Name): Found" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $($dir.Name): Not found at $($dir.Path)" -ForegroundColor Red
            $allPassed = $false
        }
    }

    Write-Host ''
    Write-Host '╔════════════════════════════════════════════════════════════╗' -ForegroundColor Cyan
    if ($allPassed) {
        Write-Host '║              Self-Test: ALL PASSED ✅                      ║' -ForegroundColor Green
        Write-Host '╚════════════════════════════════════════════════════════════╝' -ForegroundColor Cyan
        Write-Host ''
        Write-TestLog 'Test runner is ready to use!' -Level Success
        return 0
    } else {
        Write-Host '║              Self-Test: FAILED ❌                          ║' -ForegroundColor Red
        Write-Host '╚════════════════════════════════════════════════════════════╝' -ForegroundColor Cyan
        Write-Host ''
        Write-TestLog 'Please install missing dependencies' -Level Error
        return 1
    }
}

# ============================================================================
# Main Execution Logic
# ============================================================================

# ============================================================================
# Parallel Execution Support (Phase 2c)
# ============================================================================

function Invoke-ParallelTests {
    <#
    .SYNOPSIS
    Execute backend and frontend tests in parallel using PowerShell runspaces

    .DESCRIPTION
    Uses PowerShell runspace pools to execute backend and frontend tests concurrently.
    Provides 2-3x speedup compared to sequential execution.

    .PARAMETER MaxThreads
    Maximum number of concurrent runspaces (default: 2 for backend + frontend)

    .PARAMETER Coverage
    Enable coverage reporting for both test suites

    .PARAMETER Verbose
    Enable verbose output from test execution
    #>
    param(
        [int]$MaxThreads = 2,
        [switch]$Coverage,
        [switch]$Verbose
    )

    Write-TestLog "Parallel execution mode - using $MaxThreads threads" -Level Info
    Write-TestLog 'Starting backend and frontend tests concurrently...' -Level Info

    # Create runspace pool
    $runspacePool = [runspacefactory]::CreateRunspacePool(1, $MaxThreads)
    $runspacePool.Open()

    # Job tracking
    $jobs = @()

    try {
        # Backend test job
        $backendJob = [powershell]::Create().AddScript({
                param($BackendDir, $CoverageFlag, $VerboseFlag, $Paths)

                Push-Location $BackendDir
                try {
                    # Set Python path
                    $env:PYTHONPATH = $PWD.Path

                    # Build pytest command
                    $pytestArgs = @('tests/', '-v')

                    if ($CoverageFlag) {
                        $pytestArgs += '--cov=app'
                        $pytestArgs += '--cov-report=html'
                        $pytestArgs += '--cov-report=term'
                        $pytestArgs += "--cov-report=json:$($Paths.BackendTestResults)/backend-coverage.json"
                    }

                    if ($VerboseFlag) {
                        $pytestArgs += '-vv'
                        $pytestArgs += '--tb=long'
                    }

                    # Execute pytest
                    $output = & .\venv\Scripts\python.exe -m pytest @pytestArgs 2>&1
                    $exitCode = $LASTEXITCODE

                    return @{
                        Name     = 'Backend'
                        ExitCode = $exitCode
                        Output   = $output -join "`n"
                        Duration = 0  # Will be calculated by caller
                    }
                } catch {
                    return @{
                        Name     = 'Backend'
                        ExitCode = 1
                        Output   = $_.Exception.Message
                        Duration = 0
                    }
                } finally {
                    Pop-Location
                }
            }).AddArgument($script:Paths.BackendDir).AddArgument($Coverage.IsPresent).AddArgument($Verbose.IsPresent).AddArgument($script:Paths)

        $backendJob.RunspacePool = $runspacePool
        $jobs += @{
            Name       = 'Backend'
            PowerShell = $backendJob
            Handle     = $backendJob.BeginInvoke()
            StartTime  = Get-Date
        }

        # Frontend test job
        $frontendJob = [powershell]::Create().AddScript({
                param($FrontendDir, $CoverageFlag, $VerboseFlag)

                # Change to frontend directory
                Set-Location $FrontendDir
                try {
                    # Build vitest command
                    $vitestArgs = @('run')

                    if ($CoverageFlag) {
                        $vitestArgs += '--coverage'
                    }

                    if ($VerboseFlag) {
                        $vitestArgs += '--reporter=verbose'
                    }

                    # Execute vitest (working directory is now frontend dir)
                    $output = & npm run test -- @vitestArgs 2>&1
                    $exitCode = $LASTEXITCODE

                    return @{
                        Name     = 'Frontend'
                        ExitCode = $exitCode
                        Output   = $output -join "`n"
                        Duration = 0  # Will be calculated by caller
                    }
                } catch {
                    return @{
                        Name     = 'Frontend'
                        ExitCode = 1
                        Output   = $_.Exception.Message
                        Duration = 0
                    }
                } finally {
                    # Note: Set-Location doesn't need Pop-Location in runspace
                }
            }).AddArgument($script:Paths.FrontendDir).AddArgument($Coverage.IsPresent).AddArgument($Verbose.IsPresent)

        $frontendJob.RunspacePool = $runspacePool
        $jobs += @{
            Name       = 'Frontend'
            PowerShell = $frontendJob
            Handle     = $frontendJob.BeginInvoke()
            StartTime  = Get-Date
        }

        # Wait for all jobs to complete
        $results = @()
        foreach ($job in $jobs) {
            Write-TestLog "Waiting for $($job.Name) tests to complete..." -Level Info

            # Wait for job completion
            $result = $job.PowerShell.EndInvoke($job.Handle)
            $endTime = Get-Date
            $result.Duration = ($endTime - $job.StartTime).TotalSeconds

            $results += $result

            # Display results
            if ($result.ExitCode -eq 0) {
                Write-TestLog "$($job.Name) tests completed successfully ($('{0:N2}' -f $result.Duration)s)" -Level Success
            } else {
                Write-TestLog "$($job.Name) tests failed ($('{0:N2}' -f $result.Duration)s)" -Level Error
            }

            # Show output if not in CI mode
            if (-not $script:CIMode -and $Verbose) {
                Write-Host "`n--- $($job.Name) Output ---" -ForegroundColor Cyan
                Write-Host $result.Output
                Write-Host "--- End $($job.Name) Output ---`n" -ForegroundColor Cyan
            }

            # Dispose PowerShell instance
            $job.PowerShell.Dispose()
        }

        # Calculate summary
        $totalDuration = ($results | Measure-Object -Property Duration -Sum).Sum
        $failedTests = $results | Where-Object { $_.ExitCode -ne 0 }

        Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
        Write-Host '║           Parallel Execution Summary                      ║' -ForegroundColor Cyan
        Write-Host '╚════════════════════════════════════════════════════════════╝' -ForegroundColor Cyan

        foreach ($result in $results) {
            $status = if ($result.ExitCode -eq 0) { '✅ PASS' } else { '❌ FAIL' }
            $duration = '{0:N2}s' -f $result.Duration
            Write-Host "$status $($result.Name): $duration" -ForegroundColor $(if ($result.ExitCode -eq 0) { 'Green' } else { 'Red' })
        }

        Write-Host "`nTotal parallel duration: $('{0:N2}' -f $totalDuration)s" -ForegroundColor Cyan

        # Calculate estimated sequential duration (backend + frontend)
        $estimatedSequential = ($results | Measure-Object -Property Duration -Maximum).Maximum * $results.Count
        $speedup = if ($totalDuration -gt 0) { $estimatedSequential / $totalDuration } else { 1 }
        Write-Host "Estimated speedup: $('{0:N2}' -f $speedup)x faster than sequential" -ForegroundColor Green

        # Return failure if any test suite failed
        if ($failedTests.Count -gt 0) {
            return 1
        }
        return 0
    } finally {
        # Cleanup runspace pool
        $runspacePool.Close()
        $runspacePool.Dispose()
    }
}

function Invoke-TestRunner {
    # Handle self-test first (before initialization)
    if ($SelfTest) {
        return Invoke-SelfTest
    }

    Initialize-TestEnvironment

    # Initialize tracking variables for CI mode
    $testResults = @{}
    $warnings = @()
    $errorsList = @()

    # Skip header in CI mode
    if (-not $CIMode) {
        Write-Host ''
        Write-Host '╔════════════════════════════════════════════════════════════╗' -ForegroundColor Cyan
        Write-Host '║           Lokifi Test Runner - Comprehensive Suite        ║' -ForegroundColor Cyan
        Write-Host '╚════════════════════════════════════════════════════════════╝' -ForegroundColor Cyan
        Write-Host ''
    }

    # Show dry-run warning
    if ($DryRun -and -not $CIMode) {
        Write-TestLog 'DRY RUN MODE - No tests will be executed' -Level Warning
        Write-Host ''
    }

    $startTime = Get-Date
    $exitCode = 0

    try {
        # Handle special modes
        if ($FastCheck) {
            if ($DryRun) {
                if (-not $CIMode) {
                    Write-TestLog 'Would run fast quality checks (lint, format, typecheck)' -Level Info
                }
                $testResults = @{ mode = 'fastcheck-dryrun' }
                $exitCode = 0
            } else {
                $exitCode = Invoke-FastQualityChecks
            }
        } elseif ($Smart) {
            if ($DryRun) {
                $changedFiles = Get-ChangedFiles
                $affectedTests = Get-AffectedTests -ChangedFiles $changedFiles
                if (-not $CIMode) {
                    Write-TestLog "Would analyze $($changedFiles.Count) changed files" -Level Info
                    Write-TestLog "Would run $($affectedTests.Count) affected tests" -Level Info
                }
                $testResults = @{
                    mode           = 'smart-dryrun'
                    changed_files  = $changedFiles.Count
                    affected_tests = $affectedTests.Count
                }
                $exitCode = 0
            } else {
                $exitCode = Invoke-SmartTests
            }
        } elseif ($PreCommit) {
            if ($DryRun) {
                if (-not $CIMode) {
                    Write-TestLog 'Would run pre-commit test suite' -Level Info
                }
                $testResults = @{ mode = 'precommit-dryrun' }
                $exitCode = 0
            } else {
                $exitCode = Invoke-PreCommitTests
            }
        } elseif ($Gate) {
            if ($DryRun) {
                if (-not $CIMode) {
                    Write-TestLog 'Would run quality gate checks' -Level Info
                }
                $testResults = @{ mode = 'gate-dryrun' }
                $exitCode = 0
            } else {
                $exitCode = Invoke-GateTests
            }
        } elseif ($Quick) {
            if ($DryRun) {
                if (-not $CIMode) {
                    Write-TestLog 'Would run quick tests (< 10s per test)' -Level Info
                }
                $testResults = @{ mode = 'quick-dryrun' }
                $exitCode = 0
            } else {
                $exitCode = Invoke-QuickTests
            }
        }
        # Category-based execution
        elseif ($Category -eq 'all') {
            # Parallel execution when -Parallel flag is set
            if ($Parallel -and -not $DryRun) {
                Write-TestLog 'Running all tests in parallel mode...' -Level Info
                $exitCode = Invoke-ParallelTests -Coverage:$Coverage -Verbose:$Verbose
            }
            # DryRun with Parallel flag
            elseif ($Parallel -and $DryRun) {
                Write-TestLog 'Would run all tests in parallel mode (backend + frontend concurrently)' -Level Info
                $testResults = @{ mode = 'all-parallel-dryrun'; threads = 2 }
                $exitCode = 0
            }
            # Sequential execution (default)
            else {
                Write-TestLog 'Running all tests sequentially...' -Level Info
                $backendExit = Invoke-BackendTests -File $File -Match $Match -Coverage:$Coverage -Verbose:$Verbose
                if ($backendExit -eq 0) {
                    $exitCode = Invoke-FrontendTests -File $File -Match $Match -Coverage:$Coverage -Verbose:$Verbose -Watch:$Watch
                } else {
                    $exitCode = $backendExit
                }
            }
        } elseif ($Category -eq 'backend') {
            $exitCode = Invoke-BackendTests -File $File -Match $Match -Coverage:$Coverage -Verbose:$Verbose
        } elseif ($Category -eq 'frontend') {
            $exitCode = Invoke-FrontendTests -File $File -Match $Match -Coverage:$Coverage -Verbose:$Verbose -Watch:$Watch
        } else {
            # Specific category (api, unit, integration, etc.)
            $backendExit = Invoke-BackendTests -Category $Category -File $File -Match $Match -Coverage:$Coverage -Verbose:$Verbose
            $exitCode = $backendExit
        }

        $endTime = Get-Date
        $duration = $endTime - $startTime

        # Store results for CI mode
        $testResults = @{
            category     = $Category
            duration_s   = [math]::Round($duration.TotalSeconds, 2)
            exit_code    = $exitCode
            mode         = if ($Smart) { 'smart' } elseif ($PreCommit) { 'precommit' } elseif ($Coverage) { 'coverage' } elseif ($Quick) { 'quick' } else { 'standard' }
            tests_passed = $exitCode -eq 0
        }

        # CI/CD mode: Output JSON
        if ($CIMode) {
            $success = $exitCode -eq 0
            $output = New-CIModeOutput `
                -ToolName 'test-runner' `
                -Success $success `
                -Results $testResults `
                -Errors $errorsList `
                -Warnings $warnings

            $output.duration_ms = [math]::Round($duration.TotalMilliseconds, 2)
            $output | ConvertTo-Json -Depth 10 | Write-Host
            exit $output.exit_code
        }

        # Human-readable output
        Write-Host ''
        Write-Host '╔════════════════════════════════════════════════════════════╗' -ForegroundColor Cyan
        Write-Host '║                     Test Run Complete                      ║' -ForegroundColor Cyan
        Write-Host '╚════════════════════════════════════════════════════════════╝' -ForegroundColor Cyan
        Write-Host ''
        Write-TestLog "Duration: $($duration.TotalSeconds.ToString('0.00'))s" -Level Info

        if ($exitCode -eq 0) {
            Write-TestLog 'All tests passed! 🎉' -Level Success
        } else {
            Write-TestLog "Tests failed with exit code $exitCode" -Level Error
        }

        Write-Host ''

    } catch {
        $errorsList += $_.Exception.Message
        Write-TestLog "Test runner encountered an error: $_" -Level Error
        $exitCode = 1

        # Output error in CI mode
        if ($CIMode) {
            $output = New-CIModeOutput `
                -ToolName 'test-runner' `
                -Success $false `
                -Results $testResults `
                -Errors $errorsList

            $output | ConvertTo-Json -Depth 10 | Write-Host
        }
    }

    exit $exitCode
}

# ============================================================================
# Entry Point
# ============================================================================

Invoke-TestRunner
