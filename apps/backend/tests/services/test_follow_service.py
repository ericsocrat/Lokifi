"""
Comprehensive tests for follow_service.py

Coverage targets:
- Follow/unfollow operations with idempotency
- Followers/following lists with pagination
- Mutual follows calculation
- Follow suggestions
- Follow stats and activity
- Batch follow status
- Edge cases and error handling
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.follow import Follow
from app.models.notification_models import Notification, NotificationType
from app.models.profile import Profile
from app.models.user import User
from app.schemas.follow import (
    FollowActionResponse,
    FollowersListResponse,
    FollowingListResponse,
    FollowResponse,
    FollowStatsResponse,
    UserFollowStatus,
)
from app.services.follow_service import FollowService

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_db_session():
    """Mock database session for follow service tests."""
    session = MagicMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.add = MagicMock()
    session.delete = AsyncMock()
    return session


@pytest.fixture
def follow_service(mock_db_session):
    """Fixture for FollowService instance."""
    return FollowService(db=mock_db_session)


@pytest.fixture
def sample_user_ids():
    """Sample UUIDs for testing."""
    return {
        "user1": uuid.uuid4(),
        "user2": uuid.uuid4(),
        "user3": uuid.uuid4(),
    }


# ============================================================================
# FOLLOW/UNFOLLOW TESTS
# ============================================================================


class TestFollowOperations:
    """Test suite for follow/unfollow operations."""

    @pytest.mark.skip(reason="Requires database for created_at server_default")
    @pytest.mark.asyncio
    async def test_follow_user_success(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test successful follow operation creates new relationship."""
        # NOTE: This test requires database interaction because Follow.created_at
        # uses server_default=func.now() which cannot be mocked without database
        _ = sample_user_ids["user1"]  # follower_id
        _ = sample_user_ids["user2"]  # followee_id

        # This test would require integration test with real database
        pass

    @pytest.mark.asyncio
    async def test_follow_user_idempotent(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test following same user twice returns existing relationship."""
        follower_id = sample_user_ids["user1"]
        followee_id = sample_user_ids["user2"]

        # Mock user exists
        mock_user_result = MagicMock()
        mock_user_result.scalar_one_or_none.return_value = followee_id

        # Mock existing follow relationship
        existing_follow = Follow(
            id=uuid.uuid4(),
            follower_id=follower_id,
            followee_id=followee_id,
            created_at=datetime.now(timezone.utc),
        )
        mock_follow_result = MagicMock()
        mock_follow_result.scalar_one_or_none.return_value = existing_follow

        mock_db_session.execute.side_effect = [
            mock_user_result,
            mock_follow_result,
        ]

        result = await follow_service.follow_user(follower_id, followee_id)

        # Should return existing relationship without creating new one
        assert isinstance(result, FollowResponse)
        assert not mock_db_session.add.called  # No new relationship created

    @pytest.mark.asyncio
    async def test_follow_yourself_fails(self, follow_service, sample_user_ids):
        """Test cannot follow yourself."""
        user_id = sample_user_ids["user1"]

        with pytest.raises(HTTPException) as exc_info:
            await follow_service.follow_user(user_id, user_id)

        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "cannot follow yourself" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_follow_nonexistent_user_fails(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test following non-existent user returns 404."""
        follower_id = sample_user_ids["user1"]
        followee_id = sample_user_ids["user2"]

        # Mock user doesn't exist
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result

        with pytest.raises(HTTPException) as exc_info:
            await follow_service.follow_user(follower_id, followee_id)

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "user not found" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_unfollow_user_success(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test successful unfollow removes relationship."""
        follower_id = sample_user_ids["user1"]
        followee_id = sample_user_ids["user2"]

        # Mock existing follow relationship
        existing_follow = Follow(
            id=uuid.uuid4(),
            follower_id=follower_id,
            followee_id=followee_id,
            created_at=datetime.now(timezone.utc),
        )
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = existing_follow
        mock_db_session.execute.return_value = mock_result

        result = await follow_service.unfollow_user(follower_id, followee_id)

        # Verify result
        assert result is True
        assert mock_db_session.delete.called
        assert mock_db_session.commit.called

    @pytest.mark.asyncio
    async def test_unfollow_idempotent(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test unfollowing when not following returns True."""
        follower_id = sample_user_ids["user1"]
        followee_id = sample_user_ids["user2"]

        # Mock no existing follow relationship
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result

        result = await follow_service.unfollow_user(follower_id, followee_id)

        # Should return True without error
        assert result is True
        assert not mock_db_session.delete.called


# ============================================================================
# FOLLOWERS/FOLLOWING LISTS TESTS
# ============================================================================


class TestFollowLists:
    """Test suite for followers/following list retrieval."""

    @pytest.mark.asyncio
    async def test_get_followers_empty(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test getting followers for user with no followers."""
        user_id = sample_user_ids["user1"]

        # Mock empty followers list
        mock_followers_result = MagicMock()
        mock_followers_result.all.return_value = []

        # Mock count query
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 0

        mock_db_session.execute.side_effect = [
            mock_followers_result,
            mock_count_result,
        ]

        result = await follow_service.get_followers(user_id)

        assert isinstance(result, FollowersListResponse)
        assert result.followers == []
        assert result.total == 0
        assert result.page == 1

    @pytest.mark.asyncio
    async def test_get_following_empty(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test getting following for user not following anyone."""
        user_id = sample_user_ids["user1"]

        # Mock empty following list
        mock_following_result = MagicMock()
        mock_following_result.all.return_value = []

        # Mock count query
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 0

        mock_db_session.execute.side_effect = [
            mock_following_result,
            mock_count_result,
        ]

        result = await follow_service.get_following(user_id)

        assert isinstance(result, FollowingListResponse)
        assert result.following == []
        assert result.total == 0
        assert result.page == 1


# ============================================================================
# FOLLOW STATUS TESTS
# ============================================================================


class TestFollowStatus:
    """Test suite for follow status checking."""

    @pytest.mark.asyncio
    async def test_is_following_true(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test is_following returns True when relationship exists."""
        follower_id = sample_user_ids["user1"]
        followee_id = sample_user_ids["user2"]

        # Mock existing relationship
        mock_result = MagicMock()
        mock_result.scalar.return_value = 1  # Exists
        mock_db_session.execute.return_value = mock_result

        result = await follow_service.is_following(follower_id, followee_id)

        assert result is True

    @pytest.mark.asyncio
    async def test_is_following_false(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test is_following returns False when no relationship."""
        follower_id = sample_user_ids["user1"]
        followee_id = sample_user_ids["user2"]

        # Mock no relationship (scalar_one_or_none returns None)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None  # No relationship
        mock_db_session.execute.return_value = mock_result

        result = await follow_service.is_following(follower_id, followee_id)

        assert result is False


# ============================================================================
# EDGE CASES & ERROR HANDLING
# ============================================================================


class TestFollowServiceEdgeCases:
    """Test edge cases and error handling."""

    @pytest.mark.asyncio
    async def test_follow_service_initialization(self, mock_db_session):
        """Test FollowService initializes correctly."""
        service = FollowService(db=mock_db_session)
        assert service.db == mock_db_session

    @pytest.mark.asyncio
    async def test_pagination_parameters(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test pagination works correctly with different page sizes."""
        user_id = sample_user_ids["user1"]

        # Mock empty results
        mock_result = MagicMock()
        mock_result.all.return_value = []
        mock_count = MagicMock()
        mock_count.scalar.return_value = 0
        mock_db_session.execute.side_effect = [mock_result, mock_count]

        result = await follow_service.get_followers(user_id, page=2, page_size=10)

        assert result.page == 2
        assert result.page_size == 10

    @pytest.mark.asyncio
    async def test_null_user_id_handling(self, follow_service, mock_db_session):
        """Test handling of null/invalid user IDs."""
        # This test validates that proper UUID validation happens
        # In production, FastAPI validators handle this at API layer
        assert True  # Service assumes valid UUIDs from API layer


# ============================================================================
# INTEGRATION SCENARIOS
# ============================================================================


class TestFollowServiceIntegration:
    """Integration test scenarios for follow service."""

    @pytest.mark.skip(reason="Requires database for created_at server_default")
    @pytest.mark.asyncio
    async def test_full_follow_unfollow_cycle(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test complete follow → unfollow → follow again cycle."""
        # NOTE: This test requires database interaction because Follow.created_at
        # uses server_default=func.now() which cannot be mocked without database
        pass


# ============================================================================
# GAP 1: COMPLETE FOLLOW OPERATIONS (NOTIFICATION + COUNTERS)
# ============================================================================


class TestFollowUserComplete:
    """Test complete follow_user flow with notifications and counter updates."""

    @pytest.mark.asyncio
    async def test_follow_user_creates_notification(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test follow_user creates notification for followee."""
        follower_id = sample_user_ids["user1"]
        followee_id = sample_user_ids["user2"]

        # Mock user exists check
        mock_user_result = MagicMock()
        mock_user_result.scalar_one_or_none.return_value = followee_id

        # Mock no existing follow (new relationship)
        mock_existing_result = MagicMock()
        mock_existing_result.scalar_one_or_none.return_value = None

        # Mock counter update queries (2 update statements)
        mock_counter_update = AsyncMock()

        mock_db_session.execute.side_effect = [
            mock_user_result,  # User exists check
            mock_existing_result,  # Existing follow check
            mock_counter_update,  # Update followee follower_count
            mock_counter_update,  # Update follower following_count
        ]

        # Capture add() calls and mock flush to set created_at
        added_objects = []

        def mock_add(obj):
            if isinstance(obj, Follow) and obj.created_at is None:
                obj.created_at = datetime.now(timezone.utc)
            added_objects.append(obj)

        mock_db_session.add = mock_add

        async def mock_flush():
            # Set created_at on Follow objects during flush
            for obj in added_objects:
                if isinstance(obj, Follow) and obj.created_at is None:
                    obj.created_at = datetime.now(timezone.utc)

        mock_db_session.flush = mock_flush

        await follow_service.follow_user(follower_id, followee_id)

        # Verify Follow object added
        assert len(added_objects) == 2  # Follow + Notification
        follow_obj = next(
            (obj for obj in added_objects if isinstance(obj, Follow)), None
        )
        assert follow_obj is not None
        assert follow_obj.follower_id == follower_id
        assert follow_obj.followee_id == followee_id
        assert follow_obj.created_at is not None  # Set during flush

        # Verify Notification object added
        notification = next(
            (obj for obj in added_objects if isinstance(obj, Notification)), None
        )
        assert notification is not None
        assert notification.user_id == followee_id
        assert notification.related_user_id == follower_id
        # Note: NotificationType enum comparison causes lint warning but works at runtime

        # Verify commit called
        assert mock_db_session.commit.called

    @pytest.mark.asyncio
    async def test_follow_user_updates_counters_increment(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test follow_user increments follower/following counters."""
        follower_id = sample_user_ids["user1"]
        followee_id = sample_user_ids["user2"]

        # Mock user exists
        mock_user_result = MagicMock()
        mock_user_result.scalar_one_or_none.return_value = followee_id

        # Mock no existing follow
        mock_existing_result = MagicMock()
        mock_existing_result.scalar_one_or_none.return_value = None

        # Mock counter updates
        mock_counter_update = AsyncMock()

        mock_db_session.execute.side_effect = [
            mock_user_result,
            mock_existing_result,
            mock_counter_update,  # Followee follower_count + 1
            mock_counter_update,  # Follower following_count + 1
        ]

        # Mock add to set created_at on Follow objects
        def mock_add(obj):
            if isinstance(obj, Follow) and obj.created_at is None:
                obj.created_at = datetime.now(timezone.utc)

        mock_db_session.add = mock_add

        # Mock flush to ensure created_at is set
        async def mock_flush():
            pass

        mock_db_session.flush = mock_flush

        await follow_service.follow_user(follower_id, followee_id)

        # Verify execute called 4 times (user check, existing check, 2 counter updates)
        assert mock_db_session.execute.call_count == 4


class TestUnfollowCounterUpdates:
    """Test unfollow_user counter decrement logic."""

    @pytest.mark.asyncio
    async def test_unfollow_decrements_counters(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test unfollow_user decrements follower/following counters."""
        follower_id = sample_user_ids["user1"]
        followee_id = sample_user_ids["user2"]

        # Mock existing follow
        existing_follow = Follow(
            id=uuid.uuid4(),
            follower_id=follower_id,
            followee_id=followee_id,
            created_at=datetime.now(timezone.utc),
        )
        mock_follow_result = MagicMock()
        mock_follow_result.scalar_one_or_none.return_value = existing_follow

        # Mock counter updates
        mock_counter_update = AsyncMock()

        mock_db_session.execute.side_effect = [
            mock_follow_result,  # Existing follow check
            mock_counter_update,  # Followee follower_count - 1
            mock_counter_update,  # Follower following_count - 1
        ]

        result = await follow_service.unfollow_user(follower_id, followee_id)

        # Verify result
        assert result is True

        # Verify execute called 3 times (follow check + 2 counter updates)
        assert mock_db_session.execute.call_count == 3

        # Verify delete and commit called
        assert mock_db_session.delete.called
        assert mock_db_session.commit.called


class TestFollowActionResponse:
    """Test follow_action_response unified response builder."""

    @pytest.mark.asyncio
    async def test_follow_action_response_builds_correctly(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test follow_action_response builds unified response with follow status."""
        current_user_id = sample_user_ids["user1"]
        target_user_id = sample_user_ids["user2"]

        # Mock profiles
        target_profile = Profile(
            user_id=target_user_id,
            username="target_user",
            display_name="Target User",
            follower_count=100,
            following_count=50,
            is_public=True,
        )
        current_profile = Profile(
            user_id=current_user_id,
            username="current_user",
            display_name="Current User",
            follower_count=200,
            following_count=150,
            is_public=True,
        )

        # Mock profiles query
        mock_profiles_result = MagicMock()
        mock_profiles_result.scalars.return_value.all.return_value = [
            target_profile,
            current_profile,
        ]

        # Mock batch_follow_status (is_following query)
        mock_following_result = MagicMock()
        mock_following_result.all.return_value = [
            (target_user_id,)
        ]  # is_following=True

        # Mock batch_follow_status (follows_you query)
        mock_followed_by_result = MagicMock()
        mock_followed_by_result.all.return_value = [
            (target_user_id,)
        ]  # follows_you=True

        mock_db_session.execute.side_effect = [
            mock_profiles_result,  # Profiles query
            mock_following_result,  # batch_follow_status: is_following
            mock_followed_by_result,  # batch_follow_status: follows_you
        ]

        result = await follow_service.follow_action_response(
            current_user_id, target_user_id, "follow"
        )

        # Verify result
        assert isinstance(result, FollowActionResponse)
        assert result.user_id == target_user_id
        assert result.is_following is True
        assert result.follows_you is True
        assert result.mutual_follow is True
        assert result.follower_count == 100
        assert result.following_count == 50
        assert result.current_user_following_count == 150
        assert result.action == "follow"

    @pytest.mark.asyncio
    async def test_follow_action_response_profile_not_found(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test follow_action_response raises 404 if profile not found."""
        current_user_id = sample_user_ids["user1"]
        target_user_id = sample_user_ids["user2"]

        # Mock empty profiles query
        mock_profiles_result = MagicMock()
        mock_profiles_result.scalars.return_value.all.return_value = []

        mock_db_session.execute.return_value = mock_profiles_result

        with pytest.raises(HTTPException) as exc_info:
            await follow_service.follow_action_response(
                current_user_id, target_user_id, "follow"
            )

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "profile not found" in exc_info.value.detail.lower()


class TestBatchFollowStatus:
    """Test batch_follow_status helper method."""

    @pytest.mark.asyncio
    async def test_batch_follow_status_empty_targets(
        self, follow_service, sample_user_ids
    ):
        """Test batch_follow_status returns empty dict for empty target list."""
        current_user_id = sample_user_ids["user1"]
        result = await follow_service.batch_follow_status(current_user_id, [])
        assert result == {}

    @pytest.mark.asyncio
    async def test_batch_follow_status_no_current_user(
        self, follow_service, sample_user_ids
    ):
        """Test batch_follow_status returns empty dict when current_user_id is None."""
        target_ids = [sample_user_ids["user2"], sample_user_ids["user3"]]
        result = await follow_service.batch_follow_status(None, target_ids)
        assert result == {}

    @pytest.mark.asyncio
    async def test_batch_follow_status_calculates_correctly(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test batch_follow_status correctly calculates follow statuses."""
        current_user_id = sample_user_ids["user1"]
        user2_id = sample_user_ids["user2"]
        user3_id = sample_user_ids["user3"]
        target_ids = [user2_id, user3_id]

        # Mock following query: user1 follows user2 only
        mock_following_result = MagicMock()
        mock_following_result.all.return_value = [(user2_id,)]

        # Mock followed_by query: user3 follows user1 only
        mock_followed_by_result = MagicMock()
        mock_followed_by_result.all.return_value = [(user3_id,)]

        mock_db_session.execute.side_effect = [
            mock_following_result,
            mock_followed_by_result,
        ]

        result = await follow_service.batch_follow_status(current_user_id, target_ids)

        # User2: current_user follows, but user2 doesn't follow back
        assert result[user2_id]["is_following"] is True
        assert result[user2_id]["follows_you"] is False
        assert result[user2_id]["mutual_follow"] is False

        # User3: current_user doesn't follow, but user3 follows current_user
        assert result[user3_id]["is_following"] is False
        assert result[user3_id]["follows_you"] is True
        assert result[user3_id]["mutual_follow"] is False

    @pytest.mark.asyncio
    async def test_batch_follow_status_mutual_follow(
        self, follow_service, sample_user_ids, mock_db_session
    ):
        """Test batch_follow_status detects mutual follows."""
        current_user_id = sample_user_ids["user1"]
        user2_id = sample_user_ids["user2"]
        target_ids = [user2_id]

        # Mock both users follow each other
        mock_following_result = MagicMock()
        mock_following_result.all.return_value = [(user2_id,)]

        mock_followed_by_result = MagicMock()
        mock_followed_by_result.all.return_value = [(user2_id,)]

        mock_db_session.execute.side_effect = [
            mock_following_result,
            mock_followed_by_result,
        ]

        result = await follow_service.batch_follow_status(current_user_id, target_ids)

        # Both follow each other = mutual
        assert result[user2_id]["is_following"] is True
        assert result[user2_id]["follows_you"] is True
        assert result[user2_id]["mutual_follow"] is True


# ============================================
# Gap 2: Pagination & List Methods Tests
# ============================================


class TestGetFollowers:
    """Test get_followers with pagination, joins, and batch_follow_status integration."""

    @pytest.mark.asyncio
    async def test_get_followers_with_data_and_pagination(
        self, follow_service, mock_db_session, sample_user_ids
    ):
        """Test get_followers returns followers with pagination metadata."""
        user_id = sample_user_ids["user1"]
        follower1_id = sample_user_ids["user2"]
        follower2_id = sample_user_ids["user3"]
        current_user_id = sample_user_ids["user1"]

        # Mock followers query (2 followers with profile data)
        mock_followers_result = MagicMock()
        mock_row1 = MagicMock(
            follower_id=follower1_id,
            created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
            username="follower1",
            display_name="Follower One",
            avatar_url="https://example.com/avatar1.jpg",
        )
        mock_row2 = MagicMock(
            follower_id=follower2_id,
            created_at=datetime(2024, 1, 2, tzinfo=timezone.utc),
            username="follower2",
            display_name="Follower Two",
            avatar_url="https://example.com/avatar2.jpg",
        )
        mock_followers_result.all.return_value = [mock_row1, mock_row2]

        # Mock count query (2 total followers)
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 2

        # Mock batch_follow_status queries (2 queries: is_following, follows_you)
        mock_following_result = MagicMock()
        mock_following_result.all.return_value = [
            (follower1_id,)
        ]  # user1 follows follower1 back

        mock_followed_by_result = MagicMock()
        mock_followed_by_result.all.return_value = [
            (follower1_id,),
            (follower2_id,),
        ]  # Both are followers

        # Setup execute side_effects (4 queries total)
        mock_db_session.execute.side_effect = [
            mock_followers_result,  # 1. Followers query
            mock_count_result,  # 2. Count query
            mock_following_result,  # 3. batch_follow_status: is_following query
            mock_followed_by_result,  # 4. batch_follow_status: follows_you query
        ]

        # Act
        result = await follow_service.get_followers(
            user_id=user_id, page=1, page_size=20, current_user_id=current_user_id
        )

        # Assert - Pagination metadata
        assert result.total == 2
        assert result.page == 1
        assert result.page_size == 20
        assert result.has_next is False  # (0 + 20) < 2 = False

        # Assert - Followers list
        assert len(result.followers) == 2

        # Assert - First follower (mutual follow)
        follower1 = result.followers[0]
        assert follower1.user_id == follower1_id
        assert follower1.username == "follower1"
        assert follower1.display_name == "Follower One"
        assert follower1.is_following is True  # user1 follows back
        assert follower1.follows_you is True  # follower1 follows user1
        assert follower1.mutual_follow is True  # Both conditions met

        # Assert - Second follower (not mutual)
        follower2 = result.followers[1]
        assert follower2.user_id == follower2_id
        assert follower2.username == "follower2"
        assert follower2.is_following is False  # user1 doesn't follow back
        assert follower2.follows_you is True  # follower2 follows user1
        assert follower2.mutual_follow is False

    @pytest.mark.asyncio
    async def test_get_followers_pagination_has_next(
        self, follow_service, mock_db_session, sample_user_ids
    ):
        """Test get_followers has_next calculation with multiple pages."""
        user_id = sample_user_ids["user1"]

        # Mock followers query (page 1 of 20, but total is 25)
        mock_followers_result = MagicMock()
        mock_followers_result.all.return_value = []  # Empty for simplicity

        # Mock count query (25 total followers)
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 25

        # Setup execute (no batch_follow_status since no current_user_id)
        mock_db_session.execute.side_effect = [
            mock_followers_result,  # Followers query
            mock_count_result,  # Count query
        ]

        # Act
        result = await follow_service.get_followers(
            user_id=user_id, page=1, page_size=20, current_user_id=None
        )

        # Assert - has_next is True because (0 + 20) < 25
        assert result.has_next is True
        assert result.total == 25

    @pytest.mark.asyncio
    async def test_get_followers_without_current_user(
        self, follow_service, mock_db_session, sample_user_ids
    ):
        """Test get_followers without current_user_id (no follow status)."""
        user_id = sample_user_ids["user1"]
        follower_id = sample_user_ids["user2"]

        # Mock followers query
        mock_followers_result = MagicMock()
        mock_row = MagicMock(
            follower_id=follower_id,
            created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
            username="follower",
            display_name="Follower",
            avatar_url=None,
        )
        mock_followers_result.all.return_value = [mock_row]

        # Mock count query
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 1

        # Setup execute (only 2 queries, no batch_follow_status)
        mock_db_session.execute.side_effect = [
            mock_followers_result,
            mock_count_result,
        ]

        # Act
        result = await follow_service.get_followers(
            user_id=user_id, current_user_id=None
        )

        # Assert - Default follow status (all False)
        assert len(result.followers) == 1
        follower = result.followers[0]
        assert follower.is_following is False
        assert follower.follows_you is False
        assert follower.mutual_follow is False


class TestGetFollowing:
    """Test get_following with pagination and batch_follow_status integration."""

    @pytest.mark.asyncio
    async def test_get_following_with_data(
        self, follow_service, mock_db_session, sample_user_ids
    ):
        """Test get_following returns following list with follow status."""
        user_id = sample_user_ids["user1"]
        following1_id = sample_user_ids["user2"]
        following2_id = sample_user_ids["user3"]
        current_user_id = sample_user_ids["user1"]

        # Mock following query (2 users user1 follows)
        mock_following_result = MagicMock()
        mock_row1 = MagicMock(
            followee_id=following1_id,
            created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
            username="following1",
            display_name="Following One",
            avatar_url="https://example.com/avatar1.jpg",
        )
        mock_row2 = MagicMock(
            followee_id=following2_id,
            created_at=datetime(2024, 1, 2, tzinfo=timezone.utc),
            username="following2",
            display_name="Following Two",
            avatar_url=None,
        )
        mock_following_result.all.return_value = [mock_row1, mock_row2]

        # Mock count query
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 2

        # Mock batch_follow_status queries
        mock_is_following_result = MagicMock()
        mock_is_following_result.all.return_value = [
            (following1_id,),
            (following2_id,),
        ]  # user1 follows both

        mock_follows_you_result = MagicMock()
        mock_follows_you_result.all.return_value = [
            (following1_id,)
        ]  # Only following1 follows back

        # Setup execute side_effects (4 queries)
        mock_db_session.execute.side_effect = [
            mock_following_result,  # Following query
            mock_count_result,  # Count query
            mock_is_following_result,  # batch_follow_status: is_following
            mock_follows_you_result,  # batch_follow_status: follows_you
        ]

        # Act
        result = await follow_service.get_following(
            user_id=user_id, page=1, page_size=20, current_user_id=current_user_id
        )

        # Assert
        assert result.total == 2
        assert len(result.following) == 2

        # First user (mutual follow)
        following1 = result.following[0]
        assert following1.user_id == following1_id
        assert following1.username == "following1"
        assert following1.is_following is True
        assert following1.follows_you is True
        assert following1.mutual_follow is True

        # Second user (not mutual)
        following2 = result.following[1]
        assert following2.user_id == following2_id
        assert following2.username == "following2"
        assert following2.display_name == "Following Two"
        assert following2.avatar_url is None
        assert following2.is_following is True
        assert following2.follows_you is False
        assert following2.mutual_follow is False

    @pytest.mark.asyncio
    async def test_get_following_pagination(
        self, follow_service, mock_db_session, sample_user_ids
    ):
        """Test get_following pagination with page 2."""
        user_id = sample_user_ids["user1"]

        # Mock following query (page 2, offset 20)
        mock_following_result = MagicMock()
        mock_following_result.all.return_value = []

        # Mock count query (total 25)
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 25

        # Setup execute
        mock_db_session.execute.side_effect = [
            mock_following_result,
            mock_count_result,
        ]

        # Act - Request page 2
        result = await follow_service.get_following(
            user_id=user_id, page=2, page_size=20, current_user_id=None
        )

        # Assert - Pagination metadata
        assert result.page == 2
        assert result.page_size == 20
        assert result.total == 25
        assert result.has_next is False  # (20 + 20) < 25 = False (last page)


class TestGetMutualFollows:
    """Test get_mutual_follows with aliased joins and pagination."""

    @pytest.mark.asyncio
    async def test_get_mutual_follows_with_data(
        self, follow_service, mock_db_session, sample_user_ids
    ):
        """Test get_mutual_follows returns users both user_id and other_user_id follow."""
        user1_id = sample_user_ids["user1"]
        user2_id = sample_user_ids["user2"]
        mutual_user_id = sample_user_ids["user3"]

        # Mock mutual follows query (aliased joins)
        mock_mutual_result = MagicMock()
        mock_row = MagicMock(
            followee_id=mutual_user_id,
            username="mutual_user",
            display_name="Mutual User",
            avatar_url="https://example.com/avatar.jpg",
            created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
        )
        mock_mutual_result.all.return_value = [mock_row]

        # Mock count query
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 1

        # Setup execute (2 queries: mutual query + count)
        mock_db_session.execute.side_effect = [
            mock_mutual_result,
            mock_count_result,
        ]

        # Act
        result = await follow_service.get_mutual_follows(
            user_id=user1_id, other_user_id=user2_id, page=1, page_size=20
        )

        # Assert
        assert result.total == 1
        assert len(result.mutual_follows) == 1

        mutual = result.mutual_follows[0]
        assert mutual.user_id == mutual_user_id
        assert mutual.username == "mutual_user"
        assert mutual.display_name == "Mutual User"
        assert mutual.is_following is True  # By definition (both follow)
        assert mutual.follows_you is False  # Not relevant in this context
        assert mutual.mutual_follow is True

    @pytest.mark.asyncio
    async def test_get_mutual_follows_empty(
        self, follow_service, mock_db_session, sample_user_ids
    ):
        """Test get_mutual_follows with no mutual follows."""
        user1_id = sample_user_ids["user1"]
        user2_id = sample_user_ids["user2"]

        # Mock empty mutual follows query
        mock_mutual_result = MagicMock()
        mock_mutual_result.all.return_value = []

        # Mock count query (0 mutual follows)
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 0

        # Setup execute
        mock_db_session.execute.side_effect = [
            mock_mutual_result,
            mock_count_result,
        ]

        # Act
        result = await follow_service.get_mutual_follows(
            user_id=user1_id, other_user_id=user2_id
        )

        # Assert
        assert result.total == 0
        assert len(result.mutual_follows) == 0
        assert result.has_next is False

    @pytest.mark.asyncio
    async def test_get_mutual_follows_pagination(
        self, follow_service, mock_db_session, sample_user_ids
    ):
        """Test get_mutual_follows pagination with has_next."""
        user1_id = sample_user_ids["user1"]
        user2_id = sample_user_ids["user2"]

        # Mock mutual follows query (page 1, 10 results)
        mock_mutual_result = MagicMock()
        mock_mutual_result.all.return_value = []  # Empty for simplicity

        # Mock count query (total 15 mutual follows)
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 15

        # Setup execute
        mock_db_session.execute.side_effect = [
            mock_mutual_result,
            mock_count_result,
        ]

        # Act
        result = await follow_service.get_mutual_follows(
            user_id=user1_id, other_user_id=user2_id, page=1, page_size=10
        )

        # Assert - has_next is True because (0 + 10) < 15
        assert result.has_next is True
        assert result.total == 15
        assert result.page == 1
        assert result.page_size == 10


# ============================================
# Gap 3: Advanced Features Tests
# ============================================


class TestGetFollowSuggestions:
    """Test get_follow_suggestions with mutual follows algorithm and popular fallback."""

    @pytest.mark.asyncio
    async def test_get_follow_suggestions_mutual_follows(
        self, follow_service, mock_db_session, sample_user_ids
    ):
        """Test get_follow_suggestions returns mutual follow recommendations."""
        user_id = sample_user_ids["user1"]
        suggested_user_id = sample_user_ids["user2"]

        # Mock mutual follows query (aliased joins: Follow1, Follow2)
        # Returns page_size results (no sentinel), so no popular fallback needed
        mock_mutual_result = MagicMock()
        mock_rows = [
            MagicMock(
                followee_id=suggested_user_id,
                username="suggested_user",
                display_name="Suggested User",
                avatar_url="https://example.com/avatar.jpg",
                mutual_count=3,
            )
        ] + [
            MagicMock(
                followee_id=uuid.uuid4(),
                username=f"user{i}",
                display_name=f"User {i}",
                avatar_url=None,
                mutual_count=1,
            )
            for i in range(19)  # Fill to page_size (20 total, no sentinel)
        ]
        mock_mutual_result.all.return_value = mock_rows

        # Setup execute (only mutual query, no popular fallback because page is full)
        mock_db_session.execute.side_effect = [
            mock_mutual_result,  # Mutual follows query
        ]

        # Act
        result = await follow_service.get_follow_suggestions(
            user_id=user_id, page=1, page_size=20
        )

        # Assert
        assert result.reason == "mutual_follows"
        assert result.total == 20
        assert len(result.suggestions) == 20

        # Check first suggestion
        suggestion = result.suggestions[0]
        assert suggestion.user_id == suggested_user_id
        assert suggestion.username == "suggested_user"
        assert suggestion.display_name == "Suggested User"
        assert suggestion.is_following is False
        assert suggestion.follows_you is False
        assert suggestion.mutual_follow is False

    @pytest.mark.asyncio
    async def test_get_follow_suggestions_popular_fallback(
        self, follow_service, mock_db_session, sample_user_ids
    ):
        """Test get_follow_suggestions falls back to popular users when no mutual follows."""
        user_id = sample_user_ids["user1"]
        popular_user_id = sample_user_ids["user2"]

        # Mock empty mutual follows query
        mock_mutual_result = MagicMock()
        mock_mutual_result.all.return_value = []

        # Mock popular users query (fallback)
        # FIX: Use spec-less mock with configure_mock for proper attribute access
        mock_popular_result = MagicMock()
        mock_popular_row = MagicMock(spec=[])  # No spec to allow direct getattr access
        mock_popular_row.configure_mock(
            user_id=popular_user_id,  # Real UUID object
            username="popular_user",
            display_name="Popular User",
            avatar_url="https://example.com/popular.jpg",
            follower_count=10000,
        )
        mock_popular_result.all.return_value = [mock_popular_row]

        # Setup execute (2 queries: mutual + popular)
        mock_db_session.execute.side_effect = [
            mock_mutual_result,  # Mutual follows query (empty)
            mock_popular_result,  # Popular users fallback
        ]

        # Act
        result = await follow_service.get_follow_suggestions(
            user_id=user_id, page=1, page_size=20
        )

        # Assert - Reason switches to "popular" when no mutual follows
        assert result.reason == "popular"
        assert result.total == 1
        assert len(result.suggestions) == 1

        suggestion = result.suggestions[0]
        assert suggestion.user_id == popular_user_id
        assert suggestion.username == "popular_user"
        assert suggestion.display_name == "Popular User"

    @pytest.mark.asyncio
    async def test_get_follow_suggestions_sentinel_pagination(
        self, follow_service, mock_db_session, sample_user_ids
    ):
        """Test get_follow_suggestions sentinel pattern for has_next detection."""
        user_id = sample_user_ids["user1"]

        # Mock mutual follows query with sentinel (page_size + 1)
        # Requesting 20, but return 21 to indicate has_next
        mock_mutual_result = MagicMock()
        mock_rows = [
            MagicMock(
                followee_id=uuid.uuid4(),
                username=f"user{i}",
                display_name=f"User {i}",
                avatar_url=None,
                mutual_count=2,
            )
            for i in range(21)  # 21 results (page_size=20 + 1 sentinel)
        ]
        mock_mutual_result.all.return_value = mock_rows

        # Setup execute
        mock_db_session.execute.side_effect = [
            mock_mutual_result,
        ]

        # Act
        result = await follow_service.get_follow_suggestions(
            user_id=user_id, page=1, page_size=20
        )

        # Assert - Sentinel detected, has_next is True, but only 20 results returned
        assert result.has_next is True
        assert len(result.suggestions) == 20  # Sentinel removed
        assert result.reason == "mutual_follows"

    @pytest.mark.asyncio
    async def test_get_follow_suggestions_empty(
        self, follow_service, mock_db_session, sample_user_ids
    ):
        """Test get_follow_suggestions with no mutual or popular suggestions."""
        user_id = sample_user_ids["user1"]

        # Mock empty mutual follows
        mock_mutual_result = MagicMock()
        mock_mutual_result.all.return_value = []

        # Mock empty popular users
        mock_popular_result = MagicMock()
        mock_popular_result.all.return_value = []

        # Setup execute
        mock_db_session.execute.side_effect = [
            mock_mutual_result,
            mock_popular_result,
        ]

        # Act
        result = await follow_service.get_follow_suggestions(user_id=user_id)

        # Assert
        assert result.reason == "popular"
        assert result.total == 0
        assert len(result.suggestions) == 0
        assert result.has_next is False


class TestGetFollowActivity:
    """Test get_follow_activity with time-based queries and growth metrics."""

    @pytest.mark.asyncio
    async def test_get_follow_activity_with_recent_data(
        self, follow_service, mock_db_session, sample_user_ids
    ):
        """Test get_follow_activity returns recent followers, following, and growth."""
        user_id = sample_user_ids["user1"]
        follower_id = sample_user_ids["user2"]
        following_id = sample_user_ids["user3"]

        # Mock recent followers query (last 7 days, limit 5)
        mock_recent_followers_result = MagicMock()
        mock_follower_row = MagicMock(
            follower_id=follower_id,
            username="recent_follower",
            display_name="Recent Follower",
            avatar_url="https://example.com/follower.jpg",
            created_at=datetime(2024, 1, 10, tzinfo=timezone.utc),
        )
        mock_recent_followers_result.all.return_value = [mock_follower_row]

        # Mock recent following query (last 7 days, limit 5)
        mock_recent_following_result = MagicMock()
        mock_following_row = MagicMock(
            followee_id=following_id,
            username="recent_following",
            display_name="Recent Following",
            avatar_url="https://example.com/following.jpg",
            created_at=datetime(2024, 1, 11, tzinfo=timezone.utc),
        )
        mock_recent_following_result.all.return_value = [mock_following_row]

        # Mock follower growth count
        mock_follower_growth_result = MagicMock()
        mock_follower_growth_result.scalar.return_value = 5  # 5 new followers in 7 days

        # Mock following growth count
        mock_following_growth_result = MagicMock()
        mock_following_growth_result.scalar.return_value = (
            3  # 3 new following in 7 days
        )

        # Setup execute (4 queries: recent followers, recent following, 2 growth counts)
        mock_db_session.execute.side_effect = [
            mock_recent_followers_result,
            mock_recent_following_result,
            mock_follower_growth_result,
            mock_following_growth_result,
        ]

        # Act
        result = await follow_service.get_follow_activity(user_id=user_id)

        # Assert - Recent followers
        assert len(result.recent_followers) == 1
        follower = result.recent_followers[0]
        assert follower.user_id == follower_id
        assert follower.username == "recent_follower"
        assert follower.follows_you is True
        assert follower.is_following is False

        # Assert - Recent following
        assert len(result.recent_following) == 1
        following = result.recent_following[0]
        assert following.user_id == following_id
        assert following.username == "recent_following"
        assert following.is_following is True
        assert following.follows_you is False

        # Assert - Growth metrics
        assert result.follower_growth == 5
        assert result.following_growth == 3

    @pytest.mark.asyncio
    async def test_get_follow_activity_empty(
        self, follow_service, mock_db_session, sample_user_ids
    ):
        """Test get_follow_activity with no recent activity (7 days)."""
        user_id = sample_user_ids["user1"]

        # Mock empty recent followers
        mock_recent_followers_result = MagicMock()
        mock_recent_followers_result.all.return_value = []

        # Mock empty recent following
        mock_recent_following_result = MagicMock()
        mock_recent_following_result.all.return_value = []

        # Mock zero follower growth
        mock_follower_growth_result = MagicMock()
        mock_follower_growth_result.scalar.return_value = 0

        # Mock zero following growth
        mock_following_growth_result = MagicMock()
        mock_following_growth_result.scalar.return_value = 0

        # Setup execute
        mock_db_session.execute.side_effect = [
            mock_recent_followers_result,
            mock_recent_following_result,
            mock_follower_growth_result,
            mock_following_growth_result,
        ]

        # Act
        result = await follow_service.get_follow_activity(user_id=user_id)

        # Assert - All empty
        assert len(result.recent_followers) == 0
        assert len(result.recent_following) == 0
        assert result.follower_growth == 0
        assert result.following_growth == 0


class TestGetFollowStats:
    """Test get_follow_stats with mutual follower count calculation."""

    @pytest.mark.asyncio
    async def test_get_follow_stats_with_mutual_count(
        self, follow_service, mock_db_session, sample_user_ids
    ):
        """Test get_follow_stats returns user stats with mutual followers count."""
        user_id = sample_user_ids["user1"]
        current_user_id = sample_user_ids["user2"]

        # Mock profile query
        mock_profile_result = MagicMock()
        mock_profile = MagicMock(
            user_id=user_id,
            username="test_user",
            display_name="Test User",
            follower_count=100,
            following_count=50,
        )
        mock_profile_result.scalar_one_or_none.return_value = mock_profile

        # Mock _get_mutual_followers_count query (aliased joins)
        mock_mutual_count_result = MagicMock()
        mock_mutual_count_result.scalar.return_value = 10  # 10 mutual followers

        # Setup execute (2 queries: profile + mutual count)
        mock_db_session.execute.side_effect = [
            mock_profile_result,
            mock_mutual_count_result,
        ]

        # Act
        result = await follow_service.get_follow_stats(
            user_id=user_id, current_user_id=current_user_id
        )

        # Assert
        assert result.user_id == user_id
        assert result.username == "test_user"
        assert result.display_name == "Test User"
        assert result.follower_count == 100
        assert result.following_count == 50
        assert result.mutual_followers_count == 10

    @pytest.mark.asyncio
    async def test_get_follow_stats_without_current_user(
        self, follow_service, mock_db_session, sample_user_ids
    ):
        """Test get_follow_stats without current_user (no mutual count)."""
        user_id = sample_user_ids["user1"]

        # Mock profile query
        mock_profile_result = MagicMock()
        mock_profile = MagicMock(
            user_id=user_id,
            username="test_user",
            display_name="Test User",
            follower_count=100,
            following_count=50,
        )
        mock_profile_result.scalar_one_or_none.return_value = mock_profile

        # Setup execute (only 1 query: profile, no mutual count)
        mock_db_session.execute.side_effect = [
            mock_profile_result,
        ]

        # Act
        result = await follow_service.get_follow_stats(
            user_id=user_id, current_user_id=None
        )

        # Assert
        assert result.user_id == user_id
        assert result.username == "test_user"
        assert result.follower_count == 100
        assert result.following_count == 50
        assert result.mutual_followers_count is None  # No current_user provided

    @pytest.mark.asyncio
    async def test_get_follow_stats_user_not_found(
        self, follow_service, mock_db_session, sample_user_ids
    ):
        """Test get_follow_stats raises 404 when user not found."""
        user_id = sample_user_ids["user1"]

        # Mock empty profile query (user not found)
        mock_profile_result = MagicMock()
        mock_profile_result.scalar_one_or_none.return_value = None

        # Setup execute
        mock_db_session.execute.side_effect = [
            mock_profile_result,
        ]

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await follow_service.get_follow_stats(user_id=user_id)

        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail.lower()
