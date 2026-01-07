"""
Tests for app.core.redis_client

Comprehensive tests for:
- RedisClient class (connection, basic operations, caching, pub/sub)
- Global redis_client instance
- Utility functions (initialize_redis, close_redis, get_redis_info)
"""

import json
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from redis.exceptions import ConnectionError as RedisConnectionError, RedisError

from app.core.redis_client import (
    RedisClient,
    close_redis,
    get_redis_info,
    initialize_redis,
    redis_client,
)

# ============================================================================
# RedisClient Initialization Tests
# ============================================================================


class TestRedisClientInit:
    """Tests for RedisClient initialization."""

    def test_init_default_state(self):
        """Test initial state after construction."""
        client = RedisClient()

        assert client.pool is None
        assert client.client is None
        assert client.connected is False
        assert client.connection_attempts == 0
        assert client.max_attempts == 3


class TestRedisClientInitialize:
    """Tests for RedisClient.initialize method."""

    @pytest.fixture
    def client(self):
        """Create fresh client instance."""
        return RedisClient()

    @pytest.mark.asyncio
    async def test_initialize_success(self, client):
        """Test successful initialization."""
        mock_redis = AsyncMock()
        mock_redis.ping = AsyncMock(return_value=True)

        with patch("app.core.redis_client.ConnectionPool") as mock_pool_cls:
            with patch("app.core.redis_client.redis.Redis") as mock_redis_cls:
                mock_pool = MagicMock()
                mock_pool_cls.from_url.return_value = mock_pool
                mock_redis_cls.return_value = mock_redis

                result = await client.initialize()

                assert result is True
                assert client.connected is True
                assert client.pool is mock_pool
                mock_redis.ping.assert_called_once()

    @pytest.mark.asyncio
    async def test_initialize_connection_error(self, client):
        """Test initialization with connection error."""
        with patch("app.core.redis_client.ConnectionPool") as mock_pool_cls:
            with patch("app.core.redis_client.redis.Redis") as mock_redis_cls:
                mock_redis = AsyncMock()
                mock_redis.ping = AsyncMock(side_effect=RedisConnectionError("Failed"))
                mock_pool_cls.from_url.return_value = MagicMock()
                mock_redis_cls.return_value = mock_redis

                result = await client.initialize()

                assert result is False
                assert client.connection_attempts == 1
                assert client.connected is False

    @pytest.mark.asyncio
    async def test_initialize_max_attempts_reached(self, client):
        """Test initialization exhausts max attempts."""
        client.connection_attempts = 2  # Already at 2 attempts

        with patch("app.core.redis_client.ConnectionPool") as mock_pool_cls:
            with patch("app.core.redis_client.redis.Redis") as mock_redis_cls:
                mock_redis = AsyncMock()
                mock_redis.ping = AsyncMock(side_effect=RedisError("Failed"))
                mock_pool_cls.from_url.return_value = MagicMock()
                mock_redis_cls.return_value = mock_redis

                result = await client.initialize()

                assert result is False
                assert client.connection_attempts == 3
                assert client.connected is False


class TestRedisClientClose:
    """Tests for RedisClient.close method."""

    @pytest.mark.asyncio
    async def test_close_with_client(self):
        """Test close with active client."""
        client = RedisClient()
        client.client = AsyncMock()
        client.pool = AsyncMock()
        client.connected = True

        await client.close()

        client.client.close.assert_called_once()
        client.pool.disconnect.assert_called_once()
        assert client.connected is False

    @pytest.mark.asyncio
    async def test_close_without_client(self):
        """Test close without active client."""
        client = RedisClient()

        # Should not raise
        await client.close()

        assert client.connected is False


class TestRedisClientIsAvailable:
    """Tests for RedisClient.is_available method."""

    @pytest.fixture
    def client(self):
        """Create client instance."""
        return RedisClient()

    @pytest.mark.asyncio
    async def test_is_available_not_connected(self, client):
        """Test is_available when not connected."""
        client.connected = False

        result = await client.is_available()

        assert result is False

    @pytest.mark.asyncio
    async def test_is_available_no_client(self, client):
        """Test is_available without client."""
        client.connected = True
        client.client = None

        result = await client.is_available()

        assert result is False

    @pytest.mark.asyncio
    async def test_is_available_ping_success(self, client):
        """Test is_available with successful ping."""
        client.connected = True
        client.client = AsyncMock()
        client.client.ping = AsyncMock(return_value=True)

        result = await client.is_available()

        assert result is True

    @pytest.mark.asyncio
    async def test_is_available_ping_failure(self, client):
        """Test is_available with ping failure."""
        client.connected = True
        client.client = AsyncMock()
        client.client.ping = AsyncMock(side_effect=RedisConnectionError("Failed"))

        result = await client.is_available()

        assert result is False
        assert client.connected is False


# ============================================================================
# Basic Redis Operations Tests
# ============================================================================


class TestRedisClientSet:
    """Tests for RedisClient.set method."""

    @pytest.fixture
    def client(self):
        """Create connected client."""
        c = RedisClient()
        c.connected = True
        c.client = AsyncMock()
        c.client.ping = AsyncMock(return_value=True)
        return c

    @pytest.mark.asyncio
    async def test_set_with_ttl(self, client):
        """Test set with TTL."""
        result = await client.set("key", "value", ttl=3600)

        assert result is True
        client.client.setex.assert_called_once_with("key", 3600, "value")

    @pytest.mark.asyncio
    async def test_set_with_expire(self, client):
        """Test set with expire parameter."""
        result = await client.set("key", "value", expire=1800)

        assert result is True
        client.client.setex.assert_called_once_with("key", 1800, "value")

    @pytest.mark.asyncio
    async def test_set_without_ttl(self, client):
        """Test set without TTL."""
        result = await client.set("key", "value")

        assert result is True
        client.client.set.assert_called_once_with("key", "value")

    @pytest.mark.asyncio
    async def test_set_not_available(self):
        """Test set when Redis unavailable."""
        client = RedisClient()
        client.connected = False

        result = await client.set("key", "value")

        assert result is False

    @pytest.mark.asyncio
    async def test_set_error(self, client):
        """Test set with error."""
        client.client.set = AsyncMock(side_effect=Exception("Error"))

        result = await client.set("key", "value")

        assert result is False


class TestRedisClientGet:
    """Tests for RedisClient.get method."""

    @pytest.fixture
    def client(self):
        """Create connected client."""
        c = RedisClient()
        c.connected = True
        c.client = AsyncMock()
        c.client.ping = AsyncMock(return_value=True)
        return c

    @pytest.mark.asyncio
    async def test_get_bytes_value(self, client):
        """Test get returns decoded bytes."""
        client.client.get = AsyncMock(return_value=b"value")

        result = await client.get("key")

        assert result == "value"

    @pytest.mark.asyncio
    async def test_get_string_value(self, client):
        """Test get returns string as-is."""
        client.client.get = AsyncMock(return_value="value")

        result = await client.get("key")

        assert result == "value"

    @pytest.mark.asyncio
    async def test_get_not_found(self, client):
        """Test get returns None for missing key."""
        client.client.get = AsyncMock(return_value=None)

        result = await client.get("missing")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_not_available(self):
        """Test get when Redis unavailable."""
        client = RedisClient()
        client.connected = False

        result = await client.get("key")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_error(self, client):
        """Test get with error."""
        client.client.get = AsyncMock(side_effect=Exception("Error"))

        result = await client.get("key")

        assert result is None


# ============================================================================
# Notification Caching Tests
# ============================================================================


class TestCacheNotification:
    """Tests for notification caching methods."""

    @pytest.fixture
    def client(self):
        """Create connected client."""
        c = RedisClient()
        c.connected = True
        c.client = AsyncMock()
        c.client.ping = AsyncMock(return_value=True)
        return c

    @pytest.mark.asyncio
    async def test_cache_notification(self, client):
        """Test cache_notification."""
        notification_data = {"type": "alert", "message": "Test"}

        await client.cache_notification("notif-123", notification_data, ttl=3600)

        client.client.setex.assert_called_once()
        call_args = client.client.setex.call_args
        assert call_args[0][0] == "notification:notif-123"
        assert call_args[0][1] == 3600

    @pytest.mark.asyncio
    async def test_cache_notification_not_available(self):
        """Test cache_notification when unavailable."""
        client = RedisClient()
        client.connected = False

        # Should not raise
        await client.cache_notification("notif-123", {"data": "test"})

    @pytest.mark.asyncio
    async def test_cache_notification_error(self, client):
        """Test cache_notification with error."""
        client.client.setex = AsyncMock(side_effect=RedisError("Error"))

        # Should not raise
        await client.cache_notification("notif-123", {"data": "test"})

    @pytest.mark.asyncio
    async def test_get_cached_notification_success(self, client):
        """Test get_cached_notification success."""
        cached = json.dumps({"type": "alert", "message": "Test"})
        client.client.get = AsyncMock(return_value=cached.encode())

        result = await client.get_cached_notification("notif-123")

        assert result == {"type": "alert", "message": "Test"}

    @pytest.mark.asyncio
    async def test_get_cached_notification_not_found(self, client):
        """Test get_cached_notification not found."""
        client.client.get = AsyncMock(return_value=None)

        result = await client.get_cached_notification("notif-123")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_cached_notification_json_error(self, client):
        """Test get_cached_notification with invalid JSON."""
        client.client.get = AsyncMock(return_value=b"invalid json")

        result = await client.get_cached_notification("notif-123")

        assert result is None


class TestCacheUnreadCount:
    """Tests for unread count caching."""

    @pytest.fixture
    def client(self):
        """Create connected client."""
        c = RedisClient()
        c.connected = True
        c.client = AsyncMock()
        c.client.ping = AsyncMock(return_value=True)
        return c

    @pytest.mark.asyncio
    async def test_cache_unread_count(self, client):
        """Test cache_unread_count."""
        await client.cache_unread_count("user-123", 5, ttl=300)

        client.client.setex.assert_called_once_with("unread_count:user-123", 300, 5)

    @pytest.mark.asyncio
    async def test_get_cached_unread_count_success(self, client):
        """Test get_cached_unread_count success."""
        client.client.get = AsyncMock(return_value=b"10")

        result = await client.get_cached_unread_count("user-123")

        assert result == 10

    @pytest.mark.asyncio
    async def test_get_cached_unread_count_not_found(self, client):
        """Test get_cached_unread_count not found."""
        client.client.get = AsyncMock(return_value=None)

        result = await client.get_cached_unread_count("user-123")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_cached_unread_count_invalid(self, client):
        """Test get_cached_unread_count with invalid value."""
        client.client.get = AsyncMock(return_value=b"not-a-number")

        result = await client.get_cached_unread_count("user-123")

        assert result is None


class TestInvalidateUserCache:
    """Tests for cache invalidation."""

    @pytest.fixture
    def client(self):
        """Create connected client."""
        c = RedisClient()
        c.connected = True
        c.client = AsyncMock()
        c.client.ping = AsyncMock(return_value=True)
        return c

    @pytest.mark.asyncio
    async def test_invalidate_user_cache(self, client):
        """Test invalidate_user_cache."""
        client.client.keys = AsyncMock(return_value=[b"key1", b"key2"])
        client.client.delete = AsyncMock()

        await client.invalidate_user_cache("user-123")

        client.client.keys.assert_called_once_with("*:user-123")
        client.client.delete.assert_called_once_with(b"key1", b"key2")

    @pytest.mark.asyncio
    async def test_invalidate_user_cache_no_keys(self, client):
        """Test invalidate_user_cache with no keys."""
        client.client.keys = AsyncMock(return_value=[])
        client.client.delete = AsyncMock()

        await client.invalidate_user_cache("user-123")

        client.client.delete.assert_not_called()


# ============================================================================
# Pub/Sub Tests
# ============================================================================


class TestPubSub:
    """Tests for Pub/Sub methods."""

    @pytest.fixture
    def client(self):
        """Create connected client."""
        c = RedisClient()
        c.connected = True
        c.client = AsyncMock()
        c.client.ping = AsyncMock(return_value=True)
        return c

    @pytest.mark.asyncio
    async def test_publish(self, client):
        """Test publish method."""
        client.client.publish = AsyncMock(return_value=1)

        result = await client.publish("channel", "message")

        assert result == 1
        client.client.publish.assert_called_once_with("channel", "message")

    @pytest.mark.asyncio
    async def test_publish_not_available(self):
        """Test publish when unavailable."""
        client = RedisClient()
        client.connected = False

        result = await client.publish("channel", "message")

        assert result == 0

    @pytest.mark.asyncio
    async def test_publish_error(self, client):
        """Test publish with error."""
        client.client.publish = AsyncMock(side_effect=RedisError("Error"))

        result = await client.publish("channel", "message")

        assert result == 0

    @pytest.mark.asyncio
    async def test_publish_notification(self, client):
        """Test publish_notification."""
        notification = {"type": "alert", "data": "test"}
        client.client.publish = AsyncMock()

        await client.publish_notification("user-123", notification)

        client.client.publish.assert_called_once()
        call_args = client.client.publish.call_args
        assert call_args[0][0] == "notifications:user-123"

    @pytest.mark.asyncio
    async def test_subscribe_to_notifications(self, client):
        """Test subscribe_to_notifications."""
        mock_pubsub = AsyncMock()
        client.client.pubsub = MagicMock(return_value=mock_pubsub)

        result = await client.subscribe_to_notifications("user-123")

        assert result == mock_pubsub
        mock_pubsub.subscribe.assert_called_once_with("notifications:user-123")

    @pytest.mark.asyncio
    async def test_subscribe_to_notifications_error(self, client):
        """Test subscribe_to_notifications with error."""
        mock_pubsub = AsyncMock()
        mock_pubsub.subscribe = AsyncMock(side_effect=RedisError("Error"))
        client.client.pubsub = MagicMock(return_value=mock_pubsub)

        result = await client.subscribe_to_notifications("user-123")

        assert result is None


# ============================================================================
# Rate Limiting Tests
# ============================================================================


class TestRateLimiting:
    """Tests for rate limiting methods."""

    @pytest.fixture
    def client(self):
        """Create connected client."""
        c = RedisClient()
        c.connected = True
        c.client = AsyncMock()
        c.client.ping = AsyncMock(return_value=True)
        return c

    @pytest.mark.asyncio
    async def test_check_rate_limit_first_request(self, client):
        """Test rate limit first request."""
        client.client.incr = AsyncMock(return_value=1)
        client.client.expire = AsyncMock()

        result = await client.check_rate_limit("key", limit=10, window=60)

        assert result is True
        client.client.incr.assert_called_once_with("key")
        client.client.expire.assert_called_once_with("key", 60)

    @pytest.mark.asyncio
    async def test_check_rate_limit_within_limit(self, client):
        """Test rate limit within limit."""
        client.client.incr = AsyncMock(return_value=5)

        result = await client.check_rate_limit("key", limit=10, window=60)

        assert result is True

    @pytest.mark.asyncio
    async def test_check_rate_limit_exceeded(self, client):
        """Test rate limit exceeded."""
        client.client.incr = AsyncMock(return_value=11)

        result = await client.check_rate_limit("key", limit=10, window=60)

        assert result is False

    @pytest.mark.asyncio
    async def test_check_rate_limit_not_available(self):
        """Test rate limit when unavailable (allows)."""
        client = RedisClient()
        client.connected = False

        result = await client.check_rate_limit("key", limit=10, window=60)

        assert result is True

    @pytest.mark.asyncio
    async def test_check_rate_limit_error(self, client):
        """Test rate limit with error (allows)."""
        client.client.incr = AsyncMock(side_effect=RedisError("Error"))

        result = await client.check_rate_limit("key", limit=10, window=60)

        assert result is True


# ============================================================================
# WebSocket Session Tests
# ============================================================================


class TestWebSocketSessions:
    """Tests for WebSocket session management."""

    @pytest.fixture
    def client(self):
        """Create connected client."""
        c = RedisClient()
        c.connected = True
        c.client = AsyncMock()
        c.client.ping = AsyncMock(return_value=True)
        return c

    @pytest.mark.asyncio
    async def test_store_websocket_session(self, client):
        """Test store_websocket_session."""
        metadata = {"ip": "127.0.0.1"}

        await client.store_websocket_session("user-123", "conn-456", metadata)

        client.client.hset.assert_called_once()
        call_args = client.client.hset.call_args
        assert call_args[0][0] == "websocket_sessions:user-123"
        assert call_args[0][1] == "conn-456"

    @pytest.mark.asyncio
    async def test_remove_websocket_session(self, client):
        """Test remove_websocket_session."""
        await client.remove_websocket_session("user-123", "conn-456")

        client.client.hdel.assert_called_once_with(
            "websocket_sessions:user-123", "conn-456"
        )

    @pytest.mark.asyncio
    async def test_get_user_websocket_sessions(self, client):
        """Test get_user_websocket_sessions."""
        sessions = {
            b"conn-1": json.dumps({"ip": "127.0.0.1"}).encode(),
            b"conn-2": json.dumps({"ip": "192.168.1.1"}).encode(),
        }
        client.client.hgetall = AsyncMock(return_value=sessions)

        result = await client.get_user_websocket_sessions("user-123")

        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_get_user_websocket_sessions_error(self, client):
        """Test get_user_websocket_sessions with error."""
        client.client.hgetall = AsyncMock(side_effect=RedisError("Error"))

        result = await client.get_user_websocket_sessions("user-123")

        assert result == []

    @pytest.mark.asyncio
    async def test_add_websocket_session(self, client):
        """Test add_websocket_session."""
        await client.add_websocket_session("user-123", "sess-456", {"ip": "127.0.0.1"})

        client.client.hset.assert_called_once()

    @pytest.mark.asyncio
    async def test_add_websocket_session_default_metadata(self, client):
        """Test add_websocket_session with default metadata."""
        await client.add_websocket_session("user-123", "sess-456")

        client.client.hset.assert_called_once()
        call_args = client.client.hset.call_args
        # Verify metadata contains connected_at
        metadata_json = call_args[0][2]
        metadata = json.loads(metadata_json)
        assert "connected_at" in metadata

    @pytest.mark.asyncio
    async def test_get_websocket_sessions(self, client):
        """Test get_websocket_sessions returns session IDs."""
        sessions = {b"sess-1": b"data1", b"sess-2": b"data2"}
        client.client.hgetall = AsyncMock(return_value=sessions)

        result = await client.get_websocket_sessions("user-123")

        assert "sess-1" in result
        assert "sess-2" in result

    @pytest.mark.asyncio
    async def test_get_websocket_sessions_string_keys(self, client):
        """Test get_websocket_sessions with string keys."""
        sessions = {"sess-1": "data1", "sess-2": "data2"}
        client.client.hgetall = AsyncMock(return_value=sessions)

        result = await client.get_websocket_sessions("user-123")

        assert "sess-1" in result
        assert "sess-2" in result


# ============================================================================
# Global Instance Tests
# ============================================================================


class TestGlobalRedisClient:
    """Tests for global redis_client instance."""

    def test_global_instance_exists(self):
        """Test global instance exists."""
        assert redis_client is not None
        assert isinstance(redis_client, RedisClient)


# ============================================================================
# Utility Function Tests
# ============================================================================


class TestUtilityFunctions:
    """Tests for utility functions."""

    @pytest.mark.asyncio
    async def test_initialize_redis(self):
        """Test initialize_redis calls client.initialize."""
        with patch.object(redis_client, "initialize", AsyncMock(return_value=True)):
            result = await initialize_redis()

            assert result is True
            redis_client.initialize.assert_called_once()

    @pytest.mark.asyncio
    async def test_close_redis(self):
        """Test close_redis calls client.close."""
        with patch.object(redis_client, "close", AsyncMock()):
            await close_redis()

            redis_client.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_redis_info(self):
        """Test get_redis_info returns connection info."""
        with patch.object(redis_client, "is_available", AsyncMock(return_value=True)):
            redis_client.connected = True
            redis_client.connection_attempts = 1

            result = await get_redis_info()

            assert result["connected"] is True
            assert result["attempts"] == 1
            assert result["available"] is True
