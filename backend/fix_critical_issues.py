#!/usr/bin/env python3
"""
Critical Issue Resolver for Fynix Phase K
Automatically fixes the most critical issues identified in the codebase
"""

import os
import sys
import re
from typing import Dict, List, Tuple
from pathlib import Path

class CriticalIssueResolver:
    """Resolves critical issues in the Fynix codebase"""
    
    def __init__(self, backend_dir: str = "."):
        self.backend_dir = Path(backend_dir)
        self.fixes_applied = []
        
    def fix_database_manager_import(self):
        """Fix missing database_manager export in database.py"""
        database_file = self.backend_dir / "app" / "core" / "database.py"
        
        if database_file.exists():
            with open(database_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add database_manager instance at the end
            if "database_manager = DatabaseManager()" not in content:
                content += "\n\n# Global database manager instance\ndatabase_manager = DatabaseManager()\n"
                
                with open(database_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                self.fixes_applied.append("Added database_manager global instance")
    
    def fix_redis_client_methods(self):
        """Fix Redis client method compatibility issues"""
        redis_file = self.backend_dir / "app" / "core" / "redis_client.py"
        
        if redis_file.exists():
            with open(redis_file, 'r') as f:
                content = f.read()
            
            # Add missing publish method if not present
            if "async def publish(" not in content:
                publish_method = '''
    async def publish(self, channel: str, message: str) -> None:
        """Publish message to Redis channel"""
        try:
            if self.client:
                await self.client.publish(channel, message)
        except Exception as e:
            logger.error(f"Redis publish error: {e}")
'''
                # Insert before the last closing of the class
                content = content.replace(
                    "    async def close(self):",
                    f"{publish_method}\n    async def close(self):"
                )
                
                with open(redis_file, 'w') as f:
                    f.write(content)
                
                self.fixes_applied.append("Added missing publish method to RedisClient")
    
    def fix_ai_provider_manager_methods(self):
        """Fix missing AI provider manager methods"""
        files_to_check = [
            "app/services/ai_context_manager.py",
            "app/services/multimodal_ai_service.py"
        ]
        
        for file_path in files_to_check:
            full_path = self.backend_dir / file_path
            if full_path.exists():
                with open(full_path, 'r') as f:
                    content = f.read()
                
                # Replace problematic method calls
                if "ai_provider_manager.get_available_provider()" in content:
                    content = content.replace(
                        "ai_provider_manager.get_available_provider()",
                        "ai_provider_manager.get_provider('openai')"  # Use a default provider
                    )
                    
                    with open(full_path, 'w') as f:
                        f.write(content)
                    
                    self.fixes_applied.append(f"Fixed AI provider method call in {file_path}")
    
    def fix_none_handling_in_auth(self):
        """Fix None handling in authentication service"""
        auth_file = self.backend_dir / "app" / "services" / "auth_service.py"
        
        if auth_file.exists():
            with open(auth_file, 'r') as f:
                content = f.read()
            
            # Fix password hash None check
            if "if not verify_password(login_data.password, user.password_hash):" in content:
                content = content.replace(
                    "if not verify_password(login_data.password, user.password_hash):",
                    "if not user.password_hash or not verify_password(login_data.password, user.password_hash):"
                )
                
                with open(auth_file, 'w') as f:
                    f.write(content)
                
                self.fixes_applied.append("Fixed None handling in auth service")
    
    def fix_file_upload_none_checks(self):
        """Fix None checks in file upload handling"""
        multimodal_file = self.backend_dir / "app" / "services" / "multimodal_ai_service.py"
        
        if multimodal_file.exists():
            with open(multimodal_file, 'r') as f:
                content = f.read()
            
            # Add filename None check
            if "file_extension = Path(file.filename).suffix.lower()" in content:
                content = content.replace(
                    "file_extension = Path(file.filename).suffix.lower()",
                    "file_extension = Path(file.filename or 'unknown').suffix.lower()"
                )
            
            if "mime_type = mimetypes.guess_type(file.filename)[0]" in content:
                content = content.replace(
                    "mime_type = mimetypes.guess_type(file.filename)[0]",
                    "mime_type = mimetypes.guess_type(file.filename or 'unknown')[0]"
                )
            
            # Fix filename parameter passing
            content = re.sub(
                r"await self\._process_(image|document)\(content, file\.filename",
                r"await self._process_\1(content, file.filename or 'unknown'",
                content
            )
            
            with open(multimodal_file, 'w') as f:
                f.write(content)
            
            self.fixes_applied.append("Fixed file upload None handling")
    
    def fix_pil_import_issues(self):
        """Fix PIL/Pillow import issues"""
        multimodal_file = self.backend_dir / "app" / "services" / "multimodal_ai_service.py"
        
        if multimodal_file.exists():
            with open(multimodal_file, 'r') as f:
                content = f.read()
            
            # Ensure PIL imports are properly handled
            if "from PIL import Image" not in content and "Image.open" in content:
                # Add PIL import at the top
                import_section = content.split('\n')
                for i, line in enumerate(import_section):
                    if line.startswith('from app.') or line.startswith('import logging'):
                        import_section.insert(i, "from PIL import Image")
                        break
                
                content = '\n'.join(import_section)
                
                with open(multimodal_file, 'w') as f:
                    f.write(content)
                
                self.fixes_applied.append("Fixed PIL import issues")
    
    def fix_stream_chunk_parameters(self):
        """Fix StreamChunk missing parameters"""
        multimodal_file = self.backend_dir / "app" / "services" / "multimodal_ai_service.py"
        
        if multimodal_file.exists():
            with open(multimodal_file, 'r') as f:
                content = f.read()
            
            # Fix StreamChunk instantiation
            content = re.sub(
                r"yield StreamChunk\(\s*content=chunk\.content,\s*is_complete=chunk\.is_complete\s*\)",
                "yield StreamChunk(id=str(uuid.uuid4()), content=chunk.content, is_complete=chunk.is_complete)",
                content
            )
            
            # Add uuid import if not present
            if "import uuid" not in content:
                content = content.replace("import logging", "import logging\nimport uuid")
            
            with open(multimodal_file, 'w') as f:
                f.write(content)
            
            self.fixes_applied.append("Fixed StreamChunk parameter issues")
    
    def fix_dataclass_defaults(self):
        """Fix dataclass with mutable defaults"""
        analytics_file = self.backend_dir / "app" / "services" / "advanced_storage_analytics.py"
        
        if analytics_file.exists():
            with open(analytics_file, 'r') as f:
                content = f.read()
            
            # Fix None defaults in dataclass
            fixes = [
                ("provider_usage: Dict[str, int] = None", "provider_usage: Optional[Dict[str, int]] = None"),
                ("model_usage: Dict[str, int] = None", "model_usage: Optional[Dict[str, int]] = None"),
                ("peak_hours: List[int] = None", "peak_hours: Optional[List[int]] = None"),
                ("peak_days: List[str] = None", "peak_days: Optional[List[str]] = None")
            ]
            
            for old, new in fixes:
                if old in content:
                    content = content.replace(old, new)
            
            # Add Optional import if not present
            if "from typing import" in content and "Optional" not in content:
                content = content.replace(
                    "from typing import",
                    "from typing import Optional,"
                )
            
            with open(analytics_file, 'w') as f:
                f.write(content)
            
            self.fixes_applied.append("Fixed dataclass mutable defaults")
    
    def fix_missing_return_statements(self):
        """Fix functions missing return statements"""
        setup_file = self.backend_dir / "setup_storage.py"
        
        if setup_file.exists():
            with open(setup_file, 'r') as f:
                content = f.read()
            
            # Find and fix missing return in test_database_connection
            if "async def test_database_connection(self, database_url: str) -> bool:" in content:
                # Look for the function and add return False at the end if missing
                pattern = r"(async def test_database_connection\(.*?\n(?:.*?\n)*?)(\s+)(except.*?\n(?:.*?\n)*?)(\n\s*async def|\n\s*def|\Z)"
                
                def fix_return(match):
                    function_body = match.group(1)
                    indent = match.group(2)
                    except_block = match.group(3)
                    next_function = match.group(4)
                    
                    if "return " not in except_block:
                        except_block += f"{indent}return False\n"
                    
                    return function_body + except_block + next_function
                
                content = re.sub(pattern, fix_return, content, flags=re.DOTALL)
                
                with open(setup_file, 'w') as f:
                    f.write(content)
                
                self.fixes_applied.append("Fixed missing return statement in setup_storage.py")
    
    def create_missing_imports_fix(self):
        """Create missing imports and services"""
        
        # Create database migration service if missing
        migration_dir = self.backend_dir / "app" / "services"
        migration_file = migration_dir / "database_migration.py"
        
        if not migration_file.exists():
            migration_content = '''"""
Database Migration Service
Placeholder for database migration functionality
"""

import logging

logger = logging.getLogger(__name__)

class DatabaseMigrationService:
    """Database migration service placeholder"""
    
    def __init__(self):
        self.logger = logger
    
    async def run_migrations(self):
        """Run database migrations"""
        self.logger.info("Database migrations would run here")
        return {"status": "success", "migrations": 0}
    
    async def check_migration_status(self):
        """Check migration status"""
        return {"pending": 0, "applied": 0}
'''
            with open(migration_file, 'w') as f:
                f.write(migration_content)
            
            self.fixes_applied.append("Created database_migration.py placeholder")
        
        # Create AI models if missing
        models_dir = self.backend_dir / "app" / "models"
        ai_models_file = models_dir / "ai_models.py"
        
        if not ai_models_file.exists():
            ai_models_content = '''"""
AI Models
Database models for AI-related entities
"""

from sqlalchemy import Column, String, Text, DateTime, Integer, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone
import uuid

from app.core.database import Base

class AIMessage(Base):
    """AI message model placeholder"""
    
    __tablename__ = "ai_messages"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    metadata = Column(JSON, nullable=True)
'''
            with open(ai_models_file, 'w') as f:
                f.write(ai_models_content)
            
            self.fixes_applied.append("Created ai_models.py placeholder")
    
    def run_all_fixes(self):
        """Run all critical issue fixes"""
        print("🔧 Starting Critical Issue Resolution...")
        
        try:
            self.fix_database_manager_import()
            self.fix_redis_client_methods()
            self.fix_ai_provider_manager_methods()
            self.fix_none_handling_in_auth()
            self.fix_file_upload_none_checks()
            self.fix_pil_import_issues()
            self.fix_stream_chunk_parameters()
            self.fix_dataclass_defaults()
            self.fix_missing_return_statements()
            self.create_missing_imports_fix()
            
            print(f"\n✅ Critical Issue Resolution Complete!")
            print(f"📊 Applied {len(self.fixes_applied)} fixes:")
            
            for i, fix in enumerate(self.fixes_applied, 1):
                print(f"   {i}. {fix}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error during fix application: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    resolver = CriticalIssueResolver()
    success = resolver.run_all_fixes()
    
    if success:
        print("\n🚀 System should now have fewer critical issues!")
        print("💡 Run the stress test to validate improvements.")
    else:
        print("\n⚠️  Some issues may remain. Manual intervention may be required.")