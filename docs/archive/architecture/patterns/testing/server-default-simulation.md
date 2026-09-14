# Server Default Simulation Pattern for Pydantic Validation

**Category**: Testing
**Difficulty**: 🔴 Advanced
**Success Rate**: 100% (1/1 sessions - 67)
**Impact**: 🎯 Critical (enables 100% coverage for models with server defaults)
**Time Investment**: 30-60 minutes initial setup (reusable across services)
**Sessions Used**: Session 67 (AuthService)

## Problem

Testing SQLAlchemy models with `server_default` fields fails Pydantic strict validation when using mocks. The database normally sets these values during INSERT, but in tests with mocked database sessions, the values remain `None`.

**Symptoms:**
```python
# Error during test execution
ValidationError: 1 validation error for UserResponse
  created_at
    Input should be a valid datetime [type=datetime_type, input_value=None, input_type=NoneType]
```

**Root Cause:**
- SQLAlchemy `server_default=func.now()` means **database sets values**, not Python/ORM
- Mocked database sessions don't execute SQL, so defaults never get set
- Pydantic strict validation rejects `None` for datetime/int fields
- Cannot skip Pydantic validation (service code calls it directly)

## Context

**When to use:**
- Testing services that create models with `server_default` fields
- Models with timestamp fields (`created_at`, `updated_at`)
- Models with numeric defaults (`follower_count`, `following_count`)
- Any SQLAlchemy field using `server_default` or `default` with database functions

**Common server_default patterns:**
```python
# Timestamps
created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    server_default=func.now()
)

# Numeric defaults
follower_count: Mapped[int] = mapped_column(
    Integer,
    nullable=False,
    default=0,
    server_default="0"
)
```

**Prerequisites:**
- Understanding of SQLAlchemy flush/commit lifecycle
- Understanding of Pydantic validation
- AsyncMock for database session mocking

**Related Patterns:**
- [AsyncMock Pattern](./asyncmock-pattern.md) - Base pattern for async mocking
- [Test Fixture Design](./fixture-design.md) - Organizing mock setup

## Solution

### Step 1: Understand Flush vs Commit Timing

SQLAlchemy operations execute in sequence:
1. **`db.add(obj)`** - Stage object for insertion
2. **`await db.flush()`** - Write to database, get auto-generated IDs (no commit)
3. Add dependent objects (use IDs from step 2)
4. **`await db.commit()`** - Finalize transaction, apply all changes

### Step 2: Create Mock Side Effects

Create separate functions to simulate database default-setting at each stage:

```python
from datetime import datetime, timezone
from unittest.mock import AsyncMock

async def mock_flush_with_defaults():
    """Set defaults for objects flushed FIRST (e.g., User)"""
    for call in mock_db_session.add.call_args_list:
        obj = call[0][0]
        if isinstance(obj, User) and not hasattr(obj, '_defaults_set'):
            obj.id = 1  # Simulate auto-generated ID
            obj.created_at = datetime.now(timezone.utc)
            obj.updated_at = datetime.now(timezone.utc)
            obj._defaults_set = True  # Prevent double-setting

async def mock_commit_with_defaults():
    """Set defaults for objects added AFTER flush (e.g., Profile)"""
    for call in mock_db_session.add.call_args_list:
        obj = call[0][0]
        # Handle User (if not flushed yet)
        if isinstance(obj, User) and not hasattr(obj, '_defaults_set'):
            obj.id = 1
            obj.created_at = datetime.now(timezone.utc)
            obj.updated_at = datetime.now(timezone.utc)
            obj._defaults_set = True
        # Handle Profile (added after User flush)
        elif isinstance(obj, Profile) and not hasattr(obj, '_defaults_set'):
            obj.follower_count = 0
            obj.following_count = 0
            obj.created_at = datetime.now(timezone.utc)
            obj.updated_at = datetime.now(timezone.utc)
            obj._defaults_set = True
```

### Step 3: Apply Side Effects to Mock Session

```python
@pytest.fixture
def mock_db_session():
    """Mock database session with server default simulation"""
    session = AsyncMock()

    # Configure basic session behavior
    session.add = Mock()
    session.execute = AsyncMock()

    # Apply side effects for server defaults
    session.flush = AsyncMock(side_effect=mock_flush_with_defaults)
    session.commit = AsyncMock(side_effect=mock_commit_with_defaults)

    return session
```

### Step 4: Use in Tests

```python
@pytest.mark.asyncio
async def test_create_user_from_oauth_new_user(mock_db_session):
    """Test OAuth user creation with server default simulation"""
    # Arrange
    mock_db_session.execute.return_value.scalar.return_value = None
    oauth_data = OAuthUserData(
        email="newuser@example.com",
        google_id="google-oauth-id-12345",
        username="newuser",
        avatar_url="https://example.com/avatar.jpg"
    )

    # Act
    result = await service.create_user_from_oauth(oauth_data)

    # Assert - Pydantic validation now succeeds!
    assert result.email == "newuser@example.com"
    assert result.google_id == "google-oauth-id-12345"
    assert result.created_at is not None  # Set by mock_flush_with_defaults
    assert isinstance(result.created_at, datetime)
```

## Complete Example

### Service Code (What We're Testing)

```python
# app/services/auth_service.py
async def create_user_from_oauth(self, oauth_data: OAuthUserData) -> UserResponse:
    """Create or update user from OAuth data"""
    # Check if user exists
    user = await self.get_user_by_email(oauth_data.email)

    if not user:
        # Create new user
        user = User(
            email=oauth_data.email,
            username=oauth_data.username,
            google_id=oauth_data.google_id,
            is_active=True
        )
        self.db.add(user)
        await self.db.flush()  # ← Triggers mock_flush_with_defaults

        # Create profile (needs user.id)
        profile = Profile(
            user_id=user.id,
            display_name=oauth_data.username,
            avatar_url=oauth_data.avatar_url
        )
        self.db.add(profile)

        # Create notification preferences
        preferences = NotificationPreference(user_id=user.id)
        self.db.add(preferences)

        await self.db.commit()  # ← Triggers mock_commit_with_defaults

    # Return Pydantic response (strict validation!)
    return UserResponse.model_validate(user)  # ← Validates created_at, updated_at
```

### Test Code (Complete Pattern)

```python
# tests/services/test_auth_service.py
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, Mock
from app.services.auth_service import AuthService
from app.models import User, Profile, NotificationPreference
from app.models.schemas import OAuthUserData

@pytest.fixture
def mock_db_session():
    """Mock database session with server default simulation"""
    session = AsyncMock()
    session.add = Mock()
    session.execute = AsyncMock()

    async def mock_flush_with_defaults():
        """Set User defaults when User is flushed"""
        for call in session.add.call_args_list:
            obj = call[0][0]
            if isinstance(obj, User) and not hasattr(obj, '_defaults_set'):
                obj.id = 1
                obj.created_at = datetime.now(timezone.utc)
                obj.updated_at = datetime.now(timezone.utc)
                obj._defaults_set = True

    async def mock_commit_with_defaults():
        """Set Profile/NotificationPreference defaults when committed"""
        for call in session.add.call_args_list:
            obj = call[0][0]
            if isinstance(obj, User) and not hasattr(obj, '_defaults_set'):
                obj.id = 1
                obj.created_at = datetime.now(timezone.utc)
                obj.updated_at = datetime.now(timezone.utc)
                obj._defaults_set = True
            elif isinstance(obj, Profile) and not hasattr(obj, '_defaults_set'):
                obj.follower_count = 0
                obj.following_count = 0
                obj.created_at = datetime.now(timezone.utc)
                obj.updated_at = datetime.now(timezone.utc)
                obj._defaults_set = True
            elif isinstance(obj, NotificationPreference) and not hasattr(obj, '_defaults_set'):
                obj.created_at = datetime.now(timezone.utc)
                obj.updated_at = datetime.now(timezone.utc)
                obj._defaults_set = True

    session.flush = AsyncMock(side_effect=mock_flush_with_defaults)
    session.commit = AsyncMock(side_effect=mock_commit_with_defaults)

    return session

@pytest.fixture
def auth_service(mock_db_session):
    """Create AuthService with mocked session"""
    return AuthService(db=mock_db_session)

@pytest.mark.asyncio
async def test_create_user_from_oauth_new_user(auth_service, mock_db_session):
    """Test OAuth user creation with server default simulation"""
    # Arrange - no existing user
    mock_db_session.execute.return_value.scalar.return_value = None
    oauth_data = OAuthUserData(
        email="newuser@example.com",
        google_id="google-oauth-id-12345",
        username="newuser",
        avatar_url="https://example.com/avatar.jpg"
    )

    # Act
    result = await auth_service.create_user_from_oauth(oauth_data)

    # Assert - Pydantic validation succeeds!
    assert result.email == "newuser@example.com"
    assert result.google_id == "google-oauth-id-12345"
    assert result.created_at is not None
    assert result.updated_at is not None
    assert isinstance(result.created_at, datetime)

    # Verify database operations
    assert mock_db_session.add.call_count == 3  # User + Profile + Preferences
    mock_db_session.flush.assert_called_once()
    mock_db_session.commit.assert_called_once()
```

## Anti-Patterns

### ❌ Don't: Try to mock Pydantic validation

```python
# BAD - Can't skip validation, service code calls it
with patch('pydantic.BaseModel.model_validate'):
    result = await service.create_user_from_oauth(oauth_data)
    # Still fails! Service code calls validation internally
```

### ❌ Don't: Set defaults manually on mock objects

```python
# BAD - Doesn't work with Pydantic strict validation
mock_user = Mock(spec=User)
mock_user.created_at = datetime.now(timezone.utc)  # Still None internally!
```

### ❌ Don't: Use only commit() without flush()

```python
# BAD - Profile needs user.id from flush()
async def mock_commit_with_defaults():
    # Only sets User defaults, Profile still has None values
    obj.created_at = datetime.now(timezone.utc)
```

### ✅ Do: Mock both flush() and commit() with timing awareness

```python
# GOOD - Respects SQLAlchemy operation order
session.flush = AsyncMock(side_effect=mock_flush_with_defaults)  # User first
session.commit = AsyncMock(side_effect=mock_commit_with_defaults)  # Profile second
```

## Variations

### For Synchronous Code (Non-Async)

```python
def mock_flush_with_defaults():  # No async
    """Set defaults for sync operations"""
    for call in session.add.call_args_list:
        obj = call[0][0]
        if isinstance(obj, User) and not hasattr(obj, '_defaults_set'):
            obj.created_at = datetime.now(timezone.utc)
            obj._defaults_set = True

# Use Mock instead of AsyncMock
session.flush = Mock(side_effect=mock_flush_with_defaults)
session.commit = Mock(side_effect=mock_commit_with_defaults)
```

### For Multiple Model Types

```python
async def mock_commit_with_defaults():
    """Handle multiple model types with defaults"""
    for call in session.add.call_args_list:
        obj = call[0][0]

        # Use match/case for clarity (Python 3.10+)
        match type(obj).__name__:
            case 'User':
                if not hasattr(obj, '_defaults_set'):
                    obj.created_at = datetime.now(timezone.utc)
                    obj.updated_at = datetime.now(timezone.utc)
                    obj._defaults_set = True
            case 'Profile':
                if not hasattr(obj, '_defaults_set'):
                    obj.follower_count = 0
                    obj.following_count = 0
                    obj.created_at = datetime.now(timezone.utc)
                    obj._defaults_set = True
            case 'Post':
                if not hasattr(obj, '_defaults_set'):
                    obj.view_count = 0
                    obj.like_count = 0
                    obj.created_at = datetime.now(timezone.utc)
                    obj._defaults_set = True
```

## Success Metrics

**From Session 67 (AuthService):**
- ✅ Coverage: 65% → **100%** (+35pp)
- ✅ Tests: 17 → 25 (+8 new, all passing)
- ✅ Time: ~1 hour (including pattern discovery)
- ✅ Reusability: Pattern applicable to 10+ services with User/Profile creation

**Expected results:**
- All Pydantic validations pass
- 100% test success rate
- No manual default-setting needed in test code
- Reusable across all services with server_default fields

## Troubleshooting

### Issue: "Profile fields still None after commit"

**Cause**: Profile added AFTER flush, but commit mock doesn't handle it

**Solution**: Check commit side effect includes Profile:
```python
async def mock_commit_with_defaults():
    for call in session.add.call_args_list:
        obj = call[0][0]
        # Must check for Profile here!
        if isinstance(obj, Profile) and not hasattr(obj, '_defaults_set'):
            obj.follower_count = 0
            obj._defaults_set = True
```

### Issue: "Defaults set twice, values overwritten"

**Cause**: Both flush and commit setting same object's defaults

**Solution**: Use `_defaults_set` flag to prevent double-setting:
```python
if not hasattr(obj, '_defaults_set'):  # Check first!
    obj.created_at = datetime.now(timezone.utc)
    obj._defaults_set = True  # Mark as set
```

### Issue: "ValidationError: follower_count - Input should be a valid integer"

**Cause**: Forgot to set integer server_default fields

**Solution**: Check model definition, add ALL server_default fields:
```python
# Model has server_default="0"
follower_count: Mapped[int] = mapped_column(Integer, server_default="0")

# Mock must set it
obj.follower_count = 0  # Don't forget!
```

## Related Patterns

- **[AsyncMock Pattern](./asyncmock-pattern.md)** - Foundation for async mocking
- **[Fixture Design](./fixture-design.md)** - Organizing mock setup
- **[Pydantic Validation](../validation/pydantic-strict.md)** - Understanding strict validation

## When NOT to Use

- Models without `server_default` fields (use regular AsyncMock)
- Testing with real database (integration tests)
- Models using Python `default` values (ORM handles these)

## References

- **Session 67**: AuthService 100% coverage achievement
- **Commit**: d4e20eae (AuthService Gap 1 tests)
- **Documentation**: Session 67 case study (Nov 4, 2025)
- **SQLAlchemy docs**: [Default Values](https://docs.sqlalchemy.org/en/20/core/defaults.html)
- **Pydantic docs**: [Strict Mode](https://docs.pydantic.dev/latest/concepts/strict_mode/)
