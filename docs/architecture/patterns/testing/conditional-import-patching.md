# Conditional Import Patching Pattern

**Category**: Testing
**Difficulty**: 🟡 Intermediate
**Success Rate**: 100% (1/1 sessions - ProfileService Gap 3)
**Impact**: 🎯 High (solves mysterious "patch not working" issues)
**Time Investment**: 10-20 minutes (once understood, prevents hours of debugging)
**Sessions Used**: ProfileService Gap 3

---

## Problem

When services use **conditional imports** (TYPE_CHECKING, lazy imports), patching at the import site fails mysteriously:

```python
# profile_service.py
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.services.follow_service import FollowService

class ProfileService:
    def __init__(self, db: AsyncSession, follow_service: "FollowService" = None):
        self.follow_service = follow_service

    async def get_profile_with_stats(self, user_id: int):
        # Using follow_service to get follower stats
        stats = await self.follow_service.get_follow_stats(user_id)
        # ... rest of method
```

**The Mystery**:
```python
# ❌ This patch doesn't work (import site):
@patch("app.services.profile_service.FollowService")
async def test_get_profile_with_stats(mock_follow_service):
    # Test runs but FollowService is NOT mocked!
    # Why? TYPE_CHECKING is False at runtime, import never executed
```

## Context

**When to Use**:
- ✅ Service has conditional imports (`if TYPE_CHECKING:`)
- ✅ Service has lazy imports (imported inside methods)
- ✅ Patches aren't taking effect despite correct syntax
- ✅ Getting `AttributeError: 'NoneType' object has no attribute` in tests

**Prerequisites**:
- Understanding of Python's `from X import Y` import system
- Familiarity with `unittest.mock.patch` decorator
- Knowledge of `TYPE_CHECKING` constant (always False at runtime)

**Related Patterns**:
- [AsyncMock Pattern](./asyncmock-pattern.md) - Used alongside this pattern
- [Fixture Design](./fixture-design.md) - Fixtures can hold patched services

---

## Solution

**Rule**: **Always patch at the module source (where service is defined), NOT where it's imported.**

### Step 1: Identify the Import Pattern

```python
# profile_service.py
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.services.follow_service import FollowService  # ← Only for type checking!

# At runtime, this import is SKIPPED (TYPE_CHECKING == False)
```

### Step 2: Find the Module Source

The service is defined in: `app/services/follow_service.py`

```python
# app/services/follow_service.py
class FollowService:
    """The actual service definition."""
    async def get_follow_stats(self, user_id: int):
        # Implementation
```

### Step 3: Patch at Module Source

```python
# ✅ CORRECT: Patch where FollowService is defined
@patch("app.services.follow_service.FollowService")
async def test_get_profile_with_stats(mock_follow_service_class):
    # Create mock instance
    mock_instance = AsyncMock()
    mock_instance.get_follow_stats = AsyncMock(return_value={
        "follower_count": 100,
        "following_count": 50,
    })
    mock_follow_service_class.return_value = mock_instance

    # Inject into service under test
    profile_service = ProfileService(db=mock_db, follow_service=mock_instance)

    # Now test works!
    result = await profile_service.get_profile_with_stats(user_id=1)
    assert result.follower_count == 100
```

---

## Complete Example

### Service Code with Conditional Import

```python
# app/services/profile_service.py
from typing import TYPE_CHECKING, Optional
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    from app.services.follow_service import FollowService

class ProfileService:
    def __init__(
        self,
        db: AsyncSession,
        follow_service: Optional["FollowService"] = None
    ):
        self.db = db
        self.follow_service = follow_service

    async def get_profile_with_stats(self, user_id: int):
        """Get profile with follower/following counts."""
        # Get profile from database
        profile = await self.db.execute(
            select(Profile).where(Profile.user_id == user_id)
        )
        profile = profile.scalar_one_or_none()

        # Get follow stats from follow service
        if self.follow_service:
            stats = await self.follow_service.get_follow_stats(user_id)
            profile.follower_count = stats["follower_count"]
            profile.following_count = stats["following_count"]

        return profile
```

### Test Code with Correct Patching

```python
# tests/services/test_profile_service.py
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.profile_service import ProfileService

class TestProfileServiceFollowIntegration:
    """Test ProfileService integration with FollowService."""

    @pytest.fixture
    async def mock_db_session(self):
        """Mock database session."""
        mock_db = AsyncMock()

        # Mock profile query result
        mock_profile = MagicMock(
            user_id=1,
            username="testuser",
            follower_count=0,  # Will be updated by follow service
            following_count=0,
        )
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_profile
        mock_db.execute.return_value = mock_result

        return mock_db

    @pytest.fixture
    def mock_follow_service(self):
        """Mock FollowService instance."""
        mock_service = AsyncMock()
        mock_service.get_follow_stats = AsyncMock(return_value={
            "follower_count": 150,
            "following_count": 75,
            "mutual_count": 10,
        })
        return mock_service

    @pytest.mark.asyncio
    async def test_get_profile_with_stats(
        self, mock_db_session, mock_follow_service
    ):
        """Should get profile with follow stats from FollowService."""
        # Arrange
        profile_service = ProfileService(
            db=mock_db_session,
            follow_service=mock_follow_service
        )

        # Act
        result = await profile_service.get_profile_with_stats(user_id=1)

        # Assert
        assert result.username == "testuser"
        assert result.follower_count == 150  # Updated from follow service
        assert result.following_count == 75

        # Verify follow service was called
        mock_follow_service.get_follow_stats.assert_called_once_with(1)

    @pytest.mark.asyncio
    @patch("app.services.follow_service.FollowService")  # ✅ Patch at source!
    async def test_get_profile_with_stats_class_patch(
        self, mock_follow_service_class, mock_db_session
    ):
        """Alternative: Patch FollowService class at module source."""
        # Arrange
        mock_instance = AsyncMock()
        mock_instance.get_follow_stats = AsyncMock(return_value={
            "follower_count": 200,
            "following_count": 100,
        })
        mock_follow_service_class.return_value = mock_instance

        profile_service = ProfileService(
            db=mock_db_session,
            follow_service=mock_instance
        )

        # Act
        result = await profile_service.get_profile_with_stats(user_id=1)

        # Assert
        assert result.follower_count == 200
        mock_instance.get_follow_stats.assert_called_once_with(1)
```

---

## Anti-Patterns

### ❌ Don't: Patch at Import Site (TYPE_CHECKING)

```python
# ❌ BAD: Patching where import happens (but it doesn't at runtime!)
@patch("app.services.profile_service.FollowService")
async def test_get_profile_with_stats(mock_follow_service):
    # This NEVER works because:
    # 1. TYPE_CHECKING is False at runtime
    # 2. Import statement inside `if TYPE_CHECKING:` is skipped
    # 3. profile_service module never has FollowService attribute
    # 4. Patch creates attribute that's never used

    profile_service = ProfileService(db=mock_db)
    # profile_service.follow_service is still None or real class!
```

**Why It Fails**:
- `TYPE_CHECKING` is always `False` during test execution
- The conditional import is skipped entirely
- `app.services.profile_service` module doesn't have `FollowService` attribute
- Your patch creates a new attribute that's never accessed

### ❌ Don't: Patch String Literals

```python
# ❌ BAD: Patching import as string (works sometimes, confusing)
@patch("app.services.profile_service.FollowService")  # Fragile!

# ✅ GOOD: Patch module source
@patch("app.services.follow_service.FollowService")  # Reliable!
```

**Why String Patching is Fragile**:
- Hard to debug when it fails
- IDE can't validate patch paths
- Refactoring breaks silently
- No type hints for mocked object

### ❌ Don't: Import from Conditional Block

```python
# ❌ BAD: Trying to import from TYPE_CHECKING block in tests
if TYPE_CHECKING:
    from app.services.follow_service import FollowService

# This is a code smell - you're fighting the import system
```

### ❌ Don't: Create Fake Attributes

```python
# ❌ BAD: Manually setting module attributes
import app.services.profile_service
app.services.profile_service.FollowService = MagicMock()

# This works but is hacky and hard to maintain
```

---

## Variations

### Variation 1: Lazy Imports (Inside Methods)

**Problem**: Service imports dependency inside method for circular import avoidance.

```python
# app/services/notification_service.py
class NotificationService:
    async def notify_new_follower(self, user_id: int, follower_id: int):
        from app.services.profile_service import ProfileService  # ← Lazy import

        profile_service = ProfileService(self.db)
        profile = await profile_service.get_profile(follower_id)
        # ... send notification
```

**Solution**: Patch at source, same rule applies.

```python
# ✅ CORRECT: Patch where ProfileService is defined
@patch("app.services.profile_service.ProfileService")
async def test_notify_new_follower(mock_profile_service_class):
    mock_instance = AsyncMock()
    mock_instance.get_profile = AsyncMock(return_value=mock_profile)
    mock_profile_service_class.return_value = mock_instance

    # Lazy import will get mocked class
    await notification_service.notify_new_follower(1, 2)
```

### Variation 2: Multiple Conditional Services

**Pattern**: Multiple services with TYPE_CHECKING imports.

```python
# app/services/user_service.py
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.services.profile_service import ProfileService
    from app.services.follow_service import FollowService
    from app.services.notification_service import NotificationService
```

**Solution**: Patch all at their module sources.

```python
# ✅ CORRECT: Patch each at source
@patch("app.services.notification_service.NotificationService")
@patch("app.services.follow_service.FollowService")
@patch("app.services.profile_service.ProfileService")
async def test_complex_operation(
    mock_profile_class, mock_follow_class, mock_notif_class
):
    # Create instances
    mock_profile = AsyncMock()
    mock_follow = AsyncMock()
    mock_notif = AsyncMock()

    mock_profile_class.return_value = mock_profile
    mock_follow_class.return_value = mock_follow
    mock_notif_class.return_value = mock_notif

    # Inject into service
    user_service = UserService(
        db=mock_db,
        profile_service=mock_profile,
        follow_service=mock_follow,
        notification_service=mock_notif,
    )

    # All services are now mocked!
```

---

## Success Metrics

**ProfileService Gap 3** (Session: ProfileService, Commit: 2117808c):
- **Coverage Gain**: 79% → 92% (+13pp)
- **Tests Added**: 5 tests
- **Time**: ~35 minutes
- **Key Win**: Solved "patch not working" mystery that blocked progress for 15+ minutes

**Pattern Effectiveness**:
- ✅ 100% success rate once pattern understood
- ✅ Prevents 15-30 minutes of debugging per occurrence
- ✅ Reusable across all services with conditional imports
- ✅ Works with both TYPE_CHECKING and lazy imports

---

## Troubleshooting

### Issue 1: Patch Still Not Working

**Symptom**: Applied pattern correctly but service still uses real dependency.

**Solution**:
1. Verify patch path with print statement:
   ```python
   @patch("app.services.follow_service.FollowService")
   def test_something(mock_class):
       print(f"Mocked: {mock_class}")  # Should be MagicMock
   ```

2. Check service instantiation - is mocked instance injected?
   ```python
   # ✅ Must inject mocked instance
   service = ProfileService(db=mock_db, follow_service=mock_instance)

   # ❌ Don't rely on default None
   service = ProfileService(db=mock_db)  # follow_service=None
   ```

3. Verify import path exactly matches module structure:
   ```bash
   # Check actual file location
   ls app/services/follow_service.py  # Must exist at this path
   ```

### Issue 2: MagicMock vs AsyncMock Confusion

**Symptom**: TypeError: object MagicMock can't be used in 'await' expression

**Solution**: Use `AsyncMock` for async methods.

```python
# ❌ BAD: MagicMock for async method
mock_service = MagicMock()
mock_service.get_stats = MagicMock(return_value={...})  # Won't await!

# ✅ GOOD: AsyncMock for async method
mock_service = AsyncMock()
mock_service.get_stats = AsyncMock(return_value={...})  # Awaitable!
```

### Issue 3: Fixture vs Decorator Patching

**Symptom**: Not sure whether to use `@patch` decorator or `pytest.fixture`.

**Solution**: Use fixtures for complex setup, decorators for simple patches.

```python
# ✅ Fixture: Complex service with multiple methods
@pytest.fixture
def mock_follow_service():
    mock = AsyncMock()
    mock.get_stats = AsyncMock(return_value={...})
    mock.get_followers = AsyncMock(return_value=[])
    mock.get_following = AsyncMock(return_value=[])
    return mock

# ✅ Decorator: Simple class patch
@patch("app.services.follow_service.FollowService")
async def test_something(mock_class):
    # Quick one-time setup
```

---

## When NOT to Use

- ❌ **Direct imports** - If service uses `from app.services.follow_service import FollowService` at module level, patch at import site works fine
- ❌ **Dependency injection already working** - If tests pass without patching, don't add unnecessary mocks
- ❌ **Integration tests** - Use real services for integration testing, not mocks

---

## Related Patterns

- [AsyncMock Pattern](./asyncmock-pattern.md) - Essential for mocking async service methods
- [Fixture Design](./fixture-design.md) - Organize mocked services in fixtures
- [Pydantic Model Mocking](./pydantic-model-mocking.md) - Mocking service responses correctly

---

## References

- **Session**: ProfileService Gap 3 (Coverage: 79% → 92%, +13pp)
- **Commit**: 2117808c
- **Time**: 35 minutes (~15 minutes debugging, 20 minutes implementing fix)
- **Documentation**: Python `unittest.mock.patch` - https://docs.python.org/3/library/unittest.mock.html#unittest.mock.patch
- **TYPE_CHECKING**: PEP 563 - https://peps.python.org/pep-0563/
