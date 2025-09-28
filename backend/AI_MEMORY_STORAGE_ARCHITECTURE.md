# Fynix AI Chatbot (J5) - Memory & Conversation Storage Architecture

## 🗄️ **Database Storage (Primary)**

The J5 AI Chatbot stores all conversation memory and history primarily in **PostgreSQL/SQLite database** using a well-structured relational schema:

### **Core Tables**

#### 1. `ai_threads` Table
```sql
CREATE TABLE ai_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,                    -- Foreign key to users table
    title VARCHAR(255) NOT NULL,                 -- Thread title (auto or user-set)
    created_at DATETIME NOT NULL,               -- When thread was created
    updated_at DATETIME NOT NULL,               -- Last message timestamp
    is_archived BOOLEAN DEFAULT FALSE,          -- Archive status
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Purpose**: Groups related messages into conversation threads
- Each user can have multiple AI conversation threads
- Threads are automatically titled (e.g., "Chat 2025-09-28 14:30")
- Cascade delete ensures cleanup when users are deleted

#### 2. `ai_messages` Table
```sql
CREATE TABLE ai_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER NOT NULL,                 -- Links to ai_threads
    role VARCHAR(20) NOT NULL,                  -- 'user' or 'assistant'
    content TEXT NOT NULL,                      -- Message content
    model VARCHAR(100),                         -- AI model used (GPT-4, Claude, etc.)
    provider VARCHAR(50),                       -- AI provider (OpenRouter, Ollama, etc.)
    token_count INTEGER,                        -- Token usage tracking
    created_at DATETIME NOT NULL,              -- Message timestamp
    completed_at DATETIME,                      -- When AI finished responding
    error TEXT,                                 -- Error message if generation failed
    FOREIGN KEY (thread_id) REFERENCES ai_threads(id) ON DELETE CASCADE
);
```

**Purpose**: Stores every individual message in conversations
- User messages and AI responses are both stored
- Tracks AI model/provider used for each response
- Includes timing and error handling
- Full conversation history preserved

### **Database Indexes**
```sql
-- Performance optimization indexes
CREATE INDEX ix_ai_threads_user_id ON ai_threads(user_id);
CREATE INDEX ix_ai_threads_user_updated ON ai_threads(user_id, updated_at);
CREATE INDEX ix_ai_messages_thread_id ON ai_messages(thread_id);
CREATE INDEX ix_ai_messages_role ON ai_messages(role);
CREATE INDEX ix_ai_messages_thread_created ON ai_messages(thread_id, created_at);
```

## 💾 **In-Memory Caching (Secondary)**

### **J5.2 Context Manager Cache**
Location: `app/services/ai_context_manager.py`

```python
class AIContextManager:
    def __init__(self):
        self.context_cache: Dict[int, ConversationMemory] = {}
        self.max_context_length = 4000
        self.summary_threshold = 20
```

**What's Cached**:
- **Context Summaries**: AI-generated conversation summaries
- **User Preferences**: Communication style preferences 
- **Conversation Memory**: Long-term thread context
- **Topic Analysis**: Extracted topics and themes

**Cache Lifecycle**:
- **Storage**: In-memory Python dictionary (process-local)
- **TTL**: 1 hour for context summaries
- **Eviction**: Manual cleanup on memory pressure
- **Persistence**: Not persisted (rebuilt from database)

### **Rate Limiter Cache**
Location: `app/services/ai_service.py`

```python
class RateLimiter:
    def __init__(self):
        # User ID -> deque of request timestamps
        self.user_requests: Dict[int, deque] = defaultdict(lambda: deque(maxlen=100))
```

**What's Cached**:
- **Request History**: Last 100 requests per user
- **Rate Limit State**: Current rate limit status
- **Cleanup Tracking**: Automatic cleanup timestamps

## 🔄 **Redis Integration (Optional)**

### **WebSocket Message Pub/Sub**
Location: `app/services/websocket_manager.py`

```python
async def initialize_redis(self):
    if settings.redis_url:
        self.redis_client = redis.from_url(settings.redis_url)
        self.pubsub = self.redis_client.pubsub()
        await self.pubsub.subscribe("dm_messages", "dm_typing", "dm_read_receipts")
```

**Redis Usage** (when available):
- **Real-time Updates**: Cross-instance WebSocket message distribution
- **Typing Indicators**: Live typing status
- **Read Receipts**: Message read status
- **Pub/Sub Channels**: Inter-service communication

**Graceful Degradation**: System works without Redis if unavailable

## 📊 **Storage Architecture Flow**

### **Message Storage Process**
```
1. User sends message
   ↓
2. Validate & moderate content
   ↓
3. Store user message in ai_messages table
   ↓
4. Generate AI response (streaming)
   ↓
5. Store AI response in ai_messages table
   ↓
6. Update thread updated_at timestamp
   ↓
7. Cache context summary (if needed)
   ↓
8. Send real-time updates via WebSocket
```

### **Memory Retrieval Process**
```
1. User requests conversation history
   ↓
2. Check context cache for summary
   ↓
3. Query ai_messages for recent messages
   ↓
4. Query ai_threads for thread metadata
   ↓
5. Apply pagination and limits
   ↓
6. Return structured response
   ↓
7. Update cache with new context
```

## 🔍 **Data Access Patterns**

### **API Endpoints for Memory Access**
```python
# Get user's conversation threads
GET /api/ai/threads?limit=50&offset=0

# Get messages for a specific thread  
GET /api/ai/threads/{thread_id}/messages?limit=50

# Create new conversation thread
POST /api/ai/threads

# Send message (stores & responds)
POST /api/ai/threads/{thread_id}/messages

# J5.2: Get conversation analytics
GET /api/ai/analytics/conversation-metrics

# J5.2: Get user AI profile
GET /api/ai/context/user-profile
```

### **Service Layer Access**
```python
# AI Service handles all database operations
ai_service = AIService()

# Create thread
thread = await ai_service.create_thread(user_id=123, title="New Chat")

# Get conversation history
messages = await ai_service.get_thread_messages(thread_id=456, user_id=123)

# Send message (auto-stores)
async for chunk in ai_service.send_message(user_id=123, thread_id=456, message="Hello"):
    # Streams response while storing to database
```

## 📈 **Storage Capabilities**

### **Conversation Features**
- ✅ **Unlimited History**: No automatic message deletion
- ✅ **Multi-Provider Support**: Tracks which AI provider/model used
- ✅ **Thread Organization**: Conversations grouped in threads
- ✅ **Rich Metadata**: Timestamps, tokens, errors, completion status
- ✅ **User Isolation**: Each user's data completely separate
- ✅ **Cascade Cleanup**: Automatic cleanup when users/threads deleted

### **J5.2 Advanced Memory**
- ✅ **Context Summarization**: AI-powered conversation summaries
- ✅ **User Preference Learning**: Communication style analysis
- ✅ **Topic Extraction**: Automatic conversation topic tagging
- ✅ **Analytics Integration**: Usage metrics and insights
- ✅ **Cross-Thread Context**: User insights across all conversations

### **Export/Import (J5.1)**
- ✅ **Multiple Formats**: JSON, CSV, Markdown, HTML, XML, TXT
- ✅ **Compression**: ZIP archive support
- ✅ **Selective Export**: Date ranges, specific threads
- ✅ **Import with Merge**: Smart conversation importing

## 🛡️ **Data Persistence & Security**

### **Durability**
- **Primary Storage**: PostgreSQL/SQLite with ACID compliance
- **Backup Strategy**: Database-level backups and replication
- **Data Integrity**: Foreign key constraints and cascading deletes
- **Transaction Safety**: All operations wrapped in database transactions

### **Security**
- **User Isolation**: Row-level security via user_id foreign keys
- **Authentication**: JWT-based user authentication required
- **Authorization**: Users can only access their own conversations
- **Data Sanitization**: Content moderation and input validation

### **Privacy**
- **User Control**: Users can delete threads and messages
- **Data Retention**: No automatic expiration (user-controlled)
- **Anonymization**: User data can be anonymized while preserving structure
- **GDPR Compliance**: Full conversation export and deletion capabilities

## 📊 **Memory Statistics**

Based on the current architecture:

- **Storage Type**: Relational Database (Primary) + In-Memory Cache (Secondary)
- **Data Retention**: Permanent (user-controlled deletion)
- **Query Performance**: Optimized with strategic database indexes
- **Scalability**: Horizontal scaling via database sharding/replication
- **Memory Efficiency**: Smart caching with TTL and size limits
- **Real-time Sync**: Optional Redis pub/sub for multi-instance deployments

## 🎯 **Summary**

The J5 AI Chatbot uses a **hybrid storage architecture**:

1. **📊 Database (Primary)**: PostgreSQL/SQLite for persistent conversation storage
2. **⚡ Memory Cache (Secondary)**: In-memory caching for performance optimization  
3. **🔄 Redis (Optional)**: Real-time synchronization across multiple instances

This architecture provides:
- ✅ **Durability**: All conversations permanently stored in database
- ✅ **Performance**: Smart caching for frequently accessed data
- ✅ **Scalability**: Database optimization with proper indexing
- ✅ **Intelligence**: J5.2 context management for smarter AI interactions
- ✅ **Flexibility**: Multiple export formats and user data control

**Storage Location**: `C:\Users\USER\Desktop\fynix\backend\data\` (SQLite) or configured PostgreSQL instance