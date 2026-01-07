"""
Comprehensive tests for app.utils.redis module.
Coverage target: 100%
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ================================================================================
# Test Module Import and Setup
# ================================================================================


class TestRedisModuleImport:
    """Test the redis module import and initialization."""

    def test_redis_module_imports(self):
        """Test that the redis module can be imported."""
        from app.utils import redis

        assert hasattr(redis, "r")
        assert hasattr(redis, "redis_json_get")
        assert hasattr(redis, "redis_json_set")

    def test_redis_client_created(self):
        """Test that redis client r is created from settings."""
        from app.utils.redis import r

        assert r is not None


# ================================================================================
# Test redis_json_get Function
# ================================================================================


class TestRedisJsonGet:
    """Test the redis_json_get function."""

    @pytest.mark.asyncio
    async def test_redis_json_get_returns_parsed_json_when_value_exists(self):
        """Test redis_json_get returns parsed JSON when key exists."""
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value='{"name": "test", "value": 123}')

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_get

            result = await redis_json_get("test_key")

        assert result == {"name": "test", "value": 123}
        mock_redis.get.assert_called_once_with("test_key")

    @pytest.mark.asyncio
    async def test_redis_json_get_returns_none_when_key_not_found(self):
        """Test redis_json_get returns None when key doesn't exist."""
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=None)

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_get

            result = await redis_json_get("nonexistent_key")

        assert result is None
        mock_redis.get.assert_called_once_with("nonexistent_key")

    @pytest.mark.asyncio
    async def test_redis_json_get_handles_array_json(self):
        """Test redis_json_get correctly parses JSON arrays."""
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value='[1, 2, 3, "four"]')

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_get

            result = await redis_json_get("array_key")

        assert result == [1, 2, 3, "four"]

    @pytest.mark.asyncio
    async def test_redis_json_get_handles_string_json(self):
        """Test redis_json_get correctly parses JSON string."""
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value='"simple string"')

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_get

            result = await redis_json_get("string_key")

        assert result == "simple string"

    @pytest.mark.asyncio
    async def test_redis_json_get_handles_numeric_json(self):
        """Test redis_json_get correctly parses numeric JSON."""
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value="42.5")

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_get

            result = await redis_json_get("number_key")

        assert result == 42.5

    @pytest.mark.asyncio
    async def test_redis_json_get_handles_boolean_json(self):
        """Test redis_json_get correctly parses boolean JSON."""
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value="true")

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_get

            result = await redis_json_get("bool_key")

        assert result is True

    @pytest.mark.asyncio
    async def test_redis_json_get_handles_null_json(self):
        """Test redis_json_get correctly parses null JSON."""
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value="null")

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_get

            result = await redis_json_get("null_key")

        assert result is None

    @pytest.mark.asyncio
    async def test_redis_json_get_handles_empty_string_returns_none(self):
        """Test redis_json_get returns None for empty string (falsy)."""
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value="")

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_get

            result = await redis_json_get("empty_key")

        # Empty string is falsy, so should return None
        assert result is None


# ================================================================================
# Test redis_json_set Function
# ================================================================================


class TestRedisJsonSet:
    """Test the redis_json_set function."""

    @pytest.mark.asyncio
    async def test_redis_json_set_without_ttl(self):
        """Test redis_json_set stores value without TTL."""
        mock_redis = AsyncMock()
        mock_redis.set = AsyncMock()

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_set

            await redis_json_set("test_key", {"name": "test", "value": 123})

        mock_redis.set.assert_called_once_with(
            "test_key", '{"name": "test", "value": 123}'
        )
        mock_redis.setex.assert_not_called()

    @pytest.mark.asyncio
    async def test_redis_json_set_with_ttl(self):
        """Test redis_json_set stores value with TTL using setex."""
        mock_redis = AsyncMock()
        mock_redis.setex = AsyncMock()

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_set

            await redis_json_set("test_key", {"name": "test"}, ttl=3600)

        mock_redis.setex.assert_called_once_with("test_key", 3600, '{"name": "test"}')
        mock_redis.set.assert_not_called()

    @pytest.mark.asyncio
    async def test_redis_json_set_with_array_value(self):
        """Test redis_json_set correctly serializes arrays."""
        mock_redis = AsyncMock()
        mock_redis.set = AsyncMock()

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_set

            await redis_json_set("array_key", [1, 2, 3, "four"])

        mock_redis.set.assert_called_once_with("array_key", '[1, 2, 3, "four"]')

    @pytest.mark.asyncio
    async def test_redis_json_set_with_string_value(self):
        """Test redis_json_set correctly serializes string."""
        mock_redis = AsyncMock()
        mock_redis.set = AsyncMock()

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_set

            await redis_json_set("string_key", "simple string")

        mock_redis.set.assert_called_once_with("string_key", '"simple string"')

    @pytest.mark.asyncio
    async def test_redis_json_set_with_numeric_value(self):
        """Test redis_json_set correctly serializes numbers."""
        mock_redis = AsyncMock()
        mock_redis.set = AsyncMock()

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_set

            await redis_json_set("number_key", 42.5)

        mock_redis.set.assert_called_once_with("number_key", "42.5")

    @pytest.mark.asyncio
    async def test_redis_json_set_with_boolean_value(self):
        """Test redis_json_set correctly serializes booleans."""
        mock_redis = AsyncMock()
        mock_redis.set = AsyncMock()

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_set

            await redis_json_set("bool_key", True)

        mock_redis.set.assert_called_once_with("bool_key", "true")

    @pytest.mark.asyncio
    async def test_redis_json_set_with_none_value(self):
        """Test redis_json_set correctly serializes None."""
        mock_redis = AsyncMock()
        mock_redis.set = AsyncMock()

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_set

            await redis_json_set("null_key", None)

        mock_redis.set.assert_called_once_with("null_key", "null")

    @pytest.mark.asyncio
    async def test_redis_json_set_with_nested_dict(self):
        """Test redis_json_set correctly serializes nested dictionaries."""
        mock_redis = AsyncMock()
        mock_redis.set = AsyncMock()

        nested_data = {
            "level1": {"level2": {"level3": "deep"}},
            "array": [1, {"nested": True}],
        }

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_set

            await redis_json_set("nested_key", nested_data)

        expected_json = json.dumps(nested_data)
        mock_redis.set.assert_called_once_with("nested_key", expected_json)

    @pytest.mark.asyncio
    async def test_redis_json_set_with_zero_ttl_uses_set(self):
        """Test redis_json_set with ttl=0 uses set (since 0 is falsy)."""
        mock_redis = AsyncMock()
        mock_redis.set = AsyncMock()

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_set

            await redis_json_set("zero_ttl_key", {"data": "value"}, ttl=0)

        # ttl=0 is falsy, so should use set instead of setex
        mock_redis.set.assert_called_once()
        mock_redis.setex.assert_not_called()


# ================================================================================
# Integration-style Tests
# ================================================================================


class TestRedisJsonRoundTrip:
    """Test round-trip serialization/deserialization."""

    @pytest.mark.asyncio
    async def test_roundtrip_dict(self):
        """Test that dict can be stored and retrieved correctly."""
        original = {"name": "test", "count": 42, "active": True}

        mock_redis = AsyncMock()
        stored_value = None

        async def mock_set(key, value):
            nonlocal stored_value
            stored_value = value

        async def mock_get(key):
            return stored_value

        mock_redis.set = mock_set
        mock_redis.get = mock_get

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_get, redis_json_set

            await redis_json_set("roundtrip_key", original)
            result = await redis_json_get("roundtrip_key")

        assert result == original

    @pytest.mark.asyncio
    async def test_roundtrip_complex_structure(self):
        """Test that complex nested structure survives round-trip."""
        original = {
            "users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}],
            "meta": {"total": 2, "timestamp": "2024-01-01T00:00:00"},
            "flags": {"active": True, "deprecated": False},
        }

        mock_redis = AsyncMock()
        stored_value = None

        async def mock_set(key, value):
            nonlocal stored_value
            stored_value = value

        async def mock_get(key):
            return stored_value

        mock_redis.set = mock_set
        mock_redis.get = mock_get

        with patch("app.utils.redis.r", mock_redis):
            from app.utils.redis import redis_json_get, redis_json_set

            await redis_json_set("complex_key", original)
            result = await redis_json_get("complex_key")

        assert result == original
