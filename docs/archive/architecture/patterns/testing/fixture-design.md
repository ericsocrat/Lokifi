# Test Fixture Design Pattern

**Category**: Testing
**Difficulty**: 🟢 Beginner
**Success Rate**: 100% (6/6 sessions - 30, 62, 63, 66)
**Impact**: ✅ Proven (DRY tests, maintainable)
**Time Investment**: 10-20 minutes per fixture
**Sessions Used**: Sessions 30, 62, 63, 66

## Problem

Test code often contains repetitive setup logic, making tests hard to maintain and understand. Common issues:

❌ **Duplicate setup code**: Same mock configuration repeated in every test
❌ **Hard-to-maintain tests**: Changes require updating dozens of test functions
❌ **Poor readability**: Setup code obscures test intent
❌ **Inconsistent test data**: Each test creates slightly different mocks

## Context

**When to use:**
- Multiple tests need the same mock objects
- Complex setup logic that's shared across tests
- Common test data that's reused frequently
- When DRY principle applies to test code

**When NOT to use:**
- Single-use setup (inline it in the test)
- Very simple mocks (one-liner creation)
- Test-specific data that's not reusable

**Prerequisites:**
- pytest installed
- Understanding of pytest fixtures
- Test file structure established

**Related Patterns:**
- [AsyncMock Pattern](./asyncmock-pattern.md) - Fixtures often create AsyncMock instances
- [Pure Function Testing](./pure-function-testing.md) - Fixtures for test data organization

## Solution

### Step 1: Identify Common Setup

**Look for repeated code across tests:**
```python
# ❌ BAD - Repeated setup in every test
def test_function_1():
    redis = AsyncMock()
    redis.get.return_value = None
    # ... test code

def test_function_2():
    redis = AsyncMock()
    redis.get.return_value = None
    # ... test code
```

### Step 2: Create pytest Fixture

**Extract common setup into reusable fixture:**
```python
import pytest
from unittest.mock import AsyncMock

@pytest.fixture
def mock_redis():
    """AsyncMock Redis client for testing"""
    redis = AsyncMock()
    redis.get.return_value = None
    redis.set.return_value = True
    redis.delete.return_value = True
    return redis
```

### Step 3: Use Fixture in Tests

**Reference fixture by parameter name:**
```python
def test_function_1(mock_redis):
    """Test uses fixture automatically"""
    # mock_redis is injected by pytest
    result = my_function(mock_redis)
    assert result is not None
    mock_redis.get.assert_called_once()

def test_function_2(mock_redis):
    """Another test reuses same fixture"""
    result = another_function(mock_redis)
    mock_redis.set.assert_called()
```

### Step 4: Configure Fixtures Per-Test

**Override fixture behavior when needed:**
```python
def test_with_custom_behavior(mock_redis):
    """Customize fixture for specific test"""
    # Override default behavior
    mock_redis.get.return_value = {"key": "value"}

    result = my_function(mock_redis)
    assert result["key"] == "value"
```

### Step 5: Use Fixture Scope

**Control fixture lifecycle with scope:**
```python
@pytest.fixture(scope="function")  # Default: new instance per test
def mock_service():
    return AsyncMock()

@pytest.fixture(scope="module")  # One instance per module
def shared_config():
    return {"setting": "value"}

@pytest.fixture(scope="session")  # One instance per test session
def database_connection():
    # Expensive setup once
    return create_connection()
```

## Example: Session 66 - FMP Service Fixtures

**Real-world implementation from Session 66:**

### Test Implementation (test_fmp_service.py)
```python
import pytest
from unittest.mock import AsyncMock, patch
from app.services.fmp import FMPService

@pytest.fixture
def mock_aiohttp_session():
    """AsyncMock aiohttp session for HTTP testing"""
    session = AsyncMock()
    response = AsyncMock()
    response.status = 200
    response.json.return_value = [
        {
            "symbol": "AAPL",
            "price": 150.0,
            "changesPercentage": 1.5,
            "change": 2.25,
            "dayLow": 148.0,
            "dayHigh": 152.0,
            "yearHigh": 180.0,
            "yearLow": 120.0,
            "marketCap": 2500000000000,
            "priceAvg50": 145.0,
            "priceAvg200": 140.0,
            "volume": 50000000,
            "avgVolume": 45000000,
            "exchange": "NASDAQ",
            "open": 149.0,
            "previousClose": 147.75,
            "eps": 6.0,
            "pe": 25.0,
            "sharesOutstanding": 16000000000,
            "timestamp": 1699000000
        }
    ]
    session.get.return_value.__aenter__.return_value = response
    return session

@pytest.fixture
def fmp_service():
    """FMP service instance with test API key"""
    return FMPService(api_key="test_api_key_123")

# Use fixtures in tests
@pytest.mark.asyncio
async def test_fetch_quote_success(fmp_service, mock_aiohttp_session):
    """Test successful stock quote retrieval"""
    with patch("aiohttp.ClientSession", return_value=mock_aiohttp_session):
        result = await fmp_service.fetch_quote("AAPL")

    assert result["symbol"] == "AAPL"
    assert result["price"] == 150.0
    mock_aiohttp_session.get.assert_called_once()

@pytest.mark.asyncio
async def test_fetch_quote_api_error(fmp_service, mock_aiohttp_session):
    """Test API error handling"""
    # Override fixture behavior
    mock_aiohttp_session.get.side_effect = aiohttp.ClientError("API timeout")

    with patch("aiohttp.ClientSession", return_value=mock_aiohttp_session):
        with pytest.raises(aiohttp.ClientError):
            await fmp_service.fetch_quote("AAPL")
```

**Benefits**:
- ✅ DRY: Setup code written once, reused in 10 tests
- ✅ Maintainable: Change fixture once, all tests update
- ✅ Readable: Test intent clear without setup noise
- ✅ Consistent: All tests use same mock structure

## Success Metrics

### Sessions 30, 62, 63, 66: Fixture Usage
- **Session 30**: 5 fixtures (redis, websocket, openai)
- **Session 62**: 3 fixtures (db_session, user, conversation)
- **Session 63**: 4 fixtures (websocket, redis, notification)
- **Session 66**: 2 fixtures (aiohttp_session, fmp_service)

**Time savings**:
- Without fixtures: ~5 minutes setup per test
- With fixtures: ~30 seconds per test
- Session 66 example: 10 tests × 4.5 min saved = **45 minutes saved**

**Maintenance benefit**:
- Change once, update all tests
- Session 30: Changed redis mock signature → 1 fixture update vs 20 test updates

## Anti-Patterns

### ❌ Not using fixtures when setup is repeated

```python
# ❌ BAD - Repeated setup in every test (DRY violation)
def test_1():
    service = FMPService(api_key="test")
    # test code

def test_2():
    service = FMPService(api_key="test")
    # test code

def test_3():
    service = FMPService(api_key="test")
    # test code
```

```python
# ✅ GOOD - Fixture eliminates repetition
@pytest.fixture
def fmp_service():
    return FMPService(api_key="test")

def test_1(fmp_service):
    # test code

def test_2(fmp_service):
    # test code

def test_3(fmp_service):
    # test code
```

### ❌ Fixtures that are too complex

```python
# ❌ BAD - Fixture does too much
@pytest.fixture
def everything():
    redis = create_redis()
    db = create_db()
    user = create_user()
    auth = create_auth()
    service = create_service(redis, db, user, auth)
    # ... 50 more lines
    return service  # Which part do I need?
```

```python
# ✅ GOOD - Small, focused fixtures
@pytest.fixture
def mock_redis():
    return AsyncMock()

@pytest.fixture
def mock_db():
    return AsyncMock()

@pytest.fixture
def fmp_service(mock_redis, mock_db):
    # Compose fixtures as needed
    return FMPService(redis=mock_redis, db=mock_db)
```

### ❌ Not documenting fixture purpose

```python
# ❌ BAD - No docstring
@pytest.fixture
def service():
    return FMPService(api_key="test")
```

```python
# ✅ GOOD - Clear documentation
@pytest.fixture
def fmp_service():
    """FMP service instance with test API key.

    Returns FMPService configured for testing with:
    - Test API key (no real API calls)
    - Default timeout: 30 seconds
    """
    return FMPService(api_key="test_api_key")
```

## Related Patterns

- **[AsyncMock Pattern](./asyncmock-pattern.md)** - Fixtures often create AsyncMock instances
- **[Pure Function Testing](./pure-function-testing.md)** - Fixtures for test data organization

## Best Practices

1. **Name fixtures descriptively** - `mock_redis` not `redis_fixture`
2. **Keep fixtures focused** - One responsibility per fixture
3. **Document fixture purpose** - Docstring explaining what it provides
4. **Use fixture composition** - Fixtures can depend on other fixtures
5. **Choose appropriate scope** - `function` (default), `module`, or `session`
6. **Make fixtures reusable** - Can be used across multiple test files
7. **Override when needed** - Customize fixture behavior in specific tests

## Quick Reference

```python
import pytest
from unittest.mock import AsyncMock

# Basic fixture
@pytest.fixture
def mock_service():
    """Docstring explaining fixture"""
    return AsyncMock()

# Fixture with setup/teardown
@pytest.fixture
def resource():
    """Resource with cleanup"""
    res = create_resource()
    yield res  # Test runs here
    res.cleanup()  # Cleanup after test

# Fixture composition
@pytest.fixture
def mock_redis():
    return AsyncMock()

@pytest.fixture
def service(mock_redis):
    """Service depends on mock_redis fixture"""
    return MyService(redis=mock_redis)

# Use in tests
def test_function(service, mock_redis):
    """Both fixtures injected automatically"""
    result = service.do_something()
    mock_redis.get.assert_called()
```

## References

- **Sessions 30, 62, 63, 66**: Fixture examples - [history.md](../../plans/history.md)
- **Test files**: All `test_*.py` files in `apps/backend/tests/services/`
- **pytest fixtures**: [pytest documentation](https://docs.pytest.org/en/stable/fixture.html)

---

**Last Updated**: November 2, 2025 (Session 66)
**Pattern Status**: ✅ Proven (6/6 sessions, consistent time savings)
**Recommended For**: All test suites with repeated setup logic
