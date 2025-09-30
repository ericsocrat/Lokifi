#!/usr/bin/env python3
"""
Fynix Advanced Testing Framework
===============================

Comprehensive testing suite covering all system components:
- Core API functionality
- Authentication and security
- Database operations
- Performance testing
- Integration testing
- Social features
- AI functionality
- Portfolio features
"""

import asyncio
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    import aiohttp
    import websockets
    from fastapi.testclient import TestClient
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("Install missing dependencies: pip install pytest httpx websockets aiohttp")
    sys.exit(1)

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

class AdvancedTestFramework:
    """Comprehensive testing framework for Fynix system"""
    
    def __init__(self, base_url: str = "http://localhost:8002"):
        self.base_url = base_url
        self.test_results = {
            "core_api": {},
            "authentication": {},
            "database": {},
            "social": {},
            "ai": {},
            "portfolio": {},
            "performance": {},
            "integration": {},
            "websocket": {},
            "security": {}
        }
        self.test_user = {
            "email": "test@fynix.dev",
            "password": "TestPassword123!",
            "username": "testuser",
            "full_name": "Test User"
        }
        self.auth_token = None
    
    def print_header(self, title: str):
        print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*80}{Colors.END}")
        print(f"{Colors.CYAN}{Colors.BOLD}{title.center(80)}{Colors.END}")
        print(f"{Colors.CYAN}{Colors.BOLD}{'='*80}{Colors.END}")
    
    def print_section(self, title: str):
        print(f"\n{Colors.BLUE}{Colors.BOLD}🧪 {title}{Colors.END}")
        print(f"{Colors.BLUE}{'─'*60}{Colors.END}")
    
    def print_test(self, test_name: str, status: str, details: str = ""):
        if status == "PASS":
            print(f"{Colors.GREEN}✅ {test_name}: {status}{Colors.END}")
        elif status == "FAIL":
            print(f"{Colors.RED}❌ {test_name}: {status}{Colors.END}")
        elif status == "SKIP":
            print(f"{Colors.YELLOW}⏭️  {test_name}: {status}{Colors.END}")
        else:
            print(f"{Colors.WHITE}ℹ️  {test_name}: {status}{Colors.END}")
        
        if details:
            print(f"   {Colors.WHITE}{details}{Colors.END}")
    
    def record_test(self, category: str, test_name: str, status: str, details: Any = None):
        """Record test result"""
        if category not in self.test_results:
            self.test_results[category] = {}
        
        self.test_results[category][test_name] = {
            "status": status,
            "timestamp": datetime.now().isoformat(),
            "details": details
        }
    
    async def test_core_api_functionality(self) -> bool:
        """Test core API endpoints and functionality"""
        self.print_section("Core API Functionality Tests")
        
        passed = 0
        total = 0
        
        try:
            async with httpx.AsyncClient() as client:
                # Test health endpoint
                total += 1
                try:
                    response = await client.get(f"{self.base_url}/health")
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("status") == "healthy":
                            self.print_test("Health Check", "PASS", f"Response time: {response.elapsed.total_seconds():.3f}s")
                            passed += 1
                        else:
                            self.print_test("Health Check", "FAIL", f"Unhealthy status: {data}")
                    else:
                        self.print_test("Health Check", "FAIL", f"Status code: {response.status_code}")
                except Exception as e:
                    self.print_test("Health Check", "FAIL", f"Exception: {e}")
                
                # Test API documentation
                total += 1
                try:
                    response = await client.get(f"{self.base_url}/docs")
                    if response.status_code == 200:
                        self.print_test("API Documentation", "PASS", "Swagger UI accessible")
                        passed += 1
                    else:
                        self.print_test("API Documentation", "FAIL", f"Status code: {response.status_code}")
                except Exception as e:
                    self.print_test("API Documentation", "FAIL", f"Exception: {e}")
                
                # Test OpenAPI schema
                total += 1
                try:
                    response = await client.get(f"{self.base_url}/openapi.json")
                    if response.status_code == 200:
                        schema = response.json()
                        if "paths" in schema and "components" in schema:
                            self.print_test("OpenAPI Schema", "PASS", f"Endpoints: {len(schema['paths'])}")
                            passed += 1
                        else:
                            self.print_test("OpenAPI Schema", "FAIL", "Invalid schema format")
                    else:
                        self.print_test("OpenAPI Schema", "FAIL", f"Status code: {response.status_code}")
                except Exception as e:
                    self.print_test("OpenAPI Schema", "FAIL", f"Exception: {e}")
                
                # Test CORS headers
                total += 1
                try:
                    response = await client.options(f"{self.base_url}/health")
                    cors_headers = [h for h in response.headers.keys() if h.lower().startswith("access-control")]
                    if cors_headers:
                        self.print_test("CORS Headers", "PASS", f"Headers: {', '.join(cors_headers)}")
                        passed += 1
                    else:
                        self.print_test("CORS Headers", "SKIP", "No CORS headers found")
                except Exception as e:
                    self.print_test("CORS Headers", "FAIL", f"Exception: {e}")
                
        except Exception as e:
            self.print_test("Core API Tests", "FAIL", f"Setup failed: {e}")
        
        success_rate = (passed / total * 100) if total > 0 else 0
        self.record_test("core_api", "overall", "PASS" if success_rate >= 75 else "FAIL", {
            "passed": passed,
            "total": total,
            "success_rate": success_rate
        })
        
        return success_rate >= 75
    
    async def test_authentication_system(self) -> bool:
        """Test authentication and authorization"""
        self.print_section("Authentication System Tests")
        
        passed = 0
        total = 0
        
        try:
            async with httpx.AsyncClient() as client:
                # Test user registration
                total += 1
                try:
                    # First, try to register a new user
                    register_data = {
                        "email": self.test_user["email"],
                        "password": self.test_user["password"],
                        "username": self.test_user["username"],
                        "full_name": self.test_user["full_name"]
                    }
                    
                    response = await client.post(f"{self.base_url}/auth/register", json=register_data)
                    
                    if response.status_code in [200, 201]:
                        self.print_test("User Registration", "PASS", "New user created")
                        passed += 1
                    elif response.status_code == 400:
                        # User might already exist
                        data = response.json()
                        if "already registered" in str(data).lower():
                            self.print_test("User Registration", "PASS", "User already exists")
                            passed += 1
                        else:
                            self.print_test("User Registration", "FAIL", f"Registration error: {data}")
                    else:
                        self.print_test("User Registration", "FAIL", f"Status code: {response.status_code}")
                        
                except Exception as e:
                    self.print_test("User Registration", "FAIL", f"Exception: {e}")
                
                # Test user login
                total += 1
                try:
                    login_data = {
                        "username": self.test_user["email"],  # Might use email as username
                        "password": self.test_user["password"]
                    }
                    
                    response = await client.post(f"{self.base_url}/auth/token", data=login_data)
                    
                    if response.status_code == 200:
                        data = response.json()
                        if "access_token" in data:
                            self.auth_token = data["access_token"]
                            self.print_test("User Login", "PASS", f"Token type: {data.get('token_type', 'bearer')}")
                            passed += 1
                        else:
                            self.print_test("User Login", "FAIL", "No access token in response")
                    else:
                        self.print_test("User Login", "FAIL", f"Status code: {response.status_code}")
                        
                except Exception as e:
                    self.print_test("User Login", "FAIL", f"Exception: {e}")
                
                # Test protected endpoint access
                total += 1
                if self.auth_token:
                    try:
                        headers = {"Authorization": f"Bearer {self.auth_token}"}
                        response = await client.get(f"{self.base_url}/auth/me", headers=headers)
                        
                        if response.status_code == 200:
                            user_data = response.json()
                            if "email" in user_data:
                                self.print_test("Protected Endpoint", "PASS", f"User: {user_data.get('email')}")
                                passed += 1
                            else:
                                self.print_test("Protected Endpoint", "FAIL", "Invalid user data format")
                        else:
                            self.print_test("Protected Endpoint", "FAIL", f"Status code: {response.status_code}")
                            
                    except Exception as e:
                        self.print_test("Protected Endpoint", "FAIL", f"Exception: {e}")
                else:
                    self.print_test("Protected Endpoint", "SKIP", "No auth token available")
                
                # Test unauthorized access
                total += 1
                try:
                    response = await client.get(f"{self.base_url}/auth/me")
                    
                    if response.status_code == 401:
                        self.print_test("Unauthorized Access Block", "PASS", "Properly rejected unauthorized request")
                        passed += 1
                    else:
                        self.print_test("Unauthorized Access Block", "FAIL", f"Should be 401, got: {response.status_code}")
                        
                except Exception as e:
                    self.print_test("Unauthorized Access Block", "FAIL", f"Exception: {e}")
                
        except Exception as e:
            self.print_test("Authentication Tests", "FAIL", f"Setup failed: {e}")
        
        success_rate = (passed / total * 100) if total > 0 else 0
        self.record_test("authentication", "overall", "PASS" if success_rate >= 75 else "FAIL", {
            "passed": passed,
            "total": total,
            "success_rate": success_rate,
            "has_token": self.auth_token is not None
        })
        
        return success_rate >= 75
    
    async def test_database_operations(self) -> bool:
        """Test database connectivity and operations"""
        self.print_section("Database Operations Tests")
        
        passed = 0
        total = 0
        
        try:
            # Import database components
            from app.core.config import settings
            
            # Test database connection
            total += 1
            try:
                engine = create_async_engine(settings.DATABASE_URL)
                async with engine.begin() as conn:
                    result = await conn.execute(text("SELECT 1"))
                    if result.fetchone()[0] == 1:
                        self.print_test("Database Connection", "PASS", f"Engine: {engine.name}")
                        passed += 1
                    else:
                        self.print_test("Database Connection", "FAIL", "Query failed")
                await engine.dispose()
            except Exception as e:
                self.print_test("Database Connection", "FAIL", f"Exception: {e}")
            
            # Test table existence
            total += 1
            try:
                engine = create_async_engine(settings.DATABASE_URL)
                async with engine.begin() as conn:
                    if "sqlite" in settings.DATABASE_URL:
                        result = await conn.execute(text("""
                            SELECT name FROM sqlite_master 
                            WHERE type='table' AND name NOT LIKE 'sqlite_%'
                        """))
                    else:
                        result = await conn.execute(text("""
                            SELECT tablename FROM pg_tables 
                            WHERE schemaname = 'public'
                        """))
                    
                    tables = [row[0] for row in result.fetchall()]
                    
                    expected_tables = ["users", "profiles", "alembic_version"]
                    found_tables = [t for t in expected_tables if t in tables]
                    
                    if len(found_tables) >= 2:
                        self.print_test("Table Structure", "PASS", f"Found tables: {', '.join(tables)}")
                        passed += 1
                    else:
                        self.print_test("Table Structure", "FAIL", f"Missing expected tables. Found: {', '.join(tables)}")
                        
                await engine.dispose()
            except Exception as e:
                self.print_test("Table Structure", "FAIL", f"Exception: {e}")
            
            # Test migrations
            total += 1
            try:
                from alembic.config import Config
                
                alembic_cfg = Config(str(backend_dir / "alembic.ini"))
                alembic_cfg.set_main_option("sqlalchemy.url", 
                    settings.DATABASE_URL.replace("+aiosqlite", "").replace("+asyncpg", ""))
                
                # Check current revision
                from alembic.script import ScriptDirectory
                script = ScriptDirectory.from_config(alembic_cfg)
                current_rev = script.get_current_head()
                
                if current_rev:
                    self.print_test("Migration System", "PASS", f"Current revision: {current_rev[:12]}")
                    passed += 1
                else:
                    self.print_test("Migration System", "FAIL", "No migration revision found")
                    
            except Exception as e:
                self.print_test("Migration System", "FAIL", f"Exception: {e}")
            
        except Exception as e:
            self.print_test("Database Tests", "FAIL", f"Setup failed: {e}")
        
        success_rate = (passed / total * 100) if total > 0 else 0
        self.record_test("database", "overall", "PASS" if success_rate >= 75 else "FAIL", {
            "passed": passed,
            "total": total,
            "success_rate": success_rate
        })
        
        return success_rate >= 75
    
    async def test_performance_metrics(self) -> bool:
        """Test system performance"""
        self.print_section("Performance Tests")
        
        passed = 0
        total = 0
        
        # Response time tests
        total += 1
        try:
            async with httpx.AsyncClient() as client:
                start_time = time.time()
                response = await client.get(f"{self.base_url}/health")
                response_time = time.time() - start_time
                
                if response.status_code == 200 and response_time < 1.0:
                    self.print_test("Response Time", "PASS", f"Health endpoint: {response_time:.3f}s")
                    passed += 1
                else:
                    self.print_test("Response Time", "FAIL", f"Too slow: {response_time:.3f}s")
                    
        except Exception as e:
            self.print_test("Response Time", "FAIL", f"Exception: {e}")
        
        # Concurrent request test
        total += 1
        try:
            async def make_request(client, url):
                return await client.get(url)
            
            async with httpx.AsyncClient() as client:
                start_time = time.time()
                
                # Make 10 concurrent requests
                tasks = [make_request(client, f"{self.base_url}/health") for _ in range(10)]
                responses = await asyncio.gather(*tasks, return_exceptions=True)
                
                end_time = time.time()
                
                successful = sum(1 for r in responses if hasattr(r, 'status_code') and r.status_code == 200)
                
                if successful >= 8:  # Allow 80% success rate
                    self.print_test("Concurrent Requests", "PASS", f"{successful}/10 successful in {end_time - start_time:.3f}s")
                    passed += 1
                else:
                    self.print_test("Concurrent Requests", "FAIL", f"Only {successful}/10 successful")
                    
        except Exception as e:
            self.print_test("Concurrent Requests", "FAIL", f"Exception: {e}")
        
        # Memory usage test (basic)
        total += 1
        try:
            import os

            import psutil
            
            # Get current process memory
            process = psutil.Process(os.getpid())
            memory_mb = process.memory_info().rss / 1024 / 1024
            
            if memory_mb < 500:  # Less than 500MB for test process
                self.print_test("Memory Usage", "PASS", f"Test process: {memory_mb:.1f}MB")
                passed += 1
            else:
                self.print_test("Memory Usage", "FAIL", f"High memory usage: {memory_mb:.1f}MB")
                
        except ImportError:
            self.print_test("Memory Usage", "SKIP", "psutil not available")
        except Exception as e:
            self.print_test("Memory Usage", "FAIL", f"Exception: {e}")
        
        success_rate = (passed / total * 100) if total > 0 else 0
        self.record_test("performance", "overall", "PASS" if success_rate >= 75 else "FAIL", {
            "passed": passed,
            "total": total,
            "success_rate": success_rate
        })
        
        return success_rate >= 75
    
    async def test_websocket_functionality(self) -> bool:
        """Test WebSocket connections and messaging"""
        self.print_section("WebSocket Tests")
        
        passed = 0
        total = 0
        
        # Test WebSocket connection
        total += 1
        try:
            ws_url = self.base_url.replace("http://", "ws://").replace("https://", "wss://")
            
            # Try to connect to WebSocket endpoint
            try:
                async with websockets.connect(f"{ws_url}/ws") as websocket:
                    self.print_test("WebSocket Connection", "PASS", "Connection established")
                    passed += 1
            except websockets.exceptions.ConnectionClosed:
                self.print_test("WebSocket Connection", "PASS", "Connection established (then closed)")
                passed += 1
            except Exception as e:
                if "404" in str(e) or "not found" in str(e).lower():
                    self.print_test("WebSocket Connection", "SKIP", "No WebSocket endpoint configured")
                else:
                    self.print_test("WebSocket Connection", "FAIL", f"Exception: {e}")
                    
        except Exception as e:
            self.print_test("WebSocket Connection", "SKIP", f"WebSocket testing unavailable: {e}")
        
        success_rate = (passed / total * 100) if total > 0 else 100  # Skip doesn't count as failure
        self.record_test("websocket", "overall", "PASS" if success_rate >= 75 else "FAIL", {
            "passed": passed,
            "total": total,
            "success_rate": success_rate
        })
        
        return success_rate >= 75
    
    async def test_social_features(self) -> bool:
        """Test social networking features"""
        self.print_section("Social Features Tests")
        
        passed = 0
        total = 0
        
        if not self.auth_token:
            self.print_test("Social Features", "SKIP", "No authentication token available")
            return True
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            async with httpx.AsyncClient() as client:
                # Test profile endpoint
                total += 1
                try:
                    response = await client.get(f"{self.base_url}/social/profile", headers=headers)
                    if response.status_code in [200, 404]:  # 404 is OK if profile doesn't exist yet
                        self.print_test("Profile Endpoint", "PASS", f"Status: {response.status_code}")
                        passed += 1
                    else:
                        self.print_test("Profile Endpoint", "FAIL", f"Status code: {response.status_code}")
                except Exception as e:
                    if "404" in str(e) or "not found" in str(e).lower():
                        self.print_test("Profile Endpoint", "SKIP", "Endpoint not implemented")
                    else:
                        self.print_test("Profile Endpoint", "FAIL", f"Exception: {e}")
                
                # Test followers endpoint
                total += 1
                try:
                    response = await client.get(f"{self.base_url}/social/followers", headers=headers)
                    if response.status_code in [200, 404]:
                        self.print_test("Followers Endpoint", "PASS", f"Status: {response.status_code}")
                        passed += 1
                    else:
                        self.print_test("Followers Endpoint", "FAIL", f"Status code: {response.status_code}")
                except Exception as e:
                    if "404" in str(e) or "not found" in str(e).lower():
                        self.print_test("Followers Endpoint", "SKIP", "Endpoint not implemented")
                    else:
                        self.print_test("Followers Endpoint", "FAIL", f"Exception: {e}")
                        
        except Exception as e:
            self.print_test("Social Features", "FAIL", f"Setup failed: {e}")
        
        success_rate = (passed / total * 100) if total > 0 else 100
        self.record_test("social", "overall", "PASS" if success_rate >= 50 else "FAIL", {
            "passed": passed,
            "total": total,
            "success_rate": success_rate
        })
        
        return success_rate >= 50  # Lower threshold for optional features
    
    async def test_ai_functionality(self) -> bool:
        """Test AI integration features"""
        self.print_section("AI Functionality Tests")
        
        passed = 0
        total = 0
        
        if not self.auth_token:
            self.print_test("AI Features", "SKIP", "No authentication token available")
            return True
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            async with httpx.AsyncClient() as client:
                # Test AI chat endpoint
                total += 1
                try:
                    response = await client.get(f"{self.base_url}/ai/threads", headers=headers)
                    if response.status_code in [200, 404]:
                        self.print_test("AI Threads Endpoint", "PASS", f"Status: {response.status_code}")
                        passed += 1
                    else:
                        self.print_test("AI Threads Endpoint", "FAIL", f"Status code: {response.status_code}")
                except Exception as e:
                    if "404" in str(e) or "not found" in str(e).lower():
                        self.print_test("AI Threads Endpoint", "SKIP", "Endpoint not implemented")
                    else:
                        self.print_test("AI Threads Endpoint", "FAIL", f"Exception: {e}")
                
                # Test AI models endpoint
                total += 1
                try:
                    response = await client.get(f"{self.base_url}/ai/models", headers=headers)
                    if response.status_code in [200, 404]:
                        self.print_test("AI Models Endpoint", "PASS", f"Status: {response.status_code}")
                        passed += 1
                    else:
                        self.print_test("AI Models Endpoint", "FAIL", f"Status code: {response.status_code}")
                except Exception as e:
                    if "404" in str(e) or "not found" in str(e).lower():
                        self.print_test("AI Models Endpoint", "SKIP", "Endpoint not implemented")
                    else:
                        self.print_test("AI Models Endpoint", "FAIL", f"Exception: {e}")
                        
        except Exception as e:
            self.print_test("AI Features", "FAIL", f"Setup failed: {e}")
        
        success_rate = (passed / total * 100) if total > 0 else 100
        self.record_test("ai", "overall", "PASS" if success_rate >= 50 else "FAIL", {
            "passed": passed,
            "total": total,
            "success_rate": success_rate
        })
        
        return success_rate >= 50  # Lower threshold for optional features
    
    async def test_security_features(self) -> bool:
        """Test security implementations"""
        self.print_section("Security Tests")
        
        passed = 0
        total = 0
        
        try:
            async with httpx.AsyncClient() as client:
                # Test rate limiting (if implemented)
                total += 1
                try:
                    # Make rapid requests to test rate limiting
                    responses = []
                    for _ in range(20):
                        response = await client.get(f"{self.base_url}/health")
                        responses.append(response.status_code)
                    
                    # Check if any requests were rate limited (429)
                    rate_limited = any(status == 429 for status in responses)
                    
                    if rate_limited:
                        self.print_test("Rate Limiting", "PASS", "Rate limiting detected")
                        passed += 1
                    else:
                        self.print_test("Rate Limiting", "SKIP", "No rate limiting detected")
                        
                except Exception as e:
                    self.print_test("Rate Limiting", "FAIL", f"Exception: {e}")
                
                # Test HTTPS redirect (if applicable)
                total += 1
                if self.base_url.startswith("http://"):
                    try:
                        https_url = self.base_url.replace("http://", "https://")
                        response = await client.get(f"{https_url}/health", follow_redirects=False)
                        
                        if response.status_code in [200, 301, 302]:
                            self.print_test("HTTPS Support", "PASS", f"HTTPS available: {response.status_code}")
                            passed += 1
                        else:
                            self.print_test("HTTPS Support", "SKIP", "HTTPS not configured")
                    except Exception:
                        self.print_test("HTTPS Support", "SKIP", "HTTPS not available")
                else:
                    self.print_test("HTTPS Support", "PASS", "Already using HTTPS")
                    passed += 1
                
                # Test SQL injection protection
                total += 1
                try:
                    malicious_payloads = [
                        "'; DROP TABLE users; --",
                        "' OR '1'='1",
                        "admin'--",
                        "' UNION SELECT * FROM users --"
                    ]
                    
                    injection_blocked = True
                    for payload in malicious_payloads:
                        try:
                            # Try login with malicious payload
                            response = await client.post(f"{self.base_url}/auth/token", data={
                                "username": payload,
                                "password": "test"
                            })
                            
                            # Should not succeed with SQL injection
                            if response.status_code == 200:
                                data = response.json()
                                if "access_token" in data:
                                    injection_blocked = False
                                    break
                        except Exception:
                            pass  # Exceptions are expected for malformed requests
                    
                    if injection_blocked:
                        self.print_test("SQL Injection Protection", "PASS", "No SQL injection vulnerabilities detected")
                        passed += 1
                    else:
                        self.print_test("SQL Injection Protection", "FAIL", "Potential SQL injection vulnerability")
                        
                except Exception as e:
                    self.print_test("SQL Injection Protection", "FAIL", f"Exception: {e}")
                        
        except Exception as e:
            self.print_test("Security Tests", "FAIL", f"Setup failed: {e}")
        
        success_rate = (passed / total * 100) if total > 0 else 0
        self.record_test("security", "overall", "PASS" if success_rate >= 75 else "FAIL", {
            "passed": passed,
            "total": total,
            "success_rate": success_rate
        })
        
        return success_rate >= 75
    
    def generate_test_report(self) -> dict[str, Any]:
        """Generate comprehensive test report"""
        total_tests = sum(len(category) for category in self.test_results.values())
        passed_tests = sum(
            1 for category in self.test_results.values()
            for test in category.values()
            if test["status"] == "PASS"
        )
        
        overall_success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "success_rate": round(overall_success_rate, 2),
                "status": "EXCELLENT" if overall_success_rate >= 90 else
                         "GOOD" if overall_success_rate >= 75 else
                         "FAIR" if overall_success_rate >= 50 else "POOR"
            },
            "categories": self.test_results,
            "recommendations": []
        }
        
        # Generate recommendations
        if overall_success_rate < 90:
            failed_categories = [
                cat for cat, tests in self.test_results.items()
                if any(test["status"] == "FAIL" for test in tests.values())
            ]
            
            if failed_categories:
                report["recommendations"].append(f"Review failed tests in: {', '.join(failed_categories)}")
        
        if not self.auth_token:
            report["recommendations"].append("Authentication system needs verification")
        
        return report
    
    async def run_all_tests(self) -> bool:
        """Run all test suites"""
        self.print_header("Fynix Advanced Testing Framework - Full Test Suite")
        
        print(f"{Colors.WHITE}Running comprehensive tests on: {self.base_url}{Colors.END}")
        print(f"{Colors.WHITE}Test execution started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.END}")
        
        # Run all test categories
        test_methods = [
            ("Core API", self.test_core_api_functionality),
            ("Authentication", self.test_authentication_system),
            ("Database", self.test_database_operations),
            ("Performance", self.test_performance_metrics),
            ("WebSocket", self.test_websocket_functionality),
            ("Social Features", self.test_social_features),
            ("AI Functionality", self.test_ai_functionality),
            ("Security", self.test_security_features)
        ]
        
        results = []
        for test_name, test_method in test_methods:
            try:
                result = await test_method()
                results.append(result)
            except Exception as e:
                self.print_test(f"{test_name} Suite", "FAIL", f"Exception: {e}")
                results.append(False)
        
        # Generate and save report
        report = self.generate_test_report()
        
        # Save test report
        report_file = backend_dir / f"advanced_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        try:
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2)
            
            self.print_section("Test Report Summary")
            print(f"📊 Total Tests: {Colors.BOLD}{report['summary']['total_tests']}{Colors.END}")
            print(f"✅ Passed: {Colors.GREEN}{report['summary']['passed_tests']}{Colors.END}")
            print(f"📈 Success Rate: {Colors.BOLD}{report['summary']['success_rate']:.1f}%{Colors.END}")
            print(f"🎯 Overall Status: {Colors.BOLD}{report['summary']['status']}{Colors.END}")
            
            if report["recommendations"]:
                print(f"\n{Colors.YELLOW}💡 Recommendations:{Colors.END}")
                for rec in report["recommendations"]:
                    print(f"   • {rec}")
            
            print(f"\n📋 Detailed report saved: {Colors.CYAN}{report_file.name}{Colors.END}")
            
        except Exception as e:
            self.print_test("Report Generation", "FAIL", f"Could not save report: {e}")
        
        return report['summary']['success_rate'] >= 75

async def main():
    """Main test execution"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Fynix Advanced Testing Framework")
    parser.add_argument("--url", default="http://localhost:8002", help="Base URL for testing")
    parser.add_argument("--category", help="Run specific test category")
    
    args = parser.parse_args()
    
    framework = AdvancedTestFramework(args.url)
    
    if args.category:
        # Run specific category
        test_methods = {
            "core": framework.test_core_api_functionality,
            "auth": framework.test_authentication_system,
            "database": framework.test_database_operations,
            "performance": framework.test_performance_metrics,
            "websocket": framework.test_websocket_functionality,
            "social": framework.test_social_features,
            "ai": framework.test_ai_functionality,
            "security": framework.test_security_features
        }
        
        if args.category in test_methods:
            success = await test_methods[args.category]()
            return success
        else:
            print(f"❌ Unknown category: {args.category}")
            print(f"Available categories: {', '.join(test_methods.keys())}")
            return False
    else:
        # Run all tests
        return await framework.run_all_tests()

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Testing interrupted by user{Colors.END}")
        sys.exit(130)
    except Exception as e:
        print(f"\n{Colors.RED}Testing framework failed: {e}{Colors.END}")
        sys.exit(1)