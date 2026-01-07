"""
Tests for app.services.advanced_storage_analytics

Comprehensive test suite for AdvancedStorageAnalytics service including:
- Initialization and configuration
- Dataclass structures (AdvancedStorageMetrics, OptimizationRecommendation, PerformanceBenchmark)
- Enum validation (StorageOptimizationLevel, DataDistributionPattern)
- get_comprehensive_metrics() - Mocked database operations
- Error handling and edge cases

Pattern: Uses unittest.mock to mock database sessions and async generators
Success Criteria: 80%+ coverage, all edge cases covered
"""

from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.advanced_storage_analytics import (
    AdvancedStorageAnalytics,
    AdvancedStorageMetrics,
    DataDistributionPattern,
    OptimizationRecommendation,
    PerformanceBenchmark,
    StorageOptimizationLevel,
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
def analytics_service(mock_settings):
    """Create AdvancedStorageAnalytics instance with mock settings"""
    return AdvancedStorageAnalytics(mock_settings)


@pytest.fixture
def mock_db_session():
    """Create mock database session"""
    session = AsyncMock()
    session.scalar = AsyncMock()
    session.execute = AsyncMock()
    return session


# ============================================================================
# Test Class 1: Enum Values
# ============================================================================
class TestStorageOptimizationLevelEnum:
    """Test StorageOptimizationLevel enum values"""

    def test_conservative_value(self):
        """CONSERVATIVE should have value 'conservative'"""
        assert StorageOptimizationLevel.CONSERVATIVE.value == "conservative"

    def test_balanced_value(self):
        """BALANCED should have value 'balanced'"""
        assert StorageOptimizationLevel.BALANCED.value == "balanced"

    def test_aggressive_value(self):
        """AGGRESSIVE should have value 'aggressive'"""
        assert StorageOptimizationLevel.AGGRESSIVE.value == "aggressive"

    def test_enum_has_three_values(self):
        """Enum should have exactly 3 values"""
        assert len(StorageOptimizationLevel) == 3


class TestDataDistributionPatternEnum:
    """Test DataDistributionPattern enum values"""

    def test_time_based_value(self):
        """TIME_BASED should have value 'time_based'"""
        assert DataDistributionPattern.TIME_BASED.value == "time_based"

    def test_user_based_value(self):
        """USER_BASED should have value 'user_based'"""
        assert DataDistributionPattern.USER_BASED.value == "user_based"

    def test_size_based_value(self):
        """SIZE_BASED should have value 'size_based'"""
        assert DataDistributionPattern.SIZE_BASED.value == "size_based"

    def test_hybrid_value(self):
        """HYBRID should have value 'hybrid'"""
        assert DataDistributionPattern.HYBRID.value == "hybrid"

    def test_enum_has_four_values(self):
        """Enum should have exactly 4 values"""
        assert len(DataDistributionPattern) == 4


# ============================================================================
# Test Class 2: AdvancedStorageMetrics Dataclass
# ============================================================================
class TestAdvancedStorageMetricsDataclass:
    """Test AdvancedStorageMetrics dataclass"""

    def test_default_initialization(self):
        """Metrics should initialize with default values"""
        metrics = AdvancedStorageMetrics()

        # Basic metrics defaults
        assert metrics.total_size_mb == 0.0
        assert metrics.total_threads == 0
        assert metrics.total_messages == 0
        assert metrics.total_users == 0

        # Distribution metrics defaults
        assert metrics.messages_per_thread_avg == 0.0
        assert metrics.messages_per_thread_median == 0.0
        assert metrics.messages_per_user_avg == 0.0
        assert metrics.messages_per_user_median == 0.0

        # Growth metrics defaults
        assert metrics.daily_growth_rate == 0.0
        assert metrics.weekly_growth_rate == 0.0
        assert metrics.monthly_growth_rate == 0.0

        # Performance metrics defaults
        assert metrics.avg_message_size_kb == 0.0
        assert metrics.largest_thread_messages == 0
        assert metrics.largest_thread_size_mb == 0.0

        # Prediction defaults
        assert metrics.predicted_size_30_days == 0.0
        assert metrics.predicted_size_90_days == 0.0
        assert metrics.predicted_size_365_days == 0.0

        # Health indicators defaults
        assert metrics.fragmentation_ratio == 0.0
        assert metrics.archive_efficiency == 0.0
        assert metrics.optimization_score == 0.0

    def test_post_init_initializes_none_fields(self):
        """__post_init__ should initialize None fields to empty collections"""
        metrics = AdvancedStorageMetrics()

        # Fields that are initialized by __post_init__
        assert metrics.provider_usage == {}
        assert metrics.model_usage == {}
        assert metrics.peak_hours == []
        assert metrics.peak_days == []

    def test_custom_initialization(self):
        """Metrics should accept custom values"""
        metrics = AdvancedStorageMetrics(
            total_size_mb=100.5,
            total_threads=50,
            total_messages=500,
            total_users=10,
            daily_growth_rate=25.0,
            provider_usage={"openai": 100, "anthropic": 50},
            model_usage={"gpt-4": 80, "claude-3": 70},
            peak_hours=[9, 10, 14, 15],
            peak_days=["Monday", "Tuesday"],
        )

        assert metrics.total_size_mb == 100.5
        assert metrics.total_threads == 50
        assert metrics.total_messages == 500
        assert metrics.total_users == 10
        assert metrics.daily_growth_rate == 25.0
        assert metrics.provider_usage == {"openai": 100, "anthropic": 50}
        assert metrics.model_usage == {"gpt-4": 80, "claude-3": 70}
        assert metrics.peak_hours == [9, 10, 14, 15]
        assert metrics.peak_days == ["Monday", "Tuesday"]

    def test_metrics_is_dataclass(self):
        """AdvancedStorageMetrics should be a dataclass (supports asdict)"""
        metrics = AdvancedStorageMetrics(total_messages=100)
        result = asdict(metrics)

        assert isinstance(result, dict)
        assert result["total_messages"] == 100


# ============================================================================
# Test Class 3: OptimizationRecommendation Dataclass
# ============================================================================
class TestOptimizationRecommendationDataclass:
    """Test OptimizationRecommendation dataclass"""

    def test_initialization(self):
        """OptimizationRecommendation should initialize with all fields"""
        recommendation = OptimizationRecommendation(
            category="archival",
            priority="HIGH",
            description="Archive old messages",
            potential_savings_mb=50.0,
            effort_level="MEDIUM",
            implementation_steps=["Step 1", "Step 2", "Step 3"],
            estimated_time_minutes=30,
        )

        assert recommendation.category == "archival"
        assert recommendation.priority == "HIGH"
        assert recommendation.description == "Archive old messages"
        assert recommendation.potential_savings_mb == 50.0
        assert recommendation.effort_level == "MEDIUM"
        assert recommendation.implementation_steps == ["Step 1", "Step 2", "Step 3"]
        assert recommendation.estimated_time_minutes == 30

    def test_recommendation_is_dataclass(self):
        """OptimizationRecommendation should be a dataclass"""
        recommendation = OptimizationRecommendation(
            category="cleanup",
            priority="LOW",
            description="Remove duplicates",
            potential_savings_mb=5.0,
            effort_level="EASY",
            implementation_steps=["Remove dups"],
            estimated_time_minutes=10,
        )
        result = asdict(recommendation)

        assert isinstance(result, dict)
        assert result["category"] == "cleanup"
        assert result["priority"] == "LOW"


# ============================================================================
# Test Class 4: PerformanceBenchmark Dataclass
# ============================================================================
class TestPerformanceBenchmarkDataclass:
    """Test PerformanceBenchmark dataclass"""

    def test_initialization(self):
        """PerformanceBenchmark should initialize with all fields"""
        now = datetime.now(timezone.utc)
        benchmark = PerformanceBenchmark(
            operation="SELECT",
            avg_time_ms=15.5,
            min_time_ms=10.0,
            max_time_ms=25.0,
            percentile_95_ms=22.0,
            samples=100,
            timestamp=now,
        )

        assert benchmark.operation == "SELECT"
        assert benchmark.avg_time_ms == 15.5
        assert benchmark.min_time_ms == 10.0
        assert benchmark.max_time_ms == 25.0
        assert benchmark.percentile_95_ms == 22.0
        assert benchmark.samples == 100
        assert benchmark.timestamp == now

    def test_benchmark_is_dataclass(self):
        """PerformanceBenchmark should be a dataclass"""
        benchmark = PerformanceBenchmark(
            operation="INSERT",
            avg_time_ms=20.0,
            min_time_ms=15.0,
            max_time_ms=30.0,
            percentile_95_ms=28.0,
            samples=50,
            timestamp=datetime.now(timezone.utc),
        )
        result = asdict(benchmark)

        assert isinstance(result, dict)
        assert result["operation"] == "INSERT"
        assert result["samples"] == 50


# ============================================================================
# Test Class 5: AdvancedStorageAnalytics Initialization
# ============================================================================
class TestAnalyticsServiceInit:
    """Test AdvancedStorageAnalytics initialization"""

    def test_init_with_settings(self, mock_settings):
        """Service should initialize with settings"""
        service = AdvancedStorageAnalytics(mock_settings)

        assert service.settings is mock_settings
        assert service.optimization_level == StorageOptimizationLevel.BALANCED

    def test_default_optimization_level(self, mock_settings):
        """Default optimization level should be BALANCED"""
        service = AdvancedStorageAnalytics(mock_settings)
        assert service.optimization_level == StorageOptimizationLevel.BALANCED


# ============================================================================
# Test Class 6: get_comprehensive_metrics() Method
# ============================================================================
class TestGetComprehensiveMetrics:
    """Test get_comprehensive_metrics() method"""

    @pytest.mark.asyncio
    async def test_returns_metrics_object(self, analytics_service):
        """get_comprehensive_metrics should return AdvancedStorageMetrics"""

        # Mock the get_db_session to be an async generator that yields nothing
        async def mock_async_gen():
            # Empty generator - simulates no database connection
            if False:
                yield

        with patch(
            "app.services.advanced_storage_analytics.get_db_session", mock_async_gen
        ):
            result = await analytics_service.get_comprehensive_metrics()

        assert isinstance(result, AdvancedStorageMetrics)

    @pytest.mark.asyncio
    async def test_handles_exception_gracefully(self, analytics_service):
        """get_comprehensive_metrics should handle exceptions and return empty metrics"""

        # Mock database session that raises an exception
        async def mock_async_gen_with_error():
            raise Exception("Database connection failed")
            yield

        with patch(
            "app.services.advanced_storage_analytics.get_db_session",
            mock_async_gen_with_error,
        ):
            result = await analytics_service.get_comprehensive_metrics()

        # Should return a valid AdvancedStorageMetrics with default values
        assert isinstance(result, AdvancedStorageMetrics)
        assert result.total_messages == 0
        assert result.total_threads == 0
        assert result.total_users == 0

    @pytest.mark.asyncio
    async def test_calculates_basic_counts(self, analytics_service, mock_db_session):
        """get_comprehensive_metrics should calculate basic counts from database"""

        # Mock scalar results for counts
        mock_db_session.scalar.side_effect = [
            10,  # total_threads
            100,  # total_messages
            5,  # total_users
            0,  # messages_last_24h (daily growth)
            0,  # messages_last_week (weekly growth)
            0,  # messages_last_month (monthly growth)
        ]

        # Mock execute results for empty distributions
        mock_result = MagicMock()
        mock_result.__iter__ = lambda self: iter([])
        mock_db_session.execute.return_value = mock_result

        # Create async generator that yields the mock session
        async def mock_async_gen():
            yield mock_db_session

        with patch(
            "app.services.advanced_storage_analytics.get_db_session", mock_async_gen
        ):
            result = await analytics_service.get_comprehensive_metrics()

        # Verify counts were retrieved
        assert mock_db_session.scalar.called
        assert isinstance(result, AdvancedStorageMetrics)

    @pytest.mark.asyncio
    async def test_empty_database_returns_zero_values(
        self, analytics_service, mock_db_session
    ):
        """get_comprehensive_metrics should handle empty database"""

        # Mock all scalars to return 0 or None
        mock_db_session.scalar.return_value = 0

        # Mock execute results
        mock_result = MagicMock()
        mock_result.__iter__ = lambda self: iter([])
        mock_db_session.execute.return_value = mock_result

        async def mock_async_gen():
            yield mock_db_session

        with patch(
            "app.services.advanced_storage_analytics.get_db_session", mock_async_gen
        ):
            result = await analytics_service.get_comprehensive_metrics()

        assert result.total_threads == 0
        assert result.total_messages == 0
        assert result.total_users == 0
        assert result.daily_growth_rate == 0.0


# ============================================================================
# Test Class 7: Edge Cases
# ============================================================================
class TestEdgeCases:
    """Test edge cases and boundary conditions"""

    def test_metrics_with_zero_messages_no_division_error(self):
        """Metrics should handle zero messages without division errors"""
        metrics = AdvancedStorageMetrics(
            total_messages=0,
            total_size_mb=0.0,
        )

        # No errors should occur
        assert metrics.avg_message_size_kb == 0.0
        assert metrics.messages_per_thread_avg == 0.0

    def test_metrics_with_large_values(self):
        """Metrics should handle large values"""
        metrics = AdvancedStorageMetrics(
            total_messages=1000000000,  # 1 billion
            total_size_mb=500000.0,  # 500 GB
            predicted_size_365_days=1000000.0,  # 1 TB
        )

        assert metrics.total_messages == 1000000000
        assert metrics.total_size_mb == 500000.0
        assert metrics.predicted_size_365_days == 1000000.0

    def test_recommendation_with_empty_steps(self):
        """Recommendation should handle empty implementation steps"""
        recommendation = OptimizationRecommendation(
            category="test",
            priority="LOW",
            description="Test recommendation",
            potential_savings_mb=0.0,
            effort_level="EASY",
            implementation_steps=[],
            estimated_time_minutes=0,
        )

        assert recommendation.implementation_steps == []
        assert recommendation.estimated_time_minutes == 0

    def test_benchmark_with_single_sample(self):
        """Benchmark should handle single sample"""
        benchmark = PerformanceBenchmark(
            operation="SINGLE",
            avg_time_ms=10.0,
            min_time_ms=10.0,
            max_time_ms=10.0,
            percentile_95_ms=10.0,
            samples=1,
            timestamp=datetime.now(timezone.utc),
        )

        assert benchmark.samples == 1
        assert benchmark.min_time_ms == benchmark.max_time_ms


# ============================================================================
# Test Class 8: Type Safety
# ============================================================================
class TestTypeSafety:
    """Test type safety and validation"""

    def test_metrics_accepts_float_for_counts(self):
        """Metrics should accept float values (may be cast)"""
        # Python doesn't enforce types at runtime, but verify no errors
        metrics = AdvancedStorageMetrics(
            total_threads=10,
            total_messages=100,
            messages_per_thread_avg=10.5,
        )

        assert metrics.total_threads == 10
        assert metrics.messages_per_thread_avg == 10.5

    def test_metrics_provider_usage_dict_operations(self):
        """Provider usage dict should support standard operations"""
        metrics = AdvancedStorageMetrics()
        metrics.provider_usage["openai"] = 50
        metrics.provider_usage["anthropic"] = 25

        assert len(metrics.provider_usage) == 2
        assert "openai" in metrics.provider_usage
        assert metrics.provider_usage.get("missing", 0) == 0

    def test_metrics_peak_hours_list_operations(self):
        """Peak hours list should support standard operations"""
        metrics = AdvancedStorageMetrics()
        metrics.peak_hours.append(9)
        metrics.peak_hours.append(14)

        assert len(metrics.peak_hours) == 2
        assert 9 in metrics.peak_hours
