"""
Integration tests for app.services.profile_service (Database-Dependent Tests)

This module contains integration tests that require a real PostgreSQL database
connection. These tests validate:
- Database model defaults (created_at, updated_at, server defaults)
- Database constraints (foreign keys, unique constraints)
- Real database query behavior (pagination, filtering, joins)

Session 36: Profile Service Integration Tests
Completes Session 30 Phase 2 - 4 skipped database-dependent tests
Reuses Session 33 integration_db_session fixture pattern

Tests (5 comprehensive tests):
1. test_get_profile_by_user_id_with_database_defaults - Profile model defaults
2. test_update_profile_with_database_constraints - Profile update with constraints
3. test_search_profiles_with_database_pagination - Database pagination (LIMIT/OFFSET)
4. test_update_profile_username_conflict_with_database - Unique constraint enforcement
5. test_get_public_profile_with_database_joins - Profile-User table JOIN

Expected Coverage: profile_service baseline → 43%+ (+12pp improvement)
"""

import uuid
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from fastapi import HTTPException

from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import ProfileUpdateRequest
from app.services.profile_service import ProfileService

# ============================================================================
# FIXTURES
# ============================================================================


@pytest_asyncio.fixture
async def test_users_with_profiles(integration_db_session):
    """Create test users with profiles for integration tests."""
    users = []
    profiles = []

    for i in range(1, 4):  # Create 3 test users with profiles
        user = User(
            id=uuid.uuid4(),
            email=f"profileuser{i}@test.com",
            full_name=f"Profile User {i}",
            password_hash="hashed_password_placeholder",
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        integration_db_session.add(user)
        users.append(user)

    await integration_db_session.commit()

    # Refresh to get IDs
    for user in users:
        await integration_db_session.refresh(user)

    # Create profiles for each user
    for i, user in enumerate(users, start=1):
        profile = Profile(
            user_id=user.id,
            username=f"profiletest{i}",
            display_name=f"Profile Test User {i}",
            bio=f"Test bio for user {i}",
            is_public=True,
        )
        integration_db_session.add(profile)
        profiles.append(profile)

    await integration_db_session.commit()

    # Refresh profiles to get database defaults
    for profile in profiles:
        await integration_db_session.refresh(profile)

    return users, profiles


@pytest.fixture
def profile_service_integration(integration_db_session):
    """ProfileService instance with real database session."""
    return ProfileService(db=integration_db_session)


# ============================================================================
# INTEGRATION TESTS
# ============================================================================


@pytest.mark.integration
class TestProfileServiceIntegration:
    """Integration tests requiring real PostgreSQL database"""

    @pytest.mark.asyncio
    async def test_get_profile_by_user_id_with_database_defaults(
        self, profile_service_integration, test_users_with_profiles
    ):
        """
        Test get profile with database-generated defaults.

        This test REQUIRES real database because:
        - Profile model has follower_count, following_count defaults (0)
        - created_at, updated_at have server_default timestamps
        - is_public has default True
        """
        users, profiles = test_users_with_profiles
        user = users[0]
        expected_profile = profiles[0]

        # Get profile by user_id
        result = await profile_service_integration.get_profile_by_user_id(user.id)

        # Verify database defaults
        assert result is not None
        assert result.user_id == user.id
        assert result.username == expected_profile.username
        assert result.display_name == expected_profile.display_name
        assert result.follower_count == 0  # Database default
        assert result.following_count == 0  # Database default
        assert result.is_public is True  # Database default
        assert result.created_at is not None  # Server default
        assert result.updated_at is not None  # Server default

    @pytest.mark.asyncio
    async def test_update_profile_with_database_constraints(
        self, profile_service_integration, test_users_with_profiles, integration_db_session
    ):
        """
        Test profile update with database constraints.

        This test REQUIRES real database because:
        - Profile model has follower_count, following_count (cannot be None)
        - Username unique constraint enforced by database
        - Foreign key constraint to users table
        """
        users, profiles = test_users_with_profiles
        user = users[0]
        original_profile = profiles[0]

        # Update profile bio and display_name
        update_data = ProfileUpdateRequest(
            username=original_profile.username,  # Keep same username (required field)
            bio="Updated bio with database",
            display_name="Updated Display Name",
        )

        result = await profile_service_integration.update_profile(user.id, update_data)

        # Verify update succeeded with constraints preserved
        assert result is not None
        assert result.bio == "Updated bio with database"
        assert result.display_name == "Updated Display Name"
        assert result.follower_count == 0  # Default preserved
        assert result.following_count == 0  # Default preserved
        assert result.updated_at is not None  # Database auto-updates

        # Refresh profile model (not Pydantic schema) to verify database state
        await integration_db_session.refresh(original_profile)
        assert original_profile.bio == "Updated bio with database"
        assert original_profile.display_name == "Updated Display Name"

    @pytest.mark.asyncio
    async def test_search_profiles_with_database_pagination(
        self, profile_service_integration, test_users_with_profiles
    ):
        """
        Test profile search with real database pagination.

        This test REQUIRES real database because:
        - Database-level LIMIT/OFFSET pagination
        - ILIKE query for case-insensitive search
        - Cannot mock database query behavior accurately
        """
        _unused_users, _unused_profiles = test_users_with_profiles

        # Search for profiles with "test" in username (should match all 3)
        result = await profile_service_integration.search_profiles(
            query="profiletest", page=1, page_size=2
        )

        # Verify pagination worked correctly
        assert result is not None
        assert len(result.profiles) == 2  # Page size limit
        assert result.total == 3  # Total matching profiles
        assert result.page == 1
        assert result.page_size == 2

        # Test page 2 (should return remaining 1 profile)
        result_page2 = await profile_service_integration.search_profiles(
            query="profiletest", page=2, page_size=2
        )

        assert len(result_page2.profiles) == 1  # Remaining profile
        assert result_page2.total == 3
        assert result_page2.page == 2

        # Verify case-insensitive search (database ILIKE)
        result_case = await profile_service_integration.search_profiles(
            query="PROFILETEST", page=1, page_size=10
        )

        assert len(result_case.profiles) == 3  # All 3 profiles match

    @pytest.mark.asyncio
    async def test_update_profile_username_conflict_with_database(
        self, profile_service_integration, test_users_with_profiles
    ):
        """
        Test profile update with username conflict enforced by database.

        This test validates that database unique constraint on username
        is properly handled by the service.
        """
        users, profiles = test_users_with_profiles
        user1 = users[0]
        profile2 = profiles[1]  # User 2's profile

        # Try to update user1's username to user2's username (conflict)
        update_data = ProfileUpdateRequest(username=profile2.username)

        # Should raise HTTPException due to username conflict
        with pytest.raises(HTTPException):  # Service should handle duplicate username
            await profile_service_integration.update_profile(user1.id, update_data)

    @pytest.mark.asyncio
    async def test_get_public_profile_with_database_joins(
        self, profile_service_integration, test_users_with_profiles
    ):
        """
        Test get public profile with database joins.

        This test validates that database joins between Profile and User
        tables work correctly for public profile access.
        """
        _, profiles = test_users_with_profiles
        profile = profiles[0]

        # Get public profile (no follow status)
        result = await profile_service_integration.get_public_profile(profile.id)

        # Verify public profile data
        assert result is not None
        assert result.id == profile.id
        assert result.username == profile.username
        assert result.display_name == profile.display_name
        assert result.follower_count == 0
        assert result.following_count == 0
        assert result.is_public is True
