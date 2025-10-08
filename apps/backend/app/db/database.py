"""
Database configuration and connection management.
"""

import os
import sys
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import NullPool

# Import Base from core database for consistency
try:
    from app.core.database import Base
except ImportError:
    # Fallback if core database doesn't exist
    Base = declarative_base()

# Default to PostgreSQL (Docker container setup)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://lokifi:lokifi_dev_password@localhost:5432/lokifi_db")

# Create async engine
USE_NULL_POOL = (
    os.getenv("SQL_DISABLE_POOL", "").lower() in {"1", "true", "yes"}
    or "pytest" in sys.modules  # running inside pytest test process
)

engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",
    poolclass=NullPool if ("sqlite" in DATABASE_URL or USE_NULL_POOL) else None,
    future=True,
)

# Create async session maker
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Create declarative base - use the one from core database
# Base = declarative_base()  # Commented out - using app.core.database.Base


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an AsyncSession with proper rollback/close semantics."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Alias dependency maintained for backward compatibility."""
    async for sess in get_db():
        yield sess
