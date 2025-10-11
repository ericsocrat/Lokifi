# Lokifi Test System - Quick Reference Card

## 🚀 Quick Commands

| Command | Description |
|---------|-------------|
| `.\lokifi.ps1 test` | Run all tests with coverage context |
| `.\lokifi.ps1 test -TestSmart` | Smart selection (only affected tests) |
| `.\lokifi.ps1 test -Quick` | Fast tests only (<10s each) |
| `.\lokifi.ps1 test -TestPreCommit` | Pre-commit validation suite |
| `.\lokifi.ps1 test -TestGate` | Full quality gate validation |
| `.\lokifi.ps1 test -TestCoverage` | Generate coverage reports |

## 📂 Test Categories

| Category | Location | Command |
|----------|----------|---------|
| **All** | `tests/` | `.\lokifi.ps1 test` |
| **Backend** | `backend/tests/` | `.\lokifi.ps1 test -Component backend` |
| **Frontend** | `frontend/tests/` | `.\lokifi.ps1 test -Component frontend` |
| **API** | `backend/tests/api/` | `.\lokifi.ps1 test -Component api` |
| **Unit** | `backend/tests/unit/` | `.\lokifi.ps1 test -Component unit` |
| **Integration** | `backend/tests/integration/` | `.\lokifi.ps1 test -Component integration` |
| **E2E** | `backend/tests/e2e/` | `.\lokifi.ps1 test -Component e2e` |
| **Security** | `backend/tests/security/` | `.\lokifi.ps1 test -Component security` |
| **Services** | `backend/tests/services/` | `.\lokifi.ps1 test -Component services` |

## 🎯 Common Workflows

### During Development
```powershell
# Run only affected tests (60-90% faster)
.\lokifi.ps1 test -TestSmart
```

### Before Committing
```powershell
# Quick pre-commit validation (30s)
.\lokifi.ps1 test -TestPreCommit
```

### Debugging Specific Test
```powershell
# Run specific file with verbose output
.\lokifi.ps1 test -TestFile test_auth.py -TestVerbose
```

### Debugging by Pattern
```powershell
# Run all tests matching "authentication"
.\lokifi.ps1 test -TestMatch "authentication" -TestVerbose
```

### Generating Coverage
```powershell
# Generate and view coverage report
.\lokifi.ps1 test -TestCoverage
Start-Process "apps/backend/htmlcov/index.html"
```

### Frontend Watch Mode
```powershell
# Auto-run tests on file changes
.\lokifi.ps1 test -Component frontend -Watch
```

### CI/CD Pipeline
```powershell
# Full quality gate validation
.\lokifi.ps1 test -TestGate
```

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

## 🎯 Smart Test Selection

Smart mode maps changed files to tests:

```
app/api/routes/auth.py → test_auth_endpoints.py, test_auth.py
app/services/user.py   → test_user.py
src/components/User.tsx → User.test.tsx
```

## 📁 Test Result Artifacts

Results saved to `test-results/`:

```
test-results/
├── backend-results.xml      # JUnit XML (CI)
├── backend-coverage.json    # Coverage data
└── frontend-results.xml     # Frontend results
```

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
```powershell
# Check test locations
ls apps/backend/tests/ -Recurse -Filter "test_*.py"
```

### Virtual Environment Issues
```powershell
# Recreate venv
cd apps/backend
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Frontend Issues
```powershell
# Reinstall dependencies
cd apps/frontend
Remove-Item -Recurse -Force node_modules
npm install
```

### Get Verbose Output
```powershell
# See detailed test output
.\lokifi.ps1 test -TestVerbose
```

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
```

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
```

---

**Print this card for easy reference! 📄**
