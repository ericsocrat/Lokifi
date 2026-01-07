"""Tests for app.services.providers.newsapi module.

Tests the NewsAPI news provider:
- News data fetching
- Response parsing
- Parameter construction

Coverage target: 100%
"""

from unittest.mock import patch

import pytest

from app.services.providers.newsapi import fetch_news


class TestFetchNews:
    """Tests for fetch_news function."""

    @pytest.mark.asyncio
    async def test_calls_correct_api_url(self):
        """Test that correct NewsAPI URL is called."""
        mock_response = {"articles": []}

        with patch("app.services.providers.newsapi._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.newsapi.settings") as mock_settings:
                mock_settings.NEWSAPI_KEY = "test_key"

                await fetch_news("AAPL", 20)

                call_args = mock_get.call_args
                assert "newsapi.org" in call_args[0][0]
                assert "/everything" in call_args[0][0]

    @pytest.mark.asyncio
    async def test_includes_query_in_request(self):
        """Test that query (symbol) is included in request."""
        mock_response = {"articles": []}

        with patch("app.services.providers.newsapi._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.newsapi.settings") as mock_settings:
                mock_settings.NEWSAPI_KEY = "test_key"

                await fetch_news("AAPL", 20)

                call_args = mock_get.call_args
                assert call_args[0][1]["q"] == "AAPL"

    @pytest.mark.asyncio
    async def test_includes_api_key_in_request(self):
        """Test that API key is included in request."""
        mock_response = {"articles": []}

        with patch("app.services.providers.newsapi._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.newsapi.settings") as mock_settings:
                mock_settings.NEWSAPI_KEY = "my_newsapi_key"

                await fetch_news("AAPL", 20)

                call_args = mock_get.call_args
                assert call_args[0][1]["apiKey"] == "my_newsapi_key"

    @pytest.mark.asyncio
    async def test_includes_page_size_in_request(self):
        """Test that pageSize is included in request."""
        mock_response = {"articles": []}

        with patch("app.services.providers.newsapi._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.newsapi.settings") as mock_settings:
                mock_settings.NEWSAPI_KEY = "test_key"

                await fetch_news("AAPL", 50)

                call_args = mock_get.call_args
                assert call_args[0][1]["pageSize"] == 50

    @pytest.mark.asyncio
    async def test_parses_news_data_correctly(self):
        """Test that news data is parsed correctly."""
        mock_response = {
            "articles": [
                {
                    "source": {"name": "Reuters"},
                    "title": "Apple announces new product",
                    "url": "https://example.com/article",
                    "publishedAt": "2024-01-15T10:00:00Z",
                }
            ]
        }

        with patch("app.services.providers.newsapi._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.newsapi.settings") as mock_settings:
                mock_settings.NEWSAPI_KEY = "test_key"

                result = await fetch_news("AAPL", 20)

                assert len(result) == 1
                assert result[0]["id"] == 0  # Uses index as ID
                assert result[0]["symbol"] == "AAPL"
                assert result[0]["source"] == "Reuters"
                assert result[0]["title"] == "Apple announces new product"
                assert result[0]["url"] == "https://example.com/article"
                assert result[0]["published_at"] == "2024-01-15T10:00:00Z"

    @pytest.mark.asyncio
    async def test_uses_index_as_id(self):
        """Test that index is used as ID for articles."""
        mock_response = {
            "articles": [
                {
                    "source": {"name": "Reuters"},
                    "title": "First article",
                    "url": "https://example.com/1",
                    "publishedAt": "2024-01-15T10:00:00Z",
                },
                {
                    "source": {"name": "Bloomberg"},
                    "title": "Second article",
                    "url": "https://example.com/2",
                    "publishedAt": "2024-01-15T11:00:00Z",
                },
            ]
        }

        with patch("app.services.providers.newsapi._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.newsapi.settings") as mock_settings:
                mock_settings.NEWSAPI_KEY = "test_key"

                result = await fetch_news("AAPL", 20)

                assert result[0]["id"] == 0
                assert result[1]["id"] == 1

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_articles(self):
        """Test that empty list is returned when no articles."""
        mock_response = {"articles": []}

        with patch("app.services.providers.newsapi._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.newsapi.settings") as mock_settings:
                mock_settings.NEWSAPI_KEY = "test_key"

                result = await fetch_news("AAPL", 20)

                assert result == []

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_articles_key(self):
        """Test that empty list is returned when no articles key."""
        mock_response = {"status": "error"}

        with patch("app.services.providers.newsapi._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.newsapi.settings") as mock_settings:
                mock_settings.NEWSAPI_KEY = "test_key"

                result = await fetch_news("AAPL", 20)

                assert result == []

    @pytest.mark.asyncio
    async def test_handles_multiple_articles(self):
        """Test that multiple articles are parsed correctly."""
        mock_response = {
            "articles": [
                {
                    "source": {"name": "Reuters"},
                    "title": "First article",
                    "url": "https://example.com/1",
                    "publishedAt": "2024-01-15T10:00:00Z",
                },
                {
                    "source": {"name": "Bloomberg"},
                    "title": "Second article",
                    "url": "https://example.com/2",
                    "publishedAt": "2024-01-15T11:00:00Z",
                },
            ]
        }

        with patch("app.services.providers.newsapi._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.newsapi.settings") as mock_settings:
                mock_settings.NEWSAPI_KEY = "test_key"

                result = await fetch_news("AAPL", 20)

                assert len(result) == 2
                assert result[0]["source"] == "Reuters"
                assert result[1]["source"] == "Bloomberg"

    @pytest.mark.asyncio
    async def test_default_limit_is_20(self):
        """Test that default limit is 20."""
        mock_response = {"articles": []}

        with patch("app.services.providers.newsapi._get") as mock_get:
            mock_get.return_value = mock_response

            with patch("app.services.providers.newsapi.settings") as mock_settings:
                mock_settings.NEWSAPI_KEY = "test_key"

                # Call without specifying limit
                await fetch_news("AAPL")

                call_args = mock_get.call_args
                assert call_args[0][1]["pageSize"] == 20
