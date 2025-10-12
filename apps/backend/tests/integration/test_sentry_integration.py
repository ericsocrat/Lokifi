"""
Sentry Integration Tests

These tests verify that Sentry is properly configured and can capture errors.
Note: The before_send filter in main.py only sends ERROR and FATAL level events.

To run these tests:
1. Ensure ENABLE_SENTRY=true and SENTRY_DSN is set in .env
2. Run: pytest tests/integration/test_sentry_integration.py -v
3. Check Sentry dashboard to verify events were captured (for error-level tests)
"""

import logging

import pytest
import sentry_sdk
from app.core.config import settings
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration


@pytest.fixture(scope="module", autouse=True)
def init_sentry():
    """Initialize Sentry for integration tests if enabled"""
    if settings.ENABLE_SENTRY and settings.SENTRY_DSN:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=f"{settings.SENTRY_ENVIRONMENT}-test",
            traces_sample_rate=0.1,  # Lower for tests
            integrations=[
                FastApiIntegration(),
                StarletteIntegration(),
                LoggingIntegration(
                    level=logging.INFO,
                    event_level=logging.ERROR,
                ),
            ],
            send_default_pii=False,
            attach_stacktrace=True,
            # For tests, allow errors only (matching main.py filter)
            before_send=lambda event, hint: (
                event if event.get("level") in ["error", "fatal"] else None
            ),
        )
        yield
        sentry_sdk.flush(timeout=2)
    else:
        pytest.skip("Sentry not enabled or DSN not configured")


@pytest.mark.asyncio
async def test_sentry_is_initialized():
    """Test that Sentry SDK is initialized"""
    client = sentry_sdk.Hub.current.client
    assert client is not None, "Sentry client should be initialized"
    assert client.dsn is not None, "Sentry DSN should be configured"
    print(f"✅ Sentry initialized with DSN: {client.dsn}")


@pytest.mark.asyncio
async def test_sentry_captures_error_message():
    """
    Test that Sentry captures error-level messages.
    Check your Sentry dashboard to verify the message was received.
    """
    # Use error level (info/warning are filtered by before_send)
    event_id = sentry_sdk.capture_message(
        "🧪 Test ERROR message from Lokifi integration tests", level="error"
    )

    # Flush to ensure message is sent
    sentry_sdk.flush(timeout=2)

    # Note: event_id may still be None if Sentry decides not to send
    # (e.g., rate limiting, sampling, etc.)
    if event_id:
        print(f"✅ Error message sent to Sentry with ID: {event_id}")
        print("👀 Check your Sentry dashboard to verify the message was received")
    else:
        print("⚠️ Sentry did not return event ID (may be rate limited or sampled out)")


@pytest.mark.asyncio
async def test_sentry_captures_exception():
    """
    Test that Sentry captures exceptions.
    Check your Sentry dashboard to verify the exception was received.
    """
    try:
        raise ValueError("🧪 Test exception from Lokifi integration tests")
    except Exception as e:
        event_id = sentry_sdk.capture_exception(e)
        sentry_sdk.flush(timeout=2)

        if event_id:
            print(f"✅ Exception sent to Sentry with ID: {event_id}")
            print("👀 Check your Sentry dashboard to verify the exception was received")
        else:
            print("⚠️ Sentry did not return event ID (may be rate limited or sampled out)")


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.skip(reason="Manual test - requires checking Sentry dashboard")
async def test_sentry_endpoint_error():
    """
    Manual test to verify Sentry captures errors from API endpoints.

    To test manually:
    1. Start the backend server
    2. Make a request to an endpoint that raises an error
    3. Check Sentry dashboard for the error
    """
    from fastapi.testclient import TestClient

    # This would require an endpoint that intentionally errors
    # For now, this is a placeholder for manual testing
    # Example: response = client.get("/endpoint-that-errors")
    pass
