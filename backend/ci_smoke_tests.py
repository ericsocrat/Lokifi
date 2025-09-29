#!/usr/bin/env python3
"""
K1 - CI Smoke Test Suite for Fynix Phase K
Automated smoke tests that verify core functionality after deployment
"""

import asyncio
import aiohttp
import pytest
import json
import time
import os
from typing import Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class SmokeTestResult:
    """Result of a smoke test"""
    test_name: str
    success: bool
    response_time: float
    status_code: Optional[int] = None
    error_message: Optional[str] = None
    response_data: Optional[Dict[str, Any]] = None

class SmokeTestSuite:
    """Comprehensive smoke test suite for Phase K"""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.getenv('FYNIX_BASE_URL', 'http://localhost:8000')
        self.results: list[SmokeTestResult] = []
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def setup(self):
        """Setup test session"""
        connector = aiohttp.TCPConnector(limit=100)
        timeout = aiohttp.ClientTimeout(total=30)
        self.session = aiohttp.ClientSession(connector=connector, timeout=timeout)
    
    async def teardown(self):
        """Cleanup test session"""
        if self.session:
            await self.session.close()
    
    async def make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict] = None,
        headers: Optional[Dict] = None,
        expected_status: int = 200
    ) -> SmokeTestResult:
        """Make HTTP request and measure response"""
        
        url = f"{self.base_url}{endpoint}"
        test_name = f"{method} {endpoint}"
        start_time = time.time()
        
        try:
            if method.upper() == 'GET':
                async with self.session.get(url, headers=headers) as response:
                    response_time = time.time() - start_time
                    response_data = await response.json() if response.content_type == 'application/json' else await response.text()
                    
                    return SmokeTestResult(
                        test_name=test_name,
                        success=response.status == expected_status,
                        response_time=response_time,
                        status_code=response.status,
                        response_data=response_data
                    )
            
            elif method.upper() == 'POST':
                async with self.session.post(url, json=data, headers=headers) as response:
                    response_time = time.time() - start_time
                    response_data = await response.json() if response.content_type == 'application/json' else await response.text()
                    
                    return SmokeTestResult(
                        test_name=test_name,
                        success=response.status == expected_status,
                        response_time=response_time,
                        status_code=response.status,
                        response_data=response_data
                    )
        
        except Exception as e:
            response_time = time.time() - start_time
            return SmokeTestResult(
                test_name=test_name,
                success=False,
                response_time=response_time,
                error_message=str(e)
            )
    
    async def test_health_endpoints(self):
        """Test all health check endpoints"""
        
        # Basic health check
        result = await self.make_request('GET', '/api/health')
        self.results.append(result)
        
        # Readiness check
        result = await self.make_request('GET', '/api/health/ready')
        self.results.append(result)
        
        # Liveness check  
        result = await self.make_request('GET', '/api/health/live')
        self.results.append(result)
    
    async def test_market_data_endpoints(self):
        """Test market data endpoints (mocked)"""
        
        # Test OHLC endpoint
        result = await self.make_request('GET', '/api/ohlc?symbol=BTCUSD&timeframe=1h&limit=10')
        self.results.append(result)
        
        # Test mock OHLC endpoint
        result = await self.make_request('GET', '/api/mock/ohlc?symbol=BTCUSD&timeframe=1h&limit=10')
        self.results.append(result)
        
        # Test news endpoint
        result = await self.make_request('GET', '/api/news')
        self.results.append(result)
    
    async def test_auth_endpoints(self):
        """Test authentication endpoints"""
        
        # Test unauthenticated /me endpoint (should return 401)
        result = await self.make_request('GET', '/api/auth/me', expected_status=401)
        self.results.append(result)
        
        # Test registration endpoint (may fail due to duplicate, but should not crash)
        test_user_data = {
            "username": f"smoke_test_user_{int(time.time())}",
            "email": f"smoke_test_{int(time.time())}@example.com",
            "password": "SmokeTest123!"
        }
        
        result = await self.make_request('POST', '/api/auth/register', data=test_user_data, expected_status=201)
        if result.status_code == 400:  # User might already exist
            result.success = True  # Consider this acceptable for smoke test
        self.results.append(result)
    
    async def test_portfolio_endpoints(self):
        """Test portfolio endpoints"""
        
        # Test portfolio endpoint (may require auth, but shouldn't crash)
        result = await self.make_request('GET', '/api/portfolio')
        # Accept both 200 (if anonymous access allowed) and 401 (if auth required)
        if result.status_code in [200, 401]:
            result.success = True
        self.results.append(result)
    
    async def test_notification_endpoints(self):
        """Test notification endpoints"""
        
        # Test notifications endpoint
        result = await self.make_request('GET', '/api/notifications')
        # Accept both 200 and 401
        if result.status_code in [200, 401]:
            result.success = True
        self.results.append(result)
    
    async def test_websocket_connectivity(self):
        """Test WebSocket connectivity (basic connection test)"""
        
        import websockets
        
        ws_url = self.base_url.replace('http', 'ws') + '/ws/smoke_test'
        test_name = "WebSocket Connection Test"
        start_time = time.time()
        
        try:
            # Try to connect to WebSocket
            async with websockets.connect(ws_url, timeout=10) as websocket:
                # Send a test message
                await websocket.send(json.dumps({"type": "ping", "data": "smoke_test"}))
                
                # Wait for response or timeout
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    response_time = time.time() - start_time
                    
                    result = SmokeTestResult(
                        test_name=test_name,
                        success=True,
                        response_time=response_time,
                        response_data={"websocket_response": response}
                    )
                except asyncio.TimeoutError:
                    result = SmokeTestResult(
                        test_name=test_name,
                        success=True,  # Connection worked, timeout is acceptable
                        response_time=time.time() - start_time,
                        error_message="WebSocket response timeout (connection successful)"
                    )
        
        except Exception as e:
            result = SmokeTestResult(
                test_name=test_name,
                success=False,
                response_time=time.time() - start_time,
                error_message=f"WebSocket connection failed: {str(e)}"
            )
        
        self.results.append(result)
    
    async def test_monitoring_endpoints(self):
        """Test monitoring endpoints"""
        
        # Test monitoring health
        result = await self.make_request('GET', '/monitoring/health')
        if result.status_code in [200, 404]:  # 404 acceptable if endpoint not available
            result.success = True
        self.results.append(result)
        
        # Test metrics endpoint
        result = await self.make_request('GET', '/monitoring/metrics')
        if result.status_code in [200, 404]:
            result.success = True
        self.results.append(result)
    
    async def run_all_tests(self):
        """Run complete smoke test suite"""
        
        print("🚀 Starting Fynix Phase K Smoke Test Suite")
        print(f"🎯 Target URL: {self.base_url}")
        print("=" * 60)
        
        await self.setup()
        
        try:
            # Core health tests (critical)
            print("🏥 Testing health endpoints...")
            await self.test_health_endpoints()
            
            # API functionality tests
            print("📊 Testing market data endpoints...")
            await self.test_market_data_endpoints()
            
            print("🔐 Testing auth endpoints...")
            await self.test_auth_endpoints()
            
            print("💼 Testing portfolio endpoints...")
            await self.test_portfolio_endpoints()
            
            print("🔔 Testing notification endpoints...")
            await self.test_notification_endpoints()
            
            print("📡 Testing WebSocket connectivity...")
            await self.test_websocket_connectivity()
            
            print("📈 Testing monitoring endpoints...")
            await self.test_monitoring_endpoints()
            
        finally:
            await self.teardown()
        
        # Generate report
        await self.generate_report()
    
    async def generate_report(self):
        """Generate smoke test report"""
        
        total_tests = len(self.results)
        successful_tests = sum(1 for r in self.results if r.success)
        failed_tests = total_tests - successful_tests
        
        avg_response_time = sum(r.response_time for r in self.results) / total_tests if total_tests > 0 else 0
        
        print("\n" + "=" * 60)
        print("📊 SMOKE TEST RESULTS")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"✅ Successful: {successful_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"📈 Success Rate: {(successful_tests/total_tests*100):.1f}%")
        print(f"⏱️  Average Response Time: {avg_response_time:.3f}s")
        
        print(f"\n📋 DETAILED RESULTS:")
        print("-" * 60)
        
        for result in self.results:
            status_icon = "✅" if result.success else "❌"
            status_code = f"[{result.status_code}]" if result.status_code else ""
            response_time = f"{result.response_time:.3f}s"
            
            print(f"{status_icon} {result.test_name:<40} {status_code:<5} {response_time}")
            
            if not result.success and result.error_message:
                print(f"    Error: {result.error_message}")
        
        # Critical failures
        critical_failures = [r for r in self.results if not r.success and 'health' in r.test_name.lower()]
        
        if critical_failures:
            print(f"\n🚨 CRITICAL FAILURES:")
            print("-" * 60)
            for failure in critical_failures:
                print(f"❌ {failure.test_name}: {failure.error_message or f'Status {failure.status_code}'}")
        
        # Performance warnings
        slow_tests = [r for r in self.results if r.response_time > 2.0]
        if slow_tests:
            print(f"\n⚠️  PERFORMANCE WARNINGS (>2s):")
            print("-" * 60)
            for test in slow_tests:
                print(f"🐌 {test.test_name}: {test.response_time:.3f}s")
        
        print(f"\n🎯 OVERALL STATUS: {'✅ PASS' if failed_tests == 0 else '❌ FAIL'}")
        
        # Exit with appropriate code for CI
        if failed_tests > 0:
            print(f"\n💡 Smoke tests detected {failed_tests} failures - check logs above")
            exit(1)
        else:
            print(f"\n🎉 All smoke tests passed! System is ready for deployment.")
            exit(0)

async def main():
    """Main entry point"""
    
    # Get base URL from environment or use default
    base_url = os.getenv('FYNIX_BASE_URL', 'http://localhost:8000')
    
    # Create and run smoke test suite
    smoke_tester = SmokeTestSuite(base_url)
    await smoke_tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())

# For pytest integration
@pytest.mark.asyncio
async def test_smoke_suite():
    """PyTest wrapper for smoke tests"""
    smoke_tester = SmokeTestSuite()
    await smoke_tester.run_all_tests()
    
    # Assert no critical failures
    critical_failures = [r for r in smoke_tester.results if not r.success and 'health' in r.test_name.lower()]
    assert len(critical_failures) == 0, f"Critical smoke test failures: {[f.test_name for f in critical_failures]}"
    
    # Assert overall success rate > 80%
    success_rate = sum(1 for r in smoke_tester.results if r.success) / len(smoke_tester.results)
    assert success_rate > 0.8, f"Smoke test success rate too low: {success_rate:.1%}"