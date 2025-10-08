# J6 Enterprise Notifications - Comprehensive Test Suite
import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.integrations.notification_hooks import notification_integration
from app.models.notification_models import Notification, NotificationPriority, NotificationType
from app.models.user import User
from app.services.notification_emitter import notification_emitter
from app.services.notification_service import (
    NotificationData,
    NotificationStats,
    notification_service,
)
from app.websockets.notifications import NotificationWebSocketManager


@pytest.fixture
def mock_user():
    """Mock user for testing"""
    user = Mock(spec=User)
    user.id = str(uuid.uuid4())
    user.username = "testuser"
    user.display_name = "Test User"
    user.avatar_url = "https://example.com/avatar.jpg"
    return user

@pytest.fixture
def mock_user_2():
    """Second mock user for testing interactions"""
    user = Mock(spec=User)
    user.id = str(uuid.uuid4())
    user.username = "testuser2"
    user.display_name = "Test User 2"
    user.avatar_url = "https://example.com/avatar2.jpg"
    return user

@pytest.fixture
def sample_notification_data(mock_user):
    """Sample notification data for testing"""
    return NotificationData(
        user_id=mock_user.id,
        type=NotificationType.FOLLOW,
        title="Test Notification",
        message="This is a test notification",
        priority=NotificationPriority.NORMAL,
        category="test",
        payload={"test": True}
    )

@pytest.fixture
async def mock_db_session():
    """Mock database session"""
    session = AsyncMock()
    session.add = Mock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.execute = AsyncMock()
    session.scalar = AsyncMock()
    session.scalar_one_or_none = AsyncMock()
    session.delete = AsyncMock()
    
    # Mock context manager
    session.__aenter__ = AsyncMock(return_value=session)
    session.__aexit__ = AsyncMock(return_value=None)
    
    return session

class TestNotificationService:
    """Test cases for NotificationService"""
    
    @pytest.mark.asyncio
    async def test_create_notification_success(self, sample_notification_data, mock_db_session):
        """Test successful notification creation"""
        with patch('app.services.notification_service.db_manager') as mock_db:
            # Setup mock database
            async def mock_get_session():
                yield mock_db_session
            mock_db.get_session = mock_get_session
            
            # Mock notification creation
            created_notification = Notification(
                id=str(uuid.uuid4()),
                user_id=sample_notification_data.user_id,
                type=sample_notification_data.type.value,
                title=sample_notification_data.title,
                message=sample_notification_data.message
            )
            mock_db_session.refresh.side_effect = lambda obj: setattr(obj, 'id', created_notification.id)
            
            # Test creation
            result = await notification_service.create_notification(sample_notification_data)
            
            # Verify database calls
            mock_db_session.add.assert_called_once()
            mock_db_session.commit.assert_called_once()
            mock_db_session.refresh.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_user_notifications(self, mock_user, mock_db_session):
        """Test retrieving user notifications"""
        with patch('app.services.notification_service.db_manager') as mock_db:
            async def mock_get_session(read_only=False):
                yield mock_db_session
            mock_db.get_session = mock_get_session
            
            # Mock notifications
            mock_notifications = [
                Mock(spec=Notification, id="1", user_id=mock_user.id, type="follow", is_read=False),
                Mock(spec=Notification, id="2", user_id=mock_user.id, type="dm_message_received", is_read=True)
            ]
            
            mock_result = Mock()
            mock_result.scalars.return_value.all.return_value = mock_notifications
            mock_db_session.execute.return_value = mock_result
            
            # Test retrieval
            notifications = await notification_service.get_user_notifications(
                user_id=mock_user.id,
                limit=10
            )
            
            assert len(notifications) == 2
            mock_db_session.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_unread_count(self, mock_user, mock_db_session):
        """Test getting unread notification count"""
        with patch('app.services.notification_service.db_manager') as mock_db:
            async def mock_get_session(read_only=False):
                yield mock_db_session
            mock_db.get_session = mock_get_session
            
            # Mock count result
            mock_db_session.execute.return_value.scalar.return_value = 5
            
            # Test count retrieval
            count = await notification_service.get_unread_count(mock_user.id)
            
            assert count == 5
            mock_db_session.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_mark_as_read_success(self, mock_user, mock_db_session):
        """Test marking notification as read"""
        with patch('app.services.notification_service.db_manager') as mock_db:
            async def mock_get_session():
                yield mock_db_session
            mock_db.get_session = mock_get_session
            
            # Mock notification
            mock_notification = Mock(spec=Notification)
            mock_notification.id = "test_id"
            mock_notification.user_id = mock_user.id
            mock_notification.is_read = False
            mock_notification.mark_as_read = Mock()
            
            mock_db_session.scalar_one_or_none.return_value = mock_notification
            
            # Test marking as read
            result = await notification_service.mark_as_read("test_id", mock_user.id)
            
            assert result is True
            mock_notification.mark_as_read.assert_called_once()
            mock_db_session.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_mark_all_as_read(self, mock_user, mock_db_session):
        """Test marking all notifications as read"""
        with patch('app.services.notification_service.db_manager') as mock_db:
            async def mock_get_session():
                yield mock_db_session
            mock_db.get_session = mock_get_session
            
            # Mock unread notifications
            mock_notifications = [
                Mock(spec=Notification, mark_as_read=Mock()),
                Mock(spec=Notification, mark_as_read=Mock()),
                Mock(spec=Notification, mark_as_read=Mock())
            ]
            
            mock_result = Mock()
            mock_result.scalars.return_value.all.return_value = mock_notifications
            mock_db_session.execute.return_value = mock_result
            
            # Test marking all as read
            count = await notification_service.mark_all_as_read(mock_user.id)
            
            assert count == 3
            for notification in mock_notifications:
                notification.mark_as_read.assert_called_once()
            mock_db_session.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_batch_notifications(self, mock_user, mock_db_session):
        """Test creating notifications in batch"""
        with patch('app.services.notification_service.db_manager') as mock_db, \
             patch.object(notification_service, 'create_notification') as mock_create:
            
            # Mock successful creation
            mock_create.return_value = Mock(spec=Notification, id=str(uuid.uuid4()))
            
            # Create batch data
            batch_data = [
                NotificationData(
                    user_id=mock_user.id,
                    type=NotificationType.FOLLOW,
                    title=f"Test Notification {i}",
                    message=f"Test message {i}"
                )
                for i in range(5)
            ]
            
            # Test batch creation
            results = await notification_service.create_batch_notifications(batch_data)
            
            assert len(results) == 5
            assert mock_create.call_count == 5
    
    @pytest.mark.asyncio
    async def test_notification_stats(self, mock_user, mock_db_session):
        """Test getting notification statistics"""
        with patch('app.services.notification_service.db_manager') as mock_db:
            async def mock_get_session(read_only=False):
                yield mock_db_session
            mock_db.get_session = mock_get_session
            
            # Mock statistics queries
            mock_db_session.execute.side_effect = [
                Mock(scalar=Mock(return_value=10)),  # total count
                Mock(scalar=Mock(return_value=3)),   # unread count
                Mock(scalar=Mock(return_value=2)),   # dismissed count
                Mock(scalar=Mock(return_value=8)),   # delivered count
                Mock(scalar=Mock(return_value=5)),   # clicked count
                Mock(scalars=Mock(return_value=Mock(all=Mock(return_value=[]))))  # all notifications
            ]
            
            # Test stats retrieval
            stats = await notification_service.get_notification_stats(mock_user.id)
            
            assert isinstance(stats, NotificationStats)
            assert stats.total_notifications == 10
            assert stats.unread_count == 3
            assert stats.read_count == 7

class TestNotificationEmitter:
    """Test cases for NotificationEmitter"""
    
    @pytest.mark.asyncio
    async def test_emit_follow_notification(self, mock_user, mock_user_2):
        """Test emitting follow notification"""
        with patch.object(notification_service, 'create_notification') as mock_create:
            mock_create.return_value = Mock(spec=Notification, id=str(uuid.uuid4()))
            
            # Test follow notification
            result = await notification_emitter.emit_follow_notification(
                follower_user=mock_user,
                followed_user=mock_user_2
            )
            
            assert result is True
            mock_create.assert_called_once()
            
            # Check notification data
            call_args = mock_create.call_args[0][0]
            assert call_args.user_id == mock_user_2.id
            assert call_args.type == NotificationType.FOLLOW
            assert mock_user.username in call_args.title
    
    @pytest.mark.asyncio
    async def test_emit_dm_notification(self, mock_user, mock_user_2):
        """Test emitting direct message notification"""
        with patch.object(notification_service, 'create_notification') as mock_create:
            mock_create.return_value = Mock(spec=Notification, id=str(uuid.uuid4()))
            
            # Test DM notification
            result = await notification_emitter.emit_dm_message_received_notification(
                sender_user=mock_user,
                recipient_user=mock_user_2,
                message_id="msg_123",
                message_content="Hello there!",
                thread_id="thread_456"
            )
            
            assert result is True
            mock_create.assert_called_once()
            
            # Check notification data
            call_args = mock_create.call_args[0][0]
            assert call_args.user_id == mock_user_2.id
            assert call_args.type == NotificationType.DM_MESSAGE_RECEIVED
            assert call_args.priority == NotificationPriority.HIGH
            assert "Hello there!" in call_args.message
    
    @pytest.mark.asyncio
    async def test_emit_ai_reply_notification(self, mock_user):
        """Test emitting AI reply notification"""
        with patch.object(notification_service, 'create_notification') as mock_create:
            mock_create.return_value = Mock(spec=Notification, id=str(uuid.uuid4()))
            
            # Test AI reply notification
            result = await notification_emitter.emit_ai_reply_finished_notification(
                user=mock_user,
                ai_provider="openai",
                message_id="ai_msg_123",
                thread_id="ai_thread_456",
                ai_response="Here's my response to your question...",
                processing_time_ms=2500.0
            )
            
            assert result is True
            mock_create.assert_called_once()
            
            # Check notification data
            call_args = mock_create.call_args[0][0]
            assert call_args.user_id == mock_user.id
            assert call_args.type == NotificationType.AI_REPLY_FINISHED
            assert "ChatGPT" in call_args.title
            assert call_args.payload["processing_time_ms"] == 2500.0
    
    @pytest.mark.asyncio
    async def test_emit_mention_notification(self, mock_user, mock_user_2):
        """Test emitting mention notification"""
        with patch.object(notification_service, 'create_notification') as mock_create:
            mock_create.return_value = Mock(spec=Notification, id=str(uuid.uuid4()))
            
            # Test mention notification
            result = await notification_emitter.emit_mention_notification(
                mentioned_user=mock_user,
                mentioning_user=mock_user_2,
                content="Hey @testuser, check this out!",
                context_type="message",
                context_id="msg_mention_123"
            )
            
            assert result is True
            mock_create.assert_called_once()
            
            # Check notification data
            call_args = mock_create.call_args[0][0]
            assert call_args.user_id == mock_user.id
            assert call_args.type == NotificationType.MENTION
            assert mock_user_2.username in call_args.title
    
    @pytest.mark.asyncio
    async def test_emit_bulk_follow_notifications(self, mock_user):
        """Test emitting bulk follow notifications"""
        with patch.object(notification_service, 'create_batch_notifications') as mock_batch:
            # Create multiple mock users
            followed_users = [
                Mock(spec=User, id=f"user_{i}", username=f"user{i}", display_name=f"User {i}")
                for i in range(5)
            ]
            
            mock_notifications = [
                Mock(spec=Notification, id=f"notif_{i}")
                for i in range(5)
            ]
            mock_batch.return_value = mock_notifications
            
            # Test bulk follow
            notification_ids = await notification_emitter.emit_bulk_follow_notifications(
                follower_user=mock_user,
                followed_users=followed_users
            )
            
            assert len(notification_ids) == 5
            mock_batch.assert_called_once()
            
            # Check batch data
            call_args = mock_batch.call_args[0][0]
            assert len(call_args) == 5
            for data in call_args:
                assert data.type == NotificationType.FOLLOW
                assert mock_user.username in data.title

class TestNotificationIntegration:
    """Test cases for notification integration hooks"""
    
    @pytest.mark.asyncio
    async def test_follow_integration_hook(self):
        """Test follow integration hook"""
        with patch.object(notification_emitter, 'emit_follow_notification') as mock_emit:
            mock_emit.return_value = True
            
            follower_data = {
                'id': 'user1',
                'username': 'follower',
                'display_name': 'Follower User',
                'avatar_url': None
            }
            
            followed_data = {
                'id': 'user2',
                'username': 'followed',
                'display_name': 'Followed User',
                'avatar_url': None
            }
            
            # Test hook
            await notification_integration.on_user_followed(follower_data, followed_data)
            
            mock_emit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_dm_integration_hook(self):
        """Test DM integration hook"""
        with patch.object(notification_emitter, 'emit_dm_message_received_notification') as mock_emit:
            mock_emit.return_value = True
            
            sender_data = {
                'id': 'sender1',
                'username': 'sender',
                'display_name': 'Sender User',
                'avatar_url': None
            }
            
            recipient_data = {
                'id': 'recipient1',
                'username': 'recipient',
                'display_name': 'Recipient User',
                'avatar_url': None
            }
            
            message_data = {
                'id': 'msg123',
                'content': 'Test message',
                'thread_id': 'thread456'
            }
            
            # Test hook
            await notification_integration.on_dm_message_sent(sender_data, recipient_data, message_data)
            
            mock_emit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_ai_response_integration_hook(self):
        """Test AI response integration hook"""
        with patch.object(notification_emitter, 'emit_ai_reply_finished_notification') as mock_emit:
            mock_emit.return_value = True
            
            user_data = {
                'id': 'user1',
                'username': 'user',
                'display_name': 'User',
                'avatar_url': None
            }
            
            ai_response_data = {
                'provider': 'openai',
                'message_id': 'ai_msg123',
                'thread_id': 'ai_thread456',
                'content': 'AI response content',
                'processing_time_ms': 1500
            }
            
            # Test hook
            await notification_integration.on_ai_response_completed(user_data, ai_response_data)
            
            mock_emit.assert_called_once()

class TestNotificationWebSocket:
    """Test cases for WebSocket functionality"""
    
    def test_websocket_manager_initialization(self):
        """Test WebSocket manager initialization"""
        manager = NotificationWebSocketManager()
        
        assert isinstance(manager.active_connections, dict)
        assert isinstance(manager.connection_metadata, dict)
        assert isinstance(manager.connection_stats, dict)
        assert len(manager.active_connections) == 0
    
    @pytest.mark.asyncio
    async def test_websocket_connection_management(self, mock_user):
        """Test WebSocket connection and disconnection"""
        manager = NotificationWebSocketManager()
        mock_websocket = AsyncMock()
        
        # Test connection
        with patch.object(notification_service, 'get_unread_count', return_value=5):
            connected = await manager.connect(mock_websocket, mock_user)
            
            assert connected is True
            assert mock_user.id in manager.active_connections
            assert mock_websocket in manager.active_connections[mock_user.id]
            assert mock_websocket in manager.connection_metadata
        
        # Test disconnection
        await manager.disconnect(mock_websocket, mock_user.id)
        
        assert mock_user.id not in manager.active_connections
        assert mock_websocket not in manager.connection_metadata
    
    @pytest.mark.asyncio
    async def test_websocket_send_to_user(self, mock_user):
        """Test sending messages to user via WebSocket"""
        manager = NotificationWebSocketManager()
        mock_websocket = AsyncMock()
        
        # Setup connection
        manager.active_connections[mock_user.id] = {mock_websocket}
        manager.connection_metadata[mock_websocket] = {
            "user_id": mock_user.id,
            "username": mock_user.username,
            "connected_at": datetime.now(UTC),
            "last_activity": datetime.now(UTC)
        }
        
        # Test sending message
        test_message = {"type": "test", "data": {"content": "test message"}}
        sent_count = await manager.send_to_user(mock_user.id, test_message)
        
        assert sent_count == 1
        mock_websocket.send_text.assert_called_once()
    
    def test_websocket_connection_stats(self, mock_user):
        """Test WebSocket connection statistics"""
        manager = NotificationWebSocketManager()
        mock_websocket = Mock()
        
        # Add mock connection
        manager.active_connections[mock_user.id] = {mock_websocket}
        manager.connection_metadata[mock_websocket] = {
            "user_id": mock_user.id,
            "username": mock_user.username,
            "connected_at": datetime.now(UTC),
            "last_activity": datetime.now(UTC)
        }
        
        # Get stats
        stats = manager.get_connection_stats()
        
        assert stats["active_connections"] == 1
        assert mock_user.id in stats["users_with_connections"]
        assert len(stats["connection_details"]) == 1

class TestNotificationModels:
    """Test cases for notification models"""
    
    def test_notification_model_creation(self):
        """Test Notification model creation"""
        notification_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        
        notification = Notification(
            id=notification_id,
            user_id=user_id,
            type="follow",
            priority="normal",
            title="Test Notification",
            message="Test message"
        )
        
        assert notification.id == notification_id
        assert notification.user_id == user_id
        assert notification.type == "follow"
        assert notification.is_read is False
        assert notification.is_delivered is False
    
    def test_notification_mark_as_read(self):
        """Test notification mark as read functionality"""
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=str(uuid.uuid4()),
            type="follow",
            title="Test"
        )
        
        assert notification.is_read is False
        assert notification.read_at is None
        
        notification.mark_as_read()
        
        assert notification.is_read is True
        assert notification.read_at is not None
    
    def test_notification_to_dict(self):
        """Test notification to dictionary conversion"""
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=str(uuid.uuid4()),
            type="follow",
            title="Test",
            created_at=datetime.now(UTC)
        )
        
        data = notification.to_dict()
        
        assert isinstance(data, dict)
        assert "id" in data
        assert "user_id" in data
        assert "type" in data
        assert "title" in data
        assert "is_read" in data
        assert "age_seconds" in data
    
    def test_notification_expiration(self):
        """Test notification expiration functionality"""
        # Non-expired notification
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=str(uuid.uuid4()),
            type="follow",
            title="Test",
            expires_at=datetime.now(UTC) + timedelta(days=1)
        )
        
        assert notification.is_expired is False
        
        # Expired notification
        notification.expires_at = datetime.now(UTC) - timedelta(days=1)
        assert notification.is_expired is True

class TestNotificationIntegrationE2E:
    """End-to-end integration tests"""
    
    @pytest.mark.asyncio
    async def test_complete_notification_flow(self, mock_user, mock_user_2, mock_db_session):
        """Test complete notification flow from creation to read"""
        with patch('app.services.notification_service.db_manager') as mock_db:
            async def mock_get_session(read_only=False):
                yield mock_db_session
            mock_db.get_session = mock_get_session
            
            # Mock successful notification creation
            created_notification = Notification(
                id=str(uuid.uuid4()),
                user_id=mock_user_2.id,
                type=NotificationType.FOLLOW.value,
                title="Test Follow",
                is_read=False
            )
            
            mock_db_session.refresh.side_effect = lambda obj: setattr(obj, 'id', created_notification.id)
            mock_db_session.scalar_one_or_none.return_value = created_notification
            
            # Step 1: Create notification via emitter
            notification_data = NotificationData(
                user_id=mock_user_2.id,
                type=NotificationType.FOLLOW,
                title="Test Follow Notification",
                message="Test follow message"
            )
            
            notification = await notification_service.create_notification(notification_data)
            assert notification is not None
            
            # Step 2: Get unread count
            mock_db_session.execute.return_value.scalar.return_value = 1
            unread_count = await notification_service.get_unread_count(mock_user_2.id)
            assert unread_count == 1
            
            # Step 3: Mark as read
            result = await notification_service.mark_as_read(created_notification.id, mock_user_2.id)
            assert result is True
            
            # Verify the complete flow
            mock_db_session.add.assert_called()
            mock_db_session.commit.assert_called()

# Integration tests for API endpoints would go here
class TestNotificationAPI:
    """Test cases for notification API endpoints"""
    
    # These would test the actual FastAPI endpoints
    # using TestClient or similar testing framework
    pass

if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])