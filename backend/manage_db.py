#!/usr/bin/env python3
"""
Fynix Database Management CLI
Provides tools for database migration, monitoring, and maintenance
"""

import asyncio
import logging

import click

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@click.group()
def cli():
    """Fynix Database Management CLI"""
    pass

@cli.command()
@click.option('--source', default='sqlite+aiosqlite:///./data/fynix.sqlite', help='Source database URL')
@click.option('--target', required=True, help='Target database URL (PostgreSQL)')
@click.option('--batch-size', default=1000, help='Migration batch size')
def migrate(source: str, target: str, batch_size: int):
    """Migrate from SQLite to PostgreSQL"""
    click.echo(f"🔄 Migrating database from {source} to {target}")
    
    async def run_migration():
        from app.services.database_migration import DatabaseMigrationService
        
        migration_service = DatabaseMigrationService()
        
        try:
            # Run migration
            result = await migration_service.migrate_database(
                source_url=source,
                target_url=target,
                batch_size=batch_size
            )
            
            click.echo("✅ Migration completed!")
            click.echo(f"   Users migrated: {result['users_migrated']}")
            click.echo(f"   Threads migrated: {result['threads_migrated']}")  
            click.echo(f"   Messages migrated: {result['messages_migrated']}")
            click.echo(f"   Duration: {result['duration']:.2f}s")
            
        except Exception as e:
            click.echo(f"❌ Migration failed: {e}")
            raise
    
    asyncio.run(run_migration())

@cli.command()
def metrics():
    """Show current database storage metrics"""
    
    async def show_metrics():
        from app.core.config import Settings
        from app.core.database import db_manager
        from app.services.data_archival_service import DataArchivalService
        
        settings = Settings()
        await db_manager.initialize()
        
        archival_service = DataArchivalService(settings)
        metrics = await archival_service.get_storage_metrics()
        
        click.echo("📊 Database Storage Metrics")
        click.echo("=" * 40)
        click.echo(f"Total Database Size: {metrics.total_size_mb:.2f} MB")
        click.echo(f"AI Threads Size: {metrics.ai_threads_size_mb:.2f} MB")
        click.echo(f"AI Messages Size: {metrics.ai_messages_size_mb:.2f} MB")
        click.echo(f"Archive Size: {metrics.ai_messages_archive_size_mb:.2f} MB")
        click.echo(f"Total Threads: {metrics.total_threads:,}")
        click.echo(f"Total Messages: {metrics.total_messages:,}")
        click.echo(f"Archived Messages: {metrics.archived_messages:,}")
        
        if metrics.oldest_message_date:
            click.echo(f"Oldest Message: {metrics.oldest_message_date.strftime('%Y-%m-%d %H:%M:%S')}")
        if metrics.newest_message_date:
            click.echo(f"Newest Message: {metrics.newest_message_date.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Show warnings
        total_size_gb = metrics.total_size_mb / 1024
        if total_size_gb > 1:
            click.echo(f"⚠️  Database size is {total_size_gb:.2f}GB")
        
        if metrics.total_messages > 1_000_000:
            click.echo(f"⚠️  {metrics.total_messages:,} messages - consider archival")
    
    asyncio.run(show_metrics())

@cli.command()
@click.option('--batch-size', default=1000, help='Archival batch size')
@click.option('--dry-run', is_flag=True, help='Show what would be archived without doing it')
def archive(batch_size: int, dry_run: bool):
    """Archive old conversations"""
    
    async def run_archival():
        from app.core.config import Settings
        from app.core.database import db_manager
        from app.services.data_archival_service import DataArchivalService
        
        settings = Settings()
        await db_manager.initialize()
        
        archival_service = DataArchivalService(settings)
        
        if not settings.ENABLE_DATA_ARCHIVAL:
            click.echo("⚠️  Data archival is disabled in configuration")
            return
        
        if dry_run:
            click.echo("🔍 DRY RUN - No data will be modified")
        
        click.echo(f"🗂️  Archiving conversations older than {settings.ARCHIVE_THRESHOLD_DAYS} days")
        
        if not dry_run:
            stats = await archival_service.archive_old_conversations(batch_size=batch_size)
            
            click.echo("✅ Archival completed!")
            click.echo(f"   Threads archived: {stats.threads_archived}")
            click.echo(f"   Messages archived: {stats.messages_archived}")
            click.echo(f"   Duration: {stats.operation_duration:.2f}s")
    
    asyncio.run(run_archival())

@cli.command()
@click.option('--batch-size', default=100, help='Compression batch size')
def compress(batch_size: int):
    """Compress old archived messages"""
    
    async def run_compression():
        from app.core.config import Settings
        from app.core.database import db_manager
        from app.services.data_archival_service import DataArchivalService
        
        settings = Settings()
        await db_manager.initialize()
        
        archival_service = DataArchivalService(settings)
        
        click.echo("🗜️  Compressing old archived messages...")
        
        stats = await archival_service.compress_old_messages(batch_size=batch_size)
        
        click.echo("✅ Compression completed!")
        click.echo(f"   Messages compressed: {stats.messages_compressed}")
        click.echo(f"   Space freed: {stats.space_freed_mb:.2f} MB")
        click.echo(f"   Duration: {stats.operation_duration:.2f}s")
    
    asyncio.run(run_compression())

@cli.command()
@click.confirmation_option(prompt='Are you sure you want to delete expired data?')
def cleanup():
    """Delete expired conversations (7+ years old)"""
    
    async def run_cleanup():
        from app.core.config import Settings
        from app.core.database import db_manager
        from app.services.data_archival_service import DataArchivalService
        
        settings = Settings()
        await db_manager.initialize()
        
        archival_service = DataArchivalService(settings)
        
        click.echo(f"🗑️  Deleting conversations older than {settings.DELETE_THRESHOLD_DAYS} days")
        
        stats = await archival_service.delete_expired_conversations()
        
        click.echo("✅ Cleanup completed!")
        click.echo(f"   Messages deleted: {stats.messages_deleted}")
        click.echo(f"   Threads deleted: {stats.threads_archived}")
        click.echo(f"   Duration: {stats.operation_duration:.2f}s")
    
    asyncio.run(run_cleanup())

@cli.command()
def maintenance():
    """Run full maintenance cycle (archive + compress + cleanup + vacuum)"""
    
    async def run_maintenance():
        from app.core.config import Settings
        from app.core.database import db_manager
        from app.services.data_archival_service import DataArchivalService
        
        settings = Settings()
        await db_manager.initialize()
        
        archival_service = DataArchivalService(settings)
        
        click.echo("🧹 Running full maintenance cycle...")
        
        # Get before metrics
        before_metrics = await archival_service.get_storage_metrics()
        click.echo(f"   Database size before: {before_metrics.total_size_mb:.2f} MB")
        
        # Run maintenance
        results = await archival_service.run_full_maintenance()
        
        # Get after metrics
        after_metrics = await archival_service.get_storage_metrics()
        space_freed = before_metrics.total_size_mb - after_metrics.total_size_mb
        
        click.echo("✅ Maintenance cycle completed!")
        click.echo(f"   Database size after: {after_metrics.total_size_mb:.2f} MB")
        click.echo(f"   Space freed: {space_freed:.2f} MB")
        
        # Show detailed results
        for operation, stats in results.items():
            if operation == "archive":
                click.echo(f"   📁 Archived: {stats.messages_archived} messages, {stats.threads_archived} threads")
            elif operation == "compress":
                click.echo(f"   🗜️  Compressed: {stats.messages_compressed} messages, freed {stats.space_freed_mb:.2f} MB")
            elif operation == "delete":
                click.echo(f"   🗑️  Deleted: {stats.messages_deleted} expired messages")
    
    asyncio.run(run_maintenance())

@cli.command()
def info():
    """Show database configuration information"""
    
    async def show_info():
        from app.core.config import Settings
        from app.core.database import db_manager
        
        settings = Settings()
        await db_manager.initialize()
        
        db_info = db_manager.get_database_info()
        
        click.echo("ℹ️  Database Configuration")
        click.echo("=" * 40)
        click.echo(f"Database Type: {db_info['database_type']}")
        click.echo(f"Primary URL: {db_info['primary_url']}")
        
        if db_info['replica_configured']:
            click.echo(f"Replica URL: {db_info['replica_url']}")
        else:
            click.echo("Replica: Not configured")
        
        click.echo(f"Pool Size: {db_info['pool_size']}")
        click.echo(f"Max Overflow: {db_info['max_overflow']}")
        click.echo(f"Pool Timeout: {db_info['pool_timeout']}s")
        click.echo(f"Pool Recycle: {db_info['pool_recycle']}s")
        
        click.echo("\n📋 Archival Settings")
        click.echo("=" * 40)
        click.echo(f"Archival Enabled: {settings.ENABLE_DATA_ARCHIVAL}")
        click.echo(f"Archive Threshold: {settings.ARCHIVE_THRESHOLD_DAYS} days")
        click.echo(f"Delete Threshold: {settings.DELETE_THRESHOLD_DAYS} days")
    
    asyncio.run(show_info())

@cli.command()
@click.option('--days', type=int, help='Force delete data older than X days (DANGEROUS)')
@click.confirmation_option(prompt='This will permanently delete data. Are you sure?')
def emergency_cleanup(days: int | None):
    """Emergency cleanup for critical storage situations"""
    
    async def run_emergency():
        from app.tasks.maintenance import emergency_cleanup_task
        
        click.echo("🚨 Running emergency cleanup...")
        
        if days:
            click.echo(f"⚠️  Forcing deletion of data older than {days} days")
        
        # Run emergency cleanup task
        result = emergency_cleanup_task.delay(force_delete_days=days)
        task_result = result.get(timeout=1800)  # 30 minutes timeout
        
        if task_result['success']:
            click.echo("✅ Emergency cleanup completed!")
            click.echo(f"   Space freed: {task_result['space_freed_mb']:.2f} MB")
            click.echo(f"   Messages archived: {task_result['archive_stats']['messages_archived']}")
            click.echo(f"   Messages compressed: {task_result['compress_stats']['messages_compressed']}")
            click.echo(f"   Messages deleted: {task_result['delete_stats']['messages_deleted']}")
        else:
            click.echo(f"❌ Emergency cleanup failed: {task_result['error']}")
    
    asyncio.run(run_emergency())

@cli.command()
def test_connection():
    """Test database connection"""
    
    async def test_db():
        from app.core.database import db_manager
        
        try:
            await db_manager.initialize()
            click.echo("✅ Database connection successful")
        except Exception as e:
            click.echo(f"❌ Database connection failed: {e}")
    
    asyncio.run(test_db())

if __name__ == '__main__':
    cli()