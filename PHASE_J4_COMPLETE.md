# Phase J4: Direct Messages - Complete Implementation

## Overview

Phase J4 implements a comprehensive real-time direct messaging system for Fynix with:
- **Database Models**: Conversations, participants, messages, and read receipts
- **Real-time Communication**: WebSocket-based messaging with typing indicators
- **Rate Limiting**: Redis-based sliding window rate limiting
- **API Endpoints**: Full CRUD operations for conversations and messages
- **Scalability**: Multi-instance support via Redis pub/sub
- **Testing**: Comprehensive unit and integration tests

## Architecture

### Database Schema

```sql
-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    name VARCHAR(100),                    -- For group chats
    description TEXT,                     -- For group chats
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE
);

-- Conversation participants junction table
CREATE TABLE conversation_participants (
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    last_read_message_id UUID,
    PRIMARY KEY (conversation_id, user_id)
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',  -- text, image, file, system
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message read receipts
CREATE TABLE message_receipts (
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX idx_participants_user_active ON conversation_participants(user_id, is_active);
```

### Core Components

#### 1. Database Models (`app/models/conversation.py`)
- **Conversation**: Main conversation entity with group support
- **ConversationParticipant**: Junction table for user-conversation relationships
- **Message**: Individual message with content type support
- **MessageReceipt**: Read receipt tracking

#### 2. Pydantic Schemas (`app/schemas/conversation.py`)
- **Request/Response DTOs**: Complete API contract definitions
- **WebSocket Messages**: Typed message formats for real-time communication
- **Validation**: Input validation and serialization

#### 3. Business Logic (`app/services/conversation_service.py`)
- **Conversation Management**: Create, retrieve, and manage conversations
- **Message Operations**: Send, retrieve, and mark messages as read
- **Participant Verification**: Ensure proper access control

#### 4. Rate Limiting (`app/services/rate_limit_service.py`)
- **Sliding Window Algorithm**: Efficient Redis-based rate limiting
- **Configurable Limits**: 30 messages per 60-second window
- **Multi-user Support**: Per-user rate limiting with cleanup

#### 5. WebSocket Manager (`app/services/websocket_manager.py`)
- **Connection Management**: Handle multiple connections per user
- **Real-time Broadcasting**: New messages, typing indicators, read receipts
- **Multi-instance Support**: Redis pub/sub for horizontal scaling

## API Endpoints

### Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Conversation Endpoints

#### Create/Get DM Conversation
```http
POST /api/conversations/dm/{other_user_id}
```
Creates a new direct message conversation or returns existing one.

**Response**: `ConversationResponse`
```json
{
  "id": "uuid",
  "is_group": false,
  "name": null,
  "description": null,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "last_message_at": "2024-01-01T00:00:00Z",
  "participants": [
    {
      "user_id": "uuid",
      "username": "username",
      "display_name": "Display Name",
      "avatar_url": "https://example.com/avatar.jpg",
      "joined_at": "2024-01-01T00:00:00Z",
      "is_active": true,
      "last_read_message_id": "uuid"
    }
  ],
  "last_message": {
    "id": "uuid",
    "sender_id": "uuid",
    "sender_username": "username",
    "content": "Hello!",
    "content_type": "text",
    "created_at": "2024-01-01T00:00:00Z",
    "is_read": true,
    "read_by": ["uuid1", "uuid2"]
  },
  "unread_count": 0
}
```

#### Get User Conversations
```http
GET /api/conversations?page=1&page_size=20
```
Retrieves user's conversations with pagination.

**Response**: `ConversationListResponse`
```json
{
  "conversations": [ConversationResponse],
  "total": 42,
  "page": 1,
  "page_size": 20,
  "has_next": true
}
```

#### Get Conversation Messages
```http
GET /api/conversations/{conversation_id}/messages?page=1&page_size=50
```
Retrieves messages in a conversation with pagination.

**Response**: `MessagesListResponse`
```json
{
  "messages": [MessageResponse],
  "total": 100,
  "page": 1,
  "page_size": 50,
  "has_next": true,
  "conversation_id": "uuid"
}
```

### Message Endpoints

#### Send Message
```http
POST /api/conversations/{conversation_id}/messages
Content-Type: application/json

{
  "content": "Hello, world!",
  "content_type": "text"
}
```

**Rate Limiting**: 30 messages per 60 seconds per user.
**Response**: `MessageResponse` (see above)

#### Mark Messages Read
```http
PATCH /api/conversations/{conversation_id}/read
Content-Type: application/json

{
  "message_id": "uuid"
}
```
Marks all messages up to and including the specified message as read.

#### Delete Message
```http
DELETE /api/conversations/{conversation_id}/messages/{message_id}
```
Soft deletes a message (marks as deleted, preserves for moderation).

## WebSocket Communication

### Connection
```javascript
const ws = new WebSocket('ws://localhost:8000/api/ws?token=<jwt_token>');
// or
const ws = new WebSocket('ws://localhost:8000/api/ws', [], {
  headers: { 'Authorization': 'Bearer <jwt_token>' }
});
```

### Message Types

#### Typing Indicator
```javascript
// Send typing indicator
ws.send(JSON.stringify({
  type: "typing",
  conversation_id: "uuid",
  is_typing: true
}));

// Receive typing indicator
{
  "type": "typing",
  "conversation_id": "uuid",
  "user_id": "uuid",
  "is_typing": true
}
```

#### New Message Notification
```javascript
// Received when someone sends a message
{
  "type": "new_message",
  "message": MessageResponse
}
```

#### Read Receipt
```javascript
// Send read receipt
ws.send(JSON.stringify({
  type: "mark_read",
  conversation_id: "uuid",
  message_id: "uuid"
}));

// Receive read receipt
{
  "type": "message_read",
  "conversation_id": "uuid",
  "user_id": "uuid",
  "message_id": "uuid",
  "read_at": "2024-01-01T00:00:00Z"
}
```

#### Heartbeat
```javascript
// Send ping
ws.send(JSON.stringify({type: "ping"}));

// Receive pong
{"type": "pong"}
```

## Rate Limiting

The system implements sliding window rate limiting using Redis:

- **Limit**: 30 messages per 60 seconds per user
- **Algorithm**: Redis sorted sets with timestamp scoring
- **Cleanup**: Automatic window cleanup on each check
- **Response**: HTTP 429 with retry-after seconds

### Rate Limit Headers
```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1640995200
```

## Redis Integration

### Pub/Sub Channels
- `dm_messages`: New message broadcasts
- `dm_typing`: Typing indicator broadcasts  
- `dm_read_receipts`: Read receipt broadcasts

### Rate Limiting Keys
- `rate_limit:messages:{user_id}`: Sliding window for message rate limiting

### Configuration
```python
# In settings
redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
```

## Security Features

### Authentication
- JWT token verification for all endpoints
- WebSocket token validation via query params or headers
- User session management

### Authorization
- Participant verification for all conversation operations
- Message ownership verification for deletions
- Read receipt authorization

### Input Validation
- Content length limits (2000 characters)
- Content type validation
- UUID format validation
- Pagination parameter validation

### Rate Limiting
- Per-user message sending limits
- WebSocket connection rate limiting
- API endpoint rate limiting

## Performance Optimizations

### Database
- Composite primary keys for junction tables
- Strategic indexes for common queries
- Efficient pagination with offset/limit
- Lazy loading of relationships

### Caching
- Redis for rate limiting data
- Connection state in memory
- Message broadcast caching

### WebSocket
- Connection pooling per user
- Efficient message broadcasting
- Redis pub/sub for multi-instance scaling

## Error Handling

### API Errors
```json
{
  "detail": "Error message",
  "status_code": 400,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Common Error Codes
- `400`: Invalid request data
- `401`: Authentication required
- `403`: Not authorized for conversation
- `404`: Conversation/message not found
- `429`: Rate limit exceeded
- `500`: Internal server error

### WebSocket Errors
- `4001`: Authentication failed
- `4003`: Invalid message format
- `4004`: Conversation not found

## Testing

### Unit Tests (`test_direct_messages.py`)
- Conversation service operations
- Rate limiting functionality
- WebSocket connection management
- Message broadcasting
- API endpoint responses

### Integration Tests
- End-to-end message flow
- Multi-user conversations
- Rate limiting enforcement
- WebSocket real-time updates

### Load Testing
- Concurrent WebSocket connections
- Message throughput testing
- Rate limiting under load
- Database performance

### Running Tests
```bash
# Unit tests
python -m pytest test_direct_messages.py -v

# All messaging tests
python -m pytest -k "conversation or message" -v

# Load tests
python -m pytest test_direct_messages.py::TestLoadTesting -v
```

## Deployment Considerations

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/fynix

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_EXPIRE_MINUTES=30

# CORS
FRONTEND_ORIGIN=https://your-frontend-domain.com
```

### Docker Configuration
```yaml
# docker-compose.yml additions
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

### Scaling Considerations
- Redis pub/sub for multi-instance WebSocket support
- Database connection pooling
- Load balancer sticky sessions for WebSocket
- Message queue for high-volume processing

## Future Enhancements

### Phase J4.1: Advanced Features
- [ ] Group conversations (already partially implemented)
- [ ] File sharing and media messages
- [ ] Message reactions and threading
- [ ] Message search and filtering
- [ ] Push notifications

### Phase J4.2: Moderation
- [ ] Content filtering and moderation
- [ ] Spam detection
- [ ] User blocking and reporting
- [ ] Administrative moderation tools

### Phase J4.3: Performance
- [ ] Message caching strategies
- [ ] Database sharding for large scale
- [ ] CDN for file sharing
- [ ] Advanced rate limiting

## Monitoring and Metrics

### Key Metrics
- Active WebSocket connections
- Messages per second
- Rate limiting hits
- API response times
- Database query performance

### Logging
- Message sending/receiving events
- WebSocket connection lifecycle
- Rate limiting events
- Error tracking and debugging

### Health Checks
```http
GET /api/conversations/health
GET /api/ws/health
```

## Conclusion

Phase J4 delivers a production-ready direct messaging system with:
✅ **Complete Infrastructure**: Database models, services, and APIs
✅ **Real-time Communication**: WebSocket-based messaging
✅ **Scalability**: Multi-instance support via Redis
✅ **Security**: Authentication, authorization, and rate limiting
✅ **Performance**: Optimized queries and efficient broadcasting
✅ **Testing**: Comprehensive test coverage
✅ **Documentation**: Complete technical documentation

The system is ready for production deployment and provides a solid foundation for advanced messaging features in future phases.