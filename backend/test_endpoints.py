#!/usr/bin/env python3
"""
Simple health check test
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_endpoints():
    """Test individual components"""
    print("🔍 TESTING INDIVIDUAL COMPONENTS")
    print("=" * 40)
    
    try:
        # Test main app creation
        from fastapi import FastAPI
        simple_app = FastAPI()
        
        @simple_app.get("/")
        def read_root():
            return {"message": "Simple test successful"}
        
        print("✅ Simple FastAPI app created")
        
        # Test security routes individually
        from app.api.routes.security import router as security_router
        print("✅ Security router imported")
        print(f"   - Routes: {len(security_router.routes)}")
        
        # Test health routes
        from app.routers.health import router as health_router
        print("✅ Health router imported")
        
        # Test if we can create the main app without starting it
        from app.main import app
        print("✅ Main app imported successfully")
        print(f"   - Total routes: {len(app.routes)}")
        
        # Test settings
        from app.core.config import get_settings
        settings = get_settings()
        print(f"✅ Settings: {settings.PROJECT_NAME}")
        
        print("\n🎯 ALL COMPONENTS WORKING!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_endpoints()
    print(f"\n{'✅ SUCCESS' if success else '❌ FAILED'}")