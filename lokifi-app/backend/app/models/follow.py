"""
Follow model for user follow relationships.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Follow(Base):
    """Follow relationship model."""
    
    __tablename__ = "follows"
    
    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Foreign keys
    follower_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE")
    )
    followee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE")
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    
    # Relationships
    follower = relationship(
        "User", 
        foreign_keys=[follower_id], 
        back_populates="following"
    )
    followee = relationship(
        "User", 
        foreign_keys=[followee_id], 
        back_populates="followers"
    )
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('follower_id', 'followee_id', name='unique_follow'),
    )
    
    def __repr__(self) -> str:
        return f"<Follow(id={self.id}, follower_id={self.follower_id}, followee_id={self.followee_id})>"