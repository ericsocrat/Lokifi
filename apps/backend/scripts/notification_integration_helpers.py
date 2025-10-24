# J6 Notification System Integration Setup
"""
Setup script to integrate J6 notification system with existing application features.
This script provides integration patches for existing routers to trigger notifications.
"""

import logging
from datetime import UTC, datetime
from typing import Any

from app.integrations.notification_hooks import notification_integration
from app.services.notification_emitter import notification_emitter

logger = logging.getLogger(__name__)


class J6NotificationIntegrator:
    """
    Integrates J6 notification system with existing application features.
    Provides helper methods to trigger notifications from existing code.
    """

    def __init__(self):
        self.enabled = True
        self._integration_stats = {
            "follow_notifications": 0,
            "dm_notifications": 0,
            "ai_notifications": 0,
            "mention_notifications": 0,
            "errors": 0,
        }

    async def on_user_followed(
        self, follower_user_data: dict[str, Any], followed_user_data: dict[str, Any]
    ):
        """
        Integration hook for follow events.

        Call this from follow router when a user follows another user.

        Args:
            follower_user_data: User data of the follower
            followed_user_data: User data of the user being followed
        """
        try:
            if not self.enabled:
                return

            await notification_integration.on_user_followed(follower_user_data, followed_user_data)
            self._integration_stats["follow_notifications"] += 1

            logger.info(
                f"Follow notification triggered: {follower_user_data.get('username')} -> {followed_user_data.get('username')}"
            )

        except Exception as e:
            logger.error(f"Error triggering follow notification: {e}")
            self._integration_stats["errors"] += 1

    async def on_dm_message_received(
        self,
        sender_user_data: dict[str, Any],
        recipient_user_data: dict[str, Any],
        message_data: dict[str, Any],
    ):
        """
        Integration hook for direct message events.

        Call this from conversation router when a DM is sent.

        Args:
            sender_user_data: User data of the sender
            recipient_user_data: User data of the recipient
            message_data: Message data including content, thread_id, etc.
        """
        try:
            if not self.enabled:
                return

            await notification_integration.on_dm_message_sent(
                sender_user_data, recipient_user_data, message_data
            )
            self._integration_stats["dm_notifications"] += 1

            logger.info(
                f"DM notification triggered: {sender_user_data.get('username')} -> {recipient_user_data.get('username')}"
            )

        except Exception as e:
            logger.error(f"Error triggering DM notification: {e}")
            self._integration_stats["errors"] += 1

    async def on_ai_response_completed(
        self, user_data: dict[str, Any], ai_response_data: dict[str, Any]
    ):
        """
        Integration hook for AI response completion events.

        Call this from AI router when an AI response is completed.

        Args:
            user_data: User data of the person who asked the question
            ai_response_data: AI response data including provider, content, etc.
        """
        try:
            if not self.enabled:
                return

            await notification_integration.on_ai_response_completed(user_data, ai_response_data)
            self._integration_stats["ai_notifications"] += 1

            logger.info(f"AI response notification triggered for user: {user_data.get('username')}")

        except Exception as e:
            logger.error(f"Error triggering AI response notification: {e}")
            self._integration_stats["errors"] += 1

    async def on_user_mentioned(
        self,
        mentioned_user_data: dict[str, Any],
        mentioning_user_data: dict[str, Any],
        content: str,
        context_type: str = "message",
        context_id: str | None = None,
    ):
        """
        Integration hook for user mention events.

        Call this when a user is mentioned in any content.

        Args:
            mentioned_user_data: User data of the mentioned user
            mentioning_user_data: User data of the user doing the mentioning
            content: Content containing the mention
            context_type: Type of content (message, post, etc.)
            context_id: ID of the content item
        """
        try:
            if not self.enabled:
                return

            # Create mock user objects
            from unittest.mock import Mock

            mentioned_user = Mock()
            mentioned_user.id = mentioned_user_data.get("id")
            mentioned_user.username = mentioned_user_data.get("username")
            mentioned_user.display_name = mentioned_user_data.get("display_name")
            mentioned_user.avatar_url = mentioned_user_data.get("avatar_url")

            mentioning_user = Mock()
            mentioning_user.id = mentioning_user_data.get("id")
            mentioning_user.username = mentioning_user_data.get("username")
            mentioning_user.display_name = mentioning_user_data.get("display_name")
            mentioning_user.avatar_url = mentioning_user_data.get("avatar_url")

            await notification_emitter.emit_mention_notification(
                mentioned_user=mentioned_user,
                mentioning_user=mentioning_user,
                content=content,
                context_type=context_type,
                context_id=context_id or f"{context_type}_{datetime.now(UTC).timestamp()}",
            )

            self._integration_stats["mention_notifications"] += 1

            logger.info(
                f"Mention notification triggered: @{mentioned_user_data.get('username')} by {mentioning_user_data.get('username')}"
            )

        except Exception as e:
            logger.error(f"Error triggering mention notification: {e}")
            self._integration_stats["errors"] += 1

    def get_integration_stats(self) -> dict[str, Any]:
        """Get integration statistics."""
        return {
            **self._integration_stats,
            "enabled": self.enabled,
            "total_notifications": (
                self._integration_stats["follow_notifications"]
                + self._integration_stats["dm_notifications"]
                + self._integration_stats["ai_notifications"]
                + self._integration_stats["mention_notifications"]
            ),
        }

    def enable(self):
        """Enable notification integration."""
        self.enabled = True
        logger.info("J6 notification integration enabled")

    def disable(self):
        """Disable notification integration."""
        self.enabled = False
        logger.info("J6 notification integration disabled")


# Global integrator instance
j6_integrator = J6NotificationIntegrator()


# Helper functions for easy integration
async def trigger_follow_notification(
    follower_user_data: dict[str, Any], followed_user_data: dict[str, Any]
):
    """Helper to trigger follow notification."""
    await j6_integrator.on_user_followed(follower_user_data, followed_user_data)


async def trigger_dm_notification(
    sender_user_data: dict[str, Any],
    recipient_user_data: dict[str, Any],
    message_data: dict[str, Any],
):
    """Helper to trigger DM notification."""
    await j6_integrator.on_dm_message_received(sender_user_data, recipient_user_data, message_data)


async def trigger_ai_response_notification(
    user_data: dict[str, Any], ai_response_data: dict[str, Any]
):
    """Helper to trigger AI response notification."""
    await j6_integrator.on_ai_response_completed(user_data, ai_response_data)


async def trigger_mention_notification(
    mentioned_user_data: dict[str, Any],
    mentioning_user_data: dict[str, Any],
    content: str,
    context_type: str = "message",
    context_id: str | None = None,
):
    """Helper to trigger mention notification."""
    await j6_integrator.on_user_mentioned(
        mentioned_user_data, mentioning_user_data, content, context_type, context_id
    )


# Integration utilities
def extract_mentions_from_content(content: str) -> list[str]:
    """
    Extract @mentions from content.

    Args:
        content: Text content to scan for mentions

    Returns:
        List of usernames mentioned (without @)
    """
    import re

    mention_pattern = r"@(\w+)"
    mentions = re.findall(mention_pattern, content)
    return mentions


async def process_mentions_in_content(
    content: str,
    mentioning_user_data: dict[str, Any],
    context_type: str = "message",
    context_id: str | None = None,
):
    """
    Process all mentions in content and trigger notifications.

    Args:
        content: Content containing mentions
        mentioning_user_data: User doing the mentioning
        context_type: Type of content
        context_id: ID of content
    """
    mentions = extract_mentions_from_content(content)

    for username in mentions:
        # In real implementation, you'd look up user by username
        # For now, create mock user data
        mentioned_user_data = {
            "id": f"user_for_{username}",
            "username": username,
            "display_name": username.capitalize(),
            "avatar_url": None,
        }

        await trigger_mention_notification(
            mentioned_user_data, mentioning_user_data, content, context_type, context_id
        )


# Example integration patches for existing routers
class ExampleIntegrationPatches:
    """
    Example patches to show how to integrate J6 notifications with existing routers.
    These are examples - actual integration would modify the real router files.
    """

    @staticmethod
    def patch_follow_router_example():
        """
        Example of how to patch the follow router.

        In the actual follow router, after successfully creating a follow relationship:

        ```python
        # In app/routers/follow.py, after creating follow
        await trigger_follow_notification(
            follower_user_data={
                'id': current_user.id,
                'username': current_user.username,
                'display_name': current_user.display_name,
                'avatar_url': current_user.avatar_url
            },
            followed_user_data={
                'id': target_user.id,
                'username': target_user.username,
                'display_name': target_user.display_name,
                'avatar_url': target_user.avatar_url
            }
        )
        ```
        """
        pass

    @staticmethod
    def patch_conversation_router_example():
        """
        Example of how to patch the conversation router.

        In the actual conversation router, after sending a DM:

        ```python
        # In app/routers/conversations.py, after creating message
        await trigger_dm_notification(
            sender_user_data={
                'id': current_user.id,
                'username': current_user.username,
                'display_name': current_user.display_name,
                'avatar_url': current_user.avatar_url
            },
            recipient_user_data={
                'id': recipient.id,
                'username': recipient.username,
                'display_name': recipient.display_name,
                'avatar_url': recipient.avatar_url
            },
            message_data={
                'id': message.id,
                'content': message.content,
                'thread_id': message.conversation_id
            }
        )

        # Also process mentions in the message
        await process_mentions_in_content(
            message.content,
            mentioning_user_data={
                'id': current_user.id,
                'username': current_user.username,
                'display_name': current_user.display_name,
                'avatar_url': current_user.avatar_url
            },
            context_type="dm_message",
            context_id=message.id
        )
        ```
        """
        pass

    @staticmethod
    def patch_ai_router_example():
        """
        Example of how to patch the AI router.

        In the actual AI router, after AI response completion:

        ```python
        # In app/routers/ai.py, after AI response is generated
        await trigger_ai_response_notification(
            user_data={
                'id': current_user.id,
                'username': current_user.username,
                'display_name': current_user.display_name,
                'avatar_url': current_user.avatar_url
            },
            ai_response_data={
                'provider': 'openai',
                'message_id': ai_message.id,
                'thread_id': thread_id,
                'content': ai_response_content,
                'processing_time_ms': processing_time
            }
        )
        ```
        """
        pass


if __name__ == "__main__":
    # Test integration
    print("J6 Notification System Integration Ready")
    print("Integration Stats:", j6_integrator.get_integration_stats())
