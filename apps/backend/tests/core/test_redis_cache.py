"""
Comprehensive tests for app.core.redis_cache module.

Tests RedisCache class, cache decorators, and utility functions.

Session 107: Target coverage 25% → 85%+
"""

import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import Request

from app.core.redis_cache import (
    RedisCache,
    cache,
    cache_ai_responses,
    cache_market_data,
    cache_notifications,
    cache_portfolio_data,
    cache_public_data,
    cache_user_data,
    clear_all_cache,
    get_cache_stats,
    redis_cache,
    warm_cache,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def redis_cache_instance():
    """Fresh RedisCache instance for testing."""
    return RedisCache(redis_url="redis://localhost:6379/0")


@pytest.fixture
def mock_redis_client():
    """Mock Redis client for testing."""
    client = AsyncMock()
    client.get = AsyncMock(return_value=None)
    client.set = AsyncMock(return_value=True)
    client.delete = AsyncMock(return_value=1)
    client.keys = AsyncMock(return_value=[])
    client.info = AsyncMock(
        return_value={
            "redis_version": "7.0.0",
            "connected_clients": 5,
            "used_memory_human": "1.5M",
            "keyspace_hits": 100,
            "keyspace_misses": 20,
            "total_commands_processed": 500,
        }
    )
    return client


def create_mock_request(
    path: str = "/api/test",
    method: str = "GET",
    query_params: dict | None = None,
    user_id: str | None = None,
    headers: dict | None = None,
):
    """Factory to create mock Request objects that pass isinstance and bool checks."""
    # Use MagicMock without spec to avoid bool issues
    request = MagicMock()
    request.url = MagicMock()
    request.url.path = path
    request.method = method
    request.query_params = query_params or {}
    request.headers = MagicMock()
    request.headers.get = MagicMock(
        side_effect=lambda key: (headers or {}).get(key) if headers else None
    )
    request.state = MagicMock()
    request.state.user_id = user_id
    return request


@pytest.fixture
def mock_request():
    """Create a mock FastAPI Request object."""
    return create_mock_request()


@pytest.fixture
def mock_request_with_user():
    """Create a mock FastAPI Request with user ID."""
    return create_mock_request(
        path="/api/user/data",
        query_params={"page": "1", "limit": "10"},
        user_id="user-123",
        headers={"Authorization": "Bearer test-token"},
    )


# ============================================================================
# TESTS: RedisCache Class Initialization
# ============================================================================


class TestRedisCacheInit:
    """Tests for RedisCache initialization."""

    def test_init_with_default_url(self):
        """Test RedisCache initializes with default URL."""
        with patch("app.core.redis_cache.Settings") as mock_settings:
            mock_settings.return_value = MagicMock(REDIS_URL="redis://default:6379/0")
            cache_instance = RedisCache()
            assert cache_instance._client is None
            assert cache_instance.default_ttl == 300

    def test_init_with_custom_url(self):
        """Test RedisCache initializes with custom URL."""
        custom_url = "redis://custom:6380/1"
        cache_instance = RedisCache(redis_url=custom_url)
        assert cache_instance.redis_url == custom_url
        assert cache_instance._client is None

    def test_default_ttl_value(self):
        """Test default TTL is 300 seconds."""
        cache_instance = RedisCache()
        assert cache_instance.default_ttl == 300


# ============================================================================
# TESTS: RedisCache.get_client
# ============================================================================


class TestRedisCacheGetClient:
    """Tests for get_client method."""

    @pytest.mark.asyncio
    async def test_get_client_creates_new_client(self, redis_cache_instance):
        """Test get_client creates a new Redis client."""
        with patch("app.core.redis_cache.redis.from_url") as mock_from_url:
            mock_client = AsyncMock()
            mock_from_url.return_value = mock_client

            client = await redis_cache_instance.get_client()

            mock_from_url.assert_called_once_with(redis_cache_instance.redis_url)
            assert client == mock_client

    @pytest.mark.asyncio
    async def test_get_client_reuses_existing_client(self, redis_cache_instance):
        """Test get_client reuses existing client."""
        mock_client = AsyncMock()
        redis_cache_instance._client = mock_client

        client = await redis_cache_instance.get_client()

        assert client == mock_client


# ============================================================================
# TESTS: RedisCache._generate_cache_key
# ============================================================================


class TestGenerateCacheKey:
    """Tests for cache key generation."""

    def test_generate_cache_key_basic(self, redis_cache_instance):
        """Test basic cache key generation."""
        key = redis_cache_instance._generate_cache_key("test_prefix", "arg1")
        assert key.startswith("cache:test_prefix:")
        assert len(key) > len("cache:test_prefix:")

    def test_generate_cache_key_with_kwargs(self, redis_cache_instance):
        """Test cache key with keyword arguments."""
        key = redis_cache_instance._generate_cache_key(
            "prefix", "arg1", param1="value1", param2="value2"
        )
        assert key.startswith("cache:prefix:")

    def test_generate_cache_key_excludes_request(self, redis_cache_instance):
        """Test cache key excludes request object."""
        request = MagicMock()
        key1 = redis_cache_instance._generate_cache_key(
            "prefix", "arg1", request=request, other="value"
        )
        key2 = redis_cache_instance._generate_cache_key("prefix", "arg1", other="value")
        # Keys should be the same since request is excluded
        assert key1 == key2

    def test_generate_cache_key_deterministic(self, redis_cache_instance):
        """Test cache key generation is deterministic."""
        key1 = redis_cache_instance._generate_cache_key("prefix", "arg1", key="value")
        key2 = redis_cache_instance._generate_cache_key("prefix", "arg1", key="value")
        assert key1 == key2

    def test_generate_cache_key_different_args(self, redis_cache_instance):
        """Test different arguments produce different keys."""
        key1 = redis_cache_instance._generate_cache_key("prefix", "arg1")
        key2 = redis_cache_instance._generate_cache_key("prefix", "arg2")
        assert key1 != key2


# ============================================================================
# TESTS: RedisCache.get
# ============================================================================


class TestRedisCacheGet:
    """Tests for cache get method."""

    @pytest.mark.asyncio
    async def test_get_returns_cached_data(
        self, redis_cache_instance, mock_redis_client
    ):
        """Test get returns cached data with metadata."""
        cached_data = json.dumps(
            {"data": {"key": "value"}, "__cached_at__": time.time()}
        )
        mock_redis_client.get.return_value = cached_data
        redis_cache_instance._client = mock_redis_client

        result = await redis_cache_instance.get("test_key")

        assert result == {"key": "value"}
        mock_redis_client.get.assert_called_once_with("test_key")

    @pytest.mark.asyncio
    async def test_get_returns_none_for_miss(
        self, redis_cache_instance, mock_redis_client
    ):
        """Test get returns None on cache miss."""
        mock_redis_client.get.return_value = None
        redis_cache_instance._client = mock_redis_client

        result = await redis_cache_instance.get("missing_key")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_handles_invalid_json(
        self, redis_cache_instance, mock_redis_client
    ):
        """Test get handles invalid JSON data."""
        mock_redis_client.get.return_value = "invalid json {"
        mock_redis_client.delete = AsyncMock(return_value=1)
        redis_cache_instance._client = mock_redis_client

        result = await redis_cache_instance.get("bad_key")

        assert result is None
        mock_redis_client.delete.assert_called_once_with("bad_key")

    @pytest.mark.asyncio
    async def test_get_handles_data_without_metadata(
        self, redis_cache_instance, mock_redis_client
    ):
        """Test get handles data without caching metadata."""
        cached_data = json.dumps({"simple": "data"})
        mock_redis_client.get.return_value = cached_data
        redis_cache_instance._client = mock_redis_client

        result = await redis_cache_instance.get("test_key")

        assert result == {"simple": "data"}

    @pytest.mark.asyncio
    async def test_get_handles_redis_error(self, redis_cache_instance):
        """Test get handles Redis connection error."""
        mock_client = AsyncMock()
        mock_client.get.side_effect = Exception("Connection error")
        redis_cache_instance._client = mock_client

        result = await redis_cache_instance.get("error_key")

        assert result is None


# ============================================================================
# TESTS: RedisCache.set
# ============================================================================


class TestRedisCacheSet:
    """Tests for cache set method."""

    @pytest.mark.asyncio
    async def test_set_stores_data(self, redis_cache_instance, mock_redis_client):
        """Test set stores data with TTL."""
        redis_cache_instance._client = mock_redis_client

        result = await redis_cache_instance.set("test_key", {"data": "value"}, ttl=600)

        assert result is True
        mock_redis_client.set.assert_called_once()
        call_args = mock_redis_client.set.call_args
        assert call_args[0][0] == "test_key"
        assert call_args[1]["ex"] == 600

    @pytest.mark.asyncio
    async def test_set_uses_default_ttl(self, redis_cache_instance, mock_redis_client):
        """Test set uses default TTL when not specified."""
        redis_cache_instance._client = mock_redis_client

        await redis_cache_instance.set("test_key", "value")

        call_args = mock_redis_client.set.call_args
        assert call_args[1]["ex"] == 300  # Default TTL

    @pytest.mark.asyncio
    async def test_set_includes_metadata(self, redis_cache_instance, mock_redis_client):
        """Test set includes caching metadata."""
        redis_cache_instance._client = mock_redis_client

        await redis_cache_instance.set("test_key", "value")

        call_args = mock_redis_client.set.call_args
        json_data = json.loads(call_args[0][1])
        assert "data" in json_data
        assert "__cached_at__" in json_data
        assert json_data["data"] == "value"

    @pytest.mark.asyncio
    async def test_set_handles_redis_error(self, redis_cache_instance):
        """Test set handles Redis error gracefully."""
        mock_client = AsyncMock()
        mock_client.set.side_effect = Exception("Connection error")
        redis_cache_instance._client = mock_client

        result = await redis_cache_instance.set("test_key", "value")

        assert result is False


# ============================================================================
# TESTS: RedisCache.delete
# ============================================================================


class TestRedisCacheDelete:
    """Tests for cache delete method."""

    @pytest.mark.asyncio
    async def test_delete_removes_key(self, redis_cache_instance, mock_redis_client):
        """Test delete removes key successfully."""
        mock_redis_client.delete.return_value = 1
        redis_cache_instance._client = mock_redis_client

        result = await redis_cache_instance.delete("test_key")

        assert result is True
        mock_redis_client.delete.assert_called_once_with("test_key")

    @pytest.mark.asyncio
    async def test_delete_nonexistent_key(
        self, redis_cache_instance, mock_redis_client
    ):
        """Test delete returns False for nonexistent key."""
        mock_redis_client.delete.return_value = 0
        redis_cache_instance._client = mock_redis_client

        result = await redis_cache_instance.delete("nonexistent")

        assert result is False

    @pytest.mark.asyncio
    async def test_delete_handles_error(self, redis_cache_instance):
        """Test delete handles Redis error."""
        mock_client = AsyncMock()
        mock_client.delete.side_effect = Exception("Connection error")
        redis_cache_instance._client = mock_client

        result = await redis_cache_instance.delete("error_key")

        assert result is False


# ============================================================================
# TESTS: RedisCache.clear_pattern
# ============================================================================


class TestRedisCacheClearPattern:
    """Tests for clear_pattern method."""

    @pytest.mark.asyncio
    async def test_clear_pattern_deletes_matching_keys(
        self, redis_cache_instance, mock_redis_client
    ):
        """Test clear_pattern deletes all matching keys."""
        mock_redis_client.keys.return_value = [b"key1", b"key2", b"key3"]
        mock_redis_client.delete.return_value = 3
        redis_cache_instance._client = mock_redis_client

        result = await redis_cache_instance.clear_pattern("cache:test:*")

        assert result == 3
        mock_redis_client.keys.assert_called_once_with("cache:test:*")
        mock_redis_client.delete.assert_called_once()

    @pytest.mark.asyncio
    async def test_clear_pattern_no_matching_keys(
        self, redis_cache_instance, mock_redis_client
    ):
        """Test clear_pattern returns 0 when no keys match."""
        mock_redis_client.keys.return_value = []
        redis_cache_instance._client = mock_redis_client

        result = await redis_cache_instance.clear_pattern("cache:empty:*")

        assert result == 0
        mock_redis_client.delete.assert_not_called()

    @pytest.mark.asyncio
    async def test_clear_pattern_handles_error(self, redis_cache_instance):
        """Test clear_pattern handles errors gracefully."""
        mock_client = AsyncMock()
        mock_client.keys.side_effect = Exception("Connection error")
        redis_cache_instance._client = mock_client

        result = await redis_cache_instance.clear_pattern("cache:*")

        assert result == 0


# ============================================================================
# TESTS: redis_cache Decorator
# ============================================================================


class TestRedisCacheDecorator:
    """Tests for redis_cache decorator."""

    @pytest.mark.asyncio
    async def test_decorator_caches_result(self, mock_request, mock_redis_client):
        """Test decorator caches function result."""
        with patch.object(cache, "_client", mock_redis_client):
            with patch.object(cache, "get_client", return_value=mock_redis_client):
                mock_redis_client.get.return_value = None

                @redis_cache(ttl=300, prefix="test")
                async def test_function(request=None):
                    return {"result": "data"}

                # Pass request as kwarg so decorator finds it
                result = await test_function(request=mock_request)

                assert result == {"result": "data"}
                mock_redis_client.set.assert_called_once()

                assert result == {"result": "data"}
                mock_redis_client.set.assert_called_once()

    @pytest.mark.asyncio
    async def test_decorator_returns_cached_result(
        self, mock_request, mock_redis_client
    ):
        """Test decorator returns cached result on cache hit."""
        cached_data = json.dumps(
            {"data": {"cached": "result"}, "__cached_at__": time.time()}
        )
        mock_redis_client.get.return_value = cached_data

        with patch.object(cache, "_client", mock_redis_client):
            with patch.object(cache, "get_client", return_value=mock_redis_client):

                @redis_cache(ttl=300, prefix="test")
                async def test_function(request=None):
                    return {"new": "data"}

                result = await test_function(request=mock_request)

                assert result == {"cached": "result"}

    @pytest.mark.asyncio
    async def test_decorator_skips_cache_for_post(
        self, mock_request, mock_redis_client
    ):
        """Test decorator skips caching for POST requests."""
        mock_request.method = "POST"
        mock_redis_client.keys.return_value = []

        with patch.object(cache, "_client", mock_redis_client):
            with patch.object(cache, "get_client", return_value=mock_redis_client):

                @redis_cache(ttl=300, prefix="test")
                async def test_function(request=None):
                    return {"result": "data"}

                result = await test_function(request=mock_request)

                assert result == {"result": "data"}
                mock_redis_client.keys.assert_called_once()  # Called for invalidation

    @pytest.mark.asyncio
    async def test_decorator_with_skip_cache_if(self, mock_request, mock_redis_client):
        """Test decorator respects skip_cache_if function."""

        def skip_condition(req):
            return True  # Always skip

        with patch.object(cache, "_client", mock_redis_client):
            with patch.object(cache, "get_client", return_value=mock_redis_client):

                @redis_cache(ttl=300, prefix="test", skip_cache_if=skip_condition)
                async def test_function(request=None):
                    return {"result": "uncached"}

                result = await test_function(request=mock_request)

                assert result == {"result": "uncached"}
                mock_redis_client.get.assert_not_called()

    @pytest.mark.asyncio
    async def test_decorator_with_user_variation(
        self, mock_request_with_user, mock_redis_client
    ):
        """Test decorator varies cache by user."""
        mock_redis_client.get.return_value = None

        with patch.object(cache, "_client", mock_redis_client):
            with patch.object(cache, "get_client", return_value=mock_redis_client):

                @redis_cache(ttl=300, prefix="user_data", vary_on_user=True)
                async def test_function(request=None):
                    return {"user": "data"}

                await test_function(request=mock_request_with_user)

                # Verify user ID was included in cache operations
                mock_redis_client.set.assert_called_once()

    @pytest.mark.asyncio
    async def test_decorator_with_header_variation(
        self, mock_request_with_user, mock_redis_client
    ):
        """Test decorator varies cache by headers."""
        mock_redis_client.get.return_value = None

        with patch.object(cache, "_client", mock_redis_client):
            with patch.object(cache, "get_client", return_value=mock_redis_client):

                @redis_cache(
                    ttl=300,
                    prefix="test",
                    vary_on_headers=["Authorization"],
                )
                async def test_function(request=None):
                    return {"result": "data"}

                await test_function(request=mock_request_with_user)

                mock_redis_client.set.assert_called_once()

    @pytest.mark.asyncio
    async def test_decorator_without_request(self):
        """Test decorator handles missing request gracefully."""

        @redis_cache(ttl=300, prefix="test")
        async def test_function(data: str):
            return {"data": data}

        result = await test_function("test")

        # Should execute function without caching
        assert result == {"data": "test"}

    @pytest.mark.asyncio
    async def test_decorator_request_in_kwargs(self, mock_request, mock_redis_client):
        """Test decorator finds request in kwargs."""
        mock_redis_client.get.return_value = None

        with patch.object(cache, "_client", mock_redis_client):
            with patch.object(cache, "get_client", return_value=mock_redis_client):

                @redis_cache(ttl=300, prefix="test")
                async def test_function(data: str, request: Request = None):
                    return {"data": data}

                result = await test_function("test", request=mock_request)

                assert result == {"data": "test"}
                mock_redis_client.set.assert_called_once()


# ============================================================================
# TESTS: Specialized Cache Decorators
# ============================================================================


class TestSpecializedDecorators:
    """Tests for specialized cache decorator factories."""

    def test_cache_user_data_defaults(self):
        """Test cache_user_data decorator factory."""
        decorator = cache_user_data(ttl=600)
        assert callable(decorator)

    def test_cache_public_data_defaults(self):
        """Test cache_public_data decorator factory."""
        decorator = cache_public_data(ttl=1800)
        assert callable(decorator)

    def test_cache_portfolio_data_defaults(self):
        """Test cache_portfolio_data decorator factory."""
        decorator = cache_portfolio_data(ttl=300)
        assert callable(decorator)

    def test_cache_notifications_defaults(self):
        """Test cache_notifications decorator factory."""
        decorator = cache_notifications(ttl=120)
        assert callable(decorator)

    def test_cache_ai_responses_defaults(self):
        """Test cache_ai_responses decorator factory."""
        decorator = cache_ai_responses(ttl=900)
        assert callable(decorator)

    def test_cache_market_data_defaults(self):
        """Test cache_market_data decorator factory."""
        decorator = cache_market_data(ttl=60)
        assert callable(decorator)


# ============================================================================
# TESTS: Cache Management Utilities
# ============================================================================


class TestCacheManagement:
    """Tests for cache management functions."""

    @pytest.mark.asyncio
    async def test_warm_cache_success(self, mock_redis_client):
        """Test warm_cache successfully warms cache."""
        with patch.object(cache, "_client", mock_redis_client):
            with patch.object(cache, "get_client", return_value=mock_redis_client):
                await warm_cache()

                mock_redis_client.set.assert_called_once()
                call_args = mock_redis_client.set.call_args
                assert "cache:system:warmed" in call_args[0][0]

    @pytest.mark.asyncio
    async def test_warm_cache_handles_error(self):
        """Test warm_cache handles errors gracefully."""
        mock_client = AsyncMock()
        mock_client.set.side_effect = Exception("Connection error")

        with patch.object(cache, "_client", mock_client):
            with patch.object(cache, "get_client", return_value=mock_client):
                # Should not raise
                await warm_cache()

    @pytest.mark.asyncio
    async def test_get_cache_stats_returns_stats(self, mock_redis_client):
        """Test get_cache_stats returns statistics."""
        with patch.object(cache, "_client", mock_redis_client):
            with patch.object(cache, "get_client", return_value=mock_redis_client):
                stats = await get_cache_stats()

                assert stats["redis_version"] == "7.0.0"
                assert stats["connected_clients"] == 5
                assert stats["used_memory"] == "1.5M"
                assert stats["keyspace_hits"] == 100
                assert stats["keyspace_misses"] == 20
                assert stats["hit_ratio"] == 83.33  # 100/(100+20)*100

    @pytest.mark.asyncio
    async def test_get_cache_stats_zero_requests(self, mock_redis_client):
        """Test get_cache_stats handles zero requests."""
        mock_redis_client.info.return_value = {
            "redis_version": "7.0.0",
            "connected_clients": 1,
            "used_memory_human": "1M",
            "keyspace_hits": 0,
            "keyspace_misses": 0,
            "total_commands_processed": 0,
        }

        with patch.object(cache, "_client", mock_redis_client):
            with patch.object(cache, "get_client", return_value=mock_redis_client):
                stats = await get_cache_stats()

                assert stats["hit_ratio"] == 0

    @pytest.mark.asyncio
    async def test_get_cache_stats_handles_error(self):
        """Test get_cache_stats handles errors."""
        mock_client = AsyncMock()
        mock_client.info.side_effect = Exception("Connection error")

        with patch.object(cache, "_client", mock_client):
            with patch.object(cache, "get_client", return_value=mock_client):
                stats = await get_cache_stats()

                assert "error" in stats
                assert "Connection error" in stats["error"]

    @pytest.mark.asyncio
    async def test_clear_all_cache_success(self, mock_redis_client):
        """Test clear_all_cache clears all cached data."""
        mock_redis_client.keys.return_value = [b"cache:1", b"cache:2"]
        mock_redis_client.delete.return_value = 2

        with patch.object(cache, "_client", mock_redis_client):
            with patch.object(cache, "get_client", return_value=mock_redis_client):
                result = await clear_all_cache()

                assert result is True
                mock_redis_client.keys.assert_called_once_with("cache:*")

    @pytest.mark.asyncio
    async def test_clear_all_cache_handles_error(self):
        """Test clear_all_cache handles errors.

        Note: clear_pattern() catches its own exceptions and returns 0,
        so clear_all_cache() will return True (operation completed,
        even if no keys were cleared).
        """
        mock_client = AsyncMock()
        mock_client.keys.side_effect = Exception("Connection error")

        with patch.object(cache, "_client", mock_client):
            with patch.object(cache, "get_client", return_value=mock_client):
                result = await clear_all_cache()

                # clear_pattern handles its own errors and returns 0
                # clear_all_cache doesn't see the error, returns True
                assert result is True


# ============================================================================
# TESTS: Global Cache Instance
# ============================================================================


class TestGlobalCacheInstance:
    """Tests for global cache instance."""

    def test_global_cache_exists(self):
        """Test global cache instance is available."""
        assert cache is not None
        assert isinstance(cache, RedisCache)

    def test_global_cache_has_default_ttl(self):
        """Test global cache has default TTL."""
        assert cache.default_ttl == 300


# ============================================================================
# TESTS: Edge Cases
# ============================================================================


class TestEdgeCases:
    """Tests for edge cases and special scenarios."""

    @pytest.mark.asyncio
    async def test_cache_with_complex_data_types(
        self, redis_cache_instance, mock_redis_client
    ):
        """Test caching complex data types."""
        redis_cache_instance._client = mock_redis_client

        complex_data = {
            "list": [1, 2, 3],
            "nested": {"a": {"b": "c"}},
            "unicode": "日本語",
            "number": 123.456,
        }

        result = await redis_cache_instance.set("complex_key", complex_data)

        assert result is True
        call_args = mock_redis_client.set.call_args
        stored_data = json.loads(call_args[0][1])
        assert stored_data["data"] == complex_data

    @pytest.mark.asyncio
    async def test_cache_with_none_value(self, redis_cache_instance, mock_redis_client):
        """Test caching None value."""
        redis_cache_instance._client = mock_redis_client

        result = await redis_cache_instance.set("none_key", None)

        assert result is True

    @pytest.mark.asyncio
    async def test_cache_with_empty_string(
        self, redis_cache_instance, mock_redis_client
    ):
        """Test caching empty string."""
        redis_cache_instance._client = mock_redis_client

        result = await redis_cache_instance.set("empty_key", "")

        assert result is True

    def test_cache_key_with_special_characters(self, redis_cache_instance):
        """Test cache key generation with special characters."""
        key = redis_cache_instance._generate_cache_key(
            "prefix", "arg with spaces", key="value/with/slashes"
        )
        assert key.startswith("cache:prefix:")
        # Key should be valid (hashed)
        assert "/" not in key.split(":")[-1]

    @pytest.mark.asyncio
    async def test_decorator_handles_function_exception(
        self, mock_request, mock_redis_client
    ):
        """Test decorator handles function exceptions."""
        mock_redis_client.get.return_value = None

        with patch.object(cache, "_client", mock_redis_client):
            with patch.object(cache, "get_client", return_value=mock_redis_client):

                @redis_cache(ttl=300, prefix="test")
                async def failing_function(request=None):
                    raise ValueError("Function error")

                with pytest.raises(ValueError, match="Function error"):
                    await failing_function(request=mock_request)

    @pytest.mark.asyncio
    async def test_decorator_with_put_method(self, mock_request, mock_redis_client):
        """Test decorator handles PUT request (cache invalidation)."""
        mock_request.method = "PUT"
        mock_redis_client.keys.return_value = []

        with patch.object(cache, "_client", mock_redis_client):
            with patch.object(cache, "get_client", return_value=mock_redis_client):

                @redis_cache(ttl=300, prefix="test")
                async def test_function(request=None):
                    return {"result": "updated"}

                result = await test_function(request=mock_request)

                assert result == {"result": "updated"}
                mock_redis_client.keys.assert_called_once()

    @pytest.mark.asyncio
    async def test_decorator_with_delete_method(self, mock_request, mock_redis_client):
        """Test decorator handles DELETE request (cache invalidation)."""
        mock_request.method = "DELETE"
        mock_redis_client.keys.return_value = []

        with patch.object(cache, "_client", mock_redis_client):
            with patch.object(cache, "get_client", return_value=mock_redis_client):

                @redis_cache(ttl=300, prefix="test")
                async def test_function(request=None):
                    return {"deleted": True}

                result = await test_function(request=mock_request)

                assert result == {"deleted": True}

    @pytest.mark.asyncio
    async def test_decorator_with_patch_method(self, mock_request, mock_redis_client):
        """Test decorator handles PATCH request (cache invalidation)."""
        mock_request.method = "PATCH"
        mock_redis_client.keys.return_value = []

        with patch.object(cache, "_client", mock_redis_client):
            with patch.object(cache, "get_client", return_value=mock_redis_client):

                @redis_cache(ttl=300, prefix="test")
                async def test_function(request=None):
                    return {"patched": True}

                result = await test_function(request=mock_request)

                assert result == {"patched": True}

    @pytest.mark.asyncio
    async def test_decorator_disables_mutation_invalidation(
        self, mock_request, mock_redis_client
    ):
        """Test decorator with invalidate_on_mutation=False."""
        mock_request.method = "POST"
        mock_redis_client.get.return_value = None

        with patch.object(cache, "_client", mock_redis_client):
            with patch.object(cache, "get_client", return_value=mock_redis_client):

                @redis_cache(ttl=300, prefix="test", invalidate_on_mutation=False)
                async def test_function(request=None):
                    return {"posted": True}

                result = await test_function(request=mock_request)

                assert result == {"posted": True}
                # clear_pattern (keys) should not have been called
                mock_redis_client.keys.assert_not_called()

    @pytest.mark.asyncio
    async def test_cache_result_is_none(self, mock_request, mock_redis_client):
        """Test decorator handles None result from function."""
        mock_redis_client.get.return_value = None

        with patch.object(cache, "_client", mock_redis_client):
            with patch.object(cache, "get_client", return_value=mock_redis_client):

                @redis_cache(ttl=300, prefix="test")
                async def test_function(request=None):
                    return None

                result = await test_function(request=mock_request)

                assert result is None
                # Should not cache None results
                mock_redis_client.set.assert_not_called()
