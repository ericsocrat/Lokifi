"""
Comprehensive tests for app.routers.websocket

Tests WebSocket endpoints for real-time direct messaging (J4) and notifications (J6).
Coverage target: 21.8% → 75%+
"""

import asyncio
import json
import uuid
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

from app.routers.websocket import (
    handle_mark_read,
    handle_typing_indicator,
    handle_websocket_message,
    notification_websocket_endpoint,
    notification_websocket_manager,
    notification_websocket_stats,
    router,
    websocket_endpoint,
    websocket_health,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_websocket():
    """Mock WebSocket connection."""
    ws = AsyncMock()
    ws.accept = AsyncMock()
    ws.send_text = AsyncMock()
    ws.receive_text = AsyncMock()
    ws.close = AsyncMock()
    return ws


@pytest.fixture
def sample_user_id():
    """Sample user UUID."""
    return uuid.uuid4()


@pytest.fixture
def sample_conversation_id():
    """Sample conversation UUID."""
    return uuid.uuid4()


@pytest.fixture
def sample_message_id():
    """Sample message UUID."""
    return uuid.uuid4()


@pytest.fixture
def mock_db_session():
    """Mock async database session."""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    return session


@pytest.fixture
def mock_participant():
    """Mock conversation participant."""
    participant = MagicMock()
    participant.user_id = uuid.uuid4()
    participant.is_active = True
    return participant


# ============================================================================
# ROUTER CONFIGURATION TESTS
# ============================================================================


class TestRouterConfig:
    """Test router configuration."""

    def test_router_exists(self):
        """Test that router is defined."""
        assert router is not None

    def test_notification_manager_initialized(self):
        """Test that notification WebSocket manager is initialized."""
        assert notification_websocket_manager is not None


# ============================================================================
# WEBSOCKET_ENDPOINT TESTS
# ============================================================================


class TestWebsocketEndpoint:
    """Tests for websocket_endpoint function."""

    @pytest.mark.asyncio
    async def test_unauthenticated_user_returns_early(self, mock_websocket):
        """Test that unauthenticated user connection returns early."""
        with patch(
            "app.routers.websocket.authenticate_websocket", new_callable=AsyncMock
        ) as mock_auth:
            mock_auth.return_value = None

            await websocket_endpoint(mock_websocket)

            mock_auth.assert_called_once_with(mock_websocket)
            # Should not connect to manager if not authenticated
            mock_websocket.receive_text.assert_not_called()

    @pytest.mark.asyncio
    async def test_authenticated_user_connects(self, mock_websocket, sample_user_id):
        """Test that authenticated user is connected to manager."""
        with (
            patch(
                "app.routers.websocket.authenticate_websocket", new_callable=AsyncMock
            ) as mock_auth,
            patch("app.routers.websocket.connection_manager") as mock_manager,
        ):
            mock_auth.return_value = sample_user_id
            mock_manager.connect = AsyncMock()
            mock_manager.disconnect = AsyncMock()

            # Simulate disconnect after first receive
            from fastapi import WebSocketDisconnect

            mock_websocket.receive_text.side_effect = WebSocketDisconnect()

            await websocket_endpoint(mock_websocket)

            mock_manager.connect.assert_called_once_with(mock_websocket, sample_user_id)
            mock_manager.disconnect.assert_called_once()

    @pytest.mark.asyncio
    async def test_websocket_disconnect_handled(self, mock_websocket, sample_user_id):
        """Test WebSocketDisconnect is handled gracefully."""
        with (
            patch(
                "app.routers.websocket.authenticate_websocket", new_callable=AsyncMock
            ) as mock_auth,
            patch("app.routers.websocket.connection_manager") as mock_manager,
        ):
            mock_auth.return_value = sample_user_id
            mock_manager.connect = AsyncMock()
            mock_manager.disconnect = AsyncMock()

            from fastapi import WebSocketDisconnect

            mock_websocket.receive_text.side_effect = WebSocketDisconnect()

            # Should not raise exception
            await websocket_endpoint(mock_websocket)

            mock_manager.disconnect.assert_called_once()

    @pytest.mark.asyncio
    async def test_general_exception_handled(self, mock_websocket, sample_user_id):
        """Test general exceptions are handled and user is disconnected."""
        with (
            patch(
                "app.routers.websocket.authenticate_websocket", new_callable=AsyncMock
            ) as mock_auth,
            patch("app.routers.websocket.connection_manager") as mock_manager,
        ):
            mock_auth.return_value = sample_user_id
            mock_manager.connect = AsyncMock()
            mock_manager.disconnect = AsyncMock()

            mock_websocket.receive_text.side_effect = RuntimeError("Connection lost")

            await websocket_endpoint(mock_websocket)

            # User should be disconnected even on error
            mock_manager.disconnect.assert_called_once()


# ============================================================================
# HANDLE_WEBSOCKET_MESSAGE TESTS
# ============================================================================


class TestHandleWebsocketMessage:
    """Tests for handle_websocket_message function."""

    @pytest.mark.asyncio
    async def test_ping_message_responds_pong(self, mock_websocket, sample_user_id):
        """Test that ping message receives pong response."""
        message = json.dumps({"type": "ping"})

        await handle_websocket_message(mock_websocket, sample_user_id, message)

        mock_websocket.send_text.assert_called_once()
        sent_data = json.loads(mock_websocket.send_text.call_args[0][0])
        assert sent_data["type"] == "pong"

    @pytest.mark.asyncio
    async def test_typing_message_calls_handler(self, mock_websocket, sample_user_id):
        """Test that typing message calls handle_typing_indicator."""
        conversation_id = str(uuid.uuid4())
        message = json.dumps(
            {
                "type": "typing",
                "conversation_id": conversation_id,
                "is_typing": True,
            }
        )

        with patch(
            "app.routers.websocket.handle_typing_indicator", new_callable=AsyncMock
        ) as mock_handler:
            await handle_websocket_message(mock_websocket, sample_user_id, message)

            mock_handler.assert_called_once()

    @pytest.mark.asyncio
    async def test_mark_read_message_calls_handler(
        self, mock_websocket, sample_user_id
    ):
        """Test that mark_read message calls handle_mark_read."""
        conversation_id = str(uuid.uuid4())
        message_id = str(uuid.uuid4())
        message = json.dumps(
            {
                "type": "mark_read",
                "conversation_id": conversation_id,
                "message_id": message_id,
            }
        )

        with patch(
            "app.routers.websocket.handle_mark_read", new_callable=AsyncMock
        ) as mock_handler:
            await handle_websocket_message(mock_websocket, sample_user_id, message)

            mock_handler.assert_called_once()

    @pytest.mark.asyncio
    async def test_unknown_message_type_logged(self, mock_websocket, sample_user_id):
        """Test that unknown message type is logged as warning."""
        message = json.dumps({"type": "unknown_type"})

        # Should not raise exception
        await handle_websocket_message(mock_websocket, sample_user_id, message)

    @pytest.mark.asyncio
    async def test_invalid_json_handled(self, mock_websocket, sample_user_id):
        """Test that invalid JSON is handled gracefully."""
        invalid_message = "not valid json {"

        # Should not raise exception
        await handle_websocket_message(mock_websocket, sample_user_id, invalid_message)

    @pytest.mark.asyncio
    async def test_empty_message_handled(self, mock_websocket, sample_user_id):
        """Test that empty message is handled."""
        empty_message = "{}"

        # Should not raise exception
        await handle_websocket_message(mock_websocket, sample_user_id, empty_message)


# ============================================================================
# HANDLE_TYPING_INDICATOR TESTS
# ============================================================================


class TestHandleTypingIndicator:
    """Tests for handle_typing_indicator function."""

    @pytest.mark.asyncio
    async def test_valid_typing_indicator(self, sample_user_id, sample_conversation_id):
        """Test valid typing indicator is broadcast."""
        data = {
            "conversation_id": str(sample_conversation_id),
            "is_typing": True,
        }

        mock_participant = MagicMock()
        mock_participant.user_id = sample_user_id

        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [mock_participant]
        mock_result.scalars.return_value = mock_scalars

        with (
            patch("app.routers.websocket.AsyncSessionLocal") as mock_session_local,
            patch("app.routers.websocket.connection_manager") as mock_manager,
        ):
            mock_db = AsyncMock()
            mock_db.execute = AsyncMock(return_value=mock_result)
            mock_session_local.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_session_local.return_value.__aexit__ = AsyncMock()

            mock_manager.broadcast_typing_indicator = AsyncMock()

            await handle_typing_indicator(sample_user_id, data)

            mock_manager.broadcast_typing_indicator.assert_called_once()

    @pytest.mark.asyncio
    async def test_unauthorized_user_typing(
        self, sample_user_id, sample_conversation_id
    ):
        """Test that unauthorized user cannot send typing indicator."""
        data = {
            "conversation_id": str(sample_conversation_id),
            "is_typing": True,
        }

        # Create participant with different user_id
        mock_participant = MagicMock()
        mock_participant.user_id = uuid.uuid4()  # Different user

        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [mock_participant]
        mock_result.scalars.return_value = mock_scalars

        with (
            patch("app.routers.websocket.AsyncSessionLocal") as mock_session_local,
            patch("app.routers.websocket.connection_manager") as mock_manager,
        ):
            mock_db = AsyncMock()
            mock_db.execute = AsyncMock(return_value=mock_result)
            mock_session_local.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_session_local.return_value.__aexit__ = AsyncMock()

            mock_manager.broadcast_typing_indicator = AsyncMock()

            await handle_typing_indicator(sample_user_id, data)

            # Should not broadcast if user not in participants
            mock_manager.broadcast_typing_indicator.assert_not_called()

    @pytest.mark.asyncio
    async def test_typing_indicator_exception_handled(self, sample_user_id):
        """Test that exceptions in typing indicator are handled."""
        data = {
            "conversation_id": "invalid-uuid",  # Invalid UUID
            "is_typing": True,
        }

        # Should not raise exception
        await handle_typing_indicator(sample_user_id, data)

    @pytest.mark.asyncio
    async def test_typing_indicator_default_is_typing(
        self, sample_user_id, sample_conversation_id
    ):
        """Test that is_typing defaults to False."""
        data = {
            "conversation_id": str(sample_conversation_id),
            # No is_typing key
        }

        mock_participant = MagicMock()
        mock_participant.user_id = sample_user_id

        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [mock_participant]
        mock_result.scalars.return_value = mock_scalars

        with (
            patch("app.routers.websocket.AsyncSessionLocal") as mock_session_local,
            patch("app.routers.websocket.connection_manager") as mock_manager,
        ):
            mock_db = AsyncMock()
            mock_db.execute = AsyncMock(return_value=mock_result)
            mock_session_local.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_session_local.return_value.__aexit__ = AsyncMock()

            mock_manager.broadcast_typing_indicator = AsyncMock()

            await handle_typing_indicator(sample_user_id, data)

            # Check is_typing was passed as False
            call_kwargs = mock_manager.broadcast_typing_indicator.call_args[1]
            assert call_kwargs["is_typing"] is False


# ============================================================================
# HANDLE_MARK_READ TESTS
# ============================================================================


class TestHandleMarkRead:
    """Tests for handle_mark_read function."""

    @pytest.mark.asyncio
    async def test_mark_read_success(
        self, sample_user_id, sample_conversation_id, sample_message_id
    ):
        """Test successful mark read operation."""
        data = {
            "conversation_id": str(sample_conversation_id),
            "message_id": str(sample_message_id),
        }

        mock_participant = MagicMock()
        mock_participant.user_id = sample_user_id

        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [mock_participant]
        mock_result.scalars.return_value = mock_scalars

        with (
            patch("app.routers.websocket.AsyncSessionLocal") as mock_session_local,
            patch("app.routers.websocket.ConversationService") as mock_conv_service_cls,
            patch("app.routers.websocket.connection_manager") as mock_manager,
        ):
            mock_db = AsyncMock()
            mock_db.execute = AsyncMock(return_value=mock_result)
            mock_session_local.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_session_local.return_value.__aexit__ = AsyncMock()

            mock_conv_service = MagicMock()
            mock_conv_service.mark_messages_read = AsyncMock(return_value=True)
            mock_conv_service_cls.return_value = mock_conv_service

            mock_manager.broadcast_read_receipt = AsyncMock()

            await handle_mark_read(sample_user_id, data)

            mock_conv_service.mark_messages_read.assert_called_once()
            mock_manager.broadcast_read_receipt.assert_called_once()

    @pytest.mark.asyncio
    async def test_mark_read_failure(
        self, sample_user_id, sample_conversation_id, sample_message_id
    ):
        """Test mark read when service returns False."""
        data = {
            "conversation_id": str(sample_conversation_id),
            "message_id": str(sample_message_id),
        }

        with (
            patch("app.routers.websocket.AsyncSessionLocal") as mock_session_local,
            patch("app.routers.websocket.ConversationService") as mock_conv_service_cls,
            patch("app.routers.websocket.connection_manager") as mock_manager,
        ):
            mock_db = AsyncMock()
            mock_session_local.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_session_local.return_value.__aexit__ = AsyncMock()

            mock_conv_service = MagicMock()
            mock_conv_service.mark_messages_read = AsyncMock(return_value=False)
            mock_conv_service_cls.return_value = mock_conv_service

            mock_manager.broadcast_read_receipt = AsyncMock()

            await handle_mark_read(sample_user_id, data)

            # Should not broadcast if mark_messages_read failed
            mock_manager.broadcast_read_receipt.assert_not_called()

    @pytest.mark.asyncio
    async def test_mark_read_exception_handled(self, sample_user_id):
        """Test that exceptions in mark read are handled."""
        data = {
            "conversation_id": "invalid-uuid",
            "message_id": "also-invalid",
        }

        # Should not raise exception
        await handle_mark_read(sample_user_id, data)


# ============================================================================
# WEBSOCKET_HEALTH TESTS
# ============================================================================


class TestWebsocketHealth:
    """Tests for websocket_health endpoint."""

    @pytest.mark.asyncio
    async def test_health_returns_status(self):
        """Test health endpoint returns expected structure."""
        with patch("app.routers.websocket.connection_manager") as mock_manager:
            mock_manager.get_online_users.return_value = {uuid.uuid4(), uuid.uuid4()}
            mock_manager.redis_client = MagicMock()

            result = await websocket_health()

            assert result["status"] == "healthy"
            assert result["online_users"] == 2
            assert result["redis_connected"] is True

    @pytest.mark.asyncio
    async def test_health_no_redis(self):
        """Test health endpoint when Redis is not connected."""
        with patch("app.routers.websocket.connection_manager") as mock_manager:
            mock_manager.get_online_users.return_value = set()
            mock_manager.redis_client = None

            result = await websocket_health()

            assert result["status"] == "healthy"
            assert result["online_users"] == 0
            assert result["redis_connected"] is False

    @pytest.mark.asyncio
    async def test_health_empty_users(self):
        """Test health endpoint with no online users."""
        with patch("app.routers.websocket.connection_manager") as mock_manager:
            mock_manager.get_online_users.return_value = set()
            mock_manager.redis_client = MagicMock()

            result = await websocket_health()

            assert result["online_users"] == 0


# ============================================================================
# NOTIFICATION_WEBSOCKET_ENDPOINT TESTS
# ============================================================================


class TestNotificationWebsocketEndpoint:
    """Tests for notification_websocket_endpoint function."""

    @pytest.mark.asyncio
    async def test_unauthenticated_returns_early(self, mock_websocket):
        """Test that unauthenticated user returns early."""
        with patch(
            "app.routers.websocket.authenticate_websocket", new_callable=AsyncMock
        ) as mock_auth:
            mock_auth.return_value = None

            await notification_websocket_endpoint(mock_websocket)

            mock_auth.assert_called_once()

    @pytest.mark.asyncio
    async def test_connection_failure_returns(self, mock_websocket, sample_user_id):
        """Test that failed connection returns early."""
        with (
            patch(
                "app.routers.websocket.authenticate_websocket", new_callable=AsyncMock
            ) as mock_auth,
            patch(
                "app.routers.websocket.notification_websocket_manager"
            ) as mock_manager,
        ):
            mock_auth.return_value = sample_user_id
            mock_manager.connect = AsyncMock(return_value=False)

            await notification_websocket_endpoint(mock_websocket)

            mock_manager.connect.assert_called_once()

    @pytest.mark.asyncio
    async def test_ping_message_sends_pong(self, mock_websocket, sample_user_id):
        """Test ping message receives pong response."""
        timestamp = 12345.67

        with (
            patch(
                "app.routers.websocket.authenticate_websocket", new_callable=AsyncMock
            ) as mock_auth,
            patch(
                "app.routers.websocket.notification_websocket_manager"
            ) as mock_manager,
        ):
            mock_auth.return_value = sample_user_id
            mock_manager.connect = AsyncMock(return_value=True)
            mock_manager.disconnect = AsyncMock()

            # First receive returns ping, second raises disconnect
            from fastapi import WebSocketDisconnect

            mock_websocket.receive_text.side_effect = [
                json.dumps({"type": "ping", "timestamp": timestamp}),
                WebSocketDisconnect(),
            ]

            await notification_websocket_endpoint(mock_websocket)

            # Check pong was sent
            sent_calls = mock_websocket.send_text.call_args_list
            pong_sent = any("pong" in call[0][0] for call in sent_calls if call[0])
            assert pong_sent

    @pytest.mark.asyncio
    async def test_mark_read_notification(self, mock_websocket, sample_user_id):
        """Test mark_read notification message."""
        notification_id = str(uuid.uuid4())

        with (
            patch(
                "app.routers.websocket.authenticate_websocket", new_callable=AsyncMock
            ) as mock_auth,
            patch(
                "app.routers.websocket.notification_websocket_manager"
            ) as mock_manager,
            patch(
                "app.services.notification_service.notification_service"
            ) as mock_notif_service,
        ):
            mock_auth.return_value = sample_user_id
            mock_manager.connect = AsyncMock(return_value=True)
            mock_manager.disconnect = AsyncMock()
            mock_notif_service.mark_as_read = AsyncMock()
            mock_notif_service.get_unread_count = AsyncMock(return_value=5)

            from fastapi import WebSocketDisconnect

            mock_websocket.receive_text.side_effect = [
                json.dumps({"type": "mark_read", "notification_id": notification_id}),
                WebSocketDisconnect(),
            ]

            await notification_websocket_endpoint(mock_websocket)

    @pytest.mark.asyncio
    async def test_websocket_disconnect_handled(self, mock_websocket, sample_user_id):
        """Test WebSocketDisconnect is handled."""
        with (
            patch(
                "app.routers.websocket.authenticate_websocket", new_callable=AsyncMock
            ) as mock_auth,
            patch(
                "app.routers.websocket.notification_websocket_manager"
            ) as mock_manager,
        ):
            mock_auth.return_value = sample_user_id
            mock_manager.connect = AsyncMock(return_value=True)
            mock_manager.disconnect = AsyncMock()

            from fastapi import WebSocketDisconnect

            mock_websocket.receive_text.side_effect = WebSocketDisconnect()

            await notification_websocket_endpoint(mock_websocket)

            mock_manager.disconnect.assert_called_once()

    @pytest.mark.asyncio
    async def test_general_exception_handled(self, mock_websocket, sample_user_id):
        """Test general exceptions are handled."""
        with (
            patch(
                "app.routers.websocket.authenticate_websocket", new_callable=AsyncMock
            ) as mock_auth,
            patch(
                "app.routers.websocket.notification_websocket_manager"
            ) as mock_manager,
        ):
            mock_auth.return_value = sample_user_id
            mock_manager.connect = AsyncMock(return_value=True)
            mock_manager.disconnect = AsyncMock()

            mock_websocket.receive_text.side_effect = RuntimeError("Connection error")

            await notification_websocket_endpoint(mock_websocket)

            mock_manager.disconnect.assert_called_once()


# ============================================================================
# NOTIFICATION_WEBSOCKET_STATS TESTS
# ============================================================================


class TestNotificationWebsocketStats:
    """Tests for notification_websocket_stats endpoint."""

    @pytest.mark.asyncio
    async def test_stats_returns_connection_stats(self):
        """Test stats endpoint returns connection statistics."""
        expected_stats = {
            "total_connections": 10,
            "active_users": 5,
        }

        with patch(
            "app.routers.websocket.notification_websocket_manager"
        ) as mock_manager:
            mock_manager.get_connection_stats.return_value = expected_stats

            result = await notification_websocket_stats()

            assert result == expected_stats

    @pytest.mark.asyncio
    async def test_stats_empty_connections(self):
        """Test stats endpoint with no connections."""
        expected_stats = {
            "total_connections": 0,
            "active_users": 0,
        }

        with patch(
            "app.routers.websocket.notification_websocket_manager"
        ) as mock_manager:
            mock_manager.get_connection_stats.return_value = expected_stats

            result = await notification_websocket_stats()

            assert result["total_connections"] == 0


# ============================================================================
# EDGE CASES & ERROR HANDLING
# ============================================================================


class TestEdgeCases:
    """Edge case and error handling tests."""

    @pytest.mark.asyncio
    async def test_message_with_no_type(self, mock_websocket, sample_user_id):
        """Test handling message with no type field."""
        message = json.dumps({"data": "some_data"})

        # Should handle gracefully
        await handle_websocket_message(mock_websocket, sample_user_id, message)

    @pytest.mark.asyncio
    async def test_typing_with_multiple_participants(
        self, sample_user_id, sample_conversation_id
    ):
        """Test typing indicator with multiple participants."""
        data = {
            "conversation_id": str(sample_conversation_id),
            "is_typing": True,
        }

        # Create multiple participants including the sender
        participants = []
        for _ in range(3):
            p = MagicMock()
            p.user_id = uuid.uuid4()
            participants.append(p)
        # Add the sender
        sender_participant = MagicMock()
        sender_participant.user_id = sample_user_id
        participants.append(sender_participant)

        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = participants
        mock_result.scalars.return_value = mock_scalars

        with (
            patch("app.routers.websocket.AsyncSessionLocal") as mock_session_local,
            patch("app.routers.websocket.connection_manager") as mock_manager,
        ):
            mock_db = AsyncMock()
            mock_db.execute = AsyncMock(return_value=mock_result)
            mock_session_local.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_session_local.return_value.__aexit__ = AsyncMock()

            mock_manager.broadcast_typing_indicator = AsyncMock()

            await handle_typing_indicator(sample_user_id, data)

            # Should broadcast to all participants
            call_kwargs = mock_manager.broadcast_typing_indicator.call_args[1]
            assert len(call_kwargs["participant_ids"]) == 4

    @pytest.mark.asyncio
    async def test_mark_read_broadcasts_to_participants(
        self, sample_user_id, sample_conversation_id, sample_message_id
    ):
        """Test mark read broadcasts to all participants."""
        data = {
            "conversation_id": str(sample_conversation_id),
            "message_id": str(sample_message_id),
        }

        participants = []
        for _ in range(3):
            p = MagicMock()
            p.user_id = uuid.uuid4()
            participants.append(p)

        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = participants
        mock_result.scalars.return_value = mock_scalars

        with (
            patch("app.routers.websocket.AsyncSessionLocal") as mock_session_local,
            patch("app.routers.websocket.ConversationService") as mock_conv_service_cls,
            patch("app.routers.websocket.connection_manager") as mock_manager,
        ):
            mock_db = AsyncMock()
            mock_db.execute = AsyncMock(return_value=mock_result)
            mock_session_local.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_session_local.return_value.__aexit__ = AsyncMock()

            mock_conv_service = MagicMock()
            mock_conv_service.mark_messages_read = AsyncMock(return_value=True)
            mock_conv_service_cls.return_value = mock_conv_service

            mock_manager.broadcast_read_receipt = AsyncMock()

            await handle_mark_read(sample_user_id, data)

            call_kwargs = mock_manager.broadcast_read_receipt.call_args[1]
            assert len(call_kwargs["participant_ids"]) == 3
