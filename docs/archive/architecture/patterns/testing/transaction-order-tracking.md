# Transaction Order Tracking Pattern

**Category**: Testing
**Difficulty**: 🟡 Intermediate
**Success Rate**: 100% (1/1 sessions - ConversationService Gap 1)
**Impact**: 🎯 Medium (verifies transaction safety)
**Time Investment**: 15-20 minutes
**Sessions Used**: ConversationService Gap 1

---

## Problem

Database transactions execute multiple operations (add, flush, commit, refresh) in specific order. Testing requires verifying this exact sequence to ensure transaction safety.

## Solution

**Pattern**: Use `side_effect` to track call order across multiple mocked methods.

```python
# Track transaction operation sequence
call_order = []
mock_db.add = MagicMock(side_effect=lambda obj: call_order.append(("add", obj)))
mock_db.flush = AsyncMock(side_effect=lambda: call_order.append(("flush", None)))
mock_db.commit = AsyncMock(side_effect=lambda: call_order.append(("commit", None)))

# Execute service method
await conversation_service.create_conversation(...)

# Verify exact transaction order
assert call_order[0][0] == "add"     # Add conversation
assert call_order[1][0] == "flush"   # Flush to get ID
assert call_order[2][0] == "add"     # Add participant 1
assert call_order[3][0] == "add"     # Add participant 2
assert call_order[4][0] == "commit"  # Commit transaction
```

## Complete Example

```python
class TestConversationTransactionOrder:
    @pytest.mark.asyncio
    async def test_create_dm_conversation_transaction_order(self):
        """Verify transaction operations execute in correct order."""
        # Arrange
        call_order = []
        mock_db = AsyncMock()

        # Track add operations
        mock_db.add = MagicMock(
            side_effect=lambda obj: call_order.append(("add", type(obj).__name__))
        )

        # Track async operations
        mock_db.flush = AsyncMock(
            side_effect=lambda: call_order.append(("flush", None))
        )
        mock_db.commit = AsyncMock(
            side_effect=lambda: call_order.append(("commit", None))
        )
        mock_db.refresh = AsyncMock(
            side_effect=lambda obj: call_order.append(("refresh", type(obj).__name__))
        )

        conversation_service = ConversationService(db=mock_db)

        # Act
        await conversation_service.create_dm_conversation(user_id, other_user_id)

        # Assert transaction order
        assert call_order == [
            ("add", "Conversation"),
            ("flush", None),
            ("refresh", "Conversation"),  # Get auto-generated ID
            ("add", "ConversationParticipant"),
            ("add", "ConversationParticipant"),
            ("commit", None),
        ]
```

## Anti-Patterns

### ❌ Don't: Only check call counts

```python
# ❌ BAD: Doesn't verify order
assert mock_db.add.call_count == 3
assert mock_db.commit.called

# ✅ GOOD: Verify exact sequence
assert call_order == [("add", ...), ("flush", ...), ("commit", ...)]
```

## When to Use

- ✅ Testing transaction-heavy operations (create, update, delete)
- ✅ Verifying flush before accessing auto-generated IDs
- ✅ Ensuring commit happens after all additions
- ❌ Simple CRUD without transaction complexity

## References

- **Session**: ConversationService Gap 1
- **Commit**: 5f6f26f8
- **Coverage**: +9pp
