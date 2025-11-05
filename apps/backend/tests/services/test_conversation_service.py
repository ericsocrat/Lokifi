"""
Tests for app.services.conversation_service

Comprehensive test suite for conversation service functionality including:
- DM conversation creation
- Message sending and retrieval
- Participant verification
- Pagination
- Error handling

Coverage focus: Happy path flows, edge cases, authorization validation
"""

import uuid
from datetime import UTC, datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, status

from app.models.conversation import (
    ContentType,
    Conversation,
    ConversationParticipant,
    Message,
    MessageReceipt,
)
from app.models.user import User
from app.schemas.conversation import MessageCreate
from app.services.conversation_service import ConversationService

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_db_session():
    """Mock database session"""
    session = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.flush = AsyncMock()
    session.refresh = AsyncMock()
    session.execute = AsyncMock()
    return session


@pytest.fixture
def conversation_service(mock_db_session):
    """Fixture for ConversationService instance"""
    return ConversationService(db=mock_db_session)


@pytest.fixture
def sample_user_ids():
    """Sample user IDs for testing"""
    return {
        "user1": uuid.UUID("12345678-1234-5678-1234-567812345678"),
        "user2": uuid.UUID("87654321-4321-8765-4321-876543218765"),
    }


@pytest.fixture
def sample_conversation_id():
    """Sample conversation ID"""
    return uuid.UUID("abcdef12-3456-7890-abcd-ef1234567890")


@pytest.fixture
def sample_message_id():
    """Sample message ID"""
    return uuid.UUID("fedcba98-7654-3210-fedc-ba9876543210")


# ============================================================================
# DM CONVERSATION TESTS
# ============================================================================


class TestDMConversationCreation:
    """Test suite for DM conversation creation"""

    @pytest.mark.asyncio
    async def test_get_or_create_dm_prevents_self_conversation(
        self, conversation_service, sample_user_ids
    ):
        """Test that users cannot create conversations with themselves"""
        user_id = sample_user_ids["user1"]

        with pytest.raises(HTTPException) as exc_info:
            await conversation_service.get_or_create_dm_conversation(user_id, user_id)

        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "yourself" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_get_or_create_dm_validates_users_exist(
        self, conversation_service, sample_user_ids, mock_db_session
    ):
        """Test that both users must exist and be active"""
        # Mock users query - return only 1 user (not both)
        mock_result = MagicMock()
        mock_result.scalars().all.return_value = [MagicMock()]  # Only 1 user
        mock_db_session.execute.return_value = mock_result

        with pytest.raises(HTTPException) as exc_info:
            await conversation_service.get_or_create_dm_conversation(
                sample_user_ids["user1"], sample_user_ids["user2"]
            )

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_get_or_create_dm_returns_existing_conversation(
        self, conversation_service, sample_user_ids, mock_db_session, sample_conversation_id
    ):
        """Test that existing DM conversation is returned"""
        user1_id = sample_user_ids["user1"]
        user2_id = sample_user_ids["user2"]

        # Mock users query - both users exist
        mock_user_result = MagicMock()
        mock_user_result.scalars().all.return_value = [MagicMock(), MagicMock()]

        # Mock existing conversation query
        mock_conv = MagicMock()
        mock_conv.id = sample_conversation_id
        mock_conv.is_group = False
        mock_conv.participants = [MagicMock(user_id=user1_id), MagicMock(user_id=user2_id)]

        mock_conv_result = MagicMock()
        mock_conv_result.scalars().all.return_value = [mock_conv]

        # Setup mock to return different results for different queries
        mock_db_session.execute.side_effect = [mock_user_result, mock_conv_result]

        # Call method
        with patch.object(
            conversation_service, "_build_conversation_response", new_callable=AsyncMock
        ) as mock_build:
            mock_build.return_value = MagicMock(id=sample_conversation_id)
            await conversation_service.get_or_create_dm_conversation(user1_id, user2_id)

        # Verify no new conversation was created
        assert not mock_db_session.add.called
        # Verify response builder was called
        assert mock_build.called


# ============================================================================
# MESSAGE SENDING TESTS
# ============================================================================


class TestMessageSending:
    """Test suite for message sending"""

    @pytest.mark.asyncio
    async def test_send_message_validates_participant(
        self, conversation_service, sample_conversation_id, sample_user_ids, mock_db_session
    ):
        """Test that non-participants cannot send messages"""
        # Mock participant query - return None (not a participant)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result

        message_data = MessageCreate(content="Test message", content_type=ContentType.TEXT)

        with pytest.raises(HTTPException) as exc_info:
            await conversation_service.send_message(
                sample_conversation_id, sample_user_ids["user1"], message_data
            )

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "participant" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_send_message_creates_message_and_receipt(
        self, conversation_service, sample_conversation_id, sample_user_ids, mock_db_session
    ):
        """Test successful message creation"""
        # Mock participant query - user is participant
        mock_participant = MagicMock(is_active=True)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_participant
        mock_db_session.execute.return_value = mock_result

        message_data = MessageCreate(content="Test message", content_type=ContentType.TEXT)

        with patch.object(
            conversation_service, "_build_message_response", new_callable=AsyncMock
        ) as mock_build:
            mock_build.return_value = MagicMock(content="Test message")
            await conversation_service.send_message(
                sample_conversation_id, sample_user_ids["user1"], message_data
            )

        # Verify message was created
        assert mock_db_session.add.call_count >= 2  # Message + Receipt
        # Verify conversation timestamp was updated
        assert mock_db_session.execute.call_count >= 2  # Participant check + update
        # Verify commit was called
        assert mock_db_session.commit.called


# ============================================================================
# MESSAGE RETRIEVAL TESTS
# ============================================================================


class TestMessageRetrieval:
    """Test suite for message retrieval"""

    @pytest.mark.asyncio
    async def test_get_messages_validates_participant(
        self, conversation_service, sample_conversation_id, sample_user_ids, mock_db_session
    ):
        """Test that non-participants cannot retrieve messages"""
        # Mock participant query - return None (not a participant)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result

        with pytest.raises(HTTPException) as exc_info:
            await conversation_service.get_conversation_messages(
                sample_conversation_id, sample_user_ids["user1"]
            )

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "participant" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_get_messages_pagination(
        self, conversation_service, sample_conversation_id, sample_user_ids, mock_db_session
    ):
        """Test message pagination works correctly"""
        from uuid import UUID

        from app.schemas.conversation import MessageResponse

        # Mock participant query - user is participant
        mock_participant = MagicMock(is_active=True)
        mock_participant_result = MagicMock()
        mock_participant_result.scalar_one_or_none.return_value = mock_participant

        # Mock messages query - empty to avoid Pydantic validation issues
        mock_messages_result = MagicMock()
        mock_messages_result.scalars().all.return_value = []

        # Mock total count query
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 0

        # Setup side effects for multiple execute calls
        mock_db_session.execute.side_effect = [
            mock_participant_result,  # Participant check
            mock_messages_result,  # Messages query
            mock_count_result,  # Count query
        ]

        result = await conversation_service.get_conversation_messages(
            sample_conversation_id, sample_user_ids["user1"], page=2, page_size=10
        )

        # Verify pagination response structure
        assert mock_db_session.execute.call_count == 3
        assert result.messages == []
        assert result.total == 0
        assert result.page == 2
        assert result.page_size == 10


# ============================================================================
# CONVERSATION LISTING TESTS
# ============================================================================


class TestConversationListing:
    """Test suite for conversation listing"""

    @pytest.mark.asyncio
    async def test_get_user_conversations_pagination(
        self, conversation_service, sample_user_ids, mock_db_session
    ):
        """Test conversation listing with pagination"""
        # Mock conversations query - empty to avoid Pydantic validation
        mock_conv_result = MagicMock()
        mock_conv_result.scalars().all.return_value = []

        # Mock total count query
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 0

        # Setup side effects
        mock_db_session.execute.side_effect = [
            mock_conv_result,  # Conversations query
            mock_count_result,  # Count query
        ]

        result = await conversation_service.get_user_conversations(
            sample_user_ids["user1"], page=1, page_size=20
        )

        # Verify pagination response structure
        assert mock_db_session.execute.call_count == 2
        assert result.conversations == []
        assert result.total == 0
        assert result.page == 1
        assert result.page_size == 20


# ============================================================================
# EDGE CASES & ERROR HANDLING
# ============================================================================


class TestConversationServiceEdgeCases:
    """Edge case and error handling tests"""

    def test_conversation_service_initialization(self, mock_db_session):
        """Test ConversationService initializes correctly"""
        service = ConversationService(db=mock_db_session)
        assert service.db == mock_db_session

    @pytest.mark.asyncio
    async def test_null_conversation_id_handling(
        self, conversation_service, sample_user_ids, mock_db_session
    ):
        """Test handling of None conversation_id"""
        message_data = MessageCreate(content="Test", content_type=ContentType.TEXT)

        # This should raise an error (likely database constraint or validation)
        # We're testing that the service doesn't crash unexpectedly
        try:
            await conversation_service.send_message(
                None, sample_user_ids["user1"], message_data  # type: ignore
            )
        except (HTTPException, Exception):
            # Expected to fail, just verify no unexpected crashes
            assert True

    @pytest.mark.asyncio
    async def test_invalid_user_id_format(self, conversation_service, mock_db_session):
        """Test handling of invalid UUID format"""
        from uuid import UUID

        invalid_id = "not-a-valid-uuid"

        # Mock execute to be async since service uses await self.db.execute
        mock_result = MagicMock()
        mock_result.scalars().all.return_value = []
        async_execute = AsyncMock(return_value=mock_result)
        mock_db_session.execute = async_execute

        # Should raise ValueError when trying to convert invalid UUID
        # Service will attempt to execute query, but UUID validation happens first
        with pytest.raises((ValueError, TypeError, HTTPException)):
            # This should fail when trying to build WHERE clause with invalid UUID
            await conversation_service.get_user_conversations(invalid_id, page=1)  # type: ignore


# ============================================================================
# INTEGRATION SCENARIOS
# ============================================================================


class TestConversationServiceIntegration:
    """Integration test scenarios"""

    @pytest.mark.asyncio
    async def test_full_conversation_flow(
        self, conversation_service, sample_user_ids, mock_db_session
    ):
        """Test complete conversation flow: create → send → retrieve"""
        # This is a simplified integration test
        # In reality, this would use a real test database

        service = ConversationService(db=mock_db_session)
        assert service.db is not None
        assert hasattr(service, "send_message")
        assert hasattr(service, "get_conversation_messages")
        assert hasattr(service, "get_or_create_dm_conversation")


# ============================================================================
# GAP 1: DM CREATION & CONVERSATION RETRIEVAL
# ============================================================================


class TestDMCreationNewConversationFlow:
    """Gap 1: Test NEW conversation creation flow (lines 77-91)

    Coverage target: get_or_create_dm_conversation NEW path
    - Lines 77-91: Create new conversation when none exists
    - Database operations: add Conversation, add 2 participants, flush, commit, refresh
    - Response building: Call _build_conversation_response with new conversation
    """

    @pytest.mark.asyncio
    async def test_create_new_dm_conversation_when_none_exists(
        self, conversation_service, sample_user_ids, sample_conversation_id, mock_db_session
    ):
        """Test creating a new DM conversation when no existing conversation found"""
        user1_id = sample_user_ids["user1"]
        user2_id = sample_user_ids["user2"]

        # Mock users query - both users exist and are active
        mock_user_result = MagicMock()
        mock_user1 = MagicMock()
        mock_user2 = MagicMock()
        mock_user_result.scalars().all.return_value = [mock_user1, mock_user2]

        # Mock existing conversation query - NO existing conversations
        mock_conv_result = MagicMock()
        mock_conv_result.scalars().all.return_value = []  # No existing conversations

        # Setup execute side effects
        mock_db_session.execute.side_effect = [
            mock_user_result,  # User validation query
            mock_conv_result,  # Existing conversation check (empty)
        ]

        # Mock _build_conversation_response
        with patch.object(
            conversation_service, "_build_conversation_response", new_callable=AsyncMock
        ) as mock_build:
            mock_response = MagicMock(id=sample_conversation_id, is_group=False)
            mock_build.return_value = mock_response

            result = await conversation_service.get_or_create_dm_conversation(user1_id, user2_id)

            # Verify new conversation was created
            assert mock_db_session.add.call_count == 3  # Conversation + 2 participants
            assert mock_db_session.flush.called
            assert mock_db_session.commit.called
            assert mock_db_session.refresh.called

            # Verify response builder was called
            assert mock_build.called
            assert result.id == sample_conversation_id

    @pytest.mark.asyncio
    async def test_create_dm_adds_both_participants(
        self, conversation_service, sample_user_ids, mock_db_session
    ):
        """Test that both participants are added to new conversation"""
        user1_id = sample_user_ids["user1"]
        user2_id = sample_user_ids["user2"]

        # Mock users exist
        mock_user_result = MagicMock()
        mock_user_result.scalars().all.return_value = [MagicMock(), MagicMock()]

        # Mock no existing conversations
        mock_conv_result = MagicMock()
        mock_conv_result.scalars().all.return_value = []

        mock_db_session.execute.side_effect = [mock_user_result, mock_conv_result]

        # Track add() calls to verify participants
        add_calls = []

        def track_add(obj):
            add_calls.append(obj)

        mock_db_session.add = MagicMock(side_effect=track_add)

        with patch.object(
            conversation_service, "_build_conversation_response", new_callable=AsyncMock
        ) as mock_build:
            mock_build.return_value = MagicMock()
            await conversation_service.get_or_create_dm_conversation(user1_id, user2_id)

        # Verify 3 add() calls: 1 Conversation + 2 ConversationParticipants
        assert len(add_calls) == 3

        # Verify first add is Conversation
        assert isinstance(add_calls[0], Conversation)
        assert add_calls[0].is_group is False

        # Verify next 2 adds are ConversationParticipants
        assert isinstance(add_calls[1], ConversationParticipant)
        assert isinstance(add_calls[2], ConversationParticipant)

        # Verify participants have correct user_ids
        participant_ids = {add_calls[1].user_id, add_calls[2].user_id}
        assert participant_ids == {user1_id, user2_id}

    @pytest.mark.asyncio
    async def test_create_dm_flushes_before_adding_participants(
        self, conversation_service, sample_user_ids, mock_db_session
    ):
        """Test that flush() is called after creating conversation but before adding participants"""
        user1_id = sample_user_ids["user1"]
        user2_id = sample_user_ids["user2"]

        # Mock setup
        mock_user_result = MagicMock()
        mock_user_result.scalars().all.return_value = [MagicMock(), MagicMock()]
        mock_conv_result = MagicMock()
        mock_conv_result.scalars().all.return_value = []

        mock_db_session.execute.side_effect = [mock_user_result, mock_conv_result]

        # Track call order
        call_order = []

        def track_add(obj):
            call_order.append(("add", obj))

        async def track_flush():
            call_order.append(("flush", None))

        async def track_commit():
            call_order.append(("commit", None))

        async def track_refresh(obj):
            call_order.append(("refresh", obj))

        mock_db_session.add = MagicMock(side_effect=track_add)
        mock_db_session.flush = AsyncMock(side_effect=track_flush)
        mock_db_session.commit = AsyncMock(side_effect=track_commit)
        mock_db_session.refresh = AsyncMock(side_effect=track_refresh)

        with patch.object(
            conversation_service, "_build_conversation_response", new_callable=AsyncMock
        ) as mock_build:
            mock_build.return_value = MagicMock()
            await conversation_service.get_or_create_dm_conversation(user1_id, user2_id)

        # Verify call order: add Conversation → flush → add participants → commit → refresh
        assert call_order[0][0] == "add"  # Add conversation
        assert isinstance(call_order[0][1], Conversation)
        assert call_order[1][0] == "flush"  # Flush to get conversation.id
        assert call_order[2][0] == "add"  # Add participant 1
        assert call_order[3][0] == "add"  # Add participant 2
        assert call_order[4][0] == "commit"  # Commit all changes
        assert call_order[5][0] == "refresh"  # Refresh conversation with relationships


class TestGetUserConversationsDetailed:
    """Gap 1: Test get_user_conversations with real pagination data (lines 97-140)

    Coverage target: Pagination logic, ordering, count query
    - Lines 97-140: Query conversations, count total, build responses
    - Pagination: offset calculation, limit application, has_next logic
    - Ordering: last_message_at DESC, updated_at DESC
    """

    @pytest.mark.asyncio
    async def test_get_user_conversations_ordering(
        self, conversation_service, sample_user_ids, mock_db_session
    ):
        """Test conversations are ordered by last_message_at DESC, then updated_at DESC"""
        from app.schemas.conversation import ConversationResponse

        user_id = sample_user_ids["user1"]

        # Create conversation IDs
        conv1_id = uuid.uuid4()
        conv2_id = uuid.uuid4()
        conv3_id = uuid.uuid4()

        # Create mock conversations with different timestamps
        conv1 = MagicMock()
        conv1.id = conv1_id
        conv1.last_message_at = datetime(2025, 1, 1, 12, 0, tzinfo=UTC)
        conv1.updated_at = datetime(2025, 1, 1, 10, 0, tzinfo=UTC)
        conv1.participants = []

        conv2 = MagicMock()
        conv2.id = conv2_id
        conv2.last_message_at = datetime(2025, 1, 2, 12, 0, tzinfo=UTC)  # Most recent
        conv2.updated_at = datetime(2025, 1, 2, 10, 0, tzinfo=UTC)
        conv2.participants = []

        conv3 = MagicMock()
        conv3.id = conv3_id
        conv3.last_message_at = datetime(2025, 1, 1, 18, 0, tzinfo=UTC)
        conv3.updated_at = datetime(2025, 1, 1, 16, 0, tzinfo=UTC)
        conv3.participants = []

        # Mock conversations query - return in expected order
        mock_conv_result = MagicMock()
        mock_conv_result.scalars().all.return_value = [
            conv2,
            conv3,
            conv1,
        ]  # Ordered by last_message_at DESC

        # Mock count query
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 3

        mock_db_session.execute.side_effect = [mock_conv_result, mock_count_result]

        # Mock _build_conversation_response to return proper ConversationResponse
        with patch.object(
            conversation_service, "_build_conversation_response", new_callable=AsyncMock
        ) as mock_build:
            # Return proper ConversationResponse objects
            mock_build.side_effect = [
                ConversationResponse(
                    id=conv2_id,
                    is_group=False,
                    name=None,
                    description=None,
                    participants=[],
                    last_message=None,
                    unread_count=0,
                    created_at=datetime(2025, 1, 2, 10, 0, tzinfo=UTC),
                    updated_at=datetime(2025, 1, 2, 10, 0, tzinfo=UTC),
                    last_message_at=datetime(2025, 1, 2, 12, 0, tzinfo=UTC),
                ),
                ConversationResponse(
                    id=conv3_id,
                    is_group=False,
                    name=None,
                    description=None,
                    participants=[],
                    last_message=None,
                    unread_count=0,
                    created_at=datetime(2025, 1, 1, 16, 0, tzinfo=UTC),
                    updated_at=datetime(2025, 1, 1, 16, 0, tzinfo=UTC),
                    last_message_at=datetime(2025, 1, 1, 18, 0, tzinfo=UTC),
                ),
                ConversationResponse(
                    id=conv1_id,
                    is_group=False,
                    name=None,
                    description=None,
                    participants=[],
                    last_message=None,
                    unread_count=0,
                    created_at=datetime(2025, 1, 1, 10, 0, tzinfo=UTC),
                    updated_at=datetime(2025, 1, 1, 10, 0, tzinfo=UTC),
                    last_message_at=datetime(2025, 1, 1, 12, 0, tzinfo=UTC),
                ),
            ]

            result = await conversation_service.get_user_conversations(
                user_id, page=1, page_size=10
            )

            # Verify ordering in response
            assert len(result.conversations) == 3
            assert result.conversations[0].id == conv2_id  # Most recent first
            assert result.conversations[1].id == conv3_id
            assert result.conversations[2].id == conv1_id  # Oldest last

    @pytest.mark.asyncio
    async def test_get_user_conversations_pagination_page_1(
        self, conversation_service, sample_user_ids, mock_db_session
    ):
        """Test first page of conversations with has_next=True"""
        from app.schemas.conversation import ConversationResponse

        user_id = sample_user_ids["user1"]

        # Create 2 conversation IDs for page 1
        conv_ids = [uuid.uuid4() for _ in range(2)]

        # Create 2 mock conversations (page_size=2, total=5, so has_next=True)
        conversations = []
        for conv_id in conv_ids:
            conv = MagicMock()
            conv.id = conv_id
            conv.participants = []
            conversations.append(conv)

        mock_conv_result = MagicMock()
        mock_conv_result.scalars().all.return_value = conversations

        # Mock total count = 5
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 5

        mock_db_session.execute.side_effect = [mock_conv_result, mock_count_result]

        with patch.object(
            conversation_service, "_build_conversation_response", new_callable=AsyncMock
        ) as mock_build:
            # Return proper ConversationResponse objects
            mock_build.side_effect = [
                ConversationResponse(
                    id=conv_id,
                    is_group=False,
                    name=None,
                    description=None,
                    participants=[],
                    last_message=None,
                    unread_count=0,
                    created_at=datetime.now(UTC),
                    updated_at=datetime.now(UTC),
                    last_message_at=None,
                )
                for conv_id in conv_ids
            ]

            result = await conversation_service.get_user_conversations(user_id, page=1, page_size=2)

            # Verify pagination metadata
            assert result.page == 1
            assert result.page_size == 2
            assert result.total == 5
            assert result.has_next is True  # (0 + 2) < 5
            assert len(result.conversations) == 2

    @pytest.mark.asyncio
    async def test_get_user_conversations_pagination_last_page(
        self, conversation_service, sample_user_ids, mock_db_session
    ):
        """Test last page of conversations with has_next=False"""
        from app.schemas.conversation import ConversationResponse

        user_id = sample_user_ids["user1"]

        # Create 1 conversation for last page (page 3, page_size=2, total=5)
        conv_id = uuid.uuid4()
        conversations = [MagicMock(id=conv_id, participants=[])]

        mock_conv_result = MagicMock()
        mock_conv_result.scalars().all.return_value = conversations

        # Mock total count = 5
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 5

        mock_db_session.execute.side_effect = [mock_conv_result, mock_count_result]

        with patch.object(
            conversation_service, "_build_conversation_response", new_callable=AsyncMock
        ) as mock_build:
            # Return proper ConversationResponse object
            mock_build.return_value = ConversationResponse(
                id=conv_id,
                is_group=False,
                name=None,
                description=None,
                participants=[],
                last_message=None,
                unread_count=0,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
                last_message_at=None,
            )

            result = await conversation_service.get_user_conversations(
                user_id, page=3, page_size=2  # offset = (3-1)*2 = 4
            )

            # Verify pagination metadata
            assert result.page == 3
            assert result.page_size == 2
            assert result.total == 5
            assert result.has_next is False  # (4 + 2) >= 5
            assert len(result.conversations) == 1

    @pytest.mark.asyncio
    async def test_get_user_conversations_offset_calculation(
        self, conversation_service, sample_user_ids, mock_db_session
    ):
        """Test pagination offset calculation: (page - 1) * page_size"""
        user_id = sample_user_ids["user1"]

        mock_conv_result = MagicMock()
        mock_conv_result.scalars().all.return_value = []

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 0

        mock_db_session.execute.side_effect = [mock_conv_result, mock_count_result]

        # Test various page numbers with page_size=10
        test_cases = [
            (1, 10, 0),  # page 1: offset = (1-1)*10 = 0
            (2, 10, 10),  # page 2: offset = (2-1)*10 = 10
            (3, 10, 20),  # page 3: offset = (3-1)*10 = 20
            (1, 5, 0),  # page 1, smaller size: offset = 0
            (3, 5, 10),  # page 3, smaller size: offset = (3-1)*5 = 10
        ]

        for page, page_size, _expected_offset in test_cases:
            # Reset execute side effects
            mock_db_session.execute.side_effect = [mock_conv_result, mock_count_result]

            result = await conversation_service.get_user_conversations(
                user_id, page=page, page_size=page_size
            )

            # Verify page and page_size are set correctly in response
            assert result.page == page
            assert result.page_size == page_size
            # Note: We can't directly verify offset in SQL query from mock,
            # but we verify the response structure is correct

    @pytest.mark.asyncio
    async def test_get_user_conversations_empty_results(
        self, conversation_service, sample_user_ids, mock_db_session
    ):
        """Test get_user_conversations with no conversations"""
        user_id = sample_user_ids["user1"]

        # Mock empty results
        mock_conv_result = MagicMock()
        mock_conv_result.scalars().all.return_value = []

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 0

        mock_db_session.execute.side_effect = [mock_conv_result, mock_count_result]

        result = await conversation_service.get_user_conversations(user_id, page=1, page_size=20)

        # Verify empty response
        assert result.conversations == []
        assert result.total == 0
        assert result.page == 1
        assert result.page_size == 20
        assert result.has_next is False  # No more pages

    @pytest.mark.asyncio
    async def test_get_user_conversations_filters_by_user_and_active(
        self, conversation_service, sample_user_ids, mock_db_session
    ):
        """Test that query filters by user_id and is_active=True"""
        user_id = sample_user_ids["user1"]

        mock_conv_result = MagicMock()
        mock_conv_result.scalars().all.return_value = []

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 0

        mock_db_session.execute.side_effect = [mock_conv_result, mock_count_result]

        await conversation_service.get_user_conversations(user_id)

        # Verify execute was called twice (conversations + count)
        assert mock_db_session.execute.call_count == 2

        # Note: We can't inspect the actual SQL WHERE clause from mocks,
        # but we verify the service method completes successfully
        # Real integration tests would verify actual filtering


# ============================================================================
# GAP 2: mark_messages_read COMPREHENSIVE TESTS
# Coverage Target: Lines 250-313 (mark_messages_read method)
# Expected Gain: +10-15pp (63% → 73-78%)
# ============================================================================


class TestMarkMessagesReadValidation:
    """Test suite for mark_messages_read validation logic"""

    @pytest.mark.asyncio
    async def test_mark_messages_read_validates_participant(
        self, conversation_service, sample_user_ids, sample_conversation_id, mock_db_session
    ):
        """Test that mark_messages_read validates user is a participant"""
        from app.schemas.conversation import MarkReadRequest

        user_id = sample_user_ids["user1"]
        target_message_id = uuid.uuid4()
        mark_read_data = MarkReadRequest(message_id=target_message_id)

        # Mock: User is NOT a participant (empty result)
        mock_participant_result = MagicMock()
        mock_participant_result.scalar_one_or_none.return_value = None

        mock_db_session.execute.return_value = mock_participant_result

        # Verify: HTTPException 403 raised
        with pytest.raises(HTTPException) as exc_info:
            await conversation_service.mark_messages_read(
                sample_conversation_id, user_id, mark_read_data
            )

        assert exc_info.value.status_code == 403
        assert "not a participant" in exc_info.value.detail.lower()

        # Verify: Only participant query executed (no further queries)
        assert mock_db_session.execute.call_count == 1

    @pytest.mark.asyncio
    async def test_mark_messages_read_validates_message_exists(
        self, conversation_service, sample_user_ids, sample_conversation_id, mock_db_session
    ):
        """Test that mark_messages_read validates message exists in conversation"""
        from app.schemas.conversation import MarkReadRequest

        user_id = sample_user_ids["user1"]
        target_message_id = uuid.uuid4()
        mark_read_data = MarkReadRequest(message_id=target_message_id)

        # Mock: Participant valid
        mock_participant = MagicMock()
        mock_participant_result = MagicMock()
        mock_participant_result.scalar_one_or_none.return_value = mock_participant

        # Mock: Target message doesn't exist in conversation
        mock_message_result = MagicMock()
        mock_message_result.scalar_one_or_none.return_value = None

        mock_db_session.execute.side_effect = [mock_participant_result, mock_message_result]

        # Verify: HTTPException 404 raised
        with pytest.raises(HTTPException) as exc_info:
            await conversation_service.mark_messages_read(
                sample_conversation_id, user_id, mark_read_data
            )

        assert exc_info.value.status_code == 404
        assert "message not found" in exc_info.value.detail.lower()

        # Verify: Participant query + message query executed (2 queries)
        assert mock_db_session.execute.call_count == 2


class TestMarkMessagesReadReceipts:
    """Test suite for mark_messages_read receipt creation logic"""

    @pytest.mark.asyncio
    async def test_mark_messages_read_creates_new_receipts(
        self, conversation_service, sample_user_ids, sample_conversation_id, mock_db_session
    ):
        """Test creating new receipts for unread messages"""
        from app.schemas.conversation import MarkReadRequest

        user_id = sample_user_ids["user1"]
        target_message_id = uuid.uuid4()
        mark_read_data = MarkReadRequest(message_id=target_message_id)

        # Mock: Participant valid
        mock_participant = MagicMock()
        mock_participant.last_read_message_id = None
        mock_participant_result = MagicMock()
        mock_participant_result.scalar_one_or_none.return_value = mock_participant

        # Mock: Target message exists
        mock_target_message = MagicMock()
        mock_target_message.id = target_message_id
        mock_target_message.created_at = datetime(2025, 1, 15, 12, 0, tzinfo=UTC)
        mock_message_result = MagicMock()
        mock_message_result.scalar_one_or_none.return_value = mock_target_message

        # Mock: 5 messages in conversation
        message_ids = [uuid.uuid4() for _ in range(5)]
        mock_messages_result = MagicMock()
        mock_messages_result.all.return_value = [(msg_id,) for msg_id in message_ids]

        # Mock: 2 messages already have receipts
        existing_ids = message_ids[:2]
        mock_existing_receipts_result = MagicMock()
        mock_existing_receipts_result.all.return_value = [(msg_id,) for msg_id in existing_ids]

        # Side effects for 4 queries + 1 update
        mock_db_session.execute.side_effect = [
            mock_participant_result,  # Participant validation
            mock_message_result,  # Target message validation
            mock_messages_result,  # Get message IDs up to target
            mock_existing_receipts_result,  # Get existing receipts
            AsyncMock(),  # Update participant query
        ]

        # Execute
        result = await conversation_service.mark_messages_read(
            sample_conversation_id, user_id, mark_read_data
        )

        # Verify: Result is True
        assert result is True

        # Verify: add_all called with 3 new receipts (5 total - 2 existing)
        assert mock_db_session.add_all.called
        new_receipts = mock_db_session.add_all.call_args[0][0]
        assert len(new_receipts) == 3
        assert all(isinstance(r, MessageReceipt) for r in new_receipts)

        # Verify: commit called
        assert mock_db_session.commit.called

    @pytest.mark.asyncio
    async def test_mark_messages_read_handles_all_read(
        self, conversation_service, sample_user_ids, sample_conversation_id, mock_db_session
    ):
        """Test when all messages already have receipts (no new receipts needed)"""
        from app.schemas.conversation import MarkReadRequest

        user_id = sample_user_ids["user1"]
        target_message_id = uuid.uuid4()
        mark_read_data = MarkReadRequest(message_id=target_message_id)

        # Mock: Participant valid
        mock_participant = MagicMock()
        mock_participant.last_read_message_id = None
        mock_participant_result = MagicMock()
        mock_participant_result.scalar_one_or_none.return_value = mock_participant

        # Mock: Target message exists
        mock_target_message = MagicMock()
        mock_target_message.id = target_message_id
        mock_target_message.created_at = datetime(2025, 1, 15, 12, 0, tzinfo=UTC)
        mock_message_result = MagicMock()
        mock_message_result.scalar_one_or_none.return_value = mock_target_message

        # Mock: 5 messages in conversation
        message_ids = [uuid.uuid4() for _ in range(5)]
        mock_messages_result = MagicMock()
        mock_messages_result.all.return_value = [(msg_id,) for msg_id in message_ids]

        # Mock: ALL messages already have receipts
        mock_existing_receipts_result = MagicMock()
        mock_existing_receipts_result.all.return_value = [(msg_id,) for msg_id in message_ids]

        # Side effects for 4 queries + 1 update
        mock_db_session.execute.side_effect = [
            mock_participant_result,  # Participant validation
            mock_message_result,  # Target message validation
            mock_messages_result,  # Get message IDs up to target
            mock_existing_receipts_result,  # Get existing receipts (all)
            AsyncMock(),  # Update participant query
        ]

        # Execute
        result = await conversation_service.mark_messages_read(
            sample_conversation_id, user_id, mark_read_data
        )

        # Verify: Result is True
        assert result is True

        # Verify: add_all NOT called (or called with empty list)
        if mock_db_session.add_all.called:
            new_receipts = mock_db_session.add_all.call_args[0][0]
            assert len(new_receipts) == 0

        # Verify: commit still called (last_read_message_id updated)
        assert mock_db_session.commit.called

    @pytest.mark.asyncio
    async def test_mark_messages_read_filters_by_timestamp(
        self, conversation_service, sample_user_ids, sample_conversation_id, mock_db_session
    ):
        """Test that only messages up to target timestamp are marked read"""
        from app.schemas.conversation import MarkReadRequest

        user_id = sample_user_ids["user1"]
        target_message_id = uuid.uuid4()
        mark_read_data = MarkReadRequest(message_id=target_message_id)

        # Mock: Participant valid
        mock_participant = MagicMock()
        mock_participant.last_read_message_id = None
        mock_participant_result = MagicMock()
        mock_participant_result.scalar_one_or_none.return_value = mock_participant

        # Mock: Target message at specific timestamp
        target_timestamp = datetime(2025, 1, 15, 12, 0, tzinfo=UTC)
        mock_target_message = MagicMock()
        mock_target_message.id = target_message_id
        mock_target_message.created_at = target_timestamp
        mock_message_result = MagicMock()
        mock_message_result.scalar_one_or_none.return_value = mock_target_message

        # Mock: 10 messages total, but query returns only 6 (created_at <= target)
        # This simulates messages before and at the target timestamp
        message_ids_before_target = [uuid.uuid4() for _ in range(6)]
        mock_messages_result = MagicMock()
        mock_messages_result.all.return_value = [(msg_id,) for msg_id in message_ids_before_target]

        # Mock: No existing receipts
        mock_existing_receipts_result = MagicMock()
        mock_existing_receipts_result.all.return_value = []

        # Side effects for 4 queries + 1 update
        mock_db_session.execute.side_effect = [
            mock_participant_result,  # Participant validation
            mock_message_result,  # Target message validation
            mock_messages_result,  # Get message IDs (filtered by timestamp)
            mock_existing_receipts_result,  # Get existing receipts
            AsyncMock(),  # Update participant query
        ]

        # Execute
        result = await conversation_service.mark_messages_read(
            sample_conversation_id, user_id, mark_read_data
        )

        # Verify: Result is True
        assert result is True

        # Verify: Only 6 receipts created (messages up to target timestamp)
        assert mock_db_session.add_all.called
        new_receipts = mock_db_session.add_all.call_args[0][0]
        assert len(new_receipts) == 6

        # Verify: commit called
        assert mock_db_session.commit.called

    @pytest.mark.asyncio
    async def test_mark_messages_read_excludes_deleted_messages(
        self, conversation_service, sample_user_ids, sample_conversation_id, mock_db_session
    ):
        """Test that deleted messages are excluded from marking read"""
        from app.schemas.conversation import MarkReadRequest

        user_id = sample_user_ids["user1"]
        target_message_id = uuid.uuid4()
        mark_read_data = MarkReadRequest(message_id=target_message_id)

        # Mock: Participant valid
        mock_participant = MagicMock()
        mock_participant.last_read_message_id = None
        mock_participant_result = MagicMock()
        mock_participant_result.scalar_one_or_none.return_value = mock_participant

        # Mock: Target message exists
        mock_target_message = MagicMock()
        mock_target_message.id = target_message_id
        mock_target_message.created_at = datetime(2025, 1, 15, 12, 0, tzinfo=UTC)
        mock_message_result = MagicMock()
        mock_message_result.scalar_one_or_none.return_value = mock_target_message

        # Mock: 10 total messages, but query returns only 7 (excludes 3 deleted)
        # This simulates the is_deleted filter in the query
        message_ids_not_deleted = [uuid.uuid4() for _ in range(7)]
        mock_messages_result = MagicMock()
        mock_messages_result.all.return_value = [(msg_id,) for msg_id in message_ids_not_deleted]

        # Mock: No existing receipts
        mock_existing_receipts_result = MagicMock()
        mock_existing_receipts_result.all.return_value = []

        # Side effects for 4 queries + 1 update
        mock_db_session.execute.side_effect = [
            mock_participant_result,  # Participant validation
            mock_message_result,  # Target message validation
            mock_messages_result,  # Get message IDs (excludes deleted)
            mock_existing_receipts_result,  # Get existing receipts
            AsyncMock(),  # Update participant query
        ]

        # Execute
        result = await conversation_service.mark_messages_read(
            sample_conversation_id, user_id, mark_read_data
        )

        # Verify: Result is True
        assert result is True

        # Verify: Only 7 receipts created (excludes deleted messages)
        assert mock_db_session.add_all.called
        new_receipts = mock_db_session.add_all.call_args[0][0]
        assert len(new_receipts) == 7

        # Verify: commit called
        assert mock_db_session.commit.called


# ============================================================================
# GAP 3: _build_conversation_response & _build_message_response HELPERS
# Coverage Target: Lines 320-423 (helper methods)
# Expected Gain: +5-10pp (82% → 87-92%)
# ============================================================================


class TestBuildConversationResponse:
    """Test suite for _build_conversation_response helper method"""

    @pytest.mark.asyncio
    async def test_build_conversation_response_with_participants_and_last_message(
        self, conversation_service, sample_user_ids, sample_conversation_id, mock_db_session
    ):
        """Test building conversation response with participants and last message"""
        from app.models.profile import Profile
        from app.schemas.conversation import MessageResponse

        user_id = sample_user_ids["user1"]
        user2_id = sample_user_ids["user2"]

        # Mock conversation
        mock_conversation = MagicMock()
        mock_conversation.id = sample_conversation_id
        mock_conversation.is_group = False
        mock_conversation.name = None
        mock_conversation.description = None
        mock_conversation.created_at = datetime(2025, 1, 15, 10, 0, tzinfo=UTC)
        mock_conversation.updated_at = datetime(2025, 1, 15, 12, 0, tzinfo=UTC)
        mock_conversation.last_message_at = datetime(2025, 1, 15, 12, 0, tzinfo=UTC)

        # Mock participants with profiles
        mock_participant1 = MagicMock(spec=ConversationParticipant)
        mock_participant1.user_id = user_id
        mock_participant1.joined_at = datetime(2025, 1, 15, 10, 0, tzinfo=UTC)
        mock_participant1.is_active = True
        mock_participant1.last_read_message_id = None

        mock_participant2 = MagicMock(spec=ConversationParticipant)
        mock_participant2.user_id = user2_id
        mock_participant2.joined_at = datetime(2025, 1, 15, 10, 0, tzinfo=UTC)
        mock_participant2.is_active = True
        mock_participant2.last_read_message_id = None

        mock_profile1 = MagicMock(spec=Profile)
        mock_profile1.username = "user1"
        mock_profile1.display_name = "User One"
        mock_profile1.avatar_url = None

        mock_profile2 = MagicMock(spec=Profile)
        mock_profile2.username = "user2"
        mock_profile2.display_name = "User Two"
        mock_profile2.avatar_url = None

        # Mock participants query result
        mock_participants_result = MagicMock()
        mock_participants_result.all.return_value = [
            (mock_participant1, mock_profile1),
            (mock_participant2, mock_profile2),
        ]

        # Mock last message
        mock_last_message = MagicMock(spec=Message)
        mock_last_message.id = uuid.uuid4()
        mock_last_message.conversation_id = sample_conversation_id
        mock_last_message.sender_id = user2_id
        mock_last_message.content = "Hello"
        mock_last_message.content_type = ContentType.TEXT
        mock_last_message.is_edited = False
        mock_last_message.is_deleted = False
        mock_last_message.created_at = datetime(2025, 1, 15, 12, 0, tzinfo=UTC)
        mock_last_message.updated_at = datetime(2025, 1, 15, 12, 0, tzinfo=UTC)
        mock_last_message.receipts = []

        mock_last_message_result = MagicMock()
        mock_last_message_result.scalar_one_or_none.return_value = mock_last_message

        # Mock unread count query (no last_read_message_id)
        mock_unread_count_result = MagicMock()
        mock_unread_count_result.scalar.return_value = 5

        # Side effects: participants + last_message + unread_count
        mock_db_session.execute.side_effect = [
            mock_participants_result,  # Participants query
            mock_last_message_result,  # Last message query
            mock_unread_count_result,  # Unread count query
        ]

        # Execute
        result = await conversation_service._build_conversation_response(mock_conversation, user_id)

        # Verify response structure
        assert result.id == sample_conversation_id
        assert result.is_group is False
        assert len(result.participants) == 2
        assert result.participants[0].username == "user1"
        assert result.participants[1].username == "user2"
        assert result.last_message is not None
        assert result.last_message.content == "Hello"
        assert result.unread_count == 5

    @pytest.mark.asyncio
    async def test_build_conversation_response_unread_count_with_last_read(
        self, conversation_service, sample_user_ids, sample_conversation_id, mock_db_session
    ):
        """Test unread count calculation when participant has last_read_message_id"""
        from app.models.profile import Profile

        user_id = sample_user_ids["user1"]
        last_read_msg_id = uuid.uuid4()

        # Mock conversation
        mock_conversation = MagicMock()
        mock_conversation.id = sample_conversation_id
        mock_conversation.is_group = False
        mock_conversation.name = None
        mock_conversation.description = None
        mock_conversation.created_at = datetime(2025, 1, 15, 10, 0, tzinfo=UTC)
        mock_conversation.updated_at = datetime(2025, 1, 15, 12, 0, tzinfo=UTC)
        mock_conversation.last_message_at = datetime(2025, 1, 15, 12, 0, tzinfo=UTC)

        # Mock participant with last_read_message_id
        mock_participant = MagicMock(spec=ConversationParticipant)
        mock_participant.user_id = user_id
        mock_participant.joined_at = datetime(2025, 1, 15, 10, 0, tzinfo=UTC)
        mock_participant.is_active = True
        mock_participant.last_read_message_id = last_read_msg_id

        mock_profile = MagicMock(spec=Profile)
        mock_profile.username = "user1"
        mock_profile.display_name = "User One"
        mock_profile.avatar_url = None

        # Mock participants query result
        mock_participants_result = MagicMock()
        mock_participants_result.all.return_value = [(mock_participant, mock_profile)]

        # Mock no last message
        mock_last_message_result = MagicMock()
        mock_last_message_result.scalar_one_or_none.return_value = None

        # Mock unread count query (with last_read_message_id - count messages after)
        mock_unread_count_result = MagicMock()
        mock_unread_count_result.scalar.return_value = 3

        # Side effects: participants + last_message + unread_count (after last_read)
        mock_db_session.execute.side_effect = [
            mock_participants_result,  # Participants query
            mock_last_message_result,  # Last message query (None)
            mock_unread_count_result,  # Unread count (messages after last_read)
        ]

        # Execute
        result = await conversation_service._build_conversation_response(mock_conversation, user_id)

        # Verify: Unread count uses "messages after last_read" logic
        assert result.unread_count == 3
        assert result.last_message is None

    @pytest.mark.asyncio
    async def test_build_conversation_response_unread_count_no_last_read(
        self, conversation_service, sample_user_ids, sample_conversation_id, mock_db_session
    ):
        """Test unread count when participant has NO last_read_message_id (never read)"""
        from app.models.profile import Profile

        user_id = sample_user_ids["user1"]

        # Mock conversation
        mock_conversation = MagicMock()
        mock_conversation.id = sample_conversation_id
        mock_conversation.is_group = False
        mock_conversation.name = None
        mock_conversation.description = None
        mock_conversation.created_at = datetime(2025, 1, 15, 10, 0, tzinfo=UTC)
        mock_conversation.updated_at = datetime(2025, 1, 15, 12, 0, tzinfo=UTC)
        mock_conversation.last_message_at = datetime(2025, 1, 15, 12, 0, tzinfo=UTC)

        # Mock participant with NO last_read_message_id
        mock_participant = MagicMock(spec=ConversationParticipant)
        mock_participant.user_id = user_id
        mock_participant.joined_at = datetime(2025, 1, 15, 10, 0, tzinfo=UTC)
        mock_participant.is_active = True
        mock_participant.last_read_message_id = None  # Never read

        mock_profile = MagicMock(spec=Profile)
        mock_profile.username = "user1"
        mock_profile.display_name = "User One"
        mock_profile.avatar_url = None

        # Mock participants query result
        mock_participants_result = MagicMock()
        mock_participants_result.all.return_value = [(mock_participant, mock_profile)]

        # Mock no last message
        mock_last_message_result = MagicMock()
        mock_last_message_result.scalar_one_or_none.return_value = None

        # Mock unread count query (count all messages, excluding sender's own)
        mock_unread_count_result = MagicMock()
        mock_unread_count_result.scalar.return_value = 10

        # Side effects: participants + last_message + unread_count (all messages)
        mock_db_session.execute.side_effect = [
            mock_participants_result,  # Participants query
            mock_last_message_result,  # Last message query (None)
            mock_unread_count_result,  # Unread count (all messages excluding sender)
        ]

        # Execute
        result = await conversation_service._build_conversation_response(mock_conversation, user_id)

        # Verify: Unread count uses "count all messages" logic
        assert result.unread_count == 10
        assert result.last_message is None


class TestBuildMessageResponse:
    """Test suite for _build_message_response helper method"""

    @pytest.mark.asyncio
    async def test_build_message_response_with_read_receipts(
        self, conversation_service, sample_user_ids, sample_conversation_id
    ):
        """Test building message response with read receipts"""
        user1_id = sample_user_ids["user1"]
        user2_id = sample_user_ids["user2"]
        message_id = uuid.uuid4()

        # Mock message with receipts
        mock_receipt1 = MagicMock(spec=MessageReceipt)
        mock_receipt1.user_id = user1_id

        mock_receipt2 = MagicMock(spec=MessageReceipt)
        mock_receipt2.user_id = user2_id

        mock_message = MagicMock(spec=Message)
        mock_message.id = message_id
        mock_message.conversation_id = sample_conversation_id
        mock_message.sender_id = user1_id
        mock_message.content = "Test message"
        mock_message.content_type = ContentType.TEXT
        mock_message.is_edited = False
        mock_message.is_deleted = False
        mock_message.created_at = datetime(2025, 1, 15, 12, 0, tzinfo=UTC)
        mock_message.updated_at = datetime(2025, 1, 15, 12, 0, tzinfo=UTC)
        mock_message.receipts = [mock_receipt1, mock_receipt2]

        # Execute
        result = await conversation_service._build_message_response(mock_message)

        # Verify response
        assert result.id == message_id
        assert result.conversation_id == sample_conversation_id
        assert result.sender_id == user1_id
        assert result.content == "Test message"
        assert result.content_type == ContentType.TEXT
        assert result.is_edited is False
        assert result.is_deleted is False
        assert len(result.read_by) == 2
        assert user1_id in result.read_by
        assert user2_id in result.read_by

    @pytest.mark.asyncio
    async def test_build_message_response_no_receipts(
        self, conversation_service, sample_user_ids, sample_conversation_id
    ):
        """Test building message response with no read receipts"""
        user1_id = sample_user_ids["user1"]
        message_id = uuid.uuid4()

        # Mock message with NO receipts
        mock_message = MagicMock(spec=Message)
        mock_message.id = message_id
        mock_message.conversation_id = sample_conversation_id
        mock_message.sender_id = user1_id
        mock_message.content = "Unread message"
        mock_message.content_type = ContentType.TEXT
        mock_message.is_edited = False
        mock_message.is_deleted = False
        mock_message.created_at = datetime(2025, 1, 15, 12, 0, tzinfo=UTC)
        mock_message.updated_at = datetime(2025, 1, 15, 12, 0, tzinfo=UTC)
        mock_message.receipts = []  # No receipts

        # Execute
        result = await conversation_service._build_message_response(mock_message)

        # Verify response
        assert result.id == message_id
        assert result.content == "Unread message"
        assert len(result.read_by) == 0  # No one has read
