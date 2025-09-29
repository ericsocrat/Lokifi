"""
Database Migration Service for Fynix
Handles database schema migrations and updates
"""

import logging
from typing import Dict, Any, Optional, List
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db_session

logger = logging.getLogger(__name__)

class DatabaseMigrationService:
    """Database migration service"""
    
    def __init__(self):
        self.migrations_applied = []
    
    async def check_migration_status(self) -> Dict[str, Any]:
        """Check current migration status"""
        
        try:
            async for session in get_db_session():
                # Check if migration table exists
                result = await session.execute(
                    text("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'")
                )
                table_exists = result.fetchone() is not None
                
                if not table_exists:
                    # Create migrations table
                    await session.execute(text("""
                        CREATE TABLE migrations (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            name VARCHAR(255) NOT NULL UNIQUE,
                            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    """))
                    await session.commit()
                    logger.info("Created migrations table")
                
                # Get applied migrations
                result = await session.execute(text("SELECT name FROM migrations"))
                applied = [row[0] for row in result.fetchall()]
                
                return {
                    "migrations_table_exists": True,
                    "applied_migrations": applied,
                    "pending_migrations": []
                }
                
        except Exception as e:
            logger.error(f"Migration status check failed: {e}")
            return {
                "migrations_table_exists": False,
                "applied_migrations": [],
                "pending_migrations": [],
                "error": str(e)
            }
    
    async def apply_migration(self, migration_name: str, migration_sql: str) -> bool:
        """Apply a specific migration"""
        
        try:
            async for session in get_db_session():
                # Check if already applied
                result = await session.execute(
                    text("SELECT id FROM migrations WHERE name = :name"),
                    {"name": migration_name}
                )
                
                if result.fetchone():
                    logger.info(f"Migration {migration_name} already applied")
                    return True
                
                # Apply migration
                await session.execute(text(migration_sql))
                
                # Record migration
                await session.execute(
                    text("INSERT INTO migrations (name) VALUES (:name)"),
                    {"name": migration_name}
                )
                
                await session.commit()
                self.migrations_applied.append(migration_name)
                logger.info(f"Applied migration: {migration_name}")
                return True
                
            # If we get here, no session was available
            logger.error(f"No database session available for migration {migration_name}")
            return False
        
        except Exception as e:
            logger.error(f"Failed to apply migration {migration_name}: {e}")
            return False
    
    async def run_migrations(self) -> Dict[str, Any]:
        """Run all pending migrations"""
        
        # Define migrations
        migrations = [
            {
                "name": "001_initial_indexes",
                "sql": """
                    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
                    ON notifications(user_id, is_read) 
                    WHERE is_read = 0;
                    
                    CREATE INDEX IF NOT EXISTS idx_users_email 
                    ON users(email) 
                    WHERE email IS NOT NULL;
                """
            },
            {
                "name": "002_performance_indexes",
                "sql": """
                    CREATE INDEX IF NOT EXISTS idx_notifications_type 
                    ON notifications(type, created_at);
                    
                    CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
                    ON notifications(user_id, created_at);
                """
            }
        ]
        
        results = {
            "migrations_run": [],
            "migrations_failed": [],
            "total_applied": 0
        }
        
        for migration in migrations:
            success = await self.apply_migration(migration["name"], migration["sql"])
            if success:
                results["migrations_run"].append(migration["name"])
                results["total_applied"] += 1
            else:
                results["migrations_failed"].append(migration["name"])
        
        return results
    
    async def rollback_migration(self, migration_name: str) -> bool:
        """Rollback a specific migration (placeholder)"""
        
        logger.warning(f"Rollback requested for {migration_name} - not implemented")
        return False
    
    def get_applied_migrations(self) -> List[str]:
        """Get list of applied migrations in this session"""
        return self.migrations_applied.copy()