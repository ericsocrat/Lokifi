# Pure Function Testing Pattern

**Category**: Testing
**Difficulty**: 🟢 Beginner
**Success Rate**: 100% (2/2 sessions - 66)
**Impact**: ✅ Proven (+100% coverage on utilities)
**Time Investment**: 15-30 minutes per utility module
**Sessions Used**: Session 66 (timeframes, indicators)

## Problem

Testing pure utility functions (no side effects, deterministic outputs) requires a different approach than async service testing. Developers often:

❌ **Over-complicate with mocks**: Using AsyncMock for functions that don't need it
❌ **Skip edge cases**: Only test happy path, miss boundary conditions
❌ **Lack comprehensive coverage**: Don't test all code branches
❌ **Slow test execution**: Unnecessary setup/teardown for simple functions

## Context

**When to use:**
- Testing utility functions (calculations, transformations, validations)
- Pure functions (same input → same output, no side effects)
- Mathematical computations (indicators, statistics, financial calculations)
- String/data formatting functions
- Functions with no external dependencies (no API calls, no database, no file I/O)

**When NOT to use:**
- Async functions (use [AsyncMock Pattern](./asyncmock-pattern.md))
- Functions with side effects (database writes, API calls)
- Stateful components (use integration tests)

**Prerequisites:**
- pytest installed
- Understanding of pure functions
- Test file structure established

**Related Patterns:**
- [AsyncMock Pattern](./asyncmock-pattern.md) - For async functions with side effects
- [Mathematical Correctness Testing](./mathematical-testing.md) - Specialized pattern for complex math
- [Test Fixture Design](./fixture-design.md) - For organizing test data

## Solution

### Step 1: Import Function Under Test

```python
import pytest
from app.services.timeframes import (
    convert_to_timeframe,
    aggregate_data,
    resample_ohlcv
)
```

### Step 2: Write Direct Test Cases

**No mocks needed - test the actual function:**
```python
def test_function_name():
    """Test description"""
    # Arrange
    input_data = {"key": "value"}

    # Act
    result = function_under_test(input_data)

    # Assert
    assert result == expected_output
```

### Step 3: Test Multiple Scenarios

**Use pytest.mark.parametrize for comprehensive coverage:**
```python
@pytest.mark.parametrize("input_value,expected", [
    ("1h", 3600),           # Happy path
    ("1d", 86400),          # Different unit
    ("5m", 300),            # Small value
    ("1w", 604800),         # Large value
])
def test_conversion(input_value, expected):
    """Test timeframe conversion for various inputs"""
    result = convert_timeframe(input_value)
    assert result == expected
```

### Step 4: Test Edge Cases

```python
def test_edge_cases():
    """Test boundary conditions and error handling"""
    # Empty input
    assert function([]) == []

    # None input
    assert function(None) is None

    # Single item
    assert function([1]) == [1]

    # Large dataset
    large_data = list(range(10000))
    result = function(large_data)
    assert len(result) == 10000
```

### Step 5: Test Error Conditions

```python
def test_error_handling():
    """Test invalid inputs raise appropriate errors"""
    with pytest.raises(ValueError, match="Invalid timeframe"):
        convert_timeframe("invalid")

    with pytest.raises(TypeError):
        convert_timeframe(None)
```

## Example: Session 66 - Timeframes Utility Tests

**Real-world implementation from Session 66:**

### Source Code (timeframes.py)
```python
def convert_to_seconds(timeframe: str) -> int:
    """Convert timeframe string (e.g., '1h', '5m') to seconds"""
    units = {
        's': 1,
        'm': 60,
        'h': 3600,
        'd': 86400,
        'w': 604800
    }

    if not timeframe or len(timeframe) < 2:
        raise ValueError(f"Invalid timeframe: {timeframe}")

    value = int(timeframe[:-1])
    unit = timeframe[-1]

    if unit not in units:
        raise ValueError(f"Unknown unit: {unit}")

    return value * units[unit]
```

### Test Implementation (test_timeframes.py)
```python
import pytest
from app.services.timeframes import convert_to_seconds

class TestTimeframeConversion:
    """Test timeframe string to seconds conversion"""

    @pytest.mark.parametrize("timeframe,expected_seconds", [
        # Minutes
        ("1m", 60),
        ("5m", 300),
        ("15m", 900),
        ("30m", 1800),

        # Hours
        ("1h", 3600),
        ("4h", 14400),
        ("12h", 43200),

        # Days
        ("1d", 86400),
        ("7d", 604800),

        # Weeks
        ("1w", 604800),
        ("4w", 2419200),
    ])
    def test_valid_timeframes(self, timeframe, expected_seconds):
        """Test conversion for all valid timeframe formats"""
        result = convert_to_seconds(timeframe)
        assert result == expected_seconds

    @pytest.mark.parametrize("invalid_timeframe", [
        "",            # Empty string
        "x",           # Too short
        "invalid",     # No number
        "10",          # No unit
        "10x",         # Invalid unit
        "1.5h",        # Float (not supported)
    ])
    def test_invalid_timeframes(self, invalid_timeframe):
        """Test error handling for invalid timeframe strings"""
        with pytest.raises(ValueError):
            convert_to_seconds(invalid_timeframe)

    def test_edge_cases(self):
        """Test boundary conditions"""
        # Minimum value
        assert convert_to_seconds("1s") == 1

        # Large value
        assert convert_to_seconds("1000h") == 3600000

        # Zero (edge case)
        assert convert_to_seconds("0s") == 0
```

**Results**:
- ✅ 28 tests passing (all timeframe functions)
- ✅ 100% coverage on timeframes.py
- ✅ ~20 minutes implementation time
- ✅ No mocks needed, fast execution

## Success Metrics

### Session 66: Timeframes & Indicators Tests
- **Timeframes coverage**: 0% → 100% (+100pp)
- **Indicators coverage**: 0% → 100% (+100pp)
- **Tests created**: 61 tests (28 timeframes + 33 indicators)
- **Time investment**: ~45 minutes total (both modules)
- **Execution speed**: <1 second (no I/O, pure computation)

**Why so fast?**
- No mocks to configure
- No async/await overhead
- Direct function calls
- Deterministic outputs

**Coverage breakdown**:
- Happy path: 15 tests
- Edge cases: 8 tests
- Error handling: 5 tests
- Total: 28 tests for timeframes module

## Anti-Patterns

### ❌ Over-mocking pure functions

```python
# ❌ BAD - Unnecessary mocking for pure function
from unittest.mock import Mock

def test_calculation():
    mock_calculator = Mock()
    mock_calculator.add.return_value = 5
    # Why mock a simple addition?
```

```python
# ✅ GOOD - Direct testing
def test_calculation():
    result = add(2, 3)
    assert result == 5
```

### ❌ Not testing edge cases

```python
# ❌ BAD - Only happy path
def test_conversion():
    assert convert("1h") == 3600  # What about errors?
```

```python
# ✅ GOOD - Comprehensive coverage
@pytest.mark.parametrize("input,expected", [
    ("1h", 3600),          # Happy path
    ("", ValueError),      # Empty input
    ("invalid", ValueError), # Invalid format
    ("0s", 0),             # Zero edge case
])
def test_conversion(input, expected):
    if isinstance(expected, type) and issubclass(expected, Exception):
        with pytest.raises(expected):
            convert(input)
    else:
        assert convert(input) == expected
```

### ❌ Skipping parametrize for repetitive tests

```python
# ❌ BAD - Repetitive test functions
def test_1h(): assert convert("1h") == 3600
def test_1d(): assert convert("1d") == 86400
def test_1w(): assert convert("1w") == 604800
# 20 more similar functions...
```

```python
# ✅ GOOD - DRY with parametrize
@pytest.mark.parametrize("input,expected", [
    ("1h", 3600),
    ("1d", 86400),
    ("1w", 604800),
    # Add more test cases easily
])
def test_conversion(input, expected):
    assert convert(input) == expected
```

## Related Patterns

- **[AsyncMock Pattern](./asyncmock-pattern.md)** - Use this for async functions, not pure functions
- **[Mathematical Correctness Testing](./mathematical-testing.md)** - Specialized for complex math (indicators, statistics)
- **[Test Fixture Design](./fixture-design.md)** - For organizing test data when tests get complex

## Best Practices

1. **Test directly** - No mocks needed for pure functions
2. **Use parametrize** - DRY approach for multiple test cases
3. **Cover edge cases** - Empty, None, zero, negative, large values
4. **Test error paths** - Invalid inputs should raise appropriate errors
5. **Keep tests fast** - Pure functions execute quickly, don't add unnecessary overhead
6. **Descriptive names** - Test names should describe what's being tested
7. **Group related tests** - Use test classes to organize related function tests

## Quick Reference

```python
import pytest
from module import pure_function

# Basic test
def test_pure_function():
    """Test description"""
    result = pure_function(input_data)
    assert result == expected

# Parametrized test (multiple scenarios)
@pytest.mark.parametrize("input,expected", [
    (value1, result1),
    (value2, result2),
    (value3, result3),
])
def test_multiple_scenarios(input, expected):
    assert pure_function(input) == expected

# Error handling
def test_error_handling():
    with pytest.raises(ValueError, match="error message"):
        pure_function(invalid_input)

# Edge cases
def test_edge_cases():
    assert pure_function([]) == []  # Empty
    assert pure_function(None) is None  # None
    assert pure_function([1]) == [1]  # Single item
```

## References

- **Session 66**: Timeframes & Indicators tests - [history.md](../../plans/history.md)
- **Test files**: `test_timeframes.py`, `test_indicators.py` in `apps/backend/tests/services/`
- **pytest parametrize**: [pytest documentation](https://docs.pytest.org/en/stable/how-to/parametrize.html)

---

**Last Updated**: November 2, 2025 (Session 66)
**Pattern Status**: ✅ Proven (2/2 modules, 100% coverage)
**Recommended For**: All pure utility function testing
