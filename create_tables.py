"""
Create all database tables from SQLAlchemy models
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

from app.db.database import engine
from app.core.database import Base

# Import all models to register them with Base
import app.models  # This will import all models

async def create_tables():
    """Create all tables from models."""
    print("🗄️  Creating database tables from models...")
    print(f"Database URL: {engine.url}")
    print()
    
    async with engine.begin() as conn:
        print("📋 Dropping all existing tables...")
        await conn.run_sync(Base.metadata.drop_all)
        
        print("✨ Creating tables...")
        await conn.run_sync(Base.metadata.create_all)
    
    print("\n✅ All tables created successfully!")
    print("\nTables created:")
    for table in Base.metadata.sorted_tables:
        print(f"   - {table.name}")

if __name__ == "__main__":
    asyncio.run(create_tables())
