# Lokifi Test System - Quick Reference Card

## 🚀 Quick Commands

### Backend Tests (pytest)
```bash
cd apps/backend
pytest tests/                              # All tests
pytest tests/api/                          # API tests only
pytest tests/unit/                         # Unit tests only
pytest tests/integration/                  # Integration tests
pytest tests/security/                     # Security tests
pytest tests/ --cov                        # With coverage
pytest tests/api/test_auth_endpoints.py    # Specific file
pytest -v                                  # Verbose output
```

### Frontend Tests (Vitest)
```bash
cd apps/frontend
npm test                                   # All tests
npm test -- tests/components/              # Component tests
npm test -- tests/unit/                    # Unit tests
npm test -- tests/e2e/                     # E2E tests
npm run test:coverage                      # With coverage
npm test -- PriceChart.test.tsx            # Specific file
npm test -- --ui                           # Vitest UI
```

## 📂 Test Categories

| Category | Location | Backend Command | Frontend Command |
|----------|----------|-----------------|------------------|
| **All** | `apps/*/tests/` | `pytest tests/` | `npm test` |
| **API** | `backend/tests/api/` | `pytest tests/api/` | N/A |
| **Unit** | `*/tests/unit/` | `pytest tests/unit/` | `npm test -- tests/unit/` |
| **Integration** | `*/tests/integration/` | `pytest tests/integration/` | `npm test -- tests/integration/` |
| **E2E** | `*/tests/e2e/` | `pytest tests/e2e/` | `npm test -- tests/e2e/` |
| **Security** | `*/tests/security/` | `pytest tests/security/` | `npm test -- tests/security/` |
| **Services** | `backend/tests/services/` | `pytest tests/services/` | N/A |
| **Components** | `frontend/tests/components/` | N/A | `npm test -- tests/components/` |

## 🎯 Common Workflows

### During Development
```bash
# Backend - run affected tests
cd apps/backend
pytest tests/unit/test_auth.py -v

# Frontend - watch mode
cd apps/frontend
npm test -- --watch
```

### Before Committing
```bash
# Backend - quick validation
cd apps/backend
pytest tests/unit/ tests/api/ --maxfail=1

# Frontend - pre-commit check
cd apps/frontend
npm test -- --run
```

### Debugging Specific Test
```bash
# Backend - verbose with print statements
cd apps/backend
pytest tests/api/test_auth_endpoints.py -v -s

# Frontend - specific test pattern
cd apps/frontend
npm test -- --grep="authentication"
```

### Generating Coverage
```bash
# Backend - generate and view coverage
cd apps/backend
pytest --cov=app --cov-report=html
# Open apps/backend/htmlcov/index.html in browser

# Frontend - generate coverage
cd apps/frontend
npm run test:coverage
# Open apps/frontend/coverage/index.html in browser
```

### Frontend Watch Mode
```bash
# Auto-run tests on file changes
cd apps/frontend
npm test -- --watch
```


## 🎯 Common Workflows

### During Development
```bash
# Backend - run affected tests
cd apps/backend
pytest tests/unit/test_auth.py -v

# Frontend - watch mode
cd apps/frontend
npm test -- --watch
```

### Before Committing
```bash
# Backend - quick validation
cd apps/backend
pytest tests/unit/ tests/api/ --maxfail=1

# Frontend - pre-commit check
cd apps/frontend
npm test -- --run
```

### Debugging Specific Test
```bash
# Backend - verbose with print statements
cd apps/backend
pytest tests/api/test_auth_endpoints.py -v -s

# Frontend - specific test pattern
cd apps/frontend
npm test -- --grep="authentication"
```
.\lokifi.ps1 test -TestMatch "authentication" -TestVerbose
```powershell

### Generating Coverage
```powershell
# Generate and view coverage report
.\lokifi.ps1 test -TestCoverage
Start-Process "apps/backend/htmlcov/index.html"
```powershell

### Frontend Watch Mode
```powershell
# Auto-run tests on file changes
.\lokifi.ps1 test -Component frontend -Watch
```powershell

### CI/CD Pipeline
```powershell
# Full quality gate validation
.\lokifi.ps1 test -TestGate
```powershell

## 🔧 All Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `-Component` | String | `all`, `backend`, `frontend`, `api`, `unit`, `integration`, `e2e`, `security`, `services` |
| `-TestFile` | String | Specific test file (e.g., `test_auth.py`) |
| `-TestMatch` | String | Pattern to match test names |
| `-TestSmart` | Switch | Smart test selection (git-based) |
| `-Quick` | Switch | Fast tests only (<10s per test) |
| `-TestCoverage` | Switch | Generate coverage reports |
| `-TestPreCommit` | Switch | Essential pre-commit tests |
| `-TestGate` | Switch | Full quality gate validation |
| `-TestVerbose` | Switch | Detailed output |
| `-Watch` | Switch | Watch mode (frontend only) |

## 📊 Coverage Context

The test command shows coverage before running:

```bash
📈 Test Coverage Context:
  Current Coverage: ~20.5%
  Test Files: 48
  Test Lines: 12,456
  Production Code: 60,234 lines
  Industry Target: 70% coverage

💡 To reach 70% coverage:
  Need ~29,708 more lines of tests
  That's ~595 test files (avg 50 lines each)
```bash

## 🎯 Smart Test Selection

Smart mode maps changed files to tests:

```python
app/api/routes/auth.py → test_auth_endpoints.py, test_auth.py
app/services/user.py   → test_user.py
src/components/User.tsx → User.test.tsx
```python

## 📁 Test Result Artifacts

Results saved to `test-results/`:

```powershell
test-results/
├── backend-results.xml      # JUnit XML (CI)
├── backend-coverage.json    # Coverage data
└── frontend-results.xml     # Frontend results
```powershell

## ⏱️ Performance Comparison

| Mode | Tests Run | Typical Time | Use Case |
|------|-----------|--------------|----------|
| **All** | 48 tests | 2-3 min | Pre-release, weekly |
| **Smart** | 3-8 tests | 15-30 sec | During development |
| **Quick** | ~20 tests | 30-45 sec | Rapid feedback |
| **PreCommit** | ~15 tests | 20-30 sec | Before commit |
| **Category** | 6-15 tests | 30-60 sec | Focused testing |

## 🛠️ Troubleshooting

### Tests Not Found
```bash
# Backend - check test locations
cd apps/backend
find tests/ -name "test_*.py"

# Frontend - check test files
cd apps/frontend
find tests/ -name "*.test.ts*"
```

### Virtual Environment Issues (Backend)
```bash
cd apps/backend
rm -rf venv
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Frontend Issues
```bash
cd apps/frontend
rm -rf node_modules
npm install
npm test
```

### Get Verbose Output
```bash
# Backend - verbose with print statements
cd apps/backend
pytest tests/api/test_auth_endpoints.py -v -s

# Frontend - verbose mode
cd apps/frontend
npm test -- --reporter=verbose
```

## 📚 Additional Resources

- **Full Guide**: `docs/guides/TESTING_GUIDE.md`
- **Integration Tests**: `docs/guides/INTEGRATION_TESTS_GUIDE.md`
- **Backend Test README**: `apps/backend/tests/README.md`
- **Frontend Test README**: `apps/frontend/tests/README.md`

---

**Pro Tip**: Use `-v` for verbose output and `-s` to see print statements during debugging!
```powershell

## 📚 Documentation

- **Full Guide**: `docs/guides/ENHANCED_TEST_SYSTEM.md`
- **Testing Guide**: `docs/guides/TESTING_GUIDE.md`
- **Consolidation Plan**: `docs/TEST_CONSOLIDATION_ANALYSIS.md`
- **This Card**: `docs/TEST_QUICK_REFERENCE.md`

## 🎯 Best Practices

1. **Use Smart Mode During Development**
   ```powershell
   .\lokifi.ps1 test -TestSmart
   ```

2. **Run Pre-Commit Before Every Commit**
   ```powershell
   .\lokifi.ps1 test -TestPreCommit
   ```

3. **Generate Coverage Weekly**
   ```powershell
   .\lokifi.ps1 test -TestCoverage
   ```

4. **Use Specific Tests for Debugging**
   ```powershell
   .\lokifi.ps1 test -TestFile test_auth.py -TestVerbose
   ```

5. **Run Full Suite Before Releases**
   ```powershell
   .\lokifi.ps1 test -Component all -TestCoverage
   ```

## 🚀 Getting Started

Try your first smart test:

```powershell
# 1. Make a small change to any file
echo "# test" >> apps/backend/app/api/routes/health.py

# 2. Run smart tests
.\lokifi.ps1 test -TestSmart

# 3. See only affected tests run!
```powershell

## 💡 Tips

- **Use `-Quick`** when you need rapid feedback
- **Use `-TestSmart`** to save 60-90% of test time
- **Use `-TestVerbose`** when debugging failures
- **Use `-TestCoverage`** to find untested code
- **Use `-Watch`** for frontend TDD workflows

## 📞 Need Help?

```powershell
# See full lokifi help
.\lokifi.ps1 help

# Direct test runner help
.\tools\test-runner.ps1 -?
```powershell

---

**Print this card for easy reference! 📄**
