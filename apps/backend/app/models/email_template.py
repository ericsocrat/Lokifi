"""Email template model for storing reusable email templates."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from app.db.database import Base
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

if TYPE_CHECKING:
    from app.models.user import User


class EmailTemplate(Base):
    """Email template for reusable email messaging.

    Supports dynamic variable substitution (e.g., {{user_name}}, {{reset_link}})
    Tracks template metadata (category, enabled status, usage)
    """

    __tablename__ = "email_templates"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # Template metadata
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    # Template content
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    html_body: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Variables and configuration
    variables: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    # Version tracking
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Audit fields
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    creator: Mapped[User | None] = relationship("User", lazy="joined")

    # Indexes for performance
    __table_args__ = (
        Index("ix_email_template_category_enabled", "category", "enabled"),
        Index("ix_email_template_created_at", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<EmailTemplate(id={self.id}, name={self.name!r}, category={self.category!r})>"
