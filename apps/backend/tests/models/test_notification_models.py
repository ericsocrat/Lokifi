import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.models.notification_models import (
    Notification,
    NotificationPriority,
    NotificationType,
)


class TestNotificationType:
    """Test NotificationType enumeration"""

    def test_notification_types_defined(self):
        """Test all notification types are defined"""
        assert NotificationType.FOLLOW.value == "follow"
        assert NotificationType.DM_MESSAGE_RECEIVED.value == "dm_message_received"
        assert NotificationType.AI_REPLY_FINISHED.value == "ai_reply_finished"
        assert NotificationType.MENTION.value == "mention"
        assert NotificationType.SYSTEM_ALERT.value == "system_alert"
        assert NotificationType.ANNOUNCEMENT.value == "announcement"

    def test_notification_types_string_enum(self):
        """Test NotificationType is a string enum"""
        assert isinstance(NotificationType.FOLLOW, str)
        assert NotificationType.FOLLOW == "follow"


class TestNotificationPriority:
    """Test NotificationPriority enumeration"""

    def test_priority_levels_defined(self):
        """Test all priority levels are defined"""
        assert NotificationPriority.LOW.value == "low"
        assert NotificationPriority.NORMAL.value == "normal"
        assert NotificationPriority.HIGH.value == "high"
        assert NotificationPriority.URGENT.value == "urgent"

    def test_priority_is_string_enum(self):
        """Test NotificationPriority is a string enum"""
        assert isinstance(NotificationPriority.NORMAL, str)
        assert NotificationPriority.NORMAL == "normal"


class TestNotificationModel:
    """Test Notification model"""

    def test_notification_creation(self):
        """Test basic notification creation"""
        user_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.FOLLOW.value,
            title="Test Notification",
        )
        assert notif.user_id == user_id
        assert notif.type == "follow"
        assert notif.title == "Test Notification"

    def test_notification_default_values(self):
        """Test notification fields that can be set directly"""
        user_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.SYSTEM_ALERT.value,
            title="System Alert",
            # Explicitly set created_at to test it can be set
            created_at=datetime.now(timezone.utc),
        )
        assert notif.created_at is not None
        # priority, is_read, is_delivered etc. default in database, not in Python

    def test_notification_with_message(self):
        """Test notification with message"""
        user_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.DM_MESSAGE_RECEIVED.value,
            title="New Message",
            message="You have a new direct message",
        )
        assert notif.message == "You have a new direct message"

    def test_notification_with_payload(self):
        """Test notification with JSON payload"""
        user_id = uuid.uuid4()
        payload = {"user_id": str(uuid.uuid4()), "message": "test"}
        notif = Notification(
            user_id=user_id,
            type=NotificationType.MENTION.value,
            title="You were mentioned",
            payload=payload,
        )
        assert notif.payload == payload

    def test_notification_with_category(self):
        """Test notification with category"""
        user_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.SYSTEM_ALERT.value,
            title="Alert",
            category="security",
        )
        assert notif.category == "security"

    def test_notification_with_priority(self):
        """Test notification with priority"""
        user_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.SYSTEM_ALERT.value,
            title="Urgent Alert",
            priority=NotificationPriority.URGENT.value,
        )
        assert notif.priority == "urgent"

    def test_notification_mark_as_read(self):
        """Test marking notification as read"""
        user_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.FOLLOW.value,
            title="Test",
        )
        # Before calling mark_as_read
        notif.mark_as_read()
        assert notif.is_read is True
        assert notif.read_at is not None

    def test_notification_mark_as_read_idempotent(self):
        """Test marking as read multiple times"""
        user_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.FOLLOW.value,
            title="Test",
        )
        notif.mark_as_read()
        first_read_time = notif.read_at

        notif.mark_as_read()
        # Should not update timestamp if already read
        assert notif.read_at == first_read_time

    def test_notification_mark_as_delivered(self):
        """Test marking notification as delivered"""
        user_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.DM_MESSAGE_RECEIVED.value,
            title="Message",
        )
        notif.mark_as_delivered()
        assert notif.is_delivered is True
        assert notif.delivered_at is not None

    def test_notification_mark_as_clicked(self):
        """Test marking notification as clicked"""
        user_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.MENTION.value,
            title="Mention",
        )
        notif.mark_as_clicked()
        assert notif.clicked_at is not None
        # Should also mark as read
        assert notif.is_read is True

    def test_notification_dismiss(self):
        """Test dismissing notification"""
        user_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.ANNOUNCEMENT.value,
            title="Announcement",
        )
        notif.dismiss()
        assert notif.is_dismissed is True
        assert notif.dismissed_at is not None
        assert notif.is_read is True

    def test_notification_is_expired_no_expiration(self):
        """Test notification without expiration never expires"""
        user_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.SYSTEM_ALERT.value,
            title="Alert",
        )
        assert notif.is_expired is False

    def test_notification_is_expired_future(self):
        """Test notification that expires in future is not expired"""
        user_id = uuid.uuid4()
        future = datetime.now(timezone.utc) + timedelta(hours=1)
        notif = Notification(
            user_id=user_id,
            type=NotificationType.SYSTEM_ALERT.value,
            title="Alert",
            expires_at=future,
        )
        assert notif.is_expired is False

    def test_notification_is_expired_past(self):
        """Test notification that expires in past is expired"""
        user_id = uuid.uuid4()
        past = datetime.now(timezone.utc) - timedelta(hours=1)
        notif = Notification(
            user_id=user_id,
            type=NotificationType.SYSTEM_ALERT.value,
            title="Alert",
            expires_at=past,
        )
        assert notif.is_expired is True

    def test_notification_age_seconds(self):
        """Test getting notification age in seconds"""
        user_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.FOLLOW.value,
            title="Test",
            created_at=datetime.now(timezone.utc) - timedelta(seconds=30),
        )
        age = notif.age_seconds
        # Should be approximately 30 seconds (allow some variance)
        assert 25 <= age <= 35

    def test_notification_with_related_entity(self):
        """Test notification with related entity"""
        user_id = uuid.uuid4()
        entity_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.MENTION.value,
            title="Mention in message",
            related_entity_type="message",
            related_entity_id=entity_id,
        )
        assert notif.related_entity_type == "message"
        assert notif.related_entity_id == entity_id

    def test_notification_with_related_user(self):
        """Test notification with related user"""
        user_id = uuid.uuid4()
        related_user_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.FOLLOW.value,
            title="New follower",
            related_user_id=related_user_id,
        )
        assert notif.related_user_id == related_user_id

    def test_notification_with_batch_id(self):
        """Test notification with batch ID"""
        user_id = uuid.uuid4()
        batch_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.ANNOUNCEMENT.value,
            title="Announcement",
            batch_id=batch_id,
        )
        assert notif.batch_id == batch_id

    def test_notification_with_parent(self):
        """Test notification with parent notification"""
        user_id = uuid.uuid4()
        parent_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.FOLLOW.value,
            title="Follow notification",
            parent_notification_id=parent_id,
        )
        assert notif.parent_notification_id == parent_id

    def test_notification_repr(self):
        """Test notification string representation"""
        user_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.FOLLOW.value,
            title="Follow",
        )
        repr_str = repr(notif)
        assert "Notification" in repr_str
        assert "follow" in repr_str
        assert "Follow" in repr_str

    def test_notification_all_delivery_channels_combined(self):
        """Test notification with multiple delivery channels"""
        user_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.SYSTEM_ALERT.value,
            title="Important Alert",
            email_sent=True,
            push_sent=True,
            in_app_sent=True,
        )
        assert notif.email_sent is True
        assert notif.push_sent is True
        assert notif.in_app_sent is True

    def test_notification_archived(self):
        """Test notification archive flag"""
        user_id = uuid.uuid4()
        notif = Notification(
            user_id=user_id,
            type=NotificationType.SYSTEM_ALERT.value,
            title="Alert",
            is_archived=True,
        )
        assert notif.is_archived is True

    def test_notification_with_multiple_timestamps(self):
        """Test notification with multiple action timestamps"""
        user_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        notif = Notification(
            user_id=user_id,
            type=NotificationType.DM_MESSAGE_RECEIVED.value,
            title="Message",
            created_at=now,
            delivered_at=now + timedelta(seconds=1),
            read_at=now + timedelta(seconds=5),
            clicked_at=now + timedelta(seconds=10),
        )
        assert notif.created_at < notif.delivered_at < notif.read_at < notif.clicked_at
