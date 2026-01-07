"""
Tests for NotificationEventEmitter

Comprehensive tests for the notification event emitter that creates
notifications for follows, DMs, AI replies, mentions, and system alerts.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.notification_emitter import (
    NotificationEventEmitter,
    notification_emitter,
)
from app.services.notification_service import NotificationPriority, NotificationType

# ============================================================================
# Mock User/Profile Classes
# ============================================================================


class MockProfile:
    """Mock profile for testing."""

    def __init__(
        self,
        username: str | None = "testuser",
        display_name: str | None = "Test User",
        avatar_url: str | None = "https://example.com/avatar.jpg",
    ):
        self.username = username
        self.display_name = display_name
        self.avatar_url = avatar_url


class MockUser:
    """Mock user for testing."""

    def __init__(
        self,
        user_id: int = 1,
        email: str = "test@example.com",
        full_name: str = "Test User",
        profile: MockProfile | None = None,
    ):
        self.id = user_id
        self.email = email
        self.full_name = full_name
        self.profile = profile if profile is not None else MockProfile()


# ============================================================================
# Test emit_follow_notification
# ============================================================================


class TestEmitFollowNotification:
    """Tests for emit_follow_notification."""

    @pytest.mark.asyncio
    async def test_follow_notification_created_successfully(self):
        """Test successful follow notification creation."""
        follower = MockUser(user_id=1, email="follower@test.com")
        followed = MockUser(user_id=2, email="followed@test.com")

        mock_notification = MagicMock(id=123)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            result = await NotificationEventEmitter.emit_follow_notification(
                follower, followed
            )

            assert result is True
            mock_service.create_notification.assert_called_once()

            # Verify notification data
            call_args = mock_service.create_notification.call_args[0][0]
            assert call_args.user_id == "2"
            assert call_args.type == NotificationType.FOLLOW
            assert call_args.priority == NotificationPriority.NORMAL
            assert call_args.category == "social"
            assert "started following you" in call_args.title
            assert call_args.payload["follower_id"] == "1"

    @pytest.mark.asyncio
    async def test_follow_notification_blocked_by_preferences(self):
        """Test when notification is blocked by user preferences."""
        follower = MockUser(user_id=1)
        followed = MockUser(user_id=2)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=None)

            result = await NotificationEventEmitter.emit_follow_notification(
                follower, followed
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_follow_notification_with_no_profile(self):
        """Test follow notification when users have no profile."""
        follower = MockUser(user_id=1, email="follower@test.com", profile=None)
        follower.profile = None
        followed = MockUser(user_id=2, email="followed@test.com", profile=None)
        followed.profile = None

        mock_notification = MagicMock(id=123)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            result = await NotificationEventEmitter.emit_follow_notification(
                follower, followed
            )

            assert result is True

            # Should use full_name as fallback
            call_args = mock_service.create_notification.call_args[0][0]
            assert "Test User" in call_args.title

    @pytest.mark.asyncio
    async def test_follow_notification_with_partial_profile(self):
        """Test follow notification with partial profile data."""
        # Profile with username but no display_name
        follower = MockUser(user_id=1)
        follower.profile = MockProfile(username="followeruser", display_name=None)

        followed = MockUser(user_id=2)

        mock_notification = MagicMock(id=123)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            result = await NotificationEventEmitter.emit_follow_notification(
                follower, followed
            )

            assert result is True
            call_args = mock_service.create_notification.call_args[0][0]
            # Should use username as fallback when no display_name
            assert "followeruser" in call_args.title

    @pytest.mark.asyncio
    async def test_follow_notification_exception_handling(self):
        """Test exception handling in follow notification."""
        follower = MockUser(user_id=1)
        followed = MockUser(user_id=2)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(
                side_effect=Exception("DB error")
            )

            result = await NotificationEventEmitter.emit_follow_notification(
                follower, followed
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_follow_notification_action_url_with_username(self):
        """Test action URL includes username when available."""
        follower = MockUser(user_id=1)
        follower.profile = MockProfile(username="followeruser")
        followed = MockUser(user_id=2)

        mock_notification = MagicMock(id=123)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            await NotificationEventEmitter.emit_follow_notification(follower, followed)

            call_args = mock_service.create_notification.call_args[0][0]
            assert call_args.payload["action_url"] == "/profile/followeruser"

    @pytest.mark.asyncio
    async def test_follow_notification_action_url_without_username(self):
        """Test action URL uses user ID when no username."""
        follower = MockUser(user_id=1)
        follower.profile = MockProfile(username=None)
        followed = MockUser(user_id=2)

        mock_notification = MagicMock(id=123)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            await NotificationEventEmitter.emit_follow_notification(follower, followed)

            call_args = mock_service.create_notification.call_args[0][0]
            assert call_args.payload["action_url"] == "/user/1"


# ============================================================================
# Test emit_dm_message_received_notification
# ============================================================================


class TestEmitDmMessageReceivedNotification:
    """Tests for emit_dm_message_received_notification."""

    @pytest.mark.asyncio
    async def test_dm_notification_created_successfully(self):
        """Test successful DM notification creation."""
        sender = MockUser(user_id=1, email="sender@test.com")
        recipient = MockUser(user_id=2, email="recipient@test.com")

        mock_notification = MagicMock(id=456)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            result = (
                await NotificationEventEmitter.emit_dm_message_received_notification(
                    sender_user=sender,
                    recipient_user=recipient,
                    message_id="msg-123",
                    message_content="Hello, how are you?",
                    thread_id="thread-456",
                )
            )

            assert result is True
            mock_service.create_notification.assert_called_once()

            call_args = mock_service.create_notification.call_args[0][0]
            assert call_args.user_id == "2"
            assert call_args.type == NotificationType.DM_MESSAGE_RECEIVED
            assert call_args.priority == NotificationPriority.HIGH
            assert call_args.category == "messages"
            assert call_args.payload["message_id"] == "msg-123"
            assert call_args.payload["thread_id"] == "thread-456"
            assert call_args.email_enabled is True
            assert call_args.push_enabled is True

    @pytest.mark.asyncio
    async def test_dm_notification_message_truncation(self):
        """Test DM notification truncates long messages."""
        sender = MockUser(user_id=1)
        recipient = MockUser(user_id=2)

        long_message = "A" * 200  # 200 characters

        mock_notification = MagicMock(id=456)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            await NotificationEventEmitter.emit_dm_message_received_notification(
                sender_user=sender,
                recipient_user=recipient,
                message_id="msg-123",
                message_content=long_message,
                thread_id="thread-456",
            )

            call_args = mock_service.create_notification.call_args[0][0]
            # Preview should be truncated to 100 chars + "..."
            assert len(call_args.message) == 103
            assert call_args.message.endswith("...")
            # Full message should be preserved in payload
            assert call_args.payload["full_message"] == long_message

    @pytest.mark.asyncio
    async def test_dm_notification_blocked_by_preferences(self):
        """Test DM notification blocked by preferences."""
        sender = MockUser(user_id=1)
        recipient = MockUser(user_id=2)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=None)

            result = (
                await NotificationEventEmitter.emit_dm_message_received_notification(
                    sender_user=sender,
                    recipient_user=recipient,
                    message_id="msg-123",
                    message_content="Hello",
                    thread_id="thread-456",
                )
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_dm_notification_exception_handling(self):
        """Test exception handling in DM notification."""
        sender = MockUser(user_id=1)
        recipient = MockUser(user_id=2)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(
                side_effect=Exception("Network error")
            )

            result = (
                await NotificationEventEmitter.emit_dm_message_received_notification(
                    sender_user=sender,
                    recipient_user=recipient,
                    message_id="msg-123",
                    message_content="Hello",
                    thread_id="thread-456",
                )
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_dm_notification_no_profile(self):
        """Test DM notification with users without profiles."""
        sender = MockUser(user_id=1, email="sender@test.com")
        sender.profile = None
        recipient = MockUser(user_id=2, email="recipient@test.com")
        recipient.profile = None

        mock_notification = MagicMock(id=456)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            result = (
                await NotificationEventEmitter.emit_dm_message_received_notification(
                    sender_user=sender,
                    recipient_user=recipient,
                    message_id="msg-123",
                    message_content="Hello",
                    thread_id="thread-456",
                )
            )

            assert result is True


# ============================================================================
# Test emit_ai_reply_finished_notification
# ============================================================================


class TestEmitAiReplyFinishedNotification:
    """Tests for emit_ai_reply_finished_notification."""

    @pytest.mark.asyncio
    async def test_ai_reply_notification_created_successfully(self):
        """Test successful AI reply notification creation."""
        user = MockUser(user_id=1)

        mock_notification = MagicMock(id=789)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            result = await NotificationEventEmitter.emit_ai_reply_finished_notification(
                user=user,
                ai_provider="openai",
                message_id="ai-msg-123",
                thread_id="ai-thread-456",
                ai_response="Here is your answer...",
                processing_time_ms=2500.0,
            )

            assert result is True
            call_args = mock_service.create_notification.call_args[0][0]
            assert call_args.user_id == "1"
            assert call_args.type == NotificationType.AI_REPLY_FINISHED
            assert call_args.category == "ai"
            assert "ChatGPT" in call_args.title  # Provider name mapping
            assert call_args.payload["ai_provider"] == "openai"
            assert call_args.payload["processing_time_ms"] == 2500.0

    @pytest.mark.asyncio
    async def test_ai_reply_notification_high_priority_for_long_processing(self):
        """Test AI notification is high priority for long processing."""
        user = MockUser(user_id=1)

        mock_notification = MagicMock(id=789)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            # Processing time > 5000ms should be high priority
            await NotificationEventEmitter.emit_ai_reply_finished_notification(
                user=user,
                ai_provider="claude",
                message_id="ai-msg-123",
                thread_id="ai-thread-456",
                ai_response="Complex response...",
                processing_time_ms=6000.0,
            )

            call_args = mock_service.create_notification.call_args[0][0]
            assert call_args.priority == NotificationPriority.HIGH
            assert call_args.payload["is_long_processing"] is True

    @pytest.mark.asyncio
    async def test_ai_reply_notification_normal_priority_for_quick_processing(self):
        """Test AI notification is normal priority for quick processing."""
        user = MockUser(user_id=1)

        mock_notification = MagicMock(id=789)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            await NotificationEventEmitter.emit_ai_reply_finished_notification(
                user=user,
                ai_provider="claude",
                message_id="ai-msg-123",
                thread_id="ai-thread-456",
                ai_response="Quick response",
                processing_time_ms=1000.0,
            )

            call_args = mock_service.create_notification.call_args[0][0]
            assert call_args.priority == NotificationPriority.NORMAL
            assert call_args.payload["is_long_processing"] is False

    @pytest.mark.asyncio
    async def test_ai_reply_notification_provider_name_mapping(self):
        """Test AI provider name mapping in notification."""
        user = MockUser(user_id=1)
        mock_notification = MagicMock(id=789)

        provider_mappings = [
            ("openai", "ChatGPT"),
            ("claude", "Claude"),
            ("gemini", "Gemini"),
            ("local", "Local AI"),
            ("unknown_provider", "Unknown_Provider"),  # Title case fallback
        ]

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            for provider, expected_name in provider_mappings:
                await NotificationEventEmitter.emit_ai_reply_finished_notification(
                    user=user,
                    ai_provider=provider,
                    message_id="ai-msg-123",
                    thread_id="ai-thread-456",
                    ai_response="Response",
                    processing_time_ms=1000.0,
                )

                call_args = mock_service.create_notification.call_args[0][0]
                assert expected_name in call_args.title
                assert call_args.payload["provider_display_name"] == expected_name

    @pytest.mark.asyncio
    async def test_ai_reply_notification_response_truncation(self):
        """Test AI response truncation in notification."""
        user = MockUser(user_id=1)
        long_response = "X" * 300

        mock_notification = MagicMock(id=789)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            await NotificationEventEmitter.emit_ai_reply_finished_notification(
                user=user,
                ai_provider="openai",
                message_id="ai-msg-123",
                thread_id="ai-thread-456",
                ai_response=long_response,
                processing_time_ms=1000.0,
            )

            call_args = mock_service.create_notification.call_args[0][0]
            # Preview should be truncated to 150 chars + "..."
            assert len(call_args.message) == 153
            assert call_args.message.endswith("...")
            assert call_args.payload["full_response"] == long_response

    @pytest.mark.asyncio
    async def test_ai_reply_notification_exception_handling(self):
        """Test exception handling in AI reply notification."""
        user = MockUser(user_id=1)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(
                side_effect=Exception("API error")
            )

            result = await NotificationEventEmitter.emit_ai_reply_finished_notification(
                user=user,
                ai_provider="openai",
                message_id="ai-msg-123",
                thread_id="ai-thread-456",
                ai_response="Response",
                processing_time_ms=1000.0,
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_ai_reply_notification_blocked_by_preferences(self):
        """Test AI reply notification blocked by preferences."""
        user = MockUser(user_id=1)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=None)

            result = await NotificationEventEmitter.emit_ai_reply_finished_notification(
                user=user,
                ai_provider="openai",
                message_id="ai-msg-123",
                thread_id="ai-thread-456",
                ai_response="Response",
                processing_time_ms=1000.0,
            )

            assert result is False


# ============================================================================
# Test emit_mention_notification
# ============================================================================


class TestEmitMentionNotification:
    """Tests for emit_mention_notification."""

    @pytest.mark.asyncio
    async def test_mention_notification_created_successfully(self):
        """Test successful mention notification creation."""
        mentioned = MockUser(user_id=1)
        mentioning = MockUser(user_id=2)

        mock_notification = MagicMock(id=101)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            result = await NotificationEventEmitter.emit_mention_notification(
                mentioned_user=mentioned,
                mentioning_user=mentioning,
                content="Hey @mentioned check this out!",
                context_type="message",
                context_id="ctx-123",
            )

            assert result is True
            call_args = mock_service.create_notification.call_args[0][0]
            assert call_args.user_id == "1"
            assert call_args.type == NotificationType.MENTION
            assert call_args.priority == NotificationPriority.HIGH
            assert call_args.category == "social"
            assert "mentioned you" in call_args.title
            assert call_args.payload["context_type"] == "message"
            assert call_args.payload["context_id"] == "ctx-123"
            assert call_args.email_enabled is True

    @pytest.mark.asyncio
    async def test_mention_notification_content_truncation(self):
        """Test mention notification truncates long content."""
        mentioned = MockUser(user_id=1)
        mentioning = MockUser(user_id=2)

        long_content = "B" * 200

        mock_notification = MagicMock(id=101)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            await NotificationEventEmitter.emit_mention_notification(
                mentioned_user=mentioned,
                mentioning_user=mentioning,
                content=long_content,
                context_type="comment",
                context_id="ctx-456",
            )

            call_args = mock_service.create_notification.call_args[0][0]
            # Preview should be truncated to 120 chars + "..."
            assert len(call_args.message) == 123
            assert call_args.message.endswith("...")
            assert call_args.payload["content"] == long_content

    @pytest.mark.asyncio
    async def test_mention_notification_action_url(self):
        """Test mention notification action URL is correct."""
        mentioned = MockUser(user_id=1)
        mentioning = MockUser(user_id=2)

        mock_notification = MagicMock(id=101)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            await NotificationEventEmitter.emit_mention_notification(
                mentioned_user=mentioned,
                mentioning_user=mentioning,
                content="Test mention",
                context_type="post",
                context_id="post-789",
            )

            call_args = mock_service.create_notification.call_args[0][0]
            assert call_args.payload["action_url"] == "/post/post-789"

    @pytest.mark.asyncio
    async def test_mention_notification_blocked_by_preferences(self):
        """Test mention notification blocked by preferences."""
        mentioned = MockUser(user_id=1)
        mentioning = MockUser(user_id=2)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=None)

            result = await NotificationEventEmitter.emit_mention_notification(
                mentioned_user=mentioned,
                mentioning_user=mentioning,
                content="Test",
                context_type="message",
                context_id="ctx-123",
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_mention_notification_exception_handling(self):
        """Test exception handling in mention notification."""
        mentioned = MockUser(user_id=1)
        mentioning = MockUser(user_id=2)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(
                side_effect=Exception("DB error")
            )

            result = await NotificationEventEmitter.emit_mention_notification(
                mentioned_user=mentioned,
                mentioning_user=mentioning,
                content="Test",
                context_type="message",
                context_id="ctx-123",
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_mention_notification_no_profile(self):
        """Test mention notification with users without profiles."""
        mentioned = MockUser(user_id=1)
        mentioned.profile = None
        mentioning = MockUser(user_id=2)
        mentioning.profile = None

        mock_notification = MagicMock(id=101)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            result = await NotificationEventEmitter.emit_mention_notification(
                mentioned_user=mentioned,
                mentioning_user=mentioning,
                content="Test mention",
                context_type="message",
                context_id="ctx-123",
            )

            assert result is True
            # Should use full_name as fallback
            call_args = mock_service.create_notification.call_args[0][0]
            assert "Test User" in call_args.title


# ============================================================================
# Test emit_system_alert_notification
# ============================================================================


class TestEmitSystemAlertNotification:
    """Tests for emit_system_alert_notification."""

    @pytest.mark.asyncio
    async def test_system_alert_notification_created_successfully(self):
        """Test successful system alert notification creation."""
        mock_notification = MagicMock(id=202)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            result = await NotificationEventEmitter.emit_system_alert_notification(
                user_id="user-123",
                alert_type="maintenance",
                title="Scheduled Maintenance",
                message="System will be down for maintenance at 2AM UTC",
            )

            assert result is True
            mock_service.create_notification.assert_called_once()

            call_args = mock_service.create_notification.call_args[0][0]
            assert call_args.user_id == "user-123"
            assert call_args.type == NotificationType.SYSTEM_ALERT
            assert call_args.category == "system"
            assert call_args.title == "Scheduled Maintenance"
            assert call_args.payload["alert_type"] == "maintenance"
            assert call_args.payload["system_source"] == "lokifi_core"

    @pytest.mark.asyncio
    async def test_system_alert_with_custom_priority(self):
        """Test system alert with custom priority."""
        mock_notification = MagicMock(id=202)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            await NotificationEventEmitter.emit_system_alert_notification(
                user_id="user-123",
                alert_type="security",
                title="Security Alert",
                message="Unusual login detected",
                priority=NotificationPriority.HIGH,
            )

            call_args = mock_service.create_notification.call_args[0][0]
            assert call_args.priority == NotificationPriority.HIGH

    @pytest.mark.asyncio
    async def test_system_alert_urgent_priority_skips_preferences(self):
        """Test urgent system alert skips user preferences."""
        mock_notification = MagicMock(id=202)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            await NotificationEventEmitter.emit_system_alert_notification(
                user_id="user-123",
                alert_type="critical",
                title="Critical Alert",
                message="Account compromised",
                priority=NotificationPriority.URGENT,
            )

            # Check that skip_preferences was set to True for urgent alerts
            call_kwargs = mock_service.create_notification.call_args[1]
            assert call_kwargs.get("skip_preferences") is True

            call_args = mock_service.create_notification.call_args[0][0]
            assert call_args.email_enabled is True  # Email for urgent alerts

    @pytest.mark.asyncio
    async def test_system_alert_with_custom_alert_data(self):
        """Test system alert with custom alert data."""
        mock_notification = MagicMock(id=202)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            custom_data = {"version": "2.0", "changes": ["Feature A", "Feature B"]}

            await NotificationEventEmitter.emit_system_alert_notification(
                user_id="user-123",
                alert_type="update",
                title="New Update Available",
                message="Version 2.0 is available",
                alert_data=custom_data,
            )

            call_args = mock_service.create_notification.call_args[0][0]
            assert call_args.payload["alert_data"] == custom_data

    @pytest.mark.asyncio
    async def test_system_alert_with_custom_expires_at(self):
        """Test system alert with custom expiry time."""
        mock_notification = MagicMock(id=202)

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=mock_notification)

            custom_expiry = datetime.now(timezone.utc) + timedelta(hours=2)

            await NotificationEventEmitter.emit_system_alert_notification(
                user_id="user-123",
                alert_type="flash_sale",
                title="Flash Sale",
                message="Limited time offer!",
                expires_at=custom_expiry,
            )

            call_args = mock_service.create_notification.call_args[0][0]
            assert call_args.expires_at == custom_expiry

    @pytest.mark.asyncio
    async def test_system_alert_blocked_by_preferences(self):
        """Test system alert blocked by preferences."""
        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(return_value=None)

            result = await NotificationEventEmitter.emit_system_alert_notification(
                user_id="user-123",
                alert_type="info",
                title="Info",
                message="Some info",
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_system_alert_exception_handling(self):
        """Test exception handling in system alert notification."""
        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_notification = AsyncMock(
                side_effect=Exception("Service error")
            )

            result = await NotificationEventEmitter.emit_system_alert_notification(
                user_id="user-123",
                alert_type="info",
                title="Info",
                message="Some info",
            )

            assert result is False


# ============================================================================
# Test emit_bulk_follow_notifications
# ============================================================================


class TestEmitBulkFollowNotifications:
    """Tests for emit_bulk_follow_notifications."""

    @pytest.mark.asyncio
    async def test_bulk_follow_notifications_created_successfully(self):
        """Test successful bulk follow notification creation."""
        follower = MockUser(user_id=1)
        followed_users = [
            MockUser(user_id=2),
            MockUser(user_id=3),
            MockUser(user_id=4),
        ]

        mock_notifications = [
            MagicMock(id=101),
            MagicMock(id=102),
            MagicMock(id=103),
        ]

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_batch_notifications = AsyncMock(
                return_value=mock_notifications
            )

            result = await NotificationEventEmitter.emit_bulk_follow_notifications(
                follower, followed_users
            )

            assert result == ["101", "102", "103"]
            mock_service.create_batch_notifications.assert_called_once()

            call_args = mock_service.create_batch_notifications.call_args[0][0]
            assert len(call_args) == 3

            # Check each notification has correct data
            for i, notif_data in enumerate(call_args):
                assert notif_data.user_id == str(followed_users[i].id)
                assert notif_data.type == NotificationType.FOLLOW
                assert notif_data.payload["bulk_follow"] is True

    @pytest.mark.asyncio
    async def test_bulk_follow_notifications_empty_list(self):
        """Test bulk follow with empty list of followed users."""
        follower = MockUser(user_id=1)
        followed_users: list[MockUser] = []

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_batch_notifications = AsyncMock(return_value=[])

            result = await NotificationEventEmitter.emit_bulk_follow_notifications(
                follower, followed_users
            )

            assert result == []

    @pytest.mark.asyncio
    async def test_bulk_follow_notifications_exception_handling(self):
        """Test exception handling in bulk follow notifications."""
        follower = MockUser(user_id=1)
        followed_users = [MockUser(user_id=2)]

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_batch_notifications = AsyncMock(
                side_effect=Exception("Batch error")
            )

            result = await NotificationEventEmitter.emit_bulk_follow_notifications(
                follower, followed_users
            )

            assert result == []

    @pytest.mark.asyncio
    async def test_bulk_follow_notifications_no_profile(self):
        """Test bulk follow notifications with users without profiles."""
        follower = MockUser(user_id=1)
        follower.profile = None
        followed_users = [
            MockUser(user_id=2),
            MockUser(user_id=3),
        ]
        followed_users[0].profile = None
        followed_users[1].profile = None

        mock_notifications = [
            MagicMock(id=101),
            MagicMock(id=102),
        ]

        with patch(
            "app.services.notification_emitter.notification_service"
        ) as mock_service:
            mock_service.create_batch_notifications = AsyncMock(
                return_value=mock_notifications
            )

            result = await NotificationEventEmitter.emit_bulk_follow_notifications(
                follower, followed_users
            )

            assert len(result) == 2


# ============================================================================
# Test Module-Level Instance
# ============================================================================


class TestModuleLevelInstance:
    """Tests for the module-level notification_emitter instance."""

    def test_notification_emitter_instance_exists(self):
        """Test that the module-level notification_emitter exists."""
        assert notification_emitter is not None
        assert isinstance(notification_emitter, NotificationEventEmitter)
