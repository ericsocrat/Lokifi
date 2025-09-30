#!/usr/bin/env python3
"""
Performance Optimization and Analytics Suite
============================================

Advanced performance monitoring, optimization, and analytics including:
- Real-time performance profiling
- Database query optimization
- API response time analysis
- Memory and CPU monitoring
- Caching optimization
- Load testing and stress testing
- Performance regression detection
"""

import asyncio
import cProfile
import io
import json
import os
import pstats
import statistics
import sys
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    import aiofiles
    import aioredis
    import httpx
    import matplotlib.pyplot as plt
    import numpy as np
    import psutil
    import seaborn as sns
    from sqlalchemy import create_engine, text
    from sqlalchemy.ext.asyncio import create_async_engine
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("Install missing dependencies: pip install psutil httpx numpy matplotlib seaborn aioredis")
    sys.exit(1)

@dataclass
class PerformanceMetric:
    """Performance metric data structure"""
    timestamp: datetime
    metric_name: str
    value: float
    tags: dict[str, str] | None = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = {}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

class PerformanceOptimizer:
    """Advanced performance optimization and analytics"""
    
    def __init__(self, base_url: str = "http://localhost:8002"):
        self.base_url = base_url
        self.metrics_history = deque(maxlen=1000)
        self.performance_data = defaultdict(list)
        
        # Setup directories
        self.project_root = backend_dir.parent
        self.performance_dir = self.project_root / "performance-tests"
        self.reports_dir = self.performance_dir / "reports"
        self.profiles_dir = self.performance_dir / "profiles"
        self.charts_dir = self.performance_dir / "charts"
        
        for directory in [self.performance_dir, self.reports_dir, self.profiles_dir, self.charts_dir]:
            directory.mkdir(parents=True, exist_ok=True)
        
        # Performance thresholds
        self.thresholds = {
            "response_time_ms": 500,  # 500ms
            "cpu_percent": 80,
            "memory_percent": 85,
            "disk_io_percent": 90,
            "db_query_time_ms": 100,
            "cache_hit_rate": 0.80
        }
        
    def print_header(self, title: str):
        print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*80}{Colors.END}")
        print(f"{Colors.CYAN}{Colors.BOLD}{title.center(80)}{Colors.END}")
        print(f"{Colors.CYAN}{Colors.BOLD}{'='*80}{Colors.END}")
    
    def print_section(self, title: str):
        print(f"\n{Colors.BLUE}{Colors.BOLD}📊 {title}{Colors.END}")
        print(f"{Colors.BLUE}{'─'*60}{Colors.END}")
    
    def print_success(self, message: str):
        print(f"{Colors.GREEN}✅ {message}{Colors.END}")
    
    def print_warning(self, message: str):
        print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")
    
    def print_error(self, message: str):
        print(f"{Colors.RED}❌ {message}{Colors.END}")
    
    def print_info(self, message: str):
        print(f"{Colors.WHITE}ℹ️  {message}{Colors.END}")
    
    def record_metric(self, metric: PerformanceMetric):
        """Record a performance metric"""
        self.metrics_history.append(metric)
        self.performance_data[metric.metric_name].append({
            "timestamp": metric.timestamp,
            "value": metric.value,
            "tags": metric.tags
        })
    
    async def profile_application_performance(self) -> dict[str, Any]:
        """Profile application performance using cProfile"""
        self.print_section("Application Performance Profiling")
        
        profiling_results = {
            "timestamp": datetime.now().isoformat(),
            "profiles": {},
            "hotspots": [],
            "optimization_recommendations": []
        }
        
        try:
            # API endpoint profiling
            endpoints_to_profile = [
                ("/health", "GET"),
                ("/docs", "GET"),
                ("/openapi.json", "GET")
            ]
            
            for endpoint, method in endpoints_to_profile:
                self.print_info(f"Profiling {method} {endpoint}")
                
                # Profile the request
                pr = cProfile.Profile()
                
                start_time = time.time()
                pr.enable()
                
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.request(method, f"{self.base_url}{endpoint}")
                        status_code = response.status_code
                        response_time = time.time() - start_time
                except Exception as e:
                    status_code = 0
                    response_time = time.time() - start_time
                    self.print_warning(f"Profiling failed for {endpoint}: {e}")
                    continue
                
                pr.disable()
                
                # Analyze profile
                s = io.StringIO()
                ps = pstats.Stats(pr, stream=s).sort_stats('cumulative')
                ps.print_stats(20)  # Top 20 functions
                
                profile_data = {
                    "endpoint": endpoint,
                    "method": method,
                    "response_time": response_time,
                    "status_code": status_code,
                    "profile_stats": s.getvalue(),
                    "function_calls": getattr(ps, 'total_calls', 0)
                }
                
                profiling_results["profiles"][f"{method}_{endpoint.replace('/', '_')}"] = profile_data
                
                # Record metric
                self.record_metric(PerformanceMetric(
                    timestamp=datetime.now(),
                    metric_name="api_response_time",
                    value=response_time * 1000,  # Convert to ms
                    tags={"endpoint": endpoint, "method": method}
                ))
                
                # Check against thresholds
                if response_time * 1000 > self.thresholds["response_time_ms"]:
                    profiling_results["hotspots"].append({
                        "type": "slow_endpoint",
                        "endpoint": endpoint,
                        "response_time_ms": response_time * 1000,
                        "threshold_ms": self.thresholds["response_time_ms"]
                    })
                    profiling_results["optimization_recommendations"].append(
                        f"Optimize {endpoint} - response time {response_time*1000:.1f}ms exceeds threshold"
                    )
                
                self.print_info(f"  Response time: {response_time*1000:.1f}ms, Status: {status_code}")
            
            # Save profiling results
            profile_file = self.profiles_dir / f"performance_profile_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            async with aiofiles.open(profile_file, 'w') as f:
                await f.write(json.dumps(profiling_results, indent=2, default=str))
            
            self.print_success(f"Performance profiling completed: {profile_file.name}")
            
            return profiling_results
            
        except Exception as e:
            self.print_error(f"Performance profiling failed: {e}")
            return profiling_results
    
    async def analyze_system_resources(self) -> dict[str, Any]:
        """Analyze system resource utilization"""
        self.print_section("System Resource Analysis")
        
        analysis = {
            "timestamp": datetime.now().isoformat(),
            "cpu": {},
            "memory": {},
            "disk": {},
            "network": {},
            "alerts": [],
            "recommendations": []
        }
        
        try:
            # CPU Analysis
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            cpu_freq = psutil.cpu_freq()
            
            analysis["cpu"] = {
                "usage_percent": cpu_percent,
                "core_count": cpu_count,
                "frequency_mhz": cpu_freq.current if cpu_freq else 0,
                "load_average": os.getloadavg() if hasattr(os, 'getloadavg') else [0, 0, 0]
            }
            
            self.record_metric(PerformanceMetric(
                timestamp=datetime.now(),
                metric_name="cpu_usage_percent",
                value=cpu_percent
            ))
            
            if cpu_percent > self.thresholds["cpu_percent"]:
                analysis["alerts"].append(f"High CPU usage: {cpu_percent:.1f}%")
                analysis["recommendations"].append("Investigate high CPU usage processes")
            
            self.print_info(f"CPU: {cpu_percent:.1f}% ({cpu_count} cores)")
            
            # Memory Analysis
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            analysis["memory"] = {
                "total_gb": memory.total / (1024**3),
                "used_gb": memory.used / (1024**3),
                "available_gb": memory.available / (1024**3),
                "usage_percent": memory.percent,
                "swap_total_gb": swap.total / (1024**3),
                "swap_used_gb": swap.used / (1024**3),
                "swap_percent": swap.percent
            }
            
            self.record_metric(PerformanceMetric(
                timestamp=datetime.now(),
                metric_name="memory_usage_percent",
                value=memory.percent
            ))
            
            if memory.percent > self.thresholds["memory_percent"]:
                analysis["alerts"].append(f"High memory usage: {memory.percent:.1f}%")
                analysis["recommendations"].append("Monitor for memory leaks or consider scaling")
            
            self.print_info(f"Memory: {memory.percent:.1f}% ({memory.used/(1024**3):.1f}GB / {memory.total/(1024**3):.1f}GB)")
            
            # Disk Analysis
            disk_usage = psutil.disk_usage('/')
            disk_io = psutil.disk_io_counters()
            
            analysis["disk"] = {
                "total_gb": disk_usage.total / (1024**3),
                "used_gb": disk_usage.used / (1024**3),
                "free_gb": disk_usage.free / (1024**3),
                "usage_percent": (disk_usage.used / disk_usage.total) * 100,
                "read_bytes": disk_io.read_bytes if disk_io else 0,
                "write_bytes": disk_io.write_bytes if disk_io else 0
            }
            
            disk_percent = (disk_usage.used / disk_usage.total) * 100
            
            if disk_percent > self.thresholds["disk_io_percent"]:
                analysis["alerts"].append(f"Low disk space: {disk_percent:.1f}% used")
                analysis["recommendations"].append("Free up disk space or expand storage")
            
            self.print_info(f"Disk: {disk_percent:.1f}% ({disk_usage.used/(1024**3):.1f}GB / {disk_usage.total/(1024**3):.1f}GB)")
            
            # Network Analysis
            network_io = psutil.net_io_counters()
            
            if network_io:
                analysis["network"] = {
                    "bytes_sent": network_io.bytes_sent,
                    "bytes_recv": network_io.bytes_recv,
                    "packets_sent": network_io.packets_sent,
                    "packets_recv": network_io.packets_recv,
                    "errors_in": network_io.errin,
                    "errors_out": network_io.errout
                }
                
                self.print_info(f"Network: {network_io.bytes_sent/(1024**2):.1f}MB sent, {network_io.bytes_recv/(1024**2):.1f}MB received")
            
            return analysis
            
        except Exception as e:
            self.print_error(f"System resource analysis failed: {e}")
            return analysis
    
    async def analyze_database_performance(self) -> dict[str, Any]:
        """Analyze database performance"""
        self.print_section("Database Performance Analysis")
        
        db_analysis = {
            "timestamp": datetime.now().isoformat(),
            "connection_test": {},
            "query_performance": {},
            "slow_queries": [],
            "optimization_suggestions": []
        }
        
        try:
            from app.core.config import settings
            
            # Test database connection performance
            start_time = time.time()
            
            engine = create_async_engine(settings.DATABASE_URL)
            
            async with engine.begin() as conn:
                # Simple connection test
                await conn.execute(text("SELECT 1"))
                connection_time = time.time() - start_time
                
                db_analysis["connection_test"] = {
                    "connection_time_ms": connection_time * 1000,
                    "status": "success"
                }
                
                self.record_metric(PerformanceMetric(
                    timestamp=datetime.now(),
                    metric_name="db_connection_time",
                    value=connection_time * 1000
                ))
                
                self.print_info(f"Database connection: {connection_time*1000:.1f}ms")
                
                # Test common queries
                test_queries = [
                    ("SELECT COUNT(*) FROM alembic_version", "migration_check"),
                    ("SELECT 1 as test", "simple_query")
                ]
                
                # Add table-specific queries if tables exist
                if "sqlite" in settings.DATABASE_URL:
                    table_check = await conn.execute(text("""
                        SELECT name FROM sqlite_master 
                        WHERE type='table' AND name NOT LIKE 'sqlite_%'
                    """))
                else:
                    table_check = await conn.execute(text("""
                        SELECT tablename FROM pg_tables 
                        WHERE schemaname = 'public'
                    """))
                
                tables = [row[0] for row in table_check.fetchall()]
                
                if "users" in tables:
                    test_queries.append(("SELECT COUNT(*) FROM users", "user_count"))
                if "profiles" in tables:
                    test_queries.append(("SELECT COUNT(*) FROM profiles", "profile_count"))
                
                query_results = {}
                
                for query, query_name in test_queries:
                    try:
                        start_time = time.time()
                        result = await conn.execute(text(query))
                        query_time = time.time() - start_time
                        
                        # Get result if it's a count query
                        try:
                            count = result.fetchone()
                            result_value = count[0] if count else 0
                        except (AttributeError, IndexError):
                            result_value = "N/A"
                        
                        query_results[query_name] = {
                            "query": query,
                            "execution_time_ms": query_time * 1000,
                            "result": result_value
                        }
                        
                        self.record_metric(PerformanceMetric(
                            timestamp=datetime.now(),
                            metric_name="db_query_time",
                            value=query_time * 1000,
                            tags={"query_type": query_name}
                        ))
                        
                        if query_time * 1000 > self.thresholds["db_query_time_ms"]:
                            db_analysis["slow_queries"].append({
                                "query": query,
                                "execution_time_ms": query_time * 1000,
                                "threshold_ms": self.thresholds["db_query_time_ms"]
                            })
                        
                        self.print_info(f"  {query_name}: {query_time*1000:.1f}ms")
                        
                    except Exception as e:
                        query_results[query_name] = {
                            "query": query,
                            "error": str(e)
                        }
                        self.print_warning(f"  {query_name}: Failed - {e}")
                
                db_analysis["query_performance"] = query_results
                
                # Database-specific optimization suggestions
                if "sqlite" in settings.DATABASE_URL:
                    # Check SQLite-specific optimizations
                    try:
                        pragma_results = {}
                        pragmas = [
                            "PRAGMA journal_mode",
                            "PRAGMA synchronous",
                            "PRAGMA cache_size",
                            "PRAGMA temp_store"
                        ]
                        
                        for pragma in pragmas:
                            result = await conn.execute(text(pragma))
                            value = result.fetchone()[0]
                            pragma_results[pragma.split()[1]] = value
                        
                        db_analysis["sqlite_settings"] = pragma_results
                        
                        # Optimization suggestions for SQLite
                        if pragma_results.get("journal_mode") != "WAL":
                            db_analysis["optimization_suggestions"].append("Enable WAL mode for better concurrency")
                        
                        if int(pragma_results.get("cache_size", 0)) < 10000:
                            db_analysis["optimization_suggestions"].append("Increase cache_size for better performance")
                        
                    except Exception as e:
                        self.print_warning(f"SQLite optimization check failed: {e}")
                
            await engine.dispose()
            
            # General optimization suggestions
            if len(db_analysis["slow_queries"]) > 0:
                db_analysis["optimization_suggestions"].append("Review and optimize slow queries")
                db_analysis["optimization_suggestions"].append("Consider adding database indexes")
            
            if connection_time * 1000 > 100:
                db_analysis["optimization_suggestions"].append("Database connection time is high - check network/config")
            
            return db_analysis
            
        except Exception as e:
            self.print_error(f"Database performance analysis failed: {e}")
            db_analysis["connection_test"] = {
                "status": "failed",
                "error": str(e)
            }
            return db_analysis
    
    async def run_load_test(self, duration_seconds: int = 30, concurrent_requests: int = 10) -> dict[str, Any]:
        """Run load testing on the API"""
        self.print_section(f"Load Testing ({concurrent_requests} concurrent requests for {duration_seconds}s)")
        
        load_test_results = {
            "timestamp": datetime.now().isoformat(),
            "test_parameters": {
                "duration_seconds": duration_seconds,
                "concurrent_requests": concurrent_requests
            },
            "results": {
                "total_requests": 0,
                "successful_requests": 0,
                "failed_requests": 0,
                "response_times": [],
                "status_codes": defaultdict(int),
                "requests_per_second": 0,
                "avg_response_time": 0,
                "min_response_time": 0,
                "max_response_time": 0,
                "p95_response_time": 0,
                "p99_response_time": 0
            },
            "performance_degradation": []
        }
        
        async def make_request(session, url):
            """Make a single request and measure performance"""
            start_time = time.time()
            try:
                response = await session.get(url)
                response_time = time.time() - start_time
                return {
                    "success": True,
                    "status_code": response.status_code,
                    "response_time": response_time
                }
            except Exception as e:
                response_time = time.time() - start_time
                return {
                    "success": False,
                    "error": str(e),
                    "response_time": response_time
                }
        
        try:
            # Run load test
            start_time = time.time()
            test_url = f"{self.base_url}/health"
            
            self.print_info(f"Testing endpoint: {test_url}")
            self.print_info(f"Duration: {duration_seconds}s, Concurrency: {concurrent_requests}")
            
            async with httpx.AsyncClient() as client:
                tasks = []
                
                while time.time() - start_time < duration_seconds:
                    # Create batch of concurrent requests
                    batch_tasks = [
                        make_request(client, test_url)
                        for _ in range(concurrent_requests)
                    ]
                    
                    # Execute batch
                    batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
                    
                    # Process results
                    for result in batch_results:
                        if isinstance(result, dict):
                            load_test_results["results"]["total_requests"] += 1
                            
                            if result["success"]:
                                load_test_results["results"]["successful_requests"] += 1
                                load_test_results["results"]["status_codes"][result["status_code"]] += 1
                            else:
                                load_test_results["results"]["failed_requests"] += 1
                                load_test_results["results"]["status_codes"]["error"] += 1
                            
                            load_test_results["results"]["response_times"].append(result["response_time"])
                            
                            # Record metric
                            self.record_metric(PerformanceMetric(
                                timestamp=datetime.now(),
                                metric_name="load_test_response_time",
                                value=result["response_time"] * 1000,
                                tags={"test_type": "load_test"}
                            ))
                    
                    # Small delay to avoid overwhelming the server
                    await asyncio.sleep(0.1)
            
            # Calculate statistics
            response_times = load_test_results["results"]["response_times"]
            total_duration = time.time() - start_time
            
            if response_times:
                load_test_results["results"]["avg_response_time"] = statistics.mean(response_times)
                load_test_results["results"]["min_response_time"] = min(response_times)
                load_test_results["results"]["max_response_time"] = max(response_times)
                
                # Calculate percentiles
                sorted_times = sorted(response_times)
                n = len(sorted_times)
                load_test_results["results"]["p95_response_time"] = sorted_times[int(n * 0.95)]
                load_test_results["results"]["p99_response_time"] = sorted_times[int(n * 0.99)]
            
            load_test_results["results"]["requests_per_second"] = load_test_results["results"]["total_requests"] / total_duration
            load_test_results["actual_duration"] = total_duration
            
            # Performance analysis
            success_rate = (load_test_results["results"]["successful_requests"] / 
                          max(load_test_results["results"]["total_requests"], 1)) * 100
            
            # Check for performance degradation
            if load_test_results["results"]["avg_response_time"] > self.thresholds["response_time_ms"] / 1000:
                load_test_results["performance_degradation"].append("Average response time exceeds threshold under load")
            
            if success_rate < 95:
                load_test_results["performance_degradation"].append(f"Low success rate under load: {success_rate:.1f}%")
            
            if load_test_results["results"]["requests_per_second"] < 50:
                load_test_results["performance_degradation"].append("Low throughput under load")
            
            # Print results
            self.print_info(f"Total requests: {load_test_results['results']['total_requests']}")
            self.print_info(f"Success rate: {success_rate:.1f}%")
            self.print_info(f"Requests/second: {load_test_results['results']['requests_per_second']:.1f}")
            self.print_info(f"Avg response time: {load_test_results['results']['avg_response_time']*1000:.1f}ms")
            self.print_info(f"P95 response time: {load_test_results['results']['p95_response_time']*1000:.1f}ms")
            
            return load_test_results
            
        except Exception as e:
            self.print_error(f"Load testing failed: {e}")
            load_test_results["error"] = str(e)
            return load_test_results
    
    async def generate_performance_charts(self, metrics_data: dict[str, Any]) -> bool:
        """Generate performance visualization charts"""
        self.print_section("Performance Visualization")
        
        try:
            # Set up matplotlib
            plt.style.use('seaborn-v0_8')
            
            # Create a comprehensive performance dashboard
            fig, axes = plt.subplots(2, 2, figsize=(15, 10))
            fig.suptitle('Fynix Performance Dashboard', fontsize=16, fontweight='bold')
            
            # Chart 1: Response Times Over Time
            if self.performance_data["api_response_time"]:
                timestamps = [m["timestamp"] for m in self.performance_data["api_response_time"]]
                response_times = [m["value"] for m in self.performance_data["api_response_time"]]
                
                axes[0, 0].plot(timestamps, response_times, marker='o', linewidth=2, markersize=4)
                axes[0, 0].set_title('API Response Times', fontweight='bold')
                axes[0, 0].set_ylabel('Response Time (ms)')
                axes[0, 0].grid(True, alpha=0.3)
                axes[0, 0].tick_params(axis='x', rotation=45)
                
                # Add threshold line
                axes[0, 0].axhline(y=self.thresholds["response_time_ms"], color='red', linestyle='--', alpha=0.7, label='Threshold')
                axes[0, 0].legend()
            else:
                axes[0, 0].text(0.5, 0.5, 'No API response time data', ha='center', va='center', transform=axes[0, 0].transAxes)
                axes[0, 0].set_title('API Response Times')
            
            # Chart 2: System Resource Usage
            if self.performance_data["cpu_usage_percent"] and self.performance_data["memory_usage_percent"]:
                timestamps_cpu = [m["timestamp"] for m in self.performance_data["cpu_usage_percent"]]
                cpu_usage = [m["value"] for m in self.performance_data["cpu_usage_percent"]]
                
                timestamps_mem = [m["timestamp"] for m in self.performance_data["memory_usage_percent"]]
                memory_usage = [m["value"] for m in self.performance_data["memory_usage_percent"]]
                
                axes[0, 1].plot(timestamps_cpu, cpu_usage, marker='s', linewidth=2, markersize=4, label='CPU %', color='blue')
                axes[0, 1].plot(timestamps_mem, memory_usage, marker='^', linewidth=2, markersize=4, label='Memory %', color='green')
                axes[0, 1].set_title('System Resource Usage', fontweight='bold')
                axes[0, 1].set_ylabel('Usage (%)')
                axes[0, 1].grid(True, alpha=0.3)
                axes[0, 1].legend()
                axes[0, 1].tick_params(axis='x', rotation=45)
            else:
                axes[0, 1].text(0.5, 0.5, 'No system resource data', ha='center', va='center', transform=axes[0, 1].transAxes)
                axes[0, 1].set_title('System Resource Usage')
            
            # Chart 3: Database Performance
            if self.performance_data["db_query_time"]:
                query_times = [m["value"] for m in self.performance_data["db_query_time"]]
                
                axes[1, 0].hist(query_times, bins=20, alpha=0.7, color='purple', edgecolor='black')
                axes[1, 0].set_title('Database Query Time Distribution', fontweight='bold')
                axes[1, 0].set_xlabel('Query Time (ms)')
                axes[1, 0].set_ylabel('Frequency')
                axes[1, 0].grid(True, alpha=0.3)
                
                # Add threshold line
                axes[1, 0].axvline(x=self.thresholds["db_query_time_ms"], color='red', linestyle='--', alpha=0.7, label='Threshold')
                axes[1, 0].legend()
            else:
                axes[1, 0].text(0.5, 0.5, 'No database query data', ha='center', va='center', transform=axes[1, 0].transAxes)
                axes[1, 0].set_title('Database Query Time Distribution')
            
            # Chart 4: Load Test Results (if available)
            if "load_test_response_time" in self.performance_data:
                load_test_times = [m["value"] for m in self.performance_data["load_test_response_time"]]
                
                # Box plot for load test response times
                axes[1, 1].boxplot(load_test_times, patch_artist=True, 
                                 boxprops=dict(facecolor='lightblue', alpha=0.7))
                axes[1, 1].set_title('Load Test Response Time Distribution', fontweight='bold')
                axes[1, 1].set_ylabel('Response Time (ms)')
                axes[1, 1].grid(True, alpha=0.3)
                
                # Add statistics text
                if load_test_times:
                    mean_time = statistics.mean(load_test_times)
                    p95_time = sorted(load_test_times)[int(len(load_test_times) * 0.95)]
                    axes[1, 1].text(0.02, 0.98, f'Mean: {mean_time:.1f}ms\nP95: {p95_time:.1f}ms', 
                                   transform=axes[1, 1].transAxes, verticalalignment='top',
                                   bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
            else:
                axes[1, 1].text(0.5, 0.5, 'No load test data', ha='center', va='center', transform=axes[1, 1].transAxes)
                axes[1, 1].set_title('Load Test Response Time Distribution')
            
            # Adjust layout and save
            plt.tight_layout()
            
            chart_file = self.charts_dir / f"performance_dashboard_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            plt.savefig(chart_file, dpi=300, bbox_inches='tight')
            plt.close()
            
            self.print_success(f"Performance dashboard saved: {chart_file.name}")
            
            # Create individual metric charts
            await self._create_individual_charts()
            
            return True
            
        except Exception as e:
            self.print_error(f"Chart generation failed: {e}")
            return False
    
    async def _create_individual_charts(self):
        """Create individual charts for each metric type"""
        try:
            # Response time trend chart
            if self.performance_data["api_response_time"]:
                plt.figure(figsize=(12, 6))
                
                timestamps = [m["timestamp"] for m in self.performance_data["api_response_time"]]
                response_times = [m["value"] for m in self.performance_data["api_response_time"]]
                
                plt.plot(timestamps, response_times, marker='o', linewidth=2, markersize=6, color='blue')
                plt.axhline(y=self.thresholds["response_time_ms"], color='red', linestyle='--', alpha=0.7, label='Threshold (500ms)')
                
                plt.title('API Response Time Trend', fontsize=14, fontweight='bold')
                plt.xlabel('Time')
                plt.ylabel('Response Time (ms)')
                plt.grid(True, alpha=0.3)
                plt.legend()
                plt.xticks(rotation=45)
                
                chart_file = self.charts_dir / f"response_time_trend_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                plt.savefig(chart_file, dpi=300, bbox_inches='tight')
                plt.close()
                
                self.print_info(f"Response time trend chart saved: {chart_file.name}")
            
        except Exception as e:
            self.print_warning(f"Individual chart creation failed: {e}")
    
    async def generate_optimization_report(self) -> dict[str, Any]:
        """Generate comprehensive optimization report"""
        self.print_section("Optimization Report Generation")
        
        # Collect all performance data
        profiling_data = await self.profile_application_performance()
        system_analysis = await self.analyze_system_resources()
        db_analysis = await self.analyze_database_performance()
        load_test_data = await self.run_load_test(duration_seconds=15, concurrent_requests=5)
        
        # Generate charts
        charts_created = await self.generate_performance_charts({
            "profiling": profiling_data,
            "system": system_analysis,
            "database": db_analysis,
            "load_test": load_test_data
        })
        
        # Compile comprehensive report
        report = {
            "timestamp": datetime.now().isoformat(),
            "executive_summary": {},
            "performance_analysis": {
                "application_profiling": profiling_data,
                "system_resources": system_analysis,
                "database_performance": db_analysis,
                "load_testing": load_test_data
            },
            "optimization_recommendations": [],
            "performance_score": 0,
            "charts_available": charts_created
        }
        
        # Calculate performance score (0-100)
        score_factors = []
        
        # API response time score
        if profiling_data.get("profiles"):
            avg_response_time = statistics.mean([
                p.get("response_time", 1) * 1000 
                for p in profiling_data["profiles"].values() 
                if p.get("response_time")
            ])
            
            if avg_response_time < 100:
                score_factors.append(100)  # Excellent
            elif avg_response_time < 250:
                score_factors.append(85)   # Good
            elif avg_response_time < 500:
                score_factors.append(70)   # Fair
            else:
                score_factors.append(40)   # Poor
        
        # System resource score
        cpu_usage = system_analysis.get("cpu", {}).get("usage_percent", 0)
        memory_usage = system_analysis.get("memory", {}).get("usage_percent", 0)
        
        resource_score = 100 - max(cpu_usage, memory_usage)
        score_factors.append(max(resource_score, 0))
        
        # Database performance score
        if db_analysis.get("connection_test", {}).get("connection_time_ms", 1000) < 50:
            score_factors.append(100)
        elif db_analysis.get("connection_test", {}).get("connection_time_ms", 1000) < 100:
            score_factors.append(80)
        else:
            score_factors.append(60)
        
        # Load test score
        if load_test_data.get("results"):
            success_rate = (load_test_data["results"].get("successful_requests", 0) / 
                          max(load_test_data["results"].get("total_requests", 1), 1)) * 100
            score_factors.append(success_rate)
        
        # Calculate overall score
        if score_factors:
            report["performance_score"] = round(statistics.mean(score_factors), 1)
        
        # Generate recommendations based on analysis
        recommendations = []
        
        # Application optimization
        if profiling_data.get("hotspots"):
            recommendations.append("Optimize slow API endpoints identified in profiling")
        
        # System optimization
        if system_analysis.get("alerts"):
            recommendations.extend([f"System: {alert}" for alert in system_analysis["alerts"]])
        
        # Database optimization
        if db_analysis.get("optimization_suggestions"):
            recommendations.extend([f"Database: {sugg}" for sugg in db_analysis["optimization_suggestions"]])
        
        # Load test optimization
        if load_test_data.get("performance_degradation"):
            recommendations.extend([f"Load handling: {deg}" for deg in load_test_data["performance_degradation"]])
        
        report["optimization_recommendations"] = recommendations
        
        # Executive summary
        report["executive_summary"] = {
            "overall_status": "Excellent" if report["performance_score"] >= 90 else
                            "Good" if report["performance_score"] >= 75 else
                            "Fair" if report["performance_score"] >= 60 else "Poor",
            "performance_score": report["performance_score"],
            "critical_issues": len([r for r in recommendations if "critical" in r.lower()]),
            "optimization_opportunities": len(recommendations),
            "system_health": "Healthy" if not system_analysis.get("alerts") else "Needs Attention"
        }
        
        # Save comprehensive report
        report_file = self.reports_dir / f"performance_optimization_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        async with aiofiles.open(report_file, 'w') as f:
            await f.write(json.dumps(report, indent=2, default=str))
        
        self.print_success(f"Comprehensive optimization report saved: {report_file.name}")
        
        return report
    
    async def run_comprehensive_analysis(self) -> bool:
        """Run complete performance analysis suite"""
        self.print_header("Fynix Performance Optimization & Analytics Suite")
        
        print(f"{Colors.WHITE}Running comprehensive performance analysis and optimization{Colors.END}")
        print(f"{Colors.WHITE}Analysis started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.END}")
        
        try:
            # Generate comprehensive optimization report
            report = await self.generate_optimization_report()
            
            # Display summary
            self.print_header("Performance Analysis Summary")
            
            print(f"{Colors.BOLD}Overall Performance Score: {Colors.GREEN if report['performance_score'] >= 75 else Colors.YELLOW if report['performance_score'] >= 50 else Colors.RED}{report['performance_score']:.1f}/100{Colors.END}")
            print(f"{Colors.BOLD}System Status: {Colors.WHITE}{report['executive_summary']['overall_status']}{Colors.END}")
            
            if report["optimization_recommendations"]:
                print(f"\n{Colors.YELLOW}🔧 Optimization Recommendations:{Colors.END}")
                for i, rec in enumerate(report["optimization_recommendations"][:5], 1):
                    print(f"  {i}. {rec}")
                
                if len(report["optimization_recommendations"]) > 5:
                    print(f"  ... and {len(report['optimization_recommendations']) - 5} more (see full report)")
            else:
                print(f"\n{Colors.GREEN}🎉 No optimization recommendations - system performing well!{Colors.END}")
            
            print(f"\n{Colors.CYAN}📊 Analysis Complete:{Colors.END}")
            print("  • Application profiling completed")
            print("  • System resource analysis completed")
            print("  • Database performance analyzed")
            print("  • Load testing performed")
            print("  • Performance charts generated")
            
            return report['performance_score'] >= 50
            
        except Exception as e:
            self.print_error(f"Comprehensive analysis failed: {e}")
            return False

async def main():
    """Main performance optimization execution"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Fynix Performance Optimization Suite")
    parser.add_argument("--url", default="http://localhost:8002", help="Base URL for testing")
    parser.add_argument("--duration", type=int, default=30, help="Load test duration in seconds")
    parser.add_argument("--concurrency", type=int, default=10, help="Concurrent requests for load testing")
    
    args = parser.parse_args()
    
    optimizer = PerformanceOptimizer(args.url)
    
    try:
        success = await optimizer.run_comprehensive_analysis()
        return success
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Performance analysis interrupted by user{Colors.END}")
        return False
    except Exception as e:
        print(f"\n{Colors.RED}Performance analysis failed: {e}{Colors.END}")
        return False

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Performance optimizer failed: {e}")
        sys.exit(1)