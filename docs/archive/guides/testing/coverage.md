# Test Coverage Baseline

> **Last Updated**: January 5, 2026
> **Previous Baseline**: October 23, 2025
> **Master Config**: `config/coverage.config.json`

This document establishes the test coverage baseline for the Lokifi project. Coverage metrics help track code quality and identify areas needing additional tests.

## 📊 Overall Coverage Summary (January 2026)

| Component | Lines | Branches | Functions | Statements | Tests |
|-----------|-------|----------|-----------|------------|-------|
| **Frontend** | 11.61% | 88.7% | 84.69% | 11.61% | 4,588 |
| **Backend** | 51.09% | N/A | N/A | 51.09% | 1,780 |
| **Overall** | 31.35% | - | - | 31.35% | **6,368** |

## 🎯 Coverage Thresholds

**Configuration Philosophy**: Realistic baselines that reflect current state while preventing regression.

### Current Thresholds (Aligned Across All Tools)

| Component | Lines | Branches | Functions | Statements | Status |
|-----------|-------|----------|-----------|------------|--------|
| **Frontend** | 10% | 80% | 80% | 10% | ✅ Passing (11.61%) |
| **Backend** | 20% | 70% | 70% | 20% | ✅ Passing (51.09%) |
| **Overall** | 20% | 75% | 75% | 20% | ✅ Passing (31.35%) |

### Threshold Alignment

**All tools aligned**:
- ✅ **Backend**: pytest.ini (`--cov-fail-under=20`) = coverage.config.json (20%) = current (51.09% ✅)
- ✅ **Frontend**: vitest.config.ts (lines: 10) = coverage.config.json (10%) = current (11.61% ✅)
- ✅ **Overall**: All metrics aligned at 20% (current 31.35% ✅)

### Configuration Files

1. **`config/coverage.config.json`** (Master Config):
   - Backend: lines 20% (threshold)
   - Frontend: lines 10% (threshold)
   - Overall: lines 20% (threshold)

2. **`apps/backend/pytest.ini`**:
   - `--cov-fail-under=20`

3. **`apps/frontend/vitest.config.ts`**:
   - Re-enabled thresholds (were commented out)
   - Set lines: 10%, statements: 10%
   - Kept branches: 80%, functions: 80% (quality for new code)

### Improvement Roadmap

**Short-term (1-2 weeks)**:
- Frontend: 11.61% → 30% (+18.39% lines)
- Backend: 51.09% → 60% (+8.91% lines) ⚡ Nearly achieved!
- Overall: 31.35% → 45% (+13.65% lines)

**Medium-term (1 month)**:
- Frontend: 30% → 50% (+20% lines)
- Backend: 60% → 70% (+10% lines)
- Overall: 45% → 60% (+15% lines)

**Long-term (3 months)**:
- Frontend: 50% → 70% (+20% lines)
- Backend: 70% → 80% (+10% lines)
- Overall: 60% → 75% (+15% lines)

## 🎯 Frontend Coverage (Apps/Frontend)

**Test Framework**: Vitest 3.2.4 with @vitest/coverage-v8
**Total Tests**: 4,588 passing, 66 skipped
**Test Files**: 96+ files
**Execution Time**: ~135 seconds

### Detailed Metrics

```
Lines:      N/A / N/A covered (11.61%)
Branches:   88.7% (excellent)
Functions:  84.69% (excellent)
Statements: 11.61%
```

### Coverage Highlights

**✅ Well-Covered Areas**:
- Branch coverage at 88.7% indicates excellent conditional logic testing
- Function coverage at 84.69% shows most functions are exercised
- Component tests are comprehensive with good happy path coverage

**⚠️ Areas Needing Improvement**:
- Overall line coverage at 11.61% is low
- Statement coverage needs expansion
- 102 HIGH priority coverage gaps identified
- Edge cases and error paths need more tests

### Test Distribution

```
Component Tests:      31 files (MarketStats, QuickStats, DataStatus, etc.)
API Tests:            5 files (auth, chat, apiFetch contracts)
Hook Tests:           1 file (useMarketData)
Store Tests:          8 files (Zustand stores)
Utility Tests:        24 files (utils, migrations, alignment, etc.)
Library Tests:        12 files (charts, data adapters)
Configuration Tests:  6 files (project-config, vscode-settings)
Security Tests:       4 files (XSS, CSRF, auth, validation)
Structure Tests:      2 files (markets, docs)
Coverage Dashboard:   6 files (sorting, pagination, etc.)
```

### Coverage Dashboard

Interactive coverage dashboard available at:
- **HTML Report**: `apps/frontend/coverage-dashboard/index.html`
- **Data File**: `apps/frontend/coverage-dashboard/data.json`
- **Serve Command**: `npx serve coverage-dashboard`

## 🐍 Backend Coverage (Apps/Backend)

**Test Framework**: Pytest with pytest-cov
**Total Tests**: 789 collected (after duplicate fix)
**Test Structure**: Fixed duplicate test file naming
**Execution Time**: ~5 seconds (collection)

### Detailed Metrics

```
Statements: 27% coverage
Total Statements: ~15,000 (estimated)
Covered Statements: ~4,000
```

### Test Distribution

```
API Tests:       tests/api/ (alerts, chat, crypto, fmp, etc.)
Unit Tests:      tests/unit/ (now with _unit suffix)
Service Tests:   tests/services/ (now with _service suffix)
Integration:     tests/integration/ (if present)
```

### Recent Fixes

**✅ Duplicate Test File Resolution**:
- Renamed 9 duplicate test files to resolve pytest collection errors
- Added `_unit` suffix to tests/unit/ files (7 files)
- Added `_service` suffix to tests/services/ files (2 files)
- Now successfully collecting 761 tests without conflicts

## 📈 Coverage Goals

### Short-term Goals (1-2 weeks)
- [ ] Frontend line coverage: 11.61% → 30%
- [ ] Backend statement coverage: 26.65% → 40%
- [ ] Document high-priority uncovered code paths
- [ ] Add tests for critical business logic

### Medium-term Goals (1 month)
- [ ] Frontend line coverage: 30% → 50%
- [ ] Backend statement coverage: 40% → 60%
- [ ] Achieve 90%+ branch coverage (frontend already at 88.7%)
- [ ] Add E2E tests with Playwright

### Long-term Goals (3 months)
- [ ] Frontend line coverage: 50% → 70%
- [ ] Backend statement coverage: 60% → 80%
- [ ] Maintain 90%+ branch and function coverage
- [ ] Automate coverage tracking in CI/CD

## 🔍 Coverage Improvement Strategy

### 1. Prioritize High-Value Tests

Focus on:
- **Business Logic**: Core trading, portfolio, alerts functionality
- **API Endpoints**: Authentication, data fetching, WebSocket connections
- **Error Handling**: Edge cases, network failures, validation errors
- **Security-Critical Paths**: Auth, data validation, input sanitization

### 2. Test Quality Over Quantity

Write tests that:
- Test **behavior**, not implementation
- Cover **edge cases** and error scenarios
- Are **maintainable** and self-documenting
- Run **quickly** (unit tests < 1s, integration < 5s)

### 3. Smart Test Selection

Use tools to run only relevant tests:
```bash
# Frontend - run only changed files' tests
.\tools\test-runner.ps1 -Smart

# Frontend - run full suite before commit
.\tools\test-runner.ps1 -PreCommit

# Backend - run specific test file
pytest tests/api/test_auth.py -v
```

## 🤖 Fully Automatic Coverage Updates

**Status**: ✅ Fully Automated - Zero Manual Work Required

Lokifi uses a **fully automatic coverage tracking system** integrated into CI/CD. This document and all coverage metrics are automatically updated after every test run.

### How Automation Works

1. **Tests Run** → CI/CD executes frontend and backend tests
2. **Coverage Extracted** → Metrics automatically pulled from coverage reports:
   - Frontend: `apps/frontend/coverage-dashboard/data.json`
   - Backend: `apps/backend/coverage.json`
3. **Config Updated** → `coverage.config.json` updated with latest metrics
4. **Docs Synced** → This file and 5+ other docs automatically synchronized
5. **Auto-Committed** → Changes committed with `[skip ci]` tag to prevent loops

**Result**: Coverage metrics are always current across all files with zero manual intervention!

### What Gets Updated Automatically

Every time tests run in CI/CD (push to main/develop, PR merge), these files are updated:
- ✅ `coverage.config.json` - Master configuration
- ✅ `docs/guides/COVERAGE_BASELINE.md` - This file
- ✅ `.github/workflows/lokifi-unified-pipeline.yml` - CI/CD thresholds
- ✅ `.github/copilot-instructions.md` - AI context
- ✅ `README.md` - Coverage badges and stats
- ✅ `docs/ci-cd/README.md` - CI/CD documentation

### CI/CD Integration

- **Workflow**: `.github/workflows/lokifi-unified-pipeline.yml`
- **Job**: `auto-update-coverage` (runs after frontend-test + backend-test)
- **Triggers**: Push to main/develop, PR merges, test file changes
- **Frequency**: Every test run
- **Manual Override**: Rarely needed - run `npm run coverage:sync` for offline work

### Learn More

- **Master Config**: [config/coverage.config.json](../../../config/coverage.config.json) - Single source of truth
- **Automation**: Coverage tracking fully integrated in CI/CD workflows

> 💡 **Developer Note**: You don't need to update coverage metrics manually. The system handles everything automatically!

## 📋 Coverage Tracking

### How to Generate Coverage Reports (Local Development)

#### Frontend
```bash
cd apps/frontend
npm run test:coverage

# View HTML report
npx serve coverage-dashboard

# Check specific metrics
cat coverage-dashboard/data.json
```

#### Backend
```bash
cd apps/backend
pytest --cov=app --cov-report=html --cov-report=term

# View HTML report
cd apps/backend/htmlcov && python -m http.server 8080
```

### Local Verification (Rarely Needed)

```bash
# Verify coverage is in sync
npm run coverage:verify

# Manual sync if working offline
npm run coverage:sync

# Preview sync changes without applying
npm run coverage:sync:dryrun
```

## 🎨 Coverage Visualization

### Frontend Coverage Dashboard

The frontend includes a sophisticated coverage dashboard that shows:
- **Overall Coverage**: Lines, branches, functions, statements
- **File-level Details**: Individual file coverage with color coding
- **Trends**: Historical coverage changes over time
- **Gap Analysis**: High/medium/low priority coverage gaps
- **Velocity Tracking**: Coverage improvement rate

**Access**: Open `apps/frontend/coverage-dashboard/index.html` in a browser

### Backend Coverage HTML Report

Standard pytest-cov HTML report showing:
- Line-by-line coverage highlighting
- Branch coverage details
- Missing line indicators
- Coverage percentage per file

**Generate**: `pytest --cov=app --cov-report=html`

## 🚦 Coverage Quality Gates

### Pre-Merge Requirements

Before merging PRs:
- [ ] No decrease in overall coverage percentage
- [ ] New code has >80% coverage
- [ ] Critical paths have >90% coverage
- [ ] All tests passing (no skipped critical tests)

### Coverage Thresholds

Set in configuration files:
- **Frontend**: `vitest.config.ts` (coverage.thresholds)
- **Backend**: `pytest.ini` or `.coveragerc`

Example thresholds:
```javascript
// vitest.config.ts
coverage: {
  lines: 30,      // Minimum 30% line coverage
  branches: 80,   // Minimum 80% branch coverage
  functions: 80,  // Minimum 80% function coverage
  statements: 30  // Minimum 30% statement coverage
}
```

## 📊 Historical Context

### Previous Coverage (Before Optimization)
- Backend: **26.65%** (established Oct 22, 2025)
- Frontend: **Not tracked** (baseline established Oct 23, 2025)

### Optimization Impact
- Fixed frontend test setup issues
- Resolved backend duplicate test file conflicts
- Established comprehensive coverage tracking
- Created interactive coverage dashboard

## 🔗 Related Documentation

- [Testing Guide](./TESTING_GUIDE.md) - Complete testing strategies
- [Integration Tests Guide](./INTEGRATION_TESTS_GUIDE.md) - Integration testing
- [Code Quality](./CODE_QUALITY.md) - Quality standards and automation
- [Developer Workflow](./workflow.md) - Development best practices

## 📝 Notes

### Known Issues
- Frontend line coverage appears low due to large codebase (~38,895 lines)
- Branch and function coverage are excellent (88.7% and 84.69%)
- Backend has one import error in `test_follow_notifications_unit.py` (missing module)

### Recommendations
1. **Focus on line coverage improvement** - Add tests for uncovered code paths
2. **Maintain high branch coverage** - Continue testing conditional logic thoroughly
3. **Document test gaps** - Use coverage dashboard to identify priority areas
4. **Automate coverage tracking** - Integrate with CI/CD for trend monitoring

---

**Last Updated**: October 26, 2025 (Coverage thresholds aligned across all tools)
**Next Review**: November 23, 2025 (1 month)
