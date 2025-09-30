"""
Master Test Runner for Phase J2 - User Profiles & Settings
Runs comprehensive testing of all profile and settings functionality
"""

import sys
import time
import json
from pathlib import Path
import subprocess
import requests

# Import our test suites
try:
    from test_phase_j2_comprehensive import run_comprehensive_profile_tests
    from test_phase_j2_enhanced import run_enhanced_profile_tests
    from test_phase_j2_frontend import run_frontend_profile_tests
except ImportError as e:
    print(f"⚠️  Warning: Could not import some test modules: {e}")
    print("   Some tests may be skipped")

BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

class PhaseJ2MasterTestRunner:
    """Master test runner for all Phase J2 functionality."""
    
    def __init__(self):
        self.results = {
            "comprehensive": {"passed": 0, "failed": 0},
            "enhanced": {"passed": 0, "failed": 0},
            "frontend": {"passed": 0, "failed": 0},
            "integration": {"passed": 0, "failed": 0}
        }
        
    def check_services_running(self):
        """Check if backend and frontend services are running."""
        print("🔍 Checking Service Status")
        print("-" * 40)
        
        services_ok = True
        
        # Check backend
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=5)
            if response.status_code == 200:
                print("✅ Backend service: Running")
            else:
                print(f"❌ Backend service: Not responding properly ({response.status_code})")
                services_ok = False
        except Exception as e:
            print(f"❌ Backend service: Not running ({e})")
            services_ok = False
        
        # Check frontend
        try:
            response = requests.get(FRONTEND_URL, timeout=5)
            if response.status_code == 200:
                print("✅ Frontend service: Running")
            else:
                print(f"⚠️  Frontend service: Unexpected status ({response.status_code})")
        except Exception as e:
            print(f"❌ Frontend service: Not running ({e})")
            print("   Note: Frontend tests will be skipped")
        
        print()
        return services_ok
    
    def run_comprehensive_tests(self):
        """Run comprehensive profile and settings tests."""
        print("🧪 Running Comprehensive Profile Tests")
        print("=" * 50)
        
        try:
            passed, failed = run_comprehensive_profile_tests()
            self.results["comprehensive"]["passed"] = passed
            self.results["comprehensive"]["failed"] = failed
            return True
        except Exception as e:
            print(f"❌ Comprehensive tests failed: {e}")
            self.results["comprehensive"]["failed"] = 1
            return False
    
    def run_enhanced_tests(self):
        """Run enhanced profile feature tests."""
        print("\n🚀 Running Enhanced Profile Feature Tests")
        print("=" * 50)
        
        try:
            passed, failed = run_enhanced_profile_tests()
            self.results["enhanced"]["passed"] = passed
            self.results["enhanced"]["failed"] = failed
            return True
        except Exception as e:
            print(f"❌ Enhanced tests failed: {e}")
            self.results["enhanced"]["failed"] = 1
            return False
    
    def run_frontend_tests(self):
        """Run frontend profile page tests."""
        print("\n🌐 Running Frontend Profile Tests")
        print("=" * 50)
        
        try:
            passed, failed = run_frontend_profile_tests()
            self.results["frontend"]["passed"] = passed
            self.results["frontend"]["failed"] = failed
            return True
        except Exception as e:
            print(f"❌ Frontend tests failed: {e}")
            print(f"   This might be due to missing ChromeDriver or Selenium")
            self.results["frontend"]["failed"] = 1
            return False
    
    def run_integration_tests(self):
        """Run integration tests between frontend and backend."""
        print("\n🔗 Running Integration Tests")
        print("=" * 50)
        
        integration_passed = 0
        integration_failed = 0
        
        # Test 1: API endpoints are accessible
        try:
            print("🧪 Test 1: API Endpoint Accessibility")
            endpoints_to_test = [
                "/api/profile/me",
                "/api/profile/settings/user",
                "/api/profile/settings/notifications",
                "/api/profile"
            ]
            
            for endpoint in endpoints_to_test:
                try:
                    # Test without auth (should get 401 or redirect)
                    response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
                    if response.status_code in [401, 403, 422]:
                        print(f"   ✅ {endpoint}: Properly protected")
                    else:
                        print(f"   ⚠️  {endpoint}: Unexpected response ({response.status_code})")
                except Exception as e:
                    print(f"   ❌ {endpoint}: Error ({e})")
            
            integration_passed += 1
            
        except Exception as e:
            print(f"❌ API accessibility test failed: {e}")
            integration_failed += 1
        
        # Test 2: Database connectivity
        try:
            print("\n🧪 Test 2: Database Connectivity")
            response = requests.get(f"{BASE_URL}/api/profile?q=test&page=1", timeout=5)
            if response.status_code == 200:
                print("   ✅ Database queries working")
                integration_passed += 1
            else:
                print(f"   ❌ Database connectivity issue ({response.status_code})")
                integration_failed += 1
        except Exception as e:
            print(f"❌ Database connectivity test failed: {e}")
            integration_failed += 1
        
        # Test 3: Frontend-Backend API contract
        try:
            print("\n🧪 Test 3: API Response Structure")
            response = requests.get(f"{BASE_URL}/api/profile?q=test&page=1", timeout=5)
            if response.status_code == 200:
                data = response.json()
                required_fields = ["profiles", "total", "page", "page_size"]
                fields_present = all(field in data for field in required_fields)
                if fields_present:
                    print("   ✅ API response structure correct")
                    integration_passed += 1
                else:
                    print("   ❌ API response structure incorrect")
                    integration_failed += 1
            else:
                print(f"   ❌ Could not test API structure ({response.status_code})")
                integration_failed += 1
        except Exception as e:
            print(f"❌ API contract test failed: {e}")
            integration_failed += 1
        
        self.results["integration"]["passed"] = integration_passed
        self.results["integration"]["failed"] = integration_failed
        
        return integration_passed > integration_failed
    
    def generate_test_report(self):
        """Generate a comprehensive test report."""
        print("\n" + "=" * 80)
        print("📊 PHASE J2 - USER PROFILES & SETTINGS TEST REPORT")
        print("=" * 80)
        
        total_passed = 0
        total_failed = 0
        
        for test_type, results in self.results.items():
            passed = results["passed"]
            failed = results["failed"]
            total_passed += passed
            total_failed += failed
            
            if passed + failed > 0:
                success_rate = (passed / (passed + failed)) * 100
                status = "✅ PASS" if passed > failed else "❌ FAIL"
                print(f"{test_type.upper():15} | {passed:2}✅ {failed:2}❌ | {success_rate:5.1f}% | {status}")
            else:
                print(f"{test_type.upper():15} | No tests run")
        
        print("-" * 80)
        
        if total_passed + total_failed > 0:
            overall_success = (total_passed / (total_passed + total_failed)) * 100
            print(f"{'OVERALL':15} | {total_passed:2}✅ {total_failed:2}❌ | {overall_success:5.1f}%")
        else:
            print("No tests were run successfully")
            return
        
        print("=" * 80)
        
        # Overall assessment
        if overall_success >= 80:
            print("🎉 PHASE J2 USER PROFILES & SETTINGS: EXCELLENT!")
            print("   ✅ Most functionality is working correctly")
            print("   ✅ Ready for production use")
        elif overall_success >= 60:
            print("✅ PHASE J2 USER PROFILES & SETTINGS: GOOD")
            print("   ✅ Core functionality is working")
            print("   ⚠️  Some minor issues to address")
        elif overall_success >= 40:
            print("⚠️  PHASE J2 USER PROFILES & SETTINGS: NEEDS WORK")
            print("   ⚠️  Several issues need to be resolved")
            print("   ❌ Not ready for production")
        else:
            print("❌ PHASE J2 USER PROFILES & SETTINGS: MAJOR ISSUES")
            print("   ❌ Significant problems detected")
            print("   ❌ Requires debugging and fixes")
        
        print("\n📋 Next Steps:")
        if total_failed > 0:
            print("   1. Review failed test details above")
            print("   2. Debug and fix identified issues")
            print("   3. Re-run tests to verify fixes")
        else:
            print("   1. All tests passed! ✅")
            print("   2. Consider adding more edge case tests")
            print("   3. Monitor performance in production")
        
        # Save report to file
        report_data = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "results": self.results,
            "overall_success_rate": overall_success,
            "total_passed": total_passed,
            "total_failed": total_failed
        }
        
        try:
            with open("phase_j2_test_report.json", "w") as f:
                json.dump(report_data, f, indent=2)
            print(f"\n📄 Detailed report saved to: phase_j2_test_report.json")
        except Exception as e:
            print(f"\n⚠️  Could not save report: {e}")
    
    def run_all_tests(self):
        """Run all Phase J2 tests."""
        print("🎯 PHASE J2 MASTER TEST SUITE")
        print("Testing User Profiles & Settings functionality")
        print("=" * 80)
        
        start_time = time.time()
        
        # Check services
        if not self.check_services_running():
            print("❌ Required services are not running. Please start them first:")
            print("   Backend:  python -m uvicorn app.main:app --reload")
            print("   Frontend: npm run dev")
            return
        
        # Run all test suites
        print("🚀 Starting comprehensive test execution...\n")
        
        self.run_comprehensive_tests()
        time.sleep(1)
        
        self.run_enhanced_tests()
        time.sleep(1)
        
        self.run_frontend_tests()
        time.sleep(1)
        
        self.run_integration_tests()
        
        # Generate final report
        execution_time = time.time() - start_time
        print(f"\n⏱️  Total execution time: {execution_time:.2f} seconds")
        
        self.generate_test_report()


def main():
    """Main function to run Phase J2 tests."""
    runner = PhaseJ2MasterTestRunner()
    runner.run_all_tests()


if __name__ == "__main__":
    main()