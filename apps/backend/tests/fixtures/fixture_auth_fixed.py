"""
Test fixtures for auth - FIXED VERSION

Provides proper fixture names with aliases
"""
import pytest
from datetime import datetime, timezone
from typing import Any, Dict, List
from app.schemas.auth import *

# ============================================================================
# UserRegisterRequest FIXTURES
# ============================================================================

@pytest.fixture
def sample_user_register_request():
    """ Sample UserRegisterRequest for testing """
    return UserRegisterRequest(
        email="test@example.com",
        password="SecurePass123!",
        full_name="Test User",
        username="testuser"
    )


@pytest.fixture
def sample_user_login_request():
    """ Sample UserLoginRequest for testing """
    return UserLoginRequest(
        email="test@example.com",
        password="SecurePass123!"
    )


@pytest.fixture
def sample_token_response():
    """ Sample TokenResponse for testing """
    return TokenResponse(
        access_token="test_access_token_123",
        refresh_token="test_refresh_token_456",
        token_type="bearer",
        expires_in=3600
    )


@pytest.fixture
def sample_user_response():
    """ Sample UserResponse for testing """
    from uuid import uuid4
    return UserResponse(
        id=uuid4(),
        email="test@example.com",
        full_name="Test User",
        is_active=True,
        is_verified=False,
        created_at=datetime.now(timezone.utc)
    )


@pytest.fixture
def sample_profile_response():
    """ Sample ProfileResponse for testing """
    from uuid import uuid4
    return ProfileResponse(
        id=uuid4(),
        user_id=uuid4(),
        username="testuser",
        display_name="Test User",
        bio="Test bio",
        avatar_url=None,
        is_public=True,
        follower_count=0,
        following_count=0,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )


# Factory fixtures for creating custom instances
@pytest.fixture
def user_register_factory():
    """ Factory for creating UserRegisterRequest with custom values """
    def _factory(**kwargs):
        defaults = {
            "email": "test@example.com",
            "password": "SecurePass123!",
            "full_name": "Test User",
            "username": "testuser"
        }
        return UserRegisterRequest(**{**defaults, **kwargs})
    return _factory


@pytest.fixture
def user_login_factory():
    """ Factory for creating UserLoginRequest with custom values """
    def _factory(**kwargs):
        defaults = {
            "email": "test@example.com",
            "password": "SecurePass123!"
        }
        return UserLoginRequest(**{**defaults, **kwargs})
    return _factory
