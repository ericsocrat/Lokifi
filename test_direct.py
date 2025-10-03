"""
Test auth service directly to see errors
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, 'C:\\Users\\USER\\Desktop\\lokifi\\backend')

async def test_register():
    from app.db.database import AsyncSessionLocal
    from app.services.auth_service import AuthService
    from app.schemas.auth import UserRegisterRequest
    
    async with AsyncSessionLocal() as db:
        try:
            auth_service = AuthService(db)
            user_data = UserRegisterRequest(
                email="hello@lokifi.com",
                password="?Apollwng113?",
                full_name="Test User"
            )
            
            print("🔐 Testing registration...")
            result = await auth_service.register_user(user_data)
            print("✅ Registration successful!")
            print(f"User: {result['user'].email}")
            
        except Exception as e:
            print(f"❌ Registration failed: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_register())
