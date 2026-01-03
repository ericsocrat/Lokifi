"""
Comprehensive tests for health check endpoints

Session 95: Health check API route testing
- Tests all 3 endpoints: /health/comprehensive, /health/metrics, /health/component/{name}
- Covers happy paths, error scenarios, edge cases
- Mocks database, Redis, and performance metrics
- Validates response structure and status codes
"""

import time
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.health_check import (
    check_component_health,
    comprehensive_health_check,
    get_performance_metrics,
    get_redis_client,
)

# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def mock_db_session() -> AsyncMock:
    """Mock database session for testing"""
    session = AsyncMock(spec=AsyncSession)
    session.execute = AsyncMock()
    return session


@pytest.fixture
def mock_redis_client() -> MagicMock:
    """Mock Redis client for testing"""
    client = MagicMock()
    client.ping = AsyncMock()
    return client


@pytest.fixture
def mock_performance_metrics() -> dict[str, Any]:
    """Mock performance metrics data"""
    return {
        "total_requests": 1000,
        "avg_response_time": 150.5,
        "error_rate": 0.02,
        "uptime_seconds": 86400,
    }


# ============================================================================
# Test: get_redis_client dependency
# ============================================================================


class TestGetRedisClient:
    """Test Redis client dependency injection"""

    def test_returns_redis_client_instance(self) -> None:
        """Should return RedisClient instance"""
        client = get_redis_client()
        assert client is not None
        # Verify it's the singleton instance from redis_client module
        from app.core.redis_client import redis_client

        assert client is redis_client


# ============================================================================
# Test: /health/comprehensive endpoint
# ============================================================================


class TestComprehensiveHealthCheck:
    """Test comprehensive health check endpoint"""

    @pytest.mark.asyncio
    async def test_all_components_healthy(
        self, mock_db_session: AsyncMock, mock_redis_client: MagicMock
    ) -> None:
        """Should return healthy status when all components are working"""
        # Arrange
        with patch("app.api.routes.health_check.performance_metrics") as mock_perf:
            mock_perf.get_summary.return_value = {
                "total_requests": 100,
                "avg_response_time": 50.0,
            }

            # Act
            result = await comprehensive_health_check(
                db=mock_db_session, redis_client=mock_redis_client
            )

            # Assert
            assert result["status"] == "healthy"
            assert "timestamp" in result
            assert "components" in result
            assert "performance" in result

            # Verify all components are healthy
            assert result["components"]["database"]["status"] == "healthy"
            assert result["components"]["redis"]["status"] == "healthy"
            assert result["components"]["websockets"]["status"] == "healthy"
            assert result["components"]["ai_services"]["status"] == "healthy"

            # Verify response times are included
            assert "response_time_ms" in result["components"]["database"]
            assert "response_time_ms" in result["components"]["redis"]

            # Verify database was queried
            mock_db_session.execute.assert_called_once_with("SELECT 1")
            mock_redis_client.ping.assert_called_once()

    @pytest.mark.asyncio
    async def test_database_failure(
        self, mock_db_session: AsyncMock, mock_redis_client: MagicMock
    ) -> None:
        """Should return degraded status when database fails"""
        # Arrange
        mock_db_session.execute.side_effect = Exception("Database connection failed")
        with patch("app.api.routes.health_check.performance_metrics") as mock_perf:
            mock_perf.get_summary.return_value = {}

            # Act
            result = await comprehensive_health_check(
                db=mock_db_session, redis_client=mock_redis_client
            )

            # Assert
            assert result["status"] == "degraded"
            assert result["components"]["database"]["status"] == "unhealthy"
            assert "error" in result["components"]["database"]
            assert (
                "Database connection failed"
                in result["components"]["database"]["error"]
            )

            # Redis should still be healthy
            assert result["components"]["redis"]["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_redis_failure(
        self, mock_db_session: AsyncMock, mock_redis_client: MagicMock
    ) -> None:
        """Should return degraded status when Redis fails"""
        # Arrange
        mock_redis_client.ping.side_effect = Exception("Redis connection timeout")
        with patch("app.api.routes.health_check.performance_metrics") as mock_perf:
            mock_perf.get_summary.return_value = {}

            # Act
            result = await comprehensive_health_check(
                db=mock_db_session, redis_client=mock_redis_client
            )

            # Assert
            assert result["status"] == "degraded"
            assert result["components"]["redis"]["status"] == "unhealthy"
            assert "error" in result["components"]["redis"]
            assert "Redis connection timeout" in result["components"]["redis"]["error"]

            # Database should still be healthy
            assert result["components"]["database"]["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_multiple_component_failures(
        self, mock_db_session: AsyncMock, mock_redis_client: MagicMock
    ) -> None:
        """Should return degraded status when multiple components fail"""
        # Arrange
        mock_db_session.execute.side_effect = Exception("DB error")
        mock_redis_client.ping.side_effect = Exception("Redis error")
        with patch("app.api.routes.health_check.performance_metrics") as mock_perf:
            mock_perf.get_summary.return_value = {}

            # Act
            result = await comprehensive_health_check(
                db=mock_db_session, redis_client=mock_redis_client
            )

            # Assert
            assert result["status"] == "degraded"
            assert result["components"]["database"]["status"] == "unhealthy"
            assert result["components"]["redis"]["status"] == "unhealthy"

    @pytest.mark.asyncio
    async def test_includes_performance_metrics(
        self, mock_db_session: AsyncMock, mock_redis_client: MagicMock
    ) -> None:
        """Should include performance metrics in response"""
        # Arrange
        mock_metrics = {
            "total_requests": 5000,
            "avg_response_time": 75.3,
            "error_rate": 0.01,
        }
        with patch("app.api.routes.health_check.performance_metrics") as mock_perf:
            mock_perf.get_summary.return_value = mock_metrics

            # Act
            result = await comprehensive_health_check(
                db=mock_db_session, redis_client=mock_redis_client
            )

            # Assert
            assert result["performance"] == mock_metrics
            mock_perf.get_summary.assert_called_once()

    @pytest.mark.asyncio
    async def test_response_time_measurement(
        self, mock_db_session: AsyncMock, mock_redis_client: MagicMock
    ) -> None:
        """Should measure and include response times for each component"""
        # Arrange
        with patch("app.api.routes.health_check.performance_metrics") as mock_perf:
            mock_perf.get_summary.return_value = {}

            # Act
            result = await comprehensive_health_check(
                db=mock_db_session, redis_client=mock_redis_client
            )

            # Assert
            # Response times should be positive numbers
            assert result["components"]["database"]["response_time_ms"] >= 0
            assert result["components"]["redis"]["response_time_ms"] >= 0
            # Response times should be in milliseconds (reasonable range)
            assert result["components"]["database"]["response_time_ms"] < 10000
            assert result["components"]["redis"]["response_time_ms"] < 10000

    @pytest.mark.asyncio
    async def test_timestamp_accuracy(
        self, mock_db_session: AsyncMock, mock_redis_client: MagicMock
    ) -> None:
        """Should include accurate timestamp in response"""
        # Arrange
        with patch("app.api.routes.health_check.performance_metrics") as mock_perf:
            mock_perf.get_summary.return_value = {}

            before_time = time.time()
            # Act
            result = await comprehensive_health_check(
                db=mock_db_session, redis_client=mock_redis_client
            )
            after_time = time.time()

            # Assert
            assert "timestamp" in result
            assert before_time <= result["timestamp"] <= after_time


# ============================================================================
# Test: /health/metrics endpoint
# ============================================================================


class TestGetPerformanceMetrics:
    """Test performance metrics endpoint"""

    @pytest.mark.asyncio
    async def test_returns_performance_summary(self) -> None:
        """Should return performance metrics summary"""
        # Arrange
        mock_metrics = {
            "total_requests": 10000,
            "avg_response_time": 125.5,
            "error_rate": 0.03,
            "uptime_seconds": 172800,
        }
        with patch("app.api.routes.health_check.performance_metrics") as mock_perf:
            mock_perf.get_summary.return_value = mock_metrics

            # Act
            result = await get_performance_metrics()

            # Assert
            assert result == mock_metrics
            mock_perf.get_summary.assert_called_once()

    @pytest.mark.asyncio
    async def test_empty_metrics(self) -> None:
        """Should handle empty metrics gracefully"""
        # Arrange
        with patch("app.api.routes.health_check.performance_metrics") as mock_perf:
            mock_perf.get_summary.return_value = {}

            # Act
            result = await get_performance_metrics()

            # Assert
            assert result == {}
            assert isinstance(result, dict)


# ============================================================================
# Test: /health/component/{component_name} endpoint
# ============================================================================


class TestCheckComponentHealth:
    """Test individual component health check endpoint"""

    @pytest.mark.asyncio
    async def test_database_component_healthy(
        self, mock_db_session: AsyncMock, mock_redis_client: MagicMock
    ) -> None:
        """Should return healthy status for database component"""
        # Act
        result = await check_component_health(
            component_name="database",
            db=mock_db_session,
            redis_client=mock_redis_client,
        )

        # Assert
        assert result["component"] == "database"
        assert result["status"] == "healthy"
        assert "response_time_ms" in result
        assert result["checks_passed"] == ["connection", "query_execution"]
        mock_db_session.execute.assert_called_once_with("SELECT 1")

    @pytest.mark.asyncio
    async def test_database_component_unhealthy(
        self, mock_db_session: AsyncMock, mock_redis_client: MagicMock
    ) -> None:
        """Should return unhealthy status when database fails"""
        # Arrange
        mock_db_session.execute.side_effect = Exception("Connection lost")

        # Act
        result = await check_component_health(
            component_name="database",
            db=mock_db_session,
            redis_client=mock_redis_client,
        )

        # Assert
        assert result["component"] == "database"
        assert result["status"] == "unhealthy"
        assert "error" in result
        assert "Connection lost" in result["error"]

    @pytest.mark.asyncio
    async def test_redis_component_healthy(
        self, mock_db_session: AsyncMock, mock_redis_client: MagicMock
    ) -> None:
        """Should return healthy status for Redis component"""
        # Act
        result = await check_component_health(
            component_name="redis",
            db=mock_db_session,
            redis_client=mock_redis_client,
        )

        # Assert
        assert result["component"] == "redis"
        assert result["status"] == "healthy"
        assert "response_time_ms" in result
        assert result["checks_passed"] == ["connection", "ping"]
        mock_redis_client.ping.assert_called_once()

    @pytest.mark.asyncio
    async def test_redis_component_unhealthy(
        self, mock_db_session: AsyncMock, mock_redis_client: MagicMock
    ) -> None:
        """Should return unhealthy status when Redis fails"""
        # Arrange
        mock_redis_client.ping.side_effect = Exception("Timeout")

        # Act
        result = await check_component_health(
            component_name="redis",
            db=mock_db_session,
            redis_client=mock_redis_client,
        )

        # Assert
        assert result["component"] == "redis"
        assert result["status"] == "unhealthy"
        assert "error" in result
        assert "Timeout" in result["error"]

    @pytest.mark.asyncio
    async def test_unknown_component_raises_404(
        self, mock_db_session: AsyncMock, mock_redis_client: MagicMock
    ) -> None:
        """Should raise 404 for unknown component"""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await check_component_health(
                component_name="unknown_service",
                db=mock_db_session,
                redis_client=mock_redis_client,
            )

        assert exc_info.value.status_code == 404
        assert "Component 'unknown_service' not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_component_name_case_sensitive(
        self, mock_db_session: AsyncMock, mock_redis_client: MagicMock
    ) -> None:
        """Should be case-sensitive for component names"""
        # Act & Assert - uppercase should fail
        with pytest.raises(HTTPException) as exc_info:
            await check_component_health(
                component_name="DATABASE",
                db=mock_db_session,
                redis_client=mock_redis_client,
            )

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_database_response_time_measurement(
        self, mock_db_session: AsyncMock, mock_redis_client: MagicMock
    ) -> None:
        """Should measure database response time accurately"""
        # Act
        result = await check_component_health(
            component_name="database",
            db=mock_db_session,
            redis_client=mock_redis_client,
        )

        # Assert
        assert "response_time_ms" in result
        assert result["response_time_ms"] >= 0
        assert result["response_time_ms"] < 10000  # Reasonable upper bound

    @pytest.mark.asyncio
    async def test_redis_response_time_measurement(
        self, mock_db_session: AsyncMock, mock_redis_client: MagicMock
    ) -> None:
        """Should measure Redis response time accurately"""
        # Act
        result = await check_component_health(
            component_name="redis",
            db=mock_db_session,
            redis_client=mock_redis_client,
        )

        # Assert
        assert "response_time_ms" in result
        assert result["response_time_ms"] >= 0
        assert result["response_time_ms"] < 10000  # Reasonable upper bound


# ============================================================================
# Integration Tests
# ============================================================================


class TestHealthCheckIntegration:
    """Integration tests for health check endpoints"""

    @pytest.mark.asyncio
    async def test_comprehensive_then_component_consistency(
        self, mock_db_session: AsyncMock, mock_redis_client: MagicMock
    ) -> None:
        """Should return consistent results between comprehensive and component checks"""
        # Arrange
        with patch("app.api.routes.health_check.performance_metrics") as mock_perf:
            mock_perf.get_summary.return_value = {}

            # Act - Get comprehensive health
            comprehensive = await comprehensive_health_check(
                db=mock_db_session, redis_client=mock_redis_client
            )

            # Reset mocks for second call
            mock_db_session.execute.reset_mock()
            mock_redis_client.ping.reset_mock()

            # Act - Get individual components
            db_health = await check_component_health(
                component_name="database",
                db=mock_db_session,
                redis_client=mock_redis_client,
            )
            redis_health = await check_component_health(
                component_name="redis",
                db=mock_db_session,
                redis_client=mock_redis_client,
            )

            # Assert - Statuses should match
            assert (
                comprehensive["components"]["database"]["status"] == db_health["status"]
            )
            assert (
                comprehensive["components"]["redis"]["status"] == redis_health["status"]
            )

    @pytest.mark.asyncio
    async def test_multiple_consecutive_health_checks(
        self, mock_db_session: AsyncMock, mock_redis_client: MagicMock
    ) -> None:
        """Should handle multiple consecutive health checks without issues"""
        # Arrange
        with patch("app.api.routes.health_check.performance_metrics") as mock_perf:
            mock_perf.get_summary.return_value = {}

            # Act - Call health check 3 times
            results = []
            for _ in range(3):
                result = await comprehensive_health_check(
                    db=mock_db_session, redis_client=mock_redis_client
                )
                results.append(result)

            # Assert - All should be healthy
            for result in results:
                assert result["status"] == "healthy"
                assert all(
                    comp["status"] == "healthy"
                    for comp in result["components"].values()
                )

            # Assert - Database and Redis called 3 times each
            assert mock_db_session.execute.call_count == 3
            assert mock_redis_client.ping.call_count == 3
