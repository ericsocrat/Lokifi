"""
Tests for app.enhanced_startup

Comprehensive tests for the enhanced startup sequence.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.enhanced_startup import (
    EnhancedSettings,
    HealthStatus,
    create_app,
    enhanced_settings,
    health_status,
    run_database_migrations,
    shutdown_sequence,
    verify_database_connectivity,
    verify_redis_connectivity,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def fresh_health_status():
    """Create a fresh HealthStatus instance."""
    return HealthStatus()


@pytest.fixture
def mock_settings():
    """Create mock settings."""
    settings = MagicMock(spec=EnhancedSettings)
    settings.HOST = "0.0.0.0"
    settings.PORT = 8000
    settings.WORKERS = 1
    settings.DATABASE_URL = "sqlite+aiosqlite:///./test.db"
    settings.RUN_MIGRATIONS = True
    settings.REDIS_URL = "redis://localhost:6379"
    settings.REDIS_PASSWORD = None
    settings.JWT_SECRET_KEY = "test-secret"
    settings.CORS_ORIGINS = ["http://localhost:3000"]
    settings.ENABLE_WEBSOCKETS = True
    settings.ENABLE_MONITORING = True
    settings.ENABLE_REDIS = True
    settings.ENVIRONMENT = "testing"
    settings.DEBUG = True
    return settings


# ============================================================================
# ENHANCED SETTINGS TESTS
# ============================================================================


class TestEnhancedSettings:
    """Tests for EnhancedSettings configuration class."""

    def test_host_is_string(self):
        """Test host is a string."""
        settings = EnhancedSettings()
        assert isinstance(settings.HOST, str)

    def test_port_is_int(self):
        """Test port is an integer."""
        settings = EnhancedSettings()
        assert isinstance(settings.PORT, int)

    def test_workers_is_int(self):
        """Test workers is an integer."""
        settings = EnhancedSettings()
        assert isinstance(settings.WORKERS, int)

    def test_database_url_is_string(self):
        """Test database URL is a string."""
        settings = EnhancedSettings()
        assert isinstance(settings.DATABASE_URL, str)
        # Should be a valid connection string
        assert "://" in settings.DATABASE_URL

    def test_run_migrations_is_bool(self):
        """Test run migrations is a boolean."""
        settings = EnhancedSettings()
        assert isinstance(settings.RUN_MIGRATIONS, bool)

    def test_redis_url_is_string(self):
        """Test Redis URL is a string."""
        settings = EnhancedSettings()
        assert isinstance(settings.REDIS_URL, str)
        # Should be a redis URL
        assert "redis://" in settings.REDIS_URL

    def test_redis_password_type(self):
        """Test Redis password is optional string."""
        settings = EnhancedSettings()
        # Can be None or a string
        assert settings.REDIS_PASSWORD is None or isinstance(
            settings.REDIS_PASSWORD, str
        )

    def test_enable_websockets_is_bool(self):
        """Test WebSocket flag is boolean."""
        settings = EnhancedSettings()
        assert isinstance(settings.ENABLE_WEBSOCKETS, bool)

    def test_enable_monitoring_is_bool(self):
        """Test monitoring flag is boolean."""
        settings = EnhancedSettings()
        assert isinstance(settings.ENABLE_MONITORING, bool)

    def test_enable_redis_is_bool(self):
        """Test Redis flag is boolean."""
        settings = EnhancedSettings()
        assert isinstance(settings.ENABLE_REDIS, bool)

    def test_environment_is_string(self):
        """Test environment is a string."""
        settings = EnhancedSettings()
        assert isinstance(settings.ENVIRONMENT, str)

    def test_debug_is_bool(self):
        """Test debug flag is boolean."""
        settings = EnhancedSettings()
        assert isinstance(settings.DEBUG, bool)

    def test_cors_origins_is_list(self):
        """Test CORS origins is a list."""
        settings = EnhancedSettings()
        assert isinstance(settings.CORS_ORIGINS, list)

    def test_jwt_secret_key_exists(self):
        """Test JWT secret key has a value."""
        settings = EnhancedSettings()
        assert settings.JWT_SECRET_KEY is not None
        assert isinstance(settings.JWT_SECRET_KEY, str)


# ============================================================================
# HEALTH STATUS TESTS
# ============================================================================


class TestHealthStatus:
    """Tests for HealthStatus class."""

    def test_initial_state(self, fresh_health_status):
        """Test initial health status state."""
        assert fresh_health_status.checks == {}
        assert fresh_health_status.details == {}

    def test_add_check_true(self, fresh_health_status):
        """Test adding a passing health check."""
        fresh_health_status.add_check("database", True)
        assert fresh_health_status.checks["database"] is True

    def test_add_check_false(self, fresh_health_status):
        """Test adding a failing health check."""
        fresh_health_status.add_check("redis", False)
        assert fresh_health_status.checks["redis"] is False

    def test_add_check_with_details(self, fresh_health_status):
        """Test adding a health check with details."""
        details = {"url": "localhost:5432", "status": "connected"}
        fresh_health_status.add_check("database", True, details)
        assert fresh_health_status.details["database"] == details

    def test_is_healthy_all_passing(self, fresh_health_status):
        """Test is_healthy when all checks pass."""
        fresh_health_status.add_check("database", True)
        fresh_health_status.add_check("redis", True)
        assert fresh_health_status.is_healthy is True

    def test_is_healthy_with_failure(self, fresh_health_status):
        """Test is_healthy when one check fails."""
        fresh_health_status.add_check("database", True)
        fresh_health_status.add_check("redis", False)
        assert fresh_health_status.is_healthy is False

    def test_is_healthy_empty(self, fresh_health_status):
        """Test is_healthy with no checks."""
        assert fresh_health_status.is_healthy is True

    def test_to_dict_healthy(self, fresh_health_status):
        """Test to_dict when healthy."""
        fresh_health_status.add_check("database", True, {"url": "localhost"})
        result = fresh_health_status.to_dict()
        assert result["status"] == "healthy"
        assert result["checks"]["database"] is True
        assert result["details"]["database"]["url"] == "localhost"

    def test_to_dict_unhealthy(self, fresh_health_status):
        """Test to_dict when unhealthy."""
        fresh_health_status.add_check("database", False, {"error": "timeout"})
        result = fresh_health_status.to_dict()
        assert result["status"] == "unhealthy"
        assert result["checks"]["database"] is False

    def test_multiple_checks(self, fresh_health_status):
        """Test adding multiple health checks."""
        fresh_health_status.add_check("database", True)
        fresh_health_status.add_check("redis", True)
        fresh_health_status.add_check("websockets", True)
        fresh_health_status.add_check("monitoring", True)
        assert len(fresh_health_status.checks) == 4
        assert fresh_health_status.is_healthy is True


# ============================================================================
# RUN DATABASE MIGRATIONS TESTS
# ============================================================================


class TestRunDatabaseMigrations:
    """Tests for run_database_migrations function."""

    @pytest.mark.asyncio
    async def test_migrations_skipped_when_disabled(self):
        """Test migrations are skipped when disabled."""
        with patch("app.enhanced_startup.enhanced_settings") as mock_settings:
            mock_settings.RUN_MIGRATIONS = False

            result = await run_database_migrations()

            assert result is True

    @pytest.mark.asyncio
    async def test_migrations_run_success(self):
        """Test successful migration run."""
        with (
            patch("app.enhanced_startup.enhanced_settings") as mock_settings,
            patch("alembic.command.upgrade") as mock_upgrade,
            patch("alembic.config.Config") as mock_config,
        ):
            mock_settings.RUN_MIGRATIONS = True
            mock_settings.DATABASE_URL = "sqlite:///test.db"
            mock_config_instance = MagicMock()
            mock_config.return_value = mock_config_instance

            result = await run_database_migrations()

            assert result is True
            mock_upgrade.assert_called_once()

    @pytest.mark.asyncio
    async def test_migrations_run_failure(self):
        """Test migration failure handling."""
        with (
            patch("app.enhanced_startup.enhanced_settings") as mock_settings,
            patch("alembic.config.Config") as mock_config,
        ):
            mock_settings.RUN_MIGRATIONS = True
            mock_settings.DATABASE_URL = "sqlite:///test.db"
            mock_config.side_effect = Exception("Migration error")

            result = await run_database_migrations()

            assert result is False


# ============================================================================
# VERIFY DATABASE CONNECTIVITY TESTS
# ============================================================================


class TestVerifyDatabaseConnectivity:
    """Tests for verify_database_connectivity function."""

    @pytest.mark.asyncio
    async def test_database_connectivity_success(self):
        """Test successful database connectivity."""
        with (
            patch("app.enhanced_startup.db_manager") as mock_db_manager,
            patch("app.enhanced_startup.enhanced_settings") as mock_settings,
            patch("app.enhanced_startup.health_status") as mock_health,
        ):
            mock_settings.DATABASE_URL = "sqlite:///test.db"
            mock_db_manager.initialize = AsyncMock()

            # Create async generator mock
            mock_session = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar.return_value = 1
            mock_session.execute = AsyncMock(return_value=mock_result)
            mock_session.close = AsyncMock()

            async def session_gen():
                yield mock_session

            mock_db_manager.get_session.return_value = session_gen().__aiter__()

            result = await verify_database_connectivity()

            assert result is True

    @pytest.mark.asyncio
    async def test_database_connectivity_failure(self):
        """Test database connectivity failure."""
        with (
            patch("app.enhanced_startup.db_manager") as mock_db_manager,
            patch("app.enhanced_startup.health_status") as mock_health,
        ):
            mock_db_manager.initialize = AsyncMock(
                side_effect=Exception("Connection failed")
            )

            result = await verify_database_connectivity()

            assert result is False


# ============================================================================
# VERIFY REDIS CONNECTIVITY TESTS
# ============================================================================


class TestVerifyRedisConnectivity:
    """Tests for verify_redis_connectivity function."""

    @pytest.mark.asyncio
    async def test_redis_disabled(self):
        """Test Redis check when disabled."""
        with (
            patch("app.enhanced_startup.enhanced_settings") as mock_settings,
            patch("app.enhanced_startup.health_status") as mock_health,
        ):
            mock_settings.ENABLE_REDIS = False

            result = await verify_redis_connectivity()

            assert result is True

    @pytest.mark.asyncio
    async def test_redis_connectivity_success(self):
        """Test successful Redis connectivity."""
        with (
            patch("app.enhanced_startup.redis_client") as mock_redis,
            patch("app.enhanced_startup.enhanced_settings") as mock_settings,
            patch("app.enhanced_startup.health_status") as mock_health,
        ):
            mock_settings.ENABLE_REDIS = True
            mock_settings.REDIS_URL = "redis://localhost:6379"
            mock_redis.initialize = AsyncMock()
            mock_redis.set = AsyncMock()
            mock_redis.get = AsyncMock(return_value="ok")

            result = await verify_redis_connectivity()

            assert result is True

    @pytest.mark.asyncio
    async def test_redis_connectivity_failure(self):
        """Test Redis connectivity failure."""
        with (
            patch("app.enhanced_startup.redis_client") as mock_redis,
            patch("app.enhanced_startup.enhanced_settings") as mock_settings,
            patch("app.enhanced_startup.health_status") as mock_health,
        ):
            mock_settings.ENABLE_REDIS = True
            mock_redis.initialize = AsyncMock(
                side_effect=Exception("Connection refused")
            )

            result = await verify_redis_connectivity()

            assert result is False

    @pytest.mark.asyncio
    async def test_redis_health_check_value_mismatch(self):
        """Test Redis health check with wrong value."""
        with (
            patch("app.enhanced_startup.redis_client") as mock_redis,
            patch("app.enhanced_startup.enhanced_settings") as mock_settings,
            patch("app.enhanced_startup.health_status") as mock_health,
        ):
            mock_settings.ENABLE_REDIS = True
            mock_settings.REDIS_URL = "redis://localhost:6379"
            mock_redis.initialize = AsyncMock()
            mock_redis.set = AsyncMock()
            mock_redis.get = AsyncMock(return_value="wrong_value")

            result = await verify_redis_connectivity()

            assert result is False


# ============================================================================
# SHUTDOWN SEQUENCE TESTS
# ============================================================================


class TestShutdownSequence:
    """Tests for shutdown_sequence function."""

    @pytest.mark.asyncio
    async def test_shutdown_with_all_services(self):
        """Test shutdown with all services enabled."""
        with (
            patch("app.enhanced_startup.enhanced_settings") as mock_settings,
            patch("app.enhanced_startup.monitoring_system") as mock_monitoring,
            patch("app.enhanced_startup.advanced_websocket_manager") as mock_websocket,
            patch("app.enhanced_startup.db_manager") as mock_db,
            patch("app.enhanced_startup.redis_client") as mock_redis,
        ):
            mock_settings.ENABLE_MONITORING = True
            mock_settings.ENABLE_WEBSOCKETS = True
            mock_settings.ENABLE_REDIS = True

            mock_monitoring.stop_monitoring = AsyncMock()
            mock_websocket.stop_background_tasks = AsyncMock()
            mock_db.close = AsyncMock()
            mock_redis.close = AsyncMock()

            await shutdown_sequence()

            mock_monitoring.stop_monitoring.assert_called_once()
            mock_websocket.stop_background_tasks.assert_called_once()
            mock_db.close.assert_called_once()
            mock_redis.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_shutdown_with_monitoring_disabled(self):
        """Test shutdown with monitoring disabled."""
        with (
            patch("app.enhanced_startup.enhanced_settings") as mock_settings,
            patch("app.enhanced_startup.monitoring_system") as mock_monitoring,
            patch("app.enhanced_startup.advanced_websocket_manager") as mock_websocket,
            patch("app.enhanced_startup.db_manager") as mock_db,
            patch("app.enhanced_startup.redis_client") as mock_redis,
        ):
            mock_settings.ENABLE_MONITORING = False
            mock_settings.ENABLE_WEBSOCKETS = True
            mock_settings.ENABLE_REDIS = True

            mock_websocket.stop_background_tasks = AsyncMock()
            mock_db.close = AsyncMock()
            mock_redis.close = AsyncMock()

            await shutdown_sequence()

            mock_monitoring.stop_monitoring.assert_not_called()

    @pytest.mark.asyncio
    async def test_shutdown_with_redis_disabled(self):
        """Test shutdown with Redis disabled."""
        with (
            patch("app.enhanced_startup.enhanced_settings") as mock_settings,
            patch("app.enhanced_startup.monitoring_system") as mock_monitoring,
            patch("app.enhanced_startup.advanced_websocket_manager") as mock_websocket,
            patch("app.enhanced_startup.db_manager") as mock_db,
            patch("app.enhanced_startup.redis_client") as mock_redis,
        ):
            mock_settings.ENABLE_MONITORING = True
            mock_settings.ENABLE_WEBSOCKETS = True
            mock_settings.ENABLE_REDIS = False

            mock_monitoring.stop_monitoring = AsyncMock()
            mock_websocket.stop_background_tasks = AsyncMock()
            mock_db.close = AsyncMock()

            await shutdown_sequence()

            mock_redis.close.assert_not_called()

    @pytest.mark.asyncio
    async def test_shutdown_handles_errors_gracefully(self):
        """Test shutdown handles errors without crashing."""
        with (
            patch("app.enhanced_startup.enhanced_settings") as mock_settings,
            patch("app.enhanced_startup.monitoring_system") as mock_monitoring,
            patch("app.enhanced_startup.advanced_websocket_manager") as mock_websocket,
            patch("app.enhanced_startup.db_manager") as mock_db,
            patch("app.enhanced_startup.redis_client") as mock_redis,
        ):
            mock_settings.ENABLE_MONITORING = True
            mock_settings.ENABLE_WEBSOCKETS = True
            mock_settings.ENABLE_REDIS = True

            mock_monitoring.stop_monitoring = AsyncMock(
                side_effect=Exception("Monitoring error")
            )
            mock_websocket.stop_background_tasks = AsyncMock(
                side_effect=Exception("WebSocket error")
            )
            mock_db.close = AsyncMock(side_effect=Exception("DB error"))
            mock_redis.close = AsyncMock(side_effect=Exception("Redis error"))

            # Should not raise even with all errors
            await shutdown_sequence()


# ============================================================================
# CREATE APP TESTS
# ============================================================================


class TestCreateApp:
    """Tests for create_app function."""

    def test_create_app_returns_fastapi(self):
        """Test that create_app returns a FastAPI instance."""
        from fastapi import FastAPI

        app = create_app()
        assert isinstance(app, FastAPI)

    def test_app_title(self):
        """Test app has correct title."""
        app = create_app()
        assert "Lokifi" in app.title

    def test_app_version(self):
        """Test app has version."""
        app = create_app()
        assert app.version is not None

    def test_health_endpoint_registered(self):
        """Test health endpoint is registered."""
        app = create_app()
        routes = [route.path for route in app.routes]
        assert "/api/health" in routes

    def test_readiness_endpoint_registered(self):
        """Test readiness endpoint is registered."""
        app = create_app()
        routes = [route.path for route in app.routes]
        assert "/api/health/ready" in routes

    def test_liveness_endpoint_registered(self):
        """Test liveness endpoint is registered."""
        app = create_app()
        routes = [route.path for route in app.routes]
        assert "/api/health/live" in routes


# ============================================================================
# GLOBAL INSTANCES TESTS
# ============================================================================


class TestGlobalInstances:
    """Tests for global instances."""

    def test_enhanced_settings_instance(self):
        """Test enhanced_settings is an EnhancedSettings instance."""
        assert isinstance(enhanced_settings, EnhancedSettings)

    def test_health_status_instance(self):
        """Test health_status is a HealthStatus instance."""
        assert isinstance(health_status, HealthStatus)
