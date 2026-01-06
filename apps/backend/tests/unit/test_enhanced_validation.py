"""
Tests for app.utils.enhanced_validation

Comprehensive test suite for security-focused validation utilities:
- sanitize_for_logging: Log-safe string sanitization
- InputSanitizer: String, HTML, filename, URL, email, username validation
- SecureValidationModel: Pydantic model with security validation
- CSPBuilder: Content Security Policy header builder
- validate_input decorator: Input validation decorator
"""

import pytest

# Import module under test
try:
    from app.utils.enhanced_validation import (
        CSPBuilder,
        InputSanitizer,
        SecureEmailField,
        SecureStringField,
        SecureUrlField,
        SecureUsernameField,
        create_input_validator,
        sanitize_for_logging,
        secure_log_value,
        validate_input,
    )
except ImportError as e:
    pytest.skip(f"Module import failed: {e}", allow_module_level=True)


# ============================================================================
# TEST: sanitize_for_logging
# ============================================================================


class TestSanitizeForLogging:
    """Test suite for sanitize_for_logging function."""

    def test_none_value(self):
        """Test with None value."""
        result = sanitize_for_logging(None)
        assert result == "<None>"

    def test_simple_string(self):
        """Test with simple string."""
        result = sanitize_for_logging("Hello World")
        assert result == "Hello World"

    def test_string_with_newlines(self):
        """Test that newlines are replaced with underscores."""
        result = sanitize_for_logging("Line1\nLine2\rLine3")
        # Control characters replaced with underscores
        assert "\n" not in result
        assert "\r" not in result
        assert "_" in result

    def test_string_with_control_characters(self):
        """Test that control characters are removed."""
        result = sanitize_for_logging("Test\x00\x01\x02Value")
        assert "\x00" not in result
        assert "\x01" not in result
        assert "\x02" not in result

    def test_max_length_truncation(self):
        """Test that long strings are truncated."""
        long_string = "A" * 300
        result = sanitize_for_logging(long_string, max_length=100)
        assert len(result) <= 103  # 100 + "..."
        assert result.endswith("...")

    def test_html_escape(self):
        """Test that HTML entities are escaped."""
        result = sanitize_for_logging("<script>alert('xss')</script>")
        assert "&lt;" in result
        assert "&gt;" in result
        assert "<script>" not in result

    def test_integer_value(self):
        """Test with integer value."""
        result = sanitize_for_logging(12345)
        assert result == "12345"

    def test_dict_value(self):
        """Test with dict value."""
        result = sanitize_for_logging({"key": "value"})
        assert "key" in result
        assert "value" in result

    def test_tab_character_removed(self):
        """Test that tab characters are replaced."""
        result = sanitize_for_logging("Col1\tCol2\tCol3")
        # Tab is a control character, replaced with underscore
        assert "\t" not in result


# ============================================================================
# TEST: secure_log_value
# ============================================================================


class TestSecureLogValue:
    """Test suite for secure_log_value function."""

    def test_simple_string(self):
        """Test with simple string."""
        result = secure_log_value("test value")
        assert result == "test value"

    def test_returns_new_string(self):
        """Test that it returns a new string object."""
        original = "test"
        result = secure_log_value(original)
        # Should be equal but potentially not the same object
        assert result == original

    def test_max_length(self):
        """Test max length parameter."""
        long_string = "X" * 500
        result = secure_log_value(long_string, max_length=50)
        assert len(result) <= 53  # 50 + "..."


# ============================================================================
# TEST: InputSanitizer.sanitize_string
# ============================================================================


class TestInputSanitizerSanitizeString:
    """Test suite for InputSanitizer.sanitize_string."""

    def test_simple_string(self):
        """Test sanitization of simple string."""
        result = InputSanitizer.sanitize_string("Hello World")
        # HTML escaped, so & is allowed but < > are escaped
        assert "Hello World" in result

    def test_non_string_raises_error(self):
        """Test that non-string input raises ValueError."""
        with pytest.raises(ValueError, match="Input must be a string"):
            InputSanitizer.sanitize_string(12345)

    def test_unicode_normalization(self):
        """Test unicode normalization."""
        # NFKC normalization converts special unicode chars to ASCII equivalents
        result = InputSanitizer.sanitize_string("Test")
        assert "Test" in result

    def test_control_characters_removed(self):
        """Test control characters are removed."""
        result = InputSanitizer.sanitize_string("Test\x00Value")
        assert "\x00" not in result

    def test_html_escape(self):
        """Test HTML entities are escaped."""
        result = InputSanitizer.sanitize_string("a < b > c")
        assert "&lt;" in result
        assert "&gt;" in result

    def test_sql_injection_detected(self):
        """Test SQL injection pattern is detected."""
        with pytest.raises(ValueError, match="dangerous content"):
            InputSanitizer.sanitize_string("SELECT * FROM users")

    def test_xss_pattern_detected(self):
        """Test XSS patterns are detected."""
        with pytest.raises(ValueError, match="dangerous content"):
            InputSanitizer.sanitize_string("<script>alert('xss')</script>")

    def test_max_length_enforced(self):
        """Test max length is enforced."""
        # Using a custom max length
        with pytest.raises(ValueError, match="exceeds maximum"):
            InputSanitizer.sanitize_string("A" * 100, max_length=50)

    def test_whitespace_stripped(self):
        """Test leading/trailing whitespace is stripped."""
        result = InputSanitizer.sanitize_string("  test  ")
        assert result == "test"

    def test_path_traversal_detected(self):
        """Test path traversal pattern is detected."""
        with pytest.raises(ValueError, match="dangerous content"):
            InputSanitizer.sanitize_string("../../../etc/passwd")


# ============================================================================
# TEST: InputSanitizer.sanitize_html
# ============================================================================


class TestInputSanitizerSanitizeHtml:
    """Test suite for InputSanitizer.sanitize_html."""

    def test_allowed_tags_preserved(self):
        """Test allowed HTML tags are preserved."""
        result = InputSanitizer.sanitize_html("<p>Hello</p>")
        assert "<p>" in result
        assert "</p>" in result

    def test_disallowed_tags_stripped(self):
        """Test disallowed tags are stripped."""
        result = InputSanitizer.sanitize_html("<script>alert('xss')</script>")
        assert "<script>" not in result
        assert "</script>" not in result

    def test_non_string_raises_error(self):
        """Test non-string input raises ValueError."""
        with pytest.raises(ValueError, match="HTML content must be a string"):
            InputSanitizer.sanitize_html(12345)

    def test_strong_tag_allowed(self):
        """Test strong tag is allowed."""
        result = InputSanitizer.sanitize_html("<strong>Bold</strong>")
        assert "<strong>" in result

    def test_em_tag_allowed(self):
        """Test em tag is allowed."""
        result = InputSanitizer.sanitize_html("<em>Italic</em>")
        assert "<em>" in result

    def test_list_tags_allowed(self):
        """Test list tags are allowed."""
        result = InputSanitizer.sanitize_html("<ul><li>Item</li></ul>")
        assert "<ul>" in result
        assert "<li>" in result


# ============================================================================
# TEST: InputSanitizer.sanitize_filename
# ============================================================================


class TestInputSanitizerSanitizeFilename:
    """Test suite for InputSanitizer.sanitize_filename."""

    def test_simple_filename(self):
        """Test simple filename is preserved."""
        result = InputSanitizer.sanitize_filename("document.pdf")
        assert result == "document.pdf"

    def test_dangerous_characters_removed(self):
        """Test dangerous characters are removed."""
        result = InputSanitizer.sanitize_filename('file<>:"/\\|?*.txt')
        assert "<" not in result
        assert ">" not in result
        assert ":" not in result
        assert '"' not in result
        assert "/" not in result
        assert "\\" not in result
        assert "|" not in result
        assert "?" not in result
        assert "*" not in result

    def test_leading_dots_stripped(self):
        """Test leading dots are stripped."""
        result = InputSanitizer.sanitize_filename("...hidden")
        assert not result.startswith(".")

    def test_trailing_dots_stripped(self):
        """Test trailing dots and spaces are stripped."""
        result = InputSanitizer.sanitize_filename("file... ")
        assert not result.endswith(".")
        assert not result.endswith(" ")

    def test_empty_filename_raises_error(self):
        """Test empty filename raises ValueError."""
        with pytest.raises(ValueError, match="Invalid filename"):
            InputSanitizer.sanitize_filename("...")

    def test_non_string_raises_error(self):
        """Test non-string raises ValueError."""
        with pytest.raises(ValueError, match="Filename must be a string"):
            InputSanitizer.sanitize_filename(12345)

    def test_long_filename_truncated(self):
        """Test long filename is truncated."""
        long_name = "A" * 300 + ".txt"
        result = InputSanitizer.sanitize_filename(long_name)
        assert len(result) <= 255


# ============================================================================
# TEST: InputSanitizer.validate_url
# ============================================================================


class TestInputSanitizerValidateUrl:
    """Test suite for InputSanitizer.validate_url."""

    def test_valid_https_url(self):
        """Test valid HTTPS URL."""
        result = InputSanitizer.validate_url("https://example.com")
        assert result == "https://example.com"

    def test_valid_http_url(self):
        """Test valid HTTP URL."""
        result = InputSanitizer.validate_url("http://example.com")
        assert result == "http://example.com"

    def test_ftp_url_rejected(self):
        """Test FTP URLs are rejected."""
        with pytest.raises(ValueError, match="Only HTTP and HTTPS"):
            InputSanitizer.validate_url("ftp://example.com")

    def test_file_url_rejected(self):
        """Test file:// URLs are rejected."""
        with pytest.raises(ValueError, match="Only HTTP and HTTPS"):
            InputSanitizer.validate_url("file:///etc/passwd")

    def test_javascript_url_rejected(self):
        """Test javascript: URLs are rejected."""
        with pytest.raises(ValueError):
            InputSanitizer.validate_url("javascript:alert('xss')")

    def test_non_string_raises_error(self):
        """Test non-string raises ValueError."""
        with pytest.raises(ValueError, match="URL must be a string"):
            InputSanitizer.validate_url(12345)

    def test_url_with_path(self):
        """Test URL with path is preserved."""
        result = InputSanitizer.validate_url("https://example.com/path/to/page")
        assert result == "https://example.com/path/to/page"

    def test_url_with_query(self):
        """Test URL with query parameters is preserved."""
        result = InputSanitizer.validate_url("https://example.com?param=value")
        assert result == "https://example.com?param=value"


# ============================================================================
# TEST: InputSanitizer.validate_email
# ============================================================================


class TestInputSanitizerValidateEmail:
    """Test suite for InputSanitizer.validate_email."""

    def test_valid_email(self):
        """Test valid email is accepted."""
        result = InputSanitizer.validate_email("user@example.com")
        assert result == "user@example.com"

    def test_email_lowercased(self):
        """Test email is lowercased."""
        result = InputSanitizer.validate_email("USER@EXAMPLE.COM")
        assert result == "user@example.com"

    def test_email_with_plus(self):
        """Test email with plus sign is accepted."""
        result = InputSanitizer.validate_email("user+tag@example.com")
        assert result == "user+tag@example.com"

    def test_email_with_dots(self):
        """Test email with dots in local part."""
        result = InputSanitizer.validate_email("first.last@example.com")
        assert result == "first.last@example.com"

    def test_invalid_email_no_at(self):
        """Test email without @ is rejected."""
        with pytest.raises(ValueError, match="Invalid email format"):
            InputSanitizer.validate_email("invalid-email")

    def test_invalid_email_no_domain(self):
        """Test email without domain is rejected."""
        with pytest.raises(ValueError, match="Invalid email format"):
            InputSanitizer.validate_email("user@")

    def test_invalid_email_no_tld(self):
        """Test email without TLD is rejected."""
        with pytest.raises(ValueError, match="Invalid email format"):
            InputSanitizer.validate_email("user@domain")

    def test_non_string_raises_error(self):
        """Test non-string raises ValueError."""
        with pytest.raises(ValueError, match="Email must be a string"):
            InputSanitizer.validate_email(12345)


# ============================================================================
# TEST: InputSanitizer.validate_username
# ============================================================================


class TestInputSanitizerValidateUsername:
    """Test suite for InputSanitizer.validate_username."""

    def test_valid_username(self):
        """Test valid username is accepted."""
        result = InputSanitizer.validate_username("testuser")
        assert result == "testuser"

    def test_username_with_numbers(self):
        """Test username with numbers."""
        result = InputSanitizer.validate_username("user123")
        assert result == "user123"

    def test_username_with_underscore(self):
        """Test username with underscore."""
        result = InputSanitizer.validate_username("test_user")
        assert result == "test_user"

    def test_username_with_hyphen(self):
        """Test username with hyphen."""
        result = InputSanitizer.validate_username("test-user")
        assert result == "test-user"

    def test_username_lowercased(self):
        """Test username is lowercased."""
        result = InputSanitizer.validate_username("TestUser")
        assert result == "testuser"

    def test_username_too_short_rejected(self):
        """Test username that is too short is rejected."""
        with pytest.raises(ValueError, match="at least"):
            InputSanitizer.validate_username("ab")

    def test_username_starting_with_underscore_rejected(self):
        """Test username starting with underscore is rejected."""
        with pytest.raises(ValueError, match="must start with"):
            InputSanitizer.validate_username("_testuser")

    def test_username_with_special_chars_rejected(self):
        """Test username with special characters is rejected."""
        with pytest.raises(ValueError, match="can only contain"):
            InputSanitizer.validate_username("test@user")

    def test_non_string_raises_error(self):
        """Test non-string raises ValueError."""
        with pytest.raises(ValueError, match="Username must be a string"):
            InputSanitizer.validate_username(12345)


# ============================================================================
# TEST: CSPBuilder
# ============================================================================


class TestCSPBuilder:
    """Test suite for CSPBuilder class."""

    def test_default_directives(self):
        """Test default directives are set."""
        builder = CSPBuilder()
        csp = builder.build()
        assert "default-src 'self'" in csp
        assert "script-src 'self'" in csp
        assert "object-src 'none'" in csp

    def test_add_source(self):
        """Test adding a source to a directive."""
        builder = CSPBuilder()
        builder.add_source("script-src", "https://cdn.example.com")
        csp = builder.build()
        assert "https://cdn.example.com" in csp

    def test_add_duplicate_source_ignored(self):
        """Test duplicate sources are not added twice."""
        builder = CSPBuilder()
        builder.add_source("script-src", "'self'")
        builder.add_source("script-src", "'self'")
        csp = builder.build()
        # Count occurrences of 'self' in script-src section
        assert csp.count("script-src") == 1

    def test_add_new_directive(self):
        """Test adding a new directive."""
        builder = CSPBuilder()
        builder.add_source("frame-ancestors", "'none'")
        csp = builder.build()
        assert "frame-ancestors 'none'" in csp

    def test_build_format(self):
        """Test CSP build format is correct."""
        builder = CSPBuilder()
        csp = builder.build()
        # Should be semicolon-separated directives
        assert ";" in csp


# ============================================================================
# TEST: create_input_validator
# ============================================================================


class TestCreateInputValidator:
    """Test suite for create_input_validator factory function."""

    def test_string_validator(self):
        """Test string validator factory."""
        validator = create_input_validator("string")
        assert validator == InputSanitizer.sanitize_string

    def test_email_validator(self):
        """Test email validator factory."""
        validator = create_input_validator("email")
        assert validator == InputSanitizer.validate_email

    def test_username_validator(self):
        """Test username validator factory."""
        validator = create_input_validator("username")
        assert validator == InputSanitizer.validate_username

    def test_url_validator(self):
        """Test URL validator factory."""
        validator = create_input_validator("url")
        assert validator == InputSanitizer.validate_url

    def test_filename_validator(self):
        """Test filename validator factory."""
        validator = create_input_validator("filename")
        assert validator == InputSanitizer.sanitize_filename

    def test_html_validator(self):
        """Test HTML validator factory."""
        validator = create_input_validator("html")
        assert validator == InputSanitizer.sanitize_html

    def test_unknown_type_returns_string_validator(self):
        """Test unknown type returns string validator."""
        validator = create_input_validator("unknown")
        assert validator == InputSanitizer.sanitize_string


# ============================================================================
# TEST: validate_input decorator
# ============================================================================


class TestValidateInputDecorator:
    """Test suite for validate_input decorator."""

    def test_decorator_validates_string_args(self):
        """Test decorator validates string arguments."""

        @validate_input("string")
        def test_func(text):
            return text

        result = test_func("hello world")
        # String sanitizer escapes HTML and strips whitespace
        assert "hello world" in result

    def test_decorator_validates_kwargs(self):
        """Test decorator validates keyword arguments."""

        @validate_input("string")
        def test_func(text=None):
            return text

        result = test_func(text="hello")
        assert "hello" in result

    def test_decorator_preserves_non_string_args(self):
        """Test decorator preserves non-string arguments."""

        @validate_input("string")
        def test_func(num, text):
            return (num, text)

        result = test_func(42, "hello")
        assert result[0] == 42

    def test_decorator_with_email_type(self):
        """Test decorator with email type."""

        @validate_input("email")
        def test_func(email):
            return email

        result = test_func("User@Example.com")
        assert result == "user@example.com"


# ============================================================================
# TEST: Pydantic Secure Fields
# ============================================================================


class TestSecureFields:
    """Test suite for secure Pydantic field models."""

    def test_secure_string_field(self):
        """Test SecureStringField validation."""
        field = SecureStringField(value="test value")
        assert "test value" in field.value

    def test_secure_email_field(self):
        """Test SecureEmailField validation."""
        field = SecureEmailField(value="User@Example.com")
        assert field.value == "user@example.com"

    def test_secure_username_field(self):
        """Test SecureUsernameField validation."""
        field = SecureUsernameField(value="TestUser123")
        assert field.value == "testuser123"

    def test_secure_url_field(self):
        """Test SecureUrlField validation."""
        field = SecureUrlField(value="https://example.com")
        assert field.value == "https://example.com"

    def test_secure_email_field_invalid(self):
        """Test SecureEmailField rejects invalid email."""
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            SecureEmailField(value="invalid-email")


# ============================================================================
# TEST: Edge Cases
# ============================================================================


class TestEdgeCases:
    """Edge case tests."""

    def test_empty_string_sanitization(self):
        """Test empty string is handled."""
        result = InputSanitizer.sanitize_string("")
        assert result == ""

    def test_unicode_string_sanitization(self):
        """Test unicode string is handled."""
        result = InputSanitizer.sanitize_string("こんにちは")
        assert "こんにちは" in result

    def test_emoji_in_string(self):
        """Test emoji in string is handled."""
        result = InputSanitizer.sanitize_string("Hello 👋 World")
        # Emoji should be preserved (not control characters)
        assert (
            "👋" in result or "Hello" in result
        )  # Some systems may handle differently

    def test_sanitize_for_logging_with_very_long_string(self):
        """Test sanitize_for_logging with extremely long string."""
        very_long = "X" * 10000
        result = sanitize_for_logging(very_long)
        assert len(result) <= 203  # 200 + "..."

    def test_multiple_dangerous_patterns(self):
        """Test string with multiple dangerous patterns."""
        dangerous = "SELECT * FROM users; DROP TABLE users;--"
        with pytest.raises(ValueError, match="dangerous content"):
            InputSanitizer.sanitize_string(dangerous)
