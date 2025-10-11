# Lokifi Enhanced Test System Documentation

## Overview

The Lokifi bot now includes a comprehensive, intelligent test runner that provides:

- **Smart Test Selection**: Automatically runs only tests affected by your changes
- **Category-Based Testing**: Run tests by type (api, unit, integration, e2e, security)
- **Coverage-Aware Testing**: Generate and track code coverage
- **Pre-Commit Testing**: Fast essential tests for commit validation
- **Quality Gates**: Integrated quality validation
- **Performance Tracking**: Monitor test execution times

## Quick Start

### Basic Usage

```powershell
# Run all tests
.\lokifi.ps1 test

# Run backend tests only
.\lokifi.ps1 test -Component backend

# Run API tests only
.\lokifi.ps1 test -Component api

# Run frontend tests only
.\lokifi.ps1 test -Component frontend
```

### Smart Testing

```powershell
# Run only tests affected by changed files
.\lokifi.ps1 test -TestSmart

# Quick pre-commit validation
.\lokifi.ps1 test -TestPreCommit

# Quality gate validation
.\lokifi.ps1 test -TestGate
```

### Advanced Usage

```powershell
# Run specific test file
.\lokifi.ps1 test -TestFile test_auth.py

# Run tests matching a pattern
.\lokifi.ps1 test -TestMatch "authentication"

# Run with coverage report
.\lokifi.ps1 test -TestCoverage

# Verbose output for debugging
.\lokifi.ps1 test -TestVerbose

# Frontend tests in watch mode
.\lokifi.ps1 test -Component frontend -Watch
```

## Test Categories

### Backend Test Categories

| Category | Description | Location | Example |
|----------|-------------|----------|---------|
| `api` | REST endpoint tests | `tests/api/` | `.\lokifi.ps1 test -Component api` |
| `unit` | Unit tests for individual functions | `tests/unit/` | `.\lokifi.ps1 test -Component unit` |
| `integration` | Multi-component integration tests | `tests/integration/` | `.\lokifi.ps1 test -Component integration` |
| `e2e` | End-to-end workflow tests | `tests/e2e/` | `.\lokifi.ps1 test -Component e2e` |
| `security` | Security and auth tests | `tests/security/` | `.\lokifi.ps1 test -Component security` |
| `services` | Service layer tests | `tests/services/` | `.\lokifi.ps1 test -Component services` |

### Frontend Test Categories

| Category | Description | Location |
|----------|-------------|----------|
| `components` | React component tests | `tests/components/` |
| `hooks` | Custom React hooks tests | `tests/hooks/` |
| `utils` | Utility function tests | `tests/utils/` |

## Test Modes

### 1. Smart Mode (`-TestSmart`)

Intelligently selects tests based on changed files:

```powershell
.\lokifi.ps1 test -TestSmart
```

**How it works:**
- Detects files changed since last commit
- Maps changed files to affected tests
- Runs only relevant tests
- Falls back to category tests if no direct matches

**Best for:**
- During active development
- Before committing changes
- Rapid iteration and feedback

### 2. Quick Mode (`-Quick`)

Runs only fast tests (<10s per test):

```powershell
.\lokifi.ps1 test -Quick
```

**Best for:**
- Rapid feedback loops
- Pre-commit validation
- CI/CD pipelines

### 3. Pre-Commit Mode (`-TestPreCommit`)

Essential tests that must pass before committing:

```powershell
.\lokifi.ps1 test -TestPreCommit
```

**Includes:**
- Backend API tests
- Backend security tests
- Frontend component tests

**Best for:**
- Git pre-commit hooks
- Local validation before push

### 4. Coverage Mode (`-TestCoverage`)

Generates comprehensive coverage reports:

```powershell
.\lokifi.ps1 test -TestCoverage
```

**Outputs:**
- HTML coverage report (viewable in browser)
- Terminal coverage summary
- JSON coverage data for analysis

**Best for:**
- Understanding test coverage gaps
- Identifying untested code
- Coverage reports for documentation

### 5. Quality Gate Mode (`-TestGate`)

Runs full CI/CD quality gates:

```powershell
.\lokifi.ps1 test -TestGate
```

**Validates:**
- All tests pass
- Code quality metrics
- Security scans
- TypeScript compilation
- Linting passes

**Best for:**
- CI/CD pipelines
- Pre-deployment validation
- Release readiness checks

## Parameters Reference

### Test Selection Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `-Component` | String | Test category to run | `backend`, `api`, `unit` |
| `-TestFile` | String | Specific test file | `test_auth.py` |
| `-TestMatch` | String | Pattern to match test names | `"authentication"` |

### Test Mode Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `-TestSmart` | Switch | Smart test selection |
| `-Quick` | Switch | Fast tests only |
| `-TestCoverage` | Switch | Generate coverage report |
| `-TestPreCommit` | Switch | Pre-commit test suite |
| `-TestGate` | Switch | Quality gate validation |
| `-TestVerbose` | Switch | Detailed output |
| `-Watch` | Switch | Watch mode (frontend) |

## Test Runner Features

### 1. Intelligent Test Mapping

The test runner maps changed files to affected tests:

```
Changed file: app/api/routes/auth.py
→ Runs: test_auth_endpoints.py, test_auth.py

Changed file: app/services/user.py
→ Runs: test_user.py

Changed file: src/components/UserProfile.tsx
→ Runs: UserProfile.test.tsx
```

### 2. Performance Tracking

Every test run includes timing information:

```
Duration: 12.45s
All tests passed! 🎉
```

### 3. Result Artifacts

Test results are saved to `test-results/`:

```
test-results/
├── backend-results.xml      # JUnit XML results
├── backend-coverage.json    # Coverage data
└── frontend-results.xml     # Frontend test results
```

### 4. Environment Setup

The test runner automatically:
- Creates test result directories
- Sets environment variables
- Activates virtual environments
- Ensures dependencies are installed

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run Tests
  run: |
    .\tools\lokifi.ps1 test -TestGate
```

### Pre-Commit Hook Example

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
pwsh -File tools/lokifi.ps1 test -TestPreCommit
exit $?
```

## Test Organization

The test suite is organized for maximum maintainability:

```
apps/backend/tests/
├── api/                    # REST endpoint tests
│   ├── test_auth_endpoints.py
│   ├── test_user_endpoints.py
│   └── test_post_endpoints.py
├── unit/                   # Unit tests
│   ├── test_auth.py
│   ├── test_validation.py
│   └── test_utils.py
├── integration/            # Integration tests
│   ├── test_auth_flow.py
│   └── test_user_lifecycle.py
├── e2e/                    # End-to-end tests
│   └── test_complete_workflow.py
├── security/               # Security tests
│   ├── test_auth_deps.py
│   └── test_security.py
└── services/               # Service layer tests
    ├── test_notification.py
    └── test_email.py
```

## Coverage Analysis

The test command shows coverage context:

```
📈 Test Coverage Context:
  Current Coverage: ~20.5%
  Test Files: 48
  Test Lines: 12,456
  Production Code: 60,234 lines
  Industry Target: 70% coverage

💡 To reach 70% coverage:
  Need ~29,708 more lines of tests
  That's ~595 test files (avg 50 lines each)
```

## Best Practices

### 1. Use Smart Mode During Development

```powershell
# While coding
.\lokifi.ps1 test -TestSmart
```

This gives you rapid feedback on your changes without running the entire suite.

### 2. Run Pre-Commit Tests Before Committing

```powershell
# Before git commit
.\lokifi.ps1 test -TestPreCommit
```

This catches issues early and keeps the main branch stable.

### 3. Generate Coverage Periodically

```powershell
# Weekly or before releases
.\lokifi.ps1 test -TestCoverage
```

Track coverage trends and identify gaps.

### 4. Use Specific Tests for Debugging

```powershell
# Debug specific functionality
.\lokifi.ps1 test -TestFile test_auth.py -TestVerbose

# Debug specific test
.\lokifi.ps1 test -TestMatch "test_login_success" -TestVerbose
```

### 5. Run Full Suite Before Major Changes

```powershell
# Before major refactoring or releases
.\lokifi.ps1 test -Component all -TestCoverage
```

## Troubleshooting

### Tests Not Found

If tests aren't being discovered:

```powershell
# Check test file locations
ls apps/backend/tests/ -Recurse -Filter "test_*.py"

# Verify test runner can find tests
.\tools\test-runner.ps1 -Category backend -Verbose
```

### Virtual Environment Issues

If Python tests fail to run:

```powershell
# Recreate virtual environment
cd apps/backend
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Frontend Test Issues

If npm tests fail:

```powershell
# Reinstall dependencies
cd apps/frontend
Remove-Item -Recurse -Force node_modules
npm install
```

## Future Enhancements

Planned features for the test system:

- [ ] Test result dashboard
- [ ] Historical coverage tracking
- [ ] Flaky test detection
- [ ] Parallel test execution
- [ ] Test impact analysis
- [ ] AI-powered test generation
- [ ] Visual regression testing
- [ ] Performance regression detection

## Related Documentation

- [Testing Guide](../docs/guides/TESTING_GUIDE.md) - Comprehensive testing practices
- [Test Consolidation Analysis](../docs/TEST_CONSOLIDATION_ANALYSIS.md) - Test optimization plan
- [Testing Index](../docs/TESTING_INDEX.md) - Quick reference
- [CI/CD Guide](../tools/ci-cd/README.md) - Continuous integration setup

## Support

For issues or questions:

1. Check the [Testing Guide](../docs/guides/TESTING_GUIDE.md)
2. Review error messages carefully
3. Use `-TestVerbose` for detailed output
4. Check test result artifacts in `test-results/`

## Version History

- **v1.0.0** (Current) - Initial enhanced test runner release
  - Smart test selection
  - Category-based testing
  - Coverage integration
  - Pre-commit mode
  - Quality gates
