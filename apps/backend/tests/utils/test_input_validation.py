import pytest
from fastapi import HTTPException

from app.utils.input_validation import InputValidator


def test_sanitize_string_basic():
    result = InputValidator.sanitize_string("hello world")
    assert result == "hello world"


def test_sanitize_string_allows_safe_text():
    # Safe alphanumeric text should pass
    result = InputValidator.sanitize_string("bold text here")
    assert "bold" in result and "text" in result


def test_sanitize_string_strips_whitespace():
    result = InputValidator.sanitize_string("  hello  ")
    assert result == "hello"


def test_sanitize_string_respects_max_length():
    with pytest.raises(HTTPException) as exc:
        InputValidator.sanitize_string("a" * 1001, max_length=1000)
    assert exc.value.status_code == 400
    assert "too long" in exc.value.detail.lower()


def test_sanitize_string_rejects_non_string():
    with pytest.raises(HTTPException) as exc:
        InputValidator.sanitize_string(123)  # type: ignore
    assert exc.value.status_code == 400
    assert "invalid input type" in exc.value.detail.lower()


def test_sanitize_string_detects_sql_injection_select():
    with pytest.raises(HTTPException) as exc:
        InputValidator.sanitize_string("'; SELECT * FROM users; --")
    assert exc.value.status_code == 400
    assert "invalid input" in exc.value.detail.lower()


def test_sanitize_string_detects_sql_injection_drop():
    with pytest.raises(HTTPException) as exc:
        InputValidator.sanitize_string("1; DROP TABLE users; --")
    assert exc.value.status_code == 400
    assert "invalid input" in exc.value.detail.lower()


def test_sanitize_string_detects_sql_injection_union():
    with pytest.raises(HTTPException) as exc:
        InputValidator.sanitize_string("1 UNION SELECT * FROM passwords")
    assert exc.value.status_code == 400
    assert "invalid input" in exc.value.detail.lower()


def test_sanitize_string_detects_xss_script_tag():
    with pytest.raises(HTTPException) as exc:
        InputValidator.sanitize_string("<script>alert('xss')</script>")
    assert exc.value.status_code == 400
    assert "invalid input" in exc.value.detail.lower()


def test_sanitize_string_detects_xss_event_handler():
    with pytest.raises(HTTPException) as exc:
        InputValidator.sanitize_string('<img src="x" onload="alert(1)">')
    assert exc.value.status_code == 400
    assert "invalid input" in exc.value.detail.lower()


def test_sanitize_string_detects_xss_javascript_protocol():
    with pytest.raises(HTTPException) as exc:
        InputValidator.sanitize_string("<a href='javascript:alert(1)'>click</a>")
    assert exc.value.status_code == 400
    assert "invalid input" in exc.value.detail.lower()


def test_sanitize_string_detects_xss_iframe():
    with pytest.raises(HTTPException) as exc:
        InputValidator.sanitize_string('<iframe src="http://evil.com"></iframe>')
    assert exc.value.status_code == 400
    assert "invalid input" in exc.value.detail.lower()


def test_validate_email_valid():
    result = InputValidator.validate_email("user@example.com")
    assert result == "user@example.com"


def test_validate_email_valid_case_insensitive():
    result = InputValidator.validate_email("User@Example.COM")
    assert result == "user@example.com"


def test_validate_email_with_plus_addressing():
    result = InputValidator.validate_email("user+tag@example.com")
    assert result == "user+tag@example.com"


def test_validate_email_rejects_empty():
    with pytest.raises(HTTPException) as exc:
        InputValidator.validate_email("")
    assert exc.value.status_code == 400
    assert "invalid email" in exc.value.detail.lower()


def test_validate_email_rejects_missing_domain():
    with pytest.raises(HTTPException) as exc:
        InputValidator.validate_email("user@")
    assert exc.value.status_code == 400
    assert "invalid email" in exc.value.detail.lower()


def test_validate_email_rejects_missing_at_symbol():
    with pytest.raises(HTTPException) as exc:
        InputValidator.validate_email("userexample.com")
    assert exc.value.status_code == 400
    assert "invalid email" in exc.value.detail.lower()


def test_validate_email_rejects_missing_tld():
    with pytest.raises(HTTPException) as exc:
        InputValidator.validate_email("user@example")
    assert exc.value.status_code == 400
    assert "invalid email" in exc.value.detail.lower()


def test_validate_username_valid():
    result = InputValidator.validate_username("john_doe")
    assert result == "john_doe"


def test_validate_username_valid_with_numbers():
    result = InputValidator.validate_username("user123")
    assert result == "user123"


def test_validate_username_with_underscores():
    result = InputValidator.validate_username("john_doe_123")
    assert result == "john_doe_123"


def test_validate_username_rejects_empty():
    with pytest.raises(HTTPException) as exc:
        InputValidator.validate_username("")
    assert exc.value.status_code == 400
    assert "3-30 characters" in exc.value.detail


def test_validate_username_rejects_too_short():
    with pytest.raises(HTTPException) as exc:
        InputValidator.validate_username("ab")
    assert exc.value.status_code == 400
    assert "3-30 characters" in exc.value.detail


def test_validate_username_rejects_too_long():
    with pytest.raises(HTTPException) as exc:
        InputValidator.validate_username("a" * 31)
    assert exc.value.status_code == 400
    assert "3-30 characters" in exc.value.detail


def test_validate_username_rejects_special_chars():
    with pytest.raises(HTTPException) as exc:
        InputValidator.validate_username("john-doe")
    assert exc.value.status_code == 400
    assert "3-30 characters" in exc.value.detail


def test_validate_username_rejects_spaces():
    with pytest.raises(HTTPException) as exc:
        InputValidator.validate_username("john doe")
    assert exc.value.status_code == 400
    assert "3-30 characters" in exc.value.detail


def test_email_pattern_matches_standard_format():
    valid_emails = [
        "simple@example.com",
        "very.common@example.com",
        "disposable.style.email.with+symbol@example.com",
        "other.email-with-hyphen@example.com",
        "x@example.com",
        "example-indeed@strange-example.com",
    ]
    for email in valid_emails:
        result = InputValidator.validate_email(email)
        assert email.lower() == result


def test_username_pattern_matches_valid_formats():
    valid_usernames = [
        "user",
        "user123",
        "user_name",
        "user_123",
        "_user",
        "user_",
        "___",
        "123",
    ]
    for username in valid_usernames:
        result = InputValidator.validate_username(username)
        assert username == result


def test_sanitize_string_custom_max_length():
    result = InputValidator.sanitize_string("short", max_length=100)
    assert result == "short"
    with pytest.raises(HTTPException):
        InputValidator.sanitize_string("a" * 51, max_length=50)
