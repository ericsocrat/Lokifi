# Test Generation Automation Guide

**Last Updated**: October 12, 2025
**Phase**: 5 - Test Coverage Boost

---

## Overview

The **`generate-tests`** command automates the creation of test file boilerplate for untested Python modules. This dramatically reduces the initial barrier to achieving better test coverage by creating structured test files with:

- ✅ Pytest-compatible structure
- ✅ Fixtures for common scenarios
- ✅ Unit, integration, and edge case test classes
- ✅ TODO markers for manual completion
- ✅ Mock/AsyncMock imports
- ✅ Performance test placeholders

---

## Quick Start

```powershell
# Preview what would be generated (recommended first step)
.\tools\lokifi.ps1 generate-tests -DryRun

# Generate test files for all untested modules
.\tools\lokifi.ps1 generate-tests

# Generate for specific directory
.\tools\lokifi.ps1 generate-tests -Component "app/services"

# Force overwrite existing test files
.\tools\lokifi.ps1 generate-tests -Force

# Include coverage analysis first
.\tools\lokifi.ps1 generate-tests -Coverage
```

---

## What It Does

### 1. **Scans for Untested Modules**
- Searches `app/` directory for Python files
- Excludes `__init__.py`, test files, and `__pycache__`
- Compares against existing test files in `tests/`
- Reports gap analysis

### 2. **Categorizes Test Types**
Based on module location, generates tests in appropriate directory:

| Module Location | Test Directory | Test Type |
|-----------------|----------------|-----------|
| `app/services/` | `tests/services/` | Service integration tests |
| `app/routers/` | `tests/api/` | API endpoint tests |
| `app/models/` | `tests/unit/` | Model unit tests |
| Other | `tests/unit/` | Generic unit tests |

### 3. **Generates Comprehensive Boilerplate**
Each test file includes:

#### **Fixtures Section**
```python
@pytest.fixture
def sample_data():
    """Sample data for testing"""
    return {}

@pytest.fixture
async def mock_db_session():
    """Mock database session"""
    session = AsyncMock()
    return session
```

#### **Unit Tests Class**
```python
class TestModuleName:
    """Test suite for module_name"""

    def test_module_imports(self):
        """Test that module imports successfully"""
        assert True

    @pytest.mark.asyncio
    async def test_basic_functionality(self, sample_data):
        """Test basic functionality"""
        # TODO: Add basic functionality test
        pass
```

#### **Integration Tests Class**
```python
class TestModuleNameIntegration:
    """Integration tests"""

    @pytest.mark.asyncio
    async def test_integration_scenario(self, mock_db_session):
        """Test integration with dependencies"""
        # TODO: Add integration test
        pass
```

#### **Edge Cases Class**
```python
class TestModuleNameEdgeCases:
    """Edge case and error handling tests"""

    def test_null_input_handling(self):
        """Test handling of null/None inputs"""
        # TODO: Test null handling
        pass

    def test_invalid_input_handling(self):
        """Test handling of invalid inputs"""
        # TODO: Test invalid input handling
        pass
```

#### **Performance Tests Class** (Optional)
```python
@pytest.mark.slow
class TestModuleNamePerformance:
    """Performance and load tests"""

    @pytest.mark.skip(reason="Performance test - run manually")
    def test_performance_under_load(self):
        """Test performance under load"""
        # TODO: Add performance test
        pass
```

---

## Command Options

| Option | Description | Example |
|--------|-------------|---------|
| `-DryRun` | Preview without creating files | `generate-tests -DryRun` |
| `-Force` | Overwrite existing test files | `generate-tests -Force` |
| `-Coverage` | Run coverage analysis first | `generate-tests -Coverage` |
| `-Component <path>` | Target specific directory | `generate-tests -Component "app/services"` |

---

## Example Output

```
🚀 Lokifi Ultimate Manager - 🧪 Python Test Generator
══════════════════════════════════════════════════════════

2 🔍 Scanning for untested modules...
   Found 157 total modules
   Found 148 modules without tests

3 🔧 Generating test files...
   ✅ Created: test_crypto_data_service.py
   ✅ Created: test_smart_price_service.py
   ✅ Created: test_unified_asset_service.py
   ...
   ⏭️  Skipped: test_auth.py (already exists)

═══════════════════════════════════════════════════════════
📊 GENERATION SUMMARY
═══════════════════════════════════════════════════════════

✅ Generated: 145 test files
⏭️  Skipped: 3 test files

📝 Next Steps:
   1. Review generated test files
   2. Replace TODO markers with actual test cases
   3. Add domain-specific test data
   4. Run tests: python -m pytest tests/ -v
   5. Check coverage: python -m pytest --cov=app --cov-report=html
```

---

## Typical Workflow

### 1️⃣ **Initial Analysis** (Dry Run)
```powershell
# See what would be generated
.\tools\lokifi.ps1 generate-tests -DryRun

# Output shows 148 potential test files
```

### 2️⃣ **Selective Generation**
```powershell
# Start with high-value modules (services)
.\tools\lokifi.ps1 generate-tests -Component "app/services"

# Then APIs
.\tools\lokifi.ps1 generate-tests -Component "app/routers"

# Finally models
.\tools\lokifi.ps1 generate-tests -Component "app/models"
```

### 3️⃣ **Fill in Test Logic**
Open generated files and:
- Replace `# TODO:` markers with actual test code
- Add domain-specific test data to fixtures
- Implement happy path scenarios
- Add edge cases and error handling
- Write integration tests

### 4️⃣ **Run & Iterate**
```powershell
# Run tests
python -m pytest tests/ -v

# Check coverage
python -m pytest --cov=app --cov-report=html

# Open coverage report
start htmlcov/index.html
```

### 5️⃣ **Commit Progress**
```powershell
git add tests/
git commit -m "test: add test boilerplate for 145 modules"
```

---

## AI-Assisted Test Completion

The generated TODO markers are perfect for AI assistance:

### **Example Prompts:**

```
"Complete the tests in test_crypto_data_service.py.
The service fetches cryptocurrency data from CoinGecko API."
```

```
"Add comprehensive tests for test_smart_price_service.py including:
- Happy path for price fetching
- Error handling for API failures
- Redis caching scenarios
- Rate limiting tests"
```

```
"Fill in the edge case tests for test_unified_asset_service.py.
The service aggregates data from multiple providers."
```

---

## Test Organization

### **Lokifi Test Structure**

```
tests/
├── api/               # Router/endpoint tests
│   ├── test_crypto.py
│   ├── test_portfolio.py
│   └── test_smart_prices.py
├── services/          # Service layer tests
│   ├── test_crypto_data_service.py
│   ├── test_smart_price_service.py
│   └── test_unified_asset_service.py
├── unit/              # Unit tests (models, utils)
│   ├── test_user.py
│   ├── test_portfolio.py
│   └── test_config.py
├── integration/       # Integration tests
│   └── test_phases_j0_j1.py
├── e2e/               # End-to-end tests
│   └── test_j6_e2e_notifications.py
└── conftest.py        # Shared fixtures
```

---

## Current Test Statistics

**Before `generate-tests`**:
- Total modules: 157
- With tests: 9 (5.7%)
- Without tests: 148 (94.3%)
- Test coverage: ~22%

**After generation** (with TODO completion):
- Potential test files: 157 (100%)
- Estimated coverage: 30-40% (with basic tests)
- Target coverage: 70% (industry standard)

---

## Integration with Existing Tests

The generator **will not overwrite** existing tests by default. Use `-Force` to override.

**Existing test files preserved**:
- `tests/unit/test_auth.py` ✅
- `tests/unit/test_follow.py` ✅
- `tests/services/test_ai_chatbot.py` ✅
- etc.

**New test files created**:
- `tests/services/test_crypto_data_service.py` 🆕
- `tests/services/test_smart_price_service.py` 🆕
- `tests/api/test_smart_prices.py` 🆕
- etc.

---

## Coverage Goals

| Phase | Target | Strategy |
|-------|--------|----------|
| **Current** | 22% | Manual tests only |
| **Phase 5.1** | 30% | Generate boilerplate + basic tests |
| **Phase 5.2** | 50% | Add integration tests |
| **Phase 5.3** | 70% | Comprehensive coverage (industry standard) |

---

## Best Practices

### ✅ DO:
- Always run `-DryRun` first to preview
- Generate for one directory at a time
- Review generated files before committing
- Use AI to help fill in TODO markers
- Add real test data to fixtures
- Write meaningful assertions
- Test both happy path and error cases

### ❌ DON'T:
- Generate and commit without review
- Skip the TODO markers (tests will be useless)
- Overwrite hand-written tests without backup
- Generate tests without understanding the module
- Commit failing tests
- Skip integration and edge case tests

---

## Manual Test Enhancement

After generation, enhance tests with:

### **1. Real Test Data**
```python
@pytest.fixture
def sample_crypto_data():
    return {
        "bitcoin": {
            "current_price": 50000.0,
            "market_cap": 1000000000,
            "24h_change": 2.5
        }
    }
```

### **2. Comprehensive Assertions**
```python
def test_fetch_price(self, sample_data):
    result = fetch_crypto_price("bitcoin")

    assert result is not None
    assert "current_price" in result
    assert result["current_price"] > 0
    assert isinstance(result["market_cap"], float)
```

### **3. Mock External Dependencies**
```python
@pytest.mark.asyncio
async def test_api_call_with_mock(self):
    with patch('app.services.crypto_data_service.httpx.AsyncClient') as mock:
        mock.return_value.get.return_value.json.return_value = {"price": 50000}

        service = CryptoDataService()
        result = await service.fetch_price("bitcoin")

        assert result["price"] == 50000
```

### **4. Error Scenarios**
```python
def test_invalid_symbol(self):
    with pytest.raises(ValueError):
        fetch_crypto_price("INVALID_SYMBOL_XYZ")

def test_api_timeout(self):
    with pytest.raises(TimeoutError):
        fetch_crypto_price("bitcoin", timeout=0.001)
```

---

## Troubleshooting

### Issue: "Module import failed"
**Cause**: Module has import errors or missing dependencies
**Solution**:
- Fix import errors in the module first
- Check if all dependencies are installed
- Verify PYTHONPATH is set correctly

### Issue: "Generated tests are empty"
**Cause**: This is expected - generated tests are templates
**Solution**: Fill in the TODO markers with actual test logic

### Issue: "Coverage didn't increase"
**Cause**: Tests are scaffolding only, need real assertions
**Solution**:
1. Add meaningful test data
2. Write actual assertions
3. Cover different code paths
4. Run coverage to identify gaps

### Issue: "Too many test files to review"
**Cause**: Generated 148 files at once
**Solution**: Generate selectively:
```powershell
# High priority first
.\tools\lokifi.ps1 generate-tests -Component "app/services"

# Then APIs
.\tools\lokifi.ps1 generate-tests -Component "app/routers"

# Fill in tests incrementally
```

---

## Related Commands

- `.\tools\lokifi.ps1 test` - Run test suite
- `.\tools\lokifi.ps1 test -Coverage` - Run with coverage
- `.\tools\lokifi.ps1 analyze` - Full codebase analysis
- `.\tools\lokifi.ps1 fix-quality` - Auto-fix code quality

---

## Automation Pipeline

```powershell
# 1. Generate test boilerplate
.\tools\lokifi.ps1 generate-tests -Component "app/services"

# 2. Use AI to fill in tests
# "Complete tests for app/services/*.py modules"

# 3. Run tests to verify
python -m pytest tests/services/ -v

# 4. Check coverage
python -m pytest --cov=app/services --cov-report=html

# 5. Fix any failing tests

# 6. Commit progress
git add tests/services/
git commit -m "test: add comprehensive service tests"
```

---

## Success Metrics

**Lokifi Project Results**:
- **Before**: 9 test files, 22% coverage
- **After generation**: 157 test files (100% modules covered)
- **With basic tests**: 30-40% coverage expected
- **Target**: 70% coverage with comprehensive tests
- **Time saved**: ~80 hours of boilerplate writing

---

## Phase 5 Roadmap

### ✅ **Phase 5.1** - Test Generation (Current)
- Generate boilerplate for all modules
- Basic import and structure tests
- Fixture scaffolding

### 📋 **Phase 5.2** - Test Enhancement
- Fill in service layer tests
- Add API endpoint tests
- Integration test scenarios

### 📋 **Phase 5.3** - Edge Cases
- Error handling tests
- Input validation tests
- Security tests

### 📋 **Phase 5.4** - Performance
- Load testing
- Stress testing
- Performance benchmarks

---

## Support

For issues or questions:
1. Check `.\tools\lokifi.ps1 help`
2. Review pytest documentation: https://docs.pytest.org/
3. See `docs/guides/PYTHON_QUALITY_AUTOMATION.md` for quality tools
4. Ask AI: "Help me write tests for [module_name]"
