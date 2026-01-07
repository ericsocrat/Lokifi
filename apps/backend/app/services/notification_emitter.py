# J6 Enterprise Notification Event Emitters
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol

from app.services.notification_service import (
    NotificationData,
    NotificationPriority,
    NotificationType,
    notification_service,
)

logger = logging.getLogger(__name__)


# ================================================================================
# Protocol Definition for User-Like Objects
# ================================================================================
# Allows notification emitter to work with both real User models and
# lightweight mock objects from integration layer


class ProfileLike(Protocol):
    """Protocol for profile-like objects in notification system."""

    username: str | None
    display_name: str | None
    avatar_url: str | None


class UserLike(Protocol):
    """
    Protocol for user-like objects in notification system

    Supports structural typing so that both User models and MockUser
    objects from integration layer can be used interchangeably.

    Note: User attributes (username, display_name, avatar_url) are on the
    Profile relationship, not directly on User.
    """

    id: int | str
    email: str
    full_name: str
    profile: ProfileLike | None


# ================================================================================
# Notification Event Emitter
# ================================================================================


class NotificationEventEmitter:
    """
    Event emitter for system notifications

    Integrates with existing system events to automatically create notifications
    when specific actions occur (follows, DMs, AI replies, etc.)
    """

    @staticmethod
    async def emit_follow_notification(
        follower_user: UserLike, followed_user: UserLike
    ) -> bool:
        """
        Emit notification when a user follows another user

        Args:
            follower_user: User who is following
            followed_user: User being followed

        Returns:
            True if notification was created successfully
        """
        try:
            # Get follower profile data (with fallbacks)
            follower_profile = follower_user.profile
            follower_display = (
                follower_profile.display_name if follower_profile else None
            )
            follower_username = follower_profile.username if follower_profile else None
            follower_avatar = follower_profile.avatar_url if follower_profile else None
            follower_name = (
                follower_display or follower_username or follower_user.full_name
            )

            # Get followed user profile data
            followed_profile = followed_user.profile
            followed_username = (
                followed_profile.username if followed_profile else followed_user.email
            )

            notification_data = NotificationData(
                user_id=str(followed_user.id),
                type=NotificationType.FOLLOW,
                priority=NotificationPriority.NORMAL,
                category="social",
                title=f"{follower_name} started following you",
                message=f"You have a new follower! {follower_name} is now following your updates.",
                payload={
                    "follower_id": str(follower_user.id),
                    "follower_username": follower_username,
                    "follower_display_name": follower_display,
                    "follower_avatar": follower_avatar,
                    "followed_at": datetime.now(timezone.utc).isoformat(),
                    "action_url": (
                        f"/profile/{follower_username}"
                        if follower_username
                        else f"/user/{follower_user.id}"
                    ),
                    "action_text": "View Profile",
                },
                related_entity_type="user",
                related_entity_id=str(follower_user.id),
                expires_at=datetime.now(timezone.utc)
                + timedelta(days=30),  # Expire after 30 days
            )

            notification = await notification_service.create_notification(
                notification_data
            )

            if notification:
                logger.info(
                    f"Created follow notification: {follower_username or follower_user.email} -> {followed_username}"
                )
                return True
            else:
                logger.warning(
                    f"Follow notification blocked by preferences: {follower_username or follower_user.email} -> {followed_username}"
                )
                return False

        except Exception as e:
            logger.error(f"Failed to emit follow notification: {e}")
            return False

    @staticmethod
    async def emit_dm_message_received_notification(
        sender_user: UserLike,
        recipient_user: UserLike,
        message_id: str,
        message_content: str,
        thread_id: str,
    ) -> bool:
        """
        Emit notification when a user receives a direct message

        Args:
            sender_user: User who sent the message
            recipient_user: User who received the message
            message_id: ID of the message
            message_content: Content of the message (truncated if needed)
            thread_id: ID of the conversation thread

        Returns:
            True if notification was created successfully
        """
        try:
            # Get sender profile data (with fallbacks)
            sender_profile = sender_user.profile
            sender_display = sender_profile.display_name if sender_profile else None
            sender_username = sender_profile.username if sender_profile else None
            sender_avatar = sender_profile.avatar_url if sender_profile else None
            sender_name = sender_display or sender_username or sender_user.full_name

            # Get recipient profile data
            recipient_profile = recipient_user.profile
            recipient_username = (
                recipient_profile.username
                if recipient_profile
                else recipient_user.email
            )

            # Truncate message for notification preview
            preview_content = (
                message_content[:100] + "..."
                if len(message_content) > 100
                else message_content
            )

            notification_data = NotificationData(
                user_id=str(recipient_user.id),
                type=NotificationType.DM_MESSAGE_RECEIVED,
                priority=NotificationPriority.HIGH,  # DMs are high priority
                category="messages",
                title=f"New message from {sender_name}",
                message=preview_content,
                payload={
                    "sender_id": str(sender_user.id),
                    "sender_username": sender_username,
                    "sender_display_name": sender_display,
                    "sender_avatar": sender_avatar,
                    "message_id": message_id,
                    "thread_id": thread_id,
                    "full_message": message_content,
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "action_url": f"/messages/{thread_id}",
                    "action_text": "Reply",
                    "preview": preview_content,
                },
                related_entity_type="message",
                related_entity_id=message_id,
                expires_at=datetime.now(timezone.utc)
                + timedelta(days=7),  # Expire after 7 days
                email_enabled=True,  # Enable email for important DMs
                push_enabled=True,  # Enable push notifications for DMs
            )

            notification = await notification_service.create_notification(
                notification_data
            )

            if notification:
                logger.info(
                    f"Created DM notification: {sender_username or sender_user.email} -> {recipient_username}"
                )
                return True
            else:
                logger.warning(
                    f"DM notification blocked by preferences: {sender_username or sender_user.email} -> {recipient_username}"
                )
                return False

        except Exception as e:
            logger.error(f"Failed to emit DM notification: {e}")
            return False

    @staticmethod
    async def emit_ai_reply_finished_notification(
        user: UserLike,
        ai_provider: str,
        message_id: str,
        thread_id: str,
        ai_response: str,
        processing_time_ms: float,
    ) -> bool:
        """
        Emit notification when AI finishes processing a user's request

        Args:
            user: User who sent the request to AI
            ai_provider: AI provider used (e.g., "openai", "claude")
            message_id: ID of the AI response message
            thread_id: ID of the AI conversation thread
            ai_response: AI response content (truncated if needed)
            processing_time_ms: Time taken to process the request

        Returns:
            True if notification was created successfully
        """
        try:
            # Truncate AI response for notification preview
            preview_response = (
                ai_response[:150] + "..." if len(ai_response) > 150 else ai_response
            )

            # Determine priority based on processing time
            priority = (
                NotificationPriority.HIGH
                if processing_time_ms > 5000
                else NotificationPriority.NORMAL
            )

            provider_name = {
                "openai": "ChatGPT",
                "claude": "Claude",
                "gemini": "Gemini",
                "local": "Local AI",
            }.get(ai_provider, ai_provider.title())

            notification_data = NotificationData(
                user_id=str(user.id),
                type=NotificationType.AI_REPLY_FINISHED,
                priority=priority,
                category="ai",
                title=f"{provider_name} has responded",
                message=preview_response,
                payload={
                    "ai_provider": ai_provider,
                    "provider_display_name": provider_name,
                    "message_id": message_id,
                    "thread_id": thread_id,
                    "full_response": ai_response,
                    "processing_time_ms": processing_time_ms,
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "action_url": f"/ai/chat/{thread_id}",
                    "action_text": "View Response",
                    "preview": preview_response,
                    "is_long_processing": processing_time_ms > 3000,
                },
                related_entity_type="ai_message",
                related_entity_id=message_id,
                expires_at=datetime.now(timezone.utc)
                + timedelta(days=3),  # Expire after 3 days
            )

            notification = await notification_service.create_notification(
                notification_data
            )

            # Get user identifier for logging
            user_name = (user.profile.username if user.profile else None) or user.email

            if notification:
                logger.info(
                    f"Created AI reply notification for {user_name}: {ai_provider} response"
                )
                return True
            else:
                logger.warning(
                    f"AI reply notification blocked by preferences for {user_name}"
                )
                return False

        except Exception as e:
            logger.error(f"Failed to emit AI reply notification: {e}")
            return False

    @staticmethod
    async def emit_mention_notification(
        mentioned_user: UserLike,
        mentioning_user: UserLike,
        content: str,
        context_type: str,  # "message", "comment", etc.
        context_id: str,
    ) -> bool:
        """
        Emit notification when a user is mentioned

        Args:
            mentioned_user: User who was mentioned
            mentioning_user: User who made the mention
            content: Content containing the mention
            context_type: Type of content (message, comment, etc.)
            context_id: ID of the content

        Returns:
            True if notification was created successfully
        """
        try:
            # Truncate content for preview
            preview_content = content[:120] + "..." if len(content) > 120 else content

            # Get mentioning user's profile data (with fallbacks)
            mentioning_profile = mentioning_user.profile
            mentioning_display = (
                mentioning_profile.display_name if mentioning_profile else None
            )
            mentioning_username = (
                mentioning_profile.username if mentioning_profile else None
            )
            mentioning_avatar = (
                mentioning_profile.avatar_url if mentioning_profile else None
            )
            mentioning_name = (
                mentioning_display or mentioning_username or mentioning_user.full_name
            )

            # Get mentioned user's profile data
            mentioned_profile = mentioned_user.profile
            mentioned_username = (
                mentioned_profile.username if mentioned_profile else None
            )

            notification_data = NotificationData(
                user_id=str(mentioned_user.id),
                type=NotificationType.MENTION,
                priority=NotificationPriority.HIGH,
                category="social",
                title=f"{mentioning_name} mentioned you",
                message=preview_content,
                payload={
                    "mentioning_user_id": str(mentioning_user.id),
                    "mentioning_username": mentioning_username,
                    "mentioning_display_name": mentioning_display
                    or mentioning_user.full_name,
                    "mentioning_avatar": mentioning_avatar,
                    "content": content,
                    "preview": preview_content,
                    "context_type": context_type,
                    "context_id": context_id,
                    "mentioned_at": datetime.now(timezone.utc).isoformat(),
                    "action_url": f"/{context_type}/{context_id}",
                    "action_text": "View",
                },
                related_entity_type=context_type,
                related_entity_id=context_id,
                expires_at=datetime.now(timezone.utc) + timedelta(days=14),
                email_enabled=True,  # Enable email for mentions
            )

            notification = await notification_service.create_notification(
                notification_data
            )

            # Get usernames for logging (with fallbacks)
            log_mentioning = mentioning_username or mentioning_user.email
            log_mentioned = mentioned_username or mentioned_user.email

            if notification:
                logger.info(
                    f"Created mention notification: {log_mentioning} mentioned {log_mentioned}"
                )
                return True
            else:
                logger.warning(
                    f"Mention notification blocked by preferences: {log_mentioning} -> {log_mentioned}"
                )
                return False

        except Exception as e:
            logger.error(f"Failed to emit mention notification: {e}")
            return False

    @staticmethod
    async def emit_system_alert_notification(
        user_id: str,
        alert_type: str,
        title: str,
        message: str,
        alert_data: dict[str, Any] | None = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        expires_at: datetime | None = None,
    ) -> bool:
        """
        Emit system alert notification

        Args:
            user_id: User to notify
            alert_type: Type of system alert
            title: Alert title
            message: Alert message
            alert_data: Additional alert data
            priority: Alert priority
            expires_at: When the alert expires

        Returns:
            True if notification was created successfully
        """
        try:
            notification_data = NotificationData(
                user_id=user_id,
                type=NotificationType.SYSTEM_ALERT,
                priority=priority,
                category="system",
                title=title,
                message=message,
                payload={
                    "alert_type": alert_type,
                    "alert_data": alert_data or {},
                    "issued_at": datetime.now(timezone.utc).isoformat(),
                    "system_source": "lokifi_core",
                },
                related_entity_type="system",
                related_entity_id=alert_type,
                expires_at=expires_at
                or datetime.now(timezone.utc) + timedelta(days=30),
                email_enabled=priority
                == NotificationPriority.URGENT,  # Email for urgent alerts
            )

            notification = await notification_service.create_notification(
                notification_data,
                skip_preferences=priority
                == NotificationPriority.URGENT,  # Skip preferences for urgent alerts
            )

            if notification:
                logger.info(
                    f"Created system alert notification for {user_id}: {alert_type}"
                )
                return True
            else:
                logger.warning(
                    f"System alert notification blocked for {user_id}: {alert_type}"
                )
                return False

        except Exception as e:
            logger.error(f"Failed to emit system alert notification: {e}")
            return False

    @staticmethod
    async def emit_bulk_follow_notifications(
        follower_user: UserLike, followed_users: list[UserLike]
    ) -> list[str]:
        """
        Emit follow notifications in bulk for efficiency

        Args:
            follower_user: User who is following multiple users
            followed_users: List of users being followed

        Returns:
            List of notification IDs that were created
        """
        try:
            notifications_data = []

            # Get follower profile data (with fallbacks)
            follower_profile = follower_user.profile
            follower_display = (
                follower_profile.display_name if follower_profile else None
            )
            follower_username = follower_profile.username if follower_profile else None
            follower_avatar = follower_profile.avatar_url if follower_profile else None
            follower_name = (
                follower_display or follower_username or follower_user.full_name
            )

            for followed_user in followed_users:
                notification_data = NotificationData(
                    user_id=str(followed_user.id),
                    type=NotificationType.FOLLOW,
                    priority=NotificationPriority.NORMAL,
                    category="social",
                    title=f"{follower_name} started following you",
                    message=f"You have a new follower! {follower_name} is now following your updates.",
                    payload={
                        "follower_id": str(follower_user.id),
                        "follower_username": follower_username,
                        "follower_display_name": follower_display,
                        "follower_avatar": follower_avatar,
                        "followed_at": datetime.now(timezone.utc).isoformat(),
                        "action_url": (
                            f"/profile/{follower_username}"
                            if follower_username
                            else f"/user/{follower_user.id}"
                        ),
                        "action_text": "View Profile",
                        "bulk_follow": True,
                    },
                    related_entity_type="user",
                    related_entity_id=str(follower_user.id),
                    expires_at=datetime.now(timezone.utc) + timedelta(days=30),
                )
                notifications_data.append(notification_data)

            # Create notifications in batch
            created_notifications = (
                await notification_service.create_batch_notifications(
                    notifications_data
                )
            )

            notification_ids = [str(n.id) for n in created_notifications]

            logger.info(
                f"Created {len(created_notifications)} bulk follow notifications from {follower_username or follower_user.email}"
            )
            return notification_ids

        except Exception as e:
            logger.error(f"Failed to emit bulk follow notifications: {e}")
            return []


# Initialize event emitter
notification_emitter = NotificationEventEmitter()
