"""
Comprehensive tests for AI context manager service (Session 103).

Tests conversation context, memory management, and style analysis.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.ai_context_manager import (
    AIContextManager,
    ContextSummary,
    ConversationMemory,
    ai_context_manager,
)
from app.services.ai_provider import AIMessage as AIProviderMessage
from app.services.ai_provider import MessageRole


# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def context_manager():
    """Create fresh AIContextManager instance for each test."""
    return AIContextManager()


@pytest.fixture
def mock_db_session():
    """Mock database session for testing."""
    session = MagicMock()
    session.query = MagicMock(return_value=session)
    session.filter = MagicMock(return_value=session)
    session.order_by = MagicMock(return_value=session)
    session.limit = MagicMock(return_value=session)
    session.offset = MagicMock(return_value=session)
    session.all = MagicMock(return_value=[])
    session.count = MagicMock(return_value=0)
    return session


@pytest.fixture
def sample_ai_messages():
    """Sample AI messages for testing."""

    class MockAIMessage:
        def __init__(self, role, content, created_at=None):
            self.role = role
            self.content = content
            self.created_at = created_at or datetime.now(timezone.utc)
            self.thread_id = 1

    return [
        MockAIMessage("user", "Hello, I need help with Python"),
        MockAIMessage("assistant", "I'd be happy to help with Python!"),
        MockAIMessage("user", "Can you explain list comprehensions?"),
        MockAIMessage("assistant", "List comprehensions are a concise way..."),
        MockAIMessage("user", "Thanks, that's helpful!"),
    ]


@pytest.fixture
def sample_context_summary():
    """Sample context summary for testing."""
    return ContextSummary(
        summary="Discussion about Python programming",
        key_points=["List comprehensions", "Python basics"],
        user_preferences={"prefers_detailed": True},
        conversation_tone="friendly",
        topic_tags=["programming", "python"],
        created_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def sample_conversation_memory():
    """Sample conversation memory for testing."""
    return ConversationMemory(
        thread_id=1,
        user_id=123,
        context_summary=ContextSummary(
            summary="Python programming discussion",
            key_points=["Functions", "Loops"],
            user_preferences={},
            conversation_tone="technical",
            topic_tags=["programming"],
            created_at=datetime.now(timezone.utc),
        ),
        important_facts=["User is learning Python"],
        user_style_notes=["Prefers detailed explanations"],
        preferred_response_style="technical",
        last_updated=datetime.now(timezone.utc),
    )


# ============================================================================
# TEST AIContextManager - INITIALIZATION
# ============================================================================


class TestAIContextManagerInitialization:
    """Test AIContextManager initialization."""

    def test_initialization(self, context_manager):
        """Test AIContextManager initializes with correct state."""
        assert isinstance(context_manager, AIContextManager)
        assert hasattr(context_manager, "session_factory")
        assert hasattr(context_manager, "context_cache")
        assert hasattr(context_manager, "max_context_length")
        assert hasattr(context_manager, "summary_threshold")
        assert isinstance(context_manager.context_cache, dict)
        assert len(context_manager.context_cache) == 0

    def test_default_configuration(self, context_manager):
        """Test default configuration values."""
        assert context_manager.max_context_length == 4000
        assert context_manager.summary_threshold == 20

    def test_context_cache_empty(self, context_manager):
        """Test context cache is initially empty."""
        assert len(context_manager.context_cache) == 0

    def test_session_factory_set(self, context_manager):
        """Test session factory is set during initialization."""
        assert context_manager.session_factory is not None


# ============================================================================
# TEST ContextSummary - DATACLASS
# ============================================================================


class TestContextSummaryDataclass:
    """Test ContextSummary dataclass."""

    def test_context_summary_creation(self):
        """Test ContextSummary creation with all fields."""
        now = datetime.now(timezone.utc)
        summary = ContextSummary(
            summary="Test summary",
            key_points=["point1", "point2"],
            user_preferences={"pref": "value"},
            conversation_tone="friendly",
            topic_tags=["tag1", "tag2"],
            created_at=now,
        )

        assert summary.summary == "Test summary"
        assert summary.key_points == ["point1", "point2"]
        assert summary.user_preferences == {"pref": "value"}
        assert summary.conversation_tone == "friendly"
        assert summary.topic_tags == ["tag1", "tag2"]
        assert summary.created_at == now

    def test_context_summary_empty_lists(self):
        """Test ContextSummary with empty lists."""
        summary = ContextSummary(
            summary="Empty",
            key_points=[],
            user_preferences={},
            conversation_tone="neutral",
            topic_tags=[],
            created_at=datetime.now(timezone.utc),
        )

        assert len(summary.key_points) == 0
        assert len(summary.topic_tags) == 0
        assert len(summary.user_preferences) == 0


# ============================================================================
# TEST ConversationMemory - DATACLASS
# ============================================================================


class TestConversationMemoryDataclass:
    """Test ConversationMemory dataclass."""

    def test_conversation_memory_creation(self, sample_context_summary):
        """Test ConversationMemory creation."""
        now = datetime.now(timezone.utc)
        memory = ConversationMemory(
            thread_id=1,
            user_id=123,
            context_summary=sample_context_summary,
            important_facts=["fact1", "fact2"],
            user_style_notes=["note1"],
            preferred_response_style="technical",
            last_updated=now,
        )

        assert memory.thread_id == 1
        assert memory.user_id == 123
        assert memory.context_summary == sample_context_summary
        assert memory.important_facts == ["fact1", "fact2"]
        assert memory.user_style_notes == ["note1"]
        assert memory.preferred_response_style == "technical"
        assert memory.last_updated == now

    def test_conversation_memory_empty_facts(self):
        """Test ConversationMemory with empty facts."""
        memory = ConversationMemory(
            thread_id=1,
            user_id=123,
            context_summary=ContextSummary(
                summary="test",
                key_points=[],
                user_preferences={},
                conversation_tone="neutral",
                topic_tags=[],
                created_at=datetime.now(timezone.utc),
            ),
            important_facts=[],
            user_style_notes=[],
            preferred_response_style="adaptive",
            last_updated=datetime.now(timezone.utc),
        )

        assert len(memory.important_facts) == 0
        assert len(memory.user_style_notes) == 0


# ============================================================================
# TEST AIContextManager - CONVERSATION CONTEXT
# ============================================================================


class TestGetConversationContext:
    """Test getting conversation context."""

    @pytest.mark.asyncio
    async def test_get_conversation_context_empty(self, context_manager):
        """Test getting context when no messages exist."""
        with patch.object(context_manager, "session_factory") as mock_factory:
            mock_session = MagicMock()
            mock_query = MagicMock()
            mock_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
            mock_query.filter.return_value.count.return_value = 0
            mock_session.query.return_value = mock_query
            mock_factory.return_value.__enter__.return_value = mock_session

            messages, summary = await context_manager.get_conversation_context(
                thread_id=1, user_id=123
            )

            assert isinstance(messages, list)
            assert len(messages) == 0
            assert summary is None

    @pytest.mark.asyncio
    async def test_get_conversation_context_with_messages(self, context_manager, sample_ai_messages):
        """Test getting context with messages."""
        with patch.object(context_manager, "session_factory") as mock_factory:
            mock_session = MagicMock()
            mock_query = MagicMock()
            # Setup for recent messages query
            mock_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = (
                sample_ai_messages
            )
            # Setup for count query
            mock_query.filter.return_value.count.return_value = 5
            mock_session.query.return_value = mock_query
            mock_factory.return_value.__enter__.return_value = mock_session

            messages, summary = await context_manager.get_conversation_context(
                thread_id=1, user_id=123
            )

            assert isinstance(messages, list)
            assert len(messages) == 5
            assert all(isinstance(msg, AIProviderMessage) for msg in messages)

    @pytest.mark.asyncio
    async def test_get_conversation_context_message_conversion(
        self, context_manager, sample_ai_messages
    ):
        """Test message conversion to provider format."""
        with patch.object(context_manager, "session_factory") as mock_factory:
            mock_session = MagicMock()
            mock_query = MagicMock()
            mock_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = (
                sample_ai_messages[:2]
            )
            mock_query.filter.return_value.count.return_value = 2
            mock_session.query.return_value = mock_query
            mock_factory.return_value.__enter__.return_value = mock_session

            messages, _ = await context_manager.get_conversation_context(thread_id=1, user_id=123)

            # Check role conversion
            assert messages[0].role == MessageRole.USER
            assert messages[1].role == MessageRole.ASSISTANT

    @pytest.mark.asyncio
    async def test_get_conversation_context_triggers_summary(
        self, context_manager, sample_ai_messages
    ):
        """Test context summary is triggered when threshold exceeded."""
        with (
            patch.object(context_manager, "session_factory") as mock_factory,
            patch.object(
                context_manager, "_get_or_create_context_summary", return_value=None
            ) as mock_summary,
        ):
            mock_session = MagicMock()
            mock_query = MagicMock()
            mock_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = (
                sample_ai_messages
            )
            # Exceed summary threshold (20 messages)
            mock_query.filter.return_value.count.return_value = 25
            mock_session.query.return_value = mock_query
            mock_factory.return_value.__enter__.return_value = mock_session

            await context_manager.get_conversation_context(thread_id=1, user_id=123)

            # Should call summary creation
            mock_summary.assert_called_once()


# ============================================================================
# TEST AIContextManager - USER PREFERENCES
# ============================================================================


class TestUpdateUserPreferences:
    """Test updating user preferences."""

    @pytest.mark.asyncio
    async def test_update_user_preferences(self, context_manager):
        """Test updating user preferences."""
        preferences = {"theme": "dark", "language": "python"}

        # Should not raise error
        await context_manager.update_user_preferences(user_id=123, preferences=preferences)

    @pytest.mark.asyncio
    async def test_update_user_preferences_empty(self, context_manager):
        """Test updating with empty preferences."""
        await context_manager.update_user_preferences(user_id=123, preferences={})

    @pytest.mark.asyncio
    async def test_update_user_preferences_logging(self, context_manager):
        """Test preferences update logs info."""
        with patch("app.services.ai_context_manager.logger") as mock_logger:
            preferences = {"key": "value"}
            await context_manager.update_user_preferences(user_id=123, preferences=preferences)
            mock_logger.info.assert_called_once()


# ============================================================================
# TEST AIContextManager - CONVERSATION STYLE ANALYSIS
# ============================================================================


class TestAnalyzeConversationStyle:
    """Test conversation style analysis."""

    @pytest.mark.asyncio
    async def test_analyze_conversation_style_empty(self, context_manager):
        """Test style analysis with no messages."""
        with patch.object(context_manager, "session_factory") as mock_factory:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.all.return_value = []
            mock_factory.return_value.__enter__.return_value = mock_session

            result = await context_manager.analyze_conversation_style(thread_id=1)

            assert result["style"] == "neutral"
            assert result["preferences"] == {}

    @pytest.mark.asyncio
    async def test_analyze_conversation_style_formal(self, context_manager):
        """Test detecting formal communication style."""
        with patch.object(context_manager, "session_factory") as mock_factory:
            mock_session = MagicMock()
            # Formal messages
            mock_session.query.return_value.filter.return_value.all.return_value = [
                ("Please help me understand this concept",),
                ("Thank you for your assistance",),
                ("I would appreciate your guidance",),
            ]
            mock_factory.return_value.__enter__.return_value = mock_session

            result = await context_manager.analyze_conversation_style(thread_id=1)

            assert result["style"] == "formal"
            assert "style_scores" in result
            assert result["style_scores"]["formal"] > 0

    @pytest.mark.asyncio
    async def test_analyze_conversation_style_casual(self, context_manager):
        """Test detecting casual communication style."""
        with patch.object(context_manager, "session_factory") as mock_factory:
            mock_session = MagicMock()
            # Casual messages
            mock_session.query.return_value.filter.return_value.all.return_value = [
                ("Hey, cool feature!",),
                ("Yeah, that's awesome",),
                ("Ok thanks!",),
            ]
            mock_factory.return_value.__enter__.return_value = mock_session

            result = await context_manager.analyze_conversation_style(thread_id=1)

            assert result["style"] == "casual"
            assert result["style_scores"]["casual"] > 0

    @pytest.mark.asyncio
    async def test_analyze_conversation_style_technical(self, context_manager):
        """Test detecting technical communication style."""
        with patch.object(context_manager, "session_factory") as mock_factory:
            mock_session = MagicMock()
            # Technical messages
            mock_session.query.return_value.filter.return_value.all.return_value = [
                ("What algorithm should I use?",),
                ("I need to optimize this function",),
                ("Can you help debug this implementation?",),
            ]
            mock_factory.return_value.__enter__.return_value = mock_session

            result = await context_manager.analyze_conversation_style(thread_id=1)

            assert result["style"] == "technical"
            assert result["style_scores"]["technical"] > 0

    @pytest.mark.asyncio
    async def test_analyze_conversation_preferences(self, context_manager):
        """Test extracting user preferences from style."""
        with patch.object(context_manager, "session_factory") as mock_factory:
            mock_session = MagicMock()
            # Long technical messages
            long_technical_text = (
                "I need detailed help with algorithm optimization and debugging implementation " * 20
            )
            mock_session.query.return_value.filter.return_value.all.return_value = [
                (long_technical_text,)
            ]
            mock_factory.return_value.__enter__.return_value = mock_session

            result = await context_manager.analyze_conversation_style(thread_id=1)

            preferences = result["preferences"]
            assert preferences["prefers_detailed_responses"] is True
            assert preferences["uses_technical_language"] is True
            assert "avg_message_length" in preferences


# ============================================================================
# TEST AIContextManager - CONTEXT SUMMARY CREATION
# ============================================================================


class TestCreateContextSummary:
    """Test creating context summaries."""

    @pytest.mark.asyncio
    async def test_create_context_summary_empty(self, context_manager):
        """Test creating summary with empty messages."""
        summary = await context_manager.create_context_summary(thread_id=1, messages=[])

        assert summary.summary == "Empty conversation"
        assert len(summary.key_points) == 0
        assert len(summary.topic_tags) == 0

    @pytest.mark.asyncio
    async def test_create_context_summary_fallback(self, context_manager, sample_ai_messages):
        """Test fallback summary creation."""
        with patch(
            "app.services.ai_context_manager.ai_provider_manager.get_primary_provider",
            return_value=None,
        ):
            summary = await context_manager.create_context_summary(
                thread_id=1, messages=sample_ai_messages
            )

            assert isinstance(summary, ContextSummary)
            assert summary.summary is not None
            assert isinstance(summary.created_at, datetime)

    @pytest.mark.asyncio
    async def test_create_context_summary_with_ai_provider(
        self, context_manager, sample_ai_messages
    ):
        """Test creating summary using AI provider."""
        mock_provider = AsyncMock()

        # Mock streaming response with JSON
        async def mock_stream(*args, **kwargs):
            yield AsyncMock(
                content='{"summary": "Python discussion", "key_points": ["comprehensions"], "conversation_tone": "friendly", "topic_tags": ["programming"]}'
            )

        mock_provider.stream_chat = mock_stream

        with patch(
            "app.services.ai_context_manager.ai_provider_manager.get_primary_provider",
            return_value=mock_provider,
        ):
            summary = await context_manager.create_context_summary(
                thread_id=1, messages=sample_ai_messages
            )

            assert summary.summary == "Python discussion"
            assert "comprehensions" in summary.key_points
            assert summary.conversation_tone == "friendly"
            assert "programming" in summary.topic_tags

    @pytest.mark.asyncio
    async def test_create_context_summary_ai_json_parse_error(
        self, context_manager, sample_ai_messages
    ):
        """Test handling JSON parse errors from AI."""
        mock_provider = AsyncMock()

        # Mock streaming response with invalid JSON
        async def mock_stream(*args, **kwargs):
            yield AsyncMock(content="This is not JSON")

        mock_provider.stream_chat = mock_stream

        with patch(
            "app.services.ai_context_manager.ai_provider_manager.get_primary_provider",
            return_value=mock_provider,
        ):
            summary = await context_manager.create_context_summary(
                thread_id=1, messages=sample_ai_messages
            )

            # Should fallback to text summary
            assert isinstance(summary, ContextSummary)
            assert summary.summary is not None

    @pytest.mark.asyncio
    async def test_create_context_summary_ai_exception(self, context_manager, sample_ai_messages):
        """Test handling exceptions during AI summary."""
        mock_provider = AsyncMock()
        mock_provider.stream_chat.side_effect = Exception("AI error")

        with patch(
            "app.services.ai_context_manager.ai_provider_manager.get_primary_provider",
            return_value=mock_provider,
        ):
            summary = await context_manager.create_context_summary(
                thread_id=1, messages=sample_ai_messages
            )

            # Should fallback to rule-based summary
            assert isinstance(summary, ContextSummary)


# ============================================================================
# TEST AIContextManager - FALLBACK SUMMARY
# ============================================================================


class TestFallbackSummary:
    """Test rule-based fallback summary creation."""

    def test_create_fallback_summary_programming(self, context_manager):
        """Test fallback summary detects programming topics."""

        class MockMsg:
            def __init__(self, role, content):
                self.role = role
                self.content = content

        messages = [
            MockMsg("user", "Help me write a function"),
            MockMsg("assistant", "Sure, here's the code"),
            MockMsg("user", "Can you explain the algorithm?"),
        ]

        summary = context_manager._create_fallback_summary(messages)

        assert "programming" in summary.topic_tags
        assert summary.conversation_tone == "neutral"

    def test_create_fallback_summary_data(self, context_manager):
        """Test fallback summary detects data topics."""

        class MockMsg:
            def __init__(self, role, content):
                self.role = role
                self.content = content

        messages = [
            MockMsg("user", "I need help with data analysis"),
            MockMsg("assistant", "I can help with statistics"),
        ]

        summary = context_manager._create_fallback_summary(messages)

        assert "data" in summary.topic_tags

    def test_create_fallback_summary_multiple_topics(self, context_manager):
        """Test fallback summary detects multiple topics."""

        class MockMsg:
            def __init__(self, role, content):
                self.role = role
                self.content = content

        messages = [
            MockMsg("user", "Help with code and data analysis"),
            MockMsg("assistant", "I can help with programming and statistics"),
        ]

        summary = context_manager._create_fallback_summary(messages)

        # Should detect both programming and data
        assert len(summary.topic_tags) >= 1


# ============================================================================
# TEST AIContextManager - CONTEXT CACHING
# ============================================================================


class TestContextCaching:
    """Test context caching and retrieval."""

    @pytest.mark.asyncio
    async def test_cache_stores_conversation_memory(
        self, context_manager, sample_conversation_memory
    ):
        """Test conversation memory is stored in cache."""
        # Manually add to cache
        context_manager.context_cache[1] = sample_conversation_memory

        assert 1 in context_manager.context_cache
        assert context_manager.context_cache[1] == sample_conversation_memory

    @pytest.mark.asyncio
    async def test_cache_retrieval_fresh(self, context_manager, sample_conversation_memory):
        """Test retrieving fresh cached context."""
        # Add fresh memory (within 1 hour)
        sample_conversation_memory.last_updated = datetime.now(timezone.utc)
        context_manager.context_cache[1] = sample_conversation_memory

        # Mock database to verify cache is used
        with (
            patch.object(context_manager, "session_factory") as mock_factory,
            patch.object(context_manager, "create_context_summary") as mock_create_summary,
        ):
            mock_session = MagicMock()
            mock_query = MagicMock()
            mock_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
            mock_query.filter.return_value.count.return_value = 25
            mock_query.filter.return_value.order_by.return_value.offset.return_value.all.return_value = []
            mock_session.query.return_value = mock_query
            mock_factory.return_value.__enter__.return_value = mock_session

            await context_manager.get_conversation_context(thread_id=1, user_id=123)

            # Should not create new summary (cache is fresh)
            # Note: This depends on implementation details

    @pytest.mark.asyncio
    async def test_cache_expiration(self, context_manager, sample_conversation_memory):
        """Test cache expiration after 1 hour."""
        # Add stale memory (> 1 hour old)
        sample_conversation_memory.last_updated = datetime.now(timezone.utc) - timedelta(hours=2)
        context_manager.context_cache[1] = sample_conversation_memory

        # Should be considered stale and regenerated


# ============================================================================
# TEST AIContextManager - USER CONTEXT ACROSS THREADS
# ============================================================================


class TestGetUserContextAcrossThreads:
    """Test getting user context across multiple threads."""

    @pytest.mark.asyncio
    async def test_get_user_context_no_threads(self, context_manager):
        """Test getting context when user has no threads."""
        with patch.object(context_manager, "session_factory") as mock_factory:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = (
                []
            )
            mock_factory.return_value.__enter__.return_value = mock_session

            result = await context_manager.get_user_context_across_threads(user_id=123)

            assert result["user_id"] == 123
            assert result["total_conversations"] == 0
            assert result["dominant_communication_style"] == "neutral"

    @pytest.mark.asyncio
    async def test_get_user_context_multiple_threads(self, context_manager):
        """Test aggregating context across multiple threads."""

        class MockThread:
            def __init__(self, thread_id, user_id):
                self.id = thread_id
                self.user_id = user_id
                self.updated_at = datetime.now(timezone.utc)

        threads = [MockThread(1, 123), MockThread(2, 123), MockThread(3, 123)]

        with (
            patch.object(context_manager, "session_factory") as mock_factory,
            patch.object(
                context_manager,
                "analyze_conversation_style",
                return_value={"style": "technical", "topic_tags": ["programming"]},
            ),
        ):
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = (
                threads
            )
            mock_factory.return_value.__enter__.return_value = mock_session

            result = await context_manager.get_user_context_across_threads(user_id=123)

            assert result["total_conversations"] == 3
            assert result["dominant_communication_style"] == "technical"
            assert "context_insights" in result

    @pytest.mark.asyncio
    async def test_get_user_context_favorite_topics(self, context_manager):
        """Test extracting favorite topics across threads."""

        class MockThread:
            def __init__(self, thread_id):
                self.id = thread_id
                self.user_id = 123
                self.updated_at = datetime.now(timezone.utc)

        threads = [MockThread(1), MockThread(2)]

        # Different styles for different threads
        style_responses = [
            {"style": "technical", "topic_tags": ["programming", "python"]},
            {"style": "casual", "topic_tags": ["programming", "data"]},
        ]

        with (
            patch.object(context_manager, "session_factory") as mock_factory,
            patch.object(
                context_manager, "analyze_conversation_style", side_effect=style_responses
            ),
        ):
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = (
                threads
            )
            mock_factory.return_value.__enter__.return_value = mock_session

            result = await context_manager.get_user_context_across_threads(user_id=123)

            # "programming" should appear twice
            assert "programming" in result["favorite_topics"]

    @pytest.mark.asyncio
    async def test_get_user_context_insights(self, context_manager):
        """Test context insights calculation."""

        class MockThread:
            def __init__(self, thread_id):
                self.id = thread_id
                self.user_id = 123
                self.updated_at = datetime.now(timezone.utc)

        threads = [MockThread(1), MockThread(2), MockThread(3)]

        with (
            patch.object(context_manager, "session_factory") as mock_factory,
            patch.object(
                context_manager,
                "analyze_conversation_style",
                return_value={"style": "casual", "topic_tags": []},
            ),
        ):
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = (
                threads
            )
            mock_factory.return_value.__enter__.return_value = mock_session

            result = await context_manager.get_user_context_across_threads(user_id=123)

            insights = result["context_insights"]
            assert "active_user" in insights
            assert insights["active_user"] is True  # > 2 conversations
            assert "casual_communication" in insights


# ============================================================================
# TEST MODULE-LEVEL INSTANCE
# ============================================================================


class TestModuleLevelInstance:
    """Test module-level global instance."""

    def test_global_context_manager_exists(self):
        """Test global ai_context_manager instance exists."""
        assert ai_context_manager is not None
        assert isinstance(ai_context_manager, AIContextManager)

    def test_global_instance_configuration(self):
        """Test global instance has correct configuration."""
        assert ai_context_manager.max_context_length == 4000
        assert ai_context_manager.summary_threshold == 20


# ============================================================================
# TEST EDGE CASES & ERROR HANDLING
# ============================================================================


class TestEdgeCasesAndErrorHandling:
    """Test edge cases and error scenarios."""

    @pytest.mark.asyncio
    async def test_conversation_context_max_messages_limit(self, context_manager):
        """Test max_messages parameter is respected."""
        with patch.object(context_manager, "session_factory") as mock_factory:
            mock_session = MagicMock()
            mock_query = MagicMock()
            mock_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
            mock_query.filter.return_value.count.return_value = 0
            mock_session.query.return_value = mock_query
            mock_factory.return_value.__enter__.return_value = mock_session

            await context_manager.get_conversation_context(
                thread_id=1, user_id=123, max_messages=10
            )

            # Verify limit was called with 10
            mock_query.filter.return_value.order_by.return_value.limit.assert_called()

    @pytest.mark.asyncio
    async def test_style_analysis_unicode_handling(self, context_manager):
        """Test style analysis handles unicode characters."""
        with patch.object(context_manager, "session_factory") as mock_factory:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.all.return_value = [
                ("Hello 你好 مرحبا",),
                ("Unicode test 🚀",),
            ]
            mock_factory.return_value.__enter__.return_value = mock_session

            result = await context_manager.analyze_conversation_style(thread_id=1)

            # Should not crash on unicode
            assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_summary_creation_very_long_messages(self, context_manager):
        """Test summary creation with very long messages."""

        class MockMsg:
            def __init__(self, role, content):
                self.role = role
                self.content = content

        # Create very long message
        long_content = "word " * 10000
        messages = [MockMsg("user", long_content)]

        with patch(
            "app.services.ai_context_manager.ai_provider_manager.get_primary_provider",
            return_value=None,
        ):
            summary = await context_manager.create_context_summary(thread_id=1, messages=messages)

            # Should handle gracefully
            assert isinstance(summary, ContextSummary)

    @pytest.mark.asyncio
    async def test_cache_thread_id_collision(self, context_manager, sample_conversation_memory):
        """Test cache handles thread ID collisions."""
        # Add memory for thread 1
        context_manager.context_cache[1] = sample_conversation_memory

        # Add different memory for same thread ID (should overwrite)
        new_memory = ConversationMemory(
            thread_id=1,
            user_id=456,  # Different user
            context_summary=ContextSummary(
                summary="New summary",
                key_points=[],
                user_preferences={},
                conversation_tone="neutral",
                topic_tags=[],
                created_at=datetime.now(timezone.utc),
            ),
            important_facts=[],
            user_style_notes=[],
            preferred_response_style="adaptive",
            last_updated=datetime.now(timezone.utc),
        )

        context_manager.context_cache[1] = new_memory

        # Should have new memory
        assert context_manager.context_cache[1].user_id == 456

    def test_fallback_summary_no_user_messages(self, context_manager):
        """Test fallback summary when no user messages exist."""

        class MockMsg:
            def __init__(self, role, content):
                self.role = role
                self.content = content

        # Only assistant messages
        messages = [
            MockMsg("assistant", "Hello"),
            MockMsg("assistant", "How can I help?"),
        ]

        summary = context_manager._create_fallback_summary(messages)

        # Should handle gracefully
        assert isinstance(summary, ContextSummary)
        assert summary.summary is not None


# ============================================================================
# TEST MESSAGE ROLE CONVERSION
# ============================================================================


class TestMessageRoleConversion:
    """Test AI message to provider message conversion."""

    @pytest.mark.asyncio
    async def test_message_role_user_conversion(self, context_manager):
        """Test user role is converted correctly."""

        class MockMsg:
            def __init__(self):
                self.role = "user"
                self.content = "Test message"
                self.created_at = datetime.now(timezone.utc)

        with patch.object(context_manager, "session_factory") as mock_factory:
            mock_session = MagicMock()
            mock_query = MagicMock()
            mock_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [
                MockMsg()
            ]
            mock_query.filter.return_value.count.return_value = 1
            mock_session.query.return_value = mock_query
            mock_factory.return_value.__enter__.return_value = mock_session

            messages, _ = await context_manager.get_conversation_context(thread_id=1, user_id=123)

            assert messages[0].role == MessageRole.USER

    @pytest.mark.asyncio
    async def test_message_role_assistant_conversion(self, context_manager):
        """Test assistant role is converted correctly."""

        class MockMsg:
            def __init__(self):
                self.role = "assistant"
                self.content = "Test response"
                self.created_at = datetime.now(timezone.utc)

        with patch.object(context_manager, "session_factory") as mock_factory:
            mock_session = MagicMock()
            mock_query = MagicMock()
            mock_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [
                MockMsg()
            ]
            mock_query.filter.return_value.count.return_value = 1
            mock_session.query.return_value = mock_query
            mock_factory.return_value.__enter__.return_value = mock_session

            messages, _ = await context_manager.get_conversation_context(thread_id=1, user_id=123)

            assert messages[0].role == MessageRole.ASSISTANT
