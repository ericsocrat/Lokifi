"""
Tests for auth router error handling and edge cases.
Session 150: Focused tests to close coverage gap to 90%.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from app.main import app


@pytest.mark.anyio
async def test_register_exception_handling():
    """Test register endpoint exception handling path."""
    client = TestClient(app)

    # Mock auth service to raise non-HTTP exception
    with patch("app.routers.auth.AuthService") as mock_service:
        mock_instance = MagicMock()
        mock_service.return_value = mock_instance
        mock_instance.register_user = AsyncMock(side_effect=Exception("Database error"))

        with patch("app.routers.auth.get_db"):
            user_data = {
                "email": "test@example.com",
                "password": "TestUser123!",
                "full_name": "Test User",
                "username": "testuser",
            }

            response = client.post("/api/auth/register", json=user_data)

            # Should return 500 with generic error message
            assert response.status_code == 500
            assert "Internal server error" in response.json()["detail"]


@pytest.mark.anyio
async def test_login_exception_handling():
    """Test login endpoint exception handling path."""
    client = TestClient(app)

    # Mock auth service to raise non-HTTP exception
    with patch("app.routers.auth.AuthService") as mock_service:
        mock_instance = MagicMock()
        mock_service.return_value = mock_instance
        mock_instance.login_user = AsyncMock(side_effect=Exception("Database error"))

        with patch("app.routers.auth.get_db"):
            login_data = {
                "email": "test@example.com",
                "password": "TestUser123!",
            }

            response = client.post("/api/auth/login", json=login_data)

            # Should return 500 with generic error message
            assert response.status_code == 500
            assert "Internal server error" in response.json()["detail"]


@pytest.mark.anyio
async def test_google_oauth_invalid_token_response():
    """Test Google OAuth with invalid token response."""
    client = TestClient(app)

    # Mock httpx client to return 400 error
    with patch("app.routers.auth.httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.json.return_value = {"error_description": "Invalid token"}

        mock_context = AsyncMock()
        mock_context.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
        mock_client.return_value = mock_context

        with patch("app.routers.auth.get_db"):
            oauth_data = {"token": "invalid_token"}
            response = client.post("/api/auth/google", json=oauth_data)

            # Should return 401 with error details
            assert response.status_code == 401
            assert "Google token verification failed" in response.json()["detail"]


@pytest.mark.anyio
async def test_google_oauth_invalid_audience():
    """Test Google OAuth with invalid token audience."""
    client = TestClient(app)

    # Mock httpx client to return valid response with wrong audience
    with patch("app.routers.auth.httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "aud": "wrong_client_id",
            "email": "test@example.com",
            "sub": "12345",
            "email_verified": True,
            "exp": 9999999999,
        }

        mock_context = AsyncMock()
        mock_context.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
        mock_client.return_value = mock_context

        with patch("app.routers.auth.get_db"):
            oauth_data = {"token": "valid_token"}
            response = client.post("/api/auth/google", json=oauth_data)

            # Should return 401 with invalid audience message
            assert response.status_code == 401
            assert "Invalid token audience" in response.json()["detail"]


@pytest.mark.anyio
async def test_google_oauth_expired_token():
    """Test Google OAuth with expired token."""
    client = TestClient(app)

    with patch("app.routers.auth.httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.status_code = 200

        # Mock settings
        with patch("app.routers.auth.settings") as mock_settings:
            mock_settings.GOOGLE_CLIENT_ID = "test_client_id"

            # Use an expired timestamp (e.g., Jan 1, 2020)
            mock_response.json.return_value = {
                "aud": "test_client_id",
                "email": "test@example.com",
                "sub": "12345",
                "email_verified": True,
                "exp": 1577836800,  # Jan 1, 2020 - clearly expired
            }

            mock_context = AsyncMock()
            mock_context.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )
            mock_client.return_value = mock_context

            with patch("app.routers.auth.get_db"):
                oauth_data = {"token": "expired_token"}
                response = client.post("/api/auth/google", json=oauth_data)

                # Should return 401 with expired token message
                assert response.status_code == 401
                assert "Token has expired" in response.json()["detail"]


@pytest.mark.anyio
async def test_google_oauth_missing_email():
    """Test Google OAuth with missing email in token."""
    client = TestClient(app)

    with patch("app.routers.auth.httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.status_code = 200

        with patch("app.routers.auth.settings") as mock_settings:
            mock_settings.GOOGLE_CLIENT_ID = "test_client_id"

            # Missing email field
            mock_response.json.return_value = {
                "aud": "test_client_id",
                "sub": "12345",
                "email_verified": True,
                "exp": 9999999999,
            }

            mock_context = AsyncMock()
            mock_context.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )
            mock_client.return_value = mock_context

            with patch("app.routers.auth.get_db"):
                oauth_data = {"token": "token_without_email"}
                response = client.post("/api/auth/google", json=oauth_data)

                # Should return 400 with error message
                assert response.status_code == 400
                assert "Unable to get user information" in response.json()["detail"]


@pytest.mark.anyio
async def test_google_oauth_unverified_email():
    """Test Google OAuth with unverified email."""
    client = TestClient(app)

    with patch("app.routers.auth.httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.status_code = 200

        with patch("app.routers.auth.settings") as mock_settings:
            mock_settings.GOOGLE_CLIENT_ID = "test_client_id"

            mock_response.json.return_value = {
                "aud": "test_client_id",
                "email": "test@example.com",
                "sub": "12345",
                "email_verified": False,  # Unverified email
                "exp": 9999999999,
            }

            mock_context = AsyncMock()
            mock_context.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )
            mock_client.return_value = mock_context

            with patch("app.routers.auth.get_db"):
                oauth_data = {"token": "unverified_token"}
                response = client.post("/api/auth/google", json=oauth_data)

                # Should return 400 with unverified email message
                assert response.status_code == 400
                assert "Google email not verified" in response.json()["detail"]


@pytest.mark.anyio
async def test_google_oauth_request_error():
    """Test Google OAuth with network request error."""
    client = TestClient(app)

    # Mock httpx to raise RequestError
    import httpx

    with patch("app.routers.auth.httpx.AsyncClient") as mock_client:
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value.get = AsyncMock(
            side_effect=httpx.RequestError("Network error")
        )
        mock_client.return_value = mock_context

        with patch("app.routers.auth.get_db"):
            oauth_data = {"token": "any_token"}
            response = client.post("/api/auth/google", json=oauth_data)

            # Should return 503 with service unavailable message
            assert response.status_code == 503
            assert "Unable to verify Google token" in response.json()["detail"]


@pytest.mark.anyio
async def test_google_oauth_unexpected_exception():
    """Test Google OAuth with unexpected exception."""
    client = TestClient(app)

    # Mock httpx client to raise unexpected exception
    with patch("app.routers.auth.httpx.AsyncClient") as mock_client:
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value.get = AsyncMock(
            side_effect=Exception("Unexpected error")
        )
        mock_client.return_value = mock_context

        with patch("app.routers.auth.get_db"):
            oauth_data = {"token": "any_token"}
            response = client.post("/api/auth/google", json=oauth_data)

            # Should return 500 with generic error message
            assert response.status_code == 500
            assert "unexpected error occurred" in response.json()["detail"]
