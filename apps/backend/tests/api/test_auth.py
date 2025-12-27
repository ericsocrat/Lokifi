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

import pytest
from app.api.routes.auth import (
    JWT_ALG,
    JWT_SECRET,
    JWT_TTL_MIN,
    LoginPayload,
    RegisterPayload,
    _auth_handle,
    _issue_token,
    _user_by_handle,
    login,
    me,
    register,
)
from fastapi import HTTPException
from jose import jwt


class TestUserByHandle:
    """Tests for _user_by_handle helper function."""

    def test_finds_existing_user(self):
        """Should return user when handle exists."""
        mock_user = Mock(handle="testuser", password_hash="hash123")
        mock_db = Mock()
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result

        result = _user_by_handle(mock_db, "testuser")

        assert result == mock_user
        assert mock_db.execute.called

    def test_returns_none_for_nonexistent_user(self):
        """Should return None when handle doesn't exist."""
        mock_db = Mock()
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        result = _user_by_handle(mock_db, "nonexistent")

        assert result is None


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

    @patch("app.api.routes.auth.get_session")
    def test_successful_registration(self, mock_get_session):
        """Should create user and return valid token on successful registration."""
        # Mock database session
        mock_db = Mock()
        mock_db.__enter__ = Mock(return_value=mock_db)
        mock_db.__exit__ = Mock(return_value=None)
        mock_get_session.return_value = mock_db

        # Mock no existing user
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

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

    @patch("app.api.routes.auth.get_session")
    def test_duplicate_handle_raises_409(self, mock_get_session):
        """Should raise 409 Conflict when handle already exists."""
        # Mock database session
        mock_db = Mock()
        mock_db.__enter__ = Mock(return_value=mock_db)
        mock_db.__exit__ = Mock(return_value=None)
        mock_get_session.return_value = mock_db

        # Mock existing user
        existing_user = Mock(handle="existinguser")
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = existing_user
        mock_db.execute.return_value = mock_result

        payload = RegisterPayload(handle="existinguser", password="password123")

        with pytest.raises(HTTPException) as exc_info:
            register(payload)

        assert exc_info.value.status_code == 409
        assert "Handle already exists" in exc_info.value.detail

    @patch("app.api.routes.auth.get_session")
    def test_password_is_hashed(self, mock_get_session):
        """Should hash password before storing in database."""
        # Mock database session
        mock_db = Mock()
        mock_db.__enter__ = Mock(return_value=mock_db)
        mock_db.__exit__ = Mock(return_value=None)
        mock_get_session.return_value = mock_db

        # Mock no existing user
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

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

    @patch("app.api.routes.auth.get_session")
    def test_successful_login(self, mock_get_session):
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
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result

        payload = LoginPayload(handle="testuser", password="correct_password")

        result = login(payload)

        # Should return valid token
        assert result.access_token is not None
        assert result.token_type == "bearer"
        assert result.expires_at > 0

        # Verify token contains correct handle
        token_payload = jwt.decode(result.access_token, JWT_SECRET, algorithms=[JWT_ALG])
        assert token_payload["sub"] == "testuser"

    @patch("app.api.routes.auth.get_session")
    def test_nonexistent_user_raises_401(self, mock_get_session):
        """Should raise 401 Unauthorized when user doesn't exist."""
        # Mock database session
        mock_db = Mock()
        mock_db.__enter__ = Mock(return_value=mock_db)
        mock_db.__exit__ = Mock(return_value=None)
        mock_get_session.return_value = mock_db

        # Mock no user found
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        payload = LoginPayload(handle="nonexistent", password="password123")

        with pytest.raises(HTTPException) as exc_info:
            login(payload)

        assert exc_info.value.status_code == 401
        assert "Invalid credentials" in exc_info.value.detail

    @patch("app.api.routes.auth.get_session")
    def test_wrong_password_raises_401(self, mock_get_session):
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
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result

        # Try to login with wrong password
        payload = LoginPayload(handle="testuser", password="wrong_password")

        with pytest.raises(HTTPException) as exc_info:
            login(payload)

        assert exc_info.value.status_code == 401
        assert "Invalid credentials" in exc_info.value.detail

    @patch("app.api.routes.auth.get_session")
    def test_user_without_password_hash_raises_401(self, mock_get_session):
        """Should raise 401 when user has no password hash."""
        # Mock database session
        mock_db = Mock()
        mock_db.__enter__ = Mock(return_value=mock_db)
        mock_db.__exit__ = Mock(return_value=None)
        mock_get_session.return_value = mock_db

        # Mock user without password hash
        mock_user = Mock(handle="testuser", password_hash=None)
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result

        payload = LoginPayload(handle="testuser", password="password123")

        with pytest.raises(HTTPException) as exc_info:
            login(payload)

        assert exc_info.value.status_code == 401


class TestMeEndpoint:
    """Tests for GET /auth/me endpoint."""

    @patch("app.api.routes.auth.get_session")
    def test_returns_user_info_for_valid_token(self, mock_get_session):
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
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result

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

    @patch("app.api.routes.auth.get_session")
    def test_raises_404_for_deleted_user(self, mock_get_session):
        """Should raise 404 when token is valid but user no longer exists."""
        # Mock database session
        mock_db = Mock()
        mock_db.__enter__ = Mock(return_value=mock_db)
        mock_db.__exit__ = Mock(return_value=None)
        mock_get_session.return_value = mock_db

        # Mock user not found
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        # Create valid token
        token_out = _issue_token("deleteduser")
        authorization = f"Bearer {token_out.access_token}"

        with pytest.raises(HTTPException) as exc_info:
            me(authorization)

        assert exc_info.value.status_code == 404
        assert "User not found" in exc_info.value.detail


class TestAuthIntegration:
    """Integration tests for complete authentication flows."""

    @patch("app.api.routes.auth.get_session")
    def test_complete_register_login_me_flow(self, mock_get_session):
        """Should handle complete auth flow: register → login → /me."""
        from argon2 import PasswordHasher

        # Mock database session
        mock_db = Mock()
        mock_db.__enter__ = Mock(return_value=mock_db)
        mock_db.__exit__ = Mock(return_value=None)
        mock_get_session.return_value = mock_db

        # Step 1: Register (no existing user)
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        register_payload = RegisterPayload(
            handle="integrationuser",
            password="password123",
            avatar_url="https://example.com/avatar.jpg",
            bio="Integration test user",
        )
        register_result = register(register_payload)
        assert register_result.access_token is not None

        # Step 2: Login (user exists now with real Argon2 hash)
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
        mock_result.scalar_one_or_none.return_value = mock_user

        login_payload = LoginPayload(handle="integrationuser", password="password123")
        login_result = login(login_payload)
        assert login_result.access_token is not None

        # Step 3: Access /me endpoint with login token
        authorization = f"Bearer {login_result.access_token}"
        me_result = me(authorization)

        assert me_result["handle"] == "integrationuser"
        assert me_result["avatar_url"] == "https://example.com/avatar.jpg"
        assert me_result["bio"] == "Integration test user"
