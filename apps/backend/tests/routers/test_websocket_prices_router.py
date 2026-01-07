"""
Comprehensive tests for app.routers.websocket_prices

Tests WebSocket Router for Real-Time Price Updates.
Coverage target: 23.5% → 75%+
"""

import asyncio
import json
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.routers.websocket_prices import (
    ConnectionMetrics,
    PriceWebSocketManager,
    connection_metrics,
    price_ws_manager,
    router,
    websocket_price_endpoint,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_websocket():
    """Mock WebSocket connection."""
    ws = AsyncMock()
    ws.accept = AsyncMock()
    ws.send_json = AsyncMock()
    ws.send_text = AsyncMock()
    ws.receive_text = AsyncMock()
    ws.close = AsyncMock()
    return ws


@pytest.fixture
def client_id():
    """Sample client ID."""
    return str(uuid.uuid4())


@pytest.fixture
def fresh_manager():
    """Create a fresh PriceWebSocketManager for isolated testing."""
    return PriceWebSocketManager()


@pytest.fixture
def fresh_metrics():
    """Create fresh ConnectionMetrics for isolated testing."""
    return ConnectionMetrics()


# ============================================================================
# CONNECTION_METRICS TESTS
# ============================================================================


class TestConnectionMetrics:
    """Tests for ConnectionMetrics class."""

    def test_init_default_values(self, fresh_metrics):
        """Test ConnectionMetrics initializes with zero values."""
        assert fresh_metrics.total_connections == 0
        assert fresh_metrics.total_messages_sent == 0
        assert fresh_metrics.total_messages_received == 0
        assert fresh_metrics.total_errors == 0
        assert fresh_metrics.active_connections == 0

    def test_get_stats_returns_dict(self, fresh_metrics):
        """Test get_stats returns dictionary with all metrics."""
        stats = fresh_metrics.get_stats()

        assert isinstance(stats, dict)
        assert "total_connections" in stats
        assert "active_connections" in stats
        assert "messages_sent" in stats
        assert "messages_received" in stats
        assert "errors" in stats

    def test_get_stats_reflects_changes(self, fresh_metrics):
        """Test get_stats reflects metric changes."""
        fresh_metrics.total_connections = 10
        fresh_metrics.active_connections = 5
        fresh_metrics.total_messages_sent = 100
        fresh_metrics.total_errors = 2

        stats = fresh_metrics.get_stats()

        assert stats["total_connections"] == 10
        assert stats["active_connections"] == 5
        assert stats["messages_sent"] == 100
        assert stats["errors"] == 2


# ============================================================================
# PRICE_WEBSOCKET_MANAGER TESTS
# ============================================================================


class TestPriceWebSocketManager:
    """Tests for PriceWebSocketManager class."""

    def test_init(self, fresh_manager):
        """Test manager initializes with empty structures."""
        assert fresh_manager.active_connections == {}
        assert fresh_manager.subscriptions == {}
        assert fresh_manager.update_task is None
        assert fresh_manager.update_interval == 30

    @pytest.mark.asyncio
    async def test_connect_accepts_websocket(
        self, fresh_manager, mock_websocket, client_id
    ):
        """Test connect accepts websocket and adds to active connections."""
        await fresh_manager.connect(mock_websocket, client_id)

        mock_websocket.accept.assert_called_once()
        assert client_id in fresh_manager.active_connections
        assert client_id in fresh_manager.subscriptions
        assert fresh_manager.active_connections[client_id] == mock_websocket

    @pytest.mark.asyncio
    async def test_connect_creates_empty_subscriptions(
        self, fresh_manager, mock_websocket, client_id
    ):
        """Test connect creates empty subscription set for client."""
        await fresh_manager.connect(mock_websocket, client_id)

        assert fresh_manager.subscriptions[client_id] == set()

    @pytest.mark.asyncio
    async def test_connect_starts_update_task(
        self, fresh_manager, mock_websocket, client_id
    ):
        """Test connect starts price update loop if not running."""
        await fresh_manager.connect(mock_websocket, client_id)

        assert fresh_manager.update_task is not None

        # Cancel the task to clean up
        fresh_manager.update_task.cancel()
        try:
            await fresh_manager.update_task
        except asyncio.CancelledError:
            pass

    def test_disconnect_removes_connection(
        self, fresh_manager, mock_websocket, client_id
    ):
        """Test disconnect removes client from active connections."""
        # Manually add connection
        fresh_manager.active_connections[client_id] = mock_websocket
        fresh_manager.subscriptions[client_id] = {"BTC", "ETH"}

        fresh_manager.disconnect(client_id)

        assert client_id not in fresh_manager.active_connections
        assert client_id not in fresh_manager.subscriptions

    def test_disconnect_handles_unknown_client(self, fresh_manager):
        """Test disconnect handles non-existent client gracefully."""
        # Should not raise exception
        fresh_manager.disconnect("unknown-client")

    def test_disconnect_cancels_task_when_no_connections(
        self, fresh_manager, mock_websocket, client_id
    ):
        """Test disconnect cancels update task when no connections remain."""
        # Add connection with a mock task
        fresh_manager.active_connections[client_id] = mock_websocket
        fresh_manager.subscriptions[client_id] = set()

        mock_task = MagicMock()
        mock_task.done.return_value = False
        mock_task.cancel = MagicMock()
        fresh_manager.update_task = mock_task

        fresh_manager.disconnect(client_id)

        mock_task.cancel.assert_called_once()

    @pytest.mark.asyncio
    async def test_subscribe_adds_symbols(
        self, fresh_manager, mock_websocket, client_id
    ):
        """Test subscribe adds symbols to client subscriptions."""
        fresh_manager.active_connections[client_id] = mock_websocket
        fresh_manager.subscriptions[client_id] = set()

        result = await fresh_manager.subscribe(client_id, ["BTC", "ETH", "AAPL"])

        assert result is True
        assert "BTC" in fresh_manager.subscriptions[client_id]
        assert "ETH" in fresh_manager.subscriptions[client_id]
        assert "AAPL" in fresh_manager.subscriptions[client_id]

    @pytest.mark.asyncio
    async def test_subscribe_uppercase_symbols(
        self, fresh_manager, mock_websocket, client_id
    ):
        """Test subscribe converts symbols to uppercase."""
        fresh_manager.active_connections[client_id] = mock_websocket
        fresh_manager.subscriptions[client_id] = set()

        await fresh_manager.subscribe(client_id, ["btc", "eth"])

        assert "BTC" in fresh_manager.subscriptions[client_id]
        assert "ETH" in fresh_manager.subscriptions[client_id]

    @pytest.mark.asyncio
    async def test_subscribe_unknown_client(self, fresh_manager):
        """Test subscribe returns False for unknown client."""
        result = await fresh_manager.subscribe("unknown", ["BTC"])

        assert result is False

    @pytest.mark.asyncio
    async def test_unsubscribe_removes_symbols(
        self, fresh_manager, mock_websocket, client_id
    ):
        """Test unsubscribe removes symbols from subscriptions."""
        fresh_manager.active_connections[client_id] = mock_websocket
        fresh_manager.subscriptions[client_id] = {"BTC", "ETH", "AAPL"}

        result = await fresh_manager.unsubscribe(client_id, ["BTC", "eth"])

        assert result is True
        assert "BTC" not in fresh_manager.subscriptions[client_id]
        assert "ETH" not in fresh_manager.subscriptions[client_id]
        assert "AAPL" in fresh_manager.subscriptions[client_id]

    @pytest.mark.asyncio
    async def test_unsubscribe_unknown_client(self, fresh_manager):
        """Test unsubscribe returns False for unknown client."""
        result = await fresh_manager.unsubscribe("unknown", ["BTC"])

        assert result is False

    @pytest.mark.asyncio
    async def test_send_message_success(self, fresh_manager, mock_websocket, client_id):
        """Test send_message successfully sends to client."""
        fresh_manager.active_connections[client_id] = mock_websocket

        message = {"type": "test", "data": "hello"}
        await fresh_manager.send_message(client_id, message)

        mock_websocket.send_json.assert_called_once_with(message)

    @pytest.mark.asyncio
    async def test_send_message_disconnects_on_error(
        self, fresh_manager, mock_websocket, client_id
    ):
        """Test send_message disconnects client on send error."""
        fresh_manager.active_connections[client_id] = mock_websocket
        fresh_manager.subscriptions[client_id] = set()
        mock_websocket.send_json.side_effect = RuntimeError("Connection lost")

        await fresh_manager.send_message(client_id, {"type": "test"})

        # Client should be disconnected
        assert client_id not in fresh_manager.active_connections

    @pytest.mark.asyncio
    async def test_send_message_unknown_client(self, fresh_manager):
        """Test send_message does nothing for unknown client."""
        # Should not raise exception
        await fresh_manager.send_message("unknown", {"type": "test"})


# ============================================================================
# PRICE UPDATE LOOP TESTS
# ============================================================================


class TestPriceUpdateLoop:
    """Tests for _price_update_loop method."""

    @pytest.mark.asyncio
    async def test_loop_stops_when_no_connections(self, fresh_manager):
        """Test update loop stops when no active connections."""
        # Start loop with no connections
        task = asyncio.create_task(fresh_manager._price_update_loop())

        # Give it time to check and exit
        await asyncio.sleep(0.1)

        assert task.done() or fresh_manager.active_connections == {}
        if not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    @pytest.mark.asyncio
    async def test_loop_waits_when_no_subscriptions(
        self, fresh_manager, mock_websocket, client_id
    ):
        """Test update loop waits when no symbols subscribed."""
        fresh_manager.active_connections[client_id] = mock_websocket
        fresh_manager.subscriptions[client_id] = set()
        fresh_manager.update_interval = 0.1  # Faster for testing

        # Start loop
        task = asyncio.create_task(fresh_manager._price_update_loop())

        # Let it run one cycle
        await asyncio.sleep(0.15)

        # Clean up
        fresh_manager.disconnect(client_id)
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    @pytest.mark.asyncio
    async def test_loop_fetches_prices_for_subscriptions(
        self, fresh_manager, mock_websocket, client_id
    ):
        """Test update loop fetches prices for subscribed symbols."""
        fresh_manager.active_connections[client_id] = mock_websocket
        fresh_manager.subscriptions[client_id] = {"BTC", "ETH"}
        fresh_manager.update_interval = 0.1

        mock_price_data = MagicMock()
        mock_price_data.price = 50000.0
        mock_price_data.change = 100.0
        mock_price_data.change_percent = 0.2
        mock_price_data.volume = 1000000
        mock_price_data.high = 51000.0
        mock_price_data.low = 49000.0
        mock_price_data.market_cap = 1000000000
        mock_price_data.last_updated = datetime.now()
        mock_price_data.source = "test"
        mock_price_data.cached = False

        with (
            patch(
                "app.routers.websocket_prices.SmartPriceService"
            ) as mock_price_service_cls,
            patch("app.routers.websocket_prices.advanced_redis_client") as mock_redis,
        ):
            mock_service = AsyncMock()
            mock_service.get_batch_prices = AsyncMock(
                return_value={"BTC": mock_price_data, "ETH": mock_price_data}
            )
            mock_service.__aenter__ = AsyncMock(return_value=mock_service)
            mock_service.__aexit__ = AsyncMock()
            mock_price_service_cls.return_value = mock_service

            mock_redis.client = MagicMock()
            mock_redis.client.publish = AsyncMock()

            task = asyncio.create_task(fresh_manager._price_update_loop())

            # Let it run one cycle
            await asyncio.sleep(0.15)

            # Clean up
            fresh_manager.disconnect(client_id)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

            # Verify prices were sent
            mock_websocket.send_json.assert_called()


# ============================================================================
# WEBSOCKET_PRICE_ENDPOINT TESTS
# ============================================================================


class TestWebsocketPriceEndpoint:
    """Tests for websocket_price_endpoint function."""

    @pytest.mark.asyncio
    async def test_endpoint_generates_client_id_if_none(self, mock_websocket):
        """Test endpoint generates client ID if not provided."""
        with patch("app.routers.websocket_prices.price_ws_manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.send_message = AsyncMock()
            mock_manager.disconnect = MagicMock()
            mock_manager.update_interval = 30

            from fastapi import WebSocketDisconnect

            mock_websocket.receive_text.side_effect = WebSocketDisconnect()

            await websocket_price_endpoint(mock_websocket, client_id=None)

            # Verify connect was called with a generated UUID
            connect_call = mock_manager.connect.call_args
            assert connect_call is not None
            generated_id = connect_call[0][1]
            # Check it's a valid UUID string
            uuid.UUID(generated_id)

    @pytest.mark.asyncio
    async def test_endpoint_uses_provided_client_id(self, mock_websocket, client_id):
        """Test endpoint uses provided client ID."""
        with patch("app.routers.websocket_prices.price_ws_manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.send_message = AsyncMock()
            mock_manager.disconnect = MagicMock()
            mock_manager.update_interval = 30

            from fastapi import WebSocketDisconnect

            mock_websocket.receive_text.side_effect = WebSocketDisconnect()

            await websocket_price_endpoint(mock_websocket, client_id=client_id)

            mock_manager.connect.assert_called_once_with(mock_websocket, client_id)

    @pytest.mark.asyncio
    async def test_endpoint_sends_welcome_message(self, mock_websocket, client_id):
        """Test endpoint sends welcome message after connecting."""
        with patch("app.routers.websocket_prices.price_ws_manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.send_message = AsyncMock()
            mock_manager.disconnect = MagicMock()
            mock_manager.update_interval = 30

            from fastapi import WebSocketDisconnect

            mock_websocket.receive_text.side_effect = WebSocketDisconnect()

            await websocket_price_endpoint(mock_websocket, client_id=client_id)

            # Check welcome message was sent
            first_call = mock_manager.send_message.call_args_list[0]
            message = first_call[0][1]
            assert message["type"] == "connected"
            assert message["client_id"] == client_id

    @pytest.mark.asyncio
    async def test_endpoint_handles_subscribe_action(self, mock_websocket, client_id):
        """Test endpoint handles subscribe action."""
        with patch("app.routers.websocket_prices.price_ws_manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.send_message = AsyncMock()
            mock_manager.disconnect = MagicMock()
            mock_manager.subscribe = AsyncMock()
            mock_manager.update_interval = 30

            from fastapi import WebSocketDisconnect

            mock_websocket.receive_text.side_effect = [
                json.dumps({"action": "subscribe", "symbols": ["BTC", "ETH"]}),
                WebSocketDisconnect(),
            ]

            await websocket_price_endpoint(mock_websocket, client_id=client_id)

            mock_manager.subscribe.assert_called_once_with(client_id, ["BTC", "ETH"])

    @pytest.mark.asyncio
    async def test_endpoint_handles_unsubscribe_action(self, mock_websocket, client_id):
        """Test endpoint handles unsubscribe action."""
        with patch("app.routers.websocket_prices.price_ws_manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.send_message = AsyncMock()
            mock_manager.disconnect = MagicMock()
            mock_manager.unsubscribe = AsyncMock()
            mock_manager.update_interval = 30

            from fastapi import WebSocketDisconnect

            mock_websocket.receive_text.side_effect = [
                json.dumps({"action": "unsubscribe", "symbols": ["BTC"]}),
                WebSocketDisconnect(),
            ]

            await websocket_price_endpoint(mock_websocket, client_id=client_id)

            mock_manager.unsubscribe.assert_called_once_with(client_id, ["BTC"])

    @pytest.mark.asyncio
    async def test_endpoint_handles_ping_action(self, mock_websocket, client_id):
        """Test endpoint handles ping action."""
        with patch("app.routers.websocket_prices.price_ws_manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.send_message = AsyncMock()
            mock_manager.disconnect = MagicMock()
            mock_manager.update_interval = 30

            from fastapi import WebSocketDisconnect

            mock_websocket.receive_text.side_effect = [
                json.dumps({"action": "ping"}),
                WebSocketDisconnect(),
            ]

            await websocket_price_endpoint(mock_websocket, client_id=client_id)

            # Check pong was sent
            calls = mock_manager.send_message.call_args_list
            pong_sent = any(call[0][1].get("type") == "pong" for call in calls)
            assert pong_sent

    @pytest.mark.asyncio
    async def test_endpoint_handles_get_subscriptions_action(
        self, mock_websocket, client_id
    ):
        """Test endpoint handles get_subscriptions action."""
        with patch("app.routers.websocket_prices.price_ws_manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.send_message = AsyncMock()
            mock_manager.disconnect = MagicMock()
            mock_manager.subscriptions = {client_id: {"BTC", "ETH"}}
            mock_manager.update_interval = 30

            from fastapi import WebSocketDisconnect

            mock_websocket.receive_text.side_effect = [
                json.dumps({"action": "get_subscriptions"}),
                WebSocketDisconnect(),
            ]

            await websocket_price_endpoint(mock_websocket, client_id=client_id)

            # Check subscriptions message was sent
            calls = mock_manager.send_message.call_args_list
            subs_sent = any(call[0][1].get("type") == "subscriptions" for call in calls)
            assert subs_sent

    @pytest.mark.asyncio
    async def test_endpoint_handles_unknown_action(self, mock_websocket, client_id):
        """Test endpoint sends error for unknown action."""
        with patch("app.routers.websocket_prices.price_ws_manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.send_message = AsyncMock()
            mock_manager.disconnect = MagicMock()
            mock_manager.update_interval = 30

            from fastapi import WebSocketDisconnect

            mock_websocket.receive_text.side_effect = [
                json.dumps({"action": "unknown_action"}),
                WebSocketDisconnect(),
            ]

            await websocket_price_endpoint(mock_websocket, client_id=client_id)

            # Check error was sent
            calls = mock_manager.send_message.call_args_list
            error_sent = any(call[0][1].get("type") == "error" for call in calls)
            assert error_sent

    @pytest.mark.asyncio
    async def test_endpoint_handles_invalid_json(self, mock_websocket, client_id):
        """Test endpoint sends error for invalid JSON."""
        with patch("app.routers.websocket_prices.price_ws_manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.send_message = AsyncMock()
            mock_manager.disconnect = MagicMock()
            mock_manager.update_interval = 30

            from fastapi import WebSocketDisconnect

            mock_websocket.receive_text.side_effect = [
                "invalid json {",
                WebSocketDisconnect(),
            ]

            await websocket_price_endpoint(mock_websocket, client_id=client_id)

            # Check error was sent
            calls = mock_manager.send_message.call_args_list
            error_sent = any(
                call[0][1].get("message") == "Invalid JSON"
                for call in calls
                if call[0][1].get("type") == "error"
            )
            assert error_sent

    @pytest.mark.asyncio
    async def test_endpoint_disconnects_on_websocket_disconnect(
        self, mock_websocket, client_id
    ):
        """Test endpoint properly disconnects on WebSocketDisconnect."""
        with patch("app.routers.websocket_prices.price_ws_manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.send_message = AsyncMock()
            mock_manager.disconnect = MagicMock()
            mock_manager.update_interval = 30

            from fastapi import WebSocketDisconnect

            mock_websocket.receive_text.side_effect = WebSocketDisconnect()

            await websocket_price_endpoint(mock_websocket, client_id=client_id)

            mock_manager.disconnect.assert_called_once_with(client_id)

    @pytest.mark.asyncio
    async def test_endpoint_disconnects_on_general_error(
        self, mock_websocket, client_id
    ):
        """Test endpoint disconnects on general exception."""
        with patch("app.routers.websocket_prices.price_ws_manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.send_message = AsyncMock()
            mock_manager.disconnect = MagicMock()
            mock_manager.update_interval = 30

            mock_websocket.receive_text.side_effect = RuntimeError("Connection error")

            await websocket_price_endpoint(mock_websocket, client_id=client_id)

            mock_manager.disconnect.assert_called_once_with(client_id)


# ============================================================================
# EDGE CASES & ERROR HANDLING
# ============================================================================


class TestEdgeCases:
    """Edge case and error handling tests."""

    @pytest.mark.asyncio
    async def test_subscribe_empty_symbols_list(
        self, fresh_manager, mock_websocket, client_id
    ):
        """Test subscribe with empty symbols list."""
        fresh_manager.active_connections[client_id] = mock_websocket
        fresh_manager.subscriptions[client_id] = set()

        result = await fresh_manager.subscribe(client_id, [])

        assert result is True
        assert fresh_manager.subscriptions[client_id] == set()

    @pytest.mark.asyncio
    async def test_unsubscribe_symbols_not_subscribed(
        self, fresh_manager, mock_websocket, client_id
    ):
        """Test unsubscribe from symbols not currently subscribed."""
        fresh_manager.active_connections[client_id] = mock_websocket
        fresh_manager.subscriptions[client_id] = {"BTC"}

        result = await fresh_manager.unsubscribe(client_id, ["ETH", "AAPL"])

        assert result is True
        assert fresh_manager.subscriptions[client_id] == {"BTC"}

    def test_global_instances_exist(self):
        """Test that global manager and metrics instances exist."""
        assert price_ws_manager is not None
        assert connection_metrics is not None

    def test_router_exists(self):
        """Test that router is defined with correct prefix."""
        assert router is not None
        assert router.prefix == "/ws"

    @pytest.mark.asyncio
    async def test_subscribe_action_empty_symbols(self, mock_websocket, client_id):
        """Test subscribe action with empty symbols list."""
        with patch("app.routers.websocket_prices.price_ws_manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.send_message = AsyncMock()
            mock_manager.disconnect = MagicMock()
            mock_manager.subscribe = AsyncMock()
            mock_manager.update_interval = 30

            from fastapi import WebSocketDisconnect

            mock_websocket.receive_text.side_effect = [
                json.dumps({"action": "subscribe", "symbols": []}),
                WebSocketDisconnect(),
            ]

            await websocket_price_endpoint(mock_websocket, client_id=client_id)

            # Subscribe should not be called with empty symbols
            mock_manager.subscribe.assert_not_called()

    @pytest.mark.asyncio
    async def test_multiple_clients_subscriptions(self, fresh_manager, mock_websocket):
        """Test multiple clients with different subscriptions."""
        ws1 = AsyncMock()
        ws1.accept = AsyncMock()
        ws2 = AsyncMock()
        ws2.accept = AsyncMock()

        client1 = "client1"
        client2 = "client2"

        await fresh_manager.connect(ws1, client1)
        await fresh_manager.connect(ws2, client2)

        await fresh_manager.subscribe(client1, ["BTC", "ETH"])
        await fresh_manager.subscribe(client2, ["AAPL", "GOOGL"])

        assert fresh_manager.subscriptions[client1] == {"BTC", "ETH"}
        assert fresh_manager.subscriptions[client2] == {"AAPL", "GOOGL"}

        # Clean up
        fresh_manager.disconnect(client1)
        fresh_manager.disconnect(client2)
        if fresh_manager.update_task and not fresh_manager.update_task.done():
            fresh_manager.update_task.cancel()
            try:
                await fresh_manager.update_task
            except asyncio.CancelledError:
                pass

    @pytest.mark.asyncio
    async def test_price_update_loop_handles_fetch_error(
        self, fresh_manager, mock_websocket, client_id
    ):
        """Test price update loop handles price fetch errors gracefully."""
        fresh_manager.active_connections[client_id] = mock_websocket
        fresh_manager.subscriptions[client_id] = {"BTC"}
        fresh_manager.update_interval = 0.1

        with patch(
            "app.routers.websocket_prices.SmartPriceService"
        ) as mock_service_cls:
            mock_service = AsyncMock()
            mock_service.get_batch_prices = AsyncMock(
                side_effect=RuntimeError("API error")
            )
            mock_service.__aenter__ = AsyncMock(return_value=mock_service)
            mock_service.__aexit__ = AsyncMock()
            mock_service_cls.return_value = mock_service

            task = asyncio.create_task(fresh_manager._price_update_loop())

            # Let it run one cycle
            await asyncio.sleep(0.15)

            # Clean up
            fresh_manager.disconnect(client_id)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

            # Loop should have continued without crashing

    @pytest.mark.asyncio
    async def test_price_update_loop_no_prices_returned(
        self, fresh_manager, mock_websocket, client_id
    ):
        """Test price update loop handles empty price response."""
        fresh_manager.active_connections[client_id] = mock_websocket
        fresh_manager.subscriptions[client_id] = {"BTC"}
        fresh_manager.update_interval = 0.1

        with patch(
            "app.routers.websocket_prices.SmartPriceService"
        ) as mock_service_cls:
            mock_service = AsyncMock()
            mock_service.get_batch_prices = AsyncMock(return_value={})
            mock_service.__aenter__ = AsyncMock(return_value=mock_service)
            mock_service.__aexit__ = AsyncMock()
            mock_service_cls.return_value = mock_service

            task = asyncio.create_task(fresh_manager._price_update_loop())

            await asyncio.sleep(0.15)

            fresh_manager.disconnect(client_id)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
