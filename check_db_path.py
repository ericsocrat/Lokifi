import os
import sys

# Add backend to path
sys.path.insert(0, 'C:\\Users\\USER\\Desktop\\lokifi\\backend')

# Import after adding to path
from app.db.database import DATABASE_URL

print(f"DATABASE_URL: {DATABASE_URL}")
print(f"Database file exists: {os.path.exists(DATABASE_URL.replace('sqlite+aiosqlite:///', ''))}")
