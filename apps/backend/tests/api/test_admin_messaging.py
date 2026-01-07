"""
Tests for app.routers.admin_messaging

Includes security tests for log injection vulnerability fixes
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Import module under test
try:
    from app.routers.admin_messaging import router
    from app.utils.enhanced_validation import sanitize_for_logging
except ImportError as e:
    pytest.skip(f"Module import failed: {e}", allow_module_level=True)


# ============================================================================
# SECURITY TESTS - LOG INJECTION PREVENTION
# ============================================================================


class TestLogInjectionPrevention:
    """Test suite for log injection vulnerability fixes"""

    def test_sanitize_for_logging_removes_newlines(self):
        """Test that sanitize_for_logging removes newline characters"""
        # Test with various newline combinations
        malicious_input = "admin@test.com\nFAKE LOG ENTRY"
        sanitized = sanitize_for_logging(malicious_input)

        # Should not contain literal newlines
        assert "\n" not in sanitized
        assert "\r" not in sanitized

    def test_sanitize_for_logging_removes_carriage_returns(self):
        """Test that sanitize_for_logging removes carriage returns"""
        malicious_input = "admin@test.com\rFAKE LOG ENTRY"
        sanitized = sanitize_for_logging(malicious_input)

        assert "\r" not in sanitized

    def test_sanitize_for_logging_handles_list_input(self):
        """Test that sanitize_for_logging handles list inputs safely"""
        word_list = ["word1\nnewline", "word2\rcarriage", "word3"]
        sanitized = sanitize_for_logging(str(word_list))

        # Should not contain literal control characters
        assert "\n" not in sanitized
        assert "\r" not in sanitized

    def test_sanitize_for_logging_handles_none(self):
        """Test that sanitize_for_logging handles None input"""
        result = sanitize_for_logging(None)
        assert result == "<None>"

    def test_sanitize_for_logging_truncates_long_input(self):
        """Test that sanitize_for_logging truncates long inputs"""
        long_input = "A" * 300
        sanitized = sanitize_for_logging(long_input, max_length=200)

        # Should be truncated with ellipsis
        assert len(sanitized) <= 203  # 200 + "..."
        assert sanitized.endswith("...")

    def test_sanitize_for_logging_removes_control_characters(self):
        """Test that sanitize_for_logging removes various control characters"""
        # Test various ASCII control characters
        malicious = "admin@test.com\x00\x01\x02\x1f\x7f"
        sanitized = sanitize_for_logging(malicious)

        # Should not contain control characters
        assert "\x00" not in sanitized
        assert "\x01" not in sanitized
        assert "\x1f" not in sanitized
        assert "\x7f" not in sanitized

    @pytest.mark.asyncio
    async def test_add_blocked_words_logging_sanitized(self):
        """Test that add_blocked_words endpoint sanitizes log inputs"""
        from app.routers.admin_messaging import logger

        # Mock the logger
        with patch.object(logger, "info") as mock_logger:
            # Mock the moderation service
            mock_service = MagicMock()
            mock_service.add_blocked_words = MagicMock()
            mock_service.get_blocked_words = MagicMock(return_value=["word1", "word2"])

            # Mock admin user with malicious email
            mock_admin = MagicMock()
            mock_admin.email = "admin@test.com\nMALICIOUS_LOG_ENTRY"

            # Mock db session
            mock_db = AsyncMock()

            # Call the function with mocked dependencies
            with patch(
                "app.routers.admin_messaging.MessageModerationService",
                return_value=mock_service,
            ):
                from app.routers.admin_messaging import add_blocked_words

                words = ["bad\nword", "another\rword"]
                await add_blocked_words(words, mock_admin, mock_db)

                # Verify logger was called
                assert mock_logger.called

                # Get the actual log call arguments
                call_args = mock_logger.call_args[0]

                # Verify format string uses %s placeholders (not f-strings)
                assert "%s" in call_args[0]

                # Verify the sanitized values don't contain newlines
                for arg in call_args[1:]:
                    assert "\n" not in str(arg)
                    assert "\r" not in str(arg)

    @pytest.mark.asyncio
    async def test_remove_blocked_words_logging_sanitized(self):
        """Test that remove_blocked_words endpoint sanitizes log inputs"""
        from app.routers.admin_messaging import logger

        with patch.object(logger, "info") as mock_logger:
            mock_service = MagicMock()
            mock_service.remove_blocked_words = MagicMock()
            mock_service.get_blocked_words = MagicMock(return_value=["word1"])

            mock_admin = MagicMock()
            mock_admin.email = "admin@test.com\nFAKE_LOG"

            mock_db = AsyncMock()

            with patch(
                "app.routers.admin_messaging.MessageModerationService",
                return_value=mock_service,
            ):
                from app.routers.admin_messaging import remove_blocked_words

                words = ["word\nwith\nnewlines"]
                await remove_blocked_words(words, mock_admin, mock_db)

                assert mock_logger.called
                call_args = mock_logger.call_args[0]

                # Verify sanitized logging
                for arg in call_args[1:]:
                    assert "\n" not in str(arg)
                    assert "\r" not in str(arg)

    @pytest.mark.asyncio
    async def test_admin_broadcast_logging_sanitized(self):
        """Test that admin_broadcast_message endpoint sanitizes log inputs"""
        from app.routers.admin_messaging import logger

        with patch.object(logger, "info") as mock_logger:
            mock_admin = MagicMock()
            mock_admin.email = "admin@test.com\nFAKE_BROADCAST"

            # Mock connection manager
            mock_cm = MagicMock()
            mock_cm.get_online_users = MagicMock(return_value=[1, 2, 3])
            mock_cm.send_personal_message = AsyncMock()

            with patch("app.routers.admin_messaging.connection_manager", mock_cm):
                from app.routers.admin_messaging import admin_broadcast_message

                malicious_message = "Important\nFAKE LOG: Admin hacked the system"
                await admin_broadcast_message(malicious_message, mock_admin)

                assert mock_logger.called
                call_args = mock_logger.call_args[0]

                # Verify sanitized logging
                for arg in call_args[1:]:
                    assert "\n" not in str(arg)
                    assert "\r" not in str(arg)


# ============================================================================
# BASIC FUNCTIONALITY TESTS
# ============================================================================


class TestAdminMessaging:
    """Test suite for admin_messaging basic functionality"""

    def test_module_imports(self):
        """Test that module imports successfully"""
        assert router is not None

    def test_sanitize_for_logging_available(self):
        """Test that sanitization utility is available"""
        result = sanitize_for_logging("test")
        assert isinstance(result, str)
        assert result == "test"
