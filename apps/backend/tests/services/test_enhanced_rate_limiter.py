import asyncio
import time

import pytest

from app.services.enhanced_rate_limiter import (
    EnhancedRateLimiter,
    enhanced_rate_limiter,
)


class TestEnhancedRateLimiter:
    """Test EnhancedRateLimiter class"""

    @pytest.fixture
    def limiter(self):
        """Create a fresh rate limiter instance for each test"""
        return EnhancedRateLimiter()

    @pytest.mark.asyncio
    async def test_initialization(self, limiter):
        """Test rate limiter initialization"""
        assert limiter.cleanup_interval == 300
        assert limiter.requests == {}
        assert limiter.last_cleanup is not None
        # Check limit configs exist
        assert "auth" in limiter.limits
        assert "api" in limiter.limits
        assert "websocket" in limiter.limits
        assert "upload" in limiter.limits

    @pytest.mark.asyncio
    async def test_check_rate_limit_allows_requests_under_limit(self, limiter):
        """Test that requests under limit are allowed"""
        allowed, retry_after = await limiter.check_rate_limit("user1", "api")
        assert allowed is True
        assert retry_after is None

    @pytest.mark.asyncio
    async def test_check_rate_limit_sequential_requests_allowed(self, limiter):
        """Test that sequential requests under limit are allowed"""
        for i in range(5):
            allowed, retry_after = await limiter.check_rate_limit("user2", "auth")
            assert allowed is True
            assert retry_after is None

    @pytest.mark.asyncio
    async def test_check_rate_limit_exceeds_auth_limit(self, limiter):
        """Test that auth limit (5 requests per 5 min) is enforced"""
        # First 5 requests should pass
        for i in range(5):
            allowed, _ = await limiter.check_rate_limit("user3", "auth")
            assert allowed is True

        # 6th request should fail
        allowed, retry_after = await limiter.check_rate_limit("user3", "auth")
        assert allowed is False
        assert retry_after is not None
        assert retry_after > 0

    @pytest.mark.asyncio
    async def test_check_rate_limit_exceeds_upload_limit(self, limiter):
        """Test that upload limit (10 per minute) is enforced"""
        # Fill upload limit
        for i in range(10):
            allowed, _ = await limiter.check_rate_limit("user4", "upload")
            assert allowed is True

        # Next should be denied
        allowed, retry_after = await limiter.check_rate_limit("user4", "upload")
        assert allowed is False
        assert retry_after is not None

    @pytest.mark.asyncio
    async def test_check_rate_limit_default_is_api(self, limiter):
        """Test that default limit type is 'api'"""
        # API limit is 100 per minute, so fill that
        for i in range(100):
            allowed, _ = await limiter.check_rate_limit("user5")
            assert allowed is True

        # 101st should fail
        allowed, retry_after = await limiter.check_rate_limit("user5")
        assert allowed is False

    @pytest.mark.asyncio
    async def test_check_rate_limit_different_users_independent(self, limiter):
        """Test that rate limits are per-identifier"""
        # User6 hits limit
        for i in range(5):
            await limiter.check_rate_limit("user6", "auth")
        allowed6, _ = await limiter.check_rate_limit("user6", "auth")
        assert allowed6 is False

        # User7 should still be able to make requests
        allowed7, _ = await limiter.check_rate_limit("user7", "auth")
        assert allowed7 is True

    @pytest.mark.asyncio
    async def test_check_rate_limit_different_limit_types(self, limiter):
        """Test that different limit types have independent counts"""
        identifier = "user8"

        # Use auth limit (5 per 5 min)
        for i in range(5):
            await limiter.check_rate_limit(identifier, "auth")
        allowed_auth, _ = await limiter.check_rate_limit(identifier, "auth")
        assert allowed_auth is False

        # Upload limit (10 per min) should still allow requests
        allowed_upload, _ = await limiter.check_rate_limit(identifier, "upload")
        assert allowed_upload is True

    @pytest.mark.asyncio
    async def test_retry_after_calculation(self, limiter):
        """Test that retry_after is calculated correctly"""
        identifier = "user12"
        limiter.limits["test"] = {"requests": 2, "window": 10}

        # Use up the limit
        await limiter.check_rate_limit(identifier, "test")
        await limiter.check_rate_limit(identifier, "test")

        # Next should be denied with retry_after
        allowed, retry_after = await limiter.check_rate_limit(identifier, "test")
        assert allowed is False
        # Retry should be close to 10 seconds (the window size)
        assert retry_after is not None
        assert 8 <= retry_after <= 12  # Allow some variance

    @pytest.mark.asyncio
    async def test_unknown_limit_type_defaults_to_api(self, limiter):
        """Test that unknown limit types default to api limits"""
        # Unknown limit type should default to api (100 per minute)
        for i in range(100):
            allowed, _ = await limiter.check_rate_limit("user13", "unknown_type")
            assert allowed is True

        # 101st should fail
        allowed, _ = await limiter.check_rate_limit("user13", "unknown_type")
        assert allowed is False

    @pytest.mark.asyncio
    async def test_cleanup_removes_old_entries(self, limiter):
        """Test that cleanup removes expired entries"""
        identifier = "user14"

        # Add a request
        await limiter.check_rate_limit(identifier, "api")

        # Verify entry exists
        assert identifier in limiter.requests
        initial_count = len(limiter.requests[identifier])
        assert initial_count > 0

        # Simulate far future cleanup (beyond max window of 300 seconds)
        current_time = time.time()
        future_time = current_time + 400
        await limiter._cleanup_old_entries(future_time)

    def test_global_instance_exists(self):
        """Test that global rate limiter instance exists"""
        assert enhanced_rate_limiter is not None
        assert isinstance(enhanced_rate_limiter, EnhancedRateLimiter)

    @pytest.mark.asyncio
    async def test_global_instance_functional(self):
        """Test that global instance works"""
        allowed, retry_after = await enhanced_rate_limiter.check_rate_limit(
            "global_user_test"
        )
        assert allowed is True
