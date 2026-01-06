"""
Comprehensive tests for app/services/database_migration.py

Tests database migration service with mocked database sessions.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


class TestDatabaseMigrationServiceInit:
    """Tests for DatabaseMigrationService initialization"""

    def test_init_creates_empty_migrations_list(self):
        """Should initialize with empty migrations_applied list"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()
        assert service.migrations_applied == []

    def test_init_is_instance(self):
        """Should create valid service instance"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()
        assert isinstance(service, DatabaseMigrationService)


class TestCheckMigrationStatus:
    """Tests for check_migration_status method"""

    @pytest.mark.asyncio
    async def test_creates_migration_table_if_not_exists(self):
        """Should create migrations table if it doesn't exist"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()

        mock_session = AsyncMock()
        # First query: check if table exists (returns None = doesn't exist)
        mock_result_no_table = MagicMock()
        mock_result_no_table.fetchone.return_value = None

        # Second query: after creating table, get applied migrations
        mock_result_applied = MagicMock()
        mock_result_applied.fetchall.return_value = []

        mock_session.execute.side_effect = [
            mock_result_no_table,  # Check table exists
            None,  # Create table
            mock_result_applied,  # Get applied migrations
        ]

        async def mock_get_db():
            yield mock_session

        with patch("app.services.database_migration.get_db_session", mock_get_db):
            result = await service.check_migration_status()

        assert result["migrations_table_exists"] is True
        assert result["applied_migrations"] == []
        assert result["pending_migrations"] == []
        mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_returns_applied_migrations_when_table_exists(self):
        """Should return list of applied migrations"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()

        mock_session = AsyncMock()
        # Table exists
        mock_result_table = MagicMock()
        mock_result_table.fetchone.return_value = ("migrations",)

        # Applied migrations
        mock_result_applied = MagicMock()
        mock_result_applied.fetchall.return_value = [
            ("001_initial_indexes",),
            ("002_performance_indexes",),
        ]

        mock_session.execute.side_effect = [mock_result_table, mock_result_applied]

        async def mock_get_db():
            yield mock_session

        with patch("app.services.database_migration.get_db_session", mock_get_db):
            result = await service.check_migration_status()

        assert result["migrations_table_exists"] is True
        assert "001_initial_indexes" in result["applied_migrations"]
        assert "002_performance_indexes" in result["applied_migrations"]

    @pytest.mark.asyncio
    async def test_handles_database_error(self):
        """Should handle database errors gracefully"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()

        mock_session = AsyncMock()
        mock_session.execute.side_effect = Exception("Database connection failed")

        async def mock_get_db():
            yield mock_session

        with patch("app.services.database_migration.get_db_session", mock_get_db):
            result = await service.check_migration_status()

        assert result["migrations_table_exists"] is False
        assert result["applied_migrations"] == []
        assert "error" in result


class TestApplyMigration:
    """Tests for apply_migration method"""

    @pytest.mark.asyncio
    async def test_applies_new_migration_successfully(self):
        """Should apply migration and record it"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()

        mock_session = AsyncMock()
        # Check if already applied (not found)
        mock_result_check = MagicMock()
        mock_result_check.fetchone.return_value = None

        mock_session.execute.side_effect = [
            mock_result_check,  # Check if applied
            None,  # Apply migration SQL
            None,  # Insert into migrations table
        ]

        async def mock_get_db():
            yield mock_session

        with patch("app.services.database_migration.get_db_session", mock_get_db):
            result = await service.apply_migration(
                "test_migration", "CREATE TABLE test (id INT)"
            )

        assert result is True
        assert "test_migration" in service.migrations_applied
        mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_skips_already_applied_migration(self):
        """Should skip migration if already applied"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()

        mock_session = AsyncMock()
        # Check if already applied (found)
        mock_result_check = MagicMock()
        mock_result_check.fetchone.return_value = (1,)  # ID of existing migration

        mock_session.execute.return_value = mock_result_check

        async def mock_get_db():
            yield mock_session

        with patch("app.services.database_migration.get_db_session", mock_get_db):
            result = await service.apply_migration("existing_migration", "SELECT 1")

        assert result is True
        assert "existing_migration" not in service.migrations_applied

    @pytest.mark.asyncio
    async def test_handles_migration_error(self):
        """Should handle migration errors and return False"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()

        mock_session = AsyncMock()
        mock_session.execute.side_effect = Exception("SQL syntax error")

        async def mock_get_db():
            yield mock_session

        with patch("app.services.database_migration.get_db_session", mock_get_db):
            result = await service.apply_migration("bad_migration", "INVALID SQL")

        assert result is False
        assert "bad_migration" not in service.migrations_applied


class TestRunMigrations:
    """Tests for run_migrations method"""

    @pytest.mark.asyncio
    async def test_runs_all_migrations(self):
        """Should run all defined migrations"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()

        # Mock apply_migration to succeed for all
        with patch.object(
            service, "apply_migration", new_callable=AsyncMock
        ) as mock_apply:
            mock_apply.return_value = True
            result = await service.run_migrations()

        assert result["total_applied"] == 2
        assert len(result["migrations_run"]) == 2
        assert len(result["migrations_failed"]) == 0
        assert "001_initial_indexes" in result["migrations_run"]
        assert "002_performance_indexes" in result["migrations_run"]

    @pytest.mark.asyncio
    async def test_tracks_failed_migrations(self):
        """Should track failed migrations separately"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()

        # First succeeds, second fails
        with patch.object(
            service, "apply_migration", new_callable=AsyncMock
        ) as mock_apply:
            mock_apply.side_effect = [True, False]
            result = await service.run_migrations()

        assert result["total_applied"] == 1
        assert len(result["migrations_run"]) == 1
        assert len(result["migrations_failed"]) == 1

    @pytest.mark.asyncio
    async def test_handles_all_failures(self):
        """Should handle case where all migrations fail"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()

        with patch.object(
            service, "apply_migration", new_callable=AsyncMock
        ) as mock_apply:
            mock_apply.return_value = False
            result = await service.run_migrations()

        assert result["total_applied"] == 0
        assert len(result["migrations_run"]) == 0
        assert len(result["migrations_failed"]) == 2


class TestRollbackMigration:
    """Tests for rollback_migration method"""

    @pytest.mark.asyncio
    async def test_rollback_returns_false(self):
        """Should return False as rollback is not implemented"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()
        result = await service.rollback_migration("any_migration")
        assert result is False

    @pytest.mark.asyncio
    async def test_rollback_logs_warning(self):
        """Should log warning about unimplemented feature"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()

        with patch("app.services.database_migration.logger") as mock_logger:
            await service.rollback_migration("test_migration")
            mock_logger.warning.assert_called_once()
            assert "test_migration" in str(mock_logger.warning.call_args)


class TestGetAppliedMigrations:
    """Tests for get_applied_migrations method"""

    def test_returns_empty_list_initially(self):
        """Should return empty list before any migrations"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()
        result = service.get_applied_migrations()
        assert result == []

    def test_returns_copy_of_applied_migrations(self):
        """Should return a copy, not the original list"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()
        service.migrations_applied = ["migration_1", "migration_2"]

        result = service.get_applied_migrations()

        # Modify returned list
        result.append("migration_3")

        # Original should be unchanged
        assert len(service.migrations_applied) == 2
        assert "migration_3" not in service.migrations_applied

    def test_returns_all_applied_migrations(self):
        """Should return all migrations applied in session"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()
        service.migrations_applied = ["m1", "m2", "m3"]

        result = service.get_applied_migrations()
        assert result == ["m1", "m2", "m3"]


class TestEdgeCases:
    """Edge case tests"""

    @pytest.mark.asyncio
    async def test_empty_migration_sql(self):
        """Should handle empty SQL string"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()

        mock_session = AsyncMock()
        mock_result_check = MagicMock()
        mock_result_check.fetchone.return_value = None

        mock_session.execute.side_effect = [mock_result_check, None, None]

        async def mock_get_db():
            yield mock_session

        with patch("app.services.database_migration.get_db_session", mock_get_db):
            result = await service.apply_migration("empty_migration", "")

        assert result is True

    def test_migrations_applied_tracks_only_session(self):
        """Should only track migrations applied in current session"""
        from app.services.database_migration import DatabaseMigrationService

        service1 = DatabaseMigrationService()
        service2 = DatabaseMigrationService()

        service1.migrations_applied.append("m1")

        assert service1.get_applied_migrations() == ["m1"]
        assert service2.get_applied_migrations() == []

    @pytest.mark.asyncio
    async def test_check_migration_status_no_session_yielded(self):
        """Should handle case when async generator doesn't yield"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()

        # Mock generator that doesn't yield anything
        async def mock_get_db_empty():
            return
            yield  # Never executed, makes it a generator

        with patch("app.services.database_migration.get_db_session", mock_get_db_empty):
            result = await service.check_migration_status()

        # Should return fallback response
        assert result["migrations_table_exists"] is False
        assert result["applied_migrations"] == []

    @pytest.mark.asyncio
    async def test_apply_migration_no_session_yielded(self):
        """Should handle case when async generator doesn't yield in apply_migration"""
        from app.services.database_migration import DatabaseMigrationService

        service = DatabaseMigrationService()

        # Mock generator that doesn't yield anything
        async def mock_get_db_empty():
            return
            yield  # Never executed, makes it a generator

        with patch("app.services.database_migration.get_db_session", mock_get_db_empty):
            result = await service.apply_migration("test", "SELECT 1")

        assert result is False
        assert "test" not in service.migrations_applied
