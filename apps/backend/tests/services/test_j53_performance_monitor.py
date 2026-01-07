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


# ============================================================================
# Test Class 9: Check Database Health - Comprehensive
# ============================================================================
class TestCheckDatabaseHealthComprehensive:
    """Comprehensive tests for check_database_health method"""

    @pytest.fixture
    def monitor_postgresql(self):
        """Create monitor configured for PostgreSQL"""
        settings = MagicMock()
        settings.DATABASE_URL = "postgresql://test:test@localhost/test"
        with patch("app.services.j53_performance_monitor.AdvancedStorageAnalytics"):
            return J53PerformanceMonitor(settings)

    @pytest.fixture
    def monitor_sqlite(self):
        """Create monitor configured for SQLite"""
        settings = MagicMock()
        settings.DATABASE_URL = "sqlite:///test.db"
        with patch("app.services.j53_performance_monitor.AdvancedStorageAnalytics"):
            return J53PerformanceMonitor(settings)

    @pytest.mark.asyncio
    async def test_postgresql_connection_test(self, monitor_postgresql):
        """Test connection timing for PostgreSQL"""
        mock_session = AsyncMock()

        # Mock size result
        mock_result = MagicMock()
        mock_result.scalar.return_value = 50 * 1024 * 1024  # 50MB
        mock_session.execute.return_value = mock_result
        mock_session.scalar.return_value = 100

        async def mock_get_session(*args, **kwargs):
            yield mock_session

        with patch(
            "app.services.j53_performance_monitor.db_manager.get_session",
            mock_get_session,
        ):
            result = await monitor_postgresql.check_database_health()

            assert "connection_time_ms" in result
            assert "connection_healthy" in result
            assert "database_size_mb" in result

    @pytest.mark.asyncio
    async def test_sqlite_database_size(self, monitor_sqlite):
        """Test SQLite-specific size check"""
        mock_session = AsyncMock()

        mock_result = MagicMock()
        mock_result.scalar.return_value = 1024 * 1024  # 1MB
        mock_session.execute.return_value = mock_result
        mock_session.scalar.return_value = 50

        async def mock_get_session(*args, **kwargs):
            yield mock_session

        with patch(
            "app.services.j53_performance_monitor.db_manager.get_session",
            mock_get_session,
        ):
            result = await monitor_sqlite.check_database_health()

            assert "connection_time_ms" in result

    @pytest.mark.asyncio
    async def test_table_statistics(self, monitor_postgresql):
        """Test table statistics collection"""
        mock_session = AsyncMock()

        mock_result = MagicMock()
        mock_result.scalar.return_value = 100 * 1024 * 1024
        mock_session.execute.return_value = mock_result
        mock_session.scalar.side_effect = [
            100,
            50,
            25,
        ]  # ai_messages, ai_threads, users

        async def mock_get_session(*args, **kwargs):
            yield mock_session

        with patch(
            "app.services.j53_performance_monitor.db_manager.get_session",
            mock_get_session,
        ):
            result = await monitor_postgresql.check_database_health()

            assert "table_statistics" in result

    @pytest.mark.asyncio
    async def test_table_count_error_handled(self, monitor_postgresql):
        """Test graceful handling of table count errors"""
        mock_session = AsyncMock()

        mock_result = MagicMock()
        mock_result.scalar.return_value = 100 * 1024 * 1024
        mock_session.execute.return_value = mock_result
        mock_session.scalar.side_effect = Exception("Table not found")

        async def mock_get_session(*args, **kwargs):
            yield mock_session

        with patch(
            "app.services.j53_performance_monitor.db_manager.get_session",
            mock_get_session,
        ):
            result = await monitor_postgresql.check_database_health()

            # Should still return result with table_statistics as 0s
            assert isinstance(result, dict)


# ============================================================================
# Test Class 10: Check Performance Metrics
# ============================================================================
class TestCheckPerformanceMetrics:
    """Tests for check_performance_metrics method"""

    @pytest.fixture
    def monitor(self):
        """Create monitor with mocked dependencies"""
        settings = MagicMock()
        settings.DATABASE_URL = "postgresql://test:test@localhost/test"
        with patch("app.services.j53_performance_monitor.AdvancedStorageAnalytics"):
            return J53PerformanceMonitor(settings)

    @pytest.mark.asyncio
    async def test_returns_storage_metrics(self, monitor):
        """Test that storage metrics are returned"""
        mock_storage = MagicMock()
        mock_storage.total_messages = 1000
        mock_storage.total_threads = 100

        mock_benchmark = MagicMock()
        mock_benchmark.operation = "select"
        mock_benchmark.avg_time_ms = 10.0

        monitor.analytics.get_comprehensive_metrics = AsyncMock(
            return_value=mock_storage
        )
        monitor.analytics.benchmark_database_performance = AsyncMock(
            return_value=[mock_benchmark]
        )

        with patch(
            "app.services.j53_performance_monitor.asdict", return_value={"test": "data"}
        ):
            result = await monitor.check_performance_metrics()

            assert "storage_metrics" in result
            assert "response_times" in result
            assert "performance_benchmarks" in result
            assert "estimated_memory_usage_mb" in result

    @pytest.mark.asyncio
    async def test_memory_estimation(self, monitor):
        """Test memory usage estimation calculation"""
        mock_storage = MagicMock()
        mock_storage.total_messages = 10000  # 10000 * 0.001 = 10
        mock_storage.total_threads = 1000  # 1000 * 0.0001 = 0.1

        mock_benchmark = MagicMock()
        mock_benchmark.operation = "select"
        mock_benchmark.avg_time_ms = 5.0

        monitor.analytics.get_comprehensive_metrics = AsyncMock(
            return_value=mock_storage
        )
        monitor.analytics.benchmark_database_performance = AsyncMock(
            return_value=[mock_benchmark]
        )

        with patch("app.services.j53_performance_monitor.asdict", return_value={}):
            result = await monitor.check_performance_metrics()

            # 10000 * 0.001 + 1000 * 0.0001 = 10 + 0.1 = 10.1
            assert result["estimated_memory_usage_mb"] == 10.1

    @pytest.mark.asyncio
    async def test_handles_analytics_error(self, monitor):
        """Test error handling when analytics fails"""
        monitor.analytics.get_comprehensive_metrics = AsyncMock(
            side_effect=Exception("Analytics error")
        )

        result = await monitor.check_performance_metrics()

        assert "error" in result


# ============================================================================
# Test Class 11: Alert Creation
# ============================================================================
class TestAlertCreation:
    """Tests for _create_alert method"""

    @pytest.fixture
    def monitor(self):
        """Create monitor with mocked dependencies"""
        settings = MagicMock()
        settings.DATABASE_URL = "postgresql://test:test@localhost/test"
        with patch("app.services.j53_performance_monitor.AdvancedStorageAnalytics"):
            return J53PerformanceMonitor(settings)

    def test_generate_alert_id_format(self, monitor):
        """Test alert ID format"""
        alert_id = monitor._generate_alert_id("Storage", "database_size")

        assert "Storage_database_size_" in alert_id
        # Should have timestamp portion
        parts = alert_id.split("_")
        assert len(parts) >= 4

    @pytest.mark.asyncio
    async def test_create_alert_stores_in_active(self, monitor):
        """Test that created alert is stored in active_alerts"""
        alert = await monitor._create_alert(
            AlertSeverity.WARNING,
            "Storage",
            "database_size",
            600.0,
            500.0,
            "Test message",
            "Test recommendation",
        )

        assert alert.id in monitor.active_alerts
        assert monitor.active_alerts[alert.id] == alert

    @pytest.mark.asyncio
    async def test_create_alert_stores_in_history(self, monitor):
        """Test that created alert is stored in alert_history"""
        alert = await monitor._create_alert(
            AlertSeverity.CRITICAL,
            "Performance",
            "response_time",
            6000.0,
            5000.0,
            "Critical response time",
            "Optimize queries",
        )

        assert alert in monitor.alert_history

    @pytest.mark.asyncio
    async def test_create_alert_callback_triggered(self, monitor):
        """Test that callbacks are triggered on alert creation"""
        callback_alerts = []

        def test_callback(alert):
            callback_alerts.append(alert)

        monitor.register_alert_callback(test_callback)

        alert = await monitor._create_alert(
            AlertSeverity.INFO,
            "Test",
            "test_metric",
            1.0,
            2.0,
            "Info message",
            "Recommendation",
        )

        assert len(callback_alerts) == 1
        assert callback_alerts[0] == alert

    @pytest.mark.asyncio
    async def test_create_alert_callback_error_handled(self, monitor):
        """Test that callback errors don't break alert creation"""

        def failing_callback(alert):
            raise Exception("Callback failed!")

        monitor.register_alert_callback(failing_callback)

        # Should not raise
        alert = await monitor._create_alert(
            AlertSeverity.WARNING,
            "Test",
            "test_metric",
            1.0,
            2.0,
            "Test message",
            "Test recommendation",
        )

        assert alert is not None


# ============================================================================
# Test Class 12: Alert Evaluation
# ============================================================================
class TestAlertEvaluation:
    """Tests for evaluate_alerts method"""

    @pytest.fixture
    def monitor(self):
        """Create monitor with mocked dependencies"""
        settings = MagicMock()
        settings.DATABASE_URL = "postgresql://test:test@localhost/test"
        with patch("app.services.j53_performance_monitor.AdvancedStorageAnalytics"):
            return J53PerformanceMonitor(settings)

    @pytest.mark.asyncio
    async def test_database_size_critical_alert(self, monitor):
        """Test critical alert for database size"""
        monitor.check_database_health = AsyncMock(
            return_value={
                "database_size_mb": 1500.0,  # Above 1000 critical
                "connection_time_ms": 50.0,
                "connection_healthy": True,
            }
        )
        monitor.check_performance_metrics = AsyncMock(return_value={})

        alerts = await monitor.evaluate_alerts()

        critical_alerts = [a for a in alerts if a.severity == AlertSeverity.CRITICAL]
        assert len(critical_alerts) >= 1
        assert any(a.metric_name == "database_size" for a in critical_alerts)

    @pytest.mark.asyncio
    async def test_database_size_warning_alert(self, monitor):
        """Test warning alert for database size"""
        monitor.check_database_health = AsyncMock(
            return_value={
                "database_size_mb": 700.0,  # Above 500 warning, below 1000 critical
                "connection_time_ms": 50.0,
                "connection_healthy": True,
            }
        )
        monitor.check_performance_metrics = AsyncMock(return_value={})

        alerts = await monitor.evaluate_alerts()

        warning_alerts = [a for a in alerts if a.severity == AlertSeverity.WARNING]
        assert len(warning_alerts) >= 1

    @pytest.mark.asyncio
    async def test_connection_time_critical_alert(self, monitor):
        """Test critical alert for slow connection"""
        monitor.check_database_health = AsyncMock(
            return_value={
                "database_size_mb": 100.0,
                "connection_time_ms": 6000.0,  # Above 5000 critical
                "connection_healthy": False,
            }
        )
        monitor.check_performance_metrics = AsyncMock(return_value={})

        alerts = await monitor.evaluate_alerts()

        critical_alerts = [a for a in alerts if a.severity == AlertSeverity.CRITICAL]
        assert len(critical_alerts) >= 1
        assert any(a.metric_name == "connection_time" for a in critical_alerts)

    @pytest.mark.asyncio
    async def test_connection_time_warning_alert(self, monitor):
        """Test warning alert for slow connection"""
        monitor.check_database_health = AsyncMock(
            return_value={
                "database_size_mb": 100.0,
                "connection_time_ms": 2000.0,  # Above 1000 warning, below 5000 critical
                "connection_healthy": True,
            }
        )
        monitor.check_performance_metrics = AsyncMock(return_value={})

        alerts = await monitor.evaluate_alerts()

        warning_alerts = [a for a in alerts if a.severity == AlertSeverity.WARNING]
        assert len(warning_alerts) >= 1

    @pytest.mark.asyncio
    async def test_daily_growth_critical_alert(self, monitor):
        """Test critical alert for rapid growth"""
        monitor.check_database_health = AsyncMock(
            return_value={
                "database_size_mb": 100.0,
                "connection_time_ms": 50.0,
                "connection_healthy": True,
            }
        )
        monitor.check_performance_metrics = AsyncMock(
            return_value={
                "storage_metrics": {
                    "daily_growth_rate": 2000,  # Above 1000 critical
                }
            }
        )

        alerts = await monitor.evaluate_alerts()

        critical_alerts = [a for a in alerts if a.severity == AlertSeverity.CRITICAL]
        assert len(critical_alerts) >= 1
        assert any(a.metric_name == "daily_growth_rate" for a in critical_alerts)

    @pytest.mark.asyncio
    async def test_daily_growth_warning_alert(self, monitor):
        """Test warning alert for growth"""
        monitor.check_database_health = AsyncMock(
            return_value={
                "database_size_mb": 100.0,
                "connection_time_ms": 50.0,
                "connection_healthy": True,
            }
        )
        monitor.check_performance_metrics = AsyncMock(
            return_value={
                "storage_metrics": {
                    "daily_growth_rate": 500,  # Above 100 warning, below 1000 critical
                }
            }
        )

        alerts = await monitor.evaluate_alerts()

        warning_alerts = [a for a in alerts if a.severity == AlertSeverity.WARNING]
        assert len(warning_alerts) >= 1

    @pytest.mark.asyncio
    async def test_evaluation_error_creates_monitoring_alert(self, monitor):
        """Test that evaluation errors create monitoring system alerts"""
        monitor.check_database_health = AsyncMock(
            side_effect=Exception("Database check failed")
        )

        alerts = await monitor.evaluate_alerts()

        assert len(alerts) >= 1
        assert any(a.category == "Monitoring" for a in alerts)


# ============================================================================
# Test Class 13: System Health Calculation
# ============================================================================
class TestSystemHealthCalculation:
    """Tests for calculate_system_health method"""

    @pytest.fixture
    def monitor(self):
        """Create monitor with mocked dependencies"""
        settings = MagicMock()
        settings.DATABASE_URL = "postgresql://test:test@localhost/test"
        with patch("app.services.j53_performance_monitor.AdvancedStorageAnalytics"):
            return J53PerformanceMonitor(settings)

    def test_healthy_with_no_alerts(self, monitor):
        """Test HEALTHY status with no alerts"""
        health = monitor.calculate_system_health()

        assert health.status == "HEALTHY"
        assert health.score == 100.0
        assert health.critical_alerts == 0
        assert health.warning_alerts == 0

    @pytest.mark.asyncio
    async def test_critical_status_with_critical_alert(self, monitor):
        """Test CRITICAL status with critical alert"""
        await monitor._create_alert(
            AlertSeverity.CRITICAL,
            "Test",
            "test",
            1.0,
            0.5,
            "Test",
            "Test",
        )

        health = monitor.calculate_system_health()

        assert health.status == "CRITICAL"
        assert health.score == 70.0  # 100 - 30
        assert health.critical_alerts == 1

    @pytest.mark.asyncio
    async def test_degraded_status_with_warnings(self, monitor):
        """Test DEGRADED status with warning alerts"""
        await monitor._create_alert(
            AlertSeverity.WARNING,
            "Test1",
            "test1",
            1.0,
            0.5,
            "Warning 1",
            "Fix it",
        )
        await monitor._create_alert(
            AlertSeverity.WARNING,
            "Test2",
            "test2",
            2.0,
            1.0,
            "Warning 2",
            "Fix it too",
        )

        health = monitor.calculate_system_health()

        assert health.status == "DEGRADED"
        assert health.score == 80.0  # 100 - 10 - 10
        assert health.warning_alerts == 2

    @pytest.mark.asyncio
    async def test_info_alerts_minimal_impact(self, monitor):
        """Test INFO alerts have minimal score impact"""
        for i in range(5):
            await monitor._create_alert(
                AlertSeverity.INFO,
                f"Test{i}",
                f"test{i}",
                1.0,
                0.5,
                f"Info {i}",
                "FYI",
            )

        health = monitor.calculate_system_health()

        # 5 info alerts * 2 points = 10 points deducted
        assert health.score == 90.0

    @pytest.mark.asyncio
    async def test_resolved_alerts_not_counted(self, monitor):
        """Test that resolved alerts don't affect health"""
        alert = await monitor._create_alert(
            AlertSeverity.CRITICAL,
            "Test",
            "test",
            1.0,
            0.5,
            "Test",
            "Test",
        )
        await monitor.resolve_alert(alert.id)

        health = monitor.calculate_system_health()

        assert health.status == "HEALTHY"
        assert health.score == 100.0
        assert health.critical_alerts == 0

    @pytest.mark.asyncio
    async def test_uptime_calculation_with_critical(self, monitor):
        """Test uptime percentage with critical alerts"""
        await monitor._create_alert(
            AlertSeverity.CRITICAL,
            "Test",
            "test",
            1.0,
            0.5,
            "Test",
            "Test",
        )

        health = monitor.calculate_system_health()

        assert health.uptime_percentage == 95.0  # 100 - 5 * 1

    def test_performance_trend_stable(self, monitor):
        """Test STABLE trend when no alerts"""
        health = monitor.calculate_system_health()
        assert health.performance_trend == "STABLE"

    @pytest.mark.asyncio
    async def test_score_cannot_go_negative(self, monitor):
        """Test that score doesn't go below 0"""
        # Create many critical alerts
        for i in range(10):
            await monitor._create_alert(
                AlertSeverity.CRITICAL,
                f"Test{i}",
                f"test{i}",
                1.0,
                0.5,
                f"Critical {i}",
                "Fix immediately",
            )

        health = monitor.calculate_system_health()

        # 10 criticals * 30 = 300 deduction, but max is 0
        assert health.score == 0.0


# ============================================================================
# Test Class 14: Alert Resolution and Acknowledgement
# ============================================================================
class TestAlertResolutionAcknowledgement:
    """Tests for resolve_alert and acknowledge_alert methods"""

    @pytest.fixture
    def monitor(self):
        """Create monitor with mocked dependencies"""
        settings = MagicMock()
        settings.DATABASE_URL = "postgresql://test:test@localhost/test"
        with patch("app.services.j53_performance_monitor.AdvancedStorageAnalytics"):
            return J53PerformanceMonitor(settings)

    @pytest.mark.asyncio
    async def test_resolve_existing_alert(self, monitor):
        """Test resolving an existing alert"""
        alert = await monitor._create_alert(
            AlertSeverity.WARNING,
            "Test",
            "test",
            1.0,
            0.5,
            "Test",
            "Test",
        )

        result = await monitor.resolve_alert(alert.id)

        assert result is True
        assert monitor.active_alerts[alert.id].resolved is True

    @pytest.mark.asyncio
    async def test_resolve_nonexistent_alert(self, monitor):
        """Test resolving nonexistent alert returns False"""
        result = await monitor.resolve_alert("nonexistent_id_123")
        assert result is False

    @pytest.mark.asyncio
    async def test_resolve_with_custom_resolved_by(self, monitor):
        """Test resolving alert with custom resolved_by"""
        alert = await monitor._create_alert(
            AlertSeverity.WARNING,
            "Test",
            "test",
            1.0,
            0.5,
            "Test",
            "Test",
        )

        result = await monitor.resolve_alert(alert.id, resolved_by="admin_user")

        assert result is True

    @pytest.mark.asyncio
    async def test_acknowledge_existing_alert(self, monitor):
        """Test acknowledging an existing alert"""
        alert = await monitor._create_alert(
            AlertSeverity.CRITICAL,
            "Test",
            "test",
            1.0,
            0.5,
            "Test",
            "Test",
        )

        result = await monitor.acknowledge_alert(alert.id)

        assert result is True
        assert monitor.active_alerts[alert.id].acknowledged is True

    @pytest.mark.asyncio
    async def test_acknowledge_nonexistent_alert(self, monitor):
        """Test acknowledging nonexistent alert returns False"""
        result = await monitor.acknowledge_alert("nonexistent_id_456")
        assert result is False


# ============================================================================
# Test Class 15: Email Alerts
# ============================================================================
class TestEmailAlerts:
    """Tests for send_email_alert method"""

    @pytest.fixture
    def monitor_with_email(self):
        """Create monitor with email settings configured"""
        settings = MagicMock()
        settings.DATABASE_URL = "postgresql://test:test@localhost/test"
        settings.SMTP_HOST = "smtp.example.com"
        settings.SMTP_PORT = 587
        settings.SMTP_TLS = True
        settings.SMTP_USERNAME = "user@example.com"
        settings.SMTP_PASSWORD = "password123"
        settings.FROM_EMAIL = "alerts@lokifi.app"
        settings.ADMIN_EMAIL = "admin@lokifi.app"

        with patch("app.services.j53_performance_monitor.AdvancedStorageAnalytics"):
            return J53PerformanceMonitor(settings)

    @pytest.fixture
    def monitor_no_email(self):
        """Create monitor without email settings"""
        settings = MagicMock()
        settings.DATABASE_URL = "postgresql://test:test@localhost/test"
        # Simulate missing SMTP_HOST
        del settings.SMTP_HOST

        with patch("app.services.j53_performance_monitor.AdvancedStorageAnalytics"):
            return J53PerformanceMonitor(settings)

    @pytest.fixture
    def sample_alert(self):
        """Create sample alert for email tests"""
        return PerformanceAlert(
            id="email_test_001",
            severity=AlertSeverity.CRITICAL,
            category="Storage",
            metric_name="database_size",
            current_value=1500.0,
            threshold=1000.0,
            message="Database size critical",
            recommendation="Archive data immediately",
            timestamp=datetime.now(timezone.utc),
        )

    @pytest.mark.asyncio
    async def test_email_sent_successfully(self, monitor_with_email, sample_alert):
        """Test successful email sending"""
        with patch("app.services.j53_performance_monitor.smtplib.SMTP") as mock_smtp:
            mock_server = MagicMock()
            mock_smtp.return_value = mock_server

            result = await monitor_with_email.send_email_alert(sample_alert)

            assert result is True
            mock_server.starttls.assert_called_once()
            mock_server.login.assert_called_once()
            mock_server.sendmail.assert_called_once()
            mock_server.quit.assert_called_once()

    @pytest.mark.asyncio
    async def test_email_not_configured(self, monitor_no_email, sample_alert):
        """Test email when SMTP not configured"""
        result = await monitor_no_email.send_email_alert(sample_alert)
        assert result is False

    @pytest.mark.asyncio
    async def test_email_smtp_error(self, monitor_with_email, sample_alert):
        """Test email with SMTP error"""
        with patch("app.services.j53_performance_monitor.smtplib.SMTP") as mock_smtp:
            mock_smtp.side_effect = Exception("SMTP connection failed")

            result = await monitor_with_email.send_email_alert(sample_alert)

            assert result is False


# ============================================================================
# Test Class 16: Monitoring Cycle
# ============================================================================
class TestMonitoringCycle:
    """Tests for run_monitoring_cycle method"""

    @pytest.fixture
    def monitor(self):
        """Create monitor with mocked dependencies"""
        settings = MagicMock()
        settings.DATABASE_URL = "postgresql://test:test@localhost/test"
        with patch("app.services.j53_performance_monitor.AdvancedStorageAnalytics"):
            return J53PerformanceMonitor(settings)

    @pytest.mark.asyncio
    async def test_cycle_returns_report(self, monitor):
        """Test monitoring cycle returns complete report"""
        monitor.evaluate_alerts = AsyncMock(return_value=[])

        report = await monitor.run_monitoring_cycle()

        assert "monitoring_cycle" in report
        assert "system_health" in report
        assert "active_alerts" in report
        assert "new_alerts" in report
        assert "alert_summary" in report

    @pytest.mark.asyncio
    async def test_cycle_records_timing(self, monitor):
        """Test that cycle records duration"""
        monitor.evaluate_alerts = AsyncMock(return_value=[])

        report = await monitor.run_monitoring_cycle()

        assert "timestamp" in report["monitoring_cycle"]
        assert "duration_ms" in report["monitoring_cycle"]

    @pytest.mark.asyncio
    async def test_cycle_with_new_alerts(self, monitor):
        """Test cycle that generates new alerts"""
        mock_alert = PerformanceAlert(
            id="new_alert_001",
            severity=AlertSeverity.WARNING,
            category="Test",
            metric_name="test",
            current_value=1.0,
            threshold=0.5,
            message="Test alert",
            recommendation="Test",
            timestamp=datetime.now(timezone.utc),
        )
        monitor.evaluate_alerts = AsyncMock(return_value=[mock_alert])

        report = await monitor.run_monitoring_cycle()

        assert report["monitoring_cycle"]["new_alerts"] == 1
        assert len(report["new_alerts"]) == 1

    @pytest.mark.asyncio
    async def test_cycle_alert_summary(self, monitor):
        """Test alert summary in report"""
        monitor.evaluate_alerts = AsyncMock(return_value=[])

        report = await monitor.run_monitoring_cycle()

        summary = report["alert_summary"]
        assert "total_active" in summary
        assert "critical" in summary
        assert "warning" in summary
        assert "info" in summary


# ============================================================================
# Test Class 17: Callback Registration
# ============================================================================
class TestCallbackRegistration:
    """Tests for register_alert_callback method"""

    @pytest.fixture
    def monitor(self):
        """Create monitor with mocked dependencies"""
        settings = MagicMock()
        settings.DATABASE_URL = "postgresql://test:test@localhost/test"
        with patch("app.services.j53_performance_monitor.AdvancedStorageAnalytics"):
            return J53PerformanceMonitor(settings)

    def test_register_single_callback(self, monitor):
        """Test registering a single callback"""

        def my_callback(alert):
            pass

        monitor.register_alert_callback(my_callback)

        assert my_callback in monitor.alert_callbacks
        assert len(monitor.alert_callbacks) == 1

    def test_register_multiple_callbacks(self, monitor):
        """Test registering multiple callbacks"""

        def callback1(alert):
            pass

        def callback2(alert):
            pass

        monitor.register_alert_callback(callback1)
        monitor.register_alert_callback(callback2)

        assert len(monitor.alert_callbacks) == 2
        assert callback1 in monitor.alert_callbacks
        assert callback2 in monitor.alert_callbacks


# ============================================================================
# Test Class 18: J53AutoOptimizer
# ============================================================================
class TestJ53AutoOptimizer:
    """Tests for J53AutoOptimizer class"""

    @pytest.fixture
    def optimizer(self):
        """Create optimizer with mocked dependencies"""
        settings = MagicMock()
        settings.DATABASE_URL = "postgresql://test:test@localhost/test"

        with patch("app.services.j53_performance_monitor.AdvancedStorageAnalytics"):
            monitor = J53PerformanceMonitor(settings)

        from app.services.j53_performance_monitor import J53AutoOptimizer

        return J53AutoOptimizer(settings, monitor)

    @pytest.fixture
    def optimizer_sqlite(self):
        """Create optimizer with SQLite settings"""
        settings = MagicMock()
        settings.DATABASE_URL = "sqlite:///test.db"

        with patch("app.services.j53_performance_monitor.AdvancedStorageAnalytics"):
            monitor = J53PerformanceMonitor(settings)

        from app.services.j53_performance_monitor import J53AutoOptimizer

        return J53AutoOptimizer(settings, monitor)

    def test_init(self, optimizer):
        """Test optimizer initialization"""
        assert optimizer.settings is not None
        assert optimizer.monitor is not None
        assert optimizer.optimization_history == []

    @pytest.mark.asyncio
    async def test_auto_optimize_database_postgresql(self, optimizer):
        """Test database optimization for PostgreSQL"""
        mock_session = AsyncMock()

        mock_row = MagicMock()
        mock_row.schemaname = "public"
        mock_row.tablename = "ai_messages"
        mock_row.seq_scan = 100  # Low seq_scan, won't trigger recommendation
        mock_row.seq_tup_read = 1000
        mock_row.idx_scan = 500
        mock_row.idx_tup_fetch = 500

        mock_result = MagicMock()
        mock_result.__iter__ = lambda self: iter([mock_row])
        mock_session.execute.return_value = mock_result
        mock_session.commit = AsyncMock()

        async def mock_get_session(*args, **kwargs):
            yield mock_session

        with patch(
            "app.services.j53_performance_monitor.db_manager.get_session",
            mock_get_session,
        ):
            result = await optimizer.auto_optimize_database()

            assert result["status"] == "completed"
            assert len(optimizer.optimization_history) == 1

    @pytest.mark.asyncio
    async def test_auto_optimize_database_sqlite(self, optimizer_sqlite):
        """Test database optimization for SQLite (skips PostgreSQL-specific)"""
        mock_session = AsyncMock()
        mock_session.commit = AsyncMock()

        async def mock_get_session(*args, **kwargs):
            yield mock_session

        with patch(
            "app.services.j53_performance_monitor.db_manager.get_session",
            mock_get_session,
        ):
            result = await optimizer_sqlite.auto_optimize_database()

            assert result["status"] == "completed"

    @pytest.mark.asyncio
    async def test_auto_optimize_database_error(self, optimizer):
        """Test database optimization with error"""

        async def mock_get_session_error(*args, **kwargs):
            raise Exception("Database error")
            yield

        with patch(
            "app.services.j53_performance_monitor.db_manager.get_session",
            mock_get_session_error,
        ):
            result = await optimizer.auto_optimize_database()

            assert result["status"] == "error"
            assert "message" in result

    @pytest.mark.asyncio
    async def test_auto_optimize_records_history(self, optimizer):
        """Test that optimization records history"""
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.__iter__ = lambda self: iter([])
        mock_session.execute.return_value = mock_result
        mock_session.commit = AsyncMock()

        async def mock_get_session(*args, **kwargs):
            yield mock_session

        with patch(
            "app.services.j53_performance_monitor.db_manager.get_session",
            mock_get_session,
        ):
            await optimizer.auto_optimize_database()

            assert len(optimizer.optimization_history) == 1
            record = optimizer.optimization_history[0]
            assert "timestamp" in record
            assert "type" in record
            assert "optimizations" in record
            assert "status" in record


# ============================================================================
# Test Class 19: Scaling Recommendations
# ============================================================================
class TestScalingRecommendations:
    """Tests for recommend_scaling_actions method"""

    @pytest.fixture
    def optimizer(self):
        """Create optimizer with mocked dependencies"""
        settings = MagicMock()
        settings.DATABASE_URL = "postgresql://test:test@localhost/test"

        with patch("app.services.j53_performance_monitor.AdvancedStorageAnalytics"):
            monitor = J53PerformanceMonitor(settings)

        from app.services.j53_performance_monitor import J53AutoOptimizer

        return J53AutoOptimizer(settings, monitor)

    @pytest.mark.asyncio
    async def test_healthy_system_no_recommendations(self, optimizer):
        """Test no critical recommendations for healthy system"""
        optimizer.monitor.run_monitoring_cycle = AsyncMock(
            return_value={
                "system_health": {"status": "HEALTHY", "score": 100.0},
                "active_alerts": [],
            }
        )

        recommendations = await optimizer.recommend_scaling_actions()

        critical_recs = [r for r in recommendations if r.get("priority") == "critical"]
        assert len(critical_recs) == 0

    @pytest.mark.asyncio
    async def test_storage_critical_recommends_archival(self, optimizer):
        """Test storage critical alert recommends archival"""
        optimizer.monitor.run_monitoring_cycle = AsyncMock(
            return_value={
                "system_health": {"status": "CRITICAL", "score": 40.0},
                "active_alerts": [{"category": "Storage", "severity": "critical"}],
            }
        )

        recommendations = await optimizer.recommend_scaling_actions()

        actions = [r["action"] for r in recommendations]
        assert "immediate_archival" in actions
        assert "migrate_to_cloud" in actions

    @pytest.mark.asyncio
    async def test_performance_warning_recommends_optimization(self, optimizer):
        """Test performance warning recommends query optimization"""
        optimizer.monitor.run_monitoring_cycle = AsyncMock(
            return_value={
                "system_health": {"status": "DEGRADED", "score": 70.0},
                "active_alerts": [{"category": "Performance", "severity": "warning"}],
            }
        )

        recommendations = await optimizer.recommend_scaling_actions()

        actions = [r["action"] for r in recommendations]
        assert "optimize_queries" in actions

    @pytest.mark.asyncio
    async def test_growth_critical_recommends_sharding(self, optimizer):
        """Test growth critical alert recommends sharding"""
        optimizer.monitor.run_monitoring_cycle = AsyncMock(
            return_value={
                "system_health": {"status": "CRITICAL", "score": 50.0},
                "active_alerts": [{"category": "Growth", "severity": "critical"}],
            }
        )

        recommendations = await optimizer.recommend_scaling_actions()

        actions = [r["action"] for r in recommendations]
        assert "implement_sharding" in actions

    @pytest.mark.asyncio
    async def test_low_health_score_recommends_check(self, optimizer):
        """Test low health score recommends comprehensive check"""
        optimizer.monitor.run_monitoring_cycle = AsyncMock(
            return_value={
                "system_health": {"status": "DEGRADED", "score": 60.0},
                "active_alerts": [],
            }
        )

        recommendations = await optimizer.recommend_scaling_actions()

        actions = [r["action"] for r in recommendations]
        assert "comprehensive_health_check" in actions

    @pytest.mark.asyncio
    async def test_error_returns_empty_list(self, optimizer):
        """Test error handling returns empty list"""
        optimizer.monitor.run_monitoring_cycle = AsyncMock(
            side_effect=Exception("Monitoring failed")
        )

        recommendations = await optimizer.recommend_scaling_actions()

        assert recommendations == []

    @pytest.mark.asyncio
    async def test_recommendation_structure(self, optimizer):
        """Test recommendation has expected structure"""
        optimizer.monitor.run_monitoring_cycle = AsyncMock(
            return_value={
                "system_health": {"status": "CRITICAL", "score": 40.0},
                "active_alerts": [{"category": "Storage", "severity": "critical"}],
            }
        )

        recommendations = await optimizer.recommend_scaling_actions()

        for rec in recommendations:
            assert "action" in rec
            assert "priority" in rec
            assert "description" in rec
            assert "estimated_impact" in rec
            assert "automation_possible" in rec
