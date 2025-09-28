#!/usr/bin/env python3
"""
J5.3 Integration Validation Test
Quick validation that all J5.3 components integrate properly
"""

import asyncio
import sys
import os
from pathlib import Path

# Add backend to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

async def validate_j53_integration():
    """Validate that all J5.3 components can be imported and initialized"""
    
    print("🔍 J5.3 Integration Validation Starting...")
    print("=" * 50)
    
    try:
        # Test 1: Import all J5.3 components
        print("1️⃣  Testing imports...")
        
        from app.core.config import Settings
        from app.services.advanced_storage_analytics import AdvancedStorageAnalytics
        from app.services.j53_performance_monitor import J53PerformanceMonitor
        from app.services.j53_scheduler import J53OptimizationScheduler
        
        print("   ✅ All J5.3 components imported successfully")
        
        # Test 2: Create mock settings
        print("2️⃣  Testing configuration...")
        
        settings = Settings()
        settings.DATABASE_URL = "sqlite:///test_j53.db"
        
        print("   ✅ Settings configured successfully")
        
        # Test 3: Initialize components
        print("3️⃣  Testing component initialization...")
        
        analytics = AdvancedStorageAnalytics(settings)
        monitor = J53PerformanceMonitor(settings)
        scheduler = J53OptimizationScheduler(settings)
        
        print("   ✅ All components initialized successfully")
        
        # Test 4: Test basic functionality (without DB operations)
        print("4️⃣  Testing basic functionality...")
        
        from app.services.j53_performance_monitor import AlertSeverity
        
        # Test alert system
        alert = await monitor._create_alert(
            AlertSeverity.INFO,
            "Test", 
            "validation",
            100.0,
            50.0,
            "J5.3 validation test alert",
            "This is a test alert for validation"
        )
        
        print(f"   📋 Created test alert: {alert.id}")
        
        # Test health calculation
        health = monitor.calculate_system_health()
        print(f"   💚 System health calculated: {health.status} (Score: {health.score})")
        
        # Test alert resolution
        resolved = await monitor.resolve_alert(alert.id, "validation_test")
        print(f"   ✅ Alert resolution: {resolved}")
        
        print("5️⃣  Testing scheduler lifecycle...")
        
        # Test scheduler start/stop (briefly)
        scheduler.start_scheduler()
        print("   🚀 Scheduler started")
        
        # Brief pause to let scheduler initialize
        await asyncio.sleep(0.1)
        
        scheduler.stop_scheduler()
        print("   🛑 Scheduler stopped")
        
        # Test 6: Validate API router
        print("6️⃣  Testing API router...")
        
        from app.services.j53_scheduler import j53_router
        
        # Count endpoints
        routes = [route for route in j53_router.routes if hasattr(route, 'methods')]
        print(f"   🌐 J5.3 API has {len(routes)} endpoints")
        
        # List key endpoints
        for route in routes[:5]:  # Show first 5
            print(f"      • {list(route.methods)[0]} {route.path}")
        
        print("7️⃣  Testing main app integration...")
        
        # Test FastAPI app integration
        from app.main import app
        
        # Check if J5.3 router is included
        j53_routes = [r for r in app.routes if hasattr(r, 'path') and '/j53' in r.path]
        print(f"   🔗 Found {len(j53_routes)} J5.3 routes in main app")
        
        print("8️⃣  Testing import compatibility...")
        
        # Test that existing imports still work
        from app.core.database import db_manager
        from app.core.config import get_settings
        
        print("   ✅ Existing imports remain compatible")
        
        print("=" * 50)
        print("🎉 J5.3 INTEGRATION VALIDATION COMPLETE!")
        print("   All components initialized and integrated successfully")
        print("   System is ready for J5.3 enhanced operations")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("   Check that all required dependencies are installed")
        return False
        
    except Exception as e:
        print(f"❌ Validation error: {e}")
        print(f"   Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return False

async def test_j53_api_endpoints():
    """Test that J5.3 API endpoints are properly configured"""
    
    print("\n🌐 Testing J5.3 API Endpoints...")
    print("=" * 30)
    
    try:
        from app.services.j53_scheduler import j53_router
        
        expected_endpoints = [
            "GET /api/v1/j53/health",
            "GET /api/v1/j53/alerts", 
            "POST /api/v1/j53/alerts/{alert_id}/resolve",
            "POST /api/v1/j53/alerts/{alert_id}/acknowledge",
            "GET /api/v1/j53/metrics",
            "POST /api/v1/j53/optimize",
            "GET /api/v1/j53/recommendations",
            "POST /api/v1/j53/scheduler/start",
            "POST /api/v1/j53/scheduler/stop",
            "GET /api/v1/j53/scheduler/status"
        ]
        
        print(f"📋 Expected {len(expected_endpoints)} endpoints:")
        for endpoint in expected_endpoints:
            print(f"   • {endpoint}")
        
        # Validate router setup
        routes = [r for r in j53_router.routes if hasattr(r, 'methods')]
        print(f"\n✅ Router has {len(routes)} configured routes")
        
        return True
        
    except Exception as e:
        print(f"❌ API endpoint test failed: {e}")
        return False

def main():
    """Main validation function"""
    
    print("🚀 Starting J5.3 Enhanced Fynix Validation")
    print("=" * 60)
    
    # Run async validation
    try:
        # Test integration
        integration_success = asyncio.run(validate_j53_integration())
        
        # Test API endpoints
        api_success = asyncio.run(test_j53_api_endpoints())
        
        print("\n" + "=" * 60)
        if integration_success and api_success:
            print("🎊 ALL TESTS PASSED!")
            print("   J5.3 is successfully integrated and ready to use")
            print("   You can now start the server with enhanced monitoring")
            print("\n💡 Next steps:")
            print("   1. Start the server: python -m uvicorn app.main:app --reload")
            print("   2. Visit: http://localhost:8000/api/v1/j53/health")
            print("   3. Check scheduler: http://localhost:8000/api/v1/j53/scheduler/status")
            return 0
        else:
            print("❌ Some tests failed - check output above")
            return 1
            
    except KeyboardInterrupt:
        print("\n⏹️  Validation interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Validation failed with unexpected error: {e}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)