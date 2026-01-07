"""
Tests for API chat route (app.api.routes.chat).

Comprehensive test coverage for:
- tool_get_price helper function
- tool_portfolio_summary helper function
- tool_create_price_alert helper function
- openai_chat function
- chat endpoint (slash commands and LLM modes)
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.api.routes.chat import (
    ChatMessage,
    ChatRequest,
    chat,
    openai_chat,
    tool_create_price_alert,
    tool_get_price,
    tool_portfolio_summary,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_ohlc_bar():
    """Mock OHLC bar data."""
    return {
        "open": 45000.0,
        "high": 46000.0,
        "low": 44000.0,
        "close": 45500.0,
        "volume": 1000.0,
    }


@pytest.fixture
def mock_portfolio_data():
    """Mock portfolio summary data."""
    return {
        "total_value": 50000.0,
        "total_pl": 5000.0,
        "total_pl_pct": 10.0,
        "positions": [],
    }


@pytest.fixture
def chat_request_price():
    """Chat request for /price command."""
    return ChatRequest(messages=[ChatMessage(role="user", content="/price BTCUSD 1h")])


@pytest.fixture
def chat_request_alert():
    """Chat request for /alert command."""
    return ChatRequest(
        messages=[ChatMessage(role="user", content="/alert BTCUSD above 45000")]
    )


@pytest.fixture
def chat_request_portfolio():
    """Chat request for /portfolio command."""
    return ChatRequest(messages=[ChatMessage(role="user", content="/portfolio")])


# ============================================================================
# tool_get_price Tests
# ============================================================================


class TestToolGetPrice:
    """Test suite for tool_get_price function."""

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.fetch_ohlc")
    async def test_get_price_success(self, mock_fetch, mock_ohlc_bar):
        """Test successful price fetch."""
        mock_fetch.return_value = [mock_ohlc_bar]

        result = await tool_get_price("BTCUSD", "1h")

        assert result["symbol"] == "BTCUSD"
        assert result["timeframe"] == "1h"
        assert result["price"] == 45500.0
        assert result["bar"] == mock_ohlc_bar
        mock_fetch.assert_called_once_with(symbol="BTCUSD", timeframe="1h", limit=1)

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.fetch_ohlc")
    async def test_get_price_default_timeframe(self, mock_fetch, mock_ohlc_bar):
        """Test default timeframe is 1h."""
        mock_fetch.return_value = [mock_ohlc_bar]

        result = await tool_get_price("ETHUSD")

        assert result["timeframe"] == "1h"
        mock_fetch.assert_called_once_with(symbol="ETHUSD", timeframe="1h", limit=1)

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.fetch_ohlc")
    async def test_get_price_different_timeframes(self, mock_fetch, mock_ohlc_bar):
        """Test with different timeframes."""
        mock_fetch.return_value = [mock_ohlc_bar]

        for tf in ["1m", "5m", "15m", "4h", "1d"]:
            result = await tool_get_price("BTCUSD", tf)
            assert result["timeframe"] == tf


# ============================================================================
# tool_portfolio_summary Tests
# ============================================================================


class TestToolPortfolioSummary:
    """Test suite for tool_portfolio_summary function.

    Note: tool_portfolio_summary is a thin wrapper around _portfolio_summary.
    The _portfolio_summary function is decorated with an async cache decorator.
    Testing the integration through the chat endpoint provides better coverage.
    """

    def test_portfolio_summary_calls_underlying_function(self):
        """Verify tool_portfolio_summary delegates to _portfolio_summary.

        This is a simple structural test - the real behavior is tested
        through the chat endpoint tests.
        """
        # The function exists and is async
        import inspect

        assert inspect.iscoroutinefunction(tool_portfolio_summary)

    @pytest.mark.asyncio
    @patch("app.api.routes.chat._portfolio_summary")
    async def test_portfolio_summary_passes_authorization(self, mock_portfolio):
        """Test that authorization is passed through."""
        # Mock returns dict directly (bypassing async cache decorator)
        mock_portfolio.return_value = {"total_value": 1000}

        # Call the function - it will call the mock
        await tool_portfolio_summary("Bearer token")

        mock_portfolio.assert_called_once_with(
            handle=None, authorization="Bearer token"
        )


# ============================================================================
# tool_create_price_alert Tests
# ============================================================================


class TestToolCreatePriceAlert:
    """Test suite for tool_create_price_alert function."""

    @pytest.mark.asyncio
    @patch("app.api.routes.chat._create_alert")
    async def test_create_alert_above(self, mock_create):
        """Test creating price alert (above)."""
        mock_create.return_value = {"id": 1, "status": "created"}

        result = await tool_create_price_alert(
            "BTCUSD", "above", 50000.0, "Bearer token"
        )

        assert result == {"id": 1, "status": "created"}
        # Verify alert payload
        call_args = mock_create.call_args
        payload = call_args[0][0]
        assert payload.type == "price_threshold"
        assert payload.symbol == "BTCUSD"
        assert payload.config["direction"] == "above"
        assert payload.config["price"] == 50000.0

    @pytest.mark.asyncio
    @patch("app.api.routes.chat._create_alert")
    async def test_create_alert_below(self, mock_create):
        """Test creating price alert (below)."""
        mock_create.return_value = {"id": 2, "status": "created"}

        result = await tool_create_price_alert(
            "ETHUSD", "below", 3000.0, "Bearer token"
        )

        call_args = mock_create.call_args
        payload = call_args[0][0]
        assert payload.config["direction"] == "below"
        assert payload.config["price"] == 3000.0


# ============================================================================
# openai_chat Tests
# ============================================================================


class TestOpenaiChat:
    """Test suite for openai_chat function."""

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.OPENAI_API_KEY", None)
    async def test_no_api_key_raises(self):
        """Test that missing API key raises RuntimeError."""
        with pytest.raises(RuntimeError, match="OPENAI_API_KEY not set"):
            await openai_chat([], [])

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.OPENAI_API_KEY", "test-key")
    @patch("app.api.routes.chat.httpx.AsyncClient")
    async def test_successful_chat_completion(self, mock_client):
        """Test successful OpenAI chat completion."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Hello!"}}]
        }

        mock_instance = AsyncMock()
        mock_instance.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_instance

        result = await openai_chat([{"role": "user", "content": "Hi"}], [])

        assert result["choices"][0]["message"]["content"] == "Hello!"
        mock_instance.post.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.OPENAI_API_KEY", "test-key")
    @patch("app.api.routes.chat.httpx.AsyncClient")
    async def test_chat_with_tools(self, mock_client):
        """Test chat with tool definitions."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"choices": [{"message": {"tool_calls": []}}]}

        mock_instance = AsyncMock()
        mock_instance.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_instance

        tools = [{"type": "function", "function": {"name": "test"}}]
        await openai_chat([{"role": "user", "content": "test"}], tools)

        # Verify tools were passed in request
        call_args = mock_instance.post.call_args
        body = call_args.kwargs["json"]
        assert body["tools"] == tools
        assert body["tool_choice"] == "auto"


# ============================================================================
# chat endpoint Tests - Slash Commands
# ============================================================================


class TestChatSlashCommands:
    """Test suite for chat endpoint slash commands."""

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.tool_get_price")
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_price_command_with_symbol(
        self, mock_auth, mock_price, mock_ohlc_bar
    ):
        """Test /price SYMBOL command."""
        mock_auth.return_value = None
        mock_price.return_value = {
            "symbol": "BTCUSD",
            "timeframe": "1h",
            "price": 45500.0,
            "bar": mock_ohlc_bar,
        }

        req = ChatRequest(messages=[ChatMessage(role="user", content="/price BTCUSD")])
        result = await chat(req, authorization=None)

        assert result["mode"] == "command"
        assert "BTCUSD" in result["answer"]
        assert result["result"]["price"] == 45500.0

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.tool_get_price")
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_price_command_with_timeframe(self, mock_auth, mock_price):
        """Test /price SYMBOL TIMEFRAME command."""
        mock_auth.return_value = None
        mock_price.return_value = {
            "symbol": "ETHUSD",
            "timeframe": "4h",
            "price": 3000.0,
            "bar": {},
        }

        req = ChatRequest(
            messages=[ChatMessage(role="user", content="/price ETHUSD 4h")]
        )
        result = await chat(req, authorization=None)

        mock_price.assert_called_with("ETHUSD", "4h")
        assert result["result"]["timeframe"] == "4h"

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_price_command_no_symbol_error(self, mock_auth):
        """Test /price command without symbol raises error."""
        mock_auth.return_value = None

        req = ChatRequest(messages=[ChatMessage(role="user", content="/price")])

        with pytest.raises(HTTPException) as exc:
            await chat(req, authorization=None)

        assert exc.value.status_code == 400
        assert "Usage:" in exc.value.detail

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.tool_create_price_alert")
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_alert_command_success(self, mock_auth, mock_create):
        """Test /alert SYMBOL DIRECTION PRICE command."""
        mock_auth.return_value = "user123"
        mock_create.return_value = {"id": 1}

        req = ChatRequest(
            messages=[ChatMessage(role="user", content="/alert BTCUSD above 50000")]
        )
        result = await chat(req, authorization="Bearer token")

        assert result["mode"] == "command"
        assert "Alert created" in result["answer"]
        mock_create.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_alert_command_missing_args_error(self, mock_auth):
        """Test /alert with missing arguments."""
        mock_auth.return_value = "user123"

        req = ChatRequest(messages=[ChatMessage(role="user", content="/alert BTCUSD")])

        with pytest.raises(HTTPException) as exc:
            await chat(req, authorization="Bearer token")

        assert exc.value.status_code == 400
        assert "Usage:" in exc.value.detail

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_alert_command_no_auth_error(self, mock_auth):
        """Test /alert without authentication."""
        mock_auth.return_value = None

        req = ChatRequest(
            messages=[ChatMessage(role="user", content="/alert BTCUSD above 50000")]
        )

        with pytest.raises(HTTPException) as exc:
            await chat(req, authorization=None)

        assert exc.value.status_code == 401
        assert "Login required" in exc.value.detail

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.tool_portfolio_summary")
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_portfolio_command_success(
        self, mock_auth, mock_portfolio, mock_portfolio_data
    ):
        """Test /portfolio command."""
        mock_auth.return_value = "user123"
        mock_portfolio.return_value = mock_portfolio_data

        req = ChatRequest(messages=[ChatMessage(role="user", content="/portfolio")])
        result = await chat(req, authorization="Bearer token")

        assert result["mode"] == "command"
        assert "portfolio value" in result["answer"]
        assert result["result"]["total_value"] == 50000.0

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_portfolio_command_no_auth_error(self, mock_auth):
        """Test /portfolio without authentication."""
        mock_auth.return_value = None

        req = ChatRequest(messages=[ChatMessage(role="user", content="/portfolio")])

        with pytest.raises(HTTPException) as exc:
            await chat(req, authorization=None)

        assert exc.value.status_code == 401
        assert "Login required" in exc.value.detail


# ============================================================================
# chat endpoint Tests - OpenAI Mode
# ============================================================================


class TestChatOpenAIMode:
    """Test suite for chat endpoint OpenAI mode."""

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.OPENAI_API_KEY", "test-key")
    @patch("app.api.routes.chat.openai_chat")
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_openai_text_response(self, mock_auth, mock_openai):
        """Test OpenAI text response (no tool calls)."""
        mock_auth.return_value = None
        mock_openai.return_value = {
            "choices": [{"message": {"content": "Here is the information..."}}]
        }

        req = ChatRequest(
            messages=[ChatMessage(role="user", content="What is Bitcoin?")]
        )
        result = await chat(req, authorization=None)

        assert result["mode"] == "llm"
        assert result["answer"] == "Here is the information..."

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.OPENAI_API_KEY", "test-key")
    @patch("app.api.routes.chat.tool_get_price")
    @patch("app.api.routes.chat.openai_chat")
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_openai_get_price_tool_call(
        self, mock_auth, mock_openai, mock_price, mock_ohlc_bar
    ):
        """Test OpenAI calls get_price tool."""
        mock_auth.return_value = None
        mock_openai.return_value = {
            "choices": [
                {
                    "message": {
                        "tool_calls": [
                            {
                                "function": {
                                    "name": "get_price",
                                    "arguments": json.dumps(
                                        {"symbol": "BTCUSD", "timeframe": "1h"}
                                    ),
                                }
                            }
                        ]
                    }
                }
            ]
        }
        mock_price.return_value = {
            "symbol": "BTCUSD",
            "timeframe": "1h",
            "price": 45500.0,
            "bar": mock_ohlc_bar,
        }

        req = ChatRequest(messages=[ChatMessage(role="user", content="Get BTC price")])
        result = await chat(req, authorization=None)

        assert result["mode"] == "tool"
        assert result["tool"] == "get_price"
        assert result["result"]["price"] == 45500.0

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.OPENAI_API_KEY", "test-key")
    @patch("app.api.routes.chat.tool_portfolio_summary")
    @patch("app.api.routes.chat.openai_chat")
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_openai_portfolio_tool_call(
        self, mock_auth, mock_openai, mock_portfolio, mock_portfolio_data
    ):
        """Test OpenAI calls portfolio_summary tool."""
        mock_auth.return_value = "user123"
        mock_openai.return_value = {
            "choices": [
                {
                    "message": {
                        "tool_calls": [
                            {
                                "function": {
                                    "name": "portfolio_summary",
                                    "arguments": "{}",
                                }
                            }
                        ]
                    }
                }
            ]
        }
        mock_portfolio.return_value = mock_portfolio_data

        req = ChatRequest(
            messages=[ChatMessage(role="user", content="Show my portfolio")]
        )
        result = await chat(req, authorization="Bearer token")

        assert result["mode"] == "tool"
        assert result["tool"] == "portfolio_summary"

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.OPENAI_API_KEY", "test-key")
    @patch("app.api.routes.chat.openai_chat")
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_openai_portfolio_tool_no_auth(self, mock_auth, mock_openai):
        """Test OpenAI portfolio tool without auth."""
        mock_auth.return_value = None
        mock_openai.return_value = {
            "choices": [
                {
                    "message": {
                        "tool_calls": [
                            {
                                "function": {
                                    "name": "portfolio_summary",
                                    "arguments": "{}",
                                }
                            }
                        ]
                    }
                }
            ]
        }

        req = ChatRequest(messages=[ChatMessage(role="user", content="Show portfolio")])

        with pytest.raises(HTTPException) as exc:
            await chat(req, authorization=None)

        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.OPENAI_API_KEY", "test-key")
    @patch("app.api.routes.chat.tool_create_price_alert")
    @patch("app.api.routes.chat.openai_chat")
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_openai_create_alert_tool_call(
        self, mock_auth, mock_openai, mock_create
    ):
        """Test OpenAI calls create_price_alert tool."""
        mock_auth.return_value = "user123"
        mock_openai.return_value = {
            "choices": [
                {
                    "message": {
                        "tool_calls": [
                            {
                                "function": {
                                    "name": "create_price_alert",
                                    "arguments": json.dumps(
                                        {
                                            "symbol": "BTCUSD",
                                            "direction": "above",
                                            "price": 50000,
                                        }
                                    ),
                                }
                            }
                        ]
                    }
                }
            ]
        }
        mock_create.return_value = {"id": 1, "status": "created"}

        req = ChatRequest(
            messages=[ChatMessage(role="user", content="Alert me when BTC above 50k")]
        )
        result = await chat(req, authorization="Bearer token")

        assert result["mode"] == "tool"
        assert result["tool"] == "create_price_alert"
        assert "Alert created" in result["answer"]

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.OPENAI_API_KEY", "test-key")
    @patch("app.api.routes.chat.openai_chat")
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_openai_create_alert_tool_no_auth(self, mock_auth, mock_openai):
        """Test OpenAI create_alert tool without auth."""
        mock_auth.return_value = None
        mock_openai.return_value = {
            "choices": [
                {
                    "message": {
                        "tool_calls": [
                            {
                                "function": {
                                    "name": "create_price_alert",
                                    "arguments": json.dumps(
                                        {
                                            "symbol": "BTCUSD",
                                            "direction": "above",
                                            "price": 50000,
                                        }
                                    ),
                                }
                            }
                        ]
                    }
                }
            ]
        }

        req = ChatRequest(messages=[ChatMessage(role="user", content="Alert me")])

        with pytest.raises(HTTPException) as exc:
            await chat(req, authorization=None)

        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.OPENAI_API_KEY", "test-key")
    @patch("app.api.routes.chat.openai_chat")
    @patch("app.api.routes.chat.tool_get_price")
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_openai_exception_falls_back_to_offline(
        self, mock_auth, mock_price, mock_openai, mock_ohlc_bar
    ):
        """Test that OpenAI exception falls back to offline mode."""
        mock_auth.return_value = None
        mock_openai.side_effect = Exception("API error")
        mock_price.return_value = {
            "symbol": "BTCUSD",
            "timeframe": "1h",
            "price": 45500.0,
            "bar": mock_ohlc_bar,
        }

        req = ChatRequest(
            messages=[ChatMessage(role="user", content="What is the price of BTC?")]
        )
        result = await chat(req, authorization=None)

        # Should fall back to offline mode
        assert result["mode"] == "offline"


# ============================================================================
# chat endpoint Tests - Offline Mode
# ============================================================================


class TestChatOfflineMode:
    """Test suite for chat endpoint offline mode."""

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.OPENAI_API_KEY", None)
    @patch("app.api.routes.chat.tool_get_price")
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_offline_price_intent(self, mock_auth, mock_price, mock_ohlc_bar):
        """Test offline mode price intent detection."""
        mock_auth.return_value = None
        mock_price.return_value = {
            "symbol": "BTCUSD",
            "timeframe": "1h",
            "price": 45500.0,
            "bar": mock_ohlc_bar,
        }

        req = ChatRequest(
            messages=[ChatMessage(role="user", content="What is the price of BTCUSD?")]
        )
        result = await chat(req, authorization=None)

        assert result["mode"] == "offline"
        assert "price" in result["answer"]

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.OPENAI_API_KEY", None)
    @patch("app.api.routes.chat.tool_portfolio_summary")
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_offline_portfolio_intent(
        self, mock_auth, mock_portfolio, mock_portfolio_data
    ):
        """Test offline mode portfolio intent detection."""
        mock_auth.return_value = "user123"
        mock_portfolio.return_value = mock_portfolio_data

        req = ChatRequest(
            messages=[ChatMessage(role="user", content="Show me my portfolio")]
        )
        result = await chat(req, authorization="Bearer token")

        assert result["mode"] == "offline"
        assert "portfolio value" in result["answer"]

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.OPENAI_API_KEY", None)
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_offline_fallback_message(self, mock_auth):
        """Test offline fallback message for unknown intents."""
        mock_auth.return_value = None

        req = ChatRequest(messages=[ChatMessage(role="user", content="Hello there!")])
        result = await chat(req, authorization=None)

        assert result["mode"] == "offline"
        assert "Try /price" in result["answer"]

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.OPENAI_API_KEY", None)
    @patch("app.api.routes.chat.tool_get_price")
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_offline_price_extracts_symbol(
        self, mock_auth, mock_price, mock_ohlc_bar
    ):
        """Test offline mode extracts symbol from text."""
        mock_auth.return_value = None
        mock_price.return_value = {
            "symbol": "ETHUSD",
            "timeframe": "1h",
            "price": 3000.0,
            "bar": mock_ohlc_bar,
        }

        req = ChatRequest(
            messages=[ChatMessage(role="user", content="What price is ETHUSD now?")]
        )
        result = await chat(req, authorization=None)

        # Should extract ETHUSD from text
        mock_price.assert_called()
        assert result["mode"] == "offline"


# ============================================================================
# ChatRequest/ChatMessage Schema Tests
# ============================================================================


class TestChatSchemas:
    """Test suite for chat Pydantic schemas."""

    def test_chat_message_required_fields(self):
        """Test ChatMessage with required fields."""
        msg = ChatMessage(role="user", content="Hello")
        assert msg.role == "user"
        assert msg.content == "Hello"
        assert msg.name is None

    def test_chat_message_with_name(self):
        """Test ChatMessage with optional name."""
        msg = ChatMessage(role="assistant", content="Hi", name="bot")
        assert msg.name == "bot"

    def test_chat_request_with_messages(self):
        """Test ChatRequest with messages."""
        req = ChatRequest(
            messages=[
                ChatMessage(role="user", content="Hello"),
                ChatMessage(role="assistant", content="Hi there"),
            ]
        )
        assert len(req.messages) == 2
        assert req.messages[0].role == "user"
        assert req.messages[1].role == "assistant"


# ============================================================================
# Edge Cases Tests
# ============================================================================


class TestChatEdgeCases:
    """Test suite for edge cases."""

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_empty_messages_list(self, mock_auth):
        """Test with empty messages (no user message)."""
        mock_auth.return_value = None

        req = ChatRequest(messages=[])
        result = await chat(req, authorization=None)

        # Should handle empty messages gracefully
        assert result["mode"] == "offline"

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_only_assistant_messages(self, mock_auth):
        """Test with only assistant messages (no user)."""
        mock_auth.return_value = None

        req = ChatRequest(
            messages=[ChatMessage(role="assistant", content="Previous response")]
        )
        result = await chat(req, authorization=None)

        # Should handle no user message gracefully
        assert result["mode"] == "offline"

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.OPENAI_API_KEY", "test-key")
    @patch("app.api.routes.chat.openai_chat")
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_openai_empty_choices(self, mock_auth, mock_openai):
        """Test OpenAI returns empty choices."""
        mock_auth.return_value = None
        mock_openai.return_value = {"choices": []}

        req = ChatRequest(messages=[ChatMessage(role="user", content="Hello")])
        result = await chat(req, authorization=None)

        # Should fall back to offline mode
        assert result["mode"] == "offline"

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.OPENAI_API_KEY", "test-key")
    @patch("app.api.routes.chat.openai_chat")
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_openai_null_response(self, mock_auth, mock_openai):
        """Test OpenAI returns None."""
        mock_auth.return_value = None
        mock_openai.return_value = None

        req = ChatRequest(messages=[ChatMessage(role="user", content="Hello")])
        result = await chat(req, authorization=None)

        # Should fall back to offline mode
        assert result["mode"] == "offline"

    @pytest.mark.asyncio
    @patch("app.api.routes.chat.OPENAI_API_KEY", "test-key")
    @patch("app.api.routes.chat.tool_get_price")
    @patch("app.api.routes.chat.openai_chat")
    @patch("app.api.routes.chat.auth_handle_from_header")
    async def test_openai_tool_call_empty_arguments(
        self, mock_auth, mock_openai, mock_price, mock_ohlc_bar
    ):
        """Test OpenAI tool call with empty arguments."""
        mock_auth.return_value = None
        mock_openai.return_value = {
            "choices": [
                {
                    "message": {
                        "tool_calls": [
                            {
                                "function": {
                                    "name": "get_price",
                                    "arguments": "",  # Empty args
                                }
                            }
                        ]
                    }
                }
            ]
        }
        mock_price.return_value = {
            "symbol": "",
            "timeframe": "1h",
            "price": 0.0,
            "bar": {},
        }

        req = ChatRequest(messages=[ChatMessage(role="user", content="Price")])
        result = await chat(req, authorization=None)

        # Should still work with empty args
        assert result["mode"] == "tool"
