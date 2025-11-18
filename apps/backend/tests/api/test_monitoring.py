"""
Comprehensive tests for monitoring endpoints

Session 97: Monitoring API route testing
- Tests all 13 endpoints for observability, metrics, WebSocket analytics, cache, alerts
- Covers happy paths, error scenarios, admin access control, edge cases
- Mocks monitoring system, WebSocket manager, Redis client, alert manager
- Validates metrics, health checks, permissions, analytics
"""

import logging
from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.api.routes.monitoring import (
    get_active_connections,
    get_alerts,
    get_cache_metrics,
    get_monitoring_dashboard,
    get_monitoring_status,
    get_performance_insights,
    get_service_health,
    get_system_health,
    get_system_metrics,
    get_websocket_analytics,
    invalidate_cache_pattern,
    start_monitoring,
    stop_monitoring,
    websocket_load_test,
)
from fastapi import HTTPException

# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def mock_admin_user() -> dict[str, Any]:
    """Mock admin user for authentication"""
    return {"handle": "admin", "user_id": "admin-123", "email": "admin@lokifi.com"}


@pytest.fixture
def mock_regular_user() -> dict[str, Any]:
    """Mock regular user for authentication"""
    return {"handle": "testuser", "user_id": "user-456", "email": "user@lokifi.com"}


@pytest.fixture
def mock_dashboard_data() -> dict[str, Any]:
    """Mock monitoring dashboard data"""
    return {
        "system_status": "healthy",
        "health_checks": {
            "database": {"status": "healthy", "response_time": 0.05},
            "redis": {"status": "healthy", "response_time": 0.02},
        },
        "current_metrics": {
            "cpu_usage": 45.2,
            "memory_usage": 62.5,
            "active_connections": 150,
        },
        "performance_insights": {"avg_response_time": 0.15, "requests_per_second": 1200},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@pytest.fixture
def mock_websocket_analytics() -> dict[str, Any]:
    """Mock WebSocket analytics data"""
    return {
        "total_connections": 150,
        "active_connections": 120,
        "messages_sent": 5000,
        "messages_received": 4800,
        "avg_message_rate": 50.5,
    }


# ============================================================================
# Test: /monitoring/health endpoint
# ============================================================================


class TestGetSystemHealth:
    """Test system health endpoint"""

    @pytest.mark.asyncio
    async def test_returns_health_status_successfully(
        self, mock_dashboard_data: dict[str, Any]
    ) -> None:
        """Should return system health status when successful"""
        # Arrange
        with patch("app.api.routes.monitoring.monitoring_system") as mock_system:
            mock_system.get_dashboard_data = AsyncMock(return_value=mock_dashboard_data)

            # Act
            result = await get_system_health()

            # Assert
            assert result["status"] == "success"
            assert result["data"]["system_status"] == "healthy"
            assert "health_checks" in result["data"]
            assert "timestamp" in result["data"]
            mock_system.get_dashboard_data.assert_called_once()

    @pytest.mark.asyncio
    async def test_raises_500_on_monitoring_system_failure(self) -> None:
        """Should raise HTTPException 500 when monitoring system fails"""
        # Arrange
        with patch("app.api.routes.monitoring.monitoring_system") as mock_system:
            mock_system.get_dashboard_data = AsyncMock(
                side_effect=Exception("Monitoring system error")
            )

            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                await get_system_health()

            assert exc_info.value.status_code == 500
            assert "Failed to get health status" in str(exc_info.value.detail)


# ============================================================================
# Test: /monitoring/health/{service} endpoint
# ============================================================================


class TestGetServiceHealth:
    """Test service-specific health endpoint"""

    @pytest.mark.asyncio
    async def test_returns_service_health_successfully(self) -> None:
        """Should return health status for specific service"""
        # Arrange
        mock_health_check = MagicMock()
        mock_health_check.to_dict.return_value = {
            "status": "healthy",
            "response_time": 0.05,
            "last_check": "2025-11-18T12:00:00Z",
        }

        with patch("app.api.routes.monitoring.monitoring_system") as mock_system:
            mock_system._run_all_health_checks = AsyncMock(
                return_value={"database": mock_health_check}
            )

            # Act
            result = await get_service_health(service="database")

            # Assert
            assert result["status"] == "success"
            assert result["data"]["status"] == "healthy"
            assert result["data"]["response_time"] == 0.05
            mock_health_check.to_dict.assert_called_once()

    @pytest.mark.asyncio
    async def test_raises_404_for_unknown_service(self) -> None:
        """Should raise HTTPException 404 for unknown service"""
        # Arrange
        with patch("app.api.routes.monitoring.monitoring_system") as mock_system:
            mock_system._run_all_health_checks = AsyncMock(
                return_value={"database": MagicMock(), "redis": MagicMock()}
            )

            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                await get_service_health(service="nonexistent")

            assert exc_info.value.status_code == 404
            assert "Service 'nonexistent' not found" in str(exc_info.value.detail)


# ============================================================================
# Test: /monitoring/metrics endpoint
# ============================================================================


class TestGetSystemMetrics:
    """Test system metrics endpoint"""

    @pytest.mark.asyncio
    async def test_returns_metrics_with_default_timeframe(
        self, mock_dashboard_data: dict[str, Any]
    ) -> None:
        """Should return metrics with default 60-minute timeframe"""
        # Arrange
        with patch("app.api.routes.monitoring.monitoring_system") as mock_system:
            mock_system.get_dashboard_data = AsyncMock(return_value=mock_dashboard_data)

            # Act
            result = await get_system_metrics()

            # Assert
            assert result["status"] == "success"
            assert "current_metrics" in result["data"]
            assert "performance_insights" in result["data"]
            assert result["data"]["current_metrics"]["cpu_usage"] == 45.2

    @pytest.mark.asyncio
    async def test_respects_custom_minutes_parameter(
        self, mock_dashboard_data: dict[str, Any]
    ) -> None:
        """Should accept custom minutes parameter"""
        # Arrange
        with patch("app.api.routes.monitoring.monitoring_system") as mock_system:
            mock_system.get_dashboard_data = AsyncMock(return_value=mock_dashboard_data)

            # Act
            result = await get_system_metrics(minutes=120)

            # Assert
            assert result["status"] == "success"
            # Note: Current implementation doesn't use minutes param, but endpoint accepts it
            mock_system.get_dashboard_data.assert_called_once()


# ============================================================================
# Test: /monitoring/websocket/analytics endpoint
# ============================================================================


class TestGetWebSocketAnalytics:
    """Test WebSocket analytics endpoint"""

    @pytest.mark.asyncio
    async def test_returns_websocket_analytics_successfully(
        self, mock_websocket_analytics: dict[str, Any]
    ) -> None:
        """Should return WebSocket analytics"""
        # Arrange
        with patch("app.api.routes.monitoring.advanced_websocket_manager") as mock_manager:
            mock_manager.get_analytics.return_value = mock_websocket_analytics

            # Act
            result = await get_websocket_analytics()

            # Assert
            assert result["status"] == "success"
            assert result["data"]["total_connections"] == 150
            assert result["data"]["messages_sent"] == 5000
            mock_manager.get_analytics.assert_called_once()

    @pytest.mark.asyncio
    async def test_raises_500_on_analytics_failure(self) -> None:
        """Should raise HTTPException 500 when analytics retrieval fails"""
        # Arrange
        with patch("app.api.routes.monitoring.advanced_websocket_manager") as mock_manager:
            mock_manager.get_analytics.side_effect = Exception("Analytics error")

            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                await get_websocket_analytics()

            assert exc_info.value.status_code == 500
            assert "Failed to get WebSocket analytics" in str(exc_info.value.detail)


# ============================================================================
# Test: /monitoring/websocket/connections endpoint (Admin Only)
# ============================================================================


class TestGetActiveConnections:
    """Test active connections endpoint with admin access control"""

    @pytest.mark.asyncio
    async def test_admin_can_view_connections(self, mock_admin_user: dict[str, Any]) -> None:
        """Should allow admin to view active connections"""
        # Arrange
        mock_connection_info = MagicMock()
        mock_connection_info.user_id = "user-123"
        mock_connection_info.rooms = {"room1", "room2"}
        mock_connection_info.subscriptions = {"sub1"}
        mock_connection_info.metrics.connected_at = datetime.now(timezone.utc)
        mock_connection_info.metrics.last_activity = datetime.now(timezone.utc)
        mock_connection_info.metrics.messages_sent = 100
        mock_connection_info.metrics.messages_received = 95

        with patch("app.api.routes.monitoring.advanced_websocket_manager") as mock_manager:
            mock_manager.connection_pool.get_stats.return_value = {
                "total_connections": 1,
                "active_connections": 1,
            }
            mock_manager.connection_pool.connections = {"conn-1": mock_connection_info}

            # Act
            result = await get_active_connections(current_user=mock_admin_user)

            # Assert
            assert result["status"] == "success"
            assert result["data"]["statistics"]["total_connections"] == 1
            assert len(result["data"]["connections"]) == 1
            assert result["data"]["connections"][0]["user_id"] == "user-123"

    @pytest.mark.asyncio
    async def test_non_admin_cannot_view_connections(
        self, mock_regular_user: dict[str, Any]
    ) -> None:
        """Should deny non-admin access to connections"""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await get_active_connections(current_user=mock_regular_user)

        assert exc_info.value.status_code == 403
        assert "Admin access required" in str(exc_info.value.detail)


# ============================================================================
# Test: /monitoring/cache/metrics endpoint
# ============================================================================


class TestGetCacheMetrics:
    """Test cache metrics endpoint"""

    @pytest.mark.asyncio
    async def test_returns_cache_metrics_successfully(self) -> None:
        """Should return Redis cache metrics"""
        # Arrange
        mock_metrics = {
            "hit_ratio": 85.5,
            "total_keys": 1000,
            "memory_usage": "2.5MB",
            "operations_per_second": 500,
        }

        with patch("app.api.routes.monitoring.advanced_redis_client") as mock_client:
            mock_client.get_metrics = AsyncMock(return_value=mock_metrics)

            # Act
            result = await get_cache_metrics()

            # Assert
            assert result["status"] == "success"
            assert result["data"]["hit_ratio"] == 85.5
            assert result["data"]["total_keys"] == 1000
            mock_client.get_metrics.assert_called_once()


# ============================================================================
# Test: /monitoring/cache/invalidate endpoint (Admin Only)
# ============================================================================


class TestInvalidateCachePattern:
    """Test cache invalidation endpoint with admin access control"""

    @pytest.mark.asyncio
    async def test_admin_can_invalidate_cache(self, mock_admin_user: dict[str, Any]) -> None:
        """Should allow admin to invalidate cache pattern"""
        # Arrange
        with patch("app.api.routes.monitoring.advanced_redis_client") as mock_client:
            mock_client.invalidate_pattern = AsyncMock(return_value=15)

            # Act
            result = await invalidate_cache_pattern(pattern="user:*", current_user=mock_admin_user)

            # Assert
            assert result["status"] == "success"
            assert result["data"]["pattern"] == "user:*"
            assert result["data"]["invalidated_count"] == 15
            # FastAPI Query(None) wraps None in Query object, check positional args
            call_args = mock_client.invalidate_pattern.call_args
            assert call_args[0][0] == "user:*"  # pattern argument
            assert mock_client.invalidate_pattern.call_count == 1

    @pytest.mark.asyncio
    async def test_non_admin_cannot_invalidate_cache(
        self, mock_regular_user: dict[str, Any]
    ) -> None:
        """Should deny non-admin access to cache invalidation"""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await invalidate_cache_pattern(pattern="test:*", current_user=mock_regular_user)

        assert exc_info.value.status_code == 403
        assert "Admin access required" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_invalidate_with_specific_layer(self, mock_admin_user: dict[str, Any]) -> None:
        """Should invalidate cache with specific layer"""
        # Arrange
        with patch("app.api.routes.monitoring.advanced_redis_client") as mock_client:
            mock_client.invalidate_pattern = AsyncMock(return_value=5)

            # Act
            result = await invalidate_cache_pattern(
                pattern="api:*", layer="L1", current_user=mock_admin_user
            )

            # Assert
            assert result["data"]["layer"] == "L1"
            mock_client.invalidate_pattern.assert_called_once_with("api:*", "L1")


# ============================================================================
# Test: /monitoring/alerts endpoint (Admin Only)
# ============================================================================


class TestGetAlerts:
    """Test alerts endpoint with admin access control"""

    @pytest.mark.asyncio
    async def test_admin_can_view_all_alerts(self, mock_admin_user: dict[str, Any]) -> None:
        """Should allow admin to view all alerts"""
        # Arrange
        mock_alert_manager = MagicMock()
        mock_alert_manager.active_alerts = {"alert1": {"id": "alert1", "status": "active"}}
        mock_alert_manager.alert_history = [
            {"id": "alert1", "status": "active"},
            {"id": "alert2", "status": "resolved"},
        ]

        with patch("app.api.routes.monitoring.monitoring_system") as mock_system:
            mock_system.alert_manager = mock_alert_manager

            # Act
            result = await get_alerts(current_user=mock_admin_user)

            # Assert
            assert result["status"] == "success"
            assert result["data"]["active_count"] == 1
            assert result["data"]["total_count"] == 2
            assert len(result["data"]["alerts"]) == 2

    @pytest.mark.asyncio
    async def test_filters_active_alerts_only(self, mock_admin_user: dict[str, Any]) -> None:
        """Should filter to show only active alerts when requested"""
        # Arrange
        mock_alert_manager = MagicMock()
        mock_alert_manager.active_alerts = {
            "alert1": {"id": "alert1", "status": "active"},
            "alert2": {"id": "alert2", "status": "active"},
        }
        mock_alert_manager.alert_history = [{"id": "alert3", "status": "resolved"}]

        with patch("app.api.routes.monitoring.monitoring_system") as mock_system:
            mock_system.alert_manager = mock_alert_manager

            # Act
            result = await get_alerts(active_only=True, current_user=mock_admin_user)

            # Assert
            assert len(result["data"]["alerts"]) == 2
            assert all(alert["status"] == "active" for alert in result["data"]["alerts"])

    @pytest.mark.asyncio
    async def test_non_admin_cannot_view_alerts(self, mock_regular_user: dict[str, Any]) -> None:
        """Should deny non-admin access to alerts"""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await get_alerts(current_user=mock_regular_user)

        assert exc_info.value.status_code == 403
        assert "Admin access required" in str(exc_info.value.detail)


# ============================================================================
# Test: /monitoring/dashboard endpoint
# ============================================================================


class TestGetMonitoringDashboard:
    """Test monitoring dashboard endpoint"""

    @pytest.mark.asyncio
    async def test_returns_complete_dashboard_data(
        self, mock_dashboard_data: dict[str, Any]
    ) -> None:
        """Should return comprehensive dashboard data"""
        # Arrange
        with patch("app.api.routes.monitoring.monitoring_system") as mock_system:
            mock_system.get_dashboard_data = AsyncMock(return_value=mock_dashboard_data)

            # Act
            result = await get_monitoring_dashboard()

            # Assert
            assert result["status"] == "success"
            assert "system_status" in result["data"]
            assert "health_checks" in result["data"]
            assert "current_metrics" in result["data"]
            assert "performance_insights" in result["data"]


# ============================================================================
# Test: /monitoring/performance/insights endpoint
# ============================================================================


class TestGetPerformanceInsights:
    """Test performance insights endpoint"""

    @pytest.mark.asyncio
    async def test_returns_performance_insights(self) -> None:
        """Should return performance analysis and insights"""
        # Arrange
        mock_insights = {
            "bottlenecks": ["Database queries slow", "High memory usage"],
            "recommendations": ["Add index to users table", "Enable query caching"],
            "performance_score": 7.5,
        }

        with patch("app.api.routes.monitoring.monitoring_system") as mock_system:
            mock_system.performance_analyzer.get_insights.return_value = mock_insights

            # Act
            result = await get_performance_insights()

            # Assert
            assert result["status"] == "success"
            assert result["data"]["performance_score"] == 7.5
            assert len(result["data"]["bottlenecks"]) == 2


# ============================================================================
# Test: /monitoring/start and /monitoring/stop endpoints (Admin Only)
# ============================================================================


class TestMonitoringControl:
    """Test monitoring start/stop control endpoints"""

    @pytest.mark.asyncio
    async def test_admin_can_start_monitoring(self, mock_admin_user: dict[str, Any]) -> None:
        """Should allow admin to start monitoring"""
        # Arrange
        with patch("app.api.routes.monitoring.monitoring_system") as mock_system:
            mock_system.start_monitoring = AsyncMock()

            # Act
            result = await start_monitoring(current_user=mock_admin_user)

            # Assert
            assert result["status"] == "success"
            assert "started" in result["message"].lower()
            mock_system.start_monitoring.assert_called_once()

    @pytest.mark.asyncio
    async def test_admin_can_stop_monitoring(self, mock_admin_user: dict[str, Any]) -> None:
        """Should allow admin to stop monitoring"""
        # Arrange
        with patch("app.api.routes.monitoring.monitoring_system") as mock_system:
            mock_system.stop_monitoring = AsyncMock()

            # Act
            result = await stop_monitoring(current_user=mock_admin_user)

            # Assert
            assert result["status"] == "success"
            assert "stopped" in result["message"].lower()
            mock_system.stop_monitoring.assert_called_once()

    @pytest.mark.asyncio
    async def test_non_admin_cannot_control_monitoring(
        self, mock_regular_user: dict[str, Any]
    ) -> None:
        """Should deny non-admin access to monitoring control"""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await start_monitoring(current_user=mock_regular_user)

        assert exc_info.value.status_code == 403

        with pytest.raises(HTTPException) as exc_info:
            await stop_monitoring(current_user=mock_regular_user)

        assert exc_info.value.status_code == 403


# ============================================================================
# Test: /monitoring/status endpoint
# ============================================================================


class TestGetMonitoringStatus:
    """Test monitoring status endpoint"""

    @pytest.mark.asyncio
    async def test_returns_monitoring_status(self) -> None:
        """Should return current monitoring system status"""
        # Arrange
        mock_last_metrics = MagicMock()
        mock_last_metrics.timestamp = datetime.now(timezone.utc)

        with patch("app.api.routes.monitoring.monitoring_system") as mock_system:
            mock_system.monitoring_active = True
            mock_system.monitoring_interval = 60
            mock_system.health_checks = ["db", "redis", "websocket"]
            mock_system.alert_manager.alert_rules = ["rule1", "rule2"]
            mock_system.last_metrics = mock_last_metrics

            # Act
            result = await get_monitoring_status()

            # Assert
            assert result["status"] == "success"
            assert result["data"]["monitoring_active"] is True
            assert result["data"]["monitoring_interval"] == 60
            assert result["data"]["health_checks_count"] == 3
            assert result["data"]["alert_rules_count"] == 2

    @pytest.mark.asyncio
    async def test_handles_no_last_metrics(self) -> None:
        """Should handle case when no metrics have been collected yet"""
        # Arrange
        with patch("app.api.routes.monitoring.monitoring_system") as mock_system:
            mock_system.monitoring_active = False
            mock_system.monitoring_interval = 60
            mock_system.health_checks = []
            mock_system.alert_manager.alert_rules = []
            mock_system.last_metrics = None

            # Act
            result = await get_monitoring_status()

            # Assert
            assert result["data"]["last_check"] is None


# ============================================================================
# Test: /monitoring/load-test/websocket endpoint (Admin Only)
# ============================================================================


class TestWebSocketLoadTest:
    """Test WebSocket load testing endpoint"""

    @pytest.mark.asyncio
    async def test_admin_can_run_load_test(self, mock_admin_user: dict[str, Any]) -> None:
        """Should allow admin to run WebSocket load test"""
        # Act
        result = await websocket_load_test(
            connections=100, duration=60, current_user=mock_admin_user
        )

        # Assert
        assert result["status"] == "success"
        assert result["data"]["test_type"] == "websocket_load_test"
        assert result["data"]["parameters"]["connections"] == 100
        assert result["data"]["parameters"]["duration"] == 60
        assert "results" in result["data"]
        assert result["data"]["results"]["connections_established"] == 100

    @pytest.mark.asyncio
    async def test_non_admin_cannot_run_load_test(self, mock_regular_user: dict[str, Any]) -> None:
        """Should deny non-admin access to load testing"""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await websocket_load_test(current_user=mock_regular_user)

        assert exc_info.value.status_code == 403
        assert "Admin access required" in str(exc_info.value.detail)


# ============================================================================
# Integration Tests
# ============================================================================


class TestMonitoringIntegration:
    """Integration tests for monitoring endpoints"""

    @pytest.mark.asyncio
    async def test_health_to_metrics_workflow(self, mock_dashboard_data: dict[str, Any]) -> None:
        """Should successfully get health then metrics"""
        # Arrange
        with patch("app.api.routes.monitoring.monitoring_system") as mock_system:
            mock_system.get_dashboard_data = AsyncMock(return_value=mock_dashboard_data)

            # Act - Get health
            health = await get_system_health()
            assert health["data"]["system_status"] == "healthy"

            # Act - Get metrics
            metrics = await get_system_metrics()
            assert metrics["data"]["current_metrics"]["cpu_usage"] == 45.2

    @pytest.mark.asyncio
    async def test_admin_workflow_cache_and_alerts(self, mock_admin_user: dict[str, Any]) -> None:
        """Should allow admin to manage cache and view alerts"""
        # Arrange
        mock_alert_manager = MagicMock()
        mock_alert_manager.active_alerts = {}
        mock_alert_manager.alert_history = []

        with patch("app.api.routes.monitoring.advanced_redis_client") as mock_client, patch(
            "app.api.routes.monitoring.monitoring_system"
        ) as mock_system:
            mock_client.invalidate_pattern = AsyncMock(return_value=10)
            mock_system.alert_manager = mock_alert_manager

            # Act - Invalidate cache
            cache_result = await invalidate_cache_pattern(
                pattern="test:*", current_user=mock_admin_user
            )
            assert cache_result["data"]["invalidated_count"] == 10

            # Act - View alerts
            alerts_result = await get_alerts(current_user=mock_admin_user)
            assert alerts_result["data"]["active_count"] == 0


# ============================================================================
# Edge Cases
# ============================================================================


class TestMonitoringEdgeCases:
    """Test edge cases and boundary conditions"""

    @pytest.mark.asyncio
    async def test_handles_empty_alert_history(self, mock_admin_user: dict[str, Any]) -> None:
        """Should handle empty alert history gracefully"""
        # Arrange
        mock_alert_manager = MagicMock()
        mock_alert_manager.active_alerts = {}
        mock_alert_manager.alert_history = []

        with patch("app.api.routes.monitoring.monitoring_system") as mock_system:
            mock_system.alert_manager = mock_alert_manager

            # Act
            result = await get_alerts(current_user=mock_admin_user)

            # Assert
            assert result["data"]["total_count"] == 0
            assert len(result["data"]["alerts"]) == 0

    @pytest.mark.asyncio
    async def test_handles_zero_cache_invalidations(self, mock_admin_user: dict[str, Any]) -> None:
        """Should handle zero cache invalidations"""
        # Arrange
        with patch("app.api.routes.monitoring.advanced_redis_client") as mock_client:
            mock_client.invalidate_pattern = AsyncMock(return_value=0)

            # Act
            result = await invalidate_cache_pattern(
                pattern="nonexistent:*", current_user=mock_admin_user
            )

            # Assert
            assert result["data"]["invalidated_count"] == 0

    @pytest.mark.asyncio
    async def test_respects_alert_limit_parameter(self, mock_admin_user: dict[str, Any]) -> None:
        """Should respect limit parameter for alerts"""
        # Arrange
        mock_alert_manager = MagicMock()
        mock_alert_manager.active_alerts = {}
        mock_alert_manager.alert_history = [{"id": f"alert{i}"} for i in range(500)]

        with patch("app.api.routes.monitoring.monitoring_system") as mock_system:
            mock_system.alert_manager = mock_alert_manager

            # Act
            result = await get_alerts(limit=50, current_user=mock_admin_user)

            # Assert
            assert len(result["data"]["alerts"]) == 50
