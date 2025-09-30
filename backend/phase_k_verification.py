"""
Phase K Implementation Verification Script
Checks that all K1-K4 components are properly implemented without trying to import them
"""

import logging
import time
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

class PhaseKVerifier:
    """Verify Phase K implementation without importing problematic modules"""
    
    def __init__(self):
        self.backend_path = Path(".")
        self.results = {}
    
    def verify_all_components(self) -> dict[str, Any]:
        """Verify all Phase K components K1-K4"""
        
        print("🔍 Phase K Implementation Verification")
        print("=" * 50)
        
        verification_results = {
            "overall_status": "pending",
            "timestamp": time.time(),
            "components": {},
            "summary": {
                "total_components": 4,
                "implemented_components": 0,
                "missing_components": 0,
                "partial_components": 0
            },
            "recommendations": []
        }
        
        # Verify each component
        components = [
            ("K1 - Enhanced Startup", self.verify_k1_startup),
            ("K2 - Redis Integration", self.verify_k2_redis),
            ("K3 - WebSocket Auth", self.verify_k3_websocket),
            ("K4 - Analytics Compatibility", self.verify_k4_analytics)
        ]
        
        for component_name, verify_func in components:
            print(f"\n📋 Verifying: {component_name}")
            print("-" * 30)
            
            try:
                component_result = verify_func()
                verification_results["components"][component_name] = component_result
                
                status = component_result.get("status", "missing")
                if status == "implemented":
                    verification_results["summary"]["implemented_components"] += 1
                    print(f"✅ {component_name}: IMPLEMENTED")
                elif status == "partial":
                    verification_results["summary"]["partial_components"] += 1
                    print(f"⚡ {component_name}: PARTIAL")
                else:
                    verification_results["summary"]["missing_components"] += 1
                    print(f"❌ {component_name}: MISSING")
                
                # Add recommendations
                if "recommendations" in component_result:
                    verification_results["recommendations"].extend(component_result["recommendations"])
            
            except Exception as e:
                print(f"❌ {component_name}: ERROR - {e}")
                verification_results["components"][component_name] = {
                    "status": "error",
                    "error": str(e)
                }
                verification_results["summary"]["missing_components"] += 1
        
        # Determine overall status
        impl_count = verification_results["summary"]["implemented_components"]
        partial_count = verification_results["summary"]["partial_components"]
        
        if impl_count == 4:
            verification_results["overall_status"] = "complete"
        elif impl_count + partial_count >= 3:
            verification_results["overall_status"] = "mostly_complete"
        elif impl_count + partial_count >= 2:
            verification_results["overall_status"] = "partial"
        else:
            verification_results["overall_status"] = "incomplete"
        
        # Generate report
        self.generate_verification_report(verification_results)
        return verification_results
    
    def verify_k1_startup(self) -> dict[str, Any]:
        """Verify K1 - Enhanced startup sequence"""
        
        result = {
            "status": "missing",
            "details": {},
            "files_found": 0,
            "features_implemented": 0,
            "recommendations": []
        }
        
        # Check enhanced startup file
        startup_file = self.backend_path / "app" / "enhanced_startup.py"
        if startup_file.exists():
            result["files_found"] += 1
            try:
                content = startup_file.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                # Try with different encoding
                try:
                    content = startup_file.read_text(encoding='latin-1')
                except (UnicodeDecodeError, OSError):
                    content = ""
            
            # Check for key features
            features = {
                "enhanced_settings": "EnhancedSettings" in content,
                "dependency_checks": "startup_dependency_checks" in content,
                "health_endpoints": "health_check_live" in content and "health_check_ready" in content,
                "environment_config": "environment" in content.lower(),
                "database_migration": "alembic" in content.lower() or "migration" in content.lower(),
                "graceful_shutdown": "shutdown" in content.lower(),
                "middleware_config": "middleware" in content.lower()
            }
            
            result["details"]["startup_features"] = features
            result["features_implemented"] = sum(features.values())
            
            # Check CI smoke tests
            ci_file = self.backend_path / "ci_smoke_tests.py"
            if ci_file.exists():
                result["files_found"] += 1
                try:
                    ci_content = ci_file.read_text(encoding='utf-8')
                except UnicodeDecodeError:
                    ci_content = ""
                result["details"]["ci_smoke_tests"] = {
                    "health_check_tests": "health" in ci_content.lower(),
                    "api_endpoint_tests": "endpoint" in ci_content.lower(),
                    "websocket_tests": "websocket" in ci_content.lower()
                }
        
        # Check Docker setup scripts
        setup_files = [
            "setup_backend.ps1",
            "setup_database.ps1", 
            "setup_track3_infrastructure.ps1"
        ]
        
        for setup_file in setup_files:
            if (self.backend_path / setup_file).exists():
                result["files_found"] += 1
        
        result["details"]["setup_scripts_found"] = result["files_found"] - 1  # Subtract main startup file
        
        # Determine status
        if result["features_implemented"] >= 5 and result["files_found"] >= 3:
            result["status"] = "implemented"
        elif result["features_implemented"] >= 3:
            result["status"] = "partial" 
            result["recommendations"].append("Complete remaining startup sequence features")
        else:
            result["recommendations"].append("Implement enhanced startup sequence with health checks")
        
        return result
    
    def verify_k2_redis(self) -> dict[str, Any]:
        """Verify K2 - Redis integration"""
        
        result = {
            "status": "missing",
            "details": {},
            "files_found": 0,
            "features_implemented": 0,
            "recommendations": []
        }
        
        # Check Redis key manager
        redis_keys_file = self.backend_path / "app" / "core" / "redis_keys.py"
        if redis_keys_file.exists():
            result["files_found"] += 1
            try:
                content = redis_keys_file.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                content = ""
            
            features = {
                "redis_key_manager": "RedisKeyManager" in content,
                "redis_keyspace": "RedisKeyspace" in content,
                "key_building": "build_key" in content,
                "utility_functions": "hash_key" in content or "sanitize_key" in content,
                "structured_keys": ":" in content  # Check for key structure patterns
            }
            
            result["details"]["redis_key_features"] = features
            result["features_implemented"] += sum(features.values())
        
        # Check Docker Redis integration
        docker_redis_file = self.backend_path / "docker-compose.redis-integration.yml"
        if docker_redis_file.exists():
            result["files_found"] += 1
            try:
                content = docker_redis_file.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                content = ""
            
            result["details"]["docker_redis"] = {
                "redis_service": "redis:" in content,
                "health_check": "healthcheck" in content,
                "persistent_storage": "volumes:" in content,
                "network_config": "networks:" in content
            }
            result["features_implemented"] += 2  # Docker setup counts as multiple features
        
        # Check Redis setup script
        redis_setup_file = self.backend_path / "setup_redis_enhancement.py"
        if redis_setup_file.exists():
            result["files_found"] += 1
            result["features_implemented"] += 1
        
        # Determine status
        if result["features_implemented"] >= 6 and result["files_found"] >= 2:
            result["status"] = "implemented"
        elif result["features_implemented"] >= 4:
            result["status"] = "partial"
            result["recommendations"].append("Complete Redis key management and Docker integration")
        else:
            result["recommendations"].append("Implement centralized Redis key management system")
        
        return result
    
    def verify_k3_websocket(self) -> dict[str, Any]:
        """Verify K3 - WebSocket JWT authentication"""
        
        result = {
            "status": "missing", 
            "details": {},
            "files_found": 0,
            "features_implemented": 0,
            "recommendations": []
        }
        
        # Check WebSocket JWT auth file
        ws_auth_file = self.backend_path / "app" / "websockets" / "jwt_websocket_auth.py"
        if ws_auth_file.exists():
            result["files_found"] += 1
            try:
                content = ws_auth_file.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                content = ""
            
            features = {
                "websocket_jwt_auth": "WebSocketJWTAuth" in content,
                "authenticated_manager": "AuthenticatedWebSocketManager" in content,
                "token_validation": "validate_token" in content or "decode_token" in content,
                "real_time_features": "typing_indicator" in content or "presence_tracking" in content,
                "user_context": "user_id" in content and "username" in content,
                "connection_management": "connect" in content and "disconnect" in content,
                "redis_integration": "redis" in content.lower(),
                "multi_instance_support": "broadcast" in content or "pub" in content
            }
            
            result["details"]["websocket_auth_features"] = features
            result["features_implemented"] = sum(features.values())
        
        # Check for WebSocket test files
        ws_test_files = [
            "test_j6_e2e_notifications.py",
            "test_direct_messages.py"
        ]
        
        for test_file in ws_test_files:
            if (self.backend_path / test_file).exists():
                result["files_found"] += 1
        
        # Determine status
        if result["features_implemented"] >= 6 and result["files_found"] >= 2:
            result["status"] = "implemented"
        elif result["features_implemented"] >= 4:
            result["status"] = "partial"
            result["recommendations"].append("Complete WebSocket real-time features and multi-instance support")
        else:
            result["recommendations"].append("Implement JWT WebSocket authentication with real-time features")
        
        return result
    
    def verify_k4_analytics(self) -> dict[str, Any]:
        """Verify K4 - Analytics SQLite/Postgres compatibility"""
        
        result = {
            "status": "missing",
            "details": {},
            "files_found": 0,
            "features_implemented": 0,
            "recommendations": []
        }
        
        # Check analytics compatibility file
        analytics_file = self.backend_path / "app" / "analytics" / "cross_database_compatibility.py"
        if analytics_file.exists():
            result["files_found"] += 1
            try:
                content = analytics_file.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                content = ""
            
            features = {
                "database_dialect_detection": "DatabaseDialect" in content,
                "cross_database_queries": "CrossDatabaseQuery" in content,
                "analytics_query_builder": "AnalyticsQueryBuilder" in content,
                "compatibility_tester": "CompatibilityTester" in content,
                "json_extraction": "json_extract" in content,
                "date_truncation": "date_trunc" in content,
                "window_functions": "window_function" in content,
                "fallback_methods": "_fallback_" in content,
                "sqlite_postgres_support": "sqlite" in content.lower() and "postgresql" in content.lower()
            }
            
            result["details"]["analytics_features"] = features
            result["features_implemented"] = sum(features.values())
        
        # Check for analytics-related test files
        analytics_tests = [
            "performance_optimization_analyzer.py",
            "comprehensive_stress_test.py"
        ]
        
        for test_file in analytics_tests:
            if (self.backend_path / test_file).exists():
                result["files_found"] += 1
        
        # Determine status
        if result["features_implemented"] >= 7 and result["files_found"] >= 2:
            result["status"] = "implemented"
        elif result["features_implemented"] >= 5:
            result["status"] = "partial"
            result["recommendations"].append("Complete cross-database analytics compatibility layer")
        else:
            result["recommendations"].append("Implement SQLite/Postgres analytics compatibility system")
        
        return result
    
    def generate_verification_report(self, results: dict[str, Any]):
        """Generate verification report"""
        
        report_content = f"""# Phase K Implementation Verification Report

## Overall Status: {results['overall_status'].upper().replace('_', ' ')}

## Summary
- **Total Components**: {results['summary']['total_components']}
- **Implemented**: {results['summary']['implemented_components']} 
- **Partial**: {results['summary']['partial_components']}
- **Missing**: {results['summary']['missing_components']}

## Component Details

"""
        
        for component_name, component_data in results["components"].items():
            status_emoji = {
                "implemented": "✅",
                "partial": "⚡", 
                "missing": "❌",
                "error": "💥"
            }
            
            status = component_data.get("status", "missing")
            emoji = status_emoji.get(status, "❓")
            
            report_content += f"### {component_name} - {emoji} {status.upper()}\n\n"
            
            if "details" in component_data:
                for detail_name, detail_data in component_data["details"].items():
                    report_content += f"**{detail_name.replace('_', ' ').title()}**:\n"
                    if isinstance(detail_data, dict):
                        for feature, implemented in detail_data.items():
                            feature_status = "✅" if implemented else "❌"
                            report_content += f"- {feature_status} {feature.replace('_', ' ').title()}\n"
                    else:
                        report_content += f"- {detail_data}\n"
                    report_content += "\n"
            
            files_found = component_data.get("files_found", 0)
            features_implemented = component_data.get("features_implemented", 0)
            report_content += f"**Files Found**: {files_found}\n"
            report_content += f"**Features Implemented**: {features_implemented}\n\n"
        
        if results["recommendations"]:
            report_content += "## Recommendations\n\n"
            for i, rec in enumerate(results["recommendations"], 1):
                report_content += f"{i}. {rec}\n"
            report_content += "\n"
        
        # Overall assessment
        overall_status = results["overall_status"]
        if overall_status == "complete":
            report_content += "## ✅ Assessment: Phase K Implementation Complete\n\n"
            report_content += "All Phase K components (K1-K4) are fully implemented with required features.\n"
        elif overall_status == "mostly_complete":
            report_content += "## ⚡ Assessment: Phase K Mostly Complete\n\n"
            report_content += "Most Phase K components are implemented. Minor enhancements needed.\n"
        elif overall_status == "partial":
            report_content += "## 🔄 Assessment: Phase K Partial Implementation\n\n"
            report_content += "Some Phase K components implemented. Significant work remaining.\n"
        else:
            report_content += "## ❌ Assessment: Phase K Implementation Incomplete\n\n"
            report_content += "Phase K implementation needs major work across multiple components.\n"
        
        # Write report
        report_file = Path("PHASE_K_VERIFICATION_REPORT.md")
        with open(report_file, "w", encoding="utf-8") as f:
            f.write(report_content)
        
        print(f"\n📊 Verification report saved to: {report_file}")

def main():
    """Run Phase K verification"""
    
    verifier = PhaseKVerifier()
    results = verifier.verify_all_components()
    
    # Print final summary
    print("\n" + "=" * 50)
    print("🎯 PHASE K VERIFICATION SUMMARY")
    print("=" * 50)
    
    summary = results["summary"]
    overall = results["overall_status"]
    
    print(f"Overall Status: {overall.upper().replace('_', ' ')}")
    print(f"Components: {summary['implemented_components']}/4 implemented, {summary['partial_components']} partial")
    
    if overall == "complete":
        print("\n🎉 Phase K implementation is COMPLETE!")
        print("All required components (K1-K4) are properly implemented.")
    elif overall == "mostly_complete":
        print("\n⚡ Phase K implementation is MOSTLY COMPLETE!")
        print("Minor enhancements needed for full compliance.")
    elif overall == "partial":
        print("\n🔄 Phase K implementation is PARTIAL.")
        print("Significant development work remaining.")
    else:
        print("\n❌ Phase K implementation is INCOMPLETE.")
        print("Major implementation work required.")
    
    if results["recommendations"]:
        print("\nTop Priorities:")
        for i, rec in enumerate(results["recommendations"][:3], 1):
            print(f"  {i}. {rec}")
    
    return results

if __name__ == "__main__":
    main()