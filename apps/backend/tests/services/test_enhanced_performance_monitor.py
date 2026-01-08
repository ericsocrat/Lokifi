"""
Tests for app.services.enhanced_performance_monitor

Comprehensive tests for the enhanced performance monitoring system.
"""

import time
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.services.enhanced_performance_monitor import (
    EnhancedPerformanceMonitor,
    PerformanceMetrics,
    enhanced_performance_monitor,
    get_current_metrics,
    get_system_health_score,
    track_request_end,
    track_request_start,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def fresh_monitor():
    """Create a fresh EnhancedPerformanceMonitor instance."""
    return EnhancedPerformanceMonitor()


@pytest.fixture
def monitor_with_data():
    """Create a monitor with some sample data."""
    monitor = EnhancedPerformanceMonitor()

    # Add some request data
    for i in range(10):
        start = monitor.track_request_start("/api/test")
        time.sleep(0.001)  # Small delay
        monitor.track_request_end("/api/test", start, success=i % 10 != 9)

    # Add some cache operations
    for _ in range(7):
        monitor.track_cache_operation(hit=True)
    for _ in range(3):
        monitor.track_cache_operation(hit=False)

    # Add database queries
    for i in range(5):
        monitor.track_database_query(float(i * 10))

    # Add websocket events
    monitor.track_websocket_connection(connected=True)
    monitor.track_websocket_connection(connected=True)
    monitor.track_websocket_message(sent=True)
    monitor.track_websocket_message(sent=False)

    return monitor


# ============================================================================
# PERFORMANCE METRICS TESTS
# ============================================================================


class TestPerformanceMetrics:
    """Tests for PerformanceMetrics dataclass."""

    def test_default_values(self):
        """Test default metric values."""
        metrics = PerformanceMetrics()
        assert metrics.average_response_time == 0.0
        assert metrics.min_response_time == 0.0
        assert metrics.max_response_time == 0.0
        assert metrics.p95_response_time == 0.0

    def test_system_defaults(self):
        """Test default system metric values."""
        metrics = PerformanceMetrics()
        assert metrics.system_uptime == 100.0
        assert metrics.memory_usage_mb == 0.0
        assert metrics.cpu_usage_percent == 0.0

    def test_error_tracking_defaults(self):
        """Test default error tracking values."""
        metrics = PerformanceMetrics()
        assert metrics.error_count == 0
        assert metrics.total_requests == 0
        assert metrics.error_rate == 0.0

    def test_throughput_defaults(self):
        """Test default throughput values."""
        metrics = PerformanceMetrics()
        assert metrics.requests_per_second == 0.0
        assert metrics.successful_deliveries == 0
        assert metrics.failed_deliveries == 0

    def test_database_defaults(self):
        """Test default database metric values."""
        metrics = PerformanceMetrics()
        assert metrics.database_query_time_ms == 0.0
        assert metrics.database_connections == 0

    def test_websocket_defaults(self):
        """Test default WebSocket metric values."""
        metrics = PerformanceMetrics()
        assert metrics.websocket_connections == 0
        assert metrics.websocket_messages_sent == 0
        assert metrics.websocket_messages_received == 0

    def test_cache_defaults(self):
        """Test default cache metric values."""
        metrics = PerformanceMetrics()
        assert metrics.cache_hit_rate == 0.0
        assert metrics.cache_miss_rate == 0.0

    def test_availability_default(self):
        """Test default availability value."""
        metrics = PerformanceMetrics()
        assert metrics.availability_percent == 100.0

    def test_last_updated_is_datetime(self):
        """Test last_updated is a datetime."""
        metrics = PerformanceMetrics()
        assert isinstance(metrics.last_updated, datetime)

    def test_custom_values(self):
        """Test metrics with custom values."""
        metrics = PerformanceMetrics(
            average_response_time=50.5,
            error_count=5,
            total_requests=100,
            cache_hit_rate=75.0,
        )
        assert metrics.average_response_time == 50.5
        assert metrics.error_count == 5
        assert metrics.total_requests == 100
        assert metrics.cache_hit_rate == 75.0


# ============================================================================
# ENHANCED PERFORMANCE MONITOR TESTS
# ============================================================================


class TestEnhancedPerformanceMonitorInit:
    """Tests for EnhancedPerformanceMonitor initialization."""

    def test_initialization(self, fresh_monitor):
        """Test monitor initializes correctly."""
        assert fresh_monitor.error_count == 0
        assert fresh_monitor.total_requests == 0
        assert fresh_monitor.websocket_connections == 0

    def test_response_times_deque(self, fresh_monitor):
        """Test response times deque is initialized."""
        assert len(fresh_monitor.response_times) == 0
        assert fresh_monitor.response_times.maxlen == 1000

    def test_system_metrics_history(self, fresh_monitor):
        """Test system metrics history deque."""
        assert len(fresh_monitor.system_metrics_history) == 0
        assert fresh_monitor.system_metrics_history.maxlen == 100

    def test_start_time_set(self, fresh_monitor):
        """Test start time is set."""
        assert fresh_monitor.start_time > 0
        assert fresh_monitor.start_time <= time.time()


class TestRequestTracking:
    """Tests for request tracking methods."""

    def test_track_request_start_returns_time(self, fresh_monitor):
        """Test track_request_start returns a time value."""
        start = fresh_monitor.track_request_start("/api/test")
        assert isinstance(start, float)
        assert start > 0

    def test_track_request_end_success(self, fresh_monitor):
        """Test tracking a successful request."""
        start = fresh_monitor.track_request_start("/api/test")
        fresh_monitor.track_request_end("/api/test", start, success=True)

        assert fresh_monitor.total_requests == 1
        assert fresh_monitor.error_count == 0
        assert len(fresh_monitor.response_times) == 1

    def test_track_request_end_failure(self, fresh_monitor):
        """Test tracking a failed request."""
        start = fresh_monitor.track_request_start("/api/test")
        fresh_monitor.track_request_end("/api/test", start, success=False)

        assert fresh_monitor.total_requests == 1
        assert fresh_monitor.error_count == 1

    def test_multiple_requests(self, fresh_monitor):
        """Test tracking multiple requests."""
        for i in range(5):
            start = fresh_monitor.track_request_start(f"/api/test/{i}")
            fresh_monitor.track_request_end(f"/api/test/{i}", start, success=True)

        assert fresh_monitor.total_requests == 5
        assert len(fresh_monitor.response_times) == 5

    def test_endpoint_metrics_tracking(self, fresh_monitor):
        """Test endpoint-specific metrics are tracked."""
        start = fresh_monitor.track_request_start("/api/users")
        fresh_monitor.track_request_end("/api/users", start, success=True)

        start = fresh_monitor.track_request_start("/api/posts")
        fresh_monitor.track_request_end("/api/posts", start, success=True)

        assert "/api/users" in fresh_monitor.endpoint_metrics
        assert "/api/posts" in fresh_monitor.endpoint_metrics


class TestDatabaseTracking:
    """Tests for database tracking methods."""

    def test_track_database_query(self, fresh_monitor):
        """Test tracking database query duration."""
        fresh_monitor.track_database_query(25.5)
        assert len(fresh_monitor.database_queries) == 1
        assert fresh_monitor.database_queries[0] == 25.5

    def test_multiple_database_queries(self, fresh_monitor):
        """Test tracking multiple database queries."""
        for i in range(5):
            fresh_monitor.track_database_query(float(i * 10))

        assert len(fresh_monitor.database_queries) == 5


class TestWebSocketTracking:
    """Tests for WebSocket tracking methods."""

    def test_track_websocket_connection_connect(self, fresh_monitor):
        """Test tracking WebSocket connection."""
        fresh_monitor.track_websocket_connection(connected=True)
        assert fresh_monitor.websocket_connections == 1

    def test_track_websocket_connection_disconnect(self, fresh_monitor):
        """Test tracking WebSocket disconnection."""
        fresh_monitor.track_websocket_connection(connected=True)
        fresh_monitor.track_websocket_connection(connected=True)
        fresh_monitor.track_websocket_connection(connected=False)
        assert fresh_monitor.websocket_connections == 1

    def test_websocket_connection_cannot_go_negative(self, fresh_monitor):
        """Test WebSocket connections don't go below zero."""
        fresh_monitor.track_websocket_connection(connected=False)
        assert fresh_monitor.websocket_connections == 0

    def test_track_websocket_message_sent(self, fresh_monitor):
        """Test tracking sent WebSocket message."""
        fresh_monitor.track_websocket_message(sent=True)
        assert fresh_monitor.websocket_messages["sent"] == 1

    def test_track_websocket_message_received(self, fresh_monitor):
        """Test tracking received WebSocket message."""
        fresh_monitor.track_websocket_message(sent=False)
        assert fresh_monitor.websocket_messages["received"] == 1


class TestCacheTracking:
    """Tests for cache tracking methods."""

    def test_track_cache_hit(self, fresh_monitor):
        """Test tracking cache hit."""
        fresh_monitor.track_cache_operation(hit=True)
        assert fresh_monitor.cache_hits == 1
        assert fresh_monitor.cache_misses == 0

    def test_track_cache_miss(self, fresh_monitor):
        """Test tracking cache miss."""
        fresh_monitor.track_cache_operation(hit=False)
        assert fresh_monitor.cache_hits == 0
        assert fresh_monitor.cache_misses == 1

    def test_multiple_cache_operations(self, fresh_monitor):
        """Test multiple cache operations."""
        for _ in range(7):
            fresh_monitor.track_cache_operation(hit=True)
        for _ in range(3):
            fresh_monitor.track_cache_operation(hit=False)

        assert fresh_monitor.cache_hits == 7
        assert fresh_monitor.cache_misses == 3


class TestGetCurrentMetrics:
    """Tests for get_current_metrics method."""

    def test_get_metrics_empty(self, fresh_monitor):
        """Test getting metrics when no data collected."""
        with patch("psutil.virtual_memory") as mock_mem, patch(
            "psutil.cpu_percent"
        ) as mock_cpu:
            mock_mem.return_value = MagicMock(used=512 * 1024 * 1024)
            mock_cpu.return_value = 25.0

            metrics = fresh_monitor.get_current_metrics()

            assert isinstance(metrics, PerformanceMetrics)
            assert metrics.average_response_time == 0.0
            assert metrics.total_requests == 0

    def test_get_metrics_with_data(self, monitor_with_data):
        """Test getting metrics with collected data."""
        with patch("psutil.virtual_memory") as mock_mem, patch(
            "psutil.cpu_percent"
        ) as mock_cpu:
            mock_mem.return_value = MagicMock(used=512 * 1024 * 1024)
            mock_cpu.return_value = 25.0

            metrics = monitor_with_data.get_current_metrics()

            assert isinstance(metrics, PerformanceMetrics)
            assert metrics.total_requests == 10
            assert metrics.average_response_time > 0

    def test_get_metrics_cache_rates(self, monitor_with_data):
        """Test cache hit/miss rates calculation."""
        with patch("psutil.virtual_memory") as mock_mem, patch(
            "psutil.cpu_percent"
        ) as mock_cpu:
            mock_mem.return_value = MagicMock(used=512 * 1024 * 1024)
            mock_cpu.return_value = 25.0

            metrics = monitor_with_data.get_current_metrics()

            assert metrics.cache_hit_rate == 70.0
            assert metrics.cache_miss_rate == 30.0

    def test_get_metrics_error_handling(self, fresh_monitor):
        """Test metrics collection handles errors gracefully."""
        with patch("psutil.virtual_memory") as mock_mem:
            mock_mem.side_effect = Exception("System error")

            metrics = fresh_monitor.get_current_metrics()

            # Should return default metrics on error
            assert isinstance(metrics, PerformanceMetrics)


class TestGetEndpointMetrics:
    """Tests for get_endpoint_metrics method."""

    def test_endpoint_metrics_existing(self, monitor_with_data):
        """Test getting metrics for existing endpoint."""
        metrics = monitor_with_data.get_endpoint_metrics("/api/test")

        assert "avg" in metrics
        assert "min" in metrics
        assert "max" in metrics
        assert "count" in metrics
        assert metrics["count"] == 10

    def test_endpoint_metrics_nonexistent(self, fresh_monitor):
        """Test getting metrics for nonexistent endpoint."""
        metrics = fresh_monitor.get_endpoint_metrics("/api/unknown")

        assert metrics["avg"] == 0
        assert metrics["min"] == 0
        assert metrics["max"] == 0
        assert metrics["count"] == 0


class TestGetSystemHealthScore:
    """Tests for get_system_health_score method."""

    def test_health_score_good_system(self, fresh_monitor):
        """Test health score for healthy system."""
        with patch("psutil.virtual_memory") as mock_mem, patch(
            "psutil.cpu_percent"
        ) as mock_cpu:
            mock_mem.return_value = MagicMock(used=256 * 1024 * 1024)  # Low memory
            mock_cpu.return_value = 10.0  # Low CPU

            score = fresh_monitor.get_system_health_score()

            assert isinstance(score, float)
            assert 0 <= score <= 100

    def test_health_score_handles_error(self, fresh_monitor):
        """Test health score handles errors."""
        with patch.object(
            fresh_monitor, "get_current_metrics", side_effect=Exception("Error")
        ):
            score = fresh_monitor.get_system_health_score()
            assert score == 0.0

    def test_health_score_response_time_scoring(self, fresh_monitor):
        """Test health score response time component."""
        # Add some fast responses
        for _ in range(10):
            start = fresh_monitor.track_request_start("/api/test")
            # Immediate end = fast response
            fresh_monitor.track_request_end("/api/test", start, success=True)

        with patch("psutil.virtual_memory") as mock_mem, patch(
            "psutil.cpu_percent"
        ) as mock_cpu:
            mock_mem.return_value = MagicMock(used=256 * 1024 * 1024)
            mock_cpu.return_value = 10.0

            score = fresh_monitor.get_system_health_score()
            assert score > 50  # Should be relatively good


class TestStartMonitoring:
    """Tests for start_monitoring async method."""

    @pytest.mark.asyncio
    async def test_monitoring_adds_metrics(self, fresh_monitor):
        """Test that monitoring collects metrics."""
        import asyncio

        with patch("psutil.virtual_memory") as mock_mem, patch(
            "psutil.cpu_percent"
        ) as mock_cpu:
            mock_mem.return_value = MagicMock(used=512 * 1024 * 1024)
            mock_cpu.return_value = 25.0

            # Create task and let it run briefly
            task = asyncio.create_task(fresh_monitor.start_monitoring())

            # Wait a tiny bit then cancel
            await asyncio.sleep(0.01)
            task.cancel()

            try:
                await task
            except asyncio.CancelledError:
                pass

            # Task should have started (metrics history might have data)
            assert fresh_monitor.system_metrics_history is not None


# ============================================================================
# GLOBAL INSTANCE TESTS
# ============================================================================


class TestGlobalInstance:
    """Tests for global instance and convenience functions."""

    def test_global_instance_exists(self):
        """Test global monitor instance exists."""
        assert enhanced_performance_monitor is not None
        assert isinstance(enhanced_performance_monitor, EnhancedPerformanceMonitor)

    def test_track_request_start_function(self):
        """Test convenience function track_request_start."""
        start = track_request_start("/api/test")
        assert isinstance(start, float)
        assert start > 0

    def test_track_request_end_function(self):
        """Test convenience function track_request_end."""
        start = track_request_start("/api/conv-test")
        track_request_end("/api/conv-test", start, success=True)
        # Should not raise

    def test_get_current_metrics_function(self):
        """Test convenience function get_current_metrics."""
        with patch("psutil.virtual_memory") as mock_mem, patch(
            "psutil.cpu_percent"
        ) as mock_cpu:
            mock_mem.return_value = MagicMock(used=512 * 1024 * 1024)
            mock_cpu.return_value = 25.0

            metrics = get_current_metrics()
            assert isinstance(metrics, PerformanceMetrics)

    def test_get_system_health_score_function(self):
        """Test convenience function get_system_health_score."""
        with patch("psutil.virtual_memory") as mock_mem, patch(
            "psutil.cpu_percent"
        ) as mock_cpu:
            mock_mem.return_value = MagicMock(used=256 * 1024 * 1024)
            mock_cpu.return_value = 10.0

            score = get_system_health_score()
            assert isinstance(score, float)
            assert 0 <= score <= 100


# ============================================================================
# EDGE CASES
# ============================================================================


class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_response_times_maxlen(self, fresh_monitor):
        """Test response times deque respects maxlen."""
        # Add more than maxlen items
        for i in range(1100):
            fresh_monitor.response_times.append(float(i))

        assert len(fresh_monitor.response_times) == 1000

    def test_metrics_with_only_errors(self, fresh_monitor):
        """Test metrics when all requests fail."""
        for _ in range(5):
            start = fresh_monitor.track_request_start("/api/test")
            fresh_monitor.track_request_end("/api/test", start, success=False)

        with patch("psutil.virtual_memory") as mock_mem, patch(
            "psutil.cpu_percent"
        ) as mock_cpu:
            mock_mem.return_value = MagicMock(used=512 * 1024 * 1024)
            mock_cpu.return_value = 25.0

            metrics = fresh_monitor.get_current_metrics()

            assert metrics.error_count == 5
            assert metrics.total_requests == 5
            assert metrics.error_rate == 100.0

    def test_zero_cache_operations(self, fresh_monitor):
        """Test cache rates with zero operations."""
        with patch("psutil.virtual_memory") as mock_mem, patch(
            "psutil.cpu_percent"
        ) as mock_cpu:
            mock_mem.return_value = MagicMock(used=512 * 1024 * 1024)
            mock_cpu.return_value = 25.0

            metrics = fresh_monitor.get_current_metrics()

            assert metrics.cache_hit_rate == 0.0
            assert metrics.cache_miss_rate == 0.0

    def test_p95_calculation_single_request(self, fresh_monitor):
        """Test p95 with single request."""
        start = fresh_monitor.track_request_start("/api/test")
        time.sleep(0.001)
        fresh_monitor.track_request_end("/api/test", start, success=True)

        with patch("psutil.virtual_memory") as mock_mem, patch(
            "psutil.cpu_percent"
        ) as mock_cpu:
            mock_mem.return_value = MagicMock(used=512 * 1024 * 1024)
            mock_cpu.return_value = 25.0

            metrics = fresh_monitor.get_current_metrics()

            assert metrics.p95_response_time > 0
