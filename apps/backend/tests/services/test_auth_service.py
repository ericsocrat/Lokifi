"""
Tests for app.services.auth_service

Comprehensive test suite using generated mocks and fixtures
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest
from fastapi import HTTPException, status
from tests.fixtures.fixture_auth_fixed import (
    sample_token_response,
    sample_user_login_request,
    sample_user_register_request,
    sample_user_response,
)

# Import mocks and fixtures
from tests.fixtures.mock_auth_service import mock_db_query_result, mock_db_session

# Import module under test
try:
    from app.models.notification_models import NotificationPreference
    from app.models.profile import Profile
    from app.models.user import User
    from app.services.auth_service import AuthService
except ImportError as e:
    pytest.skip(f"Module import failed: {e}", allow_module_level=True)


# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_user():
    """Mock user object"""
    from datetime import datetime, timezone

    user = Mock(spec=User)
    user.id = uuid.uuid4()
    user.email = "test@example.com"
    user.password_hash = "$2b$12$hashedpassword"
    user.full_name = "Test User"
    user.is_active = True
    user.is_verified = False
    user.created_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    return user


@pytest.fixture
def mock_profile():
    """Mock profile object"""
    from datetime import datetime, timezone

    profile = Mock(spec=Profile)
    profile.id = uuid.uuid4()
    profile.user_id = uuid.uuid4()
    profile.username = "testuser"
    profile.display_name = "Test User"
    profile.bio = None
    profile.avatar_url = None
    profile.is_public = True
    profile.follower_count = 0
    profile.following_count = 0
    profile.created_at = datetime.now(timezone.utc)
    profile.updated_at = datetime.now(timezone.utc)
    return profile


@pytest.fixture
def auth_service(mock_db_session):
    """Create AuthService instance with mock db"""
    return AuthService(mock_db_session)


# ============================================================================
# UNIT TESTS - Registration
# ============================================================================


class TestAuthServiceRegistration:
    """Test suite for user registration"""

    @pytest.mark.asyncio
    async def test_register_user_success(
        self, auth_service, mock_db_session, sample_user_register_request
    ):
        """Test successful user registration"""
        from datetime import datetime, timezone

        # Mock database queries
        mock_db_session.execute = AsyncMock(
            return_value=Mock(scalar_one_or_none=Mock(return_value=None))
        )

        # Mock flush and commit to simulate database setting timestamps and defaults
        def mock_set_timestamps():
            # Find any objects added and set their created_at/updated_at
            for call in mock_db_session.add.call_args_list:
                obj = call[0][0]
                # Set timestamps if not already set (using getattr to handle missing attributes)
                if getattr(obj, "created_at", None) is None:
                    obj.created_at = datetime.now(timezone.utc)
                if getattr(obj, "updated_at", None) is None:
                    obj.updated_at = datetime.now(timezone.utc)

        mock_db_session.flush = AsyncMock(side_effect=mock_set_timestamps)
        mock_db_session.commit = AsyncMock(side_effect=mock_set_timestamps)

        with patch("app.services.auth_service.validate_email", return_value=True), patch(
            "app.services.auth_service.validate_password_strength", return_value=True
        ), patch("app.services.auth_service.hash_password", return_value="hashed_password"), patch(
            "app.services.auth_service.create_access_token", return_value="access_token"
        ), patch(
            "app.services.auth_service.create_refresh_token", return_value="refresh_token"
        ):

            result = await auth_service.register_user(sample_user_register_request)

            # Verify result structure
            assert "user" in result
            assert "profile" in result
            assert "tokens" in result

            # Verify db operations
            mock_db_session.add.assert_called()
            mock_db_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_register_user_invalid_email(self, auth_service, sample_user_register_request):
        """Test registration with invalid email"""
        with patch("app.services.auth_service.validate_email", return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.register_user(sample_user_register_request)

            assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
            assert "Invalid email format" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_register_user_weak_password(self, auth_service, sample_user_register_request):
        """Test registration with weak password"""
        with patch("app.services.auth_service.validate_email", return_value=True), patch(
            "app.services.auth_service.validate_password_strength", return_value=False
        ):
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.register_user(sample_user_register_request)

            assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
            assert "Password must be" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_register_user_duplicate_email(
        self, auth_service, mock_db_session, sample_user_register_request, mock_user
    ):
        """Test registration with existing email"""
        # Mock existing user found
        mock_db_session.execute = AsyncMock(
            return_value=Mock(scalar_one_or_none=Mock(return_value=mock_user))
        )

        with patch("app.services.auth_service.validate_email", return_value=True), patch(
            "app.services.auth_service.validate_password_strength", return_value=True
        ):
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.register_user(sample_user_register_request)

            assert exc_info.value.status_code == status.HTTP_409_CONFLICT
            assert "already exists" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_register_user_duplicate_username(
        self, auth_service, mock_db_session, sample_user_register_request, mock_profile
    ):
        """Test registration with existing username"""
        # Mock no existing user but existing profile
        call_count = [0]

        def mock_execute(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                # First call for user check
                return Mock(scalar_one_or_none=Mock(return_value=None))
            else:
                # Second call for username check
                return Mock(scalar_one_or_none=Mock(return_value=mock_profile))

        mock_db_session.execute = AsyncMock(side_effect=mock_execute)

        with patch("app.services.auth_service.validate_email", return_value=True), patch(
            "app.services.auth_service.validate_password_strength", return_value=True
        ):
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.register_user(sample_user_register_request)

            assert exc_info.value.status_code == status.HTTP_409_CONFLICT
            assert "Username already taken" in str(exc_info.value.detail)


# ============================================================================
# UNIT TESTS - Login
# ============================================================================


class TestAuthServiceLogin:
    """Test suite for user login"""

    @pytest.mark.asyncio
    async def test_login_user_success(
        self, auth_service, mock_db_session, sample_user_login_request, mock_user, mock_profile
    ):
        """Test successful user login"""
        # Mock database query returning user and profile
        mock_db_session.execute = AsyncMock(
            return_value=Mock(one_or_none=Mock(return_value=(mock_user, mock_profile)))
        )

        with patch("app.services.auth_service.verify_password", return_value=True), patch(
            "app.services.auth_service.create_access_token", return_value="access_token"
        ), patch("app.services.auth_service.create_refresh_token", return_value="refresh_token"):

            result = await auth_service.login_user(sample_user_login_request)

            # Verify result structure
            assert "user" in result
            assert "profile" in result
            assert "tokens" in result

    @pytest.mark.asyncio
    async def test_login_user_not_found(
        self, auth_service, mock_db_session, sample_user_login_request
    ):
        """Test login with non-existent user"""
        # Mock no user found
        mock_db_session.execute = AsyncMock(return_value=Mock(one_or_none=Mock(return_value=None)))

        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login_user(sample_user_login_request)

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid email or password" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_login_user_wrong_password(
        self, auth_service, mock_db_session, sample_user_login_request, mock_user, mock_profile
    ):
        """Test login with incorrect password"""
        # Mock user found but password verification fails
        mock_db_session.execute = AsyncMock(
            return_value=Mock(one_or_none=Mock(return_value=(mock_user, mock_profile)))
        )

        with patch("app.services.auth_service.verify_password", return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.login_user(sample_user_login_request)

            assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
            assert "Invalid email or password" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_login_user_inactive_account(
        self, auth_service, mock_db_session, sample_user_login_request, mock_user, mock_profile
    ):
        """Test login with inactive account"""
        # Mock user found but account is inactive
        mock_user.is_active = False
        mock_db_session.execute = AsyncMock(
            return_value=Mock(one_or_none=Mock(return_value=(mock_user, mock_profile)))
        )

        with patch("app.services.auth_service.verify_password", return_value=True):
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.login_user(sample_user_login_request)

            assert (
                exc_info.value.status_code == status.HTTP_403_FORBIDDEN
                or exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
            )

    @pytest.mark.asyncio
    async def test_login_user_no_password_hash(
        self, auth_service, mock_db_session, sample_user_login_request, mock_user, mock_profile
    ):
        """Test login when user has no password hash"""
        # Mock user with no password hash
        mock_user.password_hash = None
        mock_db_session.execute = AsyncMock(
            return_value=Mock(one_or_none=Mock(return_value=(mock_user, mock_profile)))
        )

        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login_user(sample_user_login_request)

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


# ============================================================================
# INTEGRATION TESTS
# ============================================================================


class TestAuthServiceIntegration:
    """Integration tests for AuthService"""

    @pytest.mark.asyncio
    async def test_full_registration_flow(
        self, auth_service, mock_db_session, sample_user_register_request
    ):
        """Test complete registration workflow"""
        from datetime import datetime, timezone

        # Mock no existing user or username
        mock_db_session.execute = AsyncMock(
            return_value=Mock(scalar_one_or_none=Mock(return_value=None))
        )

        # Mock flush and commit to simulate database setting timestamps and defaults
        def mock_set_timestamps():
            for call in mock_db_session.add.call_args_list:
                obj = call[0][0]
                # Set timestamps if not already set (using getattr to handle missing attributes)
                if getattr(obj, "created_at", None) is None:
                    obj.created_at = datetime.now(timezone.utc)
                if getattr(obj, "updated_at", None) is None:
                    obj.updated_at = datetime.now(timezone.utc)

        mock_db_session.flush = AsyncMock(side_effect=mock_set_timestamps)
        mock_db_session.commit = AsyncMock(side_effect=mock_set_timestamps)
        mock_db_session.add = Mock()

        with patch("app.services.auth_service.validate_email", return_value=True), patch(
            "app.services.auth_service.validate_password_strength", return_value=True
        ), patch("app.services.auth_service.hash_password", return_value="hashed"), patch(
            "app.services.auth_service.create_access_token", return_value="access"
        ), patch(
            "app.services.auth_service.create_refresh_token", return_value="refresh"
        ):

            result = await auth_service.register_user(sample_user_register_request)

            # Verify all database objects were created
            assert mock_db_session.add.call_count >= 3  # User, Profile, NotificationPreference
            assert mock_db_session.commit.called

            # Verify response structure
            assert all(key in result for key in ["user", "profile", "tokens"])

    @pytest.mark.asyncio
    async def test_login_after_registration(
        self, mock_db_session, sample_user_register_request, sample_user_login_request
    ):
        """Test login immediately after registration"""
        from datetime import datetime, timezone

        auth_service = AuthService(mock_db_session)

        # Mock registration
        mock_db_session.execute = AsyncMock(
            return_value=Mock(scalar_one_or_none=Mock(return_value=None))
        )

        # Mock flush and commit to simulate database setting timestamps and defaults
        def mock_set_timestamps():
            for call in mock_db_session.add.call_args_list:
                obj = call[0][0]
                # Set timestamps if not already set (using getattr to handle missing attributes)
                if getattr(obj, "created_at", None) is None:
                    obj.created_at = datetime.now(timezone.utc)
                if getattr(obj, "updated_at", None) is None:
                    obj.updated_at = datetime.now(timezone.utc)

        mock_db_session.flush = AsyncMock(side_effect=mock_set_timestamps)
        mock_db_session.commit = AsyncMock(side_effect=mock_set_timestamps)

        user_id = uuid.uuid4()
        mock_user = Mock(spec=User)
        mock_user.id = user_id
        mock_user.email = sample_user_login_request.email
        mock_user.password_hash = "hashed_password"
        mock_user.is_active = True
        mock_user.full_name = "Test User"
        mock_user.is_verified = False
        mock_user.created_at = datetime.now(timezone.utc)
        mock_user.updated_at = datetime.now(timezone.utc)

        mock_profile = Mock(spec=Profile)
        mock_profile.id = uuid.uuid4()
        mock_profile.user_id = user_id
        mock_profile.username = "testuser"
        mock_profile.display_name = "Test User"
        mock_profile.bio = None
        mock_profile.avatar_url = None
        mock_profile.is_public = True
        mock_profile.follower_count = 0
        mock_profile.following_count = 0
        mock_profile.created_at = datetime.now(timezone.utc)
        mock_profile.updated_at = datetime.now(timezone.utc)

        with patch("app.services.auth_service.validate_email", return_value=True), patch(
            "app.services.auth_service.validate_password_strength", return_value=True
        ), patch("app.services.auth_service.hash_password", return_value="hashed_password"), patch(
            "app.services.auth_service.create_access_token", return_value="access_token"
        ), patch(
            "app.services.auth_service.create_refresh_token", return_value="refresh_token"
        ):

            # Register
            reg_result = await auth_service.register_user(sample_user_register_request)
            assert "user" in reg_result

            # Mock login query
            mock_db_session.execute = AsyncMock(
                return_value=Mock(one_or_none=Mock(return_value=(mock_user, mock_profile)))
            )

            with patch("app.services.auth_service.verify_password", return_value=True):
                # Login
                login_result = await auth_service.login_user(sample_user_login_request)
                assert "tokens" in login_result


# ============================================================================
# EDGE CASES & ERROR HANDLING
# ============================================================================


class TestAuthServiceEdgeCases:
    """Edge case and error handling tests"""

    @pytest.mark.asyncio
    async def test_register_with_empty_username(self, auth_service, mock_db_session):
        """Test registration with None/empty username"""
        from datetime import datetime, timezone

        from app.schemas.auth import UserRegisterRequest

        request = UserRegisterRequest(
            email="test@example.com",
            password="SecurePass123!",
            username=None,
            full_name="Test User",
        )

        mock_db_session.execute = AsyncMock(
            return_value=Mock(scalar_one_or_none=Mock(return_value=None))
        )

        # Mock flush and commit to simulate database setting timestamps and defaults
        def mock_set_timestamps():
            for call in mock_db_session.add.call_args_list:
                obj = call[0][0]
                # Set timestamps if not already set (using getattr to handle missing attributes)
                if getattr(obj, "created_at", None) is None:
                    obj.created_at = datetime.now(timezone.utc)
                if getattr(obj, "updated_at", None) is None:
                    obj.updated_at = datetime.now(timezone.utc)

        mock_db_session.flush = AsyncMock(side_effect=mock_set_timestamps)
        mock_db_session.commit = AsyncMock(side_effect=mock_set_timestamps)

        with patch("app.services.auth_service.validate_email", return_value=True), patch(
            "app.services.auth_service.validate_password_strength", return_value=True
        ), patch("app.services.auth_service.hash_password", return_value="hashed"), patch(
            "app.services.auth_service.create_access_token", return_value="access"
        ), patch(
            "app.services.auth_service.create_refresh_token", return_value="refresh"
        ):

            result = await auth_service.register_user(request)
            assert result is not None

    @pytest.mark.asyncio
    async def test_login_with_special_characters_in_email(self, auth_service, mock_db_session):
        """Test login with special characters in email"""
        from datetime import datetime, timezone

        from app.schemas.auth import UserLoginRequest

        request = UserLoginRequest(email="test+special@example.com", password="password123")

        mock_user = Mock(spec=User)
        mock_user.id = uuid.uuid4()
        mock_user.email = "test+special@example.com"
        mock_user.password_hash = "hashed"
        mock_user.full_name = "Test User"
        mock_user.is_active = True
        mock_user.is_verified = False
        mock_user.created_at = datetime.now(timezone.utc)
        mock_user.updated_at = datetime.now(timezone.utc)

        mock_profile = Mock(spec=Profile)
        mock_profile.id = uuid.uuid4()
        mock_profile.user_id = mock_user.id
        mock_profile.username = "testuser"
        mock_profile.display_name = "Test User"
        mock_profile.bio = None
        mock_profile.avatar_url = None
        mock_profile.is_public = True
        mock_profile.follower_count = 0
        mock_profile.following_count = 0
        mock_profile.created_at = datetime.now(timezone.utc)
        mock_profile.updated_at = datetime.now(timezone.utc)

        mock_db_session.execute = AsyncMock(
            return_value=Mock(one_or_none=Mock(return_value=(mock_user, mock_profile)))
        )

        with patch("app.services.auth_service.verify_password", return_value=True), patch(
            "app.services.auth_service.create_access_token", return_value="access"
        ), patch("app.services.auth_service.create_refresh_token", return_value="refresh"):

            result = await auth_service.login_user(request)
            assert result is not None

    @pytest.mark.asyncio
    async def test_database_error_during_registration(
        self, auth_service, mock_db_session, sample_user_register_request
    ):
        """Test handling of database errors during registration"""
        mock_db_session.execute = AsyncMock(
            return_value=Mock(scalar_one_or_none=Mock(return_value=None))
        )
        mock_db_session.commit = AsyncMock(side_effect=Exception("Database error"))

        with patch("app.services.auth_service.validate_email", return_value=True), patch(
            "app.services.auth_service.validate_password_strength", return_value=True
        ), patch("app.services.auth_service.hash_password", return_value="hashed"):

            with pytest.raises(Exception) as exc_info:
                await auth_service.register_user(sample_user_register_request)

            assert "Database error" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_database_error_during_login(
        self, auth_service, mock_db_session, sample_user_login_request
    ):
        """Test handling of database errors during login"""
        mock_db_session.execute = AsyncMock(side_effect=Exception("Database connection lost"))

        with pytest.raises(Exception) as exc_info:
            await auth_service.login_user(sample_user_login_request)

        assert "Database connection lost" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_token_generation_failure(
        self, auth_service, mock_db_session, sample_user_register_request
    ):
        """Test handling of token generation failures"""
        mock_db_session.execute = AsyncMock(
            return_value=Mock(scalar_one_or_none=Mock(return_value=None))
        )
        mock_db_session.flush = AsyncMock()
        mock_db_session.commit = AsyncMock()

        with patch("app.services.auth_service.validate_email", return_value=True), patch(
            "app.services.auth_service.validate_password_strength", return_value=True
        ), patch("app.services.auth_service.hash_password", return_value="hashed"), patch(
            "app.services.auth_service.create_access_token", side_effect=Exception("Token error")
        ):

            with pytest.raises(Exception) as exc_info:
                await auth_service.register_user(sample_user_register_request)

            assert "Token error" in str(exc_info.value)
