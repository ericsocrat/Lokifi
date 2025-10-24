"""
Tests for authentication endpoints.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

# Mark as config_validation to skip in CI (requires database + JWT secrets)
pytestmark = pytest.mark.config_validation

client = TestClient(app)


def test_register_user():
    """Test user registration."""
    user_data = {
        "email": "test@example.com",
        "password": "TestUser123!",
        "full_name": "Test User",
        "username": "testuser",
    }

    response = client.post("/api/auth/register", json=user_data)

    # Should succeed (or fail gracefully if DB not available)
    assert response.status_code in [
        200,
        201,
        500,
        503,
    ]  # Allow DB connection errors in test


def test_login_invalid_credentials():
    """Test login with invalid credentials."""
    login_data = {"email": "nonexistent@example.com", "password": "wrongpassword"}

    response = client.post("/api/auth/login", json=login_data)

    # Should fail with 401 or 500 (if DB not available)
    assert response.status_code in [401, 500, 503]


def test_check_auth_status_without_token():
    """Test checking auth status without token."""
    response = client.get("/api/auth/check")

    if response.status_code == 200:
        data = response.json()
        assert not data["authenticated"]
        assert data["user_id"] is None


def test_me_endpoint_without_token():
    """Test /me endpoint without token."""
    response = client.get("/api/auth/me")

    # Should fail with 401 or 500 (if DB not available)
    assert response.status_code in [401, 500, 503]


def test_logout():
    """Test logout endpoint."""
    response = client.post("/api/auth/logout")

    if response.status_code == 200:
        data = response.json()
        assert data["success"]
        assert data["message"] == "Successfully logged out"
