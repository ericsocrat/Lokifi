"""
Query performance profiler for identifying bottlenecks and optimization opportunities.

This module provides utilities to:
1. Profile database query execution times
2. Identify N+1 query patterns
3. Analyze query plans with EXPLAIN ANALYZE
4. Track cache hit/miss rates
5. Generate performance reports
"""

from __future__ import annotations

import json
import logging
import time
from collections.abc import Callable
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


@dataclass
class QueryMetrics:
    """Metrics for a single query execution."""

    query: str
    execution_time_ms: float
    rows_returned: int
    timestamp: datetime
    is_cached: bool = False
    cache_key: str | None = None
    query_type: str = "SELECT"  # SELECT, INSERT, UPDATE, DELETE

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            **asdict(self),
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class PerformanceReport:
    """Summary of query performance analysis."""

    total_queries: int
    slow_queries: list[QueryMetrics]
    n_plus_one_candidates: list[tuple[str, int]]  # (query_pattern, count)
    cache_hit_rate: float
    average_query_time_ms: float
    slowest_query_time_ms: float
    analysis_period: timedelta
    timestamp: datetime


class QueryProfiler:
    """Thread-safe query profiler for SQLAlchemy sessions."""

    def __init__(self, slow_query_threshold_ms: float = 100.0):
        """
        Initialize the profiler.

        Args:
            slow_query_threshold_ms: Queries taking longer than this are marked as slow
        """
        self.slow_query_threshold_ms = slow_query_threshold_ms
        self.metrics: list[QueryMetrics] = []
        self.query_counts: dict[str, int] = {}  # For N+1 detection
        self.enabled = True

    def attach_to_engine(self, engine: Engine) -> None:
        """Attach profiler to SQLAlchemy engine for event tracking."""
        if self.enabled:
            event.listen(engine, "before_cursor_execute", self._before_execute)
            event.listen(engine, "after_cursor_execute", self._after_execute)

    def _before_execute(
        self,
        conn: Any,
        cursor: Any,
        statement: str,
        parameters: Any,
        context: Any,
        executemany: bool,
    ) -> None:
        """Called before query execution."""
        # Store execution start time in context
        if not hasattr(context, "_query_start_time"):
            context._query_start_time = time.perf_counter()

    def _after_execute(
        self,
        conn: Any,
        cursor: Any,
        statement: str,
        parameters: Any,
        context: Any,
        executemany: bool,
    ) -> None:
        """Called after query execution - track metrics."""
        if not self.enabled or not hasattr(context, "_query_start_time"):
            return

        try:
            execution_time_ms = (time.perf_counter() - context._query_start_time) * 1000
            rows_returned = getattr(cursor, "rowcount", 0)

            # Normalize query string for pattern matching (remove parameters)
            normalized_query = self._normalize_query(statement)

            # Track query frequency (for N+1 detection)
            self.query_counts[normalized_query] = (
                self.query_counts.get(normalized_query, 0) + 1
            )

            # Determine query type
            query_type = self._extract_query_type(statement)

            # Create metrics
            metrics = QueryMetrics(
                query=normalized_query[:500],  # Truncate for storage
                execution_time_ms=execution_time_ms,
                rows_returned=rows_returned,
                timestamp=datetime.now(),
                query_type=query_type,
            )

            self.metrics.append(metrics)

            # Log slow queries
            if execution_time_ms > self.slow_query_threshold_ms:
                logger.warning(
                    f"Slow query ({execution_time_ms:.2f}ms): {normalized_query[:200]}..."
                )

        except Exception as e:
            logger.debug(f"Error tracking query metrics: {e}")

    @staticmethod
    def _normalize_query(statement: str) -> str:
        """Normalize query string for pattern matching (remove parameter values)."""
        # Replace parameter placeholders with generic marker
        import re

        normalized = re.sub(r"%s|%d|%f", "?", statement)
        # Remove excessive whitespace
        normalized = " ".join(normalized.split())
        return normalized

    @staticmethod
    def _extract_query_type(statement: str) -> str:
        """Extract query type (SELECT, INSERT, UPDATE, DELETE)."""
        upper = statement.upper().strip()
        for query_type in ["SELECT", "INSERT", "UPDATE", "DELETE"]:
            if upper.startswith(query_type):
                return query_type
        return "OTHER"

    def get_performance_report(
        self, slow_threshold_ms: float | None = None, hours_back: int = 1
    ) -> PerformanceReport:
        """Generate performance analysis report."""
        slow_threshold = slow_threshold_ms or self.slow_query_threshold_ms
        cutoff_time = datetime.now() - timedelta(hours=hours_back)

        # Filter metrics by time window
        recent_metrics = [m for m in self.metrics if m.timestamp > cutoff_time]

        if not recent_metrics:
            return PerformanceReport(
                total_queries=0,
                slow_queries=[],
                n_plus_one_candidates=[],
                cache_hit_rate=0.0,
                average_query_time_ms=0.0,
                slowest_query_time_ms=0.0,
                analysis_period=timedelta(hours=hours_back),
                timestamp=datetime.now(),
            )

        # Slow queries
        slow_queries = [
            m for m in recent_metrics if m.execution_time_ms > slow_threshold
        ]
        slow_queries.sort(key=lambda x: x.execution_time_ms, reverse=True)

        # N+1 candidates (same query pattern executed frequently)
        n_plus_one_candidates = [
            (query_pattern, count)
            for query_pattern, count in self.query_counts.items()
            if count > 5 and "SELECT" in query_pattern  # Heuristic: >5 similar SELECTs
        ]
        n_plus_one_candidates.sort(key=lambda x: x[1], reverse=True)

        # Cache stats (from metrics marked as cached)
        cached_queries = [m for m in recent_metrics if m.is_cached]
        cache_hit_rate = (
            len(cached_queries) / len(recent_metrics) if recent_metrics else 0.0
        )

        # Timing stats
        execution_times = [m.execution_time_ms for m in recent_metrics]
        average_time = (
            sum(execution_times) / len(execution_times) if execution_times else 0.0
        )
        slowest_time = max(execution_times) if execution_times else 0.0

        return PerformanceReport(
            total_queries=len(recent_metrics),
            slow_queries=slow_queries[:10],  # Top 10 slow queries
            n_plus_one_candidates=n_plus_one_candidates[:10],  # Top 10 patterns
            cache_hit_rate=cache_hit_rate,
            average_query_time_ms=average_time,
            slowest_query_time_ms=slowest_time,
            analysis_period=timedelta(hours=hours_back),
            timestamp=datetime.now(),
        )

    def export_metrics_json(self, filepath: str, hours_back: int = 1) -> None:
        """Export collected metrics to JSON file for analysis."""
        cutoff_time = datetime.now() - timedelta(hours=hours_back)
        recent_metrics = [m for m in self.metrics if m.timestamp > cutoff_time]

        data = {
            "export_timestamp": datetime.now().isoformat(),
            "analysis_period_hours": hours_back,
            "total_metrics": len(recent_metrics),
            "metrics": [m.to_dict() for m in recent_metrics],
        }

        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)

        logger.info(f"Exported {len(recent_metrics)} metrics to {filepath}")

    def explain_query(self, session: Session, query_str: str) -> dict[str, Any]:
        """
        Run EXPLAIN ANALYZE on a query and return the plan.

        Args:
            session: SQLAlchemy session
            query_str: SQL query to analyze

        Returns:
            Dictionary with query plan and statistics
        """
        try:
            result = session.execute(
                text(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query_str}")
            )
            plan = result.fetchone()[0]
            return json.loads(json.dumps(plan)) if isinstance(plan, str) else plan
        except Exception as e:
            logger.error(f"Error explaining query: {e}")
            return {"error": str(e)}

    def reset_metrics(self) -> None:
        """Clear collected metrics."""
        self.metrics.clear()
        self.query_counts.clear()


# Global profiler instance (lazy-initialized)
_profiler_instance: QueryProfiler | None = None


def get_profiler() -> QueryProfiler:
    """Get or create the global query profiler."""
    global _profiler_instance
    if _profiler_instance is None:
        _profiler_instance = QueryProfiler(slow_query_threshold_ms=100.0)
    return _profiler_instance
