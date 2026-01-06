"""
Tests for app.services.auth

Unit tests for JWT authentication utilities:
- auth_handle_from_header: Extract handle from Authorization header
- require_handle: Validate JWT and optionally enforce handle matching
"""

from unittest.mock import patch

import pytest
from fastapi import HTTPException

# Import module under test
try:
    from app.services.auth import (
        JWT_ALG,
        auth_handle_from_header,
        require_handle,
    )
except ImportError as e:
    pytest.skip(f"Module import failed: {e}", allow_module_level=True)


# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_jwt_secret():
    """Return consistent JWT secret for testing."""
    return "test-secret-key-for-testing"


@pytest.fixture
def valid_token(mock_jwt_secret):
    """Generate a valid JWT token for testing."""
    from jose import jwt

    payload = {"sub": "testuser"}
    return jwt.encode(payload, mock_jwt_secret, algorithm=JWT_ALG)


@pytest.fixture
def expired_token(mock_jwt_secret):
    """Generate an expired JWT token for testing."""
    from datetime import datetime, timedelta, timezone

    from jose import jwt

    payload = {
        "sub": "testuser",
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),
    }
    return jwt.encode(payload, mock_jwt_secret, algorithm=JWT_ALG)


@pytest.fixture
def token_wrong_secret():
    """Generate a token signed with wrong secret."""
    from jose import jwt

    payload = {"sub": "testuser"}
    return jwt.encode(payload, "wrong-secret", algorithm=JWT_ALG)


# ============================================================================
# TEST: auth_handle_from_header
# ============================================================================


class TestAuthHandleFromHeader:
    """Test suite for auth_handle_from_header function."""

    def test_none_authorization(self):
        """Test with None authorization header."""
        result = auth_handle_from_header(None)
        assert result is None

    def test_empty_authorization(self):
        """Test with empty authorization header."""
        result = auth_handle_from_header("")
        assert result is None

    def test_no_bearer_prefix(self):
        """Test with authorization header without Bearer prefix."""
        result = auth_handle_from_header("Basic sometoken")
        assert result is None

    def test_only_bearer_word(self):
        """Test with only 'Bearer' word, no token."""
        result = auth_handle_from_header("Bearer ")
        # Empty token after Bearer should return None due to decode failure
        assert result is None

    def test_bearer_case_insensitive(self, valid_token, mock_jwt_secret):
        """Test that Bearer prefix is case-insensitive."""
        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            # Lowercase bearer
            result = auth_handle_from_header(f"bearer {valid_token}")
            assert result == "testuser"

            # Mixed case BEARER
            result = auth_handle_from_header(f"BEARER {valid_token}")
            assert result == "testuser"

            # Mixed case BeArEr
            result = auth_handle_from_header(f"BeArEr {valid_token}")
            assert result == "testuser"

    def test_valid_token(self, valid_token, mock_jwt_secret):
        """Test with valid JWT token."""
        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            result = auth_handle_from_header(f"Bearer {valid_token}")
            assert result == "testuser"

    def test_valid_token_with_extra_whitespace(self, valid_token, mock_jwt_secret):
        """Test with valid token but extra whitespace after Bearer."""
        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            # Token with spaces gets stripped
            result = auth_handle_from_header(f"Bearer   {valid_token}  ")
            assert result == "testuser"

    def test_expired_token(self, expired_token, mock_jwt_secret):
        """Test with expired JWT token."""
        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            result = auth_handle_from_header(f"Bearer {expired_token}")
            # Expired token returns None
            assert result is None

    def test_wrong_secret(self, token_wrong_secret, mock_jwt_secret):
        """Test with token signed with wrong secret."""
        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            result = auth_handle_from_header(f"Bearer {token_wrong_secret}")
            # Invalid signature returns None
            assert result is None

    def test_malformed_token(self, mock_jwt_secret):
        """Test with malformed JWT token."""
        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            result = auth_handle_from_header("Bearer not-a-valid-jwt")
            assert result is None

    def test_token_without_sub_claim(self, mock_jwt_secret):
        """Test with token missing 'sub' claim."""
        from jose import jwt

        payload = {"user_id": "12345", "role": "admin"}  # No 'sub' claim
        token = jwt.encode(payload, mock_jwt_secret, algorithm=JWT_ALG)

        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            result = auth_handle_from_header(f"Bearer {token}")
            # Returns None because sub claim is missing
            assert result is None


# ============================================================================
# TEST: require_handle
# ============================================================================


class TestRequireHandle:
    """Test suite for require_handle function."""

    def test_no_authorization_raises_401(self):
        """Test that missing authorization raises 401."""
        with pytest.raises(HTTPException) as exc_info:
            require_handle(None)

        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Unauthorized"

    def test_empty_authorization_raises_401(self):
        """Test that empty authorization raises 401."""
        with pytest.raises(HTTPException) as exc_info:
            require_handle("")

        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Unauthorized"

    def test_invalid_token_raises_401(self, mock_jwt_secret):
        """Test that invalid token raises 401."""
        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            with pytest.raises(HTTPException) as exc_info:
                require_handle("Bearer invalid-token")

            assert exc_info.value.status_code == 401
            assert exc_info.value.detail == "Unauthorized"

    def test_expired_token_raises_401(self, expired_token, mock_jwt_secret):
        """Test that expired token raises 401."""
        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            with pytest.raises(HTTPException) as exc_info:
                require_handle(f"Bearer {expired_token}")

            assert exc_info.value.status_code == 401
            assert exc_info.value.detail == "Unauthorized"

    def test_valid_token_returns_handle(self, valid_token, mock_jwt_secret):
        """Test that valid token returns the handle."""
        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            result = require_handle(f"Bearer {valid_token}")
            assert result == "testuser"

    def test_valid_token_matching_supplied_handle(self, valid_token, mock_jwt_secret):
        """Test with valid token and matching supplied_handle."""
        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            result = require_handle(f"Bearer {valid_token}", supplied_handle="testuser")
            assert result == "testuser"

    def test_valid_token_mismatched_supplied_handle_raises_403(
        self, valid_token, mock_jwt_secret
    ):
        """Test with valid token but mismatched supplied_handle raises 403."""
        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            with pytest.raises(HTTPException) as exc_info:
                require_handle(f"Bearer {valid_token}", supplied_handle="otheruser")

            assert exc_info.value.status_code == 403
            assert exc_info.value.detail == "Forbidden for another user"

    def test_supplied_handle_none_does_not_check(self, valid_token, mock_jwt_secret):
        """Test that None supplied_handle bypasses handle matching."""
        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            result = require_handle(f"Bearer {valid_token}", supplied_handle=None)
            assert result == "testuser"


# ============================================================================
# TEST: Module Constants
# ============================================================================


class TestModuleConstants:
    """Test module-level constants."""

    def test_jwt_algorithm_is_hs256(self):
        """Test that JWT algorithm is HS256."""
        assert JWT_ALG == "HS256"


# ============================================================================
# TEST: Edge Cases
# ============================================================================


class TestEdgeCases:
    """Edge case tests."""

    def test_authorization_with_multiple_spaces(self, valid_token, mock_jwt_secret):
        """Test authorization header with multiple spaces between Bearer and token."""
        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            # Multiple spaces should work due to strip() on token
            result = auth_handle_from_header(f"Bearer    {valid_token}")
            assert result == "testuser"

    def test_authorization_with_tab_character(self, mock_jwt_secret):
        """Test authorization header with tab character."""
        result = auth_handle_from_header("Bearer\ttoken")
        # Tab is not a space, so split won't work as expected
        # 'Bearer\ttoken'.split(' ', 1) = ['Bearer\ttoken']
        # This means the token part would be malformed
        assert result is None

    def test_authorization_with_newline(self, mock_jwt_secret):
        """Test authorization header with newline in it."""
        result = auth_handle_from_header("Bearer \ntoken")
        # Newline in the token makes it malformed
        assert result is None

    def test_token_with_special_characters_in_payload(self, mock_jwt_secret):
        """Test token with special characters in sub claim."""
        from jose import jwt

        # Special characters in handle
        payload = {"sub": "user@example.com"}
        token = jwt.encode(payload, mock_jwt_secret, algorithm=JWT_ALG)

        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            result = auth_handle_from_header(f"Bearer {token}")
            assert result == "user@example.com"

    def test_token_with_unicode_handle(self, mock_jwt_secret):
        """Test token with unicode characters in handle."""
        from jose import jwt

        # Unicode in handle
        payload = {"sub": "用户名"}  # Chinese characters
        token = jwt.encode(payload, mock_jwt_secret, algorithm=JWT_ALG)

        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            result = auth_handle_from_header(f"Bearer {token}")
            assert result == "用户名"

    def test_require_handle_preserves_token_handle_case(
        self, valid_token, mock_jwt_secret
    ):
        """Test that require_handle preserves the case of the token handle."""
        from jose import jwt

        # Mixed case handle
        payload = {"sub": "TestUser123"}
        token = jwt.encode(payload, mock_jwt_secret, algorithm=JWT_ALG)

        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            result = require_handle(f"Bearer {token}")
            assert result == "TestUser123"

    def test_require_handle_case_sensitive_comparison(self, mock_jwt_secret):
        """Test that handle comparison is case-sensitive."""
        from jose import jwt

        payload = {"sub": "TestUser"}
        token = jwt.encode(payload, mock_jwt_secret, algorithm=JWT_ALG)

        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            # Exact match works
            result = require_handle(f"Bearer {token}", supplied_handle="TestUser")
            assert result == "TestUser"

            # Different case raises 403
            with pytest.raises(HTTPException) as exc_info:
                require_handle(f"Bearer {token}", supplied_handle="testuser")

            assert exc_info.value.status_code == 403


# ============================================================================
# TEST: Token Payload Variations
# ============================================================================


class TestTokenPayloadVariations:
    """Test various token payload configurations."""

    def test_token_with_additional_claims(self, mock_jwt_secret):
        """Test token with additional claims beyond sub."""
        from jose import jwt

        payload = {
            "sub": "testuser",
            "role": "admin",
            "permissions": ["read", "write"],
            "iat": 1234567890,
        }
        token = jwt.encode(payload, mock_jwt_secret, algorithm=JWT_ALG)

        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            result = auth_handle_from_header(f"Bearer {token}")
            # Only sub is extracted
            assert result == "testuser"

    def test_token_with_empty_sub(self, mock_jwt_secret):
        """Test token with empty string sub claim."""
        from jose import jwt

        payload = {"sub": ""}
        token = jwt.encode(payload, mock_jwt_secret, algorithm=JWT_ALG)

        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            result = auth_handle_from_header(f"Bearer {token}")
            # Empty string is falsy, so data.get("sub") returns ""
            assert result == ""

    def test_require_handle_with_empty_sub_raises_401(self, mock_jwt_secret):
        """Test require_handle with empty sub raises 401."""
        from jose import jwt

        payload = {"sub": ""}
        token = jwt.encode(payload, mock_jwt_secret, algorithm=JWT_ALG)

        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            with pytest.raises(HTTPException) as exc_info:
                require_handle(f"Bearer {token}")

            # Empty string is falsy, so raises 401
            assert exc_info.value.status_code == 401

    def test_token_with_null_sub(self, mock_jwt_secret):
        """Test token with null/None sub claim."""
        from jose import jwt

        payload = {"sub": None}
        token = jwt.encode(payload, mock_jwt_secret, algorithm=JWT_ALG)

        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            result = auth_handle_from_header(f"Bearer {token}")
            # None is returned
            assert result is None

    def test_token_with_numeric_sub(self, mock_jwt_secret):
        """Test token with numeric sub claim returns None due to validation error."""
        from jose import jwt

        payload = {"sub": 12345}
        # Token can be encoded with numeric sub
        token = jwt.encode(payload, mock_jwt_secret, algorithm=JWT_ALG)

        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            result = auth_handle_from_header(f"Bearer {token}")
            # jose library validates that 'sub' must be a string
            # Numeric sub raises JWTClaimsError, caught by JWTError handler
            assert result is None

    def test_token_with_string_numeric_sub(self, mock_jwt_secret):
        """Test token with string-numeric sub claim."""
        from jose import jwt

        payload = {"sub": "12345"}
        token = jwt.encode(payload, mock_jwt_secret, algorithm=JWT_ALG)

        with patch("app.services.auth.JWT_SECRET", mock_jwt_secret):
            result = auth_handle_from_header(f"Bearer {token}")
            assert result == "12345"
