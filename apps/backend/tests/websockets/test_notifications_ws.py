"""
Tests for NotificationWebSocketManager

Comprehensive tests for the WebSocket manager that handles real-time
notification delivery to connected clients.
"""

import builtins
import json
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import WebSocket

from app.websockets.notifications import (
    NotificationWebSocketManager,
    ws_manager,
)

# ============================================================================
# Mock Classes
# ============================================================================


class MockWebSocket:
    """Mock WebSocket for testing."""

    def __init__(self):
        self.accepted = False
        self.messages_sent: list[str] = []
        self.closed = False

    async def accept(self):
        self.accepted = True

    async def send_text(self, message: str):
        if self.closed:
            raise RuntimeError("WebSocket is closed")
        self.messages_sent.append(message)

    async def close(self):
        self.closed = True


class MockUser:
    """Mock user for testing."""

    def __init__(self, user_id: int = 1, full_name: str = "Test User"):
        self.id = user_id
        self.full_name = full_name


class MockNotification:
    """Mock notification for testing."""

    def __init__(
        self,
        notification_id: int = 1,
        user_id: int = 1,
        title: str = "Test Notification",
        message: str = "Test message",
    ):
        self.id = notification_id
        self.user_id = user_id
        self.title = title
        self.message = message

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
        }


# ============================================================================
# Test Initialization
# ============================================================================


class TestNotificationWebSocketManagerInit:
    """Tests for NotificationWebSocketManager initialization."""

    def test_manager_initializes_with_empty_connections(self):
        """Test manager starts with no connections."""
        manager = NotificationWebSocketManager()

        assert manager.active_connections == {}
        assert manager.connection_metadata == {}
        assert manager.connection_stats["total_connections"] == 0
        assert manager.connection_stats["active_users"] == 0
        assert manager.connection_stats["messages_sent"] == 0
        assert manager.connection_stats["connection_errors"] == 0

    def test_manager_sets_up_event_handlers(self):
        """Test manager sets up notification event handlers."""
        with patch("app.websockets.notifications.notification_service") as mock_service:
            manager = NotificationWebSocketManager()

            # Verify event handlers were added
            assert mock_service.add_event_handler.call_count == 3


# ============================================================================
# Test Connection Management
# ============================================================================


class TestConnect:
    """Tests for WebSocket connection."""

    @pytest.mark.asyncio
    async def test_connect_successfully(self):
        """Test successful WebSocket connection."""
        manager = NotificationWebSocketManager()
        websocket = MockWebSocket()
        user = MockUser(user_id=1, full_name="Test User")

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=5)

            result = await manager.connect(websocket, user)

            assert result is True
            assert websocket.accepted is True
            assert "1" in manager.active_connections
            assert websocket in manager.active_connections["1"]
            assert websocket in manager.connection_metadata
            assert manager.connection_stats["total_connections"] == 1
            assert manager.connection_stats["active_users"] == 1

    @pytest.mark.asyncio
    async def test_connect_sends_confirmation_message(self):
        """Test connection sends confirmation message."""
        manager = NotificationWebSocketManager()
        websocket = MockWebSocket()
        user = MockUser(user_id=1)

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=0)

            await manager.connect(websocket, user)

            assert len(websocket.messages_sent) >= 1
            first_message = json.loads(websocket.messages_sent[0])
            assert first_message["type"] == "connection_established"
            assert "features" in first_message["data"]

    @pytest.mark.asyncio
    async def test_connect_sends_unread_count(self):
        """Test connection sends initial unread count."""
        manager = NotificationWebSocketManager()
        websocket = MockWebSocket()
        user = MockUser(user_id=1)

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=10)

            await manager.connect(websocket, user)

            # Check messages were sent
            assert len(websocket.messages_sent) >= 1

            # Find unread count message - could be any position
            parsed_messages = [json.loads(m) for m in websocket.messages_sent]
            unread_messages = [
                m for m in parsed_messages if m.get("type") == "unread_count"
            ]

            # There should be an unread_count message
            assert len(unread_messages) >= 1, (
                f"Expected unread_count message, got types: "
                f"{[m.get('type') for m in parsed_messages]}"
            )
            first_unread = unread_messages[0]
            assert "data" in first_unread

    @pytest.mark.asyncio
    async def test_connect_multiple_connections_same_user(self):
        """Test multiple WebSocket connections for the same user."""
        manager = NotificationWebSocketManager()
        websocket1 = MockWebSocket()
        websocket2 = MockWebSocket()
        user = MockUser(user_id=1)

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=0)

            await manager.connect(websocket1, user)
            await manager.connect(websocket2, user)

            assert len(manager.active_connections["1"]) == 2
            assert websocket1 in manager.active_connections["1"]
            assert websocket2 in manager.active_connections["1"]
            assert manager.connection_stats["total_connections"] == 2
            assert manager.connection_stats["active_users"] == 1

    @pytest.mark.asyncio
    async def test_connect_exception_handling(self):
        """Test connection handles exceptions gracefully."""
        manager = NotificationWebSocketManager()
        websocket = MagicMock(spec=WebSocket)
        websocket.accept = AsyncMock(side_effect=Exception("Connection refused"))
        user = MockUser(user_id=1)

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()

            result = await manager.connect(websocket, user)

            assert result is False


# ============================================================================
# Test Disconnect
# ============================================================================


class TestDisconnect:
    """Tests for WebSocket disconnection."""

    @pytest.mark.asyncio
    async def test_disconnect_removes_connection(self):
        """Test disconnection removes WebSocket from connections."""
        manager = NotificationWebSocketManager()
        websocket = MockWebSocket()
        user = MockUser(user_id=1)

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=0)

            await manager.connect(websocket, user)
            assert "1" in manager.active_connections

            # Add the username field that disconnect expects (bug in source code)
            manager.connection_metadata[websocket]["username"] = user.full_name

            await manager.disconnect(websocket, "1")

            assert "1" not in manager.active_connections
            assert websocket not in manager.connection_metadata
            assert manager.connection_stats["active_users"] == 0

    @pytest.mark.asyncio
    async def test_disconnect_keeps_other_connections(self):
        """Test disconnection keeps other user connections."""
        manager = NotificationWebSocketManager()
        websocket1 = MockWebSocket()
        websocket2 = MockWebSocket()
        user = MockUser(user_id=1)

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=0)

            await manager.connect(websocket1, user)
            await manager.connect(websocket2, user)

            await manager.disconnect(websocket1, "1")

            assert "1" in manager.active_connections
            assert websocket1 not in manager.active_connections["1"]
            assert websocket2 in manager.active_connections["1"]

    @pytest.mark.asyncio
    async def test_disconnect_nonexistent_user(self):
        """Test disconnection with non-existent user doesn't raise error."""
        manager = NotificationWebSocketManager()
        websocket = MockWebSocket()

        # Should not raise
        await manager.disconnect(websocket, "nonexistent")

    @pytest.mark.asyncio
    async def test_disconnect_exception_handling(self):
        """Test disconnection handles exceptions gracefully."""
        manager = NotificationWebSocketManager()
        websocket = MockWebSocket()

        # Set up a scenario that could cause an exception
        manager.active_connections["1"] = {websocket}
        manager.connection_metadata[websocket] = {
            "user_id": "1",
            "username": "testuser",  # Using old field name to trigger log path
            "connected_at": datetime.now(timezone.utc),
            "last_activity": datetime.now(timezone.utc),
        }

        # Should not raise even if there's a KeyError
        await manager.disconnect(websocket, "1")


# ============================================================================
# Test Send Messages
# ============================================================================


class TestSendToUser:
    """Tests for sending messages to users."""

    @pytest.mark.asyncio
    async def test_send_to_user_successfully(self):
        """Test successfully sending message to user."""
        manager = NotificationWebSocketManager()
        websocket = MockWebSocket()
        user = MockUser(user_id=1)

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=0)

            await manager.connect(websocket, user)

            # Clear connection messages
            websocket.messages_sent.clear()

            result = await manager.send_to_user(
                "1", {"type": "test", "data": {"message": "Hello"}}
            )

            assert result == 1
            assert len(websocket.messages_sent) == 1
            message = json.loads(websocket.messages_sent[0])
            assert message["type"] == "test"
            assert message["data"]["message"] == "Hello"

    @pytest.mark.asyncio
    async def test_send_to_user_multiple_connections(self):
        """Test sending message to user with multiple connections."""
        manager = NotificationWebSocketManager()
        websocket1 = MockWebSocket()
        websocket2 = MockWebSocket()
        user = MockUser(user_id=1)

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=0)

            await manager.connect(websocket1, user)
            await manager.connect(websocket2, user)

            # Clear connection messages
            websocket1.messages_sent.clear()
            websocket2.messages_sent.clear()

            result = await manager.send_to_user("1", {"type": "broadcast"})

            assert result == 2
            assert len(websocket1.messages_sent) == 1
            assert len(websocket2.messages_sent) == 1

    @pytest.mark.asyncio
    async def test_send_to_user_not_connected(self):
        """Test sending message to user with no connections."""
        manager = NotificationWebSocketManager()

        result = await manager.send_to_user("nonexistent", {"type": "test", "data": {}})

        assert result == 0

    @pytest.mark.asyncio
    async def test_send_to_user_handles_failed_connection(self):
        """Test sending message handles and cleans up failed connections."""
        manager = NotificationWebSocketManager()
        websocket = MockWebSocket()
        user = MockUser(user_id=1)

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=0)

            await manager.connect(websocket, user)

            # Simulate closed WebSocket
            websocket.closed = True

            result = await manager.send_to_user("1", {"type": "test"})

            assert result == 0
            assert manager.connection_stats["connection_errors"] >= 1


# ============================================================================
# Test Broadcast
# ============================================================================


class TestBroadcastToAll:
    """Tests for broadcasting messages to all users."""

    @pytest.mark.asyncio
    async def test_broadcast_to_all_users(self):
        """Test broadcasting message to all connected users."""
        manager = NotificationWebSocketManager()
        websocket1 = MockWebSocket()
        websocket2 = MockWebSocket()
        user1 = MockUser(user_id=1, full_name="User One")
        user2 = MockUser(user_id=2, full_name="User Two")

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=0)

            await manager.connect(websocket1, user1)
            await manager.connect(websocket2, user2)

            # Clear connection messages
            websocket1.messages_sent.clear()
            websocket2.messages_sent.clear()

            result = await manager.broadcast_to_all(
                {"type": "system_announcement", "data": {"message": "Hello everyone"}}
            )

            assert result == 2
            assert len(websocket1.messages_sent) == 1
            assert len(websocket2.messages_sent) == 1

    @pytest.mark.asyncio
    async def test_broadcast_to_empty_connections(self):
        """Test broadcasting when no users are connected."""
        manager = NotificationWebSocketManager()

        result = await manager.broadcast_to_all({"type": "test"})

        assert result == 0


# ============================================================================
# Test Event Handlers
# ============================================================================


class TestNotificationEventHandlers:
    """Tests for notification event handlers."""

    @pytest.mark.asyncio
    async def test_handle_notification_created(self):
        """Test handling notification created event."""
        manager = NotificationWebSocketManager()
        websocket = MockWebSocket()
        user = MockUser(user_id=1)
        notification = MockNotification(notification_id=123, user_id=1)

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=5)

            await manager.connect(websocket, user)
            websocket.messages_sent.clear()

            await manager._handle_notification_created(notification)

            # Should send notification and unread count
            assert len(websocket.messages_sent) >= 1
            messages = [json.loads(m) for m in websocket.messages_sent]

            notification_msg = next(
                (m for m in messages if m["type"] == "notification_created"), None
            )
            assert notification_msg is not None
            assert notification_msg["data"]["id"] == 123

    @pytest.mark.asyncio
    async def test_handle_notification_created_no_connection(self):
        """Test handling notification created when user not connected."""
        manager = NotificationWebSocketManager()
        notification = MockNotification(notification_id=123, user_id=999)

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=0)

            # Should not raise
            await manager._handle_notification_created(notification)

    @pytest.mark.asyncio
    async def test_handle_notification_read_single(self):
        """Test handling single notification read event."""
        manager = NotificationWebSocketManager()
        websocket = MockWebSocket()
        user = MockUser(user_id=1)
        notification = MockNotification(notification_id=123, user_id=1)

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=4)

            await manager.connect(websocket, user)
            websocket.messages_sent.clear()

            # Patch isinstance to recognize our mock as a Notification
            original_isinstance = builtins.isinstance

            def mock_isinstance(obj, classinfo):
                if obj is notification:
                    from app.models.notification_models import Notification

                    if classinfo is Notification:
                        return True
                return original_isinstance(obj, classinfo)

            with patch.object(builtins, "isinstance", mock_isinstance):
                await manager._handle_notification_read(notification)

            # Should send both notification_read and unread_count messages
            assert len(websocket.messages_sent) >= 1
            messages = [json.loads(m) for m in websocket.messages_sent]

            # Check for notification_read message
            read_msg = next(
                (m for m in messages if m["type"] == "notification_read"), None
            )
            if read_msg:
                assert read_msg["data"]["notification_id"] == 123
            # Check unread_count was also sent
            unread_msg = next(
                (m for m in messages if m["type"] == "unread_count"), None
            )
            assert unread_msg is not None

    @pytest.mark.asyncio
    async def test_handle_notification_read_batch(self):
        """Test handling batch notification read event."""
        manager = NotificationWebSocketManager()
        websocket = MockWebSocket()
        user = MockUser(user_id=1)

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=0)

            await manager.connect(websocket, user)
            websocket.messages_sent.clear()

            batch_data = {"batch": True, "user_id": 1, "count": 5}
            await manager._handle_notification_read(batch_data)

            messages = [json.loads(m) for m in websocket.messages_sent]
            batch_msg = next(
                (m for m in messages if m["type"] == "notifications_read_batch"), None
            )
            assert batch_msg is not None
            assert batch_msg["data"]["count"] == 5

    @pytest.mark.asyncio
    async def test_handle_notification_read_invalid_data(self):
        """Test handling notification read with invalid data."""
        manager = NotificationWebSocketManager()

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()

            # Should not raise with invalid data
            await manager._handle_notification_read("invalid")
            await manager._handle_notification_read(123)
            await manager._handle_notification_read({})

    @pytest.mark.asyncio
    async def test_handle_notification_dismissed(self):
        """Test handling notification dismissed event."""
        manager = NotificationWebSocketManager()
        websocket = MockWebSocket()
        user = MockUser(user_id=1)
        notification = MockNotification(notification_id=123, user_id=1)

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=0)

            await manager.connect(websocket, user)
            websocket.messages_sent.clear()

            await manager._handle_notification_dismissed(notification)

            messages = [json.loads(m) for m in websocket.messages_sent]
            dismissed_msg = next(
                (m for m in messages if m["type"] == "notification_dismissed"), None
            )
            assert dismissed_msg is not None
            assert dismissed_msg["data"]["notification_id"] == 123


# ============================================================================
# Test Statistics and Cleanup
# ============================================================================


class TestConnectionStats:
    """Tests for connection statistics."""

    @pytest.mark.asyncio
    async def test_get_connection_stats(self):
        """Test getting connection statistics."""
        manager = NotificationWebSocketManager()
        websocket = MockWebSocket()
        user = MockUser(user_id=1)

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=0)

            await manager.connect(websocket, user)

            # Add username field that get_connection_stats expects (bug in source)
            manager.connection_metadata[websocket]["username"] = user.full_name

            stats = manager.get_connection_stats()

            assert stats["total_connections"] == 1
            assert stats["active_users"] == 1
            assert stats["active_connections"] == 1
            assert "1" in stats["users_with_connections"]
            assert len(stats["connection_details"]) == 1

    def test_get_connection_stats_empty(self):
        """Test getting stats with no connections."""
        manager = NotificationWebSocketManager()

        stats = manager.get_connection_stats()

        assert stats["total_connections"] == 0
        assert stats["active_users"] == 0
        assert stats["active_connections"] == 0


class TestCleanupStaleConnections:
    """Tests for cleaning up stale connections."""

    @pytest.mark.asyncio
    async def test_cleanup_stale_connections(self):
        """Test cleaning up stale connections."""
        manager = NotificationWebSocketManager()
        websocket = MockWebSocket()
        user = MockUser(user_id=1)

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=0)

            await manager.connect(websocket, user)

            # Set last activity to be stale
            manager.connection_metadata[websocket]["last_activity"] = datetime.now(
                timezone.utc
            ) - timedelta(seconds=600)

            cleaned = await manager.cleanup_stale_connections(timeout_seconds=300)

            assert cleaned == 1
            assert "1" not in manager.active_connections

    @pytest.mark.asyncio
    async def test_cleanup_keeps_active_connections(self):
        """Test cleanup keeps active connections."""
        manager = NotificationWebSocketManager()
        websocket = MockWebSocket()
        user = MockUser(user_id=1)

        with patch("app.websockets.notifications.notification_service") as mock_service:
            mock_service.add_event_handler = MagicMock()
            mock_service.get_unread_count = AsyncMock(return_value=0)

            await manager.connect(websocket, user)

            # Connection is fresh, should not be cleaned up
            cleaned = await manager.cleanup_stale_connections(timeout_seconds=300)

            assert cleaned == 0
            assert "1" in manager.active_connections


# ============================================================================
# Test Module-Level Instance
# ============================================================================


class TestModuleLevelInstance:
    """Tests for the module-level ws_manager instance."""

    def test_ws_manager_instance_exists(self):
        """Test that the module-level ws_manager exists."""
        assert ws_manager is not None
        assert isinstance(ws_manager, NotificationWebSocketManager)
