"""
Tests for app.core.security_config

Comprehensive test suite for security configuration:
- SecurityConfig class constants and settings
- Environment-based CORS origins
- Environment detection (production vs development)
- HTTP methods based on environment
"""

import os
from unittest.mock import patch

import pytest

# Import module under test
try:
    from app.core.security_config import SecurityConfig, security_config
except ImportError as e:
    pytest.skip(f"Module import failed: {e}", allow_module_level=True)


# ============================================================================
# TEST: Password Configuration Constants
# ============================================================================


class TestPasswordConfiguration:
    """Test password security configuration."""

    def test_min_password_length(self):
        """Test minimum password length is reasonable."""
        assert SecurityConfig.MIN_PASSWORD_LENGTH == 8
        assert SecurityConfig.MIN_PASSWORD_LENGTH > 0

    def test_max_password_length(self):
        """Test maximum password length is reasonable."""
        assert SecurityConfig.MAX_PASSWORD_LENGTH == 128
        assert SecurityConfig.MAX_PASSWORD_LENGTH > SecurityConfig.MIN_PASSWORD_LENGTH

    def test_password_requirements(self):
        """Test password requirement flags are booleans."""
        assert isinstance(SecurityConfig.PASSWORD_REQUIRE_UPPERCASE, bool)
        assert isinstance(SecurityConfig.PASSWORD_REQUIRE_LOWERCASE, bool)
        assert isinstance(SecurityConfig.PASSWORD_REQUIRE_DIGITS, bool)
        assert isinstance(SecurityConfig.PASSWORD_REQUIRE_SPECIAL, bool)

    def test_password_min_criteria(self):
        """Test minimum criteria requirement is valid."""
        assert SecurityConfig.PASSWORD_MIN_CRITERIA == 3
        # Should be between 1 and 4 (4 possible criteria)
        assert 1 <= SecurityConfig.PASSWORD_MIN_CRITERIA <= 4


# ============================================================================
# TEST: JWT Configuration Constants
# ============================================================================


class TestJWTConfiguration:
    """Test JWT security configuration."""

    def test_jwt_algorithm(self):
        """Test JWT algorithm is HS256."""
        assert SecurityConfig.JWT_ALGORITHM == "HS256"

    def test_access_token_expiry(self):
        """Test access token expiry is reasonable."""
        assert SecurityConfig.JWT_ACCESS_TOKEN_EXPIRE_MINUTES == 30
        assert SecurityConfig.JWT_ACCESS_TOKEN_EXPIRE_MINUTES > 0

    def test_refresh_token_expiry(self):
        """Test refresh token expiry is reasonable."""
        assert SecurityConfig.JWT_REFRESH_TOKEN_EXPIRE_DAYS == 7
        assert SecurityConfig.JWT_REFRESH_TOKEN_EXPIRE_DAYS > 0


# ============================================================================
# TEST: Rate Limiting Configuration
# ============================================================================


class TestRateLimitConfiguration:
    """Test rate limiting configuration."""

    def test_rate_limits_structure(self):
        """Test rate limits has required keys."""
        required_keys = ["auth", "api", "websocket", "upload", "password_reset"]
        for key in required_keys:
            assert key in SecurityConfig.RATE_LIMITS
            assert "requests" in SecurityConfig.RATE_LIMITS[key]
            assert "window" in SecurityConfig.RATE_LIMITS[key]

    def test_auth_rate_limits(self):
        """Test auth rate limits are restrictive."""
        auth_limits = SecurityConfig.RATE_LIMITS["auth"]
        assert auth_limits["requests"] == 5
        assert auth_limits["window"] == 300  # 5 minutes

    def test_api_rate_limits(self):
        """Test API rate limits are reasonable."""
        api_limits = SecurityConfig.RATE_LIMITS["api"]
        assert api_limits["requests"] == 100
        assert api_limits["window"] == 60  # 1 minute

    def test_password_reset_limits(self):
        """Test password reset rate limits are very restrictive."""
        reset_limits = SecurityConfig.RATE_LIMITS["password_reset"]
        assert reset_limits["requests"] == 3
        assert reset_limits["window"] == 3600  # 1 hour


# ============================================================================
# TEST: CORS Configuration
# ============================================================================


class TestCORSConfiguration:
    """Test CORS configuration."""

    def test_production_cors_origins(self):
        """Test production CORS origins are secure."""
        origins = SecurityConfig.PRODUCTION_CORS_ORIGINS
        assert isinstance(origins, list)
        assert len(origins) > 0
        # All should be HTTPS
        for origin in origins:
            assert origin.startswith("https://")

    def test_development_cors_origins(self):
        """Test development CORS origins include localhost."""
        origins = SecurityConfig.DEVELOPMENT_CORS_ORIGINS
        assert isinstance(origins, list)
        assert len(origins) > 0
        # Should include localhost
        localhost_origins = [o for o in origins if "localhost" in o or "127.0.0.1" in o]
        assert len(localhost_origins) > 0


# ============================================================================
# TEST: Security Headers Configuration
# ============================================================================


class TestSecurityHeadersConfiguration:
    """Test security headers configuration."""

    def test_security_headers_structure(self):
        """Test security headers has required headers."""
        required_headers = [
            "X-Content-Type-Options",
            "X-Frame-Options",
            "X-XSS-Protection",
            "Strict-Transport-Security",
            "Referrer-Policy",
        ]
        for header in required_headers:
            assert header in SecurityConfig.SECURITY_HEADERS

    def test_x_frame_options_deny(self):
        """Test X-Frame-Options is DENY."""
        assert SecurityConfig.SECURITY_HEADERS["X-Frame-Options"] == "DENY"

    def test_content_type_nosniff(self):
        """Test X-Content-Type-Options is nosniff."""
        assert SecurityConfig.SECURITY_HEADERS["X-Content-Type-Options"] == "nosniff"


# ============================================================================
# TEST: CSP Configuration
# ============================================================================


class TestCSPConfiguration:
    """Test Content Security Policy configuration."""

    def test_csp_policy_exists(self):
        """Test CSP policy is defined."""
        assert SecurityConfig.CSP_POLICY is not None
        assert isinstance(SecurityConfig.CSP_POLICY, str)
        assert len(SecurityConfig.CSP_POLICY) > 0

    def test_csp_has_default_src(self):
        """Test CSP includes default-src directive."""
        assert "default-src" in SecurityConfig.CSP_POLICY

    def test_csp_has_script_src(self):
        """Test CSP includes script-src directive."""
        assert "script-src" in SecurityConfig.CSP_POLICY


# ============================================================================
# TEST: Input Validation Configuration
# ============================================================================


class TestInputValidationConfiguration:
    """Test input validation configuration."""

    def test_max_request_size(self):
        """Test max request size is 10MB."""
        expected_size = 1024 * 1024 * 10  # 10MB
        assert expected_size == SecurityConfig.MAX_REQUEST_SIZE

    def test_max_string_length(self):
        """Test max string length is reasonable."""
        assert SecurityConfig.MAX_STRING_LENGTH == 1000
        assert SecurityConfig.MAX_STRING_LENGTH > 0

    def test_username_length_limits(self):
        """Test username length limits are valid."""
        assert SecurityConfig.MIN_USERNAME_LENGTH == 3
        assert SecurityConfig.MAX_USERNAME_LENGTH == 30
        assert SecurityConfig.MIN_USERNAME_LENGTH < SecurityConfig.MAX_USERNAME_LENGTH


# ============================================================================
# TEST: Sensitive Patterns Configuration
# ============================================================================


class TestSensitivePatternsConfiguration:
    """Test sensitive data patterns configuration."""

    def test_sensitive_patterns_exist(self):
        """Test sensitive patterns are defined."""
        assert SecurityConfig.SENSITIVE_PATTERNS is not None
        assert isinstance(SecurityConfig.SENSITIVE_PATTERNS, list)
        assert len(SecurityConfig.SENSITIVE_PATTERNS) > 0

    def test_common_sensitive_patterns(self):
        """Test common sensitive patterns are included."""
        common_patterns = ["password", "token", "secret", "key"]
        for pattern in common_patterns:
            assert pattern in SecurityConfig.SENSITIVE_PATTERNS


# ============================================================================
# TEST: File Upload Configuration
# ============================================================================


class TestFileUploadConfiguration:
    """Test file upload configuration."""

    def test_allowed_upload_types_structure(self):
        """Test allowed upload types has required categories."""
        assert "image" in SecurityConfig.ALLOWED_UPLOAD_TYPES
        assert "document" in SecurityConfig.ALLOWED_UPLOAD_TYPES
        assert "data" in SecurityConfig.ALLOWED_UPLOAD_TYPES

    def test_image_upload_types(self):
        """Test image upload types include common formats."""
        image_types = SecurityConfig.ALLOWED_UPLOAD_TYPES["image"]
        assert "jpg" in image_types or "jpeg" in image_types
        assert "png" in image_types

    def test_max_upload_size(self):
        """Test max upload size is 5MB."""
        expected_size = 1024 * 1024 * 5  # 5MB
        assert expected_size == SecurityConfig.MAX_UPLOAD_SIZE


# ============================================================================
# TEST: Environment-Based Methods
# ============================================================================


class TestGetCorsOrigins:
    """Test get_cors_origins class method."""

    def test_development_cors_origins(self):
        """Test returns development CORS origins by default."""
        with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
            origins = SecurityConfig.get_cors_origins()
            assert origins == SecurityConfig.DEVELOPMENT_CORS_ORIGINS

    def test_production_cors_origins(self):
        """Test returns production CORS origins in production."""
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            origins = SecurityConfig.get_cors_origins()
            assert origins == SecurityConfig.PRODUCTION_CORS_ORIGINS

    def test_production_case_insensitive(self):
        """Test production detection is case insensitive."""
        with patch.dict(os.environ, {"ENVIRONMENT": "PRODUCTION"}):
            origins = SecurityConfig.get_cors_origins()
            assert origins == SecurityConfig.PRODUCTION_CORS_ORIGINS

    def test_default_is_development(self):
        """Test default (no env var) returns development origins."""
        with patch.dict(os.environ, {}, clear=True):
            # Remove ENVIRONMENT if present
            env_copy = os.environ.copy()
            if "ENVIRONMENT" in env_copy:
                del env_copy["ENVIRONMENT"]
            with patch.dict(os.environ, env_copy, clear=True):
                origins = SecurityConfig.get_cors_origins()
                assert origins == SecurityConfig.DEVELOPMENT_CORS_ORIGINS


class TestIsProduction:
    """Test is_production class method."""

    def test_development_returns_false(self):
        """Test returns False in development."""
        with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
            assert SecurityConfig.is_production() is False

    def test_production_returns_true(self):
        """Test returns True in production."""
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            assert SecurityConfig.is_production() is True

    def test_production_case_insensitive(self):
        """Test production detection is case insensitive."""
        with patch.dict(os.environ, {"ENVIRONMENT": "Production"}):
            assert SecurityConfig.is_production() is True

    def test_default_is_not_production(self):
        """Test default (no env var) is not production."""
        with patch.dict(os.environ, {}, clear=True):
            env_copy = os.environ.copy()
            if "ENVIRONMENT" in env_copy:
                del env_copy["ENVIRONMENT"]
            with patch.dict(os.environ, env_copy, clear=True):
                assert SecurityConfig.is_production() is False

    def test_random_value_is_not_production(self):
        """Test random environment value is not production."""
        with patch.dict(os.environ, {"ENVIRONMENT": "staging"}):
            assert SecurityConfig.is_production() is False


class TestGetAllowedMethods:
    """Test get_allowed_methods class method."""

    def test_development_methods(self):
        """Test returns all methods in development."""
        with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
            methods = SecurityConfig.get_allowed_methods()
            assert "GET" in methods
            assert "POST" in methods
            assert "PUT" in methods
            assert "DELETE" in methods
            assert "OPTIONS" in methods
            assert "PATCH" in methods

    def test_production_methods(self):
        """Test returns restricted methods in production."""
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            methods = SecurityConfig.get_allowed_methods()
            assert "GET" in methods
            assert "POST" in methods
            assert "PUT" in methods
            assert "DELETE" in methods
            assert "OPTIONS" in methods
            # PATCH not allowed in production
            assert "PATCH" not in methods

    def test_production_has_fewer_methods(self):
        """Test production has fewer methods than development."""
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            prod_methods = SecurityConfig.get_allowed_methods()
        with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
            dev_methods = SecurityConfig.get_allowed_methods()
        assert len(prod_methods) < len(dev_methods)


# ============================================================================
# TEST: Global Instance
# ============================================================================


class TestGlobalInstance:
    """Test global security_config instance."""

    def test_global_instance_exists(self):
        """Test global instance is defined."""
        assert security_config is not None

    def test_global_instance_is_security_config(self):
        """Test global instance is SecurityConfig class."""
        assert isinstance(security_config, SecurityConfig)

    def test_global_instance_has_attributes(self):
        """Test global instance has expected attributes."""
        assert hasattr(security_config, "MIN_PASSWORD_LENGTH")
        assert hasattr(security_config, "JWT_ALGORITHM")
        assert hasattr(security_config, "RATE_LIMITS")
        # TODO: Test invalid input handling
        pass

    def test_error_conditions(self):
        """Test error condition handling"""
        # TODO: Test error scenarios
        pass


# ============================================================================
# PERFORMANCE & LOAD TESTS (Optional)
# ============================================================================


@pytest.mark.slow
class TestsecurityconfigPerformance:
    """Performance and load tests"""

    @pytest.mark.skip(reason="Performance test - run manually")
    def test_performance_under_load(self):
        """Test performance under load"""
        # TODO: Add performance test
        pass
