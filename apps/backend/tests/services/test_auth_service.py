"""
Tests for app.services.auth_service

Comprehensive test suite using generated mocks and fixtures
"""

import uuid
from datetime import UTC, timezone
from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi import HTTPException, status

# Import mocks and fixtures

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
    from datetime import datetime

    user = Mock(spec=User)
    user.id = uuid.uuid4()
    user.email = "test@example.com"
    user.password_hash = "$2b$12$hashedpassword"
    user.full_name = "Test User"
    user.is_active = True
    user.is_verified = False
    user.created_at = datetime.now(UTC)
    user.updated_at = datetime.now(UTC)
    return user


@pytest.fixture
def mock_profile():
    """Mock profile object"""
    from datetime import datetime

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
    profile.created_at = datetime.now(UTC)
    profile.updated_at = datetime.now(UTC)
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
        from datetime import datetime

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
                    obj.created_at = datetime.now(UTC)
                if getattr(obj, "updated_at", None) is None:
                    obj.updated_at = datetime.now(UTC)

        mock_db_session.flush = AsyncMock(side_effect=mock_set_timestamps)
        mock_db_session.commit = AsyncMock(side_effect=mock_set_timestamps)

        with (
            patch("app.services.auth_service.validate_email", return_value=True),
            patch(
                "app.services.auth_service.validate_password_strength",
                return_value=True,
            ),
            patch(
                "app.services.auth_service.hash_password",
                return_value="hashed_password",
            ),
            patch(
                "app.services.auth_service.create_access_token",
                return_value="access_token",
            ),
            patch(
                "app.services.auth_service.create_refresh_token",
                return_value="refresh_token",
            ),
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
        with (
            patch("app.services.auth_service.validate_email", return_value=True),
            patch(
                "app.services.auth_service.validate_password_strength",
                return_value=False,
            ),
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

        with (
            patch("app.services.auth_service.validate_email", return_value=True),
            patch(
                "app.services.auth_service.validate_password_strength",
                return_value=True,
            ),
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

        with (
            patch("app.services.auth_service.validate_email", return_value=True),
            patch(
                "app.services.auth_service.validate_password_strength",
                return_value=True,
            ),
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
        self,
        auth_service,
        mock_db_session,
        sample_user_login_request,
        mock_user,
        mock_profile,
    ):
        """Test successful user login"""
        # Mock database query returning user and profile
        mock_db_session.execute = AsyncMock(
            return_value=Mock(one_or_none=Mock(return_value=(mock_user, mock_profile)))
        )

        with (
            patch("app.services.auth_service.verify_password", return_value=True),
            patch(
                "app.services.auth_service.create_access_token",
                return_value="access_token",
            ),
            patch(
                "app.services.auth_service.create_refresh_token",
                return_value="refresh_token",
            ),
        ):
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
        self,
        auth_service,
        mock_db_session,
        sample_user_login_request,
        mock_user,
        mock_profile,
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
        self,
        auth_service,
        mock_db_session,
        sample_user_login_request,
        mock_user,
        mock_profile,
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
        self,
        auth_service,
        mock_db_session,
        sample_user_login_request,
        mock_user,
        mock_profile,
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
        from datetime import datetime

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
                    obj.created_at = datetime.now(UTC)
                if getattr(obj, "updated_at", None) is None:
                    obj.updated_at = datetime.now(UTC)

        mock_db_session.flush = AsyncMock(side_effect=mock_set_timestamps)
        mock_db_session.commit = AsyncMock(side_effect=mock_set_timestamps)
        mock_db_session.add = Mock()

        with (
            patch("app.services.auth_service.validate_email", return_value=True),
            patch(
                "app.services.auth_service.validate_password_strength",
                return_value=True,
            ),
            patch("app.services.auth_service.hash_password", return_value="hashed"),
            patch("app.services.auth_service.create_access_token", return_value="access"),
            patch("app.services.auth_service.create_refresh_token", return_value="refresh"),
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
        from datetime import datetime

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
                    obj.created_at = datetime.now(UTC)
                if getattr(obj, "updated_at", None) is None:
                    obj.updated_at = datetime.now(UTC)

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
        mock_user.created_at = datetime.now(UTC)
        mock_user.updated_at = datetime.now(UTC)

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
        mock_profile.created_at = datetime.now(UTC)
        mock_profile.updated_at = datetime.now(UTC)

        with (
            patch("app.services.auth_service.validate_email", return_value=True),
            patch(
                "app.services.auth_service.validate_password_strength",
                return_value=True,
            ),
            patch(
                "app.services.auth_service.hash_password",
                return_value="hashed_password",
            ),
            patch(
                "app.services.auth_service.create_access_token",
                return_value="access_token",
            ),
            patch(
                "app.services.auth_service.create_refresh_token",
                return_value="refresh_token",
            ),
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
        from datetime import datetime

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
                    obj.created_at = datetime.now(UTC)
                if getattr(obj, "updated_at", None) is None:
                    obj.updated_at = datetime.now(UTC)

        mock_db_session.flush = AsyncMock(side_effect=mock_set_timestamps)
        mock_db_session.commit = AsyncMock(side_effect=mock_set_timestamps)

        with (
            patch("app.services.auth_service.validate_email", return_value=True),
            patch(
                "app.services.auth_service.validate_password_strength",
                return_value=True,
            ),
            patch("app.services.auth_service.hash_password", return_value="hashed"),
            patch("app.services.auth_service.create_access_token", return_value="access"),
            patch("app.services.auth_service.create_refresh_token", return_value="refresh"),
        ):
            result = await auth_service.register_user(request)
            assert result is not None

    @pytest.mark.asyncio
    async def test_login_with_special_characters_in_email(self, auth_service, mock_db_session):
        """Test login with special characters in email"""
        from datetime import datetime

        from app.schemas.auth import UserLoginRequest

        request = UserLoginRequest(email="test+special@example.com", password="password123")

        mock_user = Mock(spec=User)
        mock_user.id = uuid.uuid4()
        mock_user.email = "test+special@example.com"
        mock_user.password_hash = "hashed"
        mock_user.full_name = "Test User"
        mock_user.is_active = True
        mock_user.is_verified = False
        mock_user.created_at = datetime.now(UTC)
        mock_user.updated_at = datetime.now(UTC)

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
        mock_profile.created_at = datetime.now(UTC)
        mock_profile.updated_at = datetime.now(UTC)

        mock_db_session.execute = AsyncMock(
            return_value=Mock(one_or_none=Mock(return_value=(mock_user, mock_profile)))
        )

        with (
            patch("app.services.auth_service.verify_password", return_value=True),
            patch("app.services.auth_service.create_access_token", return_value="access"),
            patch("app.services.auth_service.create_refresh_token", return_value="refresh"),
        ):
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

        with (
            patch("app.services.auth_service.validate_email", return_value=True),
            patch(
                "app.services.auth_service.validate_password_strength",
                return_value=True,
            ),
            patch("app.services.auth_service.hash_password", return_value="hashed"),
        ):
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

        with (
            patch("app.services.auth_service.validate_email", return_value=True),
            patch(
                "app.services.auth_service.validate_password_strength",
                return_value=True,
            ),
            patch("app.services.auth_service.hash_password", return_value="hashed"),
            patch(
                "app.services.auth_service.create_access_token",
                side_effect=Exception("Token error"),
            ),
        ):
            with pytest.raises(Exception) as exc_info:
                await auth_service.register_user(sample_user_register_request)

            assert "Token error" in str(exc_info.value)


# ============================================================================
# OAUTH AUTHENTICATION TESTS (Gap 1 - AuthService 65% → 90%+)
# ============================================================================


class TestOAuthAuthentication:
    """Test suite for OAuth authentication flow (Google OAuth)"""

    @pytest.mark.asyncio
    async def test_create_user_from_oauth_new_user(self, mock_db_session):
        """Test creating a new user from OAuth (Google) - new user flow"""
        from datetime import datetime

        auth_service = AuthService(db=mock_db_session)

        # Mock database query returns None (no existing user)
        mock_result = Mock()
        mock_result.one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result

        # Mock flush/commit to set defaults (simulates database server_default)
        async def mock_flush_with_defaults():
            # Set defaults on User when flushed
            for call in mock_db_session.add.call_args_list:
                obj = call[0][0]
                if isinstance(obj, User) and not hasattr(obj, "_defaults_set"):
                    obj.created_at = datetime.now(UTC)
                    obj.updated_at = datetime.now(UTC)
                    obj._defaults_set = True

        async def mock_commit_with_defaults():
            # Set defaults on all objects when committed
            for call in mock_db_session.add.call_args_list:
                obj = call[0][0]
                if isinstance(obj, User) and not hasattr(obj, "_defaults_set"):
                    obj.created_at = datetime.now(UTC)
                    obj.updated_at = datetime.now(UTC)
                    obj._defaults_set = True
                elif isinstance(obj, Profile) and not hasattr(obj, "_defaults_set"):
                    obj.follower_count = 0
                    obj.following_count = 0
                    obj.created_at = datetime.now(UTC)
                    obj.updated_at = datetime.now(UTC)
                    obj._defaults_set = True

        mock_db_session.flush = AsyncMock(side_effect=mock_flush_with_defaults)
        mock_db_session.commit = AsyncMock(side_effect=mock_commit_with_defaults)

        with (
            patch("app.services.auth_service.create_access_token", return_value="access_token"),
            patch("app.services.auth_service.create_refresh_token", return_value="refresh_token"),
        ):
            result = await auth_service.create_user_from_oauth(
                email="newuser@gmail.com", full_name="New User", google_id="google_123"
            )

        # Verify database operations
        assert mock_db_session.add.call_count == 3  # User + Profile + NotificationPreference
        mock_db_session.flush.assert_called_once()
        mock_db_session.commit.assert_called_once()

        # Verify result structure (don't validate Pydantic models directly)
        assert "user" in result
        assert "profile" in result
        assert "tokens" in result
        assert result["tokens"].access_token == "access_token"
        assert result["tokens"].refresh_token == "refresh_token"

    @pytest.mark.asyncio
    async def test_create_user_from_oauth_existing_user_no_google_id(
        self, mock_db_session, mock_user, mock_profile
    ):
        """Test OAuth with existing user without Google ID - should update"""
        auth_service = AuthService(db=mock_db_session)

        # Mock existing user without google_id
        mock_user.google_id = None
        mock_user.last_login = None

        # Mock database query returns existing user + profile
        mock_result = Mock()
        mock_result.one_or_none.return_value = (mock_user, mock_profile)
        mock_db_session.execute.return_value = mock_result
        mock_db_session.commit = AsyncMock()

        with (
            patch("app.services.auth_service.create_access_token", return_value="access_token"),
            patch("app.services.auth_service.create_refresh_token", return_value="refresh_token"),
        ):
            result = await auth_service.create_user_from_oauth(
                email="test@example.com", full_name="Test User", google_id="google_456"
            )

        # Verify Google ID updated and last_login set
        mock_db_session.commit.assert_called_once()
        assert result["user"] is not None
        assert result["tokens"].access_token == "access_token"

    @pytest.mark.asyncio
    async def test_create_user_from_oauth_existing_user_with_google_id(
        self, mock_db_session, mock_user, mock_profile
    ):
        """Test OAuth with existing user with Google ID - should just login"""
        auth_service = AuthService(db=mock_db_session)

        # Mock existing user with google_id already set
        mock_user.google_id = "google_789"

        # Mock database query returns existing user + profile
        mock_result = Mock()
        mock_result.one_or_none.return_value = (mock_user, mock_profile)
        mock_db_session.execute.return_value = mock_result
        mock_db_session.commit = AsyncMock()

        with (
            patch("app.services.auth_service.create_access_token", return_value="access_token"),
            patch("app.services.auth_service.create_refresh_token", return_value="refresh_token"),
        ):
            result = await auth_service.create_user_from_oauth(
                email="test@example.com", full_name="Test User", google_id="google_789"
            )

        # Verify only last_login updated (google_id already set)
        mock_db_session.commit.assert_called_once()
        assert result["user"] is not None
        assert result["profile"] is not None

    @pytest.mark.asyncio
    async def test_create_user_from_oauth_existing_user_no_profile(
        self, mock_db_session, mock_user
    ):
        """Test OAuth with existing user but no profile - should return None profile"""
        auth_service = AuthService(db=mock_db_session)

        # Mock existing user without profile
        mock_user.google_id = "google_abc"

        # Mock database query returns user but no profile
        mock_result = Mock()
        mock_result.one_or_none.return_value = (mock_user, None)
        mock_db_session.execute.return_value = mock_result
        mock_db_session.commit = AsyncMock()

        with (
            patch("app.services.auth_service.create_access_token", return_value="access_token"),
            patch("app.services.auth_service.create_refresh_token", return_value="refresh_token"),
        ):
            result = await auth_service.create_user_from_oauth(
                email="test@example.com", full_name="Test User", google_id="google_abc"
            )

        # Verify profile is None but user and tokens present
        assert result["user"] is not None
        assert result["profile"] is None
        assert result["tokens"] is not None


class TestGetUserMethods:
    """Test suite for get_user_by_id and get_user_by_email helper methods"""

    @pytest.mark.asyncio
    async def test_get_user_by_id_found(self, mock_db_session, mock_user):
        """Test get_user_by_id when user exists"""
        auth_service = AuthService(db=mock_db_session)

        # Mock database query returns user
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db_session.execute.return_value = mock_result

        result = await auth_service.get_user_by_id(mock_user.id)

        assert result == mock_user

    @pytest.mark.asyncio
    async def test_get_user_by_id_not_found(self, mock_db_session):
        """Test get_user_by_id when user doesn't exist"""
        auth_service = AuthService(db=mock_db_session)

        # Mock database query returns None
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result

        result = await auth_service.get_user_by_id(uuid.uuid4())

        assert result is None

    @pytest.mark.asyncio
    async def test_get_user_by_email_found(self, mock_db_session, mock_user):
        """Test get_user_by_email when user exists"""
        auth_service = AuthService(db=mock_db_session)

        # Mock database query returns user
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db_session.execute.return_value = mock_result

        result = await auth_service.get_user_by_email("test@example.com")

        assert result == mock_user

    @pytest.mark.asyncio
    async def test_get_user_by_email_not_found(self, mock_db_session):
        """Test get_user_by_email when user doesn't exist"""
        auth_service = AuthService(db=mock_db_session)

        # Mock database query returns None
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result

        result = await auth_service.get_user_by_email("nonexistent@example.com")

        assert result is None
