"""Tests for webhook event emitter.

Tests cover:
- Event emission and dispatch
- Event routing to subscribed webhooks
- Event payload structure
- Custom event handlers
"""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.webhook import Webhook, WebhookEvent, WebhookStatus
from app.services.webhook_event_emitter import (
    WebhookEventEmitter,
    WebhookEventPayload,
    webhook_event_emitter,
)


@pytest.fixture
async def test_webhooks(session: AsyncSession) -> list[Webhook]:
    """Create test webhooks with different event subscriptions."""
    webhooks = [
        Webhook(
            id=uuid4(),
            url="https://webhook1.example.com/events",
            name="User Events Webhook",
            events="user.created,user.verified",
            secret="secret1",
            active=True,
            status=WebhookStatus.ACTIVE,
            max_retries=3,
            retry_delay_seconds=60,
        ),
        Webhook(
            id=uuid4(),
            url="https://webhook2.example.com/events",
            name="Post Events Webhook",
            events="post.created,post.updated",
            secret="secret2",
            active=True,
            status=WebhookStatus.ACTIVE,
            max_retries=3,
            retry_delay_seconds=60,
        ),
        Webhook(
            id=uuid4(),
            url="https://webhook3.example.com/events",
            name="All Events Webhook",
            events="user.created,post.created,follow.created",
            secret="secret3",
            active=True,
            status=WebhookStatus.ACTIVE,
            max_retries=3,
            retry_delay_seconds=60,
        ),
    ]
    for webhook in webhooks:
        session.add(webhook)
    await session.flush()
    return webhooks


@pytest.fixture
def emitter() -> WebhookEventEmitter:
    """Create a webhook event emitter instance."""
    return WebhookEventEmitter()


class TestWebhookEventEmission:
    """Tests for webhook event emission."""

    @pytest.mark.asyncio
    async def test_emit_user_created_event(
        self,
        emitter: WebhookEventEmitter,
        test_webhooks: list[Webhook],
    ):
        """Test emitting user.created event."""
        user_id = uuid4()
        email = "test@example.com"
        username = "testuser"

        with patch(
            "app.services.webhook_event_emitter.webhook_delivery_service.queue_delivery"
        ) as mock_queue:
            mock_queue.return_value = True

            result = await emitter.emit_user_created(
                user_id=user_id,
                email=email,
                username=username,
            )

            assert result is True
            # Should queue to webhooks subscribed to user.created
            assert mock_queue.call_count == 2  # webhook1 and webhook3

    @pytest.mark.asyncio
    async def test_emit_post_created_event(
        self,
        emitter: WebhookEventEmitter,
        test_webhooks: list[Webhook],
    ):
        """Test emitting post.created event."""
        post_id = uuid4()
        author_id = uuid4()
        content_type = "text"

        with patch(
            "app.services.webhook_event_emitter.webhook_delivery_service.queue_delivery"
        ) as mock_queue:
            mock_queue.return_value = True

            result = await emitter.emit_post_created(
                post_id=post_id,
                author_id=author_id,
                content_type=content_type,
            )

            assert result is True
            # Should queue to webhooks subscribed to post.created
            assert mock_queue.call_count == 2  # webhook2 and webhook3

    @pytest.mark.asyncio
    async def test_emit_follow_created_event(
        self,
        emitter: WebhookEventEmitter,
        test_webhooks: list[Webhook],
    ):
        """Test emitting follow.created event."""
        follower_id = uuid4()
        following_id = uuid4()

        with patch(
            "app.services.webhook_event_emitter.webhook_delivery_service.queue_delivery"
        ) as mock_queue:
            mock_queue.return_value = True

            result = await emitter.emit_follow_created(
                follower_id=follower_id,
                following_id=following_id,
            )

            assert result is True
            # Should queue to webhook3 only (follows webhook)
            assert mock_queue.call_count == 1  # webhook3

    @pytest.mark.asyncio
    async def test_emit_admin_action(
        self,
        emitter: WebhookEventEmitter,
        test_webhooks: list[Webhook],
    ):
        """Test emitting admin.action event."""
        admin_id = uuid4()
        target_id = uuid4()

        with patch(
            "app.services.webhook_event_emitter.webhook_delivery_service.queue_delivery"
        ) as mock_queue:
            mock_queue.return_value = True

            result = await emitter.emit_admin_action(
                admin_id=admin_id,
                action="user.suspend",
                target_type="user",
                target_id=target_id,
                details={"reason": "spam"},
            )

            # Note: admin.action not in test webhooks subscriptions
            assert result is True

    @pytest.mark.asyncio
    async def test_emit_system_event(
        self,
        emitter: WebhookEventEmitter,
        test_webhooks: list[Webhook],
    ):
        """Test emitting system.event."""
        with patch(
            "app.services.webhook_event_emitter.webhook_delivery_service.queue_delivery"
        ) as mock_queue:
            mock_queue.return_value = True

            result = await emitter.emit_system_event(
                event_name="maintenance_started",
                severity="warning",
                details={"estimated_duration": "30 minutes"},
            )

            # Note: system.event not in test webhooks subscriptions
            assert result is True


class TestWebhookEventPayload:
    """Tests for webhook event payload structure."""

    def test_event_payload_structure(self):
        """Test webhook event payload structure."""
        payload = WebhookEventPayload(
            event="user.created",
            data={"user_id": "123", "email": "test@example.com"},
        )

        assert payload.event == "user.created"
        assert payload.data["user_id"] == "123"
        assert payload.version == "1.0"
        assert payload.timestamp is not None

    def test_event_payload_to_dict(self):
        """Test converting event payload to dictionary."""
        data = {"user_id": "123", "email": "test@example.com"}
        payload = WebhookEventPayload(
            event="user.created",
            data=data,
        )

        payload_dict = payload.__dict__
        assert "event" in payload_dict
        assert "data" in payload_dict
        assert "timestamp" in payload_dict
        assert "version" in payload_dict


class TestWebhookEventHandlers:
    """Tests for custom event handlers."""

    @pytest.mark.asyncio
    async def test_register_and_call_sync_handler(
        self,
        emitter: WebhookEventEmitter,
    ):
        """Test registering and calling synchronous event handler."""
        handler_called = {"called": False, "payload": None}

        def test_handler(payload: dict[str, str | any]):
            handler_called["called"] = True
            handler_called["payload"] = payload

        emitter.register_handler("test.event", test_handler)
        await emitter.call_handlers("test.event", {"test": "data"})

        assert handler_called["called"] is True
        assert handler_called["payload"]["test"] == "data"

    @pytest.mark.asyncio
    async def test_register_and_call_async_handler(
        self,
        emitter: WebhookEventEmitter,
    ):
        """Test registering and calling asynchronous event handler."""
        handler_called = {"called": False, "payload": None}

        async def async_test_handler(payload: dict[str, str | any]):
            handler_called["called"] = True
            handler_called["payload"] = payload

        emitter.register_handler("test.event", async_test_handler)
        await emitter.call_handlers("test.event", {"test": "data"})

        assert handler_called["called"] is True
        assert handler_called["payload"]["test"] == "data"

    @pytest.mark.asyncio
    async def test_handler_error_handling(
        self,
        emitter: WebhookEventEmitter,
    ):
        """Test that handler errors don't break event processing."""

        def failing_handler(payload: dict):
            raise ValueError("Handler error")

        def working_handler(payload: dict):
            working_handler.called = True

        working_handler.called = False

        emitter.register_handler("test.event", failing_handler)
        emitter.register_handler("test.event", working_handler)

        # Should not raise exception
        await emitter.call_handlers("test.event", {"test": "data"})

        # Working handler should still be called
        assert working_handler.called is True

    @pytest.mark.asyncio
    async def test_multiple_handlers_same_event(
        self,
        emitter: WebhookEventEmitter,
    ):
        """Test multiple handlers for same event."""
        calls = []

        def handler1(payload: dict):
            calls.append("handler1")

        def handler2(payload: dict):
            calls.append("handler2")

        emitter.register_handler("test.event", handler1)
        emitter.register_handler("test.event", handler2)

        await emitter.call_handlers("test.event", {"test": "data"})

        assert len(calls) == 2
        assert "handler1" in calls
        assert "handler2" in calls


class TestEventMap:
    """Tests for event type mapping."""

    def test_all_events_mapped(self, emitter: WebhookEventEmitter):
        """Test that all event constants are in the EVENT_MAP."""
        # User events
        assert emitter.USER_CREATED in emitter.EVENT_MAP
        assert emitter.USER_UPDATED in emitter.EVENT_MAP
        assert emitter.USER_DELETED in emitter.EVENT_MAP
        assert emitter.USER_VERIFIED in emitter.EVENT_MAP

        # Post events
        assert emitter.POST_CREATED in emitter.EVENT_MAP
        assert emitter.POST_UPDATED in emitter.EVENT_MAP
        assert emitter.POST_DELETED in emitter.EVENT_MAP

        # Follow events
        assert emitter.FOLLOW_CREATED in emitter.EVENT_MAP
        assert emitter.FOLLOW_DELETED in emitter.EVENT_MAP

        # Conversation events
        assert emitter.CONVERSATION_STARTED in emitter.EVENT_MAP
        assert emitter.CONVERSATION_MESSAGE in emitter.EVENT_MAP

        # Admin/System events
        assert emitter.ADMIN_ACTION in emitter.EVENT_MAP
        assert emitter.SYSTEM_EVENT in emitter.EVENT_MAP

    def test_event_map_maps_to_enum(self, emitter: WebhookEventEmitter):
        """Test that EVENT_MAP values are WebhookEvent enum values."""
        for event_str, event_enum in emitter.EVENT_MAP.items():
            assert isinstance(event_enum, WebhookEvent)
            assert event_str == event_enum


class TestGlobalEmitter:
    """Tests for global webhook event emitter instance."""

    @pytest.mark.asyncio
    async def test_global_emitter_instance(self):
        """Test that global emitter instance is available."""
        assert webhook_event_emitter is not None
        assert isinstance(webhook_event_emitter, WebhookEventEmitter)
