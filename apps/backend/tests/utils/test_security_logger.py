import asyncio
from datetime import datetime, timedelta, timezone

import pytest

from app.utils.security_logger import (
    SecurityEvent,
    SecurityEventType,
    SecurityMonitor,
    SecuritySeverity,
    log_auth_failure,
    log_auth_success,
    log_input_validation_failure,
    log_rate_limit_exceeded,
    log_suspicious_request,
    log_unauthorized_access,
    security_monitor,
)


class TestSecurityEvent:
    def test_security_event_creation(self):
        event = SecurityEvent(
            event_type=SecurityEventType.AUTHENTICATION_FAILURE,
            severity=SecuritySeverity.MEDIUM,
            message="Test failure",
            client_ip="192.168.1.1",
        )
        assert event.event_type == SecurityEventType.AUTHENTICATION_FAILURE
        assert event.severity == SecuritySeverity.MEDIUM
        assert event.timestamp is not None

    def test_security_event_with_custom_timestamp(self):
        ts = datetime.now(timezone.utc) - timedelta(hours=1)
        event = SecurityEvent(
            event_type=SecurityEventType.AUTHENTICATION_SUCCESS,
            severity=SecuritySeverity.LOW,
            message="Test",
            timestamp=ts,
        )
        assert event.timestamp == ts


class TestSecurityMonitor:
    def test_monitor_initialization(self):
        monitor = SecurityMonitor()
        assert monitor.max_failed_attempts == 5
        assert monitor.suspicious_threshold == 10
        assert len(monitor.suspicious_ips) == 0

    @pytest.mark.asyncio
    async def test_log_security_event_low_severity(self):
        monitor = SecurityMonitor()
        event = SecurityEvent(
            event_type=SecurityEventType.AUTHENTICATION_SUCCESS,
            severity=SecuritySeverity.LOW,
            message="Test low severity",
            client_ip="192.168.1.1",
        )
        # Should not raise
        await monitor.log_security_event(event)

    @pytest.mark.asyncio
    async def test_log_security_event_critical_severity(self):
        monitor = SecurityMonitor()
        event = SecurityEvent(
            event_type=SecurityEventType.SYSTEM_COMPROMISE,
            severity=SecuritySeverity.CRITICAL,
            message="Test critical severity",
            client_ip="192.168.1.1",
        )
        # Should not raise (alert sending handled gracefully)
        await monitor.log_security_event(event)

    def test_track_failed_attempts_count(self):
        monitor = SecurityMonitor()
        # Simulate 3 failed attempts
        for i in range(3):
            monitor._track_failed_attempt("192.168.1.1", __import__("time").time())

        assert "192.168.1.1" in monitor.failed_attempts
        assert len(monitor.failed_attempts["192.168.1.1"]) == 3

    def test_track_failed_attempts_cleanup_old(self):
        monitor = SecurityMonitor()
        import time

        now = time.time()
        old_time = now - (monitor.failed_attempt_window + 100)

        # Add old attempt
        monitor.failed_attempts["192.168.1.1"] = [old_time]

        # Track new attempt (should clean old ones)
        monitor._track_failed_attempt("192.168.1.1", now)

        # Old attempt should be removed
        assert len(monitor.failed_attempts["192.168.1.1"]) == 1

    def test_is_ip_suspicious_true(self):
        monitor = SecurityMonitor()
        monitor.suspicious_ips.add("192.168.1.1")
        assert monitor.is_ip_suspicious("192.168.1.1") is True

    def test_is_ip_suspicious_false(self):
        monitor = SecurityMonitor()
        assert monitor.is_ip_suspicious("192.168.1.1") is False

    def test_mark_suspicious_activity(self):
        monitor = SecurityMonitor()
        monitor._mark_suspicious_activity("192.168.1.1", __import__("time").time())
        assert monitor.is_ip_suspicious("192.168.1.1") is True

    def test_get_security_summary(self):
        monitor = SecurityMonitor()
        summary = monitor.get_security_summary()
        assert "suspicious_ips" in summary
        assert "recent_failed_attempts" in summary
        assert "recent_rate_violations" in summary
        assert "monitored_ips" in summary
        assert "timestamp" in summary

    def test_get_security_summary_with_data(self):
        import time

        monitor = SecurityMonitor()
        now = time.time()
        monitor.failed_attempts["192.168.1.1"] = [now]
        monitor.rate_limit_violations["10.0.0.1"] = [now, now]

        summary = monitor.get_security_summary()
        assert summary["monitored_ips"] == 1
        assert summary["recent_failed_attempts"] == 1
        assert summary["recent_rate_violations"] == 2

    @pytest.mark.asyncio
    async def test_log_auth_failure(self):
        # Should not raise
        await log_auth_failure("192.168.1.1", user_id="user1", endpoint="/api/login")

    @pytest.mark.asyncio
    async def test_log_auth_success(self):
        # Should not raise
        await log_auth_success("192.168.1.1", user_id="user1", endpoint="/api/login")

    @pytest.mark.asyncio
    async def test_log_rate_limit_exceeded(self):
        # Should not raise
        await log_rate_limit_exceeded("192.168.1.1", endpoint="/api/data")

    @pytest.mark.asyncio
    async def test_log_suspicious_request(self):
        # Should not raise
        await log_suspicious_request(
            "192.168.1.1", endpoint="/api/admin", pattern="sql_injection_detected"
        )

    @pytest.mark.asyncio
    async def test_log_input_validation_failure(self):
        # Should not raise
        await log_input_validation_failure(
            "192.168.1.1", field="email", value_type="string"
        )

    @pytest.mark.asyncio
    async def test_log_unauthorized_access(self):
        # Should not raise
        await log_unauthorized_access(
            "192.168.1.1", user_id="user1", endpoint="/api/admin"
        )


class TestSecurityEventTypes:
    def test_all_event_types_exist(self):
        expected_types = [
            "AUTHENTICATION_FAILURE",
            "AUTHENTICATION_SUCCESS",
            "RATE_LIMIT_EXCEEDED",
            "SUSPICIOUS_REQUEST",
            "INPUT_VALIDATION_FAILURE",
            "UNAUTHORIZED_ACCESS",
            "SECURITY_SCAN_DETECTED",
            "BRUTE_FORCE_ATTEMPT",
            "PRIVILEGE_ESCALATION",
            "DATA_BREACH_ATTEMPT",
            "CONFIGURATION_CHANGE",
            "SYSTEM_COMPROMISE",
        ]
        for event_type in expected_types:
            assert hasattr(SecurityEventType, event_type)

    def test_all_severity_levels_exist(self):
        expected_levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        for level in expected_levels:
            assert hasattr(SecuritySeverity, level)


class TestSecurityMonitorRateLimiting:
    def test_rate_limit_violations_tracking(self):
        import time

        monitor = SecurityMonitor()
        now = time.time()

        # Track multiple rate limit violations
        for i in range(3):
            monitor._track_rate_limit_violation("10.0.0.1", now + i)

        assert len(monitor.rate_limit_violations["10.0.0.1"]) == 3

    def test_rate_limit_violations_cleanup_old(self):
        import time

        monitor = SecurityMonitor()
        now = time.time()
        old_time = now - (monitor.rate_limit_window + 100)

        # Add old violation
        monitor.rate_limit_violations["10.0.0.1"] = [old_time]

        # Track new violation (should clean old ones)
        monitor._track_rate_limit_violation("10.0.0.1", now)

        # Old violation should be removed
        assert len(monitor.rate_limit_violations["10.0.0.1"]) == 1


class TestSecurityJSONFormatter:
    def test_formatter_includes_timestamp(self):
        import json
        import logging

        from app.utils.security_logger import SecurityJSONFormatter

        formatter = SecurityJSONFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="Test message",
            args=(),
            exc_info=None,
        )
        record.event_type = "test_event"

        formatted = formatter.format(record)
        data = json.loads(formatted)

        assert "timestamp" in data
        assert "level" in data
        assert "message" in data
        assert data["event_type"] == "test_event"

    def test_formatter_includes_custom_fields(self):
        import json
        import logging

        from app.utils.security_logger import SecurityJSONFormatter

        formatter = SecurityJSONFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="Test message",
            args=(),
            exc_info=None,
        )
        record.event_type = "auth_failure"
        record.client_ip = "192.168.1.1"

        formatted = formatter.format(record)
        data = json.loads(formatted)

        assert data["client_ip"] == "192.168.1.1"
        assert data["event_type"] == "auth_failure"
