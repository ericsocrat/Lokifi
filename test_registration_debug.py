import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv(backend_path / ".env")

from app.db.database import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import UserRegisterRequest

async def test_registration():
    """Test user registration with detailed error output."""
    print("🧪 Testing User Registration with PostgreSQL\n")
    
    # Create registration data
    user_data = UserRegisterRequest(
        email="finaltest@lokifi.com",
        password="?Apollwng113?",
        full_name="Final Test User"
    )
    
    print(f"📝 Registration data:")
    print(f"   Email: {user_data.email}")
    print(f"   Full Name: {user_data.full_name}")
    print(f"   Username: {user_data.username}")
    print()
    
    # Get database session
    async for db in get_db():
        try:
            print("🔐 Creating auth service...")
            auth_service = AuthService(db)
            
            print("📤 Calling register_user method...")
            result = await auth_service.register_user(user_data)
            
            print("\n✅ Registration successful!")
            print(f"   User ID: {result.get('id')}")
            print(f"   Email: {result.get('email')}")
            print(f"   Full Name: {result.get('full_name')}")
            
        except Exception as e:
            print(f"\n❌ Registration failed with error:")
            print(f"   Type: {type(e).__name__}")
            print(f"   Message: {str(e)}")
            import traceback
            print(f"\n📋 Full traceback:")
            traceback.print_exc()
        
        break

if __name__ == "__main__":
    asyncio.run(test_registration())
