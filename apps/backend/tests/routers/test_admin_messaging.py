"""
Tests for Admin Messaging Router.

Session 107: Comprehensive testing for admin_messaging.py.
Covers platform stats, performance metrics, moderation management,
connections, broadcasts, and health checks for J4 Direct Messages admin API.

Coverage improvements: 26% → 90%+
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.routers.admin_messaging import (
    add_blocked_words,
    admin_broadcast_message,
    comprehensive_health_check,
    get_active_connections,
    get_admin_user,
    get_moderation_stats,
    get_performance_metrics,
    get_platform_messaging_stats,
    remove_blocked_words,
)

# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def mock_db():
    """Mock database session."""
    db = MagicMock(spec=AsyncSession)
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    return db


@pytest.fixture
def mock_admin_user():
    """Mock admin user."""
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "admin@lokifi.com"
    user.is_active = True
    return user


@pytest.fixture
def mock_analytics_service():
    """Mock MessageAnalyticsService."""
    service = MagicMock()
    service.get_platform_statistics = AsyncMock(
        return_value={
            "total_messages": 10000,
            "active_conversations": 500,
            "average_response_time": 30.5,
            "unique_users": 250,
        }
    )
    return service


@pytest.fixture
def mock_moderation_service():
    """Mock MessageModerationService."""
    service = MagicMock()
    service.get_blocked_words.return_value = ["spam", "scam", "phishing", "fraud"]
    service.user_warning_counts = {"user1": 2, "user2": 1}
    service.add_blocked_words = MagicMock()
    service.remove_blocked_words = MagicMock()
    return service


@pytest.fixture
def mock_performance_monitor():
    """Mock performance_monitor."""
    monitor = MagicMock()
    monitor.get_metrics_summary.return_value = {
        "cpu_usage": 45.2,
        "memory_usage": 60.5,
        "request_count": 1000,
    }
    monitor.run_health_checks = AsyncMock(
        return_value=[
            MagicMock(
                service="database",
                status="healthy",
                response_time_ms=5.2,
                details=None,
                timestamp=datetime.now(timezone.utc),
            ),
            MagicMock(
                service="redis",
                status="healthy",
                response_time_ms=2.1,
                details=None,
                timestamp=datetime.now(timezone.utc),
            ),
        ]
    )
    monitor.get_api_performance.return_value = {
        "avg_response_time": 50.3,
        "requests_per_second": 100,
    }
    monitor.get_websocket_stats.return_value = {
        "active_connections": 50,
        "messages_sent": 5000,
    }
    monitor.check_system_alerts.return_value = []
    return monitor


@pytest.fixture
def mock_connection_manager():
    """Mock connection_manager."""
    manager = MagicMock()
    manager.get_online_users.return_value = [uuid.uuid4(), uuid.uuid4(), uuid.uuid4()]
    manager.redis_client = MagicMock()
    manager.send_personal_message = AsyncMock()
    return manager


# ============================================================================
# Test: get_admin_user
# ============================================================================


class TestGetAdminUser:
    """Tests for get_admin_user dependency."""

    @pytest.mark.asyncio
    async def test_get_admin_user_returns_user(self, mock_admin_user):
        """Test get_admin_user returns the current user."""
        result = await get_admin_user(current_user=mock_admin_user)
        assert result == mock_admin_user

    @pytest.mark.asyncio
    async def test_get_admin_user_preserves_email(self, mock_admin_user):
        """Test admin user email is preserved."""
        result = await get_admin_user(current_user=mock_admin_user)
        assert result.email == "admin@lokifi.com"


# ============================================================================
# Test: get_platform_messaging_stats
# ============================================================================


class TestGetPlatformMessagingStats:
    """Tests for get_platform_messaging_stats endpoint."""

    @pytest.mark.asyncio
    async def test_get_stats_success(
        self, mock_db, mock_admin_user, mock_analytics_service
    ):
        """Test successful retrieval of platform stats."""
        with patch(
            "app.routers.admin_messaging.MessageAnalyticsService",
            return_value=mock_analytics_service,
        ):
            result = await get_platform_messaging_stats(
                days_back=30, admin_user=mock_admin_user, db=mock_db
            )

            assert "total_messages" in result
            assert result["total_messages"] == 10000
            assert result["requested_by"] == "admin@lokifi.com"
            assert "request_time" in result

    @pytest.mark.asyncio
    async def test_get_stats_custom_days_back(
        self, mock_db, mock_admin_user, mock_analytics_service
    ):
        """Test stats with custom days_back parameter."""
        with patch(
            "app.routers.admin_messaging.MessageAnalyticsService",
            return_value=mock_analytics_service,
        ):
            result = await get_platform_messaging_stats(
                days_back=7, admin_user=mock_admin_user, db=mock_db
            )

            assert "total_messages" in result
            mock_analytics_service.get_platform_statistics.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_stats_service_error(self, mock_db, mock_admin_user):
        """Test handling of service errors."""
        mock_service = MagicMock()
        mock_service.get_platform_statistics = AsyncMock(
            side_effect=Exception("Database error")
        )

        with patch(
            "app.routers.admin_messaging.MessageAnalyticsService",
            return_value=mock_service,
        ):
            with pytest.raises(HTTPException) as exc_info:
                await get_platform_messaging_stats(
                    days_back=30, admin_user=mock_admin_user, db=mock_db
                )

            assert exc_info.value.status_code == 500
            assert "Failed to get platform statistics" in exc_info.value.detail


# ============================================================================
# Test: get_performance_metrics
# ============================================================================


class TestGetPerformanceMetrics:
    """Tests for get_performance_metrics endpoint."""

    @pytest.mark.asyncio
    async def test_get_metrics_success(self, mock_admin_user, mock_performance_monitor):
        """Test successful retrieval of performance metrics."""
        with patch(
            "app.routers.admin_messaging.performance_monitor", mock_performance_monitor
        ):
            result = await get_performance_metrics(
                minutes_back=10, admin_user=mock_admin_user
            )

            assert "timestamp" in result
            assert result["period_minutes"] == 10
            assert "metrics" in result
            assert "health_checks" in result
            assert "api_performance" in result
            assert "websocket_stats" in result
            assert "alerts" in result
            assert result["system_status"] == "healthy"

    @pytest.mark.asyncio
    async def test_get_metrics_with_alerts(
        self, mock_admin_user, mock_performance_monitor
    ):
        """Test metrics when system has alerts."""
        mock_performance_monitor.check_system_alerts.return_value = [
            {"type": "high_cpu", "message": "CPU > 90%"}
        ]

        with patch(
            "app.routers.admin_messaging.performance_monitor", mock_performance_monitor
        ):
            result = await get_performance_metrics(
                minutes_back=10, admin_user=mock_admin_user
            )

            assert result["system_status"] == "degraded"
            assert len(result["alerts"]) == 1

    @pytest.mark.asyncio
    async def test_get_metrics_error(self, mock_admin_user, mock_performance_monitor):
        """Test handling of performance monitor errors."""
        mock_performance_monitor.get_metrics_summary.side_effect = Exception(
            "Monitor error"
        )

        with patch(
            "app.routers.admin_messaging.performance_monitor", mock_performance_monitor
        ):
            with pytest.raises(HTTPException) as exc_info:
                await get_performance_metrics(
                    minutes_back=10, admin_user=mock_admin_user
                )

            assert exc_info.value.status_code == 500
            assert "Failed to get performance metrics" in exc_info.value.detail


# ============================================================================
# Test: get_moderation_stats
# ============================================================================


class TestGetModerationStats:
    """Tests for get_moderation_stats endpoint."""

    @pytest.mark.asyncio
    async def test_get_moderation_stats_success(
        self, mock_db, mock_admin_user, mock_moderation_service
    ):
        """Test successful retrieval of moderation stats."""
        with patch(
            "app.routers.admin_messaging.MessageModerationService",
            return_value=mock_moderation_service,
        ):
            result = await get_moderation_stats(admin_user=mock_admin_user, db=mock_db)

            assert result["blocked_words_count"] == 4
            assert "blocked_words" in result
            assert result["user_warning_counts"] == 2
            assert result["total_warnings_issued"] == 3  # 2 + 1
            assert "timestamp" in result

    @pytest.mark.asyncio
    async def test_get_moderation_stats_error(self, mock_db, mock_admin_user):
        """Test handling of moderation service errors."""
        mock_service = MagicMock()
        mock_service.get_blocked_words.side_effect = Exception("Service error")

        with patch(
            "app.routers.admin_messaging.MessageModerationService",
            return_value=mock_service,
        ):
            with pytest.raises(HTTPException) as exc_info:
                await get_moderation_stats(admin_user=mock_admin_user, db=mock_db)

            assert exc_info.value.status_code == 500
            assert "Failed to get moderation statistics" in exc_info.value.detail


# ============================================================================
# Test: add_blocked_words
# ============================================================================


class TestAddBlockedWords:
    """Tests for add_blocked_words endpoint."""

    @pytest.mark.asyncio
    async def test_add_blocked_words_success(
        self, mock_db, mock_admin_user, mock_moderation_service
    ):
        """Test successful addition of blocked words."""
        mock_moderation_service.get_blocked_words.return_value = [
            "spam",
            "scam",
            "phishing",
            "fraud",
            "badword1",
            "badword2",
        ]

        with patch(
            "app.routers.admin_messaging.MessageModerationService",
            return_value=mock_moderation_service,
        ):
            result = await add_blocked_words(
                words=["badword1", "badword2"],
                admin_user=mock_admin_user,
                db=mock_db,
            )

            assert result["added_words"] == ["badword1", "badword2"]
            assert result["total_blocked_words"] == 6
            assert "timestamp" in result
            mock_moderation_service.add_blocked_words.assert_called_once_with(
                ["badword1", "badword2"]
            )

    @pytest.mark.asyncio
    async def test_add_blocked_words_empty_list(
        self, mock_db, mock_admin_user, mock_moderation_service
    ):
        """Test adding empty list of words."""
        with patch(
            "app.routers.admin_messaging.MessageModerationService",
            return_value=mock_moderation_service,
        ):
            result = await add_blocked_words(
                words=[], admin_user=mock_admin_user, db=mock_db
            )

            assert result["added_words"] == []
            mock_moderation_service.add_blocked_words.assert_called_once_with([])

    @pytest.mark.asyncio
    async def test_add_blocked_words_error(self, mock_db, mock_admin_user):
        """Test handling of service errors."""
        mock_service = MagicMock()
        mock_service.add_blocked_words.side_effect = Exception("Service error")

        with patch(
            "app.routers.admin_messaging.MessageModerationService",
            return_value=mock_service,
        ):
            with pytest.raises(HTTPException) as exc_info:
                await add_blocked_words(
                    words=["badword"], admin_user=mock_admin_user, db=mock_db
                )

            assert exc_info.value.status_code == 500
            assert "Failed to add blocked words" in exc_info.value.detail


# ============================================================================
# Test: remove_blocked_words
# ============================================================================


class TestRemoveBlockedWords:
    """Tests for remove_blocked_words endpoint."""

    @pytest.mark.asyncio
    async def test_remove_blocked_words_success(
        self, mock_db, mock_admin_user, mock_moderation_service
    ):
        """Test successful removal of blocked words."""
        mock_moderation_service.get_blocked_words.return_value = ["phishing", "fraud"]

        with patch(
            "app.routers.admin_messaging.MessageModerationService",
            return_value=mock_moderation_service,
        ):
            result = await remove_blocked_words(
                words=["spam", "scam"],
                admin_user=mock_admin_user,
                db=mock_db,
            )

            assert result["removed_words"] == ["spam", "scam"]
            assert result["total_blocked_words"] == 2
            assert "timestamp" in result
            mock_moderation_service.remove_blocked_words.assert_called_once_with(
                ["spam", "scam"]
            )

    @pytest.mark.asyncio
    async def test_remove_blocked_words_error(self, mock_db, mock_admin_user):
        """Test handling of service errors."""
        mock_service = MagicMock()
        mock_service.remove_blocked_words.side_effect = Exception("Service error")

        with patch(
            "app.routers.admin_messaging.MessageModerationService",
            return_value=mock_service,
        ):
            with pytest.raises(HTTPException) as exc_info:
                await remove_blocked_words(
                    words=["badword"], admin_user=mock_admin_user, db=mock_db
                )

            assert exc_info.value.status_code == 500
            assert "Failed to remove blocked words" in exc_info.value.detail


# ============================================================================
# Test: get_active_connections
# ============================================================================


class TestGetActiveConnections:
    """Tests for get_active_connections endpoint."""

    @pytest.mark.asyncio
    async def test_get_connections_success(
        self, mock_admin_user, mock_connection_manager, mock_performance_monitor
    ):
        """Test successful retrieval of active connections."""
        with (
            patch(
                "app.routers.admin_messaging.connection_manager",
                mock_connection_manager,
            ),
            patch(
                "app.routers.admin_messaging.performance_monitor",
                mock_performance_monitor,
            ),
        ):
            result = await get_active_connections(admin_user=mock_admin_user)

            assert result["total_connections"] == 3
            assert len(result["online_user_ids"]) == 3
            assert "connection_stats" in result
            assert result["redis_connected"] is True
            assert "timestamp" in result

    @pytest.mark.asyncio
    async def test_get_connections_no_redis(
        self, mock_admin_user, mock_connection_manager, mock_performance_monitor
    ):
        """Test connections when Redis is not connected."""
        mock_connection_manager.redis_client = None

        with (
            patch(
                "app.routers.admin_messaging.connection_manager",
                mock_connection_manager,
            ),
            patch(
                "app.routers.admin_messaging.performance_monitor",
                mock_performance_monitor,
            ),
        ):
            result = await get_active_connections(admin_user=mock_admin_user)

            assert result["redis_connected"] is False

    @pytest.mark.asyncio
    async def test_get_connections_error(
        self, mock_admin_user, mock_connection_manager
    ):
        """Test handling of connection manager errors."""
        mock_connection_manager.get_online_users.side_effect = Exception(
            "Manager error"
        )

        with patch(
            "app.routers.admin_messaging.connection_manager", mock_connection_manager
        ):
            with pytest.raises(HTTPException) as exc_info:
                await get_active_connections(admin_user=mock_admin_user)

            assert exc_info.value.status_code == 500
            assert "Failed to get connection information" in exc_info.value.detail


# ============================================================================
# Test: admin_broadcast_message
# ============================================================================


class TestAdminBroadcastMessage:
    """Tests for admin_broadcast_message endpoint."""

    @pytest.mark.asyncio
    async def test_broadcast_success(self, mock_admin_user, mock_connection_manager):
        """Test successful broadcast message."""
        with patch(
            "app.routers.admin_messaging.connection_manager", mock_connection_manager
        ):
            result = await admin_broadcast_message(
                message="System maintenance in 10 minutes",
                admin_user=mock_admin_user,
            )

            assert result["message"] == "System maintenance in 10 minutes"
            assert result["sent_to_users"] == 3
            assert "timestamp" in result
            assert mock_connection_manager.send_personal_message.call_count == 3

    @pytest.mark.asyncio
    async def test_broadcast_no_users(self, mock_admin_user, mock_connection_manager):
        """Test broadcast when no users are connected."""
        mock_connection_manager.get_online_users.return_value = []

        with patch(
            "app.routers.admin_messaging.connection_manager", mock_connection_manager
        ):
            result = await admin_broadcast_message(
                message="Test message", admin_user=mock_admin_user
            )

            assert result["sent_to_users"] == 0
            mock_connection_manager.send_personal_message.assert_not_called()

    @pytest.mark.asyncio
    async def test_broadcast_error(self, mock_admin_user, mock_connection_manager):
        """Test handling of broadcast errors."""
        mock_connection_manager.get_online_users.side_effect = Exception(
            "Broadcast error"
        )

        with patch(
            "app.routers.admin_messaging.connection_manager", mock_connection_manager
        ):
            with pytest.raises(HTTPException) as exc_info:
                await admin_broadcast_message(
                    message="Test message", admin_user=mock_admin_user
                )

            assert exc_info.value.status_code == 500
            assert "Failed to send broadcast message" in exc_info.value.detail


# ============================================================================
# Test: comprehensive_health_check
# ============================================================================


class TestComprehensiveHealthCheck:
    """Tests for comprehensive_health_check endpoint."""

    @pytest.mark.asyncio
    async def test_health_check_all_healthy(
        self, mock_db, mock_admin_user, mock_performance_monitor, mock_analytics_service
    ):
        """Test health check when all services are healthy."""
        with (
            patch(
                "app.routers.admin_messaging.performance_monitor",
                mock_performance_monitor,
            ),
            patch(
                "app.routers.admin_messaging.MessageAnalyticsService",
                return_value=mock_analytics_service,
            ),
        ):
            result = await comprehensive_health_check(
                admin_user=mock_admin_user, db=mock_db
            )

            assert result["overall_status"] == "healthy"
            assert result["failed_services"] == []
            assert len(result["health_checks"]) == 2
            assert result["additional_checks"]["analytics_service"] == "healthy"
            assert result["additional_checks"]["moderation_service"] == "healthy"

    @pytest.mark.asyncio
    async def test_health_check_degraded_service(
        self, mock_db, mock_admin_user, mock_performance_monitor, mock_analytics_service
    ):
        """Test health check when a service is degraded."""
        mock_performance_monitor.run_health_checks = AsyncMock(
            return_value=[
                MagicMock(
                    service="database",
                    status="unhealthy",
                    response_time_ms=5000.0,
                    details="Connection timeout",
                    timestamp=datetime.now(timezone.utc),
                ),
                MagicMock(
                    service="redis",
                    status="healthy",
                    response_time_ms=2.1,
                    details=None,
                    timestamp=datetime.now(timezone.utc),
                ),
            ]
        )

        with (
            patch(
                "app.routers.admin_messaging.performance_monitor",
                mock_performance_monitor,
            ),
            patch(
                "app.routers.admin_messaging.MessageAnalyticsService",
                return_value=mock_analytics_service,
            ),
        ):
            result = await comprehensive_health_check(
                admin_user=mock_admin_user, db=mock_db
            )

            assert result["overall_status"] == "degraded"
            assert "database" in result["failed_services"]

    @pytest.mark.asyncio
    async def test_health_check_analytics_unhealthy(
        self, mock_db, mock_admin_user, mock_performance_monitor
    ):
        """Test health check when analytics service fails."""
        mock_analytics = MagicMock()
        mock_analytics.get_platform_statistics = AsyncMock(
            side_effect=Exception("Analytics error")
        )

        with (
            patch(
                "app.routers.admin_messaging.performance_monitor",
                mock_performance_monitor,
            ),
            patch(
                "app.routers.admin_messaging.MessageAnalyticsService",
                return_value=mock_analytics,
            ),
        ):
            result = await comprehensive_health_check(
                admin_user=mock_admin_user, db=mock_db
            )

            assert result["overall_status"] == "degraded"
            assert "analytics" in result["failed_services"]
            assert result["additional_checks"]["analytics_service"] == "unhealthy"

    @pytest.mark.asyncio
    async def test_health_check_error(self, mock_db, mock_admin_user):
        """Test handling of health check errors."""
        mock_monitor = MagicMock()
        mock_monitor.run_health_checks = AsyncMock(
            side_effect=Exception("Health check error")
        )

        with patch("app.routers.admin_messaging.performance_monitor", mock_monitor):
            with pytest.raises(HTTPException) as exc_info:
                await comprehensive_health_check(admin_user=mock_admin_user, db=mock_db)

            assert exc_info.value.status_code == 500
            assert "Health check failed" in exc_info.value.detail


# ============================================================================
# Test: Edge Cases
# ============================================================================


class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    @pytest.mark.asyncio
    async def test_stats_min_days_back(
        self, mock_db, mock_admin_user, mock_analytics_service
    ):
        """Test minimum days_back parameter (1)."""
        with patch(
            "app.routers.admin_messaging.MessageAnalyticsService",
            return_value=mock_analytics_service,
        ):
            result = await get_platform_messaging_stats(
                days_back=1, admin_user=mock_admin_user, db=mock_db
            )

            assert "total_messages" in result

    @pytest.mark.asyncio
    async def test_stats_max_days_back(
        self, mock_db, mock_admin_user, mock_analytics_service
    ):
        """Test maximum days_back parameter (365)."""
        with patch(
            "app.routers.admin_messaging.MessageAnalyticsService",
            return_value=mock_analytics_service,
        ):
            result = await get_platform_messaging_stats(
                days_back=365, admin_user=mock_admin_user, db=mock_db
            )

            assert "total_messages" in result

    @pytest.mark.asyncio
    async def test_performance_min_minutes_back(
        self, mock_admin_user, mock_performance_monitor
    ):
        """Test minimum minutes_back parameter (1)."""
        with patch(
            "app.routers.admin_messaging.performance_monitor", mock_performance_monitor
        ):
            result = await get_performance_metrics(
                minutes_back=1, admin_user=mock_admin_user
            )

            assert result["period_minutes"] == 1

    @pytest.mark.asyncio
    async def test_performance_max_minutes_back(
        self, mock_admin_user, mock_performance_monitor
    ):
        """Test maximum minutes_back parameter (60)."""
        with patch(
            "app.routers.admin_messaging.performance_monitor", mock_performance_monitor
        ):
            result = await get_performance_metrics(
                minutes_back=60, admin_user=mock_admin_user
            )

            assert result["period_minutes"] == 60

    @pytest.mark.asyncio
    async def test_broadcast_special_characters(
        self, mock_admin_user, mock_connection_manager
    ):
        """Test broadcast with special characters."""
        with patch(
            "app.routers.admin_messaging.connection_manager", mock_connection_manager
        ):
            result = await admin_broadcast_message(
                message="Special chars: <>&\"' 日本語 🚀",
                admin_user=mock_admin_user,
            )

            assert "Special chars:" in result["message"]

    @pytest.mark.asyncio
    async def test_broadcast_empty_message(
        self, mock_admin_user, mock_connection_manager
    ):
        """Test broadcast with empty message."""
        with patch(
            "app.routers.admin_messaging.connection_manager", mock_connection_manager
        ):
            result = await admin_broadcast_message(
                message="", admin_user=mock_admin_user
            )

            assert result["message"] == ""
            assert result["sent_to_users"] == 3
