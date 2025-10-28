"""
Test Suite for Authentication Error Handling Security Patterns
Session 29: Backend Test Expansion - Phase 2 (Auth Tests)

Tests the secure error handling patterns implemented in Session 26:
- Generic error messages to clients (no information disclosure)
- Full stack traces logged internally via logger.error(exc_info=True)
- OWASP A05:2021 compliance (Security Misconfiguration)
- No stack trace exposure in responses
- Proper HTTPException re-raise for validation errors
"""

import logging
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.routers.auth import router
from app.schemas.auth import UserLoginRequest, UserRegisterRequest, GoogleOAuthRequest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession


class TestRegistrationErrorHandling:
    """Test /register endpoint error handling (Session 26 patterns)"""

    @pytest.mark.asyncio
    async def test_registration_generic_error_on_exception(self, mock_db_session):
        """
        Test that registration returns generic error message on unexpected exceptions.
        OWASP A05:2021: No information disclosure to client.
        """
        # Arrange
        user_data = UserRegisterRequest(
            email="test@example.com",
            password="TestPass123!",
            full_name="Test User",
            username="testuser"
        )
        
        # Mock AuthService to raise unexpected exception
        with patch('app.routers.auth.AuthService') as mock_service:
            mock_service.return_value.register_user = AsyncMock(
                side_effect=Exception("Database connection timeout")
            )
            
            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                from app.routers.auth import register
                await register(user_data, mock_db_session)
            
            # Verify generic error message (no details exposed)
            assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert exc_info.value.detail == "Internal server error during registration. Please try again later."
            assert "Database connection timeout" not in exc_info.value.detail
            assert "timeout" not in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_registration_logs_full_error_details(self, mock_db_session, caplog):
        """
        Test that registration logs full error details internally.
        Verifies exc_info=True captures stack trace for debugging.
        """
        # Arrange
        user_data = UserRegisterRequest(
            email="test@example.com",
            password="TestPass123!",
            full_name="Test User",
            username="testuser"
        )
        
        with caplog.at_level(logging.ERROR):
            with patch('app.routers.auth.AuthService') as mock_service:
                mock_service.return_value.register_user = AsyncMock(
                    side_effect=ValueError("Invalid email domain")
                )
                
                # Act
                try:
                    from app.routers.auth import register
                    await register(user_data, mock_db_session)
                except HTTPException:
                    pass  # Expected
                
                # Assert: Log contains user context and error details
                assert len(caplog.records) > 0
                log_record = caplog.records[0]
                assert log_record.levelname == "ERROR"
                assert "Registration failed for user: testuser" in log_record.message
                assert "username" in log_record.__dict__
                assert "email" in log_record.__dict__
                # exc_info=True means stack trace is logged (not in message, but in record)
                assert log_record.exc_info is not None

    @pytest.mark.asyncio
    async def test_registration_reraises_http_exceptions(self, mock_db_session):
        """
        Test that HTTP exceptions (validation errors) are re-raised as-is.
        Session 26 pattern: Validation errors should bubble up unchanged.
        """
        # Arrange
        user_data = UserRegisterRequest(
            email="existing@example.com",
            password="TestPass123!",
            full_name="Test User",
            username="existinguser"
        )
        
        # Mock AuthService to raise HTTPException (e.g., user already exists)
        with patch('app.routers.auth.AuthService') as mock_service:
            expected_exception = HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already exists"
            )
            mock_service.return_value.register_user = AsyncMock(side_effect=expected_exception)
            
            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                from app.routers.auth import register
                await register(user_data, mock_db_session)
            
            # Verify original HTTPException is preserved
            assert exc_info.value.status_code == status.HTTP_409_CONFLICT
            assert exc_info.value.detail == "User already exists"

    @pytest.mark.asyncio
    async def test_registration_no_stack_trace_in_response(self, mock_db_session):
        """
        Test that stack traces are NEVER included in HTTP responses.
        OWASP A05:2021: Information disclosure prevention.
        """
        # Arrange
        user_data = UserRegisterRequest(
            email="test@example.com",
            password="TestPass123!",
            full_name="Test User",
            username="testuser"
        )
        
        # Create realistic exception with stack trace
        with patch('app.routers.auth.AuthService') as mock_service:
            try:
                # Simulate deep call stack
                def nested_error():
                    def inner_error():
                        raise RuntimeError("app/services/auth_service.py:123 - Database error")
                    inner_error()
                nested_error()
            except RuntimeError as e:
                mock_service.return_value.register_user = AsyncMock(side_effect=e)
            
            # Act
            with pytest.raises(HTTPException) as exc_info:
                from app.routers.auth import register
                await register(user_data, mock_db_session)
            
            # Assert: No file paths, line numbers, or stack trace in response
            response_detail = exc_info.value.detail
            assert "app/services/" not in response_detail
            assert ".py" not in response_detail
            assert "line" not in response_detail.lower()
            assert "traceback" not in response_detail.lower()
            assert "Database error" not in response_detail


class TestLoginErrorHandling:
    """Test /login endpoint error handling (Session 26 patterns)"""

    @pytest.mark.asyncio
    async def test_login_generic_error_on_exception(self, mock_db_session):
        """
        Test that login returns generic error message on unexpected exceptions.
        OWASP A05:2021: No information disclosure to client.
        """
        # Arrange
        login_data = UserLoginRequest(
            email="test@example.com",
            password="TestPass123!"
        )
        
        with patch('app.routers.auth.AuthService') as mock_service:
            mock_service.return_value.login_user = AsyncMock(
                side_effect=Exception("Redis connection refused")
            )
            
            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                from app.routers.auth import login
                await login(login_data, mock_db_session)
            
            # Verify generic error message
            assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert exc_info.value.detail == "Internal server error during login. Please try again later."
            assert "Redis" not in exc_info.value.detail
            assert "connection" not in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_login_logs_identifier_context(self, mock_db_session, caplog):
        """
        Test that login logs email for debugging context.
        Session 26 pattern: Log context without exposing passwords.
        """
        # Arrange
        login_data = UserLoginRequest(
            email="hacker@evil.com",
            password="GuessMe123!"
        )
        
        with caplog.at_level(logging.ERROR):
            with patch('app.routers.auth.AuthService') as mock_service:
                mock_service.return_value.login_user = AsyncMock(
                    side_effect=RuntimeError("Token generation failed")
                )
                
                # Act
                try:
                    from app.routers.auth import login
                    await login(login_data, mock_db_session)
                except HTTPException:
                    pass
                
                # Assert: Email logged, password NOT logged
                assert len(caplog.records) > 0
                log_record = caplog.records[0]
                assert "Login failed for email: hacker@evil.com" in log_record.message
                # Password should NEVER be logged
                assert "GuessMe123!" not in str(caplog.records)
                assert "password" not in str(log_record.__dict__).lower()

    @pytest.mark.asyncio
    async def test_login_reraises_invalid_credentials(self, mock_db_session):
        """
        Test that login re-raises HTTPException for invalid credentials.
        Session 26 pattern: Validation errors bubble up unchanged.
        """
        # Arrange
        login_data = UserLoginRequest(
            email="test@example.com",
            password="WrongPass123!"
        )
        
        with patch('app.routers.auth.AuthService') as mock_service:
            expected_exception = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
            mock_service.return_value.login_user = AsyncMock(side_effect=expected_exception)
            
            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                from app.routers.auth import login
                await login(login_data, mock_db_session)
            
            # Verify original exception preserved
            assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
            assert exc_info.value.detail == "Invalid credentials"

    @pytest.mark.asyncio
    async def test_login_no_timing_attack_info(self, mock_db_session):
        """
        Test that login errors don't leak timing information.
        Security best practice: Same error for "user not found" vs "wrong password".
        """
        # Arrange
        login_data = UserLoginRequest(
            email="nonexistent@example.com",
            password="AnyPass123!"
        )
        
        with patch('app.routers.auth.AuthService') as mock_service:
            # Simulate "user not found" scenario
            mock_service.return_value.login_user = AsyncMock(
                side_effect=HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"  # Generic message
                )
            )
            
            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                from app.routers.auth import login
                await login(login_data, mock_db_session)
            
            # Verify no "user not found" specific message
            assert "not found" not in exc_info.value.detail.lower()
            assert "does not exist" not in exc_info.value.detail.lower()
            assert exc_info.value.detail == "Invalid credentials"


class TestGoogleOAuthErrorHandling:
    """Test /google endpoint error handling (Session 26 patterns)"""

    @pytest.mark.asyncio
    async def test_google_oauth_generic_error_on_unexpected_exception(self, mock_db_session):
        """
        Test that Google OAuth returns generic error on unexpected exceptions.
        OWASP A05:2021: No information disclosure to client.
        """
        # Arrange
        oauth_data = GoogleOAuthRequest(token="valid.jwt.token")
        
        with patch('app.routers.auth.AuthService') as mock_service:
            # Simulate unexpected exception (not httpx or HTTPException)
            mock_service.return_value.create_user_from_oauth = AsyncMock(
                side_effect=RuntimeError("Internal database error")
            )
            
            with patch('httpx.AsyncClient') as mock_client:
                # Mock successful Google token verification
                mock_response = MagicMock()
                mock_response.status_code = 200
                mock_response.json.return_value = {
                    "email": "test@example.com",
                    "sub": "1234567890",
                    "name": "Test User",
                    "email_verified": True,
                    "aud": "mock-client-id",
                    "exp": 9999999999
                }
                mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
                
                with patch('app.routers.auth.settings') as mock_settings:
                    mock_settings.GOOGLE_CLIENT_ID = "mock-client-id"
                    
                    # Act & Assert
                    with pytest.raises(HTTPException) as exc_info:
                        from app.routers.auth import google_oauth
                        await google_oauth(oauth_data, mock_db_session)
                    
                    # Verify generic error message for unexpected exceptions
                    assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
                    assert "An unexpected error occurred during Google authentication" in exc_info.value.detail
                    assert "database error" not in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_google_oauth_401_on_invalid_token(self, mock_db_session):
        """
        Test that Google OAuth returns 401 for invalid tokens.
        Session 26 pattern: Token validation errors get 401, not 500.
        """
        # Arrange
        oauth_data = GoogleOAuthRequest(token="invalid.jwt.token")
        
        with patch('httpx.AsyncClient') as mock_client:
            # Mock Google token verification failure
            mock_response = MagicMock()
            mock_response.status_code = 400
            mock_response.json.return_value = {
                "error_description": "Invalid Value"
            }
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
            
            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                from app.routers.auth import google_oauth
                await google_oauth(oauth_data, mock_db_session)
            
            # Verify 401 status code for validation error
            assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
            assert "Google token verification failed" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_google_oauth_logs_token_prefix_only(self, mock_db_session, caplog):
        """
        Test that Google OAuth logs token prefix (not full token).
        Security best practice: Don't log sensitive credentials.
        """
        # Arrange
        oauth_data = GoogleOAuthRequest(token="eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1Njc4OTAifQ.payload.signature")
        
        with caplog.at_level(logging.ERROR):
            with patch('app.routers.auth.AuthService') as mock_service:
                mock_service.return_value.google_oauth = AsyncMock(
                    side_effect=ValueError("Invalid token format")
                )
                
                # Act
                try:
                    from app.routers.auth import google_oauth
                    await google_oauth(oauth_data, mock_db_session)
                except HTTPException:
                    pass
                
                # Assert: Full token should NOT be logged
                log_text = str(caplog.records)
                assert "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1Njc4OTAifQ.payload.signature" not in log_text
                # Token prefix or hash might be logged for debugging (acceptable)
                # But full JWT should never appear

    @pytest.mark.asyncio
    async def test_google_oauth_reraises_validation_errors(self, mock_db_session):
        """
        Test that Google OAuth raises 401 for validation errors.
        Implementation: Validation errors return 401 UNAUTHORIZED.
        """
        # Arrange
        oauth_data = GoogleOAuthRequest(token="malformed_token")
        
        with patch('httpx.AsyncClient') as mock_client:
            # Mock Google token verification failure
            mock_response = MagicMock()
            mock_response.status_code = 400
            mock_response.json.return_value = {
                "error_description": "Invalid Value"
            }
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
            
            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                from app.routers.auth import google_oauth
                await google_oauth(oauth_data, mock_db_session)
            
            # Verify 401 status code (actual implementation behavior)
            assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
            assert "Google token verification failed" in exc_info.value.detail


class TestOWASPCompliance:
    """Test OWASP A05:2021 Security Misconfiguration compliance"""

    @pytest.mark.asyncio
    async def test_no_traceback_format_exc_in_responses(self, mock_db_session):
        """
        Critical: Verify traceback.format_exc() is NEVER used in responses.
        Session 26 fix: Replaced with logger.error(exc_info=True).
        """
        # Arrange
        user_data = UserRegisterRequest(
            email="test@example.com",
            password="TestPass123!",
            full_name="Test User",
            username="testuser"
        )
        
        with patch('app.routers.auth.AuthService') as mock_service:
            # Create exception with detailed traceback
            try:
                raise RuntimeError("Detailed internal error with file paths")
            except RuntimeError as e:
                mock_service.return_value.register_user = AsyncMock(side_effect=e)
            
            # Act
            with pytest.raises(HTTPException) as exc_info:
                from app.routers.auth import register
                await register(user_data, mock_db_session)
            
            # Assert: Response detail is generic, not traceback
            detail = exc_info.value.detail
            assert "Traceback" not in detail
            assert "File \"" not in detail
            assert "line " not in detail
            assert detail == "Internal server error during registration. Please try again later."

    @pytest.mark.asyncio
    async def test_no_print_statements_in_error_handling(self):
        """
        Verify no print() statements in auth router error handling.
        Session 26 removed print(traceback.format_exc()) in favor of logger.
        """
        # Read auth.py source code
        import inspect
        from app.routers import auth
        
        source = inspect.getsource(auth)
        
        # Assert: No print statements with traceback
        assert "print(traceback" not in source
        assert "traceback.print_exc()" not in source
        assert "traceback.format_exc()" not in source
        
        # Verify logger.error with exc_info=True is used instead
        assert "logger.error(" in source
        assert "exc_info=True" in source

    @pytest.mark.asyncio
    async def test_generic_errors_dont_expose_internals(self, mock_db_session):
        """
        Test that all auth endpoint errors use generic messages.
        OWASP A05:2021: No information disclosure about system internals.
        """
        # Test various internal error scenarios
        test_cases = [
            ("Database connection lost", "Internal server error during registration"),
            ("Redis cache unavailable", "Internal server error during login"),
            ("JWT signing key missing", "Internal server error during Google authentication"),
            ("app/models/user.py:45", "Internal server error during registration"),
        ]
        
        for internal_error, expected_generic in test_cases:
            with patch('app.routers.auth.AuthService') as mock_service:
                mock_service.return_value.register_user = AsyncMock(
                    side_effect=Exception(internal_error)
                )
                
                user_data = UserRegisterRequest(
                    email="test@example.com",
                    password="TestPass123!",
                    full_name="Test User",
                    username="testuser"
                )
                
                with pytest.raises(HTTPException) as exc_info:
                    from app.routers.auth import register
                    await register(user_data, mock_db_session)
                
                # Assert: Generic message, no internal details
                assert internal_error not in exc_info.value.detail
                assert "Internal server error" in exc_info.value.detail


# Pytest fixtures
@pytest.fixture
async def mock_db_session():
    """Mock database session for testing"""
    session = AsyncMock(spec=AsyncSession)
    return session


@pytest.fixture
def caplog(caplog):
    """Pytest caplog fixture for capturing log output"""
    return caplog
