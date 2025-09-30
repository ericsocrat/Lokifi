#!/usr/bin/env python3
"""
Create missing database tables with direct SQL
"""

import sqlite3
import sys
from pathlib import Path

sys.path.append('.')
import logging

from app.core.config import Settings

logger = logging.getLogger(__name__)

def create_missing_tables_direct():
    """Create missing tables with direct SQL"""
    
    settings = Settings()
    db_url = settings.DATABASE_URL
    if 'sqlite' in db_url:
        db_path = db_url.split('///')[-1]
        if db_path.startswith('./'):
            db_path = Path(db_path[2:])
        else:
            db_path = Path(db_path)
    else:
        logger.error("Not a SQLite database")
        return False
    
    print(f"📊 Creating missing tables in: {db_path}")
    
    # SQL for creating missing tables based on models
    table_sql = [
        # Portfolio positions table
        """
        CREATE TABLE IF NOT EXISTS portfolio_positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id VARCHAR(36) NOT NULL,
            symbol VARCHAR(48) NOT NULL,
            qty REAL NOT NULL,
            cost_basis REAL NOT NULL,
            tags VARCHAR(256),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """,
        
        # Messages table 
        """
        CREATE TABLE IF NOT EXISTS messages (
            id VARCHAR(36) PRIMARY KEY,
            conversation_id VARCHAR(36) NOT NULL,
            sender_id VARCHAR(36) NOT NULL,
            content TEXT NOT NULL,
            content_type VARCHAR(20) DEFAULT 'text',
            is_edited BOOLEAN DEFAULT 0,
            is_deleted BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
            FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """,
        
        # Conversation participants table
        """
        CREATE TABLE IF NOT EXISTS conversation_participants (
            conversation_id VARCHAR(36) NOT NULL,
            user_id VARCHAR(36) NOT NULL,
            last_read_message_id VARCHAR(36),
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1,
            PRIMARY KEY (conversation_id, user_id),
            FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (last_read_message_id) REFERENCES messages (id) ON DELETE SET NULL
        )
        """,
        
        # Message receipts table
        """
        CREATE TABLE IF NOT EXISTS message_receipts (
            message_id VARCHAR(36) NOT NULL,
            user_id VARCHAR(36) NOT NULL,
            read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (message_id, user_id),
            FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """
    ]
    
    try:
        with sqlite3.connect(str(db_path)) as conn:
            cursor = conn.cursor()
            
            for i, sql in enumerate(table_sql, 1):
                try:
                    print(f"  {i}. Creating table...")
                    cursor.execute(sql)
                    conn.commit()
                    print("      ✅ Table created successfully")
                except sqlite3.Error as e:
                    if "already exists" in str(e).lower():
                        print("      ✅ Table already exists")
                    else:
                        print(f"      ❌ Failed to create table: {e}")
            
            # Check what tables now exist
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            print("\n📋 Tables now in database:")
            for table in tables:
                if not table[0].startswith('sqlite_'):
                    print(f"  ✅ {table[0]}")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to create tables: {e}")
        print(f"❌ Failed to create tables: {e}")
        return False

def main():
    """Main execution"""
    success = create_missing_tables_direct()
    if success:
        print("\n🎉 Database schema updated successfully!")
        print("   - Missing tables created")
        print("   - Ready for index application")
    else:
        print("\n❌ Failed to update database schema")

if __name__ == "__main__":
    main()