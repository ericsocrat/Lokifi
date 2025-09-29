#!/usr/bin/env python3
"""
Check database schema to understand existing tables and columns
"""

import sqlite3
from pathlib import Path
import sys
sys.path.append('.')
from app.core.config import Settings

def check_database_schema():
    """Check the current database schema"""
    
    settings = Settings()
    db_url = settings.DATABASE_URL
    if 'sqlite' in db_url:
        db_path = db_url.split('///')[-1]
        if db_path.startswith('./'):
            db_path = Path(db_path[2:])
        else:
            db_path = Path(db_path)
    else:
        print("Not a SQLite database")
        return
    
    print(f"📊 Database path: {db_path}")
    
    try:
        with sqlite3.connect(str(db_path)) as conn:
            cursor = conn.cursor()
            
            # Get all tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            print(f"\n📋 Tables in database:")
            for table in tables:
                print(f"  - {table[0]}")
            
            # Check each table schema
            for table in tables:
                table_name = table[0]
                if table_name.startswith('sqlite_'):
                    continue
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = cursor.fetchall()
                print(f"\n📊 Columns in {table_name}:")
                for col in columns:
                    print(f"  - {col[1]} ({col[2]})")
    
    except Exception as e:
        print(f"❌ Error checking database: {e}")

if __name__ == "__main__":
    check_database_schema()