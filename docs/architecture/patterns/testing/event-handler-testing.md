# Event Handler Testing Pattern

**Category**: Testing
**Difficulty**: 🟡 Intermediate
**Success Rate**: 100% (1/1 sessions - NotificationService Gap 3)
**Impact**: 🎯 High (event-driven architectures)
**Time Investment**: 30-45 minutes
**Sessions Used**: NotificationService Gap 3

---

## Problem

Event-driven systems allow registering async/sync handlers that execute on events. Testing requires verifying handlers are called correctly and errors don't crash the system.

**Event System Pattern**:
```python
class NotificationService:
    def __init__(self):
        self._handlers: Dict[NotificationEvent, List[Callable]] = defaultdict(list)

    def add_event_handler(self, event: NotificationEvent, handler: Callable):
        self._handlers[event].append(handler)

    async def _emit_event(self, event: NotificationEvent, data: dict):
        for handler in self._handlers[event]:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(data)
                else:
                    handler(data)
            except Exception as e:
                logger.error(f"Handler error: {e}")  # Don't crash!
```

## Solution

**Pattern**: Register mock handlers (AsyncMock, Mock, faulty), emit events, verify calls and error isolation.

```python
# Register handlers
async_handler = AsyncMock()
sync_handler = Mock()
faulty_handler = Mock(side_effect=Exception("Handler error"))

notification_service.add_event_handler(NotificationEvent.CREATED, async_handler)
notification_service.add_event_handler(NotificationEvent.READ, sync_handler)
notification_service.add_event_handler(NotificationEvent.DISMISSED, faulty_handler)

# Test async handler
await notification_service._emit_event(NotificationEvent.CREATED, {"id": 1})
async_handler.assert_called_once_with({"id": 1})

# Test sync handler
await notification_service._emit_event(NotificationEvent.READ, {"id": 2})
sync_handler.assert_called_once_with({"id": 2})

# Test faulty handler (should not crash)
await notification_service._emit_event(NotificationEvent.DISMISSED, {"id": 3})
# No exception raised ✓
```

## Complete Example

```python
from unittest.mock import Mock, AsyncMock
from app.services.notification_service import NotificationEvent

class TestEventHandlers:
    @pytest.mark.asyncio
    async def test_async_handler_called(self):
        """Should call async event handlers."""
        # Arrange
        notification_service = NotificationService(db=mock_db)
        async_handler = AsyncMock()

        notification_service.add_event_handler(
            NotificationEvent.CREATED,
            async_handler
        )

        event_data = {"notification_id": 123, "user_id": 456}

        # Act
        await notification_service._emit_event(
            NotificationEvent.CREATED,
            event_data
        )

        # Assert
        async_handler.assert_called_once_with(event_data)

    @pytest.mark.asyncio
    async def test_sync_handler_called(self):
        """Should call synchronous event handlers."""
        # Arrange
        sync_handler = Mock()
        notification_service.add_event_handler(
            NotificationEvent.READ,
            sync_handler
        )

        event_data = {"notification_id": 123}

        # Act
        await notification_service._emit_event(
            NotificationEvent.READ,
            event_data
        )

        # Assert
        sync_handler.assert_called_once_with(event_data)

    @pytest.mark.asyncio
    async def test_handler_error_doesnt_crash(self):
        """Should handle faulty handlers gracefully."""
        # Arrange
        faulty_handler = Mock(side_effect=Exception("Boom!"))
        working_handler = Mock()

        notification_service.add_event_handler(
            NotificationEvent.DISMISSED,
            faulty_handler
        )
        notification_service.add_event_handler(
            NotificationEvent.DISMISSED,
            working_handler
        )

        # Act - Should not raise exception
        await notification_service._emit_event(
            NotificationEvent.DISMISSED,
            {"id": 1}
        )

        # Assert - Both handlers called despite first error
        faulty_handler.assert_called_once()
        working_handler.assert_called_once()

    @pytest.mark.asyncio
    async def test_multiple_handlers_same_event(self):
        """Should call all handlers for same event."""
        # Arrange
        handler1 = AsyncMock()
        handler2 = Mock()
        handler3 = AsyncMock()

        for handler in [handler1, handler2, handler3]:
            notification_service.add_event_handler(
                NotificationEvent.DELIVERED,
                handler
            )

        # Act
        await notification_service._emit_event(
            NotificationEvent.DELIVERED,
            {"id": 1}
        )

        # Assert - All 3 called
        handler1.assert_called_once()
        handler2.assert_called_once()
        handler3.assert_called_once()

    @pytest.mark.asyncio
    async def test_remove_event_handler(self):
        """Should remove handler from event."""
        # Arrange
        handler = Mock()
        notification_service.add_event_handler(
            NotificationEvent.CREATED,
            handler
        )

        # Act - Remove handler
        notification_service.remove_event_handler(
            NotificationEvent.CREATED,
            handler
        )

        await notification_service._emit_event(
            NotificationEvent.CREATED,
            {"id": 1}
        )

        # Assert - Handler NOT called
        handler.assert_not_called()
```

## Anti-Patterns

### ❌ Don't: Use MagicMock for async handlers

```python
# ❌ BAD: MagicMock can't be awaited
async_handler = MagicMock()

# TypeError: object MagicMock can't be used in 'await' expression

# ✅ GOOD: Use AsyncMock
async_handler = AsyncMock()
```

### ❌ Don't: Expect errors to crash

```python
# ❌ BAD: Testing that exception propagates
with pytest.raises(Exception):
    await service._emit_event(...)

# Event systems should catch errors!

# ✅ GOOD: Verify no crash, handler still called
await service._emit_event(...)  # Doesn't raise
faulty_handler.assert_called_once()
```

### ❌ Don't: Forget to test handler removal

```python
# ❌ INCOMPLETE: Only testing add, not remove
async def test_add_handler(): ...

# ✅ COMPLETE: Test full lifecycle
async def test_add_handler(): ...
async def test_remove_handler(): ...
```

## Variations

### Variation 1: Priority-Based Handlers

**Pattern**: Handlers execute in priority order.

```python
# Service code
handlers = sorted(handlers, key=lambda h: h.priority, reverse=True)

# Test code
high_priority = AsyncMock()
high_priority.priority = 10
low_priority = AsyncMock()
low_priority.priority = 1

# Verify call order
assert high_priority.called_before(low_priority)
```

### Variation 2: Conditional Event Emission

**Pattern**: Events only emitted if conditions met.

```python
# Service code
if notification.priority == NotificationPriority.URGENT:
    await self._emit_event(NotificationEvent.URGENT_CREATED, data)
else:
    await self._emit_event(NotificationEvent.CREATED, data)

# Test code - Verify correct event emitted
urgent_handler = AsyncMock()
normal_handler = AsyncMock()

service.add_event_handler(NotificationEvent.URGENT_CREATED, urgent_handler)
service.add_event_handler(NotificationEvent.CREATED, normal_handler)

# Urgent notification
await service.create_notification(priority=NotificationPriority.URGENT)
urgent_handler.assert_called_once()
normal_handler.assert_not_called()
```

## When to Use

- ✅ Event-driven architectures (pub/sub)
- ✅ Plugin systems with hooks
- ✅ Observable patterns (notify on state change)
- ✅ Webhook/callback systems
- ❌ Simple function calls (no event system)

## References

- **Session**: NotificationService Gap 3
- **Commit**: ccb1d665
- **Coverage**: +29pp
