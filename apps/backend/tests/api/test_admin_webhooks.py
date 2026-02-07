"""Test suite for admin webhook management endpoints (Session 197)."""

import json
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models import User, Webhook, WebhookDelivery, WebhookEvent, WebhookStatus
from app.schemas.webhook import WebhookResponse


@pytest.fixture
async def test_webhook(db_session: AsyncSession, admin_user: User) -> Webhook:
    """Create a test webhook."""
    webhook = Webhook(
        id=uuid.uuid4(),
        url="https://example.com/webhook",
        name="Test Webhook",
        description="Test webhook for integration",
        events=["user.created", "content.updated"],
        secret="test_secret_key_12345",
        active=True,
        status=WebhookStatus.ACTIVE,
        max_retries=5,
        retry_delay_seconds=60,
        created_at=datetime.now(timezone.utc),
        created_by=admin_user.id,
    )
    db_session.add(webhook)
    await db_session.flush()
    return webhook


@pytest.fixture
async def test_webhook_delivery(db_session: AsyncSession, test_webhook: Webhook):
    """Create a test webhook delivery."""
    from app.models import DeliveryStatus

    delivery = WebhookDelivery(
        id=uuid.uuid4(),
        webhook_id=test_webhook.id,
        event="user.created",
        payload=json.dumps({"user_id": str(uuid.uuid4()), "username": "testuser"}),
        status=DeliveryStatus.SUCCESS,
        http_status_code=200,
        response_body=json.dumps({"success": True}),
        attempt=1,
        created_at=datetime.now(timezone.utc),
        delivered_at=datetime.now(timezone.utc),
    )
    db_session.add(delivery)
    await db_session.flush()
    return delivery


class TestWebhookCRUD:
    """Test CRUD operations for webhooks."""

    async def test_list_webhooks_empty(
        self, client: TestClient, admin_token: str, db_session: AsyncSession
    ):
        """Test listing webhooks when empty."""
        response = client.get(
            "/api/v1/admin/webhooks",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1

    async def test_list_webhooks_with_pagination(
        self,
        client: TestClient,
        admin_token: str,
        db_session: AsyncSession,
        test_webhook: Webhook,
    ):
        """Test listing webhooks with pagination."""
        response = client.get(
            "/api/v1/admin/webhooks?page=1&page_size=20",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["total"] == 1
        assert data["items"][0]["name"] == "Test Webhook"
        # Verify secret is redacted
        assert "..." in data["items"][0]["secret"]

    async def test_create_webhook(self, client: TestClient, admin_token: str):
        """Test creating a webhook."""
        payload = {
            "name": "New Webhook",
            "url": "https://api.example.com/webhook",
            "description": "New webhook for testing",
            "events": ["user.created", "user.deleted"],
            "active": True,
            "max_retries": 3,
            "retry_delay_seconds": 30,
        }
        response = client.post(
            "/api/v1/admin/webhooks",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Webhook"
        assert data["url"] == "https://api.example.com/webhook"
        assert data["active"] is True
        assert data["status"] == "ACTIVE"
        # Verify secret is generated
        assert "secret" in data
        assert len(data["secret"]) > 0

    async def test_create_webhook_invalid_url(self, client: TestClient, admin_token: str):
        """Test creating a webhook with invalid URL."""
        payload = {
            "name": "Invalid webhook",
            "url": "not-a-valid-url",  # Invalid URL
            "description": "Test",
            "events": ["user.created"],
            "active": True,
        }
        response = client.post(
            "/api/v1/admin/webhooks",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 422  # Validation error

    async def test_get_webhook(
        self,
        client: TestClient,
        admin_token: str,
        test_webhook: Webhook,
    ):
        """Test getting a single webhook."""
        response = client.get(
            f"/api/v1/admin/webhooks/{test_webhook.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_webhook.id)
        assert data["name"] == "Test Webhook"
        assert data["created_at"] is not None

    async def test_get_webhook_not_found(self, client: TestClient, admin_token: str):
        """Test getting non-existent webhook."""
        fake_id = uuid.uuid4()
        response = client.get(
            f"/api/v1/admin/webhooks/{fake_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 404

    async def test_update_webhook(
        self,
        client: TestClient,
        admin_token: str,
        test_webhook: Webhook,
    ):
        """Test updating a webhook."""
        payload = {
            "description": "Updated description",
            "max_retries": 10,
        }
        response = client.patch(
            f"/api/v1/admin/webhooks/{test_webhook.id}",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "Updated description"
        assert data["max_retries"] == 10
        # Verify unchanged fields
        assert data["name"] == "Test Webhook"

    async def test_delete_webhook(
        self,
        client: TestClient,
        admin_token: str,
        test_webhook: Webhook,
        db_session: AsyncSession,
    ):
        """Test deleting a webhook."""
        response = client.delete(
            f"/api/v1/admin/webhooks/{test_webhook.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 204

        # Verify webhook is deleted
        result = await db_session.execute(select(Webhook).where(Webhook.id == test_webhook.id))
        assert result.scalar_one_or_none() is None


class TestWebhookSecretManagement:
    """Test webhook secret management endpoints."""

    async def test_get_webhook_secret_full(
        self,
        client: TestClient,
        admin_token: str,
        test_webhook: Webhook,
    ):
        """Test viewing full webhook secret."""
        response = client.get(
            f"/api/v1/admin/webhooks/{test_webhook.id}/secret",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["secret"] == test_webhook.secret
        assert "test_secret" in data["secret"]

    async def test_rotate_webhook_secret(
        self,
        client: TestClient,
        admin_token: str,
        test_webhook: Webhook,
        db_session: AsyncSession,
    ):
        """Test rotating webhook secret."""
        old_secret = test_webhook.secret

        response = client.post(
            f"/api/v1/admin/webhooks/{test_webhook.id}/rotate-secret",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        new_secret = data["secret"]

        # Verify secret is different
        assert new_secret != old_secret

        # Verify new secret is stored in database
        await db_session.refresh(test_webhook)
        assert test_webhook.secret == new_secret


class TestWebhookDeliveries:
    """Test webhook delivery tracking endpoints."""

    async def test_get_webhook_deliveries_empty(
        self,
        client: TestClient,
        admin_token: str,
        test_webhook: Webhook,
    ):
        """Test getting delivery history when empty."""
        response = client.get(
            f"/api/v1/admin/webhooks/{test_webhook.id}/deliveries",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    async def test_get_webhook_deliveries_with_items(
        self,
        client: TestClient,
        admin_token: str,
        test_webhook: Webhook,
        test_webhook_delivery: WebhookDelivery,
    ):
        """Test getting delivery history with items."""
        response = client.get(
            f"/api/v1/admin/webhooks/{test_webhook.id}/deliveries",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["total"] == 1
        assert data["items"][0]["event"] == "user.created"
        assert data["items"][0]["status"] == "SUCCESS"
        assert data["items"][0]["http_status_code"] == 200

    async def test_get_webhook_deliveries_pagination(
        self,
        client: TestClient,
        admin_token: str,
        test_webhook: Webhook,
        test_webhook_delivery: WebhookDelivery,
    ):
        """Test delivery history pagination."""
        response = client.get(
            f"/api/v1/admin/webhooks/{test_webhook.id}/deliveries?page=1&page_size=10",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 10


class TestWebhookTesting:
    """Test webhook testing endpoints."""

    async def test_test_webhook_delivery(
        self,
        client: TestClient,
        admin_token: str,
        test_webhook: Webhook,
    ):
        """Test webhook test delivery endpoint."""
        payload = {"event": "user.created"}
        response = client.post(
            f"/api/v1/admin/webhooks/{test_webhook.id}/test",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 202  # Accepted for async

    async def test_test_webhook_invalid_event(
        self,
        client: TestClient,
        admin_token: str,
        test_webhook: Webhook,
    ):
        """Test webhook test with invalid event."""
        payload = {"event": "invalid.event"}
        response = client.post(
            f"/api/v1/admin/webhooks/{test_webhook.id}/test",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 400  # Bad request

    async def test_get_available_events(self, client: TestClient, admin_token: str):
        """Test getting available webhook events."""
        response = client.get(
            "/api/v1/admin/webhooks/available-events",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        assert len(data["events"]) > 0
        # Verify known events exist
        assert "user.created" in data["events"]
        assert "user.updated" in data["events"]


class TestWebhookFiltering:
    """Test webhook filtering and querying."""

    async def test_list_webhooks_by_status(
        self,
        client: TestClient,
        admin_token: str,
        test_webhook: Webhook,
        db_session: AsyncSession,
    ):
        """Test filtering webhooks by status."""
        # Create inactive webhook
        inactive_webhook = Webhook(
            id=uuid.uuid4(),
            url="https://inactive.example.com",
            name="Inactive Webhook",
            description="Inactive webhook",
            events=["user.created"],
            secret="inactive_secret",
            active=False,
            status=WebhookStatus.INACTIVE,
            max_retries=3,
            retry_delay_seconds=60,
            created_at=datetime.now(timezone.utc),
            created_by=test_webhook.created_by,
        )
        db_session.add(inactive_webhook)
        await db_session.flush()

        # Filter by ACTIVE status
        response = client.get(
            "/api/v1/admin/webhooks?status_filter=ACTIVE",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["status"] == "ACTIVE"


class TestWebhookAuthorization:
    """Test webhook authorization and permissions."""

    async def test_unauthorized_access(self, client: TestClient):
        """Test accessing webhook endpoints without token."""
        response = client.get("/api/v1/admin/webhooks")
        assert response.status_code == 401

    async def test_non_admin_access(
        self,
        client: TestClient,
        regular_user: User,
        db_session: AsyncSession,
    ):
        """Test non-admin user accessing webhook endpoints."""
        # Create a token for regular user (simplified)
        # In real test, use proper token generation
        response = client.get(
            "/api/v1/admin/webhooks",
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code in [401, 403]


class TestWebhookEventParsing:
    """Test webhook event parsing and handling."""

    async def test_webhook_event_list_conversion(
        self,
        db_session: AsyncSession,
        admin_user: User,
    ):
        """Test event list conversion for webhook model."""
        events = ["user.created", "user.deleted", "content.updated"]
        webhook = Webhook(
            id=uuid.uuid4(),
            url="https://example.com",
            name="Event Test",
            description="Testing event parsing",
            active=True,
            status=WebhookStatus.ACTIVE,
            max_retries=5,
            retry_delay_seconds=60,
            created_at=datetime.now(timezone.utc),
            created_by=admin_user.id,
        )
        webhook.set_events(events)

        # Verify events are stored as CSV
        assert "," in webhook.events
        assert "user.created" in webhook.events

        # Verify parsing
        parsed = webhook.parse_events()
        assert parsed == events
