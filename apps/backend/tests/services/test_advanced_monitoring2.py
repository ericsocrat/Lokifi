from datetime import datetime, timezone

import pytest

from app.services.advanced_monitoring import (
    AdvancedMonitoringSystem,
    AlertManager,
    PerformanceAnalyzer,
    SystemMetrics,
)


@pytest.mark.anyio
async def test_alert_manager_triggers_and_cooldown():
    am = AlertManager()
    triggered = []

    async def capture(alert: dict):
        triggered.append(alert)

    am.notification_channels.append(capture)
    am.add_rule("always_true", lambda m: True, severity="critical", cooldown_minutes=0)

    metrics = {"system_metrics": {"cpu_usage": 99}}
    await am.evaluate_rules(metrics)

    assert len(triggered) >= 1
    assert triggered[0]["severity"] == "critical"

    # cooldown 0 -> can trigger again immediately
    await am.evaluate_rules(metrics)
    assert len(triggered) >= 2


def make_metrics(ts: datetime, cpu: float, mem: float) -> SystemMetrics:
    return SystemMetrics(
        timestamp=ts,
        cpu_usage=cpu,
        memory_usage=mem,
        disk_usage=10.0,
        network_io={"bytes_sent": 1, "bytes_recv": 1},
        active_connections=0,
        database_connections=0,
        cache_hit_rate=0.0,
        response_times={"api": 0.1},
        error_rates={"api_error_rate": 0.0},
    )


def test_performance_analyzer_insights():
    pa = PerformanceAnalyzer()
    # add a series of metrics to create baselines and trends
    base_ts = datetime.now(timezone.utc)
    for i in range(20):
        pa.add_metrics(make_metrics(base_ts, cpu=30 + i, mem=40 + i))

    insights = pa.get_insights()
    assert "baselines" in insights
    assert "trends" in insights
    assert insights["metrics_count"] >= 20


@pytest.mark.anyio
async def test_monitoring_health_checks_and_metrics(monkeypatch):
    ms = AdvancedMonitoringSystem()

    # Patch psutil metrics
    class P:
        @staticmethod
        def cpu_percent(interval=1):
            return 12.5

        class VM:
            percent = 55
            available = 1024 * 1024 * 1024
            total = 2 * 1024 * 1024 * 1024

        @staticmethod
        def virtual_memory():
            return P.VM()

        class DU:
            percent = 60
            free = 10 * 1024 * 1024 * 1024
            total = 100 * 1024 * 1024 * 1024

        @staticmethod
        def disk_usage(path):
            return P.DU()

        class NET:
            bytes_sent = 1
            bytes_recv = 1
            packets_sent = 1
            packets_recv = 1

        @staticmethod
        def net_io_counters():
            return P.NET()

    monkeypatch.setattr("app.services.advanced_monitoring.psutil", P)

    # Patch websocket analytics
    class FakeWS:
        @staticmethod
        def get_analytics():
            return {"connection_stats": {"active_connections": 1, "active_users": 1}}

    monkeypatch.setattr(
        "app.services.advanced_monitoring.advanced_websocket_manager", FakeWS()
    )

    # Patch Redis client
    class FakeRedis:
        async def get_metrics(self):
            return {"hit_rate": 90, "connection_status": True}

        async def is_available(self):
            return True

        async def set_with_layer(self, key, value, layer, ttl):
            return True

        async def invalidate_pattern(self, pattern):
            return 1

    monkeypatch.setattr(
        "app.services.advanced_monitoring.advanced_redis_client", FakeRedis()
    )

    # Patch db_manager.get_session to async generator yielding a fake session
    async def fake_session_gen(read_only=False):
        class S:
            async def execute(self, stmt):
                class R:
                    def scalar(self):
                        return 1

                return R()

        yield S()

    monkeypatch.setattr(
        "app.services.advanced_monitoring.db_manager.get_session", fake_session_gen
    )

    # Collect metrics
    metrics = await ms.collect_system_metrics()
    assert metrics["cpu_usage"] == 12.5
    assert metrics["database_connections"] >= 0
    assert metrics["cache_hit_rate"] == 90

    # Run health checks
    health = await ms._run_all_health_checks()
    assert health["database"].status == "healthy"
    assert health["redis"].status == "healthy"
    assert health["websocket"].status == "healthy"

    # Dashboard data
    dashboard = await ms.get_dashboard_data()
    assert "system_status" in dashboard
    assert "health_checks" in dashboard
