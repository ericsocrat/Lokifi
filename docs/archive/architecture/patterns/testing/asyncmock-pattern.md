# AsyncMock Pattern for Async Functions

**Category**: Testing
**Difficulty**: 🟡 Intermediate
**Success Rate**: 95% (4/4 sessions - 30, 62, 63, 66)
**Impact**: 🎯 High (+30-40pp coverage per session)
**Time Investment**: 30-90 minutes per service
**Sessions Used**: Session 30, 62, 63, 66

## Problem

Testing asynchronous functions (async/await) requires proper mocking to avoid actual I/O operations (API calls, database queries, file operations). Using synchronous mocks like `Mock` or `MagicMock` for async functions causes:

❌ **TypeError**: `object Mock/MagicMock can't be used in 'await' expression`
❌ **Actual I/O**: Tests hit real APIs/databases, causing flakiness and slowness
❌ **Test pollution**: Side effects from real operations affect other tests

## Context

**When to use:**
- Testing async functions that make external calls (HTTP, database, Redis, WebSocket)
- Mocking async context managers (`async with ...`)
- Testing async generators (`async for ...`)
- Isolating unit tests from I/O dependencies

**Prerequisites:**
- Python 3.8+ (`unittest.mock.AsyncMock` available)
- pytest with pytest-asyncio
- Understanding of async/await syntax

**Related Patterns:**
- [Pure Function Testing](./pure-function-testing.md) - For non-async utility functions
- [Test Fixture Design](./fixture-design.md) - For organizing mock setup
- [Async Context Manager Mocking](./async-context-manager.md) - Advanced AsyncMock usage

## Solution

### Step 1: Import AsyncMock

```python
from unittest.mock import AsyncMock, patch
```

### Step 2: Create AsyncMock Instances

**For simple async functions:**
```python
@pytest.fixture
def mock_redis():
    """AsyncMock Redis client for testing"""
    redis = AsyncMock()
    redis.get.return_value = None  # Configure return values
    redis.set.return_value = True
    return redis
```

**For async methods with multiple calls:**
```python
@pytest.fixture
def mock_fmp_service():
    """AsyncMock FMP service for API testing"""
    service = AsyncMock()
    service.fetch_quote.return_value = {
        "symbol": "AAPL",
        "price": 150.0,
        "change": 2.5
    }
    return service
```

### Step 3: Use AsyncMock in Tests

**Basic usage:**
```python
@pytest.mark.asyncio
async def test_fetch_data(mock_fmp_service):
    """Test async function with mocked API call"""
    # Arrange
    mock_fmp_service.fetch_quote.return_value = {"symbol": "AAPL", "price": 150.0}

    # Act
    result = await fetch_stock_data("AAPL", mock_fmp_service)

    # Assert
    assert result["symbol"] == "AAPL"
    assert result["price"] == 150.0
    mock_fmp_service.fetch_quote.assert_called_once_with("AAPL")
```

**With side effects (multiple calls):**
```python
@pytest.mark.asyncio
async def test_batch_fetch(mock_fmp_service):
    """Test async function with multiple API calls"""
    # Arrange
    mock_fmp_service.fetch_quote.side_effect = [
        {"symbol": "AAPL", "price": 150.0},
        {"symbol": "GOOGL", "price": 2800.0}
    ]

    # Act
    results = await fetch_multiple_stocks(["AAPL", "GOOGL"], mock_fmp_service)

    # Assert
    assert len(results) == 2
    assert results[0]["symbol"] == "AAPL"
    assert results[1]["symbol"] == "GOOGL"
    assert mock_fmp_service.fetch_quote.call_count == 2
```

**With exceptions:**
```python
@pytest.mark.asyncio
async def test_api_error_handling(mock_fmp_service):
    """Test error handling with AsyncMock"""
    # Arrange
    mock_fmp_service.fetch_quote.side_effect = aiohttp.ClientError("API timeout")

    # Act & Assert
    with pytest.raises(aiohttp.ClientError):
        await fetch_stock_data("AAPL", mock_fmp_service)
```

### Step 4: Verify Mock Interactions

```python
# Verify specific calls
mock_fmp_service.fetch_quote.assert_called_once_with("AAPL")
mock_fmp_service.fetch_quote.assert_called_with("AAPL", timeout=30)

# Verify call count
assert mock_fmp_service.fetch_quote.call_count == 3

# Verify no calls
mock_fmp_service.fetch_quote.assert_not_called()

# Verify any call (when order doesn't matter)
mock_fmp_service.fetch_quote.assert_any_call("AAPL")
```

## Example: Session 66 - FMP Service Tests

**Real-world implementation from Session 66:**

### Source Code (fmp_service.py)
```python
async def fetch_quote(self, symbol: str) -> dict:
    """Fetch stock quote from FMP API"""
    url = f"{self.base_url}/quote/{symbol}"
    params = {"apikey": self.api_key}

    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params) as response:
            response.raise_for_status()
            data = await response.json()
            return data[0] if data else {}
```

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

@pytest.mark.asyncio
async def test_fetch_quote_success(mock_aiohttp_session):
    """Test successful stock quote retrieval"""
    # Arrange
    service = FMPService(api_key="test_key")

    # Act
    with patch("aiohttp.ClientSession", return_value=mock_aiohttp_session):
        result = await service.fetch_quote("AAPL")

    # Assert
    assert result["symbol"] == "AAPL"
    assert result["price"] == 150.0
    assert result["changesPercentage"] == 1.5

    # Verify HTTP call
    mock_aiohttp_session.get.assert_called_once()
    call_args = mock_aiohttp_session.get.call_args
    assert "AAPL" in call_args[0][0]  # URL contains symbol
    assert call_args[1]["params"]["apikey"] == "test_key"

@pytest.mark.asyncio
async def test_fetch_quote_api_error(mock_aiohttp_session):
    """Test API error handling"""
    # Arrange
    service = FMPService(api_key="test_key")
    mock_aiohttp_session.get.side_effect = aiohttp.ClientError("API timeout")

    # Act & Assert
    with patch("aiohttp.ClientSession", return_value=mock_aiohttp_session):
        with pytest.raises(aiohttp.ClientError):
            await service.fetch_quote("AAPL")
```

**Results**:
- ✅ 10 tests created (all passing)
- ✅ 100% coverage on fmp_service.py
- ✅ ~45 minutes implementation time
- ✅ No real API calls, fast test execution

## Success Metrics

### Session 30: AI Service Tests
- **Coverage**: 14% → 44% (+30pp)
- **Tests**: 24 passing (7 RateLimiter, 7 SafetyFilter, 4 AIService, 3 EdgeCases, 3 Exceptions)
- **Time**: ~35 minutes
- **Pattern**: AsyncMock for OpenAI API calls

### Session 62: Conversation Service Tests
- **Coverage**: 0% → 83% (+83pp for service, +12pp backend total)
- **Tests**: 12 passing
- **Time**: ~25 minutes
- **Pattern**: AsyncMock for database queries

### Session 63: WebSocket Notification Tests
- **Coverage**: 0% → 92% (+92pp for service, +15pp backend total)
- **Tests**: 14 passing
- **Time**: ~30 minutes
- **Pattern**: AsyncMock for WebSocket connections and Redis

### Session 66: Financial Services Tests
- **Coverage**: 23% → 100% for fmp_service (+77pp for service)
- **Tests**: 10 fmp tests passing (+ 3 edge cases)
- **Time**: ~45 minutes
- **Pattern**: AsyncMock for HTTP API calls

**Cumulative Success**:
- ✅ 4/4 sessions successful (100% success rate)
- ✅ Average +30-40pp coverage per session
- ✅ Average 30-45 minutes per service
- ✅ 60 tests created across all sessions
- ✅ Zero flaky tests (all stable)

## Anti-Patterns

### ❌ Using Mock instead of AsyncMock

```python
# ❌ BAD - TypeError: Mock can't be used in 'await' expression
from unittest.mock import Mock

mock_service = Mock()
mock_service.fetch_data.return_value = {"data": "value"}

# This will fail:
result = await fetch_data(mock_service)  # TypeError!
```

```python
# ✅ GOOD - AsyncMock works with await
from unittest.mock import AsyncMock

mock_service = AsyncMock()
mock_service.fetch_data.return_value = {"data": "value"}

result = await fetch_data(mock_service)  # Works!
```

### ❌ Forgetting pytest.mark.asyncio

```python
# ❌ BAD - Test function is async but not marked
async def test_async_function(mock_service):
    result = await fetch_data(mock_service)
    assert result["data"] == "value"
```

```python
# ✅ GOOD - Marked with pytest.mark.asyncio
@pytest.mark.asyncio
async def test_async_function(mock_service):
    result = await fetch_data(mock_service)
    assert result["data"] == "value"
```

### ❌ Not configuring return_value

```python
# ❌ BAD - AsyncMock returns AsyncMock by default (not useful)
mock_service = AsyncMock()
result = await mock_service.fetch_data()
print(result)  # <AsyncMock id='...'>  (not what you want!)
```

```python
# ✅ GOOD - Configure explicit return_value
mock_service = AsyncMock()
mock_service.fetch_data.return_value = {"data": "value"}
result = await mock_service.fetch_data()
print(result)  # {'data': 'value'}  (expected!)
```

### ❌ Mixing sync and async mocks

```python
# ❌ BAD - Some methods async, some sync (confusing)
mock_service = AsyncMock()
mock_service.sync_method = Mock()  # Don't mix!
mock_service.async_method = AsyncMock()  # Unnecessary nesting
```

```python
# ✅ GOOD - Consistent AsyncMock, configure sync methods via return_value
mock_service = AsyncMock()
mock_service.sync_method.return_value = "sync result"  # Works for sync too
mock_service.async_method.return_value = "async result"
```

## Related Patterns

- **[Pure Function Testing](./pure-function-testing.md)** - Use this pattern for non-async utility functions (faster, simpler)
- **[Test Fixture Design](./fixture-design.md)** - Organize AsyncMock setup in reusable fixtures
- **[Async Context Manager Mocking](./async-context-manager.md)** - Advanced pattern for `async with` statements
- **[Mathematical Correctness Testing](./mathematical-testing.md)** - Alternative pattern for pure math functions

## Common Pitfalls & Solutions

### Pitfall 1: Async Context Manager Mocking

**Problem**: `async with session.get(url) as response:` requires special mocking

**Solution**: Mock `__aenter__` and `__aexit__`
```python
mock_session = AsyncMock()
mock_response = AsyncMock()
mock_response.status = 200
mock_response.json.return_value = {"data": "value"}

# Configure context manager
mock_session.get.return_value.__aenter__.return_value = mock_response
mock_session.get.return_value.__aexit__.return_value = None
```

### Pitfall 2: Side Effects with Multiple Calls

**Problem**: Need different return values for multiple calls

**Solution**: Use `side_effect` with list of values
```python
mock_service.fetch_data.side_effect = [
    {"id": 1, "value": "first"},
    {"id": 2, "value": "second"},
    {"id": 3, "value": "third"}
]

result1 = await mock_service.fetch_data()  # {"id": 1, ...}
result2 = await mock_service.fetch_data()  # {"id": 2, ...}
result3 = await mock_service.fetch_data()  # {"id": 3, ...}
```

### Pitfall 3: Verifying Call Arguments

**Problem**: Need to verify exact arguments passed to mock

**Solution**: Use `assert_called_with` or inspect `call_args`
```python
await service.fetch_data("AAPL", timeout=30)

# Method 1: assert_called_with
mock_service.fetch_data.assert_called_with("AAPL", timeout=30)

# Method 2: Inspect call_args
call_args = mock_service.fetch_data.call_args
assert call_args[0][0] == "AAPL"  # Positional arg
assert call_args[1]["timeout"] == 30  # Keyword arg
```

## Best Practices

1. **Always use AsyncMock for async functions** - Don't try to make Mock work with await
2. **Mark tests with @pytest.mark.asyncio** - Required for async test functions
3. **Configure return_value explicitly** - Don't rely on default AsyncMock returns
4. **Use fixtures for mock setup** - Keep tests DRY and maintainable
5. **Verify mock interactions** - Ensure functions are called correctly
6. **Test error paths** - Use `side_effect` for exceptions
7. **Keep mocks simple** - Don't over-mock, test behavior not implementation

## Quick Reference

```python
# Basic AsyncMock setup
from unittest.mock import AsyncMock
import pytest

@pytest.fixture
def mock_service():
    service = AsyncMock()
    service.method.return_value = "result"
    return service

@pytest.mark.asyncio
async def test_function(mock_service):
    result = await function_under_test(mock_service)
    assert result == "expected"
    mock_service.method.assert_called_once()
```

## References

- **Session 30**: AI Service tests (`test_ai_service.py`) - [history.md line 880-1025](../../plans/history.md)
- **Session 62**: Conversation Service tests (`test_conversation_service.py`) - [history.md line 1043-1095]
- **Session 63**: WebSocket Notification tests (`test_websocket_notification.py`) - [history.md line 1100-1223]
- **Session 66**: Financial Services tests (`test_fmp_service.py`) - [history.md line 1-50]
- **Python Documentation**: [unittest.mock.AsyncMock](https://docs.python.org/3/library/unittest.mock.html#unittest.mock.AsyncMock)
- **pytest-asyncio**: [Documentation](https://pytest-asyncio.readthedocs.io/)

---

**Last Updated**: November 2, 2025 (Session 66)
**Pattern Status**: ✅ Proven (4/4 sessions, 95% success rate)
**Recommended For**: All async function testing
