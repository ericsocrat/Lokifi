"""
AI thread and conversation models for chatbot interactions.
"""

import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy import Enum as SqlEnum
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class AiProvider(str, Enum):
    """AI provider types."""

    OPENROUTER = "openrouter"
    HUGGING_FACE = "hugging_face"
    OLLAMA = "ollama"


class MessageRole(str, Enum):
    """Message roles in AI conversation."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class AiThread(Base):
    """AI conversation thread model."""

    __tablename__ = "ai_threads"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign keys
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )

    # Thread metadata
    title: Mapped[str] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # AI configuration
    ai_provider: Mapped[AiProvider] = mapped_column(
        SqlEnum(AiProvider), default=AiProvider.OPENROUTER
    )
    model_name: Mapped[str] = mapped_column(String(100))
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Configuration parameters
    max_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    temperature: Mapped[float | None] = mapped_column(nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user = relationship("User", back_populates="ai_threads")
    messages = relationship("AiMessage", back_populates="thread", order_by="AiMessage.created_at")

    def __repr__(self) -> str:
        return f"<AiThread(id={self.id}, title='{self.title}', provider={self.ai_provider})>"


class AiMessage(Base):
    """AI conversation message model."""

    __tablename__ = "ai_messages"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign keys
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_threads.id", ondelete="CASCADE")
    )

    # Message content
    role: Mapped[MessageRole] = mapped_column(SqlEnum(MessageRole))
    content: Mapped[str] = mapped_column(Text)

    # Optional metadata
    extra_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Token usage tracking
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    thread = relationship("AiThread", back_populates="messages")

    def __repr__(self) -> str:
        return f"<AiMessage(id={self.id}, role={self.role}, content='{self.content[:50]}...')>"


class AiUsage(Base):
    """AI usage tracking model."""

    __tablename__ = "ai_usage"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign keys
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_threads.id", ondelete="CASCADE")
    )

    # Provider and model info
    ai_provider: Mapped[AiProvider] = mapped_column(SqlEnum(AiProvider))
    model_name: Mapped[str] = mapped_column(String(100))

    # Token usage
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)

    # Cost tracking (in USD cents)
    cost_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User")
    thread = relationship("AiThread")

    def __repr__(self) -> str:
        return f"<AiUsage(id={self.id}, user_id={self.user_id}, provider={self.ai_provider}, model={self.model_name})>"
