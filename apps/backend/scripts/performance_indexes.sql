-- Performance Optimization Indexes
-- Run these against your database for immediate performance gains

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read) 
WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type 
ON notifications(type, created_at DESC);

-- Messages/Conversations indexes  
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC) 
WHERE id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_user1 
ON conversations(participant1_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_user2 
ON conversations(participant2_id, updated_at DESC);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email) 
WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_username 
ON users(username) 
WHERE username IS NOT NULL;

-- Performance monitoring
ANALYZE;
