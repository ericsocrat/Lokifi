"""
Comprehensive tests for app.tasks.maintenance

Tests Celery tasks for data archival and maintenance operations.
"""

from dataclasses import dataclass
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ============================================================================
# TEST FIXTURES AND MOCKS
# ============================================================================


@dataclass
class MockArchivalStats:
    """Mock ArchivalStats for testing"""

    threads_archived: int = 10
    messages_archived: int = 100
    messages_compressed: int = 50
    messages_deleted: int = 25
    space_freed_mb: float = 5.5
    operation_duration: float = 1.5


@dataclass
class MockStorageMetrics:
    """Mock StorageMetrics for testing"""

    total_size_mb: float = 100.0
    ai_threads_size_mb: float = 20.0
    ai_messages_size_mb: float = 80.0
    ai_messages_archive_size_mb: float = 10.0
    oldest_message_date: datetime | None = None
    newest_message_date: datetime | None = None
    total_threads: int = 500
    total_messages: int = 5000
    archived_messages: int = 1000


@pytest.fixture
def mock_settings():
    """Mock Settings object"""
    settings = MagicMock()
    settings.redis_url = "redis://localhost:6379/0"
    settings.ARCHIVE_THRESHOLD_DAYS = 90
    settings.DELETE_THRESHOLD_DAYS = 365
    settings.ENABLE_DATA_ARCHIVAL = True
    return settings


@pytest.fixture
def mock_archival_service():
    """Mock DataArchivalService"""
    service = AsyncMock()
    service.archive_old_conversations = AsyncMock(return_value=MockArchivalStats())
    service.compress_old_messages = AsyncMock(return_value=MockArchivalStats())
    service.delete_expired_conversations = AsyncMock(return_value=MockArchivalStats())
    service.run_full_maintenance = AsyncMock(
        return_value={
            "archive": MockArchivalStats(),
            "compress": MockArchivalStats(),
            "delete": MockArchivalStats(),
        }
    )
    service.get_storage_metrics = AsyncMock(return_value=MockStorageMetrics())
    service.vacuum_database = AsyncMock()
    return service


@pytest.fixture
def mock_db_manager():
    """Mock database manager"""
    manager = AsyncMock()
    manager.initialize = AsyncMock()
    return manager


# ============================================================================
# CELERY APP CONFIGURATION TESTS
# ============================================================================


class TestCeleryConfiguration:
    """Test Celery app configuration"""

    def test_celery_app_exists(self):
        """Test that celery_app is created"""
        with patch("app.tasks.maintenance.Settings") as mock_settings_cls:
            mock_settings_cls.return_value.redis_url = "redis://localhost:6379/0"
            # Import fresh to get the module
            import importlib

            import app.tasks.maintenance as maintenance_module

            importlib.reload(maintenance_module)
            assert maintenance_module.celery_app is not None

    def test_celery_config_has_json_serializer(self):
        """Test Celery uses JSON serialization"""
        with patch("app.tasks.maintenance.Settings") as mock_settings_cls:
            mock_settings_cls.return_value.redis_url = "redis://localhost:6379/0"
            from app.tasks.maintenance import celery_app

            assert celery_app.conf.task_serializer == "json"
            assert "json" in celery_app.conf.accept_content

    def test_celery_config_has_utc_timezone(self):
        """Test Celery uses UTC timezone"""
        with patch("app.tasks.maintenance.Settings") as mock_settings_cls:
            mock_settings_cls.return_value.redis_url = "redis://localhost:6379/0"
            from app.tasks.maintenance import celery_app

            assert celery_app.conf.timezone == "UTC"
            assert celery_app.conf.enable_utc is True

    def test_celery_config_has_time_limits(self):
        """Test Celery has proper time limits"""
        with patch("app.tasks.maintenance.Settings") as mock_settings_cls:
            mock_settings_cls.return_value.redis_url = "redis://localhost:6379/0"
            from app.tasks.maintenance import celery_app

            assert celery_app.conf.task_time_limit == 30 * 60  # 30 minutes
            assert celery_app.conf.task_soft_time_limit == 25 * 60  # 25 minutes

    def test_celery_beat_schedule_has_daily_archival(self):
        """Test beat schedule includes daily archival"""
        with patch("app.tasks.maintenance.Settings") as mock_settings_cls:
            mock_settings_cls.return_value.redis_url = "redis://localhost:6379/0"
            from app.tasks.maintenance import celery_app

            assert "daily-archival" in celery_app.conf.beat_schedule
            schedule = celery_app.conf.beat_schedule["daily-archival"]
            assert schedule["task"] == "app.tasks.maintenance.daily_archival_task"

    def test_celery_beat_schedule_has_weekly_compression(self):
        """Test beat schedule includes weekly compression"""
        with patch("app.tasks.maintenance.Settings") as mock_settings_cls:
            mock_settings_cls.return_value.redis_url = "redis://localhost:6379/0"
            from app.tasks.maintenance import celery_app

            assert "weekly-compression" in celery_app.conf.beat_schedule
            schedule = celery_app.conf.beat_schedule["weekly-compression"]
            assert schedule["task"] == "app.tasks.maintenance.weekly_compression_task"

    def test_celery_beat_schedule_has_monthly_maintenance(self):
        """Test beat schedule includes monthly maintenance"""
        with patch("app.tasks.maintenance.Settings") as mock_settings_cls:
            mock_settings_cls.return_value.redis_url = "redis://localhost:6379/0"
            from app.tasks.maintenance import celery_app

            assert "monthly-maintenance" in celery_app.conf.beat_schedule
            schedule = celery_app.conf.beat_schedule["monthly-maintenance"]
            assert schedule["task"] == "app.tasks.maintenance.monthly_maintenance_task"

    def test_celery_beat_schedule_has_weekly_metrics(self):
        """Test beat schedule includes weekly metrics collection"""
        with patch("app.tasks.maintenance.Settings") as mock_settings_cls:
            mock_settings_cls.return_value.redis_url = "redis://localhost:6379/0"
            from app.tasks.maintenance import celery_app

            assert "weekly-metrics" in celery_app.conf.beat_schedule
            schedule = celery_app.conf.beat_schedule["weekly-metrics"]
            assert (
                schedule["task"] == "app.tasks.maintenance.collect_storage_metrics_task"
            )


# ============================================================================
# DAILY ARCHIVAL TASK TESTS
# ============================================================================


class TestDailyArchivalTask:
    """Test daily archival task"""

    def test_daily_archival_returns_dict(self):
        """Test that daily_archival_task returns a dictionary"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.archive_old_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import daily_archival_task

            result = daily_archival_task()

            assert isinstance(result, dict)
            assert "task" in result
            assert result["task"] == "daily_archival"

    def test_daily_archival_success_returns_stats(self):
        """Test successful daily archival returns stats"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_stats = MockArchivalStats()
            mock_service.archive_old_conversations = AsyncMock(return_value=mock_stats)
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import daily_archival_task

            result = daily_archival_task()

            assert result["success"] is True
            assert "stats" in result
            assert result["stats"]["threads_archived"] == mock_stats.threads_archived
            assert result["stats"]["messages_archived"] == mock_stats.messages_archived

    def test_daily_archival_includes_timestamp(self):
        """Test daily archival result includes timestamp"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.archive_old_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import daily_archival_task

            result = daily_archival_task()

            assert "timestamp" in result
            # Validate timestamp is ISO format
            datetime.fromisoformat(result["timestamp"])

    def test_daily_archival_handles_exception(self):
        """Test daily archival handles exceptions gracefully"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.archive_old_conversations = AsyncMock(
                side_effect=Exception("Database error")
            )
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import daily_archival_task

            result = daily_archival_task()

            assert result["success"] is False
            assert "error" in result
            assert "Database error" in result["error"]

    def test_daily_archival_uses_batch_size(self):
        """Test daily archival uses correct batch size"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.archive_old_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import daily_archival_task

            daily_archival_task()

            mock_service.archive_old_conversations.assert_called_once_with(
                batch_size=5000
            )


# ============================================================================
# WEEKLY COMPRESSION TASK TESTS
# ============================================================================


class TestWeeklyCompressionTask:
    """Test weekly compression task"""

    def test_weekly_compression_returns_dict(self):
        """Test that weekly_compression_task returns a dictionary"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.compress_old_messages = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import weekly_compression_task

            result = weekly_compression_task()

            assert isinstance(result, dict)
            assert result["task"] == "weekly_compression"

    def test_weekly_compression_success_returns_stats(self):
        """Test successful weekly compression returns stats"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_stats = MockArchivalStats()
            mock_service.compress_old_messages = AsyncMock(return_value=mock_stats)
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import weekly_compression_task

            result = weekly_compression_task()

            assert result["success"] is True
            assert "stats" in result
            assert (
                result["stats"]["messages_compressed"] == mock_stats.messages_compressed
            )
            assert result["stats"]["space_freed_mb"] == mock_stats.space_freed_mb

    def test_weekly_compression_handles_exception(self):
        """Test weekly compression handles exceptions gracefully"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.compress_old_messages = AsyncMock(
                side_effect=Exception("Compression failed")
            )
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import weekly_compression_task

            result = weekly_compression_task()

            assert result["success"] is False
            assert "Compression failed" in result["error"]

    def test_weekly_compression_uses_batch_size(self):
        """Test weekly compression uses correct batch size"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.compress_old_messages = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import weekly_compression_task

            weekly_compression_task()

            mock_service.compress_old_messages.assert_called_once_with(batch_size=1000)


# ============================================================================
# MONTHLY MAINTENANCE TASK TESTS
# ============================================================================


class TestMonthlyMaintenanceTask:
    """Test monthly maintenance task"""

    def test_monthly_maintenance_returns_dict(self):
        """Test that monthly_maintenance_task returns a dictionary"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.run_full_maintenance = AsyncMock(
                return_value={"archive": MockArchivalStats()}
            )
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import monthly_maintenance_task

            result = monthly_maintenance_task()

            assert isinstance(result, dict)
            assert result["task"] == "monthly_maintenance"

    def test_monthly_maintenance_success_returns_results(self):
        """Test successful monthly maintenance returns results"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.run_full_maintenance = AsyncMock(
                return_value={
                    "archive": MockArchivalStats(),
                    "compress": MockArchivalStats(),
                }
            )
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import monthly_maintenance_task

            result = monthly_maintenance_task()

            assert result["success"] is True
            assert "maintenance_results" in result
            assert "archive" in result["maintenance_results"]
            assert "compress" in result["maintenance_results"]

    def test_monthly_maintenance_handles_exception(self):
        """Test monthly maintenance handles exceptions gracefully"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.run_full_maintenance = AsyncMock(
                side_effect=Exception("Maintenance failed")
            )
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import monthly_maintenance_task

            result = monthly_maintenance_task()

            assert result["success"] is False
            assert "Maintenance failed" in result["error"]


# ============================================================================
# COLLECT STORAGE METRICS TASK TESTS
# ============================================================================


class TestCollectStorageMetricsTask:
    """Test storage metrics collection task"""

    def test_collect_metrics_returns_dict(self):
        """Test that collect_storage_metrics_task returns a dictionary"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.get_storage_metrics = AsyncMock(
                return_value=MockStorageMetrics()
            )
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import collect_storage_metrics_task

            result = collect_storage_metrics_task()

            assert isinstance(result, dict)
            assert result["task"] == "collect_storage_metrics"

    def test_collect_metrics_success_returns_metrics(self):
        """Test successful metrics collection returns metrics"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_metrics = MockStorageMetrics()
            mock_service.get_storage_metrics = AsyncMock(return_value=mock_metrics)
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import collect_storage_metrics_task

            result = collect_storage_metrics_task()

            assert result["success"] is True
            assert "metrics" in result
            assert result["metrics"]["total_size_mb"] == mock_metrics.total_size_mb
            assert result["metrics"]["total_threads"] == mock_metrics.total_threads
            assert result["metrics"]["total_messages"] == mock_metrics.total_messages

    def test_collect_metrics_handles_date_serialization(self):
        """Test metrics handles datetime serialization"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_metrics = MockStorageMetrics()
            mock_metrics.oldest_message_date = datetime(2024, 1, 1, 12, 0, 0)
            mock_metrics.newest_message_date = datetime(2024, 12, 31, 23, 59, 59)
            mock_service.get_storage_metrics = AsyncMock(return_value=mock_metrics)
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import collect_storage_metrics_task

            result = collect_storage_metrics_task()

            assert result["metrics"]["oldest_message_date"] == "2024-01-01T12:00:00"
            assert result["metrics"]["newest_message_date"] == "2024-12-31T23:59:59"

    def test_collect_metrics_handles_null_dates(self):
        """Test metrics handles null dates gracefully"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_metrics = MockStorageMetrics()
            mock_metrics.oldest_message_date = None
            mock_metrics.newest_message_date = None
            mock_service.get_storage_metrics = AsyncMock(return_value=mock_metrics)
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import collect_storage_metrics_task

            result = collect_storage_metrics_task()

            assert result["metrics"]["oldest_message_date"] is None
            assert result["metrics"]["newest_message_date"] is None

    def test_collect_metrics_handles_exception(self):
        """Test metrics collection handles exceptions gracefully"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.get_storage_metrics = AsyncMock(
                side_effect=Exception("Metrics failed")
            )
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import collect_storage_metrics_task

            result = collect_storage_metrics_task()

            assert result["success"] is False
            assert "Metrics failed" in result["error"]

    def test_collect_metrics_warns_on_large_database(self):
        """Test metrics logs warning for large database"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
            patch("app.tasks.maintenance.logger") as mock_logger,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_metrics = MockStorageMetrics()
            mock_metrics.total_size_mb = 15000.0  # 15 GB
            mock_service.get_storage_metrics = AsyncMock(return_value=mock_metrics)
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import collect_storage_metrics_task

            result = collect_storage_metrics_task()

            assert result["success"] is True
            # Check warning was logged
            mock_logger.warning.assert_called()

    def test_collect_metrics_warns_on_high_message_count(self):
        """Test metrics logs warning for high message count"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
            patch("app.tasks.maintenance.logger") as mock_logger,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_metrics = MockStorageMetrics()
            mock_metrics.total_messages = 15_000_000  # 15M messages
            mock_service.get_storage_metrics = AsyncMock(return_value=mock_metrics)
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import collect_storage_metrics_task

            result = collect_storage_metrics_task()

            assert result["success"] is True
            # Check warning was logged for high message count
            mock_logger.warning.assert_called()


# ============================================================================
# EMERGENCY CLEANUP TASK TESTS
# ============================================================================


class TestEmergencyCleanupTask:
    """Test emergency cleanup task"""

    def test_emergency_cleanup_returns_dict(self):
        """Test that emergency_cleanup_task returns a dictionary"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.get_storage_metrics = AsyncMock(
                return_value=MockStorageMetrics()
            )
            mock_service.archive_old_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.compress_old_messages = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.delete_expired_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.vacuum_database = AsyncMock()
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import emergency_cleanup_task

            result = emergency_cleanup_task()

            assert isinstance(result, dict)
            assert result["task"] == "emergency_cleanup"

    def test_emergency_cleanup_success_returns_stats(self):
        """Test successful emergency cleanup returns stats"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()

            # Before metrics (larger)
            before_metrics = MockStorageMetrics()
            before_metrics.total_size_mb = 200.0

            # After metrics (smaller)
            after_metrics = MockStorageMetrics()
            after_metrics.total_size_mb = 150.0

            mock_service.get_storage_metrics = AsyncMock(
                side_effect=[before_metrics, after_metrics]
            )
            mock_service.archive_old_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.compress_old_messages = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.delete_expired_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.vacuum_database = AsyncMock()
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import emergency_cleanup_task

            result = emergency_cleanup_task()

            assert result["success"] is True
            assert result["before_size_mb"] == 200.0
            assert result["after_size_mb"] == 150.0
            assert result["space_freed_mb"] == 50.0

    def test_emergency_cleanup_with_force_delete_days(self):
        """Test emergency cleanup with custom force_delete_days"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.get_storage_metrics = AsyncMock(
                return_value=MockStorageMetrics()
            )
            mock_service.archive_old_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.compress_old_messages = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.delete_expired_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.vacuum_database = AsyncMock()
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import emergency_cleanup_task

            result = emergency_cleanup_task(force_delete_days=30)

            assert result["success"] is True
            # Verify delete_threshold_days was set
            assert mock_service.delete_threshold_days == 30

    def test_emergency_cleanup_handles_exception(self):
        """Test emergency cleanup handles exceptions gracefully"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.get_storage_metrics = AsyncMock(
                side_effect=Exception("Cleanup failed")
            )
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import emergency_cleanup_task

            result = emergency_cleanup_task()

            assert result["success"] is False
            assert "Cleanup failed" in result["error"]

    def test_emergency_cleanup_calls_vacuum(self):
        """Test emergency cleanup calls vacuum_database"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.get_storage_metrics = AsyncMock(
                return_value=MockStorageMetrics()
            )
            mock_service.archive_old_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.compress_old_messages = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.delete_expired_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.vacuum_database = AsyncMock()
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import emergency_cleanup_task

            emergency_cleanup_task()

            mock_service.vacuum_database.assert_called_once()

    def test_emergency_cleanup_uses_larger_batch_sizes(self):
        """Test emergency cleanup uses larger batch sizes"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.get_storage_metrics = AsyncMock(
                return_value=MockStorageMetrics()
            )
            mock_service.archive_old_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.compress_old_messages = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.delete_expired_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.vacuum_database = AsyncMock()
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import emergency_cleanup_task

            emergency_cleanup_task()

            mock_service.archive_old_conversations.assert_called_once_with(
                batch_size=10000
            )
            mock_service.compress_old_messages.assert_called_once_with(batch_size=5000)


# ============================================================================
# RUN_TASK_NOW UTILITY TESTS
# ============================================================================


class TestRunTaskNow:
    """Test run_task_now utility function"""

    def test_run_task_now_raises_for_invalid_task(self):
        """Test run_task_now raises ValueError for invalid task"""
        from app.tasks.maintenance import run_task_now

        with pytest.raises(ValueError, match="Unknown task"):
            run_task_now("invalid_task_name")

    def test_run_task_now_calls_delay(self):
        """Test run_task_now calls task.delay()"""
        with patch("app.tasks.maintenance.daily_archival_task") as mock_task:
            mock_task.delay = MagicMock(return_value=MagicMock())

            from app.tasks.maintenance import run_task_now

            run_task_now("daily_archival")

            mock_task.delay.assert_called_once()

    def test_run_task_now_passes_kwargs(self):
        """Test run_task_now passes kwargs to task"""
        with patch("app.tasks.maintenance.emergency_cleanup_task") as mock_task:
            mock_task.delay = MagicMock(return_value=MagicMock())

            from app.tasks.maintenance import run_task_now

            run_task_now("emergency_cleanup", force_delete_days=15)

            mock_task.delay.assert_called_once_with(force_delete_days=15)

    def test_run_task_now_weekly_compression(self):
        """Test run_task_now with weekly_compression task"""
        with patch("app.tasks.maintenance.weekly_compression_task") as mock_task:
            mock_task.delay = MagicMock(return_value=MagicMock())

            from app.tasks.maintenance import run_task_now

            run_task_now("weekly_compression")

            mock_task.delay.assert_called_once()

    def test_run_task_now_monthly_maintenance(self):
        """Test run_task_now with monthly_maintenance task"""
        with patch("app.tasks.maintenance.monthly_maintenance_task") as mock_task:
            mock_task.delay = MagicMock(return_value=MagicMock())

            from app.tasks.maintenance import run_task_now

            run_task_now("monthly_maintenance")

            mock_task.delay.assert_called_once()

    def test_run_task_now_collect_metrics(self):
        """Test run_task_now with collect_metrics task"""
        with patch("app.tasks.maintenance.collect_storage_metrics_task") as mock_task:
            mock_task.delay = MagicMock(return_value=MagicMock())

            from app.tasks.maintenance import run_task_now

            run_task_now("collect_metrics")

            mock_task.delay.assert_called_once()


# ============================================================================
# ASYNC LOOP HANDLING TESTS
# ============================================================================


class TestAsyncLoopHandling:
    """Test async event loop handling in tasks"""

    def test_daily_archival_creates_new_event_loop(self):
        """Test daily archival creates and closes event loop"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.archive_old_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import daily_archival_task

            # Task should complete without event loop issues
            result = daily_archival_task()

            assert result["success"] is True


# ============================================================================
# DATABASE INITIALIZATION TESTS
# ============================================================================


class TestDatabaseInitialization:
    """Test database initialization in tasks"""

    def test_daily_archival_initializes_database(self):
        """Test daily_archival initializes database"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.archive_old_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import daily_archival_task

            daily_archival_task()

            mock_db.initialize.assert_called()


# ============================================================================
# LOGGING TESTS
# ============================================================================


class TestLogging:
    """Test logging behavior in tasks"""

    def test_daily_archival_logs_success(self):
        """Test daily archival logs success"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
            patch("app.tasks.maintenance.logger") as mock_logger,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.archive_old_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import daily_archival_task

            daily_archival_task()

            mock_logger.info.assert_called()

    def test_daily_archival_logs_error(self):
        """Test daily archival logs error on failure"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
            patch("app.tasks.maintenance.logger") as mock_logger,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.archive_old_conversations = AsyncMock(
                side_effect=Exception("Test error")
            )
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import daily_archival_task

            daily_archival_task()

            mock_logger.error.assert_called()


# ============================================================================
# EDGE CASES TESTS
# ============================================================================


class TestEdgeCases:
    """Test edge cases and boundary conditions"""

    def test_emergency_cleanup_with_zero_space_freed(self):
        """Test emergency cleanup when no space is freed"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()

            # Same size before and after
            same_metrics = MockStorageMetrics()
            same_metrics.total_size_mb = 100.0

            mock_service.get_storage_metrics = AsyncMock(return_value=same_metrics)
            mock_service.archive_old_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.compress_old_messages = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.delete_expired_conversations = AsyncMock(
                return_value=MockArchivalStats()
            )
            mock_service.vacuum_database = AsyncMock()
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import emergency_cleanup_task

            result = emergency_cleanup_task()

            assert result["success"] is True
            assert result["space_freed_mb"] == 0.0

    def test_monthly_maintenance_with_empty_results(self):
        """Test monthly maintenance with empty results"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()
            mock_service.run_full_maintenance = AsyncMock(return_value={})
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import monthly_maintenance_task

            result = monthly_maintenance_task()

            assert result["success"] is True
            assert result["maintenance_results"] == {}

    def test_collect_metrics_boundary_values(self):
        """Test metrics collection with boundary values"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()

            # Test with exactly 10 GB (boundary for warning)
            mock_metrics = MockStorageMetrics()
            mock_metrics.total_size_mb = 10 * 1024  # 10 GB exactly
            mock_service.get_storage_metrics = AsyncMock(return_value=mock_metrics)
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import collect_storage_metrics_task

            result = collect_storage_metrics_task()

            assert result["success"] is True

    def test_collect_metrics_exactly_10m_messages(self):
        """Test metrics with exactly 10M messages (boundary)"""
        with (
            patch("app.core.database.db_manager") as mock_db,
            patch("app.tasks.maintenance.DataArchivalService") as mock_service_cls,
        ):
            mock_db.initialize = AsyncMock()
            mock_service = AsyncMock()

            mock_metrics = MockStorageMetrics()
            mock_metrics.total_messages = 10_000_000  # Exactly 10M
            mock_service.get_storage_metrics = AsyncMock(return_value=mock_metrics)
            mock_service_cls.return_value = mock_service

            from app.tasks.maintenance import collect_storage_metrics_task

            result = collect_storage_metrics_task()

            assert result["success"] is True
