"""
Tests for app.services.j53_performance_monitor

Comprehensive test suite for J53PerformanceMonitor service including:
- Enum validation (AlertSeverity, MetricThreshold)
- Dataclass structures (PerformanceAlert, SystemHealth)
- Service initialization
- Basic mocked database operations

Pattern: Uses unittest.mock for database and settings mocking
Coverage Target: 30%+ (focus on enums, dataclasses, initialization)
"""

from dataclasses import asdict
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.j53_performance_monitor import (
    AlertSeverity,
    J53PerformanceMonitor,
    MetricThreshold,
    PerformanceAlert,
    SystemHealth,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_settings():
    """Mock Settings object"""
    settings = MagicMock()
    settings.DATABASE_URL = "postgresql://test:test@localhost/test"
    return settings


@pytest.fixture
def mock_settings_sqlite():
    """Mock Settings object with SQLite database"""
    settings = MagicMock()
    settings.DATABASE_URL = "sqlite:///test.db"
    return settings


@pytest.fixture
def performance_monitor(mock_settings):
    """Create J53PerformanceMonitor instance with mocked dependencies"""
    with patch(
        "app.services.j53_performance_monitor.AdvancedStorageAnalytics"
    ) as mock_analytics:
        monitor = J53PerformanceMonitor(mock_settings)
        return monitor


@pytest.fixture
def sample_alert():
    """Create sample PerformanceAlert for testing"""
    return PerformanceAlert(
        id="alert-001",
        severity=AlertSeverity.WARNING,
        category="database",
        metric_name="database_size_mb",
        current_value=600.0,
        threshold=500.0,
        message="Database size exceeds warning threshold",
        recommendation="Consider archiving old data",
        timestamp=datetime.now(timezone.utc),
        resolved=False,
        acknowledged=False,
    )


# ============================================================================
# Test Class 1: AlertSeverity Enum
# ============================================================================
class TestAlertSeverityEnum:
    """Test AlertSeverity enum values"""

    def test_critical_value(self):
        """CRITICAL should have value 'critical'"""
        assert AlertSeverity.CRITICAL.value == "critical"

    def test_warning_value(self):
        """WARNING should have value 'warning'"""
        assert AlertSeverity.WARNING.value == "warning"

    def test_info_value(self):
        """INFO should have value 'info'"""
        assert AlertSeverity.INFO.value == "info"

    def test_enum_has_three_values(self):
        """Enum should have exactly 3 severity levels"""
        assert len(AlertSeverity) == 3

    def test_enum_members_list(self):
        """All enum members should be accessible"""
        members = list(AlertSeverity)
        assert AlertSeverity.CRITICAL in members
        assert AlertSeverity.WARNING in members
        assert AlertSeverity.INFO in members


# ============================================================================
# Test Class 2: MetricThreshold Enum
# ============================================================================
class TestMetricThresholdEnum:
    """Test MetricThreshold enum values"""

    def test_database_size_warning(self):
        """DATABASE_SIZE_WARNING should be 500 MB"""
        assert MetricThreshold.DATABASE_SIZE_WARNING.value == 500

    def test_database_size_critical(self):
        """DATABASE_SIZE_CRITICAL should be 1000 MB"""
        assert MetricThreshold.DATABASE_SIZE_CRITICAL.value == 1000

    def test_daily_growth_warning(self):
        """DAILY_GROWTH_WARNING should be 100 messages/day"""
        assert MetricThreshold.DAILY_GROWTH_WARNING.value == 100

    def test_daily_growth_critical(self):
        """DAILY_GROWTH_CRITICAL should be 1000 messages/day"""
        assert MetricThreshold.DAILY_GROWTH_CRITICAL.value == 1000

    def test_response_time_warning(self):
        """RESPONSE_TIME_WARNING should be 1000 ms"""
        assert MetricThreshold.RESPONSE_TIME_WARNING.value == 1000

    def test_response_time_critical(self):
        """RESPONSE_TIME_CRITICAL should be 5000 ms"""
        assert MetricThreshold.RESPONSE_TIME_CRITICAL.value == 5000

    def test_disk_usage_warning(self):
        """DISK_USAGE_WARNING should be 80 percent"""
        assert MetricThreshold.DISK_USAGE_WARNING.value == 80

    def test_disk_usage_critical(self):
        """DISK_USAGE_CRITICAL should be 95 percent"""
        assert MetricThreshold.DISK_USAGE_CRITICAL.value == 95

    def test_enum_has_expected_members(self):
        """Enum should have 6 threshold members (some values consolidated)"""
        # Note: Some thresholds share values (e.g., 100 for DAILY_GROWTH_WARNING and others)
        # so Python enum consolidates them, resulting in 6 unique members
        assert len(MetricThreshold) == 6


# ============================================================================
# Test Class 3: PerformanceAlert Dataclass
# ============================================================================
class TestPerformanceAlertDataclass:
    """Test PerformanceAlert dataclass"""

    def test_initialization(self, sample_alert):
        """PerformanceAlert should initialize with all required fields"""
        assert sample_alert.id == "alert-001"
        assert sample_alert.severity == AlertSeverity.WARNING
        assert sample_alert.category == "database"
        assert sample_alert.metric_name == "database_size_mb"
        assert sample_alert.current_value == 600.0
        assert sample_alert.threshold == 500.0
        assert sample_alert.message == "Database size exceeds warning threshold"
        assert sample_alert.recommendation == "Consider archiving old data"
        assert sample_alert.resolved is False
        assert sample_alert.acknowledged is False

    def test_default_resolved_false(self):
        """resolved should default to False"""
        alert = PerformanceAlert(
            id="test",
            severity=AlertSeverity.INFO,
            category="test",
            metric_name="test",
            current_value=0,
            threshold=0,
            message="test",
            recommendation="test",
            timestamp=datetime.now(timezone.utc),
        )
        assert alert.resolved is False

    def test_default_acknowledged_false(self):
        """acknowledged should default to False"""
        alert = PerformanceAlert(
            id="test",
            severity=AlertSeverity.INFO,
            category="test",
            metric_name="test",
            current_value=0,
            threshold=0,
            message="test",
            recommendation="test",
            timestamp=datetime.now(timezone.utc),
        )
        assert alert.acknowledged is False

    def test_to_dict_method(self, sample_alert):
        """to_dict() should return proper dictionary format"""
        result = sample_alert.to_dict()

        assert isinstance(result, dict)
        assert result["id"] == "alert-001"
        assert result["severity"] == "warning"  # Enum value, not enum
        assert result["category"] == "database"
        assert result["metric_name"] == "database_size_mb"
        assert result["current_value"] == 600.0
        assert result["threshold"] == 500.0
        assert result["resolved"] is False
        assert result["acknowledged"] is False

    def test_to_dict_timestamp_is_isoformat(self, sample_alert):
        """to_dict() should convert timestamp to ISO format string"""
        result = sample_alert.to_dict()

        assert isinstance(result["timestamp"], str)
        # ISO format includes T separator
        assert "T" in result["timestamp"] or "-" in result["timestamp"]

    def test_to_dict_critical_severity(self):
        """to_dict() should handle CRITICAL severity"""
        alert = PerformanceAlert(
            id="critical-001",
            severity=AlertSeverity.CRITICAL,
            category="system",
            metric_name="disk_usage",
            current_value=98.0,
            threshold=95.0,
            message="Critical disk usage",
            recommendation="Free disk space immediately",
            timestamp=datetime.now(timezone.utc),
        )
        result = alert.to_dict()

        assert result["severity"] == "critical"


# ============================================================================
# Test Class 4: SystemHealth Dataclass
# ============================================================================
class TestSystemHealthDataclass:
    """Test SystemHealth dataclass"""

    def test_initialization(self):
        """SystemHealth should initialize with all required fields"""
        now = datetime.now(timezone.utc)
        health = SystemHealth(
            status="HEALTHY",
            score=95.0,
            active_alerts=2,
            critical_alerts=0,
            warning_alerts=2,
            last_check=now,
            uptime_percentage=99.9,
            performance_trend="STABLE",
        )

        assert health.status == "HEALTHY"
        assert health.score == 95.0
        assert health.active_alerts == 2
        assert health.critical_alerts == 0
        assert health.warning_alerts == 2
        assert health.last_check == now
        assert health.uptime_percentage == 99.9
        assert health.performance_trend == "STABLE"

    def test_healthy_status(self):
        """HEALTHY status should be valid"""
        health = SystemHealth(
            status="HEALTHY",
            score=100.0,
            active_alerts=0,
            critical_alerts=0,
            warning_alerts=0,
            last_check=datetime.now(timezone.utc),
            uptime_percentage=100.0,
            performance_trend="STABLE",
        )
        assert health.status == "HEALTHY"

    def test_degraded_status(self):
        """DEGRADED status should be valid"""
        health = SystemHealth(
            status="DEGRADED",
            score=75.0,
            active_alerts=3,
            critical_alerts=0,
            warning_alerts=3,
            last_check=datetime.now(timezone.utc),
            uptime_percentage=98.5,
            performance_trend="DEGRADING",
        )
        assert health.status == "DEGRADED"

    def test_critical_status(self):
        """CRITICAL status should be valid"""
        health = SystemHealth(
            status="CRITICAL",
            score=30.0,
            active_alerts=5,
            critical_alerts=2,
            warning_alerts=3,
            last_check=datetime.now(timezone.utc),
            uptime_percentage=95.0,
            performance_trend="DEGRADING",
        )
        assert health.status == "CRITICAL"

    def test_performance_trend_improving(self):
        """IMPROVING trend should be valid"""
        health = SystemHealth(
            status="HEALTHY",
            score=85.0,
            active_alerts=1,
            critical_alerts=0,
            warning_alerts=1,
            last_check=datetime.now(timezone.utc),
            uptime_percentage=99.5,
            performance_trend="IMPROVING",
        )
        assert health.performance_trend == "IMPROVING"

    def test_is_dataclass(self):
        """SystemHealth should be a dataclass"""
        health = SystemHealth(
            status="HEALTHY",
            score=100.0,
            active_alerts=0,
            critical_alerts=0,
            warning_alerts=0,
            last_check=datetime.now(timezone.utc),
            uptime_percentage=100.0,
            performance_trend="STABLE",
        )
        result = asdict(health)

        assert isinstance(result, dict)
        assert result["status"] == "HEALTHY"
        assert result["score"] == 100.0


# ============================================================================
# Test Class 5: J53PerformanceMonitor Initialization
# ============================================================================
class TestJ53PerformanceMonitorInit:
    """Test J53PerformanceMonitor initialization"""

    def test_init_with_settings(self, mock_settings):
        """Monitor should initialize with settings"""
        with patch(
            "app.services.j53_performance_monitor.AdvancedStorageAnalytics"
        ) as mock_analytics:
            monitor = J53PerformanceMonitor(mock_settings)

            assert monitor.settings is mock_settings
            assert monitor.monitoring_active is True
            mock_analytics.assert_called_once_with(mock_settings)

    def test_init_creates_analytics(self, mock_settings):
        """Monitor should create AdvancedStorageAnalytics instance"""
        with patch(
            "app.services.j53_performance_monitor.AdvancedStorageAnalytics"
        ) as mock_analytics:
            mock_analytics.return_value = MagicMock()
            monitor = J53PerformanceMonitor(mock_settings)

            assert monitor.analytics is not None

    def test_init_empty_active_alerts(self, performance_monitor):
        """Monitor should start with empty active_alerts dict"""
        assert performance_monitor.active_alerts == {}
        assert isinstance(performance_monitor.active_alerts, dict)

    def test_init_empty_alert_history(self, performance_monitor):
        """Monitor should start with empty alert_history list"""
        assert performance_monitor.alert_history == []
        assert isinstance(performance_monitor.alert_history, list)

    def test_init_empty_alert_callbacks(self, performance_monitor):
        """Monitor should start with empty alert_callbacks list"""
        assert performance_monitor.alert_callbacks == []
        assert isinstance(performance_monitor.alert_callbacks, list)

    def test_monitoring_active_by_default(self, performance_monitor):
        """monitoring_active should be True by default"""
        assert performance_monitor.monitoring_active is True


# ============================================================================
# Test Class 6: Database Health Check (Mocked)
# ============================================================================
class TestCheckDatabaseHealth:
    """Test check_database_health method with mocked database"""

    @pytest.mark.asyncio
    async def test_returns_dict(self, performance_monitor):
        """check_database_health should return a dictionary"""

        # Create empty async generator
        async def mock_async_gen():
            if False:
                yield

        with patch(
            "app.services.j53_performance_monitor.db_manager.get_session",
            mock_async_gen,
        ):
            result = await performance_monitor.check_database_health()

        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_handles_exception_gracefully(self, performance_monitor):
        """check_database_health should handle exceptions gracefully"""

        async def mock_async_gen_with_error():
            raise Exception("Connection failed")
            yield

        with patch(
            "app.services.j53_performance_monitor.db_manager.get_session",
            mock_async_gen_with_error,
        ):
            result = await performance_monitor.check_database_health()

        assert isinstance(result, dict)
        assert "error" in result
        assert result["connection_healthy"] is False


# ============================================================================
# Test Class 7: Edge Cases
# ============================================================================
class TestEdgeCases:
    """Test edge cases and boundary conditions"""

    def test_alert_with_zero_values(self):
        """Alert should handle zero values"""
        alert = PerformanceAlert(
            id="zero-test",
            severity=AlertSeverity.INFO,
            category="test",
            metric_name="test_metric",
            current_value=0.0,
            threshold=0.0,
            message="Zero value test",
            recommendation="None",
            timestamp=datetime.now(timezone.utc),
        )

        assert alert.current_value == 0.0
        assert alert.threshold == 0.0

    def test_alert_with_negative_values(self):
        """Alert should handle negative values (if applicable)"""
        alert = PerformanceAlert(
            id="negative-test",
            severity=AlertSeverity.WARNING,
            category="growth",
            metric_name="growth_rate",
            current_value=-50.0,  # Negative growth
            threshold=0.0,
            message="Negative growth detected",
            recommendation="Investigate decline",
            timestamp=datetime.now(timezone.utc),
        )

        assert alert.current_value == -50.0

    def test_health_with_zero_alerts(self):
        """SystemHealth should handle zero alerts"""
        health = SystemHealth(
            status="HEALTHY",
            score=100.0,
            active_alerts=0,
            critical_alerts=0,
            warning_alerts=0,
            last_check=datetime.now(timezone.utc),
            uptime_percentage=100.0,
            performance_trend="STABLE",
        )

        assert health.active_alerts == 0
        assert health.critical_alerts == 0
        assert health.warning_alerts == 0

    def test_health_with_perfect_score(self):
        """SystemHealth should handle perfect score of 100"""
        health = SystemHealth(
            status="HEALTHY",
            score=100.0,
            active_alerts=0,
            critical_alerts=0,
            warning_alerts=0,
            last_check=datetime.now(timezone.utc),
            uptime_percentage=100.0,
            performance_trend="STABLE",
        )

        assert health.score == 100.0

    def test_health_with_zero_score(self):
        """SystemHealth should handle score of 0"""
        health = SystemHealth(
            status="CRITICAL",
            score=0.0,
            active_alerts=10,
            critical_alerts=5,
            warning_alerts=5,
            last_check=datetime.now(timezone.utc),
            uptime_percentage=0.0,
            performance_trend="DEGRADING",
        )

        assert health.score == 0.0

    def test_metric_threshold_comparison(self):
        """MetricThreshold values should be comparable"""
        # Warning should be less than critical
        assert (
            MetricThreshold.DATABASE_SIZE_WARNING.value
            < MetricThreshold.DATABASE_SIZE_CRITICAL.value
        )
        assert (
            MetricThreshold.DAILY_GROWTH_WARNING.value
            < MetricThreshold.DAILY_GROWTH_CRITICAL.value
        )
        assert (
            MetricThreshold.RESPONSE_TIME_WARNING.value
            < MetricThreshold.RESPONSE_TIME_CRITICAL.value
        )
        assert (
            MetricThreshold.DISK_USAGE_WARNING.value
            < MetricThreshold.DISK_USAGE_CRITICAL.value
        )


# ============================================================================
# Test Class 8: Alert Callbacks
# ============================================================================
class TestAlertCallbacks:
    """Test alert callback functionality"""

    def test_can_add_callback(self, performance_monitor):
        """Should be able to add callbacks to alert_callbacks list"""

        def sample_callback(alert: PerformanceAlert) -> None:
            pass

        performance_monitor.alert_callbacks.append(sample_callback)

        assert len(performance_monitor.alert_callbacks) == 1
        assert sample_callback in performance_monitor.alert_callbacks

    def test_can_add_multiple_callbacks(self, performance_monitor):
        """Should be able to add multiple callbacks"""

        def callback1(alert: PerformanceAlert) -> None:
            pass

        def callback2(alert: PerformanceAlert) -> None:
            pass

        performance_monitor.alert_callbacks.append(callback1)
        performance_monitor.alert_callbacks.append(callback2)

        assert len(performance_monitor.alert_callbacks) == 2

    def test_can_store_active_alert(self, performance_monitor, sample_alert):
        """Should be able to store alerts in active_alerts dict"""
        performance_monitor.active_alerts[sample_alert.id] = sample_alert

        assert sample_alert.id in performance_monitor.active_alerts
        assert performance_monitor.active_alerts[sample_alert.id] is sample_alert

    def test_can_store_alert_in_history(self, performance_monitor, sample_alert):
        """Should be able to add alerts to alert_history list"""
        performance_monitor.alert_history.append(sample_alert)

        assert len(performance_monitor.alert_history) == 1
        assert sample_alert in performance_monitor.alert_history
