from fastapi import APIRouter
import sentry_sdk

router = APIRouter(prefix="/test-sentry", tags=["testing"])

@router.get("/error")
async def test_error():
    """Test endpoint to verify Sentry error tracking"""
    # Capture a test message
    sentry_sdk.capture_message("Test message from Lokifi backend!", level="info")
    
    # Raise a test error
    raise Exception("This is a test error to verify Sentry integration!")

@router.get("/message")
async def test_message():
    """Test endpoint to send a message to Sentry"""
    sentry_sdk.capture_message("Test message: Sentry is working correctly!", level="info")
    return {"status": "success", "message": "Message sent to Sentry"}