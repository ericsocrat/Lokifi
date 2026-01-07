"""Tests for app.services.rate_limit_service module.

Tests the Redis-based sliding window rate limiter for messaging:
- Rate limit checking
- Current usage tracking
- Connection management
- Edge cases

Coverage target: 100%
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.rate_limit_service import RateLimitService


class TestRateLimitServiceInit:
    """Tests for RateLimitService initialization."""

    def test_uses_provided_redis_client(self):
        """Test that service uses provided Redis client."""
        mock_redis = MagicMock()
        service = RateLimitService(redis_client=mock_redis)
        assert service.redis == mock_redis

    def test_creates_redis_client_from_settings(self):
        """Test that service creates Redis client from settings when not provided."""
        with patch("app.services.rate_limit_service.redis.from_url") as mock_from_url:
            mock_redis = MagicMock()
            mock_from_url.return_value = mock_redis

            with patch("app.services.rate_limit_service.settings") as mock_settings:
                mock_settings.redis_url = "redis://test:6379"

                service = RateLimitService(redis_client=None)

                mock_from_url.assert_called_once_with(
                    "redis://test:6379", decode_responses=True
                )
                assert service.redis == mock_redis

    def test_uses_default_redis_url_when_none(self):
        """Test that service uses default localhost URL when settings.redis_url is None."""
        with patch("app.services.rate_limit_service.redis.from_url") as mock_from_url:
            mock_redis = MagicMock()
            mock_from_url.return_value = mock_redis

            with patch("app.services.rate_limit_service.settings") as mock_settings:
                mock_settings.redis_url = None

                RateLimitService(redis_client=None)

                mock_from_url.assert_called_once_with(
                    "redis://localhost:6379", decode_responses=True
                )

    def test_default_rate_limit_settings(self):
        """Test that default rate limit settings are correct."""
        mock_redis = MagicMock()
        service = RateLimitService(redis_client=mock_redis)

        assert service.MESSAGE_LIMIT == 30
        assert service.WINDOW_SIZE == 60


class TestCheckRateLimit:
    """Tests for check_rate_limit method."""

    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client."""
        return MagicMock()

    @pytest.fixture
    def service(self, mock_redis):
        """Create service instance with mock Redis."""
        return RateLimitService(redis_client=mock_redis)

    @pytest.mark.asyncio
    async def test_allows_request_under_limit(self, service, mock_redis):
        """Test that requests under limit are allowed."""
        user_id = uuid.uuid4()

        # Mock pipeline
        mock_pipe = MagicMock()
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=None)
        mock_pipe.execute = AsyncMock(return_value=[None, 10, None, None])  # count = 10
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        allowed, retry_after = await service.check_rate_limit(user_id)

        assert allowed is True
        assert retry_after is None

    @pytest.mark.asyncio
    async def test_denies_request_at_limit(self, service, mock_redis):
        """Test that requests at limit are denied."""
        user_id = uuid.uuid4()

        # Mock pipeline with count at limit
        mock_pipe = MagicMock()
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=None)
        mock_pipe.execute = AsyncMock(
            return_value=[None, 30, None, None]
        )  # count = 30 (at limit)
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        # Mock zrange to return oldest entry
        mock_redis.zrange = AsyncMock(return_value=[("1234567890.0", 1234567890.0)])

        with patch(
            "app.services.rate_limit_service.time.time", return_value=1234567900
        ):
            allowed, retry_after = await service.check_rate_limit(user_id)

        assert allowed is False
        assert retry_after == 50  # 1234567890 + 60 - 1234567900 = 50

    @pytest.mark.asyncio
    async def test_denies_request_over_limit(self, service, mock_redis):
        """Test that requests over limit are denied."""
        user_id = uuid.uuid4()

        # Mock pipeline with count over limit
        mock_pipe = MagicMock()
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=None)
        mock_pipe.execute = AsyncMock(return_value=[None, 35, None, None])  # over limit
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        # Mock zrange with no entries (edge case)
        mock_redis.zrange = AsyncMock(return_value=[])

        allowed, retry_after = await service.check_rate_limit(user_id)

        assert allowed is False
        assert retry_after == 60  # Returns WINDOW_SIZE when no oldest entry

    @pytest.mark.asyncio
    async def test_builds_correct_redis_key(self, service, mock_redis):
        """Test that correct Redis key is built from user_id."""
        user_id = uuid.uuid4()

        mock_pipe = MagicMock()
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=None)
        mock_pipe.execute = AsyncMock(return_value=[None, 5, None, None])
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        with patch("app.services.rate_limit_service.time.time", return_value=1000.0):
            await service.check_rate_limit(user_id)

        # Check that zremrangebyscore was called with correct key
        mock_pipe.zremrangebyscore.assert_called_once()
        call_args = mock_pipe.zremrangebyscore.call_args
        assert call_args[0][0] == f"rate_limit:messages:{user_id}"

    @pytest.mark.asyncio
    async def test_calls_pipeline_methods_in_order(self, service, mock_redis):
        """Test that Redis pipeline methods are called in correct order."""
        user_id = uuid.uuid4()

        mock_pipe = MagicMock()
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=None)
        mock_pipe.execute = AsyncMock(return_value=[None, 5, None, None])
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        with patch("app.services.rate_limit_service.time.time", return_value=1000.0):
            await service.check_rate_limit(user_id)

        # Verify all pipeline methods were called
        mock_pipe.zremrangebyscore.assert_called_once()
        mock_pipe.zcard.assert_called_once()
        mock_pipe.zadd.assert_called_once()
        mock_pipe.expire.assert_called_once()
        mock_pipe.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_sets_correct_expiration(self, service, mock_redis):
        """Test that expiration is set to WINDOW_SIZE + 1."""
        user_id = uuid.uuid4()

        mock_pipe = MagicMock()
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=None)
        mock_pipe.execute = AsyncMock(return_value=[None, 5, None, None])
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        with patch("app.services.rate_limit_service.time.time", return_value=1000.0):
            await service.check_rate_limit(user_id)

        # Verify expiration is WINDOW_SIZE + 1 = 61
        mock_pipe.expire.assert_called_once()
        call_args = mock_pipe.expire.call_args
        assert call_args[0][1] == 61


class TestGetCurrentUsage:
    """Tests for get_current_usage method."""

    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client."""
        return MagicMock()

    @pytest.fixture
    def service(self, mock_redis):
        """Create service instance with mock Redis."""
        return RateLimitService(redis_client=mock_redis)

    @pytest.mark.asyncio
    async def test_returns_usage_and_remaining(self, service, mock_redis):
        """Test that usage and remaining are returned correctly."""
        user_id = uuid.uuid4()

        mock_pipe = MagicMock()
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=None)
        mock_pipe.execute = AsyncMock(return_value=[None, 10])  # count = 10
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        current, remaining = await service.get_current_usage(user_id)

        assert current == 10
        assert remaining == 20  # 30 - 10 = 20

    @pytest.mark.asyncio
    async def test_remaining_is_zero_when_at_limit(self, service, mock_redis):
        """Test that remaining is 0 when at or over limit."""
        user_id = uuid.uuid4()

        mock_pipe = MagicMock()
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=None)
        mock_pipe.execute = AsyncMock(return_value=[None, 30])  # at limit
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        current, remaining = await service.get_current_usage(user_id)

        assert current == 30
        assert remaining == 0

    @pytest.mark.asyncio
    async def test_remaining_is_zero_when_over_limit(self, service, mock_redis):
        """Test that remaining is 0 when over limit."""
        user_id = uuid.uuid4()

        mock_pipe = MagicMock()
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=None)
        mock_pipe.execute = AsyncMock(return_value=[None, 50])  # over limit
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        current, remaining = await service.get_current_usage(user_id)

        assert current == 50
        assert remaining == 0  # max(0, 30 - 50) = 0

    @pytest.mark.asyncio
    async def test_builds_correct_redis_key(self, service, mock_redis):
        """Test that correct Redis key is built."""
        user_id = uuid.uuid4()

        mock_pipe = MagicMock()
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=None)
        mock_pipe.execute = AsyncMock(return_value=[None, 5])
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        with patch("app.services.rate_limit_service.time.time", return_value=1000.0):
            await service.get_current_usage(user_id)

        mock_pipe.zremrangebyscore.assert_called_once()
        call_args = mock_pipe.zremrangebyscore.call_args
        assert call_args[0][0] == f"rate_limit:messages:{user_id}"

    @pytest.mark.asyncio
    async def test_cleans_up_old_entries(self, service, mock_redis):
        """Test that old entries are cleaned up."""
        user_id = uuid.uuid4()

        mock_pipe = MagicMock()
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=None)
        mock_pipe.execute = AsyncMock(return_value=[None, 5])
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        with patch("app.services.rate_limit_service.time.time", return_value=1000.0):
            await service.get_current_usage(user_id)

        # Should remove entries older than now - WINDOW_SIZE = 1000 - 60 = 940
        mock_pipe.zremrangebyscore.assert_called_once()
        call_args = mock_pipe.zremrangebyscore.call_args
        assert call_args[0][1] == 0
        assert call_args[0][2] == 940.0


class TestClose:
    """Tests for close method."""

    @pytest.mark.asyncio
    async def test_closes_redis_connection(self):
        """Test that close method closes Redis connection."""
        mock_redis = MagicMock()
        mock_redis.close = AsyncMock()

        service = RateLimitService(redis_client=mock_redis)
        await service.close()

        mock_redis.close.assert_called_once()


class TestGlobalInstance:
    """Tests for global rate_limiter instance."""

    def test_global_instance_exists(self):
        """Test that global rate_limiter instance is created."""
        from app.services.rate_limit_service import rate_limiter

        assert rate_limiter is not None
        assert isinstance(rate_limiter, RateLimitService)


class TestEdgeCases:
    """Tests for edge cases."""

    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client."""
        return MagicMock()

    @pytest.fixture
    def service(self, mock_redis):
        """Create service instance with mock Redis."""
        return RateLimitService(redis_client=mock_redis)

    @pytest.mark.asyncio
    async def test_zero_usage(self, service, mock_redis):
        """Test with zero current usage."""
        user_id = uuid.uuid4()

        mock_pipe = MagicMock()
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=None)
        mock_pipe.execute = AsyncMock(return_value=[None, 0])
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        current, remaining = await service.get_current_usage(user_id)

        assert current == 0
        assert remaining == 30

    @pytest.mark.asyncio
    async def test_boundary_at_limit_minus_one(self, service, mock_redis):
        """Test at limit-1 (should be allowed)."""
        user_id = uuid.uuid4()

        mock_pipe = MagicMock()
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=None)
        mock_pipe.execute = AsyncMock(return_value=[None, 29, None, None])
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        allowed, retry_after = await service.check_rate_limit(user_id)

        assert allowed is True
        assert retry_after is None

    @pytest.mark.asyncio
    async def test_check_rate_limit_with_negative_retry(self, service, mock_redis):
        """Test retry calculation when oldest entry would give negative retry."""
        user_id = uuid.uuid4()

        mock_pipe = MagicMock()
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=None)
        mock_pipe.execute = AsyncMock(return_value=[None, 30, None, None])
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        # oldest_time = 100, window_size = 60, now = 200
        # retry = 100 + 60 - 200 = -40 (negative!)
        mock_redis.zrange = AsyncMock(return_value=[("100.0", 100.0)])

        with patch("app.services.rate_limit_service.time.time", return_value=200.0):
            allowed, retry_after = await service.check_rate_limit(user_id)

        assert allowed is False
        assert retry_after == -40  # The service doesn't handle negative case specially

    @pytest.mark.asyncio
    async def test_different_user_ids_get_different_keys(self, service, mock_redis):
        """Test that different user IDs get different Redis keys."""
        user_id_1 = uuid.uuid4()
        user_id_2 = uuid.uuid4()

        mock_pipe = MagicMock()
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=None)
        mock_pipe.execute = AsyncMock(return_value=[None, 5])
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        with patch("app.services.rate_limit_service.time.time", return_value=1000.0):
            await service.get_current_usage(user_id_1)
            await service.get_current_usage(user_id_2)

        calls = mock_pipe.zremrangebyscore.call_args_list
        assert calls[0][0][0] == f"rate_limit:messages:{user_id_1}"
        assert calls[1][0][0] == f"rate_limit:messages:{user_id_2}"
