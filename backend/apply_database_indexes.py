#!/usr/bin/env python3
"""
Apply database performance indexes
"""

import asyncio
import sqlite3
from pathlib import Path
from app.core.config import Settings
import logging

logger = logging.getLogger(__name__)

async def apply_sqlite_indexes():
    """Apply performance indexes to SQLite database"""
    
    settings = Settings()
    # Extract SQLite file path from URL
    db_url = settings.DATABASE_URL
    if "sqlite" in db_url:
        db_path = db_url.split("///")[-1]
        if db_path.startswith("./"):
            db_path = Path(db_path[2:])
        else:
            db_path = Path(db_path)
    else:
        logger.error("Not a SQLite database")
        return False
    
    print(f"📊 Applying performance indexes to: {db_path}")
    
    # SQLite-compatible index commands based on actual schema
    index_commands = [
        # Notifications indexes (working with actual schema)
        """CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
           ON notifications(user_id, is_read) 
           WHERE is_read = 0""",
        
        """CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
           ON notifications(user_id, created_at)""",
        
        """CREATE INDEX IF NOT EXISTS idx_notifications_type 
           ON notifications(type, created_at)""",
        
        """CREATE INDEX IF NOT EXISTS idx_notifications_priority 
           ON notifications(priority, created_at)""",
        
        """CREATE INDEX IF NOT EXISTS idx_notifications_category 
           ON notifications(category, user_id)""",
        
        """CREATE INDEX IF NOT EXISTS idx_notifications_batch 
           ON notifications(batch_id, created_at)""",
        
        # Messages indexes (now table exists)
        """CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
           ON messages(conversation_id, created_at)""",
        
        """CREATE INDEX IF NOT EXISTS idx_messages_sender_created 
           ON messages(sender_id, created_at)""",
        
        """CREATE INDEX IF NOT EXISTS idx_messages_type 
           ON messages(content_type, created_at)""",
        
        # Conversation participants indexes
        """CREATE INDEX IF NOT EXISTS idx_conversation_participants_user 
           ON conversation_participants(user_id, is_active)""",
        
        """CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation 
           ON conversation_participants(conversation_id, joined_at)""",
        
        # AI Messages and Threads indexes
        """CREATE INDEX IF NOT EXISTS idx_ai_messages_thread_created 
           ON ai_messages(thread_id, created_at)""",
        
        """CREATE INDEX IF NOT EXISTS idx_ai_messages_role 
           ON ai_messages(role, thread_id)""",
        
        """CREATE INDEX IF NOT EXISTS idx_ai_threads_user_created 
           ON ai_threads(user_id, created_at)""",
        
        """CREATE INDEX IF NOT EXISTS idx_ai_threads_user_updated 
           ON ai_threads(user_id, updated_at)""",
        
        # Conversations indexes (using actual schema)
        """CREATE INDEX IF NOT EXISTS idx_conversations_created 
           ON conversations(created_at)""",
        
        """CREATE INDEX IF NOT EXISTS idx_conversations_updated 
           ON conversations(updated_at)""",
        
        # Users table indexes (using actual columns)
        """CREATE INDEX IF NOT EXISTS idx_users_email 
           ON users(email) 
           WHERE email IS NOT NULL""",
        
        """CREATE INDEX IF NOT EXISTS idx_users_google_id 
           ON users(google_id) 
           WHERE google_id IS NOT NULL""",
        
        """CREATE INDEX IF NOT EXISTS idx_users_active 
           ON users(is_active, created_at)""",
        
        # Portfolio positions indexes (now table exists)
        """CREATE INDEX IF NOT EXISTS idx_portfolio_positions_user 
           ON portfolio_positions(user_id, created_at)""",
        
        """CREATE INDEX IF NOT EXISTS idx_portfolio_positions_symbol 
           ON portfolio_positions(symbol, user_id)""",
        
        """CREATE INDEX IF NOT EXISTS idx_portfolio_positions_user_symbol 
           ON portfolio_positions(user_id, symbol)""",
        
        # Message receipts indexes
        """CREATE INDEX IF NOT EXISTS idx_message_receipts_message 
           ON message_receipts(message_id, read_at)""",
        
        """CREATE INDEX IF NOT EXISTS idx_message_receipts_user 
           ON message_receipts(user_id, read_at)""",
        
        # Notification preferences indexes
        """CREATE INDEX IF NOT EXISTS idx_notification_prefs_user 
           ON notification_preferences(user_id)""",
        
        """CREATE INDEX IF NOT EXISTS idx_notification_prefs_digest 
           ON notification_preferences(daily_digest_enabled, weekly_digest_enabled)"""
    ]
    
    try:
        # Connect to SQLite database
        with sqlite3.connect(str(db_path)) as conn:
            cursor = conn.cursor()
            
            # Apply each index
            for i, command in enumerate(index_commands, 1):
                try:
                    print(f"  {i:2d}. Creating index...")
                    cursor.execute(command)
                    conn.commit()
                    print(f"      ✅ Index created successfully")
                except sqlite3.Error as e:
                    if "already exists" in str(e).lower():
                        print(f"      ✅ Index already exists")
                    else:
                        print(f"      ❌ Failed to create index: {e}")
            
            # Analyze database for query optimization
            print("  📊 Analyzing database for query optimization...")
            cursor.execute("ANALYZE")
            conn.commit()
            print("      ✅ Database analysis complete")
            
        print("\n🎉 Database performance indexes applied successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Failed to apply indexes: {e}")
        print(f"❌ Failed to apply indexes: {e}")
        return False

async def main():
    """Main execution"""
    success = await apply_sqlite_indexes()
    if success:
        print("\n📈 Database performance should be improved!")
        print("   - Faster user queries")
        print("   - Optimized notification retrieval") 
        print("   - Better conversation performance")
        print("   - Enhanced portfolio operations")
    else:
        print("\n❌ Some indexes may not have been applied")

if __name__ == "__main__":
    asyncio.run(main())