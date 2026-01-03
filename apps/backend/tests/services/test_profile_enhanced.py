"""
Tests for Enhanced Profile Service.

Session 106: Comprehensive testing for profile management functionality.
Covers profile CRUD operations, user settings, notification preferences,
public profiles, search, GDPR compliance, and activity statistics.
"""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.follow import Follow
from app.models.notification_models import NotificationPreference
from app.models.profile import Profile
from app.models.user import User
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
from app.services.profile_enhanced import EnhancedProfileService

# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def mock_db():
    """Mock database session."""
    return MagicMock(spec=AsyncSession)


@pytest.fixture
def service(mock_db):
    """Create EnhancedProfileService instance."""
    return EnhancedProfileService(db=mock_db)


@pytest.fixture
def sample_user_id():
    """Sample user ID."""
    return uuid.uuid4()


@pytest.fixture
def sample_profile_id():
    """Sample profile ID."""
    return uuid.uuid4()


@pytest.fixture
def sample_user(sample_user_id):
    """Sample user object."""
    return User(
        id=sample_user_id,
        email="user@example.com",
        full_name="John Doe",
        timezone="UTC",
        language="en",
        is_active=True,
        is_verified=True,
        created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2024, 1, 15, tzinfo=timezone.utc),
        last_login=datetime(2024, 1, 15, 10, 30, tzinfo=timezone.utc),
    )


@pytest.fixture
def sample_profile(sample_profile_id, sample_user_id):
    """Sample profile object."""
    return Profile(
        id=sample_profile_id,
        user_id=sample_user_id,
        username="johndoe",
        display_name="John Doe",
        bio="Software Developer",
        avatar_url="https://example.com/avatar.jpg",
        is_public=True,
        follower_count=100,
        following_count=50,
        created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2024, 1, 15, tzinfo=timezone.utc),
    )


@pytest.fixture
def sample_notification_prefs(sample_user_id):
    """Sample notification preferences object."""
    return NotificationPreference(
        id=uuid.uuid4(),
        user_id=sample_user_id,
        email_enabled=True,
        push_enabled=True,
        in_app_enabled=True,
        type_preferences={
            "follows_email": True,
            "messages_email": True,
            "ai_responses_email": False,
            "system_email": True,
            "follows_push": True,
            "messages_push": True,
            "ai_responses_push": True,
            "system_push": False,
        },
        quiet_hours_start=None,
        quiet_hours_end=None,
        timezone="UTC",
        daily_digest_enabled=False,
        weekly_digest_enabled=False,
        digest_time="09:00",
        created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2024, 1, 10, tzinfo=timezone.utc),
    )


@pytest.fixture
def sample_follow(sample_user_id):
    """Sample follow relationship."""
    return Follow(
        id=uuid.uuid4(),
        follower_id=sample_user_id,
        followee_id=uuid.uuid4(),
        created_at=datetime(2024, 1, 5, tzinfo=timezone.utc),
    )


# ============================================================================
# Test Initialization
# ============================================================================


class TestInitialization:
    """Test service initialization."""

    def test_service_creation(self, service, mock_db):
        """Test service is created correctly."""
        assert service.db == mock_db
        assert isinstance(service, EnhancedProfileService)


# ============================================================================
# Test Get Profile Methods
# ============================================================================


class TestGetProfileMethods:
    """Test profile retrieval methods."""

    @pytest.mark.asyncio
    async def test_get_profile_by_user_id_found(
        self, service, mock_db, sample_user_id, sample_profile
    ):
        """Test getting profile by user ID when profile exists."""
        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_profile
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Execute
        result = await service.get_profile_by_user_id(sample_user_id)

        # Verify
        assert result == sample_profile
        mock_db.execute.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_get_profile_by_user_id_not_found(
        self, service, mock_db, sample_user_id
    ):
        """Test getting profile by user ID when profile doesn't exist."""
        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Execute
        result = await service.get_profile_by_user_id(sample_user_id)

        # Verify
        assert result is None
        mock_db.execute.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_get_profile_by_username_found(
        self, service, mock_db, sample_profile
    ):
        """Test getting profile by username when profile exists."""
        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_profile
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Execute
        result = await service.get_profile_by_username("johndoe")

        # Verify
        assert result == sample_profile
        mock_db.execute.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_get_profile_by_username_not_found(self, service, mock_db):
        """Test getting profile by username when profile doesn't exist."""
        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Execute
        result = await service.get_profile_by_username("nonexistent")

        # Verify
        assert result is None
        mock_db.execute.assert_awaited_once()


# ============================================================================
# Test Update Profile
# ============================================================================


class TestUpdateProfile:
    """Test profile update functionality."""

    @pytest.mark.asyncio
    async def test_update_profile_success(
        self, service, mock_db, sample_user_id, sample_profile
    ):
        """Test successful profile update."""
        # Setup update data
        update_request = ProfileUpdateRequest(bio="New bio", display_name="New Name")

        # Mock get_profile_by_user_id
        with patch.object(
            service, "get_profile_by_user_id", return_value=sample_profile
        ) as mock_get:
            mock_db.execute = AsyncMock()
            mock_db.commit = AsyncMock()
            mock_db.refresh = AsyncMock()

            # Execute
            result = await service.update_profile(sample_user_id, update_request)

            # Verify
            assert isinstance(result, ProfileResponse)
            mock_get.assert_awaited_once_with(sample_user_id)
            mock_db.execute.assert_awaited_once()
            mock_db.commit.assert_awaited_once()
            mock_db.refresh.assert_awaited_once_with(sample_profile)

    @pytest.mark.asyncio
    async def test_update_profile_not_found(self, service, sample_user_id):
        """Test update profile when profile doesn't exist."""
        # Setup
        update_request = ProfileUpdateRequest(bio="New bio")

        # Mock get_profile_by_user_id to return None
        with patch.object(service, "get_profile_by_user_id", return_value=None):
            # Execute and verify exception
            with pytest.raises(HTTPException) as exc_info:
                await service.update_profile(sample_user_id, update_request)

            assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
            assert "Profile not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_update_profile_username_conflict(
        self, service, mock_db, sample_user_id, sample_profile
    ):
        """Test update profile with username already taken."""
        # Setup
        update_request = ProfileUpdateRequest(username="existinguser")

        # Mock existing profile with different username
        existing_profile = MagicMock()
        existing_profile.username = "existinguser"

        # Mock get_profile_by_user_id and get_profile_by_username
        with patch.object(
            service, "get_profile_by_user_id", return_value=sample_profile
        ):
            with patch.object(
                service, "get_profile_by_username", return_value=existing_profile
            ):
                # Execute and verify exception
                with pytest.raises(HTTPException) as exc_info:
                    await service.update_profile(sample_user_id, update_request)

                assert exc_info.value.status_code == status.HTTP_409_CONFLICT
                assert "Username already taken" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_update_profile_same_username(
        self, service, mock_db, sample_user_id, sample_profile
    ):
        """Test update profile with same username (no conflict)."""
        # Setup - update with same username
        update_request = ProfileUpdateRequest(
            username=sample_profile.username, bio="New bio"
        )

        # Mock get_profile_by_user_id
        with patch.object(
            service, "get_profile_by_user_id", return_value=sample_profile
        ) as mock_get:
            mock_db.execute = AsyncMock()
            mock_db.commit = AsyncMock()
            mock_db.refresh = AsyncMock()

            # Execute
            result = await service.update_profile(sample_user_id, update_request)

            # Verify - should not check username uniqueness
            assert isinstance(result, ProfileResponse)
            mock_get.assert_awaited_once()
            mock_db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_update_profile_partial_update(
        self, service, mock_db, sample_user_id, sample_profile
    ):
        """Test partial profile update with only some fields."""
        # Setup - only bio field
        update_request = ProfileUpdateRequest(bio="Updated bio only")

        # Mock get_profile_by_user_id
        with patch.object(
            service, "get_profile_by_user_id", return_value=sample_profile
        ):
            mock_db.execute = AsyncMock()
            mock_db.commit = AsyncMock()
            mock_db.refresh = AsyncMock()

            # Execute
            result = await service.update_profile(sample_user_id, update_request)

            # Verify
            assert isinstance(result, ProfileResponse)
            mock_db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_update_profile_empty_update(
        self, service, mock_db, sample_user_id, sample_profile
    ):
        """Test profile update with no actual changes."""
        # Setup - empty update
        update_request = ProfileUpdateRequest()

        # Mock get_profile_by_user_id
        with patch.object(
            service, "get_profile_by_user_id", return_value=sample_profile
        ):
            mock_db.execute = AsyncMock()
            mock_db.commit = AsyncMock()
            mock_db.refresh = AsyncMock()

            # Execute
            result = await service.update_profile(sample_user_id, update_request)

            # Verify - should still return profile
            assert isinstance(result, ProfileResponse)


# ============================================================================
# Test Update User Settings
# ============================================================================


class TestUpdateUserSettings:
    """Test user settings update functionality."""

    @pytest.mark.asyncio
    async def test_update_user_settings_success(
        self, service, mock_db, sample_user_id, sample_user
    ):
        """Test successful user settings update."""
        # Setup
        settings_request = UserSettingsUpdateRequest(
            full_name="Updated Name", timezone="America/New_York", language="es"
        )

        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_user
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        # Execute
        result = await service.update_user_settings(sample_user_id, settings_request)

        # Verify
        assert isinstance(result, UserSettingsResponse)
        assert mock_db.execute.await_count == 2  # SELECT + UPDATE
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once_with(sample_user)

    @pytest.mark.asyncio
    async def test_update_user_settings_not_found(
        self, service, mock_db, sample_user_id
    ):
        """Test update user settings when user doesn't exist."""
        # Setup
        settings_request = UserSettingsUpdateRequest(full_name="Test")

        # Mock database query to return None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Execute and verify exception
        with pytest.raises(HTTPException) as exc_info:
            await service.update_user_settings(sample_user_id, settings_request)

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "User not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_update_user_settings_email_change(
        self, service, mock_db, sample_user_id, sample_user
    ):
        """Test user settings update with email change."""
        # Setup
        settings_request = UserSettingsUpdateRequest(email="newemail@example.com")

        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_user
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        # Execute
        result = await service.update_user_settings(sample_user_id, settings_request)

        # Verify - email should be updated directly (note in production should verify)
        assert isinstance(result, UserSettingsResponse)
        assert mock_db.execute.await_count == 2

    @pytest.mark.asyncio
    async def test_update_user_settings_partial_update(
        self, service, mock_db, sample_user_id, sample_user
    ):
        """Test partial user settings update."""
        # Setup - only timezone
        settings_request = UserSettingsUpdateRequest(timezone="Europe/London")

        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_user
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        # Execute
        result = await service.update_user_settings(sample_user_id, settings_request)

        # Verify
        assert isinstance(result, UserSettingsResponse)
        mock_db.commit.assert_awaited_once()


# ============================================================================
# Test Notification Preferences
# ============================================================================


class TestNotificationPreferences:
    """Test notification preferences functionality."""

    @pytest.mark.asyncio
    async def test_get_notification_preferences_existing(
        self, service, mock_db, sample_user_id, sample_notification_prefs
    ):
        """Test getting existing notification preferences."""
        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_notification_prefs
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Execute
        result = await service.get_notification_preferences(sample_user_id)

        # Verify
        assert isinstance(result, NotificationPreferencesResponse)
        mock_db.execute.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_get_notification_preferences_create_default(
        self, service, mock_db, sample_user_id
    ):
        """Test creating default notification preferences when they don't exist."""
        # Mock database query to return None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.commit = AsyncMock()

        # Execute
        result = await service.get_notification_preferences(sample_user_id)

        # Verify - should create and return default preferences
        assert isinstance(result, NotificationPreferencesResponse)
        mock_db.add.assert_called_once()
        mock_db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_update_notification_preferences_existing(
        self, service, mock_db, sample_user_id, sample_notification_prefs
    ):
        """Test updating existing notification preferences."""
        # Setup
        prefs_request = NotificationPreferencesUpdateRequest(
            email_enabled=False, push_messages=False
        )

        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_notification_prefs
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        # Execute
        result = await service.update_notification_preferences(
            sample_user_id, prefs_request
        )

        # Verify
        assert isinstance(result, NotificationPreferencesResponse)
        assert mock_db.execute.await_count == 2  # SELECT + UPDATE
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_update_notification_preferences_create_new(
        self, service, mock_db, sample_user_id
    ):
        """Test creating new notification preferences during update."""
        # Setup
        prefs_request = NotificationPreferencesUpdateRequest(email_enabled=True)

        # Mock database query to return None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.flush = AsyncMock()

        # Execute
        result = await service.update_notification_preferences(
            sample_user_id, prefs_request
        )

        # Verify - should create new preferences
        assert isinstance(result, NotificationPreferencesResponse)
        mock_db.add.assert_called_once()
        mock_db.flush.assert_awaited_once()
        mock_db.commit.assert_awaited_once()


# ============================================================================
# Test Public Profile
# ============================================================================


class TestPublicProfile:
    """Test public profile functionality."""

    @pytest.mark.asyncio
    async def test_get_public_profile_success(
        self, service, mock_db, sample_profile_id, sample_profile
    ):
        """Test getting public profile successfully."""
        # Use a different user_id as viewer (not the profile owner)
        viewer_user_id = uuid.uuid4()

        # Mock database queries
        mock_profile_result = MagicMock()
        mock_profile_result.scalar_one_or_none.return_value = sample_profile

        mock_follow_result = MagicMock()
        mock_follow_result.scalar_one_or_none.return_value = None  # Not following

        mock_db.execute = AsyncMock(
            side_effect=[mock_profile_result, mock_follow_result]
        )

        # Execute
        result = await service.get_public_profile(sample_profile_id, viewer_user_id)

        # Verify
        assert isinstance(result, PublicProfileResponse)
        assert result.username == sample_profile.username
        assert result.is_following is False
        assert mock_db.execute.await_count == 2

    @pytest.mark.asyncio
    async def test_get_public_profile_not_found(
        self, service, mock_db, sample_profile_id
    ):
        """Test getting public profile when profile doesn't exist."""
        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Execute and verify exception
        with pytest.raises(HTTPException) as exc_info:
            await service.get_public_profile(sample_profile_id)

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "Profile not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_public_profile_private_unauthorized(
        self, service, mock_db, sample_profile_id, sample_user_id, sample_profile
    ):
        """Test accessing private profile without authorization."""
        # Setup - private profile
        sample_profile.is_public = False
        different_user_id = uuid.uuid4()  # Different from profile owner

        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_profile
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Execute and verify exception
        with pytest.raises(HTTPException) as exc_info:
            await service.get_public_profile(sample_profile_id, different_user_id)

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "Profile is private" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_public_profile_private_own_profile(
        self, service, mock_db, sample_profile_id, sample_user_id, sample_profile
    ):
        """Test accessing own private profile (should succeed)."""
        # Setup - private profile but viewing own
        sample_profile.is_public = False

        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_profile
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Execute - should succeed because user is viewing their own profile
        result = await service.get_public_profile(sample_profile_id, sample_user_id)

        # Verify
        assert isinstance(result, PublicProfileResponse)
        assert result.is_following is None  # Should be None for own profile

    @pytest.mark.asyncio
    async def test_get_public_profile_is_following(
        self,
        service,
        mock_db,
        sample_profile_id,
        sample_profile,
        sample_follow,
    ):
        """Test public profile shows is_following status."""
        # Use a different user_id as viewer (not the profile owner)
        viewer_user_id = uuid.uuid4()

        # Mock database queries
        mock_profile_result = MagicMock()
        mock_profile_result.scalar_one_or_none.return_value = sample_profile

        mock_follow_result = MagicMock()
        mock_follow_result.scalar_one_or_none.return_value = (
            sample_follow  # Is following
        )

        mock_db.execute = AsyncMock(
            side_effect=[mock_profile_result, mock_follow_result]
        )

        # Execute
        result = await service.get_public_profile(sample_profile_id, viewer_user_id)

        # Verify
        assert result.is_following is True

    @pytest.mark.asyncio
    async def test_get_public_profile_no_current_user(
        self, service, mock_db, sample_profile_id, sample_profile
    ):
        """Test getting public profile without current user (anonymous)."""
        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_profile
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Execute - no current_user_id
        result = await service.get_public_profile(
            sample_profile_id, current_user_id=None
        )

        # Verify
        assert isinstance(result, PublicProfileResponse)
        assert result.is_following is None
        mock_db.execute.assert_awaited_once()  # Only profile query, no follow check


# ============================================================================
# Test Search Profiles
# ============================================================================


class TestSearchProfiles:
    """Test profile search functionality."""

    @pytest.mark.asyncio
    async def test_search_profiles_success(self, service, mock_db, sample_profile):
        """Test successful profile search."""
        # Mock database queries
        mock_profiles_result = MagicMock()
        mock_profiles_result.scalars.return_value.all.return_value = [sample_profile]

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 1

        mock_db.execute = AsyncMock(
            side_effect=[mock_profiles_result, mock_count_result]
        )

        # Execute without current_user_id (anonymous search)
        result = await service.search_profiles("john")

        # Verify
        assert isinstance(result, ProfileSearchResponse)
        assert len(result.profiles) == 1
        assert result.total == 1
        assert result.page == 1
        assert result.page_size == 20

    @pytest.mark.asyncio
    async def test_search_profiles_no_results(self, service, mock_db):
        """Test profile search with no results."""
        # Mock database queries
        mock_profiles_result = MagicMock()
        mock_profiles_result.scalars.return_value.all.return_value = []

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 0

        mock_db.execute = AsyncMock(
            side_effect=[mock_profiles_result, mock_count_result]
        )

        # Execute
        result = await service.search_profiles("nonexistent")

        # Verify
        assert len(result.profiles) == 0
        assert result.total == 0
        assert result.has_next is False

    @pytest.mark.asyncio
    async def test_search_profiles_pagination(self, service, mock_db, sample_profile):
        """Test profile search with pagination."""
        # Mock database queries
        mock_profiles_result = MagicMock()
        mock_profiles_result.scalars.return_value.all.return_value = [sample_profile]

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 50  # Total 50 results

        mock_db.execute = AsyncMock(
            side_effect=[mock_profiles_result, mock_count_result]
        )

        # Execute - page 2, page_size 10
        result = await service.search_profiles("john", page=2, page_size=10)

        # Verify
        assert result.page == 2
        assert result.page_size == 10
        assert result.total == 50
        assert result.has_next is True  # (2-1)*10 + 10 = 20 < 50

    @pytest.mark.asyncio
    async def test_search_profiles_no_pagination(
        self, service, mock_db, sample_profile
    ):
        """Test profile search last page (no next page)."""
        # Mock database queries
        mock_profiles_result = MagicMock()
        mock_profiles_result.scalars.return_value.all.return_value = [sample_profile]

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 15

        mock_db.execute = AsyncMock(
            side_effect=[mock_profiles_result, mock_count_result]
        )

        # Execute - page 2, page_size 20 (offset 20 >= total 15)
        result = await service.search_profiles("john", page=2, page_size=20)

        # Verify
        assert result.has_next is False

    @pytest.mark.asyncio
    @patch("app.services.follow_service.FollowService")
    async def test_search_profiles_with_follow_status(
        self,
        mock_follow_service_class,
        service,
        mock_db,
        sample_profile,
        sample_user_id,
    ):
        """Test profile search includes follow status when user authenticated."""
        # Mock FollowService
        mock_follow_service = MagicMock()
        mock_follow_service.batch_follow_status = AsyncMock(
            return_value={
                sample_profile.user_id: {"is_following": True, "is_follower": False}
            }
        )
        mock_follow_service_class.return_value = mock_follow_service

        # Mock database queries
        mock_profiles_result = MagicMock()
        mock_profiles_result.scalars.return_value.all.return_value = [sample_profile]

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 1

        mock_db.execute = AsyncMock(
            side_effect=[mock_profiles_result, mock_count_result]
        )

        # Execute
        result = await service.search_profiles("john", current_user_id=sample_user_id)

        # Verify
        assert result.profiles[0].is_following is True
        mock_follow_service.batch_follow_status.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_search_profiles_anonymous_user(
        self, service, mock_db, sample_profile
    ):
        """Test profile search as anonymous user (no follow status)."""
        # Mock database queries
        mock_profiles_result = MagicMock()
        mock_profiles_result.scalars.return_value.all.return_value = [sample_profile]

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 1

        mock_db.execute = AsyncMock(
            side_effect=[mock_profiles_result, mock_count_result]
        )

        # Execute - no current_user_id
        result = await service.search_profiles("john", current_user_id=None)

        # Verify - is_following should be None
        assert result.profiles[0].is_following is None


# ============================================================================
# Test Delete User Account (GDPR)
# ============================================================================


class TestDeleteUserAccount:
    """Test user account deletion (GDPR compliance)."""

    @pytest.mark.asyncio
    async def test_delete_user_account_success(self, service, mock_db, sample_user_id):
        """Test successful user account deletion."""
        # Mock database operations
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()

        # Execute
        await service.delete_user_account(sample_user_id)

        # Verify - should execute 4 delete statements
        assert (
            mock_db.execute.await_count == 4
        )  # NotificationPreference, Follow, Profile, User
        mock_db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_delete_user_account_rollback_on_error(
        self, service, mock_db, sample_user_id
    ):
        """Test user account deletion rolls back on error."""
        # Mock database to raise exception
        mock_db.execute = AsyncMock(side_effect=Exception("Database error"))
        mock_db.rollback = AsyncMock()

        # Execute and verify exception
        with pytest.raises(Exception) as exc_info:
            await service.delete_user_account(sample_user_id)

        assert "Database error" in str(exc_info.value)
        mock_db.rollback.assert_awaited_once()


# ============================================================================
# Test Export User Data (GDPR)
# ============================================================================


class TestExportUserData:
    """Test user data export (GDPR compliance)."""

    @pytest.mark.asyncio
    async def test_export_user_data_complete(
        self,
        service,
        mock_db,
        sample_user_id,
        sample_user,
        sample_profile,
        sample_notification_prefs,
        sample_follow,
    ):
        """Test complete user data export with all data present."""
        # Mock database queries
        mock_user_result = MagicMock()
        mock_user_result.scalar_one_or_none.return_value = sample_user

        mock_profile_result = MagicMock()
        mock_profile_result.scalar_one_or_none.return_value = sample_profile

        mock_prefs_result = MagicMock()
        mock_prefs_result.scalar_one_or_none.return_value = sample_notification_prefs

        mock_following_result = MagicMock()
        mock_following_result.scalars.return_value.all.return_value = [sample_follow]

        mock_followers_result = MagicMock()
        mock_followers_result.scalars.return_value.all.return_value = []

        mock_db.execute = AsyncMock(
            side_effect=[
                mock_user_result,
                mock_profile_result,
                mock_prefs_result,
                mock_following_result,
                mock_followers_result,
            ]
        )

        # Execute
        result = await service.export_user_data(sample_user_id)

        # Verify
        assert "user" in result
        assert "profile" in result
        assert "notification_preferences" in result
        assert "following" in result
        assert "followers" in result
        assert "stats" in result

        assert result["user"]["email"] == sample_user.email
        assert result["profile"]["username"] == sample_profile.username
        assert result["notification_preferences"]["email_enabled"] is True
        assert len(result["following"]) == 1
        assert result["stats"]["following_count"] == 1

    @pytest.mark.asyncio
    async def test_export_user_data_user_not_found(
        self, service, mock_db, sample_user_id
    ):
        """Test user data export when user doesn't exist."""
        # Mock database query to return None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Execute and verify exception
        with pytest.raises(HTTPException) as exc_info:
            await service.export_user_data(sample_user_id)

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "User not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_export_user_data_minimal(
        self, service, mock_db, sample_user_id, sample_user
    ):
        """Test user data export with minimal data (no profile, prefs, follows)."""
        # Mock database queries
        mock_user_result = MagicMock()
        mock_user_result.scalar_one_or_none.return_value = sample_user

        mock_profile_result = MagicMock()
        mock_profile_result.scalar_one_or_none.return_value = None

        mock_prefs_result = MagicMock()
        mock_prefs_result.scalar_one_or_none.return_value = None

        mock_following_result = MagicMock()
        mock_following_result.scalars.return_value.all.return_value = []

        mock_followers_result = MagicMock()
        mock_followers_result.scalars.return_value.all.return_value = []

        mock_db.execute = AsyncMock(
            side_effect=[
                mock_user_result,
                mock_profile_result,
                mock_prefs_result,
                mock_following_result,
                mock_followers_result,
            ]
        )

        # Execute
        result = await service.export_user_data(sample_user_id)

        # Verify - should handle None values
        assert result["user"]["email"] == sample_user.email
        assert result["profile"] is None
        assert result["notification_preferences"] is None
        assert result["following"] == []
        assert result["followers"] == []
        assert result["stats"]["follower_count"] == 0


# ============================================================================
# Test Profile Activity Stats
# ============================================================================


class TestProfileActivityStats:
    """Test profile activity statistics."""

    @pytest.mark.asyncio
    async def test_get_profile_activity_stats_success(
        self, service, mock_db, sample_user_id, sample_profile
    ):
        """Test getting profile activity stats successfully."""
        # Mock database queries
        mock_profile_result = MagicMock()
        mock_profile_result.scalar_one_or_none.return_value = sample_profile

        mock_followers_result = MagicMock()
        mock_followers_result.scalar.return_value = 100

        mock_following_result = MagicMock()
        mock_following_result.scalar.return_value = 50

        mock_db.execute = AsyncMock(
            side_effect=[
                mock_profile_result,
                mock_followers_result,
                mock_following_result,
            ]
        )

        # Execute
        result = await service.get_profile_activity_stats(sample_user_id)

        # Verify
        assert result["follower_count"] == 100
        assert result["following_count"] == 50
        assert "profile_completeness" in result
        assert "last_updated" in result
        assert "account_age_days" in result
        assert mock_db.execute.await_count == 3

    @pytest.mark.asyncio
    async def test_get_profile_activity_stats_not_found(
        self, service, mock_db, sample_user_id
    ):
        """Test getting profile activity stats when profile doesn't exist."""
        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Execute and verify exception
        with pytest.raises(HTTPException) as exc_info:
            await service.get_profile_activity_stats(sample_user_id)

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "Profile not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_profile_activity_stats_null_counts(
        self, service, mock_db, sample_user_id, sample_profile
    ):
        """Test profile activity stats with null count values."""
        # Mock database queries
        mock_profile_result = MagicMock()
        mock_profile_result.scalar_one_or_none.return_value = sample_profile

        mock_followers_result = MagicMock()
        mock_followers_result.scalar.return_value = None  # Null count

        mock_following_result = MagicMock()
        mock_following_result.scalar.return_value = None  # Null count

        mock_db.execute = AsyncMock(
            side_effect=[
                mock_profile_result,
                mock_followers_result,
                mock_following_result,
            ]
        )

        # Execute
        result = await service.get_profile_activity_stats(sample_user_id)

        # Verify - should default to 0
        assert result["follower_count"] == 0
        assert result["following_count"] == 0


# ============================================================================
# Test Profile Completeness Calculation
# ============================================================================


class TestProfileCompletenessCalculation:
    """Test profile completeness percentage calculation."""

    def test_calculate_profile_completeness_full(self, service, sample_profile):
        """Test completeness calculation for fully complete profile."""
        # All fields present
        completeness = service._calculate_profile_completeness(sample_profile)

        # Verify - 4/4 fields = 100%
        assert completeness == 100.0

    def test_calculate_profile_completeness_partial(self, service, sample_profile):
        """Test completeness calculation for partially complete profile."""
        # Remove some fields
        sample_profile.bio = None
        sample_profile.avatar_url = None

        completeness = service._calculate_profile_completeness(sample_profile)

        # Verify - 2/4 fields = 50%
        assert completeness == 50.0

    def test_calculate_profile_completeness_minimal(self, service):
        """Test completeness calculation for minimal profile."""
        # Only username
        profile = Profile(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            username="testuser",
            display_name=None,
            bio=None,
            avatar_url=None,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        completeness = service._calculate_profile_completeness(profile)

        # Verify - 1/4 fields = 25%
        assert completeness == 25.0

    def test_calculate_profile_completeness_empty(self, service):
        """Test completeness calculation for profile with empty strings."""
        # Empty strings should count as incomplete
        profile = Profile(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            username="testuser",
            display_name="",  # Empty string
            bio="",  # Empty string
            avatar_url=None,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        completeness = service._calculate_profile_completeness(profile)

        # Verify - only username counts (empty strings are falsy)
        assert completeness == 25.0


# ============================================================================
# Test Edge Cases
# ============================================================================


class TestEdgeCases:
    """Test edge cases and error handling."""

    @pytest.mark.asyncio
    async def test_get_public_profile_missing_attributes(
        self, service, mock_db, sample_profile_id, sample_profile
    ):
        """Test public profile with missing optional attributes."""
        # Remove optional attributes
        delattr(sample_profile, "follower_count")
        delattr(sample_profile, "following_count")

        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_profile
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Execute
        result = await service.get_public_profile(sample_profile_id)

        # Verify - should default to 0 for missing attributes
        assert result.follower_count == 0
        assert result.following_count == 0

    @pytest.mark.asyncio
    async def test_export_user_data_null_last_login(
        self, service, mock_db, sample_user_id, sample_user
    ):
        """Test user data export with null last_login."""
        # Set last_login to None
        sample_user.last_login = None

        # Mock database queries
        mock_user_result = MagicMock()
        mock_user_result.scalar_one_or_none.return_value = sample_user

        mock_profile_result = MagicMock()
        mock_profile_result.scalar_one_or_none.return_value = None

        mock_prefs_result = MagicMock()
        mock_prefs_result.scalar_one_or_none.return_value = None

        mock_following_result = MagicMock()
        mock_following_result.scalars.return_value.all.return_value = []

        mock_followers_result = MagicMock()
        mock_followers_result.scalars.return_value.all.return_value = []

        mock_db.execute = AsyncMock(
            side_effect=[
                mock_user_result,
                mock_profile_result,
                mock_prefs_result,
                mock_following_result,
                mock_followers_result,
            ]
        )

        # Execute
        result = await service.export_user_data(sample_user_id)

        # Verify - last_login should be None
        assert result["user"]["last_login"] is None

    @pytest.mark.asyncio
    async def test_search_profiles_empty_query(self, service, mock_db):
        """Test profile search with empty query string."""
        # Mock database queries
        mock_profiles_result = MagicMock()
        mock_profiles_result.scalars.return_value.all.return_value = []

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 0

        mock_db.execute = AsyncMock(
            side_effect=[mock_profiles_result, mock_count_result]
        )

        # Execute - empty query
        result = await service.search_profiles("")

        # Verify - should still work
        assert result.total == 0
        assert len(result.profiles) == 0
