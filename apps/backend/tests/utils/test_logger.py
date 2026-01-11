import json
import logging
import os
from pathlib import Path

from app.utils.logger import (
    ColoredFormatter,
    LoggerAdapter,
    LoggerContext,
    StructuredFormatter,
    critical,
    debug,
    error,
    get_logger,
    info,
    log_function_call,
    setup_logger,
    warning,
)


def test_setup_logger_colored_by_default_dev_environment(monkeypatch):
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    log = setup_logger("test.dev.logger", structured=None)
    assert any(isinstance(h.formatter, ColoredFormatter) for h in log.handlers)


def test_setup_logger_structured_forced():
    log = setup_logger("test.structured.logger", structured=True)
    assert any(isinstance(h.formatter, StructuredFormatter) for h in log.handlers)


def test_file_handler_creation_and_write(tmp_path):
    log = setup_logger(
        "test.file.logger",
        level=logging.INFO,
        structured=True,
        log_file="logger_test.log",
    )
    # Attach extra fields through the standard 'extra' mapping
    log.info("file write", extra={"extra_fields": {"k": "v"}})
    project_root = Path(__file__).resolve().parents[4]
    file_path = project_root / "apps" / "backend" / "logs" / "logger_test.log"
    assert file_path.exists()
    content = file_path.read_text(encoding="utf-8").strip().splitlines()[-1]
    data = json.loads(content)
    assert data["message"] == "file write"
    assert data.get("k") == "v"


def test_logger_context_changes_level_temporarily():
    log = get_logger("test.context.logger")
    old = log.level
    with LoggerContext(log, logging.DEBUG):
        assert log.level == logging.DEBUG
    assert log.level == old


def test_log_function_call_decorator_success():
    @log_function_call
    def add(a: int, b: int) -> int:
        return a + b

    assert add(2, 3) == 5


def test_log_function_call_decorator_error():
    @log_function_call
    def boom():
        raise RuntimeError("boom")

    try:
        boom()
    except RuntimeError:
        pass


def test_convenience_functions_do_not_crash():
    debug("d", user="u")
    info("i", user="u")
    warning("w", user="u")
    error("e", exc_info=False, user="u")
    critical("c", exc_info=False, user="u")


def test_structured_formatter_includes_exception_in_file(tmp_path):
    # Create a dedicated logger with file handler and structured formatter
    log = setup_logger(
        "test.exc.file.logger",
        level=logging.INFO,  # allow handlers in test env and still emit error
        structured=True,
        log_file="exc_logger_test.log",
    )
    try:
        raise ValueError("bad")
    except Exception:
        # Ensure exception info is captured
        log.error(
            "error occurred", exc_info=True, extra={"extra_fields": {"case": "exc"}}
        )

    project_root = Path(__file__).resolve().parents[4]
    file_path = project_root / "apps" / "backend" / "logs" / "exc_logger_test.log"
    assert file_path.exists()
    content = file_path.read_text(encoding="utf-8").strip().splitlines()[-1]
    data = json.loads(content)
    assert data["message"] == "error occurred"
    assert data.get("case") == "exc"
    # Structured formatter should include serialized exception
    assert "exception" in data
    assert "ValueError" in data["exception"]
    assert "bad" in data["exception"]
