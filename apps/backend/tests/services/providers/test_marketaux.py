"""Tests for app.services.providers.marketaux module.

Tests the MarketAux news provider:
- News data fetching
- Response parsing
- Parameter construction

Coverage target: 100%
"""

from unittest.mock import patch

import pytest

from app.services.providers.marketaux import fetch_news


class TestFetchNews:
    """Tests for fetch_news function."""

    @pytest.mark.asyncio
    async def test_calls_correct_api_url(self):
        """Test that correct MarketAux API URL is called."""
        mock_response = {"data": []}

        with patch("app.services.providers.marketaux._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.marketaux.settings") as mock_settings:
                mock_settings.MARKETAUX_KEY = "test_key"

                await fetch_news("AAPL", 20)

                call_args = mock_get.call_args
                assert "api.marketaux.com" in call_args[0][0]
                assert "/news/all" in call_args[0][0]

    @pytest.mark.asyncio
    async def test_includes_symbol_in_request(self):
        """Test that symbol is included in request."""
        mock_response = {"data": []}

        with patch("app.services.providers.marketaux._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.marketaux.settings") as mock_settings:
                mock_settings.MARKETAUX_KEY = "test_key"

                await fetch_news("AAPL", 20)

                call_args = mock_get.call_args
                assert call_args[0][1]["symbols"] == "AAPL"

    @pytest.mark.asyncio
    async def test_includes_api_key_in_request(self):
        """Test that API key is included in request."""
        mock_response = {"data": []}

        with patch("app.services.providers.marketaux._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.marketaux.settings") as mock_settings:
                mock_settings.MARKETAUX_KEY = "my_marketaux_key"

                await fetch_news("AAPL", 20)

                call_args = mock_get.call_args
                assert call_args[0][1]["api_token"] == "my_marketaux_key"

    @pytest.mark.asyncio
    async def test_includes_limit_in_request(self):
        """Test that limit is included in request."""
        mock_response = {"data": []}

        with patch("app.services.providers.marketaux._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.marketaux.settings") as mock_settings:
                mock_settings.MARKETAUX_KEY = "test_key"

                await fetch_news("AAPL", 50)

                call_args = mock_get.call_args
                assert call_args[0][1]["limit"] == 50

    @pytest.mark.asyncio
    async def test_includes_filter_entities_true(self):
        """Test that filter_entities is set to true."""
        mock_response = {"data": []}

        with patch("app.services.providers.marketaux._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.marketaux.settings") as mock_settings:
                mock_settings.MARKETAUX_KEY = "test_key"

                await fetch_news("AAPL", 20)

                call_args = mock_get.call_args
                assert call_args[0][1]["filter_entities"] == "true"

    @pytest.mark.asyncio
    async def test_parses_news_data_correctly(self):
        """Test that news data is parsed correctly."""
        mock_response = {
            "data": [
                {
                    "uuid": "article-123",
                    "source": "Reuters",
                    "title": "Apple announces new product",
                    "url": "https://example.com/article",
                    "published_at": "2024-01-15T10:00:00Z",
                }
            ]
        }

        with patch("app.services.providers.marketaux._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.marketaux.settings") as mock_settings:
                mock_settings.MARKETAUX_KEY = "test_key"

                result = await fetch_news("AAPL", 20)

                assert len(result) == 1
                assert result[0]["id"] == "article-123"
                assert result[0]["symbol"] == "AAPL"
                assert result[0]["source"] == "Reuters"
                assert result[0]["title"] == "Apple announces new product"
                assert result[0]["url"] == "https://example.com/article"
                assert result[0]["published_at"] == "2024-01-15T10:00:00Z"

    @pytest.mark.asyncio
    async def test_uses_index_as_id_when_no_uuid(self):
        """Test that index is used as ID when no uuid."""
        mock_response = {
            "data": [
                {
                    "source": "Reuters",
                    "title": "Article without UUID",
                    "url": "https://example.com/article",
                    "published_at": "2024-01-15T10:00:00Z",
                }
            ]
        }

        with patch("app.services.providers.marketaux._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.marketaux.settings") as mock_settings:
                mock_settings.MARKETAUX_KEY = "test_key"

                result = await fetch_news("AAPL", 20)

                assert result[0]["id"] == 0  # First article, index 0

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_data(self):
        """Test that empty list is returned when no data."""
        mock_response = {"data": []}

        with patch("app.services.providers.marketaux._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.marketaux.settings") as mock_settings:
                mock_settings.MARKETAUX_KEY = "test_key"

                result = await fetch_news("AAPL", 20)

                assert result == []

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_data_key(self):
        """Test that empty list is returned when no data key."""
        mock_response = {"status": "error"}

        with patch("app.services.providers.marketaux._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.marketaux.settings") as mock_settings:
                mock_settings.MARKETAUX_KEY = "test_key"

                result = await fetch_news("AAPL", 20)

                assert result == []

    @pytest.mark.asyncio
    async def test_handles_multiple_articles(self):
        """Test that multiple articles are parsed correctly."""
        mock_response = {
            "data": [
                {
                    "uuid": "article-1",
                    "source": "Reuters",
                    "title": "First article",
                    "url": "https://example.com/1",
                    "published_at": "2024-01-15T10:00:00Z",
                },
                {
                    "uuid": "article-2",
                    "source": "Bloomberg",
                    "title": "Second article",
                    "url": "https://example.com/2",
                    "published_at": "2024-01-15T11:00:00Z",
                },
            ]
        }

        with patch("app.services.providers.marketaux._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.marketaux.settings") as mock_settings:
                mock_settings.MARKETAUX_KEY = "test_key"

                result = await fetch_news("AAPL", 20)

                assert len(result) == 2
                assert result[0]["id"] == "article-1"
                assert result[1]["id"] == "article-2"

    @pytest.mark.asyncio
    async def test_default_limit_is_20(self):
        """Test that default limit is 20."""
        mock_response = {"data": []}

        with patch("app.services.providers.marketaux._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.marketaux.settings") as mock_settings:
                mock_settings.MARKETAUX_KEY = "test_key"

                # Call without specifying limit
                await fetch_news("AAPL")

                call_args = mock_get.call_args
                assert call_args[0][1]["limit"] == 20
