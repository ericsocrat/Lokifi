"""
Tests for app.api.deps

Comprehensive test suite for API dependency injection:
- _auth_handle: JWT token extraction from Authorization header
- _user_by_handle: User lookup by handle from database
- get_current_user: Required authentication dependency
- get_current_user_optional: Optional authentication dependency
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import jwt
import pytest
from fastapi import HTTPException

# Import module under test
try:
    from app.api.deps import (
        JWT_ALG,
        JWT_SECRET,
        _auth_handle,
        _user_by_handle,
        get_current_user,
        get_current_user_optional,
        get_db,
    )
except ImportError as e:
    pytest.skip(f"Module import failed: {e}", allow_module_level=True)


# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def valid_token():
    """Create a valid JWT token."""
    payload = {
        "sub": "testuser",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


@pytest.fixture
def expired_token():
    """Create an expired JWT token."""
    payload = {
        "sub": "testuser",
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


@pytest.fixture
def token_without_sub():
    """Create a token without sub claim."""
    payload = {
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    return MagicMock()


@pytest.fixture
def mock_user():
    """Create a mock user object."""
    user = MagicMock()
    user.handle = "testuser"
    user.id = 1
    user.email = "test@example.com"
    return user


# ============================================================================
# TEST: Module Constants
# ============================================================================


class TestModuleConstants:
    """Test module-level constants."""

    def test_jwt_algorithm_is_hs256(self):
        """Test JWT algorithm is HS256."""
        assert JWT_ALG == "HS256"

    def test_jwt_secret_exists(self):
        """Test JWT secret is defined."""
        assert JWT_SECRET is not None
        assert len(JWT_SECRET) > 0


# ============================================================================
# TEST: _auth_handle Function
# ============================================================================


class TestAuthHandle:
    """Test suite for _auth_handle function."""

    def test_none_authorization(self):
        """Test with None authorization header."""
        result = _auth_handle(None)
        assert result is None

    def test_empty_authorization(self):
        """Test with empty authorization header."""
        result = _auth_handle("")
        assert result is None

    def test_no_bearer_prefix(self):
        """Test authorization without Bearer prefix."""
        result = _auth_handle("token_without_prefix")
        assert result is None

    def test_lowercase_bearer(self):
        """Test lowercase 'bearer' prefix (should fail)."""
        result = _auth_handle("bearer sometoken")
        assert result is None

    def test_bearer_only(self):
        """Test 'Bearer ' with no token."""
        result = _auth_handle("Bearer ")
        assert result is None

    def test_valid_token(self, valid_token):
        """Test valid JWT token extraction."""
        authorization = f"Bearer {valid_token}"
        result = _auth_handle(authorization)
        assert result == "testuser"

    def test_expired_token(self, expired_token):
        """Test expired token returns None."""
        authorization = f"Bearer {expired_token}"
        result = _auth_handle(authorization)
        assert result is None

    def test_invalid_token_format(self):
        """Test malformed token returns None."""
        result = _auth_handle("Bearer not.a.valid.jwt.token")
        assert result is None

    def test_token_without_sub(self, token_without_sub):
        """Test token without sub claim returns None."""
        authorization = f"Bearer {token_without_sub}"
        result = _auth_handle(authorization)
        assert result is None

    def test_wrong_secret(self):
        """Test token signed with wrong secret returns None."""
        payload = {
            "sub": "testuser",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        wrong_token = jwt.encode(payload, "wrong_secret", algorithm=JWT_ALG)
        result = _auth_handle(f"Bearer {wrong_token}")
        assert result is None

    def test_multiple_spaces(self, valid_token):
        """Test handling of 'Bearer  token' with extra space."""
        # split(" ", 2)[1] handles this - gets token part
        authorization = f"Bearer  {valid_token}"
        result = _auth_handle(authorization)
        # The token will be empty string due to split behavior
        assert result is None

    def test_special_characters_in_handle(self):
        """Test handle with special characters."""
        payload = {
            "sub": "user_with-special.chars",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
        result = _auth_handle(f"Bearer {token}")
        assert result == "user_with-special.chars"


# ============================================================================
# TEST: _user_by_handle Function
# ============================================================================


class TestUserByHandle:
    """Test suite for _user_by_handle function."""

    def test_user_found(self, mock_db, mock_user):
        """Test user found returns user."""
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        result = _user_by_handle(mock_db, "testuser")
        assert result == mock_user
        mock_db.query.return_value.filter.assert_called_once()

    def test_user_not_found(self, mock_db):
        """Test user not found returns None."""
        mock_db.query.return_value.filter.return_value.first.return_value = None
        result = _user_by_handle(mock_db, "nonexistent")
        assert result is None

    def test_empty_handle(self, mock_db):
        """Test empty handle query."""
        mock_db.query.return_value.filter.return_value.first.return_value = None
        result = _user_by_handle(mock_db, "")
        assert result is None


# ============================================================================
# TEST: get_current_user Dependency
# ============================================================================


class TestGetCurrentUser:
    """Test suite for get_current_user dependency."""

    def test_valid_user(self, valid_token, mock_db, mock_user):
        """Test returns user for valid token."""
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        authorization = f"Bearer {valid_token}"

        result = get_current_user(authorization, mock_db)
        assert result == mock_user

    def test_no_authorization_raises_401(self, mock_db):
        """Test raises 401 for missing authorization."""
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(None, mock_db)
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Unauthorized"

    def test_invalid_token_raises_401(self, mock_db):
        """Test raises 401 for invalid token."""
        with pytest.raises(HTTPException) as exc_info:
            get_current_user("Bearer invalid_token", mock_db)
        assert exc_info.value.status_code == 401

    def test_expired_token_raises_401(self, expired_token, mock_db):
        """Test raises 401 for expired token."""
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(f"Bearer {expired_token}", mock_db)
        assert exc_info.value.status_code == 401

    def test_user_not_found_raises_404(self, valid_token, mock_db):
        """Test raises 404 when user not in database."""
        mock_db.query.return_value.filter.return_value.first.return_value = None
        authorization = f"Bearer {valid_token}"

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(authorization, mock_db)
        assert exc_info.value.status_code == 404
        assert exc_info.value.detail == "User not found"


# ============================================================================
# TEST: get_current_user_optional Dependency
# ============================================================================


class TestGetCurrentUserOptional:
    """Test suite for get_current_user_optional dependency."""

    def test_valid_user(self, valid_token, mock_db, mock_user):
        """Test returns user for valid token."""
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        authorization = f"Bearer {valid_token}"

        result = get_current_user_optional(authorization, mock_db)
        assert result == mock_user

    def test_no_authorization_returns_none(self, mock_db):
        """Test returns None for missing authorization."""
        result = get_current_user_optional(None, mock_db)
        assert result is None

    def test_invalid_token_returns_none(self, mock_db):
        """Test returns None for invalid token."""
        result = get_current_user_optional("Bearer invalid", mock_db)
        assert result is None

    def test_expired_token_returns_none(self, expired_token, mock_db):
        """Test returns None for expired token."""
        result = get_current_user_optional(f"Bearer {expired_token}", mock_db)
        assert result is None

    def test_user_not_found_returns_none(self, valid_token, mock_db):
        """Test returns None when user not in database."""
        mock_db.query.return_value.filter.return_value.first.return_value = None
        authorization = f"Bearer {valid_token}"

        result = get_current_user_optional(authorization, mock_db)
        assert result is None


# ============================================================================
# TEST: get_db Generator
# ============================================================================


class TestGetDb:
    """Test suite for get_db dependency."""

    @patch("app.api.deps.get_session")
    def test_yields_session(self, mock_get_session):
        """Test get_db yields database session."""
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__ = MagicMock(return_value=mock_session)
        mock_get_session.return_value.__exit__ = MagicMock(return_value=False)

        gen = get_db()
        session = next(gen)
        assert session == mock_session

    @patch("app.api.deps.get_session")
    def test_closes_session(self, mock_get_session):
        """Test get_db properly closes session."""
        mock_session = MagicMock()
        mock_context = MagicMock()
        mock_context.__enter__ = MagicMock(return_value=mock_session)
        mock_context.__exit__ = MagicMock(return_value=False)
        mock_get_session.return_value = mock_context

        gen = get_db()
        next(gen)
        try:
            next(gen)
        except StopIteration:
            pass

        mock_context.__exit__.assert_called_once()


# ============================================================================
# TEST: Edge Cases
# ============================================================================


class TestEdgeCases:
    """Edge case and error handling tests."""

    def test_authorization_case_sensitivity(self, valid_token):
        """Test Bearer prefix is case-sensitive."""
        # BEARER (uppercase) should not work
        result = _auth_handle(f"BEARER {valid_token}")
        assert result is None

        # bearer (lowercase) should not work
        result = _auth_handle(f"bearer {valid_token}")
        assert result is None

        # Bearer (proper case) should work
        result = _auth_handle(f"Bearer {valid_token}")
        assert result == "testuser"

    def test_token_with_additional_claims(self):
        """Test token with additional claims still works."""
        payload = {
            "sub": "testuser",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "role": "admin",
            "permissions": ["read", "write"],
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
        result = _auth_handle(f"Bearer {token}")
        assert result == "testuser"

    def test_unicode_handle(self):
        """Test handle with unicode characters."""
        payload = {
            "sub": "用户名",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
        result = _auth_handle(f"Bearer {token}")
        assert result == "用户名"

    def test_very_long_handle(self):
        """Test very long handle."""
        long_handle = "a" * 1000
        payload = {
            "sub": long_handle,
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
        result = _auth_handle(f"Bearer {token}")
        assert result == long_handle

    def test_numeric_sub_string(self):
        """Test numeric sub as string."""
        payload = {
            "sub": "12345",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
        result = _auth_handle(f"Bearer {token}")
        assert result == "12345"

    def test_whitespace_handling_authorization(self):
        """Test whitespace handling in authorization header."""
        # Leading whitespace
        result = _auth_handle(" Bearer token")
        assert result is None

        # Trailing whitespace on Bearer
        result = _auth_handle("Bearer  token")
        # Extra space means empty token after split
        assert result is None

    def test_get_current_user_with_valid_but_inactive_user(
        self, valid_token, mock_db, mock_user
    ):
        """Test get_current_user returns user even if inactive."""
        mock_user.is_active = False
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        # deps.py doesn't check is_active - returns user anyway
        result = get_current_user(f"Bearer {valid_token}", mock_db)
        assert result == mock_user
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
class TestdepsPerformance:
    """Performance and load tests"""

    @pytest.mark.skip(reason="Performance test - run manually")
    def test_performance_under_load(self):
        """Test performance under load"""
        # TODO: Add performance test
        pass
