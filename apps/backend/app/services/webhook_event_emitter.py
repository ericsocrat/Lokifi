"""Webhook event emitter for firing webhook events throughout the application.

This service:
- Manages webhook event registration and subscriptions
- Emits events at key application points
- Dispatches events to registered webhooks
- Handles sync and async event handlers
"""

__all__ = ["WebhookEventEmitter", "emit_webhook_event", "webhook_event_emitter"]

import asyncio
import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select

from app.core.database import db_manager
from app.models.webhook import Webhook, WebhookEvent, WebhookStatus
from app.services.webhook_delivery_service import webhook_delivery_service

logger = logging.getLogger(__name__)


@dataclass
class WebhookEventPayload:
    """Standard webhook event payload structure."""

    event: str
    data: dict[str, Any]
    timestamp: str
    version: str = "1.0"


class WebhookEventEmitter:
    """Manages webhook event emission throughout the application."""

    # Event type constants (must match WebhookEvent enum)
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_DELETED = "user.deleted"
    USER_VERIFIED = "user.verified"

    POST_CREATED = "post.created"
    POST_UPDATED = "post.updated"
    POST_DELETED = "post.deleted"

    FOLLOW_CREATED = "follow.created"
    FOLLOW_DELETED = "follow.deleted"

    CONVERSATION_STARTED = "conversation.started"
    CONVERSATION_MESSAGE = "conversation.message"

    ADMIN_ACTION = "admin.action"
    SYSTEM_EVENT = "system.event"

    # Map string events to WebhookEvent enum values
    EVENT_MAP = {
        "user.created": WebhookEvent.USER_CREATED,
        "user.updated": WebhookEvent.USER_UPDATED,
        "user.deleted": WebhookEvent.USER_DELETED,
        "user.verified": WebhookEvent.USER_VERIFIED,
        "post.created": WebhookEvent.POST_CREATED,
        "post.updated": WebhookEvent.POST_UPDATED,
        "post.deleted": WebhookEvent.POST_DELETED,
        "follow.created": WebhookEvent.FOLLOW_CREATED,
        "follow.deleted": WebhookEvent.FOLLOW_DELETED,
        "conversation.started": WebhookEvent.CONVERSATION_STARTED,
        "conversation.message": WebhookEvent.CONVERSATION_MESSAGE,
        "admin.action": WebhookEvent.ADMIN_ACTION,
        "system.event": WebhookEvent.SYSTEM_EVENT,
    }

    def __init__(self):
        self.event_handlers: dict[str, list[Callable]] = {}

    async def emit(
        self,
        event: str,
        data: dict[str, Any],
        context: Any | None = None,
    ) -> bool:
        """Emit a webhook event to all subscribed webhooks.

        Args:
            event: Event type (e.g., "user.created")
            data: Event data payload
            context: Optional context (user ID, etc.)

        Returns:
            True if event was dispatched successfully
        """
        try:
            # Validate event type
            if event not in self.EVENT_MAP:
                logger.warning(f"⚠️ Unknown webhook event type: {event}")
                return False

            logger.debug(f"📤 Emitting webhook event: {event}")

            # Get all active webhooks subscribed to this event
            async with db_manager.session() as session:
                result = await session.execute(
                    select(Webhook).where(
                        Webhook.status == WebhookStatus.ACTIVE,
                    )
                )
                webhooks = result.scalars().all()

                # Filter webhooks that are subscribed to this event
                subscribed_webhooks = [
                    w for w in webhooks if self.EVENT_MAP[event] in w.get_events()
                ]

                if not subscribed_webhooks:
                    logger.debug(f"📭 No webhooks subscribed to event: {event}")
                    return True

                logger.info(
                    f"📤 Dispatching event '{event}' to "
                    f"{len(subscribed_webhooks)} webhook(s)"
                )

                # Create payload
                payload = WebhookEventPayload(
                    event=event,
                    data=data,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )

                # Queue delivery for each subscribed webhook
                tasks = []
                for webhook in subscribed_webhooks:
                    task = webhook_delivery_service.queue_delivery(
                        webhook_id=webhook.id,
                        event=event,
                        payload=payload.__dict__,
                    )
                    tasks.append(task)

                # Wait for all queueing operations to complete
                results = await asyncio.gather(*tasks, return_exceptions=True)

                # Check results
                success_count = sum(1 for r in results if isinstance(r, bool) and r)
                logger.info(
                    f"✅ Queued event '{event}' to {success_count}/"
                    f"{len(subscribed_webhooks)} webhook(s)"
                )

                return success_count > 0

        except Exception as e:
            logger.error(f"❌ Error emitting webhook event: {e}", exc_info=True)
            return False

    async def emit_user_created(
        self,
        user_id: UUID,
        email: str,
        username: str,
        verified: bool = False,
    ) -> bool:
        """Emit user.created event.

        Args:
            user_id: ID of created user
            email: User email
            username: Username
            verified: Whether user is verified

        Returns:
            True if dispatched successfully
        """
        return await self.emit(
            self.USER_CREATED,
            {
                "user_id": str(user_id),
                "email": email,
                "username": username,
                "verified": verified,
            },
        )

    async def emit_user_verified(self, user_id: UUID, email: str) -> bool:
        """Emit user.verified event.

        Args:
            user_id: ID of verified user
            email: User email

        Returns:
            True if dispatched successfully
        """
        return await self.emit(
            self.USER_VERIFIED,
            {
                "user_id": str(user_id),
                "email": email,
            },
        )

    async def emit_user_updated(
        self,
        user_id: UUID,
        changes: dict[str, Any],
    ) -> bool:
        """Emit user.updated event.

        Args:
            user_id: ID of updated user
            changes: Dictionary of changed fields

        Returns:
            True if dispatched successfully
        """
        return await self.emit(
            self.USER_UPDATED,
            {
                "user_id": str(user_id),
                "changes": changes,
            },
        )

    async def emit_post_created(
        self,
        post_id: UUID,
        author_id: UUID,
        content_type: str,
        content_preview: str | None = None,
    ) -> bool:
        """Emit post.created event.

        Args:
            post_id: ID of created post
            author_id: ID of post author
            content_type: Type of content
            content_preview: Optional preview of content

        Returns:
            True if dispatched successfully
        """
        return await self.emit(
            self.POST_CREATED,
            {
                "post_id": str(post_id),
                "author_id": str(author_id),
                "content_type": content_type,
                "content_preview": content_preview,
            },
        )

    async def emit_follow_created(
        self,
        follower_id: UUID,
        following_id: UUID,
    ) -> bool:
        """Emit follow.created event.

        Args:
            follower_id: ID of user initiating follow
            following_id: ID of user being followed

        Returns:
            True if dispatched successfully
        """
        return await self.emit(
            self.FOLLOW_CREATED,
            {
                "follower_id": str(follower_id),
                "following_id": str(following_id),
            },
        )

    async def emit_conversation_started(
        self,
        conversation_id: UUID,
        participant_ids: list[UUID],
    ) -> bool:
        """Emit conversation.started event.

        Args:
            conversation_id: ID of new conversation
            participant_ids: IDs of conversation participants

        Returns:
            True if dispatched successfully
        """
        return await self.emit(
            self.CONVERSATION_STARTED,
            {
                "conversation_id": str(conversation_id),
                "participant_ids": [str(uid) for uid in participant_ids],
            },
        )

    async def emit_conversation_message(
        self,
        conversation_id: UUID,
        message_id: UUID,
        sender_id: UUID,
        message_preview: str | None = None,
    ) -> bool:
        """Emit conversation.message event.

        Args:
            conversation_id: ID of conversation
            message_id: ID of new message
            sender_id: ID of message sender
            message_preview: Optional preview of message content

        Returns:
            True if dispatched successfully
        """
        return await self.emit(
            self.CONVERSATION_MESSAGE,
            {
                "conversation_id": str(conversation_id),
                "message_id": str(message_id),
                "sender_id": str(sender_id),
                "message_preview": message_preview,
            },
        )

    async def emit_admin_action(
        self,
        admin_id: UUID,
        action: str,
        target_type: str,
        target_id: UUID | None = None,
        details: dict[str, Any] | None = None,
    ) -> bool:
        """Emit admin.action event.

        Args:
            admin_id: ID of admin performing action
            action: Action type (e.g., "user.suspend", "content.moderate")
            target_type: Type of target (e.g., "user", "post")
            target_id: Optional ID of target
            details: Optional additional details

        Returns:
            True if dispatched successfully
        """
        return await self.emit(
            self.ADMIN_ACTION,
            {
                "admin_id": str(admin_id),
                "action": action,
                "target_type": target_type,
                "target_id": str(target_id) if target_id else None,
                "details": details or {},
            },
        )

    async def emit_system_event(
        self,
        event_name: str,
        severity: str = "info",
        details: dict[str, Any] | None = None,
    ) -> bool:
        """Emit system.event for system-level events.

        Args:
            event_name: Name of system event
            severity: Event severity (info, warning, error)
            details: Optional event details

        Returns:
            True if dispatched successfully
        """
        return await self.emit(
            self.SYSTEM_EVENT,
            {
                "event_name": event_name,
                "severity": severity,
                "details": details or {},
            },
        )

    def register_handler(self, event: str, handler: Callable) -> None:
        """Register a custom event handler.

        Args:
            event: Event type to handle
            handler: Callable to invoke when event is emitted
        """
        if event not in self.event_handlers:
            self.event_handlers[event] = []
        self.event_handlers[event].append(handler)
        logger.debug(f"✅ Registered handler for event: {event}")

    async def call_handlers(self, event: str, payload: dict[str, Any]) -> None:
        """Call all registered handlers for an event.

        Args:
            event: Event type
            payload: Event payload
        """
        if event not in self.event_handlers:
            return

        for handler in self.event_handlers[event]:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(payload)
                else:
                    handler(payload)
            except Exception as e:
                logger.error(
                    f"❌ Error calling handler for event '{event}': {e}",
                    exc_info=True,
                )


# Global instance
webhook_event_emitter = WebhookEventEmitter()


# Convenience function for emitting events
async def emit_webhook_event(
    event: str,
    data: dict[str, Any],
) -> bool:
    """Emit a webhook event.

    Convenience function that uses the global webhook_event_emitter instance.

    Args:
        event: Event type (e.g., "user.created")
        data: Event data

    Returns:
        True if dispatched successfully
    """
    return await webhook_event_emitter.emit(event, data)
