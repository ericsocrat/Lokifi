"""
Quick test script to verify registration functionality.
"""

import asyncio
import sys

from sqlalchemy import text

# Add current directory to path
sys.path.insert(0, ".")

from app.core.config import settings
from app.core.database import db_manager
from app.schemas.auth import UserRegisterRequest
from app.services.auth_service import AuthService


async def test_connection():
    """Test database connection."""
    print("🔍 Testing Database Connection...")
    print(f"DATABASE_URL: {settings.DATABASE_URL}")

    try:
        await db_manager.initialize()
        print("✅ Database manager initialized")

        # Get session correctly from async generator
        session_gen = db_manager.get_session()
        session = await session_gen.__anext__()

        try:
            result = await session.execute(text("SELECT version()"))
            version = result.scalar()
            print("✅ Database connection successful")
            print(f"   PostgreSQL version: {version[:50]}...")

            # Check if tables exist
            result = await session.execute(
                text("SELECT tablename FROM pg_tables WHERE schemaname='public'")
            )
            tables = [row[0] for row in result]
            print(f"✅ Found {len(tables)} tables")
            if "users" in tables:
                print("   ✓ users table exists")
            if "profiles" in tables:
                print("   ✓ profiles table exists")
            if "notification_preferences" in tables:
                print("   ✓ notification_preferences table exists")
        finally:
            await session.close()

        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


async def test_registration():
    """Test user registration."""
    print("\n📝 Testing User Registration...")

    # Create test user data
    import time

    ts = int(time.time())
    user_data = UserRegisterRequest(
        email=f"test{ts}@example.com",
        password="TestPassword123!",
        full_name="Test User",
    )

    print(f"   Email: {user_data.email}")

    try:
        session_gen = db_manager.get_session()
        session = await session_gen.__anext__()

        try:
            auth_service = AuthService(session)
            result = await auth_service.register_user(user_data)

            print("✅ Registration successful!")
            print(f"   User ID: {result['user'].id}")
            print(f"   Email: {result['user'].email}")
            print(f"   Has token: {bool(result['tokens'].access_token)}")
        finally:
            await session.close()

        return True
    except Exception as e:
        print(f"❌ Registration failed: {e}")
        import traceback

        traceback.print_exc()
        return False


async def main():
    """Main test function."""
    print("=" * 50)
    print("🧪 Lokifi Registration System Test")
    print("=" * 50)
    print()

    # Test connection first
    if not await test_connection():
        print("\n❌ Aborting: Cannot connect to database")
        return

    # Test registration
    if await test_registration():
        print("\n" + "=" * 50)
        print("✅ All tests passed! System working 100%")
        print("=" * 50)
    else:
        print("\n" + "=" * 50)
        print("❌ Registration test failed")
        print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
