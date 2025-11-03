# Working Directory Context Pattern

**Category**: CI/CD
**Difficulty**: 🟢 Beginner
**Success Rate**: 100% (4/4 sessions - 8, 9, 32, 56)
**Impact**: ✅ Proven (prevents path errors)
**Time Investment**: 5-10 minutes per workflow
**Sessions Used**: Sessions 8-9 (workflows), Session 32 (scripts), Session 56 (tasks)

## Problem

CI/CD workflows and scripts fail due to incorrect working directory assumptions:

❌ **Relative path errors**: Scripts assume wrong starting directory
❌ **Monorepo confusion**: Working from root when should be in subdirectory
❌ **Tool failures**: npm/pip commands run in wrong directory
❌ **File not found**: Assets/configs not found due to path context

## Context

**When to use:**
- GitHub Actions workflows (especially monorepos)
- PowerShell/bash automation scripts
- VS Code tasks that navigate directories
- Any multi-directory project structure

**When NOT to use:**
- Single-directory projects
- When absolute paths are used throughout

**Prerequisites:**
- Understanding of relative vs absolute paths
- Knowledge of project structure
- CI/CD or scripting experience

**Related Patterns:**
- [Service Configuration Standards](./service-config-standards.md) - Related workflow patterns
- [Root Cause Analysis](./root-cause-analysis.md) - Debugging path issues

## Solution

### Step 1: Explicit working-directory in Workflows

**Always set working-directory for clarity:**
```yaml
# ❌ BAD - Implicit working directory (monorepo root)
- name: Run backend tests
  run: pytest

# ✅ GOOD - Explicit working directory
- name: Run backend tests
  run: pytest
  working-directory: apps/backend
```

### Step 2: Verify Context at Script Start

**Always verify location first:**
```powershell
# PowerShell script
Write-Host "Current directory: $(Get-Location)"

# Navigate to correct location
$scriptRoot = $PSScriptRoot  # Directory containing this script
cd "$scriptRoot\..\apps\backend"

# Verify arrival
Write-Host "Working from: $(Get-Location)"
if (-not (Test-Path "requirements.txt")) {
    Write-Error "Not in backend directory!"
    exit 1
}
```

### Step 3: Use Relative Paths from Known Context

**Define paths relative to working directory:**
```yaml
# GitHub Actions workflow
jobs:
  test:
    steps:
      - name: Backend tests
        working-directory: apps/backend
        run: |
          pytest                    # Relative to apps/backend
          coverage report          # Same context

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: backend-coverage
          path: apps/backend/coverage  # Absolute from repo root
```

### Step 4: Document Working Directory Requirements

**Add comments explaining context:**
```yaml
# .github/workflows/backend-tests.yml

# NOTE: This workflow operates in apps/backend/ context
# All run commands execute relative to apps/backend/
# File paths in actions must be relative to repo root

jobs:
  test:
    steps:
      - name: Install dependencies
        working-directory: apps/backend  # Explicit context
        run: pip install -r requirements.txt
```

### Step 5: Verify in VS Code Tasks

**Set cwd in task configuration:**
```json
// .vscode/tasks.json
{
    "label": "Backend Tests",
    "type": "shell",
    "command": "pytest",
    "options": {
        "cwd": "${workspaceFolder}/apps/backend"  // Explicit working directory
    }
}
```

## Example: Session 8-9 - Workflow Working Directory Fixes

**Real-world fixes from Sessions 8-9:**

### Initial Issue: Unclear Working Directory

**❌ BEFORE** (apps/backend/.github/workflows/backend-tests.yml):
```yaml
name: Backend Tests

jobs:
  test:
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r requirements.txt  # Where is requirements.txt?

      - name: Run tests
        run: pytest  # Where should pytest run?
```

**Problems:**
1. Commands assume they're in `apps/backend/` but workflow runs from repo root
2. `requirements.txt` not found (looks in repo root)
3. `pytest` discovers wrong tests or none

### Fixed: Explicit Working Directory

**✅ AFTER** (.github/workflows/backend-tests.yml):
```yaml
name: Backend Tests

# WORKFLOW CONTEXT: This workflow operates in apps/backend/ directory
# - All 'run' commands execute relative to apps/backend/
# - File paths in actions must be relative to repo root (e.g., apps/backend/coverage)

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/backend  # Set default for all steps

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r requirements.txt  # Now finds apps/backend/requirements.txt

      - name: Run tests
        run: pytest  # Discovers tests in apps/backend/tests/
        env:
          DATABASE_URL: postgresql://lokifi:lokifi2025@localhost:5432/lokifi_test

      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: backend-coverage
          path: apps/backend/coverage  # Absolute from repo root
```

**Benefits:**
- ✅ Clear context documented in comments
- ✅ `defaults.run.working-directory` sets context for all steps
- ✅ Relative paths work correctly
- ✅ Actions `path:` uses absolute from repo root

### Example: Session 32 - Script Working Directory

**PowerShell script with context verification:**

```powershell
# tools/test-runner.ps1

# SCRIPT CONTEXT: Runs from tools/ directory
# Target: apps/backend/ and apps/frontend/

param(
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$All
)

# Step 1: Verify script location
$scriptDir = $PSScriptRoot
Write-Host "📂 Script location: $scriptDir" -ForegroundColor Cyan

# Step 2: Navigate to project root
$projectRoot = Split-Path $scriptDir -Parent
cd $projectRoot
Write-Host "📂 Project root: $(Get-Location)" -ForegroundColor Cyan

# Step 3: Verify structure
if (-not (Test-Path "apps/backend") -or -not (Test-Path "apps/frontend")) {
    Write-Error "Invalid project structure! Expected apps/backend and apps/frontend"
    exit 1
}

# Step 4: Run backend tests (explicit directory)
if ($Backend -or $All) {
    Write-Host "`n🔧 Backend Tests" -ForegroundColor Blue
    cd apps/backend
    Write-Host "📂 Working from: $(Get-Location)" -ForegroundColor Gray

    # Verify context
    if (-not (Test-Path "requirements.txt")) {
        Write-Error "Not in backend directory!"
        exit 1
    }

    # Run tests
    pytest
    cd $projectRoot  # Return to project root
}

# Step 5: Run frontend tests (explicit directory)
if ($Frontend -or $All) {
    Write-Host "`n🎨 Frontend Tests" -ForegroundColor Magenta
    cd apps/frontend
    Write-Host "📂 Working from: $(Get-Location)" -ForegroundColor Gray

    # Verify context
    if (-not (Test-Path "package.json")) {
        Write-Error "Not in frontend directory!"
        exit 1
    }

    # Run tests
    npm test
    cd $projectRoot  # Return to project root
}
```

## Success Metrics

### Sessions 8-9: Workflow Fixes
- **Issues**: 5 workflows with unclear working directory context
- **Fix**: Added `defaults.run.working-directory` to all workflows
- **Result**: 0 path-related failures after fix
- **Time saved**: ~30 minutes per debugging session (prevented)

### Session 32: Script Refactoring
- **Issues**: Test runner script assumed wrong working directory
- **Fix**: Added explicit directory verification and navigation
- **Result**: Script works from any invocation location
- **Time saved**: ~20 minutes per failed script run (prevented)

### Session 56: VS Code Tasks
- **Issues**: Tasks failed when invoked from different folders
- **Fix**: Added explicit `cwd` to all task configurations
- **Result**: Tasks work regardless of active editor file
- **Time saved**: ~10 minutes per task debugging (prevented)

## Anti-Patterns

### ❌ Assuming working directory

```yaml
# ❌ BAD - Implicit assumption
- name: Run tests
  run: pytest  # Where does this run? Unclear!
```

```yaml
# ✅ GOOD - Explicit context
- name: Run tests
  working-directory: apps/backend
  run: pytest  # Clear: runs in apps/backend/
```

### ❌ Not verifying script location

```powershell
# ❌ BAD - Assume we're in the right place
cd apps/backend
pytest  # What if we're not in project root?
```

```powershell
# ✅ GOOD - Verify location first
$scriptDir = $PSScriptRoot
$projectRoot = Split-Path $scriptDir -Parent
cd $projectRoot

if (-not (Test-Path "apps/backend")) {
    Write-Error "Project structure invalid!"
    exit 1
}

cd apps/backend
pytest
```

### ❌ Mixing relative and absolute paths

```yaml
# ❌ BAD - Inconsistent path references
- name: Run tests
  working-directory: apps/backend
  run: pytest

- name: Upload results
  uses: actions/upload-artifact@v4
  with:
    path: coverage  # Relative to what? apps/backend? repo root?
```

```yaml
# ✅ GOOD - Consistent path strategy
- name: Run tests
  working-directory: apps/backend  # Commands relative to here
  run: pytest

- name: Upload results
  uses: actions/upload-artifact@v4
  with:
    path: apps/backend/coverage  # Always absolute from repo root
```

## Related Patterns

- **[Service Configuration Standards](./service-config-standards.md)** - Complete workflow patterns
- **[Root Cause Analysis](./root-cause-analysis.md)** - Debug path issues

## Best Practices

1. **Always set working-directory** - Explicit beats implicit
2. **Verify context at start** - Check you're in the right place
3. **Use defaults.run** - Set default working-directory for jobs
4. **Document context** - Add comments explaining directory assumptions
5. **Absolute paths in actions** - Use repo-root-relative paths for action inputs
6. **Test from different locations** - Ensure scripts work anywhere
7. **Return to known state** - Navigate back to project root after operations

## Quick Reference

```yaml
# GitHub Actions - Set default working directory
jobs:
  test:
    defaults:
      run:
        working-directory: apps/backend  # All 'run' commands start here

    steps:
      - name: Step with custom directory
        working-directory: apps/frontend  # Override default for this step
        run: npm test

      - name: Action with absolute path
        uses: actions/upload-artifact@v4
        with:
          path: apps/backend/coverage  # Absolute from repo root
```

```powershell
# PowerShell - Verify and navigate
$scriptDir = $PSScriptRoot
$projectRoot = Split-Path $scriptDir -Parent
cd $projectRoot

Write-Host "Working from: $(Get-Location)"

if (-not (Test-Path "expected-file.txt")) {
    Write-Error "Wrong directory!"
    exit 1
}
```

```json
// VS Code tasks - Set cwd
{
    "label": "Task Name",
    "type": "shell",
    "command": "command",
    "options": {
        "cwd": "${workspaceFolder}/apps/backend"
    }
}
```

## References

- **Sessions 8-9**: Workflow working directory fixes - [history.md](../../plans/history.md)
- **Session 32**: Script refactoring - [history.md](../../plans/history.md)
- **Session 56**: VS Code task configuration - [history.md](../../plans/history.md)
- **GitHub Actions**: [working-directory syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_iddefaultsrun)

---

**Last Updated**: November 2, 2025 (Session 66 documentation)
**Pattern Status**: ✅ Proven (4/4 sessions, 100% success rate)
**Recommended For**: All multi-directory projects, CI/CD workflows, automation scripts
