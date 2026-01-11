import os

import pytest

from app.core.security_config import SecurityConfig, security_config


class TestSecurityConfig:
    """Test security configuration"""

    def test_security_config_constants(self):
        """Test security configuration constants are set correctly"""
        assert SecurityConfig.MIN_PASSWORD_LENGTH == 8
        assert SecurityConfig.MAX_PASSWORD_LENGTH == 128
        assert SecurityConfig.JWT_ALGORITHM == "HS256"
        assert SecurityConfig.JWT_ACCESS_TOKEN_EXPIRE_MINUTES == 30
        assert SecurityConfig.JWT_REFRESH_TOKEN_EXPIRE_DAYS == 7

    def test_password_requirements(self):
        """Test password requirement flags"""
        assert SecurityConfig.PASSWORD_REQUIRE_UPPERCASE is True
        assert SecurityConfig.PASSWORD_REQUIRE_LOWERCASE is True
        assert SecurityConfig.PASSWORD_REQUIRE_DIGITS is True
        assert SecurityConfig.PASSWORD_REQUIRE_SPECIAL is True
        assert SecurityConfig.PASSWORD_MIN_CRITERIA == 3

    def test_rate_limits_configured(self):
        """Test rate limit configuration exists"""
        assert "auth" in SecurityConfig.RATE_LIMITS
        assert "api" in SecurityConfig.RATE_LIMITS
        assert "websocket" in SecurityConfig.RATE_LIMITS
        assert "upload" in SecurityConfig.RATE_LIMITS
        assert "password_reset" in SecurityConfig.RATE_LIMITS

    def test_rate_limit_auth_settings(self):
        """Test auth rate limit settings"""
        auth_limit = SecurityConfig.RATE_LIMITS["auth"]
        assert auth_limit["requests"] == 5
        assert auth_limit["window"] == 300

    def test_rate_limit_api_settings(self):
        """Test API rate limit settings"""
        api_limit = SecurityConfig.RATE_LIMITS["api"]
        assert api_limit["requests"] == 100
        assert api_limit["window"] == 60

    def test_cors_production_origins(self):
        """Test production CORS origins are configured"""
        origins = SecurityConfig.PRODUCTION_CORS_ORIGINS
        assert "https://lokifi.app" in origins
        assert "https://www.lokifi.app" in origins
        assert "https://api.lokifi.app" in origins

    def test_cors_development_origins(self):
        """Test development CORS origins are configured"""
        origins = SecurityConfig.DEVELOPMENT_CORS_ORIGINS
        assert "http://localhost:3000" in origins
        assert "http://127.0.0.1:3000" in origins
        assert "http://localhost:8000" in origins
        assert "http://127.0.0.1:8000" in origins

    def test_security_headers_configured(self):
        """Test security headers are properly configured"""
        headers = SecurityConfig.SECURITY_HEADERS
        assert headers["X-Content-Type-Options"] == "nosniff"
        assert headers["X-Frame-Options"] == "DENY"
        assert headers["X-XSS-Protection"] == "1; mode=block"
        assert "max-age=31536000" in headers["Strict-Transport-Security"]

    def test_csp_policy_configured(self):
        """Test Content Security Policy is configured"""
        assert SecurityConfig.CSP_POLICY is not None
        assert "default-src 'self'" in SecurityConfig.CSP_POLICY
        assert "script-src" in SecurityConfig.CSP_POLICY
        assert "style-src" in SecurityConfig.CSP_POLICY

    def test_input_validation_limits(self):
        """Test input validation limits are set"""
        assert SecurityConfig.MAX_REQUEST_SIZE == 1024 * 1024 * 10
        assert SecurityConfig.MAX_STRING_LENGTH == 1000
        assert SecurityConfig.MAX_USERNAME_LENGTH == 30
        assert SecurityConfig.MIN_USERNAME_LENGTH == 3

    def test_sensitive_patterns(self):
        """Test sensitive data patterns for logging exclusion"""
        patterns = SecurityConfig.SENSITIVE_PATTERNS
        assert "password" in patterns
        assert "secret" in patterns
        assert "token" in patterns
        assert "key" in patterns
        assert "auth" in patterns

    def test_allowed_upload_types(self):
        """Test allowed file upload types"""
        uploads = SecurityConfig.ALLOWED_UPLOAD_TYPES
        assert "image" in uploads
        assert "document" in uploads
        assert "data" in uploads
        assert "jpg" in uploads["image"]
        assert "pdf" in uploads["document"]
        assert "json" in uploads["data"]

    def test_max_upload_size(self):
        """Test maximum upload size"""
        assert SecurityConfig.MAX_UPLOAD_SIZE == 1024 * 1024 * 5

    def test_get_cors_origins_development(self, monkeypatch):
        """Test get_cors_origins returns development origins"""
        monkeypatch.setenv("ENVIRONMENT", "development")
        origins = SecurityConfig.get_cors_origins()
        assert "http://localhost:3000" in origins

    def test_get_cors_origins_production(self, monkeypatch):
        """Test get_cors_origins returns production origins"""
        monkeypatch.setenv("ENVIRONMENT", "production")
        origins = SecurityConfig.get_cors_origins()
        assert "https://lokifi.app" in origins
        assert "http://localhost:3000" not in origins

    def test_is_production_false(self, monkeypatch):
        """Test is_production returns False for development"""
        monkeypatch.setenv("ENVIRONMENT", "development")
        assert SecurityConfig.is_production() is False

    def test_is_production_true(self, monkeypatch):
        """Test is_production returns True for production"""
        monkeypatch.setenv("ENVIRONMENT", "production")
        assert SecurityConfig.is_production() is True

    def test_is_production_case_insensitive(self, monkeypatch):
        """Test is_production is case-insensitive"""
        monkeypatch.setenv("ENVIRONMENT", "PRODUCTION")
        assert SecurityConfig.is_production() is True

    def test_get_allowed_methods_development(self, monkeypatch):
        """Test get_allowed_methods includes PATCH in development"""
        monkeypatch.setenv("ENVIRONMENT", "development")
        methods = SecurityConfig.get_allowed_methods()
        assert "GET" in methods
        assert "POST" in methods
        assert "PUT" in methods
        assert "DELETE" in methods
        assert "PATCH" in methods
        assert "OPTIONS" in methods

    def test_get_allowed_methods_production(self, monkeypatch):
        """Test get_allowed_methods excludes PATCH in production"""
        monkeypatch.setenv("ENVIRONMENT", "production")
        methods = SecurityConfig.get_allowed_methods()
        assert "GET" in methods
        assert "POST" in methods
        assert "PUT" in methods
        assert "DELETE" in methods
        assert "OPTIONS" in methods
        assert "PATCH" not in methods

    def test_global_security_config_instance(self):
        """Test global security_config instance exists"""
        assert security_config is not None
        assert isinstance(security_config, SecurityConfig)

    def test_security_config_rate_limit_password_reset(self):
        """Test password reset rate limit is configured"""
        reset_limit = SecurityConfig.RATE_LIMITS["password_reset"]
        assert reset_limit["requests"] == 3
        assert reset_limit["window"] == 3600

    def test_rate_limit_websocket_settings(self):
        """Test WebSocket rate limit settings"""
        ws_limit = SecurityConfig.RATE_LIMITS["websocket"]
        assert ws_limit["requests"] == 50
        assert ws_limit["window"] == 60

    def test_rate_limit_upload_settings(self):
        """Test upload rate limit settings"""
        upload_limit = SecurityConfig.RATE_LIMITS["upload"]
        assert upload_limit["requests"] == 10
        assert upload_limit["window"] == 60
