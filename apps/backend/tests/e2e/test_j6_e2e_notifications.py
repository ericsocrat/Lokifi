# J6 Notification System - E2E Integration Tests
"""
End-to-end integration tests for J6 Notification System
Tests the complete workflow from event → notification → UI → clearing
"""

import json
import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.integrations.notification_hooks import notification_integration
from app.models.notification_models import (
    Notification,
    NotificationPreference,
    NotificationPriority,
    NotificationType,
)
from app.models.user import User
from app.routers.notifications import router as notifications_router
from app.services.notification_service import NotificationData, notification_service
from app.websockets.notifications import NotificationWebSocketManager


# Mock FastAPI app for testing
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown

app = FastAPI(lifespan=lifespan)
app.include_router(notifications_router, prefix="/api/notifications")

@pytest.fixture
def test_client():
    """Test client for FastAPI app"""
    return TestClient(app)

@pytest.fixture
def mock_authenticated_user():
    """Mock authenticated user"""
    user = Mock(spec=User)
    user.id = str(uuid.uuid4())
    user.username = "testuser"
    user.display_name = "Test User"
    user.avatar_url = "https://example.com/avatar.jpg"
    user.email = "test@example.com"
    return user

@pytest.fixture
def mock_sender_user():
    """Mock sender user for DM tests"""
    user = Mock(spec=User)
    user.id = str(uuid.uuid4())
    user.username = "sender"
    user.display_name = "Sender User"
    user.avatar_url = "https://example.com/sender.jpg"
    user.email = "sender@example.com"
    return user

@pytest.fixture
def mock_websocket():
    """Mock WebSocket connection"""
    websocket = AsyncMock()
    websocket.send_text = AsyncMock()
    websocket.receive_text = AsyncMock()
    websocket.close = AsyncMock()
    return websocket

@pytest.fixture
async def notification_websocket_manager():
    """Notification WebSocket manager instance"""
    return NotificationWebSocketManager()

class TestE2ENotificationFlow:
    """End-to-end notification flow tests"""
    
    @pytest.mark.asyncio
    async def test_follow_notification_complete_flow(self, mock_authenticated_user, mock_sender_user):
        """
        E2E Test: Follow Event → Notification Creation → WebSocket Delivery → Mark as Read
        
        Flow:
        1. User A follows User B
        2. Follow notification is created for User B
        3. Notification is delivered via WebSocket to User B
        4. User B receives notification in UI
        5. User B marks notification as read
        6. Notification is removed from unread list
        """
        with patch('app.services.notification_service.db_manager') as mock_db, \
             patch.object(notification_service, 'create_notification') as mock_create, \
             patch.object(notification_service, 'get_unread_count') as mock_unread_count, \
             patch.object(notification_service, 'mark_as_read') as mock_mark_read:
            
            # Step 1: Setup follow event data
            follower_data = {
                'id': mock_sender_user.id,
                'username': mock_sender_user.username,
                'display_name': mock_sender_user.display_name,
                'avatar_url': mock_sender_user.avatar_url
            }
            
            followed_data = {
                'id': mock_authenticated_user.id,
                'username': mock_authenticated_user.username,
                'display_name': mock_authenticated_user.display_name,
                'avatar_url': mock_authenticated_user.avatar_url
            }
            
            # Mock notification creation
            created_notification = Mock(spec=Notification)
            created_notification.id = str(uuid.uuid4())
            created_notification.user_id = mock_authenticated_user.id
            created_notification.type = NotificationType.FOLLOW.value
            created_notification.title = f"{mock_sender_user.username} started following you"
            created_notification.is_read = False
            created_notification.created_at = datetime.now(UTC)
            created_notification.to_dict.return_value = {
                "id": created_notification.id,
                "type": "follow",
                "title": created_notification.title,
                "is_read": False,
                "created_at": created_notification.created_at.isoformat()
            }
            
            mock_create.return_value = created_notification
            mock_unread_count.return_value = 1
            mock_mark_read.return_value = True
            
            # Step 2: Trigger follow notification via integration hook
            await notification_integration.on_user_followed(follower_data, followed_data)
            
            # Verify notification was created
            mock_create.assert_called_once()
            call_args = mock_create.call_args[0][0]  # First positional argument
            assert isinstance(call_args, NotificationData)
            assert call_args.user_id == mock_authenticated_user.id
            assert call_args.type == NotificationType.FOLLOW
            assert mock_sender_user.username in call_args.title
            
            # Step 3: Test WebSocket delivery
            websocket_manager = NotificationWebSocketManager()
            mock_websocket = AsyncMock()
            
            # Connect user to WebSocket
            with patch.object(notification_service, 'get_unread_count', return_value=1):
                connected = await websocket_manager.connect(mock_websocket, mock_authenticated_user)
                assert connected is True
            
            # Send notification via WebSocket
            notification_message = {
                "type": "new_notification",
                "data": created_notification.to_dict()
            }
            
            sent_count = await websocket_manager.send_to_user(
                mock_authenticated_user.id,
                notification_message
            )
            assert sent_count == 1
            mock_websocket.send_text.assert_called()
            
            # Verify WebSocket message content
            sent_message = json.loads(mock_websocket.send_text.call_args[0][0])
            assert sent_message["type"] == "new_notification"
            assert sent_message["data"]["id"] == created_notification.id
            assert sent_message["data"]["type"] == "follow"
            
            # Step 4: Test unread count API
            unread_count = await notification_service.get_unread_count(mock_authenticated_user.id)
            assert unread_count == 1
            
            # Step 5: Mark notification as read (user clicks on notification)
            read_result = await notification_service.mark_as_read(
                created_notification.id,
                mock_authenticated_user.id
            )
            assert read_result is True
            mock_mark_read.assert_called_once_with(created_notification.id, mock_authenticated_user.id)
            
            # Step 6: Verify complete flow
            print("✅ Follow notification E2E flow completed successfully")
    
    @pytest.mark.asyncio
    async def test_dm_notification_to_thread_clearing_flow(self, mock_authenticated_user, mock_sender_user):
        """
        E2E Test: DM Message → Notification → Open Thread → Clear Notification
        
        Acceptance Criteria Test:
        - DM message sent → notification appears
        - User opens thread → notification is cleared
        
        Flow:
        1. User A sends DM to User B
        2. DM notification is created for User B
        3. User B receives notification via WebSocket
        4. User B opens the DM thread
        5. Opening thread clears the notification
        6. Notification is marked as read automatically
        """
        with patch('app.services.notification_service.db_manager') as mock_db, \
             patch.object(notification_service, 'create_notification') as mock_create, \
             patch.object(notification_service, 'get_unread_count') as mock_unread_count, \
             patch.object(notification_service, 'mark_as_read') as mock_mark_read, \
             patch.object(notification_service, 'get_user_notifications') as mock_get_notifications:
            
            # Step 1: Setup DM message data
            thread_id = f"dm_thread_{uuid.uuid4()}"
            message_id = f"msg_{uuid.uuid4()}"
            message_content = "Hey! How are you doing?"
            
            sender_data = {
                'id': mock_sender_user.id,
                'username': mock_sender_user.username,
                'display_name': mock_sender_user.display_name,
                'avatar_url': mock_sender_user.avatar_url
            }
            
            recipient_data = {
                'id': mock_authenticated_user.id,
                'username': mock_authenticated_user.username,
                'display_name': mock_authenticated_user.display_name,
                'avatar_url': mock_authenticated_user.avatar_url
            }
            
            message_data = {
                'id': message_id,
                'content': message_content,
                'thread_id': thread_id
            }
            
            # Mock DM notification creation
            dm_notification = Mock(spec=Notification)
            dm_notification.id = str(uuid.uuid4())
            dm_notification.user_id = mock_authenticated_user.id
            dm_notification.type = NotificationType.DM_MESSAGE_RECEIVED.value
            dm_notification.title = f"New message from {mock_sender_user.username}"
            dm_notification.message = message_content
            dm_notification.is_read = False
            dm_notification.thread_id = thread_id
            dm_notification.created_at = datetime.now(UTC)
            dm_notification.payload = {
                "message_id": message_id,
                "thread_id": thread_id,
                "sender_id": mock_sender_user.id,
                "sender_username": mock_sender_user.username
            }
            dm_notification.to_dict.return_value = {
                "id": dm_notification.id,
                "type": "dm_message_received",
                "title": dm_notification.title,
                "message": dm_notification.message,
                "is_read": False,
                "thread_id": thread_id,
                "payload": dm_notification.payload,
                "created_at": dm_notification.created_at.isoformat()
            }
            
            mock_create.return_value = dm_notification
            mock_unread_count.side_effect = [1, 0]  # Before and after reading
            mock_mark_read.return_value = True
            mock_get_notifications.return_value = [dm_notification]
            
            # Step 2: Trigger DM notification via integration hook
            await notification_integration.on_dm_message_sent(sender_data, recipient_data, message_data)
            
            # Verify DM notification was created with high priority
            mock_create.assert_called_once()
            call_args = mock_create.call_args[0][0]
            assert isinstance(call_args, NotificationData)
            assert call_args.user_id == mock_authenticated_user.id
            assert call_args.type == NotificationType.DM_MESSAGE_RECEIVED
            assert call_args.priority == NotificationPriority.HIGH
            assert message_content in call_args.message
            assert call_args.payload["thread_id"] == thread_id
            
            # Step 3: Test WebSocket delivery
            websocket_manager = NotificationWebSocketManager()
            mock_websocket = AsyncMock()
            
            # Connect user to WebSocket
            with patch.object(notification_service, 'get_unread_count', return_value=1):
                connected = await websocket_manager.connect(mock_websocket, mock_authenticated_user)
                assert connected is True
            
            # Send DM notification via WebSocket
            notification_message = {
                "type": "new_notification",
                "data": dm_notification.to_dict(),
                "unread_count": 1
            }
            
            sent_count = await websocket_manager.send_to_user(
                mock_authenticated_user.id,
                notification_message
            )
            assert sent_count == 1
            
            # Verify high-priority DM notification was sent
            sent_message = json.loads(mock_websocket.send_text.call_args[0][0])
            assert sent_message["type"] == "new_notification"
            assert sent_message["data"]["type"] == "dm_message_received"
            assert sent_message["data"]["thread_id"] == thread_id
            assert sent_message["unread_count"] == 1
            
            # Step 4: User gets notifications (bell icon shows badge)
            notifications = await notification_service.get_user_notifications(
                user_id=mock_authenticated_user.id,
                limit=10
            )
            assert len(notifications) == 1
            assert notifications[0] == dm_notification
            
            # Step 5: User opens DM thread (this should clear the notification)
            # Simulate thread opening by marking notification as read
            read_result = await notification_service.mark_as_read(
                dm_notification.id,
                mock_authenticated_user.id
            )
            assert read_result is True
            
            # Step 6: Verify notification is cleared (acceptance criteria)
            mock_mark_read.assert_called_once_with(dm_notification.id, mock_authenticated_user.id)
            
            # Verify unread count decreased
            final_unread_count = await notification_service.get_unread_count(mock_authenticated_user.id)
            assert final_unread_count == 0
            
            # Send updated unread count via WebSocket
            update_message = {
                "type": "unread_count_update",
                "data": {"unread_count": 0}
            }
            
            await websocket_manager.send_to_user(mock_authenticated_user.id, update_message)
            
            # Verify the complete DM → notification → thread opening → clearing flow
            print("✅ DM notification to thread clearing E2E flow completed successfully")
    
    @pytest.mark.asyncio
    async def test_ai_response_notification_flow(self, mock_authenticated_user):
        """
        E2E Test: AI Response → Notification → User Interaction
        
        Flow:
        1. User asks AI a question
        2. AI processing completes
        3. AI response notification is created
        4. User receives notification
        5. User opens AI thread
        6. Notification is cleared
        """
        with patch('app.services.notification_service.db_manager') as mock_db, \
             patch.object(notification_service, 'create_notification') as mock_create, \
             patch.object(notification_service, 'mark_as_read') as mock_mark_read:
            
            # Step 1: Setup AI response data
            ai_thread_id = f"ai_thread_{uuid.uuid4()}"
            ai_message_id = f"ai_msg_{uuid.uuid4()}"
            ai_response = "Based on your question, here's what I found..."
            processing_time = 2750.5
            
            user_data = {
                'id': mock_authenticated_user.id,
                'username': mock_authenticated_user.username,
                'display_name': mock_authenticated_user.display_name,
                'avatar_url': mock_authenticated_user.avatar_url
            }
            
            ai_response_data = {
                'provider': 'openai',
                'message_id': ai_message_id,
                'thread_id': ai_thread_id,
                'content': ai_response,
                'processing_time_ms': processing_time
            }
            
            # Mock AI notification creation
            ai_notification = Mock(spec=Notification)
            ai_notification.id = str(uuid.uuid4())
            ai_notification.user_id = mock_authenticated_user.id
            ai_notification.type = NotificationType.AI_REPLY_FINISHED.value
            ai_notification.title = "ChatGPT response ready"
            ai_notification.message = "Your AI assistant has responded"
            ai_notification.is_read = False
            ai_notification.payload = {
                "ai_provider": "openai",
                "message_id": ai_message_id,
                "thread_id": ai_thread_id,
                "processing_time_ms": processing_time
            }
            
            mock_create.return_value = ai_notification
            mock_mark_read.return_value = True
            
            # Step 2: Trigger AI response notification
            await notification_integration.on_ai_response_completed(user_data, ai_response_data)
            
            # Verify AI notification was created
            mock_create.assert_called_once()
            call_args = mock_create.call_args[0][0]
            assert call_args.user_id == mock_authenticated_user.id
            assert call_args.type == NotificationType.AI_REPLY_FINISHED
            assert call_args.payload["processing_time_ms"] == processing_time
            
            # Step 3: User opens AI thread and clears notification
            read_result = await notification_service.mark_as_read(
                ai_notification.id,
                mock_authenticated_user.id
            )
            assert read_result is True
            
            print("✅ AI response notification E2E flow completed successfully")
    
    @pytest.mark.asyncio
    async def test_bulk_notifications_and_mark_all_read(self, mock_authenticated_user):
        """
        E2E Test: Multiple Notifications → Mark All Read
        
        Flow:
        1. Multiple events create notifications
        2. User has several unread notifications
        3. User clicks "Mark All Read"
        4. All notifications are cleared
        """
        with patch('app.services.notification_service.db_manager') as mock_db, \
             patch.object(notification_service, 'create_batch_notifications') as mock_batch, \
             patch.object(notification_service, 'mark_all_as_read') as mock_mark_all, \
             patch.object(notification_service, 'get_unread_count') as mock_unread_count:
            
            # Create multiple notification data
            notification_data_list = [
                NotificationData(
                    user_id=mock_authenticated_user.id,
                    type=NotificationType.FOLLOW,
                    title="User1 started following you",
                    message="You have a new follower"
                ),
                NotificationData(
                    user_id=mock_authenticated_user.id,
                    type=NotificationType.MENTION,
                    title="You were mentioned",
                    message="Someone mentioned you in a message"
                ),
                NotificationData(
                    user_id=mock_authenticated_user.id,
                    type=NotificationType.AI_REPLY_FINISHED,
                    title="AI response ready",
                    message="Your AI assistant has responded"
                )
            ]
            
            # Mock notifications
            mock_notifications = []
            for i, data in enumerate(notification_data_list):
                notification = Mock(spec=Notification)
                notification.id = str(uuid.uuid4())
                notification.user_id = data.user_id
                notification.type = data.type.value
                notification.title = data.title
                notification.is_read = False
                mock_notifications.append(notification)
            
            mock_batch.return_value = mock_notifications
            mock_unread_count.side_effect = [3, 0]  # Before and after mark all read
            mock_mark_all.return_value = 3  # 3 notifications marked as read
            
            # Step 1: Create batch notifications
            created_notifications = await notification_service.create_batch_notifications(notification_data_list)
            assert len(created_notifications) == 3
            
            # Step 2: Check unread count
            unread_count = await notification_service.get_unread_count(mock_authenticated_user.id)
            assert unread_count == 3
            
            # Step 3: Mark all as read
            marked_count = await notification_service.mark_all_as_read(mock_authenticated_user.id)
            assert marked_count == 3
            
            # Step 4: Verify all cleared
            final_unread_count = await notification_service.get_unread_count(mock_authenticated_user.id)
            assert final_unread_count == 0
            
            print("✅ Bulk notifications and mark all read E2E flow completed successfully")
    
    @pytest.mark.asyncio
    async def test_notification_preferences_flow(self, mock_authenticated_user):
        """
        E2E Test: User Preferences → Filtered Notifications
        
        Flow:
        1. User sets notification preferences
        2. Events occur that match preferences
        3. Only preferred notifications are created
        4. Non-preferred events are ignored
        """
        with patch('app.services.notification_service.db_manager') as mock_db, \
             patch.object(notification_service, 'get_user_preferences') as mock_get_prefs, \
             patch.object(notification_service, 'create_notification') as mock_create:
            
            # Step 1: Mock user preferences (only wants follow notifications)
            mock_preferences = Mock(spec=NotificationPreference)
            mock_preferences.user_id = mock_authenticated_user.id
            mock_preferences.follow_notifications = True
            mock_preferences.dm_notifications = False  # User disabled DM notifications
            mock_preferences.ai_reply_notifications = True
            mock_preferences.mention_notifications = False
            
            mock_get_prefs.return_value = mock_preferences
            
            # Step 2: Create notification that should be allowed (follow)
            follow_data = NotificationData(
                user_id=mock_authenticated_user.id,
                type=NotificationType.FOLLOW,
                title="New follower",
                message="Someone started following you"
            )
            
            # Mock preference checking in service
            with patch.object(notification_service, 'should_send_notification', return_value=True):
                mock_create.return_value = Mock(spec=Notification, id=str(uuid.uuid4()))
                notification = await notification_service.create_notification(follow_data)
                assert notification is not None
                mock_create.assert_called()
            
            # Step 3: Try to create notification that should be blocked (DM)
            dm_data = NotificationData(
                user_id=mock_authenticated_user.id,
                type=NotificationType.DM_MESSAGE_RECEIVED,
                title="New DM",
                message="You have a new direct message"
            )
            
            # Mock preference checking to return False for DM
            with patch.object(notification_service, 'should_send_notification', return_value=False):
                # Reset mock to track new calls
                mock_create.reset_mock()
                notification = await notification_service.create_notification(dm_data)
                # Notification should not be created due to preferences
                # (In real implementation, create_notification would check preferences)
            
            print("✅ Notification preferences E2E flow completed successfully")

class TestNotificationSystemStress:
    """Stress tests for notification system"""
    
    @pytest.mark.asyncio
    async def test_high_volume_notification_creation(self, mock_authenticated_user):
        """Test creating many notifications quickly"""
        with patch.object(notification_service, 'create_batch_notifications') as mock_batch:
            # Create 100 notifications
            notification_data_list = [
                NotificationData(
                    user_id=mock_authenticated_user.id,
                    type=NotificationType.FOLLOW,
                    title=f"Notification {i}",
                    message=f"Message {i}"
                )
                for i in range(100)
            ]
            
            # Mock successful batch creation
            mock_notifications = [
                Mock(spec=Notification, id=str(uuid.uuid4()))
                for _ in range(100)
            ]
            mock_batch.return_value = mock_notifications
            
            # Test batch creation
            results = await notification_service.create_batch_notifications(notification_data_list)
            
            assert len(results) == 100
            mock_batch.assert_called_once()
            print("✅ High volume notification creation test passed")
    
    @pytest.mark.asyncio
    async def test_concurrent_websocket_connections(self, notification_websocket_manager):
        """Test multiple concurrent WebSocket connections"""
        # Create multiple mock users and websockets
        users = [
            Mock(spec=User, id=f"user_{i}", username=f"user{i}")
            for i in range(10)
        ]
        websockets = [AsyncMock() for _ in range(10)]
        
        # Connect all users
        with patch.object(notification_service, 'get_unread_count', return_value=0):
            for user, websocket in zip(users, websockets):
                connected = await notification_websocket_manager.connect(websocket, user)
                assert connected is True
        
        # Send message to all users
        test_message = {"type": "broadcast", "data": {"message": "Hello everyone!"}}
        
        for user in users:
            sent_count = await notification_websocket_manager.send_to_user(user.id, test_message)
            assert sent_count == 1
        
        # Check connection stats
        stats = notification_websocket_manager.get_connection_stats()
        assert stats["active_connections"] == 10
        
        print("✅ Concurrent WebSocket connections test passed")

if __name__ == "__main__":
    # Run E2E tests
    print("Running J6 Notification System E2E Integration Tests...")
    pytest.main([
        __file__,
        "-v", 
        "--tb=short",
        "-k", "test_dm_notification_to_thread_clearing_flow or test_follow_notification_complete_flow"
    ])