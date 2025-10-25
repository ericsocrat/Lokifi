# 🚀 Lokifi CI/CD Complete Guide

> **Last Updated**: October 23, 2025
> **Status**: Current
> **Target Audience**: Developers new to the project

---

## 📖 Table of Contents

1. [What is CI/CD?](#what-is-cicd)
2. [Why Do We Need It?](#why-do-we-need-it)
3. [CI/CD vs Unit Tests](#cicd-vs-unit-tests)
4. [Where to See CI/CD in Action](#where-to-see-cicd-in-action)
5. [How Our Workflows Work](#how-our-workflows-work)
6. [Common Tasks](#common-tasks)
7. [Troubleshooting](#troubleshooting)

---

## 🤖 What is CI/CD?

**Simple Answer:** It's an automated robot that tests your code every time you push changes or create a Pull Request!

**CI (Continuous Integration)**: Automatically test and validate code changes
**CD (Continuous Deployment)**: Automatically deploy code to production after tests pass

### The Problem It Solves

#### Before CI/CD (Manual Process):
When you create a Pull Request, **you** had to:
1. Run tests manually (`npm test`) ⏱️ 5 min
2. Check for security issues (`npm audit`) ⏱️ 3 min
3. Check code coverage ⏱️ 2 min
4. Update documentation ⏱️ 5 min
5. Hope reviewers trust you did everything ⏱️ 3 min

**Total time wasted per PR: ~17 minutes** 😩

**Problems:**
- ❌ People forget to run tests
- ❌ Tests pass on your computer but fail for others
- ❌ Security vulnerabilities get missed
- ❌ Documentation gets outdated
- ❌ Reviewers have to ask "did you test this?"

#### After CI/CD (Automated Process):
When you create a Pull Request, **the robot** automatically:
1. ✅ Runs all tests (you just wait)
2. ✅ Checks for security issues
3. ✅ Checks code coverage
4. ✅ Posts results as comments on your PR
5. ✅ Blocks merge if anything fails
6. ✅ Updates documentation when merged

**Total time you spend: 0 minutes** 🎉
**Total time waiting: ~3-5 minutes**

**Benefits:**
- ✅ Never forget to run tests
- ✅ Tests run in clean environment (same for everyone)
- ✅ Security issues caught automatically
- ✅ Documentation always up-to-date
- ✅ Reviewers see proof that tests passed

---

## 🔍 CI/CD vs Unit Tests

### Common Question:
> "We have an entire CI/CD pipeline for testing. Why do we need separate frontend and backend tests? Aren't they the same thing?"

### Answer: No, they are NOT the same thing!

- **CI/CD Pipeline**: The *automated delivery system* that runs tests
- **Unit/Integration Tests**: The *actual tests* that verify code correctness

**Analogy**:
- **CI/CD** = The **kitchen** where you cook
- **Tests** = The **recipes and ingredients** you cook with

### What CI/CD Pipeline Tests

Our CI/CD pipeline (`.github/workflows/`) validates **orchestration and infrastructure**:

```yaml
# .github/workflows/ci.yml
jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - name: Run backend tests
        run: pytest tests/  # ← This RUNS the tests
```

The CI/CD tests verify:
- ✅ Can the application **build** correctly?
- ✅ Can the application **deploy** correctly?
- ✅ Do all **dependencies** install properly?
- ✅ Does the **infrastructure** work (Docker, Redis, etc.)?
- ✅ Are there **security vulnerabilities**?
- ✅ Do **all the unit/integration tests pass** when run automatically?

### What Unit/Integration Tests Verify

Unit and integration tests (`apps/frontend/tests/`, `apps/backend/tests/`) verify **business logic**:

```typescript
// apps/frontend/tests/components/PriceChart.test.tsx
describe('PriceChart', () => {
  it('should calculate percentage change correctly', () => {
    const result = calculateChange(100, 150);
    expect(result).toBe(50); // +50% increase
  });
});
```

These tests verify:
- ✅ Does `calculateChange()` return correct values?
- ✅ Does the login form validate email format?
- ✅ Does the API return correct data structure?
- ✅ Do database queries work correctly?
- ✅ Does error handling work properly?

### Why We Need Both

| Aspect | CI/CD Pipeline | Unit/Integration Tests |
|--------|---------------|------------------------|
| **Purpose** | Automate testing process | Define what to test |
| **Runs** | On every push/PR | When CI/CD calls them |
| **Verifies** | Build, deploy, infrastructure | Business logic, features |
| **Location** | `.github/workflows/` | `apps/*/tests/` |
| **You interact with** | Via GitHub UI | Via `npm test`, `pytest` |

**Both are essential:**
- Without CI/CD: Tests must be run manually (error-prone)
- Without unit tests: CI/CD has nothing to run (no validation)

---

## 📍 Where to See CI/CD in Action

### 1. GitHub Actions Tab - The Control Center

**URL:** https://github.com/ericsocrat/Lokifi/actions

```
┌──────────────────────────────────────────────────────────┐
│  GitHub  │  Code  │  Issues  │  Pull Requests  │ ACTIONS │
├──────────────────────────────────────────────────────────┤
│  All workflows                                           │
│                                                          │
│  ✓ test: workflow optimizations    [PR #27]            │
│    Triggered 5 minutes ago          Took 3m 45s         │
│    └─ ✓ Fast Feedback (CI)         3m 15s              │
│    └─ ✓ Coverage Tracking           5m 20s              │
│    └─ ✓ Integration Tests           8m 10s              │
│                                                          │
│  ✓ feat(api): add portfolio endpoint    [main]         │
│    Triggered 2 hours ago            Took 5m 20s         │
│    └─ ✓ Fast Feedback (CI)         2m 10s              │
│    └─ ✓ Security Scanning           1m 25s              │
└──────────────────────────────────────────────────────────┘
```

**What you see:**
- ✅ Every push/PR triggers workflow runs
- ✅ Green checkmarks = all tests passed
- ✅ Click any run to see detailed logs
- ✅ See how long each job took

### 2. Pull Request Page - Status Checks

**URL:** https://github.com/ericsocrat/Lokifi/pull/[NUMBER]

When you create a PR, you'll see:

```
┌──────────────────────────────────────────────────────────┐
│  Pull Request #27                                        │
│  test: Validate Workflow Optimizations                  │
├──────────────────────────────────────────────────────────┤
│  Checks: 4 passing, 0 failing                           │
│                                                          │
│  ✓ Fast Feedback (CI)              3m 15s              │
│  ✓ Coverage Tracking                5m 20s              │
│  ✓ Integration Tests                8m 10s              │
│  ✓ Security Scanning                2m 45s              │
│                                                          │
│  [Merge pull request] ← Only enabled when all pass     │
└──────────────────────────────────────────────────────────┘
```

### 3. Workflow Run Details

Click any workflow to see:
- **Summary**: Overall status and timing
- **Jobs**: Individual job results (Frontend, Backend, Security)
- **Logs**: Detailed console output for debugging
- **Artifacts**: Test reports, coverage reports, build outputs

### 4. PR Comments - Automated Reports

Our workflows post comments on PRs with:
- 📊 **Test coverage** reports
- 🔒 **Security scan** results
- 📏 **PR size** analysis
- 📋 **API contract** test results

---

## ⚙️ How Our Workflows Work

We have **11 active workflows** organized by purpose:

### Core Workflows (Fast Feedback)

#### 1. ⚡ Fast Feedback (CI) - `ci.yml`
**Triggers**: Every push, every PR
**Runtime**: ~3 minutes
**Purpose**: Quick validation before deeper testing

**What it does:**
- Linting (ESLint, Ruff)
- Type checking (TypeScript, mypy)
- Unit tests (fast tests only)
- Security scanning (npm audit, pip-audit)
- Workflow syntax validation (actionlint)

**Path-based execution:**
- Frontend changes → Only frontend checks
- Backend changes → Only backend checks
- Both changed → Run everything

#### 2. 📈 Coverage Tracking - `coverage.yml`
**Triggers**: PRs to main, main branch pushes
**Runtime**: ~5-6 minutes
**Purpose**: Track test coverage and ensure quality

**What it does:**
- Run full test suite with coverage
- Matrix testing (Node 18/20/22, Python 3.10/3.11/3.12)
- Generate coverage reports (HTML, JSON)
- Post coverage results as PR comment
- Fail if coverage drops below threshold

#### 3. 🔗 Integration Tests - `integration.yml`
**Triggers**: PRs to main, main branch pushes
**Runtime**: ~8 minutes
**Purpose**: Test application integration with services

**What it does:**
- API contract testing (schemathesis)
- Accessibility testing (axe-core)
- Backend integration tests (Redis, PostgreSQL)
- Full stack integration tests
- Docker layer caching

#### 4. 🎭 E2E Tests - `e2e.yml`
**Triggers**: PRs to main (critical path), main pushes (full suite)
**Runtime**: 6-15 minutes (progressive)
**Purpose**: Test complete user workflows

**What it does:**
- Critical path tests (login, dashboard, portfolio)
- Full E2E suite (on main branch)
- Visual regression testing (on release)
- Performance testing
- Cross-browser testing (Chromium, Firefox, WebKit)

### Automation Workflows

#### 5. 🏷️ Auto-Label PRs - `label-pr.yml`
Auto-labels PRs based on changed files (frontend, backend, ci-cd, docs, dependencies)

#### 6. 🤖 Auto-merge Dependabot - `auto-merge.yml`
Auto-merges Dependabot PRs that pass all checks (minor/patch versions only)

#### 7. 🚨 Failure Notifications - `failure-notifications.yml`
Creates GitHub issues when critical workflows fail on main branch

#### 8. 📏 PR Size Check - `pr-size-check.yml`
Warns about large PRs and suggests splitting

#### 9. 🧹 Stale Bot - `stale.yml`
Auto-closes stale issues/PRs after 60 days of inactivity

### Security Workflows

#### 10. 🔐 Security Scanning - `security-scan.yml`
**Triggers**: Every push, every PR, daily schedule
**Runtime**: ~5-10 minutes
**Purpose**: Comprehensive security analysis

**What it does:**
- Frontend security (ESLint security plugin, npm audit)
- Backend security (Bandit, pip-audit)
- SARIF upload to GitHub Code Scanning
- Security summary posted as PR comment

#### 11. 📊 Workflow Summary - `workflow-summary.yml`
Posts comprehensive workflow execution summary on PRs

---

## 🛠️ Common Tasks

### Run Tests Locally

```bash
# Run all tests
.\tools\test-runner.ps1 -All

# Run only changed files' tests (smart mode)
.\tools\test-runner.ps1 -Smart

# Run pre-commit checks
.\tools\test-runner.ps1 -PreCommit

# Run with coverage
.\tools\test-runner.ps1 -Coverage

# Frontend only
cd apps/frontend
npm test

# Backend only
cd apps/backend
pytest
```

### Setup Git Hooks

```bash
# Install pre-commit hooks (runs quality gates before commit)
.\tools\setup-precommit-hooks.ps1

# Uninstall hooks
.\tools\setup-precommit-hooks.ps1 -UninstallHooks

# Bypass hooks (emergency only)
git commit --no-verify
git push --no-verify
```

### View Workflow Logs

```bash
# GitHub CLI
gh run list
gh run view <run-id>
gh run view <run-id> --log

# Web UI
# Visit: https://github.com/ericsocrat/Lokifi/actions
```

### Debug Failing Workflows

1. **Check the workflow run logs** (GitHub Actions tab)
2. **Reproduce locally**:
   ```bash
   # Frontend issues
   cd apps/frontend
   npm run lint
   npm run type-check
   npm test

   # Backend issues
   cd apps/backend
   source venv/bin/activate  # Unix
   .\venv\Scripts\Activate.ps1  # Windows
   ruff check .
   mypy app/
   pytest
   ```
3. **Fix issues and push again** (workflows re-run automatically)

### Skip CI for Documentation Changes

```bash
# Add [skip ci] to commit message
git commit -m "docs: update README [skip ci]"
```

---

## 🐛 Troubleshooting

### Common Issues

#### "Workflow Security job failing"
**Cause**: actionlint found syntax errors in workflow files
**Fix**:
```bash
# Install actionlint
# https://github.com/rhysd/actionlint

# Check all workflows
actionlint .github/workflows/*.yml

# Fix reported errors
```

#### "Frontend Fast Checks failing"
**Cause**: ESLint, TypeScript, or Vitest errors
**Fix**:
```bash
cd apps/frontend

# Auto-fix ESLint issues
npm run lint -- --fix

# Check TypeScript errors
npm run type-check

# Run tests
npm test
```

#### "Backend Fast Checks failing"
**Cause**: Ruff, mypy, or pytest errors
**Fix**:
```bash
cd apps/backend
source venv/bin/activate

# Auto-fix ruff issues
ruff check . --fix

# Check type errors
mypy app/

# Run tests
pytest -v
```

#### "E2E tests failing"
**Cause**: Playwright test failures
**Fix**:
```bash
cd apps/frontend

# Run E2E tests locally
npx playwright test

# Debug mode
npx playwright test --debug

# Update snapshots (if visual regression)
npx playwright test --update-snapshots
```

#### "Coverage dropped below threshold"
**Cause**: New code added without tests
**Fix**:
```bash
# Run coverage report
npm run test:coverage

# Add tests for uncovered files
# See: docs/guides/COVERAGE_BASELINE.md
```

### Getting Help

1. **Check workflow logs** for specific error messages
2. **Search existing issues** on GitHub
3. **Ask in team chat** or create issue
4. **Review documentation**:
   - [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) (if created)
   - [WORKFLOW_AUDIT_REPORT.md](./WORKFLOW_AUDIT_REPORT.md)
   - [ROLLBACK_PROCEDURES.md](./ROLLBACK_PROCEDURES.md)

---

## 📚 Related Documentation

- **[README.md](./README.md)** - Documentation index
- **[OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md)** - Performance improvements
- **[WORKFLOW_PERFORMANCE.md](./WORKFLOW_PERFORMANCE.md)** - Performance analysis (if created)
- **[ROLLBACK_PROCEDURES.md](./ROLLBACK_PROCEDURES.md)** - Emergency rollback guide
- **[DEPENDENCY_MANAGEMENT.md](./DEPENDENCY_MANAGEMENT.md)** - Dependency update strategy

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Run all tests | `.\tools\test-runner.ps1 -All` |
| Run smart tests | `.\tools\test-runner.ps1 -Smart` |
| Pre-commit checks | `.\tools\test-runner.ps1 -PreCommit` |
| Frontend tests | `cd apps/frontend && npm test` |
| Backend tests | `cd apps/backend && pytest` |
| View workflows | https://github.com/ericsocrat/Lokifi/actions |
| Setup hooks | `.\tools\setup-precommit-hooks.ps1` |
| Skip CI | Add `[skip ci]` to commit message |

---

**Questions?** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or create an issue.
