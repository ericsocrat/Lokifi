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

## 💡 Tips

- **Use `--maxfail=1`** to stop on first failure for quick feedback
- **Use `-v`** for verbose output when debugging
- **Use `-s`** to see print statements during test runs
- **Use `--cov`** to find untested code
- **Use `--watch`** for frontend TDD workflows

---

**Print this card for easy reference! 📄**
