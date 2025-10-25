"""
Centralized Logging Utility for Lokifi Backend

Provides structured logging with environment-based filtering,
log levels, and better debugging capabilities than print().

Usage:
    from app.utils.logger import logger, get_logger

    # Use default logger
    logger.info("Application started")

    # Create module-specific logger
    log = get_logger(__name__)
    log.debug("Processing request", extra={"user_id": 123})
"""

import json
import logging
import os
import sys
from datetime import datetime

# Log levels
DEBUG = logging.DEBUG
INFO = logging.INFO
WARNING = logging.WARNING
ERROR = logging.ERROR
CRITICAL = logging.CRITICAL


class StructuredFormatter(logging.Formatter):
    """
    JSON formatter for structured logging in production
    """

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add extra fields if present
        if hasattr(record, "extra_fields"):
            log_data.update(record.extra_fields)

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add file location in debug mode
        if record.levelno == logging.DEBUG:
            log_data["file"] = f"{record.filename}:{record.lineno}"
            log_data["function"] = record.funcName

        return json.dumps(log_data)


class ColoredFormatter(logging.Formatter):
    """
    Colored formatter for human-readable logging in development
    """

    # ANSI color codes
    COLORS = {
        "DEBUG": "\033[36m",  # Cyan
        "INFO": "\033[32m",  # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",  # Red
        "CRITICAL": "\033[35m",  # Magenta
        "RESET": "\033[0m",  # Reset
    }

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.COLORS["RESET"])
        reset = self.COLORS["RESET"]

        # Format timestamp
        timestamp = datetime.fromtimestamp(record.created).strftime("%H:%M:%S.%f")[:-3]

        # Format log level with color
        levelname = f"{color}{record.levelname:8s}{reset}"

        # Format logger name (truncate if too long)
        logger_name = record.name
        if len(logger_name) > 30:
            logger_name = "..." + logger_name[-27:]

        # Basic message format
        message = f"{timestamp} {levelname} [{logger_name:30s}] {record.getMessage()}"

        # Add extra fields if present
        if hasattr(record, "extra_fields") and record.extra_fields:
            extra_str = " ".join(f"{k}={v}" for k, v in record.extra_fields.items())
            message += f" | {extra_str}"

        # Add exception info if present
        if record.exc_info:
            message += f"\n{self.formatException(record.exc_info)}"

        return message


class LoggerAdapter(logging.LoggerAdapter):
    """
    Custom logger adapter to support extra fields
    """

    def process(self, msg: str, kwargs: dict) -> tuple[str, dict]:
        """
        Process log message and extract extra fields
        """
        extra = kwargs.get("extra", {})
        if extra:
            # Store extra fields in record
            if "extra_fields" not in kwargs:
                kwargs["extra_fields"] = {}
            kwargs["extra_fields"].update(extra)

        return msg, kwargs


def setup_logger(
    name: str = "lokifi",
    level: int | None = None,
    structured: bool | None = None,
) -> logging.Logger:
    """
    Set up a logger with appropriate formatting based on environment

    Args:
        name: Logger name (usually __name__)
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        structured: Force structured (JSON) logging. Auto-detected if None.

    Returns:
        Configured logger instance
    """
    # Get or create logger
    logger = logging.getLogger(name)

    # Avoid duplicate handlers
    if logger.handlers:
        return logger

    # Determine environment
    env = os.getenv("ENVIRONMENT", "development")
    is_production = env in ("production", "prod")
    is_test = env == "test" or "pytest" in sys.modules

    # Set log level
    if level is None:
        if is_test:
            level = logging.WARNING  # Reduce noise in tests
        elif is_production:
            level = logging.INFO
        else:
            level = logging.DEBUG

    logger.setLevel(level)

    # Don't log in test environment unless explicitly configured
    if is_test and level > logging.WARNING:
        return logger

    # Create console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    # Choose formatter based on environment
    if structured is None:
        structured = is_production

    if structured:
        formatter = StructuredFormatter()
    else:
        formatter = ColoredFormatter()

    handler.setFormatter(formatter)
    logger.addHandler(handler)

    # Prevent propagation to root logger
    logger.propagate = False

    return logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a specific module

    Usage:
        log = get_logger(__name__)
        log.info("Processing request")

    Args:
        name: Logger name (usually __name__)

    Returns:
        Logger instance
    """
    return setup_logger(name)


# Create default logger instance
logger = setup_logger("lokifi")


class LoggerContext:
    """
    Context manager for temporary log level changes

    Usage:
        with LoggerContext(logger, logging.DEBUG):
            logger.debug("Verbose logging enabled")
    """

    def __init__(self, logger: logging.Logger, level: int):
        self.logger = logger
        self.new_level = level
        self.old_level = logger.level

    def __enter__(self):
        self.logger.setLevel(self.new_level)
        return self.logger

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.logger.setLevel(self.old_level)


def log_function_call(func):
    """
    Decorator to log function calls with arguments and return values

    Usage:
        @log_function_call
        def process_data(data: dict) -> dict:
            return processed_data
    """
    import functools

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        func_logger = get_logger(func.__module__)

        # Log function entry
        func_logger.debug(
            f"Calling {func.__name__}",
            extra={
                "function": func.__name__,
                "args": str(args)[:100],  # Truncate long args
                "kwargs": str(kwargs)[:100],
            },
        )

        try:
            result = func(*args, **kwargs)
            func_logger.debug(
                f"Completed {func.__name__}", extra={"function": func.__name__, "success": True}
            )
            return result
        except Exception as e:
            func_logger.error(
                f"Error in {func.__name__}: {e!s}",
                extra={"function": func.__name__, "error": str(e)},
                exc_info=True,
            )
            raise

    return wrapper


# Convenience functions
def debug(message: str, **kwargs):
    """Log debug message"""
    logger.debug(message, extra=kwargs)


def info(message: str, **kwargs):
    """Log info message"""
    logger.info(message, extra=kwargs)


def warning(message: str, **kwargs):
    """Log warning message"""
    logger.warning(message, extra=kwargs)


def error(message: str, exc_info: bool = False, **kwargs):
    """Log error message"""
    logger.error(message, exc_info=exc_info, extra=kwargs)


def critical(message: str, exc_info: bool = True, **kwargs):
    """Log critical message"""
    logger.critical(message, exc_info=exc_info, extra=kwargs)


# Export commonly used items
__all__ = [
    "CRITICAL",
    "DEBUG",
    "ERROR",
    "INFO",
    "WARNING",
    "LoggerContext",
    "critical",
    "debug",
    "error",
    "get_logger",
    "info",
    "log_function_call",
    "logger",
    "setup_logger",
    "warning",
]
