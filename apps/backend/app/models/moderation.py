"""
Content moderation models for flagged content and moderation actions.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class ContentType(StrEnum):
    """Types of content that can be flagged."""

    POST = "post"
    COMMENT = "comment"
    PROFILE = "profile"
    MESSAGE = "message"
    CONVERSATION = "conversation"
    OTHER = "other"


class FlagReason(StrEnum):
    """Reasons for flagging content."""

    SPAM = "spam"
    HARASSMENT = "harassment"
    HATE_SPEECH = "hate_speech"
    VIOLENCE = "violence"
    SEXUAL_CONTENT = "sexual_content"
    MISLEADING = "misleading"
    SCAM = "scam"
    INTELLECTUAL_PROPERTY = "intellectual_property"
    SELF_HARM = "self_harm"
    OTHER = "other"


class FlagStatus(StrEnum):
    """Status of a flagged content report."""

    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"
    APPEALED = "appealed"


class ModerationAction(StrEnum):
    """Types of moderation actions."""

    NO_ACTION = "no_action"
    WARNING = "warning"
    HIDE_CONTENT = "hide_content"
    REMOVE_CONTENT = "remove_content"
    SUSPEND_TEMPORARY = "suspend_temporary"
    SUSPEND_PERMANENT = "suspend_permanent"
    BAN = "ban"


class AppealStatus(StrEnum):
    """Status of a content moderation appeal."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class FlaggedContent(Base):
    """
    Model for flagged content reports.
    Tracks user-reported content that violates community guidelines.
    """

    __tablename__ = "flagged_content"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Reporter information
    reporter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    reporter: Mapped[User] = relationship(
        "User",
        foreign_keys=[reporter_id],
        lazy="joined",
    )

    # Content information
    content_type: Mapped[ContentType] = mapped_column(
        SQLEnum(ContentType), nullable=False, index=True
    )
    content_id: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )  # ID of flagged post, comment, etc.

    # Target user (if applicable)
    target_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    target_user: Mapped[User | None] = relationship(
        "User",
        foreign_keys=[target_user_id],
        lazy="joined",
    )

    # Flag details
    reason: Mapped[FlagReason] = mapped_column(
        SQLEnum(FlagReason), nullable=False, index=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Status tracking
    status: Mapped[FlagStatus] = mapped_column(
        SQLEnum(FlagStatus), default=FlagStatus.PENDING, index=True
    )

    # Moderation details
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    moderation_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        index=True,
    )

    # Index for common queries
    __table_args__ = (
        Index("ix_flagged_content_status_created", "status", "created_at"),
        Index("ix_flagged_content_content_type_id", "content_type", "content_id"),
        Index("ix_flagged_content_reporter_created", "reporter_id", "created_at"),
    )


class ModerationDecision(Base):
    """
    Model for moderation decisions on flagged content.
    Tracks what action was taken and when.
    """

    __tablename__ = "moderation_decisions"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Reference to flagged content
    flagged_content_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("flagged_content.id"), nullable=False, index=True
    )
    flagged_content: Mapped[FlaggedContent] = relationship(
        "FlaggedContent",
        foreign_keys=[flagged_content_id],
        lazy="joined",
    )

    # Decision maker
    decided_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    decided_by_user: Mapped[User] = relationship(
        "User",
        foreign_keys=[decided_by],
        lazy="joined",
    )

    # Decision details
    action: Mapped[ModerationAction] = mapped_column(
        SQLEnum(ModerationAction), nullable=False, index=True
    )
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Enforcement details
    suspension_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_appealable: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    # Index for common queries
    __table_args__ = (
        Index("ix_moderation_decisions_action_created", "action", "created_at"),
    )


class ModerationAppeal(Base):
    """
    Model for appeals of moderation decisions.
    Allows users to appeal content removal or account suspension decisions.
    """

    __tablename__ = "moderation_appeals"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Reference to moderation decision
    decision_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("moderation_decisions.id"),
        nullable=False,
        index=True,
    )
    decision: Mapped[ModerationDecision] = relationship(
        "ModerationDecision",
        foreign_keys=[decision_id],
        lazy="joined",
    )

    # Appellant information
    appellant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    appellant: Mapped[User] = relationship(
        "User",
        foreign_keys=[appellant_id],
        lazy="joined",
    )

    # Appeal details
    reason: Mapped[str] = mapped_column(Text, nullable=False)

    # Appeal status
    status: Mapped[AppealStatus] = mapped_column(
        SQLEnum(AppealStatus), default=AppealStatus.PENDING, index=True
    )

    # Appeal review
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        index=True,
    )

    # Index for common queries
    __table_args__ = (
        Index("ix_moderation_appeals_status_created", "status", "created_at"),
    )
