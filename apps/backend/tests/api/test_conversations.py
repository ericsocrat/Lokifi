"""
Tests for app.routers.conversations

Comprehensive tests for conversation router endpoints: DM conversations, messaging,
message search, moderation reporting, and analytics.
Builds on conversation_service tests from Session 30 Phase 2.

Coverage targets:
- DM conversation CRUD operations
- Message handling (send, retrieve, delete)
- Read receipts and message status
- Message search functionality
- Moderation reporting
- Analytics endpoints (user, conversation, trending)
- Error handling and authorization
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.routers.conversations import (
    create_or_get_dm_conversation,
    delete_message,
    get_conversation,
    get_conversation_analytics,
    get_conversation_messages,
    get_trending_conversations,
    get_user_analytics,
    get_user_conversations,
    mark_messages_read,
    report_message,
    search_messages,
    send_message,
)
from app.schemas.conversation import (
    ConversationListResponse,
    ConversationResponse,
    MarkReadRequest,
    MessageCreate,
    MessageResponse,
    MessagesListResponse,
)
from fastapi import HTTPException, status

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_current_user():
    """Mock authenticated user with all User model fields"""
    from app.models.user import User

    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.handle = "testuser"
    user.email = "test@example.com"
    user.avatar_url = "https://example.com/avatar.jpg"
    user.bio = "Test user bio"
    user.created_at = datetime.now(timezone.utc)
    return user


@pytest.fixture
def mock_db_session():
    """Mock database session with AsyncMock"""
    session = AsyncMock()
    # Mock commit/execute for database operations
    session.commit = AsyncMock()
    session.execute = AsyncMock()
    return session


@pytest.fixture
def sample_conversation():
    """Sample conversation with all required Pydantic schema fields"""
    conversation = MagicMock()
    conversation.id = uuid.uuid4()
    conversation.is_group = False
    conversation.name = "DM Conversation"
    conversation.description = "Direct message conversation"
    conversation.created_at = datetime.now(timezone.utc)
    conversation.updated_at = datetime.now(timezone.utc)
    conversation.last_message_at = datetime.now(timezone.utc)

    # Last message (MessageResponse type)
    last_msg = MagicMock()
    last_msg.id = uuid.uuid4()
    last_msg.conversation_id = conversation.id
    last_msg.sender_id = uuid.uuid4()
    last_msg.content = "Hello, world!"
    last_msg.content_type = "text"
    last_msg.is_deleted = False
    last_msg.is_read = False
    last_msg.created_at = datetime.now(timezone.utc)
    last_msg.updated_at = datetime.now(timezone.utc)
    conversation.last_message = last_msg

    # Participants (ConversationParticipantResponse fields)
    participant = MagicMock()
    participant.user_id = uuid.uuid4()
    participant.username = "otheruser"  # String, not MagicMock
    participant.display_name = "Other User"  # String, not MagicMock
    participant.avatar_url = "https://example.com/other.jpg"  # String, not MagicMock
    participant.joined_at = datetime.now(timezone.utc)
    participant.is_active = True
    participant.last_read_message_id = uuid.uuid4()  # UUID, not MagicMock
    conversation.participants = [participant]

    conversation.unread_count = 0
    return conversation


@pytest.fixture
def sample_message():
    """Sample message with all required Pydantic schema fields"""
    message = MagicMock()
    message.id = uuid.uuid4()
    message.conversation_id = uuid.uuid4()
    message.sender_id = uuid.uuid4()
    message.content = "Test message content"
    message.content_type = "text"
    message.is_deleted = False
    message.is_read = False
    message.created_at = datetime.now(timezone.utc)
    message.updated_at = datetime.now(timezone.utc)
    # Add sender details
    message.sender = MagicMock()
    message.sender.id = uuid.uuid4()
    message.sender.handle = "sender"
    message.sender.avatar_url = "https://example.com/sender.jpg"
    return message


@pytest.fixture
def sample_message_create():
    """Sample MessageCreate request"""
    return MessageCreate(content="New test message", content_type="text")


# ============================================================================
# TEST CLASS 1: DM CONVERSATION MANAGEMENT
# ============================================================================


class TestDMConversationManagement:
    """Tests for DM conversation creation and retrieval"""

    @pytest.mark.asyncio
    @patch("app.routers.conversations.ConversationService")
    async def test_create_or_get_dm_conversation_success(
        self, mock_service_class, sample_conversation, mock_current_user, mock_db_session
    ):
        """✅ Test: Create or get DM conversation successfully"""
        mock_service = MagicMock()
        mock_service.get_or_create_dm_conversation = AsyncMock(return_value=sample_conversation)
        mock_service_class.return_value = mock_service

        other_user_id = uuid.uuid4()
        result = await create_or_get_dm_conversation(
            other_user_id, mock_current_user, mock_db_session
        )

        assert isinstance(result, MagicMock)
        mock_service.get_or_create_dm_conversation.assert_called_once_with(
            mock_current_user.id, other_user_id
        )

    @pytest.mark.asyncio
    @patch("app.routers.conversations.ConversationService")
    async def test_create_or_get_dm_conversation_failure(
        self, mock_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Handle DM conversation creation failure (500)"""
        mock_service = MagicMock()
        mock_service.get_or_create_dm_conversation = AsyncMock(
            side_effect=Exception("Database error")
        )
        mock_service_class.return_value = mock_service

        other_user_id = uuid.uuid4()
        with pytest.raises(HTTPException) as exc_info:
            await create_or_get_dm_conversation(other_user_id, mock_current_user, mock_db_session)

        assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to create conversation" in exc_info.value.detail

    @pytest.mark.asyncio
    @patch("app.routers.conversations.ConversationService")
    async def test_get_user_conversations_success(
        self, mock_service_class, sample_conversation, mock_current_user, mock_db_session
    ):
        """✅ Test: Get user conversations with pagination"""
        mock_service = MagicMock()
        conversation_list = ConversationListResponse(
            conversations=[sample_conversation],
            page=1,
            page_size=20,
            total=1,
            has_next=False,  # Added required field
        )
        mock_service.get_user_conversations = AsyncMock(return_value=conversation_list)
        mock_service_class.return_value = mock_service

        result = await get_user_conversations(
            page=1, page_size=20, current_user=mock_current_user, db=mock_db_session
        )

        assert isinstance(result, ConversationListResponse)
        assert len(result.conversations) == 1
        mock_service.get_user_conversations.assert_called_once_with(mock_current_user.id, 1, 20)

    @pytest.mark.asyncio
    @patch("app.routers.conversations.ConversationService")
    async def test_get_conversation_success(
        self, mock_service_class, sample_conversation, mock_current_user, mock_db_session
    ):
        """✅ Test: Get specific conversation details"""
        mock_service = MagicMock()
        conversation_id = sample_conversation.id
        sample_conversation.id = conversation_id  # Ensure ID matches
        conversation_list = ConversationListResponse(
            conversations=[sample_conversation],
            page=1,
            page_size=100,
            total=1,
            has_next=False,  # Added required field
        )
        mock_service.get_user_conversations = AsyncMock(return_value=conversation_list)
        mock_service_class.return_value = mock_service

        result = await get_conversation(conversation_id, mock_current_user, mock_db_session)

        assert isinstance(result, ConversationResponse)
        assert result.id == conversation_id

    @pytest.mark.asyncio
    @patch("app.routers.conversations.ConversationService")
    async def test_get_conversation_not_found(
        self, mock_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Handle conversation not found (404)"""
        mock_service = MagicMock()
        conversation_list = ConversationListResponse(
            conversations=[], page=1, page_size=100, total=0, has_next=False  # Added required field
        )
        mock_service.get_user_conversations = AsyncMock(return_value=conversation_list)
        mock_service_class.return_value = mock_service

        conversation_id = uuid.uuid4()
        with pytest.raises(HTTPException) as exc_info:
            await get_conversation(conversation_id, mock_current_user, mock_db_session)

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "Conversation not found" in exc_info.value.detail


# ============================================================================
# TEST CLASS 2: MESSAGE HANDLING
# ============================================================================


class TestMessageHandling:
    """Tests for message sending, retrieval, and deletion"""

    @pytest.mark.asyncio
    @patch("app.routers.conversations.connection_manager")
    @patch("app.routers.conversations.process_mentions_in_content", new_callable=AsyncMock)
    @patch("app.routers.conversations.trigger_dm_notification", new_callable=AsyncMock)
    @patch("app.routers.conversations.ConversationService")
    @patch("app.routers.conversations.MessageModerationService")
    @patch("app.routers.conversations.RateLimitService")
    async def test_send_message_success(
        self,
        mock_rate_limit_class,
        mock_moderation_class,
        mock_service_class,
        mock_trigger_notif,
        mock_process_mentions,
        mock_connection_manager,
        sample_message,
        sample_message_create,
        mock_current_user,
        mock_db_session,
    ):
        """✅ Test: Send message successfully with notifications"""
        # Mock rate limiter
        mock_rate_limiter = MagicMock()
        mock_rate_limiter.check_rate_limit = AsyncMock(return_value=(True, None))
        mock_rate_limit_class.return_value = mock_rate_limiter

        # Mock moderation service
        mock_moderation = MagicMock()
        from app.services.message_moderation_service import (
            ModerationAction,
            ModerationResult,
        )

        mock_moderation.moderate_message = AsyncMock(
            return_value=ModerationResult(
                action=ModerationAction.ALLOW, sanitized_content=None, flagged_words=[]
            )
        )
        mock_moderation_class.return_value = mock_moderation

        # Mock conversation service
        mock_service = MagicMock()
        mock_service.send_message = AsyncMock(return_value=sample_message)
        mock_service_class.return_value = mock_service

        # Mock database participant query
        mock_result = MagicMock()
        mock_participant = MagicMock()
        mock_participant.user_id = uuid.uuid4()
        mock_result.scalars.return_value.all.return_value = [mock_participant]
        mock_db_session.execute.return_value = mock_result

        # Mock user query for notifications
        mock_user_result = MagicMock()
        mock_recipient = MagicMock()
        mock_recipient.id = mock_participant.user_id
        mock_recipient.handle = "recipient"
        mock_recipient.avatar_url = "https://example.com/recipient.jpg"
        mock_user_result.scalar_one_or_none.return_value = mock_recipient
        mock_db_session.execute.side_effect = [mock_result, mock_user_result]

        # Mock WebSocket broadcast
        mock_connection_manager.broadcast_new_message = AsyncMock()

        conversation_id = uuid.uuid4()
        result = await send_message(
            conversation_id, sample_message_create, mock_current_user, mock_db_session
        )

        assert isinstance(result, MagicMock)
        mock_service.send_message.assert_called_once()
        mock_connection_manager.broadcast_new_message.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.routers.conversations.RateLimitService")
    async def test_send_message_rate_limit_exceeded(
        self, mock_rate_limit_class, sample_message_create, mock_current_user, mock_db_session
    ):
        """✅ Test: Handle rate limit exceeded (429)"""
        mock_rate_limiter = MagicMock()
        mock_rate_limiter.check_rate_limit = AsyncMock(return_value=(False, 60))
        mock_rate_limit_class.return_value = mock_rate_limiter

        conversation_id = uuid.uuid4()
        with pytest.raises(HTTPException) as exc_info:
            await send_message(
                conversation_id, sample_message_create, mock_current_user, mock_db_session
            )

        assert exc_info.value.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "Rate limit exceeded" in exc_info.value.detail

    @pytest.mark.asyncio
    @patch("app.routers.conversations.MessageModerationService")
    @patch("app.routers.conversations.RateLimitService")
    async def test_send_message_blocked_by_moderation(
        self,
        mock_rate_limit_class,
        mock_moderation_class,
        sample_message_create,
        mock_current_user,
        mock_db_session,
    ):
        """✅ Test: Handle message blocked by content filter (400)"""
        # Mock rate limiter
        mock_rate_limiter = MagicMock()
        mock_rate_limiter.check_rate_limit = AsyncMock(return_value=(True, None))
        mock_rate_limit_class.return_value = mock_rate_limiter

        # Mock moderation service
        mock_moderation = MagicMock()
        from app.services.message_moderation_service import (
            ModerationAction,
            ModerationResult,
        )

        mock_moderation.moderate_message = AsyncMock(
            return_value=ModerationResult(
                action=ModerationAction.BLOCK,
                sanitized_content=None,
                flagged_words=["spam"],
            )
        )
        mock_moderation_class.return_value = mock_moderation

        conversation_id = uuid.uuid4()
        with pytest.raises(HTTPException) as exc_info:
            await send_message(
                conversation_id, sample_message_create, mock_current_user, mock_db_session
            )

        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Message blocked by content filter" in exc_info.value.detail

    @pytest.mark.asyncio
    @patch("app.routers.conversations.ConversationService")
    async def test_get_conversation_messages_success(
        self, mock_service_class, sample_message, mock_current_user, mock_db_session
    ):
        """✅ Test: Get conversation messages with pagination"""
        mock_service = MagicMock()
        conversation_id = uuid.uuid4()
        messages_list = MessagesListResponse(
            messages=[sample_message],
            page=1,
            page_size=50,
            total=1,
            has_next=False,  # Added required field
            conversation_id=conversation_id,  # Added required field
        )
        mock_service.get_conversation_messages = AsyncMock(return_value=messages_list)
        mock_service_class.return_value = mock_service

        result = await get_conversation_messages(
            conversation_id,
            page=1,
            page_size=50,
            current_user=mock_current_user,
            db=mock_db_session,
        )

        assert isinstance(result, MessagesListResponse)
        assert len(result.messages) == 1
        mock_service.get_conversation_messages.assert_called_once_with(
            conversation_id, mock_current_user.id, 1, 50
        )

    @pytest.mark.asyncio
    @patch("app.routers.conversations.connection_manager")
    @patch("app.routers.conversations.ConversationService")
    async def test_mark_messages_read_success(
        self, mock_service_class, mock_connection_manager, mock_current_user, mock_db_session
    ):
        """✅ Test: Mark messages as read with WebSocket broadcast"""
        mock_service = MagicMock()
        mock_service.mark_messages_read = AsyncMock(return_value=True)
        mock_service_class.return_value = mock_service

        # Mock database participant query
        mock_result = MagicMock()
        mock_participant = MagicMock()
        mock_participant.user_id = uuid.uuid4()
        mock_result.scalars.return_value.all.return_value = [mock_participant]
        mock_db_session.execute.return_value = mock_result

        # Mock WebSocket broadcast
        mock_connection_manager.broadcast_read_receipt = AsyncMock()

        conversation_id = uuid.uuid4()
        message_id = uuid.uuid4()
        mark_read_data = MarkReadRequest(message_id=message_id)

        await mark_messages_read(
            conversation_id, mark_read_data, mock_current_user, mock_db_session
        )

        mock_service.mark_messages_read.assert_called_once_with(
            conversation_id, mock_current_user.id, mark_read_data
        )
        mock_connection_manager.broadcast_read_receipt.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_message_success(self, mock_current_user, mock_db_session):
        """✅ Test: Soft delete a message"""
        # Mock message query result
        from app.models.conversation import Message

        mock_message = MagicMock(spec=Message)
        mock_message.id = uuid.uuid4()
        mock_message.conversation_id = uuid.uuid4()
        mock_message.sender_id = mock_current_user.id
        mock_message.is_deleted = False

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_message
        mock_db_session.execute.return_value = mock_result

        conversation_id = mock_message.conversation_id
        message_id = mock_message.id

        await delete_message(conversation_id, message_id, mock_current_user, mock_db_session)

        # Verify commit was called
        mock_db_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_message_not_found(self, mock_current_user, mock_db_session):
        """✅ Test: Handle message not found or unauthorized (404)"""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result

        conversation_id = uuid.uuid4()
        message_id = uuid.uuid4()

        with pytest.raises(HTTPException) as exc_info:
            await delete_message(conversation_id, message_id, mock_current_user, mock_db_session)

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "Message not found or not authorized to delete" in exc_info.value.detail


# ============================================================================
# TEST CLASS 3: MESSAGE SEARCH
# ============================================================================


class TestMessageSearch:
    """Tests for message search functionality"""

    @pytest.mark.asyncio
    @patch("app.routers.conversations.MessageSearchService")
    async def test_search_messages_success(
        self, mock_search_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Search messages successfully"""
        mock_search_service = MagicMock()
        from app.services.message_search_service import SearchResult

        # SearchResult uses 'messages' not 'results', and requires all fields
        search_result = SearchResult(
            messages=[],
            total_count=0,
            search_time_ms=10,
            page=1,
            page_size=20,
            has_next=False,
        )
        mock_search_service.search_messages = AsyncMock(return_value=search_result)
        mock_search_service_class.return_value = mock_search_service

        result = await search_messages(
            q="test query",
            content_type=None,
            conversation_id=None,
            page=1,
            page_size=20,
            current_user=mock_current_user,
            db=mock_db_session,
        )

        assert isinstance(result, SearchResult)
        mock_search_service.search_messages.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.routers.conversations.MessageSearchService")
    async def test_search_messages_failure(
        self, mock_search_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Handle search failure (500)"""
        mock_search_service = MagicMock()
        mock_search_service.search_messages = AsyncMock(side_effect=Exception("Search error"))
        mock_search_service_class.return_value = mock_search_service

        with pytest.raises(HTTPException) as exc_info:
            await search_messages(
                q="test query",
                current_user=mock_current_user,
                db=mock_db_session,
            )

        assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Search failed" in exc_info.value.detail


# ============================================================================
# TEST CLASS 4: MODERATION
# ============================================================================


class TestModeration:
    """Tests for message moderation and reporting"""

    @pytest.mark.asyncio
    @patch("app.routers.conversations.MessageModerationService")
    async def test_report_message_success(
        self, mock_moderation_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Report message successfully"""
        mock_moderation = MagicMock()
        mock_moderation.report_message = AsyncMock(return_value=True)
        mock_moderation_class.return_value = mock_moderation

        conversation_id = uuid.uuid4()
        message_id = uuid.uuid4()

        await report_message(
            conversation_id,
            message_id,
            reason="Spam content",
            current_user=mock_current_user,
            db=mock_db_session,
        )

        mock_moderation.report_message.assert_called_once_with(
            message_id, mock_current_user.id, "Spam content"
        )

    @pytest.mark.asyncio
    @patch("app.routers.conversations.MessageModerationService")
    async def test_report_message_failure(
        self, mock_moderation_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Handle report message failure (400)"""
        mock_moderation = MagicMock()
        mock_moderation.report_message = AsyncMock(return_value=False)
        mock_moderation_class.return_value = mock_moderation

        conversation_id = uuid.uuid4()
        message_id = uuid.uuid4()

        with pytest.raises(HTTPException) as exc_info:
            await report_message(
                conversation_id,
                message_id,
                reason="Spam content",
                current_user=mock_current_user,
                db=mock_db_session,
            )

        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Failed to report message" in exc_info.value.detail


# ============================================================================
# TEST CLASS 5: ANALYTICS
# ============================================================================


class TestAnalytics:
    """Tests for user and conversation analytics"""

    @pytest.mark.asyncio
    @patch("app.routers.conversations.MessageAnalyticsService")
    async def test_get_user_analytics_success(
        self, mock_analytics_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Get user messaging analytics"""
        mock_analytics = MagicMock()
        mock_stats = MagicMock()
        mock_stats.user_id = mock_current_user.id
        mock_stats.username = mock_current_user.handle
        mock_stats.total_messages = 100
        mock_stats.total_conversations = 10
        mock_stats.avg_messages_per_conversation = 10.0
        mock_stats.most_active_day = "Monday"
        mock_stats.most_active_hour = 14
        mock_analytics.get_user_message_stats = AsyncMock(return_value=mock_stats)
        mock_analytics_class.return_value = mock_analytics

        result = await get_user_analytics(
            days_back=30, current_user=mock_current_user, db=mock_db_session
        )

        assert result["total_messages"] == 100
        assert result["total_conversations"] == 10
        mock_analytics.get_user_message_stats.assert_called_once_with(mock_current_user.id, 30)

    @pytest.mark.asyncio
    @patch("app.routers.conversations.MessageAnalyticsService")
    async def test_get_conversation_analytics_success(
        self, mock_analytics_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Get conversation analytics"""
        mock_analytics = MagicMock()
        conversation_id = uuid.uuid4()
        mock_analytics_data = MagicMock()
        mock_analytics_data.conversation_id = conversation_id
        mock_analytics_data.total_messages = 50
        mock_analytics_data.total_participants = 2
        mock_analytics_data.messages_by_day = {}
        mock_analytics_data.messages_by_user = {}
        mock_analytics_data.avg_response_time_minutes = 15.5
        mock_analytics.get_conversation_analytics = AsyncMock(return_value=mock_analytics_data)
        mock_analytics_class.return_value = mock_analytics

        result = await get_conversation_analytics(
            conversation_id, days_back=30, current_user=mock_current_user, db=mock_db_session
        )

        assert str(result["conversation_id"]) == str(conversation_id)
        assert result["total_messages"] == 50
        mock_analytics.get_conversation_analytics.assert_called_once_with(
            conversation_id, mock_current_user.id, 30
        )

    @pytest.mark.asyncio
    @patch("app.routers.conversations.MessageAnalyticsService")
    async def test_get_trending_conversations_success(
        self, mock_analytics_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Get trending conversations"""
        mock_analytics = MagicMock()
        mock_trending = [{"conversation_id": str(uuid.uuid4()), "activity_score": 100}]
        mock_analytics.get_trending_conversations = AsyncMock(return_value=mock_trending)
        mock_analytics_class.return_value = mock_analytics

        result = await get_trending_conversations(
            limit=10, current_user=mock_current_user, db=mock_db_session
        )

        assert "trending_conversations" in result
        assert len(result["trending_conversations"]) == 1
        mock_analytics.get_trending_conversations.assert_called_once_with(mock_current_user.id, 10)


# ============================================================================
# TEST CLASS 6: EDGE CASES
# ============================================================================


class TestEdgeCases:
    """Tests for edge cases and error scenarios"""

    @pytest.mark.asyncio
    @patch("app.routers.conversations.ConversationService")
    async def test_get_user_conversations_empty_result(
        self, mock_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Get conversations with no results"""
        mock_service = MagicMock()
        conversation_list = ConversationListResponse(
            conversations=[], page=1, page_size=20, total=0, has_next=False  # Added required field
        )
        mock_service.get_user_conversations = AsyncMock(return_value=conversation_list)
        mock_service_class.return_value = mock_service

        result = await get_user_conversations(
            page=1, page_size=20, current_user=mock_current_user, db=mock_db_session
        )

        assert isinstance(result, ConversationListResponse)
        assert len(result.conversations) == 0

    @pytest.mark.asyncio
    @patch("app.routers.conversations.ConversationService")
    async def test_get_conversation_messages_empty_result(
        self, mock_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Get messages with no results"""
        mock_service = MagicMock()
        conversation_id = uuid.uuid4()
        messages_list = MessagesListResponse(
            messages=[],
            page=1,
            page_size=50,
            total=0,
            has_next=False,  # Added required field
            conversation_id=conversation_id,  # Added required field
        )
        mock_service.get_conversation_messages = AsyncMock(return_value=messages_list)
        mock_service_class.return_value = mock_service

        result = await get_conversation_messages(
            conversation_id,
            page=1,
            page_size=50,
            current_user=mock_current_user,
            db=mock_db_session,
        )

        assert isinstance(result, MessagesListResponse)
        assert len(result.messages) == 0

    @pytest.mark.asyncio
    @patch("app.routers.conversations.MessageAnalyticsService")
    async def test_get_conversation_analytics_not_found(
        self, mock_analytics_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Handle conversation analytics not found (404)"""
        mock_analytics = MagicMock()
        mock_analytics.get_conversation_analytics = AsyncMock(return_value=None)
        mock_analytics_class.return_value = mock_analytics

        conversation_id = uuid.uuid4()
        with pytest.raises(HTTPException) as exc_info:
            await get_conversation_analytics(
                conversation_id, days_back=30, current_user=mock_current_user, db=mock_db_session
            )

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "Conversation not found or access denied" in exc_info.value.detail
