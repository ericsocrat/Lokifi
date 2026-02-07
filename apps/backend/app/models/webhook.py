"""Webhook model for integrations and external system notifications."""

import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.webhook_delivery import WebhookDelivery


class WebhookEvent(enum.StrEnum):
    """Webhook event types."""

    # User events
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_DELETED = "user.deleted"
    USER_LOGIN = "user.login"
    USER_VERIFIED = "user.verified"

    # Content/Post events
    CONTENT_CREATED = "content.created"
    CONTENT_UPDATED = "content.updated"
    CONTENT_DELETED = "content.deleted"
    POST_CREATED = "post.created"
    POST_UPDATED = "post.updated"
    POST_DELETED = "post.deleted"

    # Social events
    FOLLOW_CREATED = "follow.created"
    FOLLOW_DELETED = "follow.deleted"
    CONVERSATION_STARTED = "conversation.started"
    CONVERSATION_MESSAGE = "conversation.message"

    # Admin events
    ADMIN_ACTION = "admin.action"
    SETTINGS_CHANGED = "settings.changed"

    # System events
    SYSTEM_HEALTH = "system.health"
    SYSTEM_ERROR = "system.error"
    SYSTEM_EVENT = "system.event"


class WebhookStatus(enum.StrEnum):
    """Webhook activation status."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    FAILED = "failed"


class Webhook(Base):
    """Webhook configuration for external integrations."""

    __tablename__ = "webhooks"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # URL and configuration
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Event filtering
    events: Mapped[list[str]] = mapped_column(
        String(1000),
        nullable=False,
        comment="Comma-separated list of events to listen for",
    )

    # Security
    secret: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="HMAC-SHA256 signing key"
    )
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[WebhookStatus] = mapped_column(
        Enum(WebhookStatus), default=WebhookStatus.ACTIVE, nullable=False
    )

    # Retry configuration
    max_retries: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    retry_delay_seconds: Mapped[int] = mapped_column(
        Integer, default=60, nullable=False
    )

    # Tracking
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_triggered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Delivery stats
    successful_deliveries: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    failed_deliveries: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    deliveries: Mapped[list["WebhookDelivery"]] = relationship(
        "WebhookDelivery",
        back_populates="webhook",
        cascade="all, delete-orphan",
        lazy="select",
    )

    # Indexes for performance
    __table_args__ = (
        Index("idx_webhooks_active", "active"),
        Index("idx_webhooks_status", "status"),
        Index("idx_webhooks_created_at", "created_at"),
        Index("idx_webhooks_last_triggered", "last_triggered_at"),
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<Webhook(id={self.id}, url={self.url}, status={self.status})>"

    def parse_events(self) -> list[str]:
        """Parse comma-separated events string into list."""
        return [e.strip() for e in self.events.split(",") if e.strip()]

    def get_events(self) -> list[str]:
        """Get parsed events list. Alias for parse_events."""
        return self.parse_events()

    def set_events(self, events: list[str]) -> None:
        """Set events from list and convert to comma-separated string."""
        self.events = ",".join(events)
