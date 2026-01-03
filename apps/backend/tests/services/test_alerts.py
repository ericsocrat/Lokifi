"""
Comprehensive tests for AlertService (app/services/alerts.py).

Business-critical testing covering:
- Alert storage and retrieval (AlertStore)
- Alert evaluation logic (price thresholds, percentage changes)
- SSE broadcasting (SSEHub)
- Background evaluation loop (AlertEvaluator)
- Debouncing and rate limiting
- Concurrent access and thread safety
"""

import asyncio
import json
import time
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.alerts import Alert, AlertEvaluator, AlertStore, SSEHub

# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def temp_alert_path(tmp_path: Path) -> Path:
    """Temporary path for alert storage during tests."""
    return tmp_path / "test_alerts.json"


@pytest.fixture
def alert_store(temp_alert_path: Path) -> AlertStore:
    """Create AlertStore instance with temporary storage."""
    return AlertStore(str(temp_alert_path))


@pytest.fixture
def sse_hub() -> SSEHub:
    """Create SSEHub instance for broadcasting."""
    return SSEHub()


@pytest.fixture
def alert_evaluator(alert_store: AlertStore, sse_hub: SSEHub) -> AlertEvaluator:
    """Create AlertEvaluator with mocked dependencies."""
    return AlertEvaluator(store=alert_store, hub=sse_hub, interval_sec=1)


@pytest.fixture
def sample_price_threshold_alert() -> Alert:
    """Sample price threshold alert."""
    return Alert(
        id="test_alert_1",
        type="price_threshold",
        symbol="BTCUSD",
        timeframe="1h",
        active=True,
        created_at=time.time(),
        min_interval_sec=60,
        last_triggered_at=None,
        config={"direction": "above", "price": 50000},
        owner_handle="testuser",
    )


@pytest.fixture
def sample_pct_change_alert() -> Alert:
    """Sample percentage change alert."""
    return Alert(
        id="test_alert_2",
        type="pct_change",
        symbol="ETHUSD",
        timeframe="15m",
        active=True,
        created_at=time.time(),
        min_interval_sec=120,
        last_triggered_at=None,
        config={"window_minutes": 60, "direction": "down", "threshold_pct": -5.0},
        owner_handle="testuser",
    )


# ============================================================================
# AlertStore Tests
# ============================================================================


class TestAlertStore:
    """Test AlertStore persistence and CRUD operations."""

    async def test_initialization(
        self, alert_store: AlertStore, temp_alert_path: Path
    ) -> None:
        """Test AlertStore initializes with correct path."""
        assert alert_store.path == temp_alert_path
        assert isinstance(alert_store._alerts, dict)
        assert len(alert_store._alerts) == 0

    async def test_load_creates_file_if_not_exists(
        self, alert_store: AlertStore, temp_alert_path: Path
    ) -> None:
        """Test load() creates empty file if doesn't exist."""
        await alert_store.load()

        assert temp_alert_path.exists()
        data = json.loads(temp_alert_path.read_text())
        assert data == {}

    async def test_load_reads_existing_alerts(
        self,
        alert_store: AlertStore,
        temp_alert_path: Path,
        sample_price_threshold_alert: Alert,
    ) -> None:
        """Test load() reads alerts from existing file."""
        # Pre-populate file
        alert_data = {
            sample_price_threshold_alert.id: vars(sample_price_threshold_alert)
        }
        temp_alert_path.parent.mkdir(parents=True, exist_ok=True)
        temp_alert_path.write_text(json.dumps(alert_data))

        await alert_store.load()

        assert len(alert_store._alerts) == 1
        assert sample_price_threshold_alert.id in alert_store._alerts
        loaded_alert = alert_store._alerts[sample_price_threshold_alert.id]
        assert loaded_alert.symbol == "BTCUSD"
        assert loaded_alert.type == "price_threshold"

    async def test_load_handles_corrupted_file(
        self, alert_store: AlertStore, temp_alert_path: Path
    ) -> None:
        """Test load() handles corrupted JSON gracefully."""
        temp_alert_path.parent.mkdir(parents=True, exist_ok=True)
        temp_alert_path.write_text("{ invalid json }")

        await alert_store.load()

        # Should initialize with empty dict and save valid JSON
        assert len(alert_store._alerts) == 0
        assert temp_alert_path.exists()
        data = json.loads(temp_alert_path.read_text())
        assert data == {}

    async def test_save_persists_alerts(
        self,
        alert_store: AlertStore,
        temp_alert_path: Path,
        sample_price_threshold_alert: Alert,
    ) -> None:
        """Test save() writes alerts to disk."""
        alert_store._alerts[sample_price_threshold_alert.id] = (
            sample_price_threshold_alert
        )

        await alert_store.save()

        assert temp_alert_path.exists()
        data = json.loads(temp_alert_path.read_text())
        assert sample_price_threshold_alert.id in data
        assert data[sample_price_threshold_alert.id]["symbol"] == "BTCUSD"

    async def test_list_returns_all_alerts(
        self,
        alert_store: AlertStore,
        sample_price_threshold_alert: Alert,
        sample_pct_change_alert: Alert,
    ) -> None:
        """Test list() returns all stored alerts."""
        alert_store._alerts[sample_price_threshold_alert.id] = (
            sample_price_threshold_alert
        )
        alert_store._alerts[sample_pct_change_alert.id] = sample_pct_change_alert

        alerts = await alert_store.list()

        assert len(alerts) == 2
        alert_ids = [a.id for a in alerts]
        assert sample_price_threshold_alert.id in alert_ids
        assert sample_pct_change_alert.id in alert_ids

    async def test_add_alert(
        self,
        alert_store: AlertStore,
        temp_alert_path: Path,
        sample_price_threshold_alert: Alert,
    ) -> None:
        """Test add() stores alert and persists to disk."""
        result = await alert_store.add(sample_price_threshold_alert)

        assert result.id == sample_price_threshold_alert.id
        assert sample_price_threshold_alert.id in alert_store._alerts

        # Verify persisted
        data = json.loads(temp_alert_path.read_text())
        assert sample_price_threshold_alert.id in data

    async def test_remove_alert_existing(
        self,
        alert_store: AlertStore,
        temp_alert_path: Path,
        sample_price_threshold_alert: Alert,
    ) -> None:
        """Test remove() deletes existing alert."""
        alert_store._alerts[sample_price_threshold_alert.id] = (
            sample_price_threshold_alert
        )

        result = await alert_store.remove(sample_price_threshold_alert.id)

        assert result is True
        assert sample_price_threshold_alert.id not in alert_store._alerts

        # Verify persisted
        data = json.loads(temp_alert_path.read_text())
        assert sample_price_threshold_alert.id not in data

    async def test_remove_alert_nonexistent(self, alert_store: AlertStore) -> None:
        """Test remove() returns False for nonexistent alert."""
        result = await alert_store.remove("nonexistent_alert")

        assert result is False

    async def test_get_alert_existing(
        self, alert_store: AlertStore, sample_price_threshold_alert: Alert
    ) -> None:
        """Test get() retrieves existing alert."""
        alert_store._alerts[sample_price_threshold_alert.id] = (
            sample_price_threshold_alert
        )

        result = await alert_store.get(sample_price_threshold_alert.id)

        assert result is not None
        assert result.id == sample_price_threshold_alert.id
        assert result.symbol == "BTCUSD"

    async def test_get_alert_nonexistent(self, alert_store: AlertStore) -> None:
        """Test get() returns None for nonexistent alert."""
        result = await alert_store.get("nonexistent_alert")

        assert result is None

    async def test_set_active_existing_alert(
        self,
        alert_store: AlertStore,
        temp_alert_path: Path,
        sample_price_threshold_alert: Alert,
    ) -> None:
        """Test set_active() updates alert status."""
        sample_price_threshold_alert.active = True
        alert_store._alerts[sample_price_threshold_alert.id] = (
            sample_price_threshold_alert
        )

        result = await alert_store.set_active(sample_price_threshold_alert.id, False)

        assert result is not None
        assert result.active is False
        assert alert_store._alerts[sample_price_threshold_alert.id].active is False

        # Verify persisted
        data = json.loads(temp_alert_path.read_text())
        assert data[sample_price_threshold_alert.id]["active"] is False

    async def test_set_active_nonexistent_alert(self, alert_store: AlertStore) -> None:
        """Test set_active() returns None for nonexistent alert."""
        result = await alert_store.set_active("nonexistent_alert", True)

        assert result is None

    async def test_concurrent_add_operations(
        self, alert_store: AlertStore, sample_price_threshold_alert: Alert
    ) -> None:
        """Test thread-safe concurrent add operations."""
        alerts = [
            Alert(
                id=f"alert_{i}",
                type="price_threshold",
                symbol="BTCUSD",
                timeframe="1h",
                active=True,
                created_at=time.time(),
                min_interval_sec=60,
                last_triggered_at=None,
                config={"direction": "above", "price": 50000 + i},
                owner_handle="testuser",
            )
            for i in range(5)
        ]

        # Concurrent adds
        await asyncio.gather(*[alert_store.add(alert) for alert in alerts])

        result = await alert_store.list()
        assert len(result) == 5


# ============================================================================
# SSEHub Tests
# ============================================================================


class TestSSEHub:
    """Test SSEHub for Server-Sent Events broadcasting."""

    async def test_register_client(self, sse_hub: SSEHub) -> None:
        """Test registering a new client."""
        queue = await sse_hub.register()

        assert isinstance(queue, asyncio.Queue)
        assert queue in sse_hub._clients

    async def test_unregister_client(self, sse_hub: SSEHub) -> None:
        """Test unregistering an existing client."""
        queue = await sse_hub.register()
        await sse_hub.unregister(queue)

        assert queue not in sse_hub._clients

    async def test_broadcast_to_single_client(self, sse_hub: SSEHub) -> None:
        """Test broadcasting event to single client."""
        queue = await sse_hub.register()
        event = {"type": "test", "data": "hello"}

        await sse_hub.broadcast(event)

        received = queue.get_nowait()
        assert received == event

    async def test_broadcast_to_multiple_clients(self, sse_hub: SSEHub) -> None:
        """Test broadcasting event to multiple clients."""
        queue1 = await sse_hub.register()
        queue2 = await sse_hub.register()
        queue3 = await sse_hub.register()
        event = {"type": "alert.triggered", "data": "test"}

        await sse_hub.broadcast(event)

        assert queue1.get_nowait() == event
        assert queue2.get_nowait() == event
        assert queue3.get_nowait() == event

    async def test_broadcast_handles_full_queue(self, sse_hub: SSEHub) -> None:
        """Test broadcast gracefully handles full queues."""
        queue = await sse_hub.register()

        # Fill queue to capacity (default asyncio.Queue has no limit, so create limited one)
        limited_queue = asyncio.Queue(maxsize=2)
        sse_hub._clients.clear()
        sse_hub._clients.add(limited_queue)

        # Fill queue
        await limited_queue.put("item1")
        await limited_queue.put("item2")

        # This should not raise exception (full queue is silently skipped)
        await sse_hub.broadcast({"type": "test", "data": "hello"})

        # Queue should still have original items
        assert limited_queue.get_nowait() == "item1"
        assert limited_queue.get_nowait() == "item2"


# ============================================================================
# AlertEvaluator Tests
# ============================================================================


class TestAlertEvaluator:
    """Test AlertEvaluator background evaluation logic."""

    async def test_initialization(
        self, alert_evaluator: AlertEvaluator, alert_store: AlertStore, sse_hub: SSEHub
    ) -> None:
        """Test AlertEvaluator initializes correctly."""
        assert alert_evaluator.store is alert_store
        assert alert_evaluator.hub is sse_hub
        assert alert_evaluator.interval_sec == 1
        assert alert_evaluator._task is None

    async def test_start_creates_background_task(
        self, alert_evaluator: AlertEvaluator
    ) -> None:
        """Test start() creates background evaluation task."""
        alert_evaluator.start()

        assert alert_evaluator._task is not None
        assert not alert_evaluator._task.done()

        await alert_evaluator.stop()

    async def test_start_idempotent(self, alert_evaluator: AlertEvaluator) -> None:
        """Test multiple start() calls are idempotent."""
        alert_evaluator.start()
        task1 = alert_evaluator._task

        alert_evaluator.start()
        task2 = alert_evaluator._task

        assert task1 is task2  # Same task instance

        await alert_evaluator.stop()

    async def test_stop_terminates_task(self, alert_evaluator: AlertEvaluator) -> None:
        """Test stop() terminates background task."""
        alert_evaluator.start()
        await asyncio.sleep(0.1)  # Let task start

        await alert_evaluator.stop()

        assert alert_evaluator._stop.is_set()

    @patch("app.services.alerts.get_ohlc")
    async def test_evaluate_price_threshold_above_triggered(
        self, mock_get_ohlc: AsyncMock, alert_evaluator: AlertEvaluator
    ) -> None:
        """Test price threshold alert triggers when price exceeds target."""
        alert = Alert(
            id="test_1",
            type="price_threshold",
            symbol="BTCUSD",
            timeframe="1h",
            active=True,
            created_at=time.time(),
            min_interval_sec=60,
            last_triggered_at=None,
            config={"direction": "above", "price": 50000},
            owner_handle="testuser",
        )

        mock_get_ohlc.return_value = [{"close": "51000"}]  # Above threshold

        triggered, payload = await alert_evaluator._evaluate(alert)

        assert triggered is True
        assert payload["price"] == 51000
        assert payload["target"] == 50000
        assert payload["direction"] == "above"

    @patch("app.services.alerts.get_ohlc")
    async def test_evaluate_price_threshold_above_not_triggered(
        self, mock_get_ohlc: AsyncMock, alert_evaluator: AlertEvaluator
    ) -> None:
        """Test price threshold alert doesn't trigger when price below target."""
        alert = Alert(
            id="test_2",
            type="price_threshold",
            symbol="BTCUSD",
            timeframe="1h",
            active=True,
            created_at=time.time(),
            min_interval_sec=60,
            last_triggered_at=None,
            config={"direction": "above", "price": 50000},
            owner_handle="testuser",
        )

        mock_get_ohlc.return_value = [{"close": "49000"}]  # Below threshold

        triggered, payload = await alert_evaluator._evaluate(alert)

        assert triggered is False
        assert payload["price"] == 49000

    @patch("app.services.alerts.get_ohlc")
    async def test_evaluate_price_threshold_below_triggered(
        self, mock_get_ohlc: AsyncMock, alert_evaluator: AlertEvaluator
    ) -> None:
        """Test price threshold alert triggers when price drops below target."""
        alert = Alert(
            id="test_3",
            type="price_threshold",
            symbol="BTCUSD",
            timeframe="1h",
            active=True,
            created_at=time.time(),
            min_interval_sec=60,
            last_triggered_at=None,
            config={"direction": "below", "price": 50000},
            owner_handle="testuser",
        )

        mock_get_ohlc.return_value = [{"close": "49000"}]  # Below threshold

        triggered, payload = await alert_evaluator._evaluate(alert)

        assert triggered is True
        assert payload["direction"] == "below"

    @patch("app.services.alerts.get_ohlc")
    async def test_evaluate_pct_change_down_triggered(
        self, mock_get_ohlc: AsyncMock, alert_evaluator: AlertEvaluator
    ) -> None:
        """Test percentage change alert triggers on price drop."""
        alert = Alert(
            id="test_4",
            type="pct_change",
            symbol="ETHUSD",
            timeframe="15m",
            active=True,
            created_at=time.time(),
            min_interval_sec=120,
            last_triggered_at=None,
            config={"window_minutes": 60, "direction": "down", "threshold_pct": -5.0},
            owner_handle="testuser",
        )

        # 6% drop: 3000 -> 2820
        mock_get_ohlc.return_value = [{"close": "3000"}, {"close": "2820"}]

        triggered, payload = await alert_evaluator._evaluate(alert)

        assert triggered is True
        assert payload["pct_change"] == -6.0
        assert payload["threshold_pct"] == -5.0

    @patch("app.services.alerts.get_ohlc")
    async def test_evaluate_pct_change_up_triggered(
        self, mock_get_ohlc: AsyncMock, alert_evaluator: AlertEvaluator
    ) -> None:
        """Test percentage change alert triggers on price increase."""
        alert = Alert(
            id="test_5",
            type="pct_change",
            symbol="BTCUSD",
            timeframe="1h",
            active=True,
            created_at=time.time(),
            min_interval_sec=60,
            last_triggered_at=None,
            config={"window_minutes": 60, "direction": "up", "threshold_pct": 3.0},
            owner_handle="testuser",
        )

        # 5% increase: 50000 -> 52500
        mock_get_ohlc.return_value = [{"close": "50000"}, {"close": "52500"}]

        triggered, payload = await alert_evaluator._evaluate(alert)

        assert triggered is True
        assert payload["pct_change"] == 5.0

    @patch("app.services.alerts.get_ohlc")
    async def test_evaluate_pct_change_abs_triggered(
        self, mock_get_ohlc: AsyncMock, alert_evaluator: AlertEvaluator
    ) -> None:
        """Test absolute percentage change alert triggers on any direction."""
        alert = Alert(
            id="test_6",
            type="pct_change",
            symbol="BTCUSD",
            timeframe="1h",
            active=True,
            created_at=time.time(),
            min_interval_sec=60,
            last_triggered_at=None,
            config={"window_minutes": 60, "direction": "abs", "threshold_pct": 3.0},
            owner_handle="testuser",
        )

        # 4% drop should trigger abs 3% threshold
        mock_get_ohlc.return_value = [{"close": "50000"}, {"close": "48000"}]

        triggered, payload = await alert_evaluator._evaluate(alert)

        assert triggered is True
        assert abs(payload["pct_change"]) == 4.0

    async def test_debouncing_prevents_rapid_triggers(
        self, alert_store: AlertStore, sse_hub: SSEHub
    ) -> None:
        """Test debouncing prevents alerts from triggering too frequently."""
        alert = Alert(
            id="test_7",
            type="price_threshold",
            symbol="BTCUSD",
            timeframe="1h",
            active=True,
            created_at=time.time(),
            min_interval_sec=300,  # 5 minutes
            last_triggered_at=time.time(),  # Just triggered
            config={"direction": "above", "price": 50000},
            owner_handle="testuser",
        )

        await alert_store.add(alert)
        evaluator = AlertEvaluator(store=alert_store, hub=sse_hub, interval_sec=1)

        with patch("app.services.alerts.get_ohlc") as mock_get_ohlc:
            mock_get_ohlc.return_value = [{"close": "51000"}]  # Would trigger

            # Should not broadcast due to debouncing
            queue = await sse_hub.register()
            await evaluator._tick()

            # Queue should be empty (no broadcast)
            assert queue.empty()


# ============================================================================
# Integration Tests
# ============================================================================


class TestAlertIntegration:
    """Integration tests for full alert workflow."""

    @patch("app.services.alerts.get_ohlc")
    async def test_full_alert_lifecycle(
        self,
        mock_get_ohlc: AsyncMock,
        alert_store: AlertStore,
        sse_hub: SSEHub,
        temp_alert_path: Path,
    ) -> None:
        """Test complete alert lifecycle: create, evaluate, trigger, persist."""
        # 1. Create alert
        alert = Alert(
            id="lifecycle_test",
            type="price_threshold",
            symbol="BTCUSD",
            timeframe="1h",
            active=True,
            created_at=time.time(),
            min_interval_sec=60,
            last_triggered_at=None,
            config={"direction": "above", "price": 50000},
            owner_handle="testuser",
        )

        await alert_store.add(alert)

        # 2. Setup evaluator
        evaluator = AlertEvaluator(store=alert_store, hub=sse_hub, interval_sec=1)
        queue = await sse_hub.register()

        # 3. Mock price data that triggers alert
        mock_get_ohlc.return_value = [{"close": "51000"}]

        # 4. Evaluate
        await evaluator._tick()

        # 5. Verify broadcast
        event = await asyncio.wait_for(queue.get(), timeout=1.0)
        assert event["type"] == "alert.triggered"
        assert event["alert"]["id"] == "lifecycle_test"
        assert event["payload"]["price"] == 51000

        # 6. Verify persistence
        data = json.loads(temp_alert_path.read_text())
        assert data["lifecycle_test"]["last_triggered_at"] is not None
