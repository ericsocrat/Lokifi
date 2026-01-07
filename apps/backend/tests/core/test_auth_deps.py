"""
Comprehensive tests for app.core.auth_deps module.
Coverage target: 100%
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

# ================================================================================
# Test get_current_user_optional Function
# ================================================================================


class TestGetCurrentUserOptional:
    """Test the get_current_user_optional function."""

    @pytest.mark.asyncio
    async def test_returns_none_when_no_token_or_cookie(self):
        """Test returns None when no authorization header or cookie provided."""
        from app.core.auth_deps import get_current_user_optional

        mock_db = AsyncMock()
        result = await get_current_user_optional(
            token=None, access_token=None, db=mock_db
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_returns_user_from_authorization_header(self):
        """Test returns user when valid token in Authorization header."""
        from app.core.auth_deps import get_current_user_optional

        user_id = uuid.uuid4()
        mock_user = MagicMock()
        mock_user.is_active = True

        mock_token = MagicMock()
        mock_token.credentials = "valid_jwt_token"

        mock_db = AsyncMock()
        mock_auth_service = AsyncMock()
        mock_auth_service.get_user_by_id = AsyncMock(return_value=mock_user)

        with patch(
            "app.core.auth_deps.verify_jwt_token", return_value={"sub": str(user_id)}
        ):
            with patch(
                "app.core.auth_deps.AuthService", return_value=mock_auth_service
            ):
                result = await get_current_user_optional(
                    token=mock_token, access_token=None, db=mock_db
                )

        assert result == mock_user
        mock_auth_service.get_user_by_id.assert_called_once_with(user_id)

    @pytest.mark.asyncio
    async def test_returns_user_from_cookie(self):
        """Test returns user when valid token in cookie."""
        from app.core.auth_deps import get_current_user_optional

        user_id = uuid.uuid4()
        mock_user = MagicMock()
        mock_user.is_active = True

        mock_db = AsyncMock()
        mock_auth_service = AsyncMock()
        mock_auth_service.get_user_by_id = AsyncMock(return_value=mock_user)

        with patch(
            "app.core.auth_deps.verify_jwt_token", return_value={"sub": str(user_id)}
        ):
            with patch(
                "app.core.auth_deps.AuthService", return_value=mock_auth_service
            ):
                result = await get_current_user_optional(
                    token=None, access_token="cookie_jwt_token", db=mock_db
                )

        assert result == mock_user

    @pytest.mark.asyncio
    async def test_prefers_authorization_header_over_cookie(self):
        """Test Authorization header is used when both header and cookie present."""
        from app.core.auth_deps import get_current_user_optional

        user_id = uuid.uuid4()
        mock_user = MagicMock()
        mock_user.is_active = True

        mock_token = MagicMock()
        mock_token.credentials = "header_token"

        mock_db = AsyncMock()
        mock_auth_service = AsyncMock()
        mock_auth_service.get_user_by_id = AsyncMock(return_value=mock_user)

        call_count = 0

        def verify_jwt(token):
            nonlocal call_count
            call_count += 1
            if token == "header_token":
                return {"sub": str(user_id)}
            return {"sub": "different_id"}

        with patch("app.core.auth_deps.verify_jwt_token", side_effect=verify_jwt):
            with patch(
                "app.core.auth_deps.AuthService", return_value=mock_auth_service
            ):
                result = await get_current_user_optional(
                    token=mock_token, access_token="cookie_token", db=mock_db
                )

        # Should have used header_token
        assert result == mock_user
        assert call_count == 1  # Only called once with header token

    @pytest.mark.asyncio
    async def test_returns_none_when_token_has_no_sub(self):
        """Test returns None when JWT payload has no sub claim."""
        from app.core.auth_deps import get_current_user_optional

        mock_token = MagicMock()
        mock_token.credentials = "token_without_sub"

        mock_db = AsyncMock()

        with patch(
            "app.core.auth_deps.verify_jwt_token", return_value={}
        ):  # No sub claim
            result = await get_current_user_optional(
                token=mock_token, access_token=None, db=mock_db
            )

        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_when_user_not_found(self):
        """Test returns None when user not found in database."""
        from app.core.auth_deps import get_current_user_optional

        user_id = uuid.uuid4()
        mock_token = MagicMock()
        mock_token.credentials = "valid_token"

        mock_db = AsyncMock()
        mock_auth_service = AsyncMock()
        mock_auth_service.get_user_by_id = AsyncMock(return_value=None)

        with patch(
            "app.core.auth_deps.verify_jwt_token", return_value={"sub": str(user_id)}
        ):
            with patch(
                "app.core.auth_deps.AuthService", return_value=mock_auth_service
            ):
                result = await get_current_user_optional(
                    token=mock_token, access_token=None, db=mock_db
                )

        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_when_user_inactive(self):
        """Test returns None when user is inactive."""
        from app.core.auth_deps import get_current_user_optional

        user_id = uuid.uuid4()
        mock_user = MagicMock()
        mock_user.is_active = False

        mock_token = MagicMock()
        mock_token.credentials = "valid_token"

        mock_db = AsyncMock()
        mock_auth_service = AsyncMock()
        mock_auth_service.get_user_by_id = AsyncMock(return_value=mock_user)

        with patch(
            "app.core.auth_deps.verify_jwt_token", return_value={"sub": str(user_id)}
        ):
            with patch(
                "app.core.auth_deps.AuthService", return_value=mock_auth_service
            ):
                result = await get_current_user_optional(
                    token=mock_token, access_token=None, db=mock_db
                )

        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_on_http_exception(self):
        """Test returns None when verify_jwt_token raises HTTPException."""
        from app.core.auth_deps import get_current_user_optional

        mock_token = MagicMock()
        mock_token.credentials = "invalid_token"

        mock_db = AsyncMock()

        with patch(
            "app.core.auth_deps.verify_jwt_token",
            side_effect=HTTPException(status_code=401, detail="Invalid token"),
        ):
            result = await get_current_user_optional(
                token=mock_token, access_token=None, db=mock_db
            )

        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_on_generic_exception(self):
        """Test returns None when generic exception occurs."""
        from app.core.auth_deps import get_current_user_optional

        mock_token = MagicMock()
        mock_token.credentials = "token"

        mock_db = AsyncMock()

        with patch(
            "app.core.auth_deps.verify_jwt_token",
            side_effect=Exception("Something went wrong"),
        ):
            result = await get_current_user_optional(
                token=mock_token, access_token=None, db=mock_db
            )

        assert result is None


# ================================================================================
# Test get_current_user Function
# ================================================================================


class TestGetCurrentUser:
    """Test the get_current_user function."""

    @pytest.mark.asyncio
    async def test_returns_user_when_valid(self):
        """Test returns user when valid token provided."""
        from app.core.auth_deps import get_current_user

        user_id = uuid.uuid4()
        mock_user = MagicMock()
        mock_user.is_active = True

        mock_token = MagicMock()
        mock_token.credentials = "valid_token"

        mock_db = AsyncMock()
        mock_auth_service = AsyncMock()
        mock_auth_service.get_user_by_id = AsyncMock(return_value=mock_user)

        with patch(
            "app.core.auth_deps.verify_jwt_token", return_value={"sub": str(user_id)}
        ):
            with patch(
                "app.core.auth_deps.AuthService", return_value=mock_auth_service
            ):
                result = await get_current_user(
                    token=mock_token, access_token=None, db=mock_db
                )

        assert result == mock_user

    @pytest.mark.asyncio
    async def test_raises_401_when_no_valid_user(self):
        """Test raises HTTPException 401 when no valid user."""
        from app.core.auth_deps import get_current_user

        mock_db = AsyncMock()

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(token=None, access_token=None, db=mock_db)

        assert exc_info.value.status_code == 401
        assert "Could not validate credentials" in exc_info.value.detail
        assert exc_info.value.headers["WWW-Authenticate"] == "Bearer"

    @pytest.mark.asyncio
    async def test_raises_401_when_token_invalid(self):
        """Test raises HTTPException 401 when token is invalid."""
        from app.core.auth_deps import get_current_user

        mock_token = MagicMock()
        mock_token.credentials = "invalid_token"

        mock_db = AsyncMock()

        with patch(
            "app.core.auth_deps.verify_jwt_token",
            side_effect=HTTPException(status_code=401, detail="Invalid"),
        ):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(token=mock_token, access_token=None, db=mock_db)

        assert exc_info.value.status_code == 401


# ================================================================================
# Test get_current_active_user Function
# ================================================================================


class TestGetCurrentActiveUser:
    """Test the get_current_active_user function."""

    @pytest.mark.asyncio
    async def test_returns_user_when_active(self):
        """Test returns user when user is active."""
        from app.core.auth_deps import get_current_active_user

        mock_user = MagicMock()
        mock_user.is_active = True

        result = await get_current_active_user(current_user=mock_user)

        assert result == mock_user

    @pytest.mark.asyncio
    async def test_raises_403_when_inactive(self):
        """Test raises HTTPException 403 when user is inactive."""
        from app.core.auth_deps import get_current_active_user

        mock_user = MagicMock()
        mock_user.is_active = False

        with pytest.raises(HTTPException) as exc_info:
            await get_current_active_user(current_user=mock_user)

        assert exc_info.value.status_code == 403
        assert "Inactive user" in exc_info.value.detail


# ================================================================================
# Test Module Constants and Imports
# ================================================================================


class TestModuleConstants:
    """Test module-level constants and objects."""

    def test_security_bearer_exists(self):
        """Test that the security HTTPBearer instance exists."""
        from app.core.auth_deps import security

        assert security is not None

    def test_security_bearer_auto_error_false(self):
        """Test that security is configured with auto_error=False."""
        from app.core.auth_deps import security

        # HTTPBearer with auto_error=False won't raise automatically
        assert security.auto_error is False
