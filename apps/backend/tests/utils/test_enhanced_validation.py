import pytest

from app.utils.enhanced_validation import (
    CSPBuilder,
    InputSanitizer,
    SecureEmailField,
    SecureStringField,
    SecureUrlField,
    SecureUsernameField,
    SecureValidationModel,
    create_input_validator,
    sanitize_for_logging,
    secure_log_value,
    validate_input,
)


def test_sanitize_for_logging_basic():
    text = "Hello\nWorld\t\x7f"
    out = sanitize_for_logging(text)
    assert "_" in out and "<" not in out and ">" not in out
    assert "\n" not in out and "\t" not in out


def test_sanitize_for_logging_truncation():
    big = "a" * 300
    out = sanitize_for_logging(big, max_length=50)
    assert out.startswith("a" * 50)
    assert out.endswith("...")


def test_input_sanitizer_sanitize_string_ok():
    s = InputSanitizer.sanitize_string(" Hello <b>World</b> ")
    assert s == "Hello &lt;b&gt;World&lt;/b&gt;"


@pytest.mark.parametrize(
    "bad",
    [
        "union select password from users",
        "<script>alert(1)</script>",
        "../etc/passwd",
    ],
)
def test_input_sanitizer_sanitize_string_rejects_dangerous(bad):
    with pytest.raises(ValueError):
        InputSanitizer.sanitize_string(bad)


def test_input_sanitizer_sanitize_html_allows_basic():
    html_text = "<p>Hello</p><script>alert(1)</script>"
    cleaned = InputSanitizer.sanitize_html(html_text)
    # bleach.strip removes disallowed tags but leaves inner text
    assert cleaned == "<p>Hello</p>alert(1)"


def test_input_sanitizer_sanitize_filename():
    name = ' .. /evil:"file\\name?.txt '
    safe = InputSanitizer.sanitize_filename(name)
    assert ":" not in safe and "\\" not in safe and "/" not in safe
    assert safe.endswith(".txt")


def test_input_sanitizer_validate_url():
    assert (
        InputSanitizer.validate_url("https://example.com/path?q=1")
        == "https://example.com/path?q=1"
    )
    with pytest.raises(ValueError):
        InputSanitizer.validate_url("ftp://example.com")


def test_input_sanitizer_validate_email():
    assert InputSanitizer.validate_email("User@Test.com") == "user@test.com"
    with pytest.raises(ValueError):
        InputSanitizer.validate_email("bad@@example")


def test_input_sanitizer_validate_username():
    assert InputSanitizer.validate_username("User_123") == "user_123"
    with pytest.raises(ValueError):
        InputSanitizer.validate_username("$bad")


def test_secure_validation_model_sanitizes_strings():
    class M(SecureValidationModel):
        msg: str

    m = M(msg="<b>hi</b>")
    assert m.msg == "&lt;b&gt;hi&lt;/b&gt;"


def test_secure_field_models():
    assert SecureStringField(value="ok").value == "ok"
    assert SecureEmailField(value="Test@Mail.com").value == "test@mail.com"
    assert SecureUsernameField(value="User-1").value == "user-1"
    assert SecureUrlField(value="https://a.com").value == "https://a.com"


def test_create_input_validator_and_decorator():
    v = create_input_validator("email")
    assert callable(v)
    assert v("X@Y.com") == "x@y.com"

    @validate_input("username")
    def greet(name: str):
        return name

    assert greet("User-2") == "user-2"


def test_csp_builder():
    csp = CSPBuilder()
    csp.add_source("script-src", "https://cdn.example.com")
    header = csp.build()
    assert "script-src 'self' https://cdn.example.com" in header


def test_secure_log_value_breaks_reference_and_sanitizes():
    val = "Hello\n<script>bad</script>"
    out = secure_log_value(val)
    assert isinstance(out, str)
    assert "\n" not in out
    assert "<script>" not in out
