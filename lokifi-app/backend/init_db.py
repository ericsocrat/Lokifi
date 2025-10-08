"""
Simple script to initialize the database tables using SQLAlchemy models.
"""
import os
import sys

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, inspect

from app.models.user import Base

# Database path (must match the DATABASE_URL in settings)
DB_PATH = os.path.join(os.path.dirname(__file__), "data", "lokifi.sqlite")
DB_URI = f"sqlite:///{DB_PATH}"

def init_database():
    """Initialize the database with all tables"""
    print(f"🗄️  Initializing database at: {DB_PATH}")
    
    # Create engine
    engine = create_engine(DB_URI, connect_args={"check_same_thread": False})
    
    # Create all tables
    print("📋 Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    # Verify tables were created
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    print(f"✅ Created {len(tables)} tables:")
    for table in sorted(tables):
        print(f"   - {table}")
    
    engine.dispose()
    print("✅ Database initialized successfully!")

if __name__ == "__main__":
    init_database()
