# Input Validation Pattern (API Parameters)

**Category**: Security
**Difficulty**: 🟢 Beginner
**Success Rate**: 100% (Session 123 - Partial-SSRF vulnerability → 0)
**Impact**: ✅ Proven (OWASP A03:2021 compliance, CWE-918 mitigated)
**Time Investment**: 5-10 minutes per endpoint
**Sessions Used**: Session 123 (CodeQL security hardening)

## Problem

Using user-provided path parameters directly in internal API calls creates Server-Side Request Forgery (SSRF) vulnerabilities (CWE-918):

❌ **Partial-SSRF**: Attacker controls part of the URL
❌ **URL manipulation**: Malicious inputs redirect internal requests
❌ **OWASP A03:2021**: Injection vulnerabilities
❌ **CodeQL HIGH alerts**: Unvalidated user data in URLs

**Real example** (Session 123):
```python
# ❌ BAD - Partial-SSRF vulnerability
@router.get("/coin/{coin_id}/details")
async def get_coin_details(coin_id: str):
    url = f"https://api.coingecko.com/api/v3/coins/{coin_id}"  # coin_id is user-controlled!
    response = await client.get(url)
    # If coin_id = "../../../admin" or "bitcoin?api_key=stolen"
    # Could access unintended endpoints or leak API keys
```

## Context

**When to use:**
- All path parameters used in external API calls
- Query parameters constructing URLs
- User IDs, resource IDs, slugs in internal requests
- Any user input used in URL construction

**When NOT to use:**
- Fully static URLs (no user input)
- URLs from trusted internal sources
- Already-validated inputs from database lookups

**Prerequisites:**
- Python `re` module for regex validation
- Understanding of SSRF attacks
- Knowledge of valid input formats

**Related Patterns:**
- [Secure Logging Pattern](./secure-logging-pattern.md) - Log validation failures securely
- [Error Handling Pattern](#) - Return proper error responses

## Solution

### Step 1: Define Validation Function with Regex

```python
import re
from fastapi import HTTPException

# Define allowed pattern - alphanumeric + hyphens only
VALID_COIN_ID_PATTERN = re.compile(r"^[a-z0-9-]+$")

def validate_coin_id(coin_id: str) -> str:
    """Validate coin_id to prevent SSRF attacks.
    
    Coin IDs should only contain lowercase alphanumeric characters and hyphens.
    Examples: bitcoin, ethereum, binance-smart-chain, wrapped-bitcoin
    
    Args:
        coin_id: The coin ID from the URL path parameter
        
    Returns:
        The validated coin_id (unchanged if valid)
        
    Raises:
        HTTPException: If coin_id contains invalid characters
    """
    if not VALID_COIN_ID_PATTERN.match(coin_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid coin ID format. Only lowercase letters, numbers, and hyphens allowed."
        )
    return coin_id
```

### Step 2: Apply Validation in Endpoint

```python
@router.get("/coin/{coin_id}/details")
async def get_coin_details(coin_id: str):
    """Get detailed information about a specific cryptocurrency."""
    # ✅ GOOD - Validate before using in URL
    coin_id = validate_coin_id(coin_id)
    
    url = f"https://api.coingecko.com/api/v3/coins/{coin_id}"
    # Now safe - coin_id can only be alphanumeric+hyphen
```

### Step 3: Reusable Pattern for Other Endpoints

```python
@router.get("/coin/{coin_id}/ohlc")
async def get_ohlc_data(
    coin_id: str,
    days: int = Query(default=7, ge=1, le=365)
):
    """Get OHLC candle data for charting."""
    coin_id = validate_coin_id(coin_id)  # Reuse same validation
    
    url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/ohlc"
```

## Implementation Checklist

### Pre-Implementation
- [ ] Identify all endpoints using user input in URLs
- [ ] Understand valid input format (alphanumeric, UUID, etc.)
- [ ] Choose appropriate regex pattern

### Implementation
- [ ] Create validation function with compiled regex (performance)
- [ ] Return proper HTTP 400 errors with clear messages
- [ ] Apply validation at endpoint entry point
- [ ] Log validation failures for security monitoring

### Post-Implementation
- [ ] Run CodeQL scan to verify fix
- [ ] Test with malicious inputs (path traversal, special chars)
- [ ] Add unit tests for validation function
- [ ] Document pattern for team

## Common Validation Patterns

### Alphanumeric with Hyphens (slugs, coin IDs)
```python
VALID_SLUG_PATTERN = re.compile(r"^[a-z0-9-]+$")
```

### UUID Format
```python
VALID_UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
)
```

### Alphanumeric Only (user IDs, codes)
```python
VALID_ALNUM_PATTERN = re.compile(r"^[a-zA-Z0-9]+$")
```

### Stock Symbols (uppercase letters, dots)
```python
VALID_SYMBOL_PATTERN = re.compile(r"^[A-Z]{1,5}(\.[A-Z]{1,2})?$")
```

### Safe Filename (no path traversal)
```python
VALID_FILENAME_PATTERN = re.compile(r"^[a-zA-Z0-9_.-]+$")
# Does NOT allow: / \ .. spaces
```

## Anti-Patterns to Avoid

### ❌ Blocklist Approach (Incomplete)
```python
# BAD - Easy to bypass, doesn't catch everything
if "../" in coin_id or ".." in coin_id:
    raise HTTPException(400, "Invalid")
# Bypass: coin_id = "....//admin"
```

### ❌ Validation After URL Construction
```python
# BAD - URL already constructed with malicious input
url = f"https://api.example.com/{coin_id}"
if not is_valid(coin_id):  # Too late!
    raise HTTPException(400, "Invalid")
```

### ❌ No Validation at All
```python
# BAD - Direct use of user input
@router.get("/resource/{id}")
async def get_resource(id: str):
    response = await client.get(f"{BASE_URL}/{id}")  # SSRF!
```

## Success Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| CodeQL Partial-SSRF alerts | 5 | 0 | 0 ✅ |
| Validation coverage | 0% | 100% | 100% ✅ |
| Attack surface | High | Minimal | Minimal ✅ |

## Real-World Example (Session 123)

**File**: `apps/backend/app/routers/crypto.py`

**Before** (vulnerable):
```python
@router.get("/coin/{coin_id}/details")
async def get_coin_details(coin_id: str):
    url = f"{COINGECKO_BASE_URL}/coins/{coin_id}"  # Unvalidated!
```

**After** (secure):
```python
import re

VALID_COIN_ID_PATTERN = re.compile(r"^[a-z0-9-]+$")

def validate_coin_id(coin_id: str) -> str:
    """Validate coin_id to prevent SSRF attacks."""
    if not VALID_COIN_ID_PATTERN.match(coin_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid coin ID format. Only lowercase letters, numbers, and hyphens allowed."
        )
    return coin_id

@router.get("/coin/{coin_id}/details")
async def get_coin_details(coin_id: str):
    coin_id = validate_coin_id(coin_id)  # ✅ Validated
    url = f"{COINGECKO_BASE_URL}/coins/{coin_id}"
```

## References

- **OWASP A03:2021**: https://owasp.org/Top10/A03_2021-Injection/
- **CWE-918**: Server-Side Request Forgery (SSRF) - https://cwe.mitre.org/data/definitions/918.html
- **CodeQL Documentation**: py/partial-ssrf query
- **Session 123**: CodeQL security hardening (Lokifi)
