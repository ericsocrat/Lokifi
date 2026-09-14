# Redis Caching Mocking Pattern

**Category**: Testing
**Difficulty**: 🟢 Beginner
**Success Rate**: 100% (1/1 sessions - NotificationService Gap 1)
**Impact**: 🎯 Medium (hybrid cache+DB services)
**Time Investment**: 20-30 minutes
**Sessions Used**: NotificationService Gap 1

---

## Problem

Services use Redis for caching to reduce database load. Testing requires mocking both cache hit (returns cached value) and cache miss (falls through to database) scenarios.

**Service Pattern**:
```python
async def get_unread_count(self, user_id: int) -> int:
    # Try cache first
    cached = await redis_client.get_cached_unread_count(user_id)
    if cached is not None:
        return cached  # Cache hit

    # Cache miss - query database
    count = await db.execute(select(func.count())).scalar()

    # Cache result
    await redis_client.cache_unread_count(user_id, count, ttl=300)
    return count
```

## Solution

**Pattern**: Patch Redis client, mock get/set methods with AsyncMock for both paths.

```python
# Test cache hit
with patch("app.services.notification_service.redis_client") as mock_redis:
    mock_redis.get_cached_unread_count = AsyncMock(return_value=5)

    result = await notification_service.get_unread_count(user_id)

    assert result == 5  # Returned from cache
    mock_redis.get_cached_unread_count.assert_called_once_with(user_id)
    # Database NOT queried

# Test cache miss
with patch("app.services.notification_service.redis_client") as mock_redis:
    mock_redis.get_cached_unread_count = AsyncMock(return_value=None)
    mock_redis.cache_unread_count = AsyncMock()
    mock_db.execute.return_value.scalar.return_value = 3

    result = await notification_service.get_unread_count(user_id)

    assert result == 3  # From database
    mock_redis.cache_unread_count.assert_called_once_with(user_id, 3, ttl=300)
```

## Complete Example

```python
from unittest.mock import patch, AsyncMock

class TestRedisCache:
    @pytest.mark.asyncio
    @patch("app.services.notification_service.redis_client")
    async def test_get_unread_count_cache_hit(self, mock_redis):
        """Should return cached value without DB query."""
        # Arrange
        mock_redis.get_cached_unread_count = AsyncMock(return_value=5)
        mock_db = AsyncMock()  # DB should NOT be called

        notification_service = NotificationService(db=mock_db)
        user_id = 123

        # Act
        result = await notification_service.get_unread_count(user_id)

        # Assert
        assert result == 5
        mock_redis.get_cached_unread_count.assert_called_once_with(user_id)
        mock_db.execute.assert_not_called()  # DB NOT queried ✓

    @pytest.mark.asyncio
    @patch("app.services.notification_service.redis_client")
    async def test_get_unread_count_cache_miss(self, mock_redis):
        """Should query DB on cache miss and cache result."""
        # Arrange
        mock_redis.get_cached_unread_count = AsyncMock(return_value=None)  # Miss
        mock_redis.cache_unread_count = AsyncMock()

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar.return_value = 3
        mock_db.execute.return_value = mock_result

        notification_service = NotificationService(db=mock_db)
        user_id = 123

        # Act
        result = await notification_service.get_unread_count(user_id)

        # Assert
        assert result == 3
        mock_redis.get_cached_unread_count.assert_called_once_with(user_id)
        mock_db.execute.assert_called_once()  # DB queried ✓
        mock_redis.cache_unread_count.assert_called_once_with(
            user_id, 3, ttl=300
        )

    @pytest.mark.asyncio
    @patch("app.services.notification_service.redis_client")
    async def test_cache_invalidation(self, mock_redis):
        """Should invalidate cache on state change."""
        # Arrange
        mock_redis.invalidate_unread_count = AsyncMock()
        mock_db = AsyncMock()

        notification_service = NotificationService(db=mock_db)
        user_id = 123
        notification_id = 456

        # Act - Mark notification as read
        await notification_service.mark_as_read(user_id, notification_id)

        # Assert - Cache invalidated
        mock_redis.invalidate_unread_count.assert_called_once_with(user_id)
```

## Anti-Patterns

### ❌ Don't: Only test cache hit

```python
# ❌ BAD: Missing cache miss path
async def test_get_unread_count():
    mock_redis.get_cached_unread_count = AsyncMock(return_value=5)
    # Only tests cache hit, DB query path untested!

# ✅ GOOD: Test both paths
async def test_cache_hit():
    mock_redis.get_cached_unread_count = AsyncMock(return_value=5)
async def test_cache_miss():
    mock_redis.get_cached_unread_count = AsyncMock(return_value=None)
```

### ❌ Don't: Forget TTL verification

```python
# ❌ BAD: Not verifying TTL
mock_redis.cache_unread_count.assert_called()

# ✅ GOOD: Verify TTL parameter
mock_redis.cache_unread_count.assert_called_once_with(user_id, 3, ttl=300)
```

## When to Use

- ✅ Services with Redis caching layer
- ✅ Cache-aside pattern (check cache → DB → cache result)
- ✅ Testing cache invalidation on mutations
- ❌ Pure database services (no cache)
- ❌ In-memory caches (functools.lru_cache - different pattern)

## References

- **Session**: NotificationService Gap 1
- **Commit**: f0b01734
- **Coverage**: +23pp
