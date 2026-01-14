"""
Comprehensive tests for authentication API endpoints.

Tests cover:
- User registration (happy path, validation, duplicates)
- User login (valid credentials, invalid credentials)
- Token-based authentication (/me endpoint)
- JWT token validation and expiry
- Edge cases and error handling
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch

import jwt
import pytest
from fastapi import HTTPException

from app.api.routes.auth import (
    JWT_ALG,
    JWT_SECRET,
    JWT_TTL_MIN,
    LoginPayload,
    RegisterPayload,
    _auth_handle,
    _issue_token,
    login,
    me,
    register,
)
from app.core.cached_queries import get_user_by_handle  # Phase 4b-1: Use cached query

# Phase 4b-1: Removed _user_by_handle tests - now using cached get_user_by_handle
# class TestUserByHandle:
#     """Tests for _user_by_handle helper function."""
#     ... tests removed


class TestIssueToken:
    """Tests for _issue_token helper function."""

    def test_generates_valid_token(self):
        """Should generate JWT token with correct structure."""
        result = _issue_token("testuser")

        assert result.access_token is not None
        assert result.token_type == "bearer"
        assert result.expires_at > 0

        # Verify token can be decoded
        payload = jwt.decode(result.access_token, JWT_SECRET, algorithms=[JWT_ALG])
        assert payload["sub"] == "testuser"
        assert "iat" in payload
        assert "exp" in payload

    def test_token_expires_at_correct_time(self):
        """Should set expiration time according to JWT_TTL_MIN."""
        now = datetime.now(timezone.utc)
        result = _issue_token("testuser")

        payload = jwt.decode(result.access_token, JWT_SECRET, algorithms=[JWT_ALG])
        exp_time = datetime.fromtimestamp(payload["exp"], timezone.utc)
        iat_time = datetime.fromtimestamp(payload["iat"], timezone.utc)

        # Expiration should be JWT_TTL_MIN minutes after issue time
        expected_diff = timedelta(minutes=JWT_TTL_MIN)
        actual_diff = exp_time - iat_time

        # Allow 1 second tolerance for execution time
        assert abs(actual_diff.total_seconds() - expected_diff.total_seconds()) < 1


class TestAuthHandle:
    """Tests for _auth_handle token validation function."""

    def test_extracts_handle_from_valid_token(self):
        """Should extract handle from valid Bearer token."""
        token_out = _issue_token("validuser")
        authorization = f"Bearer {token_out.access_token}"

        result = _auth_handle(authorization)

        assert result == "validuser"

    def test_returns_none_for_missing_authorization(self):
        """Should return None when authorization header is missing."""
        result = _auth_handle(None)
        assert result is None

    def test_returns_none_for_invalid_bearer_format(self):
        """Should return None when authorization doesn't start with 'Bearer '."""
        result = _auth_handle("InvalidFormat token123")
        assert result is None

    def test_returns_none_for_expired_token(self):
        """Should return None when token is expired."""
        # Create token with past expiration
        past_time = datetime.now(timezone.utc) - timedelta(hours=1)
        payload = {
            "sub": "testuser",
            "iat": int(past_time.timestamp()),
            "exp": int((past_time + timedelta(minutes=1)).timestamp()),
        }
        expired_token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
        authorization = f"Bearer {expired_token}"

        result = _auth_handle(authorization)

        assert result is None

    def test_returns_none_for_invalid_signature(self):
        """Should return None when token has invalid signature."""
        # Create token with wrong secret
        payload = {"sub": "testuser", "iat": 123, "exp": 456}
        invalid_token = jwt.encode(payload, "wrong_secret", algorithm=JWT_ALG)
        authorization = f"Bearer {invalid_token}"

        result = _auth_handle(authorization)

        assert result is None

    def test_handles_case_insensitive_bearer(self):
        """Should accept 'bearer', 'Bearer', 'BEARER' prefix."""
        token_out = _issue_token("testuser")

        for prefix in ["bearer", "Bearer", "BEARER"]:
            authorization = f"{prefix} {token_out.access_token}"
            result = _auth_handle(authorization)
            assert result == "testuser"


class TestRegisterEndpoint:
    """Tests for POST /auth/register endpoint."""

    @patch("app.api.routes.auth.get_user_by_handle")
    @patch("app.api.routes.auth.get_session")
    def test_successful_registration(self, mock_get_session, mock_get_user):
        """Should create user and return valid token on successful registration."""
        # Mock database session
        mock_db = Mock()
        mock_db.__enter__ = Mock(return_value=mock_db)
        mock_db.__exit__ = Mock(return_value=None)
        mock_get_session.return_value = mock_db

        # Phase 4b-1: Mock cached query to return None (no existing user)
        mock_get_user.return_value = None

        payload = RegisterPayload(
            handle="newuser",
            password="password123",
            avatar_url="https://example.com/avatar.jpg",
            bio="Test bio",
        )

        result = register(payload)

        # Should return valid token
        assert result.access_token is not None
        assert result.token_type == "bearer"
        assert result.expires_at > 0

        # Should have created user in database
        assert mock_db.add.called
        assert mock_db.flush.called

    @patch("app.api.routes.auth.get_user_by_handle")
    @patch("app.api.routes.auth.get_session")
    def test_duplicate_handle_raises_409(self, mock_get_session, mock_get_user):
        """Should raise 409 Conflict when handle already exists."""
        # Mock database session
        mock_db = Mock()
        mock_db.__enter__ = Mock(return_value=mock_db)
        mock_db.__exit__ = Mock(return_value=None)
        mock_get_session.return_value = mock_db

        # Phase 4b-1: Mock cached query to return existing user
        existing_user = Mock(handle="existinguser")
        mock_get_user.return_value = existing_user

        payload = RegisterPayload(handle="existinguser", password="password123")

        with pytest.raises(HTTPException) as exc_info:
            register(payload)

        assert exc_info.value.status_code == 409
        assert "Handle already exists" in exc_info.value.detail

    @patch("app.api.routes.auth.get_user_by_handle")
    @patch("app.api.routes.auth.get_session")
    def test_password_is_hashed(self, mock_get_session, mock_get_user):
        """Should hash password before storing in database."""
        # Mock database session
        mock_db = Mock()
        mock_db.__enter__ = Mock(return_value=mock_db)
        mock_db.__exit__ = Mock(return_value=None)
        mock_get_session.return_value = mock_db

        # Mock no existing user
        mock_get_user.return_value = None

        payload = RegisterPayload(handle="newuser", password="password123")

        register(payload)

        # Verify user was created with hashed password
        call_args = mock_db.add.call_args
        user = call_args[0][0]

        # Password hash should not be plaintext
        assert user.password_hash != "plaintext_password"
        # Should be Argon2 hash (starts with $argon2id$)
        assert user.password_hash.startswith("$argon2id$")


class TestLoginEndpoint:
    """Tests for POST /auth/login endpoint."""

    @patch("app.api.routes.auth.get_user_by_handle")
    @patch("app.api.routes.auth.get_session")
    def test_successful_login(self, mock_get_session, mock_get_user):
        """Should return valid token on successful login."""
        from argon2 import PasswordHasher

        # Mock database session
        mock_db = Mock()
        mock_db.__enter__ = Mock(return_value=mock_db)
        mock_db.__exit__ = Mock(return_value=None)
        mock_get_session.return_value = mock_db

        # Create real Argon2 hash for testing
        ph = PasswordHasher()
        real_hash = ph.hash("correct_password")

        # Mock existing user with real password hash
        mock_user = Mock(handle="testuser", password_hash=real_hash)
        mock_get_user.return_value = mock_user

        payload = LoginPayload(handle="testuser", password="correct_password")

        result = login(payload)

        # Should return valid token
        assert result.access_token is not None
        assert result.token_type == "bearer"
        assert result.expires_at > 0

        # Verify token contains correct handle
        token_payload = jwt.decode(
            result.access_token, JWT_SECRET, algorithms=[JWT_ALG]
        )
        assert token_payload["sub"] == "testuser"

    @patch("app.api.routes.auth.get_user_by_handle")
    @patch("app.api.routes.auth.get_session")
    def test_nonexistent_user_raises_401(self, mock_get_session, mock_get_user):
        """Should raise 401 Unauthorized when user doesn't exist."""
        # Mock database session
        mock_db = Mock()
        mock_db.__enter__ = Mock(return_value=mock_db)
        mock_db.__exit__ = Mock(return_value=None)
        mock_get_session.return_value = mock_db

        # Mock no user found
        mock_get_user.return_value = None

        payload = LoginPayload(handle="nonexistent", password="password123")

        with pytest.raises(HTTPException) as exc_info:
            login(payload)

        assert exc_info.value.status_code == 401
        assert "Invalid credentials" in exc_info.value.detail

    @patch("app.api.routes.auth.get_user_by_handle")
    @patch("app.api.routes.auth.get_session")
    def test_wrong_password_raises_401(self, mock_get_session, mock_get_user):
        """Should raise 401 Unauthorized when password is incorrect."""
        from argon2 import PasswordHasher

        # Mock database session
        mock_db = Mock()
        mock_db.__enter__ = Mock(return_value=mock_db)
        mock_db.__exit__ = Mock(return_value=None)
        mock_get_session.return_value = mock_db

        # Create real Argon2 hash for correct password
        ph = PasswordHasher()
        real_hash = ph.hash("correct_password")

        # Mock existing user with real hash
        mock_user = Mock(handle="testuser", password_hash=real_hash)
        mock_get_user.return_value = mock_user

        # Try to login with wrong password
        payload = LoginPayload(handle="testuser", password="wrong_password")

        with pytest.raises(HTTPException) as exc_info:
            login(payload)

        assert exc_info.value.status_code == 401
        assert "Invalid credentials" in exc_info.value.detail

    @patch("app.api.routes.auth.get_user_by_handle")
    @patch("app.api.routes.auth.get_session")
    def test_user_without_password_hash_raises_401(
        self, mock_get_session, mock_get_user
    ):
        """Should raise 401 when user has no password hash."""
        # Mock database session
        mock_db = Mock()
        mock_db.__enter__ = Mock(return_value=mock_db)
        mock_db.__exit__ = Mock(return_value=None)
        mock_get_session.return_value = mock_db

        # Mock user without password hash
        mock_user = Mock(handle="testuser", password_hash=None)
        mock_get_user.return_value = mock_user

        payload = LoginPayload(handle="testuser", password="password123")

        with pytest.raises(HTTPException) as exc_info:
            login(payload)

        assert exc_info.value.status_code == 401


class TestMeEndpoint:
    """Tests for GET /auth/me endpoint."""

    @patch("app.api.routes.auth.get_user_by_handle")
    @patch("app.api.routes.auth.get_session")
    def test_returns_user_info_for_valid_token(self, mock_get_session, mock_get_user):
        """Should return user information when valid token is provided."""
        # Mock database session
        mock_db = Mock()
        mock_db.__enter__ = Mock(return_value=mock_db)
        mock_db.__exit__ = Mock(return_value=None)
        mock_get_session.return_value = mock_db

        # Mock user
        created_at = datetime.now(timezone.utc)
        mock_user = Mock(
            handle="testuser",
            avatar_url="https://example.com/avatar.jpg",
            bio="Test bio",
            created_at=created_at,
        )
        mock_get_user.return_value = mock_user

        # Create valid token
        token_out = _issue_token("testuser")
        authorization = f"Bearer {token_out.access_token}"

        result = me(authorization)

        assert result["handle"] == "testuser"
        assert result["avatar_url"] == "https://example.com/avatar.jpg"
        assert result["bio"] == "Test bio"
        assert result["created_at"] == created_at.isoformat()

    def test_raises_401_for_missing_authorization(self):
        """Should raise 401 when authorization header is missing."""
        with pytest.raises(HTTPException) as exc_info:
            me(None)

        assert exc_info.value.status_code == 401
        assert "Unauthorized" in exc_info.value.detail

    def test_raises_401_for_invalid_token(self):
        """Should raise 401 when token is invalid."""
        # Invalid token format
        with pytest.raises(HTTPException) as exc_info:
            me("InvalidToken")

        assert exc_info.value.status_code == 401

    @patch("app.api.routes.auth.get_user_by_handle")
    @patch("app.api.routes.auth.get_session")
    def test_raises_404_for_deleted_user(self, mock_get_session, mock_get_user):
        """Should raise 404 when token is valid but user no longer exists."""
        # Mock database session
        mock_db = Mock()
        mock_db.__enter__ = Mock(return_value=mock_db)
        mock_db.__exit__ = Mock(return_value=None)
        mock_get_session.return_value = mock_db

        # Mock user not found
        mock_get_user.return_value = None

        # Create valid token
        token_out = _issue_token("deleteduser")
        authorization = f"Bearer {token_out.access_token}"

        with pytest.raises(HTTPException) as exc_info:
            me(authorization)

        assert exc_info.value.status_code == 404
        assert "User not found" in exc_info.value.detail


class TestAuthIntegration:
    """Integration tests for complete authentication flows."""

    @patch("app.api.routes.auth.get_user_by_handle")
    @patch("app.api.routes.auth.get_session")
    def test_complete_register_login_me_flow(self, mock_get_session, mock_get_user):
        """Should handle complete auth flow: register → login → /me."""
        from argon2 import PasswordHasher

        # Mock database session
        mock_db = Mock()
        mock_db.__enter__ = Mock(return_value=mock_db)
        mock_db.__exit__ = Mock(return_value=None)
        mock_get_session.return_value = mock_db

        # Step 1: Register (no existing user for first call)
        # Step 2: Login & Me (user exists for subsequent calls)
        ph = PasswordHasher()
        real_hash = ph.hash("password123")

        created_at = datetime.now(timezone.utc)
        mock_user = Mock(
            handle="integrationuser",
            password_hash=real_hash,
            avatar_url="https://example.com/avatar.jpg",
            bio="Integration test user",
            created_at=created_at,
        )

        # Use side_effect for multiple calls: None (register), user (login), user (me)
        mock_get_user.side_effect = [None, mock_user, mock_user]

        register_payload = RegisterPayload(
            handle="integrationuser",
            password="password123",
            avatar_url="https://example.com/avatar.jpg",
            bio="Integration test user",
        )
        register_result = register(register_payload)
        assert register_result.access_token is not None

        login_payload = LoginPayload(handle="integrationuser", password="password123")
        login_result = login(login_payload)
        assert login_result.access_token is not None

        # Step 3: Access /me endpoint with login token
        authorization = f"Bearer {login_result.access_token}"
        me_result = me(authorization)

        assert me_result["handle"] == "integrationuser"
        assert me_result["avatar_url"] == "https://example.com/avatar.jpg"
        assert me_result["bio"] == "Integration test user"
