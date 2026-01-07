"""
Tests for app.api.routes.security

Comprehensive tests for Security Dashboard API Routes.
Tests security status, dashboard, IP blocking/unblocking, events summary,
health checks, configuration, alerts, and history endpoints.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.api.routes.security import (
    _get_security_recommendations,
    block_ip_address,
    get_alert_configuration,
    get_alert_history,
    get_security_config,
    get_security_dashboard,
    get_security_events_summary,
    get_security_status,
    router,
    security_health_check,
    send_test_alert,
    unblock_ip_address,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_security_monitor():
    """Mock security_monitor for testing"""
    monitor = MagicMock()
    monitor.suspicious_ips = set()
    monitor.failed_attempts = {}
    monitor.rate_limit_violations = {}
    monitor.max_failed_attempts = 5
    monitor.suspicious_threshold = 10
    monitor.rate_limit_threshold = 100
    monitor.get_security_summary.return_value = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "monitored_ips": 10,
        "suspicious_ips": 2,
        "recent_failed_attempts": 5,
        "recent_rate_violations": 3,
    }
    return monitor


@pytest.fixture
def mock_security_alert_manager():
    """Mock security_alert_manager for testing"""
    manager = MagicMock()
    manager.config = MagicMock()
    manager.config.enabled = True
    manager.config.priority_threshold = MagicMock()
    manager.config.priority_threshold.value = "medium"
    manager.config.rate_limit_minutes = 5
    manager.config.channels = []
    manager.smtp_username = "test@test.com"
    manager.webhook_url = "https://webhook.test"
    manager.slack_webhook = None
    manager.discord_webhook = None
    manager.alert_history = []
    manager.get_alert_statistics.return_value = {
        "total_alerts": 10,
        "alerts_by_severity": {"low": 3, "medium": 4, "high": 2, "critical": 1},
    }
    return manager


@pytest.fixture
def mock_current_user():
    """Mock authenticated user"""
    return {"sub": "test-user-id", "email": "test@example.com", "role": "admin"}


# ============================================================================
# GET SECURITY STATUS TESTS
# ============================================================================


class TestGetSecurityStatus:
    """Tests for get_security_status endpoint"""

    @pytest.mark.asyncio
    async def test_returns_monitoring_status(self, mock_security_monitor):
        """Test that endpoint returns monitoring status"""
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            result = await get_security_status()

        assert result["status"] == "monitoring"
        assert "timestamp" in result
        assert result["active_monitoring"] is True

    @pytest.mark.asyncio
    async def test_returns_monitored_entities_count(self, mock_security_monitor):
        """Test that endpoint returns monitored entities count"""
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            result = await get_security_status()

        assert result["monitored_entities"] == 10

    @pytest.mark.asyncio
    async def test_returns_sanitized_data_for_public(self, mock_security_monitor):
        """Test that endpoint returns sanitized data (no sensitive info)"""
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            result = await get_security_status()

        # Should not expose detailed security info
        assert "suspicious_ips" not in result
        assert "failed_attempts" not in result

    @pytest.mark.asyncio
    async def test_handles_zero_monitored_entities(self, mock_security_monitor):
        """Test handling when no entities are monitored"""
        mock_security_monitor.get_security_summary.return_value = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            result = await get_security_status()

        assert result["monitored_entities"] == 0


# ============================================================================
# GET SECURITY DASHBOARD TESTS
# ============================================================================


class TestGetSecurityDashboard:
    """Tests for get_security_dashboard endpoint"""

    @pytest.mark.asyncio
    async def test_returns_comprehensive_dashboard(
        self, mock_security_monitor, mock_current_user
    ):
        """Test that dashboard returns comprehensive security info"""
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            result = await get_security_dashboard(mock_current_user)

        assert "security_summary" in result
        assert "suspicious_ips" in result
        assert "recent_events" in result
        assert "monitoring_status" in result

    @pytest.mark.asyncio
    async def test_returns_suspicious_ips_list(
        self, mock_security_monitor, mock_current_user
    ):
        """Test that dashboard includes suspicious IPs list"""
        mock_security_monitor.suspicious_ips = {"192.168.1.1", "10.0.0.1"}
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            result = await get_security_dashboard(mock_current_user)

        assert isinstance(result["suspicious_ips"], list)
        assert len(result["suspicious_ips"]) == 2

    @pytest.mark.asyncio
    async def test_returns_monitoring_thresholds(
        self, mock_security_monitor, mock_current_user
    ):
        """Test that dashboard includes monitoring thresholds"""
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            result = await get_security_dashboard(mock_current_user)

        thresholds = result["monitoring_status"]["thresholds"]
        assert thresholds["max_failed_attempts"] == 5
        assert thresholds["suspicious_threshold"] == 10
        assert thresholds["rate_limit_threshold"] == 100

    @pytest.mark.asyncio
    async def test_returns_recent_events_counts(
        self, mock_security_monitor, mock_current_user
    ):
        """Test that dashboard includes recent event counts"""
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            result = await get_security_dashboard(mock_current_user)

        assert result["recent_events"]["failed_attempts"] == 5
        assert result["recent_events"]["rate_violations"] == 3


# ============================================================================
# BLOCK IP ADDRESS TESTS
# ============================================================================


class TestBlockIpAddress:
    """Tests for block_ip_address endpoint"""

    @pytest.mark.asyncio
    async def test_blocks_ip_successfully(
        self, mock_security_monitor, mock_current_user
    ):
        """Test that IP address is blocked successfully"""
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            # Patch at the source module where it's imported from
            with patch(
                "app.utils.security_logger.log_unauthorized_access",
                new_callable=AsyncMock,
            ):
                result = await block_ip_address("192.168.1.100", mock_current_user)

        assert "message" in result
        assert "192.168.1.100" in result["message"]
        assert result["blocked_ip"] == "192.168.1.100"
        assert "timestamp" in result

    @pytest.mark.asyncio
    async def test_adds_ip_to_suspicious_list(
        self, mock_security_monitor, mock_current_user
    ):
        """Test that blocked IP is added to suspicious list"""
        # Use a real set for verification
        suspicious_ips = set()
        mock_security_monitor.suspicious_ips = suspicious_ips

        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            with patch(
                "app.utils.security_logger.log_unauthorized_access",
                new_callable=AsyncMock,
            ):
                await block_ip_address("192.168.1.100", mock_current_user)

        assert "192.168.1.100" in suspicious_ips

    @pytest.mark.asyncio
    async def test_logs_blocking_action(self, mock_security_monitor, mock_current_user):
        """Test that blocking action is logged"""
        mock_log = AsyncMock()
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            with patch("app.utils.security_logger.log_unauthorized_access", mock_log):
                await block_ip_address("192.168.1.100", mock_current_user)

        mock_log.assert_called_once()
        call_kwargs = mock_log.call_args[1]
        assert call_kwargs["client_ip"] == "192.168.1.100"
        assert call_kwargs["endpoint"] == "/security/manual-block"

    @pytest.mark.asyncio
    async def test_includes_user_id_in_log(
        self, mock_security_monitor, mock_current_user
    ):
        """Test that user ID is included in the log"""
        mock_log = AsyncMock()
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            with patch("app.utils.security_logger.log_unauthorized_access", mock_log):
                await block_ip_address("192.168.1.100", mock_current_user)

        call_kwargs = mock_log.call_args[1]
        assert call_kwargs["user_id"] == "test-user-id"


# ============================================================================
# UNBLOCK IP ADDRESS TESTS
# ============================================================================


class TestUnblockIpAddress:
    """Tests for unblock_ip_address endpoint"""

    @pytest.mark.asyncio
    async def test_unblocks_ip_successfully(
        self, mock_security_monitor, mock_current_user
    ):
        """Test that IP address is unblocked successfully"""
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            result = await unblock_ip_address("192.168.1.100", mock_current_user)

        assert "message" in result
        assert "192.168.1.100" in result["message"]
        assert result["unblocked_ip"] == "192.168.1.100"
        assert "timestamp" in result

    @pytest.mark.asyncio
    async def test_removes_ip_from_suspicious_list(
        self, mock_security_monitor, mock_current_user
    ):
        """Test that unblocked IP is removed from suspicious list"""
        # Use a real set for verification
        suspicious_ips = {"192.168.1.100", "10.0.0.1"}
        mock_security_monitor.suspicious_ips = suspicious_ips

        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            await unblock_ip_address("192.168.1.100", mock_current_user)

        assert "192.168.1.100" not in suspicious_ips

    @pytest.mark.asyncio
    async def test_clears_failed_attempts(
        self, mock_security_monitor, mock_current_user
    ):
        """Test that failed attempts are cleared for unblocked IP"""
        mock_security_monitor.failed_attempts = {"192.168.1.100": [1, 2, 3]}
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            await unblock_ip_address("192.168.1.100", mock_current_user)

        assert "192.168.1.100" not in mock_security_monitor.failed_attempts

    @pytest.mark.asyncio
    async def test_clears_rate_limit_violations(
        self, mock_security_monitor, mock_current_user
    ):
        """Test that rate limit violations are cleared for unblocked IP"""
        mock_security_monitor.rate_limit_violations = {"192.168.1.100": [1, 2, 3]}
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            await unblock_ip_address("192.168.1.100", mock_current_user)

        assert "192.168.1.100" not in mock_security_monitor.rate_limit_violations

    @pytest.mark.asyncio
    async def test_handles_nonexistent_ip_gracefully(
        self, mock_security_monitor, mock_current_user
    ):
        """Test that unblocking non-existent IP doesn't raise error"""
        mock_security_monitor.failed_attempts = {}
        mock_security_monitor.rate_limit_violations = {}
        # Use a real set that doesn't contain the IP
        mock_security_monitor.suspicious_ips = set()
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            result = await unblock_ip_address("192.168.1.100", mock_current_user)

        assert result["unblocked_ip"] == "192.168.1.100"


# ============================================================================
# GET SECURITY EVENTS SUMMARY TESTS
# ============================================================================


class TestGetSecurityEventsSummary:
    """Tests for get_security_events_summary endpoint"""

    @pytest.mark.asyncio
    async def test_returns_summary_with_default_hours(
        self, mock_security_monitor, mock_current_user
    ):
        """Test that endpoint returns summary with default 24 hour timeframe"""
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            result = await get_security_events_summary(
                hours=24, current_user=mock_current_user
            )

        assert result["timeframe_hours"] == 24
        assert "summary" in result
        assert "recommendations" in result

    @pytest.mark.asyncio
    async def test_returns_summary_with_custom_hours(
        self, mock_security_monitor, mock_current_user
    ):
        """Test that endpoint respects custom hours parameter"""
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            result = await get_security_events_summary(
                hours=48, current_user=mock_current_user
            )

        assert result["timeframe_hours"] == 48

    @pytest.mark.asyncio
    async def test_includes_recommendations(
        self, mock_security_monitor, mock_current_user
    ):
        """Test that endpoint includes security recommendations"""
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            result = await get_security_events_summary(
                hours=24, current_user=mock_current_user
            )

        assert isinstance(result["recommendations"], list)
        assert len(result["recommendations"]) > 0


# ============================================================================
# GET SECURITY RECOMMENDATIONS TESTS
# ============================================================================


class TestGetSecurityRecommendations:
    """Tests for _get_security_recommendations helper function"""

    def test_recommends_ip_reputation_for_high_suspicious_count(self):
        """Test recommendation for high suspicious IP count"""
        summary = {
            "suspicious_ips": 10,
            "recent_failed_attempts": 0,
            "recent_rate_violations": 0,
        }
        recommendations = _get_security_recommendations(summary)

        assert any("IP reputation" in r for r in recommendations)

    def test_recommends_captcha_for_high_failed_attempts(self):
        """Test recommendation for high failed authentication attempts"""
        summary = {
            "suspicious_ips": 0,
            "recent_failed_attempts": 25,
            "recent_rate_violations": 0,
        }
        recommendations = _get_security_recommendations(summary)

        assert any("CAPTCHA" in r for r in recommendations)

    def test_recommends_rate_limit_adjustment_for_high_violations(self):
        """Test recommendation for high rate limit violations"""
        summary = {
            "suspicious_ips": 0,
            "recent_failed_attempts": 0,
            "recent_rate_violations": 60,
        }
        recommendations = _get_security_recommendations(summary)

        assert any("rate limit" in r.lower() for r in recommendations)

    def test_returns_normal_status_when_all_good(self):
        """Test that normal status is returned when no issues"""
        summary = {
            "suspicious_ips": 0,
            "recent_failed_attempts": 0,
            "recent_rate_violations": 0,
        }
        recommendations = _get_security_recommendations(summary)

        assert any("normal" in r.lower() for r in recommendations)

    def test_handles_missing_keys(self):
        """Test handling of missing summary keys"""
        summary = {}
        recommendations = _get_security_recommendations(summary)

        # Should not raise and should return normal status
        assert len(recommendations) > 0

    def test_multiple_recommendations_for_multiple_issues(self):
        """Test that multiple issues generate multiple recommendations"""
        summary = {
            "suspicious_ips": 10,
            "recent_failed_attempts": 25,
            "recent_rate_violations": 60,
        }
        recommendations = _get_security_recommendations(summary)

        # Should have 3 recommendations (IP, auth, rate)
        assert len(recommendations) == 3


# ============================================================================
# SECURITY HEALTH CHECK TESTS
# ============================================================================


class TestSecurityHealthCheck:
    """Tests for security_health_check endpoint"""

    @pytest.mark.asyncio
    async def test_returns_healthy_status(self, mock_security_monitor):
        """Test that endpoint returns healthy status when all is well"""
        mock_log_file = MagicMock()
        mock_log_file.parent.exists.return_value = True

        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            with patch("app.utils.security_logger.security_log_file", mock_log_file):
                result = await security_health_check()

        assert result["status"] == "healthy"
        assert result["monitoring_active"] is True

    @pytest.mark.asyncio
    async def test_returns_degraded_when_log_inaccessible(self, mock_security_monitor):
        """Test that status is degraded when log files are inaccessible"""
        mock_log_file = MagicMock()
        mock_log_file.parent.exists.return_value = False

        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            with patch("app.utils.security_logger.security_log_file", mock_log_file):
                result = await security_health_check()

        assert result["status"] == "degraded"

    @pytest.mark.asyncio
    async def test_returns_at_risk_for_high_suspicious_activity(
        self, mock_security_monitor
    ):
        """Test that status is at-risk when suspicious activity is high"""
        mock_security_monitor.get_security_summary.return_value = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "suspicious_ips": 25,
        }
        mock_log_file = MagicMock()
        mock_log_file.parent.exists.return_value = True

        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            with patch("app.utils.security_logger.security_log_file", mock_log_file):
                result = await security_health_check()

        assert result["status"] == "at-risk"

    @pytest.mark.asyncio
    async def test_returns_error_on_exception(self, mock_security_monitor):
        """Test that error status is returned on exception"""
        mock_security_monitor.get_security_summary.side_effect = Exception("Test error")
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            result = await security_health_check()

        assert result["status"] == "error"
        assert result["monitoring_active"] is False

    @pytest.mark.asyncio
    async def test_includes_detailed_health_status(self, mock_security_monitor):
        """Test that response includes detailed health status"""
        mock_log_file = MagicMock()
        mock_log_file.parent.exists.return_value = True

        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            with patch("app.utils.security_logger.security_log_file", mock_log_file):
                result = await security_health_check()

        assert "details" in result
        assert "security_monitoring" in result["details"]
        assert "log_system" in result["details"]
        assert "suspicious_activity" in result["details"]

    @pytest.mark.asyncio
    async def test_suspicious_activity_elevated_threshold(self, mock_security_monitor):
        """Test suspicious activity is elevated when over 10 IPs"""
        mock_security_monitor.get_security_summary.return_value = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "suspicious_ips": 15,  # Over 10 but under 20
        }
        mock_log_file = MagicMock()
        mock_log_file.parent.exists.return_value = True

        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            with patch("app.utils.security_logger.security_log_file", mock_log_file):
                result = await security_health_check()

        assert result["details"]["suspicious_activity"] == "elevated"


# ============================================================================
# GET SECURITY CONFIG TESTS
# ============================================================================


class TestGetSecurityConfig:
    """Tests for get_security_config endpoint"""

    @pytest.mark.asyncio
    async def test_returns_rate_limits(self, mock_current_user):
        """Test that endpoint returns rate limit configuration"""
        result = await get_security_config(mock_current_user)

        assert "rate_limits" in result
        assert isinstance(result["rate_limits"], dict)

    @pytest.mark.asyncio
    async def test_returns_cors_origins(self, mock_current_user):
        """Test that endpoint returns CORS origins"""
        result = await get_security_config(mock_current_user)

        assert "cors_origins" in result
        assert isinstance(result["cors_origins"], list)

    @pytest.mark.asyncio
    async def test_returns_password_requirements(self, mock_current_user):
        """Test that endpoint returns password requirements"""
        result = await get_security_config(mock_current_user)

        assert "password_requirements" in result
        pw_req = result["password_requirements"]
        assert "min_length" in pw_req
        assert "max_length" in pw_req
        assert "require_uppercase" in pw_req
        assert "require_lowercase" in pw_req
        assert "require_digits" in pw_req
        assert "require_special" in pw_req
        assert "min_criteria" in pw_req

    @pytest.mark.asyncio
    async def test_returns_max_request_size(self, mock_current_user):
        """Test that endpoint returns max request size"""
        result = await get_security_config(mock_current_user)

        assert "max_request_size" in result

    @pytest.mark.asyncio
    async def test_returns_environment_info(self, mock_current_user):
        """Test that endpoint returns environment information"""
        result = await get_security_config(mock_current_user)

        assert "environment" in result
        assert result["environment"] in ["production", "development"]


# ============================================================================
# GET ALERT CONFIGURATION TESTS
# ============================================================================


class TestGetAlertConfiguration:
    """Tests for get_alert_configuration endpoint"""

    @pytest.mark.asyncio
    async def test_returns_alert_statistics(
        self, mock_security_alert_manager, mock_current_user
    ):
        """Test that endpoint returns alert statistics"""
        with patch(
            "app.api.routes.security.security_alert_manager",
            mock_security_alert_manager,
        ):
            result = await get_alert_configuration(mock_current_user)

        assert "alert_statistics" in result
        assert result["alert_statistics"]["total_alerts"] == 10

    @pytest.mark.asyncio
    async def test_returns_configuration(
        self, mock_security_alert_manager, mock_current_user
    ):
        """Test that endpoint returns alert configuration"""
        with patch(
            "app.api.routes.security.security_alert_manager",
            mock_security_alert_manager,
        ):
            result = await get_alert_configuration(mock_current_user)

        assert "configuration" in result
        config = result["configuration"]
        assert "enabled" in config
        assert "priority_threshold" in config
        assert "rate_limit_minutes" in config
        assert "channels" in config

    @pytest.mark.asyncio
    async def test_returns_channel_status(
        self, mock_security_alert_manager, mock_current_user
    ):
        """Test that endpoint returns channel status"""
        with patch(
            "app.api.routes.security.security_alert_manager",
            mock_security_alert_manager,
        ):
            result = await get_alert_configuration(mock_current_user)

        assert "channel_status" in result
        status = result["channel_status"]
        assert "email_configured" in status
        assert "webhook_configured" in status
        assert "slack_configured" in status
        assert "discord_configured" in status

    @pytest.mark.asyncio
    async def test_email_configured_check(
        self, mock_security_alert_manager, mock_current_user
    ):
        """Test email configured status"""
        with patch(
            "app.api.routes.security.security_alert_manager",
            mock_security_alert_manager,
        ):
            result = await get_alert_configuration(mock_current_user)

        assert result["channel_status"]["email_configured"] is True

    @pytest.mark.asyncio
    async def test_webhook_configured_check(
        self, mock_security_alert_manager, mock_current_user
    ):
        """Test webhook configured status"""
        with patch(
            "app.api.routes.security.security_alert_manager",
            mock_security_alert_manager,
        ):
            result = await get_alert_configuration(mock_current_user)

        assert result["channel_status"]["webhook_configured"] is True

    @pytest.mark.asyncio
    async def test_slack_not_configured(
        self, mock_security_alert_manager, mock_current_user
    ):
        """Test slack not configured status"""
        with patch(
            "app.api.routes.security.security_alert_manager",
            mock_security_alert_manager,
        ):
            result = await get_alert_configuration(mock_current_user)

        assert result["channel_status"]["slack_configured"] is False


# ============================================================================
# SEND TEST ALERT TESTS
# ============================================================================


class TestSendTestAlert:
    """Tests for send_test_alert endpoint"""

    @pytest.mark.asyncio
    async def test_sends_alert_successfully(self, mock_current_user):
        """Test that test alert is sent successfully"""
        with patch(
            "app.utils.security_alerts.send_medium_alert", new_callable=AsyncMock
        ) as mock_send:
            mock_send.return_value = True
            result = await send_test_alert(mock_current_user)

        assert result["success"] is True
        assert "sent successfully" in result["message"]
        assert "timestamp" in result

    @pytest.mark.asyncio
    async def test_handles_failed_alert(self, mock_current_user):
        """Test handling when alert fails to send"""
        with patch(
            "app.utils.security_alerts.send_medium_alert", new_callable=AsyncMock
        ) as mock_send:
            mock_send.return_value = False
            result = await send_test_alert(mock_current_user)

        assert result["success"] is False
        assert "Failed" in result["message"]

    @pytest.mark.asyncio
    async def test_handles_exception(self, mock_current_user):
        """Test handling when exception occurs"""
        with patch(
            "app.utils.security_alerts.send_medium_alert", new_callable=AsyncMock
        ) as mock_send:
            mock_send.side_effect = Exception("Test exception")
            result = await send_test_alert(mock_current_user)

        assert result["success"] is False
        assert "error" in result
        assert "Test exception" in result["error"]

    @pytest.mark.asyncio
    async def test_includes_user_in_alert_data(self, mock_current_user):
        """Test that user ID is included in alert data"""
        with patch(
            "app.utils.security_alerts.send_medium_alert", new_callable=AsyncMock
        ) as mock_send:
            mock_send.return_value = True
            await send_test_alert(mock_current_user)

        call_kwargs = mock_send.call_args[1]
        assert call_kwargs["additional_data"]["user"] == "test-user-id"

    @pytest.mark.asyncio
    async def test_alert_has_correct_properties(self, mock_current_user):
        """Test that alert is sent with correct properties"""
        with patch(
            "app.utils.security_alerts.send_medium_alert", new_callable=AsyncMock
        ) as mock_send:
            mock_send.return_value = True
            await send_test_alert(mock_current_user)

        call_kwargs = mock_send.call_args[1]
        assert call_kwargs["title"] == "Test Security Alert"
        assert "test alert" in call_kwargs["message"].lower()
        assert call_kwargs["source_ip"] == "127.0.0.1"


# ============================================================================
# GET ALERT HISTORY TESTS
# ============================================================================


class TestGetAlertHistory:
    """Tests for get_alert_history endpoint"""

    @pytest.fixture
    def mock_alert_manager_with_history(self):
        """Create mock manager with alert history"""
        manager = MagicMock()

        # Create mock alerts
        now = datetime.now(timezone.utc)
        alert1 = MagicMock()
        alert1.title = "Test Alert 1"
        alert1.message = "Test message 1"
        alert1.severity = MagicMock(value="high")
        alert1.priority = MagicMock(value="high")
        alert1.event_type = MagicMock(value="auth_failure")
        alert1.source_ip = "192.168.1.1"
        alert1.timestamp = now - timedelta(hours=1)

        alert2 = MagicMock()
        alert2.title = "Test Alert 2"
        alert2.message = "Test message 2"
        alert2.severity = MagicMock(value="medium")
        alert2.priority = MagicMock(value="medium")
        alert2.event_type = MagicMock(value="rate_limit")
        alert2.source_ip = "192.168.1.2"
        alert2.timestamp = now - timedelta(hours=2)

        alert3 = MagicMock()
        alert3.title = "Old Alert"
        alert3.message = "Old message"
        alert3.severity = MagicMock(value="low")
        alert3.priority = MagicMock(value="low")
        alert3.event_type = MagicMock(value="info")
        alert3.source_ip = "192.168.1.3"
        alert3.timestamp = now - timedelta(hours=48)  # Outside 24h window

        manager.alert_history = [alert1, alert2, alert3]
        return manager

    @pytest.mark.asyncio
    async def test_returns_recent_alerts(
        self, mock_alert_manager_with_history, mock_current_user
    ):
        """Test that endpoint returns recent alerts"""
        with patch(
            "app.api.routes.security.security_alert_manager",
            mock_alert_manager_with_history,
        ):
            result = await get_alert_history(
                hours=24, severity=None, current_user=mock_current_user
            )

        assert "alerts" in result
        assert "total" in result
        assert result["total"] == 2  # Only 2 within 24 hours

    @pytest.mark.asyncio
    async def test_filters_by_timeframe(
        self, mock_alert_manager_with_history, mock_current_user
    ):
        """Test that alerts are filtered by timeframe"""
        with patch(
            "app.api.routes.security.security_alert_manager",
            mock_alert_manager_with_history,
        ):
            result = await get_alert_history(
                hours=72, severity=None, current_user=mock_current_user
            )

        assert result["total"] == 3  # All 3 within 72 hours
        assert result["timeframe_hours"] == 72

    @pytest.mark.asyncio
    async def test_filters_by_severity(
        self, mock_alert_manager_with_history, mock_current_user
    ):
        """Test that alerts can be filtered by severity"""
        with patch(
            "app.api.routes.security.security_alert_manager",
            mock_alert_manager_with_history,
        ):
            result = await get_alert_history(
                hours=24, severity="high", current_user=mock_current_user
            )

        assert result["severity_filter"] == "high"
        assert all(a["severity"] == "high" for a in result["alerts"])

    @pytest.mark.asyncio
    async def test_returns_alert_details(
        self, mock_alert_manager_with_history, mock_current_user
    ):
        """Test that alerts include all necessary details"""
        with patch(
            "app.api.routes.security.security_alert_manager",
            mock_alert_manager_with_history,
        ):
            result = await get_alert_history(
                hours=24, severity=None, current_user=mock_current_user
            )

        alert = result["alerts"][0]
        assert "title" in alert
        assert "message" in alert
        assert "severity" in alert
        assert "priority" in alert
        assert "event_type" in alert
        assert "source_ip" in alert
        assert "timestamp" in alert

    @pytest.mark.asyncio
    async def test_handles_empty_history(self, mock_current_user):
        """Test handling when alert history is empty"""
        empty_manager = MagicMock()
        empty_manager.alert_history = []

        with patch(
            "app.api.routes.security.security_alert_manager",
            empty_manager,
        ):
            result = await get_alert_history(
                hours=24, severity=None, current_user=mock_current_user
            )

        assert result["alerts"] == []
        assert result["total"] == 0

    @pytest.mark.asyncio
    async def test_includes_timestamp_in_response(
        self, mock_alert_manager_with_history, mock_current_user
    ):
        """Test that response includes current timestamp"""
        with patch(
            "app.api.routes.security.security_alert_manager",
            mock_alert_manager_with_history,
        ):
            result = await get_alert_history(
                hours=24, severity=None, current_user=mock_current_user
            )

        assert "timestamp" in result


# ============================================================================
# ROUTER TESTS
# ============================================================================


class TestSecurityRouter:
    """Tests for security router configuration"""

    def test_router_exists(self):
        """Test that router is defined"""
        assert router is not None

    def test_router_is_api_router(self):
        """Test that router is an APIRouter instance"""
        from fastapi import APIRouter

        assert isinstance(router, APIRouter)


# ============================================================================
# EDGE CASES & ERROR HANDLING
# ============================================================================


class TestEdgeCases:
    """Tests for edge cases and error handling"""

    @pytest.mark.asyncio
    async def test_block_ipv6_address(self, mock_security_monitor, mock_current_user):
        """Test blocking IPv6 address"""
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            with patch(
                "app.utils.security_logger.log_unauthorized_access",
                new_callable=AsyncMock,
            ):
                result = await block_ip_address(
                    "2001:0db8:85a3:0000:0000:8a2e:0370:7334", mock_current_user
                )

        assert "2001:0db8:85a3:0000:0000:8a2e:0370:7334" in result["blocked_ip"]

    @pytest.mark.asyncio
    async def test_unblock_ipv6_address(self, mock_security_monitor, mock_current_user):
        """Test unblocking IPv6 address"""
        mock_security_monitor.suspicious_ips = set()
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            result = await unblock_ip_address(
                "2001:0db8:85a3:0000:0000:8a2e:0370:7334", mock_current_user
            )

        assert "2001:0db8:85a3:0000:0000:8a2e:0370:7334" in result["unblocked_ip"]

    @pytest.mark.asyncio
    async def test_user_without_sub_claim(self, mock_security_monitor):
        """Test handling user without sub claim"""
        user_no_sub = {"email": "test@example.com"}
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            with patch(
                "app.utils.security_logger.log_unauthorized_access",
                new_callable=AsyncMock,
            ) as mock_log:
                await block_ip_address("192.168.1.1", user_no_sub)

        call_kwargs = mock_log.call_args[1]
        assert call_kwargs["user_id"] == "unknown"

    @pytest.mark.asyncio
    async def test_events_summary_with_zero_hours(
        self, mock_security_monitor, mock_current_user
    ):
        """Test events summary with zero hours"""
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            result = await get_security_events_summary(
                hours=0, current_user=mock_current_user
            )

        assert result["timeframe_hours"] == 0

    @pytest.mark.asyncio
    async def test_alert_history_with_null_timestamp(self, mock_current_user):
        """Test alert history with alerts that have null timestamp"""
        manager = MagicMock()
        alert_no_ts = MagicMock()
        alert_no_ts.timestamp = None
        manager.alert_history = [alert_no_ts]

        with patch(
            "app.api.routes.security.security_alert_manager",
            manager,
        ):
            result = await get_alert_history(
                hours=24, severity=None, current_user=mock_current_user
            )

        # Alert with null timestamp should be excluded
        assert result["total"] == 0

    @pytest.mark.asyncio
    async def test_config_returns_consistent_types(self, mock_current_user):
        """Test that config endpoint returns consistent types"""
        result = await get_security_config(mock_current_user)

        assert isinstance(result["rate_limits"], dict)
        assert isinstance(result["cors_origins"], list)
        assert isinstance(result["max_request_size"], int)
        assert isinstance(result["password_requirements"], dict)
        assert isinstance(result["environment"], str)

    @pytest.mark.asyncio
    async def test_dashboard_with_empty_suspicious_ips(
        self, mock_security_monitor, mock_current_user
    ):
        """Test dashboard with empty suspicious IPs set"""
        mock_security_monitor.suspicious_ips = set()
        with patch("app.api.routes.security.security_monitor", mock_security_monitor):
            result = await get_security_dashboard(mock_current_user)

        assert result["suspicious_ips"] == []
