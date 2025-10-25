"""
Message reactions system for J4 Direct Messages.
"""

import uuid
from datetime import UTC, datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class ReactionType(str, Enum):
    """Available reaction types."""

    LIKE = "like"
    LOVE = "love"
    LAUGH = "laugh"
    WOW = "wow"
    SAD = "sad"
    ANGRY = "angry"
    THUMBS_UP = "thumbs_up"
    THUMBS_DOWN = "thumbs_down"


class MessageReaction(Base):
    """Message reaction model."""

    __tablename__ = "message_reactions"

    # Composite primary key
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), primary_key=True
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )

    reaction_type: Mapped[ReactionType] = mapped_column(String(20), primary_key=True, index=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )

    # Relationships
    message = relationship("Message", back_populates="reactions")
    user = relationship("User")

    # Constraints
    __table_args__ = (
        # User can only have one reaction type per message
        UniqueConstraint("message_id", "user_id", name="unique_user_message_reaction"),
    )
