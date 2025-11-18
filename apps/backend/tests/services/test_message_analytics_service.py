"""
Comprehensive tests for Message Analytics Service.

Tests cover:
- User message statistics calculation
- Conversation analytics generation
- Platform-wide statistics
- Trending conversation detection
- Time-based activity analysis
- Error handling and edge cases
"""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, Mock

import pytest
from app.services.message_analytics_service import (
    ConversationAnalytics,
    MessageAnalyticsService,
    UserMessageStats,
)

# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def mock_db_session():
    """Create a mock database session."""
    session = AsyncMock()
    return session


@pytest.fixture
def analytics_service(mock_db_session):
    """Create a MessageAnalyticsService instance with mock database."""
    return MessageAnalyticsService(db=mock_db_session)


@pytest.fixture
def sample_user_id():
    """Sample user ID for testing."""
    return uuid.uuid4()


@pytest.fixture
def sample_conversation_id():
    """Sample conversation ID for testing."""
    return uuid.uuid4()


@pytest.fixture
def sample_datetime():
    """Sample datetime for testing."""
    return datetime(2025, 11, 18, 12, 0, 0, tzinfo=timezone.utc)


# ============================================================================
# Test UserMessageStats Dataclass
# ============================================================================


class TestUserMessageStatsDataclass:
    """Test UserMessageStats dataclass creation and defaults."""

    def test_user_message_stats_creation(self, sample_user_id):
        """Test creating UserMessageStats with all fields."""
        stats = UserMessageStats(
            user_id=sample_user_id,
            username="test_user",
            total_messages=100,
            total_conversations=10,
            avg_messages_per_conversation=10.0,
            most_active_day="Monday",
            most_active_hour=14,
            response_time_avg_minutes=5.5,
        )

        assert stats.user_id == sample_user_id
        assert stats.username == "test_user"
        assert stats.total_messages == 100
        assert stats.total_conversations == 10
        assert stats.avg_messages_per_conversation == 10.0
        assert stats.most_active_day == "Monday"
        assert stats.most_active_hour == 14
        assert stats.response_time_avg_minutes == 5.5

    def test_user_message_stats_optional_fields(self, sample_user_id):
        """Test UserMessageStats with optional fields as None."""
        stats = UserMessageStats(
            user_id=sample_user_id,
            username="test_user",
            total_messages=50,
            total_conversations=5,
            avg_messages_per_conversation=10.0,
        )

        assert stats.most_active_day is None
        assert stats.most_active_hour is None
        assert stats.response_time_avg_minutes is None


# ============================================================================
# Test ConversationAnalytics Dataclass
# ============================================================================


class TestConversationAnalyticsDataclass:
    """Test ConversationAnalytics dataclass creation."""

    def test_conversation_analytics_creation(self, sample_conversation_id):
        """Test creating ConversationAnalytics with all fields."""
        analytics = ConversationAnalytics(
            conversation_id=sample_conversation_id,
            total_messages=100,
            total_participants=5,
            messages_by_day={"2025-11-18": 50, "2025-11-17": 50},
            messages_by_user={"user1": 60, "user2": 40},
            avg_response_time_minutes=3.5,
            most_active_period="evening",
        )

        assert analytics.conversation_id == sample_conversation_id
        assert analytics.total_messages == 100
        assert analytics.total_participants == 5
        assert analytics.messages_by_day == {"2025-11-18": 50, "2025-11-17": 50}
        assert analytics.messages_by_user == {"user1": 60, "user2": 40}
        assert analytics.avg_response_time_minutes == 3.5
        assert analytics.most_active_period == "evening"

    def test_conversation_analytics_empty_dictionaries(self, sample_conversation_id):
        """Test ConversationAnalytics with empty dictionaries."""
        analytics = ConversationAnalytics(
            conversation_id=sample_conversation_id,
            total_messages=0,
            total_participants=0,
            messages_by_day={},
            messages_by_user={},
            avg_response_time_minutes=0.0,
            most_active_period="unknown",
        )

        assert analytics.messages_by_day == {}
        assert analytics.messages_by_user == {}


# ============================================================================
# Test MessageAnalyticsService Initialization
# ============================================================================


class TestMessageAnalyticsServiceInitialization:
    """Test MessageAnalyticsService initialization."""

    def test_initialization(self, mock_db_session):
        """Test service initializes with database session."""
        service = MessageAnalyticsService(db=mock_db_session)

        assert service.db == mock_db_session

    def test_db_session_set(self, analytics_service, mock_db_session):
        """Test database session is correctly set."""
        assert analytics_service.db is mock_db_session


# ============================================================================
# Test Get User Message Stats
# ============================================================================


class TestGetUserMessageStats:
    """Test get_user_message_stats method."""

    @pytest.mark.asyncio
    async def test_get_user_message_stats_complete(
        self, analytics_service, mock_db_session, sample_user_id
    ):
        """Test getting complete user message statistics."""
        # Mock total messages count
        mock_db_session.execute = AsyncMock()

        # Mock sequence of query results
        execute_results = [
            # Total messages
            Mock(scalar=Mock(return_value=150)),
            # Total conversations
            Mock(scalar=Mock(return_value=10)),
            # Most active day
            Mock(first=Mock(return_value=("Monday   ", 50))),
            # Most active hour
            Mock(first=Mock(return_value=(14,))),
            # Username
            Mock(scalar=Mock(return_value="test_user")),
        ]

        mock_db_session.execute.side_effect = execute_results

        stats = await analytics_service.get_user_message_stats(user_id=sample_user_id, days_back=30)

        assert isinstance(stats, UserMessageStats)
        assert stats.user_id == sample_user_id
        assert stats.username == "test_user"
        assert stats.total_messages == 150
        assert stats.total_conversations == 10
        assert stats.avg_messages_per_conversation == 15.0
        assert stats.most_active_day == "Monday"
        assert stats.most_active_hour == 14

    @pytest.mark.asyncio
    async def test_get_user_message_stats_no_messages(
        self, analytics_service, mock_db_session, sample_user_id
    ):
        """Test user stats when user has no messages."""
        execute_results = [
            # Total messages
            Mock(scalar=Mock(return_value=0)),
            # Total conversations
            Mock(scalar=Mock(return_value=0)),
            # Most active day
            Mock(first=Mock(return_value=None)),
            # Most active hour
            Mock(first=Mock(return_value=None)),
            # Username
            Mock(scalar=Mock(return_value="new_user")),
        ]

        mock_db_session.execute.side_effect = execute_results

        stats = await analytics_service.get_user_message_stats(user_id=sample_user_id, days_back=30)

        assert stats.total_messages == 0
        assert stats.total_conversations == 0
        assert stats.avg_messages_per_conversation == 0.0
        assert stats.most_active_day is None
        assert stats.most_active_hour is None

    @pytest.mark.asyncio
    async def test_get_user_message_stats_custom_days_back(
        self, analytics_service, mock_db_session, sample_user_id
    ):
        """Test user stats with custom days_back parameter."""
        execute_results = [
            Mock(scalar=Mock(return_value=50)),
            Mock(scalar=Mock(return_value=5)),
            Mock(first=Mock(return_value=("Friday   ", 20))),
            Mock(first=Mock(return_value=(9,))),
            Mock(scalar=Mock(return_value="user123")),
        ]

        mock_db_session.execute.side_effect = execute_results

        stats = await analytics_service.get_user_message_stats(user_id=sample_user_id, days_back=7)

        assert stats.total_messages == 50
        assert stats.total_conversations == 5
        assert stats.avg_messages_per_conversation == 10.0

    @pytest.mark.asyncio
    async def test_get_user_message_stats_unknown_user(
        self, analytics_service, mock_db_session, sample_user_id
    ):
        """Test user stats when username is not found."""
        execute_results = [
            Mock(scalar=Mock(return_value=10)),
            Mock(scalar=Mock(return_value=2)),
            Mock(first=Mock(return_value=("Tuesday  ", 5))),
            Mock(first=Mock(return_value=(18,))),
            Mock(scalar=Mock(return_value=None)),  # Username not found
        ]

        mock_db_session.execute.side_effect = execute_results

        stats = await analytics_service.get_user_message_stats(user_id=sample_user_id, days_back=30)

        assert stats.username == "Unknown"

    @pytest.mark.asyncio
    async def test_get_user_message_stats_division_by_zero_protection(
        self, analytics_service, mock_db_session, sample_user_id
    ):
        """Test average calculation with zero conversations."""
        execute_results = [
            Mock(scalar=Mock(return_value=100)),  # Messages
            Mock(scalar=Mock(return_value=0)),  # Zero conversations
            Mock(first=Mock(return_value=None)),
            Mock(first=Mock(return_value=None)),
            Mock(scalar=Mock(return_value="test_user")),
        ]

        mock_db_session.execute.side_effect = execute_results

        stats = await analytics_service.get_user_message_stats(user_id=sample_user_id, days_back=30)

        # Should use max(total_conversations, 1) to avoid division by zero
        assert stats.avg_messages_per_conversation == 100.0


# ============================================================================
# Test Get Conversation Analytics
# ============================================================================


class TestGetConversationAnalytics:
    """Test get_conversation_analytics method."""

    @pytest.mark.asyncio
    async def test_get_conversation_analytics_complete(
        self, analytics_service, mock_db_session, sample_conversation_id, sample_user_id
    ):
        """Test getting complete conversation analytics."""
        execute_results = [
            # Participant verification
            Mock(scalar_one_or_none=Mock(return_value=Mock())),  # User is participant
            # Total messages
            Mock(scalar=Mock(return_value=100)),
            # Total participants
            Mock(scalar=Mock(return_value=5)),
            # Messages by day
            Mock(
                all=Mock(
                    return_value=[
                        (datetime(2025, 11, 18).date(), 50),
                        (datetime(2025, 11, 17).date(), 50),
                    ]
                )
            ),
            # Messages by user
            Mock(
                all=Mock(
                    return_value=[
                        ("user1", 60),
                        ("user2", 40),
                    ]
                )
            ),
        ]

        mock_db_session.execute.side_effect = execute_results

        analytics = await analytics_service.get_conversation_analytics(
            conversation_id=sample_conversation_id,
            user_id=sample_user_id,
            days_back=30,
        )

        assert isinstance(analytics, ConversationAnalytics)
        assert analytics.conversation_id == sample_conversation_id
        assert analytics.total_messages == 100
        assert analytics.total_participants == 5
        assert "2025-11-18" in analytics.messages_by_day
        assert "user1" in analytics.messages_by_user
        assert analytics.messages_by_user["user1"] == 60

    @pytest.mark.asyncio
    async def test_get_conversation_analytics_not_participant(
        self, analytics_service, mock_db_session, sample_conversation_id, sample_user_id
    ):
        """Test analytics returns None when user is not a participant."""
        # Mock participant verification returning None
        mock_db_session.execute.return_value = Mock(scalar_one_or_none=Mock(return_value=None))

        analytics = await analytics_service.get_conversation_analytics(
            conversation_id=sample_conversation_id,
            user_id=sample_user_id,
            days_back=30,
        )

        assert analytics is None

    @pytest.mark.asyncio
    async def test_get_conversation_analytics_no_messages(
        self, analytics_service, mock_db_session, sample_conversation_id, sample_user_id
    ):
        """Test conversation analytics with no messages."""
        execute_results = [
            # Participant verification
            Mock(scalar_one_or_none=Mock(return_value=Mock())),
            # Total messages
            Mock(scalar=Mock(return_value=0)),
            # Total participants
            Mock(scalar=Mock(return_value=2)),
            # Messages by day
            Mock(all=Mock(return_value=[])),
            # Messages by user
            Mock(all=Mock(return_value=[])),
        ]

        mock_db_session.execute.side_effect = execute_results

        analytics = await analytics_service.get_conversation_analytics(
            conversation_id=sample_conversation_id,
            user_id=sample_user_id,
            days_back=30,
        )

        assert analytics.total_messages == 0
        assert analytics.messages_by_day == {}
        assert analytics.messages_by_user == {}

    @pytest.mark.asyncio
    async def test_get_conversation_analytics_custom_days_back(
        self, analytics_service, mock_db_session, sample_conversation_id, sample_user_id
    ):
        """Test conversation analytics with custom days_back parameter."""
        execute_results = [
            Mock(scalar_one_or_none=Mock(return_value=Mock())),
            Mock(scalar=Mock(return_value=25)),
            Mock(scalar=Mock(return_value=3)),
            Mock(all=Mock(return_value=[(datetime(2025, 11, 18).date(), 25)])),
            Mock(all=Mock(return_value=[("user1", 25)])),
        ]

        mock_db_session.execute.side_effect = execute_results

        analytics = await analytics_service.get_conversation_analytics(
            conversation_id=sample_conversation_id,
            user_id=sample_user_id,
            days_back=7,
        )

        assert analytics.total_messages == 25

    @pytest.mark.asyncio
    async def test_get_conversation_analytics_default_values(
        self, analytics_service, mock_db_session, sample_conversation_id, sample_user_id
    ):
        """Test conversation analytics includes default values for unimplemented fields."""
        execute_results = [
            Mock(scalar_one_or_none=Mock(return_value=Mock())),
            Mock(scalar=Mock(return_value=10)),
            Mock(scalar=Mock(return_value=2)),
            Mock(all=Mock(return_value=[])),
            Mock(all=Mock(return_value=[])),
        ]

        mock_db_session.execute.side_effect = execute_results

        analytics = await analytics_service.get_conversation_analytics(
            conversation_id=sample_conversation_id,
            user_id=sample_user_id,
            days_back=30,
        )

        # These fields have default values per implementation
        assert analytics.avg_response_time_minutes == 0.0
        assert analytics.most_active_period == "unknown"


# ============================================================================
# Test Get Platform Statistics
# ============================================================================


class TestGetPlatformStatistics:
    """Test get_platform_statistics method."""

    @pytest.mark.asyncio
    async def test_get_platform_statistics_complete(self, analytics_service, mock_db_session):
        """Test getting complete platform statistics."""
        execute_results = [
            # Total messages
            Mock(scalar=Mock(return_value=10000)),
            # Active users
            Mock(scalar=Mock(return_value=500)),
            # Total conversations
            Mock(scalar=Mock(return_value=1000)),
            # Messages by type
            Mock(
                all=Mock(
                    return_value=[
                        ("text", 8000),
                        ("image", 1500),
                        ("file", 500),
                    ]
                )
            ),
        ]

        mock_db_session.execute.side_effect = execute_results

        stats = await analytics_service.get_platform_statistics()

        assert stats["period_days"] == 30
        assert stats["total_messages"] == 10000
        assert stats["active_users"] == 500
        assert stats["total_conversations"] == 1000
        assert stats["avg_messages_per_user"] == 20.0
        assert stats["avg_messages_per_conversation"] == 10.0
        assert stats["messages_by_type"]["text"] == 8000
        assert stats["messages_by_type"]["image"] == 1500
        assert "generated_at" in stats

    @pytest.mark.asyncio
    async def test_get_platform_statistics_no_activity(self, analytics_service, mock_db_session):
        """Test platform statistics with no activity."""
        execute_results = [
            Mock(scalar=Mock(return_value=0)),  # No messages
            Mock(scalar=Mock(return_value=0)),  # No active users
            Mock(scalar=Mock(return_value=0)),  # No conversations
            Mock(all=Mock(return_value=[])),  # No message types
        ]

        mock_db_session.execute.side_effect = execute_results

        stats = await analytics_service.get_platform_statistics()

        assert stats["total_messages"] == 0
        assert stats["active_users"] == 0
        assert stats["total_conversations"] == 0
        # Should use max(..., 1) to avoid division by zero
        assert stats["avg_messages_per_user"] == 0.0
        assert stats["avg_messages_per_conversation"] == 0.0
        assert stats["messages_by_type"] == {}

    @pytest.mark.asyncio
    async def test_get_platform_statistics_division_by_zero_protection(
        self, analytics_service, mock_db_session
    ):
        """Test platform statistics handles zero users/conversations."""
        execute_results = [
            Mock(scalar=Mock(return_value=100)),  # Messages exist
            Mock(scalar=Mock(return_value=0)),  # Zero active users
            Mock(scalar=Mock(return_value=0)),  # Zero conversations
            Mock(all=Mock(return_value=[("text", 100)])),
        ]

        mock_db_session.execute.side_effect = execute_results

        stats = await analytics_service.get_platform_statistics()

        # Should not raise ZeroDivisionError
        assert stats["avg_messages_per_user"] == 100.0
        assert stats["avg_messages_per_conversation"] == 100.0

    @pytest.mark.asyncio
    async def test_get_platform_statistics_includes_timestamp(
        self, analytics_service, mock_db_session
    ):
        """Test platform statistics includes generation timestamp."""
        execute_results = [
            Mock(scalar=Mock(return_value=50)),
            Mock(scalar=Mock(return_value=10)),
            Mock(scalar=Mock(return_value=5)),
            Mock(all=Mock(return_value=[])),
        ]

        mock_db_session.execute.side_effect = execute_results

        stats = await analytics_service.get_platform_statistics()

        assert "generated_at" in stats
        # Verify it's an ISO format timestamp
        datetime.fromisoformat(stats["generated_at"])


# ============================================================================
# Test Get Trending Conversations
# ============================================================================


class TestGetTrendingConversations:
    """Test get_trending_conversations method."""

    @pytest.mark.asyncio
    async def test_get_trending_conversations_complete(
        self, analytics_service, mock_db_session, sample_user_id
    ):
        """Test getting trending conversations."""
        conv_id_1 = uuid.uuid4()
        conv_id_2 = uuid.uuid4()
        last_activity = datetime.now(timezone.utc)

        mock_db_session.execute.return_value = Mock(
            all=Mock(
                return_value=[
                    (conv_id_1, 50, last_activity),
                    (conv_id_2, 30, last_activity - timedelta(hours=1)),
                ]
            )
        )

        trending = await analytics_service.get_trending_conversations(
            user_id=sample_user_id, limit=10
        )

        assert len(trending) == 2
        assert trending[0]["conversation_id"] == str(conv_id_1)
        assert trending[0]["recent_message_count"] == 50
        assert trending[0]["trend_score"] == 50
        assert "last_activity" in trending[0]

    @pytest.mark.asyncio
    async def test_get_trending_conversations_no_activity(
        self, analytics_service, mock_db_session, sample_user_id
    ):
        """Test trending conversations when no recent activity."""
        mock_db_session.execute.return_value = Mock(all=Mock(return_value=[]))

        trending = await analytics_service.get_trending_conversations(
            user_id=sample_user_id, limit=10
        )

        assert trending == []

    @pytest.mark.asyncio
    async def test_get_trending_conversations_custom_limit(
        self, analytics_service, mock_db_session, sample_user_id
    ):
        """Test trending conversations with custom limit."""
        # Create 5 trending conversations
        trending_data = [(uuid.uuid4(), 40 - (i * 5), datetime.now(timezone.utc)) for i in range(5)]

        mock_db_session.execute.return_value = Mock(all=Mock(return_value=trending_data))

        trending = await analytics_service.get_trending_conversations(
            user_id=sample_user_id, limit=3
        )

        # Should respect limit parameter
        assert len(trending) <= 3

    @pytest.mark.asyncio
    async def test_get_trending_conversations_sorting(
        self, analytics_service, mock_db_session, sample_user_id
    ):
        """Test trending conversations are sorted by message count."""
        conv_id_high = uuid.uuid4()
        conv_id_low = uuid.uuid4()
        now = datetime.now(timezone.utc)

        mock_db_session.execute.return_value = Mock(
            all=Mock(
                return_value=[
                    (conv_id_high, 100, now),  # Higher message count first
                    (conv_id_low, 10, now),
                ]
            )
        )

        trending = await analytics_service.get_trending_conversations(
            user_id=sample_user_id, limit=10
        )

        assert trending[0]["recent_message_count"] == 100
        assert trending[1]["recent_message_count"] == 10

    @pytest.mark.asyncio
    async def test_get_trending_conversations_iso_format_timestamps(
        self, analytics_service, mock_db_session, sample_user_id
    ):
        """Test trending conversations include ISO format timestamps."""
        conv_id = uuid.uuid4()
        last_activity = datetime.now(timezone.utc)

        mock_db_session.execute.return_value = Mock(
            all=Mock(
                return_value=[
                    (conv_id, 50, last_activity),
                ]
            )
        )

        trending = await analytics_service.get_trending_conversations(
            user_id=sample_user_id, limit=10
        )

        # Verify last_activity is in ISO format
        datetime.fromisoformat(trending[0]["last_activity"])


# ============================================================================
# Test Edge Cases and Error Handling
# ============================================================================


class TestEdgeCasesAndErrorHandling:
    """Test edge cases and error handling scenarios."""

    @pytest.mark.asyncio
    async def test_user_stats_with_null_scalars(
        self, analytics_service, mock_db_session, sample_user_id
    ):
        """Test user stats when database returns None for counts."""
        execute_results = [
            Mock(scalar=Mock(return_value=None)),  # None for messages
            Mock(scalar=Mock(return_value=None)),  # None for conversations
            Mock(first=Mock(return_value=None)),
            Mock(first=Mock(return_value=None)),
            Mock(scalar=Mock(return_value="user")),
        ]

        mock_db_session.execute.side_effect = execute_results

        stats = await analytics_service.get_user_message_stats(user_id=sample_user_id, days_back=30)

        # Should default to 0 when None
        assert stats.total_messages == 0
        assert stats.total_conversations == 0

    @pytest.mark.asyncio
    async def test_conversation_analytics_null_scalars(
        self, analytics_service, mock_db_session, sample_conversation_id, sample_user_id
    ):
        """Test conversation analytics when database returns None."""
        execute_results = [
            Mock(scalar_one_or_none=Mock(return_value=Mock())),
            Mock(scalar=Mock(return_value=None)),  # None for total messages
            Mock(scalar=Mock(return_value=None)),  # None for participants
            Mock(all=Mock(return_value=[])),
            Mock(all=Mock(return_value=[])),
        ]

        mock_db_session.execute.side_effect = execute_results

        analytics = await analytics_service.get_conversation_analytics(
            conversation_id=sample_conversation_id,
            user_id=sample_user_id,
            days_back=30,
        )

        assert analytics.total_messages == 0
        assert analytics.total_participants == 0

    @pytest.mark.asyncio
    async def test_platform_stats_null_scalars(self, analytics_service, mock_db_session):
        """Test platform statistics when database returns None."""
        execute_results = [
            Mock(scalar=Mock(return_value=None)),
            Mock(scalar=Mock(return_value=None)),
            Mock(scalar=Mock(return_value=None)),
            Mock(all=Mock(return_value=[])),
        ]

        mock_db_session.execute.side_effect = execute_results

        stats = await analytics_service.get_platform_statistics()

        assert stats["total_messages"] == 0
        assert stats["active_users"] == 0
        assert stats["total_conversations"] == 0

    @pytest.mark.asyncio
    async def test_user_stats_whitespace_in_day_name(
        self, analytics_service, mock_db_session, sample_user_id
    ):
        """Test day name with trailing whitespace is stripped."""
        execute_results = [
            Mock(scalar=Mock(return_value=50)),
            Mock(scalar=Mock(return_value=5)),
            Mock(first=Mock(return_value=("Wednesday     ", 20))),  # Extra whitespace
            Mock(first=Mock(return_value=(12,))),
            Mock(scalar=Mock(return_value="user")),
        ]

        mock_db_session.execute.side_effect = execute_results

        stats = await analytics_service.get_user_message_stats(user_id=sample_user_id, days_back=30)

        # Should strip whitespace
        assert stats.most_active_day == "Wednesday"

    @pytest.mark.asyncio
    async def test_user_stats_hour_conversion_to_int(
        self, analytics_service, mock_db_session, sample_user_id
    ):
        """Test most active hour is converted to integer."""
        execute_results = [
            Mock(scalar=Mock(return_value=30)),
            Mock(scalar=Mock(return_value=3)),
            Mock(first=Mock(return_value=("Monday   ", 10))),
            Mock(first=Mock(return_value=(23.0,))),  # Float hour
            Mock(scalar=Mock(return_value="user")),
        ]

        mock_db_session.execute.side_effect = execute_results

        stats = await analytics_service.get_user_message_stats(user_id=sample_user_id, days_back=30)

        # Should convert to int
        assert isinstance(stats.most_active_hour, int)
        assert stats.most_active_hour == 23

    @pytest.mark.asyncio
    async def test_trending_conversations_uuid_to_string_conversion(
        self, analytics_service, mock_db_session, sample_user_id
    ):
        """Test conversation IDs are converted to strings in trending results."""
        conv_id = uuid.uuid4()

        mock_db_session.execute.return_value = Mock(
            all=Mock(
                return_value=[
                    (conv_id, 25, datetime.now(timezone.utc)),
                ]
            )
        )

        trending = await analytics_service.get_trending_conversations(
            user_id=sample_user_id, limit=10
        )

        # Should convert UUID to string
        assert isinstance(trending[0]["conversation_id"], str)
        assert trending[0]["conversation_id"] == str(conv_id)

    @pytest.mark.asyncio
    async def test_messages_by_day_date_to_string_conversion(
        self, analytics_service, mock_db_session, sample_conversation_id, sample_user_id
    ):
        """Test messages_by_day converts dates to strings."""
        execute_results = [
            Mock(scalar_one_or_none=Mock(return_value=Mock())),
            Mock(scalar=Mock(return_value=50)),
            Mock(scalar=Mock(return_value=3)),
            Mock(
                all=Mock(
                    return_value=[
                        (datetime(2025, 11, 18).date(), 30),
                        (datetime(2025, 11, 17).date(), 20),
                    ]
                )
            ),
            Mock(all=Mock(return_value=[])),
        ]

        mock_db_session.execute.side_effect = execute_results

        analytics = await analytics_service.get_conversation_analytics(
            conversation_id=sample_conversation_id,
            user_id=sample_user_id,
            days_back=30,
        )

        # Dictionary keys should be strings
        for key in analytics.messages_by_day.keys():
            assert isinstance(key, str)


# ============================================================================
# Test Time-Based Calculations
# ============================================================================


class TestTimeBasedCalculations:
    """Test time-based cutoff calculations."""

    @pytest.mark.asyncio
    async def test_user_stats_default_30_days_cutoff(
        self, analytics_service, mock_db_session, sample_user_id
    ):
        """Test user stats uses 30 days cutoff by default."""
        execute_results = [
            Mock(scalar=Mock(return_value=100)),
            Mock(scalar=Mock(return_value=10)),
            Mock(first=Mock(return_value=None)),
            Mock(first=Mock(return_value=None)),
            Mock(scalar=Mock(return_value="user")),
        ]

        mock_db_session.execute.side_effect = execute_results

        await analytics_service.get_user_message_stats(
            user_id=sample_user_id
            # days_back defaults to 30
        )

        # Verify execute was called (queries use 30-day cutoff)
        assert mock_db_session.execute.call_count == 5

    @pytest.mark.asyncio
    async def test_platform_stats_uses_30_day_period(self, analytics_service, mock_db_session):
        """Test platform statistics uses 30-day period."""
        execute_results = [
            Mock(scalar=Mock(return_value=1000)),
            Mock(scalar=Mock(return_value=100)),
            Mock(scalar=Mock(return_value=50)),
            Mock(all=Mock(return_value=[])),
        ]

        mock_db_session.execute.side_effect = execute_results

        stats = await analytics_service.get_platform_statistics()

        assert stats["period_days"] == 30

    @pytest.mark.asyncio
    async def test_trending_conversations_uses_24_hour_window(
        self, analytics_service, mock_db_session, sample_user_id
    ):
        """Test trending conversations uses 24-hour activity window."""
        mock_db_session.execute.return_value = Mock(all=Mock(return_value=[]))

        await analytics_service.get_trending_conversations(user_id=sample_user_id, limit=10)

        # Verify execute was called (query uses 24-hour window)
        assert mock_db_session.execute.called
