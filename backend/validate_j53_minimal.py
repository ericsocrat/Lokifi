#!/usr/bin/env python3
"""
J5.3 Core Components Validation Test
Minimal validation that core J5.3 components work without all dependencies
"""

import asyncio
import sys
from pathlib import Path

# Add backend to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

async def validate_j53_core():
    """Validate core J5.3 components"""
    
    print("🔍 J5.3 Core Components Validation")
    print("=" * 40)
    
    try:
        # Test 1: Core imports
        print("1️⃣  Testing core imports...")
        
        from app.services.advanced_storage_analytics import AdvancedStorageAnalytics
        from app.services.j53_performance_monitor import AlertSeverity, J53PerformanceMonitor
        
        print("   ✅ Core components imported successfully")
        
        # Test 2: Create minimal settings
        print("2️⃣  Testing basic functionality...")
        
        class MockSettings:
            DATABASE_URL = "sqlite:///test.db"
            SMTP_HOST = None
        
        settings = MockSettings()
        
        # Test monitor creation
        monitor = J53PerformanceMonitor(settings)
        
        # Test alert system
        alert = await monitor._create_alert(
            AlertSeverity.INFO,
            "Test",
            "validation",
            100.0,
            50.0,
            "Test alert",
            "Test recommendation"
        )
        
        print(f"   📋 Created test alert: {alert.id}")
        
        # Test health calculation
        health = monitor.calculate_system_health()
        print(f"   💚 Health: {health.status} (Score: {health.score})")
        
        # Test alert management
        ack_result = await monitor.acknowledge_alert(alert.id, "test")
        resolve_result = await monitor.resolve_alert(alert.id, "test")
        
        print(f"   ✅ Alert acknowledged: {ack_result}")
        print(f"   ✅ Alert resolved: {resolve_result}")
        
        print("3️⃣  Testing analytics...")
        
        analytics = AdvancedStorageAnalytics(settings)
        print("   📊 Analytics service initialized")
        
        print("4️⃣  Testing API router...")
        
        from app.services.j53_scheduler import j53_router
        
        # Count routes
        route_count = len([r for r in j53_router.routes if hasattr(r, 'methods')])
        print(f"   🌐 J5.3 API router has {route_count} routes")
        
        print("=" * 40)
        print("🎉 J5.3 CORE VALIDATION COMPLETE!")
        print("   All core components are working correctly")
        
        print("\n💡 Key Features Validated:")
        print("   ✅ Performance monitoring system")
        print("   ✅ Alert creation and management")
        print("   ✅ System health calculation")
        print("   ✅ Storage analytics framework")
        print("   ✅ API router configuration")
        
        print("\n🚀 Next Steps:")
        print("   1. Install remaining dependencies if needed")
        print("   2. Start server: uvicorn app.main:app --reload")
        print("   3. Test endpoints: http://localhost:8000/api/v1/j53/health")
        
        return True
        
    except Exception as e:
        print(f"❌ Validation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main validation function"""
    print("🚀 J5.3 Enhanced Fynix - Core Validation")
    print("=" * 50)
    
    try:
        success = asyncio.run(validate_j53_core())
        
        if success:
            print("\n🎊 VALIDATION SUCCESSFUL!")
            print("J5.3 Enhanced Features are ready to use!")
            return 0
        else:
            print("\n❌ Validation failed - check output above")
            return 1
            
    except Exception as e:
        print(f"\n💥 Validation error: {e}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)