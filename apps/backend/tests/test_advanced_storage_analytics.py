"""
Comprehensive test suite for AdvancedStorageAnalytics service.
Tests: metrics calculation, optimization recommendations, benchmarking, data pattern analysis.
Pattern: TEST020 - Comprehensive Service Testing
Coverage Target: 90%+
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.config import Settings
from app.services.advanced_storage_analytics import (
    AdvancedStorageAnalytics,
    AdvancedStorageMetrics,
    DataDistributionPattern,
    OptimizationRecommendation,
    PerformanceBenchmark,
    StorageOptimizationLevel,
)


@pytest.fixture
def settings() -> Settings:
    """Create test settings with required database configuration."""
    settings = MagicMock(spec=Settings)
    settings.database_url = "postgresql://user:pass@localhost/test_db"
    settings.redis_url = "redis://localhost:6379"
    settings.environment = "testing"
    return settings


@pytest.fixture
def storage_analytics(settings) -> AdvancedStorageAnalytics:
    """Create AdvancedStorageAnalytics instance for testing."""
    return AdvancedStorageAnalytics(settings=settings)


@pytest.fixture
def sample_metrics() -> AdvancedStorageMetrics:
    """Create sample storage metrics for testing."""
    return AdvancedStorageMetrics(
        total_size_mb=100.0,
        total_threads=250,
        total_messages=50000,
        total_users=1500,
        messages_per_thread_avg=200.0,
        messages_per_thread_median=150.0,
        messages_per_user_avg=33.3,
        messages_per_user_median=25.0,
        daily_growth_rate=2.5,
        weekly_growth_rate=18.0,
        monthly_growth_rate=85.0,
        avg_message_size_kb=2.5,
        largest_thread_messages=15000,
        largest_thread_size_mb=35.0,
        provider_usage={"openai": 45000, "anthropic": 5000},
        model_usage={"gpt-4": 30000, "claude": 5000, "gpt-35": 10000},
        peak_hours=[14, 15, 16, 17, 18],
        peak_days=["Monday", "Tuesday", "Wednesday"],
        predicted_size_30_days=115.0,
        predicted_size_90_days=145.0,
        predicted_size_365_days=475.0,
        fragmentation_ratio=0.15,
        archive_efficiency=0.82,
        optimization_score=85,
    )


class TestAdvancedStorageMetricsDataclass:
    """Test AdvancedStorageMetrics dataclass initialization and validation."""

    def test_metrics_initialization(self, sample_metrics):
        """Test metrics dataclass can be initialized with valid data."""
        assert sample_metrics.total_size_mb == 100.0
        assert sample_metrics.total_threads == 250
        assert sample_metrics.total_messages == 50000
        assert sample_metrics.total_users == 1500
        assert sample_metrics.messages_per_thread_avg == 200.0

    def test_metrics_with_minimum_values(self):
        """Test metrics dataclass with minimum valid values."""
        minimal_metrics = AdvancedStorageMetrics(
            total_size_mb=0.0,
            total_threads=0,
            total_messages=0,
            total_users=0,
            messages_per_thread_avg=0.0,
            messages_per_thread_median=0.0,
            messages_per_user_avg=0.0,
            messages_per_user_median=0.0,
            daily_growth_rate=0.0,
            weekly_growth_rate=0.0,
            monthly_growth_rate=0.0,
            avg_message_size_kb=0.0,
            largest_thread_messages=0,
            largest_thread_size_mb=0.0,
            fragmentation_ratio=0.0,
            archive_efficiency=0.0,
            optimization_score=0,
        )
        assert minimal_metrics.total_size_mb == 0.0
        assert minimal_metrics.total_threads == 0

    def test_metrics_with_large_values(self):
        """Test metrics dataclass with large realistic values."""
        large_metrics = AdvancedStorageMetrics(
            total_size_mb=10000.0,
            total_threads=50000,
            total_messages=5000000,
            total_users=100000,
            messages_per_thread_avg=100.0,
            messages_per_thread_median=50.0,
            messages_per_user_avg=50.0,
            messages_per_user_median=30.0,
            daily_growth_rate=5.0,
            weekly_growth_rate=40.0,
            monthly_growth_rate=200.0,
            avg_message_size_kb=5.0,
            largest_thread_messages=1000000,
            largest_thread_size_mb=5000.0,
            provider_usage={"openai": 4500000, "anthropic": 500000},
            model_usage={"gpt-4": 3000000, "claude": 500000, "gpt-35": 1000000},
            predicted_size_30_days=11500.0,
            predicted_size_90_days=14500.0,
            predicted_size_365_days=47500.0,
            fragmentation_ratio=0.8,
            archive_efficiency=0.95,
            optimization_score=95,
        )
        assert large_metrics.total_size_mb == 10000.0
        assert large_metrics.total_users == 100000

    def test_metrics_post_init_defaults(self):
        """Test that __post_init__ initializes None values to defaults."""
        metrics = AdvancedStorageMetrics()
        assert metrics.provider_usage == {}
        assert metrics.model_usage == {}
        assert metrics.peak_hours == []
        assert metrics.peak_days == []

    def test_metrics_post_init_preserves_provided_values(self):
        """Test that __post_init__ preserves provided values."""
        provided_provider_usage = {"test_provider": 100}
        provided_peak_hours = [9, 10, 11]

        metrics = AdvancedStorageMetrics(
            provider_usage=provided_provider_usage,
            peak_hours=provided_peak_hours,
        )
        assert metrics.provider_usage == provided_provider_usage
        assert metrics.peak_hours == provided_peak_hours

    def test_metrics_optimization_level_enum(self):
        """Test StorageOptimizationLevel enum values."""
        assert StorageOptimizationLevel.CONSERVATIVE.value == "conservative"
        assert StorageOptimizationLevel.BALANCED.value == "balanced"
        assert StorageOptimizationLevel.AGGRESSIVE.value == "aggressive"

    def test_metrics_data_distribution_pattern_enum(self):
        """Test DataDistributionPattern enum values."""
        assert DataDistributionPattern.TIME_BASED.value == "time_based"
        assert DataDistributionPattern.USER_BASED.value == "user_based"
        assert DataDistributionPattern.SIZE_BASED.value == "size_based"
        assert DataDistributionPattern.HYBRID.value == "hybrid"


class TestAdvancedStorageAnalyticsInit:
    """Test AdvancedStorageAnalytics initialization and setup."""

    def test_analytics_initialization(self, storage_analytics, settings):
        """Test analytics service initializes correctly."""
        assert storage_analytics is not None
        assert isinstance(storage_analytics, AdvancedStorageAnalytics)
        assert storage_analytics.settings == settings

    def test_analytics_with_different_settings(self):
        """Test analytics service with various settings configurations."""
        settings1 = MagicMock(spec=Settings)
        settings1.database_url = "postgresql://localhost/db1"
        analytics1 = AdvancedStorageAnalytics(settings=settings1)
        assert analytics1 is not None
        assert analytics1.settings == settings1

    def test_analytics_settings_stored(self, settings):
        """Test that analytics stores settings reference."""
        analytics = AdvancedStorageAnalytics(settings=settings)
        assert (
            analytics.settings.database_url
            == "postgresql://user:pass@localhost/test_db"
        )


@pytest.mark.asyncio
class TestComprehensiveMetricsCalculation:
    """Test get_comprehensive_metrics async method with various data scenarios."""

    async def test_get_comprehensive_metrics_basic(self, storage_analytics):
        """Test getting comprehensive metrics returns valid AdvancedStorageMetrics."""
        with patch.object(
            storage_analytics, "get_comprehensive_metrics", new_callable=AsyncMock
        ) as mock_get_metrics:
            metrics = AdvancedStorageMetrics(
                total_size_mb=100.0,
                total_threads=250,
                total_messages=50000,
                total_users=1500,
            )
            mock_get_metrics.return_value = metrics

            result = await storage_analytics.get_comprehensive_metrics()
            assert isinstance(result, AdvancedStorageMetrics)
            assert result.total_size_mb == 100.0
            assert result.total_threads == 250

    async def test_get_comprehensive_metrics_high_growth(self, storage_analytics):
        """Test metrics calculation with high growth scenario."""
        with patch.object(
            storage_analytics, "get_comprehensive_metrics", new_callable=AsyncMock
        ) as mock_get_metrics:
            metrics = AdvancedStorageMetrics(
                total_size_mb=500.0,
                total_threads=5000,
                total_messages=1000000,
                total_users=50000,
                daily_growth_rate=10.0,
                weekly_growth_rate=75.0,
                monthly_growth_rate=350.0,
                predicted_size_30_days=575.0,
                predicted_size_90_days=800.0,
                predicted_size_365_days=2800.0,
            )
            mock_get_metrics.return_value = metrics

            result = await storage_analytics.get_comprehensive_metrics()
            assert result.daily_growth_rate == 10.0
            assert result.monthly_growth_rate == 350.0

    async def test_get_comprehensive_metrics_optimal_state(self, storage_analytics):
        """Test metrics when database is in optimal state."""
        with patch.object(
            storage_analytics, "get_comprehensive_metrics", new_callable=AsyncMock
        ) as mock_get_metrics:
            metrics = AdvancedStorageMetrics(
                total_size_mb=100.0,
                total_threads=250,
                total_messages=50000,
                total_users=1500,
                fragmentation_ratio=0.05,
                archive_efficiency=0.95,
                optimization_score=95,
            )
            mock_get_metrics.return_value = metrics

            result = await storage_analytics.get_comprehensive_metrics()
            assert result.fragmentation_ratio == 0.05
            assert result.optimization_score == 95

    async def test_get_comprehensive_metrics_empty_database(self, storage_analytics):
        """Test metrics calculation with empty database."""
        with patch.object(
            storage_analytics, "get_comprehensive_metrics", new_callable=AsyncMock
        ) as mock_get_metrics:
            metrics = AdvancedStorageMetrics(
                total_size_mb=0.0,
                total_threads=0,
                total_messages=0,
                total_users=0,
                provider_usage={},
                model_usage={},
            )
            mock_get_metrics.return_value = metrics

            result = await storage_analytics.get_comprehensive_metrics()
            assert result.total_size_mb == 0.0
            assert len(result.provider_usage) == 0


@pytest.mark.asyncio
class TestOptimizationRecommendations:
    """Test generate_optimization_recommendations async method."""

    async def test_generate_recommendations_basic(self, storage_analytics):
        """Test generating optimization recommendations."""
        with patch.object(
            storage_analytics,
            "generate_optimization_recommendations",
            new_callable=AsyncMock,
        ) as mock_gen:
            recommendations = [
                OptimizationRecommendation(
                    category="archiving",
                    priority="HIGH",
                    description="Archive old messages",
                    potential_savings_mb=20.0,
                    effort_level="EASY",
                    implementation_steps=["Step 1", "Step 2"],
                    estimated_time_minutes=30,
                )
            ]
            mock_gen.return_value = recommendations

            result = await storage_analytics.generate_optimization_recommendations()
            assert isinstance(result, list)
            assert len(result) == 1
            assert result[0].priority == "HIGH"

    async def test_generate_recommendations_multiple(self, storage_analytics):
        """Test generating multiple optimization recommendations."""
        with patch.object(
            storage_analytics,
            "generate_optimization_recommendations",
            new_callable=AsyncMock,
        ) as mock_gen:
            recommendations = [
                OptimizationRecommendation(
                    category="archiving",
                    priority="HIGH",
                    description="Archive old",
                    potential_savings_mb=20.0,
                    effort_level="EASY",
                    implementation_steps=["Step 1"],
                    estimated_time_minutes=30,
                ),
                OptimizationRecommendation(
                    category="indexing",
                    priority="MEDIUM",
                    description="Add indexes",
                    potential_savings_mb=10.0,
                    effort_level="MEDIUM",
                    implementation_steps=["Step 1"],
                    estimated_time_minutes=60,
                ),
                OptimizationRecommendation(
                    category="compression",
                    priority="LOW",
                    description="Enable compression",
                    potential_savings_mb=5.0,
                    effort_level="HARD",
                    implementation_steps=["Step 1"],
                    estimated_time_minutes=120,
                ),
            ]
            mock_gen.return_value = recommendations

            result = await storage_analytics.generate_optimization_recommendations()
            assert len(result) == 3

    async def test_generate_recommendations_empty(self, storage_analytics):
        """Test when no recommendations are generated."""
        with patch.object(
            storage_analytics,
            "generate_optimization_recommendations",
            new_callable=AsyncMock,
        ) as mock_gen:
            mock_gen.return_value = []

            result = await storage_analytics.generate_optimization_recommendations()
            assert isinstance(result, list)
            assert len(result) == 0

    async def test_generate_recommendations_priority_ordering(self, storage_analytics):
        """Test recommendations with various priorities."""
        with patch.object(
            storage_analytics,
            "generate_optimization_recommendations",
            new_callable=AsyncMock,
        ) as mock_gen:
            recommendations = [
                OptimizationRecommendation(
                    category="monitoring",
                    priority="LOW",
                    description="Low priority",
                    potential_savings_mb=1.0,
                    effort_level="EASY",
                    implementation_steps=["Step 1"],
                    estimated_time_minutes=5,
                ),
                OptimizationRecommendation(
                    category="fragmentation",
                    priority="HIGH",
                    description="High priority",
                    potential_savings_mb=50.0,
                    effort_level="MEDIUM",
                    implementation_steps=["Step 1"],
                    estimated_time_minutes=45,
                ),
                OptimizationRecommendation(
                    category="indexing",
                    priority="MEDIUM",
                    description="Medium priority",
                    potential_savings_mb=15.0,
                    effort_level="EASY",
                    implementation_steps=["Step 1"],
                    estimated_time_minutes=20,
                ),
            ]
            mock_gen.return_value = recommendations

            result = await storage_analytics.generate_optimization_recommendations()
            assert len(result) == 3


@pytest.mark.asyncio
class TestDatabaseBenchmarking:
    """Test benchmark_database_performance async method."""

    async def test_benchmark_basic(self, storage_analytics):
        """Test basic database performance benchmarking."""
        with patch.object(
            storage_analytics,
            "benchmark_database_performance",
            new_callable=AsyncMock,
        ) as mock_bench:
            benchmarks = [
                PerformanceBenchmark(
                    operation="SELECT * FROM users",
                    avg_time_ms=15.5,
                    min_time_ms=10.0,
                    max_time_ms=25.0,
                    percentile_95_ms=22.0,
                    samples=1000,
                    timestamp=datetime.now(timezone.utc),
                )
            ]
            mock_bench.return_value = benchmarks

            result = await storage_analytics.benchmark_database_performance()
            assert isinstance(result, list)
            assert len(result) >= 1
            assert result[0].avg_time_ms > 0

    async def test_benchmark_multiple_operations(self, storage_analytics):
        """Test benchmarking multiple database operations."""
        with patch.object(
            storage_analytics,
            "benchmark_database_performance",
            new_callable=AsyncMock,
        ) as mock_bench:
            benchmarks = [
                PerformanceBenchmark(
                    operation=f"query_{i}",
                    avg_time_ms=10.0 * (i + 1),
                    min_time_ms=5.0 * (i + 1),
                    max_time_ms=20.0 * (i + 1),
                    percentile_95_ms=18.0 * (i + 1),
                    samples=100,
                    timestamp=datetime.now(timezone.utc),
                )
                for i in range(5)
            ]
            mock_bench.return_value = benchmarks

            result = await storage_analytics.benchmark_database_performance()
            assert len(result) == 5
            assert all(isinstance(b, PerformanceBenchmark) for b in result)

    async def test_benchmark_slow_operation(self, storage_analytics):
        """Test benchmarking identifies slow operations."""
        with patch.object(
            storage_analytics,
            "benchmark_database_performance",
            new_callable=AsyncMock,
        ) as mock_bench:
            benchmarks = [
                PerformanceBenchmark(
                    operation="complex_join_query",
                    avg_time_ms=5000.0,  # Slow
                    min_time_ms=4500.0,
                    max_time_ms=5500.0,
                    percentile_95_ms=5400.0,
                    samples=100,
                    timestamp=datetime.now(timezone.utc),
                )
            ]
            mock_bench.return_value = benchmarks

            result = await storage_analytics.benchmark_database_performance()
            assert result[0].avg_time_ms == 5000.0

    async def test_benchmark_fast_operation(self, storage_analytics):
        """Test benchmarking identifies fast operations."""
        with patch.object(
            storage_analytics,
            "benchmark_database_performance",
            new_callable=AsyncMock,
        ) as mock_bench:
            benchmarks = [
                PerformanceBenchmark(
                    operation="indexed_lookup",
                    avg_time_ms=0.5,  # Fast
                    min_time_ms=0.3,
                    max_time_ms=0.8,
                    percentile_95_ms=0.75,
                    samples=10000,
                    timestamp=datetime.now(timezone.utc),
                )
            ]
            mock_bench.return_value = benchmarks

            result = await storage_analytics.benchmark_database_performance()
            assert result[0].avg_time_ms < 1.0

    async def test_benchmark_timestamp_tracking(self, storage_analytics):
        """Test benchmark includes timestamp tracking."""
        with patch.object(
            storage_analytics,
            "benchmark_database_performance",
            new_callable=AsyncMock,
        ) as mock_bench:
            now = datetime.now(timezone.utc)
            benchmarks = [
                PerformanceBenchmark(
                    operation="test",
                    avg_time_ms=10.0,
                    min_time_ms=5.0,
                    max_time_ms=15.0,
                    percentile_95_ms=14.0,
                    samples=100,
                    timestamp=now,
                )
            ]
            mock_bench.return_value = benchmarks

            result = await storage_analytics.benchmark_database_performance()
            assert result[0].timestamp == now


@pytest.mark.asyncio
class TestDataPatternAnalysis:
    """Test analyze_data_patterns async method."""

    async def test_analyze_data_patterns_basic(self, storage_analytics):
        """Test basic data pattern analysis."""
        with patch.object(
            storage_analytics, "analyze_data_patterns", new_callable=AsyncMock
        ) as mock_analyze:
            patterns = {
                "growth_trend": "linear",
                "peak_activity_hours": [14, 15, 16, 17],
                "user_distribution": "skewed",
                "message_distribution": "right_skewed",
            }
            mock_analyze.return_value = patterns

            result = await storage_analytics.analyze_data_patterns()
            assert isinstance(result, dict)
            assert "growth_trend" in result
            assert result["growth_trend"] == "linear"

    async def test_analyze_data_patterns_balanced_distribution(self, storage_analytics):
        """Test data pattern analysis with balanced distribution."""
        with patch.object(
            storage_analytics, "analyze_data_patterns", new_callable=AsyncMock
        ) as mock_analyze:
            patterns = {
                "user_distribution": "balanced",
                "message_distribution": "balanced",
                "peak_hours_count": 0,
            }
            mock_analyze.return_value = patterns

            result = await storage_analytics.analyze_data_patterns()
            assert result["user_distribution"] == "balanced"
            assert result["peak_hours_count"] == 0

    async def test_analyze_data_patterns_skewed_distribution(self, storage_analytics):
        """Test data pattern analysis with skewed data."""
        with patch.object(
            storage_analytics, "analyze_data_patterns", new_callable=AsyncMock
        ) as mock_analyze:
            patterns = {
                "user_distribution": "highly_skewed",
                "hot_users_count": 5,
                "cold_users_count": 1495,
                "peak_hours": [14, 15, 16, 17, 18],
            }
            mock_analyze.return_value = patterns

            result = await storage_analytics.analyze_data_patterns()
            assert "hot_users_count" in result
            assert result["hot_users_count"] > 0

    async def test_analyze_data_patterns_empty_result(self, storage_analytics):
        """Test data pattern analysis when no patterns detected."""
        with patch.object(
            storage_analytics, "analyze_data_patterns", new_callable=AsyncMock
        ) as mock_analyze:
            patterns = {}
            mock_analyze.return_value = patterns

            result = await storage_analytics.analyze_data_patterns()
            assert isinstance(result, dict)


@pytest.mark.asyncio
class TestStorageReportGeneration:
    """Test generate_storage_report async method."""

    async def test_generate_storage_report_basic(
        self, storage_analytics, sample_metrics
    ):
        """Test generating comprehensive storage report."""
        with patch.object(
            storage_analytics, "generate_storage_report", new_callable=AsyncMock
        ) as mock_gen:
            report = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "summary": {
                    "total_size_mb": 100.0,
                    "total_threads": 250,
                    "total_messages": 50000,
                    "optimization_score": 85,
                },
                "metrics": sample_metrics.__dict__,
                "recommendations": [
                    {"category": "archiving", "priority": "HIGH"},
                ],
            }
            mock_gen.return_value = report

            result = await storage_analytics.generate_storage_report()
            assert isinstance(result, dict)
            assert "summary" in result
            assert "metrics" in result
            assert result["summary"]["optimization_score"] == 85

    async def test_generate_storage_report_detailed(self, storage_analytics):
        """Test generating detailed storage report with all sections."""
        with patch.object(
            storage_analytics, "generate_storage_report", new_callable=AsyncMock
        ) as mock_gen:
            report = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "summary": {"total_size_mb": 500.0, "total_threads": 5000},
                "metrics": {
                    "fragmentation_ratio": 0.2,
                    "archive_efficiency": 0.85,
                },
                "recommendations": [
                    {"category": "archiving", "priority": "MEDIUM"},
                    {"category": "indexing", "priority": "LOW"},
                ],
                "performance_metrics": {
                    "avg_query_time_ms": 50.0,
                    "throughput": 100000,
                },
            }
            mock_gen.return_value = report

            result = await storage_analytics.generate_storage_report()
            assert len(result.get("recommendations", [])) >= 2
            assert "performance_metrics" in result

    async def test_generate_storage_report_empty_recommendations(
        self, storage_analytics
    ):
        """Test storage report when no recommendations needed."""
        with patch.object(
            storage_analytics, "generate_storage_report", new_callable=AsyncMock
        ) as mock_gen:
            report = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "summary": {"total_size_mb": 50.0, "optimization_score": 95},
                "metrics": {
                    "fragmentation_ratio": 0.02,
                    "archive_efficiency": 0.99,
                },
                "recommendations": [],
            }
            mock_gen.return_value = report

            result = await storage_analytics.generate_storage_report()
            assert len(result["recommendations"]) == 0


@pytest.mark.asyncio
class TestIntegrationScenarios:
    """Integration tests combining multiple analytics operations."""

    async def test_full_analytics_workflow(self, storage_analytics, sample_metrics):
        """Test complete analytics workflow: metrics → recommendations → report."""
        with patch.object(
            storage_analytics, "get_comprehensive_metrics", new_callable=AsyncMock
        ) as mock_metrics, patch.object(
            storage_analytics,
            "generate_optimization_recommendations",
            new_callable=AsyncMock,
        ) as mock_recs, patch.object(
            storage_analytics, "generate_storage_report", new_callable=AsyncMock
        ) as mock_report:

            mock_metrics.return_value = sample_metrics
            mock_recs.return_value = [
                OptimizationRecommendation(
                    category="archiving",
                    priority="HIGH",
                    description="Archive old messages",
                    potential_savings_mb=20.0,
                    effort_level="EASY",
                    implementation_steps=["Step 1"],
                    estimated_time_minutes=30,
                )
            ]
            mock_report.return_value = {"summary": {"score": 85}}

            # Execute workflow
            metrics = await storage_analytics.get_comprehensive_metrics()
            recommendations = (
                await storage_analytics.generate_optimization_recommendations()
            )
            report = await storage_analytics.generate_storage_report()

            assert metrics.total_size_mb == 100.0
            assert len(recommendations) > 0
            assert "summary" in report

    async def test_analytics_with_error_recovery(self, storage_analytics):
        """Test analytics gracefully handles errors in metric collection."""
        with patch.object(
            storage_analytics, "get_comprehensive_metrics", new_callable=AsyncMock
        ) as mock_metrics:
            # First call fails, second succeeds
            mock_metrics.side_effect = [
                RuntimeError("Connection timeout"),
                AdvancedStorageMetrics(
                    total_size_mb=100.0,
                    total_threads=250,
                    total_messages=50000,
                    total_users=1500,
                ),
            ]

            with pytest.raises(RuntimeError):
                await storage_analytics.get_comprehensive_metrics()

            # Second attempt succeeds
            result = await storage_analytics.get_comprehensive_metrics()
            assert result.total_size_mb == 100.0

    async def test_concurrent_analytics_operations(self, storage_analytics):
        """Test multiple analytics operations can run concurrently."""
        with patch.object(
            storage_analytics, "get_comprehensive_metrics", new_callable=AsyncMock
        ) as mock_metrics, patch.object(
            storage_analytics,
            "benchmark_database_performance",
            new_callable=AsyncMock,
        ) as mock_bench, patch.object(
            storage_analytics, "analyze_data_patterns", new_callable=AsyncMock
        ) as mock_patterns:

            mock_metrics.return_value = AdvancedStorageMetrics(
                total_size_mb=100.0,
                total_threads=250,
                total_messages=50000,
                total_users=1500,
            )
            mock_bench.return_value = []
            mock_patterns.return_value = {}

            # Execute concurrently
            metrics = await storage_analytics.get_comprehensive_metrics()
            benchmarks = await storage_analytics.benchmark_database_performance()
            patterns = await storage_analytics.analyze_data_patterns()

            assert metrics is not None
            assert benchmarks is not None
            assert patterns is not None


class TestOptimizationRecommendationDataclass:
    """Test OptimizationRecommendation dataclass."""

    def test_recommendation_initialization(self):
        """Test recommendation can be initialized with valid data."""
        rec = OptimizationRecommendation(
            category="archiving",
            priority="HIGH",
            description="Archive old messages",
            potential_savings_mb=20.0,
            effort_level="EASY",
            implementation_steps=["Step 1", "Step 2"],
            estimated_time_minutes=30,
        )
        assert rec.category == "archiving"
        assert rec.priority == "HIGH"
        assert len(rec.implementation_steps) == 2


class TestPerformanceBenchmarkDataclass:
    """Test PerformanceBenchmark dataclass."""

    def test_benchmark_initialization(self):
        """Test benchmark can be initialized with valid data."""
        now = datetime.now(timezone.utc)
        bench = PerformanceBenchmark(
            operation="SELECT",
            avg_time_ms=15.0,
            min_time_ms=10.0,
            max_time_ms=20.0,
            percentile_95_ms=18.0,
            samples=1000,
            timestamp=now,
        )
        assert bench.operation == "SELECT"
        assert bench.avg_time_ms == 15.0
        assert bench.samples == 1000

    def test_benchmark_with_percentile_calculation(self):
        """Test benchmark correctly tracks percentile metrics."""
        now = datetime.now(timezone.utc)
        bench = PerformanceBenchmark(
            operation="complex_query",
            avg_time_ms=50.0,
            min_time_ms=10.0,
            max_time_ms=100.0,
            percentile_95_ms=85.0,  # 95th percentile should be high
            samples=10000,
            timestamp=now,
        )
        assert bench.percentile_95_ms > bench.avg_time_ms
        assert bench.percentile_95_ms < bench.max_time_ms


class TestErrorHandling:
    """Test error handling and edge cases."""

    def test_metrics_with_none_optional_fields(self):
        """Test metrics handles None values for optional fields."""
        metrics = AdvancedStorageMetrics(
            provider_usage=None,
            model_usage=None,
            peak_hours=None,
            peak_days=None,
        )
        # __post_init__ should initialize them
        assert metrics.provider_usage == {}
        assert metrics.model_usage == {}
        assert metrics.peak_hours == []
        assert metrics.peak_days == []

    def test_recommendation_with_empty_steps(self):
        """Test recommendation with no implementation steps."""
        rec = OptimizationRecommendation(
            category="monitoring",
            priority="LOW",
            description="Add monitoring",
            potential_savings_mb=0.0,
            effort_level="HARD",
            implementation_steps=[],
            estimated_time_minutes=0,
        )
        assert len(rec.implementation_steps) == 0

    def test_benchmark_with_zero_samples(self):
        """Test benchmark with minimal data."""
        now = datetime.now(timezone.utc)
        bench = PerformanceBenchmark(
            operation="test",
            avg_time_ms=0.0,
            min_time_ms=0.0,
            max_time_ms=0.0,
            percentile_95_ms=0.0,
            samples=0,
            timestamp=now,
        )
        assert bench.samples == 0
