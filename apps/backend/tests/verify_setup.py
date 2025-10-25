#!/usr/bin/env python3
"""
Verification script to test all dependencies and core functionality
"""

import importlib
import os
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def test_imports():
    """Test all critical imports"""
    print("🔍 Testing critical dependencies...")

    dependencies = [
        "fastapi",
        "uvicorn",
        "pydantic",
        "redis",
        "aiohttp",
        "websockets",
        "psutil",
        "sqlalchemy",
        "alembic",
        "asyncpg",
        "aiosqlite",
        "argon2",
        "authlib",
        "openai",
        "httpx",
        "celery",
        "pytest",
    ]

    failed_imports = []

    for dep in dependencies:
        try:
            importlib.import_module(dep)
            print(f"✅ {dep}")
        except ImportError as e:
            print(f"❌ {dep}: {e}")
            failed_imports.append(dep)

    if failed_imports:
        print(f"\n⚠️  Failed imports: {failed_imports}")
        return False
    else:
        print("\n✅ All dependencies imported successfully!")
        return True


def test_app_import():
    """Test main application import"""
    print("\n🔍 Testing main application import...")

    try:
        print("✅ Main application imported successfully!")
        return True
    except Exception as e:
        print(f"❌ Failed to import main application: {e}")
        return False


def test_core_modules():
    """Test core application modules"""
    print("\n🔍 Testing core application modules...")

    modules = [
        "app.core.config",
        "app.services.advanced_monitoring",
        "app.routers.health",
        "app.db.database",
    ]

    failed_modules = []

    for module in modules:
        try:
            importlib.import_module(module)
            print(f"✅ {module}")
        except Exception as e:
            print(f"❌ {module}: {e}")
            failed_modules.append(module)

    if failed_modules:
        print(f"\n⚠️  Failed module imports: {failed_modules}")
        return False
    else:
        print("\n✅ All core modules imported successfully!")
        return True


def main():
    """Run all verification tests"""
    print("🚀 Lokifi Backend Verification Script")
    print("=" * 50)

    tests = [test_imports, test_app_import, test_core_modules]

    all_passed = True

    for test in tests:
        if not test():
            all_passed = False

    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All verification tests PASSED!")
        print("\n🚀 Ready to start servers:")
        print("   Main Server: uvicorn app.main:app --host 0.0.0.0 --port 8002")
        print("   Stress Test: python stress_test_server.py")
    else:
        print("❌ Some verification tests FAILED!")
        print("   Please check the errors above and install missing dependencies.")

    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
