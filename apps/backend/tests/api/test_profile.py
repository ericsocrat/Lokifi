"""
Comprehensive tests for app.routers.profile

Tests: 12 total, 4 test classes

Coverage targets:
- Profile CRUD operations (get, update)
- Public profile access (by ID, by username)
- Profile search functionality
- User settings management
- Notification preferences
- Account deletion (GDPR compliance)
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, status

from app.routers.profile import (
    delete_account,
    get_my_profile,
    get_notification_preferences,
    get_profile,
    get_profile_by_username,
    get_user_settings,
    search_profiles,
    update_my_profile,
    update_notification_preferences,
    update_user_settings,
)
from app.schemas.profile import (
    NotificationPreferencesResponse,
    NotificationPreferencesUpdateRequest,
    ProfileResponse,
    ProfileSearchResponse,
    ProfileUpdateRequest,
    PublicProfileResponse,
    UserSettingsResponse,
    UserSettingsUpdateRequest,
)


# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_current_user():
    """Mock authenticated user."""
    user = MagicMock()
    user.id = uuid.uuid4()
    user.username = "testuser"
    user.email = "test@example.com"
    user.display_name = "Test User"
    user.full_name = "Test User"
    user.avatar_url = "https://example.com/avatar.jpg"
    user.bio = "Test bio"
    user.is_active = True
    user.is_verified = True
    user.timezone = "UTC"
    user.language = "en"
    user.created_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    user.last_login = datetime.now(timezone.utc)
    return user


@pytest.fixture
def mock_db_session():
    """Mock database session."""
    mock_db = MagicMock()
    mock_db.execute = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()
    return mock_db


@pytest.fixture
def sample_profile_response():
    """Sample profile response."""
    return ProfileResponse(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        username="testuser",
        display_name="Test User",
        avatar_url="https://example.com/avatar.jpg",
        bio="Test bio",
        is_public=True,
        follower_count=100,
        following_count=50,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def sample_public_profile():
    """Sample public profile response."""
    return PublicProfileResponse(
        id=uuid.uuid4(),
        username="publicuser",
        display_name="Public User",
        avatar_url="https://example.com/avatar.jpg",
        bio="Public bio",
        is_public=True,
        follower_count=100,
        following_count=50,
        is_following=False,
        created_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def sample_user_settings():
    """Sample user settings response."""
    return UserSettingsResponse(
        id=uuid.uuid4(),
        email="test@example.com",
        full_name="Test User",
        timezone="UTC",
        language="en",
        is_verified=True,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        last_login=datetime.now(timezone.utc),
    )


@pytest.fixture
def sample_notification_preferences():
    """Sample notification preferences response."""
    return NotificationPreferencesResponse(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        email_enabled=True,
        email_follows=True,
        email_messages=True,
        email_ai_responses=True,
        email_system=True,
        push_enabled=True,
        push_follows=True,
        push_messages=True,
        push_ai_responses=True,
        push_system=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


# ============================================================================
# TEST CLASS 1: Profile CRUD Operations
# ============================================================================


class TestProfileCRUD:
    """Test profile CRUD operations."""

    @pytest.mark.asyncio
    @patch("app.routers.profile.ProfileService")
    async def test_get_my_profile_success(
        self, mock_service_class, mock_current_user, mock_db_session, sample_profile_response
    ):
        """Test getting current user's profile successfully."""
        # Mock ProfileService instance and method
        mock_service = mock_service_class.return_value
        mock_service.get_profile_by_user_id = AsyncMock(return_value=sample_profile_response)

        result = await get_my_profile(current_user=mock_current_user, db=mock_db_session)

        assert isinstance(result, ProfileResponse)
        assert result.username == sample_profile_response.username
        mock_service.get_profile_by_user_id.assert_awaited_once_with(mock_current_user.id)

    @pytest.mark.asyncio
    @patch("app.routers.profile.ProfileService")
    async def test_get_my_profile_not_found(
        self, mock_service_class, mock_current_user, mock_db_session
    ):
        """Test getting profile when profile not found."""
        mock_service = mock_service_class.return_value
        mock_service.get_profile_by_user_id = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await get_my_profile(current_user=mock_current_user, db=mock_db_session)

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "Profile not found" in exc_info.value.detail

    @pytest.mark.asyncio
    @patch("app.routers.profile.ProfileService")
    async def test_update_my_profile_success(
        self, mock_service_class, mock_current_user, mock_db_session, sample_profile_response
    ):
        """Test updating current user's profile successfully."""
        mock_service = mock_service_class.return_value
        mock_service.update_profile = AsyncMock(return_value=sample_profile_response)

        profile_data = ProfileUpdateRequest(
            username="updateduser",
            display_name="Updated Name",
            bio="Updated bio",
            avatar_url="https://example.com/new.jpg",
        )

        result = await update_my_profile(
            profile_data=profile_data, current_user=mock_current_user, db=mock_db_session
        )

        assert isinstance(result, ProfileResponse)
        mock_service.update_profile.assert_awaited_once_with(mock_current_user.id, profile_data)


# ============================================================================
# TEST CLASS 2: Public Profile Access
# ============================================================================


class TestPublicProfileAccess:
    """Test public profile access endpoints."""

    @pytest.mark.asyncio
    @patch("app.routers.profile.ProfileService")
    async def test_get_profile_by_id_success(
        self, mock_service_class, mock_db_session, sample_public_profile, mock_current_user
    ):
        """Test getting public profile by ID successfully."""
        mock_service = mock_service_class.return_value
        mock_service.get_public_profile = AsyncMock(return_value=sample_public_profile)

        profile_id = uuid.uuid4()
        result = await get_profile(
            profile_id=profile_id, db=mock_db_session, current_user=mock_current_user
        )

        assert isinstance(result, PublicProfileResponse)
        assert result.username == sample_public_profile.username
        mock_service.get_public_profile.assert_awaited_once_with(profile_id, mock_current_user.id)

    @pytest.mark.asyncio
    @patch("app.routers.profile.ProfileService")
    async def test_get_profile_by_username_success(
        self, mock_service_class, mock_db_session, sample_public_profile, mock_current_user
    ):
        """Test getting public profile by username successfully."""
        mock_service = mock_service_class.return_value

        # Mock get_profile_by_username to return a profile with an id
        profile_with_id = MagicMock()
        profile_with_id.id = sample_public_profile.id
        mock_service.get_profile_by_username = AsyncMock(return_value=profile_with_id)
        mock_service.get_public_profile = AsyncMock(return_value=sample_public_profile)

        result = await get_profile_by_username(
            username="publicuser", db=mock_db_session, current_user=mock_current_user
        )

        assert isinstance(result, PublicProfileResponse)
        assert result.username == sample_public_profile.username
        mock_service.get_profile_by_username.assert_awaited_once_with("publicuser")
        mock_service.get_public_profile.assert_awaited_once_with(
            profile_with_id.id, mock_current_user.id
        )

    @pytest.mark.asyncio
    @patch("app.routers.profile.ProfileService")
    async def test_get_profile_by_username_not_found(
        self, mock_service_class, mock_db_session, mock_current_user
    ):
        """Test getting profile by username when not found."""
        mock_service = mock_service_class.return_value
        mock_service.get_profile_by_username = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await get_profile_by_username(
                username="nonexistent", db=mock_db_session, current_user=mock_current_user
            )

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "Profile not found" in exc_info.value.detail

    @pytest.mark.asyncio
    @patch("app.routers.profile.ProfileService")
    async def test_search_profiles_success(
        self, mock_service_class, mock_db_session, sample_public_profile, mock_current_user
    ):
        """Test searching profiles successfully."""
        mock_service = mock_service_class.return_value

        # Create search response with sample profile
        search_response = ProfileSearchResponse(
            profiles=[sample_public_profile],
            page=1,
            page_size=20,
            total=1,
            has_next=False,
        )
        mock_service.search_profiles = AsyncMock(return_value=search_response)

        result = await search_profiles(
            q="test", page=1, page_size=20, db=mock_db_session, current_user=mock_current_user
        )

        assert isinstance(result, ProfileSearchResponse)
        assert len(result.profiles) == 1
        assert result.profiles[0].username == sample_public_profile.username
        mock_service.search_profiles.assert_awaited_once_with(
            query="test", page=1, page_size=20, current_user_id=mock_current_user.id
        )


# ============================================================================
# TEST CLASS 3: User Settings Management
# ============================================================================


class TestUserSettings:
    """Test user settings management endpoints."""

    @pytest.mark.asyncio
    async def test_get_user_settings_success(self, mock_current_user):
        """Test getting user settings successfully."""
        result = await get_user_settings(current_user=mock_current_user)

        assert isinstance(result, UserSettingsResponse)
        assert result.email == mock_current_user.email
        assert result.full_name == mock_current_user.full_name
        assert result.language == mock_current_user.language

    @pytest.mark.asyncio
    @patch("app.routers.profile.ProfileService")
    async def test_update_user_settings_success(
        self, mock_service_class, mock_current_user, mock_db_session, sample_user_settings
    ):
        """Test updating user settings successfully."""
        mock_service = mock_service_class.return_value
        mock_service.update_user_settings = AsyncMock(return_value=sample_user_settings)

        settings_data = UserSettingsUpdateRequest(
            full_name="Updated Name", timezone="America/New_York", language="es"
        )

        result = await update_user_settings(
            settings_data=settings_data, current_user=mock_current_user, db=mock_db_session
        )

        assert isinstance(result, UserSettingsResponse)
        mock_service.update_user_settings.assert_awaited_once_with(
            mock_current_user.id, settings_data
        )


# ============================================================================
# TEST CLASS 4: Notification Preferences & Account Deletion
# ============================================================================


class TestNotificationPreferencesAndDeletion:
    """Test notification preferences and account deletion endpoints."""

    @pytest.mark.asyncio
    @patch("app.routers.profile.ProfileService")
    async def test_get_notification_preferences_success(
        self,
        mock_service_class,
        mock_current_user,
        mock_db_session,
        sample_notification_preferences,
    ):
        """Test getting notification preferences successfully."""
        mock_service = mock_service_class.return_value
        mock_service.get_notification_preferences = AsyncMock(
            return_value=sample_notification_preferences
        )

        result = await get_notification_preferences(
            current_user=mock_current_user, db=mock_db_session
        )

        assert isinstance(result, NotificationPreferencesResponse)
        assert result.email_enabled == sample_notification_preferences.email_enabled
        mock_service.get_notification_preferences.assert_awaited_once_with(mock_current_user.id)

    @pytest.mark.asyncio
    @patch("app.routers.profile.ProfileService")
    async def test_update_notification_preferences_success(
        self,
        mock_service_class,
        mock_current_user,
        mock_db_session,
        sample_notification_preferences,
    ):
        """Test updating notification preferences successfully."""
        mock_service = mock_service_class.return_value
        mock_service.update_notification_preferences = AsyncMock(
            return_value=sample_notification_preferences
        )

        prefs_data = NotificationPreferencesUpdateRequest(email_enabled=False, push_enabled=True)

        result = await update_notification_preferences(
            prefs_data=prefs_data, current_user=mock_current_user, db=mock_db_session
        )

        assert isinstance(result, NotificationPreferencesResponse)
        mock_service.update_notification_preferences.assert_awaited_once_with(
            mock_current_user.id, prefs_data
        )

    @pytest.mark.asyncio
    async def test_delete_account_success(self, mock_current_user, mock_db_session):
        """Test account deletion successfully (GDPR compliance)."""
        # Mock database execute and commit
        mock_db_session.execute = AsyncMock()
        mock_db_session.commit = AsyncMock()

        result = await delete_account(current_user=mock_current_user, db=mock_db_session)

        # Verify response
        assert result.success is True
        assert "marked for deletion" in result.message
        assert "30 days" in result.message

        # Verify database operations
        mock_db_session.execute.assert_awaited_once()
        mock_db_session.commit.assert_awaited_once()
