import os
import sqlite3


def check_database(db_path, db_name):
    print(f"\n=== Checking {db_name} ===")
    try:
        if not os.path.exists(db_path):
            print(f"❌ Database file does not exist: {db_path}")
            return
        
        file_size = os.path.getsize(db_path)
        print(f"📁 File size: {file_size} bytes")
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        print(f"📋 Tables found: {len(tables)}")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Check for notification tables
        notification_tables = [table[0] for table in tables if any(keyword in table[0].lower() for keyword in ['notification', 'notify', 'alert'])]
        if notification_tables:
            print(f"✅ Notification tables: {notification_tables}")
        else:
            print("❌ No notification tables found")
        
        conn.close()
    except Exception as e:
        print(f"❌ Error checking database: {e}")

# Check both database files
check_database('data/fynix.db', 'fynix.db')
check_database('data/fynix.sqlite', 'fynix.sqlite')

print("\n✅ Database check completed")