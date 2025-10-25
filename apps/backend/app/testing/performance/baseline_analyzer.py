# Phase K Track 4: Performance Baseline & Analysis System
"""
Comprehensive performance baseline establishment and analysis system.

This module provides tools for:
- System performance baseline measurement
- Performance bottleneck identification
- Resource utilization analysis
- Performance regression detection
- Automated performance profiling
"""

import asyncio
import json
import logging
import statistics
import time
from contextlib import asynccontextmanager
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from typing import Any

import psutil

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Individual performance metric measurement"""

    name: str
    value: float
    unit: str
    timestamp: datetime
    category: str
    metadata: dict[str, Any] = None

    def to_dict(self) -> dict[str, Any]:
        return {
            **asdict(self),
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata or {},
        }


@dataclass
class ResourceUtilization:
    """System resource utilization snapshot"""

    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_available_mb: float
    disk_usage_percent: float
    network_bytes_sent: int
    network_bytes_recv: int
    timestamp: datetime

    def to_dict(self) -> dict[str, Any]:
        return {**asdict(self), "timestamp": self.timestamp.isoformat()}


@dataclass
class PerformanceBaseline:
    """Complete performance baseline measurement"""

    test_name: str
    start_time: datetime
    end_time: datetime
    duration_seconds: float
    metrics: list[PerformanceMetric]
    resource_snapshots: list[ResourceUtilization]
    summary: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "test_name": self.test_name,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "duration_seconds": self.duration_seconds,
            "metrics": [m.to_dict() for m in self.metrics],
            "resource_snapshots": [r.to_dict() for r in self.resource_snapshots],
            "summary": self.summary,
        }


class PerformanceProfiler:
    """
    Advanced performance profiling system for comprehensive system analysis.

    Provides automated performance measurement, bottleneck identification,
    and baseline establishment across all system components.
    """

    def __init__(self):
        self.metrics: list[PerformanceMetric] = []
        self.resource_snapshots: list[ResourceUtilization] = []
        self.start_time: datetime | None = None
        self.monitoring_active = False
        self._monitoring_task = None

    async def start_profiling(self, test_name: str = "system_baseline"):
        """Start comprehensive performance profiling"""
        self.metrics = []
        self.resource_snapshots = []
        self.start_time = datetime.now(UTC)
        self.monitoring_active = True

        logger.info(f"Starting performance profiling: {test_name}")

        # Start resource monitoring
        self._monitoring_task = asyncio.create_task(self._monitor_resources())

        return self

    async def stop_profiling(self, test_name: str = "system_baseline") -> PerformanceBaseline:
        """Stop profiling and generate baseline report"""
        end_time = datetime.now(UTC)
        self.monitoring_active = False

        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass

        duration = (end_time - self.start_time).total_seconds()
        summary = self._generate_summary()

        baseline = PerformanceBaseline(
            test_name=test_name,
            start_time=self.start_time,
            end_time=end_time,
            duration_seconds=duration,
            metrics=self.metrics.copy(),
            resource_snapshots=self.resource_snapshots.copy(),
            summary=summary,
        )

        logger.info(f"Performance profiling complete: {test_name} ({duration:.2f}s)")
        return baseline

    async def _monitor_resources(self):
        """Continuously monitor system resources"""
        while self.monitoring_active:
            try:
                # Get system resource utilization
                cpu_percent = psutil.cpu_percent(interval=1)
                memory = psutil.virtual_memory()
                disk = psutil.disk_usage("/")
                network = psutil.net_io_counters()

                snapshot = ResourceUtilization(
                    cpu_percent=cpu_percent,
                    memory_percent=memory.percent,
                    memory_used_mb=memory.used / 1024 / 1024,
                    memory_available_mb=memory.available / 1024 / 1024,
                    disk_usage_percent=disk.percent,
                    network_bytes_sent=network.bytes_sent,
                    network_bytes_recv=network.bytes_recv,
                    timestamp=datetime.now(UTC),
                )

                self.resource_snapshots.append(snapshot)
                await asyncio.sleep(1)  # Sample every second

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error monitoring resources: {e}")
                await asyncio.sleep(1)

    def add_metric(
        self,
        name: str,
        value: float,
        unit: str,
        category: str = "general",
        metadata: dict[str, Any] | None = None,
    ):
        """Add a custom performance metric"""
        metric = PerformanceMetric(
            name=name,
            value=value,
            unit=unit,
            timestamp=datetime.now(UTC),
            category=category,
            metadata=metadata or {},
        )
        self.metrics.append(metric)

    @asynccontextmanager
    async def measure_operation(self, operation_name: str, category: str = "operation"):
        """Context manager for measuring operation performance"""
        start_time = time.time()
        try:
            yield
        finally:
            duration = time.time() - start_time
            self.add_metric(
                name=f"{operation_name}_duration",
                value=duration * 1000,  # Convert to milliseconds
                unit="ms",
                category=category,
                metadata={"operation": operation_name},
            )

    def _generate_summary(self) -> dict[str, Any]:
        """Generate performance summary statistics"""
        if not self.metrics and not self.resource_snapshots:
            return {}

        summary = {
            "total_metrics": len(self.metrics),
            "total_snapshots": len(self.resource_snapshots),
            "categories": {},
        }

        # Summarize metrics by category
        metrics_by_category = {}
        for metric in self.metrics:
            if metric.category not in metrics_by_category:
                metrics_by_category[metric.category] = []
            metrics_by_category[metric.category].append(metric.value)

        for category, values in metrics_by_category.items():
            summary["categories"][category] = {
                "count": len(values),
                "avg": statistics.mean(values),
                "min": min(values),
                "max": max(values),
                "p50": statistics.median(values),
                "p95": statistics.quantiles(values, n=20)[18] if len(values) >= 20 else max(values),
                "p99": statistics.quantiles(values, n=100)[98]
                if len(values) >= 100
                else max(values),
            }

        # Summarize resource utilization
        if self.resource_snapshots:
            cpu_values = [s.cpu_percent for s in self.resource_snapshots]
            memory_values = [s.memory_percent for s in self.resource_snapshots]

            summary["resource_utilization"] = {
                "cpu": {
                    "avg": statistics.mean(cpu_values),
                    "max": max(cpu_values),
                    "min": min(cpu_values),
                },
                "memory": {
                    "avg": statistics.mean(memory_values),
                    "max": max(memory_values),
                    "min": min(memory_values),
                },
            }

        return summary


class SystemPerformanceAnalyzer:
    """
    Comprehensive system performance analysis and bottleneck identification.

    Analyzes system performance across all components and identifies
    optimization opportunities and performance bottlenecks.
    """

    def __init__(self):
        self.profiler = PerformanceProfiler()

    async def analyze_database_performance(self) -> dict[str, Any]:
        """Analyze database performance characteristics"""
        from app.core.database import db_manager

        results = {"connection_pool": {}, "query_performance": {}, "connection_time": 0}

        # Measure database connection time
        async with self.profiler.measure_operation("db_connection", "database"):
            try:
                async for session in db_manager.get_session():
                    # Simple connectivity test
                    await session.execute("SELECT 1")
                    break
            except Exception as e:
                results["connection_error"] = str(e)

        # Measure query performance for notifications
        try:
            async with self.profiler.measure_operation("notification_query", "database"):
                async for session in db_manager.get_session():
                    # Test notification query performance
                    result = await session.execute(
                        "SELECT COUNT(*) FROM notifications WHERE created_at > NOW() - INTERVAL '1 hour'"
                    )
                    count = result.scalar()
                    results["query_performance"]["recent_notifications"] = count
                    break
        except Exception as e:
            results["query_error"] = str(e)

        return results

    async def analyze_redis_performance(self) -> dict[str, Any]:
        """Analyze Redis cache performance"""
        from app.core.advanced_redis_client import advanced_redis_client

        results = {"connection_status": "unknown", "cache_operations": {}, "memory_usage": {}}

        try:
            # Test Redis availability
            async with self.profiler.measure_operation("redis_ping", "cache"):
                available = await advanced_redis_client.is_available()
                results["connection_status"] = "connected" if available else "disconnected"

            if available:
                # Test cache operations
                test_key = "perf_test_key"
                test_value = {"test": "data", "timestamp": time.time()}

                # Test SET operation
                async with self.profiler.measure_operation("redis_set", "cache"):
                    await advanced_redis_client.set_with_layer(
                        test_key, json.dumps(test_value), "memory", 60
                    )

                # Test GET operation
                async with self.profiler.measure_operation("redis_get", "cache"):
                    retrieved = await advanced_redis_client.get_with_fallback(
                        test_key, ["memory", "distributed"]
                    )

                results["cache_operations"]["set_success"] = True
                results["cache_operations"]["get_success"] = retrieved is not None

                # Get cache metrics
                metrics = await advanced_redis_client.get_metrics()
                results["cache_metrics"] = metrics

        except Exception as e:
            results["error"] = str(e)

        return results

    async def analyze_websocket_performance(self) -> dict[str, Any]:
        """Analyze WebSocket manager performance"""
        from app.websockets.advanced_websocket_manager import get_websocket_manager

        results = {"manager_status": "unknown", "connection_capacity": 0, "analytics": {}}

        try:
            ws_manager = get_websocket_manager()

            # Get current analytics
            analytics = ws_manager.get_analytics()
            results["analytics"] = analytics
            results["manager_status"] = "operational"

            # Check connection pool capacity
            if hasattr(ws_manager, "connection_pool"):
                pool = ws_manager.connection_pool
                results["connection_capacity"] = getattr(pool, "max_connections", 10000)
                results["current_connections"] = len(pool.connections)

        except Exception as e:
            results["error"] = str(e)

        return results

    async def run_comprehensive_analysis(self) -> PerformanceBaseline:
        """Run comprehensive system performance analysis"""
        logger.info("Starting comprehensive performance analysis")

        await self.profiler.start_profiling("comprehensive_system_analysis")

        # Analyze each component
        try:
            # Database analysis
            async with self.profiler.measure_operation("database_analysis", "analysis"):
                db_results = await self.analyze_database_performance()

            # Redis analysis
            async with self.profiler.measure_operation("redis_analysis", "analysis"):
                redis_results = await self.analyze_redis_performance()

            # WebSocket analysis
            async with self.profiler.measure_operation("websocket_analysis", "analysis"):
                ws_results = await self.analyze_websocket_performance()

            # Add component analysis results as metadata
            self.profiler.add_metric("components_analyzed", 3, "count", "analysis")

        except Exception as e:
            logger.error(f"Error during comprehensive analysis: {e}")

        baseline = await self.profiler.stop_profiling("comprehensive_system_analysis")

        # Add component analysis to baseline summary
        baseline.summary["component_analysis"] = {
            "database": db_results,
            "redis": redis_results,
            "websocket": ws_results,
        }

        return baseline


# Global performance analyzer instance
performance_analyzer = SystemPerformanceAnalyzer()
