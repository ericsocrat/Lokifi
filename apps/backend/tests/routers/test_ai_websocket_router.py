"""
Tests for AI WebSocket router (J5.1 - Real-time AI Chat Streaming).

Comprehensive test coverage for:
- ConnectionManager class (connect, disconnect, send_personal_message, is_connected)
- get_user_from_token helper function
- websocket_ai_chat endpoint
- handle_chat_message handler
- websocket_status endpoint
"""

import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import WebSocket, status

from app.routers.ai_websocket import (
    ConnectionManager,
    get_user_from_token,
    handle_chat_message,
    manager,
    router,
    websocket_ai_chat,
    websocket_status,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def connection_manager():
    """Fresh ConnectionManager instance for testing."""
    return ConnectionManager()


@pytest.fixture
def mock_websocket():
    """Mock WebSocket connection."""
    ws = AsyncMock(spec=WebSocket)
    ws.accept = AsyncMock()
    ws.send_text = AsyncMock()
    ws.receive_text = AsyncMock()
    ws.close = AsyncMock()
    return ws


@pytest.fixture
def mock_user():
    """Mock User object."""
    user = MagicMock()
    user.id = 123
    user.email = "test@example.com"
    user.username = "testuser"
    return user


@pytest.fixture
def mock_db():
    """Mock database session."""
    return MagicMock()


# ============================================================================
# ConnectionManager Tests
# ============================================================================


class TestConnectionManager:
    """Test suite for ConnectionManager class."""

    def test_init(self, connection_manager):
        """Test ConnectionManager initialization."""
        assert connection_manager.active_connections == {}

    @pytest.mark.asyncio
    async def test_connect(self, connection_manager, mock_websocket):
        """Test connecting a WebSocket."""
        user_id = 123

        await connection_manager.connect(mock_websocket, user_id)

        mock_websocket.accept.assert_called_once()
        assert user_id in connection_manager.active_connections
        assert connection_manager.active_connections[user_id] == mock_websocket

    @pytest.mark.asyncio
    async def test_connect_multiple_users(self, connection_manager):
        """Test connecting multiple users."""
        ws1 = AsyncMock(spec=WebSocket)
        ws2 = AsyncMock(spec=WebSocket)

        await connection_manager.connect(ws1, 1)
        await connection_manager.connect(ws2, 2)

        assert len(connection_manager.active_connections) == 2
        assert connection_manager.active_connections[1] == ws1
        assert connection_manager.active_connections[2] == ws2

    @pytest.mark.asyncio
    async def test_connect_replaces_existing(self, connection_manager):
        """Test that connecting same user replaces existing connection."""
        ws1 = AsyncMock(spec=WebSocket)
        ws2 = AsyncMock(spec=WebSocket)
        user_id = 123

        await connection_manager.connect(ws1, user_id)
        await connection_manager.connect(ws2, user_id)

        assert len(connection_manager.active_connections) == 1
        assert connection_manager.active_connections[user_id] == ws2

    def test_disconnect(self, connection_manager, mock_websocket):
        """Test disconnecting a WebSocket."""
        user_id = 123
        connection_manager.active_connections[user_id] = mock_websocket

        connection_manager.disconnect(user_id)

        assert user_id not in connection_manager.active_connections

    def test_disconnect_nonexistent_user(self, connection_manager):
        """Test disconnecting a non-existent user (no error)."""
        connection_manager.disconnect(999)  # Should not raise
        assert 999 not in connection_manager.active_connections

    @pytest.mark.asyncio
    async def test_send_personal_message_success(
        self, connection_manager, mock_websocket
    ):
        """Test sending a message to connected user."""
        user_id = 123
        connection_manager.active_connections[user_id] = mock_websocket
        message = {"type": "test", "data": "hello"}

        await connection_manager.send_personal_message(message, user_id)

        mock_websocket.send_text.assert_called_once_with(json.dumps(message))

    @pytest.mark.asyncio
    async def test_send_personal_message_user_not_connected(self, connection_manager):
        """Test sending message to non-connected user (no error)."""
        message = {"type": "test"}
        await connection_manager.send_personal_message(message, 999)
        # Should not raise, just silently ignore

    @pytest.mark.asyncio
    async def test_send_personal_message_error_disconnects(
        self, connection_manager, mock_websocket
    ):
        """Test that send error disconnects the user."""
        user_id = 123
        connection_manager.active_connections[user_id] = mock_websocket
        mock_websocket.send_text.side_effect = Exception("Connection closed")

        await connection_manager.send_personal_message({"type": "test"}, user_id)

        # User should be disconnected after error
        assert user_id not in connection_manager.active_connections

    def test_is_connected_true(self, connection_manager, mock_websocket):
        """Test is_connected returns True for connected user."""
        user_id = 123
        connection_manager.active_connections[user_id] = mock_websocket

        assert connection_manager.is_connected(user_id) is True

    def test_is_connected_false(self, connection_manager):
        """Test is_connected returns False for non-connected user."""
        assert connection_manager.is_connected(999) is False


# ============================================================================
# get_user_from_token Tests
# ============================================================================


class TestGetUserFromToken:
    """Test suite for get_user_from_token function."""

    def test_no_token_returns_none(self, mock_db):
        """Test that None token returns None."""
        result = get_user_from_token(None, mock_db)
        assert result is None

    def test_empty_token_returns_none(self, mock_db):
        """Test that empty token returns None."""
        result = get_user_from_token("", mock_db)
        assert result is None

    @patch("app.api.deps._auth_handle")
    @patch("app.api.deps._user_by_handle")
    def test_valid_bearer_token(
        self, mock_user_by_handle, mock_auth_handle, mock_db, mock_user
    ):
        """Test extracting user from valid Bearer token."""
        mock_auth_handle.return_value = "user_handle"
        mock_user_by_handle.return_value = mock_user

        result = get_user_from_token("Bearer valid_token", mock_db)

        assert result == mock_user
        mock_auth_handle.assert_called_once_with("Bearer valid_token")
        mock_user_by_handle.assert_called_once_with(mock_db, "user_handle")

    @patch("app.api.deps._auth_handle")
    @patch("app.api.deps._user_by_handle")
    def test_raw_token_without_bearer(
        self, mock_user_by_handle, mock_auth_handle, mock_db, mock_user
    ):
        """Test token without Bearer prefix."""
        mock_auth_handle.return_value = "user_handle"
        mock_user_by_handle.return_value = mock_user

        result = get_user_from_token("raw_token", mock_db)

        assert result == mock_user
        # Token should be converted to Bearer format
        mock_auth_handle.assert_called_once_with("Bearer raw_token")

    @patch("app.api.deps._auth_handle")
    def test_invalid_token_returns_none(self, mock_auth_handle, mock_db):
        """Test that invalid token returns None."""
        mock_auth_handle.return_value = None

        result = get_user_from_token("Bearer invalid", mock_db)

        assert result is None

    @patch("app.api.deps._auth_handle")
    def test_auth_exception_returns_none(self, mock_auth_handle, mock_db):
        """Test that auth exception returns None."""
        mock_auth_handle.side_effect = Exception("Auth error")

        result = get_user_from_token("Bearer token", mock_db)

        assert result is None


# ============================================================================
# websocket_ai_chat Tests
# ============================================================================


class TestWebsocketAIChat:
    """Test suite for websocket_ai_chat endpoint."""

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.get_user_from_token")
    async def test_invalid_token_closes_connection(
        self, mock_get_user, mock_websocket, mock_db
    ):
        """Test that invalid token closes WebSocket."""
        mock_get_user.return_value = None

        await websocket_ai_chat(mock_websocket, "invalid_token", mock_db)

        mock_websocket.close.assert_called_once_with(
            code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token"
        )

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.get_user_from_token")
    @patch("app.routers.ai_websocket.manager")
    async def test_valid_connection_accepts(
        self, mock_manager, mock_get_user, mock_websocket, mock_db, mock_user
    ):
        """Test valid token connects user."""
        mock_get_user.return_value = mock_user
        mock_manager.connect = AsyncMock()
        mock_websocket.receive_text = AsyncMock(
            side_effect=Exception("WebSocketDisconnect")
        )

        try:
            await websocket_ai_chat(mock_websocket, "valid_token", mock_db)
        except Exception:
            pass

        mock_manager.connect.assert_called_once_with(mock_websocket, mock_user.id)

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.get_user_from_token")
    @patch("app.routers.ai_websocket.manager")
    async def test_invalid_json_sends_error(
        self, mock_manager, mock_get_user, mock_websocket, mock_db, mock_user
    ):
        """Test invalid JSON message sends error response."""
        mock_get_user.return_value = mock_user
        mock_manager.connect = AsyncMock()
        mock_manager.send_personal_message = AsyncMock()
        mock_websocket.receive_text = AsyncMock(
            side_effect=["not valid json", Exception("disconnect")]
        )

        try:
            await websocket_ai_chat(mock_websocket, "valid", mock_db)
        except Exception:
            pass

        # Should send error for invalid JSON
        calls = mock_manager.send_personal_message.call_args_list
        assert any(
            call[0][0].get("type") == "error"
            and "Invalid JSON" in call[0][0].get("error", "")
            for call in calls
        )

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.get_user_from_token")
    @patch("app.routers.ai_websocket.manager")
    async def test_missing_type_field_sends_error(
        self, mock_manager, mock_get_user, mock_websocket, mock_db, mock_user
    ):
        """Test message without type field sends error."""
        mock_get_user.return_value = mock_user
        mock_manager.connect = AsyncMock()
        mock_manager.send_personal_message = AsyncMock()
        mock_websocket.receive_text = AsyncMock(
            side_effect=['{"data": "test"}', Exception("disconnect")]
        )

        try:
            await websocket_ai_chat(mock_websocket, "valid", mock_db)
        except Exception:
            pass

        calls = mock_manager.send_personal_message.call_args_list
        assert any("'type' field" in str(call) for call in calls)

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.get_user_from_token")
    @patch("app.routers.ai_websocket.manager")
    @patch("app.routers.ai_websocket.handle_chat_message")
    async def test_chat_message_calls_handler(
        self,
        mock_handle_chat,
        mock_manager,
        mock_get_user,
        mock_websocket,
        mock_db,
        mock_user,
    ):
        """Test chat message type calls handle_chat_message."""
        mock_get_user.return_value = mock_user
        mock_manager.connect = AsyncMock()
        mock_handle_chat.return_value = None
        mock_websocket.receive_text = AsyncMock(
            side_effect=[
                '{"type": "chat", "thread_id": 1, "message": "hi"}',
                Exception("disconnect"),
            ]
        )

        try:
            await websocket_ai_chat(mock_websocket, "valid", mock_db)
        except Exception:
            pass

        mock_handle_chat.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.get_user_from_token")
    @patch("app.routers.ai_websocket.manager")
    async def test_ping_returns_pong(
        self, mock_manager, mock_get_user, mock_websocket, mock_db, mock_user
    ):
        """Test ping message returns pong with timestamp."""
        mock_get_user.return_value = mock_user
        mock_manager.connect = AsyncMock()
        mock_manager.send_personal_message = AsyncMock()
        mock_websocket.receive_text = AsyncMock(
            side_effect=['{"type": "ping"}', Exception("disconnect")]
        )

        try:
            await websocket_ai_chat(mock_websocket, "valid", mock_db)
        except Exception:
            pass

        calls = mock_manager.send_personal_message.call_args_list
        pong_calls = [c for c in calls if c[0][0].get("type") == "pong"]
        assert len(pong_calls) == 1
        assert "timestamp" in pong_calls[0][0][0]

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.get_user_from_token")
    @patch("app.routers.ai_websocket.manager")
    async def test_unknown_message_type_sends_error(
        self, mock_manager, mock_get_user, mock_websocket, mock_db, mock_user
    ):
        """Test unknown message type sends error."""
        mock_get_user.return_value = mock_user
        mock_manager.connect = AsyncMock()
        mock_manager.send_personal_message = AsyncMock()
        mock_websocket.receive_text = AsyncMock(
            side_effect=['{"type": "unknown_type"}', Exception("disconnect")]
        )

        try:
            await websocket_ai_chat(mock_websocket, "valid", mock_db)
        except Exception:
            pass

        calls = mock_manager.send_personal_message.call_args_list
        assert any("Unknown message type" in str(call) for call in calls)

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.get_user_from_token")
    @patch("app.routers.ai_websocket.manager")
    async def test_websocket_disconnect_handled(
        self, mock_manager, mock_get_user, mock_websocket, mock_db, mock_user
    ):
        """Test WebSocketDisconnect is handled gracefully."""
        from fastapi import WebSocketDisconnect

        mock_get_user.return_value = mock_user
        mock_manager.connect = AsyncMock()
        mock_manager.disconnect = MagicMock()
        mock_websocket.receive_text = AsyncMock(side_effect=WebSocketDisconnect())

        # Should not raise
        await websocket_ai_chat(mock_websocket, "valid", mock_db)

        mock_manager.disconnect.assert_called_once_with(mock_user.id)

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.get_user_from_token")
    @patch("app.routers.ai_websocket.manager")
    async def test_general_exception_disconnects(
        self, mock_manager, mock_get_user, mock_websocket, mock_db, mock_user
    ):
        """Test general exception disconnects user."""
        mock_get_user.return_value = mock_user
        mock_manager.connect = AsyncMock()
        mock_manager.disconnect = MagicMock()
        mock_websocket.receive_text = AsyncMock(
            side_effect=RuntimeError("Unexpected error")
        )

        # Should not raise
        await websocket_ai_chat(mock_websocket, "valid", mock_db)

        mock_manager.disconnect.assert_called_once_with(mock_user.id)


# ============================================================================
# handle_chat_message Tests
# ============================================================================


class TestHandleChatMessage:
    """Test suite for handle_chat_message function."""

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.manager")
    async def test_missing_thread_id_sends_error(
        self, mock_manager, mock_user, mock_db
    ):
        """Test missing thread_id sends error."""
        mock_manager.send_personal_message = AsyncMock()
        message_data = {"message": "hello"}

        await handle_chat_message(message_data, mock_user, mock_db)

        mock_manager.send_personal_message.assert_called_once()
        call_args = mock_manager.send_personal_message.call_args[0]
        assert call_args[0]["type"] == "error"
        assert "thread_id" in call_args[0]["error"]

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.manager")
    async def test_missing_message_sends_error(self, mock_manager, mock_user, mock_db):
        """Test missing message field sends error."""
        mock_manager.send_personal_message = AsyncMock()
        message_data = {"thread_id": 1}

        await handle_chat_message(message_data, mock_user, mock_db)

        mock_manager.send_personal_message.assert_called_once()
        call_args = mock_manager.send_personal_message.call_args[0]
        assert call_args[0]["type"] == "error"
        assert "message" in call_args[0]["error"]

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.manager")
    @patch("app.routers.ai_websocket.ai_service")
    async def test_stream_chunk_sent(
        self, mock_ai_service, mock_manager, mock_user, mock_db
    ):
        """Test StreamChunk is sent as chunk message."""
        from app.services.ai_provider import StreamChunk

        mock_manager.send_personal_message = AsyncMock()
        chunk = StreamChunk(
            id="chunk_1",
            content="Hello",
            is_complete=False,
            model="gpt-4",
        )

        async def mock_stream(*args, **kwargs):
            yield chunk

        mock_ai_service.send_message = mock_stream
        message_data = {"thread_id": 1, "message": "hi"}

        await handle_chat_message(message_data, mock_user, mock_db)

        mock_manager.send_personal_message.assert_called()
        call_args = mock_manager.send_personal_message.call_args[0]
        assert call_args[0]["type"] == "chunk"
        assert call_args[0]["content"] == "Hello"
        assert call_args[0]["thread_id"] == 1

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.manager")
    @patch("app.routers.ai_websocket.ai_service")
    async def test_ai_message_sent_as_complete(
        self, mock_ai_service, mock_manager, mock_user, mock_db
    ):
        """Test AIMessage is sent as complete message."""
        from unittest.mock import create_autospec

        from app.db.models import AIMessage as RealAIMessage

        mock_manager.send_personal_message = AsyncMock()

        # Use create_autospec to create a proper mock that passes isinstance
        ai_message = create_autospec(RealAIMessage, instance=True)
        ai_message.id = 456
        ai_message.role = "assistant"
        ai_message.content = "AI response"
        ai_message.model = "gpt-4"
        ai_message.provider = "openrouter"
        ai_message.token_count = 100
        ai_message.created_at = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        ai_message.completed_at = datetime(2024, 1, 1, 12, 0, 1, tzinfo=timezone.utc)
        ai_message.error = None

        async def mock_stream(*args, **kwargs):
            yield ai_message

        mock_ai_service.send_message = mock_stream
        message_data = {"thread_id": 1, "message": "hi"}

        await handle_chat_message(message_data, mock_user, mock_db)

        mock_manager.send_personal_message.assert_called()
        call_args = mock_manager.send_personal_message.call_args[0]
        assert call_args[0]["type"] == "complete"
        assert call_args[0]["message_id"] == 456
        assert call_args[0]["content"] == "AI response"

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.manager")
    @patch("app.routers.ai_websocket.ai_service")
    async def test_ai_message_without_completed_at(
        self, mock_ai_service, mock_manager, mock_user, mock_db
    ):
        """Test AIMessage with None completed_at."""
        from unittest.mock import create_autospec

        from app.db.models import AIMessage as RealAIMessage

        mock_manager.send_personal_message = AsyncMock()

        ai_message = create_autospec(RealAIMessage, instance=True)
        ai_message.id = 456
        ai_message.role = "assistant"
        ai_message.content = "Response"
        ai_message.model = "gpt-4"
        ai_message.provider = "openrouter"
        ai_message.token_count = 50
        ai_message.created_at = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        ai_message.completed_at = None
        ai_message.error = None

        async def mock_stream(*args, **kwargs):
            yield ai_message

        mock_ai_service.send_message = mock_stream
        message_data = {"thread_id": 1, "message": "hi"}

        await handle_chat_message(message_data, mock_user, mock_db)

        call_args = mock_manager.send_personal_message.call_args[0]
        assert call_args[0]["completed_at"] is None

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.manager")
    @patch("app.routers.ai_websocket.ai_service")
    async def test_rate_limit_error(
        self, mock_ai_service, mock_manager, mock_user, mock_db
    ):
        """Test RateLimitError sends rate_limit error."""
        from app.services.ai_service import RateLimitError

        mock_manager.send_personal_message = AsyncMock()

        async def mock_stream(*args, **kwargs):
            raise RateLimitError("Too many requests")
            yield

        mock_ai_service.send_message = mock_stream
        message_data = {"thread_id": 1, "message": "hi"}

        await handle_chat_message(message_data, mock_user, mock_db)

        call_args = mock_manager.send_personal_message.call_args[0]
        assert call_args[0]["type"] == "error"
        assert call_args[0]["error"] == "rate_limit"

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.manager")
    @patch("app.routers.ai_websocket.ai_service")
    async def test_safety_filter_error(
        self, mock_ai_service, mock_manager, mock_user, mock_db
    ):
        """Test SafetyFilterError sends safety_filter error."""
        from app.services.ai_service import SafetyFilterError

        mock_manager.send_personal_message = AsyncMock()

        async def mock_stream(*args, **kwargs):
            raise SafetyFilterError("Content blocked")
            yield

        mock_ai_service.send_message = mock_stream
        message_data = {"thread_id": 1, "message": "hi"}

        await handle_chat_message(message_data, mock_user, mock_db)

        call_args = mock_manager.send_personal_message.call_args[0]
        assert call_args[0]["type"] == "error"
        assert call_args[0]["error"] == "safety_filter"

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.manager")
    @patch("app.routers.ai_websocket.ai_service")
    async def test_provider_error(
        self, mock_ai_service, mock_manager, mock_user, mock_db
    ):
        """Test ProviderError sends provider_error."""
        from app.services.ai_provider import ProviderError

        mock_manager.send_personal_message = AsyncMock()

        async def mock_stream(*args, **kwargs):
            raise ProviderError("API unavailable")
            yield

        mock_ai_service.send_message = mock_stream
        message_data = {"thread_id": 1, "message": "hi"}

        await handle_chat_message(message_data, mock_user, mock_db)

        call_args = mock_manager.send_personal_message.call_args[0]
        assert call_args[0]["type"] == "error"
        assert call_args[0]["error"] == "provider_error"

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.manager")
    @patch("app.routers.ai_websocket.ai_service")
    async def test_generic_exception(
        self, mock_ai_service, mock_manager, mock_user, mock_db
    ):
        """Test generic exception sends internal_error."""
        mock_manager.send_personal_message = AsyncMock()

        async def mock_stream(*args, **kwargs):
            raise RuntimeError("Unexpected")
            yield

        mock_ai_service.send_message = mock_stream
        message_data = {"thread_id": 1, "message": "hi"}

        await handle_chat_message(message_data, mock_user, mock_db)

        call_args = mock_manager.send_personal_message.call_args[0]
        assert call_args[0]["type"] == "error"
        assert call_args[0]["error"] == "internal_error"

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.manager")
    @patch("app.routers.ai_websocket.ai_service")
    async def test_with_optional_provider_and_model(
        self, mock_ai_service, mock_manager, mock_user, mock_db
    ):
        """Test message with optional provider and model."""
        mock_manager.send_personal_message = AsyncMock()

        captured_kwargs = {}

        async def mock_stream(*args, **kwargs):
            captured_kwargs.update(kwargs)
            return
            yield

        mock_ai_service.send_message = mock_stream
        message_data = {
            "thread_id": 1,
            "message": "hi",
            "provider": "anthropic",
            "model": "claude-3",
        }

        await handle_chat_message(message_data, mock_user, mock_db)

        assert captured_kwargs["provider_name"] == "anthropic"
        assert captured_kwargs["model"] == "claude-3"


# ============================================================================
# websocket_status Tests
# ============================================================================


class TestWebsocketStatus:
    """Test suite for websocket_status endpoint."""

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.manager")
    async def test_status_returns_connection_count(self, mock_manager):
        """Test status returns active connection count."""
        mock_manager.active_connections = {1: MagicMock(), 2: MagicMock()}

        result = await websocket_status()

        assert result["active_connections"] == 2
        assert set(result["connected_users"]) == {1, 2}

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.manager")
    async def test_status_empty_connections(self, mock_manager):
        """Test status with no connections."""
        mock_manager.active_connections = {}

        result = await websocket_status()

        assert result["active_connections"] == 0
        assert result["connected_users"] == []


# ============================================================================
# Integration-style Tests
# ============================================================================


class TestAIWebSocketIntegration:
    """Integration-style tests for full message flows."""

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.get_user_from_token")
    @patch("app.routers.ai_websocket.manager")
    async def test_full_chat_flow_with_streaming(
        self, mock_manager, mock_get_user, mock_websocket, mock_db, mock_user
    ):
        """Test complete chat flow with multiple stream chunks."""
        from app.services.ai_provider import StreamChunk

        mock_get_user.return_value = mock_user
        mock_manager.connect = AsyncMock()
        mock_manager.send_personal_message = AsyncMock()

        # Simulate receiving a chat message
        chat_request = json.dumps(
            {
                "type": "chat",
                "thread_id": 1,
                "message": "Hello AI",
            }
        )

        # Mock AI service streaming response
        chunks = [
            StreamChunk(id="1", content="Hello", is_complete=False, model="gpt-4"),
            StreamChunk(id="2", content=" there", is_complete=False, model="gpt-4"),
            StreamChunk(id="3", content="!", is_complete=True, model="gpt-4"),
        ]

        with patch("app.routers.ai_websocket.ai_service") as mock_ai:

            async def mock_stream(*args, **kwargs):
                for chunk in chunks:
                    yield chunk

            mock_ai.send_message = mock_stream
            mock_websocket.receive_text = AsyncMock(
                side_effect=[chat_request, Exception("disconnect")]
            )

            try:
                await websocket_ai_chat(mock_websocket, "valid", mock_db)
            except Exception:
                pass

        # Should have sent 3 chunk messages
        chunk_calls = [
            c
            for c in mock_manager.send_personal_message.call_args_list
            if c[0][0].get("type") == "chunk"
        ]
        assert len(chunk_calls) == 3

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.get_user_from_token")
    @patch("app.routers.ai_websocket.manager")
    async def test_message_array_not_dict_sends_error(
        self, mock_manager, mock_get_user, mock_websocket, mock_db, mock_user
    ):
        """Test that array message (not dict) sends error."""
        mock_get_user.return_value = mock_user
        mock_manager.connect = AsyncMock()
        mock_manager.send_personal_message = AsyncMock()
        mock_websocket.receive_text = AsyncMock(
            side_effect=['["not", "a", "dict"]', Exception("disconnect")]
        )

        try:
            await websocket_ai_chat(mock_websocket, "valid", mock_db)
        except Exception:
            pass

        calls = mock_manager.send_personal_message.call_args_list
        assert any("'type' field" in str(call) for call in calls)

    @pytest.mark.asyncio
    @patch("app.routers.ai_websocket.get_user_from_token")
    @patch("app.routers.ai_websocket.manager")
    async def test_multiple_messages_in_sequence(
        self, mock_manager, mock_get_user, mock_websocket, mock_db, mock_user
    ):
        """Test handling multiple messages in sequence."""
        mock_get_user.return_value = mock_user
        mock_manager.connect = AsyncMock()
        mock_manager.send_personal_message = AsyncMock()

        messages = [
            '{"type": "ping"}',
            '{"type": "ping"}',
            Exception("disconnect"),
        ]
        mock_websocket.receive_text = AsyncMock(side_effect=messages)

        try:
            await websocket_ai_chat(mock_websocket, "valid", mock_db)
        except Exception:
            pass

        pong_calls = [
            c
            for c in mock_manager.send_personal_message.call_args_list
            if c[0][0].get("type") == "pong"
        ]
        assert len(pong_calls) == 2
