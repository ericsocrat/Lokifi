"""
Security Configuration for Fynix Application
Centralized security settings and constants
"""

from typing import List
import os

class SecurityConfig:
    """Security configuration constants and settings"""
    
    # Password requirements
    MIN_PASSWORD_LENGTH = 8
    MAX_PASSWORD_LENGTH = 128
    PASSWORD_REQUIRE_UPPERCASE = True
    PASSWORD_REQUIRE_LOWERCASE = True  
    PASSWORD_REQUIRE_DIGITS = True
    PASSWORD_REQUIRE_SPECIAL = True
    PASSWORD_MIN_CRITERIA = 3  # Require at least 3 of 4 criteria
    
    # JWT settings
    JWT_ALGORITHM = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS = 7
    
    # Rate limiting (requests per window)
    RATE_LIMITS = {
        "auth": {"requests": 5, "window": 300},      # 5 requests per 5 minutes
        "api": {"requests": 100, "window": 60},      # 100 requests per minute  
        "websocket": {"requests": 50, "window": 60}, # 50 connections per minute
        "upload": {"requests": 10, "window": 60},    # 10 uploads per minute
        "password_reset": {"requests": 3, "window": 3600},  # 3 resets per hour
    }
    
    # CORS settings
    PRODUCTION_CORS_ORIGINS = [
        "https://fynix.app",
        "https://www.fynix.app", 
        "https://api.fynix.app"
    ]
    
    DEVELOPMENT_CORS_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    # Security headers
    SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY", 
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
    }
    
    # Content Security Policy
    CSP_POLICY = (
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
    
    # Input validation
    MAX_REQUEST_SIZE = 1024 * 1024 * 10  # 10MB
    MAX_STRING_LENGTH = 1000
    MAX_USERNAME_LENGTH = 30
    MIN_USERNAME_LENGTH = 3
    
    # Sensitive data patterns (for logging exclusion)
    SENSITIVE_PATTERNS = [
        r'password', r'secret', r'token', r'key', r'auth',
        r'credential', r'private', r'confidential'
    ]
    
    # File upload security
    ALLOWED_UPLOAD_TYPES = {
        'image': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        'document': ['pdf', 'txt', 'csv'],
        'data': ['json', 'csv', 'xlsx']
    }
    
    MAX_UPLOAD_SIZE = 1024 * 1024 * 5  # 5MB
    
    @classmethod
    def get_cors_origins(cls) -> List[str]:
        """Get CORS origins based on environment"""
        if os.getenv("ENVIRONMENT", "development").lower() == "production":
            return cls.PRODUCTION_CORS_ORIGINS
        return cls.DEVELOPMENT_CORS_ORIGINS
    
    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production environment"""
        return os.getenv("ENVIRONMENT", "development").lower() == "production"
    
    @classmethod
    def get_allowed_methods(cls) -> List[str]:
        """Get allowed HTTP methods based on environment"""
        if cls.is_production():
            return ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        return ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]

# Global security config instance
security_config = SecurityConfig()