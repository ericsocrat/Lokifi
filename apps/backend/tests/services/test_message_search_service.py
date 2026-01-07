"""
Comprehensive tests for app.services.message_search_service module.
Coverage target: 100%
"""

import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ================================================================================
# Test SearchFilter Dataclass
# ================================================================================


class TestSearchFilter:
    """Test the SearchFilter dataclass."""

    def test_search_filter_default_values(self):
        """Test SearchFilter with default values."""
        from app.services.message_search_service import SearchFilter

        filter_ = SearchFilter()

        assert filter_.query is None
        assert filter_.content_type is None
        assert filter_.sender_username is None
        assert filter_.date_from is None
        assert filter_.date_to is None
        assert filter_.conversation_id is None

    def test_search_filter_with_all_values(self):
        """Test SearchFilter with all values provided."""
        from app.services.message_search_service import SearchFilter

        conv_id = uuid.uuid4()
        now = datetime.now()

        filter_ = SearchFilter(
            query="test query",
            content_type="text",
            sender_username="testuser",
            date_from=now - timedelta(days=7),
            date_to=now,
            conversation_id=conv_id,
        )

        assert filter_.query == "test query"
        assert filter_.content_type == "text"
        assert filter_.sender_username == "testuser"
        assert filter_.date_from == now - timedelta(days=7)
        assert filter_.date_to == now
        assert filter_.conversation_id == conv_id

    def test_search_filter_partial_values(self):
        """Test SearchFilter with partial values."""
        from app.services.message_search_service import SearchFilter

        filter_ = SearchFilter(query="hello", content_type="image")

        assert filter_.query == "hello"
        assert filter_.content_type == "image"
        assert filter_.sender_username is None
        assert filter_.date_from is None


# ================================================================================
# Test SearchResult Dataclass
# ================================================================================


class TestSearchResult:
    """Test the SearchResult dataclass."""

    def test_search_result_creation(self):
        """Test SearchResult dataclass creation."""
        from app.services.message_search_service import SearchResult

        result = SearchResult(
            messages=[],
            total_count=0,
            search_time_ms=10,
            page=1,
            page_size=20,
            has_next=False,
        )

        assert result.messages == []
        assert result.total_count == 0
        assert result.search_time_ms == 10
        assert result.page == 1
        assert result.page_size == 20
        assert result.has_next is False

    def test_search_result_with_messages(self):
        """Test SearchResult with actual messages."""
        from app.services.message_search_service import SearchResult

        mock_messages = [MagicMock(), MagicMock()]

        result = SearchResult(
            messages=mock_messages,
            total_count=100,
            search_time_ms=50,
            page=2,
            page_size=10,
            has_next=True,
        )

        assert len(result.messages) == 2
        assert result.total_count == 100
        assert result.has_next is True


# ================================================================================
# Test MessageSearchService Class
# ================================================================================


class TestMessageSearchServiceInit:
    """Test MessageSearchService initialization."""

    def test_init_stores_db(self):
        """Test that __init__ stores the db session."""
        from app.services.message_search_service import MessageSearchService

        mock_db = AsyncMock()
        service = MessageSearchService(mock_db)

        assert service.db == mock_db


class TestMessageSearchServiceSearchMessages:
    """Test the search_messages method."""

    @pytest.mark.asyncio
    async def test_search_messages_basic_query(self):
        """Test basic message search without filters."""
        from app.services.message_search_service import (
            MessageSearchService,
            SearchFilter,
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 0

        # First execute returns count, second returns messages
        mock_db.execute = AsyncMock(side_effect=[mock_count_result, mock_result])

        service = MessageSearchService(mock_db)
        user_id = uuid.uuid4()
        filter_ = SearchFilter()

        result = await service.search_messages(user_id, filter_)

        assert result.messages == []
        assert result.total_count == 0
        assert result.page == 1
        assert result.page_size == 20
        assert result.has_next is False
        assert result.search_time_ms >= 0

    @pytest.mark.asyncio
    async def test_search_messages_with_text_query(self):
        """Test message search with text query filter."""
        from app.services.message_search_service import (
            MessageSearchService,
            SearchFilter,
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 5

        mock_db.execute = AsyncMock(side_effect=[mock_count_result, mock_result])

        service = MessageSearchService(mock_db)
        user_id = uuid.uuid4()
        filter_ = SearchFilter(query="hello world")

        result = await service.search_messages(user_id, filter_)

        assert result.total_count == 5
        assert mock_db.execute.call_count == 2

    @pytest.mark.asyncio
    async def test_search_messages_with_content_type(self):
        """Test message search with content_type filter."""
        from app.services.message_search_service import (
            MessageSearchService,
            SearchFilter,
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 3

        mock_db.execute = AsyncMock(side_effect=[mock_count_result, mock_result])

        service = MessageSearchService(mock_db)
        user_id = uuid.uuid4()
        filter_ = SearchFilter(content_type="image")

        result = await service.search_messages(user_id, filter_)

        assert result.total_count == 3

    @pytest.mark.asyncio
    async def test_search_messages_with_sender_username(self):
        """Test message search with sender_username filter."""
        from app.services.message_search_service import (
            MessageSearchService,
            SearchFilter,
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 2

        mock_db.execute = AsyncMock(side_effect=[mock_count_result, mock_result])

        service = MessageSearchService(mock_db)
        user_id = uuid.uuid4()
        filter_ = SearchFilter(sender_username="johndoe")

        result = await service.search_messages(user_id, filter_)

        assert result.total_count == 2

    @pytest.mark.asyncio
    async def test_search_messages_with_date_range(self):
        """Test message search with date range filter."""
        from app.services.message_search_service import (
            MessageSearchService,
            SearchFilter,
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 10

        mock_db.execute = AsyncMock(side_effect=[mock_count_result, mock_result])

        service = MessageSearchService(mock_db)
        user_id = uuid.uuid4()
        now = datetime.now()
        filter_ = SearchFilter(
            date_from=now - timedelta(days=30),
            date_to=now,
        )

        result = await service.search_messages(user_id, filter_)

        assert result.total_count == 10

    @pytest.mark.asyncio
    async def test_search_messages_with_conversation_id(self):
        """Test message search with specific conversation_id filter."""
        from app.services.message_search_service import (
            MessageSearchService,
            SearchFilter,
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 15

        mock_db.execute = AsyncMock(side_effect=[mock_count_result, mock_result])

        service = MessageSearchService(mock_db)
        user_id = uuid.uuid4()
        conv_id = uuid.uuid4()
        filter_ = SearchFilter(conversation_id=conv_id)

        result = await service.search_messages(user_id, filter_)

        assert result.total_count == 15

    @pytest.mark.asyncio
    async def test_search_messages_pagination(self):
        """Test message search pagination."""
        from app.services.message_search_service import (
            MessageSearchService,
            SearchFilter,
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 50  # Total of 50 messages

        mock_db.execute = AsyncMock(side_effect=[mock_count_result, mock_result])

        service = MessageSearchService(mock_db)
        user_id = uuid.uuid4()
        filter_ = SearchFilter()

        result = await service.search_messages(user_id, filter_, page=2, page_size=10)

        assert result.page == 2
        assert result.page_size == 10
        # offset = (2-1) * 10 = 10, limit = 10, total = 50
        # has_next = (10 + 10) < 50 = True
        assert result.has_next is True

    @pytest.mark.asyncio
    async def test_search_messages_last_page_has_next_false(self):
        """Test message search returns has_next=False on last page."""
        from app.services.message_search_service import (
            MessageSearchService,
            SearchFilter,
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 25

        mock_db.execute = AsyncMock(side_effect=[mock_count_result, mock_result])

        service = MessageSearchService(mock_db)
        user_id = uuid.uuid4()
        filter_ = SearchFilter()

        result = await service.search_messages(user_id, filter_, page=3, page_size=10)

        # offset = 20, limit = 10, total = 25
        # has_next = (20 + 10) < 25 = False
        assert result.has_next is False

    @pytest.mark.asyncio
    async def test_search_messages_builds_message_responses(self):
        """Test search_messages correctly builds MessageResponse objects."""
        from app.services.message_search_service import (
            MessageSearchService,
            SearchFilter,
        )

        mock_db = AsyncMock()

        # Create mock message
        mock_message = MagicMock()
        mock_message.id = uuid.uuid4()
        mock_message.conversation_id = uuid.uuid4()
        mock_message.sender_id = uuid.uuid4()
        mock_message.content = "Test message content"
        mock_message.content_type = "text"
        mock_message.created_at = datetime.now()
        mock_message.updated_at = datetime.now()
        mock_message.is_deleted = False

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_message]

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 1

        mock_db.execute = AsyncMock(side_effect=[mock_count_result, mock_result])

        service = MessageSearchService(mock_db)
        user_id = uuid.uuid4()
        filter_ = SearchFilter()

        result = await service.search_messages(user_id, filter_)

        assert len(result.messages) == 1
        assert result.messages[0].id == mock_message.id
        assert result.messages[0].content == "Test message content"
        assert result.messages[0].content_type == "text"

    @pytest.mark.asyncio
    async def test_search_messages_handles_none_total_count(self):
        """Test search_messages handles None scalar result for count."""
        from app.services.message_search_service import (
            MessageSearchService,
            SearchFilter,
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = None  # Returns None

        mock_db.execute = AsyncMock(side_effect=[mock_count_result, mock_result])

        service = MessageSearchService(mock_db)
        user_id = uuid.uuid4()
        filter_ = SearchFilter()

        result = await service.search_messages(user_id, filter_)

        # Should default to 0
        assert result.total_count == 0


class TestMessageSearchServiceGetPopularSearchTerms:
    """Test the get_popular_search_terms method."""

    @pytest.mark.asyncio
    async def test_get_popular_search_terms_returns_list(self):
        """Test get_popular_search_terms returns predefined terms."""
        from app.services.message_search_service import MessageSearchService

        mock_db = AsyncMock()
        service = MessageSearchService(mock_db)
        user_id = uuid.uuid4()

        result = await service.get_popular_search_terms(user_id)

        assert isinstance(result, list)
        assert len(result) > 0
        # Check for some expected terms
        assert "document" in result
        assert "meeting" in result
        assert "project" in result

    @pytest.mark.asyncio
    async def test_get_popular_search_terms_returns_correct_count(self):
        """Test get_popular_search_terms returns expected number of terms."""
        from app.services.message_search_service import MessageSearchService

        mock_db = AsyncMock()
        service = MessageSearchService(mock_db)
        user_id = uuid.uuid4()

        result = await service.get_popular_search_terms(user_id)

        # Based on implementation, returns 10 terms
        assert len(result) == 10


class TestMessageSearchServiceSearchConversations:
    """Test the search_conversations method."""

    @pytest.mark.asyncio
    async def test_search_conversations_returns_list(self):
        """Test search_conversations returns a list of conversation dicts."""
        from app.services.message_search_service import MessageSearchService

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        mock_db.execute = AsyncMock(return_value=mock_result)

        service = MessageSearchService(mock_db)
        user_id = uuid.uuid4()

        result = await service.search_conversations(user_id, "test")

        assert isinstance(result, list)
        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_search_conversations_with_results(self):
        """Test search_conversations returns formatted conversation data."""
        from app.services.message_search_service import MessageSearchService

        mock_db = AsyncMock()

        # Create mock conversation
        mock_conv = MagicMock()
        mock_conv.id = uuid.uuid4()
        mock_conv.is_group = True
        mock_conv.name = "Test Group"
        mock_conv.last_message_at = datetime.now()

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_conv]

        mock_db.execute = AsyncMock(return_value=mock_result)

        service = MessageSearchService(mock_db)
        user_id = uuid.uuid4()

        result = await service.search_conversations(user_id, "test")

        assert len(result) == 1
        assert result[0]["id"] == str(mock_conv.id)
        assert result[0]["is_group"] is True
        assert result[0]["name"] == "Test Group"
        assert result[0]["last_message_at"] is not None

    @pytest.mark.asyncio
    async def test_search_conversations_handles_none_last_message_at(self):
        """Test search_conversations handles None last_message_at."""
        from app.services.message_search_service import MessageSearchService

        mock_db = AsyncMock()

        mock_conv = MagicMock()
        mock_conv.id = uuid.uuid4()
        mock_conv.is_group = False
        mock_conv.name = None
        mock_conv.last_message_at = None  # No messages yet

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_conv]

        mock_db.execute = AsyncMock(return_value=mock_result)

        service = MessageSearchService(mock_db)
        user_id = uuid.uuid4()

        result = await service.search_conversations(user_id, "test")

        assert len(result) == 1
        assert result[0]["last_message_at"] is None

    @pytest.mark.asyncio
    async def test_search_conversations_pagination(self):
        """Test search_conversations respects pagination parameters."""
        from app.services.message_search_service import MessageSearchService

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        mock_db.execute = AsyncMock(return_value=mock_result)

        service = MessageSearchService(mock_db)
        user_id = uuid.uuid4()

        result = await service.search_conversations(
            user_id, "query", page=2, page_size=5
        )

        assert isinstance(result, list)
        # Query should have been executed with offset=(2-1)*5=5 and limit=5
        mock_db.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_search_conversations_multiple_results(self):
        """Test search_conversations handles multiple results."""
        from app.services.message_search_service import MessageSearchService

        mock_db = AsyncMock()

        # Create multiple mock conversations
        mock_convs = []
        for i in range(3):
            mock_conv = MagicMock()
            mock_conv.id = uuid.uuid4()
            mock_conv.is_group = i % 2 == 0
            mock_conv.name = f"Conversation {i}"
            mock_conv.last_message_at = datetime.now() - timedelta(hours=i)
            mock_convs.append(mock_conv)

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = mock_convs

        mock_db.execute = AsyncMock(return_value=mock_result)

        service = MessageSearchService(mock_db)
        user_id = uuid.uuid4()

        result = await service.search_conversations(user_id, "conversation")

        assert len(result) == 3
        for i, conv in enumerate(result):
            assert conv["name"] == f"Conversation {i}"
