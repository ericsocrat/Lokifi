"""phase_3a_follow_table_indexes

Revision ID: phase_3a_002
Revises: phase_3a_001
Create Date: 2026-02-07 14:00:00.000000

Add critical indexes for Follow table to optimize social features:
- follower_id index for "get my followees" queries (feed generation)
- followee_id index for "get user's followers" queries (cache invalidation)
- Composite (follower_id, followee_id) for is_following checks

Expected improvements:
- Feed queries: 10-50x faster (avoid sequential scan on follows table)
- Follow/unfollow: 5-10x faster (indexed lookup instead of full table scan)
- Cache invalidation: 20-100x faster (indexed follower lookups)
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "phase_3a_002"
down_revision: str | Sequence[str] | None = "phase_3a_001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create high-impact indexes for Follow table.

    Performance analysis:
    1. follower_id index:
       - Query: select followee_id where follower_id = X (feed generation)
       - Frequency: Every feed request (~1000s requests/day at scale)
       - Current: O(n) sequential scan
       - With index: O(log n) + O(k) where k = number of follows
       - Expected gain: 10-50x for users with many follows

    2. followee_id index:
       - Query: select follower_id where followee_id = X (cache invalidation)
       - Frequency: Every post create (~100s requests/day at scale)
       - Current: O(n) sequential scan
       - With index: O(log n) + O(k) where k = number of followers
       - Expected gain: 20-100x for popular users

    3. Composite index (follower_id, followee_id):
       - Query: where follower_id = X AND followee_id = Y (is_following checks)
       - Frequency: Every follow/unfollow request (~50s requests/day)
       - Current: O(n) sequential scan or two index lookups
       - With composite: O(log n) single index lookup
       - Expected gain: 5-10x
    """

    # Index 1: follower_id (for feed generation)
    # Covers: "get all users I'm following"
    op.create_index(
        "idx_follows_follower_id",
        "follows",
        ["follower_id"],
        postgresql_using="btree",
        if_not_exists=True,
    )

    # Index 2: followee_id (for follower listings and cache invalidation)
    # Covers: "get all users following me" and "invalidate followers' caches"
    op.create_index(
        "idx_follows_followee_id",
        "follows",
        ["followee_id"],
        postgresql_using="btree",
        if_not_exists=True,
    )

    # Index 3: Composite (follower_id, followee_id) for is_following checks
    # Covers: "does user X follow user Y?" (follow/unfollow validation)
    # Note: PostgreSQL can use this for follower_id-only queries via leftmost prefix
    op.create_index(
        "idx_follows_follower_followee",
        "follows",
        ["follower_id", "followee_id"],
        postgresql_using="btree",
        if_not_exists=True,
    )


def downgrade() -> None:
    """Drop Follow table indexes."""

    op.drop_index("idx_follows_follower_id", table_name="follows", if_exists=True)
    op.drop_index("idx_follows_followee_id", table_name="follows", if_exists=True)
    op.drop_index("idx_follows_follower_followee", table_name="follows", if_exists=True)
