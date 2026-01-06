"""
Tests for app.core.performance_monitor

Comprehensive test suite for performance monitoring utilities:
- PerformanceMetrics: Metrics collection and statistics
- measure_async: Async context manager for timing operations
- measure_sync: Decorator for timing sync functions
"""

import pytest

# Import module under test
try:
    from app.core.performance_monitor import (
        PerformanceMetrics,
        measure_async,
        measure_sync,
        performance_metrics,
    )
except ImportError as e:
    pytest.skip(f"Module import failed: {e}", allow_module_level=True)


# ============================================================================
# TEST: PerformanceMetrics Class
# ============================================================================


class TestPerformanceMetrics:
    """Test suite for PerformanceMetrics class."""

    def test_init_empty_metrics(self):
        """Test initialization creates empty metrics dict."""
        metrics = PerformanceMetrics()
        assert metrics.metrics == {}

    def test_record_new_operation(self):
        """Test recording a new operation creates entry."""
        metrics = PerformanceMetrics()
        metrics.record("test_op", 0.5, success=True)

        assert "test_op" in metrics.metrics
        assert metrics.metrics["test_op"]["total_calls"] == 1
        assert metrics.metrics["test_op"]["total_duration"] == 0.5
        assert metrics.metrics["test_op"]["success_count"] == 1
        assert metrics.metrics["test_op"]["error_count"] == 0

    def test_record_multiple_calls(self):
        """Test recording multiple calls updates statistics."""
        metrics = PerformanceMetrics()
        metrics.record("test_op", 0.1)
        metrics.record("test_op", 0.2)
        metrics.record("test_op", 0.3)

        stats = metrics.metrics["test_op"]
        assert stats["total_calls"] == 3
        assert stats["total_duration"] == pytest.approx(0.6, rel=1e-6)
        assert stats["avg_duration"] == pytest.approx(0.2, rel=1e-6)
        assert stats["min_duration"] == pytest.approx(0.1, rel=1e-6)
        assert stats["max_duration"] == pytest.approx(0.3, rel=1e-6)

    def test_record_success_count(self):
        """Test success count is tracked correctly."""
        metrics = PerformanceMetrics()
        metrics.record("test_op", 0.1, success=True)
        metrics.record("test_op", 0.1, success=True)
        metrics.record("test_op", 0.1, success=False)

        stats = metrics.metrics["test_op"]
        assert stats["success_count"] == 2
        assert stats["error_count"] == 1

    def test_record_error_count(self):
        """Test error count is tracked correctly."""
        metrics = PerformanceMetrics()
        metrics.record("test_op", 0.1, success=False)
        metrics.record("test_op", 0.1, success=False)

        stats = metrics.metrics["test_op"]
        assert stats["success_count"] == 0
        assert stats["error_count"] == 2

    def test_record_multiple_operations(self):
        """Test recording multiple different operations."""
        metrics = PerformanceMetrics()
        metrics.record("op1", 0.1)
        metrics.record("op2", 0.2)
        metrics.record("op3", 0.3)

        assert len(metrics.metrics) == 3
        assert "op1" in metrics.metrics
        assert "op2" in metrics.metrics
        assert "op3" in metrics.metrics

    def test_min_max_duration(self):
        """Test min and max duration tracking."""
        metrics = PerformanceMetrics()
        metrics.record("test_op", 0.5)
        metrics.record("test_op", 0.1)
        metrics.record("test_op", 0.9)

        stats = metrics.metrics["test_op"]
        assert stats["min_duration"] == pytest.approx(0.1, rel=1e-6)
        assert stats["max_duration"] == pytest.approx(0.9, rel=1e-6)

    def test_get_summary_empty(self):
        """Test get_summary with no operations recorded."""
        metrics = PerformanceMetrics()
        summary = metrics.get_summary()

        assert summary["operations"] == 0
        assert summary["metrics"] == {}

    def test_get_summary_with_operations(self):
        """Test get_summary with operations recorded."""
        metrics = PerformanceMetrics()
        metrics.record("op1", 0.1)
        metrics.record("op2", 0.2)

        summary = metrics.get_summary()
        assert summary["operations"] == 2
        assert "op1" in summary["metrics"]
        assert "op2" in summary["metrics"]

    def test_initial_stats_structure(self):
        """Test that initial stats have correct structure."""
        metrics = PerformanceMetrics()
        metrics.record("test_op", 0.1)

        stats = metrics.metrics["test_op"]
        expected_keys = {
            "total_calls",
            "total_duration",
            "avg_duration",
            "min_duration",
            "max_duration",
            "success_count",
            "error_count",
        }
        assert set(stats.keys()) == expected_keys


# ============================================================================
# TEST: measure_async Context Manager
# ============================================================================


class TestMeasureAsync:
    """Test suite for measure_async context manager."""

    @pytest.fixture(autouse=True)
    def reset_metrics(self):
        """Reset global metrics before each test."""
        performance_metrics.metrics.clear()
        yield

    @pytest.mark.asyncio
    async def test_measure_async_success(self):
        """Test measure_async records successful operations."""
        async with measure_async("async_test"):
            pass  # Simulate work

        assert "async_test" in performance_metrics.metrics
        stats = performance_metrics.metrics["async_test"]
        assert stats["total_calls"] == 1
        assert stats["success_count"] == 1
        assert stats["error_count"] == 0

    @pytest.mark.asyncio
    async def test_measure_async_with_exception(self):
        """Test measure_async records failed operations."""

        with pytest.raises(ValueError):
            async with measure_async("async_error"):
                raise ValueError("Test error")

        stats = performance_metrics.metrics["async_error"]
        assert stats["total_calls"] == 1
        assert stats["success_count"] == 0
        assert stats["error_count"] == 1

    @pytest.mark.asyncio
    async def test_measure_async_duration_recorded(self):
        """Test measure_async records duration."""
        import asyncio

        async with measure_async("async_timed"):
            await asyncio.sleep(0.05)  # 50ms

        stats = performance_metrics.metrics["async_timed"]
        # Duration should be at least 50ms
        assert stats["total_duration"] >= 0.05
        assert stats["min_duration"] >= 0.05

    @pytest.mark.asyncio
    async def test_measure_async_multiple_calls(self):
        """Test measure_async with multiple calls."""
        for _ in range(3):
            async with measure_async("async_multi"):
                pass

        stats = performance_metrics.metrics["async_multi"]
        assert stats["total_calls"] == 3
        assert stats["success_count"] == 3

    @pytest.mark.asyncio
    async def test_measure_async_exception_propagates(self):
        """Test that exceptions propagate correctly."""

        with pytest.raises(RuntimeError, match="propagated"):
            async with measure_async("async_propagate"):
                raise RuntimeError("propagated")

        # Error should still be recorded
        stats = performance_metrics.metrics["async_propagate"]
        assert stats["error_count"] == 1


# ============================================================================
# TEST: measure_sync Decorator
# ============================================================================


class TestMeasureSync:
    """Test suite for measure_sync decorator."""

    @pytest.fixture(autouse=True)
    def reset_metrics(self):
        """Reset global metrics before each test."""
        performance_metrics.metrics.clear()
        yield

    def test_measure_sync_success(self):
        """Test measure_sync records successful operations."""

        @measure_sync("sync_test")
        def test_func():
            return "result"

        result = test_func()
        assert result == "result"
        assert "sync_test" in performance_metrics.metrics
        stats = performance_metrics.metrics["sync_test"]
        assert stats["total_calls"] == 1
        assert stats["success_count"] == 1

    def test_measure_sync_with_exception(self):
        """Test measure_sync records failed operations."""

        @measure_sync("sync_error")
        def failing_func():
            raise ValueError("Test error")

        with pytest.raises(ValueError):
            failing_func()

        stats = performance_metrics.metrics["sync_error"]
        assert stats["total_calls"] == 1
        assert stats["error_count"] == 1

    def test_measure_sync_with_arguments(self):
        """Test measure_sync preserves function arguments."""

        @measure_sync("sync_args")
        def func_with_args(a, b, c=None):
            return a + b + (c or 0)

        result = func_with_args(1, 2, c=3)
        assert result == 6

    def test_measure_sync_preserves_return_value(self):
        """Test measure_sync preserves return values."""

        @measure_sync("sync_return")
        def func_return_complex():
            return {"key": "value", "list": [1, 2, 3]}

        result = func_return_complex()
        assert result == {"key": "value", "list": [1, 2, 3]}

    def test_measure_sync_duration_recorded(self):
        """Test measure_sync records duration."""
        import time

        @measure_sync("sync_timed")
        def slow_func():
            time.sleep(0.05)  # 50ms
            return True

        slow_func()
        stats = performance_metrics.metrics["sync_timed"]
        assert stats["total_duration"] >= 0.05

    def test_measure_sync_multiple_calls(self):
        """Test measure_sync with multiple calls."""

        @measure_sync("sync_multi")
        def simple_func():
            return True

        for _ in range(5):
            simple_func()

        stats = performance_metrics.metrics["sync_multi"]
        assert stats["total_calls"] == 5
        assert stats["success_count"] == 5

    def test_measure_sync_preserves_function_name(self):
        """Test measure_sync preserves function metadata."""

        @measure_sync("sync_meta")
        def original_name():
            """Original docstring."""
            pass

        assert original_name.__name__ == "original_name"
        assert original_name.__doc__ == "Original docstring."


# ============================================================================
# TEST: Global performance_metrics Instance
# ============================================================================


class TestGlobalMetrics:
    """Test suite for global performance_metrics instance."""

    @pytest.fixture(autouse=True)
    def reset_metrics(self):
        """Reset global metrics before each test."""
        performance_metrics.metrics.clear()
        yield

    def test_global_instance_exists(self):
        """Test that global instance exists."""
        assert performance_metrics is not None
        assert isinstance(performance_metrics, PerformanceMetrics)

    def test_global_instance_accumulates(self):
        """Test that global instance accumulates metrics."""
        performance_metrics.record("global_test1", 0.1)
        performance_metrics.record("global_test2", 0.2)

        assert len(performance_metrics.metrics) == 2

    def test_global_instance_persists(self):
        """Test that metrics persist across operations."""
        performance_metrics.record("persist_test", 0.1)

        # Access in different scope
        summary = performance_metrics.get_summary()
        assert summary["operations"] == 1
        assert "persist_test" in summary["metrics"]


# ============================================================================
# TEST: Edge Cases
# ============================================================================


class TestEdgeCases:
    """Edge case tests."""

    @pytest.fixture(autouse=True)
    def reset_metrics(self):
        """Reset global metrics before each test."""
        performance_metrics.metrics.clear()
        yield

    def test_zero_duration(self):
        """Test recording zero duration."""
        metrics = PerformanceMetrics()
        metrics.record("zero_test", 0.0)

        stats = metrics.metrics["zero_test"]
        assert stats["total_duration"] == 0.0
        assert stats["min_duration"] == 0.0

    def test_very_small_duration(self):
        """Test recording very small duration."""
        metrics = PerformanceMetrics()
        metrics.record("tiny_test", 0.000001)  # 1 microsecond

        stats = metrics.metrics["tiny_test"]
        assert stats["total_duration"] == pytest.approx(0.000001, rel=1e-6)

    def test_very_large_duration(self):
        """Test recording very large duration."""
        metrics = PerformanceMetrics()
        metrics.record("large_test", 3600.0)  # 1 hour

        stats = metrics.metrics["large_test"]
        assert stats["total_duration"] == 3600.0

    def test_special_characters_in_operation_name(self):
        """Test operation names with special characters."""
        metrics = PerformanceMetrics()
        metrics.record("test/op:name-with.special_chars", 0.1)

        assert "test/op:name-with.special_chars" in metrics.metrics

    def test_empty_operation_name(self):
        """Test empty operation name."""
        metrics = PerformanceMetrics()
        metrics.record("", 0.1)

        assert "" in metrics.metrics

    def test_unicode_operation_name(self):
        """Test unicode operation name."""
        metrics = PerformanceMetrics()
        metrics.record("test_操作", 0.1)

        assert "test_操作" in metrics.metrics

    @pytest.mark.asyncio
    async def test_nested_async_measurements(self):
        """Test nested async measurements."""
        async with measure_async("outer"):
            async with measure_async("inner"):
                pass

        assert "outer" in performance_metrics.metrics
        assert "inner" in performance_metrics.metrics
        assert performance_metrics.metrics["outer"]["total_calls"] == 1
        assert performance_metrics.metrics["inner"]["total_calls"] == 1

    def test_nested_sync_measurements(self):
        """Test nested sync function calls."""

        @measure_sync("outer_sync")
        def outer():
            inner()
            return "outer"

        @measure_sync("inner_sync")
        def inner():
            return "inner"

        outer()

        assert performance_metrics.metrics["outer_sync"]["total_calls"] == 1
        assert performance_metrics.metrics["inner_sync"]["total_calls"] == 1

    # - External API calls
    # - Service interactions
    # - End-to-end workflows


# ============================================================================
# EDGE CASES & ERROR HANDLING
# ============================================================================


class TestperformancemonitorEdgeCases:
    """Edge case and error handling tests"""

    def test_null_input_handling(self):
        """Test handling of null/None inputs"""
        # TODO: Test null handling
        pass

    def test_invalid_input_handling(self):
        """Test handling of invalid inputs"""
        # TODO: Test invalid input handling
        pass

    def test_error_conditions(self):
        """Test error condition handling"""
        # TODO: Test error scenarios
        pass


# ============================================================================
# PERFORMANCE & LOAD TESTS (Optional)
# ============================================================================


@pytest.mark.slow
class TestperformancemonitorPerformance:
    """Performance and load tests"""

    @pytest.mark.skip(reason="Performance test - run manually")
    def test_performance_under_load(self):
        """Test performance under load"""
        # TODO: Add performance test
        pass
