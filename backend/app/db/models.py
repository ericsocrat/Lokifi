from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    handle: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    # NEW: auth field
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    bio: Mapped[str | None] = mapped_column(String(280), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    posts: Mapped[list[Post]] = relationship(back_populates="user", cascade="all, delete-orphan")
    following: Mapped[list[Follow]] = relationship(
        foreign_keys="Follow.follower_id",
        cascade="all, delete-orphan",
        back_populates="follower"
    )
    followers: Mapped[list[Follow]] = relationship(
        foreign_keys="Follow.followee_id",
        cascade="all, delete-orphan",
        back_populates="followee"
    )
    positions: Mapped[list[PortfolioPosition]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan"
    )
    ai_threads: Mapped[list[AIThread]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan"
    )

class Follow(Base):
    __tablename__ = "follows"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    follower_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    followee_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    follower: Mapped[User] = relationship(foreign_keys=[follower_id], back_populates="following")
    followee: Mapped[User] = relationship(foreign_keys=[followee_id], back_populates="followers")

    __table_args__ = (UniqueConstraint("follower_id", "followee_id", name="uq_follow_pair"),)

class Post(Base):
    __tablename__ = "posts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content: Mapped[str] = mapped_column(Text)
    symbol: Mapped[str | None] = mapped_column(String(24), index=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, index=True)

    user: Mapped[User] = relationship(back_populates="posts")

Index("ix_posts_symbol_created", Post.symbol, Post.created_at.desc())

class PortfolioPosition(Base):
    __tablename__ = "portfolio_positions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    symbol: Mapped[str] = mapped_column(String(48), index=True)
    qty: Mapped[float] = mapped_column(Float)
    cost_basis: Mapped[float] = mapped_column(Float)
    tags: Mapped[str | None] = mapped_column(String(256), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    user: Mapped[User] = relationship(back_populates="positions")

    __table_args__ = (Index("ix_user_symbol_unique", "user_id", "symbol", unique=True),)


class AIThread(Base):
    """AI conversation thread model."""
    
    __tablename__ = "ai_threads"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Relationships
    user: Mapped[User] = relationship(back_populates="ai_threads")
    messages: Mapped[list[AIMessage]] = relationship(back_populates="thread", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<AIThread(id={self.id}, user_id={self.user_id}, title='{self.title[:30]}...')>"


class AIMessage(Base):
    """AI message model for storing individual messages in conversations."""
    
    __tablename__ = "ai_messages"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("ai_threads.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20), index=True)  # 'user' or 'assistant'
    content: Mapped[str] = mapped_column(Text)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)  # AI model used (for assistant messages)
    provider: Mapped[str | None] = mapped_column(String(50), nullable=True)  # AI provider used
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Number of tokens in response
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)  # When AI finished generating
    error: Mapped[str | None] = mapped_column(Text, nullable=True)  # Error message if generation failed
    
    # Relationships
    thread: Mapped[AIThread] = relationship(back_populates="messages")
    
    def __repr__(self):
        return f"<AIMessage(id={self.id}, thread_id={self.thread_id}, role='{self.role}', content='{self.content[:50]}...')>"
    
    @property
    def is_complete(self) -> bool:
        """Check if the message generation is complete."""
        return self.completed_at is not None or self.error is not None
    
    @property
    def duration_seconds(self) -> float:
        """Get generation duration in seconds."""
        if self.completed_at is not None and self.created_at is not None:
            return (self.completed_at - self.created_at).total_seconds()
        return 0.0
