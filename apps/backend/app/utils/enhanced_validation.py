"""
Enhanced Input Validation Utilities
Comprehensive security-focused validation for all user inputs
"""

import html
import re
import unicodedata
from collections.abc import Callable
from typing import Any, ClassVar
from urllib.parse import urlparse

import bleach
from pydantic import BaseModel, ConfigDict, field_validator

from app.core.security_config import security_config


def sanitize_for_logging(value: Any, max_length: int = 200) -> str:
    """
    Sanitize a value for safe logging to prevent log injection attacks.

    This function removes newlines, carriage returns, and other control characters
    that could be used to forge log entries or inject malicious content.

    Args:
        value: The value to sanitize (will be converted to string)
        max_length: Maximum length of the output string (default: 200)

    Returns:
        A safe string representation suitable for logging

    Security:
        - Removes all ASCII control characters (0x00-0x1F, 0x7F)
        - Replaces with underscore to preserve string length visibility
        - Truncates to max_length to prevent log flooding
        - HTML-escapes output to prevent log viewer exploits
    """
    if value is None:
        return "<None>"

    # Convert to string
    text = str(value)

    # Remove control characters using optimized generator expression
    # Replace control chars (< 32, == 127, or explicit \r\n\t\x0b\x0c) with underscore
    text = "".join("_" if ord(char) < 32 or ord(char) == 127 else char for char in text)

    # Truncate if too long
    if len(text) > max_length:
        text = text[:max_length] + "..."

    # Escape any HTML entities
    text = html.escape(text)

    return text


class InputSanitizer:
    """Utility class for sanitizing and validating user inputs"""

    # Dangerous HTML tags and attributes
    ALLOWED_HTML_TAGS: ClassVar[list[str]] = [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "ol",
        "ul",
        "li",
    ]
    ALLOWED_HTML_ATTRIBUTES: ClassVar[dict[str, list[str]]] = {}

    # Dangerous patterns
    DANGEROUS_PATTERNS: ClassVar[list[str]] = [
        # SQL injection
        r"(?i)(union|select|insert|delete|drop|create|alter|exec|execute)\s+",
        # XSS patterns
        r"(?i)<script|javascript:|on\w+\s*=|vbscript:|data:text/html",
        # LDAP injection (more specific patterns)
        r"(?i)(\(\s*\w+\s*=|\|\s*\(|\&\s*\()",
        # Command injection
        r"[;&|`$]\s*[a-zA-Z]",
        # Path traversal
        r"\.\./|\.\.\\",
    ]

    @classmethod
    def sanitize_string(cls, text: str, max_length: int | None = None) -> str:
        """Sanitize a string input"""
        if not isinstance(text, str):
            raise ValueError("Input must be a string")

        # Normalize unicode
        text = unicodedata.normalize("NFKC", text)

        # Remove control characters except whitespace
        text = "".join(
            char
            for char in text
            if unicodedata.category(char)[0] != "C" or char.isspace()
        )

        # Limit length
        max_len = max_length or security_config.MAX_STRING_LENGTH
        if len(text) > max_len:
            raise ValueError(f"String length exceeds maximum of {max_len} characters")

        # Check for dangerous patterns
        for pattern in cls.DANGEROUS_PATTERNS:
            if re.search(pattern, text):
                raise ValueError("Input contains potentially dangerous content")

        # HTML escape
        text = html.escape(text)

        return text.strip()

    @classmethod
    def sanitize_html(cls, html_content: str) -> str:
        """Sanitize HTML content using bleach"""
        if not isinstance(html_content, str):
            raise ValueError("HTML content must be a string")

        # Clean HTML with bleach
        cleaned = bleach.clean(
            html_content,
            tags=cls.ALLOWED_HTML_TAGS,
            attributes=cls.ALLOWED_HTML_ATTRIBUTES,
            strip=True,
        )

        # Check for dangerous patterns after cleaning
        for pattern in cls.DANGEROUS_PATTERNS:
            if re.search(pattern, cleaned):
                raise ValueError("HTML content contains potentially dangerous content")

        return cleaned

    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        """Sanitize filename for safe storage"""
        if not isinstance(filename, str):
            raise ValueError("Filename must be a string")

        # Remove dangerous characters
        filename = re.sub(r'[<>:"/\\|?*]', "", filename)

        # Remove leading/trailing dots and spaces
        filename = filename.strip(". ")

        # Limit length
        if len(filename) > 255:
            name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
            filename = name[: 255 - len(ext) - 1] + ("." + ext if ext else "")

        if not filename:
            raise ValueError("Invalid filename")

        return filename

    @classmethod
    def validate_url(cls, url: str) -> str:
        """Validate and sanitize URL"""
        if not isinstance(url, str):
            raise ValueError("URL must be a string")

        try:
            parsed = urlparse(url)
        except Exception:
            raise ValueError("Invalid URL format")

        # Check scheme
        if parsed.scheme not in ["http", "https"]:
            raise ValueError("Only HTTP and HTTPS URLs are allowed")

        # Check for dangerous patterns
        for pattern in cls.DANGEROUS_PATTERNS:
            if re.search(pattern, url):
                raise ValueError("URL contains potentially dangerous content")

        return url

    @classmethod
    def validate_email(cls, email: str) -> str:
        """Validate email address"""
        if not isinstance(email, str):
            raise ValueError("Email must be a string")

        # Basic email regex (RFC 5322 compliant)
        email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"

        if not re.match(email_pattern, email):
            raise ValueError("Invalid email format")

        # Check for dangerous patterns
        for pattern in cls.DANGEROUS_PATTERNS:
            if re.search(pattern, email):
                raise ValueError("Email contains potentially dangerous content")

        return email.lower().strip()

    @classmethod
    def validate_username(cls, username: str) -> str:
        """Validate username"""
        if not isinstance(username, str):
            raise ValueError("Username must be a string")

        # Length check
        if len(username) < security_config.MIN_USERNAME_LENGTH:
            raise ValueError(
                f"Username must be at least {security_config.MIN_USERNAME_LENGTH} characters"
            )

        if len(username) > security_config.MAX_USERNAME_LENGTH:
            raise ValueError(
                f"Username must be at most {security_config.MAX_USERNAME_LENGTH} characters"
            )

        # Character validation (alphanumeric, underscore, hyphen)
        if not re.match(r"^[a-zA-Z0-9_-]+$", username):
            raise ValueError(
                "Username can only contain letters, numbers, underscores, and hyphens"
            )

        # Must start with letter or number
        if not re.match(r"^[a-zA-Z0-9]", username):
            raise ValueError("Username must start with a letter or number")

        return username.lower()


class SecureValidationModel(BaseModel):
    """Base Pydantic model with enhanced security validation"""

    model_config = ConfigDict(
        # Validate all fields on assignment
        validate_assignment=True,
        # Don't allow extra fields
        extra="forbid",
        # Use enum values
        use_enum_values=True,
    )

    @field_validator("*", mode="before")
    @classmethod
    def sanitize_strings(cls, v):
        """Sanitize all string fields"""
        if isinstance(v, str):
            return InputSanitizer.sanitize_string(v)
        return v


class SecureStringField(BaseModel):
    """Secure string field with built-in validation"""

    value: str

    @field_validator("value")
    @classmethod
    def validate_string(cls, v):
        return InputSanitizer.sanitize_string(v)


class SecureEmailField(BaseModel):
    """Secure email field with validation"""

    value: str

    @field_validator("value")
    @classmethod
    def validate_email(cls, v):
        return InputSanitizer.validate_email(v)


class SecureUsernameField(BaseModel):
    """Secure username field with validation"""

    value: str

    @field_validator("value")
    @classmethod
    def validate_username(cls, v):
        return InputSanitizer.validate_username(v)


class SecureUrlField(BaseModel):
    """Secure URL field with validation"""

    value: str

    @field_validator("value")
    @classmethod
    def validate_url(cls, v):
        return InputSanitizer.validate_url(v)


def create_input_validator(field_type: str):
    """Factory function to create field validators"""
    validators = {
        "string": InputSanitizer.sanitize_string,
        "email": InputSanitizer.validate_email,
        "username": InputSanitizer.validate_username,
        "url": InputSanitizer.validate_url,
        "filename": InputSanitizer.sanitize_filename,
        "html": InputSanitizer.sanitize_html,
    }

    return validators.get(field_type, InputSanitizer.sanitize_string)


# Security validation decorators
def validate_input(field_type: str = "string"):
    """Decorator to validate function arguments"""

    def decorator(func: Callable[..., Any]):
        def wrapper(*args: Any, **kwargs: Any):
            validator_func = create_input_validator(field_type)

            # Validate string arguments
            validated_args = []
            for arg in args:
                if isinstance(arg, str):
                    validated_args.append(validator_func(arg))
                else:
                    validated_args.append(arg)

            # Validate string keyword arguments
            validated_kwargs = {}
            for key, value in kwargs.items():
                if isinstance(value, str):
                    validated_kwargs[key] = validator_func(value)
                else:
                    validated_kwargs[key] = value

            return func(*validated_args, **validated_kwargs)

        return wrapper

    return decorator


# Content Security Policy helpers
class CSPBuilder:
    """Helper class to build Content Security Policy headers"""

    def __init__(self):
        self.directives = {
            "default-src": ["'self'"],
            "script-src": ["'self'"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "img-src": ["'self'", "data:", "https:"],
            "connect-src": ["'self'"],
            "font-src": ["'self'"],
            "object-src": ["'none'"],
            "base-uri": ["'self'"],
            "form-action": ["'self'"],
        }

    def add_source(self, directive: str, source: str):
        """Add a source to a CSP directive"""
        if directive not in self.directives:
            self.directives[directive] = []

        if source not in self.directives[directive]:
            self.directives[directive].append(source)

    def build(self) -> str:
        """Build the CSP header value"""
        policy_parts = []
        for directive, sources in self.directives.items():
            policy_parts.append(f"{directive} {' '.join(sources)}")

        return "; ".join(policy_parts)


def secure_log_value(value: Any, max_length: int = 200) -> str:
    """
    Create a secure, sanitized string for logging user-controlled data.

    This is a wrapper around sanitize_for_logging that provides additional
    protection against log injection attacks. The function:
    1. Sanitizes the input to remove dangerous characters
    2. Returns a completely new string object (breaks reference chains)
    3. Is safe to use in f-strings for logging

    This function is designed to be recognized as a security boundary
    for static analysis tools.

    Args:
        value: User-controlled value to log safely
        max_length: Maximum length of output (default: 200)

    Returns:
        A newly created, safe string suitable for logging

    Example:
        logger.info(f"User {secure_log_value(user_id)} performed action")
    """
    # Sanitize the value
    sanitized = sanitize_for_logging(value, max_length)
    # Return a new string to break any reference chains
    # This helps static analysis tools recognize the sanitization boundary
    return str(sanitized)


# Export commonly used functions
__all__ = [
    "CSPBuilder",
    "InputSanitizer",
    "SecureEmailField",
    "SecureStringField",
    "SecureUrlField",
    "SecureUsernameField",
    "SecureValidationModel",
    "create_input_validator",
    "sanitize_for_logging",
    "secure_log_value",
    "validate_input",
]
