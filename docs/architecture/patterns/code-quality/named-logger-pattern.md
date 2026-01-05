# Named Logger Pattern (LOG015)

> **Category**: 🟢 Beginner
> **Success Rate**: 100% (1/1)
> **Impact**: 🎯 Better log tracing, debugging, and log management
> **Sessions Used**: 122

## Problem

Using the root logger directly (`logging.error()`, `logging.info()`) makes it difficult to:
- Trace which module generated a log message
- Filter logs by module/component
- Configure logging levels per module
- Debug issues in complex applications

## Solution

Always create a named logger at module level using `logging.getLogger(__name__)`:

```python
# ✅ GOOD - Named logger at module level
import logging

logger = logging.getLogger(__name__)

def some_function():
    try:
        # ... operation
    except Exception as e:
        logger.error(f"Failed to perform operation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Operation failed")
```

```python
# ❌ BAD - Root logger usage
import logging

def some_function():
    try:
        # ... operation
    except Exception as e:
        logging.error(f"Failed: {e}")  # LOG015 violation
        raise HTTPException(status_code=500, detail="Operation failed")
```

## Anti-Patterns

### 1. Inline Import + Root Logger
```python
# ❌ BAD - Inline import and root logger
except Exception as e:
    import logging
    logging.error(f"Error: {e}")  # Double anti-pattern!
```

### 2. Module-Level Root Logger Calls
```python
# ❌ BAD - Direct root logger at module level
import logging

logging.basicConfig(level=logging.INFO)
logging.info("Module loaded")  # Root logger usage
```

## Implementation Steps

1. **Add named logger after imports**:
   ```python
   import logging
   from fastapi import APIRouter

   logger = logging.getLogger(__name__)

   router = APIRouter()
   ```

2. **Replace all `logging.X()` with `logger.X()`**:
   - `logging.error()` → `logger.error()`
   - `logging.info()` → `logger.info()`
   - `logging.debug()` → `logger.debug()`
   - `logging.warning()` → `logger.warning()`

3. **Enable ruff LOG rule** in `ruff.toml`:
   ```toml
   [lint]
   select = [
     # ... other rules
     "LOG",  # flake8-logging (logging best practices)
   ]
   ```

## Benefits

| Benefit | Description |
|---------|-------------|
| **Traceability** | Log messages include module path (e.g., `app.routers.crypto`) |
| **Filtering** | Configure log levels per module in logging config |
| **Debugging** | Quickly identify source of log messages |
| **Testing** | Easier to mock/capture logs in tests |
| **Production** | Better log aggregation and analysis |

## Ruff Rule

**LOG015**: `root-logger-call` - Detects direct calls to `logging.X()` instead of using a named logger.

## Real-World Example (Session 122)

Fixed 18 LOG015 violations across 2 files:
- `j6_2_endpoints.py`: 17 instances
- `crypto.py`: 1 instance (with inline import)

**Before**:
```python
# crypto.py
except Exception as e:
    import logging
    logging.error(f"CoinGecko API error: {type(e).__name__}: {e}")
```

**After**:
```python
# crypto.py (top of file)
import logging
logger = logging.getLogger(__name__)

# In exception handler
except Exception as e:
    logger.error(f"CoinGecko API error: {type(e).__name__}: {e}")
```

## Success Metrics

- **18 violations fixed** in Session 122
- **100% ruff compliance** maintained
- **Better log output** with module paths
- **Future violations prevented** with LOG rule enabled

## Related Patterns

- [Python Ruff Compliance](./python-ruff-compliance.md) - Overall ruff configuration
- [Secure Logging Pattern](../security/secure-logging.md) - Sanitizing sensitive data in logs

## References

- [Ruff LOG015 Documentation](https://docs.astral.sh/ruff/rules/root-logger-call/)
- [Python Logging Best Practices](https://docs.python.org/3/howto/logging.html#logging-from-multiple-modules)
- Session 122 Commit: `fc7421c4`
