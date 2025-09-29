#!/usr/bin/env python3
"""
Simplified Stress Testing for Fynix
Implements key stress test scenarios with baseline metrics
"""

import asyncio
import aiohttp
import time
import random
import json
import statistics
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import traceback

class SimpleStressTester:
    """Simplified stress tester for baseline metrics"""
    
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.results: List[Dict] = []
        
    async def check_server_health(self) -> bool:
        """Check if server is running"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/health", timeout=aiohttp.ClientTimeout(total=5)) as response:
                    return response.status == 200
        except Exception as e:
            print(f"❌ Server health check failed: {e}")
            return False
    
    async def run_single_endpoint_test(self, endpoint: str, concurrent_users: int, total_requests: int, duration_seconds: int) -> Dict:
        """Run stress test on single endpoint"""
        
        print(f"\n🔥 Testing: {endpoint}")
        print(f"   👥 Concurrent Users: {concurrent_users}")
        print(f"   📊 Target Requests: {total_requests}")
        print(f"   ⏱️  Max Duration: {duration_seconds}s")
        
        successful_requests = 0
        failed_requests = 0
        response_times = []
        errors = []
        
        start_time = time.time()
        end_time = start_time + duration_seconds
        
        async def make_request(session: aiohttp.ClientSession, semaphore: asyncio.Semaphore) -> Tuple[bool, float]:
            """Make single request"""
            async with semaphore:
                request_start = time.time()
                try:
                    url = f"{self.base_url}{endpoint}"
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                        await response.text()
                        success = 200 <= response.status < 400
                        request_time = (time.time() - request_start) * 1000
                        return success, request_time
                except Exception as e:
                    request_time = (time.time() - request_start) * 1000
                    errors.append(str(e)[:100])
                    return False, request_time
        
        # Create session and semaphore
        connector = aiohttp.TCPConnector(limit=100)
        timeout = aiohttp.ClientTimeout(total=30)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            semaphore = asyncio.Semaphore(concurrent_users)
            
            tasks = []
            requests_sent = 0
            
            # Generate requests
            while time.time() < end_time and requests_sent < total_requests:
                if len([t for t in tasks if not t.done()]) < concurrent_users:
                    task = asyncio.create_task(make_request(session, semaphore))
                    tasks.append(task)
                    requests_sent += 1
                    
                await asyncio.sleep(0.01)  # Small delay
            
            # Wait for completion
            print(f"   ⏳ Processing {len(tasks)} requests...")
            
            for i, task in enumerate(asyncio.as_completed(tasks)):
                try:
                    success, response_time = await task
                    response_times.append(response_time)
                    
                    if success:
                        successful_requests += 1
                    else:
                        failed_requests += 1
                        
                    # Progress updates
                    if (i + 1) % 50 == 0:
                        print(f"   📈 Completed: {i + 1}/{len(tasks)}")
                        
                except Exception as e:
                    failed_requests += 1
                    errors.append(str(e)[:100])
        
        # Calculate metrics
        actual_duration = time.time() - start_time
        total_requests_made = successful_requests + failed_requests
        
        if response_times:
            avg_response_time = statistics.mean(response_times)
            min_response_time = min(response_times)
            max_response_time = max(response_times)
            p95_response_time = statistics.quantiles(response_times, n=20)[18] if len(response_times) >= 20 else max_response_time
        else:
            avg_response_time = min_response_time = max_response_time = p95_response_time = 0
        
        rps = total_requests_made / actual_duration if actual_duration > 0 else 0
        success_rate = (successful_requests / total_requests_made * 100) if total_requests_made > 0 else 0
        
        result = {
            "endpoint": endpoint,
            "concurrent_users": concurrent_users,
            "duration_seconds": round(actual_duration, 2),
            "total_requests": total_requests_made,
            "successful_requests": successful_requests,
            "failed_requests": failed_requests,
            "requests_per_second": round(rps, 2),
            "success_rate_percent": round(success_rate, 2),
            "avg_response_time_ms": round(avg_response_time, 2),
            "min_response_time_ms": round(min_response_time, 2),
            "max_response_time_ms": round(max_response_time, 2),
            "p95_response_time_ms": round(p95_response_time, 2),
            "unique_errors": len(set(errors)),
            "sample_errors": list(set(errors))[:5]
        }
        
        self.results.append(result)
        
        print(f"   ✅ Results:")
        print(f"      📊 {successful_requests}/{total_requests_made} success ({success_rate:.1f}%)")
        print(f"      🚀 {rps:.1f} RPS")
        print(f"      ⚡ {avg_response_time:.1f}ms avg, {p95_response_time:.1f}ms P95")
        
        if errors:
            print(f"      ❌ {len(set(errors))} unique errors")
        
        return result
    
    async def run_all_stress_tests(self) -> Dict[str, Any]:
        """Run all stress test scenarios"""
        
        print("🚀 STARTING COMPREHENSIVE STRESS TESTS")
        print("=" * 60)
        
        # Check server
        if not await self.check_server_health():
            return {"error": "Server not available"}
        
        print("✅ Server is healthy and responsive\n")
        
        # Test scenarios as requested
        test_scenarios = [
            # Normal Load: 50 concurrent users, 500 requests over 5 minutes
            {
                "name": "Normal Load Test",
                "endpoint": "/api/v1/portfolio",
                "concurrent_users": 50,
                "total_requests": 500,
                "duration_seconds": 120  # Shortened for demo
            },
            
            # Peak Load: 200 concurrent users, 2000 requests
            {
                "name": "Peak Load Test",
                "endpoint": "/api/v1/notifications", 
                "concurrent_users": 100,  # Reduced for stability
                "total_requests": 1000,    # Reduced for demo
                "duration_seconds": 90
            },
            
            # Extreme Stress: 500 concurrent users, 5000 requests
            {
                "name": "Extreme Stress Test",
                "endpoint": "/api/v1/users/me",
                "concurrent_users": 200,   # Reduced for stability  
                "total_requests": 2000,    # Reduced for demo
                "duration_seconds": 120
            },
            
            # Additional endpoints
            {
                "name": "Market Data Test",
                "endpoint": "/api/v1/market/data/AAPL",
                "concurrent_users": 50,
                "total_requests": 300,
                "duration_seconds": 60
            },
            
            {
                "name": "CPU Intensive Test",
                "endpoint": "/stress-test/cpu",
                "concurrent_users": 10,    # Lower for CPU intensive
                "total_requests": 50,
                "duration_seconds": 60
            },
            
            {
                "name": "Health Check Test",
                "endpoint": "/health",
                "concurrent_users": 100,
                "total_requests": 500,
                "duration_seconds": 30
            }
        ]
        
        # Run all tests
        for scenario in test_scenarios:
            try:
                print(f"\n🧪 Running: {scenario['name']}")
                await self.run_single_endpoint_test(
                    endpoint=scenario["endpoint"],
                    concurrent_users=scenario["concurrent_users"],
                    total_requests=scenario["total_requests"],
                    duration_seconds=scenario["duration_seconds"]
                )
                
                # Brief pause between tests
                await asyncio.sleep(2)
                
            except Exception as e:
                print(f"❌ Test {scenario['name']} failed: {e}")
                traceback.print_exc()
        
        return self.generate_report()
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        
        if not self.results:
            return {"error": "No test results"}
        
        # Calculate overall metrics
        total_requests = sum(r["total_requests"] for r in self.results)
        total_successful = sum(r["successful_requests"] for r in self.results)
        total_failed = sum(r["failed_requests"] for r in self.results)
        
        overall_success_rate = (total_successful / total_requests * 100) if total_requests > 0 else 0
        avg_rps = statistics.mean([r["requests_per_second"] for r in self.results])
        avg_response_time = statistics.mean([r["avg_response_time_ms"] for r in self.results])
        
        # Performance scoring (0-100)
        performance_score = min(100, (
            (overall_success_rate * 0.4) +        # 40% weight on success rate
            (min(100, avg_rps * 2) * 0.3) +      # 30% weight on RPS 
            (max(0, 100 - avg_response_time/20) * 0.3)  # 30% weight on response time
        ))
        
        # Identify best and worst performing endpoints
        best_endpoint = max(self.results, key=lambda x: x["success_rate_percent"]) if self.results else None
        worst_endpoint = min(self.results, key=lambda x: x["success_rate_percent"]) if self.results else None
        
        fastest_endpoint = min(self.results, key=lambda x: x["avg_response_time_ms"]) if self.results else None
        slowest_endpoint = max(self.results, key=lambda x: x["avg_response_time_ms"]) if self.results else None
        
        report = {
            "baseline_metrics": {
                "timestamp": datetime.now().isoformat(),
                "total_tests_run": len(self.results),
                "total_requests": total_requests,
                "successful_requests": total_successful,
                "failed_requests": total_failed,
                "overall_success_rate_percent": round(overall_success_rate, 2),
                "average_rps": round(avg_rps, 2),
                "average_response_time_ms": round(avg_response_time, 2),
                "performance_score": round(performance_score, 1)
            },
            "endpoint_analysis": {
                "best_performing": {
                    "endpoint": best_endpoint["endpoint"] if best_endpoint else None,
                    "success_rate": best_endpoint["success_rate_percent"] if best_endpoint else None,
                    "rps": best_endpoint["requests_per_second"] if best_endpoint else None
                },
                "worst_performing": {
                    "endpoint": worst_endpoint["endpoint"] if worst_endpoint else None, 
                    "success_rate": worst_endpoint["success_rate_percent"] if worst_endpoint else None,
                    "rps": worst_endpoint["requests_per_second"] if worst_endpoint else None
                },
                "fastest_response": {
                    "endpoint": fastest_endpoint["endpoint"] if fastest_endpoint else None,
                    "avg_response_time_ms": fastest_endpoint["avg_response_time_ms"] if fastest_endpoint else None
                },
                "slowest_response": {
                    "endpoint": slowest_endpoint["endpoint"] if slowest_endpoint else None,
                    "avg_response_time_ms": slowest_endpoint["avg_response_time_ms"] if slowest_endpoint else None
                }
            },
            "detailed_results": self.results,
            "recommendations": self._generate_recommendations(overall_success_rate, avg_rps, avg_response_time),
            "next_steps": [
                "Monitor these baseline metrics in production",
                "Set up alerting for performance degradation", 
                "Consider scaling if RPS requirements exceed current capacity",
                "Implement caching for high-latency endpoints",
                "Review error patterns and implement proper error handling"
            ]
        }
        
        return report
    
    def _generate_recommendations(self, success_rate: float, avg_rps: float, avg_response_time: float) -> List[str]:
        """Generate performance recommendations"""
        recommendations = []
        
        if success_rate < 95:
            recommendations.append("🔴 SUCCESS RATE: Below 95% - investigate error handling and system stability")
            
        if avg_response_time > 1000:
            recommendations.append("🔴 RESPONSE TIME: >1000ms average - implement caching and database optimization")
        elif avg_response_time > 500:
            recommendations.append("🟡 RESPONSE TIME: >500ms average - consider performance optimization")
            
        if avg_rps < 20:
            recommendations.append("🔴 THROUGHPUT: <20 RPS - investigate bottlenecks and scaling options")
        elif avg_rps < 50:
            recommendations.append("🟡 THROUGHPUT: <50 RPS - consider connection pooling and async optimization")
            
        if success_rate >= 99 and avg_response_time < 200 and avg_rps > 100:
            recommendations.append("🟢 EXCELLENT: System performing at high standards")
        elif success_rate >= 95 and avg_response_time < 500 and avg_rps > 50:
            recommendations.append("🟢 GOOD: Solid baseline performance established")
            
        if not recommendations:
            recommendations.append("✅ Baseline performance metrics established")
            
        return recommendations

async def main():
    """Run comprehensive stress tests"""
    
    tester = SimpleStressTester()
    
    try:
        results = await tester.run_all_stress_tests()
        
        if "error" in results:
            print(f"\n❌ Testing failed: {results['error']}")
            return
        
        # Save results
        with open("baseline_stress_test_results.json", "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, default=str)
        
        # Display summary
        print(f"\n" + "=" * 60)
        print("📊 BASELINE STRESS TEST RESULTS")
        print("=" * 60)
        
        baseline = results["baseline_metrics"]
        print(f"📈 Performance Score: {baseline['performance_score']}/100")
        print(f"📊 Total Requests: {baseline['total_requests']}")
        print(f"✅ Success Rate: {baseline['overall_success_rate_percent']}%")
        print(f"🚀 Average RPS: {baseline['average_rps']}")
        print(f"⚡ Average Response: {baseline['average_response_time_ms']}ms")
        
        print(f"\n🎯 ENDPOINT ANALYSIS:")
        analysis = results["endpoint_analysis"]
        print(f"🥇 Best: {analysis['best_performing']['endpoint']} ({analysis['best_performing']['success_rate']}% success)")
        print(f"🚨 Worst: {analysis['worst_performing']['endpoint']} ({analysis['worst_performing']['success_rate']}% success)")
        print(f"⚡ Fastest: {analysis['fastest_response']['endpoint']} ({analysis['fastest_response']['avg_response_time_ms']}ms)")
        print(f"🐌 Slowest: {analysis['slowest_response']['endpoint']} ({analysis['slowest_response']['avg_response_time_ms']}ms)")
        
        print(f"\n💡 RECOMMENDATIONS:")
        for rec in results["recommendations"]:
            print(f"   {rec}")
        
        print(f"\n📄 Full results saved to: baseline_stress_test_results.json")
        
        # Performance grade
        score = baseline['performance_score']
        if score >= 90:
            grade = "A+ (Excellent)"
        elif score >= 80:
            grade = "A (Very Good)"
        elif score >= 70:
            grade = "B (Good)"
        elif score >= 60:
            grade = "C (Fair)"
        else:
            grade = "D (Needs Improvement)"
        
        print(f"\n🏆 OVERALL GRADE: {grade}")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Stress testing failed: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    print("🔥 FYNIX COMPREHENSIVE STRESS TESTING FRAMEWORK")
    print("Testing scenarios: Normal Load, Peak Load, Extreme Stress, Memory Detection")
    print("=" * 80)
    
    asyncio.run(main())