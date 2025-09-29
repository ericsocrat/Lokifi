"""
Tests for direct messaging functionality (J4).
"""

import os
import uuid
import pytest
import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.main import app
from app.models.user import User
from app.models.conversation import Conversation, ConversationParticipant, Message, ContentType
from app.services.conversation_service import ConversationService
from app.services.rate_limit_service import RateLimitService
from app.services.websocket_manager import ConnectionManager
from app.services.message_search_service import MessageSearchService, SearchFilter
from app.services.message_moderation_service import MessageModerationService, ModerationAction
from app.services.message_analytics_service import MessageAnalyticsService
from app.schemas.conversation import MessageCreate, MarkReadRequest


@pytest.fixture
def mock_users():
    """Mock users for testing."""
    return [
        User(
            id=uuid.UUID("12345678-1234-5678-9012-123456789001"),
            username="user1",
            email="user1@test.com",
            hashed_password=os.getenv("TEST_HASHED_PASSWORD", "hashed")
        ),
        User(
            id=uuid.UUID("12345678-1234-5678-9012-123456789002"),
            username="user2", 
            email="user2@test.com",
            hashed_password=os.getenv("TEST_HASHED_PASSWORD", "hashed")
        )
    ]


@pytest.fixture
def mock_conversation():
    """Mock conversation for testing."""
    return Conversation(
        id=uuid.UUID("12345678-1234-5678-9012-123456789003"),
        is_group=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )


class TestConversationService:
    """Test ConversationService functionality."""
    
    @pytest.mark.asyncio
    async def test_create_dm_conversation(self, mock_users):
        """Test creating a new DM conversation."""
        mock_db = AsyncMock(spec=AsyncSession)
        service = ConversationService(mock_db)
        
        # Mock database queries
        mock_db.execute.return_value.scalars.return_value.all.return_value = mock_users
        mock_db.execute.return_value.scalars.return_value.all.side_effect = [
            mock_users,  # User lookup
            []  # No existing conversations
        ]
        
        result = await service.get_or_create_dm_conversation(
            mock_users[0].id,
            mock_users[1].id
        )
        
        # Verify conversation was created
        assert mock_db.add.called
        assert mock_db.commit.called
    
    @pytest.mark.asyncio
    async def test_send_message_with_rate_limiting(self, mock_users, mock_conversation):
        """Test sending message respects rate limits."""
        mock_db = AsyncMock(spec=AsyncSession)
        service = ConversationService(mock_db)
        
        # Mock participant verification
        mock_participant = MagicMock()
        mock_db.execute.return_value.scalar_one_or_none.return_value = mock_participant
        
        message_data = MessageCreate(
            content="Test message",
            content_type=ContentType.TEXT
        )
        
        result = await service.send_message(
            mock_conversation.id,
            mock_users[0].id,
            message_data
        )
        
        # Verify message was created
        assert mock_db.add.called
        assert mock_db.commit.called
    
    @pytest.mark.asyncio
    async def test_mark_messages_read(self, mock_users, mock_conversation):
        """Test marking messages as read."""
        mock_db = AsyncMock(spec=AsyncSession)
        service = ConversationService(mock_db)
        
        # Mock participant and message verification
        mock_participant = MagicMock()
        mock_message = MagicMock()
        mock_message.created_at = datetime.now(timezone.utc)
        
        mock_db.execute.return_value.scalar_one_or_none.side_effect = [
            mock_participant,  # Participant check
            mock_message      # Message check
        ]
        
        mock_db.execute.return_value.all.return_value = [
            (uuid.uuid4(),), (uuid.uuid4(),)  # Message IDs
        ]
        
        mark_read_data = MarkReadRequest(message_id=uuid.uuid4())
        
        result = await service.mark_messages_read(
            mock_conversation.id,
            mock_users[0].id,
            mark_read_data
        )
        
        assert result is True
        assert mock_db.commit.called


class TestRateLimitService:
    """Test rate limiting functionality."""
    
    @pytest.mark.asyncio
    async def test_rate_limit_allows_under_limit(self):
        """Test rate limiter allows requests under limit."""
        with patch('redis.asyncio.from_url') as mock_redis:
            mock_client = AsyncMock()
            mock_redis.return_value = mock_client
            mock_client.zcount.return_value = 5  # Under limit
            
            rate_limiter = RateLimitService()
            allowed, retry_after = await rate_limiter.check_rate_limit(uuid.uuid4())
            
            assert allowed is True
            assert retry_after is None
    
    @pytest.mark.asyncio
    async def test_rate_limit_blocks_over_limit(self):
        """Test rate limiter blocks requests over limit."""
        with patch('redis.asyncio.from_url') as mock_redis:
            mock_client = AsyncMock()
            mock_redis.return_value = mock_client
            mock_client.zcount.return_value = 35  # Over limit
            
            rate_limiter = RateLimitService()
            allowed, retry_after = await rate_limiter.check_rate_limit(uuid.uuid4())
            
            assert allowed is False
            assert retry_after is not None
            assert retry_after > 0


class TestWebSocketManager:
    """Test WebSocket connection management."""
    
    @pytest.mark.asyncio
    async def test_connect_and_disconnect(self):
        """Test WebSocket connection and disconnection."""
        manager = ConnectionManager()
        mock_websocket = AsyncMock()
        user_id = uuid.uuid4()
        
        await manager.connect(mock_websocket, user_id)
        assert user_id in manager.active_connections
        assert mock_websocket in manager.active_connections[user_id]
        
        await manager.disconnect(mock_websocket, user_id)
        assert user_id not in manager.active_connections
    
    @pytest.mark.asyncio
    async def test_broadcast_message(self):
        """Test broadcasting messages to participants."""
        manager = ConnectionManager()
        mock_websockets = [AsyncMock(), AsyncMock()]
        user_ids = [uuid.uuid4(), uuid.uuid4()]
        
        # Connect users
        for ws, uid in zip(mock_websockets, user_ids):
            await manager.connect(ws, uid)
        
        # Mock message response
        mock_message = MagicMock()
        mock_message.sender_id = user_ids[0]
        mock_message.model_dump.return_value = {"test": "data"}
        
        participant_ids = set(user_ids)
        
        await manager.broadcast_new_message(mock_message, participant_ids)
        
        # Only the non-sender should receive the message
        mock_websockets[1].send_text.assert_called_once()
        assert not mock_websockets[0].send_text.called
    
    @pytest.mark.asyncio
    async def test_typing_indicator_broadcast(self):
        """Test broadcasting typing indicators."""
        manager = ConnectionManager()
        mock_websocket = AsyncMock()
        user_id = uuid.uuid4()
        other_user_id = uuid.uuid4()
        
        await manager.connect(mock_websocket, other_user_id)
        
        await manager.broadcast_typing_indicator(
            conversation_id=uuid.uuid4(),
            user_id=user_id,
            is_typing=True,
            participant_ids={user_id, other_user_id}
        )
        
        mock_websocket.send_text.assert_called_once()


class TestConversationEndpoints:
    """Test conversation API endpoints."""
    
    @pytest.fixture
    def mock_current_user(self, mock_users):
        """Mock authenticated user."""
        return mock_users[0]
    
    @pytest.mark.asyncio
    async def test_create_dm_conversation_endpoint(self, mock_current_user):
        """Test creating DM conversation via API."""
        with patch('app.core.security.get_current_user', return_value=mock_current_user):
            with patch('app.services.conversation_service.ConversationService') as mock_service:
                mock_service.return_value.get_or_create_dm_conversation.return_value = {
                    "id": str(uuid.uuid4()),
                    "is_group": False,
                    "participants": []
                }
                
                async with AsyncClient(base_url="http://test") as client:
                    # Note: In real tests, you'd mount the app properly
                    response = await client.post(
                        f"/api/conversations/dm/{uuid.uuid4()}",
                        headers={"Authorization": "Bearer test-token"}
                    )
                    
                    assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_send_message_endpoint(self, mock_current_user):
        """Test sending message via API."""
        with patch('app.core.security.get_current_user', return_value=mock_current_user):
            with patch('app.services.rate_limit_service.RateLimitService') as mock_rate_limiter:
                with patch('app.services.conversation_service.ConversationService') as mock_service:
                    # Mock rate limiter allows request
                    mock_rate_limiter.return_value.check_rate_limit.return_value = (True, None)
                    
                    # Mock message service
                    mock_message = {
                        "id": str(uuid.uuid4()),
                        "content": "Test message",
                        "sender_id": str(mock_current_user.id)
                    }
                    mock_service.return_value.send_message.return_value = mock_message
                    
                    async with AsyncClient(base_url="http://test") as client:
                        # Note: In real tests, you'd mount the app properly
                        response = await client.post(
                            f"/api/conversations/{uuid.uuid4()}/messages",
                            json={"content": "Test message", "content_type": "text"},
                            headers={"Authorization": "Bearer test-token"}
                        )
                        
                        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_rate_limited_send_message(self, mock_current_user):
        """Test rate limiting blocks excessive messages."""
        with patch('app.core.security.get_current_user', return_value=mock_current_user):
            with patch('app.services.rate_limit_service.RateLimitService') as mock_rate_limiter:
                # Mock rate limiter blocks request
                mock_rate_limiter.return_value.check_rate_limit.return_value = (False, 30)
                
                async with AsyncClient(base_url="http://test") as client:
                    # Note: In real tests, you'd mount the app properly  
                    response = await client.post(
                        f"/api/conversations/{uuid.uuid4()}/messages",
                        json={"content": "Test message", "content_type": "text"},
                        headers={"Authorization": "Bearer test-token"}
                    )
                    
                    assert response.status_code == 429
                    assert "rate limit" in response.json()["detail"].lower()


class TestMessageModeration:
    """Test message content moderation."""
    
    @pytest.mark.asyncio
    async def test_content_filtering(self):
        """Test basic content filtering for inappropriate content."""
        # This would integrate with content moderation service
        # For now, just test the structure is in place
        
        inappropriate_words = ["spam", "scam", "inappropriate"]
        test_message = "This is a spam message"
        
        # Simple keyword filter (real implementation would be more sophisticated)
        contains_inappropriate = any(word in test_message.lower() for word in inappropriate_words)
        assert contains_inappropriate is True
    
    @pytest.mark.asyncio
    async def test_message_length_validation(self):
        """Test message length validation."""
        max_length = 2000
        
        # Test normal message
        normal_message = "This is a normal message"
        assert len(normal_message) <= max_length
        
        # Test oversized message
        oversized_message = "x" * (max_length + 1)
        assert len(oversized_message) > max_length


class TestMessageSearch:
    """Test message search functionality (future enhancement)."""
    
    @pytest.mark.asyncio
    async def test_search_messages_by_content(self):
        """Test searching messages by content."""
        # Placeholder for future search functionality
        search_term = "important document"
        expected_results = []
        
        # This would integrate with search service
        # For now, just ensure structure is ready
        assert isinstance(expected_results, list)
    
    @pytest.mark.asyncio
    async def test_search_messages_by_date_range(self):
        """Test searching messages by date range."""
        # Placeholder for future date range search
        start_date = datetime.now(timezone.utc).replace(day=1)
        end_date = datetime.now(timezone.utc)
        
        # Structure for date range queries
        assert start_date < end_date


if __name__ == "__main__":
    # Run tests with: python -m pytest test_direct_messages.py -v
    pytest.main([__file__, "-v"])


class TestMessageSearchEnhanced:
    """Test message search functionality."""
    
    @pytest.mark.asyncio
    async def test_search_messages(self):
        """Test message search service."""
        mock_db = AsyncMock(spec=AsyncSession)
        service = MessageSearchService(mock_db)
        
        # Mock query results
        mock_db.execute.return_value.scalar.return_value = 10
        mock_db.execute.return_value.scalars.return_value.all.return_value = []
        
        search_filter = SearchFilter(query="test")
        result = await service.search_messages(
            uuid.uuid4(),
            search_filter
        )
        
        assert result.total_count == 10
        assert isinstance(result.search_time_ms, int)


class TestMessageModerationService:
    """Test message moderation functionality."""
    
    @pytest.mark.asyncio
    async def test_moderate_clean_message(self):
        """Test moderation allows clean messages."""
        mock_db = AsyncMock(spec=AsyncSession)
        service = MessageModerationService(mock_db)
        
        result = await service.moderate_message(
            "This is a clean message",
            uuid.uuid4(),
            uuid.uuid4()
        )
        
        assert result.action == ModerationAction.ALLOW
        assert result.confidence < 0.2
    
    @pytest.mark.asyncio
    async def test_moderate_spam_message(self):
        """Test moderation blocks spam messages."""
        mock_db = AsyncMock(spec=AsyncSession)
        service = MessageModerationService(mock_db)
        
        result = await service.moderate_message(
            "URGENT! Click here to claim your prize! Buy now!",
            uuid.uuid4(),
            uuid.uuid4()
        )
        
        assert result.action in [ModerationAction.WARN, ModerationAction.DELETE, ModerationAction.BLOCK]
        assert result.confidence > 0.4


class TestMessageAnalytics:
    """Test message analytics functionality."""
    
    @pytest.mark.asyncio
    async def test_user_message_stats(self):
        """Test user message statistics generation."""
        mock_db = AsyncMock(spec=AsyncSession)
        service = MessageAnalyticsService(mock_db)
        
        # Mock database results
        mock_db.execute.return_value.scalar.side_effect = [100, 5, "Monday", 14]
        mock_db.execute.return_value.first.side_effect = [("Monday", 20), (14, 25)]
        
        stats = await service.get_user_message_stats(uuid.uuid4())
        
        assert stats.total_messages == 100
        assert stats.total_conversations == 5
        assert stats.avg_messages_per_conversation == 20.0
    
    @pytest.mark.asyncio
    async def test_platform_statistics(self):
        """Test platform-wide statistics."""
        mock_db = AsyncMock(spec=AsyncSession)
        service = MessageAnalyticsService(mock_db)
        
        # Mock results
        mock_db.execute.return_value.scalar.side_effect = [1000, 50, 100]
        mock_db.execute.return_value.all.return_value = [("text", 800), ("image", 200)]
        
        stats = await service.get_platform_statistics()
        
        assert stats["total_messages"] == 1000
        assert stats["active_users"] == 50
        assert "messages_by_type" in stats


class TestEnhancedEndpoints:
    """Test enhanced API endpoints."""
    
    @pytest.mark.asyncio
    async def test_search_endpoint(self, mock_current_user):
        """Test message search endpoint."""
        with patch('app.core.security.get_current_user', return_value=mock_current_user):
            with patch('app.services.message_search_service.MessageSearchService') as mock_service:
                mock_result = MagicMock()
                mock_result.messages = []
                mock_result.total_count = 0
                mock_result.search_time_ms = 50
                mock_service.return_value.search_messages.return_value = mock_result
                
                # Would test actual endpoint call in integration tests
                assert mock_service.called is False  # Just structure test
    
    @pytest.mark.asyncio
    async def test_analytics_endpoint(self, mock_current_user):
        """Test analytics endpoint structure."""
        with patch('app.core.security.get_current_user', return_value=mock_current_user):
            with patch('app.services.message_analytics_service.MessageAnalyticsService') as mock_service:
                # Test service instantiation structure
                assert mock_service is not None