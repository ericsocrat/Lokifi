"""
Comprehensive test suite for Fynix AI Chatbot (J5) functionality.
"""

import json
from datetime import datetime
from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.ai_service import AIService
from app.services.content_moderation import ContentModerator, ModerationCategory, ModerationLevel
from app.services.conversation_export import (
    ConversationExporter,
    ConversationImporter,
    ExportOptions,
)


class TestAIService:
    """Test suite for AI service functionality."""

    @pytest.fixture
    def ai_service(self):
        """Create AI service instance for testing."""
        return AIService()

    @pytest.fixture
    def mock_user(self):
        """Create mock user for testing."""
        user = Mock()
        user.id = 1
        user.handle = "testuser"
        return user

    @pytest.fixture
    def mock_thread(self):
        """Create mock AI thread for testing."""
        thread = Mock()
        thread.id = 1
        thread.user_id = 1
        thread.title = "Test Chat"
        thread.created_at = datetime.utcnow()
        thread.updated_at = datetime.utcnow()
        thread.is_archived = False
        return thread

    def test_rate_limiter_allows_normal_usage(self, ai_service):
        """Test that rate limiter allows normal usage."""
        user_id = 1
        
        # Should allow first request
        assert ai_service.rate_limiter.check_rate_limit(user_id)
        
        # Should allow multiple requests within limit
        for _ in range(10):
            assert ai_service.rate_limiter.check_rate_limit(user_id)

    def test_rate_limiter_blocks_excessive_usage(self, ai_service):
        """Test that rate limiter blocks excessive usage."""
        user_id = 1
        
        # Exhaust rate limit
        for _ in range(30):
            ai_service.rate_limiter.check_rate_limit(user_id)
        
        # Next request should be blocked
        assert not ai_service.rate_limiter.check_rate_limit(user_id)

    def test_safety_filter_blocks_harmful_content(self, ai_service):
        """Test that safety filter blocks harmful content."""
        harmful_messages = [
            "I want to kill myself",
            "How to make a bomb",
            "You're so stupid and should die",
            "hack into someone's computer"
        ]
        
        for message in harmful_messages:
            assert not ai_service.safety_filter.check_input(message)

    def test_safety_filter_allows_safe_content(self, ai_service):
        """Test that safety filter allows safe content."""
        safe_messages = [
            "Hello, how are you?",
            "Can you help me with my homework?", 
            "What's the weather like?",
            "Tell me a joke"
        ]
        
        for message in safe_messages:
            assert ai_service.safety_filter.check_input(message)

    @patch('app.services.ai_service.get_session')
    def test_create_thread_success(self, mock_get_session, ai_service):
        """Test successful thread creation."""
        # Mock database session
        mock_db = Mock()
        mock_get_session.return_value.__enter__.return_value = mock_db
        
        # Mock thread creation
        mock_thread = Mock()
        mock_thread.id = 1
        mock_thread.title = "Test Chat"
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None
        
        # Test thread creation
        result = asyncio.run(ai_service.create_thread(user_id=1, title="Test Chat"))
        
        # Verify calls
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    @patch('app.services.ai_service.get_session')
    def test_get_user_threads(self, mock_get_session, ai_service):
        """Test getting user threads."""
        # Mock database session
        mock_db = Mock()
        mock_get_session.return_value.__enter__.return_value = mock_db
        
        # Mock thread query result
        mock_threads = [Mock(), Mock()]
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.offset.return_value.all.return_value = mock_threads
        
        # Test getting threads
        result = asyncio.run(ai_service.get_user_threads(user_id=1))
        
        # Verify result
        assert len(result) == 2


class TestContentModeration:
    """Test suite for content moderation functionality."""

    @pytest.fixture
    def moderator(self):
        """Create content moderator for testing."""
        return ContentModerator()

    def test_detect_harmful_content(self, moderator):
        """Test detection of harmful content."""
        harmful_texts = [
            "I want to hurt myself",
            "kill everyone",
            "make a weapon to harm people",
            "nude photos of celebrities"
        ]
        
        for text in harmful_texts:
            result = moderator.moderate_content(text, user_id=1)
            assert result.level in [ModerationLevel.BLOCKED, ModerationLevel.FLAGGED]
            assert len(result.categories) > 0

    def test_allow_safe_content(self, moderator):
        """Test that safe content is allowed."""
        safe_texts = [
            "Hello, how are you today?",
            "Can you help me with my math homework?",
            "What's the best recipe for chocolate cake?",
            "I love spending time with my family"
        ]
        
        for text in safe_texts:
            result = moderator.moderate_content(text, user_id=1)
            assert result.level == ModerationLevel.SAFE

    def test_detect_personal_info(self, moderator):
        """Test detection of personal information."""
        personal_info_texts = [
            "My phone number is 555-123-4567",
            "Email me at test@example.com", 
            "My SSN is 123-45-6789",
            "Credit card: 4532 1234 5678 9012"
        ]
        
        for text in personal_info_texts:
            result = moderator.moderate_content(text, user_id=1)
            assert ModerationCategory.PERSONAL_INFO in result.categories

    def test_user_tracking(self, moderator):
        """Test user behavior tracking."""
        user_id = 1
        
        # Initial status should be clean
        status = moderator.get_user_moderation_status(user_id)
        assert status["warning_count"] == 0
        assert status["risk_level"] == "low"
        
        # Moderate harmful content
        moderator.moderate_content("I hate everyone", user_id=user_id)
        
        # Status should be updated
        status = moderator.get_user_moderation_status(user_id)
        assert status["warning_count"] > 0
        assert len(status["violation_categories"]) > 0


class TestConversationExportImport:
    """Test suite for conversation export/import functionality."""

    @pytest.fixture
    def exporter(self):
        """Create conversation exporter for testing."""
        return ConversationExporter()

    @pytest.fixture
    def importer(self):
        """Create conversation importer for testing."""
        return ConversationImporter()

    @pytest.fixture
    def mock_conversations(self):
        """Create mock conversation data."""
        return [
            {
                "thread_id": 1,
                "title": "Test Chat 1",
                "created_at": "2023-01-01T10:00:00",
                "updated_at": "2023-01-01T11:00:00", 
                "message_count": 2,
                "messages": [
                    {
                        "id": 1,
                        "role": "user",
                        "content": "Hello AI",
                        "created_at": "2023-01-01T10:00:00",
                        "metadata": {"model": None, "provider": None}
                    },
                    {
                        "id": 2,
                        "role": "assistant", 
                        "content": "Hello! How can I help you?",
                        "created_at": "2023-01-01T10:01:00",
                        "metadata": {"model": "gpt-3.5-turbo", "provider": "openrouter"}
                    }
                ]
            }
        ]

    def test_export_json_format(self, exporter, mock_conversations):
        """Test JSON export format."""
        with patch.object(exporter, '_get_conversations_data', return_value=mock_conversations):
            options = ExportOptions(format="json", include_metadata=True)
            result = exporter._export_json(mock_conversations, options)
            
            # Verify JSON is valid
            parsed = json.loads(result)
            assert "conversations" in parsed
            assert len(parsed["conversations"]) == 1
            assert parsed["conversations"][0]["title"] == "Test Chat 1"

    def test_export_csv_format(self, exporter, mock_conversations):
        """Test CSV export format."""
        options = ExportOptions(format="csv", include_metadata=True)
        result = exporter._export_csv(mock_conversations, options)
        
        # Verify CSV structure
        lines = result.strip().split('\n')
        assert len(lines) >= 3  # Header + 2 message rows
        assert "thread_id" in lines[0]  # Header row
        assert "Test Chat 1" in lines[1]  # First message row

    def test_export_markdown_format(self, exporter, mock_conversations):
        """Test Markdown export format."""
        options = ExportOptions(format="markdown", include_metadata=True)
        result = exporter._export_markdown(mock_conversations, options)
        
        # Verify Markdown structure
        assert "# AI Conversations Export" in result
        assert "## Test Chat 1" in result
        assert "👤" in result  # User emoji
        assert "🤖" in result  # Assistant emoji

    def test_compression(self, exporter, mock_conversations):
        """Test content compression."""
        content = "Test content for compression"
        compressed = exporter._compress_content(content, "test.txt")
        
        # Verify it's compressed (bytes)
        assert isinstance(compressed, bytes)
        assert len(compressed) > 0
        
        # Verify we can extract it
        import zipfile
        from io import BytesIO
        with zipfile.ZipFile(BytesIO(compressed), 'r') as zip_file:
            extracted = zip_file.read("test.txt").decode('utf-8')
            assert extracted == content

    @patch('app.services.conversation_export.get_session')
    def test_import_json_success(self, mock_get_session, importer):
        """Test successful JSON import."""
        # Mock database session
        mock_db = Mock()
        mock_get_session.return_value.__enter__.return_value = mock_db
        
        # Mock database queries
        mock_db.query.return_value.filter.return_value.first.return_value = None  # No existing threads
        
        # Test data
        import_data = {
            "conversations": [
                {
                    "title": "Imported Chat",
                    "created_at": "2023-01-01T10:00:00",
                    "messages": [
                        {
                            "role": "user",
                            "content": "Hello",
                            "created_at": "2023-01-01T10:00:00"
                        }
                    ]
                }
            ]
        }
        
        # Test import
        result = importer._import_json(1, json.dumps(import_data), "skip", mock_db)
        
        # Verify success
        assert result["success"]
        assert result["imported_conversations"] == 1
        assert result["imported_messages"] == 1


class TestAIProviders:
    """Test suite for AI provider functionality."""

    def test_mock_provider_stream(self):
        """Test mock provider streaming."""
        from app.services.ai_provider import AIMessage as AIProviderMessage
        from app.services.ai_provider import MessageRole, MockProvider
        
        provider = MockProvider()
        
        # Test availability
        assert asyncio.run(provider.is_available())
        
        # Test streaming
        messages = [AIProviderMessage(role=MessageRole.USER, content="Hello")]
        chunks = []
        
        async def collect_chunks():
            async for chunk in provider.stream_chat(messages):
                chunks.append(chunk)
        
        asyncio.run(collect_chunks())
        
        # Verify streaming worked
        assert len(chunks) > 0
        assert chunks[-1].is_complete

    @patch('httpx.AsyncClient')
    def test_openrouter_provider_initialization(self, mock_client):
        """Test OpenRouter provider initialization."""
        from app.services.providers.openrouter_provider import OpenRouterProvider
        
        provider = OpenRouterProvider("test-api-key")
        assert provider.api_key == "test-api-key"
        assert provider.name == "openrouter"
        assert "openrouter.ai" in provider.base_url


class TestAIAPI:
    """Test suite for AI API endpoints."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)

    @pytest.fixture
    def auth_headers(self):
        """Mock authentication headers."""
        return {"Authorization": "Bearer test-token"}

    def test_create_thread_endpoint(self, client, auth_headers):
        """Test thread creation endpoint."""
        with patch('app.routers.ai.get_current_user') as mock_user:
            mock_user.return_value = Mock(id=1)
            
            with patch('app.services.ai_service.ai_service.create_thread') as mock_create:
                mock_thread = Mock()
                mock_thread.id = 1
                mock_thread.title = "Test Chat"
                mock_thread.user_id = 1
                mock_thread.created_at = datetime.utcnow()
                mock_thread.updated_at = datetime.utcnow()
                mock_thread.is_archived = False
                mock_create.return_value = mock_thread
                
                response = client.post(
                    "/api/ai/threads",
                    json={"title": "Test Chat"},
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["title"] == "Test Chat"

    def test_get_provider_status_endpoint(self, client, auth_headers):
        """Test provider status endpoint."""
        with patch('app.routers.ai.get_current_user') as mock_user:
            mock_user.return_value = Mock(id=1)
            
            with patch('app.services.ai_service.ai_service.get_provider_status') as mock_status:
                mock_status.return_value = {
                    "mock": {
                        "available": True,
                        "models": ["mock-model"],
                        "default_model": "mock-model",
                        "name": "mock",
                        "type": "api"
                    }
                }
                
                response = client.get("/api/ai/providers", headers=auth_headers)
                
                assert response.status_code == 200
                data = response.json()
                assert "providers" in data
                assert "mock" in data["providers"]

    def test_export_conversations_endpoint(self, client, auth_headers):
        """Test conversation export endpoint.""" 
        with patch('app.routers.ai.get_current_user') as mock_user:
            mock_user.return_value = Mock(id=1)
            
            with patch('app.services.conversation_export.conversation_exporter.export_conversations') as mock_export:
                mock_export.return_value = '{"test": "data"}'
                
                response = client.get(
                    "/api/ai/export/conversations?format=json",
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                assert response.headers["content-type"] == "application/json"


# Run tests with: pytest test_ai_chatbot.py -v
if __name__ == "__main__":
    import asyncio
    
    # Basic test runner for manual execution
    print("Testing AI Service components...")
    
    # Test AI service creation
    ai_service = AIService()
    print("✓ AI Service created")
    
    # Test rate limiter
    print("Testing rate limiter...")
    user_id = 1
    for i in range(5):
        allowed = ai_service.rate_limiter.check_rate_limit(user_id)
        assert allowed, f"Rate limit failed on request {i}"
    print("✓ Rate limiter allows normal usage")
    
    # Test safety filter
    print("Testing safety filter...")
    safe_message = "Hello, how are you?"
    assert ai_service.safety_filter.check_input(safe_message), "Safe message blocked"
    
    harmful_message = "I want to kill myself"
    assert not ai_service.safety_filter.check_input(harmful_message), "Harmful message allowed"
    print("✓ Safety filter working correctly")
    
    # Test content moderator
    print("Testing content moderation...")
    from app.services.content_moderation import ContentModerator, ModerationLevel
    moderator = ContentModerator()
    
    safe_result = moderator.moderate_content("Hello, how are you?", user_id=1)
    assert safe_result.level == ModerationLevel.SAFE, "Safe content flagged"
    
    harmful_result = moderator.moderate_content("You are stupid and should die", user_id=1)
    assert harmful_result.level in [ModerationLevel.BLOCKED, ModerationLevel.FLAGGED], "Harmful content not caught"
    print("✓ Content moderation working correctly")
    
    # Test conversation exporter
    print("Testing conversation export...")
    from app.services.conversation_export import ConversationExporter, ExportOptions
    exporter = ConversationExporter()
    
    # Test JSON export with mock data
    mock_conversations = [
        {
            "thread_id": 1,
            "title": "Test Chat",
            "created_at": "2023-01-01T10:00:00",
            "updated_at": "2023-01-01T11:00:00",
            "message_count": 2,
            "messages": [
                {
                    "id": 1,
                    "role": "user",
                    "content": "Hello",
                    "created_at": "2023-01-01T10:00:00"
                }
            ]
        }
    ]
    
    options = ExportOptions(format="json", include_metadata=True)
    json_export = exporter._export_json(mock_conversations, options)
    assert "conversations" in json_export, "JSON export failed"
    print("✓ Conversation export working correctly")
    
    print("\n🎉 All basic tests passed! ✓")
    print("\nRun 'pytest test_ai_chatbot.py -v' for full test suite")