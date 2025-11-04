# Pydantic Model Mocking Pattern

**Category**: Testing
**Difficulty**: 🟡 Intermediate
**Success Rate**: 100% (2/2 sessions - ConversationService Gap 1, FollowService Gap 3)
**Impact**: 🎯 High (prevents ValidationError test failures)
**Time Investment**: 15-30 minutes (once understood, saves debugging time)
**Sessions Used**: ConversationService Gap 1, FollowService Gap 3

---

## Problem

When services return **Pydantic models with strict validation**, `MagicMock` objects fail validation:

```python
# Service method returns Pydantic model
async def get_conversation(self, conv_id: UUID) -> ConversationResponse:
    conversation = await self._build_conversation_response(conv_data, user_id)
    return conversation  # ConversationResponse (Pydantic model)

# Test using MagicMock
mock_build.return_value = MagicMock(id=conv_id, name="Test")  # ❌ FAILS!

# Pydantic validation error:
# ValidationError: id: Input should be a valid UUID
# name: Input should be a valid string or None
```

**Why MagicMock Fails**:
- Pydantic strict validation requires actual types (UUID, str, int, datetime)
- `MagicMock(field=value)` wraps values in MagicMock, not actual types
- `getattr(mock, "id")` returns `<MagicMock ...>`, not UUID object
- Pydantic sees MagicMock wrapper and rejects it

## Context

**When to Use**:
- ✅ Service returns Pydantic models (BaseModel subclasses)
- ✅ Getting `ValidationError` in tests despite correct fields
- ✅ Mocked return values look correct but fail validation
- ✅ Tests work with real objects but fail with mocks

**Prerequisites**:
- Understanding of Pydantic models and validation
- Familiarity with `unittest.mock.MagicMock` and `AsyncMock`
- Knowledge of Python's `getattr()` and attribute access

**Related Patterns**:
- [AsyncMock Pattern](./asyncmock-pattern.md) - Use AsyncMock for async methods
- [Conditional Import Patching](./conditional-import-patching.md) - Patch services correctly

---

## Solution

**Rule**: **Always use actual Pydantic model instances for return values, never MagicMock.**

### Step 1: Import the Pydantic Schema

```python
# Import the actual schema
from app.schemas.conversation import ConversationResponse
from uuid import uuid4
from datetime import datetime, timezone
```

### Step 2: Create Real Pydantic Instance

```python
# ✅ CORRECT: Use actual Pydantic model
mock_conversation = ConversationResponse(
    id=uuid4(),
    is_group=False,
    name=None,
    description=None,
    participants=[],
    last_message=None,
    unread_count=0,
    created_at=datetime.now(timezone.utc),
    updated_at=datetime.now(timezone.utc),
    last_message_at=None,
)

# Mock helper method to return Pydantic model
mock_build.return_value = mock_conversation  # ✓ Passes validation!
```

### Step 3: Verify Pydantic Fields

```python
# Pydantic validation succeeds
result = await conversation_service.get_conversation(conv_id)
assert isinstance(result, ConversationResponse)  # ✓
assert isinstance(result.id, UUID)  # ✓ Real UUID
assert isinstance(result.created_at, datetime)  # ✓ Real datetime
```

---

## Complete Example

### Service Code with Pydantic Response

```python
# app/services/conversation_service.py
from uuid import UUID
from app.schemas.conversation import ConversationResponse
from app.models.conversation import Conversation

class ConversationService:
    async def get_or_create_dm_conversation(
        self, user_id: UUID, other_user_id: UUID
    ) -> ConversationResponse:
        """Get or create DM conversation between two users."""
        # Database operations...
        conversation = await self.db.execute(query)
        conv_data = conversation.scalar_one_or_none()

        # Build Pydantic response
        response = await self._build_conversation_response(conv_data, user_id)
        return response  # ConversationResponse (Pydantic)

    async def _build_conversation_response(
        self, conversation: Conversation, user_id: UUID
    ) -> ConversationResponse:
        """Build ConversationResponse from Conversation model."""
        return ConversationResponse(
            id=conversation.id,
            is_group=conversation.is_group,
            name=conversation.name,
            participants=[...],
            last_message=None,
            unread_count=0,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            last_message_at=conversation.last_message_at,
        )
```

### Pydantic Schema Definition

```python
# app/schemas/conversation.py
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class ConversationResponse(BaseModel):
    """Response schema for conversation data."""
    id: UUID
    is_group: bool
    name: Optional[str]
    description: Optional[str]
    participants: List[dict]
    last_message: Optional[dict]
    unread_count: int
    created_at: datetime
    updated_at: datetime
    last_message_at: Optional[datetime]

    class Config:
        from_attributes = True  # Allow ORM models
```

### Test Code with Pydantic Mocking

```python
# tests/services/test_conversation_service.py
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4
from datetime import datetime, timezone
from app.services.conversation_service import ConversationService
from app.schemas.conversation import ConversationResponse

class TestConversationServiceDMCreation:
    """Test DM conversation creation with Pydantic validation."""

    @pytest.fixture
    async def mock_db_session(self):
        """Mock database session."""
        mock_db = AsyncMock()

        # Mock conversation query result
        conv_id = uuid4()
        mock_conversation = MagicMock(
            id=conv_id,
            is_group=False,
            name=None,
            description=None,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            last_message_at=None,
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_conversation
        mock_db.execute.return_value = mock_result

        return mock_db

    @pytest.fixture
    def mock_conversation_response(self):
        """Create mock Pydantic ConversationResponse."""
        # ✅ CORRECT: Use actual Pydantic model
        return ConversationResponse(
            id=uuid4(),
            is_group=False,
            name=None,
            description=None,
            participants=[
                {"user_id": str(uuid4()), "username": "user1"},
                {"user_id": str(uuid4()), "username": "user2"},
            ],
            last_message=None,
            unread_count=0,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            last_message_at=None,
        )

    @pytest.mark.asyncio
    async def test_get_or_create_dm_conversation(
        self, mock_db_session, mock_conversation_response
    ):
        """Should return ConversationResponse (Pydantic validated)."""
        # Arrange
        conversation_service = ConversationService(db=mock_db_session)
        user_id = uuid4()
        other_user_id = uuid4()

        # Mock the helper method with Pydantic response
        with patch.object(
            conversation_service,
            "_build_conversation_response",
            return_value=mock_conversation_response
        ):
            # Act
            result = await conversation_service.get_or_create_dm_conversation(
                user_id, other_user_id
            )

            # Assert - Pydantic validation passes
            assert isinstance(result, ConversationResponse)
            assert isinstance(result.id, UUID)
            assert result.is_group is False
            assert len(result.participants) == 2
            assert isinstance(result.created_at, datetime)
```

---

## Anti-Patterns

### ❌ Don't: Use MagicMock for Pydantic Models

```python
# ❌ BAD: MagicMock wraps values, fails Pydantic validation
mock_response = MagicMock(
    id=uuid4(),
    name="Test Conversation",
    participants=[],
)

mock_build.return_value = mock_response

# Pydantic validation error:
# ValidationError: id: Input should be a valid UUID, not MagicMock
#                  name: Input should be a valid string or None, not MagicMock
```

**Why It Fails**:
```python
# What happens internally:
mock = MagicMock(id=uuid4())
print(type(mock.id))  # <class 'unittest.mock.MagicMock'>, not UUID!
print(mock.id)        # <MagicMock id='140...'>, not uuid object
```

### ❌ Don't: Partial Mock Data

```python
# ❌ BAD: Missing required fields
mock_response = ConversationResponse(
    id=uuid4(),
    is_group=False,
    # Missing: name, participants, created_at, etc.
)

# ValidationError: Field required: participants
```

**Solution**: Provide all required fields, use `None` for optional fields.

### ❌ Don't: Wrong Types

```python
# ❌ BAD: String UUID instead of UUID object
mock_response = ConversationResponse(
    id="123e4567-e89b-12d3-a456-426614174000",  # str, not UUID!
    is_group=False,
    ...
)

# ValidationError: id: Input should be a valid UUID object
```

**Solution**: Use actual UUID objects:
```python
from uuid import uuid4
mock_response = ConversationResponse(
    id=uuid4(),  # ✅ UUID object
    ...
)
```

### ❌ Don't: Mock BaseModel Methods

```python
# ❌ BAD: Mocking Pydantic model methods
mock_response = ConversationResponse(...)
mock_response.model_dump = MagicMock(return_value={})

# Don't mock Pydantic's built-in methods!
```

---

## Variations

### Variation 1: Mock Database Row with `spec=[]`

**Problem**: Database rows (SQLAlchemy) also need proper attribute access for Pydantic.

```python
# ❌ BAD: MagicMock wraps UUID in constructor
mock_row = MagicMock(user_id=uuid4())
# getattr(mock_row, "user_id") returns MagicMock, not UUID

# ✅ GOOD: Use spec=[] + configure_mock()
user_id = uuid4()
mock_row = MagicMock(spec=[])  # No spec = no wrapping
mock_row.configure_mock(
    user_id=user_id,  # Real UUID
    username="testuser",
    created_at=datetime.now(timezone.utc),
)
# getattr(mock_row, "user_id") returns actual UUID object ✓
```

### Variation 2: List of Pydantic Models

**Pattern**: Service returns `List[PydanticModel]`.

```python
# Create multiple Pydantic instances
from app.schemas.conversation import ConversationListResponse

mock_conversations = [
    ConversationResponse(
        id=uuid4(),
        is_group=False,
        ...
    )
    for _ in range(3)  # 3 conversations
]

# Mock method returning list
mock_list_method.return_value = ConversationListResponse(
    conversations=mock_conversations,
    total=3,
    has_next=False,
)
```

### Variation 3: Nested Pydantic Models

**Pattern**: Pydantic model contains other Pydantic models.

```python
from app.schemas.conversation import ConversationResponse, MessageResponse

# Create nested message
mock_message = MessageResponse(
    id=uuid4(),
    content="Hello!",
    sender_id=uuid4(),
    created_at=datetime.now(timezone.utc),
)

# Create parent conversation with nested message
mock_conversation = ConversationResponse(
    id=uuid4(),
    is_group=False,
    name=None,
    participants=[],
    last_message=mock_message.model_dump(),  # Nested as dict
    unread_count=1,
    created_at=datetime.now(timezone.utc),
    updated_at=datetime.now(timezone.utc),
    last_message_at=mock_message.created_at,
)
```

---

## Success Metrics

**ConversationService Gap 1** (Session: ConversationService, Commit: 5f6f26f8):
- **Coverage Gain**: 54% → 63% (+9pp)
- **Tests Added**: 9 tests
- **Time**: ~60 minutes (~20 minutes solving Pydantic validation, 40 minutes writing tests)
- **Key Win**: All tests passing with Pydantic strict validation

**FollowService Gap 3** (Session: FollowService, Commit: f39a43aa):
- **Coverage Gain**: 64% → 97% (+33pp!)
- **Tests Added**: 9 tests
- **Time**: ~60 minutes
- **Key Win**: spec=[] + configure_mock() pattern for database rows

**Pattern Effectiveness**:
- ✅ 100% success rate (2/2 sessions)
- ✅ Prevents ValidationError test failures
- ✅ Works with all Pydantic validation modes (strict, lax)
- ✅ Reusable for any service returning Pydantic models

---

## Troubleshooting

### Issue 1: UUID ValidationError

**Symptom**: `ValidationError: id: Input should be a valid UUID`

**Solution**: Ensure UUID is actual `uuid.UUID` object, not string.

```python
from uuid import uuid4

# ❌ BAD: String UUID
id="123e4567-e89b-12d3-a456-426614174000"

# ✅ GOOD: UUID object
id=uuid4()
```

### Issue 2: Datetime ValidationError

**Symptom**: `ValidationError: created_at: Input should be a valid datetime`

**Solution**: Use `datetime.now(timezone.utc)`, not naive datetime.

```python
from datetime import datetime, timezone

# ❌ BAD: Naive datetime
created_at=datetime.now()  # No timezone

# ✅ GOOD: Aware datetime
created_at=datetime.now(timezone.utc)
```

### Issue 3: Optional Fields Required

**Symptom**: `ValidationError: Field required: name`

**Solution**: Check schema - is field truly optional? Use `None` for optional fields.

```python
# Schema says Optional[str]
name: Optional[str]

# ✅ Provide None
mock_response = ConversationResponse(
    ...,
    name=None,  # Optional field
    ...
)
```

### Issue 4: MagicMock Still Wrapped

**Symptom**: Using `spec=[]` but values still wrapped in MagicMock.

**Solution**: Use `configure_mock()`, not constructor arguments.

```python
# ❌ BAD: Constructor wraps
mock = MagicMock(spec=[], id=uuid4())  # Still wraps!

# ✅ GOOD: configure_mock doesn't wrap
mock = MagicMock(spec=[])
mock.configure_mock(id=uuid4())  # Not wrapped
```

---

## When NOT to Use

- ❌ **Simple return values** - If method returns `int`, `str`, `bool`, use `MagicMock` (no Pydantic)
- ❌ **Non-Pydantic models** - SQLAlchemy models don't need Pydantic instances (use `MagicMock(spec=[])`)
- ❌ **Integration tests** - Use real Pydantic models from real service calls

---

## Related Patterns

- [AsyncMock Pattern](./asyncmock-pattern.md) - Mock async service methods returning Pydantic models
- [Conditional Import Patching](./conditional-import-patching.md) - Patch services that return Pydantic models
- [Helper Method Testing](./helper-method-testing.md) - Test helpers that build Pydantic responses

---

## References

- **Session**: ConversationService Gap 1 (Coverage: 54% → 63%, +9pp)
- **Commit**: 5f6f26f8
- **Time**: ~60 minutes (20 minutes solving validation, 40 minutes testing)
- **Pydantic Docs**: https://docs.pydantic.dev/latest/
- **Validation Modes**: https://docs.pydantic.dev/latest/concepts/validation_modes/
