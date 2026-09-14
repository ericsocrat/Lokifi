# Secure Logging Pattern

**Category**: Security
**Difficulty**: 🟢 Beginner
**Success Rate**: 100% (Session 32 - 4 log injection vulnerabilities → 0)
**Impact**: ✅ Proven (OWASP A09:2021 compliance, CWE-117 eliminated)
**Time Investment**: 5-10 minutes per file
**Sessions Used**: Session 32 (CodeQL security hardening)

## Problem

Logging user-provided data with string interpolation creates log injection vulnerabilities (CWE-117):

❌ **Log injection**: User controls log format/content
❌ **Log forgery**: Malicious users inject fake log entries
❌ **OWASP A09:2021**: Security logging and monitoring failures
❌ **CodeQL HIGH alerts**: Unsanitized user data in logs

**Real example** (Session 32):
```python
# ❌ BAD - Log injection vulnerability
logger.error(f"Login failed for user: {username}")
# If username = "admin\n[CRITICAL] System compromised"
# Creates fake log entry that looks legitimate!
```

## Context

**When to use:**
- All logging of user-provided data
- Error handling with user inputs
- Authentication/authorization logging
- API request/response logging

**When NOT to use:**
- Internal system messages (no user data)
- Static log messages
- Debug logging in development (but still good practice)

**Prerequisites:**
- Python logging module
- Understanding of log injection attacks
- CodeQL or similar security scanner

**Related Patterns:**
- [Error Handling Pattern](./error-handling-pattern.md) - Secure error responses
- [Input Validation Pattern](./input-validation-pattern.md) - Validate before logging

## Solution

### Step 1: Use Structured Logging

**Always use `extra` parameter for user data:**

```python
import logging

logger = logging.getLogger(__name__)

# ❌ BAD - String interpolation with user data
logger.error(f"Login failed for user: {username}")
logger.info(f"User {user_id} accessed {resource}")

# ✅ GOOD - Structured logging with 'extra'
logger.error(
    "Login failed",  # Generic message (no user data)
    exc_info=True,   # Include exception for debugging
    extra={
        "username": username,  # User data in 'extra' dict
        "attempt_ip": request.client.host,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
)

logger.info(
    "Resource accessed",  # Generic message
    extra={
        "user_id": user_id,
        "resource": resource,
        "action": "read"
    }
)
```

### Step 2: Generic Error Messages to Clients

**Never expose internal errors to users:**

```python
from fastapi import HTTPException

# ❌ BAD - Internal details exposed to client
@app.post("/login")
async def login(username: str, password: str):
    try:
        user = await authenticate(username, password)
    except Exception as e:
        logger.error(f"Login error: {str(e)}")  # Also log injection!
        raise HTTPException(500, f"Login failed: {str(e)}")  # Exposes internals

# ✅ GOOD - Generic message to client, detailed internal logging
@app.post("/login")
async def login(username: str, password: str):
    try:
        user = await authenticate(username, password)
        logger.info(
            "Login successful",
            extra={"username": username}
        )
        return {"token": generate_token(user)}
    except Exception as e:
        logger.error(
            "Login failed",  # Generic message
            exc_info=True,   # Full stack trace in logs
            extra={
                "username": username,
                "error_type": type(e).__name__
            }
        )
        raise HTTPException(401, "Invalid credentials")  # Generic to client
```

### Step 3: Log Sanitization

**Remove sensitive data before logging:**

```python
def sanitize_for_logging(data: dict) -> dict:
    """Remove sensitive fields from data before logging."""
    sensitive_fields = ["password", "token", "api_key", "secret"]
    return {
        k: "***REDACTED***" if k in sensitive_fields else v
        for k, v in data.items()
    }

# ✅ GOOD - Sanitize before logging
logger.info(
    "User data updated",
    extra={"data": sanitize_for_logging(user_data)}
)
```

### Step 4: Standardize Log Levels

**Use appropriate log levels:**

```python
# ERROR - Production issues requiring immediate attention
logger.error("Payment processing failed", exc_info=True, extra={...})

# WARNING - Potential issues or degraded functionality
logger.warning("API rate limit approaching", extra={...})

# INFO - Normal business events (auditing, analytics)
logger.info("User registration completed", extra={...})

# DEBUG - Development/troubleshooting only (not in production)
logger.debug("Cache hit", extra={...})
```

## Example: Session 32 - Auth Route Security Hardening

**Real-world fixes from Session 32:**

### login_route() - Before
```python
# ❌ BEFORE - Log injection vulnerability (CodeQL HIGH)
@router.post("/login", response_model=LoginResponse)
async def login_route(
    credentials: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    try:
        user = await authenticate_user(db, credentials.username, credentials.password)
        token = create_access_token({"sub": user.email})
        logger.info(f"User {credentials.username} logged in successfully")  # ❌
        return LoginResponse(access_token=token, user=UserResponse.from_orm(user))
    except ValueError as e:
        logger.error(f"Login failed for {credentials.username}: {str(e)}")  # ❌
        raise HTTPException(401, "Invalid credentials")
```

### login_route() - After
```python
# ✅ AFTER - Secure structured logging (CWE-117 compliant)
@router.post("/login", response_model=LoginResponse)
async def login_route(
    credentials: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    try:
        user = await authenticate_user(db, credentials.username, credentials.password)
        token = create_access_token({"sub": user.email})

        logger.info(
            "User login successful",  # ✅ Generic message
            extra={
                "username": credentials.username,  # ✅ User data in 'extra'
                "user_id": user.id
            }
        )
        return LoginResponse(access_token=token, user=UserResponse.from_orm(user))

    except ValueError as e:
        logger.error(
            "User login failed",  # ✅ Generic message
            exc_info=True,  # ✅ Stack trace for debugging
            extra={
                "username": credentials.username,  # ✅ Structured
                "error_type": type(e).__name__
            }
        )
        raise HTTPException(401, "Invalid credentials")  # ✅ Generic to client
```

**Results**:
- ✅ 4 log injection vulnerabilities → 0 (login, register, google auth routes)
- ✅ CodeQL HIGH alerts resolved
- ✅ OWASP A09:2021 compliant
- ✅ CWE-117 eliminated

## Success Metrics

### Session 32: CodeQL Security Hardening
- **Log injection (HIGH)**: 4 → 0 (100% resolution)
- **Files fixed**: 1 (app/api/v1/auth.py)
- **Functions secured**: 3 (login_route, register_route, google_auth_route)
- **Time investment**: ~20 minutes
- **OWASP compliance**: A09:2021 (Security Logging) achieved

**Before/After**:
- Before: User-controlled data in log messages (f-strings)
- After: Structured logging with `extra` parameter
- Impact: Zero log injection vulnerabilities

## Anti-Patterns

### ❌ String interpolation with user data

```python
# ❌ BAD - Log injection risk
logger.error(f"Error for user {username}: {error}")
logger.info(f"User {user_id} performed {action}")
```

```python
# ✅ GOOD - Structured logging
logger.error(
    "Error occurred",
    exc_info=True,
    extra={"username": username, "error": str(error)}
)
logger.info(
    "User action performed",
    extra={"user_id": user_id, "action": action}
)
```

### ❌ Exposing stack traces to clients

```python
# ❌ BAD - Internal error exposed
try:
    process_payment(amount)
except Exception as e:
    raise HTTPException(500, f"Payment failed: {str(e)}")  # Exposes internals
```

```python
# ✅ GOOD - Generic message to client, detailed logging
try:
    process_payment(amount)
except Exception as e:
    logger.error("Payment processing failed", exc_info=True, extra={...})
    raise HTTPException(500, "Payment processing error")  # Generic
```

### ❌ Logging sensitive data

```python
# ❌ BAD - Password in logs
logger.info(f"User created with password: {password}")
logger.debug(f"API key: {api_key}")
```

```python
# ✅ GOOD - Sanitize sensitive data
logger.info("User created", extra={"username": username})  # No password
logger.debug("API authentication", extra={"key_prefix": api_key[:4]})  # Partial
```

## Related Patterns

- **[Error Handling Pattern](./error-handling-pattern.md)** - Secure error responses
- **[Input Validation Pattern](./input-validation-pattern.md)** - Validate before logging
- **[Python Ruff Compliance](../code-quality/python-ruff-compliance.md)** - Code quality automation

## Best Practices

1. **Always use `extra`** - Never interpolate user data into log messages
2. **Generic messages** - Client errors should be generic, not expose internals
3. **Full stack traces internally** - Use `exc_info=True` for debugging
4. **Sanitize sensitive data** - Redact passwords, tokens, API keys
5. **Appropriate log levels** - ERROR for issues, INFO for events, DEBUG for development
6. **Audit logging** - Use INFO level for security-relevant events
7. **Log retention** - Define retention policies (7-30 days typical)

## Quick Reference

**Secure logging template**:

```python
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ✅ Secure logging pattern
logger.error(
    "Generic descriptive message",  # NO user data
    exc_info=True,                  # Stack trace
    extra={
        "field1": user_value1,      # User data in 'extra'
        "field2": user_value2,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
)

# ✅ Secure error response
try:
    result = risky_operation(user_input)
except Exception as e:
    logger.error(
        "Operation failed",
        exc_info=True,
        extra={"user_input": user_input, "error_type": type(e).__name__}
    )
    raise HTTPException(500, "Operation failed")  # Generic to client
```

**Common log levels**:
- **ERROR**: Production issues (payment failures, database errors)
- **WARNING**: Potential issues (rate limits, deprecated APIs)
- **INFO**: Business events (logins, registrations, transactions)
- **DEBUG**: Development only (cache hits, query times)

## References

- **Session 32**: CodeQL security hardening - [SESSION_32_SECURITY_HARDENING.md](../../../plans/SESSION_32_SECURITY_HARDENING.md)
- **CWE-117**: Improper Output Neutralization for Logs - [cwe.mitre.org/data/definitions/117.html](https://cwe.mitre.org/data/definitions/117.html)
- **OWASP A09:2021**: Security Logging and Monitoring Failures - [owasp.org/Top10/A09_2021](https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/)
- **Python logging**: [docs.python.org/3/library/logging.html](https://docs.python.org/3/library/logging.html)

---

**Last Updated**: November 3, 2025 (Session 67 - Pattern library migration)
**Pattern Status**: ✅ Proven (Session 32: 4 vulnerabilities → 0, 100% resolution)
**Recommended For**: All logging with user-provided data (mandatory for production)
