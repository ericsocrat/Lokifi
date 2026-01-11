"""
Additional coverage for AdvancedStorageAnalytics.
Focus: happy paths and prioritization logic to raise coverage from ~33%.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

import app.services.advanced_storage_analytics as analytics_module
from app.services.advanced_storage_analytics import (
    AdvancedStorageAnalytics,
    AdvancedStorageMetrics,
    OptimizationRecommendation,
)


@pytest.fixture
def stub_settings() -> MagicMock:
    settings = MagicMock()
    settings.ARCHIVE_THRESHOLD_DAYS = 30
    return settings


@pytest.mark.asyncio
async def test_get_comprehensive_metrics_happy_path(monkeypatch, stub_settings):
    session = MagicMock()
    session.scalar = AsyncMock(
        side_effect=[
            2,  # total_threads
            5,  # total_messages
            3,  # total_users
            512000,  # total_content_length
            10,  # messages_last_24h
            70,  # messages_last_week
            300,  # messages_last_month
            20,  # archived_count
        ]
    )
    session.execute = AsyncMock(
        side_effect=[
            [(3,), (2,)],  # thread_message_counts
            [(3,), (2,)],  # user_message_counts
            [("openai", 4), ("anthropic", 1)],  # provider_stats
            [("gpt-4", 4), ("claude", 1)],  # model_stats
            [(12, 3), (13, 2)],  # hourly_stats
        ]
    )

    async def mock_get_db_session():
        yield session

    monkeypatch.setattr(analytics_module, "get_db_session", mock_get_db_session)

    service = AdvancedStorageAnalytics(stub_settings)
    metrics = await service.get_comprehensive_metrics()

    assert metrics.total_threads == 2
    assert metrics.total_messages == 5
    assert metrics.total_users == 3
    assert metrics.messages_per_thread_avg == pytest.approx(2.5)
    assert metrics.messages_per_user_avg == pytest.approx(2.5)
    assert metrics.provider_usage == {"openai": 4, "anthropic": 1}
    assert metrics.model_usage == {"gpt-4": 4, "claude": 1}
    assert metrics.predicted_size_30_days > metrics.total_size_mb
    assert metrics.optimization_score > 0


@pytest.mark.asyncio
async def test_generate_optimization_recommendations_prioritized(
    monkeypatch, stub_settings
):
    metrics = AdvancedStorageMetrics(
        total_messages=20000,
        total_size_mb=150.0,
        avg_message_size_kb=2.5,
        largest_thread_messages=1200,
        largest_thread_size_mb=50.0,
        predicted_size_30_days=1500.0,
        provider_usage={"openai": 18000, "other": 1500, "tiny": 150},
        fragmentation_ratio=0.4,
    )

    session = MagicMock()
    session.scalar = AsyncMock(return_value=2000)

    async def mock_get_db_session():
        yield session

    monkeypatch.setattr(analytics_module, "get_db_session", mock_get_db_session)

    service = AdvancedStorageAnalytics(stub_settings)
    recs = await service.generate_optimization_recommendations(metrics)

    categories = [r.category for r in recs]
    assert "Data Archival" in categories
    assert "Database Maintenance" in categories
    assert "Thread Management" in categories
    assert any(r.priority == "HIGH" for r in recs)
    assert recs == sorted(
        recs, key=lambda r: ["HIGH", "MEDIUM", "LOW"].index(r.priority)
    )


@pytest.mark.asyncio
async def test_benchmark_database_performance_runs(monkeypatch, stub_settings):
    session = MagicMock()
    session.execute = AsyncMock(return_value=None)

    async def mock_get_db_session():
        yield session

    monkeypatch.setattr(analytics_module, "get_db_session", mock_get_db_session)

    service = AdvancedStorageAnalytics(stub_settings)
    benchmarks = await service.benchmark_database_performance()

    assert len(benchmarks) == 4
    assert all(b.samples == 5 for b in benchmarks)
    assert all(b.avg_time_ms >= 0 for b in benchmarks)


@pytest.mark.asyncio
async def test_analyze_data_patterns_collects_results(monkeypatch, stub_settings):
    now = datetime.now(timezone.utc)
    session = MagicMock()
    session.execute = AsyncMock(
        side_effect=[
            [(now.date(), 10, 50.0)],  # temporal_result
            [(1, 2, 10, 42.0, now)],  # user_behavior_result
            [("openai", "gpt-4", 5, 100.0, 10.0)],  # content_result
        ]
    )

    async def mock_get_db_session():
        yield session

    monkeypatch.setattr(analytics_module, "get_db_session", mock_get_db_session)

    service = AdvancedStorageAnalytics(stub_settings)
    patterns = await service.analyze_data_patterns()

    assert "temporal_distribution" in patterns
    assert "user_behavior" in patterns
    assert "content_analysis" in patterns
    assert patterns["user_behavior"].get("user_1", {}).get("last_activity") is not None


@pytest.mark.asyncio
async def test_generate_storage_report_aggregates(monkeypatch, stub_settings):
    metrics = AdvancedStorageMetrics(
        total_messages=10, total_size_mb=1.5, optimization_score=75
    )
    recs = [
        OptimizationRecommendation(
            category="Data Archival",
            priority="HIGH",
            description="Archive old messages",
            potential_savings_mb=10,
            effort_level="EASY",
            implementation_steps=["step1"],
            estimated_time_minutes=5,
        )
    ]
    benchmarks = []
    patterns = {"temporal_distribution": {}}

    monkeypatch.setattr(
        analytics_module.AdvancedStorageAnalytics,
        "get_comprehensive_metrics",
        AsyncMock(return_value=metrics),
    )
    monkeypatch.setattr(
        analytics_module.AdvancedStorageAnalytics,
        "generate_optimization_recommendations",
        AsyncMock(return_value=recs),
    )
    monkeypatch.setattr(
        analytics_module.AdvancedStorageAnalytics,
        "benchmark_database_performance",
        AsyncMock(return_value=benchmarks),
    )
    monkeypatch.setattr(
        analytics_module.AdvancedStorageAnalytics,
        "analyze_data_patterns",
        AsyncMock(return_value=patterns),
    )

    service = AdvancedStorageAnalytics(stub_settings)
    report = await service.generate_storage_report()

    assert report["metadata"]["analysis_type"] == "comprehensive_storage_analytics"
    assert report["executive_summary"]["total_messages"] == 10
    assert report["optimization_recommendations"]
    assert report["health_indicators"]["growth_rate_healthy"] is True
