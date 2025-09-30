#!/usr/bin/env python3
"""
Comprehensive Stress Testing Suite for Fynix Phase K
Tests system performance, reliability, and scalability under extreme conditions
"""

import asyncio
import json
import logging
import random
import string
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import aiohttp
import psutil
import websockets

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class StressTestResult:
    """Results from a stress test"""
    test_name: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time: float
    max_response_time: float
    min_response_time: float
    requests_per_second: float
    memory_usage_mb: float
    cpu_usage_percent: float
    errors: list[str]
    duration_seconds: float

class ComprehensiveStressTester:
    """Advanced stress testing framework"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.websocket_url = base_url.replace("http", "ws")
        self.results: list[StressTestResult] = []
        self.session: aiohttp.ClientSession | None = None
        
    async def initialize(self):
        """Initialize the stress tester"""
        connector = aiohttp.TCPConnector(
            limit=1000,
            limit_per_host=500,
            keepalive_timeout=30,
            enable_cleanup_closed=True
        )
        self.session = aiohttp.ClientSession(connector=connector)
        logger.info("🚀 Stress tester initialized")
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
        logger.info("🧹 Stress tester cleanup complete")
    
    def _get_system_metrics(self) -> dict[str, float]:
        """Get current system metrics"""
        return {
            "memory_mb": psutil.virtual_memory().used / (1024 * 1024),
            "cpu_percent": psutil.cpu_percent(),
            "disk_usage": psutil.disk_usage('/').percent,
            "network_sent": psutil.net_io_counters().bytes_sent,
            "network_recv": psutil.net_io_counters().bytes_recv
        }
    
    async def _make_http_request(
        self, 
        method: str, 
        endpoint: str, 
        data: dict | None = None,
        headers: dict | None = None
    ) -> dict[str, Any]:
        """Make a single HTTP request"""
        start_time = time.time()
        try:
            url = f"{self.base_url}{endpoint}"
            
            if method.upper() == "GET":
                async with self.session.get(url, headers=headers) as response:
                    result = await response.json() if response.content_type == 'application/json' else await response.text()
                    return {
                        "success": True,
                        "status": response.status,
                        "response_time": time.time() - start_time,
                        "data": result,
                        "error": None
                    }
            elif method.upper() == "POST":
                async with self.session.post(url, json=data, headers=headers) as response:
                    result = await response.json() if response.content_type == 'application/json' else await response.text()
                    return {
                        "success": True,
                        "status": response.status,
                        "response_time": time.time() - start_time,
                        "data": result,
                        "error": None
                    }
        except Exception as e:
            return {
                "success": False,
                "status": 0,
                "response_time": time.time() - start_time,
                "data": None,
                "error": str(e)
            }
    
    async def test_api_load(
        self, 
        endpoint: str, 
        concurrent_requests: int = 100,
        total_requests: int = 1000,
        method: str = "GET",
        data: dict | None = None
    ) -> StressTestResult:
        """Test API endpoint under heavy load"""
        
        logger.info(f"🔥 Starting API load test: {endpoint}")
        logger.info(f"📊 Concurrent: {concurrent_requests}, Total: {total_requests}")
        
        start_time = time.time()
        start_metrics = self._get_system_metrics()
        
        semaphore = asyncio.Semaphore(concurrent_requests)
        response_times = []
        errors = []
        successful = 0
        failed = 0
        
        async def make_request():
            nonlocal successful, failed
            async with semaphore:
                result = await self._make_http_request(method, endpoint, data)
                response_times.append(result["response_time"])
                
                if result["success"] and 200 <= result["status"] < 300:
                    successful += 1
                else:
                    failed += 1
                    if result["error"]:
                        errors.append(result["error"])
        
        # Execute requests
        tasks = [make_request() for _ in range(total_requests)]
        await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        end_metrics = self._get_system_metrics()
        duration = end_time - start_time
        
        result = StressTestResult(
            test_name=f"API Load Test: {endpoint}",
            total_requests=total_requests,
            successful_requests=successful,
            failed_requests=failed,
            avg_response_time=sum(response_times) / len(response_times) if response_times else 0,
            max_response_time=max(response_times) if response_times else 0,
            min_response_time=min(response_times) if response_times else 0,
            requests_per_second=total_requests / duration,
            memory_usage_mb=end_metrics["memory_mb"] - start_metrics["memory_mb"],
            cpu_usage_percent=end_metrics["cpu_percent"],
            errors=list(set(errors[:10])),  # Keep unique errors, max 10
            duration_seconds=duration
        )
        
        self.results.append(result)
        logger.info(f"✅ API load test completed: {successful}/{total_requests} successful")
        return result
    
    async def test_websocket_connections(
        self, 
        concurrent_connections: int = 100,
        messages_per_connection: int = 10,
        connection_duration: int = 30
    ) -> StressTestResult:
        """Test WebSocket connection scaling"""
        
        logger.info("🔥 Starting WebSocket stress test")
        logger.info(f"📊 Connections: {concurrent_connections}, Messages/conn: {messages_per_connection}")
        
        start_time = time.time()
        start_metrics = self._get_system_metrics()
        
        successful_connections = 0
        failed_connections = 0
        total_messages_sent = 0
        total_messages_received = 0
        errors = []
        response_times = []
        
        async def websocket_client(client_id: int):
            nonlocal successful_connections, failed_connections, total_messages_sent, total_messages_received
            
            try:
                uri = f"{self.websocket_url}/ws/test_user_{client_id}"
                
                async with websockets.connect(uri) as websocket:
                    successful_connections += 1
                    
                    # Send messages
                    for i in range(messages_per_connection):
                        message = {
                            "type": "test_message",
                            "client_id": client_id,
                            "message_id": i,
                            "timestamp": time.time(),
                            "data": ''.join(random.choices(string.ascii_letters, k=100))
                        }
                        
                        send_start = time.time()
                        await websocket.send(json.dumps(message))
                        total_messages_sent += 1
                        
                        # Wait for response (with timeout)
                        try:
                            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                            response_time = time.time() - send_start
                            response_times.append(response_time)
                            total_messages_received += 1
                        except TimeoutError:
                            errors.append(f"Timeout waiting for response from client {client_id}")
                        
                        # Small delay between messages
                        await asyncio.sleep(0.1)
                    
                    # Keep connection open for specified duration
                    await asyncio.sleep(connection_duration)
                        
            except Exception as e:
                failed_connections += 1
                errors.append(f"Client {client_id}: {str(e)}")
        
        # Execute WebSocket clients
        tasks = [websocket_client(i) for i in range(concurrent_connections)]
        await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        end_metrics = self._get_system_metrics()
        duration = end_time - start_time
        
        result = StressTestResult(
            test_name="WebSocket Connections Test",
            total_requests=concurrent_connections * messages_per_connection,
            successful_requests=total_messages_received,
            failed_requests=(concurrent_connections * messages_per_connection) - total_messages_received,
            avg_response_time=sum(response_times) / len(response_times) if response_times else 0,
            max_response_time=max(response_times) if response_times else 0,
            min_response_time=min(response_times) if response_times else 0,
            requests_per_second=total_messages_received / duration,
            memory_usage_mb=end_metrics["memory_mb"] - start_metrics["memory_mb"],
            cpu_usage_percent=end_metrics["cpu_percent"],
            errors=list(set(errors[:10])),
            duration_seconds=duration
        )
        
        self.results.append(result)
        logger.info(f"✅ WebSocket test completed: {successful_connections}/{concurrent_connections} connections")
        return result
    
    async def test_database_performance(self) -> StressTestResult:
        """Test database performance under load"""
        
        logger.info("🔥 Starting database performance test")
        
        # Test various database operations
        endpoints_to_test = [
            ("/api/auth/register", "POST", {"username": "test_user", "email": "test@example.com", "password": "testpass123"}),
            ("/api/auth/login", "POST", {"username": "test_user", "password": "testpass123"}),
            ("/api/profile/me", "GET", None),
            ("/api/conversations", "GET", None),
            ("/api/notifications", "GET", None),
        ]
        
        all_results = []
        
        for endpoint, method, data in endpoints_to_test:
            result = await self.test_api_load(
                endpoint=endpoint,
                concurrent_requests=50,
                total_requests=500,
                method=method,
                data=data
            )
            all_results.append(result)
        
        # Aggregate results
        total_requests = sum(r.total_requests for r in all_results)
        successful_requests = sum(r.successful_requests for r in all_results)
        failed_requests = sum(r.failed_requests for r in all_results)
        avg_response_time = sum(r.avg_response_time for r in all_results) / len(all_results)
        
        result = StressTestResult(
            test_name="Database Performance Test",
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            avg_response_time=avg_response_time,
            max_response_time=max(r.max_response_time for r in all_results),
            min_response_time=min(r.min_response_time for r in all_results),
            requests_per_second=sum(r.requests_per_second for r in all_results),
            memory_usage_mb=sum(r.memory_usage_mb for r in all_results),
            cpu_usage_percent=max(r.cpu_usage_percent for r in all_results),
            errors=[error for r in all_results for error in r.errors],
            duration_seconds=max(r.duration_seconds for r in all_results)
        )
        
        self.results.append(result)
        return result
    
    async def test_memory_leak_detection(self, duration_minutes: int = 5) -> StressTestResult:
        """Test for memory leaks over extended period"""
        
        logger.info(f"🔥 Starting memory leak detection test ({duration_minutes} minutes)")
        
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)
        
        memory_readings = []
        successful_requests = 0
        failed_requests = 0
        errors = []
        
        while time.time() < end_time:
            # Make continuous requests
            batch_result = await self.test_api_load(
                endpoint="/api/health",
                concurrent_requests=20,
                total_requests=100,
                method="GET"
            )
            
            successful_requests += batch_result.successful_requests
            failed_requests += batch_result.failed_requests
            errors.extend(batch_result.errors)
            
            # Record memory usage
            current_memory = psutil.virtual_memory().used / (1024 * 1024)
            memory_readings.append(current_memory)
            
            await asyncio.sleep(10)  # 10 second intervals
        
        # Analyze memory trend
        memory_increase = memory_readings[-1] - memory_readings[0] if memory_readings else 0
        
        result = StressTestResult(
            test_name=f"Memory Leak Detection ({duration_minutes}min)",
            total_requests=successful_requests + failed_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            avg_response_time=0,  # Not measured in this test
            max_response_time=0,
            min_response_time=0,
            requests_per_second=0,
            memory_usage_mb=memory_increase,
            cpu_usage_percent=psutil.cpu_percent(),
            errors=list(set(errors[:10])),
            duration_seconds=time.time() - start_time
        )
        
        self.results.append(result)
        logger.info(f"✅ Memory leak test completed. Memory change: {memory_increase:.2f} MB")
        return result
    
    def generate_report(self) -> str:
        """Generate comprehensive stress test report"""
        
        report = [
            "=" * 80,
            "🚀 COMPREHENSIVE STRESS TEST REPORT",
            "=" * 80,
            f"📅 Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"🧪 Total Tests: {len(self.results)}",
            "",
            "📊 SUMMARY METRICS:",
            "-" * 40
        ]
        
        total_requests = sum(r.total_requests for r in self.results)
        total_successful = sum(r.successful_requests for r in self.results)
        total_failed = sum(r.failed_requests for r in self.results)
        
        report.extend([
            f"Total Requests: {total_requests:,}",
            f"Successful: {total_successful:,} ({(total_successful/total_requests*100):.1f}%)",
            f"Failed: {total_failed:,} ({(total_failed/total_requests*100):.1f}%)",
            f"Average Response Time: {sum(r.avg_response_time for r in self.results)/len(self.results):.3f}s",
            ""
        ])
        
        # Individual test results
        report.append("🔍 DETAILED TEST RESULTS:")
        report.append("-" * 40)
        
        for result in self.results:
            success_rate = (result.successful_requests / result.total_requests * 100) if result.total_requests > 0 else 0
            
            report.extend([
                f"\n🧪 {result.test_name}",
                f"   Requests: {result.total_requests:,} | Success Rate: {success_rate:.1f}%",
                f"   Response Time: Avg {result.avg_response_time:.3f}s | Max {result.max_response_time:.3f}s",
                f"   Throughput: {result.requests_per_second:.1f} req/s",
                f"   Memory Impact: {result.memory_usage_mb:.1f} MB",
                f"   Duration: {result.duration_seconds:.1f}s"
            ])
            
            if result.errors:
                report.append(f"   ❌ Errors: {len(result.errors)} unique errors")
                for error in result.errors[:3]:  # Show first 3 errors
                    report.append(f"      - {error}")
        
        # Performance analysis
        report.extend([
            "",
            "📈 PERFORMANCE ANALYSIS:",
            "-" * 40
        ])
        
        # Find performance bottlenecks
        slowest_test = max(self.results, key=lambda r: r.avg_response_time)
        highest_failure_rate = max(self.results, key=lambda r: r.failed_requests / r.total_requests if r.total_requests > 0 else 0)
        
        report.extend([
            f"🐌 Slowest Test: {slowest_test.test_name} ({slowest_test.avg_response_time:.3f}s avg)",
            f"⚠️  Highest Failure Rate: {highest_failure_rate.test_name} ({(highest_failure_rate.failed_requests/highest_failure_rate.total_requests*100):.1f}%)",
            ""
        ])
        
        # Recommendations
        report.extend([
            "🎯 OPTIMIZATION RECOMMENDATIONS:",
            "-" * 40,
            "1. Monitor endpoints with >100ms average response time",
            "2. Investigate any test with >5% failure rate",
            "3. Consider caching for frequently accessed endpoints",
            "4. Monitor memory usage trends for potential leaks",
            "5. Implement circuit breakers for failing services",
            "",
            "=" * 80
        ])
        
        return "\n".join(report)

async def run_comprehensive_stress_test():
    """Run the complete stress testing suite"""
    
    tester = ComprehensiveStressTester()
    await tester.initialize()
    
    try:
        logger.info("🚀 Starting Comprehensive Stress Test Suite")
        
        # 1. Basic API Load Tests
        await tester.test_api_load("/api/health", concurrent_requests=50, total_requests=500)
        await tester.test_api_load("/api/mock/ohlc", concurrent_requests=30, total_requests=300)
        
        # 2. WebSocket Stress Test
        await tester.test_websocket_connections(
            concurrent_connections=50, 
            messages_per_connection=5,
            connection_duration=10
        )
        
        # 3. Database Performance Test
        await tester.test_database_performance()
        
        # 4. Memory Leak Detection (shorter duration for demo)
        await tester.test_memory_leak_detection(duration_minutes=1)
        
        # Generate and display report
        report = tester.generate_report()
        print(report)
        
        # Save report to file
        with open("stress_test_report.txt", "w") as f:
            f.write(report)
        
        logger.info("📄 Stress test report saved to: stress_test_report.txt")
        
    except Exception as e:
        logger.error(f"❌ Stress test failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await tester.cleanup()

if __name__ == "__main__":
    asyncio.run(run_comprehensive_stress_test())