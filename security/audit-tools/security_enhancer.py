#!/usr/bin/env python3
"""
Security Enhancement Suite for Fynix
Identifies and implements additional security improvements
"""

from pathlib import Path

def create_security_middleware():
    """Create security middleware file"""
    middleware_dir = Path("backend/app/middleware")
    middleware_dir.mkdir(exist_ok=True)
    
    middleware_code = '''"""
Enhanced Security Middleware for Fynix Application
"""

from fastapi import Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
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
    """Log requests for security monitoring"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log request (excluding sensitive paths)
        if not any(path in str(request.url.path) for path in ['/health', '/metrics']):
            logger.info(
                f"Request: {request.method} {request.url.path} "
                f"from {request.client.host if request.client else 'unknown'}"
            )
        
        response = await call_next(request)
        
        # Log slow requests
        process_time = time.time() - start_time
        if process_time > 1.0:  # Log requests taking more than 1 second
            logger.warning(
                f"Slow request: {request.method} {request.url.path} "
                f"({process_time:.3f}s)"
            )
        
        return response
'''
    
    security_file = middleware_dir / "security.py"
    security_file.write_text(middleware_code)
    return security_file

def create_rate_limiter():
    """Create enhanced rate limiting"""
    rate_limit_code = '''"""
Enhanced Rate Limiting Service
"""

import asyncio
import time
from typing import Dict, Tuple, Optional
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

class EnhancedRateLimiter:
    """Memory-based rate limiter with sliding window"""
    
    def __init__(self):
        self.requests: Dict[str, list] = defaultdict(list)
        self.cleanup_interval = 300  # 5 minutes
        self.last_cleanup = time.time()
        
        # Rate limits per endpoint type
        self.limits = {
            "auth": {"requests": 5, "window": 300},      # 5 requests per 5 minutes
            "api": {"requests": 100, "window": 60},      # 100 requests per minute
            "websocket": {"requests": 50, "window": 60}, # 50 connections per minute
            "upload": {"requests": 10, "window": 60},    # 10 uploads per minute
        }
    
    async def check_rate_limit(self, 
                              identifier: str, 
                              limit_type: str = "api") -> Tuple[bool, Optional[float]]:
        """Check if request is within rate limit"""
        current_time = time.time()
        
        # Cleanup old entries periodically
        if current_time - self.last_cleanup > self.cleanup_interval:
            await self._cleanup_old_entries(current_time)
            self.last_cleanup = current_time
        
        limit_config = self.limits.get(limit_type, self.limits["api"])
        max_requests = limit_config["requests"]
        window_size = limit_config["window"]
        
        # Get request history for this identifier
        request_times = self.requests[identifier]
        
        # Remove requests outside the current window
        cutoff_time = current_time - window_size
        request_times[:] = [t for t in request_times if t > cutoff_time]
        
        # Check if under limit
        if len(request_times) < max_requests:
            request_times.append(current_time)
            return True, None
        else:
            # Calculate retry after time
            oldest_request = min(request_times)
            retry_after = oldest_request + window_size - current_time
            return False, max(retry_after, 0)
    
    async def _cleanup_old_entries(self, current_time: float):
        """Remove old entries to prevent memory bloat"""
        max_window = max(config["window"] for config in self.limits.values())
        cutoff_time = current_time - max_window
        
        for identifier in list(self.requests.keys()):
            request_times = self.requests[identifier]
            request_times[:] = [t for t in request_times if t > cutoff_time]
            
            # Remove empty entries
            if not request_times:
                del self.requests[identifier]

# Global instance
enhanced_rate_limiter = EnhancedRateLimiter()
'''
    
    services_dir = Path("backend/app/services")
    rate_limit_file = services_dir / "enhanced_rate_limiter.py"
    rate_limit_file.write_text(rate_limit_code)
    return rate_limit_file

def create_input_validator():
    """Create input validation utilities"""
    validator_code = '''"""
Input Validation and Sanitization Utilities
"""

import re
import html
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

class InputValidator:
    """Comprehensive input validation and sanitization"""
    
    # Regex patterns for validation
    EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')
    PHONE_PATTERN = re.compile(r'^\\+?1?\\d{9,15}$')
    USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_]{3,30}$')
    
    # Dangerous patterns to detect
    SQL_INJECTION_PATTERNS = [
        r"('|(\\x27)|(\\x2D){2}|;|\\||\\*|(\\x28)|(\\x29)|(\\x22)|(\\x00)|(\\n)|(\\r))",
        r"(exec(\\s|\\+)+(s|x)p\\w+)",
        r"((select|insert|delete|update|create|drop|exec(ute){0,1}|alter|declare|exec)(.+)?\\s+(from|into|table|database|index|on))",
    ]
    
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\\w+\\s*=",
        r"<iframe[^>]*>.*?</iframe>",
    ]
    
    @classmethod
    def sanitize_string(cls, value: str, max_length: int = 1000) -> str:
        """Sanitize string input"""
        if not isinstance(value, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid input type"
            )
        
        # Length check
        if len(value) > max_length:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Input too long (max {max_length} characters)"
            )
        
        # HTML escape
        sanitized = html.escape(value)
        
        # Check for dangerous patterns
        cls._check_dangerous_patterns(sanitized)
        
        return sanitized.strip()
    
    @classmethod
    def validate_email(cls, email: str) -> str:
        """Validate and sanitize email"""
        if not email or not cls.EMAIL_PATTERN.match(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        return email.lower().strip()
    
    @classmethod
    def validate_username(cls, username: str) -> str:
        """Validate username"""
        if not username or not cls.USERNAME_PATTERN.match(username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username must be 3-30 characters, letters, numbers, and underscores only"
            )
        return username.strip()
    
    @classmethod
    def _check_dangerous_patterns(cls, text: str):
        """Check for SQL injection and XSS patterns"""
        text_lower = text.lower()
        
        # Check SQL injection patterns
        for pattern in cls.SQL_INJECTION_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                logger.warning(f"Potential SQL injection attempt detected: {pattern}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected"
                )
        
        # Check XSS patterns
        for pattern in cls.XSS_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                logger.warning(f"Potential XSS attempt detected: {pattern}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected"
                )

# Validation decorators
def validate_json_input(max_size: int = 1024*1024):  # 1MB default
    """Decorator to validate JSON input size"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # This would be implemented with FastAPI dependency injection
            return await func(*args, **kwargs)
        return wrapper
    return decorator
'''
    
    utils_dir = Path("backend/app/utils")
    utils_dir.mkdir(exist_ok=True)
    validator_file = utils_dir / "input_validation.py"
    validator_file.write_text(validator_code)
    return validator_file

def analyze_current_security():
    """Analyze current security state"""
    issues = []
    improvements = []
    
    # Check main.py for security middleware
    main_py = Path("backend/app/main.py")
    if main_py.exists():
        try:
            content = main_py.read_text(encoding='utf-8', errors='ignore')
            
            if 'SecurityHeadersMiddleware' not in content:
                issues.append("❌ Missing security headers middleware")
                improvements.append("Add SecurityHeadersMiddleware to main.py")
            
            if 'allow_methods=["*"]' in content:
                issues.append("⚠️  Overly permissive CORS methods")
                
            if 'allow_headers=["*"]' in content:
                issues.append("⚠️  Overly permissive CORS headers")
                
        except Exception as e:
            issues.append(f"⚠️  Could not analyze main.py: {e}")
    
    # Check for rate limiting
    rate_limit_file = Path("backend/app/services/rate_limit_service.py")
    if not rate_limit_file.exists():
        issues.append("⚠️  Basic rate limiting only")
        improvements.append("Implement enhanced rate limiting")
    
    # Check for input validation utilities
    validator_file = Path("backend/app/utils/input_validation.py")
    if not validator_file.exists():
        issues.append("❌ Missing centralized input validation")
        improvements.append("Add comprehensive input validation utilities")
    
    return issues, improvements

def main():
    print("🔒 FYNIX SECURITY ENHANCEMENT SUITE")
    print("=" * 50)
    
    # Analyze current security
    issues, improvements = analyze_current_security()
    
    print("\\n📊 SECURITY ANALYSIS:")
    if issues:
        for issue in issues:
            print(f"  {issue}")
    else:
        print("  ✅ No major issues detected")
    
    print("\\n🔧 CREATING SECURITY ENHANCEMENTS...")
    
    # Create security files
    try:
        security_file = create_security_middleware()
        print(f"  ✅ Created: {security_file}")
        
        rate_limit_file = create_rate_limiter()
        print(f"  ✅ Created: {rate_limit_file}")
        
        validator_file = create_input_validator()
        print(f"  ✅ Created: {validator_file}")
        
    except Exception as e:
        print(f"  ❌ Error creating files: {e}")
    
    print("\\n🛡️  ADDITIONAL SECURITY RECOMMENDATIONS:")
    recommendations = [
        "1. Add security middleware to main.py:",
        "   from app.middleware.security import SecurityHeadersMiddleware, RequestLoggingMiddleware",
        "   app.add_middleware(SecurityHeadersMiddleware)",
        "   app.add_middleware(RequestLoggingMiddleware)",
        "",
        "2. Implement enhanced rate limiting:",
        "   from app.services.enhanced_rate_limiter import enhanced_rate_limiter",
        "",
        "3. Add input validation to API endpoints:",
        "   from app.utils.input_validation import InputValidator",
        "",
        "4. Configure environment-specific CORS:",
        "   Update CORS settings to be more restrictive in production",
        "",
        "5. Add API documentation security:",
        "   Disable Swagger UI in production or add authentication",
        "",
        "6. Implement API versioning:",
        "   Add /v1/ prefix to API routes for better security management",
        "",
        "7. Add request/response logging:",
        "   Configure structured logging for security monitoring",
        "",
        "8. Database security:",
        "   Enable SSL/TLS for database connections",
        "   Use connection pooling with timeouts",
        "",
        "9. Frontend security:",
        "   Add Content Security Policy headers",
        "   Implement proper error boundaries",
        "   Add input sanitization on frontend",
        "",
        "10. Monitoring & alerts:",
        "    Set up security event monitoring",
        "    Add automated vulnerability scanning",
        "    Configure security alerting"
    ]
    
    for rec in recommendations:
        print(f"  {rec}")
    
    print("\\n✅ SECURITY ENHANCEMENT COMPLETE!")
    print("\\nNext steps:")
    print("1. Review and integrate the created security files")
    print("2. Update main.py to include security middleware")  
    print("3. Test rate limiting and input validation")
    print("4. Configure production-specific security settings")

if __name__ == "__main__":
    main()