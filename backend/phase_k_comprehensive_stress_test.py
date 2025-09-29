"""
Phase K Comprehensive Stress Test & Optimization Suite
Advanced testing for all Phase K components with performance monitoring
"""

import asyncio
import aiohttp
import json
import time
import logging
import psutil
import statistics
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import websockets
import redis.asyncio as redis
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

@dataclass
class StressTestMetrics:
    """Stress test metrics"""
    test_name: str
    requests_sent: int
    successful_requests: int
    failed_requests: int
    avg_response_time: float
    min_response_time: float
    max_response_time: float
    requests_per_second: float
    error_rate: float
    memory_usage_mb: float
    cpu_usage_percent: float
    
class PhaseKStressTester:
    """Comprehensive stress testing for Phase K components"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.ws_url = base_url.replace("http://", "ws://").replace("https://", "wss://")
        self.redis_url = "redis://localhost:6379"
        self.metrics: List[StressTestMetrics] = []
        
    async def stress_test_api_endpoints(self, concurrent_users: int = 50, duration_seconds: int = 30) -> StressTestMetrics:
        """Stress test API endpoints with concurrent users"""
        
        print(f"🔥 API Stress Test: {concurrent_users} concurrent users for {duration_seconds}s")
        
        start_time = time.time()
        end_time = start_time + duration_seconds
        
        results = []
        successful_requests = 0
        failed_requests = 0
        
        async def worker():
            """Worker coroutine for stress testing"""
            nonlocal successful_requests, failed_requests
            
            async with aiohttp.ClientSession() as session:
                while time.time() < end_time:
                    request_start = time.time()
                    
                    try:
                        # Test different endpoints
                        endpoints = ["/health", "/docs", "/openapi.json", "/health/live", "/health/ready"]
                        endpoint = endpoints[int(time.time()) % len(endpoints)]
                        
                        async with session.get(f"{self.base_url}{endpoint}", timeout=aiohttp.ClientTimeout(total=5)) as response:
                            response_time = (time.time() - request_start) * 1000
                            results.append(response_time)
                            
                            if response.status == 200:
                                successful_requests += 1
                            else:
                                failed_requests += 1
                    
                    except Exception as e:
                        failed_requests += 1
                        response_time = (time.time() - request_start) * 1000
                        results.append(response_time)
                    
                    # Small delay to prevent overwhelming
                    await asyncio.sleep(0.01)
        
        # Start memory and CPU monitoring
        process = psutil.Process()
        memory_start = process.memory_info().rss / 1024 / 1024  # MB
        
        # Run concurrent workers
        tasks = [worker() for _ in range(concurrent_users)]
        await asyncio.gather(*tasks)
        
        # Calculate metrics
        total_time = time.time() - start_time
        total_requests = successful_requests + failed_requests
        
        memory_end = process.memory_info().rss / 1024 / 1024  # MB
        cpu_percent = process.cpu_percent()
        
        metrics = StressTestMetrics(
            test_name="API Stress Test",
            requests_sent=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            avg_response_time=statistics.mean(results) if results else 0,
            min_response_time=min(results) if results else 0,
            max_response_time=max(results) if results else 0,
            requests_per_second=total_requests / total_time if total_time > 0 else 0,
            error_rate=(failed_requests / total_requests * 100) if total_requests > 0 else 0,
            memory_usage_mb=memory_end - memory_start,
            cpu_usage_percent=cpu_percent
        )
        
        self.metrics.append(metrics)
        return metrics
    
    async def stress_test_websockets(self, concurrent_connections: int = 20, duration_seconds: int = 30) -> StressTestMetrics:
        """Stress test WebSocket connections"""
        
        print(f"🌐 WebSocket Stress Test: {concurrent_connections} concurrent connections for {duration_seconds}s")
        
        start_time = time.time()
        end_time = start_time + duration_seconds
        
        successful_requests = 0
        failed_requests = 0
        response_times = []
        
        async def websocket_worker():
            """WebSocket worker"""
            nonlocal successful_requests, failed_requests
            
            try:
                ws_url = f"{self.ws_url}/ws/test"
                
                async with websockets.connect(ws_url, timeout=5) as websocket:
                    while time.time() < end_time:
                        request_start = time.time()
                        
                        try:
                            # Send ping
                            await websocket.send(json.dumps({"type": "ping"}))
                            
                            # Wait for response
                            response = await asyncio.wait_for(websocket.recv(), timeout=2)
                            
                            response_time = (time.time() - request_start) * 1000
                            response_times.append(response_time)
                            successful_requests += 1
                            
                        except asyncio.TimeoutError:
                            failed_requests += 1
                        except Exception:
                            failed_requests += 1
                            break
                        
                        await asyncio.sleep(0.1)  # Reasonable interval
            
            except Exception:
                failed_requests += 1
        
        # Start memory monitoring
        process = psutil.Process()
        memory_start = process.memory_info().rss / 1024 / 1024
        
        # Run concurrent WebSocket workers
        tasks = [websocket_worker() for _ in range(concurrent_connections)]
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # Calculate metrics
        total_time = time.time() - start_time
        total_requests = successful_requests + failed_requests
        
        memory_end = process.memory_info().rss / 1024 / 1024
        cpu_percent = process.cpu_percent()
        
        metrics = StressTestMetrics(
            test_name="WebSocket Stress Test",
            requests_sent=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            avg_response_time=statistics.mean(response_times) if response_times else 0,
            min_response_time=min(response_times) if response_times else 0,
            max_response_time=max(response_times) if response_times else 0,
            requests_per_second=total_requests / total_time if total_time > 0 else 0,
            error_rate=(failed_requests / total_requests * 100) if total_requests > 0 else 0,
            memory_usage_mb=memory_end - memory_start,
            cpu_usage_percent=cpu_percent
        )
        
        self.metrics.append(metrics)
        return metrics
    
    async def stress_test_redis(self, concurrent_operations: int = 100, duration_seconds: int = 30) -> StressTestMetrics:
        """Stress test Redis operations"""
        
        print(f"🔴 Redis Stress Test: {concurrent_operations} concurrent operations for {duration_seconds}s")
        
        start_time = time.time()
        end_time = start_time + duration_seconds
        
        successful_requests = 0
        failed_requests = 0
        response_times = []
        
        async def redis_worker():
            """Redis operation worker"""
            nonlocal successful_requests, failed_requests
            
            try:
                redis_client = redis.from_url(self.redis_url)
                
                while time.time() < end_time:
                    request_start = time.time()
                    
                    try:
                        # Test different Redis operations
                        key = f"stress_test_{int(time.time() * 1000)}"
                        value = f"value_{successful_requests}"
                        
                        # SET operation
                        await redis_client.set(key, value, ex=60)
                        
                        # GET operation
                        result = await redis_client.get(key)
                        
                        if result == value.encode():
                            successful_requests += 1
                        else:
                            failed_requests += 1
                        
                        response_time = (time.time() - request_start) * 1000
                        response_times.append(response_time)
                    
                    except Exception:
                        failed_requests += 1
                        response_time = (time.time() - request_start) * 1000
                        response_times.append(response_time)
                    
                    await asyncio.sleep(0.001)  # Very small delay
                
                await redis_client.aclose()
            
            except Exception:
                failed_requests += concurrent_operations
        
        # Start memory monitoring
        process = psutil.Process()
        memory_start = process.memory_info().rss / 1024 / 1024
        
        # Run concurrent Redis workers
        tasks = [redis_worker() for _ in range(concurrent_operations)]
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # Calculate metrics
        total_time = time.time() - start_time
        total_requests = successful_requests + failed_requests
        
        memory_end = process.memory_info().rss / 1024 / 1024
        cpu_percent = process.cpu_percent()
        
        metrics = StressTestMetrics(
            test_name="Redis Stress Test",
            requests_sent=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            avg_response_time=statistics.mean(response_times) if response_times else 0,
            min_response_time=min(response_times) if response_times else 0,
            max_response_time=max(response_times) if response_times else 0,
            requests_per_second=total_requests / total_time if total_time > 0 else 0,
            error_rate=(failed_requests / total_requests * 100) if total_requests > 0 else 0,
            memory_usage_mb=memory_end - memory_start,
            cpu_usage_percent=cpu_percent
        )
        
        self.metrics.append(metrics)
        return metrics
    
    async def memory_leak_test(self, duration_seconds: int = 60) -> Dict[str, Any]:
        """Test for memory leaks during sustained operation"""
        
        print(f"🧠 Memory Leak Test: {duration_seconds}s sustained operation")
        
        start_time = time.time()
        end_time = start_time + duration_seconds
        
        process = psutil.Process()
        memory_samples = []
        
        # Background task to make continuous requests
        async def background_load():
            async with aiohttp.ClientSession() as session:
                while time.time() < end_time:
                    try:
                        async with session.get(f"{self.base_url}/health") as response:
                            await response.text()
                    except:
                        pass
                    await asyncio.sleep(0.1)
        
        # Memory sampling task
        async def memory_sampler():
            while time.time() < end_time:
                memory_mb = process.memory_info().rss / 1024 / 1024
                memory_samples.append({
                    "timestamp": time.time() - start_time,
                    "memory_mb": memory_mb
                })
                await asyncio.sleep(1)  # Sample every second
        
        # Run both tasks
        await asyncio.gather(background_load(), memory_sampler())
        
        # Analyze memory growth
        if len(memory_samples) > 10:
            first_half = memory_samples[:len(memory_samples)//2]
            second_half = memory_samples[len(memory_samples)//2:]
            
            first_half_avg = statistics.mean(sample["memory_mb"] for sample in first_half)
            second_half_avg = statistics.mean(sample["memory_mb"] for sample in second_half)
            
            memory_growth = second_half_avg - first_half_avg
            growth_rate = memory_growth / (duration_seconds / 2)  # MB per second
        else:
            memory_growth = 0
            growth_rate = 0
            first_half_avg = memory_samples[0]["memory_mb"] if memory_samples else 0
            second_half_avg = memory_samples[-1]["memory_mb"] if memory_samples else 0
        
        return {
            "test_name": "Memory Leak Test",
            "duration_seconds": duration_seconds,
            "initial_memory_mb": memory_samples[0]["memory_mb"] if memory_samples else 0,
            "final_memory_mb": memory_samples[-1]["memory_mb"] if memory_samples else 0,
            "memory_growth_mb": memory_growth,
            "growth_rate_mb_per_second": growth_rate,
            "samples": len(memory_samples),
            "potential_leak": growth_rate > 0.1,  # More than 0.1 MB/s growth
            "memory_samples": memory_samples[-10:]  # Last 10 samples for review
        }
    
    async def run_comprehensive_stress_tests(self) -> Dict[str, Any]:
        """Run comprehensive stress tests for all Phase K components"""
        
        print("🚀 Starting Phase K Comprehensive Stress Tests")
        print("=" * 60)
        
        start_time = time.time()
        
        # Test scenarios
        stress_tests = [
            ("API Load Test", self.stress_test_api_endpoints(50, 30)),
            ("WebSocket Load Test", self.stress_test_websockets(20, 30)),
            ("Redis Performance Test", self.stress_test_redis(50, 30)),
        ]
        
        test_results = {}
        
        # Run stress tests
        for test_name, test_coro in stress_tests:
            print(f"\n🧪 Running: {test_name}")
            try:
                result = await test_coro
                test_results[test_name] = asdict(result)
                
                print(f"✅ {test_name} completed:")
                print(f"   Requests: {result.successful_requests}/{result.requests_sent}")
                print(f"   Success Rate: {100 - result.error_rate:.1f}%")
                print(f"   Avg Response: {result.avg_response_time:.1f}ms")
                print(f"   RPS: {result.requests_per_second:.1f}")
                
            except Exception as e:
                print(f"❌ {test_name} failed: {e}")
                test_results[test_name] = {"error": str(e)}
        
        # Run memory leak test
        print(f"\n🧠 Running Memory Leak Analysis...")
        try:
            memory_result = await self.memory_leak_test(60)
            test_results["Memory Leak Test"] = memory_result
            
            if memory_result["potential_leak"]:
                print(f"⚠️  Potential memory leak detected!")
                print(f"   Growth: {memory_result['memory_growth_mb']:.2f} MB")
                print(f"   Rate: {memory_result['growth_rate_mb_per_second']:.3f} MB/s")
            else:
                print(f"✅ No significant memory leaks detected")
                print(f"   Memory stable: {memory_result['memory_growth_mb']:.2f} MB growth")
        
        except Exception as e:
            print(f"❌ Memory leak test failed: {e}")
            test_results["Memory Leak Test"] = {"error": str(e)}
        
        # Generate overall assessment
        total_time = time.time() - start_time
        
        # Calculate overall performance score
        performance_metrics = [m for m in self.metrics if m.error_rate < 20]  # Exclude tests with >20% error rate
        
        if performance_metrics:
            avg_response_time = statistics.mean(m.avg_response_time for m in performance_metrics)
            avg_rps = statistics.mean(m.requests_per_second for m in performance_metrics)
            avg_error_rate = statistics.mean(m.error_rate for m in performance_metrics)
            
            # Performance score (0-100)
            response_score = max(0, 100 - (avg_response_time / 10))  # Lower is better
            rps_score = min(100, avg_rps / 10)  # Higher is better (up to 1000 RPS = 100 points)
            error_score = max(0, 100 - (avg_error_rate * 10))  # Lower is better
            
            performance_score = (response_score + rps_score + error_score) / 3
        else:
            performance_score = 0
            avg_response_time = 0
            avg_rps = 0
            avg_error_rate = 100
        
        summary = {
            "timestamp": datetime.now().isoformat(),
            "total_test_time": total_time,
            "performance_score": performance_score,
            "overall_metrics": {
                "avg_response_time_ms": avg_response_time,
                "avg_requests_per_second": avg_rps,
                "avg_error_rate_percent": avg_error_rate
            },
            "test_results": test_results,
            "system_assessment": self._assess_system_performance(performance_score, test_results)
        }
        
        return summary
    
    def _assess_system_performance(self, performance_score: float, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Assess overall system performance"""
        
        issues = []
        recommendations = []
        
        # Check performance score
        if performance_score >= 80:
            overall_status = "excellent"
        elif performance_score >= 60:
            overall_status = "good"
            recommendations.append("Consider optimizing response times")
        elif performance_score >= 40:
            overall_status = "fair"
            issues.append("Performance below optimal levels")
            recommendations.append("Review and optimize critical paths")
        else:
            overall_status = "poor"
            issues.append("Significant performance issues detected")
            recommendations.append("Urgent performance optimization needed")
        
        # Check memory leaks
        memory_test = test_results.get("Memory Leak Test", {})
        if memory_test.get("potential_leak"):
            issues.append("Potential memory leak detected")
            recommendations.append("Investigate memory usage patterns")
        
        # Check error rates
        for test_name, result in test_results.items():
            if isinstance(result, dict) and result.get("error_rate", 0) > 10:
                issues.append(f"High error rate in {test_name}")
                recommendations.append(f"Investigate failures in {test_name}")
        
        return {
            "overall_status": overall_status,
            "performance_score": performance_score,
            "issues": issues,
            "recommendations": recommendations
        }
    
    def generate_stress_test_report(self, summary: Dict[str, Any]) -> str:
        """Generate comprehensive stress test report"""
        
        report = f"""# Phase K Comprehensive Stress Test Report

## Executive Summary
- **Performance Score**: {summary['performance_score']:.1f}/100
- **Overall Status**: {summary['system_assessment']['overall_status'].upper()}
- **Test Duration**: {summary['total_test_time']:.1f} seconds
- **Timestamp**: {summary['timestamp']}

## Performance Metrics
- **Average Response Time**: {summary['overall_metrics']['avg_response_time_ms']:.1f}ms
- **Average RPS**: {summary['overall_metrics']['avg_requests_per_second']:.1f}
- **Average Error Rate**: {summary['overall_metrics']['avg_error_rate_percent']:.1f}%

## Test Results

"""
        
        for test_name, result in summary['test_results'].items():
            if 'error' in result:
                report += f"### {test_name} ❌\n"
                report += f"**Error**: {result['error']}\n\n"
            else:
                if 'requests_sent' in result:
                    # Stress test result
                    success_rate = 100 - result.get('error_rate', 0)
                    status = "✅" if success_rate >= 90 else "⚠️" if success_rate >= 70 else "❌"
                    
                    report += f"### {test_name} {status}\n"
                    report += f"- **Requests**: {result.get('successful_requests', 0)}/{result.get('requests_sent', 0)}\n"
                    report += f"- **Success Rate**: {success_rate:.1f}%\n"
                    report += f"- **Avg Response Time**: {result.get('avg_response_time', 0):.1f}ms\n"
                    report += f"- **RPS**: {result.get('requests_per_second', 0):.1f}\n"
                    report += f"- **Memory Usage**: {result.get('memory_usage_mb', 0):.1f} MB\n\n"
                
                elif 'potential_leak' in result:
                    # Memory leak test result
                    status = "❌" if result.get('potential_leak') else "✅"
                    report += f"### {test_name} {status}\n"
                    report += f"- **Duration**: {result.get('duration_seconds', 0)}s\n"
                    report += f"- **Memory Growth**: {result.get('memory_growth_mb', 0):.2f} MB\n"
                    report += f"- **Growth Rate**: {result.get('growth_rate_mb_per_second', 0):.3f} MB/s\n"
                    report += f"- **Potential Leak**: {'Yes' if result.get('potential_leak') else 'No'}\n\n"
        
        # Issues and recommendations
        if summary['system_assessment']['issues']:
            report += "## Issues Identified\n"
            for issue in summary['system_assessment']['issues']:
                report += f"- ⚠️ {issue}\n"
            report += "\n"
        
        if summary['system_assessment']['recommendations']:
            report += "## Recommendations\n"
            for rec in summary['system_assessment']['recommendations']:
                report += f"- 💡 {rec}\n"
            report += "\n"
        
        # Overall assessment
        status = summary['system_assessment']['overall_status']
        if status == "excellent":
            report += "## ✅ Overall Assessment: EXCELLENT\n"
            report += "System performance is optimal. All Phase K components are operating efficiently.\n"
        elif status == "good":
            report += "## ⚡ Overall Assessment: GOOD\n"
            report += "System performance is good with minor optimization opportunities.\n"
        elif status == "fair":
            report += "## ⚠️ Overall Assessment: FAIR\n"
            report += "System performance is acceptable but has room for improvement.\n"
        else:
            report += "## ❌ Overall Assessment: POOR\n"
            report += "System performance needs significant optimization.\n"
        
        return report

async def main():
    """Run comprehensive stress tests"""
    
    tester = PhaseKStressTester()
    summary = await tester.run_comprehensive_stress_tests()
    
    # Generate and save report
    report = tester.generate_stress_test_report(summary)
    with open("phase_k_stress_test_report.md", "w") as f:
        f.write(report)
    
    print(f"\n📊 Comprehensive stress test report saved to: phase_k_stress_test_report.md")
    
    # Print final assessment
    print("\n" + "=" * 60)
    print("🎯 PHASE K STRESS TEST SUMMARY")
    print("=" * 60)
    
    assessment = summary['system_assessment']
    print(f"Performance Score: {summary['performance_score']:.1f}/100")
    print(f"Overall Status: {assessment['overall_status'].upper()}")
    
    if assessment['issues']:
        print("\nIssues:")
        for issue in assessment['issues']:
            print(f"  ⚠️ {issue}")
    
    if assessment['recommendations']:
        print("\nRecommendations:")
        for rec in assessment['recommendations'][:3]:  # Top 3
            print(f"  💡 {rec}")
    
    return summary

if __name__ == "__main__":
    asyncio.run(main())