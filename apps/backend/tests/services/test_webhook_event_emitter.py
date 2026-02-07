"""Tests for webhook event emitter.

Tests cover:
- Event emission and dispatch
- Event routing to subscribed webhooks
- Event payload structure
- Custom event handlers
- Event map validation
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.models.webhook import Webhook, WebhookEvent, WebhookStatus
from app.services.webhook_event_emitter import (
    WebhookEventEmitter,
    WebhookEventPayload,
    webhook_event_emitter,
)


def _make_mock_webhook(
    url: str,
    name: str,
    events: list[str],
    secret: str = "test-secret",  # noqa: S107
) -> MagicMock:
    """Create a mock webhook with proper event filtering support."""
    webhook = MagicMock()
    webhook.id = uuid4()
    webhook.url = url
    webhook.name = name
    webhook.events = ",".join(events)
    webhook.secret = secret
    webhook.active = True
    webhook.status = WebhookStatus.ACTIVE
    webhook.max_retries = 3
    webhook.retry_delay_seconds = 60
    # get_events() returns list of event strings for filtering
    webhook.get_events.return_value = events
    return webhook


@pytest.fixture
def test_webhooks() -> list[MagicMock]:
    """Create mock test webhooks with different event subscriptions."""
    return [
        _make_mock_webhook(
            url="https://webhook1.example.com/events",
            name="User Events Webhook",
            events=["user.created", "user.verified"],
            secret="secret1",
        ),
        _make_mock_webhook(
            url="https://webhook2.example.com/events",
            name="Post Events Webhook",
            events=["post.created", "post.updated"],
            secret="secret2",
        ),
        _make_mock_webhook(
            url="https://webhook3.example.com/events",
            name="All Events Webhook",
            events=["user.created", "post.created", "follow.created"],
            secret="secret3",
        ),
    ]


@pytest.fixture
def emitter() -> WebhookEventEmitter:
    """Create a webhook event emitter instance."""
    return WebhookEventEmitter()


def _patch_db_with_webhooks(webhooks: list[MagicMock]):
    """Create a patch context for db_manager.session() returning webhooks."""
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = webhooks
    mock_session.execute.return_value = mock_result

    mock_cm = AsyncMock()
    mock_cm.__aenter__.return_value = mock_session

    return patch(
        "app.services.webhook_event_emitter.db_manager",
        **{"session.return_value": mock_cm},
    )


class TestWebhookEventEmission:
    """Tests for webhook event emission."""

    @pytest.mark.asyncio
    async def test_emit_user_created_event(
        self,
        emitter: WebhookEventEmitter,
        test_webhooks: list[MagicMock],
    ):
        """Test emitting user.created event routes to subscribed webhooks."""
        user_id = uuid4()

        with (
            _patch_db_with_webhooks(test_webhooks),
            patch(
                "app.services.webhook_event_emitter.webhook_delivery_service"
            ) as mock_service,
        ):
            mock_service.queue_delivery = AsyncMock(return_value=True)

            result = await emitter.emit_user_created(
                user_id=user_id,
                email="test@example.com",
                username="testuser",
            )

            assert result is True
            # webhook1 and webhook3 subscribe to user.created
            assert mock_service.queue_delivery.call_count == 2

    @pytest.mark.asyncio
    async def test_emit_post_created_event(
        self,
        emitter: WebhookEventEmitter,
        test_webhooks: list[MagicMock],
    ):
        """Test emitting post.created event routes correctly."""
        with (
            _patch_db_with_webhooks(test_webhooks),
            patch(
                "app.services.webhook_event_emitter.webhook_delivery_service"
            ) as mock_service,
        ):
            mock_service.queue_delivery = AsyncMock(return_value=True)

            result = await emitter.emit_post_created(
                post_id=uuid4(),
                author_id=uuid4(),
                content_type="text",
            )

            assert result is True
            # webhook2 and webhook3 subscribe to post.created
            assert mock_service.queue_delivery.call_count == 2

    @pytest.mark.asyncio
    async def test_emit_follow_created_event(
        self,
        emitter: WebhookEventEmitter,
        test_webhooks: list[MagicMock],
    ):
        """Test emitting follow.created event routes to correct webhook."""
        with (
            _patch_db_with_webhooks(test_webhooks),
            patch(
                "app.services.webhook_event_emitter.webhook_delivery_service"
            ) as mock_service,
        ):
            mock_service.queue_delivery = AsyncMock(return_value=True)

            result = await emitter.emit_follow_created(
                follower_id=uuid4(),
                following_id=uuid4(),
            )

            assert result is True
            # Only webhook3 subscribes to follow.created
            assert mock_service.queue_delivery.call_count == 1

    @pytest.mark.asyncio
    async def test_emit_admin_action(
        self,
        emitter: WebhookEventEmitter,
        test_webhooks: list[MagicMock],
    ):
        """Test emitting admin.action event."""
        with (
            _patch_db_with_webhooks(test_webhooks),
            patch(
                "app.services.webhook_event_emitter.webhook_delivery_service"
            ) as mock_service,
        ):
            mock_service.queue_delivery = AsyncMock(return_value=True)

            result = await emitter.emit_admin_action(
                admin_id=uuid4(),
                action="user.suspend",
                target_type="user",
                target_id=uuid4(),
                details={"reason": "spam"},
            )

            # admin.action not in test webhook subscriptions, so 0 queued
            assert result is True

    @pytest.mark.asyncio
    async def test_emit_system_event(
        self,
        emitter: WebhookEventEmitter,
        test_webhooks: list[MagicMock],
    ):
        """Test emitting system.event."""
        with (
            _patch_db_with_webhooks(test_webhooks),
            patch(
                "app.services.webhook_event_emitter.webhook_delivery_service"
            ) as mock_service,
        ):
            mock_service.queue_delivery = AsyncMock(return_value=True)

            result = await emitter.emit_system_event(
                event_name="maintenance_started",
                severity="warning",
                details={"estimated_duration": "30 minutes"},
            )

            # system.event not in test webhook subscriptions
            assert result is True


class TestWebhookEventPayload:
    """Tests for webhook event payload structure."""

    def test_event_payload_structure(self):
        """Test webhook event payload structure."""
        payload = WebhookEventPayload(
            event="user.created",
            data={"user_id": "123", "email": "test@example.com"},
            timestamp=datetime.now(timezone.utc).isoformat(),
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
            timestamp=datetime.now(timezone.utc).isoformat(),
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

        def test_handler(payload: dict):
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

        async def async_test_handler(payload: dict):
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
        calls: list[str] = []

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
        for event_enum in emitter.EVENT_MAP.values():
            assert isinstance(event_enum, WebhookEvent)


class TestGlobalEmitter:
    """Tests for global webhook event emitter instance."""

    @pytest.mark.asyncio
    async def test_global_emitter_instance(self):
        """Test that global emitter instance is available."""
        assert webhook_event_emitter is not None
        assert isinstance(webhook_event_emitter, WebhookEventEmitter)
