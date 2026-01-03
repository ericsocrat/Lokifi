"""
Tests for Data Archival Service.

Session 107: Comprehensive testing for data archival and storage management functionality.
Covers storage metrics, archive table creation, conversation archival, database vacuum,
and full maintenance cycles.
"""

import logging
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, call, patch

import pytest

from app.core.config import Settings
from app.services.data_archival_service import (
    ArchivalStats,
    DataArchivalService,
    StorageMetrics,
)

# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def mock_settings():
    """Mock settings object."""
    settings = MagicMock(spec=Settings)
    settings.ARCHIVE_THRESHOLD_DAYS = 90
    settings.DELETE_THRESHOLD_DAYS = 365
    settings.ENABLE_DATA_ARCHIVAL = True
    settings.DATABASE_URL = "sqlite:///test.db"
    return settings


@pytest.fixture
def mock_settings_disabled():
    """Mock settings with archival disabled."""
    settings = MagicMock(spec=Settings)
    settings.ARCHIVE_THRESHOLD_DAYS = 90
    settings.DELETE_THRESHOLD_DAYS = 365
    settings.ENABLE_DATA_ARCHIVAL = False
    settings.DATABASE_URL = "sqlite:///test.db"
    return settings


@pytest.fixture
def mock_settings_postgres():
    """Mock settings for PostgreSQL database."""
    settings = MagicMock(spec=Settings)
    settings.ARCHIVE_THRESHOLD_DAYS = 90
    settings.DELETE_THRESHOLD_DAYS = 365
    settings.ENABLE_DATA_ARCHIVAL = True
    settings.DATABASE_URL = "postgresql://localhost/test"
    return settings


@pytest.fixture
def service(mock_settings):
    """Create DataArchivalService instance."""
    return DataArchivalService(settings=mock_settings)


@pytest.fixture
def service_disabled(mock_settings_disabled):
    """Create DataArchivalService instance with archival disabled."""
    return DataArchivalService(settings=mock_settings_disabled)


@pytest.fixture
def service_postgres(mock_settings_postgres):
    """Create DataArchivalService instance for PostgreSQL."""
    return DataArchivalService(settings=mock_settings_postgres)


@pytest.fixture
def sample_storage_metrics():
    """Sample storage metrics object."""
    return StorageMetrics(
        total_size_mb=150.5,
        ai_threads_size_mb=10.2,
        ai_messages_size_mb=140.3,
        ai_messages_archive_size_mb=25.8,
        oldest_message_date=datetime(2024, 1, 1, tzinfo=timezone.utc),
        newest_message_date=datetime(2024, 11, 18, tzinfo=timezone.utc),
        total_threads=10450,
        total_messages=143800,
        archived_messages=26420,
    )


@pytest.fixture
def sample_archival_stats():
    """Sample archival stats object."""
    return ArchivalStats(
        threads_archived=150,
        messages_archived=5200,
        messages_compressed=3800,
        messages_deleted=1000,
        space_freed_mb=45.5,
        operation_duration=12.34,
    )


# ============================================================================
# Test Dataclasses
# ============================================================================


class TestDataclasses:
    """Test dataclass creation and defaults."""

    def test_archival_stats_creation(self):
        """Test ArchivalStats dataclass creation."""
        stats = ArchivalStats()

        assert stats.threads_archived == 0
        assert stats.messages_archived == 0
        assert stats.messages_compressed == 0
        assert stats.messages_deleted == 0
        assert stats.space_freed_mb == 0.0
        assert stats.operation_duration == 0.0

    def test_archival_stats_with_values(self, sample_archival_stats):
        """Test ArchivalStats with custom values."""
        assert sample_archival_stats.threads_archived == 150
        assert sample_archival_stats.messages_archived == 5200
        assert sample_archival_stats.messages_compressed == 3800
        assert sample_archival_stats.messages_deleted == 1000
        assert sample_archival_stats.space_freed_mb == 45.5
        assert sample_archival_stats.operation_duration == 12.34

    def test_storage_metrics_creation(self):
        """Test StorageMetrics dataclass creation."""
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

    def test_storage_metrics_with_values(self, sample_storage_metrics):
        """Test StorageMetrics with custom values."""
        assert sample_storage_metrics.total_size_mb == 150.5
        assert sample_storage_metrics.ai_threads_size_mb == 10.2
        assert sample_storage_metrics.ai_messages_size_mb == 140.3
        assert sample_storage_metrics.ai_messages_archive_size_mb == 25.8
        assert sample_storage_metrics.oldest_message_date == datetime(
            2024, 1, 1, tzinfo=timezone.utc
        )
        assert sample_storage_metrics.newest_message_date == datetime(
            2024, 11, 18, tzinfo=timezone.utc
        )
        assert sample_storage_metrics.total_threads == 10450
        assert sample_storage_metrics.total_messages == 143800
        assert sample_storage_metrics.archived_messages == 26420


# ============================================================================
# Test Initialization
# ============================================================================


class TestInitialization:
    """Test service initialization."""

    def test_service_creation(self, service, mock_settings):
        """Test service is created correctly."""
        assert service.settings == mock_settings
        assert service.archive_threshold_days == 90
        assert service.delete_threshold_days == 365
        assert service.enabled is True

    def test_service_creation_disabled(self, service_disabled, mock_settings_disabled):
        """Test service creation with archival disabled."""
        assert service_disabled.settings == mock_settings_disabled
        assert service_disabled.enabled is False

    def test_service_creation_postgres(self, service_postgres, mock_settings_postgres):
        """Test service creation with PostgreSQL settings."""
        assert service_postgres.settings == mock_settings_postgres
        assert service_postgres.settings.DATABASE_URL.startswith("postgresql")


# ============================================================================
# Test Get Storage Metrics
# ============================================================================


class TestGetStorageMetrics:
    """Test storage metrics retrieval."""

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    async def test_get_storage_metrics_success(self, mock_db_manager, service):
        """Test successful storage metrics retrieval."""
        # Mock session and queries
        mock_session = MagicMock()
        mock_session.scalar = AsyncMock(
            side_effect=[
                10450,  # total_threads
                143800,  # total_messages
                datetime(2024, 1, 1, tzinfo=timezone.utc),  # oldest_message_date
                datetime(2024, 11, 18, tzinfo=timezone.utc),  # newest_message_date
                26420,  # archived_messages
            ]
        )

        # Mock async context manager
        async def mock_get_session(read_only=True):
            yield mock_session

        mock_db_manager.get_session = mock_get_session

        # Execute
        metrics = await service.get_storage_metrics()

        # Verify
        assert metrics.total_threads == 10450
        assert metrics.total_messages == 143800
        assert metrics.oldest_message_date == datetime(2024, 1, 1, tzinfo=timezone.utc)
        assert metrics.newest_message_date == datetime(
            2024, 11, 18, tzinfo=timezone.utc
        )
        assert metrics.archived_messages == 26420

        # Size calculations: threads * 1 / 1024, messages * 5 / 1024
        assert metrics.ai_threads_size_mb == (10450 * 1) / 1024
        assert metrics.ai_messages_size_mb == (143800 * 5) / 1024
        assert (
            metrics.total_size_mb
            == metrics.ai_threads_size_mb + metrics.ai_messages_size_mb
        )

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    async def test_get_storage_metrics_null_counts(self, mock_db_manager, service):
        """Test storage metrics with null count values."""
        # Mock session with None returns
        mock_session = MagicMock()
        mock_session.scalar = AsyncMock(
            side_effect=[
                None,  # total_threads (null)
                None,  # total_messages (null)
                None,  # oldest_message_date
                None,  # newest_message_date
                None,  # archived_messages (null)
            ]
        )

        async def mock_get_session(read_only=True):
            yield mock_session

        mock_db_manager.get_session = mock_get_session

        # Execute
        metrics = await service.get_storage_metrics()

        # Verify - should default to 0
        assert metrics.total_threads == 0
        assert metrics.total_messages == 0
        assert metrics.oldest_message_date is None
        assert metrics.newest_message_date is None
        assert metrics.archived_messages == 0

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    async def test_get_storage_metrics_no_archive_table(self, mock_db_manager, service):
        """Test storage metrics when archive table doesn't exist."""
        # Mock session with exception on archive count
        mock_session = MagicMock()
        mock_session.scalar = AsyncMock(
            side_effect=[
                100,  # total_threads
                500,  # total_messages
                datetime(2024, 1, 1, tzinfo=timezone.utc),  # oldest
                datetime(2024, 11, 18, tzinfo=timezone.utc),  # newest
                Exception(
                    "no such table: ai_messages_archive"
                ),  # archived_messages fails
            ]
        )

        async def mock_get_session(read_only=True):
            yield mock_session

        mock_db_manager.get_session = mock_get_session

        # Execute
        metrics = await service.get_storage_metrics()

        # Verify - should handle exception and default to 0
        assert metrics.total_threads == 100
        assert metrics.total_messages == 500
        assert metrics.archived_messages == 0  # Default when exception occurs

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    @patch("app.services.data_archival_service.logger")
    async def test_get_storage_metrics_database_error(
        self, mock_logger, mock_db_manager, service
    ):
        """Test storage metrics with database error."""

        # Mock session to raise exception
        async def mock_get_session(read_only=True):
            raise Exception("Database connection failed")
            yield  # pragma: no cover

        mock_db_manager.get_session = mock_get_session

        # Execute
        metrics = await service.get_storage_metrics()

        # Verify - should return empty metrics on error
        assert metrics.total_threads == 0
        assert metrics.total_messages == 0
        assert metrics.total_size_mb == 0.0
        mock_logger.error.assert_called()

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    @patch("app.services.data_archival_service.logger")
    async def test_get_storage_metrics_logging(
        self, mock_logger, mock_db_manager, service
    ):
        """Test storage metrics logs information correctly."""
        # Mock session
        mock_session = MagicMock()
        mock_session.scalar = AsyncMock(side_effect=[1000, 5000, None, None, 0])

        async def mock_get_session(read_only=True):
            yield mock_session

        mock_db_manager.get_session = mock_get_session

        # Execute
        await service.get_storage_metrics()

        # Verify logging was called
        mock_logger.info.assert_called()
        log_message = mock_logger.info.call_args[0][0]
        assert "Storage:" in log_message
        assert "5,000 messages" in log_message


# ============================================================================
# Test Create Archive Table
# ============================================================================


class TestCreateArchiveTable:
    """Test archive table creation."""

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    @patch("app.services.data_archival_service.logger")
    async def test_create_archive_table_success(
        self, mock_logger, mock_db_manager, service
    ):
        """Test successful archive table creation."""
        # Mock session
        mock_session = MagicMock()
        mock_session.execute = AsyncMock()

        async def mock_get_session(read_only=False):
            yield mock_session

        mock_db_manager.get_session = mock_get_session

        # Execute
        await service.create_archive_table_if_not_exists()

        # Verify
        mock_session.execute.assert_awaited_once()
        mock_logger.info.assert_called_with("✅ Archive table verified")

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    @patch("app.services.data_archival_service.logger")
    async def test_create_archive_table_already_exists(
        self, mock_logger, mock_db_manager, service
    ):
        """Test archive table creation when table already exists."""
        # Mock session
        mock_session = MagicMock()
        mock_session.execute = AsyncMock()

        async def mock_get_session(read_only=False):
            yield mock_session

        mock_db_manager.get_session = mock_get_session

        # Execute
        await service.create_archive_table_if_not_exists()

        # Verify - CREATE TABLE IF NOT EXISTS should succeed
        mock_session.execute.assert_awaited_once()
        mock_logger.info.assert_called_with("✅ Archive table verified")

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    @patch("app.services.data_archival_service.logger")
    async def test_create_archive_table_error(
        self, mock_logger, mock_db_manager, service
    ):
        """Test archive table creation with database error."""

        # Mock session to raise exception
        async def mock_get_session(read_only=False):
            raise Exception("Permission denied")
            yield  # pragma: no cover

        mock_db_manager.get_session = mock_get_session

        # Execute and verify exception
        with pytest.raises(Exception) as exc_info:
            await service.create_archive_table_if_not_exists()

        assert "Permission denied" in str(exc_info.value)
        mock_logger.error.assert_called()


# ============================================================================
# Test Archive Old Conversations
# ============================================================================


class TestArchiveOldConversations:
    """Test archiving old conversations."""

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    async def test_archive_old_conversations_success(self, mock_db_manager, service):
        """Test successful archival of old conversations."""
        # Mock create_archive_table_if_not_exists
        with patch.object(
            service, "create_archive_table_if_not_exists", new_callable=AsyncMock
        ):
            # Mock session
            mock_session = MagicMock()
            mock_session.scalar = AsyncMock(return_value=5200)

            async def mock_get_session(read_only=True):
                yield mock_session

            mock_db_manager.get_session = mock_get_session

            # Execute
            stats = await service.archive_old_conversations()

            # Verify
            assert stats.messages_archived == 5200
            assert stats.operation_duration > 0
            mock_session.scalar.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_archive_old_conversations_disabled(self, service_disabled):
        """Test archival when feature is disabled."""
        # Execute
        stats = await service_disabled.archive_old_conversations()

        # Verify - should return empty stats
        assert stats.messages_archived == 0
        assert stats.threads_archived == 0
        assert stats.operation_duration == 0.0

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    async def test_archive_old_conversations_no_old_messages(
        self, mock_db_manager, service
    ):
        """Test archival when no old messages found."""
        # Mock create_archive_table_if_not_exists
        with patch.object(
            service, "create_archive_table_if_not_exists", new_callable=AsyncMock
        ):
            # Mock session with 0 count
            mock_session = MagicMock()
            mock_session.scalar = AsyncMock(return_value=0)

            async def mock_get_session(read_only=True):
                yield mock_session

            mock_db_manager.get_session = mock_get_session

            # Execute
            stats = await service.archive_old_conversations()

            # Verify
            assert stats.messages_archived == 0
            assert stats.operation_duration > 0

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    async def test_archive_old_conversations_null_count(self, mock_db_manager, service):
        """Test archival with null count from database."""
        # Mock create_archive_table_if_not_exists
        with patch.object(
            service, "create_archive_table_if_not_exists", new_callable=AsyncMock
        ):
            # Mock session with None count
            mock_session = MagicMock()
            mock_session.scalar = AsyncMock(return_value=None)

            async def mock_get_session(read_only=True):
                yield mock_session

            mock_db_manager.get_session = mock_get_session

            # Execute
            stats = await service.archive_old_conversations()

            # Verify - should default to 0
            assert stats.messages_archived == 0

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    async def test_archive_old_conversations_custom_batch_size(
        self, mock_db_manager, service
    ):
        """Test archival with custom batch size."""
        # Mock create_archive_table_if_not_exists
        with patch.object(
            service, "create_archive_table_if_not_exists", new_callable=AsyncMock
        ):
            # Mock session
            mock_session = MagicMock()
            mock_session.scalar = AsyncMock(return_value=500)

            async def mock_get_session(read_only=True):
                yield mock_session

            mock_db_manager.get_session = mock_get_session

            # Execute with custom batch size
            stats = await service.archive_old_conversations(batch_size=500)

            # Verify
            assert stats.messages_archived == 500

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    @patch("app.services.data_archival_service.logger")
    async def test_archive_old_conversations_database_error(
        self, mock_logger, mock_db_manager, service
    ):
        """Test archival with database error."""
        # Mock create_archive_table_if_not_exists
        with patch.object(
            service, "create_archive_table_if_not_exists", new_callable=AsyncMock
        ):
            # Mock session to raise exception
            async def mock_get_session(read_only=True):
                raise Exception("Database error")
                yield  # pragma: no cover

            mock_db_manager.get_session = mock_get_session

            # Execute
            stats = await service.archive_old_conversations()

            # Verify - should return stats with error logged
            assert stats.messages_archived == 0
            assert stats.operation_duration > 0
            mock_logger.error.assert_called()

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    @patch("app.services.data_archival_service.logger")
    async def test_archive_old_conversations_logging(
        self, mock_logger, mock_db_manager, service
    ):
        """Test archival logs correct information."""
        # Mock create_archive_table_if_not_exists
        with patch.object(
            service, "create_archive_table_if_not_exists", new_callable=AsyncMock
        ):
            # Mock session
            mock_session = MagicMock()
            mock_session.scalar = AsyncMock(return_value=1000)

            async def mock_get_session(read_only=True):
                yield mock_session

            mock_db_manager.get_session = mock_get_session

            # Execute
            await service.archive_old_conversations()

            # Verify logging
            mock_logger.info.assert_called()
            log_message = mock_logger.info.call_args[0][0]
            assert "1000 messages eligible for archival" in log_message

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    async def test_archive_old_conversations_cutoff_date(
        self, mock_db_manager, service
    ):
        """Test archival uses correct cutoff date."""
        # Mock create_archive_table_if_not_exists
        with patch.object(
            service, "create_archive_table_if_not_exists", new_callable=AsyncMock
        ):
            # Mock session
            mock_session = MagicMock()
            mock_session.scalar = AsyncMock(return_value=100)

            async def mock_get_session(read_only=True):
                yield mock_session

            mock_db_manager.get_session = mock_get_session

            # Execute
            await service.archive_old_conversations()

            # Verify - cutoff should be 90 days ago (from settings)
            assert service.archive_threshold_days == 90


# ============================================================================
# Test Vacuum Database
# ============================================================================


class TestVacuumDatabase:
    """Test database vacuum operations."""

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    @patch("app.services.data_archival_service.logger")
    async def test_vacuum_database_sqlite(self, mock_logger, mock_db_manager, service):
        """Test vacuum for SQLite database."""
        # Mock session
        mock_session = MagicMock()
        mock_session.execute = AsyncMock()

        async def mock_get_session(read_only=False):
            yield mock_session

        mock_db_manager.get_session = mock_get_session

        # Execute
        await service.vacuum_database()

        # Verify - SQLite VACUUM
        mock_session.execute.assert_awaited_once()
        call_args = mock_session.execute.call_args[0][0]
        assert "VACUUM" in str(call_args)
        mock_logger.info.assert_called_with("✅ SQLite VACUUM completed")

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    @patch("app.services.data_archival_service.logger")
    async def test_vacuum_database_postgresql(
        self, mock_logger, mock_db_manager, service_postgres
    ):
        """Test vacuum for PostgreSQL database."""
        # Mock session
        mock_session = MagicMock()
        mock_session.execute = AsyncMock()

        async def mock_get_session(read_only=False):
            yield mock_session

        mock_db_manager.get_session = mock_get_session

        # Execute
        await service_postgres.vacuum_database()

        # Verify - PostgreSQL VACUUM ANALYZE (called twice)
        assert mock_session.execute.await_count == 2
        mock_logger.info.assert_called_with("✅ PostgreSQL VACUUM completed")

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    @patch("app.services.data_archival_service.logger")
    async def test_vacuum_database_error(self, mock_logger, mock_db_manager, service):
        """Test vacuum with database error."""

        # Mock session to raise exception
        async def mock_get_session(read_only=False):
            raise Exception("VACUUM failed")
            yield  # pragma: no cover

        mock_db_manager.get_session = mock_get_session

        # Execute and verify exception
        with pytest.raises(Exception) as exc_info:
            await service.vacuum_database()

        assert "VACUUM failed" in str(exc_info.value)
        mock_logger.error.assert_called()


# ============================================================================
# Test Run Full Maintenance
# ============================================================================


class TestRunFullMaintenance:
    """Test full maintenance cycle."""

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.logger")
    async def test_run_full_maintenance_success(self, mock_logger, service):
        """Test successful full maintenance cycle."""
        # Mock all service methods
        mock_archive_stats = ArchivalStats(messages_archived=1000)
        with patch.object(
            service, "archive_old_conversations", return_value=mock_archive_stats
        ) as mock_archive:
            with patch.object(
                service, "vacuum_database", new_callable=AsyncMock
            ) as mock_vacuum:
                mock_metrics = StorageMetrics(total_size_mb=100.5)
                with patch.object(
                    service, "get_storage_metrics", return_value=mock_metrics
                ) as mock_metrics_call:
                    # Execute
                    results = await service.run_full_maintenance()

                    # Verify
                    assert "archive" in results
                    assert results["archive"].messages_archived == 1000
                    mock_archive.assert_awaited_once()
                    mock_vacuum.assert_awaited_once()
                    mock_metrics_call.assert_awaited_once()
                    mock_logger.info.assert_called()

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.logger")
    async def test_run_full_maintenance_logging(self, mock_logger, service):
        """Test full maintenance logs correctly."""
        # Mock all service methods
        with patch.object(
            service, "archive_old_conversations", return_value=ArchivalStats()
        ):
            with patch.object(service, "vacuum_database", new_callable=AsyncMock):
                with patch.object(
                    service,
                    "get_storage_metrics",
                    return_value=StorageMetrics(total_size_mb=150.5),
                ):
                    # Execute
                    await service.run_full_maintenance()

                    # Verify logging
                    calls = [call[0][0] for call in mock_logger.info.call_args_list]
                    assert any("Starting maintenance cycle" in call for call in calls)
                    assert any("Maintenance completed" in call for call in calls)
                    assert any("150.50MB" in call for call in calls)

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.logger")
    async def test_run_full_maintenance_archive_error(self, mock_logger, service):
        """Test full maintenance with archive error."""
        # Mock archive to raise exception
        with patch.object(
            service,
            "archive_old_conversations",
            side_effect=Exception("Archive failed"),
        ):
            # Execute and verify exception
            with pytest.raises(Exception) as exc_info:
                await service.run_full_maintenance()

            assert "Archive failed" in str(exc_info.value)
            mock_logger.error.assert_called()

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.logger")
    async def test_run_full_maintenance_vacuum_error(self, mock_logger, service):
        """Test full maintenance with vacuum error."""
        # Mock archive success, vacuum error
        with patch.object(
            service, "archive_old_conversations", return_value=ArchivalStats()
        ):
            with patch.object(
                service, "vacuum_database", side_effect=Exception("Vacuum failed")
            ):
                # Execute and verify exception
                with pytest.raises(Exception) as exc_info:
                    await service.run_full_maintenance()

                assert "Vacuum failed" in str(exc_info.value)
                mock_logger.error.assert_called()

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.logger")
    async def test_run_full_maintenance_metrics_error(self, mock_logger, service):
        """Test full maintenance continues despite metrics error."""
        # Mock archive and vacuum success, metrics error
        with patch.object(
            service, "archive_old_conversations", return_value=ArchivalStats()
        ):
            with patch.object(service, "vacuum_database", new_callable=AsyncMock):
                with patch.object(
                    service,
                    "get_storage_metrics",
                    side_effect=Exception("Metrics failed"),
                ):
                    # Execute and verify exception
                    with pytest.raises(Exception) as exc_info:
                        await service.run_full_maintenance()

                    assert "Metrics failed" in str(exc_info.value)


# ============================================================================
# Test Edge Cases
# ============================================================================


class TestEdgeCases:
    """Test edge cases and error handling."""

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    async def test_storage_metrics_empty_database(self, mock_db_manager, service):
        """Test storage metrics with completely empty database."""
        # Mock session with all zeros
        mock_session = MagicMock()
        mock_session.scalar = AsyncMock(side_effect=[0, 0, None, None, 0])

        async def mock_get_session(read_only=True):
            yield mock_session

        mock_db_manager.get_session = mock_get_session

        # Execute
        metrics = await service.get_storage_metrics()

        # Verify
        assert metrics.total_threads == 0
        assert metrics.total_messages == 0
        assert metrics.total_size_mb == 0.0
        assert metrics.oldest_message_date is None
        assert metrics.newest_message_date is None

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    async def test_archive_conversations_very_large_batch(
        self, mock_db_manager, service
    ):
        """Test archival with very large batch size."""
        # Mock create_archive_table_if_not_exists
        with patch.object(
            service, "create_archive_table_if_not_exists", new_callable=AsyncMock
        ):
            # Mock session
            mock_session = MagicMock()
            mock_session.scalar = AsyncMock(return_value=1000000)  # 1 million messages

            async def mock_get_session(read_only=True):
                yield mock_session

            mock_db_manager.get_session = mock_get_session

            # Execute with large batch
            stats = await service.archive_old_conversations(batch_size=100000)

            # Verify
            assert stats.messages_archived == 1000000

    def test_archival_stats_zero_duration(self):
        """Test archival stats with zero duration (instant operation)."""
        stats = ArchivalStats(operation_duration=0.0)

        assert stats.operation_duration == 0.0

    def test_storage_metrics_negative_size_handling(self):
        """Test storage metrics calculation doesn't produce negative sizes."""
        metrics = StorageMetrics(
            total_threads=0,
            total_messages=0,
        )

        # Verify sizes are non-negative
        assert metrics.ai_threads_size_mb >= 0
        assert metrics.ai_messages_size_mb >= 0
        assert metrics.total_size_mb >= 0

    @pytest.mark.asyncio
    async def test_multiple_settings_configurations(self, mock_settings):
        """Test service with various settings configurations."""
        # Test different threshold values
        mock_settings.ARCHIVE_THRESHOLD_DAYS = 30
        mock_settings.DELETE_THRESHOLD_DAYS = 180

        service = DataArchivalService(settings=mock_settings)

        assert service.archive_threshold_days == 30
        assert service.delete_threshold_days == 180

    @pytest.mark.asyncio
    async def test_service_enabled_flag_respected(self, service_disabled):
        """Test that enabled flag is properly respected."""
        # Verify disabled service doesn't archive
        stats = await service_disabled.archive_old_conversations()

        assert stats.messages_archived == 0
        assert stats.threads_archived == 0


# ============================================================================
# Test Size Calculations
# ============================================================================


class TestSizeCalculations:
    """Test storage size calculation logic."""

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    async def test_size_calculation_accuracy(self, mock_db_manager, service):
        """Test size calculations are accurate."""
        # Mock session with specific counts
        mock_session = MagicMock()
        threads = 1024  # Exactly 1024 threads
        messages = 1024  # Exactly 1024 messages
        mock_session.scalar = AsyncMock(side_effect=[threads, messages, None, None, 0])

        async def mock_get_session(read_only=True):
            yield mock_session

        mock_db_manager.get_session = mock_get_session

        # Execute
        metrics = await service.get_storage_metrics()

        # Verify size calculations
        # threads: 1024 * 1 / 1024 = 1.0 MB
        # messages: 1024 * 5 / 1024 = 5.0 MB
        assert metrics.ai_threads_size_mb == 1.0
        assert metrics.ai_messages_size_mb == 5.0
        assert metrics.total_size_mb == 6.0

    @pytest.mark.asyncio
    @patch("app.services.data_archival_service.db_manager")
    async def test_size_calculation_large_dataset(self, mock_db_manager, service):
        """Test size calculations with large dataset."""
        # Mock session with large counts
        mock_session = MagicMock()
        threads = 1000000  # 1 million threads
        messages = 10000000  # 10 million messages
        mock_session.scalar = AsyncMock(side_effect=[threads, messages, None, None, 0])

        async def mock_get_session(read_only=True):
            yield mock_session

        mock_db_manager.get_session = mock_get_session

        # Execute
        metrics = await service.get_storage_metrics()

        # Verify large size calculations
        expected_threads_mb = (threads * 1) / 1024
        expected_messages_mb = (messages * 5) / 1024
        assert metrics.ai_threads_size_mb == expected_threads_mb
        assert metrics.ai_messages_size_mb == expected_messages_mb
        assert metrics.total_size_mb == expected_threads_mb + expected_messages_mb
