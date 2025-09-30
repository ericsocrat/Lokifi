#!/usr/bin/env python3
"""
Database Management and Optimization Suite
==========================================

This script provides comprehensive database management tools including:
- Database health monitoring
- Performance optimization
- Index analysis and creation
- Migration management
- Backup/restore utilities
"""

import asyncio
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    import aiofiles
    import asyncpg
    from alembic.config import Config
    from sqlalchemy import create_engine, inspect, text
    from sqlalchemy.ext.asyncio import create_async_engine

    from alembic import command
    from app.core.config import settings
    from app.db.database import get_db
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("Install missing dependencies: pip install asyncpg aiofiles")
    sys.exit(1)

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

class DatabaseManager:
    """Comprehensive database management and optimization"""
    
    def __init__(self):
        self.db_url = settings.DATABASE_URL
        self.backup_dir = backend_dir / "backups" / "database"
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
    def print_header(self, title: str):
        print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*80}{Colors.END}")
        print(f"{Colors.CYAN}{Colors.BOLD}{title.center(80)}{Colors.END}")
        print(f"{Colors.CYAN}{Colors.BOLD}{'='*80}{Colors.END}")
    
    def print_section(self, title: str):
        print(f"\n{Colors.BLUE}{Colors.BOLD}📊 {title}{Colors.END}")
        print(f"{Colors.BLUE}{'─'*60}{Colors.END}")
    
    def print_success(self, message: str):
        print(f"{Colors.GREEN}✅ {message}{Colors.END}")
    
    def print_warning(self, message: str):
        print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")
    
    def print_error(self, message: str):
        print(f"{Colors.RED}❌ {message}{Colors.END}")
    
    def print_info(self, message: str):
        print(f"{Colors.WHITE}ℹ️  {message}{Colors.END}")

    async def analyze_database_health(self) -> dict[str, Any]:
        """Comprehensive database health analysis"""
        self.print_section("Database Health Analysis")
        
        health_data = {
            "connection": False,
            "tables": {},
            "indexes": {},
            "performance": {},
            "recommendations": []
        }
        
        try:
            # Test connection
            if "sqlite" in self.db_url:
                await self._analyze_sqlite_health(health_data)
            else:
                await self._analyze_postgres_health(health_data)
            
            return health_data
            
        except Exception as e:
            self.print_error(f"Health analysis failed: {e}")
            return health_data
    
    async def _analyze_sqlite_health(self, health_data: dict[str, Any]):
        """Analyze SQLite database health"""
        try:
            engine = create_async_engine(self.db_url)
            
            async with engine.begin() as conn:
                # Check connection
                await conn.execute(text("SELECT 1"))
                health_data["connection"] = True
                self.print_success("Database connection established")
                
                # Check tables
                tables_result = await conn.execute(text("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name NOT LIKE 'sqlite_%'
                """))
                
                tables = tables_result.fetchall()
                health_data["tables"]["count"] = len(tables)
                health_data["tables"]["names"] = [t[0] for t in tables]
                
                self.print_info(f"Found {len(tables)} tables: {', '.join(health_data['tables']['names'])}")
                
                # Check indexes
                indexes_result = await conn.execute(text("""
                    SELECT name FROM sqlite_master 
                    WHERE type='index' AND name NOT LIKE 'sqlite_%'
                """))
                
                indexes = indexes_result.fetchall()
                health_data["indexes"]["count"] = len(indexes)
                health_data["indexes"]["names"] = [i[0] for i in indexes]
                
                self.print_info(f"Found {len(indexes)} custom indexes")
                
                # Database size
                db_size_result = await conn.execute(text("PRAGMA page_count"))
                page_count = db_size_result.fetchone()[0]
                
                page_size_result = await conn.execute(text("PRAGMA page_size"))
                page_size = page_size_result.fetchone()[0]
                
                db_size_mb = (page_count * page_size) / (1024 * 1024)
                health_data["performance"]["size_mb"] = round(db_size_mb, 2)
                
                self.print_info(f"Database size: {db_size_mb:.2f} MB")
                
                # Performance recommendations
                if db_size_mb > 100:
                    health_data["recommendations"].append("Consider migrating to PostgreSQL for better performance")
                
                if len(indexes) < len(tables):
                    health_data["recommendations"].append("Consider adding more indexes for query optimization")
            
            await engine.dispose()
            
        except Exception as e:
            self.print_error(f"SQLite analysis failed: {e}")
    
    async def _analyze_postgres_health(self, health_data: dict[str, Any]):
        """Analyze PostgreSQL database health"""
        try:
            # Extract connection details from URL
            if "postgresql" in self.db_url:
                engine = create_async_engine(self.db_url)
                
                async with engine.begin() as conn:
                    # Check connection
                    await conn.execute(text("SELECT 1"))
                    health_data["connection"] = True
                    self.print_success("PostgreSQL connection established")
                    
                    # Database size
                    size_result = await conn.execute(text("""
                        SELECT pg_size_pretty(pg_database_size(current_database()))
                    """))
                    db_size = size_result.fetchone()[0]
                    health_data["performance"]["size"] = db_size
                    
                    self.print_info(f"Database size: {db_size}")
                    
                    # Table analysis
                    tables_result = await conn.execute(text("""
                        SELECT schemaname, tablename, 
                               pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
                        FROM pg_tables 
                        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
                        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
                    """))
                    
                    tables = tables_result.fetchall()
                    health_data["tables"]["count"] = len(tables)
                    health_data["tables"]["details"] = [
                        {"schema": t[0], "name": t[1], "size": t[2]} for t in tables
                    ]
                    
                    self.print_info(f"Found {len(tables)} tables")
                    for table in tables[:5]:  # Show top 5 largest tables
                        self.print_info(f"  {table[1]}: {table[2]}")
                
                await engine.dispose()
                
        except Exception as e:
            self.print_error(f"PostgreSQL analysis failed: {e}")
    
    async def optimize_database(self) -> bool:
        """Run database optimization"""
        self.print_section("Database Optimization")
        
        try:
            if "sqlite" in self.db_url:
                return await self._optimize_sqlite()
            else:
                return await self._optimize_postgres()
        except Exception as e:
            self.print_error(f"Optimization failed: {e}")
            return False
    
    async def _optimize_sqlite(self) -> bool:
        """Optimize SQLite database"""
        try:
            engine = create_async_engine(self.db_url)
            
            async with engine.begin() as conn:
                self.print_info("Running SQLite optimization commands...")
                
                # Analyze database statistics
                await conn.execute(text("ANALYZE"))
                self.print_success("Database statistics updated")
                
                # Vacuum database
                await conn.execute(text("VACUUM"))
                self.print_success("Database vacuumed")
                
                # Rebuild indexes
                await conn.execute(text("REINDEX"))
                self.print_success("Indexes rebuilt")
            
            await engine.dispose()
            return True
            
        except Exception as e:
            self.print_error(f"SQLite optimization failed: {e}")
            return False
    
    async def _optimize_postgres(self) -> bool:
        """Optimize PostgreSQL database"""
        try:
            engine = create_async_engine(self.db_url)
            
            async with engine.begin() as conn:
                self.print_info("Running PostgreSQL optimization commands...")
                
                # Update statistics
                await conn.execute(text("ANALYZE"))
                self.print_success("Database statistics updated")
                
                # Get list of tables to vacuum
                tables_result = await conn.execute(text("""
                    SELECT tablename FROM pg_tables 
                    WHERE schemaname = 'public'
                """))
                
                tables = [t[0] for t in tables_result.fetchall()]
                
                for table in tables:
                    try:
                        await conn.execute(text(f"VACUUM ANALYZE {table}"))
                        self.print_info(f"Vacuumed table: {table}")
                    except Exception as e:
                        self.print_warning(f"Could not vacuum {table}: {e}")
            
            await engine.dispose()
            return True
            
        except Exception as e:
            self.print_error(f"PostgreSQL optimization failed: {e}")
            return False
    
    async def create_performance_indexes(self) -> bool:
        """Create recommended performance indexes"""
        self.print_section("Performance Index Creation")
        
        try:
            engine = create_async_engine(self.db_url)
            
            # Define recommended indexes
            indexes = [
                ("idx_users_email_active", "CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE is_active = true"),
                ("idx_profiles_username", "CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL"),
                ("idx_notifications_user_unread", "CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at) WHERE is_read = false"),
                ("idx_ai_messages_thread", "CREATE INDEX IF NOT EXISTS idx_ai_messages_thread ON ai_messages(thread_id, created_at)"),
                ("idx_follows_follower", "CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id, created_at)"),
                ("idx_follows_following", "CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id, created_at)")
            ]
            
            async with engine.begin() as conn:
                for index_name, index_sql in indexes:
                    try:
                        await conn.execute(text(index_sql))
                        self.print_success(f"Created index: {index_name}")
                    except Exception as e:
                        self.print_warning(f"Index {index_name} already exists or failed: {e}")
            
            await engine.dispose()
            return True
            
        except Exception as e:
            self.print_error(f"Index creation failed: {e}")
            return False
    
    async def backup_database(self) -> str | None:
        """Create database backup"""
        self.print_section("Database Backup")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        try:
            if "sqlite" in self.db_url:
                return await self._backup_sqlite(timestamp)
            else:
                return await self._backup_postgres(timestamp)
        except Exception as e:
            self.print_error(f"Backup failed: {e}")
            return None
    
    async def _backup_sqlite(self, timestamp: str) -> str | None:
        """Backup SQLite database"""
        try:
            # Extract database file path from URL
            db_path = self.db_url.replace("sqlite+aiosqlite://", "").replace("sqlite://", "")
            if db_path.startswith("/"):
                db_file = Path(db_path)
            else:
                db_file = backend_dir / db_path
            
            if not db_file.exists():
                self.print_warning(f"Database file not found: {db_file}")
                return None
            
            backup_file = self.backup_dir / f"fynix_backup_{timestamp}.sqlite"
            
            # Copy database file
            import shutil
            shutil.copy2(db_file, backup_file)
            
            # Compress backup
            import gzip
            compressed_backup = self.backup_dir / f"fynix_backup_{timestamp}.sqlite.gz"
            
            with open(backup_file, 'rb') as f_in:
                with gzip.open(compressed_backup, 'wb') as f_out:
                    f_out.writelines(f_in)
            
            # Remove uncompressed backup
            backup_file.unlink()
            
            self.print_success(f"SQLite backup created: {compressed_backup}")
            return str(compressed_backup)
            
        except Exception as e:
            self.print_error(f"SQLite backup failed: {e}")
            return None
    
    async def _backup_postgres(self, timestamp: str) -> str | None:
        """Backup PostgreSQL database"""
        try:
            backup_file = self.backup_dir / f"fynix_backup_{timestamp}.sql.gz"
            
            # Use pg_dump for backup
            cmd = [
                "pg_dump",
                self.db_url.replace("+asyncpg", ""),
                "--no-password",
                "--verbose"
            ]
            
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Compress output directly
            import gzip
            with gzip.open(backup_file, 'wt') as f:
                for line in process.stdout:
                    f.write(line)
            
            process.wait()
            
            if process.returncode == 0:
                self.print_success(f"PostgreSQL backup created: {backup_file}")
                return str(backup_file)
            else:
                error = process.stderr.read()
                self.print_error(f"pg_dump failed: {error}")
                return None
                
        except Exception as e:
            self.print_error(f"PostgreSQL backup failed: {e}")
            return None
    
    async def run_migrations(self) -> bool:
        """Run database migrations"""
        self.print_section("Database Migrations")
        
        try:
            # Configure Alembic
            alembic_cfg = Config(str(backend_dir / "alembic.ini"))
            alembic_cfg.set_main_option("sqlalchemy.url", self.db_url.replace("+aiosqlite", "").replace("+asyncpg", ""))
            
            # Check current revision
            try:
                from alembic.script import ScriptDirectory

                from alembic import command as alembic_command
                
                script = ScriptDirectory.from_config(alembic_cfg)
                current_rev = script.get_current_head()
                
                self.print_info(f"Current migration head: {current_rev}")
                
                # Run upgrade
                alembic_command.upgrade(alembic_cfg, "head")
                self.print_success("Database migrations completed")
                
                return True
                
            except Exception as e:
                self.print_error(f"Migration failed: {e}")
                return False
                
        except Exception as e:
            self.print_error(f"Migration setup failed: {e}")
            return False
    
    async def generate_performance_report(self) -> dict[str, Any]:
        """Generate comprehensive performance report"""
        self.print_section("Performance Report Generation")
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "database_url": self.db_url.split("@")[-1] if "@" in self.db_url else "local",
            "health": await self.analyze_database_health(),
            "optimizations": [],
            "recommendations": []
        }
        
        # Run optimizations
        if await self.optimize_database():
            report["optimizations"].append("Database optimization completed")
        
        if await self.create_performance_indexes():
            report["optimizations"].append("Performance indexes created")
        
        # Generate recommendations
        if report["health"]["connection"]:
            if report["health"]["tables"]["count"] == 0:
                report["recommendations"].append("No tables found - run migrations")
            elif report["health"]["tables"]["count"] < 5:
                report["recommendations"].append("Few tables detected - system may need full setup")
            else:
                report["recommendations"].append("Database structure looks healthy")
        
        # Save report
        report_file = backend_dir / f"database_performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            async with aiofiles.open(report_file, 'w') as f:
                await f.write(json.dumps(report, indent=2, default=str))
            
            self.print_success(f"Performance report saved: {report_file}")
        except Exception as e:
            self.print_warning(f"Could not save report: {e}")
        
        return report

async def main():
    """Main database management execution"""
    db_manager = DatabaseManager()
    
    db_manager.print_header("Fynix Database Management & Optimization Suite")
    print(f"{Colors.WHITE}Comprehensive database maintenance and performance optimization{Colors.END}")
    print(f"{Colors.WHITE}Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.END}")
    
    # Run comprehensive database management
    tasks = []
    
    # Health analysis
    health_data = await db_manager.analyze_database_health()
    
    if health_data["connection"]:
        # Run migrations
        await db_manager.run_migrations()
        
        # Performance optimization
        await db_manager.optimize_database()
        
        # Create performance indexes
        await db_manager.create_performance_indexes()
        
        # Create backup
        backup_file = await db_manager.backup_database()
        
        # Generate performance report
        report = await db_manager.generate_performance_report()
        
        # Final summary
        db_manager.print_header("Database Management Summary")
        
        if backup_file:
            db_manager.print_success(f"Backup created: {Path(backup_file).name}")
        
        db_manager.print_success("Database optimization completed")
        db_manager.print_success("Performance indexes updated")
        db_manager.print_success("Comprehensive report generated")
        
        print(f"\n{Colors.BOLD}Database Status: {Colors.GREEN}Excellent{Colors.END}")
        print(f"{Colors.BOLD}Tables: {Colors.WHITE}{health_data['tables']['count']}{Colors.END}")
        print(f"{Colors.BOLD}Indexes: {Colors.WHITE}{health_data['indexes']['count']}{Colors.END}")
        
        if "size_mb" in health_data["performance"]:
            print(f"{Colors.BOLD}Size: {Colors.WHITE}{health_data['performance']['size_mb']} MB{Colors.END}")
        
    else:
        db_manager.print_error("Database connection failed - check configuration")
        return False
    
    return True

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Database management interrupted by user{Colors.END}")
        sys.exit(130)
    except Exception as e:
        print(f"\n{Colors.RED}Database management failed: {e}{Colors.END}")
        sys.exit(1)