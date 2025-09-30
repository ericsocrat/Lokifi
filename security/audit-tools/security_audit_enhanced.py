#!/usr/bin/env python3
"""
Enhanced Security Audit & Hardening Tool
Comprehensive security analysis and improvements for Fynix application
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Any
import subprocess
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SecurityAuditor:
    def __init__(self, root_dir: str = "."):
        self.root_dir = Path(root_dir)
        self.vulnerabilities = []
        self.recommendations = []
        
    def audit_cors_configuration(self) -> Dict[str, Any]:
        """Audit CORS configuration for security issues"""
        issues = []
        
        # Check main.py for overly permissive CORS
        main_py = self.root_dir / "backend" / "app" / "main.py"
        if main_py.exists():
            content = main_py.read_text()
            
            # Check for wildcard origins in production
            if 'allow_origins=["*"]' in content:
                issues.append("CRITICAL: Wildcard CORS origins detected - security risk")
                
            if 'allow_methods=["*"]' in content:
                issues.append("WARNING: All HTTP methods allowed via CORS")
                
            if 'allow_headers=["*"]' in content:
                issues.append("WARNING: All headers allowed via CORS")
                
        return {"cors_issues": issues}
    
    def audit_authentication_security(self) -> Dict[str, Any]:
        """Audit authentication implementation for security issues"""
        issues = []
        suggestions = []
        
        # Check JWT configuration
        security_py = self.root_dir / "backend" / "app" / "core" / "security.py"
        if security_py.exists():
            content = security_py.read_text()
            
            # Check for weak JWT algorithms
            if '"algorithm": "HS256"' not in content and '"algorithms": ["HS256"]' not in content:
                if 'algorithm' in content:
                    issues.append("WARNING: Non-standard JWT algorithm detected")
                    
            # Check for proper token expiration
            if 'expires_delta' not in content:
                suggestions.append("Consider implementing JWT token expiration")
                
        return {"auth_issues": issues, "auth_suggestions": suggestions}
    
    def audit_input_validation(self) -> Dict[str, Any]:
        """Audit input validation across the application"""
        issues = []
        
        # Check for potential SQL injection patterns
        for py_file in self.root_dir.rglob("*.py"):
            if "venv" in str(py_file) or "node_modules" in str(py_file):
                continue
                
            try:
                content = py_file.read_text()
                
                # Check for string formatting in SQL-like contexts
                if re.search(r'f["\'].*(?:SELECT|INSERT|UPDATE|DELETE)', content, re.IGNORECASE):
                    issues.append(f"POTENTIAL SQL INJECTION: {py_file.relative_to(self.root_dir)}")
                    
                # Check for eval/exec usage
                if re.search(r'\beval\s*\(|\bexec\s*\(', content):
                    issues.append(f"DANGEROUS: eval/exec usage in {py_file.relative_to(self.root_dir)}")
                    
            except Exception:
                continue
                
        return {"input_validation_issues": issues}
    
    def audit_dependency_security(self) -> Dict[str, Any]:
        """Audit dependencies for known vulnerabilities"""
        issues = []
        
        # Check if safety is available and run it
        try:
            requirements_file = self.root_dir / "backend" / "requirements.txt"
            if requirements_file.exists():
                result = subprocess.run(
                    ["python", "-m", "safety", "check", "-r", str(requirements_file)],
                    capture_output=True, text=True
                )
                if result.returncode != 0:
                    issues.append("DEPENDENCY VULNERABILITIES: Run 'pip install safety && safety check' for details")
        except Exception:
            issues.append("INFO: Install 'safety' package to check for dependency vulnerabilities")
            
        return {"dependency_issues": issues}
    
    def audit_file_permissions(self) -> Dict[str, Any]:
        """Audit file permissions for security issues"""
        issues = []
        
        # Check environment files
        for env_file in [".env", ".env.local", ".env.production"]:
            env_path = self.root_dir / env_file
            if env_path.exists():
                try:
                    # On Unix systems, check permissions
                    if os.name == 'posix':
                        file_mode = os.stat(env_path).st_mode
                        permissions = oct(file_mode)[-3:]
                        if permissions != '600':
                            issues.append(f"INSECURE PERMISSIONS: {env_file} has permissions {permissions} (should be 600)")
                except Exception:
                    pass
                    
        return {"permission_issues": issues}
    
    def audit_logging_security(self) -> Dict[str, Any]:
        """Audit logging configuration for security leaks"""
        issues = []
        
        # Check for potential secret logging
        for py_file in self.root_dir.rglob("*.py"):
            if "venv" in str(py_file) or "node_modules" in str(py_file):
                continue
                
            try:
                content = py_file.read_text()
                
                # Check for logging of sensitive data
                sensitive_patterns = [
                    r'log.*password', r'print.*password', 
                    r'log.*secret', r'print.*secret',
                    r'log.*token', r'print.*token'
                ]
                
                for pattern in sensitive_patterns:
                    if re.search(pattern, content, re.IGNORECASE):
                        issues.append(f"POTENTIAL SECRET LEAK: {py_file.relative_to(self.root_dir)}")
                        break
                        
            except Exception:
                continue
                
        return {"logging_issues": issues}
    
    def generate_security_recommendations(self) -> List[str]:
        """Generate comprehensive security recommendations"""
        recommendations = [
            "1. AUTHENTICATION SECURITY:",
            "   • Implement MFA (Multi-Factor Authentication)",
            "   • Add account lockout after failed login attempts", 
            "   • Implement session timeout and refresh token rotation",
            "   • Add password complexity requirements beyond basic length",
            "",
            "2. API SECURITY:",
            "   • Implement API rate limiting on all endpoints",
            "   • Add request size limits to prevent DoS attacks",
            "   • Implement API versioning and deprecation strategy",
            "   • Add input validation middleware",
            "",
            "3. INFRASTRUCTURE SECURITY:",
            "   • Add security headers middleware (HSTS, CSP, etc.)",
            "   • Implement request logging and monitoring",
            "   • Add health check authentication",
            "   • Configure proper error handling (no stack traces in production)",
            "",
            "4. DATA SECURITY:",
            "   • Encrypt sensitive data at rest",
            "   • Implement data retention policies",
            "   • Add database connection encryption (SSL/TLS)",
            "   • Regular database backups with encryption",
            "",
            "5. FRONTEND SECURITY:",
            "   • Implement Content Security Policy (CSP)",
            "   • Add SRI (Subresource Integrity) for external resources",
            "   • Implement proper state management security",
            "   • Add XSS protection and input sanitization",
            "",
            "6. OPERATIONAL SECURITY:",
            "   • Regular security dependency updates",
            "   • Implement vulnerability scanning in CI/CD",
            "   • Add security monitoring and alerting",
            "   • Regular security audits and penetration testing"
        ]
        
        return recommendations
    
    def run_comprehensive_audit(self) -> Dict[str, Any]:
        """Run complete security audit"""
        logger.info("🔍 Starting comprehensive security audit...")
        
        results = {
            "cors_audit": self.audit_cors_configuration(),
            "auth_audit": self.audit_authentication_security(),
            "input_audit": self.audit_input_validation(),
            "dependency_audit": self.audit_dependency_security(),
            "permission_audit": self.audit_file_permissions(),
            "logging_audit": self.audit_logging_security(),
            "recommendations": self.generate_security_recommendations()
        }
        
        return results

def create_security_middleware():
    """Create enhanced security middleware for FastAPI"""
    middleware_code = '''
"""
Enhanced Security Middleware for Fynix Application
Provides comprehensive security headers and protections
"""

from fastapi import FastAPI, Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.middleware.base import BaseHTTPMiddleware as StarletteBaseHTTPMiddleware
import time
import logging

logger = logging.getLogger(__name__)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add comprehensive security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self' wss: ws:; "
            "font-src 'self'; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        response.headers["Content-Security-Policy"] = csp
        
        # Remove server identification
        response.headers.pop("server", None)
        
        return response

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all requests for security monitoring"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log request
        logger.info(
            f"Request: {request.method} {request.url.path} "
            f"from {request.client.host if request.client else 'unknown'}"
        )
        
        response = await call_next(request)
        
        # Log response
        process_time = time.time() - start_time
        logger.info(
            f"Response: {response.status_code} "
            f"({process_time:.3f}s)"
        )
        
        return response

def add_security_middleware(app: FastAPI):
    """Add all security middleware to FastAPI app"""
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    
    logger.info("✅ Security middleware added successfully")
'''
    
    return middleware_code

def main():
    """Run comprehensive security audit and generate improvements"""
    auditor = SecurityAuditor()
    results = auditor.run_comprehensive_audit()
    
    print("🔒 FYNIX SECURITY AUDIT REPORT")
    print("=" * 50)
    
    # Display issues
    total_issues = 0
    for audit_type, audit_results in results.items():
        if audit_type == "recommendations":
            continue
            
        issues = []
        if isinstance(audit_results, dict):
            for key, value in audit_results.items():
                if isinstance(value, list):
                    issues.extend(value)
        
        if issues:
            print(f"\\n{audit_type.upper().replace('_', ' ')}:")
            for issue in issues:
                print(f"  • {issue}")
                total_issues += 1
    
    print(f"\\n📊 TOTAL ISSUES FOUND: {total_issues}")
    
    # Display recommendations
    print("\\n📋 SECURITY RECOMMENDATIONS:")
    print("-" * 30)
    for rec in results["recommendations"]:
        print(rec)
    
    # Create security middleware file
    middleware_code = create_security_middleware()
    middleware_file = Path("backend/app/middleware/security.py")
    middleware_file.parent.mkdir(exist_ok=True)
    middleware_file.write_text(middleware_code)
    
    print(f"\\n✅ Created security middleware: {middleware_file}")
    print("\\n🎯 NEXT STEPS:")
    print("1. Review and address all identified issues")
    print("2. Add the security middleware to your main.py")
    print("3. Run dependency security scan: pip install safety && safety check")
    print("4. Implement rate limiting on API endpoints")
    print("5. Review and update CORS configuration")
    
    return results

if __name__ == "__main__":
    main()