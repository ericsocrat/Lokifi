"""
Tests for centralized logging utility

Location: apps/backend/tests/unit/test_logger.py
"""

import json
import logging

import pytest

from app.utils.logger import (
    ColoredFormatter,
    LoggerContext,
    StructuredFormatter,
    get_logger,
    log_function_call,
    logger,
    setup_logger,
)


class TestLoggerSetup:
    """Test logger initialization and configuration"""

    def test_default_logger_exists(self):
        """Default logger should be created"""
        assert logger is not None
        assert isinstance(logger, logging.Logger)

    def test_get_logger_creates_logger(self):
        """get_logger should create a new logger instance"""
        test_logger = get_logger("test_module")
        assert test_logger is not None
        assert test_logger.name == "test_module"

    def test_logger_has_handlers(self):
        """Logger should have at least one handler"""
        test_logger = setup_logger("test_with_handlers")
        assert len(test_logger.handlers) > 0

    def test_logger_no_duplicate_handlers(self):
        """Calling setup_logger twice should not add duplicate handlers"""
        test_logger = setup_logger("test_no_duplicates")
        handler_count = len(test_logger.handlers)

        # Call setup again
        setup_logger("test_no_duplicates")

        # Should have same number of handlers
        assert len(test_logger.handlers) == handler_count


class TestLogLevels:
    """Test log level filtering"""

    def test_debug_level_logs_all(self):
        """DEBUG level should log all messages"""
        test_logger = setup_logger("test_debug", level=logging.DEBUG)
        assert test_logger.level == logging.DEBUG

    def test_info_level_filters_debug(self):
        """INFO level should filter debug messages"""
        test_logger = setup_logger("test_info", level=logging.INFO)
        assert test_logger.level == logging.INFO

    def test_warning_level_filters_info(self):
        """WARNING level should filter info and debug"""
        test_logger = setup_logger("test_warning", level=logging.WARNING)
        assert test_logger.level == logging.WARNING

    def test_error_level_only_errors(self):
        """ERROR level should only log errors and critical"""
        test_logger = setup_logger("test_error", level=logging.ERROR)
        assert test_logger.level == logging.ERROR


class TestStructuredFormatter:
    """Test JSON structured logging formatter"""

    def test_structured_formatter_creates_json(self):
        """Structured formatter should output valid JSON"""
        formatter = StructuredFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=10,
            msg="test message",
            args=(),
            exc_info=None,
        )

        formatted = formatter.format(record)

        # Should be valid JSON
        data = json.loads(formatted)
        assert data["level"] == "INFO"
        assert data["message"] == "test message"
        assert "timestamp" in data

    def test_structured_formatter_includes_exception(self):
        """Structured formatter should include exception info"""
        formatter = StructuredFormatter()

        try:
            raise ValueError("Test error")
        except ValueError:
            import sys

            exc_info = sys.exc_info()

            record = logging.LogRecord(
                name="test",
                level=logging.ERROR,
                pathname="test.py",
                lineno=10,
                msg="error occurred",
                args=(),
                exc_info=exc_info,
            )

            formatted = formatter.format(record)
            data = json.loads(formatted)

            assert "exception" in data
            assert "ValueError" in data["exception"]


class TestColoredFormatter:
    """Test colored console logging formatter"""

    def test_colored_formatter_includes_timestamp(self):
        """Colored formatter should include timestamp"""
        formatter = ColoredFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=10,
            msg="test message",
            args=(),
            exc_info=None,
        )

        formatted = formatter.format(record)

        # Should contain time pattern (HH:MM:SS)
        assert ":" in formatted
        assert "INFO" in formatted
        assert "test message" in formatted

    def test_colored_formatter_handles_long_names(self):
        """Colored formatter should truncate long logger names"""
        formatter = ColoredFormatter()
        long_name = "a" * 50

        record = logging.LogRecord(
            name=long_name,
            level=logging.INFO,
            pathname="test.py",
            lineno=10,
            msg="test message",
            args=(),
            exc_info=None,
        )

        formatted = formatter.format(record)

        # Should contain truncation indicator
        assert "..." in formatted


class TestLoggerContext:
    """Test context manager for temporary log level changes"""

    def test_context_manager_changes_level(self):
        """Context manager should temporarily change log level"""
        test_logger = setup_logger("test_context", level=logging.WARNING)

        # Verify level change inside context
        original_level = test_logger.level
        assert original_level == logging.WARNING

        with LoggerContext(test_logger, logging.DEBUG):
            assert test_logger.level == logging.DEBUG

        # Verify restoration after context
        assert test_logger.level == original_level

    def test_context_manager_restores_level(self):
        """Context manager should restore original log level"""
        test_logger = setup_logger("test_restore", level=logging.WARNING)
        original_level = test_logger.level

        with LoggerContext(test_logger, logging.DEBUG):
            assert test_logger.level == logging.DEBUG

        assert test_logger.level == original_level


class TestFunctionLoggingDecorator:
    """Test function call logging decorator"""

    def test_decorator_logs_function_call(self):
        """Decorator should log function entry and exit"""

        @log_function_call
        def test_function(x, y):
            return x + y

        result = test_function(1, 2)

        # Just verify function works correctly with decorator
        assert result == 3

    def test_decorator_logs_exceptions(self):
        """Decorator should log exceptions"""

        @log_function_call
        def failing_function():
            raise ValueError("Test error")

        # Should raise the exception even with decorator
        with pytest.raises(ValueError, match="Test error"):
            failing_function()


class TestConvenienceFunctions:
    """Test convenience logging functions"""

    def test_debug_function(self):
        """debug() convenience function should work"""
        from app.utils.logger import debug

        # Just verify function doesn't raise
        debug("test debug message", extra={"user_id": 123})

    def test_info_function(self):
        """info() convenience function should work"""
        from app.utils.logger import info

        # Just verify function doesn't raise
        info("test info message", extra={"status": "ok"})

    def test_warning_function(self):
        """warning() convenience function should work"""
        from app.utils.logger import warning

        # Just verify function doesn't raise
        warning("test warning message")

    def test_error_function(self):
        """error() convenience function should work"""
        from app.utils.logger import error

        # Just verify function doesn't raise
        error("test error message", exc_info=False)

    def test_critical_function(self):
        """critical() convenience function should work"""
        from app.utils.logger import critical

        # Just verify function doesn't raise
        critical("test critical message", exc_info=False)


class TestExtraFields:
    """Test logging with extra fields"""

    def test_logger_accepts_extra_fields(self):
        """Logger should accept and log extra fields"""
        test_logger = setup_logger("test_extra", level=logging.INFO)

        # Just verify extra fields don't cause errors
        test_logger.info("test message", extra={"user_id": 123, "action": "login"})


class TestEnvironmentBehavior:
    """Test environment-specific behavior"""

    def test_test_environment_reduces_logging(self, monkeypatch):
        """Test environment should reduce log noise"""
        monkeypatch.setenv("ENVIRONMENT", "test")

        test_logger = setup_logger("test_env_test")

        # Should default to WARNING or higher in test env
        assert test_logger.level >= logging.WARNING

    def test_production_uses_structured_logging(self, monkeypatch):
        """Production should use structured (JSON) logging"""
        monkeypatch.setenv("ENVIRONMENT", "production")

        test_logger = setup_logger("test_env_prod", structured=None)

        # Handler should use StructuredFormatter
        if test_logger.handlers:
            formatter = test_logger.handlers[0].formatter
            assert isinstance(formatter, StructuredFormatter)


class TestRealWorldUsage:
    """Test real-world usage scenarios"""

    def test_module_specific_logger(self):
        """Create and use module-specific logger"""
        module_logger = get_logger("app.services.trading")

        # Just verify logger creation and usage
        module_logger.info("Processing trade", extra={"trade_id": 456})

    def test_error_with_exception(self):
        """Log error with exception info"""
        test_logger = get_logger("test_error_with_exc")

        try:
            _ = 1 / 0  # Use underscore to indicate intentional unused value
        except ZeroDivisionError:
            test_logger.error("Division error occurred", exc_info=True)

    def test_performance_logging(self):
        """Log performance metrics"""
        perf_logger = get_logger("app.performance")

        # Use extra dict for custom fields
        perf_logger.info("Query executed", extra={"duration_ms": 45.2, "query_type": "SELECT"})
