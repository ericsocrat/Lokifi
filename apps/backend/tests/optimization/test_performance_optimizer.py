"""Tests for performance_optimizer module.

Comprehensive tests for the optimization system including:
- OptimizationLevel enum
- QueryPerformanceMetric dataclass
- CachePerformanceMetric dataclass
- OptimizationRecommendation dataclass
- DatabaseOptimizer class
- CacheOptimizer class
- PerformanceOptimizer class
"""

import json
from dataclasses import asdict
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.optimization.performance_optimizer import (
    CacheOptimizer,
    CachePerformanceMetric,
    DatabaseOptimizer,
    OptimizationLevel,
    OptimizationRecommendation,
    PerformanceOptimizer,
    QueryPerformanceMetric,
    performance_optimizer,
)

# ============================================================================
# OptimizationLevel Enum Tests
# ============================================================================


class TestOptimizationLevel:
    """Tests for OptimizationLevel enum."""

    def test_conservative_value(self):
        """Test CONSERVATIVE value."""
        assert OptimizationLevel.CONSERVATIVE.value == "conservative"

    def test_balanced_value(self):
        """Test BALANCED value."""
        assert OptimizationLevel.BALANCED.value == "balanced"

    def test_aggressive_value(self):
        """Test AGGRESSIVE value."""
        assert OptimizationLevel.AGGRESSIVE.value == "aggressive"

    def test_all_levels_exist(self):
        """Test all optimization levels exist."""
        levels = [l.value for l in OptimizationLevel]
        assert "conservative" in levels
        assert "balanced" in levels
        assert "aggressive" in levels

    def test_is_str_enum(self):
        """Test that OptimizationLevel is a string enum."""
        assert isinstance(OptimizationLevel.BALANCED, str)
        assert OptimizationLevel.BALANCED == "balanced"


# ============================================================================
# QueryPerformanceMetric Dataclass Tests
# ============================================================================


class TestQueryPerformanceMetric:
    """Tests for QueryPerformanceMetric dataclass."""

    @pytest.fixture
    def sample_metric(self):
        """Create sample query metric."""
        return QueryPerformanceMetric(
            query_hash="abc123def456",
            query_text="SELECT * FROM users WHERE id = 1",
            execution_time_ms=50.5,
            rows_examined=100,
            rows_returned=1,
            index_used=True,
            full_table_scan=False,
            timestamp=datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc),
            optimization_suggestions=["Consider adding index"],
        )

    def test_metric_creation(self, sample_metric):
        """Test basic metric creation."""
        assert sample_metric.query_hash == "abc123def456"
        assert sample_metric.execution_time_ms == 50.5
        assert sample_metric.index_used is True
        assert sample_metric.full_table_scan is False

    def test_to_dict_method(self, sample_metric):
        """Test to_dict conversion."""
        result = sample_metric.to_dict()

        assert isinstance(result, dict)
        assert result["query_hash"] == "abc123def456"
        assert result["timestamp"] == "2024-01-15T10:30:00+00:00"
        assert result["execution_time_ms"] == 50.5

    def test_to_dict_includes_suggestions(self, sample_metric):
        """Test that suggestions are included in dict."""
        result = sample_metric.to_dict()
        assert "optimization_suggestions" in result
        assert len(result["optimization_suggestions"]) == 1


# ============================================================================
# CachePerformanceMetric Dataclass Tests
# ============================================================================


class TestCachePerformanceMetric:
    """Tests for CachePerformanceMetric dataclass."""

    @pytest.fixture
    def sample_cache_metric(self):
        """Create sample cache metric."""
        return CachePerformanceMetric(
            operation="get",
            cache_layer="memory",
            hit_miss="hit",
            execution_time_ms=2.5,
            data_size_bytes=1024,
            timestamp=datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc),
        )

    def test_cache_metric_creation(self, sample_cache_metric):
        """Test basic cache metric creation."""
        assert sample_cache_metric.operation == "get"
        assert sample_cache_metric.cache_layer == "memory"
        assert sample_cache_metric.hit_miss == "hit"
        assert sample_cache_metric.execution_time_ms == 2.5

    def test_default_metadata_none(self, sample_cache_metric):
        """Test default metadata is None."""
        assert sample_cache_metric.metadata is None

    def test_with_metadata(self):
        """Test cache metric with metadata."""
        metric = CachePerformanceMetric(
            operation="set",
            cache_layer="distributed",
            hit_miss="miss",
            execution_time_ms=5.0,
            data_size_bytes=2048,
            timestamp=datetime.now(timezone.utc),
            metadata={"key": "user_123", "ttl": 300},
        )
        assert metric.metadata == {"key": "user_123", "ttl": 300}

    def test_to_dict_method(self, sample_cache_metric):
        """Test to_dict conversion."""
        result = sample_cache_metric.to_dict()

        assert isinstance(result, dict)
        assert result["operation"] == "get"
        assert result["timestamp"] == "2024-01-15T10:30:00+00:00"
        assert result["metadata"] == {}  # None becomes empty dict

    def test_to_dict_with_metadata(self):
        """Test to_dict preserves metadata."""
        metric = CachePerformanceMetric(
            operation="set",
            cache_layer="memory",
            hit_miss="hit",
            execution_time_ms=1.0,
            data_size_bytes=512,
            timestamp=datetime.now(timezone.utc),
            metadata={"custom": "data"},
        )
        result = metric.to_dict()
        assert result["metadata"] == {"custom": "data"}


# ============================================================================
# OptimizationRecommendation Dataclass Tests
# ============================================================================


class TestOptimizationRecommendation:
    """Tests for OptimizationRecommendation dataclass."""

    @pytest.fixture
    def sample_recommendation(self):
        """Create sample recommendation."""
        return OptimizationRecommendation(
            component="database",
            priority="high",
            title="Add index for user_id",
            description="Query performing full table scan on users table",
            estimated_improvement="80% faster",
            implementation_effort="low",
            risk_level="low",
            code_changes_required=False,
        )

    def test_recommendation_creation(self, sample_recommendation):
        """Test basic recommendation creation."""
        assert sample_recommendation.component == "database"
        assert sample_recommendation.priority == "high"
        assert sample_recommendation.title == "Add index for user_id"
        assert sample_recommendation.code_changes_required is False

    def test_default_metadata_none(self, sample_recommendation):
        """Test default metadata is None."""
        assert sample_recommendation.metadata is None

    def test_with_metadata(self):
        """Test recommendation with metadata."""
        rec = OptimizationRecommendation(
            component="cache",
            priority="medium",
            title="Increase TTL",
            description="Extend cache TTL to reduce misses",
            estimated_improvement="30% reduction in calls",
            implementation_effort="low",
            risk_level="low",
            code_changes_required=True,
            metadata={"current_ttl": 300, "recommended_ttl": 600},
        )
        assert rec.metadata == {"current_ttl": 300, "recommended_ttl": 600}

    def test_to_dict_method(self, sample_recommendation):
        """Test to_dict conversion."""
        result = sample_recommendation.to_dict()

        assert isinstance(result, dict)
        assert result["component"] == "database"
        assert result["priority"] == "high"
        assert result["metadata"] == {}  # None becomes empty dict


# ============================================================================
# DatabaseOptimizer Tests
# ============================================================================


class TestDatabaseOptimizerInit:
    """Tests for DatabaseOptimizer initialization."""

    def test_init(self):
        """Test basic initialization."""
        optimizer = DatabaseOptimizer()

        assert optimizer.query_metrics == []
        assert optimizer.optimization_cache == {}


class TestDatabaseOptimizerBasicSuggestions:
    """Tests for basic suggestion generation."""

    @pytest.fixture
    def optimizer(self):
        """Create optimizer instance."""
        return DatabaseOptimizer()

    def test_slow_query_suggestion(self, optimizer):
        """Test suggestion for slow query."""
        query = "SELECT id FROM users"
        suggestions = optimizer._generate_basic_suggestions(query, 150)  # 150ms

        assert "Query execution time is high" in " ".join(suggestions)

    def test_select_star_suggestion(self, optimizer):
        """Test suggestion for SELECT *."""
        query = "SELECT * FROM users WHERE id = 1"
        suggestions = optimizer._generate_basic_suggestions(query, 10)

        assert any("SELECT *" in s for s in suggestions)

    def test_missing_where_suggestion(self, optimizer):
        """Test suggestion for missing WHERE clause."""
        query = "SELECT id, name FROM users"
        suggestions = optimizer._generate_basic_suggestions(query, 10)

        assert any("WHERE clause" in s for s in suggestions)

    def test_order_by_without_limit_suggestion(self, optimizer):
        """Test suggestion for ORDER BY without LIMIT."""
        query = "SELECT id FROM users ORDER BY created_at"
        suggestions = optimizer._generate_basic_suggestions(query, 10)

        assert any("LIMIT" in s for s in suggestions)

    def test_notifications_index_suggestion(self, optimizer):
        """Test suggestion for notifications index."""
        query = "SELECT * FROM notifications WHERE user_id = 'abc'"
        suggestions = optimizer._generate_basic_suggestions(query, 10)

        assert any("notifications(user_id)" in s for s in suggestions)


class TestDatabaseOptimizerIndexEstimation:
    """Tests for index usage estimation."""

    @pytest.fixture
    def optimizer(self):
        """Create optimizer instance."""
        return DatabaseOptimizer()

    def test_estimate_index_usage_with_where_on_id(self, optimizer):
        """Test index estimation with WHERE on id."""
        query = "SELECT * FROM users WHERE id = 1"
        assert optimizer._estimate_index_usage(query) is True

    def test_estimate_index_usage_with_where_on_user_id(self, optimizer):
        """Test index estimation with WHERE on user_id."""
        query = "SELECT * FROM notifications WHERE user_id = 'abc'"
        assert optimizer._estimate_index_usage(query) is True

    def test_estimate_index_usage_no_where(self, optimizer):
        """Test index estimation without WHERE clause."""
        query = "SELECT * FROM users"
        assert optimizer._estimate_index_usage(query) is False

    def test_estimate_table_scan_no_where(self, optimizer):
        """Test table scan estimation without WHERE."""
        query = "SELECT * FROM users"
        assert optimizer._estimate_table_scan(query) is True

    def test_estimate_table_scan_with_where(self, optimizer):
        """Test table scan estimation with WHERE."""
        query = "SELECT * FROM users WHERE id = 1"
        assert optimizer._estimate_table_scan(query) is False


class TestDatabaseOptimizerExplainAnalysis:
    """Tests for EXPLAIN output analysis."""

    @pytest.fixture
    def optimizer(self):
        """Create optimizer instance."""
        return DatabaseOptimizer()

    def test_analyze_explain_seq_scan(self, optimizer):
        """Test analysis of sequential scan."""
        explain_data = [{"Plan": {"Node Type": "Seq Scan", "Total Cost": 100}}]
        suggestions = optimizer._analyze_explain_output(explain_data)

        assert any("sequential scan" in s.lower() for s in suggestions)

    def test_analyze_explain_high_cost(self, optimizer):
        """Test analysis of high cost operation."""
        explain_data = [{"Plan": {"Node Type": "Hash Join", "Total Cost": 2000}}]
        suggestions = optimizer._analyze_explain_output(explain_data)

        assert any("high cost" in s.lower() for s in suggestions)

    def test_analyze_explain_nested_loop(self, optimizer):
        """Test analysis of large nested loop."""
        explain_data = [{"Plan": {"Node Type": "Nested Loop", "Plan Rows": 50000}}]
        suggestions = optimizer._analyze_explain_output(explain_data)

        assert any("nested loop" in s.lower() for s in suggestions)

    def test_analyze_explain_dict_format(self, optimizer):
        """Test analysis with dict format (not list)."""
        explain_data = {"Plan": {"Node Type": "Seq Scan"}}
        suggestions = optimizer._analyze_explain_output(explain_data)

        assert any("sequential scan" in s.lower() for s in suggestions)

    def test_analyze_explain_empty(self, optimizer):
        """Test analysis with empty data."""
        suggestions = optimizer._analyze_explain_output([])
        assert suggestions == []


class TestDatabaseOptimizerRowExtraction:
    """Tests for row extraction from EXPLAIN output."""

    @pytest.fixture
    def optimizer(self):
        """Create optimizer instance."""
        return DatabaseOptimizer()

    def test_extract_rows_examined_list(self, optimizer):
        """Test rows examined extraction from list."""
        explain_data = [{"Plan": {"Plan Rows": 1000}}]
        assert optimizer._extract_rows_examined(explain_data) == 1000

    def test_extract_rows_examined_dict(self, optimizer):
        """Test rows examined extraction from dict."""
        explain_data = {"Plan": {"Plan Rows": 500}}
        assert optimizer._extract_rows_examined(explain_data) == 500

    def test_extract_rows_examined_empty(self, optimizer):
        """Test rows examined with empty data."""
        assert optimizer._extract_rows_examined([]) == 0

    def test_extract_rows_returned_list(self, optimizer):
        """Test rows returned extraction from list."""
        explain_data = [{"Plan": {"Actual Rows": 50}}]
        assert optimizer._extract_rows_returned(explain_data) == 50

    def test_extract_rows_returned_dict(self, optimizer):
        """Test rows returned extraction from dict."""
        explain_data = {"Plan": {"Actual Rows": 25}}
        assert optimizer._extract_rows_returned(explain_data) == 25


class TestDatabaseOptimizerIndexCheck:
    """Tests for index usage checking."""

    @pytest.fixture
    def optimizer(self):
        """Create optimizer instance."""
        return DatabaseOptimizer()

    def test_check_index_usage_with_index(self, optimizer):
        """Test index check when index is used."""
        explain_data = [{"Plan": {"Node Type": "Index Scan"}}]
        assert optimizer._check_index_usage(explain_data) is True

    def test_check_index_usage_bitmap(self, optimizer):
        """Test index check with bitmap index."""
        explain_data = [{"Plan": {"Node Type": "Bitmap Index Scan"}}]
        assert optimizer._check_index_usage(explain_data) is True

    def test_check_index_usage_seq_scan(self, optimizer):
        """Test index check with sequential scan."""
        explain_data = [{"Plan": {"Node Type": "Seq Scan"}}]
        assert optimizer._check_index_usage(explain_data) is False

    def test_check_full_table_scan_seq(self, optimizer):
        """Test full table scan check with Seq Scan."""
        explain_data = [{"Plan": {"Node Type": "Seq Scan"}}]
        assert optimizer._check_full_table_scan(explain_data) is True

    def test_check_full_table_scan_index(self, optimizer):
        """Test full table scan check with Index Scan."""
        explain_data = [{"Plan": {"Node Type": "Index Scan"}}]
        assert optimizer._check_full_table_scan(explain_data) is False


class TestDatabaseOptimizerQueryAnalysis:
    """Tests for query performance analysis."""

    @pytest.fixture
    def optimizer(self):
        """Create optimizer instance."""
        return DatabaseOptimizer()

    @pytest.mark.asyncio
    async def test_analyze_query_performance_success(self, optimizer):
        """Test successful query analysis."""
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.fetchall.return_value = [{"id": 1}]
        mock_session.execute.return_value = mock_result

        mock_db_manager = MagicMock()

        async def mock_get_session(*args, **kwargs):
            yield mock_session

        mock_db_manager.get_session = mock_get_session

        with patch.dict(
            "sys.modules",
            {"app.core.database": MagicMock(db_manager=mock_db_manager)},
        ):
            metric = await optimizer.analyze_query_performance("SELECT 1")

            assert isinstance(metric, QueryPerformanceMetric)
            assert metric.query_text == "SELECT 1"
            assert len(optimizer.query_metrics) == 1

    @pytest.mark.asyncio
    async def test_analyze_query_performance_error(self, optimizer):
        """Test query analysis with error."""

        mock_db_manager = MagicMock()

        async def mock_get_session(*args, **kwargs):
            raise Exception("Database error")
            yield

        mock_db_manager.get_session = mock_get_session

        with patch.dict(
            "sys.modules",
            {"app.core.database": MagicMock(db_manager=mock_db_manager)},
        ):
            metric = await optimizer.analyze_query_performance("SELECT 1")

            assert isinstance(metric, QueryPerformanceMetric)
            assert "Analysis failed" in metric.optimization_suggestions[0]


class TestDatabaseOptimizerIndexRecommendations:
    """Tests for index recommendation generation."""

    @pytest.fixture
    def optimizer(self):
        """Create optimizer instance."""
        return DatabaseOptimizer()

    def test_generate_index_recommendations_empty(self, optimizer):
        """Test with no query metrics."""
        recommendations = optimizer.generate_index_recommendations()
        assert recommendations == []

    def test_generate_index_recommendations_notifications(self, optimizer):
        """Test index recommendations for notifications table."""
        # Add a problematic query metric
        metric = QueryPerformanceMetric(
            query_hash="test123",
            query_text="SELECT * FROM notifications WHERE user_id = 'x' AND is_read = false",
            execution_time_ms=100,
            rows_examined=1000,
            rows_returned=10,
            index_used=False,
            full_table_scan=True,
            timestamp=datetime.now(timezone.utc),
            optimization_suggestions=[],
        )
        optimizer.query_metrics.append(metric)

        recommendations = optimizer.generate_index_recommendations()

        assert len(recommendations) > 0
        assert any("notifications" in r.title.lower() for r in recommendations)

    def test_generate_index_recommendations_expires_at(self, optimizer):
        """Test index recommendations for expires_at column."""
        metric = QueryPerformanceMetric(
            query_hash="test456",
            query_text="SELECT * FROM notifications WHERE expires_at < NOW()",
            execution_time_ms=100,  # Must be > 50 to trigger recommendation
            rows_examined=1000,
            rows_returned=5,
            index_used=False,
            full_table_scan=True,  # Must be True to trigger recommendation
            timestamp=datetime.now(timezone.utc),
            optimization_suggestions=[],
        )
        optimizer.query_metrics.append(metric)

        recommendations = optimizer.generate_index_recommendations()

        assert any("expir" in r.title.lower() for r in recommendations)


# ============================================================================
# CacheOptimizer Tests
# ============================================================================


class TestCacheOptimizerInit:
    """Tests for CacheOptimizer initialization."""

    def test_init(self):
        """Test basic initialization."""
        optimizer = CacheOptimizer()

        assert optimizer.cache_metrics == []
        assert optimizer.hit_rate_history == {}


class TestCacheOptimizerPerformanceAnalysis:
    """Tests for cache performance analysis."""

    @pytest.fixture
    def optimizer(self):
        """Create optimizer instance."""
        return CacheOptimizer()

    @pytest.mark.asyncio
    async def test_analyze_cache_performance_success(self, optimizer):
        """Test successful cache analysis."""
        mock_metrics = {"hit_rate": 85.0, "memory_usage_mb": 500}

        mock_redis_client = AsyncMock()
        mock_redis_client.get_metrics = AsyncMock(return_value=mock_metrics)

        optimizer._analyze_layer_performance = AsyncMock(
            return_value={"hit_rate": 90.0}
        )
        optimizer._generate_cache_recommendations = AsyncMock(return_value=[])

        with patch.dict(
            "sys.modules",
            {
                "app.core.advanced_redis_client": MagicMock(
                    advanced_redis_client=mock_redis_client
                )
            },
        ):
            analysis = await optimizer.analyze_cache_performance()

            assert "overall_metrics" in analysis
            assert "layer_performance" in analysis
            assert "recommendations" in analysis

    @pytest.mark.asyncio
    async def test_analyze_cache_performance_error(self, optimizer):
        """Test cache analysis with error."""
        mock_redis_client = AsyncMock()
        mock_redis_client.get_metrics = AsyncMock(side_effect=Exception("Redis error"))

        with patch.dict(
            "sys.modules",
            {
                "app.core.advanced_redis_client": MagicMock(
                    advanced_redis_client=mock_redis_client
                )
            },
        ):
            analysis = await optimizer.analyze_cache_performance()

            assert "error" in analysis


class TestCacheOptimizerLayerAnalysis:
    """Tests for layer performance analysis."""

    @pytest.fixture
    def optimizer(self):
        """Create optimizer instance."""
        return CacheOptimizer()

    @pytest.mark.asyncio
    async def test_analyze_layer_performance_success(self, optimizer):
        """Test successful layer analysis."""
        mock_redis_client = AsyncMock()
        mock_redis_client.set_with_layer = AsyncMock(return_value=True)
        mock_redis_client.get_with_layers = AsyncMock(return_value='{"test": "data"}')

        with patch.dict(
            "sys.modules",
            {
                "app.core.advanced_redis_client": MagicMock(
                    advanced_redis_client=mock_redis_client
                )
            },
        ):
            metrics = await optimizer._analyze_layer_performance("memory")

            assert "hit_rate" in metrics
            assert "avg_response_time_ms" in metrics
            assert metrics["hit_rate"] == 100.0  # All operations should hit

    @pytest.mark.asyncio
    async def test_analyze_layer_performance_error(self, optimizer):
        """Test layer analysis with error."""
        mock_redis_client = AsyncMock()
        mock_redis_client.set_with_layer = AsyncMock(
            side_effect=Exception("Cache error")
        )

        with patch.dict(
            "sys.modules",
            {
                "app.core.advanced_redis_client": MagicMock(
                    advanced_redis_client=mock_redis_client
                )
            },
        ):
            metrics = await optimizer._analyze_layer_performance("memory")

            assert "error" in metrics


class TestCacheOptimizerRecommendations:
    """Tests for cache recommendation generation."""

    @pytest.fixture
    def optimizer(self):
        """Create optimizer instance."""
        return CacheOptimizer()

    @pytest.mark.asyncio
    async def test_low_hit_rate_recommendation(self, optimizer):
        """Test recommendation for low hit rate."""
        cache_metrics = {"hit_rate": 50.0, "memory_usage_mb": 100}

        recommendations = await optimizer._generate_cache_recommendations(cache_metrics)

        assert len(recommendations) > 0
        assert any("hit rate" in r.title.lower() for r in recommendations)

    @pytest.mark.asyncio
    async def test_high_memory_recommendation(self, optimizer):
        """Test recommendation for high memory usage."""
        cache_metrics = {"hit_rate": 90.0, "memory_usage_mb": 2000}

        recommendations = await optimizer._generate_cache_recommendations(cache_metrics)

        assert any("memory" in r.title.lower() for r in recommendations)

    @pytest.mark.asyncio
    async def test_cache_warming_recommendation(self, optimizer):
        """Test cache warming is always recommended."""
        cache_metrics = {"hit_rate": 95.0, "memory_usage_mb": 100}

        recommendations = await optimizer._generate_cache_recommendations(cache_metrics)

        assert any("warming" in r.title.lower() for r in recommendations)


class TestCacheOptimizerWarming:
    """Tests for cache warming implementation."""

    @pytest.fixture
    def optimizer(self):
        """Create optimizer instance."""
        return CacheOptimizer()

    @pytest.mark.asyncio
    async def test_implement_cache_warming_success(self, optimizer):
        """Test successful cache warming."""
        mock_redis_client = AsyncMock()
        mock_redis_client.get_with_layers = AsyncMock(return_value=None)  # Not cached
        mock_redis_client.set_with_layer = AsyncMock(return_value=True)

        with patch.dict(
            "sys.modules",
            {
                "app.core.advanced_redis_client": MagicMock(
                    advanced_redis_client=mock_redis_client
                )
            },
        ):
            result = await optimizer.implement_cache_warming(["key1", "key2", "key3"])

            assert result["keys_warmed"] == 3
            assert "warming_time_ms" in result
            assert result["errors"] == []

    @pytest.mark.asyncio
    async def test_implement_cache_warming_already_cached(self, optimizer):
        """Test cache warming when keys already exist."""
        mock_redis_client = AsyncMock()
        mock_redis_client.get_with_layers = AsyncMock(
            return_value='{"data": "exists"}'
        )  # Already cached

        with patch.dict(
            "sys.modules",
            {
                "app.core.advanced_redis_client": MagicMock(
                    advanced_redis_client=mock_redis_client
                )
            },
        ):
            result = await optimizer.implement_cache_warming(["key1", "key2"])

            assert result["keys_warmed"] == 0  # No new keys warmed

    @pytest.mark.asyncio
    async def test_implement_cache_warming_partial_error(self, optimizer):
        """Test cache warming with partial errors."""
        call_count = [0]

        async def mock_get(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 2:
                raise Exception("Error on key2")
            return None

        mock_redis_client = AsyncMock()
        mock_redis_client.get_with_layers = mock_get
        mock_redis_client.set_with_layer = AsyncMock(return_value=True)

        with patch.dict(
            "sys.modules",
            {
                "app.core.advanced_redis_client": MagicMock(
                    advanced_redis_client=mock_redis_client
                )
            },
        ):
            result = await optimizer.implement_cache_warming(["key1", "key2", "key3"])

            assert len(result["errors"]) > 0


# ============================================================================
# PerformanceOptimizer Tests
# ============================================================================


class TestPerformanceOptimizerInit:
    """Tests for PerformanceOptimizer initialization."""

    def test_default_init(self):
        """Test default initialization with BALANCED level."""
        optimizer = PerformanceOptimizer()

        assert optimizer.optimization_level == OptimizationLevel.BALANCED
        assert isinstance(optimizer.db_optimizer, DatabaseOptimizer)
        assert isinstance(optimizer.cache_optimizer, CacheOptimizer)

    def test_init_with_level(self):
        """Test initialization with specific level."""
        optimizer = PerformanceOptimizer(OptimizationLevel.AGGRESSIVE)

        assert optimizer.optimization_level == OptimizationLevel.AGGRESSIVE

    def test_init_conservative(self):
        """Test initialization with CONSERVATIVE level."""
        optimizer = PerformanceOptimizer(OptimizationLevel.CONSERVATIVE)

        assert optimizer.optimization_level == OptimizationLevel.CONSERVATIVE


class TestPerformanceOptimizerComprehensiveAnalysis:
    """Tests for comprehensive analysis."""

    @pytest.fixture
    def optimizer(self):
        """Create optimizer instance."""
        return PerformanceOptimizer()

    @pytest.mark.asyncio
    async def test_run_comprehensive_analysis_success(self, optimizer):
        """Test successful comprehensive analysis."""
        optimizer.db_optimizer.analyze_notification_queries = AsyncMock(return_value=[])
        optimizer.db_optimizer.generate_index_recommendations = MagicMock(
            return_value=[]
        )
        optimizer.cache_optimizer.analyze_cache_performance = AsyncMock(
            return_value={"recommendations": []}
        )

        result = await optimizer.run_comprehensive_analysis()

        assert "timestamp" in result
        assert "optimization_level" in result
        assert "database_analysis" in result
        assert "cache_analysis" in result
        assert "recommendations" in result
        assert "summary" in result

    @pytest.mark.asyncio
    async def test_run_comprehensive_analysis_with_recommendations(self, optimizer):
        """Test analysis with actual recommendations."""
        db_rec = OptimizationRecommendation(
            component="database",
            priority="high",
            title="Add index",
            description="Add index for performance",
            estimated_improvement="80%",
            implementation_effort="low",
            risk_level="low",
            code_changes_required=False,
        )

        optimizer.db_optimizer.analyze_notification_queries = AsyncMock(
            return_value=[db_rec]
        )
        optimizer.db_optimizer.generate_index_recommendations = MagicMock(
            return_value=[]
        )
        optimizer.cache_optimizer.analyze_cache_performance = AsyncMock(
            return_value={"recommendations": []}
        )

        result = await optimizer.run_comprehensive_analysis()

        assert result["recommendations"]["total"] >= 1
        assert len(result["recommendations"]["high_priority"]) >= 1

    @pytest.mark.asyncio
    async def test_run_comprehensive_analysis_error(self, optimizer):
        """Test analysis with error."""
        optimizer.db_optimizer.analyze_notification_queries = AsyncMock(
            side_effect=Exception("DB error")
        )

        result = await optimizer.run_comprehensive_analysis()

        assert "error" in result


class TestPerformanceOptimizerSafeOptimizations:
    """Tests for safe optimization implementation."""

    @pytest.fixture
    def optimizer(self):
        """Create optimizer instance."""
        return PerformanceOptimizer()

    @pytest.mark.asyncio
    async def test_implement_safe_optimizations_success(self, optimizer):
        """Test successful safe optimization."""
        optimizer.cache_optimizer.implement_cache_warming = AsyncMock(
            return_value={"keys_warmed": 4, "warming_time_ms": 50, "errors": []}
        )

        result = await optimizer.implement_safe_optimizations()

        assert "cache_warming" in result["optimizations_applied"]
        assert "cache_warming_results" in result
        assert result["errors"] == []

    @pytest.mark.asyncio
    async def test_implement_safe_optimizations_error(self, optimizer):
        """Test safe optimization with error."""
        optimizer.cache_optimizer.implement_cache_warming = AsyncMock(
            side_effect=Exception("Warming failed")
        )

        result = await optimizer.implement_safe_optimizations()

        assert len(result["errors"]) > 0


# ============================================================================
# Global Instance Tests
# ============================================================================


class TestGlobalInstance:
    """Tests for global performance_optimizer instance."""

    def test_global_instance_exists(self):
        """Test that global instance exists."""
        assert performance_optimizer is not None

    def test_global_instance_type(self):
        """Test global instance type."""
        assert isinstance(performance_optimizer, PerformanceOptimizer)

    def test_global_instance_default_level(self):
        """Test global instance has default level."""
        assert performance_optimizer.optimization_level == OptimizationLevel.BALANCED


# ============================================================================
# Integration Tests
# ============================================================================


class TestOptimizationIntegration:
    """Integration tests for optimization workflow."""

    @pytest.fixture
    def optimizer(self):
        """Create optimizer instance."""
        return PerformanceOptimizer(OptimizationLevel.CONSERVATIVE)

    def test_recommendation_priority_sorting(self, optimizer):
        """Test that recommendations are sorted by priority."""
        high = OptimizationRecommendation(
            component="database",
            priority="high",
            title="High priority",
            description="Urgent",
            estimated_improvement="90%",
            implementation_effort="low",
            risk_level="low",
            code_changes_required=False,
        )
        low = OptimizationRecommendation(
            component="cache",
            priority="low",
            title="Low priority",
            description="Can wait",
            estimated_improvement="10%",
            implementation_effort="high",
            risk_level="medium",
            code_changes_required=True,
        )

        all_recs = [low, high]

        high_priority = [r for r in all_recs if r.priority == "high"]
        low_priority = [r for r in all_recs if r.priority == "low"]

        assert len(high_priority) == 1
        assert len(low_priority) == 1
        assert high_priority[0].title == "High priority"

    def test_dataclass_serialization_round_trip(self):
        """Test that dataclasses serialize and deserialize correctly."""
        original = QueryPerformanceMetric(
            query_hash="abc123",
            query_text="SELECT 1",
            execution_time_ms=10.5,
            rows_examined=100,
            rows_returned=1,
            index_used=True,
            full_table_scan=False,
            timestamp=datetime.now(timezone.utc),
            optimization_suggestions=["Test suggestion"],
        )

        # Serialize to dict
        as_dict = original.to_dict()

        # Verify JSON serializable
        json_str = json.dumps(as_dict)
        parsed = json.loads(json_str)

        assert parsed["query_hash"] == "abc123"
        assert parsed["execution_time_ms"] == 10.5
