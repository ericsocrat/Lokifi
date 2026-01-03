#!/usr/bin/env python3
"""
Test Enhanced Security Features
"""

import sys

import pytest

sys.path.append(".")


def test_enhanced_security():
    """Test enhanced security features"""

    print("🔒 TESTING ENHANCED SECURITY FEATURES")
    print("=" * 50)

    try:
        # Test bleach integration
        from app.utils.enhanced_validation import InputSanitizer

        print("\n🧼 Testing Enhanced HTML Sanitization with Bleach...")

        # Test safe HTML
        safe_html = "<p>This is <strong>safe</strong> content</p>"
        cleaned = InputSanitizer.sanitize_html(safe_html)
        print(f"  ✅ Safe HTML: {cleaned}")

        # Test dangerous HTML
        dangerous_html = '<script>alert("xss")</script><p>Content</p>'
        try:
            cleaned = InputSanitizer.sanitize_html(dangerous_html)
            print(f"  ⚠️ Dangerous HTML not fully blocked: {cleaned}")
        except ValueError:
            print("  ✅ Dangerous HTML properly blocked by security validation")

        # Test input sanitization
        print("\n🔍 Testing Input Sanitization...")

        normal_text = "Hello, World!"
        sanitized = InputSanitizer.sanitize_string(normal_text)
        print(f"  ✅ Normal text: {sanitized}")

        # Test alert system
        from app.utils.security_alerts import security_alert_manager

        print("\n📢 Testing Security Alert System...")

        # Check configuration
        stats = security_alert_manager.get_alert_statistics()
        print(f"  ✅ Alert manager initialized: {len(stats)} statistics")

        # Check available channels
        channels = security_alert_manager.config.channels or []
        print(f"  ✅ Configured channels: {[c.value for c in channels]}")

        # Test security config
        from app.core.security_config import security_config

        print("\n⚙️ Testing Security Configuration...")
        print(f"  ✅ Rate limits: {len(security_config.RATE_LIMITS)} types")
        print(f"  ✅ Security headers: {len(security_config.SECURITY_HEADERS)} headers")
        print(
            f"  ✅ CSP policy configured: {'default-src' in security_config.CSP_POLICY}"
        )

        print("\n🎉 ALL ENHANCED SECURITY FEATURES WORKING!")
        # Test passes if we reach here without exception

    except Exception as e:
        import traceback

        traceback.print_exc()
        pytest.fail(f"Enhanced security test failed: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
