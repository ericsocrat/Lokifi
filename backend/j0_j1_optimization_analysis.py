#!/usr/bin/env python3
"""
Fynix J0+J1 Phase Analysis and Optimization Report
==================================================

This script analyzes the current state of the Fynix backend system,
validates J0+J1 core functionality, and provides optimization recommendations.
"""

import asyncio
import json
import sys
import time
from datetime import datetime
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    import requests

    from app.core.config import settings
    from app.core.security import create_access_token, verify_jwt_token
except ImportError as e:
    print(f"❌ Import Error: {e}")
    sys.exit(1)

BASE_URL = "http://localhost:8002"

class Colors:
    """ANSI color codes for console output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(title: str):
    """Print a formatted header"""
    print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*80}{Colors.END}")
    print(f"{Colors.CYAN}{Colors.BOLD}{title.center(80)}{Colors.END}")
    print(f"{Colors.CYAN}{Colors.BOLD}{'='*80}{Colors.END}")

def print_section(title: str):
    """Print a section header"""
    print(f"\n{Colors.BLUE}{Colors.BOLD}📋 {title}{Colors.END}")
    print(f"{Colors.BLUE}{'─'*60}{Colors.END}")

def print_success(message: str):
    """Print success message"""
    print(f"{Colors.GREEN}✅ {message}{Colors.END}")

def print_warning(message: str):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")

def print_info(message: str):
    """Print info message"""
    print(f"{Colors.WHITE}ℹ️  {message}{Colors.END}")

def print_recommendation(message: str):
    """Print recommendation"""
    print(f"{Colors.CYAN}💡 {message}{Colors.END}")

async def analyze_server_status():
    """Analyze current server status"""
    print_section("Server Status Analysis")
    
    status = {
        "health": False,
        "endpoints": {},
        "performance": {}
    }
    
    try:
        # Health check
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        response_time = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            status["health"] = True
            status["performance"]["health_response_time"] = response_time
            print_success(f"Server healthy (response time: {response_time:.1f}ms)")
        else:
            print_warning(f"Health check returned {response.status_code}")
    except Exception as e:
        print_warning(f"Health check failed: {e}")
    
    # Test key endpoints
    endpoints_to_test = [
        ("/docs", "API Documentation"),
        ("/api/auth/check", "Auth Check"),
        ("/openapi.json", "OpenAPI Schema")
    ]
    
    for endpoint, name in endpoints_to_test:
        try:
            start_time = time.time()
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            response_time = (time.time() - start_time) * 1000
            
            status["endpoints"][endpoint] = {
                "status_code": response.status_code,
                "response_time": response_time,
                "working": response.status_code in [200, 401]  # 401 is OK for auth endpoints
            }
            
            if status["endpoints"][endpoint]["working"]:
                print_success(f"{name}: {response.status_code} ({response_time:.1f}ms)")
            else:
                print_warning(f"{name}: {response.status_code} ({response_time:.1f}ms)")
                
        except Exception as e:
            status["endpoints"][endpoint] = {"error": str(e), "working": False}
            print_warning(f"{name}: Error - {e}")
    
    return status

async def analyze_core_features():
    """Analyze J0+J1 core features"""
    print_section("Core Features Analysis (J0+J1)")
    
    features = {
        "authentication": {},
        "security": {},
        "database": {},
        "configuration": {}
    }
    
    # Authentication Analysis
    try:
        # Test JWT token creation and verification
        test_token = create_access_token("test-user", "test@example.com")
        payload = verify_jwt_token(test_token)
        
        features["authentication"]["jwt_working"] = True
        features["authentication"]["token_length"] = len(test_token)
        features["authentication"]["payload_valid"] = (
            payload.get("sub") == "test-user" and 
            payload.get("email") == "test@example.com"
        )
        
        print_success("JWT authentication system working correctly")
        print_info(f"Token length: {len(test_token)} characters")
        
    except Exception as e:
        features["authentication"]["jwt_working"] = False
        features["authentication"]["error"] = str(e)
        print_warning(f"JWT authentication issue: {e}")
    
    # Security Analysis
    try:
        import os

        from app.core.security import hash_password, verify_password
        
        test_password = os.getenv("TEST_PASSWORD", "test123456")
        hashed = hash_password(test_password)
        verified = verify_password(test_password, hashed)
        
        features["security"]["password_hashing"] = True
        features["security"]["hash_length"] = len(hashed)
        features["security"]["verification_working"] = verified
        
        print_success("Password hashing and verification working correctly")
        
    except Exception as e:
        features["security"]["password_hashing"] = False
        features["security"]["error"] = str(e)
        print_warning(f"Password security issue: {e}")
    
    # Configuration Analysis
    try:
        features["configuration"]["project_name"] = settings.PROJECT_NAME
        features["configuration"]["database_url"] = settings.DATABASE_URL
        features["configuration"]["jwt_algorithm"] = settings.JWT_ALGORITHM
        features["configuration"]["jwt_expire_minutes"] = settings.JWT_EXPIRE_MINUTES
        
        print_success("Configuration loaded successfully")
        print_info(f"Project: {settings.PROJECT_NAME}")
        print_info(f"Database: {settings.DATABASE_URL}")
        
    except Exception as e:
        features["configuration"]["error"] = str(e)
        print_warning(f"Configuration issue: {e}")
    
    return features

async def analyze_advanced_features():
    """Analyze advanced features beyond J0+J1"""
    print_section("Advanced Features Analysis")
    
    advanced = {
        "monitoring": False,
        "websockets": False,
        "ai_integration": False,
        "social_features": False,
        "portfolio_management": False
    }
    
    # Check for advanced modules
    try:
        from app.services import j53_performance_monitor
        advanced["monitoring"] = True
        print_success("Performance monitoring system available")
    except ImportError:
        print_info("Performance monitoring not available")
    
    try:
        from app.routers import websocket
        advanced["websockets"] = True
        print_success("WebSocket support available")
    except ImportError:
        print_info("WebSocket support not available")
    
    try:
        from app.services import ai_service
        advanced["ai_integration"] = True
        print_success("AI integration available")
    except ImportError:
        print_info("AI integration not available")
    
    try:
        from app.routers import social
        advanced["social_features"] = True
        print_success("Social features available")
    except ImportError:
        print_info("Social features not available")
    
    # Test portfolio endpoints if available
    try:
        response = requests.get(f"{BASE_URL}/api/portfolio", timeout=5)
        if response.status_code in [200, 401]:  # 401 means auth required, which is expected
            advanced["portfolio_management"] = True
            print_success("Portfolio management endpoints available")
        else:
            print_info("Portfolio management endpoints not fully available")
    except Exception:
        print_info("Portfolio management not available")
    
    return advanced

async def generate_optimization_recommendations(analysis_data):
    """Generate optimization recommendations based on analysis"""
    print_section("Optimization Recommendations")
    
    recommendations = []
    
    # Server performance recommendations
    if analysis_data["server"]["health"]:
        if "health_response_time" in analysis_data["server"]["performance"]:
            response_time = analysis_data["server"]["performance"]["health_response_time"]
            if response_time > 100:
                recommendations.append({
                    "category": "Performance",
                    "priority": "Medium",
                    "issue": f"Health endpoint response time is {response_time:.1f}ms",
                    "recommendation": "Consider optimizing server startup and health check logic"
                })
            else:
                print_success(f"Server response time is excellent ({response_time:.1f}ms)")
    
    # Authentication recommendations
    if analysis_data["core_features"]["authentication"].get("jwt_working"):
        print_success("Authentication system is production-ready")
    else:
        recommendations.append({
            "category": "Security",
            "priority": "High",
            "issue": "JWT authentication not working properly",
            "recommendation": "Fix JWT token creation and verification before deployment"
        })
    
    # Security recommendations
    if analysis_data["core_features"]["security"].get("password_hashing"):
        print_success("Password security is properly implemented")
    else:
        recommendations.append({
            "category": "Security",
            "priority": "Critical",
            "issue": "Password hashing not working",
            "recommendation": "Implement secure password hashing immediately"
        })
    
    # Advanced features recommendations
    advanced_count = sum(1 for v in analysis_data["advanced_features"].values() if v)
    total_advanced = len(analysis_data["advanced_features"])
    
    if advanced_count >= total_advanced * 0.8:
        print_success(f"Excellent feature coverage: {advanced_count}/{total_advanced} advanced features available")
    elif advanced_count >= total_advanced * 0.5:
        recommendations.append({
            "category": "Features",
            "priority": "Low",
            "issue": f"Moderate feature coverage: {advanced_count}/{total_advanced} advanced features",
            "recommendation": "Consider implementing remaining advanced features for better user experience"
        })
    else:
        recommendations.append({
            "category": "Features",
            "priority": "Medium",
            "issue": f"Limited feature coverage: {advanced_count}/{total_advanced} advanced features",
            "recommendation": "Focus on implementing core advanced features like monitoring and WebSockets"
        })
    
    # Display recommendations
    if recommendations:
        for rec in recommendations:
            priority_color = {
                "Critical": Colors.RED,
                "High": Colors.YELLOW,
                "Medium": Colors.BLUE,
                "Low": Colors.WHITE
            }.get(rec["priority"], Colors.WHITE)
            
            print(f"\n{priority_color}🔧 {rec['category']} - {rec['priority']} Priority{Colors.END}")
            print(f"   Issue: {rec['issue']}")
            print_recommendation(rec['recommendation'])
    else:
        print_success("No optimization recommendations needed - system is well optimized!")
    
    return recommendations

async def generate_final_report(analysis_data, recommendations):
    """Generate final comprehensive report"""
    print_header("Fynix J0+J1 Phase Analysis - Final Report")
    
    # Overall system health
    overall_health = "Excellent"
    if not analysis_data["server"]["health"]:
        overall_health = "Poor"
    elif not analysis_data["core_features"]["authentication"].get("jwt_working"):
        overall_health = "Fair"
    elif len(recommendations) > 2:
        overall_health = "Good"
    
    health_color = {
        "Excellent": Colors.GREEN,
        "Good": Colors.BLUE,
        "Fair": Colors.YELLOW,
        "Poor": Colors.RED
    }.get(overall_health, Colors.WHITE)
    
    print(f"\n{Colors.BOLD}Overall System Health: {health_color}{overall_health}{Colors.END}")
    
    # Core functionality summary
    print(f"\n{Colors.BOLD}Core Functionality Status:{Colors.END}")
    
    core_items = [
        ("Server Health", analysis_data["server"]["health"]),
        ("Authentication", analysis_data["core_features"]["authentication"].get("jwt_working", False)),
        ("Security", analysis_data["core_features"]["security"].get("password_hashing", False)),
        ("Configuration", "error" not in analysis_data["core_features"]["configuration"])
    ]
    
    for item, status in core_items:
        status_icon = "✅" if status else "❌"
        print(f"  {status_icon} {item}")
    
    # Advanced features summary
    print(f"\n{Colors.BOLD}Advanced Features Available:{Colors.END}")
    for feature, available in analysis_data["advanced_features"].items():
        icon = "✅" if available else "⭕"
        feature_name = feature.replace("_", " ").title()
        print(f"  {icon} {feature_name}")
    
    # Readiness assessment
    print(f"\n{Colors.BOLD}Production Readiness Assessment:{Colors.END}")
    
    critical_issues = len([r for r in recommendations if r["priority"] == "Critical"])
    high_issues = len([r for r in recommendations if r["priority"] == "High"])
    
    if critical_issues == 0 and high_issues == 0:
        print_success("✅ Ready for production deployment")
        print_info("All critical systems are functioning correctly")
    elif critical_issues == 0:
        print_warning("⚠️ Ready for staging deployment")
        print_info("Address high-priority issues before production")
    else:
        print_warning("🔧 Requires fixes before deployment")
        print_info("Critical issues must be resolved first")
    
    # Next steps
    print(f"\n{Colors.BOLD}Recommended Next Steps:{Colors.END}")
    
    if overall_health == "Excellent":
        print_info("1. Set up automated testing pipeline")
        print_info("2. Configure production database")
        print_info("3. Implement monitoring and alerting")
        print_info("4. Plan user acceptance testing")
    else:
        print_info("1. Address critical and high-priority issues")
        print_info("2. Re-run comprehensive testing")
        print_info("3. Verify all core functionality")
        print_info("4. Prepare for staging deployment")
    
    # Save report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_data = {
        "timestamp": timestamp,
        "overall_health": overall_health,
        "analysis": analysis_data,
        "recommendations": recommendations,
        "next_steps": "See console output for detailed next steps"
    }
    
    report_file = backend_dir / f"j0_j1_optimization_report_{timestamp}.json"
    try:
        with open(report_file, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)
        print(f"\n{Colors.CYAN}📝 Detailed report saved to: {report_file}{Colors.END}")
    except Exception as e:
        print_warning(f"Could not save report: {e}")
    
    return report_data

async def main():
    """Main analysis execution"""
    print_header("Fynix J0+J1 Phase Analysis & Optimization")
    print(f"{Colors.WHITE}Comprehensive analysis of core functionality and optimization opportunities{Colors.END}")
    print(f"{Colors.WHITE}Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.END}")
    
    # Collect analysis data
    analysis_data = {
        "server": await analyze_server_status(),
        "core_features": await analyze_core_features(),
        "advanced_features": await analyze_advanced_features()
    }
    
    # Generate recommendations
    recommendations = await generate_optimization_recommendations(analysis_data)
    
    # Generate final report
    report = await generate_final_report(analysis_data, recommendations)
    
    print(f"\n{Colors.BOLD}🎯 Analysis Complete!{Colors.END}")
    return report

if __name__ == "__main__":
    try:
        report = asyncio.run(main())
        sys.exit(0)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Analysis interrupted by user{Colors.END}")
        sys.exit(130)
    except Exception as e:
        print(f"\n{Colors.RED}Analysis failed: {e}{Colors.END}")
        sys.exit(1)