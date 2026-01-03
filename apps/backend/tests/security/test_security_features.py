#!/usr/bin/env python3
"""
Comprehensive Security Features Test Suite
Tests all enhanced security features including bleach integration
"""

import os
import sys
from datetime import timezone

import pytest

sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def test_bleach_integration():
    """Test bleach package integration"""
    print("=== BLEACH PACKAGE TEST ===")
    try:
        import bleach

        print(f"✅ Bleach version: {bleach.__version__}")

        from app.utils.enhanced_validation import InputSanitizer

        sanitizer = InputSanitizer()

        # Test dangerous HTML
        test_html = '<script>alert("xss")</script><p>Safe content</p><img src="x" onerror="alert(1)">'
        cleaned = sanitizer.sanitize_html(test_html)
        print(f"Original: {test_html}")
        print(f"Cleaned: {cleaned}")

        # Verify dangerous content was removed
        assert "<script>" not in cleaned
        assert "onerror" not in cleaned
        assert "<p>Safe content</p>" in cleaned
        print("✅ HTML sanitization working correctly!")
        # Test passes if we reach here without exception

    except Exception as e:
        pytest.fail(f"Bleach test failed: {e}")


def test_security_alerts():
    """Test security alert system"""
    print("\n=== SECURITY ALERTS TEST ===")
    try:
        from app.utils.security_alerts import Alert, AlertPriority, SecurityAlertManager
        from app.utils.security_logger import SecurityEventType, SecuritySeverity

        # Create alert manager
        alert_manager = SecurityAlertManager()
        print("✅ Alert manager created")

        # Test alert creation
        test_alert = Alert(
            title="Test Security Alert",
            message="This is a test security alert",
            severity=SecuritySeverity.HIGH,
            priority=AlertPriority.HIGH,
            event_type=SecurityEventType.AUTHENTICATION_FAILURE,
            source_ip="192.168.1.100",
            additional_data={"test": True},
        )

        print(f"✅ Test alert created: {test_alert.title}")

        # Test alert configuration
        config = alert_manager.config
        assert config is not None
        print("✅ Alert configuration loaded!")

        # Test alert history
        assert hasattr(alert_manager, "alert_history")
        print("✅ Alert history initialized")

    except Exception as e:
        pytest.fail(f"Security alerts test failed: {e}")


def test_input_validation():
    """Test enhanced input validation"""
    print("\n=== INPUT VALIDATION TEST ===")
    try:
        from app.utils.enhanced_validation import InputSanitizer

        # Test safe string sanitization
        safe_test = "Hello world, this is safe!"
        try:
            sanitized = InputSanitizer.sanitize_string(safe_test)
            assert sanitized == safe_test
            print("✅ Safe string validation working!")
        except ValueError:
            pytest.fail("Safe string incorrectly flagged as dangerous")

        # Test dangerous SQL pattern detection
        sql_test = "'; DROP TABLE users; --"
        with pytest.raises(ValueError):
            InputSanitizer.sanitize_string(sql_test)
        print("✅ SQL injection detection working!")

        # Test XSS pattern detection
        xss_test = "<script>alert('xss')</script>"
        with pytest.raises(ValueError):
            InputSanitizer.sanitize_string(xss_test)
        print("✅ XSS detection working!")

        # Test HTML sanitization
        dangerous_html = "<script>alert('hack')</script><p>Safe content</p>"
        cleaned_html = InputSanitizer.sanitize_html(dangerous_html)
        assert "<script>" not in cleaned_html
        assert "<p>Safe content</p>" in cleaned_html
        print("✅ HTML sanitization working!")

        # Test filename sanitization
        dangerous_filename = "../../../etc/passwd"
        safe_filename = InputSanitizer.sanitize_filename(dangerous_filename)
        assert "../" not in safe_filename
        print("✅ Filename sanitization working!")

    except Exception as e:
        pytest.fail(f"Input validation test failed: {e}")


def test_security_logger():
    """Test security logging functionality"""
    print("\n=== SECURITY LOGGER TEST ===")
    try:
        from datetime import datetime

        from app.utils.security_logger import (
            SecurityEvent,
            SecurityEventType,
            SecuritySeverity,
            security_logger,
        )

        # Test security event creation
        test_event = SecurityEvent(
            event_type=SecurityEventType.AUTHENTICATION_FAILURE,
            message="Test security event",
            severity=SecuritySeverity.MEDIUM,
            client_ip="192.168.1.100",
            user_agent="Test Agent",
            timestamp=datetime.now(timezone.utc),
        )

        assert test_event.event_type == SecurityEventType.AUTHENTICATION_FAILURE
        assert test_event.severity == SecuritySeverity.MEDIUM
        print("✅ Security event creation working!")

        # Test that security logger exists
        assert security_logger is not None
        print("✅ Security logger available!")

    except Exception as e:
        pytest.fail(f"Security logger test failed: {e}")


def main():
    """Run all security tests"""
    print("🔐 COMPREHENSIVE SECURITY FEATURES TEST")
    print("=" * 50)

    tests = [
        test_bleach_integration,
        test_security_alerts,
        test_input_validation,
        test_security_logger,
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")

    print("\n" + "=" * 50)
    print(f"🎯 TEST RESULTS: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 ALL SECURITY FEATURES WORKING CORRECTLY!")
        return True
    else:
        print(f"⚠️  {total - passed} tests failed")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
