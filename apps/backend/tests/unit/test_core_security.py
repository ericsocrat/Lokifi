"""
Comprehensive unit tests for app/core/security.py

Tests password hashing, JWT token creation/validation, and authentication utilities.
NO database required - pure unit tests for maximum coverage.
"""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException
from jose import jwt

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_jwt_token,
    create_refresh_token,
    hash_password,
    verify_jwt_token,
    verify_password,
)


class TestPasswordHashing:
    """Test password hashing and verification"""

    def test_hash_password_creates_hash(self):
        """Hash function should create a non-empty hash"""
        password = "TestUser123!!"
        hashed = hash_password(password)

        assert hashed is not None
        assert len(hashed) > 0
        assert hashed != password  # Hash should not equal plain text

    def test_hash_password_different_each_time(self):
        """Same password should produce different hashes (salted)"""
        password = "TestUser123!!"
        hash1 = hash_password(password)
        hash2 = hash_password(password)

        assert hash1 != hash2  # Argon2 uses random salt

    def test_verify_password_correct(self):
        """Correct password should verify successfully"""
        password = "CorrectPassword456!"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Incorrect password should fail verification"""
        password = "CorrectPassword456!"
        wrong_password = "WrongPassword789!"
        hashed = hash_password(password)

        assert verify_password(wrong_password, hashed) is False

    def test_verify_password_empty_string(self):
        """Empty password should fail verification"""
        password = "RealPassword123!"
        hashed = hash_password(password)

        assert verify_password("", hashed) is False

    def test_verify_password_similar_passwords(self):
        """Similar but different passwords should fail"""
        password = "Password123!"
        hashed = hash_password(password)

        assert verify_password("Password123", hashed) is False  # Missing !
        assert verify_password("password123!", hashed) is False  # Different case

    def test_hash_special_characters(self):
        """Password with special characters should hash correctly"""
        password = "P@ssw0rd!#$%^&*()"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True

    def test_hash_unicode_characters(self):
        """Password with unicode characters should hash correctly"""
        password = "P@ssw0rd_你好_🔐"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True


class TestJWTTokenCreation:
    """Test JWT token creation"""

    def test_create_jwt_token_basic(self):
        """Should create a valid JWT token"""
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_jwt_token(data)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

        # Token should have 3 parts (header.payload.signature)
        assert token.count(".") == 2

    def test_create_jwt_token_with_custom_expiry(self):
        """Should create token with custom expiration"""
        data = {"sub": "user123"}
        expires_delta = timedelta(minutes=30)
        token = create_jwt_token(data, expires_delta)

        # Decode without verification to check expiry
        jwt_secret = settings.get_jwt_secret()
        decoded = jwt.decode(token, jwt_secret, algorithms=[settings.JWT_ALGORITHM])

        exp = datetime.fromtimestamp(decoded["exp"], UTC)
        iat = datetime.fromtimestamp(decoded["iat"], UTC)

        # Should be approximately 30 minutes apart
        delta = exp - iat
        assert 29 <= delta.total_seconds() / 60 <= 31

    def test_create_jwt_token_default_expiry(self):
        """Should use default expiry when not specified"""
        data = {"sub": "user123"}
        token = create_jwt_token(data)

        jwt_secret = settings.get_jwt_secret()
        decoded = jwt.decode(token, jwt_secret, algorithms=[settings.JWT_ALGORITHM])

        exp = datetime.fromtimestamp(decoded["exp"], UTC)
        iat = datetime.fromtimestamp(decoded["iat"], UTC)

        # Should match JWT_EXPIRE_MINUTES setting
        expected_minutes = settings.JWT_EXPIRE_MINUTES
        delta = exp - iat
        assert (
            expected_minutes - 1 <= delta.total_seconds() / 60 <= expected_minutes + 1
        )

    def test_create_jwt_token_includes_claims(self):
        """Token should include all provided claims"""
        data = {
            "sub": "user456",
            "email": "user@example.com",
            "role": "admin",
            "custom_field": "custom_value",
        }
        token = create_jwt_token(data)

        jwt_secret = settings.get_jwt_secret()
        decoded = jwt.decode(token, jwt_secret, algorithms=[settings.JWT_ALGORITHM])

        assert decoded["sub"] == "user456"
        assert decoded["email"] == "user@example.com"
        assert decoded["role"] == "admin"
        assert decoded["custom_field"] == "custom_value"

    def test_create_jwt_token_includes_timestamps(self):
        """Token should include iat and exp timestamps"""
        data = {"sub": "user789"}
        token = create_jwt_token(data)

        jwt_secret = settings.get_jwt_secret()
        decoded = jwt.decode(token, jwt_secret, algorithms=[settings.JWT_ALGORITHM])

        assert "exp" in decoded
        assert "iat" in decoded
        assert decoded["exp"] > decoded["iat"]


class TestJWTTokenVerification:
    """Test JWT token verification"""

    def test_verify_valid_token(self):
        """Should successfully verify a valid token"""
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_jwt_token(data)

        payload = verify_jwt_token(token)

        assert payload["sub"] == "user123"
        assert payload["email"] == "test@example.com"

    def test_verify_expired_token(self):
        """Should raise exception for expired token"""
        data = {"sub": "user123"}
        expires_delta = timedelta(seconds=-1)  # Already expired
        token = create_jwt_token(data, expires_delta)

        with pytest.raises(HTTPException) as exc_info:
            verify_jwt_token(token)

        assert exc_info.value.status_code == 401
        assert "expired" in exc_info.value.detail.lower()

    def test_verify_invalid_signature(self):
        """Should raise exception for token with invalid signature"""
        data = {"sub": "user123"}
        token = create_jwt_token(data)

        # Tamper with the token
        parts = token.split(".")
        tampered_token = parts[0] + "." + parts[1] + ".invalidsignature"

        with pytest.raises(HTTPException) as exc_info:
            verify_jwt_token(tampered_token)

        assert exc_info.value.status_code == 401

    def test_verify_malformed_token(self):
        """Should raise exception for malformed token"""
        malformed_tokens = [
            "not.a.token",
            "invalid",
            "",
            "header.payload",  # Missing signature
            "a.b.c.d.e",  # Too many parts
        ]

        for token in malformed_tokens:
            with pytest.raises(HTTPException) as exc_info:
                verify_jwt_token(token)

            assert exc_info.value.status_code == 401

    def test_verify_token_with_wrong_algorithm(self):
        """Should reject token created with different algorithm"""
        data = {"sub": "user123"}

        # Create token with different algorithm
        jwt_secret = settings.get_jwt_secret()
        token = jwt.encode(data, jwt_secret, algorithm="HS512")

        with pytest.raises(HTTPException) as exc_info:
            verify_jwt_token(token)

        assert exc_info.value.status_code == 401


class TestAccessTokenCreation:
    """Test access token creation helper"""

    def test_create_access_token(self):
        """Should create valid access token with user data"""
        user_id = "user123"
        email = "user@example.com"

        token = create_access_token(user_id, email)

        assert token is not None
        assert isinstance(token, str)

        # Verify token contents
        jwt_secret = settings.get_jwt_secret()
        decoded = jwt.decode(token, jwt_secret, algorithms=[settings.JWT_ALGORITHM])

        assert decoded["sub"] == user_id
        assert decoded["email"] == email
        assert decoded["type"] == "access"

    def test_create_access_token_different_users(self):
        """Different users should get different tokens"""
        token1 = create_access_token("user1", "user1@example.com")
        token2 = create_access_token("user2", "user2@example.com")

        assert token1 != token2

        jwt_secret = settings.get_jwt_secret()
        decoded1 = jwt.decode(token1, jwt_secret, algorithms=[settings.JWT_ALGORITHM])
        decoded2 = jwt.decode(token2, jwt_secret, algorithms=[settings.JWT_ALGORITHM])

        assert decoded1["sub"] != decoded2["sub"]
        assert decoded1["email"] != decoded2["email"]


class TestRefreshTokenCreation:
    """Test refresh token creation helper"""

    def test_create_refresh_token(self):
        """Should create valid refresh token"""
        user_id = "user456"

        token = create_refresh_token(user_id)

        assert token is not None
        assert isinstance(token, str)

        # Verify token contents
        jwt_secret = settings.get_jwt_secret()
        decoded = jwt.decode(token, jwt_secret, algorithms=[settings.JWT_ALGORITHM])

        assert decoded["sub"] == user_id
        assert decoded["type"] == "refresh"

    def test_refresh_token_longer_expiry(self):
        """Refresh token should have longer expiry than access token"""
        user_id = "user789"

        access_token = create_access_token(user_id, "user@example.com")
        refresh_token = create_refresh_token(user_id)

        jwt_secret = settings.get_jwt_secret()
        access_decoded = jwt.decode(
            access_token, jwt_secret, algorithms=[settings.JWT_ALGORITHM]
        )
        refresh_decoded = jwt.decode(
            refresh_token, jwt_secret, algorithms=[settings.JWT_ALGORITHM]
        )

        access_exp = datetime.fromtimestamp(access_decoded["exp"], UTC)
        refresh_exp = datetime.fromtimestamp(refresh_decoded["exp"], UTC)

        # Refresh token should expire much later
        assert refresh_exp > access_exp

        # Should be approximately 30 days
        delta = refresh_exp - datetime.now(UTC)
        assert 28 <= delta.days <= 31


class TestTokenRoundTrip:
    """Test creating and verifying tokens"""

    def test_access_token_round_trip(self):
        """Create and verify access token"""
        user_id = "user123"
        email = "test@example.com"

        token = create_access_token(user_id, email)
        payload = verify_jwt_token(token)

        assert payload["sub"] == user_id
        assert payload["email"] == email
        assert payload["type"] == "access"

    def test_refresh_token_round_trip(self):
        """Create and verify refresh token"""
        user_id = "user456"

        token = create_refresh_token(user_id)
        payload = verify_jwt_token(token)

        assert payload["sub"] == user_id
        assert payload["type"] == "refresh"

    def test_multiple_tokens_independent(self):
        """Multiple tokens should be independent"""
        token1 = create_access_token("user1", "user1@example.com")
        token2 = create_access_token("user2", "user2@example.com")
        token3 = create_refresh_token("user3")

        payload1 = verify_jwt_token(token1)
        payload2 = verify_jwt_token(token2)
        payload3 = verify_jwt_token(token3)

        assert payload1["sub"] == "user1"
        assert payload2["sub"] == "user2"
        assert payload3["sub"] == "user3"

        # All should still be valid
        assert "exp" in payload1
        assert "exp" in payload2
        assert "exp" in payload3
