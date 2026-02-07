"""API Key model for managing external API access."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.user import User


def generate_api_key() -> str:
    """Generate a secure random API key."""
    return f"lk_{secrets.token_urlsafe(32)}"


class APIKey(Base):
    """API Key model for external integrations.

    Attributes:
        id: Unique identifier (UUID)
        key_hash: Hashed API key (never store plain text)
        key_prefix: First 8 chars of key for identification (e.g., "lk_abc12")
        name: Human-readable name for the key
        description: Optional description of key purpose
        scopes: JSON array of permission scopes (e.g., ["read:users", "write:content"])
        rate_limit: Requests per minute limit (0 = unlimited)
        expires_at: Optional expiration datetime
        last_used_at: Last time key was used
        is_active: Whether key is currently enabled
        created_by: User ID who created this key
        created_at: Creation timestamp
        updated_at: Last update timestamp

    Relationships:
        creator: User who created this API key
    """

    __tablename__ = "api_keys"

    # Primary key
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)

    # Key data (security: never store plain text key)
    key_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    key_prefix: Mapped[str] = mapped_column(
        String(12), index=True
    )  # For user identification

    # Metadata
    name: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Permissions and limits
    scopes: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)
    rate_limit: Mapped[int] = mapped_column(Integer, default=60, index=True)  # RPM

    # Expiry and usage tracking
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    # Audit fields
    created_by: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    creator: Mapped[User | None] = relationship("User", lazy="joined")

    # Composite indexes for common queries
    __table_args__ = (
        Index("ix_api_keys_active_expires", "is_active", "expires_at"),
        Index("ix_api_keys_created_by_active", "created_by", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<APIKey(name={self.name}, prefix={self.key_prefix}, active={self.is_active})>"
