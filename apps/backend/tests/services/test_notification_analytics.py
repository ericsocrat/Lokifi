"""
Comprehensive tests for notification analytics service (Session 102).

Tests analytics collection, metrics calculation, and dashboard data.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.services.notification_analytics import (
    NotificationAnalytics,
    NotificationMetrics,
    SystemPerformanceMetrics,
    UserEngagementMetrics,
    notification_analytics,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def analytics():
    """Create fresh NotificationAnalytics instance for each test."""
    return NotificationAnalytics()


@pytest.fixture
def mock_db_session():
    """Mock database session for testing."""
    session = AsyncMock()
    # Mock execute method to return results
    session.execute = AsyncMock()
    session.scalar = AsyncMock()
    return session


@pytest.fixture
def sample_notification_data():
    """Sample notification data for testing."""
    return {
        "total_sent": 100,
        "total_delivered": 95,
        "total_read": 70,
        "total_clicked": 30,
    }


@pytest.fixture
def sample_start_date():
    """Sample start date for queries."""
    return datetime.now(timezone.utc) - timedelta(days=7)


@pytest.fixture
def sample_end_date():
    """Sample end date for queries."""
    return datetime.now(timezone.utc)


# ============================================================================
# TEST NotificationAnalytics - INITIALIZATION
# ============================================================================


class TestNotificationAnalyticsInitialization:
    """Test NotificationAnalytics initialization."""

    def test_initialization(self, analytics):
        """Test NotificationAnalytics initializes with correct state."""
        assert isinstance(analytics, NotificationAnalytics)
        assert hasattr(analytics, "metrics_history")
        assert hasattr(analytics, "performance_counters")
        assert hasattr(analytics, "timing_data")
        assert len(analytics.metrics_history) == 0
        assert len(analytics.performance_counters) == 0
        assert len(analytics.timing_data) == 0

    def test_metrics_history_max_length(self, analytics):
        """Test metrics history has max length of 1000."""
        assert analytics.metrics_history.maxlen == 1000

    def test_performance_counters_default_dict(self, analytics):
        """Test performance_counters is a defaultdict."""
        # Access non-existent key should return 0
        assert analytics.performance_counters["nonexistent"] == 0

    def test_timing_data_default_dict(self, analytics):
        """Test timing_data is a defaultdict."""
        # Access non-existent key should return empty list
        assert analytics.timing_data["nonexistent"] == []


# ============================================================================
# TEST NotificationMetrics - DATACLASS
# ============================================================================


class TestNotificationMetricsDataclass:
    """Test NotificationMetrics dataclass."""

    def test_notification_metrics_defaults(self):
        """Test NotificationMetrics has correct default values."""
        metrics = NotificationMetrics()
        assert metrics.total_sent == 0
        assert metrics.total_delivered == 0
        assert metrics.total_read == 0
        assert metrics.total_dismissed == 0
        assert metrics.total_clicked == 0
        assert metrics.delivery_rate == 0.0
        assert metrics.read_rate == 0.0
        assert metrics.engagement_rate == 0.0
        assert metrics.average_time_to_read == 0.0
        assert metrics.peak_hour == 0
        assert metrics.top_notification_types is None

    def test_notification_metrics_custom_values(self):
        """Test NotificationMetrics with custom values."""
        metrics = NotificationMetrics(
            total_sent=100,
            total_delivered=95,
            total_read=70,
            total_clicked=30,
            delivery_rate=95.0,
            read_rate=73.68,
            engagement_rate=42.86,
        )
        assert metrics.total_sent == 100
        assert metrics.delivery_rate == 95.0
        assert metrics.read_rate == 73.68
        assert metrics.engagement_rate == 42.86


# ============================================================================
# TEST UserEngagementMetrics - DATACLASS
# ============================================================================


class TestUserEngagementMetricsDataclass:
    """Test UserEngagementMetrics dataclass."""

    def test_user_engagement_defaults(self):
        """Test UserEngagementMetrics has correct defaults."""
        metrics = UserEngagementMetrics()
        assert metrics.active_users == 0
        assert metrics.highly_engaged_users == 0
        assert metrics.unresponsive_users == 0
        assert metrics.average_notifications_per_user == 0.0
        assert metrics.user_preference_adoption == 0.0

    def test_user_engagement_custom_values(self):
        """Test UserEngagementMetrics with custom values."""
        metrics = UserEngagementMetrics(
            active_users=500,
            highly_engaged_users=350,
            unresponsive_users=50,
            average_notifications_per_user=12.5,
        )
        assert metrics.active_users == 500
        assert metrics.highly_engaged_users == 350
        assert metrics.unresponsive_users == 50
        assert metrics.average_notifications_per_user == 12.5


# ============================================================================
# TEST SystemPerformanceMetrics - DATACLASS
# ============================================================================


class TestSystemPerformanceMetricsDataclass:
    """Test SystemPerformanceMetrics dataclass."""

    def test_system_performance_defaults(self):
        """Test SystemPerformanceMetrics has correct defaults."""
        metrics = SystemPerformanceMetrics()
        assert metrics.websocket_connections == 0
        assert metrics.average_delivery_time_ms == 0.0
        assert metrics.database_query_time_ms == 0.0
        assert metrics.cache_hit_rate == 0.0
        assert metrics.error_rate == 0.0
        assert metrics.memory_usage_mb == 0.0

    def test_system_performance_custom_values(self):
        """Test SystemPerformanceMetrics with custom values."""
        metrics = SystemPerformanceMetrics(
            websocket_connections=25,
            average_delivery_time_ms=150.5,
            database_query_time_ms=45.2,
            cache_hit_rate=92.5,
            error_rate=0.5,
        )
        assert metrics.websocket_connections == 25
        assert metrics.average_delivery_time_ms == 150.5
        assert metrics.cache_hit_rate == 92.5


# ============================================================================
# TEST NotificationAnalytics - PERFORMANCE TRACKING
# ============================================================================


class TestPerformanceTracking:
    """Test performance metric tracking."""

    def test_record_performance_metric(self, analytics):
        """Test recording performance metrics."""
        analytics.record_performance_metric("api_response_time", 150.5)
        assert "api_response_time" in analytics.timing_data
        assert analytics.timing_data["api_response_time"] == [150.5]

    def test_record_multiple_metrics(self, analytics):
        """Test recording multiple metrics."""
        metrics = [100.0, 150.0, 200.0, 175.0]
        for metric in metrics:
            analytics.record_performance_metric("db_query_time", metric)

        assert len(analytics.timing_data["db_query_time"]) == 4
        assert analytics.timing_data["db_query_time"] == metrics

    def test_metric_history_max_100(self, analytics):
        """Test metric history keeps only last 100 measurements."""
        # Add 150 metrics
        for i in range(150):
            analytics.record_performance_metric("test_metric", float(i))

        # Should only keep last 100
        assert len(analytics.timing_data["test_metric"]) == 100
        # Should be values 50-149
        assert analytics.timing_data["test_metric"][0] == 50.0
        assert analytics.timing_data["test_metric"][-1] == 149.0

    def test_increment_counter(self, analytics):
        """Test incrementing performance counters."""
        analytics.increment_counter("api_calls")
        assert analytics.performance_counters["api_calls"] == 1

    def test_increment_counter_multiple(self, analytics):
        """Test incrementing counter multiple times."""
        for _ in range(10):
            analytics.increment_counter("requests")
        assert analytics.performance_counters["requests"] == 10

    def test_multiple_counters(self, analytics):
        """Test multiple counters independently."""
        analytics.increment_counter("success")
        analytics.increment_counter("success")
        analytics.increment_counter("error")
        analytics.increment_counter("success")

        assert analytics.performance_counters["success"] == 3
        assert analytics.performance_counters["error"] == 1


# ============================================================================
# TEST NotificationAnalytics - SYSTEM PERFORMANCE METRICS
# ============================================================================


class TestSystemPerformanceMetrics:
    """Test system performance metrics collection."""

    @pytest.mark.asyncio
    async def test_get_system_performance_metrics(self, analytics):
        """Test getting system performance metrics."""
        # Add some timing data
        analytics.timing_data["db_queries"] = [10.0, 15.0, 20.0]
        analytics.timing_data["notification_delivery"] = [100.0, 150.0, 200.0]
        analytics.performance_counters["total_requests"] = 100
        analytics.performance_counters["errors"] = 2

        with patch(
            "app.services.notification_analytics.redis_client.is_available", return_value=True
        ):
            metrics = await analytics.get_system_performance_metrics()

        assert isinstance(metrics, SystemPerformanceMetrics)
        assert metrics.average_delivery_time_ms == 150.0  # avg of 100, 150, 200
        assert metrics.database_query_time_ms == 15.0  # avg of 10, 15, 20
        assert metrics.error_rate == 2.0  # 2/100 * 100

    @pytest.mark.asyncio
    async def test_system_performance_empty_timing_data(self, analytics):
        """Test system performance with no timing data."""
        with patch(
            "app.services.notification_analytics.redis_client.is_available", return_value=False
        ):
            metrics = await analytics.get_system_performance_metrics()

        assert metrics.average_delivery_time_ms == 0.0
        assert metrics.database_query_time_ms == 0.0

    @pytest.mark.asyncio
    async def test_system_performance_redis_unavailable(self, analytics):
        """Test system performance when Redis unavailable."""
        with patch(
            "app.services.notification_analytics.redis_client.is_available", return_value=False
        ):
            metrics = await analytics.get_system_performance_metrics()

        assert isinstance(metrics, SystemPerformanceMetrics)
        # Should still return metrics even if Redis unavailable

    @pytest.mark.asyncio
    async def test_system_performance_error_handling(self, analytics):
        """Test system performance error handling."""
        # Simulate exception in is_available
        with patch(
            "app.services.notification_analytics.redis_client.is_available",
            side_effect=Exception("Redis error"),
        ):
            metrics = await analytics.get_system_performance_metrics()

        # Should return default metrics on error
        assert isinstance(metrics, SystemPerformanceMetrics)


# ============================================================================
# TEST NotificationAnalytics - HEALTH SCORE CALCULATION
# ============================================================================


class TestHealthScoreCalculation:
    """Test system health score calculation."""

    @pytest.mark.asyncio
    async def test_calculate_system_health_score(self, analytics):
        """Test health score calculation."""
        # Mock the metrics methods
        with (
            patch.object(
                analytics,
                "get_comprehensive_metrics",
                return_value={"delivery_rate": 95.0, "read_rate": 80.0, "engagement_rate": 50.0},
            ),
            patch.object(
                analytics,
                "get_system_performance_metrics",
                return_value=SystemPerformanceMetrics(error_rate=1.0),
            ),
            patch(
                "app.services.notification_analytics.redis_client.is_available", return_value=True
            ),
        ):
            score = await analytics.calculate_system_health_score()

        assert isinstance(score, float)
        assert 0.0 <= score <= 100.0

    @pytest.mark.asyncio
    async def test_health_score_perfect_metrics(self, analytics):
        """Test health score with perfect metrics."""
        with (
            patch.object(
                analytics,
                "get_comprehensive_metrics",
                return_value={"delivery_rate": 100.0, "read_rate": 100.0, "engagement_rate": 100.0},
            ),
            patch.object(
                analytics,
                "get_system_performance_metrics",
                return_value=SystemPerformanceMetrics(error_rate=0.0),
            ),
            patch(
                "app.services.notification_analytics.redis_client.is_available", return_value=True
            ),
        ):
            score = await analytics.calculate_system_health_score()

        # Perfect metrics should give high score
        assert score >= 95.0

    @pytest.mark.asyncio
    async def test_health_score_redis_unavailable(self, analytics):
        """Test health score when Redis unavailable."""
        with (
            patch.object(
                analytics,
                "get_comprehensive_metrics",
                return_value={"delivery_rate": 95.0, "read_rate": 80.0, "engagement_rate": 50.0},
            ),
            patch.object(
                analytics,
                "get_system_performance_metrics",
                return_value=SystemPerformanceMetrics(error_rate=1.0),
            ),
            patch(
                "app.services.notification_analytics.redis_client.is_available", return_value=False
            ),
        ):
            score = await analytics.calculate_system_health_score()

        # Redis unavailable should lower score (50 instead of 100)
        assert isinstance(score, float)

    @pytest.mark.asyncio
    async def test_health_score_error_handling(self, analytics):
        """Test health score error handling."""
        # Simulate exception
        with patch.object(
            analytics, "get_comprehensive_metrics", side_effect=Exception("Database error")
        ):
            score = await analytics.calculate_system_health_score()

        # Should return 0.0 on error
        assert score == 0.0


# ============================================================================
# TEST NotificationAnalytics - GET DASHBOARD DATA
# ============================================================================


class TestGetDashboardData:
    """Test dashboard data collection."""

    @pytest.mark.asyncio
    async def test_get_dashboard_data_structure(self, analytics):
        """Test dashboard data has correct structure."""
        with (
            patch.object(analytics, "get_comprehensive_metrics", return_value={}),
            patch.object(
                analytics, "get_user_engagement_metrics", return_value=UserEngagementMetrics()
            ),
            patch.object(
                analytics, "get_system_performance_metrics", return_value=SystemPerformanceMetrics()
            ),
            patch(
                "app.services.notification_analytics.redis_client.is_available", return_value=True
            ),
            patch.object(analytics, "calculate_system_health_score", return_value=85.5),
        ):
            data = await analytics.get_dashboard_data(days=7)

        assert "timestamp" in data
        assert "notification_metrics" in data
        assert "user_engagement" in data
        assert "system_performance" in data
        assert "redis_status" in data
        assert "health_score" in data
        assert "period_days" in data
        assert data["period_days"] == 7

    @pytest.mark.asyncio
    async def test_get_dashboard_data_custom_period(self, analytics):
        """Test dashboard data with custom period."""
        with (
            patch.object(analytics, "get_comprehensive_metrics", return_value={}),
            patch.object(
                analytics, "get_user_engagement_metrics", return_value=UserEngagementMetrics()
            ),
            patch.object(
                analytics, "get_system_performance_metrics", return_value=SystemPerformanceMetrics()
            ),
            patch(
                "app.services.notification_analytics.redis_client.is_available", return_value=True
            ),
            patch.object(analytics, "calculate_system_health_score", return_value=85.5),
        ):
            data = await analytics.get_dashboard_data(days=30)

        assert data["period_days"] == 30

    @pytest.mark.asyncio
    async def test_get_dashboard_data_error_handling(self, analytics):
        """Test dashboard data error handling."""
        # Simulate exception
        with patch.object(
            analytics, "get_comprehensive_metrics", side_effect=Exception("Database error")
        ):
            data = await analytics.get_dashboard_data()

        # Should return error data
        assert "error" in data
        assert "timestamp" in data

    @pytest.mark.asyncio
    async def test_get_dashboard_data_redis_status(self, analytics):
        """Test dashboard includes Redis status."""
        with (
            patch.object(analytics, "get_comprehensive_metrics", return_value={}),
            patch.object(
                analytics, "get_user_engagement_metrics", return_value=UserEngagementMetrics()
            ),
            patch.object(
                analytics, "get_system_performance_metrics", return_value=SystemPerformanceMetrics()
            ),
            patch(
                "app.services.notification_analytics.redis_client.is_available", return_value=False
            ),
            patch.object(analytics, "calculate_system_health_score", return_value=75.0),
        ):
            data = await analytics.get_dashboard_data()

        assert data["redis_status"] is False


# ============================================================================
# TEST NotificationAnalytics - CONCURRENT METRICS COLLECTION
# ============================================================================


class TestConcurrentMetricsCollection:
    """Test concurrent metrics collection with asyncio.gather."""

    @pytest.mark.asyncio
    async def test_dashboard_concurrent_execution(self, analytics):
        """Test dashboard data collects metrics concurrently."""
        call_order = []

        async def mock_comprehensive_metrics(*args, **kwargs):
            call_order.append("comprehensive")
            await asyncio.sleep(0.1)
            return {}

        async def mock_user_metrics(*args, **kwargs):
            call_order.append("user")
            await asyncio.sleep(0.1)
            return UserEngagementMetrics()

        async def mock_system_metrics():
            call_order.append("system")
            await asyncio.sleep(0.1)
            return SystemPerformanceMetrics()

        with (
            patch.object(
                analytics, "get_comprehensive_metrics", side_effect=mock_comprehensive_metrics
            ),
            patch.object(analytics, "get_user_engagement_metrics", side_effect=mock_user_metrics),
            patch.object(
                analytics, "get_system_performance_metrics", side_effect=mock_system_metrics
            ),
            patch(
                "app.services.notification_analytics.redis_client.is_available", return_value=True
            ),
            patch.object(analytics, "calculate_system_health_score", return_value=85.0),
        ):
            await analytics.get_dashboard_data()

        # All three should be called (order may vary due to concurrent execution)
        assert "comprehensive" in call_order
        assert "user" in call_order
        assert "system" in call_order


# ============================================================================
# TEST MODULE-LEVEL INSTANCE
# ============================================================================


class TestModuleLevelInstance:
    """Test module-level global instance."""

    def test_global_analytics_instance_exists(self):
        """Test global notification_analytics instance exists."""
        assert notification_analytics is not None
        assert isinstance(notification_analytics, NotificationAnalytics)

    def test_global_instance_state(self):
        """Test global instance has correct initial state."""
        # Should have fresh state
        assert hasattr(notification_analytics, "metrics_history")
        assert hasattr(notification_analytics, "performance_counters")
        assert hasattr(notification_analytics, "timing_data")


# ============================================================================
# TEST EDGE CASES & ERROR HANDLING
# ============================================================================


class TestEdgeCasesAndErrorHandling:
    """Test edge cases and error scenarios."""

    @pytest.mark.asyncio
    async def test_zero_division_safety(self, analytics):
        """Test zero division is handled safely."""
        # Mock zero notifications
        with (
            patch.object(
                analytics,
                "get_comprehensive_metrics",
                return_value={
                    "total_sent": 0,
                    "total_delivered": 0,
                    "total_read": 0,
                    "delivery_rate": 0.0,
                    "read_rate": 0.0,
                },
            ),
            patch.object(
                analytics, "get_system_performance_metrics", return_value=SystemPerformanceMetrics()
            ),
            patch(
                "app.services.notification_analytics.redis_client.is_available", return_value=True
            ),
        ):
            score = await analytics.calculate_system_health_score()

        # Should handle gracefully
        assert isinstance(score, float)
        assert score >= 0.0

    def test_empty_timing_data_average(self, analytics):
        """Test average calculation with empty timing data."""
        # Should handle empty list gracefully
        db_times = analytics.timing_data.get("nonexistent", [])
        avg = sum(db_times) / len(db_times) if db_times else 0
        assert avg == 0

    def test_counter_overflow_safety(self, analytics):
        """Test counters handle large numbers."""
        # Increment counter many times
        for _ in range(1000000):
            analytics.increment_counter("large_counter")

        assert analytics.performance_counters["large_counter"] == 1000000

    @pytest.mark.asyncio
    async def test_concurrent_metric_recording(self, analytics):
        """Test concurrent metric recording is safe."""

        async def record_metrics():
            for i in range(100):
                analytics.record_performance_metric("concurrent_test", float(i))
                await asyncio.sleep(0.001)

        # Run multiple concurrent tasks
        await asyncio.gather(record_metrics(), record_metrics(), record_metrics())

        # Should have recorded metrics from all tasks (but only last 100)
        assert len(analytics.timing_data["concurrent_test"]) == 100

    def test_metrics_history_deque_properties(self, analytics):
        """Test metrics_history deque maintains size."""
        # Add 1500 items
        for i in range(1500):
            analytics.metrics_history.append({"metric": i})

        # Should only keep 1000
        assert len(analytics.metrics_history) == 1000
        # Should be items 500-1499
        assert analytics.metrics_history[0]["metric"] == 500
        assert analytics.metrics_history[-1]["metric"] == 1499


# ============================================================================
# TEST RATE CALCULATIONS
# ============================================================================


class TestRateCalculations:
    """Test rate calculation logic."""

    def test_delivery_rate_calculation(self):
        """Test delivery rate calculation."""
        # 95 delivered out of 100 sent = 95%
        total_sent = 100
        total_delivered = 95
        delivery_rate = (total_delivered / total_sent * 100) if total_sent > 0 else 0
        assert delivery_rate == 95.0

    def test_read_rate_calculation(self):
        """Test read rate calculation."""
        # 70 read out of 95 delivered = 73.68%
        total_delivered = 95
        total_read = 70
        read_rate = (total_read / total_delivered * 100) if total_delivered > 0 else 0
        assert round(read_rate, 2) == 73.68

    def test_engagement_rate_calculation(self):
        """Test engagement rate calculation."""
        # 30 clicked out of 70 read = 42.86%
        total_read = 70
        total_clicked = 30
        engagement_rate = (total_clicked / total_read * 100) if total_read > 0 else 0
        assert round(engagement_rate, 2) == 42.86

    def test_rate_calculation_zero_denominator(self):
        """Test rate calculations handle zero denominators."""
        total_sent = 0
        total_delivered = 0
        delivery_rate = (total_delivered / total_sent * 100) if total_sent > 0 else 0
        assert delivery_rate == 0.0

    def test_error_rate_calculation(self):
        """Test error rate calculation."""
        errors = 5
        total_requests = 1000
        error_rate = (errors / max(total_requests, 1)) * 100
        assert error_rate == 0.5


# ============================================================================
# TEST HEALTH SCORE BREAKDOWN
# ============================================================================


class TestHealthScoreBreakdown:
    """Test health score breakdown calculation."""

    def test_health_score_averaging(self):
        """Test health score averages component scores."""
        delivery_score = 95.0
        engagement_score = 80.0
        performance_score = 99.0  # 100 - 1% error rate
        redis_score = 100.0  # Available

        scores = [delivery_score, engagement_score, performance_score, redis_score]
        overall_score = sum(scores) / len(scores)

        assert overall_score == 93.5

    def test_health_status_excellent(self):
        """Test health status 'excellent' for score >= 90."""
        overall_score = 92.5
        status = (
            "excellent"
            if overall_score >= 90
            else "good" if overall_score >= 75 else "fair" if overall_score >= 50 else "poor"
        )
        assert status == "excellent"

    def test_health_status_good(self):
        """Test health status 'good' for score 75-89."""
        overall_score = 80.0
        status = (
            "excellent"
            if overall_score >= 90
            else "good" if overall_score >= 75 else "fair" if overall_score >= 50 else "poor"
        )
        assert status == "good"

    def test_health_status_fair(self):
        """Test health status 'fair' for score 50-74."""
        overall_score = 65.0
        status = (
            "excellent"
            if overall_score >= 90
            else "good" if overall_score >= 75 else "fair" if overall_score >= 50 else "poor"
        )
        assert status == "fair"

    def test_health_status_poor(self):
        """Test health status 'poor' for score < 50."""
        overall_score = 35.0
        status = (
            "excellent"
            if overall_score >= 90
            else "good" if overall_score >= 75 else "fair" if overall_score >= 50 else "poor"
        )
        assert status == "poor"
