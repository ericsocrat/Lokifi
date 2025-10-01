"""
K1 - CI Smoke Testing Suite for Lokifi Phase K (Fixed)
Comprehensive automated deployment validation with health checks
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import aiohttp
import websockets

logger = logging.getLogger(__name__)

@dataclass
class SmokeTestResult:
    """Result of a smoke test"""
    test_name: str
    passed: bool
    response_time_ms: float
    status_code: int | None = None
    response_data: dict[str, Any] | None = None
    error_message: str | None = None

class SmokeTestSuite:
    """Comprehensive smoke testing suite for CI/CD"""
    
    def __init__(self, base_url: str | None = None):
        self.base_url = base_url or "http://localhost:8000"
        self.session: aiohttp.ClientSession | None = None
        self.results: list[SmokeTestResult] = []
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def run_http_test(
        self, 
        method: str, 
        endpoint: str, 
        expected_status: int = 200,
        data: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None
    ) -> SmokeTestResult:
        """Run HTTP test and return result"""
        
        if not self.session:
            return SmokeTestResult(
                test_name=f"{method} {endpoint}",
                passed=False,
                response_time_ms=0,
                error_message="Session not initialized"
            )
        
        start_time = time.time()
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == "GET":
                async with self.session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    response_time_ms = (time.time() - start_time) * 1000
                    
                    try:
                        response_data = await response.json()
                    except (ValueError, aiohttp.ContentTypeError):
                        response_data = await response.text()
                    
                    return SmokeTestResult(
                        test_name=f"GET {endpoint}",
                        passed=response.status == expected_status,
                        response_time_ms=response_time_ms,
                        status_code=response.status,
                        response_data=response_data if isinstance(response_data, dict) else {"text": response_data}
                    )
            
            elif method.upper() == "POST":
                async with self.session.post(url, json=data, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    response_time_ms = (time.time() - start_time) * 1000
                    
                    try:
                        response_data = await response.json()
                    except (ValueError, aiohttp.ContentTypeError):
                        response_data = await response.text()
                    
                    return SmokeTestResult(
                        test_name=f"POST {endpoint}",
                        passed=response.status == expected_status,
                        response_time_ms=response_time_ms,
                        status_code=response.status,
                        response_data=response_data if isinstance(response_data, dict) else {"text": response_data}
                    )
            
            else:
                return SmokeTestResult(
                    test_name=f"{method} {endpoint}",
                    passed=False,
                    response_time_ms=0,
                    error_message=f"Unsupported HTTP method: {method}"
                )
        
        except TimeoutError:
            return SmokeTestResult(
                test_name=f"{method} {endpoint}",
                passed=False,
                response_time_ms=(time.time() - start_time) * 1000,
                error_message="Request timeout"
            )
        
        except Exception as e:
            return SmokeTestResult(
                test_name=f"{method} {endpoint}",
                passed=False,
                response_time_ms=(time.time() - start_time) * 1000,
                error_message=str(e)
            )
    
    async def test_health_endpoints(self) -> list[SmokeTestResult]:
        """Test health check endpoints"""
        tests = []
        
        # Test liveness endpoint
        result = await self.run_http_test("GET", "/health/live")
        tests.append(result)
        self.results.append(result)
        
        # Test readiness endpoint
        result = await self.run_http_test("GET", "/health/ready")
        tests.append(result)
        self.results.append(result)
        
        # Test generic health endpoint
        result = await self.run_http_test("GET", "/health")
        tests.append(result)
        self.results.append(result)
        
        return tests
    
    async def test_api_endpoints(self) -> list[SmokeTestResult]:
        """Test core API endpoints"""
        tests = []
        
        # Test root endpoint
        result = await self.run_http_test("GET", "/")
        tests.append(result)
        self.results.append(result)
        
        # Test docs endpoint
        result = await self.run_http_test("GET", "/docs")
        tests.append(result)
        self.results.append(result)
        
        # Test OpenAPI spec
        result = await self.run_http_test("GET", "/openapi.json")
        tests.append(result)
        self.results.append(result)
        
        # Test auth endpoints (expect 422 for missing data)
        result = await self.run_http_test("POST", "/auth/login", expected_status=422)
        tests.append(result)
        self.results.append(result)
        
        return tests
    
    async def test_websocket_connectivity(self) -> SmokeTestResult:
        """Test WebSocket connectivity"""
        start_time = time.time()
        
        try:
            ws_url = self.base_url.replace("http://", "ws://").replace("https://", "wss://")
            ws_url = f"{ws_url}/ws/test"
            
            async with websockets.connect(ws_url, timeout=5) as websocket:
                # Send ping message
                await websocket.send(json.dumps({"type": "ping"}))
                
                # Wait for response
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                response_data = json.loads(response)
                
                response_time_ms = (time.time() - start_time) * 1000
                
                result = SmokeTestResult(
                    test_name="WebSocket connectivity",
                    passed=response_data.get("type") == "pong",
                    response_time_ms=response_time_ms,
                    response_data=response_data
                )
        
        except Exception as e:
            response_time_ms = (time.time() - start_time) * 1000
            result = SmokeTestResult(
                test_name="WebSocket connectivity",
                passed=False,
                response_time_ms=response_time_ms,
                error_message=str(e)
            )
        
        self.results.append(result)
        return result
    
    async def test_database_connectivity(self) -> SmokeTestResult:
        """Test database connectivity through API"""
        result = await self.run_http_test("GET", "/health/database")
        
        if result.status_code != 200:
            # Fallback: test through a simple API endpoint that uses database
            result = await self.run_http_test("GET", "/users/me", expected_status=401)  # Expect auth error, not DB error
        
        self.results.append(result)
        return result
    
    async def test_redis_connectivity(self) -> SmokeTestResult:
        """Test Redis connectivity through API"""
        result = await self.run_http_test("GET", "/health/redis")
        
        if result.status_code != 200:
            # Fallback: test through cache endpoint
            result = await self.run_http_test("GET", "/cache/health")
        
        self.results.append(result)
        return result
    
    async def run_comprehensive_tests(self) -> dict[str, Any]:
        """Run comprehensive smoke test suite"""
        
        print("🧪 Starting comprehensive smoke tests...")
        start_time = time.time()
        
        # Test categories
        test_categories = [
            ("Health Endpoints", self.test_health_endpoints()),
            ("API Endpoints", self.test_api_endpoints()),
            ("WebSocket Connectivity", self.test_websocket_connectivity()),
            ("Database Connectivity", self.test_database_connectivity()),
            ("Redis Connectivity", self.test_redis_connectivity())
        ]
        
        category_results = {}
        total_tests = 0
        passed_tests = 0
        
        for category_name, test_coro in test_categories:
            print(f"\n📋 Testing: {category_name}")
            
            try:
                if asyncio.iscoroutine(test_coro):
                    # Single test
                    result = await test_coro
                    results = [result] if isinstance(result, SmokeTestResult) else result
                else:
                    # Multiple tests
                    results = await test_coro
                
                category_results[category_name] = {
                    "tests": len(results),
                    "passed": sum(1 for r in results if r.passed),
                    "failed": sum(1 for r in results if not r.passed),
                    "avg_response_time": sum(r.response_time_ms for r in results) / len(results) if results else 0,
                    "details": results
                }
                
                total_tests += len(results)
                passed_tests += sum(1 for r in results if r.passed)
                
                for result in results:
                    status = "✅" if result.passed else "❌"
                    print(f"  {status} {result.test_name} ({result.response_time_ms:.1f}ms)")
                    if not result.passed and result.error_message:
                        print(f"      Error: {result.error_message}")
            
            except Exception as e:
                print(f"  ❌ {category_name} failed with error: {e}")
                category_results[category_name] = {
                    "tests": 0,
                    "passed": 0,
                    "failed": 1,
                    "avg_response_time": 0,
                    "error": str(e)
                }
                total_tests += 1
        
        total_time = time.time() - start_time
        
        # Generate summary
        summary = {
            "timestamp": datetime.now().isoformat(),
            "total_time_seconds": total_time,
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": total_tests - passed_tests,
            "success_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0,
            "categories": category_results
        }
        
        # Print summary
        print("\n" + "=" * 50)
        print("🎯 SMOKE TEST SUMMARY")
        print("=" * 50)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {summary['success_rate']:.1f}%")
        print(f"Total Time: {total_time:.2f}s")
        
        if summary['success_rate'] >= 90:
            print("\n🎉 SMOKE TESTS PASSED! System is healthy.")
        elif summary['success_rate'] >= 70:
            print("\n⚠️  SMOKE TESTS MOSTLY PASSED. Some issues detected.")
        else:
            print("\n❌ SMOKE TESTS FAILED. System has significant issues.")
        
        return summary
    
    def generate_report(self, summary: dict[str, Any]) -> str:
        """Generate smoke test report"""
        
        report = f"""# Smoke Test Report
        
## Summary
- **Timestamp**: {summary['timestamp']}
- **Total Tests**: {summary['total_tests']}
- **Passed**: {summary['passed_tests']}
- **Failed**: {summary['failed_tests']}
- **Success Rate**: {summary['success_rate']:.1f}%
- **Total Time**: {summary['total_time_seconds']:.2f}s

## Test Categories

"""
        
        for category, results in summary['categories'].items():
            status_icon = "✅" if results.get('passed', 0) == results.get('tests', 0) else "❌"
            report += f"### {category} {status_icon}\n"
            report += f"- Tests: {results.get('tests', 0)}\n"
            report += f"- Passed: {results.get('passed', 0)}\n"
            report += f"- Failed: {results.get('failed', 0)}\n"
            report += f"- Avg Response Time: {results.get('avg_response_time', 0):.1f}ms\n\n"
        
        return report

async def main():
    """Run smoke tests"""
    async with SmokeTestSuite() as suite:
        summary = await suite.run_comprehensive_tests()
        
        # Generate and save report
        report = suite.generate_report(summary)
        with open("smoke_test_report.md", "w") as f:
            f.write(report)
        
        print("\n📊 Report saved to: smoke_test_report.md")
        
        # Exit with appropriate code
        success_rate = summary.get('success_rate', 0)
        if success_rate >= 90:
            exit(0)  # Success
        elif success_rate >= 70:
            exit(1)  # Warning - some tests failed
        else:
            exit(2)  # Critical - many tests failed

if __name__ == "__main__":
    asyncio.run(main())