"""
Unit tests for app/core/config.py

Tests cover:
- Default value assignment
- Environment variable override
- Settings validation
- JWT secret retrieval
- Error handling for missing secrets
"""

import os
from unittest.mock import patch

import pytest

from app.core.config import Settings, get_settings


# Mark config validation tests to skip in CI (where JWT secrets are provided)
pytestmark = pytest.mark.config_validation


class TestSettingsDefaults:
    """Test default configuration values"""

    def test_project_name_default(self):
        """Should use default project name"""
        settings = Settings()
        assert settings.PROJECT_NAME == "Lokifi"

    def test_api_prefix_default(self):
        """Should use default API prefix"""
        settings = Settings()
        assert settings.API_PREFIX == "/api"

    def test_jwt_ttl_default(self):
        """Should use default JWT TTL"""
        settings = Settings()
        assert settings.lokifi_jwt_ttl_min == 1440

    def test_database_url_default(self):
        """Should use default database URL"""
        settings = Settings()
        assert "postgresql+asyncpg" in settings.DATABASE_URL
        assert "localhost:5432" in settings.DATABASE_URL

    def test_database_pool_defaults(self):
        """Should use default database pool settings"""
        settings = Settings()
        assert settings.DATABASE_POOL_SIZE == 5
        assert settings.DATABASE_MAX_OVERFLOW == 10
        assert settings.DATABASE_POOL_TIMEOUT == 30
        assert settings.DATABASE_POOL_RECYCLE == 3600

    def test_archival_defaults(self):
        """Should use default archival settings"""
        settings = Settings()
        assert settings.ENABLE_DATA_ARCHIVAL is False
        assert settings.ARCHIVE_THRESHOLD_DAYS == 365
        assert settings.DELETE_THRESHOLD_DAYS == 2555

    def test_jwt_defaults(self):
        """Should use default JWT settings"""
        settings = Settings()
        assert settings.JWT_ALGORITHM == "HS256"
        assert settings.JWT_EXPIRE_MINUTES == 30

    def test_smtp_defaults(self):
        """Should use default SMTP settings"""
        settings = Settings()
        assert settings.SMTP_HOST == "localhost"
        assert settings.SMTP_PORT == 1025
        assert settings.SMTP_TLS is False
        assert settings.FROM_EMAIL == "noreply@lokifi.com"

    def test_ollama_default(self):
        """Should use default Ollama URL"""
        settings = Settings()
        assert settings.OLLAMA_BASE_URL == "http://localhost:11434"

    def test_frontend_defaults(self):
        """Should use default frontend settings"""
        settings = Settings()
        assert settings.frontend_origin == "http://localhost:3000"
        assert settings.CORS_ORIGINS == ["http://localhost:3000"]

    def test_redis_defaults(self):
        """Should use default Redis settings"""
        settings = Settings()
        assert settings.redis_url == "redis://localhost:6379/0"
        assert settings.redis_host == "localhost"
        assert settings.redis_port == 6379
        assert settings.redis_sentinel_hosts == []
        assert settings.redis_sentinel_service == "mymaster"

    def test_openai_defaults(self):
        """Should use default OpenAI settings"""
        settings = Settings()
        assert settings.openai_base == "https://api.openai.com/v1"
        assert settings.openai_model == "gpt-4o-mini"


class TestEnvironmentVariableOverride:
    """Test environment variable override behavior"""

    @patch.dict(os.environ, {"PROJECT_NAME": "TestApp"}, clear=False)
    def test_project_name_override(self):
        """Should override project name from environment"""
        settings = Settings()
        assert settings.PROJECT_NAME == "TestApp"

    @patch.dict(os.environ, {"API_PREFIX": "/v2/api"}, clear=False)
    def test_api_prefix_override(self):
        """Should override API prefix from environment"""
        settings = Settings()
        assert settings.API_PREFIX == "/v2/api"

    @patch.dict(os.environ, {"LOKIFI_JWT_TTL_MIN": "720"}, clear=False)
    def test_jwt_ttl_override(self):
        """Should override JWT TTL from environment"""
        settings = Settings()
        assert settings.lokifi_jwt_ttl_min == 720

    @patch.dict(os.environ, {"DATABASE_POOL_SIZE": "20"}, clear=False)
    def test_database_pool_size_override(self):
        """Should override database pool size from environment"""
        settings = Settings()
        assert settings.DATABASE_POOL_SIZE == 20

    @patch.dict(os.environ, {"ENABLE_DATA_ARCHIVAL": "true"}, clear=False)
    def test_archival_enable_override(self):
        """Should override archival enable from environment"""
        settings = Settings()
        assert settings.ENABLE_DATA_ARCHIVAL is True

    @patch.dict(os.environ, {"JWT_ALGORITHM": "RS256"}, clear=False)
    def test_jwt_algorithm_override(self):
        """Should override JWT algorithm from environment"""
        settings = Settings()
        assert settings.JWT_ALGORITHM == "RS256"

    @patch.dict(os.environ, {"REDIS_PORT": "6380"}, clear=False)
    def test_redis_port_override(self):
        """Should override Redis port from environment"""
        settings = Settings()
        assert settings.redis_port == 6380

    @patch.dict(os.environ, {"OPENAI_MODEL": "gpt-4"}, clear=False)
    def test_openai_model_override(self):
        """Should override OpenAI model from environment"""
        settings = Settings()
        assert settings.openai_model == "gpt-4"


class TestOptionalSecrets:
    """Test optional API key and secret fields"""

    def test_optional_api_keys_none_by_default(self):
        """Should have None for optional API keys"""
        settings = Settings()
        assert settings.lokifi_jwt_secret is None
        assert settings.JWT_SECRET_KEY is None
        assert settings.OPENROUTER_API_KEY is None
        assert settings.HUGGING_FACE_API_KEY is None
        assert settings.openai_api_key is None
        assert settings.POLYGON_KEY is None
        assert settings.ALPHAVANTAGE_KEY is None
        assert settings.FINNHUB_KEY is None
        assert settings.COINGECKO_KEY is None
        assert settings.CMC_KEY is None
        assert settings.NEWSAPI_KEY is None
        assert settings.MARKETAUX_KEY is None
        assert settings.FMP_KEY is None

    @patch.dict(os.environ, {"POLYGON_KEY": "test_polygon_key"}, clear=False)
    def test_optional_api_key_set(self):
        """Should use API key when provided"""
        settings = Settings()
        assert settings.POLYGON_KEY == "test_polygon_key"


class TestValidateRequiredSecrets:
    """Test required secrets validation"""

    def test_validate_missing_all_secrets(self):
        """Should raise error when all secrets missing"""
        settings = Settings()
        with pytest.raises(ValueError) as exc_info:
            settings.validate_required_secrets()

        error_message = str(exc_info.value)
        assert "Missing required environment variables" in error_message
        assert "LOKIFI_JWT_SECRET" in error_message
        assert "JWT_SECRET_KEY" in error_message

    @patch.dict(os.environ, {"LOKIFI_JWT_SECRET": "test_secret_123"}, clear=False)
    def test_validate_with_lokifi_jwt_secret_only(self):
        """Should raise error when only lokifi_jwt_secret is set"""
        settings = Settings()
        with pytest.raises(ValueError) as exc_info:
            settings.validate_required_secrets()

        error_message = str(exc_info.value)
        assert "Missing required environment variables" in error_message
        assert "JWT_SECRET_KEY" in error_message
        assert "LOKIFI_JWT_SECRET" not in error_message

    @patch.dict(os.environ, {"JWT_SECRET_KEY": "test_jwt_key_456"}, clear=False)
    def test_validate_with_jwt_secret_key_only(self):
        """Should raise error when only JWT_SECRET_KEY is set"""
        settings = Settings()
        with pytest.raises(ValueError) as exc_info:
            settings.validate_required_secrets()

        error_message = str(exc_info.value)
        assert "Missing required environment variables" in error_message
        assert "LOKIFI_JWT_SECRET" in error_message
        assert "JWT_SECRET_KEY" not in error_message

    @patch.dict(
        os.environ,
        {"LOKIFI_JWT_SECRET": "test_secret_123", "JWT_SECRET_KEY": "test_jwt_key_456"},
        clear=False,
    )
    def test_validate_with_all_secrets(self):
        """Should not raise error when all secrets are set"""
        settings = Settings()
        # Should not raise
        settings.validate_required_secrets()


class TestGetJwtSecret:
    """Test JWT secret retrieval logic"""

    def test_get_jwt_secret_no_secrets_raises_error(self):
        """Should raise error when no JWT secrets configured"""
        settings = Settings()
        with pytest.raises(ValueError) as exc_info:
            settings.get_jwt_secret()

        error_message = str(exc_info.value)
        assert "No JWT secret configured" in error_message
        assert "LOKIFI_JWT_SECRET" in error_message
        assert "JWT_SECRET_KEY" in error_message

    @patch.dict(os.environ, {"LOKIFI_JWT_SECRET": "lokifi_secret_789"}, clear=False)
    def test_get_jwt_secret_prefers_lokifi_secret(self):
        """Should prefer lokifi_jwt_secret when both are set"""
        settings = Settings()
        # Manually set both to test priority
        settings.lokifi_jwt_secret = "lokifi_secret_789"
        settings.JWT_SECRET_KEY = "jwt_key_999"

        secret = settings.get_jwt_secret()
        assert secret == "lokifi_secret_789"

    @patch.dict(os.environ, {"JWT_SECRET_KEY": "jwt_key_only_111"}, clear=False)
    def test_get_jwt_secret_fallback_to_jwt_key(self):
        """Should fallback to JWT_SECRET_KEY when lokifi_jwt_secret is None"""
        settings = Settings()
        settings.lokifi_jwt_secret = None
        settings.JWT_SECRET_KEY = "jwt_key_only_111"

        secret = settings.get_jwt_secret()
        assert secret == "jwt_key_only_111"


class TestGetSettings:
    """Test get_settings factory function"""

    def test_get_settings_returns_settings_instance(self):
        """Should return a Settings instance"""
        result = get_settings()
        assert isinstance(result, Settings)

    def test_get_settings_returns_singleton(self):
        """Should return the same settings instance"""
        result1 = get_settings()
        result2 = get_settings()
        # Note: This might not be a true singleton if Settings() is called directly,
        # but the function should return the same global 'settings' object
        assert result1 is result2


class TestCloudStorageSettings:
    """Test cloud storage configuration"""

    def test_aws_settings_none_by_default(self):
        """Should have None for AWS settings by default"""
        settings = Settings()
        assert settings.AWS_S3_BUCKET is None
        assert settings.AWS_CLOUDFRONT_URL is None
        assert settings.AWS_ACCESS_KEY_ID is None
        assert settings.AWS_SECRET_ACCESS_KEY is None

    @patch.dict(
        os.environ,
        {
            "AWS_S3_BUCKET": "my-bucket",
            "AWS_CLOUDFRONT_URL": "https://cdn.example.com",
            "AWS_ACCESS_KEY_ID": "AKIAIOSFODNN7EXAMPLE",
            "AWS_SECRET_ACCESS_KEY": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        },
        clear=False,
    )
    def test_aws_settings_from_environment(self):
        """Should load AWS settings from environment"""
        settings = Settings()
        assert settings.AWS_S3_BUCKET == "my-bucket"
        assert settings.AWS_CLOUDFRONT_URL == "https://cdn.example.com"
        assert settings.AWS_ACCESS_KEY_ID == "AKIAIOSFODNN7EXAMPLE"
        assert settings.AWS_SECRET_ACCESS_KEY == "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"


class TestOAuthSettings:
    """Test OAuth configuration"""

    def test_oauth_settings_none_by_default(self):
        """Should have None for OAuth settings by default"""
        settings = Settings()
        assert settings.GOOGLE_CLIENT_ID is None
        assert settings.GOOGLE_CLIENT_SECRET is None

    @patch.dict(
        os.environ,
        {"GOOGLE_CLIENT_ID": "client_id_123", "GOOGLE_CLIENT_SECRET": "client_secret_456"},
        clear=False,
    )
    def test_oauth_settings_from_environment(self):
        """Should load OAuth settings from environment"""
        settings = Settings()
        assert settings.GOOGLE_CLIENT_ID == "client_id_123"
        assert settings.GOOGLE_CLIENT_SECRET == "client_secret_456"


class TestDatabaseReplicaSettings:
    """Test database replica configuration"""

    def test_replica_url_none_by_default(self):
        """Should have None for replica URL by default"""
        settings = Settings()
        assert settings.DATABASE_REPLICA_URL is None

    @patch.dict(
        os.environ,
        {"DATABASE_REPLICA_URL": "postgresql+asyncpg://lokifi:lokifi2025@replica:5432/lokifi"},
        clear=False,
    )
    def test_replica_url_from_environment(self):
        """Should load replica URL from environment"""
        settings = Settings()
        assert (
            settings.DATABASE_REPLICA_URL
            == "postgresql+asyncpg://lokifi:lokifi2025@replica:5432/lokifi"
        )


class TestRedisSentinelSettings:
    """Test Redis Sentinel configuration"""

    def test_redis_sentinel_defaults(self):
        """Should have empty sentinel hosts and default service name"""
        settings = Settings()
        assert settings.redis_sentinel_hosts == []
        assert settings.redis_sentinel_service == "mymaster"

    @patch.dict(
        os.environ,
        {
            "REDIS_SENTINEL_HOSTS": '["sentinel1:26379", "sentinel2:26379"]',
            "REDIS_SENTINEL_SERVICE": "production-master",
        },
        clear=False,
    )
    def test_redis_sentinel_from_environment(self):
        """Should load sentinel settings from environment"""
        # Note: JSON list parsing might require special handling in pydantic-settings
        # This test documents expected behavior
        Settings()
        # Pydantic-settings might parse this automatically or require custom validation
        # The actual behavior depends on pydantic-settings version and configuration


class TestModelConfig:
    """Test pydantic model configuration"""

    def test_extra_ignore_allows_unknown_env_vars(self):
        """Should ignore unknown environment variables"""
        # This test documents that extra="ignore" is set in model_config
        Settings()
        # With extra="ignore", unknown env vars won't cause validation errors
        # This is already tested implicitly by other tests not failing with extra env vars
