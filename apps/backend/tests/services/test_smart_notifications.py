"""
Tests for app.services.smart_notifications

Comprehensive tests for the smart notification system.
"""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.notification_models import NotificationPriority, NotificationType
from app.services.smart_notifications import (
    BatchingStrategy,
    DeliveryChannel,
    NotificationBatch,
    NotificationTemplate,
    RichNotificationData,
    SmartNotificationProcessor,
    SmartNotificationServiceWrapper,
    schedule_notification,
    send_batched_notification,
    send_rich_notification,
    smart_notification_processor,
    smart_notification_service,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def fresh_processor():
    """Create a fresh SmartNotificationProcessor instance."""
    return SmartNotificationProcessor()


@pytest.fixture
def sample_user_id():
    """Sample user ID for testing."""
    return str(uuid.uuid4())


@pytest.fixture
def sample_rich_notification(sample_user_id):
    """Create a sample RichNotificationData."""
    return RichNotificationData(
        user_id=sample_user_id,
        type=NotificationType.SYSTEM_ALERT,
        title="Test Notification",
        message="This is a test notification",
    )


@pytest.fixture
def sample_batch(sample_user_id, sample_rich_notification):
    """Create a sample NotificationBatch."""
    return NotificationBatch(
        batch_id=str(uuid.uuid4()),
        user_id=sample_user_id,
        notifications=[sample_rich_notification],
        created_at=datetime.now(timezone.utc),
        strategy=BatchingStrategy.SMART_GROUPING,
        delivery_time=datetime.now(timezone.utc) + timedelta(minutes=5),
        title_template="You have {count} new notifications",
        message_template="Updates from {types}",
    )


# ============================================================================
# ENUM TESTS
# ============================================================================


class TestNotificationTemplate:
    """Tests for NotificationTemplate enum."""

    def test_simple_template(self):
        """Test SIMPLE template value."""
        assert NotificationTemplate.SIMPLE.value == "simple"

    def test_rich_media_template(self):
        """Test RICH_MEDIA template value."""
        assert NotificationTemplate.RICH_MEDIA.value == "rich_media"

    def test_interactive_template(self):
        """Test INTERACTIVE template value."""
        assert NotificationTemplate.INTERACTIVE.value == "interactive"

    def test_card_template(self):
        """Test CARD template value."""
        assert NotificationTemplate.CARD.value == "card"

    def test_list_template(self):
        """Test LIST template value."""
        assert NotificationTemplate.LIST.value == "list"

    def test_timeline_template(self):
        """Test TIMELINE template value."""
        assert NotificationTemplate.TIMELINE.value == "timeline"


class TestBatchingStrategy:
    """Tests for BatchingStrategy enum."""

    def test_immediate_strategy(self):
        """Test IMMEDIATE strategy value."""
        assert BatchingStrategy.IMMEDIATE.value == "immediate"

    def test_time_based_strategy(self):
        """Test TIME_BASED strategy value."""
        assert BatchingStrategy.TIME_BASED.value == "time_based"

    def test_count_based_strategy(self):
        """Test COUNT_BASED strategy value."""
        assert BatchingStrategy.COUNT_BASED.value == "count_based"

    def test_smart_grouping_strategy(self):
        """Test SMART_GROUPING strategy value."""
        assert BatchingStrategy.SMART_GROUPING.value == "smart_grouping"

    def test_user_preference_strategy(self):
        """Test USER_PREFERENCE strategy value."""
        assert BatchingStrategy.USER_PREFERENCE.value == "user_preference"


class TestDeliveryChannel:
    """Tests for DeliveryChannel enum."""

    def test_websocket_channel(self):
        """Test WEBSOCKET channel value."""
        assert DeliveryChannel.WEBSOCKET.value == "websocket"

    def test_email_channel(self):
        """Test EMAIL channel value."""
        assert DeliveryChannel.EMAIL.value == "email"

    def test_push_channel(self):
        """Test PUSH channel value."""
        assert DeliveryChannel.PUSH.value == "push"

    def test_sms_channel(self):
        """Test SMS channel value."""
        assert DeliveryChannel.SMS.value == "sms"

    def test_in_app_channel(self):
        """Test IN_APP channel value."""
        assert DeliveryChannel.IN_APP.value == "in_app"


# ============================================================================
# RICH NOTIFICATION DATA TESTS
# ============================================================================


class TestRichNotificationData:
    """Tests for RichNotificationData dataclass."""

    def test_create_basic(self, sample_user_id):
        """Test creating basic notification."""
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="Test",
            message="Test message",
        )
        assert notification.user_id == sample_user_id
        assert notification.title == "Test"

    def test_default_template(self, sample_user_id):
        """Test default template is SIMPLE."""
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="Test",
            message="Test message",
        )
        assert notification.template == NotificationTemplate.SIMPLE

    def test_default_priority(self, sample_user_id):
        """Test default priority is NORMAL."""
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="Test",
            message="Test message",
        )
        assert notification.priority == NotificationPriority.NORMAL

    def test_default_channels(self, sample_user_id):
        """Test default channel is IN_APP."""
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="Test",
            message="Test message",
        )
        assert DeliveryChannel.IN_APP in notification.channels

    def test_default_batch_strategy(self, sample_user_id):
        """Test default batch strategy is IMMEDIATE."""
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="Test",
            message="Test message",
        )
        assert notification.batch_strategy == BatchingStrategy.IMMEDIATE

    def test_custom_values(self, sample_user_id):
        """Test creating notification with custom values."""
        scheduled_time = datetime.now(timezone.utc) + timedelta(hours=1)
        expires_time = datetime.now(timezone.utc) + timedelta(hours=24)

        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.FOLLOW,
            title="New Follower",
            message="You have a new follower",
            template=NotificationTemplate.RICH_MEDIA,
            priority=NotificationPriority.HIGH,
            channels=[DeliveryChannel.WEBSOCKET, DeliveryChannel.EMAIL],
            scheduled_for=scheduled_time,
            expires_at=expires_time,
            payload={"follower_id": "123"},
            media={"image": "http://example.com/image.jpg"},
            actions=[{"action": "view_profile", "label": "View Profile"}],
            grouping_key="follows",
            batch_strategy=BatchingStrategy.SMART_GROUPING,
            a_b_test_group="template_test",
        )

        assert notification.template == NotificationTemplate.RICH_MEDIA
        assert notification.priority == NotificationPriority.HIGH
        assert len(notification.channels) == 2
        assert notification.scheduled_for == scheduled_time
        assert notification.expires_at == expires_time
        assert notification.payload["follower_id"] == "123"
        assert notification.media["image"] == "http://example.com/image.jpg"
        assert len(notification.actions) == 1
        assert notification.batch_strategy == BatchingStrategy.SMART_GROUPING


# ============================================================================
# NOTIFICATION BATCH TESTS
# ============================================================================


class TestNotificationBatch:
    """Tests for NotificationBatch dataclass."""

    def test_create_batch(self, sample_batch):
        """Test creating a notification batch."""
        assert sample_batch.batch_id is not None
        assert sample_batch.strategy == BatchingStrategy.SMART_GROUPING
        assert len(sample_batch.notifications) == 1

    def test_batch_templates(self, sample_batch):
        """Test batch has templates."""
        assert "{count}" in sample_batch.title_template
        assert "{types}" in sample_batch.message_template


# ============================================================================
# SMART NOTIFICATION PROCESSOR TESTS
# ============================================================================


class TestSmartNotificationProcessorInit:
    """Tests for SmartNotificationProcessor initialization."""

    def test_initialization(self, fresh_processor):
        """Test processor initializes correctly."""
        assert fresh_processor.pending_batches == {}
        assert fresh_processor.user_batching_preferences == {}
        assert fresh_processor.a_b_test_variants == {}


class TestProcessRichNotification:
    """Tests for process_rich_notification method."""

    @pytest.mark.asyncio
    async def test_immediate_notification(
        self, fresh_processor, sample_rich_notification
    ):
        """Test processing immediate notification."""
        with patch.object(
            fresh_processor, "_create_rich_notification", new_callable=AsyncMock
        ) as mock_create:
            mock_create.return_value = True

            result = await fresh_processor.process_rich_notification(
                sample_rich_notification
            )

            assert result is True
            mock_create.assert_called_once()

    @pytest.mark.asyncio
    async def test_scheduled_notification(self, fresh_processor, sample_user_id):
        """Test processing scheduled notification."""
        scheduled_time = datetime.now(timezone.utc) + timedelta(hours=1)
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="Scheduled Test",
            message="This is scheduled",
            scheduled_for=scheduled_time,
        )

        with patch.object(
            fresh_processor, "_schedule_notification", new_callable=AsyncMock
        ) as mock_schedule:
            mock_schedule.return_value = "schedule-123"

            result = await fresh_processor.process_rich_notification(notification)

            assert result == "schedule-123"
            mock_schedule.assert_called_once()

    @pytest.mark.asyncio
    async def test_batched_notification(self, fresh_processor, sample_user_id):
        """Test processing batched notification."""
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="Batch Test",
            message="This is batched",
            batch_strategy=BatchingStrategy.SMART_GROUPING,
        )

        with patch.object(
            fresh_processor, "_apply_batching_strategy", new_callable=AsyncMock
        ) as mock_batch:
            mock_batch.return_value = "batch-123"

            result = await fresh_processor.process_rich_notification(notification)

            assert result == "batch-123"
            mock_batch.assert_called_once()

    @pytest.mark.asyncio
    async def test_ab_test_notification(self, fresh_processor, sample_user_id):
        """Test processing A/B test notification."""
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="A/B Test",
            message="This has A/B testing",
            a_b_test_group="test_group",
        )

        with (
            patch.object(
                fresh_processor, "_apply_ab_testing", new_callable=AsyncMock
            ) as mock_ab,
            patch.object(
                fresh_processor, "_create_rich_notification", new_callable=AsyncMock
            ) as mock_create,
        ):
            mock_ab.return_value = notification
            mock_create.return_value = True

            result = await fresh_processor.process_rich_notification(notification)

            assert result is True
            mock_ab.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_handles_error(self, fresh_processor, sample_user_id):
        """Test processing handles errors gracefully."""
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="Error Test",
            message="This will error",
        )

        with patch.object(
            fresh_processor, "_create_rich_notification", new_callable=AsyncMock
        ) as mock_create:
            mock_create.side_effect = Exception("Test error")

            result = await fresh_processor.process_rich_notification(notification)

            assert result is False


class TestScheduleNotification:
    """Tests for _schedule_notification method."""

    @pytest.mark.asyncio
    async def test_schedule_returns_id(self, fresh_processor, sample_user_id):
        """Test scheduling returns an ID."""
        scheduled_time = datetime.now(timezone.utc) + timedelta(hours=1)
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="Scheduled",
            message="Message",
            scheduled_for=scheduled_time,
        )

        with patch(
            "app.services.smart_notifications.redis_client"
        ) as mock_redis_client:
            mock_redis_client.is_available = AsyncMock(return_value=True)
            mock_redis_client.client = AsyncMock()
            mock_redis_client.client.set = AsyncMock()

            result = await fresh_processor._schedule_notification(notification)

            assert isinstance(result, str)
            assert len(result) > 0

    @pytest.mark.asyncio
    async def test_schedule_redis_unavailable(self, fresh_processor, sample_user_id):
        """Test scheduling when Redis is unavailable."""
        scheduled_time = datetime.now(timezone.utc) + timedelta(hours=1)
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="Scheduled",
            message="Message",
            scheduled_for=scheduled_time,
        )

        with patch(
            "app.services.smart_notifications.redis_client"
        ) as mock_redis_client:
            mock_redis_client.is_available = AsyncMock(return_value=False)
            mock_redis_client.client = None

            result = await fresh_processor._schedule_notification(notification)

            # Should still return an ID even if Redis is unavailable
            assert isinstance(result, str)


class TestBatchingStrategies:
    """Tests for batching strategy methods."""

    @pytest.mark.asyncio
    async def test_smart_grouping_creates_batch(self, fresh_processor, sample_user_id):
        """Test smart grouping creates a new batch."""
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.FOLLOW,
            title="New Follower",
            message="You have a new follower",
        )

        result = await fresh_processor._smart_group_notification(notification)

        assert isinstance(result, str)
        assert len(fresh_processor.pending_batches) == 1

    @pytest.mark.asyncio
    async def test_smart_grouping_adds_to_batch(self, fresh_processor, sample_user_id):
        """Test smart grouping adds to existing batch."""
        # Create first notification to create batch
        notification1 = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.FOLLOW,
            title="Follower 1",
            message="First follower",
        )
        batch_id = await fresh_processor._smart_group_notification(notification1)

        # Second notification should join same batch
        notification2 = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.FOLLOW,
            title="Follower 2",
            message="Second follower",
        )
        result = await fresh_processor._smart_group_notification(notification2)

        assert result == batch_id
        assert len(fresh_processor.pending_batches[batch_id].notifications) == 2

    @pytest.mark.asyncio
    async def test_time_based_batching(self, fresh_processor, sample_user_id):
        """Test time-based batching."""
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.FOLLOW,
            title="Test",
            message="Message",
        )

        result = await fresh_processor._time_based_batching(notification)

        # Falls back to smart grouping
        assert isinstance(result, str)

    @pytest.mark.asyncio
    async def test_count_based_batching(self, fresh_processor, sample_user_id):
        """Test count-based batching."""
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.FOLLOW,
            title="Test",
            message="Message",
        )

        result = await fresh_processor._count_based_batching(notification)

        # Falls back to smart grouping
        assert isinstance(result, str)


class TestCanGroupWithBatch:
    """Tests for _can_group_with_batch method."""

    def test_can_group_same_type(
        self, fresh_processor, sample_batch, sample_rich_notification
    ):
        """Test grouping with same notification type."""
        notification = RichNotificationData(
            user_id=sample_batch.user_id,
            type=sample_batch.notifications[0].type,
            title="Same Type",
            message="Same type notification",
        )

        result = fresh_processor._can_group_with_batch(notification, sample_batch)

        assert result is True

    def test_cannot_group_different_type(
        self, fresh_processor, sample_user_id, sample_batch
    ):
        """Test cannot group with different notification type."""
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.DM_MESSAGE_RECEIVED,
            title="Different Type",
            message="Different type notification",
        )

        result = fresh_processor._can_group_with_batch(notification, sample_batch)

        assert result is False


class TestDeliverBatch:
    """Tests for _deliver_batch method."""

    @pytest.mark.asyncio
    async def test_deliver_batch_success(self, fresh_processor, sample_batch):
        """Test successful batch delivery."""
        with patch(
            "app.services.smart_notifications.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=MagicMock())

            result = await fresh_processor._deliver_batch(sample_batch)

            assert result is not None

    @pytest.mark.asyncio
    async def test_deliver_batch_error(self, fresh_processor, sample_batch):
        """Test batch delivery handles errors."""
        with patch(
            "app.services.smart_notifications.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(
                side_effect=Exception("Delivery failed")
            )

            result = await fresh_processor._deliver_batch(sample_batch)

            assert result is None


class TestApplyAbTesting:
    """Tests for _apply_ab_testing method."""

    @pytest.mark.asyncio
    async def test_ab_testing_template_a(self, fresh_processor, sample_user_id):
        """Test A/B testing applies template_a variant."""
        fresh_processor.a_b_test_variants["test"] = ["template_a"]
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="Test",
            message="Message",
            a_b_test_group="test",
        )

        result = await fresh_processor._apply_ab_testing(notification)

        assert result.template == NotificationTemplate.SIMPLE

    @pytest.mark.asyncio
    async def test_ab_testing_template_b(self, fresh_processor, sample_user_id):
        """Test A/B testing applies template_b variant."""
        fresh_processor.a_b_test_variants["test"] = ["template_b"]
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="Test",
            message="Message",
            a_b_test_group="test",
        )

        result = await fresh_processor._apply_ab_testing(notification)

        assert result.template == NotificationTemplate.RICH_MEDIA

    @pytest.mark.asyncio
    async def test_ab_testing_priority_high(self, fresh_processor, sample_user_id):
        """Test A/B testing applies priority_high variant."""
        fresh_processor.a_b_test_variants["test"] = ["priority_high"]
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="Test",
            message="Message",
            a_b_test_group="test",
        )

        result = await fresh_processor._apply_ab_testing(notification)

        assert result.priority == NotificationPriority.HIGH


class TestCreateRichNotification:
    """Tests for _create_rich_notification method."""

    @pytest.mark.asyncio
    async def test_create_notification_success(
        self, fresh_processor, sample_rich_notification
    ):
        """Test creating rich notification successfully."""
        with (
            patch(
                "app.services.smart_notifications.notification_service"
            ) as mock_service,
            patch.object(
                fresh_processor,
                "_record_notification_analytics",
                new_callable=AsyncMock,
            ),
        ):
            mock_service.create_notification = AsyncMock(return_value=MagicMock())

            result = await fresh_processor._create_rich_notification(
                sample_rich_notification
            )

            assert result is True

    @pytest.mark.asyncio
    async def test_create_notification_failure(
        self, fresh_processor, sample_rich_notification
    ):
        """Test creating rich notification failure."""
        with (
            patch(
                "app.services.smart_notifications.notification_service"
            ) as mock_service,
            patch.object(
                fresh_processor,
                "_record_notification_analytics",
                new_callable=AsyncMock,
            ),
        ):
            mock_service.create_notification = AsyncMock(return_value=None)

            result = await fresh_processor._create_rich_notification(
                sample_rich_notification
            )

            assert result is False


class TestGetUserNotificationPreferences:
    """Tests for get_user_notification_preferences method."""

    @pytest.mark.asyncio
    async def test_get_preferences_default(self, fresh_processor, sample_user_id):
        """Test getting default preferences when user has none."""
        with patch("app.services.smart_notifications.db_manager") as mock_db:

            async def mock_session_generator(*args, **kwargs):
                session = AsyncMock()
                result = MagicMock()
                result.scalar_one_or_none.return_value = None
                session.execute = AsyncMock(return_value=result)
                yield session

            mock_db.get_session = mock_session_generator

            result = await fresh_processor.get_user_notification_preferences(
                sample_user_id
            )

            assert result["batching_enabled"] is False
            assert result["preferred_batching_strategy"] == "immediate"

    def test_get_default_preferences(self, fresh_processor):
        """Test _get_default_preferences method."""
        result = fresh_processor._get_default_preferences()

        assert result["batching_enabled"] is False
        assert result["preferred_batching_strategy"] == "immediate"
        assert "websocket" in result["preferred_channels"]
        assert result["template_preference"] == "simple"


class TestConfigureAbTest:
    """Tests for configure_ab_test method."""

    @pytest.mark.asyncio
    async def test_configure_test(self, fresh_processor):
        """Test configuring A/B test."""
        await fresh_processor.configure_ab_test(
            "notification_style", ["simple", "rich", "card"]
        )

        assert "notification_style" in fresh_processor.a_b_test_variants
        assert len(fresh_processor.a_b_test_variants["notification_style"]) == 3


class TestGetPendingBatchesSummary:
    """Tests for get_pending_batches_summary method."""

    @pytest.mark.asyncio
    async def test_empty_summary(self, fresh_processor):
        """Test summary with no pending batches."""
        result = await fresh_processor.get_pending_batches_summary()

        assert result["total_batches"] == 0
        assert result["batches"] == []

    @pytest.mark.asyncio
    async def test_summary_with_batches(self, fresh_processor, sample_user_id):
        """Test summary with pending batches."""
        notification = RichNotificationData(
            user_id=sample_user_id,
            type=NotificationType.FOLLOW,
            title="Test",
            message="Message",
        )
        await fresh_processor._smart_group_notification(notification)

        result = await fresh_processor.get_pending_batches_summary()

        assert result["total_batches"] == 1
        assert len(result["batches"]) == 1
        assert result["batches"][0]["notification_count"] == 1


# ============================================================================
# SERVICE WRAPPER TESTS
# ============================================================================


class TestSmartNotificationServiceWrapper:
    """Tests for SmartNotificationServiceWrapper."""

    def test_create_batch(self, fresh_processor):
        """Test create_batch method."""
        wrapper = SmartNotificationServiceWrapper(fresh_processor)

        batch_id = wrapper.create_batch()

        assert isinstance(batch_id, str)
        assert len(wrapper.test_batches) == 1

    def test_add_to_batch(self, fresh_processor):
        """Test add_to_batch method."""
        wrapper = SmartNotificationServiceWrapper(fresh_processor)
        batch_id = wrapper.create_batch()

        wrapper.add_to_batch(batch_id, {"test": "data"})

        # Should not raise

    def test_get_pending_batches(self, fresh_processor):
        """Test get_pending_batches method."""
        wrapper = SmartNotificationServiceWrapper(fresh_processor)
        wrapper.create_batch()

        batches = wrapper.get_pending_batches()

        assert len(batches) == 1

    def test_configure_ab_test(self, fresh_processor):
        """Test configure_ab_test method."""
        wrapper = SmartNotificationServiceWrapper(fresh_processor)

        wrapper.configure_ab_test("test", ["a", "b"])

        assert "test" in fresh_processor.a_b_test_variants

    def test_get_ab_test_variant(self, fresh_processor):
        """Test get_ab_test_variant method."""
        wrapper = SmartNotificationServiceWrapper(fresh_processor)
        wrapper.configure_ab_test("test", ["a", "b"])

        variant = wrapper.get_ab_test_variant("user123", "test")

        assert variant in ["a", "b"]

    def test_get_ab_test_variant_default(self, fresh_processor):
        """Test get_ab_test_variant returns default for unknown test."""
        wrapper = SmartNotificationServiceWrapper(fresh_processor)

        variant = wrapper.get_ab_test_variant("user123", "unknown_test")

        assert variant == "default"


# ============================================================================
# GLOBAL INSTANCE TESTS
# ============================================================================


class TestGlobalInstances:
    """Tests for global instances."""

    def test_smart_notification_processor_exists(self):
        """Test global processor instance exists."""
        assert smart_notification_processor is not None
        assert isinstance(smart_notification_processor, SmartNotificationProcessor)

    def test_smart_notification_service_exists(self):
        """Test global service instance exists."""
        assert smart_notification_service is not None
        assert isinstance(smart_notification_service, SmartNotificationServiceWrapper)


# ============================================================================
# UTILITY FUNCTION TESTS
# ============================================================================


class TestUtilityFunctions:
    """Tests for utility functions."""

    @pytest.mark.asyncio
    async def test_send_rich_notification(self, sample_user_id):
        """Test send_rich_notification function."""
        with patch(
            "app.services.smart_notifications.smart_notification_processor"
        ) as mock_processor:
            mock_processor.process_rich_notification = AsyncMock(return_value=True)

            result = await send_rich_notification(
                user_id=sample_user_id,
                notification_type=NotificationType.SYSTEM_ALERT,
                title="Test",
                message="Test message",
            )

            assert result is True

    @pytest.mark.asyncio
    async def test_send_batched_notification(self, sample_user_id):
        """Test send_batched_notification function."""
        with patch(
            "app.services.smart_notifications.smart_notification_processor"
        ) as mock_processor:
            mock_processor.process_rich_notification = AsyncMock(
                return_value="batch-123"
            )

            result = await send_batched_notification(
                user_id=sample_user_id,
                notification_type=NotificationType.FOLLOW,
                title="New Follower",
                message="You have a new follower",
            )

            assert result == "batch-123"

    @pytest.mark.asyncio
    async def test_schedule_notification_function(self, sample_user_id):
        """Test schedule_notification function."""
        scheduled_time = datetime.now(timezone.utc) + timedelta(hours=1)

        with patch(
            "app.services.smart_notifications.smart_notification_processor"
        ) as mock_processor:
            mock_processor.process_rich_notification = AsyncMock(
                return_value="schedule-123"
            )

            result = await schedule_notification(
                user_id=sample_user_id,
                notification_type=NotificationType.SYSTEM_ALERT,
                title="Scheduled",
                message="This is scheduled",
                scheduled_for=scheduled_time,
            )

            assert result == "schedule-123"
