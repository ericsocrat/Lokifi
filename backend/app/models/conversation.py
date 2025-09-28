"""
Conversation and message models for direct messaging (J4).
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, ForeignKey, String, Text, func, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

import uuid


class ContentType(str, Enum):
    """Message content types."""
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    SYSTEM = "system"


class Conversation(Base):
    """Conversation model for direct messages."""
    
    __tablename__ = "conversations"
    
    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Conversation type (always false for 1:1 DMs in this implementation)
    is_group: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    
    # Optional group fields (for future use)
    name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Last message tracking
    last_message_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        nullable=True,
        index=True
    )
    
    # Timestamps  
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )
    
    # Relationships
    participants = relationship("ConversationParticipant", back_populates="conversation")
    messages = relationship("Message", back_populates="conversation", order_by="Message.created_at")
    
    def __repr__(self) -> str:
        return f"<Conversation(id={self.id}, is_group={self.is_group})>"


class ConversationParticipant(Base):
    """Conversation participant model."""
    
    __tablename__ = "conversation_participants"
    
    # Composite primary key (remove id field for efficiency)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("conversations.id", ondelete="CASCADE"),
        primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )
    
    # Read tracking
    last_read_message_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("messages.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # Participant metadata
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="participants")
    user = relationship("User", back_populates="conversations")
    last_read_message = relationship("Message", foreign_keys=[last_read_message_id])
    
    # Indexes for performance
    __table_args__ = (
        Index("idx_conversation_participants_user", "user_id"),
        Index("idx_conversation_participants_active", "user_id", "is_active"),
    )
    
    def __repr__(self) -> str:
        return f"<ConversationParticipant(conversation_id={self.conversation_id}, user_id={self.user_id})>"


class Message(Base):
    """Message model."""
    
    __tablename__ = "messages"
    
    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Foreign keys
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("conversations.id", ondelete="CASCADE"),
        index=True
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True
    )
    
    # Message content
    content: Mapped[str] = mapped_column(Text)
    content_type: Mapped[ContentType] = mapped_column(
        SqlEnum(ContentType), 
        default=ContentType.TEXT,
        index=True
    )
    
    # Message metadata
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receipts = relationship("MessageReceipt", back_populates="message")
    
    # Indexes for performance
    __table_args__ = (
        Index("idx_messages_conversation_created", "conversation_id", "created_at"),
        Index("idx_messages_sender_created", "sender_id", "created_at"),
    )
    
    def __repr__(self) -> str:
        return f"<Message(id={self.id}, sender_id={self.sender_id}, content='{self.content[:50]}...')>"


class MessageReceipt(Base):
    """Message receipt model for read tracking."""
    
    __tablename__ = "message_receipts"
    
    # Composite primary key (remove id field for efficiency)
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("messages.id", ondelete="CASCADE"),
        primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )
    
    # Receipt timestamp
    read_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    
    # Relationships
    message = relationship("Message", back_populates="receipts")
    user = relationship("User")
    
    # Indexes for performance
    __table_args__ = (
        Index("idx_message_receipts_message", "message_id"),
        Index("idx_message_receipts_user", "user_id"),
    )
    
    def __repr__(self) -> str:
        return f"<MessageReceipt(message_id={self.message_id}, user_id={self.user_id})>"