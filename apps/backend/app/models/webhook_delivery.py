"""WebhookDelivery model for tracking webhook delivery attempts."""

import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.webhook import Webhook


class DeliveryStatus(enum.StrEnum):
    """Webhook delivery status."""

    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"


class WebhookDelivery(Base):
    """Record of a webhook delivery attempt."""

    __tablename__ = "webhook_deliveries"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Foreign key
    webhook_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("webhooks.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Event details
    event: Mapped[str] = mapped_column(String(255), nullable=False)
    payload: Mapped[str] = mapped_column(
        Text, nullable=False, comment="JSON payload sent"
    )

    # Delivery tracking
    status: Mapped[DeliveryStatus] = mapped_column(
        Enum(DeliveryStatus), default=DeliveryStatus.PENDING, nullable=False
    )
    http_status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    response_body: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Response from endpoint"
    )

    # Retry tracking
    attempt: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    next_retry_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Timing
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationship
    webhook: Mapped["Webhook"] = relationship("Webhook", back_populates="deliveries")

    # Indexes for performance
    __table_args__ = (
        Index("idx_webhook_deliveries_webhook_id", "webhook_id"),
        Index("idx_webhook_deliveries_status", "status"),
        Index("idx_webhook_deliveries_event", "event"),
        Index("idx_webhook_deliveries_created_at", "created_at"),
        Index("idx_webhook_deliveries_next_retry", "next_retry_at"),
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<WebhookDelivery(webhook_id={self.webhook_id}, event={self.event}, status={self.status})>"
