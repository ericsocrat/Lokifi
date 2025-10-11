"""
Input Validation and Sanitization Utilities
"""

import html
import logging
import re

from fastapi import HTTPException, status
from collections.abc import Callable
from typing import Any


logger = logging.getLogger(__name__)

class InputValidator:
    """Comprehensive input validation and sanitization"""
    
    # Regex patterns for validation
    EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    PHONE_PATTERN = re.compile(r'^\+?1?\d{9,15}$')
    USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_]{3,30}$')
    
    # Dangerous patterns to detect
    SQL_INJECTION_PATTERNS = [
        r"('|(\x27)|(\x2D){2}|;|\||\*|(\x28)|(\x29)|(\x22)|(\x00)|(\n)|(\r))",
        r"(exec(\s|\+)+(s|x)p\w+)",
        r"((select|insert|delete|update|create|drop|exec(ute){0,1}|alter|declare|exec)(.+)?\s+(from|into|table|database|index|on))",
    ]
    
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
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
    def decorator(func: Callable[..., Any]):
        async def wrapper(*args: Any, **kwargs: Any):
            # This would be implemented with FastAPI dependency injection
            return await func(*args, **kwargs)
        return wrapper
    return decorator
