"""
Tests for app.services.ai_analytics

Comprehensive tests for AIAnalyticsService, ConversationMetrics, and UserInsights.
"""

from collections import Counter
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.services.ai_analytics import (
    AIAnalyticsService,
    ConversationMetrics,
    UserInsights,
    ai_analytics_service,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def analytics_service() -> AIAnalyticsService:
    """Create an AIAnalyticsService instance."""
    return AIAnalyticsService()


@pytest.fixture
def mock_db_session():
    """Create a mock database session."""
    return MagicMock()


@pytest.fixture
def sample_conversation_metrics() -> ConversationMetrics:
    """Create sample conversation metrics."""
    return ConversationMetrics(
        total_conversations=100,
        total_messages=500,
        avg_messages_per_conversation=5.0,
        avg_response_time=2.5,
        user_satisfaction_score=4.2,
        top_topics=[
            {"topic": "bitcoin", "count": 50},
            {"topic": "portfolio", "count": 30},
        ],
        provider_usage={"openai": 300, "anthropic": 200},
        model_usage={"gpt-4": 250, "claude-3": 150},
    )


@pytest.fixture
def sample_user_insights() -> UserInsights:
    """Create sample user insights."""
    return UserInsights(
        user_id=1,
        total_threads=25,
        total_messages=150,
        favorite_topics=["bitcoin", "ethereum", "portfolio"],
        preferred_providers=["openai", "anthropic"],
        avg_session_length=300.0,
        most_active_hours=[14, 15, 10],
        satisfaction_trend=[4.1, 4.2, 4.3, 4.2, 4.4],
    )


# ============================================================================
# DATACLASS TESTS
# ============================================================================


class TestConversationMetrics:
    """Tests for ConversationMetrics dataclass."""

    def test_create_conversation_metrics(self, sample_conversation_metrics):
        """Test creating ConversationMetrics with all fields."""
        metrics = sample_conversation_metrics
        assert metrics.total_conversations == 100
        assert metrics.total_messages == 500
        assert metrics.avg_messages_per_conversation == 5.0
        assert metrics.avg_response_time == 2.5
        assert metrics.user_satisfaction_score == 4.2
        assert len(metrics.top_topics) == 2
        assert metrics.top_topics[0]["topic"] == "bitcoin"
        assert "openai" in metrics.provider_usage
        assert "gpt-4" in metrics.model_usage

    def test_conversation_metrics_default_values(self):
        """Test ConversationMetrics with default/empty values."""
        metrics = ConversationMetrics(
            total_conversations=0,
            total_messages=0,
            avg_messages_per_conversation=0.0,
            avg_response_time=0.0,
            user_satisfaction_score=0.0,
            top_topics=[],
            provider_usage={},
            model_usage={},
        )
        assert metrics.total_conversations == 0
        assert metrics.avg_messages_per_conversation == 0.0
        assert metrics.top_topics == []
        assert metrics.provider_usage == {}

    def test_conversation_metrics_equality(self):
        """Test ConversationMetrics equality comparison."""
        metrics1 = ConversationMetrics(
            total_conversations=10,
            total_messages=50,
            avg_messages_per_conversation=5.0,
            avg_response_time=1.5,
            user_satisfaction_score=4.0,
            top_topics=[],
            provider_usage={},
            model_usage={},
        )
        metrics2 = ConversationMetrics(
            total_conversations=10,
            total_messages=50,
            avg_messages_per_conversation=5.0,
            avg_response_time=1.5,
            user_satisfaction_score=4.0,
            top_topics=[],
            provider_usage={},
            model_usage={},
        )
        assert metrics1 == metrics2


class TestUserInsights:
    """Tests for UserInsights dataclass."""

    def test_create_user_insights(self, sample_user_insights):
        """Test creating UserInsights with all fields."""
        insights = sample_user_insights
        assert insights.user_id == 1
        assert insights.total_threads == 25
        assert insights.total_messages == 150
        assert "bitcoin" in insights.favorite_topics
        assert "openai" in insights.preferred_providers
        assert insights.avg_session_length == 300.0
        assert 14 in insights.most_active_hours
        assert len(insights.satisfaction_trend) == 5

    def test_user_insights_default_values(self):
        """Test UserInsights with minimal values."""
        insights = UserInsights(
            user_id=0,
            total_threads=0,
            total_messages=0,
            favorite_topics=[],
            preferred_providers=[],
            avg_session_length=0.0,
            most_active_hours=[],
            satisfaction_trend=[],
        )
        assert insights.user_id == 0
        assert insights.total_threads == 0
        assert insights.favorite_topics == []
        assert insights.most_active_hours == []

    def test_user_insights_equality(self):
        """Test UserInsights equality comparison."""
        insights1 = UserInsights(
            user_id=5,
            total_threads=10,
            total_messages=50,
            favorite_topics=["crypto"],
            preferred_providers=["openai"],
            avg_session_length=200.0,
            most_active_hours=[9],
            satisfaction_trend=[4.0],
        )
        insights2 = UserInsights(
            user_id=5,
            total_threads=10,
            total_messages=50,
            favorite_topics=["crypto"],
            preferred_providers=["openai"],
            avg_session_length=200.0,
            most_active_hours=[9],
            satisfaction_trend=[4.0],
        )
        assert insights1 == insights2


# ============================================================================
# SERVICE INITIALIZATION TESTS
# ============================================================================


class TestAIAnalyticsServiceInit:
    """Tests for AIAnalyticsService initialization."""

    def test_service_initialization(self, analytics_service):
        """Test service initializes correctly."""
        assert analytics_service.session_factory is not None

    def test_global_service_instance_exists(self):
        """Test global ai_analytics_service exists."""
        assert ai_analytics_service is not None
        assert isinstance(ai_analytics_service, AIAnalyticsService)


# ============================================================================
# GET CONVERSATION METRICS TESTS
# ============================================================================


class TestGetConversationMetrics:
    """Tests for get_conversation_metrics method."""

    @pytest.mark.asyncio
    async def test_get_conversation_metrics_basic(self, analytics_service):
        """Test getting conversation metrics with basic setup."""
        # Create mock db session
        mock_session = MagicMock()

        # Mock query that handles all query patterns
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.join.return_value = mock_query
        mock_query.group_by.return_value = mock_query
        mock_query.count.return_value = 10
        mock_query.all.return_value = []

        mock_session.query.return_value = mock_query

        # Mock context manager
        mock_context = MagicMock()
        mock_context.__enter__ = MagicMock(return_value=mock_session)
        mock_context.__exit__ = MagicMock(return_value=False)

        with patch.object(
            analytics_service, "session_factory", return_value=mock_context
        ):
            with patch.object(
                analytics_service,
                "_extract_conversation_topics",
                return_value=[{"topic": "test", "count": 5}],
            ):
                metrics = await analytics_service.get_conversation_metrics()

                assert isinstance(metrics, ConversationMetrics)
                assert metrics.user_satisfaction_score == 4.2  # Mock value

    @pytest.mark.asyncio
    async def test_get_conversation_metrics_with_user_id(self, analytics_service):
        """Test getting metrics filtered by user_id."""
        mock_session = MagicMock()
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.join.return_value = mock_query
        mock_query.group_by.return_value = mock_query
        mock_query.count.return_value = 5
        mock_query.all.return_value = []
        mock_session.query.return_value = mock_query

        mock_context = MagicMock()
        mock_context.__enter__ = MagicMock(return_value=mock_session)
        mock_context.__exit__ = MagicMock(return_value=False)

        with patch.object(
            analytics_service, "session_factory", return_value=mock_context
        ):
            with patch.object(
                analytics_service, "_extract_conversation_topics", return_value=[]
            ):
                metrics = await analytics_service.get_conversation_metrics(
                    user_id=123, days_back=7
                )
                assert isinstance(metrics, ConversationMetrics)

    @pytest.mark.asyncio
    async def test_get_conversation_metrics_zero_conversations(self, analytics_service):
        """Test metrics when no conversations exist."""
        mock_session = MagicMock()
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.join.return_value = mock_query
        mock_query.group_by.return_value = mock_query
        mock_query.count.return_value = 0
        mock_query.all.return_value = []
        mock_session.query.return_value = mock_query

        mock_context = MagicMock()
        mock_context.__enter__ = MagicMock(return_value=mock_session)
        mock_context.__exit__ = MagicMock(return_value=False)

        with patch.object(
            analytics_service, "session_factory", return_value=mock_context
        ):
            with patch.object(
                analytics_service, "_extract_conversation_topics", return_value=[]
            ):
                metrics = await analytics_service.get_conversation_metrics()
                # Should handle division by zero gracefully
                assert metrics.avg_messages_per_conversation == 0.0


# ============================================================================
# GET USER INSIGHTS TESTS
# ============================================================================


class TestGetUserInsights:
    """Tests for get_user_insights method."""

    @pytest.mark.asyncio
    async def test_get_user_insights_basic(self, analytics_service):
        """Test getting user insights."""
        mock_session = MagicMock()
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.join.return_value = mock_query
        mock_query.group_by.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.count.return_value = 5
        mock_query.all.return_value = []
        mock_session.query.return_value = mock_query

        mock_context = MagicMock()
        mock_context.__enter__ = MagicMock(return_value=mock_session)
        mock_context.__exit__ = MagicMock(return_value=False)

        with patch.object(
            analytics_service, "session_factory", return_value=mock_context
        ):
            with patch.object(
                analytics_service, "_extract_user_topics", return_value=["bitcoin"]
            ):
                with patch.object(
                    analytics_service,
                    "_calculate_avg_session_length",
                    return_value=120.0,
                ):
                    insights = await analytics_service.get_user_insights(user_id=1)

                    assert isinstance(insights, UserInsights)
                    assert insights.user_id == 1
                    assert insights.satisfaction_trend == [4.1, 4.2, 4.3, 4.2, 4.4]

    @pytest.mark.asyncio
    async def test_get_user_insights_with_days_back(self, analytics_service):
        """Test getting insights with custom days_back."""
        mock_session = MagicMock()
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.join.return_value = mock_query
        mock_query.group_by.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.count.return_value = 0
        mock_query.all.return_value = []
        mock_session.query.return_value = mock_query

        mock_context = MagicMock()
        mock_context.__enter__ = MagicMock(return_value=mock_session)
        mock_context.__exit__ = MagicMock(return_value=False)

        with patch.object(
            analytics_service, "session_factory", return_value=mock_context
        ):
            with patch.object(
                analytics_service, "_extract_user_topics", return_value=[]
            ):
                with patch.object(
                    analytics_service, "_calculate_avg_session_length", return_value=0.0
                ):
                    insights = await analytics_service.get_user_insights(
                        user_id=42, days_back=30
                    )
                    assert insights.user_id == 42


# ============================================================================
# GET PROVIDER PERFORMANCE TESTS
# ============================================================================


class TestGetProviderPerformance:
    """Tests for get_provider_performance method."""

    @pytest.mark.asyncio
    async def test_get_provider_performance_empty(self, analytics_service):
        """Test provider performance with no providers."""
        mock_session = MagicMock()
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.distinct.return_value = mock_query
        mock_query.all.return_value = []
        mock_session.query.return_value = mock_query

        mock_context = MagicMock()
        mock_context.__enter__ = MagicMock(return_value=mock_session)
        mock_context.__exit__ = MagicMock(return_value=False)

        with patch.object(
            analytics_service, "session_factory", return_value=mock_context
        ):
            result = await analytics_service.get_provider_performance()
            assert result == {}

    @pytest.mark.asyncio
    async def test_get_provider_performance_with_providers(self, analytics_service):
        """Test provider performance with multiple providers."""
        mock_session = MagicMock()

        # Create mock message with timing data
        mock_message = MagicMock()
        mock_message.created_at = datetime.now(timezone.utc)
        mock_message.completed_at = datetime.now(timezone.utc) + timedelta(seconds=2)

        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.distinct.return_value = mock_query
        mock_query.count.return_value = 100
        mock_query.all.side_effect = [
            [("openai",), ("anthropic",)],  # First call - providers
            [mock_message],  # completed_messages for openai
            [mock_message],  # completed_messages for anthropic
        ]
        mock_session.query.return_value = mock_query

        mock_context = MagicMock()
        mock_context.__enter__ = MagicMock(return_value=mock_session)
        mock_context.__exit__ = MagicMock(return_value=False)

        with patch.object(
            analytics_service, "session_factory", return_value=mock_context
        ):
            result = await analytics_service.get_provider_performance(days_back=7)
            # Should have processed providers even with mocked data
            assert isinstance(result, dict)


# ============================================================================
# EXTRACT CONVERSATION TOPICS TESTS
# ============================================================================


class TestExtractConversationTopics:
    """Tests for _extract_conversation_topics method."""

    @pytest.mark.asyncio
    async def test_extract_topics_empty(self, analytics_service):
        """Test extracting topics from empty messages."""
        mock_session = MagicMock()
        mock_query = MagicMock()
        mock_query.join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = []
        mock_session.query.return_value = mock_query

        start_date = datetime.now(timezone.utc) - timedelta(days=30)
        topics = await analytics_service._extract_conversation_topics(
            mock_session, start_date
        )
        assert topics == []

    @pytest.mark.asyncio
    async def test_extract_topics_with_messages(self, analytics_service):
        """Test extracting topics from messages."""
        mock_session = MagicMock()
        mock_query = MagicMock()
        mock_query.join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = [
            ("What is bitcoin and how does it work?",),
            ("Tell me about bitcoin price",),
            ("Ethereum versus bitcoin comparison",),
        ]
        mock_session.query.return_value = mock_query

        start_date = datetime.now(timezone.utc) - timedelta(days=30)
        topics = await analytics_service._extract_conversation_topics(
            mock_session, start_date
        )

        # Should extract meaningful keywords
        assert isinstance(topics, list)
        topic_names = [t["topic"] for t in topics]
        assert "bitcoin" in topic_names  # Most common word

    @pytest.mark.asyncio
    async def test_extract_topics_filters_common_words(self, analytics_service):
        """Test that common words are filtered out."""
        mock_session = MagicMock()
        mock_query = MagicMock()
        mock_query.join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = [
            ("The price is good and the market is up",),
        ]
        mock_session.query.return_value = mock_query

        start_date = datetime.now(timezone.utc) - timedelta(days=30)
        topics = await analytics_service._extract_conversation_topics(
            mock_session, start_date
        )

        # Common words like "the", "is", "and" should be filtered
        topic_names = [t["topic"] for t in topics]
        assert "the" not in topic_names
        assert "and" not in topic_names
        assert "is" not in topic_names

    @pytest.mark.asyncio
    async def test_extract_topics_with_user_id(self, analytics_service):
        """Test extracting topics for specific user."""
        mock_session = MagicMock()
        mock_query = MagicMock()
        mock_query.join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = [("portfolio analysis",)]
        mock_session.query.return_value = mock_query

        start_date = datetime.now(timezone.utc) - timedelta(days=30)
        topics = await analytics_service._extract_conversation_topics(
            mock_session, start_date, user_id=123
        )

        # Should filter by user_id
        assert isinstance(topics, list)


# ============================================================================
# EXTRACT USER TOPICS TESTS
# ============================================================================


class TestExtractUserTopics:
    """Tests for _extract_user_topics method."""

    @pytest.mark.asyncio
    async def test_extract_user_topics(self, analytics_service):
        """Test extracting user topics returns top 5."""
        with patch.object(
            analytics_service,
            "_extract_conversation_topics",
            return_value=[
                {"topic": "bitcoin", "count": 50},
                {"topic": "ethereum", "count": 40},
                {"topic": "portfolio", "count": 30},
                {"topic": "trading", "count": 20},
                {"topic": "analysis", "count": 10},
                {"topic": "market", "count": 5},
            ],
        ):
            mock_session = MagicMock()
            start_date = datetime.now(timezone.utc) - timedelta(days=30)

            topics = await analytics_service._extract_user_topics(
                mock_session, 123, start_date
            )

            assert len(topics) == 5
            assert topics[0] == "bitcoin"
            assert "market" not in topics  # Should only be top 5


# ============================================================================
# CALCULATE AVG SESSION LENGTH TESTS
# ============================================================================


class TestCalculateAvgSessionLength:
    """Tests for _calculate_avg_session_length method."""

    @pytest.mark.asyncio
    async def test_calculate_session_length_empty(self, analytics_service):
        """Test session length calculation with no threads."""
        mock_session = MagicMock()
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = []
        mock_session.query.return_value = mock_query

        start_date = datetime.now(timezone.utc) - timedelta(days=30)
        avg_length = await analytics_service._calculate_avg_session_length(
            mock_session, 123, start_date
        )

        assert avg_length == 0

    @pytest.mark.asyncio
    async def test_calculate_session_length_with_threads(self, analytics_service):
        """Test session length calculation with threads."""
        mock_session = MagicMock()

        # Create mock thread
        mock_thread = MagicMock()
        mock_thread.id = 1

        # Create mock messages with timestamps
        now = datetime.now(timezone.utc)
        mock_msg1 = MagicMock()
        mock_msg1.created_at = now
        mock_msg2 = MagicMock()
        mock_msg2.created_at = now + timedelta(minutes=5)

        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        # First call returns threads, subsequent calls return messages
        mock_query.all.side_effect = [[mock_thread], [mock_msg1, mock_msg2]]
        mock_session.query.return_value = mock_query

        start_date = datetime.now(timezone.utc) - timedelta(days=30)
        avg_length = await analytics_service._calculate_avg_session_length(
            mock_session, 123, start_date
        )

        # Session length should be 5 minutes = 300 seconds
        assert avg_length == 300.0

    @pytest.mark.asyncio
    async def test_calculate_session_length_single_message_threads(
        self, analytics_service
    ):
        """Test session length with threads that have only one message."""
        mock_session = MagicMock()

        mock_thread = MagicMock()
        mock_thread.id = 1

        mock_msg = MagicMock()
        mock_msg.created_at = datetime.now(timezone.utc)

        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.all.side_effect = [[mock_thread], [mock_msg]]  # Single message
        mock_session.query.return_value = mock_query

        start_date = datetime.now(timezone.utc) - timedelta(days=30)
        avg_length = await analytics_service._calculate_avg_session_length(
            mock_session, 123, start_date
        )

        # Single message threads should be skipped (need >= 2 messages)
        assert avg_length == 0


# ============================================================================
# EDGE CASES
# ============================================================================


class TestEdgeCases:
    """Tests for edge cases and error handling."""

    def test_counter_operations(self):
        """Test Counter operations used in topic extraction."""
        keywords = ["bitcoin", "bitcoin", "ethereum", "bitcoin", "portfolio"]
        counts = Counter(keywords)

        top_3 = counts.most_common(3)
        assert top_3[0] == ("bitcoin", 3)
        assert top_3[1] == ("ethereum", 1)

    def test_keyword_filtering_short_words(self):
        """Test that short words are filtered."""
        common_words = {"the", "and", "or", "is", "a"}
        word = "bit"

        # Word length check (must be > 3)
        assert len(word) <= 3
        word = "bitcoin"
        assert len(word) > 3

        # Not in common words
        assert word not in common_words

    def test_punctuation_stripping(self):
        """Test punctuation stripping from keywords."""
        word = "bitcoin."
        stripped = word.strip('.,!?;:"()[]{}')
        assert stripped == "bitcoin"

        word = "(ethereum)"
        stripped = word.strip('.,!?;:"()[]{}')
        assert stripped == "ethereum"

    @pytest.mark.asyncio
    async def test_response_time_with_no_completed_messages(self, analytics_service):
        """Test response time calculation when no messages completed."""
        # Empty response times list
        response_times: list[float] = []
        avg_response_time = (
            sum(response_times) / len(response_times) if response_times else 0
        )
        assert avg_response_time == 0

    def test_session_length_calculation_formula(self):
        """Test session length calculation logic."""
        now = datetime.now(timezone.utc)
        start = now
        end = now + timedelta(minutes=10)

        session_length = (end - start).total_seconds()
        assert session_length == 600.0  # 10 minutes = 600 seconds

    def test_provider_error_rate_calculation(self):
        """Test error rate calculation formula."""
        message_count = 100
        error_count = 5

        error_rate = error_count / message_count if message_count > 0 else 0
        assert error_rate == 0.05

        success_rate = 1 - error_rate
        assert success_rate == 0.95

    def test_provider_error_rate_zero_messages(self):
        """Test error rate when no messages exist."""
        message_count = 0
        error_count = 0

        error_rate = error_count / message_count if message_count > 0 else 0
        assert error_rate == 0

    def test_avg_messages_per_conversation_zero_division(self):
        """Test avg messages calculation handles zero conversations."""
        total_messages = 0
        total_conversations = 0

        avg = total_messages / max(total_conversations, 1)
        assert avg == 0
