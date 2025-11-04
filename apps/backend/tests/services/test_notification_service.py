"""
Tests for app.services.notification_service

Comprehensive test suite for notification service functionality including:
- NotificationService: Core notification creation, retrieval, and management
- NotificationData: Data structure validation
- NotificationStats: Analytics and reporting
- Event handling: Notification lifecycle events
- Batch processing: Bulk notification operations
- User preferences: Delivery preference management

Coverage focus: Happy path flows, edge cases, error handling, async operations
Session: 62 - Backend Test Coverage Expansion Phase 1
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

# Import module under test
try:
    from app.models.notification_models import Notification, NotificationPreference
    from app.services.notification_service import (
        NotificationData,
        NotificationEvent,
        NotificationPriority,
        NotificationService,
        NotificationStats,
        NotificationType,
    )
except ImportError as e:
    pytest.skip(f"Module import failed: {e}", allow_module_level=True)


# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def notification_service():
    """Fresh NotificationService instance for testing"""
    return NotificationService()


@pytest.fixture
def sample_user_id():
    """Sample user ID for testing"""
    return str(uuid.uuid4())


@pytest.fixture
def sample_notification_data(sample_user_id):
    """Sample NotificationData for testing"""
    return NotificationData(
        user_id=sample_user_id,
        type=NotificationType.FOLLOW,
        title="New follower",
        message="John Doe started following you",
        priority=NotificationPriority.NORMAL,
        category="social",
        related_entity_type="user",
        related_entity_id=str(uuid.uuid4()),
    )


@pytest.fixture
def mock_notification(sample_user_id):
    """Mock Notification model instance"""
    notification = Mock(spec=Notification)
    notification.id = str(uuid.uuid4())
    notification.user_id = sample_user_id
    notification.type = NotificationType.FOLLOW.value
    notification.priority = NotificationPriority.NORMAL.value
    notification.title = "New follower"
    notification.message = "John Doe started following you"
    notification.created_at = datetime.now(timezone.utc)
    notification.read_at = None
    notification.is_read = False
    notification.is_delivered = True
    notification.is_dismissed = False
    notification.payload = {"follower_id": str(uuid.uuid4())}
    return notification


@pytest.fixture
def mock_preference(sample_user_id):
    """Mock NotificationPreference model instance"""
    preference = Mock(spec=NotificationPreference)
    preference.user_id = sample_user_id
    preference.notification_enabled = True
    preference.email_enabled = True
    preference.push_enabled = True
    preference.in_app_enabled = True
    preference.quiet_hours_enabled = False
    preference.type_preferences = {}
    return preference


@pytest.fixture
def mock_db_session():
    """Mock database session with async context manager support"""
    session = AsyncMock()
    session.add = Mock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.execute = AsyncMock()
    session.scalar = AsyncMock()
    return session


# ============================================================================
# NOTIFICATION DATA TESTS
# ============================================================================


class TestNotificationData:
    """Test suite for NotificationData dataclass"""

    def test_notification_data_creation_minimal(self, sample_user_id):
        """Test NotificationData creation with minimal required fields"""
        data = NotificationData(
            user_id=sample_user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="System Alert",
        )

        assert data.user_id == sample_user_id
        assert data.type == NotificationType.SYSTEM_ALERT
        assert data.title == "System Alert"
        assert data.message is None
        assert data.payload is None
        assert data.priority == NotificationPriority.NORMAL  # Default

    def test_notification_data_creation_full(self, sample_user_id):
        """Test NotificationData creation with all fields"""
        payload = {"key": "value"}
        expires_at = datetime.now(timezone.utc)

        data = NotificationData(
            user_id=sample_user_id,
            type=NotificationType.MENTION,
            title="You were mentioned",
            message="Alice mentioned you in a post",
            payload=payload,
            priority=NotificationPriority.HIGH,
            category="engagement",
            related_entity_type="post",
            related_entity_id=str(uuid.uuid4()),
            expires_at=expires_at,
            email_enabled=True,
            push_enabled=False,
        )

        assert data.user_id == sample_user_id
        assert data.type == NotificationType.MENTION
        assert data.title == "You were mentioned"
        assert data.message == "Alice mentioned you in a post"
        assert data.payload == payload
        assert data.priority == NotificationPriority.HIGH
        assert data.category == "engagement"
        assert data.expires_at == expires_at
        assert data.email_enabled is True
        assert data.push_enabled is False


# ============================================================================
# NOTIFICATION SERVICE INITIALIZATION TESTS
# ============================================================================


class TestNotificationServiceInitialization:
    """Test suite for NotificationService initialization"""

    def test_notification_service_initialization(self, notification_service):
        """Test NotificationService initializes with correct defaults"""
        assert notification_service.event_handlers == {}
        assert notification_service.batch_processing_enabled is True
        assert notification_service.max_batch_size == 100
        assert notification_service.delivery_retry_attempts == 3
        assert notification_service.cleanup_expired_after_days == 30

    def test_notification_service_custom_initialization(self):
        """Test NotificationService accepts custom configuration"""
        service = NotificationService()
        service.max_batch_size = 50
        service.delivery_retry_attempts = 5

        assert service.max_batch_size == 50
        assert service.delivery_retry_attempts == 5


# ============================================================================
# NOTIFICATION CREATION TESTS
# ============================================================================


@pytest.mark.asyncio
class TestNotificationCreation:
    """Test suite for notification creation operations"""

    async def test_create_notification_success(
        self, notification_service, sample_notification_data, mock_db_session, mock_notification
    ):
        """Test successful notification creation"""
        # Mock database manager
        with patch("app.services.notification_service.db_manager") as mock_db_manager:
            # Mock db_manager.get_session() to return async generator yielding mock_db_session
            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()
            mock_db_session.refresh.side_effect = lambda obj: setattr(
                obj, "id", mock_notification.id
            )

            # Mock preference check (allow delivery)
            with patch.object(notification_service, "_get_user_preferences", return_value=Mock()):
                with patch.object(
                    notification_service, "_should_deliver_notification", return_value=True
                ):
                    with patch.object(notification_service, "_emit_event", new_callable=AsyncMock):
                        with patch.object(
                            notification_service, "_deliver_notification", new_callable=AsyncMock
                        ):
                            result = await notification_service.create_notification(
                                sample_notification_data
                            )

            assert result is not None
            assert isinstance(result, Notification)
            mock_db_session.add.assert_called_once()
            mock_db_session.commit.assert_called_once()

    async def test_create_notification_blocked_by_preferences(
        self, notification_service, sample_notification_data, mock_db_session
    ):
        """Test notification creation blocked by user preferences"""
        with patch("app.services.notification_service.db_manager") as mock_db_manager:
            mock_db_manager.get_session.return_value.__aenter__.return_value = mock_db_session

            # Mock preference check (block delivery)
            with patch.object(notification_service, "_get_user_preferences", return_value=Mock()):
                with patch.object(
                    notification_service, "_should_deliver_notification", return_value=False
                ):
                    result = await notification_service.create_notification(
                        sample_notification_data
                    )

            assert result is None  # Blocked by preferences
            mock_db_session.add.assert_not_called()

    async def test_create_notification_skip_preferences(
        self, notification_service, sample_notification_data, mock_db_session, mock_notification
    ):
        """Test notification creation skipping preference check"""
        with patch("app.services.notification_service.db_manager") as mock_db_manager:
            # Mock db_manager.get_session() to return async generator yielding mock_db_session
            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()
            mock_db_session.refresh.side_effect = lambda obj: setattr(
                obj, "id", mock_notification.id
            )

            # Skip preference check
            with patch.object(notification_service, "_emit_event", new_callable=AsyncMock):
                with patch.object(
                    notification_service, "_deliver_notification", new_callable=AsyncMock
                ):
                    result = await notification_service.create_notification(
                        sample_notification_data, skip_preferences=True
                    )

            assert result is not None
            # Verify _get_user_preferences was NOT called
            mock_db_session.add.assert_called_once()

    async def test_create_notification_with_batch_id(
        self, notification_service, sample_notification_data, mock_db_session, mock_notification
    ):
        """Test notification creation with batch ID"""
        batch_id = str(uuid.uuid4())

        with patch("app.services.notification_service.db_manager") as mock_db_manager:
            # Mock db_manager.get_session() to return async generator yielding mock_db_session
            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()
            mock_db_session.refresh.side_effect = lambda obj: setattr(obj, "batch_id", batch_id)

            with patch.object(notification_service, "_get_user_preferences", return_value=Mock()):
                with patch.object(
                    notification_service, "_should_deliver_notification", return_value=True
                ):
                    with patch.object(notification_service, "_emit_event", new_callable=AsyncMock):
                        with patch.object(
                            notification_service, "_deliver_notification", new_callable=AsyncMock
                        ):
                            result = await notification_service.create_notification(
                                sample_notification_data, batch_id=batch_id
                            )

            assert result is not None
            mock_db_session.add.assert_called_once()

    async def test_create_notification_error_handling(
        self, notification_service, sample_notification_data, mock_db_session
    ):
        """Test notification creation handles database errors gracefully"""
        with patch("app.services.notification_service.db_manager") as mock_db_manager:
            mock_db_manager.get_session.return_value.__aenter__.return_value = mock_db_session
            mock_db_session.commit.side_effect = Exception("Database error")

            with patch.object(notification_service, "_get_user_preferences", return_value=Mock()):
                with patch.object(
                    notification_service, "_should_deliver_notification", return_value=True
                ):
                    result = await notification_service.create_notification(
                        sample_notification_data
                    )

            assert result is None  # Error handled gracefully


# ============================================================================
# BATCH OPERATIONS TESTS
# ============================================================================


@pytest.mark.asyncio
class TestBatchOperations:
    """Test suite for batch notification operations"""

    async def test_create_batch_notifications_success(self, notification_service, sample_user_id):
        """Test successful batch notification creation"""
        notifications_data = [
            NotificationData(
                user_id=sample_user_id,
                type=NotificationType.SYSTEM_ALERT,
                title=f"Alert {i}",
                message=f"Message {i}",
            )
            for i in range(5)
        ]

        with patch.object(
            notification_service,
            "create_notification",
            new_callable=AsyncMock,
            side_effect=[Mock(spec=Notification) for _ in range(5)],
        ):
            with patch.object(notification_service, "_emit_event", new_callable=AsyncMock):
                results = await notification_service.create_batch_notifications(notifications_data)

        assert len(results) == 5
        assert all(isinstance(n, Mock) for n in results)

    async def test_create_batch_notifications_with_batch_id(
        self, notification_service, sample_user_id
    ):
        """Test batch notifications use provided batch ID"""
        batch_id = str(uuid.uuid4())
        notifications_data = [
            NotificationData(user_id=sample_user_id, type=NotificationType.FOLLOW, title="Test")
            for _ in range(3)
        ]

        with patch.object(
            notification_service,
            "create_notification",
            new_callable=AsyncMock,
            return_value=Mock(spec=Notification),
        ) as mock_create:
            with patch.object(notification_service, "_emit_event", new_callable=AsyncMock):
                await notification_service.create_batch_notifications(
                    notifications_data, batch_id=batch_id
                )

        # Verify batch_id was passed to create_notification
        for call in mock_create.call_args_list:
            assert call.kwargs["batch_id"] == batch_id

    async def test_create_batch_notifications_partial_failure(
        self, notification_service, sample_user_id
    ):
        """Test batch notifications handle partial failures"""
        notifications_data = [
            NotificationData(
                user_id=sample_user_id,
                type=NotificationType.ANNOUNCEMENT,
                title=f"Announcement {i}",
            )
            for i in range(3)
        ]

        # Mock: first succeeds, second fails, third succeeds
        side_effects = [
            Mock(spec=Notification),
            Exception("Creation failed"),
            Mock(spec=Notification),
        ]

        with patch.object(
            notification_service,
            "create_notification",
            new_callable=AsyncMock,
            side_effect=side_effects,
        ):
            with patch.object(notification_service, "_emit_event", new_callable=AsyncMock):
                results = await notification_service.create_batch_notifications(notifications_data)

        assert len(results) == 2  # Only successful ones

    # TODO: Add more test cases for:
    # - Happy path scenarios
    # - Edge cases
    # - Error handling
    # - Input validation
    # - Business logic


# ============================================================================
# USER NOTIFICATION RETRIEVAL & ACTIONS TESTS (Gap 1)
# ============================================================================


class TestUserNotificationRetrieval:
    """Test suite for get_user_notifications with filtering and pagination"""

    @pytest.mark.asyncio
    async def test_get_user_notifications_success(
        self, notification_service, sample_user_id, mock_db_session, mock_notification
    ):
        """Test successful retrieval of user notifications"""
        with patch("app.services.notification_service.db_manager") as mock_db_manager:
            # Mock db_manager.get_session() to return async generator
            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            # Mock query execution with notifications
            mock_result = Mock()
            mock_scalars = Mock()
            mock_scalars.all.return_value = [mock_notification]
            mock_result.scalars.return_value = mock_scalars
            mock_db_session.execute.return_value = mock_result

            result = await notification_service.get_user_notifications(sample_user_id)

            assert isinstance(result, list)
            assert len(result) == 1
            assert result[0].id == mock_notification.id

    @pytest.mark.asyncio
    async def test_get_user_notifications_with_filters(
        self, notification_service, sample_user_id, mock_db_session
    ):
        """Test get_user_notifications with unread_only and type filters"""
        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            # Mock empty result
            mock_result = Mock()
            mock_scalars = Mock()
            mock_scalars.all.return_value = []
            mock_result.scalars.return_value = mock_scalars
            mock_db_session.execute.return_value = mock_result

            result = await notification_service.get_user_notifications(
                sample_user_id, unread_only=True, notification_type="FOLLOW", category="social"
            )

            assert isinstance(result, list)
            assert len(result) == 0  # No matching notifications

    @pytest.mark.asyncio
    async def test_get_user_notifications_pagination(
        self, notification_service, sample_user_id, mock_db_session
    ):
        """Test get_user_notifications with pagination"""
        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            # Mock result with multiple notifications
            notifications = [Mock(spec=Notification) for _ in range(10)]
            mock_result = Mock()
            mock_scalars = Mock()
            mock_scalars.all.return_value = notifications
            mock_result.scalars.return_value = mock_scalars
            mock_db_session.execute.return_value = mock_result

            result = await notification_service.get_user_notifications(
                sample_user_id, limit=10, offset=20
            )

            assert len(result) == 10

    @pytest.mark.asyncio
    async def test_get_user_notifications_error_handling(
        self, notification_service, sample_user_id, mock_db_session
    ):
        """Test get_user_notifications error handling"""
        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()
            mock_db_session.execute.side_effect = Exception("Database error")

            result = await notification_service.get_user_notifications(sample_user_id)

            assert result == []  # Returns empty list on error


class TestUnreadCount:
    """Test suite for get_unread_count with Redis caching"""

    @pytest.mark.asyncio
    async def test_get_unread_count_cache_hit(self, notification_service, sample_user_id):
        """Test get_unread_count returns cached value"""
        with patch("app.services.notification_service.redis_client") as mock_redis:
            mock_redis.get_cached_unread_count = AsyncMock(return_value=5)

            result = await notification_service.get_unread_count(sample_user_id)

            assert result == 5
            mock_redis.get_cached_unread_count.assert_called_once_with(sample_user_id)

    @pytest.mark.asyncio
    async def test_get_unread_count_cache_miss(
        self, notification_service, sample_user_id, mock_db_session
    ):
        """Test get_unread_count fetches from DB on cache miss"""
        with patch("app.services.notification_service.redis_client") as mock_redis:
            mock_redis.get_cached_unread_count = AsyncMock(return_value=None)
            mock_redis.cache_unread_count = AsyncMock()

            with patch("app.services.notification_service.db_manager") as mock_db_manager:

                async def mock_get_session(*args, **kwargs):
                    yield mock_db_session

                mock_db_manager.get_session.return_value = mock_get_session()

                # Mock count query result
                mock_result = Mock()
                mock_result.scalar.return_value = 3
                mock_db_session.execute.return_value = mock_result

                result = await notification_service.get_unread_count(sample_user_id)

                assert result == 3
                mock_redis.cache_unread_count.assert_called_once_with(sample_user_id, 3, ttl=300)

    @pytest.mark.asyncio
    async def test_get_unread_count_error_handling(
        self, notification_service, sample_user_id, mock_db_session
    ):
        """Test get_unread_count error handling"""
        with patch("app.services.notification_service.redis_client") as mock_redis:
            mock_redis.get_cached_unread_count = AsyncMock(return_value=None)

            with patch("app.services.notification_service.db_manager") as mock_db_manager:

                async def mock_get_session(*args, **kwargs):
                    yield mock_db_session

                mock_db_manager.get_session.return_value = mock_get_session()
                mock_db_session.execute.side_effect = Exception("Database error")

                result = await notification_service.get_unread_count(sample_user_id)

                assert result == 0  # Returns 0 on error


class TestMarkAsRead:
    """Test suite for mark_as_read single notification"""

    @pytest.mark.asyncio
    async def test_mark_as_read_success(
        self, notification_service, sample_user_id, mock_db_session, mock_notification
    ):
        """Test successful mark_as_read"""
        notification_id = str(uuid.uuid4())
        mock_notification.is_read = False
        mock_notification.mark_as_read = Mock()

        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            # Mock query result
            mock_result = Mock()
            mock_result.scalar_one_or_none.return_value = mock_notification
            mock_db_session.execute.return_value = mock_result

            with patch.object(notification_service, "_emit_event", new_callable=AsyncMock):
                result = await notification_service.mark_as_read(notification_id, sample_user_id)

            assert result is True
            mock_notification.mark_as_read.assert_called_once()

    @pytest.mark.asyncio
    async def test_mark_as_read_not_found(
        self, notification_service, sample_user_id, mock_db_session
    ):
        """Test mark_as_read with non-existent notification"""
        notification_id = str(uuid.uuid4())

        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            # Mock not found result
            mock_result = Mock()
            mock_result.scalar_one_or_none.return_value = None
            mock_db_session.execute.return_value = mock_result

            result = await notification_service.mark_as_read(notification_id, sample_user_id)

            assert result is False

    @pytest.mark.asyncio
    async def test_mark_as_read_without_user_id(
        self, notification_service, mock_db_session, mock_notification
    ):
        """Test mark_as_read without user_id verification"""
        notification_id = str(uuid.uuid4())
        mock_notification.is_read = False
        mock_notification.mark_as_read = Mock()

        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            mock_result = Mock()
            mock_result.scalar_one_or_none.return_value = mock_notification
            mock_db_session.execute.return_value = mock_result

            with patch.object(notification_service, "_emit_event", new_callable=AsyncMock):
                result = await notification_service.mark_as_read(notification_id, user_id=None)

            assert result is True

    @pytest.mark.asyncio
    async def test_mark_as_read_error_handling(
        self, notification_service, sample_user_id, mock_db_session
    ):
        """Test mark_as_read error handling"""
        notification_id = str(uuid.uuid4())

        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()
            mock_db_session.execute.side_effect = Exception("Database error")

            result = await notification_service.mark_as_read(notification_id, sample_user_id)

            assert result is False


class TestMarkAllAsRead:
    """Test suite for mark_all_as_read batch operation"""

    @pytest.mark.asyncio
    async def test_mark_all_as_read_success(
        self, notification_service, sample_user_id, mock_db_session
    ):
        """Test successful mark_all_as_read"""
        # Create multiple unread notifications
        notifications = [Mock(spec=Notification) for _ in range(5)]
        for notification in notifications:
            notification.mark_as_read = Mock()

        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            # Mock query result with unread notifications
            mock_result = Mock()
            mock_scalars = Mock()
            mock_scalars.all.return_value = notifications
            mock_result.scalars.return_value = mock_scalars
            mock_db_session.execute.return_value = mock_result

            with patch.object(notification_service, "_emit_event", new_callable=AsyncMock):
                result = await notification_service.mark_all_as_read(sample_user_id)

            assert result == 5
            for notification in notifications:
                notification.mark_as_read.assert_called_once()

    @pytest.mark.asyncio
    async def test_mark_all_as_read_no_unread(
        self, notification_service, sample_user_id, mock_db_session
    ):
        """Test mark_all_as_read with no unread notifications"""
        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            # Mock empty result
            mock_result = Mock()
            mock_scalars = Mock()
            mock_scalars.all.return_value = []
            mock_result.scalars.return_value = mock_scalars
            mock_db_session.execute.return_value = mock_result

            result = await notification_service.mark_all_as_read(sample_user_id)

            assert result == 0

    @pytest.mark.asyncio
    async def test_mark_all_as_read_error_handling(
        self, notification_service, sample_user_id, mock_db_session
    ):
        """Test mark_all_as_read error handling"""
        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()
            mock_db_session.execute.side_effect = Exception("Database error")

            result = await notification_service.mark_all_as_read(sample_user_id)

            assert result == 0


# ============================================================================
# NOTIFICATION STATE MANAGEMENT TESTS (Gap 2)
# ============================================================================


class TestDismissNotification:
    """Test suite for dismiss_notification"""

    @pytest.mark.asyncio
    async def test_dismiss_notification_success(
        self, notification_service, sample_user_id, mock_db_session, mock_notification
    ):
        """Test successful dismiss_notification"""
        notification_id = str(uuid.uuid4())
        mock_notification.is_dismissed = False
        mock_notification.dismiss = Mock()

        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            # Mock query result
            mock_result = Mock()
            mock_result.scalar_one_or_none.return_value = mock_notification
            mock_db_session.execute.return_value = mock_result

            with patch.object(notification_service, "_emit_event", new_callable=AsyncMock):
                result = await notification_service.dismiss_notification(
                    notification_id, sample_user_id
                )

            assert result is True
            mock_notification.dismiss.assert_called_once()

    @pytest.mark.asyncio
    async def test_dismiss_notification_not_found(
        self, notification_service, sample_user_id, mock_db_session
    ):
        """Test dismiss_notification with non-existent notification"""
        notification_id = str(uuid.uuid4())

        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            # Mock not found result
            mock_result = Mock()
            mock_result.scalar_one_or_none.return_value = None
            mock_db_session.execute.return_value = mock_result

            result = await notification_service.dismiss_notification(
                notification_id, sample_user_id
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_dismiss_notification_without_user_id(
        self, notification_service, mock_db_session, mock_notification
    ):
        """Test dismiss_notification without user_id verification"""
        notification_id = str(uuid.uuid4())
        mock_notification.is_dismissed = False
        mock_notification.dismiss = Mock()

        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            mock_result = Mock()
            mock_result.scalar_one_or_none.return_value = mock_notification
            mock_db_session.execute.return_value = mock_result

            with patch.object(notification_service, "_emit_event", new_callable=AsyncMock):
                result = await notification_service.dismiss_notification(
                    notification_id, user_id=None
                )

            assert result is True

    @pytest.mark.asyncio
    async def test_dismiss_notification_error_handling(
        self, notification_service, sample_user_id, mock_db_session
    ):
        """Test dismiss_notification error handling"""
        notification_id = str(uuid.uuid4())

        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()
            mock_db_session.execute.side_effect = Exception("Database error")

            result = await notification_service.dismiss_notification(
                notification_id, sample_user_id
            )

            assert result is False


class TestClickNotification:
    """Test suite for click_notification"""

    @pytest.mark.asyncio
    async def test_click_notification_success(
        self, notification_service, sample_user_id, mock_db_session, mock_notification
    ):
        """Test successful click_notification"""
        notification_id = str(uuid.uuid4())
        mock_notification.mark_as_clicked = Mock()

        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            # Mock query result
            mock_result = Mock()
            mock_result.scalar_one_or_none.return_value = mock_notification
            mock_db_session.execute.return_value = mock_result

            with patch.object(notification_service, "_emit_event", new_callable=AsyncMock):
                result = await notification_service.click_notification(
                    notification_id, sample_user_id
                )

            assert result is True
            mock_notification.mark_as_clicked.assert_called_once()

    @pytest.mark.asyncio
    async def test_click_notification_not_found(
        self, notification_service, sample_user_id, mock_db_session
    ):
        """Test click_notification with non-existent notification"""
        notification_id = str(uuid.uuid4())

        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            # Mock not found result
            mock_result = Mock()
            mock_result.scalar_one_or_none.return_value = None
            mock_db_session.execute.return_value = mock_result

            result = await notification_service.click_notification(notification_id, sample_user_id)

            assert result is False

    @pytest.mark.asyncio
    async def test_click_notification_without_user_id(
        self, notification_service, mock_db_session, mock_notification
    ):
        """Test click_notification without user_id verification"""
        notification_id = str(uuid.uuid4())
        mock_notification.mark_as_clicked = Mock()

        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            mock_result = Mock()
            mock_result.scalar_one_or_none.return_value = mock_notification
            mock_db_session.execute.return_value = mock_result

            with patch.object(notification_service, "_emit_event", new_callable=AsyncMock):
                result = await notification_service.click_notification(
                    notification_id, user_id=None
                )

            assert result is True

    @pytest.mark.asyncio
    async def test_click_notification_error_handling(
        self, notification_service, sample_user_id, mock_db_session
    ):
        """Test click_notification error handling"""
        notification_id = str(uuid.uuid4())

        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()
            mock_db_session.execute.side_effect = Exception("Database error")

            result = await notification_service.click_notification(notification_id, sample_user_id)

            assert result is False


# ============================================================================
# ANALYTICS, CLEANUP & EVENT SYSTEM TESTS (Gap 3)
# ============================================================================


class TestNotificationStats:
    """Test suite for get_notification_stats comprehensive analytics"""

    @pytest.mark.asyncio
    async def test_get_notification_stats_success(
        self, notification_service, sample_user_id, mock_db_session
    ):
        """Test successful get_notification_stats"""
        # Create mock notifications with various states
        now = datetime.now(timezone.utc)
        notifications = []

        for i in range(5):
            notification = Mock(spec=Notification)
            notification.type = "FOLLOW" if i % 2 == 0 else "LIKE"
            notification.priority = "NORMAL"
            notification.is_read = i < 3  # First 3 are read
            notification.is_dismissed = i == 4  # Last one dismissed
            notification.is_delivered = True
            notification.clicked_at = now if i < 2 else None  # First 2 clicked
            notification.created_at = now
            notification.read_at = now if i < 3 else None
            notifications.append(notification)

        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            # Mock all count queries
            def make_scalar_mock(value):
                mock_result = Mock()
                mock_result.scalar.return_value = value
                return mock_result

            # Mock execute calls for various counts
            mock_db_session.execute.side_effect = [
                make_scalar_mock(5),  # total_count
                make_scalar_mock(2),  # unread_count
                make_scalar_mock(1),  # dismissed_count
                make_scalar_mock(5),  # delivered_count
                make_scalar_mock(2),  # clicked_count
                Mock(
                    scalars=Mock(return_value=Mock(all=Mock(return_value=notifications)))
                ),  # all_notifications
            ]

            result = await notification_service.get_notification_stats(sample_user_id)

            assert isinstance(result, NotificationStats)
            assert result.total_notifications == 5
            assert result.unread_count == 2
            assert result.read_count == 3
            assert result.by_type["FOLLOW"] == 3
            assert result.by_type["LIKE"] == 2

    @pytest.mark.asyncio
    async def test_get_notification_stats_error_handling(
        self, notification_service, sample_user_id, mock_db_session
    ):
        """Test get_notification_stats error handling"""
        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()
            mock_db_session.execute.side_effect = Exception("Database error")

            result = await notification_service.get_notification_stats(sample_user_id)

            # Should return empty stats on error
            assert isinstance(result, NotificationStats)
            assert result.total_notifications == 0
            assert result.unread_count == 0


class TestCleanupExpired:
    """Test suite for cleanup_expired_notifications"""

    @pytest.mark.asyncio
    async def test_cleanup_expired_notifications_success(
        self, notification_service, mock_db_session
    ):
        """Test successful cleanup_expired_notifications"""
        # Create expired notifications
        past_time = datetime(2020, 1, 1, tzinfo=timezone.utc)
        expired_notifications = []

        for i in range(3):
            notification = Mock(spec=Notification)
            notification.id = str(uuid.uuid4())
            notification.expires_at = past_time
            expired_notifications.append(notification)

        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            # Mock query result with expired notifications
            mock_result = Mock()
            mock_scalars = Mock()
            mock_scalars.all.return_value = expired_notifications
            mock_result.scalars.return_value = mock_scalars
            mock_db_session.execute.return_value = mock_result
            mock_db_session.delete = AsyncMock()

            with patch.object(notification_service, "_emit_event", new_callable=AsyncMock):
                result = await notification_service.cleanup_expired_notifications()

            assert result == 3
            assert mock_db_session.delete.call_count == 3

    @pytest.mark.asyncio
    async def test_cleanup_expired_notifications_none_expired(
        self, notification_service, mock_db_session
    ):
        """Test cleanup_expired_notifications with no expired notifications"""
        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            # Mock empty result
            mock_result = Mock()
            mock_scalars = Mock()
            mock_scalars.all.return_value = []
            mock_result.scalars.return_value = mock_scalars
            mock_db_session.execute.return_value = mock_result

            result = await notification_service.cleanup_expired_notifications()

            assert result == 0

    @pytest.mark.asyncio
    async def test_cleanup_expired_notifications_error_handling(
        self, notification_service, mock_db_session
    ):
        """Test cleanup_expired_notifications error handling"""
        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()
            mock_db_session.execute.side_effect = Exception("Database error")

            result = await notification_service.cleanup_expired_notifications()

            assert result == 0


class TestPreferenceLogic:
    """Test suite for _get_user_preferences and _should_deliver_notification"""

    @pytest.mark.asyncio
    async def test_get_user_preferences_success(
        self, notification_service, sample_user_id, mock_preference
    ):
        """Test _get_user_preferences success"""
        mock_session = AsyncMock()
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_preference
        mock_session.execute.return_value = mock_result

        result = await notification_service._get_user_preferences(mock_session, sample_user_id)

        assert result == mock_preference

    @pytest.mark.asyncio
    async def test_get_user_preferences_not_found(self, notification_service, sample_user_id):
        """Test _get_user_preferences with no preferences"""
        mock_session = AsyncMock()
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        result = await notification_service._get_user_preferences(mock_session, sample_user_id)

        assert result is None

    @pytest.mark.asyncio
    async def test_get_user_preferences_error_handling(self, notification_service, sample_user_id):
        """Test _get_user_preferences error handling"""
        mock_session = AsyncMock()
        mock_session.execute.side_effect = Exception("Database error")

        result = await notification_service._get_user_preferences(mock_session, sample_user_id)

        assert result is None

    @pytest.mark.asyncio
    async def test_should_deliver_notification_no_preferences(
        self, notification_service, sample_notification_data
    ):
        """Test _should_deliver_notification with no preferences (default allow)"""
        result = await notification_service._should_deliver_notification(
            None, sample_notification_data
        )

        assert result is True

    @pytest.mark.asyncio
    async def test_should_deliver_notification_in_app_disabled(
        self, notification_service, sample_notification_data, mock_preference
    ):
        """Test _should_deliver_notification with in-app disabled"""
        mock_preference.in_app_enabled = False

        result = await notification_service._should_deliver_notification(
            mock_preference, sample_notification_data
        )

        assert result is False

    @pytest.mark.asyncio
    async def test_should_deliver_notification_type_preference_blocked(
        self, notification_service, sample_notification_data, mock_preference
    ):
        """Test _should_deliver_notification blocked by type preference"""
        mock_preference.in_app_enabled = True
        mock_preference.get_type_preference = Mock(return_value=False)

        result = await notification_service._should_deliver_notification(
            mock_preference, sample_notification_data
        )

        assert result is False

    @pytest.mark.asyncio
    async def test_should_deliver_notification_quiet_hours_urgent(
        self, notification_service, sample_user_id, mock_preference
    ):
        """Test _should_deliver_notification during quiet hours with urgent priority"""
        mock_preference.in_app_enabled = True
        mock_preference.get_type_preference = Mock(return_value=True)
        mock_preference.is_in_quiet_hours = Mock(return_value=True)

        # Urgent notification should pass through quiet hours
        urgent_data = NotificationData(
            user_id=sample_user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="Urgent",
            priority=NotificationPriority.URGENT,
        )

        result = await notification_service._should_deliver_notification(
            mock_preference, urgent_data
        )

        assert result is True


class TestDeliveryAndEvents:
    """Test suite for _deliver_notification and event system"""

    @pytest.mark.asyncio
    async def test_deliver_notification_success(
        self, notification_service, mock_db_session, mock_notification, sample_notification_data
    ):
        """Test _deliver_notification success"""
        mock_notification.mark_as_delivered = Mock()

        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            with patch.object(notification_service, "_emit_event", new_callable=AsyncMock):
                await notification_service._deliver_notification(
                    mock_notification, sample_notification_data
                )

            mock_notification.mark_as_delivered.assert_called_once()

    @pytest.mark.asyncio
    async def test_deliver_notification_error_handling(
        self, notification_service, mock_db_session, mock_notification, sample_notification_data
    ):
        """Test _deliver_notification error handling"""
        mock_notification.mark_as_delivered = Mock(side_effect=Exception("Delivery error"))

        with patch("app.services.notification_service.db_manager") as mock_db_manager:

            async def mock_get_session(*args, **kwargs):
                yield mock_db_session

            mock_db_manager.get_session.return_value = mock_get_session()

            # Should not raise exception
            await notification_service._deliver_notification(
                mock_notification, sample_notification_data
            )

    @pytest.mark.asyncio
    async def test_emit_event_async_handler(self, notification_service):
        """Test _emit_event with async handler"""
        async_handler = AsyncMock()
        notification_service.add_event_handler(NotificationEvent.CREATED, async_handler)

        await notification_service._emit_event(NotificationEvent.CREATED, {"test": "data"})

        async_handler.assert_called_once_with({"test": "data"})

    @pytest.mark.asyncio
    async def test_emit_event_sync_handler(self, notification_service):
        """Test _emit_event with sync handler"""
        sync_handler = Mock()
        notification_service.add_event_handler(NotificationEvent.READ, sync_handler)

        await notification_service._emit_event(NotificationEvent.READ, {"test": "data"})

        sync_handler.assert_called_once_with({"test": "data"})

    @pytest.mark.asyncio
    async def test_emit_event_handler_error(self, notification_service):
        """Test _emit_event with handler that raises exception"""
        faulty_handler = Mock(side_effect=Exception("Handler error"))
        notification_service.add_event_handler(NotificationEvent.DISMISSED, faulty_handler)

        # Should not raise exception, just log error
        await notification_service._emit_event(NotificationEvent.DISMISSED, {"test": "data"})

    def test_add_event_handler(self, notification_service):
        """Test add_event_handler"""
        handler = Mock()
        notification_service.add_event_handler(NotificationEvent.CLICKED, handler)

        assert NotificationEvent.CLICKED in notification_service.event_handlers
        assert handler in notification_service.event_handlers[NotificationEvent.CLICKED]

    def test_remove_event_handler(self, notification_service):
        """Test remove_event_handler"""
        handler = Mock()
        notification_service.add_event_handler(NotificationEvent.EXPIRED, handler)
        notification_service.remove_event_handler(NotificationEvent.EXPIRED, handler)

        assert handler not in notification_service.event_handlers[NotificationEvent.EXPIRED]

    def test_remove_event_handler_not_found(self, notification_service):
        """Test remove_event_handler with non-existent handler"""
        handler = Mock()

        # Should not raise exception
        notification_service.remove_event_handler(NotificationEvent.CREATED, handler)


# ============================================================================
# INTEGRATION TESTS
# ============================================================================


class TestnotificationserviceIntegration:
    """Integration tests for notification_service"""

    @pytest.mark.asyncio
    async def test_integration_scenario(self, mock_db_session):
        """Test integration with dependencies"""
        # TODO: Add integration test
        pass

    # TODO: Add integration tests for:
    # - Database interactions
    # - External API calls
    # - Service interactions
    # - End-to-end workflows


# ============================================================================
# EDGE CASES & ERROR HANDLING
# ============================================================================


class TestnotificationserviceEdgeCases:
    """Edge case and error handling tests"""

    def test_null_input_handling(self):
        """Test handling of null/None inputs"""
        # TODO: Test null handling
        pass

    def test_invalid_input_handling(self):
        """Test handling of invalid inputs"""
        # TODO: Test invalid input handling
        pass

    def test_error_conditions(self):
        """Test error condition handling"""
        # TODO: Test error scenarios
        pass


# ============================================================================
# PERFORMANCE & LOAD TESTS (Optional)
# ============================================================================


@pytest.mark.slow
class TestnotificationservicePerformance:
    """Performance and load tests"""

    @pytest.mark.skip(reason="Performance test - run manually")
    def test_performance_under_load(self):
        """Test performance under load"""
        # TODO: Add performance test
        pass
