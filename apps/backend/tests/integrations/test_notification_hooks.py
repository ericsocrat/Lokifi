"""
Comprehensive tests for app.integrations.notification_hooks module.
Coverage target: 100%
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ================================================================================
# Test MockProfile Class
# ================================================================================


class TestMockProfile:
    """Test the MockProfile class."""

    def test_mock_profile_init_with_all_fields(self):
        """Test MockProfile initialization with all fields."""
        from app.integrations.notification_hooks import MockProfile

        data = {
            "username": "testuser",
            "display_name": "Test User",
            "avatar_url": "https://example.com/avatar.png",
        }
        profile = MockProfile(data)

        assert profile.username == "testuser"
        assert profile.display_name == "Test User"
        assert profile.avatar_url == "https://example.com/avatar.png"

    def test_mock_profile_init_with_missing_fields(self):
        """Test MockProfile initialization with missing fields defaults to None."""
        from app.integrations.notification_hooks import MockProfile

        data = {"username": "onlyuser"}
        profile = MockProfile(data)

        assert profile.username == "onlyuser"
        assert profile.display_name is None
        assert profile.avatar_url is None

    def test_mock_profile_init_with_empty_dict(self):
        """Test MockProfile initialization with empty dict."""
        from app.integrations.notification_hooks import MockProfile

        profile = MockProfile({})

        assert profile.username is None
        assert profile.display_name is None
        assert profile.avatar_url is None


# ================================================================================
# Test MockUser Class
# ================================================================================


class TestMockUser:
    """Test the MockUser class."""

    def test_mock_user_init_with_all_fields(self):
        """Test MockUser initialization with all fields."""
        from app.integrations.notification_hooks import MockUser

        data = {
            "id": 123,
            "email": "test@example.com",
            "full_name": "Test User",
            "username": "testuser",
            "display_name": "Test Display",
            "avatar_url": "https://example.com/avatar.png",
        }
        user = MockUser(data)

        assert user.id == 123
        assert user.email == "test@example.com"
        assert user.full_name == "Test User"
        assert user.profile is not None
        assert user.profile.username == "testuser"
        assert user.profile.display_name == "Test Display"
        assert user.profile.avatar_url == "https://example.com/avatar.png"

    def test_mock_user_init_with_missing_fields(self):
        """Test MockUser initialization with missing fields."""
        from app.integrations.notification_hooks import MockUser

        data = {"email": "test@example.com"}
        user = MockUser(data)

        assert user.id == 0  # Default
        assert user.email == "test@example.com"
        assert user.full_name == ""  # Default

    def test_mock_user_init_with_empty_dict(self):
        """Test MockUser initialization with empty dict."""
        from app.integrations.notification_hooks import MockUser

        user = MockUser({})

        assert user.id == 0
        assert user.email == ""
        assert user.full_name == ""
        # Empty dict still creates profile but profile has None values
        # The implementation creates MockProfile from empty data dict

    def test_mock_user_username_property_returns_profile_username(self):
        """Test MockUser username property returns profile username."""
        from app.integrations.notification_hooks import MockUser

        data = {"username": "testuser"}
        user = MockUser(data)

        assert user.username == "testuser"

    def test_mock_user_username_property_returns_empty_when_no_profile_username(self):
        """Test MockUser username property returns empty string when no profile username."""
        from app.integrations.notification_hooks import MockUser

        data = {"email": "test@example.com"}
        user = MockUser(data)

        assert user.username == ""

    def test_mock_user_username_property_returns_empty_when_no_profile(self):
        """Test MockUser username property returns empty string when profile is None."""
        from app.integrations.notification_hooks import MockUser

        # Create user with None profile by passing None data
        # This tests the edge case where profile could be None
        user = MockUser({})
        user.profile = None  # Force profile to None for testing

        assert user.username == ""


# ================================================================================
# Test NotificationIntegration Class
# ================================================================================


class TestNotificationIntegration:
    """Test the NotificationIntegration class."""

    def test_setup_follow_integration_logs_info(self):
        """Test setup_follow_integration logs setup message."""
        from app.integrations.notification_hooks import NotificationIntegration

        with patch("app.integrations.notification_hooks.logger") as mock_logger:
            NotificationIntegration.setup_follow_integration()

        mock_logger.info.assert_called_once()
        assert "follow" in mock_logger.info.call_args[0][0].lower()

    @pytest.mark.asyncio
    async def test_on_user_followed_emits_notification(self):
        """Test on_user_followed emits follow notification."""
        from app.integrations.notification_hooks import NotificationIntegration

        mock_emitter = AsyncMock()

        with patch(
            "app.integrations.notification_hooks.notification_emitter", mock_emitter
        ):
            with patch("app.integrations.notification_hooks.logger"):
                await NotificationIntegration.on_user_followed(
                    follower_user_data={
                        "id": 1,
                        "username": "follower",
                        "display_name": "Follower User",
                    },
                    followed_user_data={
                        "id": 2,
                        "username": "followed",
                        "display_name": "Followed User",
                    },
                )

        mock_emitter.emit_follow_notification.assert_called_once()
        call_args = mock_emitter.emit_follow_notification.call_args
        follower = call_args[0][0]
        followed = call_args[0][1]
        assert follower.username == "follower"
        assert followed.username == "followed"

    @pytest.mark.asyncio
    async def test_on_user_followed_handles_exception(self):
        """Test on_user_followed handles exceptions gracefully."""
        from app.integrations.notification_hooks import NotificationIntegration

        mock_emitter = AsyncMock()
        mock_emitter.emit_follow_notification.side_effect = Exception("Test error")

        with patch(
            "app.integrations.notification_hooks.notification_emitter", mock_emitter
        ):
            with patch("app.integrations.notification_hooks.logger") as mock_logger:
                # Should not raise
                await NotificationIntegration.on_user_followed(
                    follower_user_data={"username": "follower"},
                    followed_user_data={"username": "followed"},
                )

        mock_logger.error.assert_called_once()
        assert "failed" in mock_logger.error.call_args[0][0].lower()

    @pytest.mark.asyncio
    async def test_on_dm_message_sent_emits_notification(self):
        """Test on_dm_message_sent emits DM notification."""
        from app.integrations.notification_hooks import NotificationIntegration

        mock_emitter = AsyncMock()

        with patch(
            "app.integrations.notification_hooks.notification_emitter", mock_emitter
        ):
            with patch("app.integrations.notification_hooks.logger"):
                await NotificationIntegration.on_dm_message_sent(
                    sender_data={"username": "sender"},
                    recipient_data={"username": "recipient"},
                    message_data={
                        "id": "msg123",
                        "content": "Hello!",
                        "thread_id": "thread456",
                    },
                )

        mock_emitter.emit_dm_message_received_notification.assert_called_once()
        call_kwargs = mock_emitter.emit_dm_message_received_notification.call_args[1]
        assert call_kwargs["message_id"] == "msg123"
        assert call_kwargs["message_content"] == "Hello!"
        assert call_kwargs["thread_id"] == "thread456"

    @pytest.mark.asyncio
    async def test_on_dm_message_sent_handles_exception(self):
        """Test on_dm_message_sent handles exceptions gracefully."""
        from app.integrations.notification_hooks import NotificationIntegration

        mock_emitter = AsyncMock()
        mock_emitter.emit_dm_message_received_notification.side_effect = Exception(
            "Test error"
        )

        with patch(
            "app.integrations.notification_hooks.notification_emitter", mock_emitter
        ):
            with patch("app.integrations.notification_hooks.logger") as mock_logger:
                await NotificationIntegration.on_dm_message_sent(
                    sender_data={"username": "sender"},
                    recipient_data={"username": "recipient"},
                    message_data={"id": "msg123"},
                )

        mock_logger.error.assert_called_once()

    @pytest.mark.asyncio
    async def test_on_dm_message_sent_with_missing_message_fields(self):
        """Test on_dm_message_sent with missing message fields uses defaults."""
        from app.integrations.notification_hooks import NotificationIntegration

        mock_emitter = AsyncMock()

        with patch(
            "app.integrations.notification_hooks.notification_emitter", mock_emitter
        ):
            with patch("app.integrations.notification_hooks.logger"):
                await NotificationIntegration.on_dm_message_sent(
                    sender_data={"username": "sender"},
                    recipient_data={"username": "recipient"},
                    message_data={},  # Empty message data
                )

        call_kwargs = mock_emitter.emit_dm_message_received_notification.call_args[1]
        assert call_kwargs["message_id"] == ""
        assert call_kwargs["message_content"] == ""
        assert call_kwargs["thread_id"] == ""

    @pytest.mark.asyncio
    async def test_on_ai_response_completed_emits_notification(self):
        """Test on_ai_response_completed emits AI notification."""
        from app.integrations.notification_hooks import NotificationIntegration

        mock_emitter = AsyncMock()

        with patch(
            "app.integrations.notification_hooks.notification_emitter", mock_emitter
        ):
            with patch("app.integrations.notification_hooks.logger"):
                await NotificationIntegration.on_ai_response_completed(
                    user_data={"username": "testuser"},
                    ai_response_data={
                        "provider": "openai",
                        "message_id": "ai_msg123",
                        "thread_id": "thread789",
                        "content": "AI response content",
                        "processing_time_ms": 1500,
                    },
                )

        mock_emitter.emit_ai_reply_finished_notification.assert_called_once()
        call_kwargs = mock_emitter.emit_ai_reply_finished_notification.call_args[1]
        assert call_kwargs["ai_provider"] == "openai"
        assert call_kwargs["message_id"] == "ai_msg123"
        assert call_kwargs["processing_time_ms"] == 1500

    @pytest.mark.asyncio
    async def test_on_ai_response_completed_handles_exception(self):
        """Test on_ai_response_completed handles exceptions gracefully."""
        from app.integrations.notification_hooks import NotificationIntegration

        mock_emitter = AsyncMock()
        mock_emitter.emit_ai_reply_finished_notification.side_effect = Exception(
            "Test error"
        )

        with patch(
            "app.integrations.notification_hooks.notification_emitter", mock_emitter
        ):
            with patch("app.integrations.notification_hooks.logger") as mock_logger:
                await NotificationIntegration.on_ai_response_completed(
                    user_data={"username": "testuser"},
                    ai_response_data={},
                )

        mock_logger.error.assert_called_once()

    @pytest.mark.asyncio
    async def test_on_ai_response_completed_with_missing_fields_uses_defaults(self):
        """Test on_ai_response_completed with missing fields uses defaults."""
        from app.integrations.notification_hooks import NotificationIntegration

        mock_emitter = AsyncMock()

        with patch(
            "app.integrations.notification_hooks.notification_emitter", mock_emitter
        ):
            with patch("app.integrations.notification_hooks.logger"):
                await NotificationIntegration.on_ai_response_completed(
                    user_data={"username": "testuser"},
                    ai_response_data={},  # Empty data
                )

        call_kwargs = mock_emitter.emit_ai_reply_finished_notification.call_args[1]
        assert call_kwargs["ai_provider"] == "unknown"
        assert call_kwargs["message_id"] == ""
        assert call_kwargs["thread_id"] == ""
        assert call_kwargs["ai_response"] == ""
        assert call_kwargs["processing_time_ms"] == 0


# ================================================================================
# Test Helper Functions
# ================================================================================


class TestNotifyUserFollowed:
    """Test the notify_user_followed helper function."""

    @pytest.mark.asyncio
    async def test_notify_user_followed_calls_integration(self):
        """Test notify_user_followed calls NotificationIntegration correctly."""
        from app.integrations.notification_hooks import notify_user_followed

        with patch.object(
            __import__(
                "app.integrations.notification_hooks",
                fromlist=["NotificationIntegration"],
            ).NotificationIntegration,
            "on_user_followed",
            new_callable=AsyncMock,
        ) as mock_on_followed:
            await notify_user_followed(
                follower_id="f1",
                follower_username="follower_user",
                followed_id="f2",
                followed_username="followed_user",
            )

        mock_on_followed.assert_called_once()
        call_kwargs = mock_on_followed.call_args[1]
        assert call_kwargs["follower_user_data"]["id"] == "f1"
        assert call_kwargs["follower_user_data"]["username"] == "follower_user"
        assert call_kwargs["followed_user_data"]["id"] == "f2"
        assert call_kwargs["followed_user_data"]["username"] == "followed_user"


class TestNotifyDmReceived:
    """Test the notify_dm_received helper function."""

    @pytest.mark.asyncio
    async def test_notify_dm_received_calls_integration(self):
        """Test notify_dm_received calls NotificationIntegration correctly."""
        from app.integrations.notification_hooks import notify_dm_received

        with patch.object(
            __import__(
                "app.integrations.notification_hooks",
                fromlist=["NotificationIntegration"],
            ).NotificationIntegration,
            "on_dm_message_sent",
            new_callable=AsyncMock,
        ) as mock_on_dm:
            await notify_dm_received(
                sender_id="s1",
                sender_username="sender_user",
                recipient_id="r1",
                recipient_username="recipient_user",
                message_id="msg_123",
                message_content="Hello there!",
                thread_id="thread_456",
            )

        mock_on_dm.assert_called_once()
        call_kwargs = mock_on_dm.call_args[1]
        assert call_kwargs["sender_data"]["id"] == "s1"
        assert call_kwargs["sender_data"]["username"] == "sender_user"
        assert call_kwargs["recipient_data"]["id"] == "r1"
        assert call_kwargs["message_data"]["id"] == "msg_123"
        assert call_kwargs["message_data"]["content"] == "Hello there!"
        assert call_kwargs["message_data"]["thread_id"] == "thread_456"


class TestNotifyAiResponseReady:
    """Test the notify_ai_response_ready helper function."""

    @pytest.mark.asyncio
    async def test_notify_ai_response_ready_calls_integration(self):
        """Test notify_ai_response_ready calls NotificationIntegration correctly."""
        from app.integrations.notification_hooks import notify_ai_response_ready

        with patch.object(
            __import__(
                "app.integrations.notification_hooks",
                fromlist=["NotificationIntegration"],
            ).NotificationIntegration,
            "on_ai_response_completed",
            new_callable=AsyncMock,
        ) as mock_on_ai:
            await notify_ai_response_ready(
                user_id="u1",
                username="test_user",
                ai_provider="openai",
                message_id="ai_msg",
                thread_id="ai_thread",
                response_content="AI says hello",
                processing_time_ms=2000.5,
            )

        mock_on_ai.assert_called_once()
        call_kwargs = mock_on_ai.call_args[1]
        assert call_kwargs["user_data"]["id"] == "u1"
        assert call_kwargs["user_data"]["username"] == "test_user"
        assert call_kwargs["ai_response_data"]["provider"] == "openai"
        assert call_kwargs["ai_response_data"]["message_id"] == "ai_msg"
        assert call_kwargs["ai_response_data"]["processing_time_ms"] == 2000.5

    @pytest.mark.asyncio
    async def test_notify_ai_response_ready_with_default_processing_time(self):
        """Test notify_ai_response_ready with default processing_time_ms."""
        from app.integrations.notification_hooks import notify_ai_response_ready

        with patch.object(
            __import__(
                "app.integrations.notification_hooks",
                fromlist=["NotificationIntegration"],
            ).NotificationIntegration,
            "on_ai_response_completed",
            new_callable=AsyncMock,
        ) as mock_on_ai:
            await notify_ai_response_ready(
                user_id="u1",
                username="test_user",
                ai_provider="openai",
                message_id="ai_msg",
                thread_id="ai_thread",
                response_content="AI says hello",
                # processing_time_ms defaults to 0
            )

        call_kwargs = mock_on_ai.call_args[1]
        assert call_kwargs["ai_response_data"]["processing_time_ms"] == 0


# ================================================================================
# Test Global Instance
# ================================================================================


class TestGlobalInstance:
    """Test the global notification_integration instance."""

    def test_notification_integration_instance_exists(self):
        """Test that the global notification_integration instance exists."""
        from app.integrations.notification_hooks import notification_integration

        assert notification_integration is not None

    def test_notification_integration_instance_is_correct_type(self):
        """Test that the global instance is a NotificationIntegration."""
        from app.integrations.notification_hooks import (
            NotificationIntegration,
            notification_integration,
        )

        assert isinstance(notification_integration, NotificationIntegration)


# ================================================================================
# Test ProfileLike Protocol
# ================================================================================


class TestProfileLikeProtocol:
    """Test the ProfileLike Protocol is implemented correctly."""

    def test_mock_profile_satisfies_protocol(self):
        """Test that MockProfile satisfies the ProfileLike protocol."""
        from app.integrations.notification_hooks import MockProfile, ProfileLike

        profile = MockProfile({"username": "test"})

        # These should all be accessible as defined by the protocol
        _ = profile.username
        _ = profile.display_name
        _ = profile.avatar_url

        # If we got here without AttributeError, the protocol is satisfied
        assert True
