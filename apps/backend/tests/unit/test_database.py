"""
Comprehensive tests for app.core.database

Tests for DatabaseManager class and related database utilities:
- Database engine creation (SQLite vs PostgreSQL)
- Connection pooling configuration
- Read replica support
- Session management
- Database info retrieval
- URL sanitization

Session 136: Created comprehensive tests for database manager
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.config import Settings
from app.core.database import DatabaseManager, db_manager

# ============================================================================
# MOCK SETTINGS
# ============================================================================


@pytest.fixture
def sqlite_settings():
    """Settings for SQLite database."""
    settings = MagicMock(spec=Settings)
    settings.DATABASE_URL = "sqlite+aiosqlite:///./test.db"
    settings.DATABASE_REPLICA_URL = None
    settings.DATABASE_POOL_SIZE = 5
    settings.DATABASE_MAX_OVERFLOW = 10
    settings.DATABASE_POOL_TIMEOUT = 30
    settings.DATABASE_POOL_RECYCLE = 3600
    settings.DATABASE_SSL_REQUIRED = False
    return settings


@pytest.fixture
def postgres_settings():
    """Settings for PostgreSQL database."""
    settings = MagicMock(spec=Settings)
    settings.DATABASE_URL = "postgresql+asyncpg://user:pass@localhost:5432/testdb"
    settings.DATABASE_REPLICA_URL = None
    settings.DATABASE_POOL_SIZE = 10
    settings.DATABASE_MAX_OVERFLOW = 20
    settings.DATABASE_POOL_TIMEOUT = 30
    settings.DATABASE_POOL_RECYCLE = 3600
    settings.DATABASE_SSL_REQUIRED = False
    return settings


@pytest.fixture
def postgres_with_replica_settings():
    """Settings for PostgreSQL with read replica."""
    settings = MagicMock(spec=Settings)
    settings.DATABASE_URL = "postgresql+asyncpg://user:pass@primary:5432/testdb"
    settings.DATABASE_REPLICA_URL = "postgresql+asyncpg://user:pass@replica:5432/testdb"
    settings.DATABASE_POOL_SIZE = 10
    settings.DATABASE_MAX_OVERFLOW = 20
    settings.DATABASE_POOL_TIMEOUT = 30
    settings.DATABASE_POOL_RECYCLE = 3600
    settings.DATABASE_SSL_REQUIRED = False
    return settings


@pytest.fixture
def postgres_ssl_settings():
    """Settings for PostgreSQL with SSL required."""
    settings = MagicMock(spec=Settings)
    settings.DATABASE_URL = "postgresql+asyncpg://user:pass@prod:5432/db"
    settings.DATABASE_REPLICA_URL = None
    settings.DATABASE_POOL_SIZE = 10
    settings.DATABASE_MAX_OVERFLOW = 20
    settings.DATABASE_POOL_TIMEOUT = 30
    settings.DATABASE_POOL_RECYCLE = 3600
    settings.DATABASE_SSL_REQUIRED = True
    return settings


# ============================================================================
# DatabaseManager INITIALIZATION TESTS
# ============================================================================


class TestDatabaseManagerInit:
    """Test DatabaseManager initialization."""

    def test_init_with_settings(self, sqlite_settings):
        """Test manager initializes with settings."""
        manager = DatabaseManager(sqlite_settings)

        assert manager.settings == sqlite_settings
        assert manager.primary_engine is None
        assert manager.replica_engine is None
        assert manager.primary_session_factory is None
        assert manager.replica_session_factory is None
        assert manager._initialized is False

    def test_global_db_manager_exists(self):
        """Test that global db_manager instance exists."""
        assert db_manager is not None
        assert isinstance(db_manager, DatabaseManager)


# ============================================================================
# DATABASE TYPE DETECTION TESTS
# ============================================================================


class TestDatabaseTypeDetection:
    """Test database type detection."""

    def test_is_sqlite_true_for_sqlite_url(self, sqlite_settings):
        """Test SQLite detection for sqlite URLs."""
        manager = DatabaseManager(sqlite_settings)
        assert manager._is_sqlite("sqlite:///test.db") is True
        assert manager._is_sqlite("sqlite+aiosqlite:///test.db") is True

    def test_is_sqlite_false_for_postgres_url(self, postgres_settings):
        """Test SQLite detection returns False for PostgreSQL."""
        manager = DatabaseManager(postgres_settings)
        assert manager._is_sqlite("postgresql://localhost/db") is False
        assert manager._is_sqlite("postgresql+asyncpg://localhost/db") is False

    def test_is_sqlite_case_sensitivity(self, sqlite_settings):
        """Test that SQLite detection is case-sensitive to URL prefix."""
        manager = DatabaseManager(sqlite_settings)
        # SQLite URLs must start with 'sqlite'
        assert manager._is_sqlite("sqlite:///db") is True
        assert (
            manager._is_sqlite("SQLITE:///db") is False
        )  # Case matters for URL schemes


# ============================================================================
# ENGINE CREATION TESTS
# ============================================================================


class TestEngineCreation:
    """Test database engine creation."""

    @patch("app.core.database.create_async_engine")
    def test_create_sqlite_engine(self, mock_create_engine, sqlite_settings):
        """Test SQLite engine creation uses StaticPool."""
        manager = DatabaseManager(sqlite_settings)
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        engine = manager._create_engine(sqlite_settings.DATABASE_URL)

        mock_create_engine.assert_called_once()
        call_kwargs = mock_create_engine.call_args[1]
        # SQLite should use StaticPool
        from sqlalchemy.pool import StaticPool

        assert call_kwargs["poolclass"] == StaticPool
        assert call_kwargs["connect_args"]["check_same_thread"] is False

    @patch("app.core.database.create_async_engine")
    def test_create_postgres_engine(self, mock_create_engine, postgres_settings):
        """Test PostgreSQL engine creation with pool settings."""
        manager = DatabaseManager(postgres_settings)
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        engine = manager._create_engine(postgres_settings.DATABASE_URL)

        mock_create_engine.assert_called_once()
        call_kwargs = mock_create_engine.call_args[1]
        # PostgreSQL should use default pool (None = AsyncAdaptedQueuePool)
        assert call_kwargs["poolclass"] is None
        assert call_kwargs["pool_size"] == 10
        assert call_kwargs["max_overflow"] == 20

    @patch("app.core.database.create_async_engine")
    def test_create_replica_engine_reduced_pool(
        self, mock_create_engine, postgres_settings
    ):
        """Test replica engine has reduced pool size."""
        manager = DatabaseManager(postgres_settings)
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        engine = manager._create_engine(postgres_settings.DATABASE_URL, is_replica=True)

        call_kwargs = mock_create_engine.call_args[1]
        # Replica should have reduced pool (pool_size // 2)
        assert call_kwargs["pool_size"] == 5  # 10 // 2
        assert call_kwargs["max_overflow"] == 10  # 20 // 2

    @patch("app.core.database.create_async_engine")
    def test_create_postgres_engine_with_ssl(
        self, mock_create_engine, postgres_ssl_settings
    ):
        """Test PostgreSQL engine with SSL enabled."""
        manager = DatabaseManager(postgres_ssl_settings)
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        engine = manager._create_engine(postgres_ssl_settings.DATABASE_URL)

        call_kwargs = mock_create_engine.call_args[1]
        assert call_kwargs["connect_args"]["ssl"] == "require"

    @patch("app.core.database.create_async_engine")
    def test_create_postgres_engine_without_ssl(
        self, mock_create_engine, postgres_settings
    ):
        """Test PostgreSQL engine without SSL."""
        manager = DatabaseManager(postgres_settings)
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        engine = manager._create_engine(postgres_settings.DATABASE_URL)

        call_kwargs = mock_create_engine.call_args[1]
        assert call_kwargs["connect_args"]["ssl"] is None


# ============================================================================
# DATABASE INITIALIZATION TESTS
# ============================================================================


class TestDatabaseInitialization:
    """Test database initialization."""

    @pytest.mark.asyncio
    @patch("app.core.database.create_async_engine")
    @patch("app.core.database.async_sessionmaker")
    async def test_initialize_creates_primary_engine(
        self, mock_sessionmaker, mock_create_engine, postgres_settings
    ):
        """Test initialization creates primary engine and session factory."""
        manager = DatabaseManager(postgres_settings)
        mock_engine = MagicMock()
        mock_engine.begin = MagicMock(return_value=AsyncMock())
        mock_create_engine.return_value = mock_engine

        # Mock the connection test
        mock_conn = AsyncMock()
        mock_engine.begin.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_engine.begin.return_value.__aexit__ = AsyncMock(return_value=None)

        await manager.initialize()

        assert manager._initialized is True
        assert manager.primary_engine is not None
        mock_sessionmaker.assert_called()

    @pytest.mark.asyncio
    async def test_initialize_idempotent(self, postgres_settings):
        """Test that initialize is idempotent (doesn't reinitialize)."""
        manager = DatabaseManager(postgres_settings)
        manager._initialized = True  # Pretend already initialized

        # This should return immediately without error
        await manager.initialize()

        # Should still be initialized but engines not created
        assert manager._initialized is True
        assert manager.primary_engine is None  # Not created because we skipped

    @pytest.mark.asyncio
    @patch("app.core.database.create_async_engine")
    @patch("app.core.database.async_sessionmaker")
    async def test_initialize_with_replica(
        self, mock_sessionmaker, mock_create_engine, postgres_with_replica_settings
    ):
        """Test initialization with replica database."""
        manager = DatabaseManager(postgres_with_replica_settings)
        mock_engine = MagicMock()
        mock_engine.begin = MagicMock(return_value=AsyncMock())
        mock_create_engine.return_value = mock_engine

        # Mock the connection test
        mock_conn = AsyncMock()
        mock_engine.begin.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_engine.begin.return_value.__aexit__ = AsyncMock(return_value=None)

        await manager.initialize()

        # Should have created both primary and replica engines
        assert mock_create_engine.call_count == 2
        assert mock_sessionmaker.call_count == 2


# ============================================================================
# SESSION MANAGEMENT TESTS
# ============================================================================


class TestSessionManagement:
    """Test database session management."""

    @pytest.mark.asyncio
    async def test_get_session_initializes_if_needed(self, postgres_settings):
        """Test get_session initializes database if not initialized."""
        manager = DatabaseManager(postgres_settings)
        manager._initialized = False

        # Mock the initialize method
        manager.initialize = AsyncMock()
        manager.primary_session_factory = MagicMock()
        mock_session = AsyncMock()
        manager.primary_session_factory.return_value.__aenter__ = AsyncMock(
            return_value=mock_session
        )
        manager.primary_session_factory.return_value.__aexit__ = AsyncMock()

        async for _ in manager.get_session():
            pass

        manager.initialize.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_session_uses_replica_for_readonly(
        self, postgres_with_replica_settings
    ):
        """Test get_session uses replica for read-only queries."""
        manager = DatabaseManager(postgres_with_replica_settings)
        manager._initialized = True

        # Setup mock factories
        mock_primary = MagicMock()
        mock_replica = MagicMock()
        mock_session = AsyncMock()

        mock_replica.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_replica.return_value.__aexit__ = AsyncMock()

        manager.primary_session_factory = mock_primary
        manager.replica_session_factory = mock_replica

        async for session in manager.get_session(read_only=True):
            assert session == mock_session

        mock_replica.assert_called_once()
        mock_primary.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_session_uses_primary_for_writes(self, postgres_settings):
        """Test get_session uses primary for write operations."""
        manager = DatabaseManager(postgres_settings)
        manager._initialized = True

        # Setup mock factory
        mock_primary = MagicMock()
        mock_session = AsyncMock()

        mock_primary.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_primary.return_value.__aexit__ = AsyncMock()

        manager.primary_session_factory = mock_primary
        manager.replica_session_factory = None

        async for session in manager.get_session(read_only=False):
            assert session == mock_session

        mock_primary.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_session_raises_if_no_factory(self, postgres_settings):
        """Test get_session raises error if factory not initialized."""
        manager = DatabaseManager(postgres_settings)
        manager._initialized = True
        manager.primary_session_factory = None
        manager.replica_session_factory = None

        with pytest.raises(RuntimeError, match="session factory not initialized"):
            async for _ in manager.get_session():
                pass


# ============================================================================
# ENGINE ACCESS TESTS
# ============================================================================


class TestEngineAccess:
    """Test engine access methods."""

    def test_get_engine_returns_primary_by_default(self, postgres_settings):
        """Test get_engine returns primary engine by default."""
        manager = DatabaseManager(postgres_settings)
        manager._initialized = True
        mock_primary = MagicMock()
        mock_replica = MagicMock()
        manager.primary_engine = mock_primary
        manager.replica_engine = mock_replica

        engine = manager.get_engine()

        assert engine == mock_primary

    def test_get_engine_returns_replica_for_readonly(
        self, postgres_with_replica_settings
    ):
        """Test get_engine returns replica for read-only queries."""
        manager = DatabaseManager(postgres_with_replica_settings)
        manager._initialized = True
        mock_primary = MagicMock()
        mock_replica = MagicMock()
        manager.primary_engine = mock_primary
        manager.replica_engine = mock_replica

        engine = manager.get_engine(read_only=True)

        assert engine == mock_replica

    def test_get_engine_falls_back_to_primary(self, postgres_settings):
        """Test get_engine falls back to primary when no replica."""
        manager = DatabaseManager(postgres_settings)
        manager._initialized = True
        mock_primary = MagicMock()
        manager.primary_engine = mock_primary
        manager.replica_engine = None

        engine = manager.get_engine(read_only=True)

        assert engine == mock_primary

    def test_get_engine_not_initialized(self, postgres_settings):
        """Test get_engine returns primary when not initialized."""
        manager = DatabaseManager(postgres_settings)
        manager._initialized = False
        mock_primary = MagicMock()
        manager.primary_engine = mock_primary

        engine = manager.get_engine()

        assert engine == mock_primary


# ============================================================================
# DATABASE INFO TESTS
# ============================================================================


class TestDatabaseInfo:
    """Test database info retrieval."""

    def test_get_database_info_sqlite(self, sqlite_settings):
        """Test get_database_info for SQLite."""
        manager = DatabaseManager(sqlite_settings)

        info = manager.get_database_info()

        assert info["database_type"] == "SQLite"
        assert "sqlite" in info["primary_url"].lower()
        assert info["replica_configured"] is False
        assert info["replica_url"] is None

    def test_get_database_info_postgres(self, postgres_settings):
        """Test get_database_info for PostgreSQL."""
        manager = DatabaseManager(postgres_settings)

        info = manager.get_database_info()

        assert info["database_type"] == "PostgreSQL"
        assert info["pool_size"] == 10
        assert info["max_overflow"] == 20
        assert info["pool_timeout"] == 30
        assert info["pool_recycle"] == 3600

    def test_get_database_info_with_replica(self, postgres_with_replica_settings):
        """Test get_database_info with replica configured."""
        manager = DatabaseManager(postgres_with_replica_settings)

        info = manager.get_database_info()

        assert info["replica_configured"] is True
        assert info["replica_url"] is not None
        # Password should be sanitized
        assert "***" in info["replica_url"]


# ============================================================================
# URL SANITIZATION TESTS
# ============================================================================


class TestUrlSanitization:
    """Test URL sanitization for logging."""

    def test_sanitize_url_masks_password(self, postgres_settings):
        """Test that password is masked in URL."""
        manager = DatabaseManager(postgres_settings)

        sanitized = manager._sanitize_url(
            "postgresql://user:secretpassword@localhost:5432/db"
        )

        assert "secretpassword" not in sanitized
        assert "***" in sanitized
        assert "user" in sanitized

    def test_sanitize_url_handles_none(self, sqlite_settings):
        """Test sanitize_url handles None gracefully."""
        manager = DatabaseManager(sqlite_settings)

        sanitized = manager._sanitize_url("")

        assert sanitized == "None"

    def test_sanitize_url_preserves_structure(self, postgres_settings):
        """Test sanitize_url preserves URL structure."""
        manager = DatabaseManager(postgres_settings)

        sanitized = manager._sanitize_url("postgresql://user:pass@host:5432/db")

        assert "postgresql://" in sanitized
        assert "host:5432/db" in sanitized


# ============================================================================
# CLOSE AND CLEANUP TESTS
# ============================================================================


class TestDatabaseClose:
    """Test database connection closing."""

    @pytest.mark.asyncio
    async def test_close_disposes_primary_engine(self, postgres_settings):
        """Test close disposes primary engine."""
        manager = DatabaseManager(postgres_settings)
        mock_engine = AsyncMock()
        manager.primary_engine = mock_engine
        manager.replica_engine = None

        await manager.close()

        mock_engine.dispose.assert_called_once()

    @pytest.mark.asyncio
    async def test_close_disposes_both_engines(self, postgres_with_replica_settings):
        """Test close disposes both engines when replica exists."""
        manager = DatabaseManager(postgres_with_replica_settings)
        mock_primary = AsyncMock()
        mock_replica = AsyncMock()
        manager.primary_engine = mock_primary
        manager.replica_engine = mock_replica

        await manager.close()

        mock_primary.dispose.assert_called_once()
        mock_replica.dispose.assert_called_once()

    @pytest.mark.asyncio
    async def test_close_handles_no_engines(self, sqlite_settings):
        """Test close handles case when engines not initialized."""
        manager = DatabaseManager(sqlite_settings)
        manager.primary_engine = None
        manager.replica_engine = None

        # Should not raise
        await manager.close()


# ============================================================================
# SESSION GENERATORS TESTS
# ============================================================================


class TestSessionGenerators:
    """Test FastAPI dependency session generators."""

    @pytest.mark.asyncio
    async def test_get_primary_session(self, postgres_settings):
        """Test get_primary_session returns write session."""
        manager = DatabaseManager(postgres_settings)
        manager._initialized = True

        mock_factory = MagicMock()
        mock_session = AsyncMock()
        mock_factory.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_factory.return_value.__aexit__ = AsyncMock()

        manager.primary_session_factory = mock_factory

        sessions = []
        async for session in manager.get_primary_session():
            sessions.append(session)

        assert len(sessions) == 1
        assert sessions[0] == mock_session

    @pytest.mark.asyncio
    async def test_get_replica_session(self, postgres_with_replica_settings):
        """Test get_replica_session returns read session."""
        manager = DatabaseManager(postgres_with_replica_settings)
        manager._initialized = True

        mock_factory = MagicMock()
        mock_session = AsyncMock()
        mock_factory.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_factory.return_value.__aexit__ = AsyncMock()

        manager.replica_session_factory = mock_factory

        sessions = []
        async for session in manager.get_replica_session():
            sessions.append(session)

        assert len(sessions) == 1


# ============================================================================
# POOL SIZE EDGE CASES
# ============================================================================


class TestPoolSizeEdgeCases:
    """Test pool size edge cases."""

    @patch("app.core.database.create_async_engine")
    def test_replica_pool_minimum_size(self, mock_create_engine):
        """Test replica pool has minimum size of 2."""
        settings = MagicMock(spec=Settings)
        settings.DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/db"
        settings.DATABASE_POOL_SIZE = 2  # Small pool
        settings.DATABASE_MAX_OVERFLOW = 4
        settings.DATABASE_POOL_TIMEOUT = 30
        settings.DATABASE_POOL_RECYCLE = 3600
        settings.DATABASE_SSL_REQUIRED = False

        manager = DatabaseManager(settings)
        mock_create_engine.return_value = MagicMock()

        manager._create_engine(settings.DATABASE_URL, is_replica=True)

        call_kwargs = mock_create_engine.call_args[1]
        # Should use minimum of 2 (max(2, 2//2) = max(2, 1) = 2)
        assert call_kwargs["pool_size"] == 2

    @patch("app.core.database.create_async_engine")
    def test_replica_overflow_minimum(self, mock_create_engine):
        """Test replica max_overflow has minimum of 5."""
        settings = MagicMock(spec=Settings)
        settings.DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/db"
        settings.DATABASE_POOL_SIZE = 4
        settings.DATABASE_MAX_OVERFLOW = 6  # Small overflow
        settings.DATABASE_POOL_TIMEOUT = 30
        settings.DATABASE_POOL_RECYCLE = 3600
        settings.DATABASE_SSL_REQUIRED = False

        manager = DatabaseManager(settings)
        mock_create_engine.return_value = MagicMock()

        manager._create_engine(settings.DATABASE_URL, is_replica=True)

        call_kwargs = mock_create_engine.call_args[1]
        # Should use minimum of 5 (max(5, 6//2) = max(5, 3) = 5)
        assert call_kwargs["max_overflow"] == 5
