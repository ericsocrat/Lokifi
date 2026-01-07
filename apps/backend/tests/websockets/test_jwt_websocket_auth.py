"""
Tests for JWT WebSocket Authentication

Comprehensive tests for WebSocket authentication including JWT handling,
connection management, Redis coordination, and typing indicators.
"""

import builtins
import json
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import WebSocket

from app.websockets.jwt_websocket_auth import (
    AuthenticatedWebSocketManager,
    WebSocketJWTAuth,
    authenticated_websocket_manager,
    handle_typing_indicator,
    websocket_endpoint_with_auth,
    websocket_jwt_auth,
)

# ============================================================================
# Mock Classes
# ============================================================================


class MockWebSocket:
    """Mock WebSocket for testing."""

    def __init__(
        self,
        query_params: dict | None = None,
        headers: dict | None = None,
    ):
        self.query_params = query_params or {}
        self.headers = headers or {}
        self.messages_sent: list[str] = []
        self.accepted = False
        self.closed = False
        self.close_code: int | None = None
        self.close_reason: str | None = None
        self.receive_queue: list[str] = []

    async def accept(self):
        self.accepted = True

    async def send_text(self, message: str):
        self.messages_sent.append(message)

    async def close(self, code: int = 1000, reason: str = ""):
        self.closed = True
        self.close_code = code
        self.close_reason = reason

    async def receive_text(self):
        if self.receive_queue:
            return self.receive_queue.pop(0)
        raise Exception("No more messages")


# ============================================================================
# Test WebSocketJWTAuth
# ============================================================================


class TestWebSocketJWTAuthInit:
    """Tests for WebSocketJWTAuth initialization."""

    def test_init_with_secret_key(self):
        """Test initialization with explicit secret key."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = None
            auth = WebSocketJWTAuth(secret_key="test-secret")
            assert auth.secret_key == "test-secret"
            assert auth.algorithm == "HS256"

    def test_init_with_settings_key(self):
        """Test initialization using settings JWT_SECRET_KEY."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "settings-secret"
            auth = WebSocketJWTAuth()
            assert auth.secret_key == "settings-secret"

    def test_init_raises_without_key(self):
        """Test initialization raises ValueError without secret key."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = None
            with pytest.raises(ValueError, match="JWT_SECRET_KEY must be configured"):
                WebSocketJWTAuth(secret_key=None)


class TestCreateAccessToken:
    """Tests for JWT token creation."""

    def test_create_token_with_default_expiry(self):
        """Test creating token with default expiry."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.JWT_EXPIRE_MINUTES = 30
            auth = WebSocketJWTAuth()

            token = auth.create_access_token({"user_id": 123, "username": "testuser"})
            assert token is not None
            assert isinstance(token, str)

    def test_create_token_with_custom_expiry(self):
        """Test creating token with custom expiry delta."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            auth = WebSocketJWTAuth()

            expires = timedelta(hours=1)
            token = auth.create_access_token(
                {"user_id": 456, "username": "user2"}, expires_delta=expires
            )
            assert token is not None

    def test_create_token_preserves_data(self):
        """Test that created token contains original data."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.JWT_EXPIRE_MINUTES = 30
            auth = WebSocketJWTAuth()

            data = {"user_id": 789, "username": "testuser", "custom_field": "value"}
            token = auth.create_access_token(data)

            # Verify token can be decoded
            payload = auth.verify_token(token)
            assert payload is not None
            assert payload["user_id"] == 789
            assert payload["username"] == "testuser"
            assert payload["custom_field"] == "value"


class TestVerifyToken:
    """Tests for JWT token verification."""

    def test_verify_valid_token(self):
        """Test verifying a valid token."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.JWT_EXPIRE_MINUTES = 30
            auth = WebSocketJWTAuth()

            token = auth.create_access_token({"user_id": 123})
            payload = auth.verify_token(token)
            assert payload is not None
            assert payload["user_id"] == 123

    def test_verify_invalid_token(self):
        """Test verifying an invalid token."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            auth = WebSocketJWTAuth()

            payload = auth.verify_token("invalid.token.here")
            assert payload is None

    def test_verify_tampered_token(self):
        """Test verifying a tampered token."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.JWT_EXPIRE_MINUTES = 30
            auth = WebSocketJWTAuth()

            token = auth.create_access_token({"user_id": 123})
            # Tamper with token
            parts = token.split(".")
            parts[1] = parts[1][:-3] + "xxx"
            tampered_token = ".".join(parts)

            payload = auth.verify_token(tampered_token)
            assert payload is None

    def test_verify_token_wrong_secret(self):
        """Test verifying token with wrong secret key."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "secret-one"
            mock_settings.JWT_EXPIRE_MINUTES = 30
            auth1 = WebSocketJWTAuth()
            token = auth1.create_access_token({"user_id": 123})

            mock_settings.JWT_SECRET_KEY = "secret-two"
            auth2 = WebSocketJWTAuth()
            payload = auth2.verify_token(token)
            assert payload is None


class TestAuthenticateWebsocket:
    """Tests for WebSocket authentication."""

    @pytest.mark.asyncio
    async def test_authenticate_with_query_param_token(self):
        """Test authentication with token in query params."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.JWT_EXPIRE_MINUTES = 30
            auth = WebSocketJWTAuth()

            token = auth.create_access_token({"user_id": 123, "username": "testuser"})
            websocket = MockWebSocket(query_params={"token": token})

            result = await auth.authenticate_websocket(websocket)
            assert result is not None
            assert result["user_id"] == "123"
            assert result["username"] == "testuser"

    @pytest.mark.asyncio
    async def test_authenticate_with_bearer_token(self):
        """Test authentication with Bearer token in headers."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.JWT_EXPIRE_MINUTES = 30
            auth = WebSocketJWTAuth()

            token = auth.create_access_token({"user_id": 456, "username": "headeruser"})
            websocket = MockWebSocket(headers={"authorization": f"Bearer {token}"})

            result = await auth.authenticate_websocket(websocket)
            assert result is not None
            assert result["user_id"] == "456"
            assert result["username"] == "headeruser"

    @pytest.mark.asyncio
    async def test_authenticate_with_direct_token(self):
        """Test authentication with directly provided token."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.JWT_EXPIRE_MINUTES = 30
            auth = WebSocketJWTAuth()

            token = auth.create_access_token({"user_id": 789, "username": "directuser"})
            websocket = MockWebSocket()

            result = await auth.authenticate_websocket(websocket, token=token)
            assert result is not None
            assert result["user_id"] == "789"

    @pytest.mark.asyncio
    async def test_authenticate_no_token(self):
        """Test authentication fails when no token provided."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            auth = WebSocketJWTAuth()
            websocket = MockWebSocket()

            result = await auth.authenticate_websocket(websocket)
            assert result is None

    @pytest.mark.asyncio
    async def test_authenticate_invalid_token(self):
        """Test authentication fails with invalid token."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            auth = WebSocketJWTAuth()
            websocket = MockWebSocket(query_params={"token": "invalid"})

            result = await auth.authenticate_websocket(websocket)
            assert result is None

    @pytest.mark.asyncio
    async def test_authenticate_token_missing_user_id(self):
        """Test authentication fails when token missing user_id."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.JWT_EXPIRE_MINUTES = 30
            auth = WebSocketJWTAuth()

            token = auth.create_access_token({"username": "nouser"})  # No user_id
            websocket = MockWebSocket(query_params={"token": token})

            result = await auth.authenticate_websocket(websocket)
            assert result is None

    @pytest.mark.asyncio
    async def test_authenticate_exception_handling(self):
        """Test authentication handles exceptions gracefully."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            auth = WebSocketJWTAuth()

            # Create a websocket that raises on attribute access
            class BrokenWebSocket:
                @property
                def query_params(self):
                    raise Exception("Broken")

            websocket = BrokenWebSocket()
            result = await auth.authenticate_websocket(websocket)
            assert result is None


# ============================================================================
# Test AuthenticatedWebSocketManager
# ============================================================================


class TestAuthenticatedWebSocketManagerInit:
    """Tests for AuthenticatedWebSocketManager initialization."""

    def test_manager_initializes_empty(self):
        """Test manager starts with empty connections."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            manager = AuthenticatedWebSocketManager()
            assert manager.active_connections == {}
            assert manager.user_connections == {}


class TestManagerConnect:
    """Tests for AuthenticatedWebSocketManager.connect()."""

    @pytest.mark.asyncio
    async def test_connect_stores_connection(self):
        """Test connecting stores connection info."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.PROJECT_NAME = "lokifi"

            manager = AuthenticatedWebSocketManager()
            websocket = MockWebSocket()
            user_auth = {"user_id": "123", "username": "testuser"}

            with patch.object(
                manager, "_store_connection_in_redis", new_callable=AsyncMock
            ):
                with patch(
                    "app.websockets.jwt_websocket_auth.advanced_websocket_manager"
                ):
                    connection_id = await manager.connect(websocket, user_auth)

            assert connection_id.startswith("ws_123_")
            assert websocket.accepted
            assert connection_id in manager.active_connections
            assert "123" in manager.user_connections
            assert connection_id in manager.user_connections["123"]

    @pytest.mark.asyncio
    async def test_connect_multiple_same_user(self):
        """Test multiple connections for same user."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.PROJECT_NAME = "lokifi"

            manager = AuthenticatedWebSocketManager()
            websocket1 = MockWebSocket()
            websocket2 = MockWebSocket()
            user_auth = {"user_id": "123", "username": "testuser"}

            with patch.object(
                manager, "_store_connection_in_redis", new_callable=AsyncMock
            ):
                with patch(
                    "app.websockets.jwt_websocket_auth.advanced_websocket_manager"
                ):
                    conn_id1 = await manager.connect(websocket1, user_auth)
                    conn_id2 = await manager.connect(websocket2, user_auth)

            assert conn_id1 != conn_id2
            assert len(manager.user_connections["123"]) == 2

    @pytest.mark.asyncio
    async def test_connect_joins_room(self):
        """Test that connection joins user room."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.PROJECT_NAME = "lokifi"

            manager = AuthenticatedWebSocketManager()
            websocket = MockWebSocket()
            user_auth = {"user_id": "123", "username": "testuser"}

            with patch.object(
                manager, "_store_connection_in_redis", new_callable=AsyncMock
            ):
                mock_ws_manager = MagicMock()
                mock_ws_manager.connection_pool.join_room = AsyncMock()
                with patch(
                    "app.websockets.jwt_websocket_auth.advanced_websocket_manager",
                    mock_ws_manager,
                ):
                    connection_id = await manager.connect(websocket, user_auth)

            mock_ws_manager.connection_pool.join_room.assert_called_once_with(
                connection_id, "user:123"
            )


class TestManagerDisconnect:
    """Tests for AuthenticatedWebSocketManager.disconnect()."""

    @pytest.mark.asyncio
    async def test_disconnect_removes_connection(self):
        """Test disconnecting removes connection info."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.PROJECT_NAME = "lokifi"

            manager = AuthenticatedWebSocketManager()
            websocket = MockWebSocket()
            user_auth = {"user_id": "123", "username": "testuser"}

            with patch.object(
                manager, "_store_connection_in_redis", new_callable=AsyncMock
            ):
                with patch.object(
                    manager, "_remove_connection_from_redis", new_callable=AsyncMock
                ):
                    with patch(
                        "app.websockets.jwt_websocket_auth.advanced_websocket_manager"
                    ):
                        connection_id = await manager.connect(websocket, user_auth)
                        await manager.disconnect(connection_id)

            assert connection_id not in manager.active_connections
            assert "123" not in manager.user_connections

    @pytest.mark.asyncio
    async def test_disconnect_nonexistent(self):
        """Test disconnecting nonexistent connection is safe."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            manager = AuthenticatedWebSocketManager()

            # Should not raise
            await manager.disconnect("nonexistent-id")

    @pytest.mark.asyncio
    async def test_disconnect_keeps_other_user_connections(self):
        """Test disconnecting keeps other connections for same user."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.PROJECT_NAME = "lokifi"

            manager = AuthenticatedWebSocketManager()
            websocket1 = MockWebSocket()
            websocket2 = MockWebSocket()
            user_auth = {"user_id": "123", "username": "testuser"}

            with patch.object(
                manager, "_store_connection_in_redis", new_callable=AsyncMock
            ):
                with patch.object(
                    manager, "_remove_connection_from_redis", new_callable=AsyncMock
                ):
                    with patch(
                        "app.websockets.jwt_websocket_auth.advanced_websocket_manager"
                    ):
                        conn_id1 = await manager.connect(websocket1, user_auth)
                        conn_id2 = await manager.connect(websocket2, user_auth)
                        await manager.disconnect(conn_id1)

            assert conn_id1 not in manager.active_connections
            assert conn_id2 in manager.active_connections
            assert "123" in manager.user_connections
            assert conn_id2 in manager.user_connections["123"]


class TestSendPersonalMessage:
    """Tests for AuthenticatedWebSocketManager.send_personal_message()."""

    @pytest.mark.asyncio
    async def test_send_to_connected_user(self):
        """Test sending message to connected user."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.PROJECT_NAME = "lokifi"

            manager = AuthenticatedWebSocketManager()
            websocket = MockWebSocket()
            user_auth = {"user_id": "123", "username": "testuser"}

            with patch.object(
                manager, "_store_connection_in_redis", new_callable=AsyncMock
            ):
                with patch(
                    "app.websockets.jwt_websocket_auth.advanced_websocket_manager"
                ):
                    await manager.connect(websocket, user_auth)

            message = {"type": "test", "data": "hello"}
            sent_count = await manager.send_personal_message("123", message)

            assert sent_count == 1
            assert len(websocket.messages_sent) == 1
            assert json.loads(websocket.messages_sent[0]) == message

    @pytest.mark.asyncio
    async def test_send_to_multiple_connections(self):
        """Test sending message to user with multiple connections."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.PROJECT_NAME = "lokifi"

            manager = AuthenticatedWebSocketManager()
            websocket1 = MockWebSocket()
            websocket2 = MockWebSocket()
            user_auth = {"user_id": "123", "username": "testuser"}

            with patch.object(
                manager, "_store_connection_in_redis", new_callable=AsyncMock
            ):
                with patch(
                    "app.websockets.jwt_websocket_auth.advanced_websocket_manager"
                ):
                    await manager.connect(websocket1, user_auth)
                    await manager.connect(websocket2, user_auth)

            message = {"type": "test", "data": "hello"}
            sent_count = await manager.send_personal_message("123", message)

            assert sent_count == 2
            assert len(websocket1.messages_sent) == 1
            assert len(websocket2.messages_sent) == 1

    @pytest.mark.asyncio
    async def test_send_to_not_connected_user(self):
        """Test sending message to user not connected."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            manager = AuthenticatedWebSocketManager()

            message = {"type": "test", "data": "hello"}
            sent_count = await manager.send_personal_message("999", message)

            assert sent_count == 0

    @pytest.mark.asyncio
    async def test_send_handles_failed_connection(self):
        """Test sending handles failed connection gracefully."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.PROJECT_NAME = "lokifi"

            manager = AuthenticatedWebSocketManager()

            # Create a websocket that fails on send
            websocket = MockWebSocket()

            async def fail_send(msg):
                raise Exception("Send failed")

            websocket.send_text = fail_send
            user_auth = {"user_id": "123", "username": "testuser"}

            with patch.object(
                manager, "_store_connection_in_redis", new_callable=AsyncMock
            ):
                with patch.object(
                    manager, "_remove_connection_from_redis", new_callable=AsyncMock
                ):
                    with patch(
                        "app.websockets.jwt_websocket_auth.advanced_websocket_manager"
                    ):
                        await manager.connect(websocket, user_auth)

            message = {"type": "test", "data": "hello"}
            sent_count = await manager.send_personal_message("123", message)

            # Should disconnect the failed connection
            assert sent_count == 0
            assert "123" not in manager.user_connections


class TestBroadcastToRoom:
    """Tests for AuthenticatedWebSocketManager.broadcast_to_room()."""

    @pytest.mark.asyncio
    async def test_broadcast_to_all(self):
        """Test broadcasting to all connections."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.PROJECT_NAME = "lokifi"

            manager = AuthenticatedWebSocketManager()
            websocket1 = MockWebSocket()
            websocket2 = MockWebSocket()

            with patch.object(
                manager, "_store_connection_in_redis", new_callable=AsyncMock
            ):
                with patch(
                    "app.websockets.jwt_websocket_auth.advanced_websocket_manager"
                ):
                    await manager.connect(
                        websocket1, {"user_id": "1", "username": "u1"}
                    )
                    await manager.connect(
                        websocket2, {"user_id": "2", "username": "u2"}
                    )

            message = {"type": "broadcast", "data": "hello all"}
            sent_count = await manager.broadcast_to_room("test-room", message)

            assert sent_count == 2
            assert len(websocket1.messages_sent) == 1
            assert len(websocket2.messages_sent) == 1


class TestRedisOperations:
    """Tests for Redis operations."""

    @pytest.mark.asyncio
    async def test_store_connection_in_redis(self):
        """Test storing connection in Redis."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.PROJECT_NAME = "lokifi"

            manager = AuthenticatedWebSocketManager()
            user_auth = {"user_id": "123", "username": "testuser"}

            with patch("app.websockets.jwt_websocket_auth.redis_client") as mock_redis:
                mock_redis.set = AsyncMock()
                await manager._store_connection_in_redis("conn_123", user_auth)

            # Should call set twice (connection key and user connections key)
            assert mock_redis.set.call_count == 2

    @pytest.mark.asyncio
    async def test_remove_connection_from_redis(self):
        """Test removing connection from Redis."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            manager = AuthenticatedWebSocketManager()

            with patch("app.websockets.jwt_websocket_auth.redis_client") as mock_redis:
                mock_redis.set = AsyncMock()
                await manager._remove_connection_from_redis("conn_123", "123")

            # Should call set twice with short TTL to "delete"
            assert mock_redis.set.call_count == 2

    @pytest.mark.asyncio
    async def test_redis_operations_handle_errors(self):
        """Test Redis operations handle errors gracefully."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            manager = AuthenticatedWebSocketManager()

            with patch("app.websockets.jwt_websocket_auth.redis_client") as mock_redis:
                mock_redis.set = AsyncMock(side_effect=Exception("Redis error"))

                # Should not raise
                await manager._store_connection_in_redis("conn_123", {"user_id": "123"})
                await manager._remove_connection_from_redis("conn_123", "123")


class TestUserPresence:
    """Tests for user presence functionality."""

    @pytest.mark.asyncio
    async def test_get_user_presence_cached(self):
        """Test getting cached user presence."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            manager = AuthenticatedWebSocketManager()

            presence_data = {
                "user_id": "123",
                "status": "online",
                "last_seen": "2024-01-01T00:00:00Z",
            }

            with patch("app.websockets.jwt_websocket_auth.redis_client") as mock_redis:
                mock_redis.get = AsyncMock(return_value=json.dumps(presence_data))
                result = await manager.get_user_presence("123")

            assert result == presence_data

    @pytest.mark.asyncio
    async def test_get_user_presence_default(self):
        """Test getting default presence when not cached."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            manager = AuthenticatedWebSocketManager()

            with patch("app.websockets.jwt_websocket_auth.redis_client") as mock_redis:
                mock_redis.get = AsyncMock(return_value=None)
                result = await manager.get_user_presence("123")

            assert result["user_id"] == "123"
            assert result["status"] == "offline"
            assert result["last_seen"] is None

    @pytest.mark.asyncio
    async def test_update_user_presence(self):
        """Test updating user presence."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.PROJECT_NAME = "lokifi"
            manager = AuthenticatedWebSocketManager()

            with patch("app.websockets.jwt_websocket_auth.redis_client") as mock_redis:
                mock_redis.set = AsyncMock()
                await manager.update_user_presence("123", "online")

            # Should call set twice (presence key and heartbeat key)
            assert mock_redis.set.call_count == 2

    @pytest.mark.asyncio
    async def test_presence_handles_redis_errors(self):
        """Test presence operations handle Redis errors gracefully."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            manager = AuthenticatedWebSocketManager()

            with patch("app.websockets.jwt_websocket_auth.redis_client") as mock_redis:
                mock_redis.get = AsyncMock(side_effect=Exception("Redis error"))
                mock_redis.set = AsyncMock(side_effect=Exception("Redis error"))

                # Should return default and not raise
                result = await manager.get_user_presence("123")
                assert result["status"] == "offline"

                # Should not raise
                await manager.update_user_presence("123", "online")


# ============================================================================
# Test Typing Indicator
# ============================================================================


class TestTypingIndicator:
    """Tests for typing indicator functionality."""

    @pytest.mark.asyncio
    async def test_handle_typing_start(self):
        """Test handling typing start event."""
        with patch("app.websockets.jwt_websocket_auth.redis_client") as mock_redis:
            mock_redis.set = AsyncMock()
            await handle_typing_indicator("123", "room1", True)

        mock_redis.set.assert_called_once()
        call_args = mock_redis.set.call_args
        assert "typing:room1:123" in str(call_args)

    @pytest.mark.asyncio
    async def test_handle_typing_stop(self):
        """Test handling typing stop event."""
        with patch("app.websockets.jwt_websocket_auth.redis_client") as mock_redis:
            mock_redis.set = AsyncMock()
            await handle_typing_indicator("123", "room1", False)

        mock_redis.set.assert_called_once()

    @pytest.mark.asyncio
    async def test_typing_indicator_handles_errors(self):
        """Test typing indicator handles errors gracefully."""
        with patch("app.websockets.jwt_websocket_auth.redis_client") as mock_redis:
            mock_redis.set = AsyncMock(side_effect=Exception("Redis error"))

            # Should not raise
            await handle_typing_indicator("123", "room1", True)


# ============================================================================
# Test WebSocket Endpoint
# ============================================================================


class TestWebSocketEndpoint:
    """Tests for websocket_endpoint_with_auth."""

    @pytest.mark.asyncio
    async def test_endpoint_closes_on_auth_failure(self):
        """Test endpoint closes connection on authentication failure."""
        websocket = MockWebSocket()

        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            await websocket_endpoint_with_auth(websocket)

        assert websocket.closed
        assert websocket.close_code == 1008
        assert websocket.close_reason == "Authentication failed"

    @pytest.mark.asyncio
    async def test_endpoint_accepts_valid_auth(self):
        """Test endpoint accepts valid authentication."""
        with patch("app.websockets.jwt_websocket_auth.settings") as mock_settings:
            mock_settings.JWT_SECRET_KEY = "test-secret"
            mock_settings.JWT_EXPIRE_MINUTES = 30
            mock_settings.PROJECT_NAME = "lokifi"

            auth = WebSocketJWTAuth()
            token = auth.create_access_token({"user_id": 123, "username": "testuser"})
            websocket = MockWebSocket(query_params={"token": token})
            websocket.receive_queue = []  # Empty to trigger exception

            with patch("app.websockets.jwt_websocket_auth.redis_client") as mock_redis:
                mock_redis.set = AsyncMock()
                mock_redis.get = AsyncMock(return_value=None)
                with patch(
                    "app.websockets.jwt_websocket_auth.advanced_websocket_manager"
                ):
                    await websocket_endpoint_with_auth(websocket)

        assert websocket.accepted


# ============================================================================
# Test Module Level Instances
# ============================================================================


class TestModuleInstances:
    """Tests for module-level instances."""

    def test_authenticated_websocket_manager_exists(self):
        """Test authenticated_websocket_manager instance exists."""
        assert authenticated_websocket_manager is not None
        assert isinstance(
            authenticated_websocket_manager, AuthenticatedWebSocketManager
        )

    def test_websocket_jwt_auth_exists(self):
        """Test websocket_jwt_auth instance exists."""
        assert websocket_jwt_auth is not None
        assert isinstance(websocket_jwt_auth, WebSocketJWTAuth)
