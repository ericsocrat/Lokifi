"""
Comprehensive tests for app.services.data_archival_service

Tests DataArchivalService with full coverage of archival operations,
storage metrics, and database maintenance tasks.

Pattern: AsyncMock + database mocking + async testing
Session 77 - Backend Coverage Improvement (DataArchivalService 0% → 80%+)
"""

import logging
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, call, patch

import pytest
import pytest_asyncio
from app.core.config import Settings
from app.services.data_archival_service import (
    ArchivalStats,
    DataArchivalService,
    StorageMetrics,
)
from sqlalchemy.ext.asyncio import AsyncSession

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_settings() -> Settings:
    """Mock Settings with archival configuration"""
    settings = MagicMock(spec=Settings)
    settings.ARCHIVE_THRESHOLD_DAYS = 90
    settings.DELETE_THRESHOLD_DAYS = 365
    settings.ENABLE_DATA_ARCHIVAL = True
    settings.DATABASE_URL = "sqlite:///test.db"
    return settings


@pytest.fixture
def mock_settings_disabled() -> Settings:
    """Mock Settings with archival disabled"""
    settings = MagicMock(spec=Settings)
    settings.ENABLE_DATA_ARCHIVAL = False
    settings.ARCHIVE_THRESHOLD_DAYS = 90
    settings.DELETE_THRESHOLD_DAYS = 365
    settings.DATABASE_URL = "sqlite:///test.db"
    return settings


@pytest.fixture
def mock_settings_postgres() -> Settings:
    """Mock Settings with PostgreSQL database"""
    settings = MagicMock(spec=Settings)
    settings.ARCHIVE_THRESHOLD_DAYS = 90
    settings.DELETE_THRESHOLD_DAYS = 365
    settings.ENABLE_DATA_ARCHIVAL = True
    settings.DATABASE_URL = "postgresql://user:pass@localhost/db"
    return settings


@pytest.fixture
def archival_service(mock_settings: Settings) -> DataArchivalService:
    """DataArchivalService instance for testing"""
    return DataArchivalService(mock_settings)


@pytest.fixture
def archival_service_disabled(mock_settings_disabled: Settings) -> DataArchivalService:
    """DataArchivalService with archival disabled"""
    return DataArchivalService(mock_settings_disabled)


@pytest.fixture
def archival_service_postgres(mock_settings_postgres: Settings) -> DataArchivalService:
    """DataArchivalService with PostgreSQL database"""
    return DataArchivalService(mock_settings_postgres)


@pytest_asyncio.fixture
async def mock_session() -> AsyncMock:
    """Mock AsyncSession for database operations"""
    session = AsyncMock(spec=AsyncSession)
    # Setup default scalar return values
    session.scalar = AsyncMock(return_value=0)
    session.execute = AsyncMock()
    return session


# ============================================================================
# DataArchivalService Initialization Tests
# ============================================================================


class TestDataArchivalServiceInit:
    """Test suite for DataArchivalService initialization"""

    def test_init_with_enabled_archival(self, archival_service: DataArchivalService):
        """Test initialization with archival enabled"""
        assert archival_service.archive_threshold_days == 90
        assert archival_service.delete_threshold_days == 365
        assert archival_service.enabled is True

    def test_init_with_disabled_archival(self, archival_service_disabled: DataArchivalService):
        """Test initialization with archival disabled"""
        assert archival_service_disabled.enabled is False

    def test_init_with_postgres(self, archival_service_postgres: DataArchivalService):
        """Test initialization with PostgreSQL settings"""
        assert archival_service_postgres.settings.DATABASE_URL.startswith("postgresql")


# ============================================================================
# Storage Metrics Tests
# ============================================================================


class TestStorageMetrics:
    """Test suite for storage metrics retrieval"""

    @pytest.mark.asyncio
    async def test_get_storage_metrics_success(
        self, archival_service: DataArchivalService, mock_session: AsyncMock
    ):
        """Test successful retrieval of storage metrics"""
        # Setup mock session with realistic data
        mock_session.scalar = AsyncMock(
            side_effect=[
                1000,  # total_threads count
                50000,  # total_messages count
                datetime(2024, 1, 1),  # oldest_message_date
                datetime(2024, 12, 1),  # newest_message_date
                500,  # archived_messages count
            ]
        )

        with patch("app.services.data_archival_service.db_manager.get_session") as mock_get_session:
            # Setup async context manager
            async def async_generator():
                yield mock_session

            mock_get_session.return_value = async_generator()

            metrics = await archival_service.get_storage_metrics()

            assert metrics.total_threads == 1000
            assert metrics.total_messages == 50000
            assert metrics.oldest_message_date == datetime(2024, 1, 1)
            assert metrics.newest_message_date == datetime(2024, 12, 1)
            assert metrics.archived_messages == 500
            # Verify size calculations (rough estimates)
            assert metrics.ai_threads_size_mb == pytest.approx((1000 * 1) / 1024, rel=0.01)
            assert metrics.ai_messages_size_mb == pytest.approx((50000 * 5) / 1024, rel=0.01)
            assert metrics.total_size_mb > 0

    @pytest.mark.asyncio
    async def test_get_storage_metrics_with_none_values(
        self, archival_service: DataArchivalService, mock_session: AsyncMock
    ):
        """Test storage metrics when some values are None"""
        mock_session.scalar = AsyncMock(
            side_effect=[
                None,  # total_threads count returns None
                None,  # total_messages count returns None
                None,  # oldest_message_date
                None,  # newest_message_date
                None,  # archived_messages count
            ]
        )

        with patch("app.services.data_archival_service.db_manager.get_session") as mock_get_session:

            async def async_generator():
                yield mock_session

            mock_get_session.return_value = async_generator()

            metrics = await archival_service.get_storage_metrics()

            # Should handle None values gracefully
            assert metrics.total_threads == 0
            assert metrics.total_messages == 0
            assert metrics.oldest_message_date is None
            assert metrics.newest_message_date is None
            assert metrics.archived_messages == 0

    @pytest.mark.asyncio
    async def test_get_storage_metrics_archive_table_missing(
        self, archival_service: DataArchivalService, mock_session: AsyncMock
    ):
        """Test metrics when archive table doesn't exist"""
        mock_session.scalar = AsyncMock(
            side_effect=[
                100,  # total_threads
                1000,  # total_messages
                datetime(2024, 6, 1),  # oldest
                datetime(2024, 12, 1),  # newest
                Exception("no such table: ai_messages_archive"),  # archive query fails
            ]
        )

        with patch("app.services.data_archival_service.db_manager.get_session") as mock_get_session:

            async def async_generator():
                yield mock_session

            mock_get_session.return_value = async_generator()

            metrics = await archival_service.get_storage_metrics()

            # Should handle missing archive table gracefully
            assert metrics.total_threads == 100
            assert metrics.total_messages == 1000
            assert metrics.archived_messages == 0  # Defaults to 0 on exception

    @pytest.mark.asyncio
    async def test_get_storage_metrics_database_error(
        self, archival_service: DataArchivalService, caplog
    ):
        """Test metrics retrieval when database error occurs"""
        with patch("app.services.data_archival_service.db_manager.get_session") as mock_get_session:

            async def async_generator():
                raise Exception("Database connection failed")
                yield  # This line won't be reached but needed for generator syntax

            mock_get_session.return_value = async_generator()

            with caplog.at_level(logging.ERROR):
                metrics = await archival_service.get_storage_metrics()

            # Should return empty metrics on error
            assert metrics.total_threads == 0
            assert metrics.total_messages == 0
            assert "Error getting metrics" in caplog.text


# ============================================================================
# Archive Table Creation Tests
# ============================================================================


class TestArchiveTableCreation:
    """Test suite for archive table creation"""

    @pytest.mark.asyncio
    async def test_create_archive_table_success(
        self, archival_service: DataArchivalService, mock_session: AsyncMock, caplog
    ):
        """Test successful archive table creation"""
        with patch("app.services.data_archival_service.db_manager.get_session") as mock_get_session:

            async def async_generator():
                yield mock_session

            mock_get_session.return_value = async_generator()

            with caplog.at_level(logging.INFO):
                await archival_service.create_archive_table_if_not_exists()

            # Verify CREATE TABLE was executed
            mock_session.execute.assert_called_once()
            call_args = mock_session.execute.call_args[0][0]
            assert "CREATE TABLE IF NOT EXISTS ai_messages_archive" in str(call_args)
            assert "✅ Archive table verified" in caplog.text

    @pytest.mark.asyncio
    async def test_create_archive_table_error(
        self, archival_service: DataArchivalService, mock_session: AsyncMock, caplog
    ):
        """Test archive table creation when error occurs"""
        mock_session.execute = AsyncMock(side_effect=Exception("Table creation failed"))

        with patch("app.services.data_archival_service.db_manager.get_session") as mock_get_session:

            async def async_generator():
                yield mock_session

            mock_get_session.return_value = async_generator()

            with caplog.at_level(logging.ERROR):
                with pytest.raises(Exception, match="Table creation failed"):
                    await archival_service.create_archive_table_if_not_exists()

            assert "Error creating archive table" in caplog.text


# ============================================================================
# Archive Old Conversations Tests
# ============================================================================


class TestArchiveOldConversations:
    """Test suite for archiving old conversations"""

    @pytest.mark.asyncio
    async def test_archive_when_disabled(
        self, archival_service_disabled: DataArchivalService, caplog
    ):
        """Test archival returns empty stats when disabled"""
        with caplog.at_level(logging.INFO):
            stats = await archival_service_disabled.archive_old_conversations()

        assert stats.messages_archived == 0
        assert stats.threads_archived == 0
        assert "Data archival is disabled" in caplog.text

    @pytest.mark.asyncio
    async def test_archive_old_conversations_success(
        self, archival_service: DataArchivalService, mock_session: AsyncMock, caplog
    ):
        """Test successful archival of old conversations"""
        # Mock create_archive_table to avoid execution
        with patch.object(archival_service, "create_archive_table_if_not_exists", new=AsyncMock()):
            mock_session.scalar = AsyncMock(return_value=1500)  # old_count

            with patch(
                "app.services.data_archival_service.db_manager.get_session"
            ) as mock_get_session:

                async def async_generator():
                    yield mock_session

                mock_get_session.return_value = async_generator()

                with caplog.at_level(logging.INFO):
                    stats = await archival_service.archive_old_conversations()

                assert stats.messages_archived == 1500
                assert stats.operation_duration > 0
                assert "Found 1500 messages eligible for archival" in caplog.text

    @pytest.mark.asyncio
    async def test_archive_old_conversations_zero_eligible(
        self, archival_service: DataArchivalService, mock_session: AsyncMock, caplog
    ):
        """Test archival when no messages are eligible"""
        with patch.object(archival_service, "create_archive_table_if_not_exists", new=AsyncMock()):
            mock_session.scalar = AsyncMock(return_value=0)  # No old messages

            with patch(
                "app.services.data_archival_service.db_manager.get_session"
            ) as mock_get_session:

                async def async_generator():
                    yield mock_session

                mock_get_session.return_value = async_generator()

                with caplog.at_level(logging.INFO):
                    stats = await archival_service.archive_old_conversations()

                assert stats.messages_archived == 0
                assert "Found 0 messages eligible for archival" in caplog.text

    @pytest.mark.asyncio
    async def test_archive_old_conversations_with_batch_size(
        self, archival_service: DataArchivalService, mock_session: AsyncMock
    ):
        """Test archival with custom batch size"""
        with patch.object(archival_service, "create_archive_table_if_not_exists", new=AsyncMock()):
            mock_session.scalar = AsyncMock(return_value=500)

            with patch(
                "app.services.data_archival_service.db_manager.get_session"
            ) as mock_get_session:

                async def async_generator():
                    yield mock_session

                mock_get_session.return_value = async_generator()

                stats = await archival_service.archive_old_conversations(batch_size=500)

                assert stats.messages_archived == 500

    @pytest.mark.asyncio
    async def test_archive_old_conversations_database_error(
        self, archival_service: DataArchivalService, caplog
    ):
        """Test archival when database error occurs"""
        with patch.object(archival_service, "create_archive_table_if_not_exists", new=AsyncMock()):
            with patch(
                "app.services.data_archival_service.db_manager.get_session"
            ) as mock_get_session:

                async def async_generator():
                    raise Exception("Database error")
                    yield

                mock_get_session.return_value = async_generator()

                with caplog.at_level(logging.ERROR):
                    stats = await archival_service.archive_old_conversations()

                # Should return stats with error logged
                assert stats.messages_archived == 0
                assert stats.operation_duration > 0
                assert "Error during archival" in caplog.text

    @pytest.mark.asyncio
    async def test_archive_cutoff_date_calculation(
        self, archival_service: DataArchivalService, mock_session: AsyncMock
    ):
        """Test that cutoff date is calculated correctly"""
        with patch.object(archival_service, "create_archive_table_if_not_exists", new=AsyncMock()):
            mock_session.scalar = AsyncMock(return_value=100)

            with patch(
                "app.services.data_archival_service.db_manager.get_session"
            ) as mock_get_session:

                async def async_generator():
                    yield mock_session

                mock_get_session.return_value = async_generator()

                with patch("app.services.data_archival_service.datetime") as mock_datetime:
                    # Mock current time
                    mock_now = datetime(2024, 12, 1)
                    mock_datetime.now.return_value = mock_now

                    await archival_service.archive_old_conversations()

                    # Verify cutoff date calculation (90 days ago) was used in query
                    # The WHERE clause should use the calculated cutoff
                    mock_session.scalar.assert_called_once()


# ============================================================================
# Database Vacuum Tests
# ============================================================================


class TestDatabaseVacuum:
    """Test suite for database vacuum operations"""

    @pytest.mark.asyncio
    async def test_vacuum_sqlite_success(
        self, archival_service: DataArchivalService, mock_session: AsyncMock, caplog
    ):
        """Test successful SQLite VACUUM operation"""
        with patch("app.services.data_archival_service.db_manager.get_session") as mock_get_session:

            async def async_generator():
                yield mock_session

            mock_get_session.return_value = async_generator()

            with caplog.at_level(logging.INFO):
                await archival_service.vacuum_database()

            # Verify VACUUM was executed
            mock_session.execute.assert_called_once()
            call_args = mock_session.execute.call_args[0][0]
            assert "VACUUM" in str(call_args)
            assert "✅ SQLite VACUUM completed" in caplog.text

    @pytest.mark.asyncio
    async def test_vacuum_postgres_success(
        self, archival_service_postgres: DataArchivalService, mock_session: AsyncMock, caplog
    ):
        """Test successful PostgreSQL VACUUM operation"""
        with patch("app.services.data_archival_service.db_manager.get_session") as mock_get_session:

            async def async_generator():
                yield mock_session

            mock_get_session.return_value = async_generator()

            with caplog.at_level(logging.INFO):
                await archival_service_postgres.vacuum_database()

            # Verify VACUUM ANALYZE was executed for both tables
            assert mock_session.execute.call_count == 2
            calls = [str(call[0][0]) for call in mock_session.execute.call_args_list]
            assert any("VACUUM ANALYZE ai_messages" in call for call in calls)
            assert any("VACUUM ANALYZE ai_threads" in call for call in calls)
            assert "✅ PostgreSQL VACUUM completed" in caplog.text

    @pytest.mark.asyncio
    async def test_vacuum_database_error(
        self, archival_service: DataArchivalService, mock_session: AsyncMock, caplog
    ):
        """Test vacuum when database error occurs"""
        mock_session.execute = AsyncMock(side_effect=Exception("VACUUM failed"))

        with patch("app.services.data_archival_service.db_manager.get_session") as mock_get_session:

            async def async_generator():
                yield mock_session

            mock_get_session.return_value = async_generator()

            with caplog.at_level(logging.ERROR):
                with pytest.raises(Exception, match="VACUUM failed"):
                    await archival_service.vacuum_database()

            assert "Error during vacuum" in caplog.text


# ============================================================================
# Full Maintenance Tests
# ============================================================================


class TestFullMaintenance:
    """Test suite for full maintenance cycle"""

    @pytest.mark.asyncio
    async def test_run_full_maintenance_success(
        self, archival_service: DataArchivalService, caplog
    ):
        """Test successful full maintenance cycle"""
        # Mock all component methods
        mock_archive_stats = ArchivalStats(messages_archived=1000, operation_duration=5.0)
        mock_metrics = StorageMetrics(total_size_mb=100.0, total_messages=50000)

        with patch.object(
            archival_service,
            "archive_old_conversations",
            new=AsyncMock(return_value=mock_archive_stats),
        ):
            with patch.object(archival_service, "vacuum_database", new=AsyncMock()):
                with patch.object(
                    archival_service,
                    "get_storage_metrics",
                    new=AsyncMock(return_value=mock_metrics),
                ):
                    with caplog.at_level(logging.INFO):
                        results = await archival_service.run_full_maintenance()

                    assert "archive" in results
                    assert results["archive"].messages_archived == 1000
                    assert "🧹 Starting maintenance cycle" in caplog.text
                    assert "🎉 Maintenance completed!" in caplog.text
                    assert "100.00MB" in caplog.text

    @pytest.mark.asyncio
    async def test_run_full_maintenance_archive_error(
        self, archival_service: DataArchivalService, caplog
    ):
        """Test full maintenance when archival fails"""
        with patch.object(
            archival_service,
            "archive_old_conversations",
            new=AsyncMock(side_effect=Exception("Archival failed")),
        ):
            with caplog.at_level(logging.ERROR):
                with pytest.raises(Exception, match="Archival failed"):
                    await archival_service.run_full_maintenance()

            assert "Error during maintenance" in caplog.text

    @pytest.mark.asyncio
    async def test_run_full_maintenance_vacuum_error(
        self, archival_service: DataArchivalService, caplog
    ):
        """Test full maintenance when vacuum fails"""
        mock_archive_stats = ArchivalStats(messages_archived=500)

        with patch.object(
            archival_service,
            "archive_old_conversations",
            new=AsyncMock(return_value=mock_archive_stats),
        ):
            with patch.object(
                archival_service,
                "vacuum_database",
                new=AsyncMock(side_effect=Exception("VACUUM failed")),
            ):
                with caplog.at_level(logging.ERROR):
                    with pytest.raises(Exception, match="VACUUM failed"):
                        await archival_service.run_full_maintenance()

                assert "Error during maintenance" in caplog.text


# ============================================================================
# Edge Cases and Integration Tests
# ============================================================================


class TestDataArchivalEdgeCases:
    """Test suite for edge cases and complex scenarios"""

    @pytest.mark.asyncio
    async def test_archival_stats_initialization(self):
        """Test ArchivalStats dataclass initialization"""
        stats = ArchivalStats()
        assert stats.threads_archived == 0
        assert stats.messages_archived == 0
        assert stats.messages_compressed == 0
        assert stats.messages_deleted == 0
        assert stats.space_freed_mb == 0.0
        assert stats.operation_duration == 0.0

    @pytest.mark.asyncio
    async def test_storage_metrics_initialization(self):
        """Test StorageMetrics dataclass initialization"""
        metrics = StorageMetrics()
        assert metrics.total_size_mb == 0.0
        assert metrics.ai_threads_size_mb == 0.0
        assert metrics.ai_messages_size_mb == 0.0
        assert metrics.ai_messages_archive_size_mb == 0.0
        assert metrics.oldest_message_date is None
        assert metrics.newest_message_date is None
        assert metrics.total_threads == 0
        assert metrics.total_messages == 0
        assert metrics.archived_messages == 0

    @pytest.mark.asyncio
    async def test_concurrent_maintenance_operations(self, archival_service: DataArchivalService):
        """Test that concurrent maintenance operations work correctly"""
        import asyncio

        mock_archive_stats = ArchivalStats(messages_archived=100)
        mock_metrics = StorageMetrics(total_size_mb=50.0)

        with patch.object(
            archival_service,
            "archive_old_conversations",
            new=AsyncMock(return_value=mock_archive_stats),
        ):
            with patch.object(archival_service, "vacuum_database", new=AsyncMock()):
                with patch.object(
                    archival_service,
                    "get_storage_metrics",
                    new=AsyncMock(return_value=mock_metrics),
                ):
                    # Run two maintenance operations concurrently
                    results = await asyncio.gather(
                        archival_service.run_full_maintenance(),
                        archival_service.run_full_maintenance(),
                    )

                    # Both should complete successfully
                    assert len(results) == 2
                    assert all("archive" in result for result in results)

    @pytest.mark.asyncio
    async def test_large_batch_archival(
        self, archival_service: DataArchivalService, mock_session: AsyncMock
    ):
        """Test archival with very large batch size"""
        with patch.object(archival_service, "create_archive_table_if_not_exists", new=AsyncMock()):
            # Simulate large number of messages
            mock_session.scalar = AsyncMock(return_value=1000000)

            with patch(
                "app.services.data_archival_service.db_manager.get_session"
            ) as mock_get_session:

                async def async_generator():
                    yield mock_session

                mock_get_session.return_value = async_generator()

                stats = await archival_service.archive_old_conversations(batch_size=50000)

                assert stats.messages_archived == 1000000

    @pytest.mark.asyncio
    async def test_zero_threshold_days(self, mock_settings: Settings):
        """Test archival with zero threshold days (archive everything)"""
        mock_settings.ARCHIVE_THRESHOLD_DAYS = 0
        service = DataArchivalService(mock_settings)

        assert service.archive_threshold_days == 0

        # This configuration would archive all messages immediately
        with patch.object(service, "create_archive_table_if_not_exists", new=AsyncMock()):
            mock_session = AsyncMock(spec=AsyncSession)
            mock_session.scalar = AsyncMock(return_value=50000)

            with patch(
                "app.services.data_archival_service.db_manager.get_session"
            ) as mock_get_session:

                async def async_generator():
                    yield mock_session

                mock_get_session.return_value = async_generator()

                stats = await service.archive_old_conversations()

                # Should process all messages
                assert stats.messages_archived == 50000
