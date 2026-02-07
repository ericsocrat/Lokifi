"""Generate test data for performance benchmarks.

Creates sample users, follow relationships, and posts for benchmarking
social features with realistic data volumes.

Usage:
    python benchmarks/generate_test_data.py --users 100 --follows-per-user 20 --posts-per-user 50
"""

import argparse
import asyncio
import random
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import AsyncSessionLocal
from app.models import Follow, Post, User
from app.models.user import User as UserModel  # For typing if needed

SYMBOLS = [
    "AAPL",
    "GOOGL",
    "MSFT",
    "AMZN",
    "TSLA",
    "NVDA",
    "META",
    "BTC-USD",
    "ETH-USD",
]


async def create_users(session: AsyncSession, count: int) -> list[uuid.UUID]:
    """Create test users."""
    print(f"Creating {count} test users...")
    user_ids = []

    for i in range(count):
        user = User(
            id=uuid.uuid4(),
            full_name=f"Benchmark User {i}",
            email=f"bench_{i}@benchmark.test",
            password_hash=secrets.token_hex(32),  # Dummy hash
            is_active=True,
            is_verified=True,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        session.add(user)
        user_ids.append(user.id)

        if (i + 1) % 100 == 0:
            await session.flush()
            print(f"  Created {i + 1}/{count} users")

    await session.commit()
    print(f"✅ Created {count} users")
    return user_ids


async def create_follows(
    session: AsyncSession, user_ids: list[uuid.UUID], follows_per_user: int
) -> int:
    """Create follow relationships."""
    print(f"Creating ~{len(user_ids) * follows_per_user} follow relationships...")
    follows_created = 0

    for i, follower_id in enumerate(user_ids):
        # Skip if not enough users to follow
        if len(user_ids) < follows_per_user:
            continue

        # Create random follows (avoid self-follows)
        potential_followees = [uid for uid in user_ids if uid != follower_id]
        if not potential_followees:
            continue

        followees = random.sample(
            potential_followees, min(len(potential_followees), follows_per_user)
        )

        for followee_id in followees:
            follow = Follow(
                id=uuid.uuid4(),
                follower_id=follower_id,
                followee_id=followee_id,
                created_at=datetime.now(UTC),
            )
            session.add(follow)
            follows_created += 1

        if (i + 1) % 50 == 0:
            await session.flush()
            print(f"  Created follows for {i + 1}/{len(user_ids)} users")

    await session.commit()
    print(f"✅ Created {follows_created} follow relationships")
    return follows_created


async def create_posts(
    session: AsyncSession, user_ids: list[uuid.UUID], posts_per_user: int
) -> int:
    """Create test posts."""
    print(f"Creating ~{len(user_ids) * posts_per_user} posts...")
    posts_created = 0

    for i, user_id in enumerate(user_ids):
        for j in range(posts_per_user):
            content_type = "bullish" if random.random() > 0.5 else "bearish"
            symbol = random.choice(SYMBOLS) if random.random() < 0.3 else None

            post = Post(
                id=uuid.uuid4(),
                user_id=user_id,
                content=f"Benchmark post {j} from user {i}. Market is looking {content_type}! 🚀",
                symbol=symbol,
                created_at=datetime.now(UTC) - timedelta(days=random.randint(0, 30)),
                updated_at=datetime.now(UTC),
            )
            session.add(post)
            posts_created += 1

        if (i + 1) % 50 == 0:
            await session.flush()
            print(f"  Created posts for {i + 1}/{len(user_ids)} users")

    await session.commit()
    print(f"✅ Created {posts_created} posts")
    return posts_created


async def cleanup_benchmark_data(session: AsyncSession):
    """Remove existing benchmark test data."""
    print("Cleaning up existing benchmark data...")

    # Delete users
    # Due to cascading deletes configured in models (ondelete="CASCADE"),
    # deleting users should automatically delete their posts and follows.
    # We select users by email pattern.

    users_result = await session.execute(
        select(User).where(User.email.like("bench_%@benchmark.test"))
    )
    users = users_result.scalars().all()

    if not users:
        print("No existing benchmark data found.")
        return

    print(f"Found {len(users)} benchmark users. Deleting...")
    for user in users:
        await session.delete(user)

    await session.commit()
    print(f"✅ Deleted {len(users)} users and associated data (cascading)")


async def main():
    parser = argparse.ArgumentParser(
        description="Generate test data for performance benchmarks"
    )
    parser.add_argument(
        "--users",
        type=int,
        default=50,
        help="Number of users to create (default: 50)",
    )
    parser.add_argument(
        "--follows-per-user",
        type=int,
        default=10,
        help="Average follows per user (default: 10)",
    )
    parser.add_argument(
        "--posts-per-user",
        type=int,
        default=25,
        help="Posts per user (default: 25)",
    )
    parser.add_argument(
        "--cleanup",
        action="store_true",
        help="Only cleanup existing benchmark data (no generation)",
    )

    args = parser.parse_args()

    async with AsyncSessionLocal() as session:
        # Always cleanup first to avoid duplicates
        await cleanup_benchmark_data(session)

        if args.cleanup:
            print("✅ Cleanup-only mode complete")
            return

        # Generate new test data
        print("\n" + "=" * 60)
        print("BENCHMARK TEST DATA GENERATION")
        print("=" * 60)
        print(
            f"Target: {args.users} users, ~{args.follows_per_user} follows/user, {args.posts_per_user} posts/user"
        )
        print()

        user_ids = await create_users(session, args.users)
        follows_count = await create_follows(session, user_ids, args.follows_per_user)
        posts_count = await create_posts(session, user_ids, args.posts_per_user)

        print("\n" + "=" * 60)
        print("GENERATION COMPLETE")
        print("=" * 60)
        print(f"✅ Users: {len(user_ids)}")
        print(f"✅ Follows: {follows_count}")
        print(f"✅ Posts: {posts_count}")
        print(f"\nAverage follows per user: {follows_count / len(user_ids):.1f}")
        print(f"Average posts per user: {posts_count / len(user_ids):.1f}")
        print("\n💡 Ready to run benchmarks:")
        print(
            "   docker compose run --rm backend python -m pytest benchmarks/test_social_performance.py --benchmark-only"
        )


if __name__ == "__main__":
    asyncio.run(main())
