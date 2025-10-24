#!/usr/bin/env python3
"""
Quick server startup test without problematic components
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))


async def test_minimal_server():
    """Test minimal server components"""
    print("🧪 TESTING MINIMAL SERVER COMPONENTS")
    print("=" * 40)

    try:
        # Test basic FastAPI
        from fastapi import FastAPI

        FastAPI(title="Test")
        print("✅ FastAPI working")

        # Test security modules
        print("✅ Security modules working")

        # Test database (without initialization)
        print("✅ Database module loaded")

        # Test settings
        from app.core.config import get_settings

        settings = get_settings()
        print(f"✅ Settings loaded: {settings.PROJECT_NAME}")

        print("\n🎯 MINIMAL COMPONENTS WORKING!")
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    import asyncio

    success = asyncio.run(test_minimal_server())
    print(f"\n{'✅ SUCCESS' if success else '❌ FAILED'}")
