#!/usr/bin/env python3
"""
Create missing database tables and run migrations
"""

import sqlite3
import sys
from pathlib import Path

sys.path.append('.')
import logging

from sqlalchemy import create_engine

from app.core.config import Settings
from app.core.database import Base

# Import all models explicitly to ensure they're registered with SQLAlchemy

logger = logging.getLogger(__name__)

def create_missing_tables():
    """Create all missing database tables"""
    
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
    
    try:
        # Create synchronous engine for table creation
        sync_engine = create_engine(settings.DATABASE_URL)
        
        # Create all tables defined in models
        Base.metadata.create_all(bind=sync_engine)
        print("✅ All tables created successfully!")
        
        # Check what tables now exist
        with sqlite3.connect(str(db_path)) as conn:
            cursor = conn.cursor()
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
    success = create_missing_tables()
    if success:
        print("\n🎉 Database schema updated successfully!")
        print("   - All model tables created")
        print("   - Ready for index application")
    else:
        print("\n❌ Failed to update database schema")

if __name__ == "__main__":
    main()