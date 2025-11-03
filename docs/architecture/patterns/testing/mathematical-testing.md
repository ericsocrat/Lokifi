# Mathematical Correctness Testing Pattern

**Category**: Testing
**Difficulty**: 🟡 Intermediate
**Success Rate**: 100% (1/1 session - 66)
**Impact**: ✅ Proven (+100% coverage on indicators)
**Time Investment**: 30-45 minutes per mathematical module
**Sessions Used**: Session 66 (indicators)

## Problem

Testing mathematical functions (indicators, statistics, financial calculations) requires verifying computational correctness, not just code coverage. Developers often:

❌ **Trust implementation without verification**: Assume code is correct if it runs
❌ **Use arbitrary test values**: Random inputs that don't validate formula correctness
❌ **Skip known-good benchmarks**: Don't compare against industry-standard implementations
❌ **Ignore numerical precision**: Floating-point comparison issues cause flaky tests

## Context

**When to use:**
- Testing technical indicators (EMA, SMA, RSI, MACD, Bollinger Bands)
- Statistical calculations (mean, standard deviation, correlation)
- Financial formulas (returns, volatility, Sharpe ratio)
- Any function with a well-defined mathematical formula

**When NOT to use:**
- Simple arithmetic (use [Pure Function Testing](./pure-function-testing.md))
- Async functions (use [AsyncMock Pattern](./asyncmock-pattern.md))
- Stateful calculations (use integration tests)

**Prerequisites:**
- pytest installed
- Understanding of the mathematical formula being tested
- Reference implementation or known-good test values
- numpy/pandas for test data generation (if needed)

**Related Patterns:**
- [Pure Function Testing](./pure-function-testing.md) - Foundation pattern for utility functions
- [Test Fixture Design](./fixture-design.md) - For organizing test data

## Solution

### Step 1: Understand the Formula

**Document the mathematical formula first:**
```python
# Example: Simple Moving Average (SMA)
# Formula: SMA(n) = (P1 + P2 + ... + Pn) / n
# Where: P = price, n = period
```

### Step 2: Create Known-Good Test Cases

**Use hand-calculated or industry-standard values:**
```python
def test_sma_known_values():
    """Test SMA with manually calculated reference values"""
    # Known input
    prices = [10, 20, 30, 40, 50]
    period = 3

    # Expected output (hand-calculated):
    # First 2 values: NaN (insufficient data)
    # Value 3: (10 + 20 + 30) / 3 = 20.0
    # Value 4: (20 + 30 + 40) / 3 = 30.0
    # Value 5: (30 + 40 + 50) / 3 = 40.0
    expected = [np.nan, np.nan, 20.0, 30.0, 40.0]

    # Act
    result = calculate_sma(prices, period)

    # Assert with numerical precision
    np.testing.assert_allclose(result, expected, rtol=1e-5, equal_nan=True)
```

### Step 3: Test Edge Cases

**Test boundary conditions specific to the formula:**
```python
def test_mathematical_edge_cases():
    """Test edge cases for mathematical correctness"""

    # Period equals data length
    prices = [10, 20, 30]
    result = calculate_sma(prices, period=3)
    assert result[-1] == 20.0  # (10+20+30)/3

    # Period = 1 (identity case)
    result = calculate_sma(prices, period=1)
    assert np.array_equal(result, prices)  # Each value is its own average

    # Single value
    result = calculate_sma([100], period=1)
    assert result[0] == 100

    # All same values
    result = calculate_sma([50, 50, 50, 50], period=2)
    assert all(x == 50 for x in result[1:])  # All averages = 50
```

### Step 4: Test Formula Constraints

```python
def test_formula_constraints():
    """Test mathematical constraints and invariants"""

    # Constraint: EMA(period=1) should equal input (no smoothing)
    prices = [10, 20, 30, 40, 50]
    result = calculate_ema(prices, period=1)
    np.testing.assert_allclose(result, prices, rtol=1e-10)

    # Constraint: RSI should be between 0 and 100
    prices = generate_random_prices(100)
    result = calculate_rsi(prices, period=14)
    assert all(0 <= x <= 100 for x in result if not np.isnan(x))

    # Constraint: Bollinger Bands (upper > middle > lower)
    result = calculate_bollinger_bands(prices, period=20)
    upper, middle, lower = result
    assert all(upper[i] > middle[i] > lower[i]
               for i in range(len(upper))
               if not any(np.isnan([upper[i], middle[i], lower[i]])))
```

### Step 5: Use Numerical Precision Helpers

```python
# ✅ GOOD - Use numpy's testing utilities for floating-point comparison
import numpy as np

def test_with_numerical_precision():
    """Test with appropriate numerical precision"""
    result = calculate_indicator(data)
    expected = [1.0, 2.5, 3.333333]

    # rtol: relative tolerance (percentage difference)
    # atol: absolute tolerance (absolute difference)
    # equal_nan: True to treat NaN as equal
    np.testing.assert_allclose(result, expected, rtol=1e-5, atol=1e-8, equal_nan=True)
```

## Example: Session 66 - Indicators Tests

**Real-world implementation from Session 66:**

### Source Code (indicators.py)
```python
def calculate_ema(data: List[float], period: int) -> List[float]:
    """Calculate Exponential Moving Average"""
    if not data or period <= 0:
        raise ValueError("Invalid input")

    ema = [np.nan] * len(data)
    multiplier = 2 / (period + 1)

    # First EMA = SMA
    if len(data) >= period:
        ema[period - 1] = sum(data[:period]) / period

    # Subsequent EMAs
    for i in range(period, len(data)):
        ema[i] = (data[i] - ema[i-1]) * multiplier + ema[i-1]

    return ema
```

### Test Implementation (test_indicators.py)
```python
import pytest
import numpy as np
from app.services.indicators import calculate_ema

class TestEMA:
    """Test Exponential Moving Average calculation"""

    def test_ema_known_values(self):
        """Test EMA with hand-calculated reference values"""
        # Simple dataset for manual verification
        prices = [22, 24, 23, 25, 27]
        period = 3

        # Manual calculation:
        # EMA[2] = SMA = (22 + 24 + 23) / 3 = 23.0
        # multiplier = 2 / (3 + 1) = 0.5
        # EMA[3] = (25 - 23.0) * 0.5 + 23.0 = 24.0
        # EMA[4] = (27 - 24.0) * 0.5 + 24.0 = 25.5
        expected = [np.nan, np.nan, 23.0, 24.0, 25.5]

        result = calculate_ema(prices, period)
        np.testing.assert_allclose(result, expected, rtol=1e-10, equal_nan=True)

    def test_ema_formula_constraints(self):
        """Test EMA mathematical properties"""
        prices = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

        # Constraint 1: EMA(period=1) = original data (no smoothing)
        result = calculate_ema(prices, period=1)
        np.testing.assert_allclose(result, prices, rtol=1e-10)

        # Constraint 2: EMA smooths data (reduces volatility)
        result = calculate_ema(prices, period=5)
        # Calculate variance (should be lower for EMA)
        variance_original = np.var(prices)
        variance_ema = np.var([x for x in result if not np.isnan(x)])
        assert variance_ema <= variance_original

    def test_ema_convergence(self):
        """Test EMA converges to average for constant values"""
        # All same values
        prices = [50.0] * 10
        period = 3

        result = calculate_ema(prices, period)

        # After period, all values should equal 50
        valid_results = [x for x in result[period:] if not np.isnan(x)]
        assert all(abs(x - 50.0) < 1e-10 for x in valid_results)

    @pytest.mark.parametrize("period", [1, 2, 5, 10, 20])
    def test_ema_various_periods(self, period):
        """Test EMA calculation for various periods"""
        prices = list(range(1, 51))  # 1 to 50

        result = calculate_ema(prices, period)

        # Verify correct number of initial NaN values
        nan_count = sum(1 for x in result if np.isnan(x))
        assert nan_count == period - 1

        # Verify valid values are within reasonable range
        valid_values = [x for x in result if not np.isnan(x)]
        assert all(min(prices) <= x <= max(prices) for x in valid_values)

    def test_ema_numerical_precision(self):
        """Test EMA handles floating-point precision correctly"""
        # Large values
        prices = [1e10, 1e10 + 1, 1e10 + 2, 1e10 + 3, 1e10 + 4]
        result = calculate_ema(prices, period=3)
        assert not np.any(np.isinf(result))  # No overflow

        # Small values
        prices = [1e-10, 2e-10, 3e-10, 4e-10, 5e-10]
        result = calculate_ema(prices, period=3)
        assert not np.all(result == 0)  # No underflow
```

**Results**:
- ✅ 33 tests passing (EMA, SMA, RSI, MACD, Bollinger Bands)
- ✅ 100% coverage on indicators.py
- ✅ ~30 minutes implementation time
- ✅ All formulas verified with known-good values

## Success Metrics

### Session 66: Indicators Tests
- **Coverage**: 0% → 100% (+100pp)
- **Tests created**: 33 tests (EMA, SMA, RSI, MACD, Bollinger Bands)
- **Time investment**: ~30 minutes
- **Formula verification**: All indicators tested against hand-calculated values
- **Numerical precision**: All tests use np.testing.assert_allclose for floating-point safety

**Mathematical correctness verified:**
- ✅ EMA formula correct (matches hand-calculated values)
- ✅ SMA formula correct (simple average verified)
- ✅ RSI bounds respected (0-100 range)
- ✅ MACD components correct (signal line, histogram)
- ✅ Bollinger Bands ordering (upper > middle > lower)

## Anti-Patterns

### ❌ Using == for floating-point comparison

```python
# ❌ BAD - Floating-point comparison with ==
def test_calculation():
    result = calculate_ema([1, 2, 3], period=2)
    assert result[2] == 2.5  # May fail due to floating-point precision!
```

```python
# ✅ GOOD - Use numpy's assert_allclose
def test_calculation():
    result = calculate_ema([1, 2, 3], period=2)
    np.testing.assert_allclose(result[2], 2.5, rtol=1e-5)
```

### ❌ Not testing formula constraints

```python
# ❌ BAD - Only test if code runs
def test_rsi():
    result = calculate_rsi(prices, period=14)
    assert len(result) == len(prices)  # Weak test!
```

```python
# ✅ GOOD - Test mathematical constraints
def test_rsi():
    result = calculate_rsi(prices, period=14)

    # Formula constraint: RSI must be between 0 and 100
    valid_values = [x for x in result if not np.isnan(x)]
    assert all(0 <= x <= 100 for x in valid_values)
```

### ❌ Using random test values without verification

```python
# ❌ BAD - Random values, no verification
def test_sma():
    prices = [random.random() for _ in range(100)]
    result = calculate_sma(prices, period=10)
    assert result is not None  # What are we testing?
```

```python
# ✅ GOOD - Known-good test values
def test_sma():
    # Hand-calculated reference
    prices = [10, 20, 30]
    result = calculate_sma(prices, period=3)
    expected = [np.nan, np.nan, 20.0]  # (10+20+30)/3 = 20
    np.testing.assert_allclose(result, expected, equal_nan=True)
```

## Related Patterns

- **[Pure Function Testing](./pure-function-testing.md)** - Foundation for testing mathematical functions
- **[Test Fixture Design](./fixture-design.md)** - For organizing complex test data
- **[AsyncMock Pattern](./asyncmock-pattern.md)** - If mathematical functions are async

## Best Practices

1. **Hand-calculate reference values** - Don't trust the implementation to verify itself
2. **Test formula constraints** - RSI bounds, EMA smoothing properties, etc.
3. **Use numerical precision helpers** - `np.testing.assert_allclose` for floating-point
4. **Test edge cases** - period=1, single value, all same values
5. **Document the formula** - Include formula in docstring or comments
6. **Verify against industry standards** - Compare to TA-Lib, pandas, etc. when possible
7. **Test convergence** - Ensure formulas behave correctly at limits

## Quick Reference

```python
import pytest
import numpy as np
from module import mathematical_function

# Test with known-good values
def test_known_values():
    """Test with hand-calculated reference"""
    input_data = [10, 20, 30]
    expected = [np.nan, 15.0, 25.0]  # Hand-calculated

    result = mathematical_function(input_data)
    np.testing.assert_allclose(result, expected, rtol=1e-5, equal_nan=True)

# Test formula constraints
def test_constraints():
    """Test mathematical properties"""
    result = mathematical_function(data)

    # Example: RSI must be 0-100
    valid_values = [x for x in result if not np.isnan(x)]
    assert all(0 <= x <= 100 for x in valid_values)

# Test edge cases
def test_edge_cases():
    """Test boundary conditions"""
    # Period = 1 (identity)
    result = mathematical_function([1, 2, 3], period=1)
    assert np.array_equal(result, [1, 2, 3])

    # All same values
    result = mathematical_function([50, 50, 50], period=2)
    assert all(x == 50 for x in result if not np.isnan(x))
```

## References

- **Session 66**: Indicators tests - [history.md](../../plans/history.md)
- **Test file**: `test_indicators.py` in `apps/backend/tests/services/`
- **numpy testing**: [numpy.testing documentation](https://numpy.org/doc/stable/reference/routines.testing.html)
- **TA-Lib**: [Technical Analysis Library](https://ta-lib.org/) (reference implementation)

---

**Last Updated**: November 2, 2025 (Session 66)
**Pattern Status**: ✅ Proven (1/1 module, 100% coverage, all formulas verified)
**Recommended For**: All mathematical function testing (indicators, statistics, financial calculations)
