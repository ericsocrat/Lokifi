# Issue #8: BaseSchema.parametrize() Parameter Error

**Date:** October 15, 2025
**Branch:** feature/api-contract-testing
**PR:** #23 (API Contract Testing)

## Problem

```yaml
TypeError: BaseSchema.parametrize() got an unexpected keyword argument 'method'
```yaml

**Location:** `apps/backend/tests/test_api_contracts.py` line 71

## Root Cause

The `schemathesis` library's `BaseSchema.parametrize()` decorator does **not accept** keyword arguments like:
- `method="GET"` ❌
- `endpoint="/health"` ❌

These parameters were used incorrectly:
```python
@schema.parametrize(method="GET")  # ❌ WRONG
def test_get_endpoints_are_idempotent(case):
    ...

@schema.parametrize(endpoint="/health")  # ❌ WRONG
def test_health_endpoint_responds_quickly(case):
    ...
```python

## Solution

**Use runtime filtering inside test functions** instead of decorator parameters:

### Before (❌ WRONG):
```python
@schema.parametrize(method="GET")
@settings(...)
def test_get_endpoints_are_idempotent(case):
    response1 = case.call_asgi()
    response2 = case.call_asgi()
    ...
```python

### After (✅ CORRECT):
```python
@schema.parametrize()
@settings(...)
def test_get_endpoints_are_idempotent(case):
    # Filter by method at runtime
    if case.method != "GET":
        pytest.skip("This test only applies to GET endpoints")

    response1 = case.call_asgi()
    response2 = case.call_asgi()
    ...
```python

### Second Fix - Health Endpoint Test:

**Before (❌):**
```python
@schema.parametrize(endpoint="/health")
```python

**After (✅):**
```python
@schema.parametrize()
def test_health_endpoint_responds_quickly(case):
    # Filter by path at runtime
    if "/health" not in case.path:
        pytest.skip("This test only applies to /health endpoint")

    response = case.call_asgi()
    ...
```python

## Changes Made

**File:** `apps/backend/tests/test_api_contracts.py`

1. **Line 71:** Removed `method="GET"` parameter
   - Added runtime check: `if case.method != "GET": pytest.skip(...)`

2. **Line 103:** Removed `endpoint="/health"` parameter
   - Added runtime check: `if "/health" not in case.path: pytest.skip(...)`

## Schemathesis API Reference

The correct usage of `parametrize()` is:

```python
@schema.parametrize()  # No parameters
def test_api(case):
    # Access case properties:
    # - case.method (GET, POST, etc.)
    # - case.path (endpoint path)
    # - case.operation (OpenAPI operation)
    # - case.operation.security (auth requirements)
    response = case.call_asgi()
    case.validate_response(response)
```python

**Available filtering approaches:**
1. **Runtime filtering** (used in this fix): Check properties inside test
2. **Schema filtering**: Create filtered schemas before parametrization
3. **Hypothesis strategies**: Use custom strategies for data generation

## Commit

**Commit Hash:** `74f8201a`
**Message:** `fix: remove unsupported parameters from schema.parametrize()`

**Changes:**
- Removed `method='GET'` from `test_get_endpoints_are_idempotent`
- Removed `endpoint='/health'` from `test_health_endpoint_responds_quickly`
- Added `pytest.skip()` inside tests to filter by `case.method` and `case.path`
- Uses runtime filtering instead of decorator parameters

## Testing

The fix allows tests to:
- ✅ Discover all endpoints from OpenAPI schema
- ✅ Filter specific endpoints/methods at runtime
- ✅ Skip non-matching test cases gracefully
- ✅ Maintain property-based testing benefits

## References

- **Schemathesis Documentation:** https://schemathesis.readthedocs.io/en/stable/
- **Schemathesis Parametrize API:** https://schemathesis.readthedocs.io/en/stable/api/parametrization.html
- **Related Issue:** Part of Phase 1.6 Task 2: API Contract Testing

## Status

✅ **FIXED** - Committed and pushed to `feature/api-contract-testing`
⏳ **CI/CD** - Awaiting pipeline results

---

**Previous Issues Fixed:**
1. ✅ faker version compatibility
2. ✅ PYTHONPATH configuration
3. ✅ ai.py syntax errors
4. ✅ JWT secret configuration
5. ✅ OpenAPI spec.paths AttributeError
6. ✅ schemathesis.openapi.from_asgi usage
7. ✅ schemathesis API (from_asgi location)
8. ✅ parametrize() parameters (this issue)

**Next:** Wait for CI/CD to pass, then merge PR #23 and PR #24 ✨