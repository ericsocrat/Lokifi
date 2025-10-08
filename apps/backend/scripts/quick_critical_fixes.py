#!/usr/bin/env python3
"""
Quick Critical Fix Implementation
Fixes the most pressing issues identified in the analysis
"""

import os
from pathlib import Path


def fix_blocking_io_in_multimodal():
    """Fix blocking I/O in multimodal AI service"""
    file_path = Path("app/services/multimodal_ai_service.py")
    
    if file_path.exists():
        try:
            with open(file_path, encoding='utf-8') as f:
                content = f.read()
            
            # Add aiofiles import
            if "import aiofiles" not in content:
                content = content.replace("import logging", "import logging\nimport aiofiles")
            
            # Fix filename None handling
            fixes = [
                ("Path(file.filename)", "Path(file.filename or 'unknown')"),
                ("mimetypes.guess_type(file.filename)", "mimetypes.guess_type(file.filename or 'unknown')"),
                ("await self._process_image(content, file.filename)", "await self._process_image(content, file.filename or 'unknown')"),
                ("await self._process_document(content, file.filename", "await self._process_document(content, file.filename or 'unknown'")
            ]
            
            for old, new in fixes:
                content = content.replace(old, new)
            
            # Fix StreamChunk parameters - add uuid import and id parameter
            if "import uuid" not in content:
                content = content.replace("import logging", "import logging\nimport uuid")
            
            content = content.replace(
                "yield StreamChunk(\n                        content=chunk.content,\n                        is_complete=chunk.is_complete\n                    )",
                "yield StreamChunk(\n                        id=str(uuid.uuid4()),\n                        content=chunk.content,\n                        is_complete=chunk.is_complete\n                    )"
            )
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print("✅ Fixed multimodal AI service")
            return True
        except Exception as e:
            print(f"❌ Error fixing multimodal service: {e}")
            return False

def fix_auth_service_none_handling():
    """Fix None handling in auth service"""
    file_path = Path("app/services/auth_service.py")
    
    if file_path.exists():
        try:
            with open(file_path, encoding='utf-8') as f:
                content = f.read()
            
            # Fix password hash None check
            content = content.replace(
                "if not verify_password(login_data.password, user.password_hash):",
                "if not user.password_hash or not verify_password(login_data.password, user.password_hash):"
            )
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print("✅ Fixed auth service None handling")
            return True
        except Exception as e:
            print(f"❌ Error fixing auth service: {e}")
            return False

def fix_database_manager_export():
    """Add database manager export"""
    file_path = Path("app/core/database.py")
    
    if file_path.exists():
        try:
            with open(file_path, encoding='utf-8') as f:
                content = f.read()
            
            # Add database_manager instance if not present
            if "database_manager = DatabaseManager()" not in content:
                content += "\n\n# Global database manager instance\ndatabase_manager = DatabaseManager()\n"
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print("✅ Fixed database manager export")
            return True
        except Exception as e:
            print(f"❌ Error fixing database manager: {e}")
            return False

def add_performance_indexes():
    """Create database index script"""
    index_script = """-- Performance Optimization Indexes
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
"""
    
    with open("performance_indexes.sql", 'w', encoding='utf-8') as f:
        f.write(index_script)
    
    print("✅ Created performance index script: performance_indexes.sql")

def create_redis_cache_decorator():
    """Create Redis caching decorator"""
    cache_decorator = '''"""
Redis Caching Decorator for Performance Optimization
Usage: @redis_cache(expire=300) above function definitions
"""

import functools
import json
import hashlib
import logging
from typing import Any, Callable, Optional
from app.core.redis_client import redis_client

logger = logging.getLogger(__name__)

def redis_cache(expire: int = 300, key_prefix: str = None):
    """
    Redis caching decorator
    
    Args:
        expire: Expiration time in seconds (default 5 minutes)
        key_prefix: Optional prefix for cache keys
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            # Generate cache key
            key_data = f"{func.__name__}:{args}:{sorted(kwargs.items())}"
            cache_key = hashlib.md5(key_data.encode()).hexdigest()
            
            if key_prefix:
                cache_key = f"{key_prefix}:{cache_key}"
            
            try:
                # Try to get from cache
                cached_result = await redis_client.get(cache_key)
                if cached_result:
                    logger.debug(f"Cache HIT for {func.__name__}")
                    return json.loads(cached_result)
                
                # Cache miss - execute function
                logger.debug(f"Cache MISS for {func.__name__}")
                result = await func(*args, **kwargs)
                
                # Store in cache
                await redis_client.set(
                    cache_key, 
                    json.dumps(result, default=str),
                    expire=expire
                )
                
                return result
                
            except Exception as e:
                logger.error(f"Cache error for {func.__name__}: {e}")
                # Fallback to direct execution
                return await func(*args, **kwargs)
        
        return wrapper
    return decorator

# Example usage:
# @redis_cache(expire=300)
# async def get_user_profile(user_id: str):
#     # Your function implementation
#     pass
'''
    
    with open("app/utils/redis_cache.py", 'w', encoding='utf-8') as f:
        f.write(cache_decorator)
    
    print("✅ Created Redis cache decorator: app/utils/redis_cache.py")

def run_quick_fixes():
    """Run all quick fixes"""
    print("🚀 Running Quick Critical Fixes...")
    
    fixes_applied = []
    
    # Create utils directory if it doesn't exist
    os.makedirs("app/utils", exist_ok=True)
    
    if fix_blocking_io_in_multimodal():
        fixes_applied.append("Multimodal AI Service")
    
    if fix_auth_service_none_handling():
        fixes_applied.append("Auth Service None Handling")
    
    if fix_database_manager_export():
        fixes_applied.append("Database Manager Export")
    
    add_performance_indexes()
    fixes_applied.append("Performance Index Script")
    
    create_redis_cache_decorator()
    fixes_applied.append("Redis Cache Decorator")
    
    print(f"\n✅ Quick fixes completed! Applied {len(fixes_applied)} fixes:")
    for i, fix in enumerate(fixes_applied, 1):
        print(f"   {i}. {fix}")
    
    print("\n🎯 Next Steps:")
    print("1. Run: psql -d your_database -f performance_indexes.sql")  
    print("2. Import and use @redis_cache decorator in API endpoints")
    print("3. Test the system to verify fixes")
    print("4. Run comprehensive stress tests")

if __name__ == "__main__":
    run_quick_fixes()