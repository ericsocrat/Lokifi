# Enhanced database configuration with connection pooling and read replicas
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import StaticPool, QueuePool
from sqlalchemy import event
from app.core.config import Settings
import logging
import asyncio
from typing import AsyncGenerator, Optional
import re

logger = logging.getLogger(__name__)

# Database base
Base = declarative_base()

class DatabaseManager:
    """Enhanced database manager with connection pooling and read replica support"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.primary_engine = None
        self.replica_engine = None
        self.primary_session_factory = None
        self.replica_session_factory = None
        self._initialized = False
    
    def _is_sqlite(self, database_url: str) -> bool:
        """Check if database URL is SQLite"""
        return database_url.startswith("sqlite")
    
    def _create_engine(self, database_url: str, is_replica: bool = False):
        """Create database engine with appropriate configuration"""
        if self._is_sqlite(database_url):
            # SQLite configuration
            return create_async_engine(
                database_url,
                poolclass=StaticPool,
                pool_pre_ping=True,
                pool_recycle=3600,
                echo=False,
                connect_args={
                    "check_same_thread": False,
                    "timeout": 30
                }
            )
        else:
            # PostgreSQL configuration
            pool_size = self.settings.DATABASE_POOL_SIZE
            max_overflow = self.settings.DATABASE_MAX_OVERFLOW
            
            # Reduce pool size for read replicas
            if is_replica:
                pool_size = max(2, pool_size // 2)
                max_overflow = max(5, max_overflow // 2)
            
            return create_async_engine(
                database_url,
                poolclass=QueuePool,
                pool_size=pool_size,
                max_overflow=max_overflow,
                pool_timeout=self.settings.DATABASE_POOL_TIMEOUT,
                pool_recycle=self.settings.DATABASE_POOL_RECYCLE,
                pool_pre_ping=True,
                echo=False,
                # PostgreSQL-specific optimizations
                connect_args={
                    "server_settings": {
                        "application_name": "fynix_backend",
                        "tcp_keepalives_idle": "600",
                        "tcp_keepalives_interval": "30",
                        "tcp_keepalives_count": "3",
                    }
                }
            )
    
    async def initialize(self):
        """Initialize database connections"""
        if self._initialized:
            return
        
        try:
            # Primary database (read/write)
            self.primary_engine = self._create_engine(self.settings.DATABASE_URL)
            self.primary_session_factory = async_sessionmaker(
                self.primary_engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            # Read replica (if configured)
            if self.settings.DATABASE_REPLICA_URL:
                logger.info("Setting up read replica connection")
                self.replica_engine = self._create_engine(
                    self.settings.DATABASE_REPLICA_URL, 
                    is_replica=True
                )
                self.replica_session_factory = async_sessionmaker(
                    self.replica_engine,
                    class_=AsyncSession,
                    expire_on_commit=False
                )
            
            # Test connections
            await self._test_connections()
            
            self._initialized = True
            logger.info("Database manager initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    async def _test_connections(self):
        """Test database connections"""
        from sqlalchemy import text
        
        # Test primary connection
        try:
            async with self.primary_engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("✅ Primary database connection successful")
        except Exception as e:
            logger.error(f"❌ Primary database connection failed: {e}")
            raise
        
        # Test replica connection (if configured)
        if self.replica_engine:
            try:
                async with self.replica_engine.begin() as conn:
                    await conn.execute(text("SELECT 1"))
                logger.info("✅ Replica database connection successful")
            except Exception as e:
                logger.warning(f"⚠️ Replica database connection failed: {e}")
                # Don't raise for replica failures - fall back to primary
    
    async def get_session(self, read_only: bool = False) -> AsyncGenerator[AsyncSession, None]:
        """Get database session - uses replica for read-only queries when available"""
        if not self._initialized:
            await self.initialize()
        
        # Use replica for read-only queries when available
        if read_only and self.replica_session_factory:
            session_factory = self.replica_session_factory
        else:
            session_factory = self.primary_session_factory
        
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    
    async def get_primary_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get primary database session (always read/write)"""
        async for session in self.get_session(read_only=False):
            yield session
    
    async def get_replica_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get replica database session (read-only)"""
        async for session in self.get_session(read_only=True):
            yield session
    
    async def close(self):
        """Close all database connections"""
        if self.primary_engine:
            await self.primary_engine.dispose()
        
        if self.replica_engine:
            await self.replica_engine.dispose()
        
        logger.info("Database connections closed")
    
    def get_database_info(self) -> dict:
        """Get database configuration info"""
        db_type = "SQLite" if self._is_sqlite(self.settings.DATABASE_URL) else "PostgreSQL"
        
        return {
            "database_type": db_type,
            "primary_url": self._sanitize_url(self.settings.DATABASE_URL),
            "replica_configured": bool(self.settings.DATABASE_REPLICA_URL),
            "replica_url": self._sanitize_url(self.settings.DATABASE_REPLICA_URL) if self.settings.DATABASE_REPLICA_URL else None,
            "pool_size": self.settings.DATABASE_POOL_SIZE,
            "max_overflow": self.settings.DATABASE_MAX_OVERFLOW,
            "pool_timeout": self.settings.DATABASE_POOL_TIMEOUT,
            "pool_recycle": self.settings.DATABASE_POOL_RECYCLE,
        }
    
    def _sanitize_url(self, url: str) -> str:
        """Remove sensitive info from database URL for logging"""
        if not url:
            return "None"
        return re.sub(r'://([^:]+):([^@]+)@', r'://\1:***@', url)

# Global database manager instance
settings = Settings()
db_manager = DatabaseManager(settings)

# Dependency for FastAPI
async def get_db_session(read_only: bool = False) -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for database sessions"""
    async for session in db_manager.get_session(read_only=read_only):
        yield session

async def get_db_primary() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for primary database session"""
    async for session in db_manager.get_primary_session():
        yield session

async def get_db_replica() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for replica database session"""  
    async for session in db_manager.get_replica_session():
        yield session

# Legacy compatibility
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Legacy database dependency"""
    async for session in get_db_session():
        yield session