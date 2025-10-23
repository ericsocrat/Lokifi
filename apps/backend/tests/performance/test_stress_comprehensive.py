#!/usr/bin/env python3
"""
Advanced Stress Testing Framework for Lokifi
Implements comprehensive load testing scenarios with detailed metrics
"""

import asyncio
import gc
import json
import logging
import random
import statistics
import time
from dataclasses import asdict, dataclass
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
    """Results from a stress test run"""
    test_name: str
    duration_seconds: float
    total_requests: int
    successful_requests: int
    failed_requests: int
    requests_per_second: float
    avg_response_time_ms: float
    min_response_time_ms: float
    max_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    error_rate_percent: float
    memory_start_mb: float
    memory_end_mb: float
    memory_peak_mb: float
    cpu_avg_percent: float
    errors: list[str]

@dataclass 
class LoadTestConfig:
    """Configuration for load testing"""
    name: str
    concurrent_users: int
    total_requests: int
    duration_seconds: int
    endpoint: str
    method: str = "GET"
    payload: dict | None = None
    headers: dict | None = None
    ramp_up_seconds: int = 0

class AdvancedStressTester:
    """Advanced stress testing framework"""
    
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.results: list[StressTestResult] = []
        self.session: aiohttp.ClientSession | None = None
        
    async def initialize(self):
        """Initialize the stress tester"""
        connector = aiohttp.TCPConnector(
            limit=1000,  # Total connection pool size
            limit_per_host=100,  # Per-host connection limit
            ttl_dns_cache=300,  # DNS cache TTL
            use_dns_cache=True,
        )
        
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={"User-Agent": "Lokifi-StressTester/1.0"}
        )
        
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
            
    async def run_load_test(self, config: LoadTestConfig) -> StressTestResult:
        """Run a single load test configuration"""
        
        print(f"\n🔥 Starting Load Test: {config.name}")
        print(f"   👥 Concurrent Users: {config.concurrent_users}")
        print(f"   📊 Total Requests: {config.total_requests}")  
        print(f"   ⏱️  Duration: {config.duration_seconds}s")
        print(f"   🎯 Endpoint: {config.endpoint}")
        
        # Memory and CPU monitoring
        process = psutil.Process()
        memory_start = process.memory_info().rss / 1024 / 1024  # MB
        memory_peak = memory_start
        cpu_samples = []
        
        # Test tracking
        response_times = []
        errors = []
        successful_requests = 0
        failed_requests = 0
        
        start_time = time.time()
        end_time = start_time + config.duration_seconds
        
        async def make_request(session: aiohttp.ClientSession, semaphore: asyncio.Semaphore) -> tuple[bool, float, str | None]:
            """Make a single HTTP request"""
            async with semaphore:
                request_start = time.time()
                try:
                    url = f"{self.base_url}{config.endpoint}"
                    
                    if config.method.upper() == "GET":
                        async with session.get(url, headers=config.headers) as response:
                            await response.text()  # Consume response
                            success = 200 <= response.status < 400
                    
                    elif config.method.upper() == "POST":
                        async with session.post(url, json=config.payload, headers=config.headers) as response:
                            await response.text()
                            success = 200 <= response.status < 400
                    
                    else:
                        raise ValueError(f"Unsupported method: {config.method}")
                    
                    request_time = (time.time() - request_start) * 1000  # ms
                    return success, request_time, None
                    
                except Exception as e:
                    request_time = (time.time() - request_start) * 1000
                    return False, request_time, str(e)
        
        # Create semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(config.concurrent_users)
        
        # Generate requests
        tasks = []
        requests_sent = 0
        
        while time.time() < end_time and requests_sent < config.total_requests:
            # Ramp-up logic
            if config.ramp_up_seconds > 0:
                elapsed = time.time() - start_time
                max_concurrent = min(
                    config.concurrent_users,
                    int((elapsed / config.ramp_up_seconds) * config.concurrent_users) + 1
                )
                current_concurrent = len([t for t in tasks if not t.done()])
                
                if current_concurrent >= max_concurrent:
                    await asyncio.sleep(0.01)  # Small delay
                    continue
            
            # Create request task
            task = asyncio.create_task(make_request(self.session, semaphore))
            tasks.append(task)
            requests_sent += 1
            
            # Monitor system resources
            try:
                current_memory = process.memory_info().rss / 1024 / 1024
                memory_peak = max(memory_peak, current_memory)
                cpu_samples.append(process.cpu_percent())
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass  # Skip if monitoring fails
            
            # Small delay to prevent overwhelming
            await asyncio.sleep(0.001)
        
        # Wait for all tasks to complete
        print(f"   ⏳ Waiting for {len(tasks)} requests to complete...")
        
        for i, task in enumerate(asyncio.as_completed(tasks)):
            try:
                success, response_time, error = await task
                
                response_times.append(response_time)
                
                if success:
                    successful_requests += 1
                else:
                    failed_requests += 1
                    if error:
                        errors.append(error[:200])  # Limit error message length
                        
                # Progress reporting
                if (i + 1) % 100 == 0 or (i + 1) == len(tasks):
                    completed = i + 1
                    progress = (completed / len(tasks)) * 100
                    print(f"   📈 Progress: {completed}/{len(tasks)} ({progress:.1f}%)")
                    
            except Exception as e:
                failed_requests += 1
                errors.append(f"Task error: {str(e)[:200]}")
        
        # Calculate final metrics
        actual_duration = time.time() - start_time
        memory_end = process.memory_info().rss / 1024 / 1024
        
        # Response time statistics
        if response_times:
            avg_response_time = statistics.mean(response_times)
            min_response_time = min(response_times)
            max_response_time = max(response_times)
            p95_response_time = statistics.quantiles(response_times, n=20)[18]  # 95th percentile
            p99_response_time = statistics.quantiles(response_times, n=100)[98]  # 99th percentile
        else:
            avg_response_time = min_response_time = max_response_time = 0
            p95_response_time = p99_response_time = 0
            
        total_requests_made = successful_requests + failed_requests
        rps = total_requests_made / actual_duration if actual_duration > 0 else 0
        error_rate = (failed_requests / total_requests_made * 100) if total_requests_made > 0 else 0
        cpu_avg = statistics.mean(cpu_samples) if cpu_samples else 0
        
        # Create result
        result = StressTestResult(
            test_name=config.name,
            duration_seconds=actual_duration,
            total_requests=total_requests_made,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            requests_per_second=rps,
            avg_response_time_ms=avg_response_time,
            min_response_time_ms=min_response_time,
            max_response_time_ms=max_response_time,
            p95_response_time_ms=p95_response_time,
            p99_response_time_ms=p99_response_time,
            error_rate_percent=error_rate,
            memory_start_mb=memory_start,
            memory_end_mb=memory_end,
            memory_peak_mb=memory_peak,
            cpu_avg_percent=cpu_avg,
            errors=list(set(errors))[:10]  # Unique errors, max 10
        )
        
        self.results.append(result)
        
        # Print results
        print(f"\n✅ {config.name} Complete:")
        print(f"   📊 Requests: {successful_requests}/{total_requests_made} success ({error_rate:.1f}% error)")
        print(f"   🚀 RPS: {rps:.1f}")
        print(f"   ⚡ Avg Response: {avg_response_time:.1f}ms")
        print(f"   🎯 P95 Response: {p95_response_time:.1f}ms")
        print(f"   💾 Memory: {memory_start:.1f}MB → {memory_end:.1f}MB (peak: {memory_peak:.1f}MB)")
        print(f"   🖥️  CPU Avg: {cpu_avg:.1f}%")
        
        if errors:
            print(f"   ❌ Sample Errors ({len(errors)} unique):")
            for error in errors[:3]:
                print(f"      • {error}")
        
        return result
    
    async def run_websocket_load_test(self, concurrent_connections: int, duration_seconds: int) -> StressTestResult:
        """Run WebSocket load test"""
        
        print("\n🌐 Starting WebSocket Load Test")
        print(f"   👥 Concurrent Connections: {concurrent_connections}")
        print(f"   ⏱️  Duration: {duration_seconds}s")
        
        successful_connections = 0
        failed_connections = 0
        messages_sent = 0
        messages_received = 0
        response_times = []
        errors = []
        
        process = psutil.Process()
        memory_start = process.memory_info().rss / 1024 / 1024
        memory_peak = memory_start
        cpu_samples = []
        
        start_time = time.time()
        end_time = start_time + duration_seconds
        
        async def websocket_client():
            """Individual WebSocket client"""
            nonlocal successful_connections, failed_connections, messages_sent, messages_received
            
            try:
                uri = "ws://localhost:8000/ws/test"
                
                async with websockets.connect(uri) as websocket:
                    successful_connections += 1
                    
                    # Send messages periodically
                    client_start = time.time()
                    while time.time() < end_time:
                        try:
                            # Send message
                            message = {"type": "ping", "timestamp": time.time(), "data": f"test-{random.randint(1, 1000)}"}
                            send_time = time.time()
                            await websocket.send(json.dumps(message))
                            messages_sent += 1
                            
                            # Wait for response (with timeout)
                            try:
                                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                                recv_time = time.time()
                                response_times.append((recv_time - send_time) * 1000)
                                messages_received += 1
                            except TimeoutError:
                                errors.append("WebSocket receive timeout")
                            
                            await asyncio.sleep(random.uniform(0.5, 2.0))  # Variable delay
                            
                        except Exception as e:
                            errors.append(f"WebSocket send error: {e!s}")
                            break
                            
            except Exception as e:
                failed_connections += 1
                errors.append(f"WebSocket connection error: {e!s}")
        
        # Start all WebSocket clients
        tasks = [asyncio.create_task(websocket_client()) for _ in range(concurrent_connections)]
        
        # Monitor progress
        while time.time() < end_time:
            await asyncio.sleep(1)
            
            # Monitor resources
            try:
                current_memory = process.memory_info().rss / 1024 / 1024
                memory_peak = max(memory_peak, current_memory)
                cpu_samples.append(process.cpu_percent())
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
            
            print(f"   📊 Connections: {successful_connections}/{concurrent_connections}, Messages: {messages_sent}→{messages_received}")
        
        # Wait for cleanup
        for task in tasks:
            if not task.done():
                task.cancel()
        
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # Calculate metrics
        actual_duration = time.time() - start_time
        memory_end = process.memory_info().rss / 1024 / 1024
        
        total_connections = successful_connections + failed_connections
        connection_success_rate = (successful_connections / total_connections * 100) if total_connections > 0 else 0
        message_success_rate = (messages_received / messages_sent * 100) if messages_sent > 0 else 0
        
        avg_response_time = statistics.mean(response_times) if response_times else 0
        cpu_avg = statistics.mean(cpu_samples) if cpu_samples else 0
        
        result = StressTestResult(
            test_name="WebSocket Load Test",
            duration_seconds=actual_duration,
            total_requests=messages_sent,
            successful_requests=messages_received,
            failed_requests=messages_sent - messages_received,
            requests_per_second=messages_sent / actual_duration if actual_duration > 0 else 0,
            avg_response_time_ms=avg_response_time,
            min_response_time_ms=min(response_times) if response_times else 0,
            max_response_time_ms=max(response_times) if response_times else 0,
            p95_response_time_ms=statistics.quantiles(response_times, n=20)[18] if len(response_times) > 20 else 0,
            p99_response_time_ms=statistics.quantiles(response_times, n=100)[98] if len(response_times) > 100 else 0,
            error_rate_percent=100 - message_success_rate,
            memory_start_mb=memory_start,
            memory_end_mb=memory_end,
            memory_peak_mb=memory_peak,
            cpu_avg_percent=cpu_avg,
            errors=list(set(errors))[:10]
        )
        
        self.results.append(result)
        
        print("\n✅ WebSocket Load Test Complete:")
        print(f"   🔌 Connections: {successful_connections}/{concurrent_connections} ({connection_success_rate:.1f}%)")
        print(f"   📨 Messages: {messages_received}/{messages_sent} ({message_success_rate:.1f}%)")
        print(f"   ⚡ Avg Response: {avg_response_time:.1f}ms")
        print(f"   💾 Memory: {memory_start:.1f}MB → {memory_end:.1f}MB (peak: {memory_peak:.1f}MB)")
        
        return result
    
    async def run_comprehensive_stress_tests(self) -> dict[str, Any]:
        """Run all comprehensive stress test scenarios"""
        
        print("🚀 STARTING COMPREHENSIVE STRESS TESTS")
        print("=" * 60)
        
        await self.initialize()
        
        try:
            # Test scenarios as requested
            test_configs = [
                # Normal Load: 50 concurrent users, 500 requests over 5 minutes
                LoadTestConfig(
                    name="Normal Load Test",
                    concurrent_users=50,
                    total_requests=500,
                    duration_seconds=300,  # 5 minutes
                    endpoint="/api/v1/portfolio",
                    ramp_up_seconds=30
                ),
                
                # Peak Load: 200 concurrent users, 2000 requests
                LoadTestConfig(
                    name="Peak Load Test", 
                    concurrent_users=200,
                    total_requests=2000,
                    duration_seconds=180,  # 3 minutes
                    endpoint="/api/v1/notifications",
                    ramp_up_seconds=60
                ),
                
                # Extreme Stress: 500 concurrent users, 5000 requests  
                LoadTestConfig(
                    name="Extreme Stress Test",
                    concurrent_users=500,
                    total_requests=5000,
                    duration_seconds=300,  # 5 minutes
                    endpoint="/api/v1/users/me", 
                    ramp_up_seconds=90
                ),
                
                # Additional API endpoints
                LoadTestConfig(
                    name="Market Data Load Test",
                    concurrent_users=100,
                    total_requests=1000,
                    duration_seconds=120,
                    endpoint="/api/v1/market/data/AAPL",
                    ramp_up_seconds=15
                ),
                
                LoadTestConfig(
                    name="CPU Intensive Test",
                    concurrent_users=25,
                    total_requests=100,
                    duration_seconds=60,
                    endpoint="/stress-test/cpu"
                ),
                
                LoadTestConfig(
                    name="Memory Intensive Test", 
                    concurrent_users=25,
                    total_requests=100,
                    duration_seconds=60,
                    endpoint="/stress-test/memory"
                )
            ]
            
            # Run HTTP load tests
            for config in test_configs:
                try:
                    await self.run_load_test(config)
                    
                    # Brief pause between tests
                    await asyncio.sleep(5)
                    
                    # Force garbage collection
                    gc.collect()
                    
                except Exception as e:
                    print(f"❌ Test {config.name} failed: {e!s}")
                    logger.error(f"Test failed: {config.name}", exc_info=True)
            
            # WebSocket Load Test
            try:
                await self.run_websocket_load_test(concurrent_connections=20, duration_seconds=120)
                await asyncio.sleep(5)
                gc.collect()
            except Exception as e:
                print(f"❌ WebSocket test failed: {e!s}")
                logger.error("WebSocket test failed", exc_info=True)
            
            # Endurance Test: 50 users for 2+ hours (simplified for demo)
            print("\n⏳ Starting Endurance Test (Memory Leak Detection)")
            try:
                endurance_config = LoadTestConfig(
                    name="Endurance Test (Memory Leak Detection)",
                    concurrent_users=20,  # Reduced for demo
                    total_requests=2000,  # Reduced for demo  
                    duration_seconds=600,  # 10 minutes instead of 2 hours for demo
                    endpoint="/health",
                    ramp_up_seconds=30
                )
                await self.run_load_test(endurance_config)
            except Exception as e:
                print(f"❌ Endurance test failed: {e!s}")
                logger.error("Endurance test failed", exc_info=True)
            
        finally:
            await self.cleanup()
        
        return self.generate_comprehensive_report()
    
    def generate_comprehensive_report(self) -> dict[str, Any]:
        """Generate comprehensive test report"""
        
        if not self.results:
            return {"error": "No test results available"}
        
        # Calculate overall metrics
        total_requests = sum(r.total_requests for r in self.results)
        total_successful = sum(r.successful_requests for r in self.results) 
        total_failed = sum(r.failed_requests for r in self.results)
        overall_success_rate = (total_successful / total_requests * 100) if total_requests > 0 else 0
        
        avg_rps = statistics.mean([r.requests_per_second for r in self.results])
        avg_response_time = statistics.mean([r.avg_response_time_ms for r in self.results])
        
        # Memory analysis
        memory_growth = []
        peak_memory = 0
        for result in self.results:
            if result.memory_end_mb > result.memory_start_mb:
                memory_growth.append(result.memory_end_mb - result.memory_start_mb)
            peak_memory = max(peak_memory, result.memory_peak_mb)
        
        avg_memory_growth = statistics.mean(memory_growth) if memory_growth else 0
        
        # Performance scoring (0-100)
        performance_score = min(100, (
            (overall_success_rate * 0.4) +  # 40% weight on success rate
            (min(100, avg_rps) * 0.3) +      # 30% weight on RPS (capped at 100)  
            (max(0, 100 - avg_response_time/10) * 0.2) +  # 20% weight on response time
            (max(0, 100 - avg_memory_growth) * 0.1)       # 10% weight on memory efficiency
        ))
        
        report = {
            "test_summary": {
                "total_tests_run": len(self.results),
                "total_requests": total_requests,
                "successful_requests": total_successful,
                "failed_requests": total_failed,
                "overall_success_rate_percent": round(overall_success_rate, 2),
                "average_rps": round(avg_rps, 2),
                "average_response_time_ms": round(avg_response_time, 2),
                "performance_score": round(performance_score, 1)
            },
            "memory_analysis": {
                "peak_memory_mb": round(peak_memory, 2),
                "average_memory_growth_mb": round(avg_memory_growth, 2),
                "potential_memory_leaks": avg_memory_growth > 50,
                "memory_efficiency": "Good" if avg_memory_growth < 10 else "Needs Review" if avg_memory_growth < 50 else "Poor"
            },
            "detailed_results": [asdict(result) for result in self.results],
            "recommendations": self._generate_recommendations(overall_success_rate, avg_rps, avg_response_time, avg_memory_growth),
            "timestamp": datetime.now().isoformat()
        }
        
        return report
    
    def _generate_recommendations(self, success_rate: float, avg_rps: float, avg_response_time: float, memory_growth: float) -> list[str]:
        """Generate performance recommendations"""
        recommendations = []
        
        if success_rate < 95:
            recommendations.append("🔴 Success rate below 95% - investigate error handling and system stability")
            
        if avg_response_time > 1000:
            recommendations.append("🟡 Average response time > 1s - consider caching, database optimization, or scaling")
            
        if avg_rps < 50:
            recommendations.append("🟡 Low throughput - consider connection pooling, async optimization, or horizontal scaling")
            
        if memory_growth > 20:
            recommendations.append("🔴 High memory growth detected - investigate potential memory leaks")
            
        if success_rate >= 95 and avg_response_time < 500 and avg_rps > 100:
            recommendations.append("🟢 Excellent performance - system is well optimized")
            
        if not recommendations:
            recommendations.append("🟢 Good baseline performance established")
            
        return recommendations

async def main():
    """Main stress test execution"""
    
    # Check if server is running
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:8000/health") as response:
                if response.status != 200:
                    print("❌ Server is not responding. Please start the server first.")
                    return
                print("✅ Server is running and responsive")
    except Exception as e:
        print(f"❌ Cannot connect to server: {e!s}")
        print("   Please ensure the server is running on http://localhost:8000")
        return
    
    # Run comprehensive stress tests
    tester = AdvancedStressTester()
    
    try:
        results = await tester.run_comprehensive_stress_tests()
        
        # Save detailed report
        with open("comprehensive_stress_test_results.json", "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, default=str)
        
        print("\n📊 COMPREHENSIVE STRESS TEST COMPLETE")
        print("=" * 60)
        print(f"📈 Performance Score: {results['test_summary']['performance_score']}/100")
        print(f"📊 Total Requests: {results['test_summary']['total_requests']}")
        print(f"✅ Success Rate: {results['test_summary']['overall_success_rate_percent']}%")
        print(f"🚀 Average RPS: {results['test_summary']['average_rps']}")
        print(f"⚡ Average Response: {results['test_summary']['average_response_time_ms']}ms")
        print(f"💾 Memory Efficiency: {results['memory_analysis']['memory_efficiency']}")
        
        print("\n💡 RECOMMENDATIONS:")
        for rec in results['recommendations']:
            print(f"   {rec}")
        
        print("\n📄 Detailed results saved to: comprehensive_stress_test_results.json")
        
    except Exception as e:
        print(f"❌ Stress testing failed: {e!s}")
        logger.error("Stress testing failed", exc_info=True)

if __name__ == "__main__":
    asyncio.run(main())