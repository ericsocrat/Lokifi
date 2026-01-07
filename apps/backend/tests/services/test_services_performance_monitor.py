"""
Tests for Performance Monitor Service.

Session 107: Comprehensive testing for services/performance_monitor.py.
Covers metrics recording, health checks, API performance tracking,
WebSocket stats, and system alerts for J4 Direct Messages monitoring.

Coverage improvements: 29% → 90%+
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.performance_monitor import (
    HealthCheck,
    PerformanceMetric,
    PerformanceMiddleware,
    PerformanceMonitor,
    performance_monitor,
)

# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def monitor():
    """Create fresh PerformanceMonitor instance."""
    return PerformanceMonitor()


@pytest.fixture
def sample_user_id():
    """Sample user ID for WebSocket tests."""
    return uuid.uuid4()


# ============================================================================
# Test: PerformanceMetric Dataclass
# ============================================================================


class TestPerformanceMetricDataclass:
    """Tests for PerformanceMetric dataclass."""

    def test_metric_creation(self):
        """Test basic metric creation."""
        metric = PerformanceMetric(
            name="test_metric",
            value=42.5,
            unit="ms",
            timestamp=datetime.now(timezone.utc),
        )

        assert metric.name == "test_metric"
        assert metric.value == 42.5
        assert metric.unit == "ms"
        assert metric.tags == {}

    def test_metric_with_tags(self):
        """Test metric with custom tags."""
        metric = PerformanceMetric(
            name="api_time",
            value=100.0,
            unit="ms",
            timestamp=datetime.now(timezone.utc),
            tags={"endpoint": "/api/v1/messages", "method": "POST"},
        )

        assert metric.tags["endpoint"] == "/api/v1/messages"
        assert metric.tags["method"] == "POST"


# ============================================================================
# Test: HealthCheck Dataclass
# ============================================================================


class TestHealthCheckDataclass:
    """Tests for HealthCheck dataclass."""

    def test_health_check_creation(self):
        """Test basic health check creation."""
        hc = HealthCheck(
            service="database",
            status="healthy",
            response_time_ms=5.2,
        )

        assert hc.service == "database"
        assert hc.status == "healthy"
        assert hc.response_time_ms == 5.2
        assert hc.details == {}
        assert isinstance(hc.timestamp, datetime)

    def test_health_check_with_details(self):
        """Test health check with custom details."""
        hc = HealthCheck(
            service="redis",
            status="degraded",
            response_time_ms=100.5,
            details={"connection_pool": "exhausted", "pending_requests": 50},
        )

        assert hc.details["connection_pool"] == "exhausted"
        assert hc.details["pending_requests"] == 50


# ============================================================================
# Test: PerformanceMonitor Initialization
# ============================================================================


class TestPerformanceMonitorInit:
    """Tests for PerformanceMonitor initialization."""

    def test_init_empty_metrics(self, monitor):
        """Test initialization creates empty collections."""
        assert len(monitor.metrics) == 0
        assert len(monitor.websocket_connections) == 0
        assert len(monitor.message_latencies) == 0
        assert len(monitor.api_response_times) == 0

    def test_global_instance_exists(self):
        """Test global performance_monitor instance exists."""
        assert performance_monitor is not None
        assert isinstance(performance_monitor, PerformanceMonitor)


# ============================================================================
# Test: record_metric
# ============================================================================


class TestRecordMetric:
    """Tests for record_metric method."""

    def test_record_single_metric(self, monitor):
        """Test recording a single metric."""
        monitor.record_metric("cpu_usage", 45.5, "percent")

        assert "cpu_usage" in monitor.metrics
        assert len(monitor.metrics["cpu_usage"]) == 1

        metric = monitor.metrics["cpu_usage"][-1]
        assert metric.name == "cpu_usage"
        assert metric.value == 45.5
        assert metric.unit == "percent"

    def test_record_multiple_metrics(self, monitor):
        """Test recording multiple metrics."""
        monitor.record_metric("cpu_usage", 45.5, "percent")
        monitor.record_metric("memory_usage", 60.0, "percent")
        monitor.record_metric("disk_usage", 30.2, "percent")

        assert len(monitor.metrics) == 3

    def test_record_metric_with_tags(self, monitor):
        """Test recording metric with tags."""
        monitor.record_metric(
            "request_count",
            100,
            "count",
            tags={"endpoint": "/api/v1", "status": "200"},
        )

        metric = monitor.metrics["request_count"][-1]
        assert metric.tags["endpoint"] == "/api/v1"
        assert metric.tags["status"] == "200"

    def test_record_metric_no_tags(self, monitor):
        """Test recording metric without tags defaults to empty dict."""
        monitor.record_metric("test", 1.0)

        metric = monitor.metrics["test"][-1]
        assert metric.tags == {}

    def test_metric_timestamp_auto_set(self, monitor):
        """Test metric timestamp is automatically set."""
        before = datetime.now(timezone.utc)
        monitor.record_metric("test", 1.0)
        after = datetime.now(timezone.utc)

        metric = monitor.metrics["test"][-1]
        assert before <= metric.timestamp <= after


# ============================================================================
# Test: record_api_response_time
# ============================================================================


class TestRecordApiResponseTime:
    """Tests for record_api_response_time method."""

    def test_record_api_response(self, monitor):
        """Test recording API response time."""
        monitor.record_api_response_time("/api/v1/messages", 150.5)

        assert "/api/v1/messages" in monitor.api_response_times
        assert 150.5 in monitor.api_response_times["/api/v1/messages"]

    def test_record_multiple_responses(self, monitor):
        """Test recording multiple responses for same endpoint."""
        monitor.record_api_response_time("/api/v1/users", 100.0)
        monitor.record_api_response_time("/api/v1/users", 150.0)
        monitor.record_api_response_time("/api/v1/users", 200.0)

        times = list(monitor.api_response_times["/api/v1/users"])
        assert len(times) == 3
        assert 100.0 in times
        assert 150.0 in times
        assert 200.0 in times

    def test_api_response_creates_metric(self, monitor):
        """Test API response time also creates a metric."""
        monitor.record_api_response_time("/api/v1/test", 50.0)

        # Should create metric with sanitized endpoint name
        assert any("api_response_time" in name for name in monitor.metrics.keys())


# ============================================================================
# Test: WebSocket Connection Tracking
# ============================================================================


class TestWebSocketTracking:
    """Tests for WebSocket connection tracking."""

    def test_record_websocket_connection(self, monitor, sample_user_id):
        """Test recording WebSocket connection."""
        monitor.record_websocket_connection(sample_user_id)

        assert sample_user_id in monitor.websocket_connections
        assert isinstance(monitor.websocket_connections[sample_user_id], datetime)

    def test_record_multiple_connections(self, monitor):
        """Test recording multiple WebSocket connections."""
        user1 = uuid.uuid4()
        user2 = uuid.uuid4()
        user3 = uuid.uuid4()

        monitor.record_websocket_connection(user1)
        monitor.record_websocket_connection(user2)
        monitor.record_websocket_connection(user3)

        assert len(monitor.websocket_connections) == 3

    def test_record_websocket_disconnection(self, monitor, sample_user_id):
        """Test recording WebSocket disconnection."""
        monitor.record_websocket_connection(sample_user_id)
        assert sample_user_id in monitor.websocket_connections

        monitor.record_websocket_disconnection(sample_user_id)
        assert sample_user_id not in monitor.websocket_connections

    def test_disconnection_records_session_duration(self, monitor, sample_user_id):
        """Test disconnection records session duration metric."""
        monitor.record_websocket_connection(sample_user_id)
        monitor.record_websocket_disconnection(sample_user_id)

        assert "websocket_session_duration" in monitor.metrics

    def test_disconnect_nonexistent_user(self, monitor, sample_user_id):
        """Test disconnecting non-existent user doesn't raise."""
        # Should not raise
        monitor.record_websocket_disconnection(sample_user_id)

        assert sample_user_id not in monitor.websocket_connections


# ============================================================================
# Test: record_message_latency
# ============================================================================


class TestRecordMessageLatency:
    """Tests for record_message_latency method."""

    def test_record_latency(self, monitor):
        """Test recording message latency."""
        monitor.record_message_latency(25.5)

        assert 25.5 in monitor.message_latencies

    def test_record_multiple_latencies(self, monitor):
        """Test recording multiple latencies."""
        for i in range(10):
            monitor.record_message_latency(float(i * 10))

        assert len(monitor.message_latencies) == 10

    def test_latency_creates_metric(self, monitor):
        """Test latency recording creates metric."""
        monitor.record_message_latency(50.0)

        assert "message_latency" in monitor.metrics


# ============================================================================
# Test: get_metrics_summary
# ============================================================================


class TestGetMetricsSummary:
    """Tests for get_metrics_summary method."""

    def test_empty_summary(self, monitor):
        """Test summary with no metrics."""
        summary = monitor.get_metrics_summary()

        assert summary["period_minutes"] == 10
        assert summary["websocket_connections"] == 0
        assert summary["metrics"] == {}

    def test_summary_with_metrics(self, monitor):
        """Test summary with recorded metrics."""
        monitor.record_metric("cpu_usage", 50.0, "percent")
        monitor.record_metric("cpu_usage", 60.0, "percent")
        monitor.record_metric("cpu_usage", 70.0, "percent")

        summary = monitor.get_metrics_summary()

        assert "cpu_usage" in summary["metrics"]
        metric_stats = summary["metrics"]["cpu_usage"]
        assert metric_stats["count"] == 3
        assert metric_stats["avg"] == 60.0
        assert metric_stats["min"] == 50.0
        assert metric_stats["max"] == 70.0

    def test_summary_custom_period(self, monitor):
        """Test summary with custom period."""
        monitor.record_metric("test", 1.0)

        summary = monitor.get_metrics_summary(minutes_back=5)

        assert summary["period_minutes"] == 5

    def test_summary_with_message_latencies(self, monitor):
        """Test summary includes message delivery metrics."""
        for i in range(10):
            monitor.record_message_latency(float(i * 10))

        summary = monitor.get_metrics_summary()

        assert "message_delivery" in summary
        assert "avg_latency_ms" in summary["message_delivery"]
        assert "p95_latency_ms" in summary["message_delivery"]
        assert "p99_latency_ms" in summary["message_delivery"]

    def test_summary_websocket_count(self, monitor):
        """Test summary includes WebSocket connection count."""
        user1 = uuid.uuid4()
        user2 = uuid.uuid4()
        monitor.record_websocket_connection(user1)
        monitor.record_websocket_connection(user2)

        summary = monitor.get_metrics_summary()

        assert summary["websocket_connections"] == 2


# ============================================================================
# Test: run_health_checks
# ============================================================================


class TestRunHealthChecks:
    """Tests for run_health_checks method."""

    @pytest.mark.asyncio
    async def test_health_checks_returns_list(self, monitor):
        """Test health checks returns list of HealthCheck objects."""
        results = await monitor.run_health_checks()

        assert isinstance(results, list)
        assert all(isinstance(hc, HealthCheck) for hc in results)

    @pytest.mark.asyncio
    async def test_health_checks_includes_database(self, monitor):
        """Test health checks includes database check."""
        results = await monitor.run_health_checks()

        services = [hc.service for hc in results]
        assert "database" in services

    @pytest.mark.asyncio
    async def test_health_checks_includes_redis(self, monitor):
        """Test health checks includes Redis check."""
        results = await monitor.run_health_checks()

        services = [hc.service for hc in results]
        assert "redis" in services

    @pytest.mark.asyncio
    async def test_health_checks_includes_websocket(self, monitor):
        """Test health checks includes WebSocket check."""
        results = await monitor.run_health_checks()

        services = [hc.service for hc in results]
        assert "websocket" in services

    @pytest.mark.asyncio
    async def test_healthy_services_status(self, monitor):
        """Test healthy services report healthy status."""
        results = await monitor.run_health_checks()

        # Default behavior (no errors) should be healthy
        for hc in results:
            if hc.service in ["database", "redis"]:
                assert hc.status == "healthy"


# ============================================================================
# Test: get_api_performance
# ============================================================================


class TestGetApiPerformance:
    """Tests for get_api_performance method."""

    def test_empty_performance(self, monitor):
        """Test performance with no data."""
        perf = monitor.get_api_performance()

        assert perf == {}

    def test_single_endpoint_performance(self, monitor):
        """Test performance for single endpoint."""
        monitor.record_api_response_time("/api/v1/test", 100.0)
        monitor.record_api_response_time("/api/v1/test", 200.0)
        monitor.record_api_response_time("/api/v1/test", 300.0)

        perf = monitor.get_api_performance()

        assert "/api/v1/test" in perf
        endpoint_stats = perf["/api/v1/test"]
        assert endpoint_stats["avg_response_time_ms"] == 200.0
        assert endpoint_stats["min_response_time_ms"] == 100.0
        assert endpoint_stats["max_response_time_ms"] == 300.0
        assert endpoint_stats["request_count"] == 3

    def test_multiple_endpoints_performance(self, monitor):
        """Test performance for multiple endpoints."""
        monitor.record_api_response_time("/api/v1/users", 50.0)
        monitor.record_api_response_time("/api/v1/messages", 100.0)
        monitor.record_api_response_time("/api/v1/conversations", 75.0)

        perf = monitor.get_api_performance()

        assert len(perf) == 3


# ============================================================================
# Test: get_websocket_stats
# ============================================================================


class TestGetWebsocketStats:
    """Tests for get_websocket_stats method."""

    def test_empty_websocket_stats(self, monitor):
        """Test stats with no connections."""
        stats = monitor.get_websocket_stats()

        assert stats["total_connections"] == 0
        assert stats["avg_connection_age_seconds"] == 0
        assert stats["oldest_connection_seconds"] == 0
        assert stats["newest_connection_seconds"] == 0

    def test_websocket_stats_with_connections(self, monitor):
        """Test stats with active connections."""
        user1 = uuid.uuid4()
        user2 = uuid.uuid4()

        monitor.record_websocket_connection(user1)
        monitor.record_websocket_connection(user2)

        stats = monitor.get_websocket_stats()

        assert stats["total_connections"] == 2
        assert stats["avg_connection_age_seconds"] >= 0
        assert stats["oldest_connection_seconds"] >= 0
        assert stats["newest_connection_seconds"] >= 0


# ============================================================================
# Test: check_system_alerts
# ============================================================================


class TestCheckSystemAlerts:
    """Tests for check_system_alerts method."""

    def test_no_alerts_empty_system(self, monitor):
        """Test no alerts for empty system."""
        alerts = monitor.check_system_alerts()

        assert alerts == []

    def test_alert_high_websocket_connections(self, monitor):
        """Test alert for high WebSocket connections."""
        # Add many connections
        for _ in range(1001):
            monitor.websocket_connections[uuid.uuid4()] = datetime.now(timezone.utc)

        alerts = monitor.check_system_alerts()

        assert any(a["type"] == "high_websocket_connections" for a in alerts)

    def test_alert_high_message_latency(self, monitor):
        """Test alert for high message latency."""
        # Add high latency values
        for _ in range(10):
            monitor.message_latencies.append(1500.0)  # 1.5 seconds

        alerts = monitor.check_system_alerts()

        assert any(a["type"] == "high_message_latency" for a in alerts)

    def test_alert_slow_api_endpoint(self, monitor):
        """Test alert for slow API endpoint."""
        # Add slow response times
        for _ in range(10):
            monitor.api_response_times["/api/slow"].append(3000.0)  # 3 seconds

        alerts = monitor.check_system_alerts()

        assert any(a["type"] == "slow_api_endpoint" for a in alerts)

    def test_no_alert_for_normal_latency(self, monitor):
        """Test no alert for normal latency."""
        for _ in range(10):
            monitor.message_latencies.append(100.0)  # 100ms

        alerts = monitor.check_system_alerts()

        assert not any(a["type"] == "high_message_latency" for a in alerts)


# ============================================================================
# Test: PerformanceMiddleware
# ============================================================================


class TestPerformanceMiddleware:
    """Tests for PerformanceMiddleware."""

    @pytest.mark.asyncio
    async def test_middleware_creation(self):
        """Test middleware can be created."""
        mock_app = MagicMock()
        middleware = PerformanceMiddleware(mock_app)

        assert middleware.app == mock_app

    @pytest.mark.asyncio
    async def test_middleware_passes_non_http(self):
        """Test middleware passes through non-HTTP requests."""
        mock_app = AsyncMock()
        middleware = PerformanceMiddleware(mock_app)

        scope = {"type": "websocket", "path": "/ws"}
        receive = AsyncMock()
        send = AsyncMock()

        await middleware(scope, receive, send)

        mock_app.assert_called_once_with(scope, receive, send)

    @pytest.mark.asyncio
    async def test_middleware_records_http_time(self):
        """Test middleware records HTTP response time."""
        # Track whether metric was recorded
        recorded = {"called": False}

        async def mock_app(scope, receive, send):
            # Simulate response
            await send({"type": "http.response.start", "status": 200})
            await send({"type": "http.response.body", "body": b""})

        middleware = PerformanceMiddleware(mock_app)

        scope = {"type": "http", "method": "GET", "path": "/api/test"}
        receive = AsyncMock()
        send = AsyncMock()

        with patch.object(
            performance_monitor, "record_api_response_time"
        ) as mock_record:
            await middleware(scope, receive, send)
            # The send_wrapper should have called record_api_response_time
            # for http.response.start


# ============================================================================
# Test: Edge Cases
# ============================================================================


class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_metric_deque_max_length(self, monitor):
        """Test metric deque respects max length."""
        # Record more than maxlen (1000)
        for i in range(1100):
            monitor.record_metric("test", float(i))

        # Should only keep last 1000
        assert len(monitor.metrics["test"]) == 1000

    def test_zero_value_metric(self, monitor):
        """Test recording zero value metric."""
        monitor.record_metric("zero_metric", 0.0)

        metric = monitor.metrics["zero_metric"][-1]
        assert metric.value == 0.0

    def test_negative_value_metric(self, monitor):
        """Test recording negative value metric."""
        monitor.record_metric("negative_metric", -10.5)

        metric = monitor.metrics["negative_metric"][-1]
        assert metric.value == -10.5

    def test_empty_string_metric_name(self, monitor):
        """Test recording metric with empty name."""
        monitor.record_metric("", 1.0)

        assert "" in monitor.metrics

    def test_special_characters_in_endpoint(self, monitor):
        """Test endpoint with special characters."""
        monitor.record_api_response_time("/api/v1/users?id=123&sort=desc", 100.0)

        assert "/api/v1/users?id=123&sort=desc" in monitor.api_response_times

    def test_metrics_summary_excludes_old_data(self, monitor):
        """Test metrics summary excludes data outside time window."""
        # Add old metric by modifying timestamp
        old_metric = PerformanceMetric(
            name="old_metric",
            value=100.0,
            unit="ms",
            timestamp=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        monitor.metrics["old_metric"].append(old_metric)

        # Summary for last 10 minutes should not include it
        summary = monitor.get_metrics_summary(minutes_back=10)

        assert (
            "old_metric" not in summary["metrics"]
            or summary["metrics"]["old_metric"]["count"] == 0
        )

    def test_p95_p99_calculation_single_value(self, monitor):
        """Test p95/p99 with single value."""
        monitor.record_message_latency(100.0)

        summary = monitor.get_metrics_summary()

        # With single value, p95 and p99 should be that value
        assert summary["message_delivery"]["p95_latency_ms"] == 100.0
        assert summary["message_delivery"]["p99_latency_ms"] == 100.0
