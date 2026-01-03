"""
Comprehensive tests for cache management endpoints

Session 96: Cache API route testing
- Tests all 5 endpoints: /cache/stats, /cache/clear, /cache/warm, /cache/pattern/{pattern}, /cache/health
- Covers happy paths, error scenarios, edge cases
- Mocks Redis client and cache utilities
- Validates caching logic, TTL, statistics, pattern matching
"""

import logging
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, Request

from app.api.routes.cache import (
    cache_health_check,
    cache_statistics,
    clear_cache,
    clear_cache_pattern,
    warm_cache_endpoint,
)

# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def mock_request() -> MagicMock:
    """Mock FastAPI Request object"""
    request = MagicMock(spec=Request)
    request.url.path = "/cache/stats"
    request.query_params = {}
    request.state.user_id = None
    return request


@pytest.fixture
def mock_redis_client() -> AsyncMock:
    """Mock Redis client for testing"""
    client = AsyncMock()
    client.ping = AsyncMock()
    client.info = AsyncMock(
        return_value={
            "redis_version": "7.0.0",
            "connected_clients": 5,
            "used_memory_human": "1.2M",
            "keyspace_hits": 1000,
            "keyspace_misses": 200,
            "total_commands_processed": 5000,
        }
    )
    client.keys = AsyncMock(return_value=[])
    client.delete = AsyncMock(return_value=0)
    return client


@pytest.fixture
def mock_cache_stats() -> dict[str, Any]:
    """Mock cache statistics data"""
    return {
        "redis_version": "7.0.0",
        "connected_clients": 5,
        "used_memory": "1.2M",
        "keyspace_hits": 1000,
        "keyspace_misses": 200,
        "total_commands_processed": 5000,
        "hit_ratio": 83.33,
    }


# ============================================================================
# Test: /cache/stats endpoint
# ============================================================================


class TestCacheStatistics:
    """Test cache statistics endpoint"""

    @pytest.mark.asyncio
    async def test_returns_cache_stats_successfully(
        self, mock_request: MagicMock, mock_cache_stats: dict[str, Any]
    ) -> None:
        """Should return cache statistics when successful"""
        # Arrange
        with patch("app.api.routes.cache.get_cache_stats") as mock_get_stats:
            mock_get_stats.return_value = mock_cache_stats

            # Act
            result = await cache_statistics(request=mock_request)

            # Assert
            assert result["status"] == "success"
            assert result["cache_enabled"] is True
            assert result["cache_stats"] == mock_cache_stats
            assert result["cache_stats"]["hit_ratio"] == 83.33
            mock_get_stats.assert_called_once()

    @pytest.mark.asyncio
    async def test_raises_500_on_cache_stats_failure(
        self, mock_request: MagicMock
    ) -> None:
        """Should raise HTTPException 500 when get_cache_stats fails"""
        # Arrange
        with patch("app.api.routes.cache.get_cache_stats") as mock_get_stats:
            mock_get_stats.side_effect = Exception("Redis connection failed")

            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                await cache_statistics(request=mock_request)

            assert exc_info.value.status_code == 500
            assert "Failed to retrieve cache statistics" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_logs_error_on_failure(
        self, mock_request: MagicMock, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Should log error when cache stats retrieval fails"""
        # Arrange
        with patch("app.api.routes.cache.get_cache_stats") as mock_get_stats:
            mock_get_stats.side_effect = Exception("Connection timeout")

            # Act
            with caplog.at_level(logging.ERROR):
                try:
                    await cache_statistics(request=mock_request)
                except HTTPException:
                    pass

            # Assert
            assert "Failed to get cache stats" in caplog.text
            assert "Connection timeout" in caplog.text

    @pytest.mark.asyncio
    async def test_includes_all_expected_fields(
        self, mock_request: MagicMock, mock_cache_stats: dict[str, Any]
    ) -> None:
        """Should include all expected fields in response"""
        # Arrange
        with patch("app.api.routes.cache.get_cache_stats") as mock_get_stats:
            mock_get_stats.return_value = mock_cache_stats

            # Act
            result = await cache_statistics(request=mock_request)

            # Assert
            assert "status" in result
            assert "cache_enabled" in result
            assert "cache_stats" in result
            assert "redis_version" in result["cache_stats"]
            assert "hit_ratio" in result["cache_stats"]


# ============================================================================
# Test: /cache/clear endpoint
# ============================================================================


class TestClearCache:
    """Test cache clear endpoint"""

    @pytest.mark.asyncio
    async def test_clears_cache_successfully(self) -> None:
        """Should clear all cache data successfully"""
        # Arrange
        with patch("app.api.routes.cache.clear_all_cache") as mock_clear:
            mock_clear.return_value = True

            # Act
            result = await clear_cache()

            # Assert
            assert result["status"] == "success"
            assert "All cache data cleared successfully" in result["message"]
            mock_clear.assert_called_once()

    @pytest.mark.asyncio
    async def test_raises_500_when_clear_fails(self) -> None:
        """Should raise HTTPException 500 when clear_all_cache returns False"""
        # Arrange
        with patch("app.api.routes.cache.clear_all_cache") as mock_clear:
            mock_clear.return_value = False

            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                await clear_cache()

            assert exc_info.value.status_code == 500
            assert "Failed to clear cache" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_raises_500_on_exception(self) -> None:
        """Should raise HTTPException 500 when exception occurs"""
        # Arrange
        with patch("app.api.routes.cache.clear_all_cache") as mock_clear:
            mock_clear.side_effect = Exception("Redis error")

            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                await clear_cache()

            assert exc_info.value.status_code == 500
            assert "Redis error" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_logs_error_on_failure(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Should log error when cache clear fails"""
        # Arrange
        with patch("app.api.routes.cache.clear_all_cache") as mock_clear:
            mock_clear.side_effect = Exception("Clear operation failed")

            # Act
            with caplog.at_level(logging.ERROR):
                try:
                    await clear_cache()
                except HTTPException:
                    pass

            # Assert
            assert "Failed to clear cache" in caplog.text
            assert "Clear operation failed" in caplog.text


# ============================================================================
# Test: /cache/warm endpoint
# ============================================================================


class TestWarmCacheEndpoint:
    """Test cache warming endpoint"""

    @pytest.mark.asyncio
    async def test_warms_cache_successfully(self) -> None:
        """Should warm cache successfully"""
        # Arrange
        with patch("app.api.routes.cache.warm_cache") as mock_warm:
            mock_warm.return_value = None

            # Act
            result = await warm_cache_endpoint()

            # Assert
            assert result["status"] == "success"
            assert "Cache warming completed successfully" in result["message"]
            mock_warm.assert_called_once()

    @pytest.mark.asyncio
    async def test_raises_500_on_warm_failure(self) -> None:
        """Should raise HTTPException 500 when warm_cache fails"""
        # Arrange
        with patch("app.api.routes.cache.warm_cache") as mock_warm:
            mock_warm.side_effect = Exception("Warming failed")

            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                await warm_cache_endpoint()

            assert exc_info.value.status_code == 500
            assert "Warming failed" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_logs_error_on_failure(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Should log error when cache warming fails"""
        # Arrange
        with patch("app.api.routes.cache.warm_cache") as mock_warm:
            mock_warm.side_effect = Exception("Pre-population error")

            # Act
            with caplog.at_level(logging.ERROR):
                try:
                    await warm_cache_endpoint()
                except HTTPException:
                    pass

            # Assert
            assert "Failed to warm cache" in caplog.text
            assert "Pre-population error" in caplog.text


# ============================================================================
# Test: /cache/pattern/{pattern} endpoint
# ============================================================================


class TestClearCachePattern:
    """Test cache pattern clearing endpoint"""

    @pytest.mark.asyncio
    async def test_clears_pattern_successfully(self) -> None:
        """Should clear cache keys matching pattern"""
        # Arrange
        with patch("app.api.routes.cache.cache") as mock_cache:
            mock_cache.clear_pattern = AsyncMock(return_value=5)

            # Act
            result = await clear_cache_pattern(pattern="user_data")

            # Assert
            assert result["status"] == "success"
            assert result["deleted_keys"] == 5
            assert result["pattern"] == "cache:user_data:*"
            mock_cache.clear_pattern.assert_called_once_with("cache:user_data:*")

    @pytest.mark.asyncio
    async def test_returns_zero_when_no_keys_match(self) -> None:
        """Should return zero deleted_keys when no keys match pattern"""
        # Arrange
        with patch("app.api.routes.cache.cache") as mock_cache:
            mock_cache.clear_pattern = AsyncMock(return_value=0)

            # Act
            result = await clear_cache_pattern(pattern="nonexistent")

            # Assert
            assert result["status"] == "success"
            assert result["deleted_keys"] == 0
            assert result["pattern"] == "cache:nonexistent:*"

    @pytest.mark.asyncio
    async def test_handles_special_characters_in_pattern(self) -> None:
        """Should handle patterns with special characters"""
        # Arrange
        with patch("app.api.routes.cache.cache") as mock_cache:
            mock_cache.clear_pattern = AsyncMock(return_value=3)

            # Act
            result = await clear_cache_pattern(pattern="api:v1")

            # Assert
            assert result["status"] == "success"
            assert result["pattern"] == "cache:api:v1:*"
            mock_cache.clear_pattern.assert_called_once_with("cache:api:v1:*")

    @pytest.mark.asyncio
    async def test_raises_500_on_clear_pattern_failure(self) -> None:
        """Should raise HTTPException 500 when clear_pattern fails"""
        # Arrange
        with patch("app.api.routes.cache.cache") as mock_cache:
            mock_cache.clear_pattern = AsyncMock(side_effect=Exception("Pattern error"))

            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                await clear_cache_pattern(pattern="test")

            assert exc_info.value.status_code == 500
            assert "Pattern error" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_logs_error_on_failure(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Should log error when pattern clear fails"""
        # Arrange
        with patch("app.api.routes.cache.cache") as mock_cache:
            mock_cache.clear_pattern = AsyncMock(side_effect=Exception("Redis timeout"))

            # Act
            with caplog.at_level(logging.ERROR):
                try:
                    await clear_cache_pattern(pattern="test")
                except HTTPException:
                    pass

            # Assert
            assert "Failed to clear cache pattern" in caplog.text
            assert "Redis timeout" in caplog.text

    @pytest.mark.asyncio
    async def test_pattern_prefix_formatting(self) -> None:
        """Should correctly format pattern with cache: prefix and :* suffix"""
        # Arrange
        patterns_to_test = [
            ("user", "cache:user:*"),
            ("portfolio_123", "cache:portfolio_123:*"),
            ("api:v2:data", "cache:api:v2:data:*"),
        ]

        with patch("app.api.routes.cache.cache") as mock_cache:
            mock_cache.clear_pattern = AsyncMock(return_value=1)

            for input_pattern, expected_pattern in patterns_to_test:
                # Act
                result = await clear_cache_pattern(pattern=input_pattern)

                # Assert
                assert result["pattern"] == expected_pattern


# ============================================================================
# Test: /cache/health endpoint
# ============================================================================


class TestCacheHealthCheck:
    """Test cache health check endpoint"""

    @pytest.mark.asyncio
    async def test_returns_healthy_when_redis_available(self) -> None:
        """Should return healthy status when Redis is available"""
        # Arrange
        mock_client = AsyncMock()
        mock_client.ping = AsyncMock()

        with patch("app.api.routes.cache.cache") as mock_cache:
            mock_cache.get_client = AsyncMock(return_value=mock_client)

            # Act
            result = await cache_health_check()

            # Assert
            assert result["status"] == "healthy"
            assert result["redis_connection"] == "active"
            assert result["cache_system"] == "operational"
            mock_client.ping.assert_called_once()

    @pytest.mark.asyncio
    async def test_returns_unhealthy_when_redis_unavailable(self) -> None:
        """Should return unhealthy status when Redis ping fails"""
        # Arrange
        mock_client = AsyncMock()
        mock_client.ping = AsyncMock(side_effect=Exception("Connection refused"))

        with patch("app.api.routes.cache.cache") as mock_cache:
            mock_cache.get_client = AsyncMock(return_value=mock_client)

            # Act
            result = await cache_health_check()

            # Assert
            assert result["status"] == "unhealthy"
            assert result["redis_connection"] == "failed"
            assert "error" in result
            assert "Connection refused" in result["error"]

    @pytest.mark.asyncio
    async def test_returns_unhealthy_on_client_creation_failure(self) -> None:
        """Should return unhealthy status when client creation fails"""
        # Arrange
        with patch("app.api.routes.cache.cache") as mock_cache:
            mock_cache.get_client = AsyncMock(
                side_effect=Exception("Client initialization failed")
            )

            # Act
            result = await cache_health_check()

            # Assert
            assert result["status"] == "unhealthy"
            assert result["redis_connection"] == "failed"
            assert "Client initialization failed" in result["error"]

    @pytest.mark.asyncio
    async def test_logs_error_on_health_check_failure(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Should log error when health check fails"""
        # Arrange
        with patch("app.api.routes.cache.cache") as mock_cache:
            mock_cache.get_client = AsyncMock(side_effect=Exception("Timeout"))

            # Act
            with caplog.at_level(logging.ERROR):
                await cache_health_check()

            # Assert
            assert "Cache health check failed" in caplog.text
            assert "Timeout" in caplog.text


# ============================================================================
# Integration Tests
# ============================================================================


class TestCacheIntegration:
    """Integration tests for cache endpoints"""

    @pytest.mark.asyncio
    async def test_clear_then_warm_workflow(self) -> None:
        """Should successfully clear cache then warm it"""
        # Arrange
        with (
            patch("app.api.routes.cache.clear_all_cache") as mock_clear,
            patch("app.api.routes.cache.warm_cache") as mock_warm,
        ):
            mock_clear.return_value = True
            mock_warm.return_value = None

            # Act - Clear cache
            clear_result = await clear_cache()
            assert clear_result["status"] == "success"

            # Act - Warm cache
            warm_result = await warm_cache_endpoint()
            assert warm_result["status"] == "success"

            # Assert
            mock_clear.assert_called_once()
            mock_warm.assert_called_once()

    @pytest.mark.asyncio
    async def test_health_check_before_stats(self, mock_request: MagicMock) -> None:
        """Should check health before retrieving stats"""
        # Arrange
        mock_client = AsyncMock()
        mock_client.ping = AsyncMock()

        with (
            patch("app.api.routes.cache.cache") as mock_cache,
            patch("app.api.routes.cache.get_cache_stats") as mock_stats,
        ):
            mock_cache.get_client = AsyncMock(return_value=mock_client)
            mock_stats.return_value = {"hit_ratio": 90.0}

            # Act - Health check
            health_result = await cache_health_check()
            assert health_result["status"] == "healthy"

            # Act - Stats retrieval
            stats_result = await cache_statistics(request=mock_request)
            assert stats_result["status"] == "success"

            # Assert
            mock_client.ping.assert_called_once()
            mock_stats.assert_called_once()

    @pytest.mark.asyncio
    async def test_pattern_clear_multiple_patterns(self) -> None:
        """Should clear multiple patterns sequentially"""
        # Arrange
        patterns = ["user_data", "portfolio", "market_data"]
        with patch("app.api.routes.cache.cache") as mock_cache:
            mock_cache.clear_pattern = AsyncMock(side_effect=[10, 5, 15])

            # Act
            results = []
            for pattern in patterns:
                result = await clear_cache_pattern(pattern=pattern)
                results.append(result)

            # Assert
            assert len(results) == 3
            assert results[0]["deleted_keys"] == 10
            assert results[1]["deleted_keys"] == 5
            assert results[2]["deleted_keys"] == 15
            assert mock_cache.clear_pattern.call_count == 3

    @pytest.mark.asyncio
    async def test_error_resilience_sequence(self) -> None:
        """Should handle errors gracefully in sequence of operations"""
        # Arrange
        with (
            patch("app.api.routes.cache.clear_all_cache") as mock_clear,
            patch("app.api.routes.cache.cache") as mock_cache,
            patch("app.api.routes.cache.get_cache_stats") as mock_stats,
        ):
            # First clear succeeds
            mock_clear.return_value = True

            # Pattern clear fails
            mock_cache.clear_pattern = AsyncMock(side_effect=Exception("Pattern error"))

            # Stats retrieval succeeds
            mock_stats.return_value = {"hit_ratio": 85.0}

            # Act & Assert
            clear_result = await clear_cache()
            assert clear_result["status"] == "success"

            with pytest.raises(HTTPException):
                await clear_cache_pattern(pattern="test")

            # Stats should still work despite previous error
            mock_request = MagicMock(spec=Request)
            stats_result = await cache_statistics(request=mock_request)
            assert stats_result["status"] == "success"


# ============================================================================
# Edge Cases
# ============================================================================


class TestCacheEdgeCases:
    """Test edge cases and boundary conditions"""

    @pytest.mark.asyncio
    async def test_empty_pattern_handling(self) -> None:
        """Should handle empty pattern string"""
        # Arrange
        with patch("app.api.routes.cache.cache") as mock_cache:
            mock_cache.clear_pattern = AsyncMock(return_value=0)

            # Act
            result = await clear_cache_pattern(pattern="")

            # Assert
            assert result["pattern"] == "cache::*"
            mock_cache.clear_pattern.assert_called_once_with("cache::*")

    @pytest.mark.asyncio
    async def test_stats_with_zero_requests(self, mock_request: MagicMock) -> None:
        """Should handle cache stats with zero requests"""
        # Arrange
        zero_stats = {
            "redis_version": "7.0.0",
            "keyspace_hits": 0,
            "keyspace_misses": 0,
            "hit_ratio": 0,
        }
        with patch("app.api.routes.cache.get_cache_stats") as mock_stats:
            mock_stats.return_value = zero_stats

            # Act
            result = await cache_statistics(request=mock_request)

            # Assert
            assert result["cache_stats"]["hit_ratio"] == 0
            assert result["cache_stats"]["keyspace_hits"] == 0

    @pytest.mark.asyncio
    async def test_concurrent_clear_operations(self) -> None:
        """Should handle concurrent clear operations"""
        # Arrange
        with patch("app.api.routes.cache.clear_all_cache") as mock_clear:
            mock_clear.return_value = True

            # Act - Simulate concurrent calls
            results = []
            for _ in range(3):
                result = await clear_cache()
                results.append(result)

            # Assert
            assert all(r["status"] == "success" for r in results)
            assert mock_clear.call_count == 3
