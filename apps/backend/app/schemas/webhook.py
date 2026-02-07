"""Pydantic schemas for Webhook API."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl

from app.models.webhook import WebhookEvent, WebhookStatus
from app.models.webhook_delivery import DeliveryStatus


class WebhookBase(BaseModel):
    """Base webhook schema."""

    name: str = Field(..., min_length=1, max_length=255, description="Webhook name")
    url: HttpUrl = Field(..., description="URL to send webhook requests to")
    description: str | None = Field(None, max_length=1000, description="Webhook description")
    events: list[str] = Field(..., description="List of events to subscribe to")
    active: bool = Field(True, description="Whether webhook is active")
    max_retries: int = Field(5, ge=0, le=10, description="Maximum retry attempts")
    retry_delay_seconds: int = Field(
        60, ge=10, le=3600, description="Delay between retries in seconds"
    )


class WebhookCreate(WebhookBase):
    """Schema for creating a webhook."""

    pass


class WebhookUpdate(BaseModel):
    """Schema for updating a webhook."""

    name: str | None = Field(None, min_length=1, max_length=255)
    url: HttpUrl | None = None
    description: str | None = Field(None, max_length=1000)
    events: list[str] | None = None
    active: bool | None = None
    max_retries: int | None = Field(None, ge=0, le=10)
    retry_delay_seconds: int | None = Field(None, ge=10, le=3600)


class WebhookResponse(WebhookBase):
    """Schema for webhook responses."""

    id: str = Field(..., description="Webhook ID")
    status: WebhookStatus
    secret: str = Field(..., description="HMAC signing secret (last 8 chars only for security)")
    created_at: datetime
    updated_at: datetime
    last_triggered_at: datetime | None = None
    successful_deliveries: int
    failed_deliveries: int

    model_config = {"from_attributes": True}

    def redact_secret(self) -> None:
        """Redact secret to show only last 8 characters."""
        if len(self.secret) > 8:
            self.secret = "..." + self.secret[-8:]


class WebhookListResponse(BaseModel):
    """Paginated webhook list."""

    total: int
    page: int
    page_size: int
    webhooks: list[WebhookResponse]


class WebhookTestPayload(BaseModel):
    """Payload for testing webhook delivery."""

    event: str = Field(..., description="Event type to test with")


class DeliveryStatusResponse(BaseModel):
    """Webhook delivery status."""

    id: str
    webhook_id: str
    event: str
    status: DeliveryStatus
    http_status_code: int | None = None
    attempt: int
    created_at: datetime
    delivered_at: datetime | None = None

    model_config = {"from_attributes": True}


class DeliveryListResponse(BaseModel):
    """Paginated delivery list."""

    total: int
    page: int
    page_size: int
    deliveries: list[DeliveryStatusResponse]


class WebhookSecretResponse(BaseModel):
    """Response for getting webhook signing secret."""

    secret: str = Field(..., description="Full HMAC-SHA256 signing secret")
    webhook_id: str


class WebhookEventList(BaseModel):
    """List of available webhook events."""

    events: list[str] = [
        # User events
        WebhookEvent.USER_CREATED,
        WebhookEvent.USER_UPDATED,
        WebhookEvent.USER_DELETED,
        WebhookEvent.USER_LOGIN,
        # Content events
        WebhookEvent.CONTENT_CREATED,
        WebhookEvent.CONTENT_UPDATED,
        WebhookEvent.CONTENT_DELETED,
        # Admin events
        WebhookEvent.ADMIN_ACTION,
        WebhookEvent.SETTINGS_CHANGED,
        # System events
        WebhookEvent.SYSTEM_HEALTH,
        WebhookEvent.SYSTEM_ERROR,
    ]
