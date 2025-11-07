"""
Integration tests for FollowService with real database.

These tests require actual database connection because they test features
that cannot be mocked:
- SQLAlchemy server_default=func.now() timestamps (Follow.created_at)
- Database-level pagination
- Database constraints (foreign keys, unique indexes)

Usage:
    pytest tests/integration/test_follow_service_integration.py -v
    pytest -m integration  # Run all integration tests
"""

import uuid
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.follow import Follow
from app.models.user import User
from app.services.follow_service import FollowService

# ============================================================================
# FIXTURES
# ============================================================================


@pytest_asyncio.fixture
async def test_users(integration_db_session):
    """Create test users with profiles in database for follow relationship tests."""
    from app.models.profile import Profile

    users = []
    for i in range(1, 6):  # Create 5 test users
        user = User(
            id=uuid.uuid4(),
            email=f"user{i}@test.com",
            full_name=f"Test User {i}",
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

    # Create profiles for each user (required for get_followers/get_following)
    for i, user in enumerate(users, start=1):
        profile = Profile(
            user_id=user.id,
            username=f"testuser{i}",
            display_name=f"Test User {i}",
            bio=f"Bio for test user {i}",
            is_public=True,
        )
        integration_db_session.add(profile)

    await integration_db_session.commit()

    return users


@pytest.fixture
def follow_service(integration_db_session):
    """FollowService instance with real database session."""
    return FollowService(db=integration_db_session)


# ============================================================================
# INTEGRATION TESTS
# ============================================================================


@pytest.mark.asyncio
@pytest.mark.integration
class TestFollowServiceIntegration:
    """Integration tests for FollowService with real database."""

    async def test_follow_user_success_with_server_default_timestamp(
        self, follow_service, test_users, integration_db_session
    ):
        """
        Test successful follow operation with real database server_default timestamp.

        This test REQUIRES real database because Follow.created_at uses:
        - server_default=func.now() (SQLAlchemy)
        - Cannot be mocked without actual database
        """
        follower = test_users[0]
        followee = test_users[1]

        # Call service method with real database
        result = await follow_service.follow_user(follower.id, followee.id)

        # Verify FollowResponse returned
        assert result is not None
        assert result.follower_id == follower.id
        assert result.followee_id == followee.id
        assert result.created_at is not None  # ✅ server_default worked!

        # Verify Follow record created in database
        query = select(Follow).where(
            Follow.follower_id == follower.id, Follow.followee_id == followee.id
        )
        result_db = await integration_db_session.execute(query)
        follow_record = result_db.scalar_one_or_none()

        assert follow_record is not None
        assert follow_record.created_at is not None  # ✅ Database timestamp set
        assert isinstance(follow_record.created_at, datetime)

    async def test_get_followers_with_database_pagination(
        self, follow_service, test_users, integration_db_session
    ):
        """
        Test get_followers with real database pagination.

        This test REQUIRES real database because:
        - Database-level LIMIT/OFFSET pagination
        - Cannot mock database pagination behavior accurately
        """
        followee = test_users[0]  # User who will have followers
        followers = test_users[1:4]  # 3 users who will follow

        # Create follow relationships (user1, user2, user3 follow user0)
        for follower in followers:
            await follow_service.follow_user(follower.id, followee.id)

        # Test pagination: page 1, page_size 2 (should return 2 of 3 followers)
        result = await follow_service.get_followers(user_id=followee.id, page=1, page_size=2)

        # Verify pagination worked correctly
        assert result is not None
        assert result.total == 3  # Total followers
        assert len(result.followers) == 2  # Page size limit
        assert result.page == 1
        assert result.page_size == 2
        assert result.has_next is True  # More pages available

        # Test page 2 (should return remaining 1 follower)
        result_page2 = await follow_service.get_followers(user_id=followee.id, page=2, page_size=2)

        assert len(result_page2.followers) == 1  # Remaining follower
        assert result_page2.page == 2
        assert result_page2.has_next is False  # No more pages
        assert result_page2.page == 2

    async def test_follow_user_idempotent_with_database(self, follow_service, test_users):
        """
        Test following same user twice returns existing relationship (with database).

        Verifies idempotency with real database constraints.
        """
        follower = test_users[0]
        followee = test_users[1]

        # First follow
        result1 = await follow_service.follow_user(follower.id, followee.id)
        assert result1 is not None

        # Second follow (should return existing relationship)
        result2 = await follow_service.follow_user(follower.id, followee.id)
        assert result2 is not None
        assert result2.id == result1.id  # Same relationship
        assert result2.created_at == result1.created_at  # Same timestamp

    async def test_unfollow_user_with_database(
        self, follow_service, test_users, integration_db_session
    ):
        """Test unfollow operation removes relationship from database."""
        follower = test_users[0]
        followee = test_users[1]

        # Create follow relationship
        await follow_service.follow_user(follower.id, followee.id)

        # Verify relationship exists
        query = select(Follow).where(
            Follow.follower_id == follower.id, Follow.followee_id == followee.id
        )
        result = await integration_db_session.execute(query)
        assert result.scalar_one_or_none() is not None

        # Unfollow
        success = await follow_service.unfollow_user(follower.id, followee.id)
        assert success is True

        # Verify relationship removed from database
        result_after = await integration_db_session.execute(query)
        assert result_after.scalar_one_or_none() is None

    async def test_follow_yourself_fails_with_database(self, follow_service, test_users):
        """Test cannot follow yourself (database constraint)."""
        user = test_users[0]

        # Attempt to follow yourself
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            await follow_service.follow_user(user.id, user.id)

        assert exc_info.value.status_code == 400
        assert "Cannot follow yourself" in exc_info.value.detail

    async def test_follow_nonexistent_user_fails_with_database(self, follow_service, test_users):
        """Test following non-existent user fails (database foreign key)."""
        follower = test_users[0]
        nonexistent_id = uuid.uuid4()

        # Attempt to follow non-existent user
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            await follow_service.follow_user(follower.id, nonexistent_id)

        assert exc_info.value.status_code == 404
        assert "User not found" in exc_info.value.detail
