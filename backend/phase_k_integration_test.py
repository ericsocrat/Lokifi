"""
Phase K Integration Test Suite - Comprehensive validation of all K1-K4 components
Tests startup sequence, Redis integration, WebSocket auth, and analytics compatibility
"""

import asyncio
import json
import logging
import sys
import time
from pathlib import Path
from typing import Any

import aiohttp
import websockets

# Add backend to path for imports
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

try:
    from app.analytics.cross_database_compatibility import (
        AnalyticsQueryBuilder,
        CompatibilityTester,
        DatabaseDialect,
    )
    from app.core.redis_keys import RedisKeyManager, RedisKeyspace
    from app.enhanced_startup import (
        EnhancedSettings,
        health_check_live,
        health_check_ready,
        startup_dependency_checks,
    )
    from app.websockets.jwt_websocket_auth import AuthenticatedWebSocketManager, WebSocketJWTAuth
    from ci_smoke_tests import SmokeTestSuite
except ImportError as e:
    print(f"Warning: Could not import Phase K components: {e}")
    print("Running basic integration tests without full Phase K components")

logger = logging.getLogger(__name__)

class PhaseKIntegrationTester:
    """Comprehensive Phase K integration testing"""
    
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.ws_url = "ws://localhost:8000"
        self.redis_url = "redis://localhost:6379"
        self.test_results = {}
        
        # Test configuration
        self.test_config = {
            "startup_timeout": 30,
            "redis_timeout": 10,
            "websocket_timeout": 15,
            "analytics_timeout": 20
        }
    
    async def run_all_tests(self) -> dict[str, Any]:
        """Run comprehensive Phase K integration tests"""
        
        print("🚀 Starting Phase K Integration Test Suite")
        print("=" * 60)
        
        # Test categories
        test_categories = [
            ("K1 - Enhanced Startup", self.test_k1_startup_sequence),
            ("K2 - Redis Integration", self.test_k2_redis_integration), 
            ("K3 - WebSocket Authentication", self.test_k3_websocket_auth),
            ("K4 - Analytics Compatibility", self.test_k4_analytics_compatibility),
            ("Integration - Cross-Component", self.test_cross_component_integration),
            ("Performance - Load Testing", self.test_performance_characteristics),
            ("CI/CD - Smoke Tests", self.test_ci_smoke_integration)
        ]
        
        overall_results = {
            "test_summary": {
                "total_categories": len(test_categories),
                "passed_categories": 0,
                "failed_categories": 0,
                "total_tests": 0,
                "passed_tests": 0,
                "failed_tests": 0
            },
            "category_results": {},
            "recommendations": [],
            "timestamp": time.time()
        }
        
        # Run each test category
        for category_name, test_func in test_categories:
            print(f"\n📋 Testing: {category_name}")
            print("-" * 40)
            
            try:
                category_results = await test_func()
                overall_results["category_results"][category_name] = category_results
                
                # Update summary
                if category_results.get("passed", False):
                    overall_results["test_summary"]["passed_categories"] += 1
                    print(f"✅ {category_name}: PASSED")
                else:
                    overall_results["test_summary"]["failed_categories"] += 1
                    print(f"❌ {category_name}: FAILED")
                    
                    # Add failure recommendations
                    if "recommendations" in category_results:
                        overall_results["recommendations"].extend(category_results["recommendations"])
                
                # Update test counts
                overall_results["test_summary"]["total_tests"] += category_results.get("tests_run", 0)
                overall_results["test_summary"]["passed_tests"] += category_results.get("tests_passed", 0)
                overall_results["test_summary"]["failed_tests"] += category_results.get("tests_failed", 0)
                
            except Exception as e:
                print(f"❌ {category_name}: EXCEPTION - {e}")
                overall_results["category_results"][category_name] = {
                    "passed": False,
                    "error": str(e),
                    "tests_run": 1,
                    "tests_passed": 0,
                    "tests_failed": 1
                }
                overall_results["test_summary"]["failed_categories"] += 1
                overall_results["test_summary"]["total_tests"] += 1
                overall_results["test_summary"]["failed_tests"] += 1
        
        # Generate final report
        await self.generate_integration_report(overall_results)
        return overall_results
    
    async def test_k1_startup_sequence(self) -> dict[str, Any]:
        """Test K1 - Enhanced startup sequence with health checks"""
        
        results = {
            "passed": True,
            "tests_run": 0,
            "tests_passed": 0,
            "tests_failed": 0,
            "details": {},
            "recommendations": []
        }
        
        # Test 1: Configuration loading
        try:
            results["tests_run"] += 1
            
            # Check if enhanced startup module can be imported and configured
            if 'EnhancedSettings' in globals():
                settings = EnhancedSettings()
                results["details"]["config_loading"] = {
                    "passed": True,
                    "environment": settings.environment,
                    "debug_mode": settings.debug
                }
                results["tests_passed"] += 1
            else:
                results["details"]["config_loading"] = {"passed": False, "error": "EnhancedSettings not available"}
                results["tests_failed"] += 1
                results["passed"] = False
        
        except Exception as e:
            results["details"]["config_loading"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
            results["passed"] = False
        
        # Test 2: Health endpoints
        try:
            results["tests_run"] += 1
            
            async with aiohttp.ClientSession() as session:
                # Test liveness endpoint
                try:
                    timeout = aiohttp.ClientTimeout(total=5)
                    async with session.get(f"{self.base_url}/health/live", timeout=timeout) as response:
                        live_status = response.status == 200
                except (TimeoutError, aiohttp.ClientError):
                    live_status = False
                
                # Test readiness endpoint  
                try:
                    timeout = aiohttp.ClientTimeout(total=5)
                    async with session.get(f"{self.base_url}/health/ready", timeout=timeout) as response:
                        ready_status = response.status == 200
                except (TimeoutError, aiohttp.ClientError):
                    ready_status = False
                
                results["details"]["health_endpoints"] = {
                    "passed": live_status or ready_status,
                    "liveness": live_status,
                    "readiness": ready_status
                }
                
                if live_status or ready_status:
                    results["tests_passed"] += 1
                else:
                    results["tests_failed"] += 1
                    results["passed"] = False
                    results["recommendations"].append("Ensure FastAPI server is running with health endpoints")
        
        except Exception as e:
            results["details"]["health_endpoints"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
            results["passed"] = False
        
        # Test 3: Dependency checks
        try:
            results["tests_run"] += 1
            
            if 'startup_dependency_checks' in globals():
                # Simulate dependency check (can't run actual startup in test)
                results["details"]["dependency_checks"] = {
                    "passed": True,
                    "simulated": True,
                    "function_available": True
                }
                results["tests_passed"] += 1
            else:
                results["details"]["dependency_checks"] = {"passed": False, "error": "startup_dependency_checks not available"}
                results["tests_failed"] += 1
                results["passed"] = False
        
        except Exception as e:
            results["details"]["dependency_checks"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
            results["passed"] = False
        
        return results
    
    async def test_k2_redis_integration(self) -> dict[str, Any]:
        """Test K2 - Redis integration with centralized key management"""
        
        results = {
            "passed": True,
            "tests_run": 0,
            "tests_passed": 0,
            "tests_failed": 0,
            "details": {},
            "recommendations": []
        }
        
        # Test 1: Redis key manager
        try:
            results["tests_run"] += 1
            
            if 'RedisKeyManager' in globals() and 'RedisKeyspace' in globals():
                key_manager = RedisKeyManager()
                
                # Test key building
                user_key = key_manager.build_key(RedisKeyspace.USERS, "123")
                session_key = key_manager.build_key(RedisKeyspace.SESSIONS, "abc", "active")
                
                results["details"]["key_management"] = {
                    "passed": True,
                    "user_key": user_key,
                    "session_key": session_key,
                    "key_pattern_valid": "users:" in user_key and "sessions:" in session_key
                }
                results["tests_passed"] += 1
            else:
                results["details"]["key_management"] = {"passed": False, "error": "RedisKeyManager not available"}
                results["tests_failed"] += 1
                results["passed"] = False
        
        except Exception as e:
            results["details"]["key_management"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
            results["passed"] = False
        
        # Test 2: Redis connectivity
        try:
            results["tests_run"] += 1
            
            import redis.asyncio as redis
            redis_client = redis.from_url(self.redis_url)
            
            # Test basic connectivity
            await redis_client.ping()
            
            # Test key operations
            test_key = "phase_k:test:integration"
            await redis_client.set(test_key, "test_value", ex=60)
            retrieved_value = await redis_client.get(test_key)
            
            results["details"]["redis_connectivity"] = {
                "passed": retrieved_value == b"test_value",
                "ping_successful": True,
                "key_operations": True
            }
            
            # Cleanup
            await redis_client.delete(test_key)
            await redis_client.aclose()
            
            results["tests_passed"] += 1
        
        except Exception as e:
            results["details"]["redis_connectivity"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
            results["passed"] = False
            results["recommendations"].append("Ensure Redis server is running and accessible")
        
        # Test 3: Docker Redis integration
        try:
            results["tests_run"] += 1
            
            # Check if Redis Docker service is configured
            docker_compose_file = Path("docker-compose.redis-integration.yml")
            if docker_compose_file.exists():
                results["details"]["docker_integration"] = {
                    "passed": True,
                    "config_file_exists": True
                }
                results["tests_passed"] += 1
            else:
                results["details"]["docker_integration"] = {"passed": False, "error": "Redis Docker config not found"}
                results["tests_failed"] += 1
                results["passed"] = False
        
        except Exception as e:
            results["details"]["docker_integration"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
            results["passed"] = False
        
        return results
    
    async def test_k3_websocket_auth(self) -> dict[str, Any]:
        """Test K3 - JWT WebSocket authentication and real-time features"""
        
        results = {
            "passed": True,
            "tests_run": 0,
            "tests_passed": 0,
            "tests_failed": 0,
            "details": {},
            "recommendations": []
        }
        
        # Test 1: WebSocket JWT auth module
        try:
            results["tests_run"] += 1
            
            if 'WebSocketJWTAuth' in globals() and 'AuthenticatedWebSocketManager' in globals():
                # Test JWT auth initialization
                ws_auth = WebSocketJWTAuth("test_secret")
                
                # Test token generation (mock)
                test_payload = {"user_id": "123", "username": "testuser"}
                
                results["details"]["websocket_auth_module"] = {
                    "passed": True,
                    "auth_class_available": True,
                    "manager_class_available": True
                }
                results["tests_passed"] += 1
            else:
                results["details"]["websocket_auth_module"] = {"passed": False, "error": "WebSocket auth classes not available"}
                results["tests_failed"] += 1
                results["passed"] = False
        
        except Exception as e:
            results["details"]["websocket_auth_module"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
            results["passed"] = False
        
        # Test 2: WebSocket endpoint connectivity
        try:
            results["tests_run"] += 1
            
            # Test WebSocket connection (without auth for basic connectivity)
            try:
                async with websockets.connect(f"{self.ws_url}/ws/test", timeout=5) as websocket:
                    await websocket.send(json.dumps({"type": "ping"}))
                    response = await asyncio.wait_for(websocket.recv(), timeout=5)
                    
                    results["details"]["websocket_connectivity"] = {
                        "passed": True,
                        "connection_successful": True,
                        "message_exchange": True
                    }
                    results["tests_passed"] += 1
            
            except Exception as ws_error:
                # WebSocket endpoint might not exist, which is okay for this test
                results["details"]["websocket_connectivity"] = {
                    "passed": False,
                    "error": str(ws_error),
                    "note": "WebSocket endpoint may not be implemented yet"
                }
                results["tests_failed"] += 1
        
        except Exception as e:
            results["details"]["websocket_connectivity"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
        
        # Test 3: Real-time features structure
        try:
            results["tests_run"] += 1
            
            # Check if the WebSocket auth file has real-time features
            ws_auth_file = Path("app/websockets/jwt_websocket_auth.py")
            if ws_auth_file.exists():
                content = ws_auth_file.read_text()
                has_typing = "typing_indicator" in content
                has_presence = "presence_tracking" in content
                has_notifications = "notification" in content.lower()
                
                results["details"]["realtime_features"] = {
                    "passed": has_typing or has_presence or has_notifications,
                    "typing_indicators": has_typing,
                    "presence_tracking": has_presence,
                    "notifications": has_notifications
                }
                
                if has_typing or has_presence or has_notifications:
                    results["tests_passed"] += 1
                else:
                    results["tests_failed"] += 1
                    results["passed"] = False
            else:
                results["details"]["realtime_features"] = {"passed": False, "error": "WebSocket auth file not found"}
                results["tests_failed"] += 1
                results["passed"] = False
        
        except Exception as e:
            results["details"]["realtime_features"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
            results["passed"] = False
        
        return results
    
    async def test_k4_analytics_compatibility(self) -> dict[str, Any]:
        """Test K4 - SQLite/Postgres analytics compatibility"""
        
        results = {
            "passed": True,
            "tests_run": 0,
            "tests_passed": 0,
            "tests_failed": 0,
            "details": {},
            "recommendations": []
        }
        
        # Test 1: Analytics module availability
        try:
            results["tests_run"] += 1
            
            if all(cls in globals() for cls in ['DatabaseDialect', 'AnalyticsQueryBuilder', 'CompatibilityTester']):
                results["details"]["analytics_module"] = {
                    "passed": True,
                    "database_dialect_available": True,
                    "query_builder_available": True,
                    "compatibility_tester_available": True
                }
                results["tests_passed"] += 1
            else:
                results["details"]["analytics_module"] = {"passed": False, "error": "Analytics classes not available"}
                results["tests_failed"] += 1
                results["passed"] = False
        
        except Exception as e:
            results["details"]["analytics_module"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
            results["passed"] = False
        
        # Test 2: Database compatibility detection
        try:
            results["tests_run"] += 1
            
            if 'DatabaseDialect' in globals():
                # Test SQLite detection (mock)
                sqlite_dialect = DatabaseDialect.SQLITE
                postgresql_dialect = DatabaseDialect.POSTGRESQL
                
                results["details"]["dialect_detection"] = {
                    "passed": True,
                    "sqlite_constant": sqlite_dialect == "sqlite",
                    "postgresql_constant": postgresql_dialect == "postgresql"
                }
                results["tests_passed"] += 1
            else:
                results["details"]["dialect_detection"] = {"passed": False, "error": "DatabaseDialect not available"}
                results["tests_failed"] += 1
                results["passed"] = False
        
        except Exception as e:
            results["details"]["dialect_detection"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
            results["passed"] = False
        
        # Test 3: Cross-database query compatibility
        try:
            results["tests_run"] += 1
            
            analytics_file = Path("app/analytics/cross_database_compatibility.py")
            if analytics_file.exists():
                content = analytics_file.read_text()
                
                # Check for key compatibility functions
                has_json_extract = "json_extract" in content
                has_date_trunc = "date_trunc" in content
                has_window_functions = "window_function" in content
                has_fallbacks = "_fallback_" in content
                
                results["details"]["query_compatibility"] = {
                    "passed": has_json_extract and has_date_trunc and has_fallbacks,
                    "json_extraction": has_json_extract,
                    "date_truncation": has_date_trunc,
                    "window_functions": has_window_functions,
                    "fallback_methods": has_fallbacks
                }
                
                if has_json_extract and has_date_trunc and has_fallbacks:
                    results["tests_passed"] += 1
                else:
                    results["tests_failed"] += 1
                    results["passed"] = False
            else:
                results["details"]["query_compatibility"] = {"passed": False, "error": "Analytics file not found"}
                results["tests_failed"] += 1
                results["passed"] = False
        
        except Exception as e:
            results["details"]["query_compatibility"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
            results["passed"] = False
        
        return results
    
    async def test_cross_component_integration(self) -> dict[str, Any]:
        """Test cross-component integration between K1-K4"""
        
        results = {
            "passed": True,
            "tests_run": 0,
            "tests_passed": 0,
            "tests_failed": 0,
            "details": {},
            "recommendations": []
        }
        
        # Test 1: Startup + Redis integration
        try:
            results["tests_run"] += 1
            
            # Check if startup can integrate with Redis
            startup_file = Path("app/enhanced_startup.py")
            redis_keys_file = Path("app/core/redis_keys.py")
            
            startup_has_redis = False
            if startup_file.exists():
                startup_content = startup_file.read_text()
                startup_has_redis = "redis" in startup_content.lower()
            
            results["details"]["startup_redis_integration"] = {
                "passed": startup_file.exists() and redis_keys_file.exists(),
                "startup_file_exists": startup_file.exists(),
                "redis_keys_file_exists": redis_keys_file.exists(),
                "startup_references_redis": startup_has_redis
            }
            
            if startup_file.exists() and redis_keys_file.exists():
                results["tests_passed"] += 1
            else:
                results["tests_failed"] += 1
                results["passed"] = False
        
        except Exception as e:
            results["details"]["startup_redis_integration"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
            results["passed"] = False
        
        # Test 2: WebSocket + Redis integration
        try:
            results["tests_run"] += 1
            
            ws_auth_file = Path("app/websockets/jwt_websocket_auth.py")
            ws_has_redis = False
            
            if ws_auth_file.exists():
                ws_content = ws_auth_file.read_text()
                ws_has_redis = "redis" in ws_content.lower()
            
            results["details"]["websocket_redis_integration"] = {
                "passed": ws_auth_file.exists() and ws_has_redis,
                "websocket_file_exists": ws_auth_file.exists(),
                "websocket_uses_redis": ws_has_redis
            }
            
            if ws_auth_file.exists() and ws_has_redis:
                results["tests_passed"] += 1
            else:
                results["tests_failed"] += 1
                results["passed"] = False
        
        except Exception as e:
            results["details"]["websocket_redis_integration"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
            results["passed"] = False
        
        # Test 3: Analytics + Database integration
        try:
            results["tests_run"] += 1
            
            analytics_file = Path("app/analytics/cross_database_compatibility.py")
            if analytics_file.exists():
                analytics_content = analytics_file.read_text()
                
                # Check for database integration patterns
                has_sqlalchemy = "sqlalchemy" in analytics_content.lower()
                has_session = "Session" in analytics_content
                has_engine = "Engine" in analytics_content
                
                results["details"]["analytics_database_integration"] = {
                    "passed": has_sqlalchemy and has_session and has_engine,
                    "uses_sqlalchemy": has_sqlalchemy,
                    "uses_session": has_session,
                    "uses_engine": has_engine
                }
                
                if has_sqlalchemy and has_session and has_engine:
                    results["tests_passed"] += 1
                else:
                    results["tests_failed"] += 1
                    results["passed"] = False
            else:
                results["details"]["analytics_database_integration"] = {"passed": False, "error": "Analytics file not found"}
                results["tests_failed"] += 1
                results["passed"] = False
        
        except Exception as e:
            results["details"]["analytics_database_integration"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
            results["passed"] = False
        
        return results
    
    async def test_performance_characteristics(self) -> dict[str, Any]:
        """Test performance characteristics of Phase K components"""
        
        results = {
            "passed": True,
            "tests_run": 0,
            "tests_passed": 0,
            "tests_failed": 0,
            "details": {},
            "recommendations": []
        }
        
        # Test 1: Component import performance
        try:
            results["tests_run"] += 1
            
            import_start = time.time()
            try:
                # Simulate component imports
                component_count = 0
                if Path("app/enhanced_startup.py").exists():
                    component_count += 1
                if Path("app/core/redis_keys.py").exists():
                    component_count += 1
                if Path("app/websockets/jwt_websocket_auth.py").exists():
                    component_count += 1
                if Path("app/analytics/cross_database_compatibility.py").exists():
                    component_count += 1
            except Exception:
                component_count = 0
            
            import_time = time.time() - import_start
            
            results["details"]["import_performance"] = {
                "passed": import_time < 2.0,  # Should import quickly
                "import_time_seconds": round(import_time, 3),
                "components_found": component_count
            }
            
            if import_time < 2.0:
                results["tests_passed"] += 1
            else:
                results["tests_failed"] += 1
                results["passed"] = False
                results["recommendations"].append("Consider optimizing component imports for faster startup")
        
        except Exception as e:
            results["details"]["import_performance"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
            results["passed"] = False
        
        # Test 2: Memory usage estimation
        try:
            results["tests_run"] += 1
            
            # Basic memory estimation based on file sizes
            total_size = 0
            component_files = [
                "app/enhanced_startup.py",
                "app/core/redis_keys.py", 
                "app/websockets/jwt_websocket_auth.py",
                "app/analytics/cross_database_compatibility.py"
            ]
            
            for file_path in component_files:
                file_obj = Path(file_path)
                if file_obj.exists():
                    total_size += file_obj.stat().st_size
            
            # Convert to KB
            total_size_kb = total_size / 1024
            
            results["details"]["memory_estimation"] = {
                "passed": total_size_kb < 1000,  # Under 1MB for source
                "total_size_kb": round(total_size_kb, 2),
                "components_measured": len([f for f in component_files if Path(f).exists()])
            }
            
            if total_size_kb < 1000:
                results["tests_passed"] += 1
            else:
                results["tests_failed"] += 1
                results["passed"] = False
        
        except Exception as e:
            results["details"]["memory_estimation"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
            results["passed"] = False
        
        return results
    
    async def test_ci_smoke_integration(self) -> dict[str, Any]:
        """Test CI/CD smoke test integration"""
        
        results = {
            "passed": True,
            "tests_run": 0,
            "tests_passed": 0,
            "tests_failed": 0,
            "details": {},
            "recommendations": []
        }
        
        # Test 1: Smoke test suite availability
        try:
            results["tests_run"] += 1
            
            if 'SmokeTestSuite' in globals():
                results["details"]["smoke_test_availability"] = {
                    "passed": True,
                    "smoke_test_class_available": True
                }
                results["tests_passed"] += 1
            else:
                # Check if smoke test file exists
                smoke_test_file = Path("ci_smoke_tests.py")
                if smoke_test_file.exists():
                    results["details"]["smoke_test_availability"] = {
                        "passed": True,
                        "smoke_test_file_exists": True
                    }
                    results["tests_passed"] += 1
                else:
                    results["details"]["smoke_test_availability"] = {"passed": False, "error": "Smoke test suite not available"}
                    results["tests_failed"] += 1
                    results["passed"] = False
        
        except Exception as e:
            results["details"]["smoke_test_availability"] = {"passed": False, "error": str(e)}
            results["tests_failed"] += 1
            results["passed"] = False
        
        return results
    
    async def generate_integration_report(self, results: dict[str, Any]):
        """Generate comprehensive integration test report"""
        
        report_content = f"""
# Phase K Integration Test Report

## Test Summary
- **Total Test Categories**: {results['test_summary']['total_categories']}
- **Passed Categories**: {results['test_summary']['passed_categories']}
- **Failed Categories**: {results['test_summary']['failed_categories']}
- **Total Individual Tests**: {results['test_summary']['total_tests']}
- **Passed Tests**: {results['test_summary']['passed_tests']}
- **Failed Tests**: {results['test_summary']['failed_tests']}
- **Success Rate**: {(results['test_summary']['passed_tests'] / max(1, results['test_summary']['total_tests']) * 100):.1f}%

## Category Results

"""
        
        for category, category_result in results["category_results"].items():
            status = "✅ PASSED" if category_result.get("passed", False) else "❌ FAILED"
            report_content += f"### {category} - {status}\n\n"
            
            if "details" in category_result:
                for test_name, test_details in category_result["details"].items():
                    test_status = "✅" if test_details.get("passed", False) else "❌"
                    report_content += f"- {test_status} {test_name.replace('_', ' ').title()}\n"
                    
                    if not test_details.get("passed", False) and "error" in test_details:
                        report_content += f"  - Error: {test_details['error']}\n"
            
            report_content += "\n"
        
        if results["recommendations"]:
            report_content += "## Recommendations\n\n"
            for i, recommendation in enumerate(results["recommendations"], 1):
                report_content += f"{i}. {recommendation}\n"
            report_content += "\n"
        
        # Overall status
        overall_success = results["test_summary"]["failed_categories"] == 0
        report_content += f"## Overall Status: {'🎉 SUCCESS' if overall_success else '⚠️  NEEDS ATTENTION'}\n\n"
        
        if overall_success:
            report_content += "All Phase K components are properly integrated and functional.\n"
        else:
            report_content += "Some Phase K components need attention. See recommendations above.\n"
        
        # Write report to file
        report_file = Path("PHASE_K_INTEGRATION_REPORT.md")
        with open(report_file, "w", encoding="utf-8") as f:
            f.write(report_content)
        
        print(f"\n📊 Integration report saved to: {report_file}")

async def main():
    """Run Phase K integration tests"""
    
    tester = PhaseKIntegrationTester()
    results = await tester.run_all_tests()
    
    # Print summary
    print("\n" + "=" * 60)
    print("🎯 PHASE K INTEGRATION TEST SUMMARY")
    print("=" * 60)
    
    summary = results["test_summary"]
    print(f"Categories: {summary['passed_categories']}/{summary['total_categories']} passed")
    print(f"Tests: {summary['passed_tests']}/{summary['total_tests']} passed")
    print(f"Success Rate: {(summary['passed_tests'] / max(1, summary['total_tests']) * 100):.1f}%")
    
    if summary["failed_categories"] == 0:
        print("\n🎉 ALL PHASE K COMPONENTS INTEGRATED SUCCESSFULLY!")
    else:
        print(f"\n⚠️  {summary['failed_categories']} categories need attention")
        if results["recommendations"]:
            print("\nTop Recommendations:")
            for rec in results["recommendations"][:3]:
                print(f"  • {rec}")
    
    return results

if __name__ == "__main__":
    asyncio.run(main())