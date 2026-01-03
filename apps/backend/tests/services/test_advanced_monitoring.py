"""
Tests for Advanced Monitoring System.

Session 108: Comprehensive testing for system monitoring and observability.
Covers health checks, system metrics, alert management, performance analysis,
and monitoring orchestration.
"""

import asyncio
import time
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.advanced_monitoring import (
    AdvancedMonitoringSystem,
    AlertManager,
    HealthStatus,
    PerformanceAnalyzer,
    SystemMetrics,
    get_monitoring_system,
)

# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def sample_health_status():
    """Sample health status object."""
    return HealthStatus(
        service="database",
        status="healthy",
        response_time=0.05,
        last_check=datetime(2024, 11, 18, 10, 30, tzinfo=timezone.utc),
        error_message=None,
        details={"connections": 5, "latency": "5ms"},
    )


@pytest.fixture
def sample_system_metrics():
    """Sample system metrics object."""
    return SystemMetrics(
        timestamp=datetime(2024, 11, 18, 10, 30, tzinfo=timezone.utc),
        cpu_usage=45.5,
        memory_usage=62.3,
        disk_usage=58.7,
        network_io={"bytes_sent": 1024000, "bytes_recv": 2048000},
        active_connections=50,
        database_connections=10,
        cache_hit_rate=0.85,
        response_times={"api_avg": 0.15, "websocket_avg": 0.05, "database_avg": 0.08},
        error_rates={"api_error_rate": 0.02, "database_error_rate": 0.01},
    )


@pytest.fixture
def alert_manager():
    """Create AlertManager instance."""
    return AlertManager()


@pytest.fixture
def performance_analyzer():
    """Create PerformanceAnalyzer instance."""
    return PerformanceAnalyzer()


@pytest.fixture
def monitoring_system():
    """Create AdvancedMonitoringSystem instance."""
    return AdvancedMonitoringSystem()


# ============================================================================
# Test HealthStatus Dataclass
# ============================================================================


class TestHealthStatus:
    """Test HealthStatus dataclass."""

    def test_health_status_creation(self, sample_health_status):
        """Test HealthStatus creation with all fields."""
        assert sample_health_status.service == "database"
        assert sample_health_status.status == "healthy"
        assert sample_health_status.response_time == 0.05
        assert sample_health_status.error_message is None
        assert sample_health_status.details == {"connections": 5, "latency": "5ms"}

    def test_health_status_to_dict(self, sample_health_status):
        """Test HealthStatus to_dict conversion."""
        result = sample_health_status.to_dict()

        assert result["service"] == "database"
        assert result["status"] == "healthy"
        assert result["response_time"] == 0.05
        assert result["last_check"] == "2024-11-18T10:30:00+00:00"
        assert result["error_message"] is None
        assert result["details"] == {"connections": 5, "latency": "5ms"}

    def test_health_status_with_error(self):
        """Test HealthStatus with error message."""
        status = HealthStatus(
            service="redis",
            status="unhealthy",
            response_time=2.5,
            last_check=datetime.now(timezone.utc),
            error_message="Connection timeout",
            details=None,
        )

        assert status.status == "unhealthy"
        assert status.error_message == "Connection timeout"
        assert status.to_dict()["details"] == {}  # None converted to empty dict


# ============================================================================
# Test SystemMetrics Dataclass
# ============================================================================


class TestSystemMetrics:
    """Test SystemMetrics dataclass."""

    def test_system_metrics_creation(self, sample_system_metrics):
        """Test SystemMetrics creation with all fields."""
        assert sample_system_metrics.cpu_usage == 45.5
        assert sample_system_metrics.memory_usage == 62.3
        assert sample_system_metrics.disk_usage == 58.7
        assert sample_system_metrics.active_connections == 50
        assert sample_system_metrics.database_connections == 10
        assert sample_system_metrics.cache_hit_rate == 0.85

    def test_system_metrics_to_dict(self, sample_system_metrics):
        """Test SystemMetrics to_dict conversion."""
        result = sample_system_metrics.to_dict()

        assert result["cpu_usage"] == 45.5
        assert result["memory_usage"] == 62.3
        assert result["disk_usage"] == 58.7
        assert result["timestamp"] == "2024-11-18T10:30:00+00:00"
        assert "network_io" in result
        assert "response_times" in result
        assert "error_rates" in result

    def test_system_metrics_network_io(self, sample_system_metrics):
        """Test SystemMetrics network I/O data."""
        result = sample_system_metrics.to_dict()

        assert result["network_io"]["bytes_sent"] == 1024000
        assert result["network_io"]["bytes_recv"] == 2048000


# ============================================================================
# Test AlertManager
# ============================================================================


class TestAlertManager:
    """Test AlertManager functionality."""

    def test_alert_manager_initialization(self, alert_manager):
        """Test AlertManager initialization."""
        assert alert_manager.alert_rules == []
        assert alert_manager.active_alerts == {}
        assert len(alert_manager.alert_history) == 0
        assert alert_manager.notification_channels == []

    def test_add_alert_rule(self, alert_manager):
        """Test adding alert rule."""
        condition = lambda m: m.get("cpu_usage", 0) > 80

        alert_manager.add_rule(
            name="high_cpu",
            condition=condition,
            severity="warning",
            cooldown_minutes=5,
        )

        assert len(alert_manager.alert_rules) == 1
        assert alert_manager.alert_rules[0]["name"] == "high_cpu"
        assert alert_manager.alert_rules[0]["severity"] == "warning"
        assert alert_manager.alert_rules[0]["cooldown_minutes"] == 5
        assert alert_manager.alert_rules[0]["last_triggered"] is None

    def test_add_multiple_rules(self, alert_manager):
        """Test adding multiple alert rules."""
        alert_manager.add_rule("rule1", lambda m: True, "warning")
        alert_manager.add_rule("rule2", lambda m: False, "critical")

        assert len(alert_manager.alert_rules) == 2
        assert alert_manager.alert_rules[0]["name"] == "rule1"
        assert alert_manager.alert_rules[1]["name"] == "rule2"

    @pytest.mark.asyncio
    async def test_evaluate_rules_condition_met(self, alert_manager):
        """Test evaluating rules when condition is met."""
        # Add rule that will trigger
        alert_manager.add_rule(
            "high_cpu",
            lambda m: m.get("cpu_usage", 0) > 80,
            "warning",
        )

        metrics = {"cpu_usage": 85}

        # Execute
        await alert_manager.evaluate_rules(metrics)

        # Verify alert was triggered
        assert len(alert_manager.active_alerts) == 1
        assert len(alert_manager.alert_history) == 1

    @pytest.mark.asyncio
    async def test_evaluate_rules_condition_not_met(self, alert_manager):
        """Test evaluating rules when condition not met."""
        # Add rule that won't trigger
        alert_manager.add_rule(
            "high_cpu",
            lambda m: m.get("cpu_usage", 0) > 80,
            "warning",
        )

        metrics = {"cpu_usage": 50}

        # Execute
        await alert_manager.evaluate_rules(metrics)

        # Verify no alerts triggered
        assert len(alert_manager.active_alerts) == 0
        assert len(alert_manager.alert_history) == 0

    @pytest.mark.asyncio
    async def test_evaluate_rules_cooldown_period(self, alert_manager):
        """Test alert cooldown period prevents duplicate alerts."""
        # Add rule with 5-minute cooldown
        alert_manager.add_rule(
            "high_cpu",
            lambda m: m.get("cpu_usage", 0) > 80,
            "warning",
            cooldown_minutes=5,
        )

        metrics = {"cpu_usage": 85}

        # First evaluation - should trigger
        await alert_manager.evaluate_rules(metrics)
        assert len(alert_manager.alert_history) == 1

        # Second evaluation immediately - should not trigger (cooldown)
        await alert_manager.evaluate_rules(metrics)
        assert len(alert_manager.alert_history) == 1  # Still 1, not 2

    @pytest.mark.asyncio
    async def test_evaluate_rules_exception_handling(self, alert_manager):
        """Test rule evaluation handles exceptions gracefully."""

        # Add rule that raises exception
        def bad_condition(m):
            raise ValueError("Intentional error")

        alert_manager.add_rule("bad_rule", bad_condition, "warning")

        metrics = {"cpu_usage": 50}

        # Execute - should not raise exception
        await alert_manager.evaluate_rules(metrics)

        # Verify no alerts triggered
        assert len(alert_manager.active_alerts) == 0

    @pytest.mark.asyncio
    async def test_trigger_alert_notification_channels(self, alert_manager):
        """Test alert triggers notification channels."""
        # Add mock notification channel
        channel_called = []

        async def mock_channel(alert):
            channel_called.append(alert)

        alert_manager.notification_channels.append(mock_channel)

        # Add rule and trigger
        alert_manager.add_rule("test_alert", lambda m: True, "warning")
        await alert_manager.evaluate_rules({"test": "data"})

        # Verify channel was called
        assert len(channel_called) == 1
        assert channel_called[0]["name"] == "test_alert"

    @pytest.mark.asyncio
    async def test_trigger_alert_channel_exception(self, alert_manager):
        """Test alert handles notification channel exceptions."""

        # Add channel that raises exception
        async def bad_channel(alert):
            raise Exception("Channel error")

        alert_manager.notification_channels.append(bad_channel)

        # Add rule and trigger - should not raise
        alert_manager.add_rule("test_alert", lambda m: True, "warning")
        await alert_manager.evaluate_rules({"test": "data"})

        # Alert should still be triggered
        assert len(alert_manager.active_alerts) == 1


# ============================================================================
# Test PerformanceAnalyzer
# ============================================================================


class TestPerformanceAnalyzer:
    """Test PerformanceAnalyzer functionality."""

    def test_performance_analyzer_initialization(self, performance_analyzer):
        """Test PerformanceAnalyzer initialization."""
        assert len(performance_analyzer.metrics_history) == 0
        assert performance_analyzer.performance_baselines == {}
        assert performance_analyzer.anomaly_detection == {}

    def test_add_metrics(self, performance_analyzer, sample_system_metrics):
        """Test adding metrics to analyzer."""
        performance_analyzer.add_metrics(sample_system_metrics)

        assert len(performance_analyzer.metrics_history) == 1
        assert performance_analyzer.metrics_history[0] == sample_system_metrics

    def test_add_multiple_metrics(self, performance_analyzer, sample_system_metrics):
        """Test adding multiple metrics."""
        for i in range(5):
            metrics = SystemMetrics(
                timestamp=datetime.now(timezone.utc),
                cpu_usage=50 + i,
                memory_usage=60 + i,
                disk_usage=50,
                network_io={},
                active_connections=10,
                database_connections=5,
                cache_hit_rate=0.8,
                response_times={},
                error_rates={},
            )
            performance_analyzer.add_metrics(metrics)

        assert len(performance_analyzer.metrics_history) == 5

    def test_update_baselines_sufficient_data(self, performance_analyzer):
        """Test baseline calculation with sufficient data."""
        # Add 20 metrics (>= 10 required)
        for i in range(20):
            metrics = SystemMetrics(
                timestamp=datetime.now(timezone.utc),
                cpu_usage=50.0,
                memory_usage=60.0,
                disk_usage=50,
                network_io={},
                active_connections=10,
                database_connections=5,
                cache_hit_rate=0.8,
                response_times={"api": 0.1},
                error_rates={},
            )
            performance_analyzer.add_metrics(metrics)

        # Verify baselines were calculated
        assert "cpu_usage" in performance_analyzer.performance_baselines
        assert "memory_usage" in performance_analyzer.performance_baselines
        assert "response_time" in performance_analyzer.performance_baselines

    def test_update_baselines_insufficient_data(self, performance_analyzer):
        """Test baselines not calculated with insufficient data."""
        # Add only 5 metrics (< 10 required)
        for i in range(5):
            metrics = SystemMetrics(
                timestamp=datetime.now(timezone.utc),
                cpu_usage=50.0,
                memory_usage=60.0,
                disk_usage=50,
                network_io={},
                active_connections=10,
                database_connections=5,
                cache_hit_rate=0.8,
                response_times={},
                error_rates={},
            )
            performance_analyzer.add_metrics(metrics)

        # Baselines should still be empty
        assert performance_analyzer.performance_baselines == {}

    def test_detect_anomalies_high_cpu(self, performance_analyzer):
        """Test anomaly detection for high CPU usage."""
        # Set baseline
        performance_analyzer.performance_baselines = {"cpu_usage": 50}

        # Add metric with high CPU (> baseline * 1.5)
        metrics = SystemMetrics(
            timestamp=datetime.now(timezone.utc),
            cpu_usage=80.0,  # > 50 * 1.5 = 75
            memory_usage=60.0,
            disk_usage=50,
            network_io={},
            active_connections=10,
            database_connections=5,
            cache_hit_rate=0.8,
            response_times={},
            error_rates={},
        )
        performance_analyzer.add_metrics(metrics)

        # Verify anomaly detected
        assert len(performance_analyzer.anomaly_detection) > 0
        anomalies = list(performance_analyzer.anomaly_detection.values())[0]
        assert "high_cpu_usage" in anomalies

    def test_detect_anomalies_high_memory(self, performance_analyzer):
        """Test anomaly detection for high memory usage."""
        # Set baseline
        performance_analyzer.performance_baselines = {"memory_usage": 50}

        # Add metric with high memory (> baseline * 1.3)
        metrics = SystemMetrics(
            timestamp=datetime.now(timezone.utc),
            cpu_usage=50.0,
            memory_usage=70.0,  # > 50 * 1.3 = 65
            disk_usage=50,
            network_io={},
            active_connections=10,
            database_connections=5,
            cache_hit_rate=0.8,
            response_times={},
            error_rates={},
        )
        performance_analyzer.add_metrics(metrics)

        # Verify anomaly detected
        anomalies = list(performance_analyzer.anomaly_detection.values())[0]
        assert "high_memory_usage" in anomalies

    def test_detect_anomalies_slow_response(self, performance_analyzer):
        """Test anomaly detection for slow response times."""
        # Set baseline
        performance_analyzer.performance_baselines = {"response_time": 0.1}

        # Add metric with slow response (> baseline * 2)
        metrics = SystemMetrics(
            timestamp=datetime.now(timezone.utc),
            cpu_usage=50.0,
            memory_usage=60.0,
            disk_usage=50,
            network_io={},
            active_connections=10,
            database_connections=5,
            cache_hit_rate=0.8,
            response_times={"api": 0.25},  # > 0.1 * 2 = 0.2
            error_rates={},
        )
        performance_analyzer.add_metrics(metrics)

        # Verify anomaly detected
        anomalies = list(performance_analyzer.anomaly_detection.values())[0]
        assert "slow_response_times" in anomalies

    def test_get_insights_no_data(self, performance_analyzer):
        """Test get_insights with no data."""
        insights = performance_analyzer.get_insights()

        assert insights == {}

    def test_get_insights_with_data(self, performance_analyzer):
        """Test get_insights with metrics data."""
        # Add metrics
        for i in range(70):
            metrics = SystemMetrics(
                timestamp=datetime.now(timezone.utc),
                cpu_usage=50.0 + i * 0.1,
                memory_usage=60.0,
                disk_usage=50,
                network_io={},
                active_connections=10,
                database_connections=5,
                cache_hit_rate=0.8,
                response_times={"api": 0.1},
                error_rates={},
            )
            performance_analyzer.add_metrics(metrics)

        insights = performance_analyzer.get_insights()

        assert "baselines" in insights
        assert "trends" in insights
        assert "peak_times" in insights
        assert "recent_anomalies" in insights
        assert "metrics_count" in insights

    def test_calculate_trend_increasing(self, performance_analyzer):
        """Test trend calculation for increasing values."""
        values = [10, 15, 20, 25, 30, 35]  # Increasing
        trend = performance_analyzer._calculate_trend(values)

        assert trend == "increasing"

    def test_calculate_trend_decreasing(self, performance_analyzer):
        """Test trend calculation for decreasing values."""
        values = [35, 30, 25, 20, 15, 10]  # Decreasing
        trend = performance_analyzer._calculate_trend(values)

        assert trend == "decreasing"

    def test_calculate_trend_stable(self, performance_analyzer):
        """Test trend calculation for stable values."""
        values = [50, 51, 49, 50, 51, 50]  # Stable
        trend = performance_analyzer._calculate_trend(values)

        assert trend == "stable"

    def test_calculate_trend_insufficient_data(self, performance_analyzer):
        """Test trend calculation with insufficient data."""
        values = [50]  # Only one value
        trend = performance_analyzer._calculate_trend(values)

        assert trend == "stable"

    @pytest.mark.asyncio
    async def test_analyze_metrics_with_dict(self, performance_analyzer):
        """Test analyze_metrics with dictionary input."""
        metrics_dict = {
            "timestamp": datetime.now(timezone.utc),
            "cpu_usage": 50.0,
            "memory_usage": 60.0,
            "disk_usage": 50.0,
            "network_io": {},
            "active_connections": 10,
            "database_connections": 5,
            "cache_hit_rate": 0.8,
            "response_times": {},
            "error_rates": {},
        }

        await performance_analyzer.analyze_metrics(metrics_dict)

        assert len(performance_analyzer.metrics_history) == 1

    @pytest.mark.asyncio
    async def test_analyze_metrics_with_object(
        self, performance_analyzer, sample_system_metrics
    ):
        """Test analyze_metrics with SystemMetrics object."""
        await performance_analyzer.analyze_metrics(sample_system_metrics)

        assert len(performance_analyzer.metrics_history) == 1


# ============================================================================
# Test AdvancedMonitoringSystem
# ============================================================================


class TestAdvancedMonitoringSystem:
    """Test AdvancedMonitoringSystem functionality."""

    def test_monitoring_system_initialization(self, monitoring_system):
        """Test AdvancedMonitoringSystem initialization."""
        assert monitoring_system.health_checks is not None
        assert monitoring_system.alert_manager is not None
        assert monitoring_system.performance_analyzer is not None
        assert monitoring_system.monitoring_active is False
        assert monitoring_system.monitoring_interval == 60
        assert len(monitoring_system.health_checks) == 6  # 6 health checks initialized

    def test_startup_grace_period(self, monitoring_system):
        """Test startup grace period check."""
        # Immediately after init - within grace period
        assert not monitoring_system._is_past_startup_grace_period()

        # Simulate time passing
        monitoring_system.startup_time = time.time() - 130  # 130 seconds ago
        assert monitoring_system._is_past_startup_grace_period()

    @pytest.mark.asyncio
    async def test_start_background_tasks(self, monitoring_system):
        """Test starting background monitoring tasks."""
        await monitoring_system.start_background_tasks()

        assert monitoring_system.monitoring_active is True
        assert monitoring_system._monitoring_task is not None

        # Cleanup
        await monitoring_system.stop_background_tasks()

    @pytest.mark.asyncio
    async def test_stop_background_tasks(self, monitoring_system):
        """Test stopping background monitoring tasks."""
        # Start first
        await monitoring_system.start_background_tasks()
        await asyncio.sleep(0.1)  # Let task start

        # Stop
        await monitoring_system.stop_background_tasks()

        assert monitoring_system.monitoring_active is False

    @pytest.mark.asyncio
    @patch("app.services.advanced_monitoring.psutil")
    @patch("app.services.advanced_monitoring.advanced_websocket_manager")
    @patch("app.services.advanced_monitoring.advanced_redis_client")
    async def test_collect_system_metrics(
        self,
        mock_redis_client,
        mock_ws_manager,
        mock_psutil,
        monitoring_system,
    ):
        """Test collecting system metrics."""
        # Mock psutil
        mock_psutil.cpu_percent.return_value = 45.5
        mock_psutil.virtual_memory.return_value = MagicMock(percent=62.3)
        mock_psutil.disk_usage.return_value = MagicMock(percent=58.7)
        mock_psutil.net_io_counters.return_value = MagicMock(
            bytes_sent=1024000,
            bytes_recv=2048000,
            packets_sent=1000,
            packets_recv=2000,
        )

        # Mock WebSocket manager
        mock_ws_manager.get_analytics.return_value = {
            "connection_stats": {"active_connections": 50, "active_users": 25}
        }

        # Mock Redis client
        mock_redis_client.get_metrics = AsyncMock(return_value={"hit_rate": 0.85})

        # Execute
        metrics = await monitoring_system._collect_system_metrics()

        # Verify
        assert metrics["cpu_usage"] == 45.5
        assert metrics["memory_usage"] == 62.3
        assert metrics["disk_usage"] == 58.7
        assert metrics["active_connections"] == 50
        assert metrics["cache_hit_rate"] == 0.85

    @pytest.mark.asyncio
    @patch("app.services.advanced_monitoring.db_manager")
    async def test_check_database_health_healthy(
        self, mock_db_manager, monitoring_system
    ):
        """Test database health check when healthy."""
        # Mock session
        mock_result = MagicMock()
        mock_result.scalar.return_value = 1
        mock_session = MagicMock()
        mock_session.execute = AsyncMock(return_value=mock_result)

        async def mock_get_session(read_only=True):
            yield mock_session

        mock_db_manager.get_session = mock_get_session

        # Execute
        result = await monitoring_system._check_database_health()

        # Verify
        assert result["status"] == "healthy"
        assert "error" not in result

    @pytest.mark.asyncio
    @patch("app.services.advanced_monitoring.db_manager")
    async def test_check_database_health_unhealthy(
        self, mock_db_manager, monitoring_system
    ):
        """Test database health check when unhealthy."""

        # Mock session to raise exception
        async def mock_get_session(read_only=True):
            raise Exception("Connection failed")
            yield  # pragma: no cover

        mock_db_manager.get_session = mock_get_session

        # Execute
        result = await monitoring_system._check_database_health()

        # Verify
        assert result["status"] == "unhealthy"
        assert "Connection failed" in result["error"]

    @pytest.mark.asyncio
    @patch("app.services.advanced_monitoring.advanced_redis_client")
    async def test_check_redis_health_healthy(
        self, mock_redis_client, monitoring_system
    ):
        """Test Redis health check when healthy."""
        mock_redis_client.is_available = AsyncMock(return_value=True)
        mock_redis_client.get_metrics = AsyncMock(
            return_value={"hit_rate": 0.85, "connection_status": True}
        )

        result = await monitoring_system._check_redis_health()

        assert result["status"] == "healthy"
        assert result["details"]["hit_rate"] == 0.85

    @pytest.mark.asyncio
    @patch("app.services.advanced_monitoring.advanced_redis_client")
    async def test_check_redis_health_unavailable(
        self, mock_redis_client, monitoring_system
    ):
        """Test Redis health check when unavailable."""
        mock_redis_client.is_available = AsyncMock(return_value=False)

        result = await monitoring_system._check_redis_health()

        assert result["status"] == "unhealthy"
        assert "not available" in result["error"]

    @pytest.mark.asyncio
    @patch("app.services.advanced_monitoring.advanced_websocket_manager")
    async def test_check_websocket_health(self, mock_ws_manager, monitoring_system):
        """Test WebSocket health check."""
        mock_ws_manager.get_analytics.return_value = {
            "connection_stats": {"active_connections": 25, "active_users": 15}
        }

        result = await monitoring_system._check_websocket_health()

        assert result["status"] == "healthy"
        assert result["details"]["active_connections"] == 25

    @pytest.mark.asyncio
    @patch("app.services.advanced_monitoring.psutil")
    async def test_check_disk_space_healthy(self, mock_psutil, monitoring_system):
        """Test disk space check when healthy."""
        mock_psutil.disk_usage.return_value = MagicMock(
            percent=50.0,
            free=100 * (1024**3),
            total=200 * (1024**3),
        )

        result = await monitoring_system._check_disk_space()

        assert result["status"] == "healthy"
        assert result["details"]["usage_percent"] == 50.0

    @pytest.mark.asyncio
    @patch("app.services.advanced_monitoring.psutil")
    async def test_check_disk_space_degraded(self, mock_psutil, monitoring_system):
        """Test disk space check when degraded."""
        mock_psutil.disk_usage.return_value = MagicMock(
            percent=85.0,  # 80-90% = degraded
            free=30 * (1024**3),
            total=200 * (1024**3),
        )

        result = await monitoring_system._check_disk_space()

        assert result["status"] == "degraded"

    @pytest.mark.asyncio
    @patch("app.services.advanced_monitoring.psutil")
    async def test_check_disk_space_unhealthy(self, mock_psutil, monitoring_system):
        """Test disk space check when unhealthy."""
        mock_psutil.disk_usage.return_value = MagicMock(
            percent=95.0,  # >90% = unhealthy
            free=10 * (1024**3),
            total=200 * (1024**3),
        )

        result = await monitoring_system._check_disk_space()

        assert result["status"] == "unhealthy"

    @pytest.mark.asyncio
    @patch("app.services.advanced_monitoring.psutil")
    async def test_check_memory_health_healthy(self, mock_psutil, monitoring_system):
        """Test memory health check when healthy."""
        mock_psutil.virtual_memory.return_value = MagicMock(
            percent=60.0,
            available=80 * (1024**3),
            total=200 * (1024**3),
        )

        result = await monitoring_system._check_memory_health()

        assert result["status"] == "healthy"

    @pytest.mark.asyncio
    @patch("app.services.advanced_monitoring.psutil")
    async def test_check_memory_health_degraded(self, mock_psutil, monitoring_system):
        """Test memory health check when degraded."""
        mock_psutil.virtual_memory.return_value = MagicMock(
            percent=80.0,  # 75-90% = degraded
            available=40 * (1024**3),
            total=200 * (1024**3),
        )

        result = await monitoring_system._check_memory_health()

        assert result["status"] == "degraded"

    @pytest.mark.asyncio
    @patch("app.services.advanced_monitoring.psutil")
    async def test_check_memory_health_unhealthy(self, mock_psutil, monitoring_system):
        """Test memory health check when unhealthy."""
        mock_psutil.virtual_memory.return_value = MagicMock(
            percent=92.0,  # >90% = unhealthy
            available=16 * (1024**3),
            total=200 * (1024**3),
        )

        result = await monitoring_system._check_memory_health()

        assert result["status"] == "unhealthy"

    @pytest.mark.asyncio
    async def test_run_all_health_checks(self, monitoring_system):
        """Test running all health checks."""
        # Mock all health check functions
        for service in monitoring_system.health_checks:
            monitoring_system.health_checks[service] = AsyncMock(
                return_value={"status": "healthy", "details": {}}
            )

        results = await monitoring_system._run_all_health_checks()

        assert len(results) == 6  # All 6 health checks
        assert all(status.status == "healthy" for status in results.values())

    @pytest.mark.asyncio
    async def test_run_all_health_checks_exception(self, monitoring_system):
        """Test health checks handle exceptions."""
        # Mock one check to raise exception
        monitoring_system.health_checks["database"] = AsyncMock(
            side_effect=Exception("Health check failed")
        )

        results = await monitoring_system._run_all_health_checks()

        assert results["database"].status == "unhealthy"
        assert "Health check failed" in results["database"].error_message

    @pytest.mark.asyncio
    @patch("app.services.advanced_monitoring.advanced_websocket_manager")
    @patch("app.services.advanced_monitoring.advanced_redis_client")
    async def test_get_dashboard_data(
        self,
        mock_redis_client,
        mock_ws_manager,
        monitoring_system,
    ):
        """Test getting dashboard data."""
        # Mock dependencies
        mock_ws_manager.get_analytics.return_value = {
            "connection_stats": {"active_connections": 50}
        }
        mock_redis_client.get_metrics = AsyncMock(return_value={"hit_rate": 0.85})

        # Mock health checks
        for service in monitoring_system.health_checks:
            monitoring_system.health_checks[service] = AsyncMock(
                return_value={"status": "healthy"}
            )

        # Execute
        dashboard = await monitoring_system.get_dashboard_data()

        # Verify
        assert "timestamp" in dashboard
        assert "system_status" in dashboard
        assert "health_checks" in dashboard
        assert "performance_insights" in dashboard
        assert "websocket_analytics" in dashboard
        assert "redis_metrics" in dashboard

    @pytest.mark.asyncio
    async def test_get_dashboard_data_degraded_status(self, monitoring_system):
        """Test dashboard data shows degraded status when services unhealthy."""
        # Mock one service as unhealthy
        monitoring_system.health_checks = {
            "database": AsyncMock(
                return_value={"status": "unhealthy", "error": "Connection failed"}
            ),
            "redis": AsyncMock(return_value={"status": "healthy"}),
        }

        dashboard = await monitoring_system.get_dashboard_data()

        assert dashboard["system_status"] == "degraded"


# ============================================================================
# Test Global Monitoring System
# ============================================================================


class TestGlobalMonitoringSystem:
    """Test global monitoring system instance."""

    def test_get_monitoring_system_singleton(self):
        """Test get_monitoring_system returns singleton instance."""
        system1 = get_monitoring_system()
        system2 = get_monitoring_system()

        assert system1 is system2

    def test_get_monitoring_system_type(self):
        """Test get_monitoring_system returns correct type."""
        system = get_monitoring_system()

        assert isinstance(system, AdvancedMonitoringSystem)


# ============================================================================
# Test Edge Cases
# ============================================================================


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_health_status_none_details(self):
        """Test HealthStatus with None details."""
        status = HealthStatus(
            service="test",
            status="healthy",
            response_time=0.1,
            last_check=datetime.now(timezone.utc),
            details=None,
        )

        result = status.to_dict()
        assert result["details"] == {}

    def test_system_metrics_empty_dicts(self):
        """Test SystemMetrics with empty dictionaries."""
        metrics = SystemMetrics(
            timestamp=datetime.now(timezone.utc),
            cpu_usage=50.0,
            memory_usage=60.0,
            disk_usage=70.0,
            network_io={},
            active_connections=0,
            database_connections=0,
            cache_hit_rate=0.0,
            response_times={},
            error_rates={},
        )

        result = metrics.to_dict()
        assert result["network_io"] == {}
        assert result["response_times"] == {}
        assert result["error_rates"] == {}

    def test_alert_manager_empty_metrics(self, alert_manager):
        """Test AlertManager with empty metrics dictionary."""
        alert_manager.add_rule("test", lambda m: m.get("key", 0) > 100, "warning")

        # Empty metrics should not trigger
        asyncio.run(alert_manager.evaluate_rules({}))
        assert len(alert_manager.active_alerts) == 0

    def test_performance_analyzer_maxlen(self, performance_analyzer):
        """Test PerformanceAnalyzer respects maxlen."""
        # Add more than maxlen (1440) metrics
        for i in range(1500):
            metrics = SystemMetrics(
                timestamp=datetime.now(timezone.utc),
                cpu_usage=50.0,
                memory_usage=60.0,
                disk_usage=70.0,
                network_io={},
                active_connections=10,
                database_connections=5,
                cache_hit_rate=0.8,
                response_times={},
                error_rates={},
            )
            performance_analyzer.add_metrics(metrics)

        # Should only keep last 1440
        assert len(performance_analyzer.metrics_history) == 1440

    def test_alert_history_maxlen(self, alert_manager):
        """Test AlertManager alert history respects maxlen."""
        # Simulate 1100 alerts (maxlen is 1000)
        for i in range(1100):
            alert = {
                "name": f"alert_{i}",
                "severity": "warning",
                "timestamp": datetime.now(timezone.utc),
                "message": "Test alert",
            }
            alert_manager.alert_history.append(alert)

        # Should only keep last 1000
        assert len(alert_manager.alert_history) == 1000

    @pytest.mark.asyncio
    async def test_monitoring_system_double_start(self, monitoring_system):
        """Test starting monitoring system twice doesn't cause issues."""
        await monitoring_system.start_background_tasks()
        await monitoring_system.start_background_tasks()  # Second start

        assert monitoring_system.monitoring_active is True

        # Cleanup
        await monitoring_system.stop_background_tasks()

    @pytest.mark.asyncio
    async def test_monitoring_system_stop_without_start(self, monitoring_system):
        """Test stopping monitoring system without starting."""
        # Should not raise exception
        await monitoring_system.stop_background_tasks()

        assert monitoring_system.monitoring_active is False
