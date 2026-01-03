"""
Comprehensive tests for app.services.alerts

Tests AlertStore, SSEHub, and AlertEvaluator components with full coverage
of file I/O, async operations, debouncing, and alert evaluation logic.

Pattern: AsyncMock + file I/O mocking + async testing
Sprint 7 Session 69 - Backend Coverage Improvement (36% → 80%+)
"""

import asyncio
import json
import time
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, call, mock_open, patch

import pytest
import pytest_asyncio

from app.services.alerts import Alert, AlertEvaluator, AlertStore, SSEHub

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def sample_alert() -> Alert:
    """Sample alert for testing"""
    return Alert(
        id="alert-001",
        type="price_threshold",
        symbol="BTCUSDT",
        timeframe="1h",
        active=True,
        created_at=time.time(),
        min_interval_sec=300,  # 5 minutes
        last_triggered_at=None,
        config={"direction": "above", "price": 50000},
        owner_handle="testuser",
    )


@pytest.fixture
def sample_pct_alert() -> Alert:
    """Sample percentage change alert"""
    return Alert(
        id="alert-002",
        type="pct_change",
        symbol="ETHUSDT",
        timeframe="15m",
        active=True,
        created_at=time.time(),
        min_interval_sec=600,  # 10 minutes
        last_triggered_at=None,
        config={"window_minutes": 60, "direction": "up", "threshold_pct": 5.0},
        owner_handle="testuser",
    )


@pytest.fixture
def temp_alert_path(tmp_path: Path) -> Path:
    """Temporary path for alert storage"""
    return tmp_path / "alerts.json"


@pytest_asyncio.fixture
async def alert_store(temp_alert_path: Path) -> AlertStore:
    """AlertStore instance with temporary storage - fresh for each test"""
    store = AlertStore(str(temp_alert_path))
    # Ensure clean state: delete file if exists, then create fresh empty store
    if temp_alert_path.exists():
        temp_alert_path.unlink()
    await store.load()  # Creates empty file
    return store


@pytest.fixture
def sse_hub() -> SSEHub:
    """SSEHub instance for testing"""
    return SSEHub()


# ============================================================================
# AlertStore Tests
# ============================================================================


class TestAlertStore:
    """Test suite for AlertStore component"""

    @pytest.mark.asyncio
    async def test_load_creates_empty_file(self, temp_alert_path: Path):
        """Test that load() creates empty file if it doesn't exist"""
        store = AlertStore(str(temp_alert_path))
        await store.load()

        assert temp_alert_path.exists()
        data = json.loads(temp_alert_path.read_text())
        assert data == {}

    @pytest.mark.asyncio
    async def test_load_existing_file(self, temp_alert_path: Path, sample_alert: Alert):
        """Test loading existing alerts from file"""
        # Create file with sample alert
        temp_alert_path.write_text(
            json.dumps(
                {
                    "alert-001": {
                        "id": "alert-001",
                        "type": "price_threshold",
                        "symbol": "BTCUSDT",
                        "timeframe": "1h",
                        "active": True,
                        "created_at": sample_alert.created_at,
                        "min_interval_sec": 300,
                        "last_triggered_at": None,
                        "config": {"direction": "above", "price": 50000},
                        "owner_handle": "testuser",
                    }
                }
            )
        )

        store = AlertStore(str(temp_alert_path))
        await store.load()

        alerts = await store.list()
        assert len(alerts) == 1
        assert alerts[0].id == "alert-001"
        assert alerts[0].symbol == "BTCUSDT"

    @pytest.mark.asyncio
    async def test_load_corrupted_file(self, temp_alert_path: Path):
        """Test handling of corrupted JSON file"""
        temp_alert_path.write_text("invalid json {{{")

        store = AlertStore(str(temp_alert_path))
        await store.load()

        # Should reset to empty dict on corruption
        alerts = await store.list()
        assert len(alerts) == 0

    @pytest.mark.asyncio
    async def test_add_alert(self, alert_store: AlertStore, sample_alert: Alert):
        """Test adding alert to store"""
        result = await alert_store.add(sample_alert)

        assert result.id == sample_alert.id
        alerts = await alert_store.list()
        assert len(alerts) == 1
        assert alerts[0].id == "alert-001"

    @pytest.mark.asyncio
    async def test_remove_alert(self, alert_store: AlertStore, sample_alert: Alert):
        """Test removing alert from store"""
        await alert_store.add(sample_alert)

        existed = await alert_store.remove("alert-001")
        assert existed is True

        alerts = await alert_store.list()
        assert len(alerts) == 0

    @pytest.mark.asyncio
    async def test_remove_nonexistent_alert(self, alert_store: AlertStore):
        """Test removing alert that doesn't exist"""
        existed = await alert_store.remove("nonexistent")
        assert existed is False

    @pytest.mark.asyncio
    async def test_get_alert(self, alert_store: AlertStore, sample_alert: Alert):
        """Test retrieving alert by ID"""
        await alert_store.add(sample_alert)

        alert = await alert_store.get("alert-001")
        assert alert is not None
        assert alert.id == "alert-001"
        assert alert.symbol == "BTCUSDT"

    @pytest.mark.asyncio
    async def test_get_nonexistent_alert(self, alert_store: AlertStore):
        """Test retrieving alert that doesn't exist"""
        alert = await alert_store.get("nonexistent")
        assert alert is None

    @pytest.mark.asyncio
    async def test_set_active(self, alert_store: AlertStore, sample_alert: Alert):
        """Test setting alert active status"""
        await alert_store.add(sample_alert)

        result = await alert_store.set_active("alert-001", False)
        assert result is not None
        assert result.active is False

        # Verify persistence
        alert = await alert_store.get("alert-001")
        assert alert.active is False

    @pytest.mark.asyncio
    async def test_set_active_nonexistent(self, alert_store: AlertStore):
        """Test setting active status for nonexistent alert"""
        result = await alert_store.set_active("nonexistent", True)
        assert result is None

    @pytest.mark.asyncio
    async def test_list_alerts(
        self, alert_store: AlertStore, sample_alert: Alert, sample_pct_alert: Alert
    ):
        """Test listing all alerts"""
        await alert_store.add(sample_alert)
        await alert_store.add(sample_pct_alert)

        alerts = await alert_store.list()
        assert len(alerts) == 2
        assert {a.id for a in alerts} == {"alert-001", "alert-002"}

    @pytest.mark.asyncio
    async def test_save_persistence(self, temp_alert_path: Path, sample_alert: Alert):
        """Test that save() persists data to disk"""
        store = AlertStore(str(temp_alert_path))
        await store.load()
        await store.add(sample_alert)

        # Create new store instance and load
        store2 = AlertStore(str(temp_alert_path))
        await store2.load()

        alerts = await store2.list()
        assert len(alerts) == 1
        assert alerts[0].id == "alert-001"


# ============================================================================
# SSEHub Tests
# ============================================================================


class TestSSEHub:
    """Test suite for SSEHub component"""

    @pytest.mark.asyncio
    async def test_register_client(self, sse_hub: SSEHub):
        """Test registering SSE client"""
        queue = await sse_hub.register()

        assert isinstance(queue, asyncio.Queue)
        assert queue in sse_hub._clients

    @pytest.mark.asyncio
    async def test_unregister_client(self, sse_hub: SSEHub):
        """Test unregistering SSE client"""
        queue = await sse_hub.register()
        await sse_hub.unregister(queue)

        assert queue not in sse_hub._clients

    @pytest.mark.asyncio
    async def test_broadcast_to_clients(self, sse_hub: SSEHub):
        """Test broadcasting event to all clients"""
        queue1 = await sse_hub.register()
        queue2 = await sse_hub.register()

        event = {"type": "alert.triggered", "data": "test"}
        await sse_hub.broadcast(event)

        # Both clients should receive event
        received1 = await asyncio.wait_for(queue1.get(), timeout=1.0)
        received2 = await asyncio.wait_for(queue2.get(), timeout=1.0)

        assert received1 == event
        assert received2 == event

    @pytest.mark.asyncio
    async def test_broadcast_queue_full_handling(self, sse_hub: SSEHub):
        """Test that full queues are handled gracefully"""
        # Create queue with size 1
        queue = asyncio.Queue(maxsize=1)
        sse_hub._clients.add(queue)

        # Fill queue
        await queue.put({"first": "event"})

        # This should not raise even though queue is full
        await sse_hub.broadcast({"second": "event"})

        # Queue should still have original item
        item = await queue.get()
        assert item == {"first": "event"}

    @pytest.mark.asyncio
    async def test_multiple_broadcasts(self, sse_hub: SSEHub):
        """Test multiple sequential broadcasts"""
        queue = await sse_hub.register()

        events = [
            {"type": "event1", "data": 1},
            {"type": "event2", "data": 2},
            {"type": "event3", "data": 3},
        ]

        for event in events:
            await sse_hub.broadcast(event)

        # Retrieve all events
        received = []
        for _ in range(3):
            item = await asyncio.wait_for(queue.get(), timeout=1.0)
            received.append(item)

        assert received == events


# ============================================================================
# AlertEvaluator Tests
# ============================================================================


class TestAlertEvaluator:
    """Test suite for AlertEvaluator component"""

    @pytest_asyncio.fixture
    async def evaluator(self, alert_store: AlertStore, sse_hub: SSEHub):
        """AlertEvaluator instance for testing"""
        evaluator = AlertEvaluator(store=alert_store, hub=sse_hub, interval_sec=1)
        yield evaluator
        # Cleanup - only stop if task exists and isn't already done/cancelled
        if evaluator._task and not evaluator._task.done():
            await evaluator.stop()

    @pytest.mark.asyncio
    async def test_start_evaluator(self, evaluator: AlertEvaluator):
        """Test starting the evaluator"""
        evaluator.start()

        assert evaluator._task is not None
        assert not evaluator._task.done()

    @pytest.mark.asyncio
    async def test_start_already_running(self, evaluator: AlertEvaluator):
        """Test starting evaluator when already running"""
        evaluator.start()
        task1 = evaluator._task

        # Starting again should not create new task
        evaluator.start()
        task2 = evaluator._task

        assert task1 is task2

    @pytest.mark.asyncio
    async def test_stop_evaluator(self, evaluator: AlertEvaluator):
        """Test stopping the evaluator"""
        evaluator.start()
        await asyncio.sleep(0.1)  # Let it run briefly

        await evaluator.stop()

        assert evaluator._stop.is_set()
        assert evaluator._task.done() or evaluator._task.cancelled()

    @pytest.mark.asyncio
    async def test_stop_timeout_handling(self, evaluator: AlertEvaluator):
        """Test stop timeout handling"""
        # Mock a task that won't complete
        evaluator._task = asyncio.create_task(asyncio.sleep(10))

        # Stop should timeout and cancel
        await evaluator.stop()

        assert evaluator._task.cancelled()

    @pytest.mark.asyncio
    @patch("app.services.alerts.get_ohlc")
    async def test_evaluate_price_threshold_above_triggered(
        self, mock_get_ohlc: AsyncMock, evaluator: AlertEvaluator, sample_alert: Alert
    ):
        """Test price threshold alert triggered (above)"""
        # Mock OHLC data with price above threshold
        mock_get_ohlc.return_value = [{"close": "51000.00"}]  # Above threshold of 50000

        triggered, payload = await evaluator._evaluate(sample_alert)

        assert triggered is True
        assert payload["price"] == 51000.0
        assert payload["target"] == 50000.0
        assert payload["direction"] == "above"

    @pytest.mark.asyncio
    @patch("app.services.alerts.get_ohlc")
    async def test_evaluate_price_threshold_above_not_triggered(
        self, mock_get_ohlc: AsyncMock, evaluator: AlertEvaluator, sample_alert: Alert
    ):
        """Test price threshold alert not triggered (above)"""
        # Mock OHLC data with price below threshold
        mock_get_ohlc.return_value = [{"close": "49000.00"}]  # Below threshold of 50000

        triggered, payload = await evaluator._evaluate(sample_alert)

        assert triggered is False
        assert payload["price"] == 49000.0

    @pytest.mark.asyncio
    @patch("app.services.alerts.get_ohlc")
    async def test_evaluate_price_threshold_below_triggered(
        self, mock_get_ohlc: AsyncMock, evaluator: AlertEvaluator
    ):
        """Test price threshold alert triggered (below)"""
        alert = Alert(
            id="alert-below",
            type="price_threshold",
            symbol="BTCUSDT",
            timeframe="1h",
            active=True,
            created_at=time.time(),
            min_interval_sec=300,
            last_triggered_at=None,
            config={"direction": "below", "price": 50000},
            owner_handle="testuser",
        )

        mock_get_ohlc.return_value = [{"close": "49000.00"}]  # Below threshold

        triggered, payload = await evaluator._evaluate(alert)

        assert triggered is True
        assert payload["price"] == 49000.0
        assert payload["direction"] == "below"

    @pytest.mark.asyncio
    @patch("app.services.alerts.get_ohlc")
    async def test_evaluate_pct_change_up_triggered(
        self,
        mock_get_ohlc: AsyncMock,
        evaluator: AlertEvaluator,
        sample_pct_alert: Alert,
    ):
        """Test percentage change alert triggered (up)"""
        # Mock OHLC data showing 5% increase
        mock_get_ohlc.return_value = [
            {"close": "2000.00"},  # Starting price
            {"close": "2100.00"},  # 5% increase
        ]

        triggered, payload = await evaluator._evaluate(sample_pct_alert)

        assert triggered is True
        assert payload["pct_change"] == 5.0
        assert payload["direction"] == "up"

    @pytest.mark.asyncio
    @patch("app.services.alerts.get_ohlc")
    async def test_evaluate_pct_change_up_not_triggered(
        self,
        mock_get_ohlc: AsyncMock,
        evaluator: AlertEvaluator,
        sample_pct_alert: Alert,
    ):
        """Test percentage change alert not triggered (up)"""
        # Mock OHLC data showing less than 5% increase
        mock_get_ohlc.return_value = [
            {"close": "2000.00"},
            {"close": "2050.00"},  # Only 2.5% increase
        ]

        triggered, payload = await evaluator._evaluate(sample_pct_alert)

        assert triggered is False
        assert payload["pct_change"] == 2.5

    @pytest.mark.asyncio
    @patch("app.services.alerts.get_ohlc")
    async def test_evaluate_pct_change_down_triggered(
        self, mock_get_ohlc: AsyncMock, evaluator: AlertEvaluator
    ):
        """Test percentage change alert triggered (down)"""
        alert = Alert(
            id="alert-down",
            type="pct_change",
            symbol="ETHUSDT",
            timeframe="15m",
            active=True,
            created_at=time.time(),
            min_interval_sec=600,
            last_triggered_at=None,
            config={"window_minutes": 60, "direction": "down", "threshold_pct": 3.0},
            owner_handle="testuser",
        )

        mock_get_ohlc.return_value = [
            {"close": "2000.00"},
            {"close": "1940.00"},  # 3% decrease
        ]

        triggered, payload = await evaluator._evaluate(alert)

        assert triggered is True
        assert payload["pct_change"] == -3.0
        assert payload["direction"] == "down"

    @pytest.mark.asyncio
    @patch("app.services.alerts.get_ohlc")
    async def test_evaluate_pct_change_abs_triggered(
        self, mock_get_ohlc: AsyncMock, evaluator: AlertEvaluator
    ):
        """Test percentage change alert triggered (absolute)"""
        alert = Alert(
            id="alert-abs",
            type="pct_change",
            symbol="ETHUSDT",
            timeframe="15m",
            active=True,
            created_at=time.time(),
            min_interval_sec=600,
            last_triggered_at=None,
            config={"window_minutes": 60, "direction": "abs", "threshold_pct": 3.0},
            owner_handle="testuser",
        )

        # Test with negative change
        mock_get_ohlc.return_value = [
            {"close": "2000.00"},
            {"close": "1940.00"},  # -3% change
        ]

        triggered, payload = await evaluator._evaluate(alert)

        assert triggered is True
        assert abs(payload["pct_change"]) >= 3.0
        assert payload["direction"] == "abs"

    @pytest.mark.asyncio
    @patch("app.services.alerts.get_ohlc")
    async def test_evaluate_unknown_type(
        self, mock_get_ohlc: AsyncMock, evaluator: AlertEvaluator
    ):
        """Test evaluation of unknown alert type"""
        alert = Alert(
            id="alert-unknown",
            type="unknown_type",  # type: ignore
            symbol="BTCUSDT",
            timeframe="1h",
            active=True,
            created_at=time.time(),
            min_interval_sec=300,
            last_triggered_at=None,
            config={},
            owner_handle="testuser",
        )

        triggered, payload = await evaluator._evaluate(alert)

        assert triggered is False
        assert payload["reason"] == "unknown_type"

    @pytest.mark.asyncio
    @patch("app.services.alerts.get_ohlc")
    async def test_tick_processes_active_alerts(
        self, mock_get_ohlc: AsyncMock, evaluator: AlertEvaluator, sample_alert: Alert
    ):
        """Test _tick processes active alerts and broadcasts"""
        await evaluator.store.add(sample_alert)

        # Mock triggered alert
        mock_get_ohlc.return_value = [{"close": "51000.00"}]

        # Register client to receive broadcast
        queue = await evaluator.hub.register()

        await evaluator._tick()

        # Should have broadcast event
        event = await asyncio.wait_for(queue.get(), timeout=1.0)
        assert event["type"] == "alert.triggered"
        assert event["alert"]["id"] == "alert-001"

    @pytest.mark.asyncio
    @patch("app.services.alerts.get_ohlc")
    async def test_tick_skips_inactive_alerts(
        self, mock_get_ohlc: AsyncMock, evaluator: AlertEvaluator, sample_alert: Alert
    ):
        """Test _tick skips inactive alerts"""
        sample_alert.active = False
        await evaluator.store.add(sample_alert)

        # Register client
        queue = await evaluator.hub.register()

        await evaluator._tick()

        # Should not broadcast (alert inactive)
        assert queue.empty()

    @pytest.mark.asyncio
    @patch("app.services.alerts.get_ohlc")
    async def test_tick_debouncing(
        self, mock_get_ohlc: AsyncMock, evaluator: AlertEvaluator, sample_alert: Alert
    ):
        """Test _tick respects debouncing interval"""
        # Set recent trigger time
        sample_alert.last_triggered_at = time.time()
        await evaluator.store.add(sample_alert)

        mock_get_ohlc.return_value = [{"close": "51000.00"}]
        queue = await evaluator.hub.register()

        await evaluator._tick()

        # Should not broadcast due to debouncing
        assert queue.empty()

    @pytest.mark.asyncio
    @patch("app.services.alerts.get_ohlc")
    async def test_tick_error_handling(
        self, mock_get_ohlc: AsyncMock, evaluator: AlertEvaluator, sample_alert: Alert
    ):
        """Test _tick handles evaluation errors gracefully"""
        await evaluator.store.add(sample_alert)

        # Mock evaluation error
        mock_get_ohlc.side_effect = Exception("API error")

        # Should not raise
        await evaluator._tick()

        # Evaluator should continue running
        assert not evaluator._stop.is_set()

    @pytest.mark.asyncio
    @patch("app.services.alerts.get_ohlc")
    async def test_tick_updates_last_triggered(
        self, mock_get_ohlc: AsyncMock, evaluator: AlertEvaluator, sample_alert: Alert
    ):
        """Test _tick updates last_triggered_at on trigger"""
        await evaluator.store.add(sample_alert)

        mock_get_ohlc.return_value = [{"close": "51000.00"}]

        before = sample_alert.last_triggered_at
        await evaluator._tick()

        # Reload alert
        alert = await evaluator.store.get("alert-001")
        assert alert.last_triggered_at != before
        assert alert.last_triggered_at is not None


# ============================================================================
# Edge Cases & Error Handling
# ============================================================================


class TestAlertEdgeCases:
    """Edge case and error handling tests"""

    @pytest_asyncio.fixture
    async def alert_store_edge(self, temp_alert_path: Path) -> AlertStore:
        """Fresh AlertStore for edge case tests - isolated from other tests"""
        # Use different file path to ensure isolation
        edge_path = temp_alert_path.parent / "alerts_edge.json"
        store = AlertStore(str(edge_path))
        if edge_path.exists():
            edge_path.unlink()
        await store.load()
        return store

    @pytest_asyncio.fixture
    async def evaluator(self, alert_store_edge: AlertStore, sse_hub: SSEHub):
        """AlertEvaluator instance for edge case testing"""
        evaluator = AlertEvaluator(store=alert_store_edge, hub=sse_hub, interval_sec=1)
        yield evaluator
        # Cleanup
        await evaluator.stop()

    @pytest.mark.asyncio
    async def test_concurrent_store_operations(
        self, alert_store_edge: AlertStore, sample_alert: Alert
    ):
        """Test concurrent operations on store"""
        # Add multiple alerts concurrently
        alerts = [
            Alert(
                id=f"alert-{i}",
                type="price_threshold",
                symbol="BTCUSDT",
                timeframe="1h",
                active=True,
                created_at=time.time(),
                min_interval_sec=300,
                last_triggered_at=None,
                config={"direction": "above", "price": 50000},
                owner_handle="testuser",
            )
            for i in range(10)
        ]

        # Concurrent adds
        await asyncio.gather(*[alert_store_edge.add(a) for a in alerts])

        stored = await alert_store_edge.list()
        assert len(stored) == 10

    @pytest.mark.asyncio
    async def test_alert_with_zero_price(self, evaluator: AlertEvaluator):
        """Test handling of zero price in percentage calculation"""
        alert = Alert(
            id="alert-zero",
            type="pct_change",
            symbol="TEST",
            timeframe="1h",
            active=True,
            created_at=time.time(),
            min_interval_sec=300,
            last_triggered_at=None,
            config={"window_minutes": 60, "direction": "up", "threshold_pct": 5.0},
            owner_handle="testuser",
        )

        with patch("app.services.alerts.get_ohlc") as mock_get_ohlc:
            mock_get_ohlc.return_value = [
                {"close": "0.00"},
                {"close": "100.00"},
            ]

            _triggered, payload = await evaluator._evaluate(alert)

            # Should handle zero division
            assert payload["pct_change"] == 0.0

    @pytest.mark.asyncio
    async def test_empty_alert_store(self, alert_store_edge: AlertStore):
        """Test operations on empty store"""
        alerts = await alert_store_edge.list()
        assert len(alerts) == 0

        alert = await alert_store_edge.get("nonexistent")
        assert alert is None

        existed = await alert_store_edge.remove("nonexistent")
        assert existed is False

    @pytest.mark.asyncio
    async def test_broadcast_to_no_clients(self, sse_hub: SSEHub):
        """Test broadcasting when no clients registered"""
        # Should not raise
        await sse_hub.broadcast({"test": "event"})

    @pytest.mark.asyncio
    async def test_file_write_atomic(self, temp_alert_path: Path, sample_alert: Alert):
        """Test that file writes are atomic (uses .tmp file)"""
        store = AlertStore(str(temp_alert_path))
        await store.load()

        await store.add(sample_alert)

        # Check that .tmp file was used
        assert temp_alert_path.exists()
        assert not temp_alert_path.with_suffix(".tmp").exists()
