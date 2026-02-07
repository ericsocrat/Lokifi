"""Tests for admin webhook management routes."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.api.routes.admin_webhooks import (
    create_webhook,
    delete_webhook,
    get_available_events,
    get_webhook,
    get_webhook_deliveries,
    get_webhook_secret,
    list_webhooks,
    rotate_webhook_secret,
    test_webhook as route_test_webhook,
    update_webhook,
)
from app.models.user import User
from app.models.webhook import Webhook, WebhookStatus
from app.models.webhook_delivery import DeliveryStatus, WebhookDelivery
from app.schemas.webhook import WebhookCreate, WebhookTestPayload, WebhookUpdate


class TestAdminWebhookCRUD:
    """Test CRUD operations for webhook management routes."""

    @pytest.fixture
    def mock_admin_user(self) -> User:
        """Create a mock admin user."""
        user = MagicMock(spec=User)
        user.id = uuid4()
        user.email = "admin@lokifi.com"
        user.is_admin = True
        return user

    @pytest.fixture
    def mock_webhook(self) -> MagicMock:
        """Create a mock webhook with all required attributes."""
        webhook = MagicMock(spec=Webhook)
        webhook.id = uuid4()
        webhook.url = "https://example.com/webhook"
        webhook.name = "Test Webhook"
        webhook.description = "Test webhook for testing"
        webhook.events = "user.created,content.updated"
        webhook.secret = "test_secret_key_12345678"
        webhook.active = True
        webhook.status = WebhookStatus.ACTIVE
        webhook.max_retries = 5
        webhook.retry_delay_seconds = 60
        webhook.created_at = datetime.now(timezone.utc)
        webhook.updated_at = datetime.now(timezone.utc)
        webhook.last_triggered_at = None
        webhook.successful_deliveries = 0
        webhook.failed_deliveries = 0
        webhook.parse_events.return_value = ["user.created", "content.updated"]
        return webhook

    @pytest.fixture
    def mock_delivery(self, mock_webhook: MagicMock) -> MagicMock:
        """Create a mock webhook delivery."""
        delivery = MagicMock(spec=WebhookDelivery)
        delivery.id = uuid4()
        delivery.webhook_id = mock_webhook.id
        delivery.event = "user.created"
        delivery.payload = '{"user_id": "test-id"}'
        delivery.status = DeliveryStatus.SUCCESS
        delivery.http_status_code = 200
        delivery.response_body = '{"ok": true}'
        delivery.attempt = 1
        delivery.created_at = datetime.now(timezone.utc)
        delivery.delivered_at = datetime.now(timezone.utc)
        delivery.next_retry_at = None
        return delivery

    # ========== List Webhooks ==========

    async def test_list_webhooks_empty(self, mock_admin_user: User) -> None:
        """Test listing webhooks when no webhooks exist."""
        db = AsyncMock()

        count_result = MagicMock()
        count_result.scalars.return_value.all.return_value = []

        list_result = MagicMock()
        list_result.scalars.return_value.all.return_value = []

        db.execute.side_effect = [count_result, list_result]

        result = await list_webhooks(
            db=db,
            _=mock_admin_user,
            page=1,
            page_size=20,
            status_filter=None,
        )

        assert result.total == 0
        assert result.webhooks == []
        assert result.page == 1
        assert result.page_size == 20

    async def test_list_webhooks_with_results(
        self, mock_admin_user: User, mock_webhook: MagicMock
    ) -> None:
        """Test listing webhooks returns webhook data."""
        db = AsyncMock()

        count_result = MagicMock()
        count_result.scalars.return_value.all.return_value = [mock_webhook]

        list_result = MagicMock()
        list_result.scalars.return_value.all.return_value = [mock_webhook]

        db.execute.side_effect = [count_result, list_result]

        result = await list_webhooks(
            db=db,
            _=mock_admin_user,
            page=1,
            page_size=20,
            status_filter=None,
        )

        assert result.total == 1
        assert len(result.webhooks) == 1
        assert result.webhooks[0].name == "Test Webhook"

    async def test_list_webhooks_with_status_filter(
        self, mock_admin_user: User, mock_webhook: MagicMock
    ) -> None:
        """Test listing webhooks with status filter."""
        db = AsyncMock()

        count_result = MagicMock()
        count_result.scalars.return_value.all.return_value = [mock_webhook]

        list_result = MagicMock()
        list_result.scalars.return_value.all.return_value = [mock_webhook]

        db.execute.side_effect = [count_result, list_result]

        result = await list_webhooks(
            db=db,
            _=mock_admin_user,
            page=1,
            page_size=20,
            status_filter="active",
        )

        assert result.total == 1
        assert len(result.webhooks) == 1

    # ========== Create Webhook ==========

    async def test_create_webhook(self, mock_admin_user: User) -> None:
        """Test creating a new webhook."""
        db = AsyncMock()

        async def mock_refresh(webhook: Webhook) -> None:
            webhook.id = uuid4()
            webhook.created_at = datetime.now(timezone.utc)
            webhook.updated_at = datetime.now(timezone.utc)
            webhook.last_triggered_at = None
            webhook.successful_deliveries = 0
            webhook.failed_deliveries = 0

        db.refresh.side_effect = mock_refresh

        data = WebhookCreate(
            name="New Webhook",
            url="https://api.example.com/webhook",
            description="A test webhook",
            events=["user.created", "user.deleted"],
            active=True,
            max_retries=3,
            retry_delay_seconds=30,
        )

        result = await create_webhook(
            db=db,
            _=mock_admin_user,
            webhook_data=data,
        )

        assert result.name == "New Webhook"
        assert result.active is True
        assert result.status == WebhookStatus.ACTIVE
        assert db.add.called
        assert db.commit.called
        assert db.refresh.called

    # ========== Get Webhook ==========

    async def test_get_webhook_found(
        self, mock_admin_user: User, mock_webhook: MagicMock
    ) -> None:
        """Test getting an existing webhook."""
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = mock_webhook
        db.execute.return_value = result_mock

        result = await get_webhook(
            db=db,
            _=mock_admin_user,
            webhook_id=str(mock_webhook.id),
        )

        assert result.name == "Test Webhook"

    async def test_get_webhook_not_found(self, mock_admin_user: User) -> None:
        """Test getting a non-existent webhook raises 404."""
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        db.execute.return_value = result_mock

        with pytest.raises(Exception) as exc:
            await get_webhook(
                db=db,
                _=mock_admin_user,
                webhook_id=str(uuid4()),
            )
        assert "not found" in str(exc.value).lower()

    # ========== Update Webhook ==========

    async def test_update_webhook(
        self, mock_admin_user: User, mock_webhook: MagicMock
    ) -> None:
        """Test updating a webhook."""
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = mock_webhook
        db.execute.return_value = result_mock

        data = WebhookUpdate(
            description="Updated description",
            max_retries=10,
        )

        result = await update_webhook(
            db=db,
            _=mock_admin_user,
            webhook_id=str(mock_webhook.id),
            webhook_data=data,
        )

        assert result.name == "Test Webhook"
        assert db.commit.called
        assert db.refresh.called

    async def test_update_webhook_not_found(self, mock_admin_user: User) -> None:
        """Test updating a non-existent webhook raises 404."""
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        db.execute.return_value = result_mock

        data = WebhookUpdate(description="Updated")

        with pytest.raises(Exception) as exc:
            await update_webhook(
                db=db,
                _=mock_admin_user,
                webhook_id=str(uuid4()),
                webhook_data=data,
            )
        assert "not found" in str(exc.value).lower()

    # ========== Delete Webhook ==========

    async def test_delete_webhook(
        self, mock_admin_user: User, mock_webhook: MagicMock
    ) -> None:
        """Test deleting a webhook."""
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = mock_webhook
        db.execute.return_value = result_mock

        await delete_webhook(
            db=db,
            _=mock_admin_user,
            webhook_id=str(mock_webhook.id),
        )

        assert db.delete.called
        assert db.commit.called

    async def test_delete_webhook_not_found(self, mock_admin_user: User) -> None:
        """Test deleting a non-existent webhook raises 404."""
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        db.execute.return_value = result_mock

        with pytest.raises(Exception) as exc:
            await delete_webhook(
                db=db,
                _=mock_admin_user,
                webhook_id=str(uuid4()),
            )
        assert "not found" in str(exc.value).lower()


class TestWebhookSecretManagement:
    """Test webhook secret management endpoints."""

    @pytest.fixture
    def mock_admin_user(self) -> User:
        """Create a mock admin user."""
        user = MagicMock(spec=User)
        user.id = uuid4()
        user.email = "admin@lokifi.com"
        user.is_admin = True
        return user

    @pytest.fixture
    def mock_webhook(self) -> MagicMock:
        """Create a mock webhook."""
        webhook = MagicMock(spec=Webhook)
        webhook.id = uuid4()
        webhook.url = "https://example.com/webhook"
        webhook.name = "Test Webhook"
        webhook.description = "Test webhook"
        webhook.events = "user.created"
        webhook.secret = "test_secret_key_12345678"
        webhook.active = True
        webhook.status = WebhookStatus.ACTIVE
        webhook.max_retries = 5
        webhook.retry_delay_seconds = 60
        webhook.created_at = datetime.now(timezone.utc)
        webhook.updated_at = datetime.now(timezone.utc)
        webhook.last_triggered_at = None
        webhook.successful_deliveries = 0
        webhook.failed_deliveries = 0
        return webhook

    async def test_get_webhook_secret(
        self, mock_admin_user: User, mock_webhook: MagicMock
    ) -> None:
        """Test viewing full webhook secret."""
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = mock_webhook
        db.execute.return_value = result_mock

        result = await get_webhook_secret(
            db=db,
            _=mock_admin_user,
            webhook_id=str(mock_webhook.id),
        )

        assert result.secret == "test_secret_key_12345678"
        assert result.webhook_id == str(mock_webhook.id)

    async def test_get_webhook_secret_not_found(self, mock_admin_user: User) -> None:
        """Test getting secret for non-existent webhook raises 404."""
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        db.execute.return_value = result_mock

        with pytest.raises(Exception) as exc:
            await get_webhook_secret(
                db=db,
                _=mock_admin_user,
                webhook_id=str(uuid4()),
            )
        assert "not found" in str(exc.value).lower()

    async def test_rotate_webhook_secret(
        self, mock_admin_user: User, mock_webhook: MagicMock
    ) -> None:
        """Test rotating webhook secret generates new secret."""
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = mock_webhook
        db.execute.return_value = result_mock

        result = await rotate_webhook_secret(
            db=db,
            _=mock_admin_user,
            webhook_id=str(mock_webhook.id),
        )

        assert db.commit.called
        assert result.webhook_id == str(mock_webhook.id)

    async def test_rotate_webhook_secret_not_found(
        self, mock_admin_user: User
    ) -> None:
        """Test rotating secret for non-existent webhook raises 404."""
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        db.execute.return_value = result_mock

        with pytest.raises(Exception) as exc:
            await rotate_webhook_secret(
                db=db,
                _=mock_admin_user,
                webhook_id=str(uuid4()),
            )
        assert "not found" in str(exc.value).lower()


class TestWebhookDeliveryHistory:
    """Test webhook delivery tracking endpoints."""

    @pytest.fixture
    def mock_admin_user(self) -> User:
        """Create a mock admin user."""
        user = MagicMock(spec=User)
        user.id = uuid4()
        user.email = "admin@lokifi.com"
        user.is_admin = True
        return user

    @pytest.fixture
    def mock_webhook(self) -> MagicMock:
        """Create a mock webhook."""
        webhook = MagicMock(spec=Webhook)
        webhook.id = uuid4()
        webhook.url = "https://example.com/webhook"
        webhook.name = "Test Webhook"
        webhook.events = "user.created"
        webhook.secret = "test_secret"
        webhook.active = True
        webhook.status = WebhookStatus.ACTIVE
        webhook.max_retries = 5
        webhook.retry_delay_seconds = 60
        webhook.created_at = datetime.now(timezone.utc)
        webhook.updated_at = datetime.now(timezone.utc)
        webhook.parse_events.return_value = ["user.created"]
        return webhook

    @pytest.fixture
    def mock_delivery(self, mock_webhook: MagicMock) -> MagicMock:
        """Create a mock webhook delivery."""
        delivery = MagicMock(spec=WebhookDelivery)
        delivery.id = uuid4()
        delivery.webhook_id = mock_webhook.id
        delivery.event = "user.created"
        delivery.payload = '{"user_id": "123"}'
        delivery.status = DeliveryStatus.SUCCESS
        delivery.http_status_code = 200
        delivery.response_body = '{"ok": true}'
        delivery.attempt = 1
        delivery.created_at = datetime.now(timezone.utc)
        delivery.delivered_at = datetime.now(timezone.utc)
        delivery.next_retry_at = None
        return delivery

    async def test_get_deliveries_empty(
        self, mock_admin_user: User, mock_webhook: MagicMock
    ) -> None:
        """Test getting delivery history when empty."""
        db = AsyncMock()

        webhook_result = MagicMock()
        webhook_result.scalar_one_or_none.return_value = mock_webhook

        count_result = MagicMock()
        count_result.scalars.return_value.all.return_value = []

        delivery_result = MagicMock()
        delivery_result.scalars.return_value.all.return_value = []

        db.execute.side_effect = [webhook_result, count_result, delivery_result]

        result = await get_webhook_deliveries(
            db=db,
            _=mock_admin_user,
            webhook_id=str(mock_webhook.id),
            page=1,
            page_size=20,
        )

        assert result.total == 0
        assert result.deliveries == []

    async def test_get_deliveries_with_items(
        self,
        mock_admin_user: User,
        mock_webhook: MagicMock,
        mock_delivery: MagicMock,
    ) -> None:
        """Test getting delivery history with items."""
        db = AsyncMock()

        webhook_result = MagicMock()
        webhook_result.scalar_one_or_none.return_value = mock_webhook

        count_result = MagicMock()
        count_result.scalars.return_value.all.return_value = [mock_delivery]

        delivery_result = MagicMock()
        delivery_result.scalars.return_value.all.return_value = [mock_delivery]

        db.execute.side_effect = [webhook_result, count_result, delivery_result]

        result = await get_webhook_deliveries(
            db=db,
            _=mock_admin_user,
            webhook_id=str(mock_webhook.id),
            page=1,
            page_size=20,
        )

        assert result.total == 1
        assert len(result.deliveries) == 1
        assert result.deliveries[0].event == "user.created"
        assert result.deliveries[0].status == DeliveryStatus.SUCCESS

    async def test_get_deliveries_webhook_not_found(
        self, mock_admin_user: User
    ) -> None:
        """Test getting deliveries for non-existent webhook raises 404."""
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        db.execute.return_value = result_mock

        with pytest.raises(Exception) as exc:
            await get_webhook_deliveries(
                db=db,
                _=mock_admin_user,
                webhook_id=str(uuid4()),
                page=1,
                page_size=20,
            )
        assert "not found" in str(exc.value).lower()


class TestWebhookTestEndpoint:
    """Test webhook testing endpoints."""

    @pytest.fixture
    def mock_admin_user(self) -> User:
        """Create a mock admin user."""
        user = MagicMock(spec=User)
        user.id = uuid4()
        user.email = "admin@lokifi.com"
        user.is_admin = True
        return user

    @pytest.fixture
    def mock_webhook(self) -> MagicMock:
        """Create a mock webhook."""
        webhook = MagicMock(spec=Webhook)
        webhook.id = uuid4()
        webhook.url = "https://example.com/webhook"
        webhook.name = "Test Webhook"
        webhook.events = "user.created,content.updated"
        webhook.secret = "test_secret"
        webhook.active = True
        webhook.status = WebhookStatus.ACTIVE
        webhook.max_retries = 5
        webhook.retry_delay_seconds = 60
        webhook.created_at = datetime.now(timezone.utc)
        webhook.updated_at = datetime.now(timezone.utc)
        webhook.parse_events.return_value = ["user.created", "content.updated"]
        return webhook

    async def test_test_webhook_valid_event(
        self, mock_admin_user: User, mock_webhook: MagicMock
    ) -> None:
        """Test webhook test delivery with valid event."""
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = mock_webhook
        db.execute.return_value = result_mock

        payload = WebhookTestPayload(event="user.created")

        result = await route_test_webhook(
            db=db,
            _=mock_admin_user,
            webhook_id=str(mock_webhook.id),
            test_payload=payload,
        )

        assert result["status"] == "queued"

    async def test_test_webhook_invalid_event(
        self, mock_admin_user: User, mock_webhook: MagicMock
    ) -> None:
        """Test webhook test with event not subscribed."""
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = mock_webhook
        db.execute.return_value = result_mock

        payload = WebhookTestPayload(event="invalid.event")

        with pytest.raises(Exception) as exc:
            await route_test_webhook(
                db=db,
                _=mock_admin_user,
                webhook_id=str(mock_webhook.id),
                test_payload=payload,
            )
        assert "400" in str(exc.value) or "not subscribed" in str(exc.value).lower()

    async def test_test_webhook_not_found(self, mock_admin_user: User) -> None:
        """Test webhook test for non-existent webhook raises 404."""
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        db.execute.return_value = result_mock

        payload = WebhookTestPayload(event="user.created")

        with pytest.raises(Exception) as exc:
            await route_test_webhook(
                db=db,
                _=mock_admin_user,
                webhook_id=str(uuid4()),
                test_payload=payload,
            )
        assert "not found" in str(exc.value).lower()


class TestWebhookAvailableEvents:
    """Test available webhook events endpoint."""

    @pytest.fixture
    def mock_admin_user(self) -> User:
        """Create a mock admin user."""
        user = MagicMock(spec=User)
        user.id = uuid4()
        user.email = "admin@lokifi.com"
        user.is_admin = True
        return user

    async def test_get_available_events(self, mock_admin_user: User) -> None:
        """Test getting list of available webhook events."""
        result = await get_available_events(_=mock_admin_user)

        assert len(result.events) > 0
        assert "user.created" in result.events
        assert "user.updated" in result.events
        assert "content.created" in result.events

    async def test_available_events_includes_all_categories(
        self, mock_admin_user: User
    ) -> None:
        """Test that all event categories are represented."""
        result = await get_available_events(_=mock_admin_user)

        events = result.events
        assert "user.created" in events
        assert "content.created" in events
        assert "admin.action" in events
        assert "system.health" in events
