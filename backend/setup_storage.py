# Cloud-Ready Storage Setup Script
# Configures local PostgreSQL with cloud migration path

import asyncio
import logging
import os
import subprocess
import sys
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

class DatabaseSetup:
    """Setup database with cloud-ready configuration"""
    
    def __init__(self):
        self.backend_dir = Path(__file__).parent
        self.env_file = self.backend_dir / ".env"
        self.data_dir = self.backend_dir / "data"
    
    def check_postgresql_available(self) -> bool:
        """Check if PostgreSQL is available locally"""
        try:
            result = subprocess.run(
                ["psql", "--version"], 
                capture_output=True, 
                text=True, 
                timeout=5
            )
            if result.returncode == 0:
                logger.info(f"✅ PostgreSQL found: {result.stdout.strip()}")
                return True
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        logger.info("ℹ️  PostgreSQL not found locally")
        return False
    
    def check_docker_available(self) -> bool:
        """Check if Docker is available for containerized PostgreSQL"""
        try:
            result = subprocess.run(
                ["docker", "--version"], 
                capture_output=True, 
                text=True, 
                timeout=5
            )
            if result.returncode == 0:
                logger.info(f"✅ Docker found: {result.stdout.strip()}")
                return True
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        logger.info("ℹ️  Docker not found")
        return False
    
    def start_postgres_docker(self) -> bool:
        """Start PostgreSQL in Docker container"""
        try:
            logger.info("🐳 Starting PostgreSQL Docker container...")
            
            # Check if container already exists
            check_cmd = [
                "docker", "ps", "-a", 
                "--filter", "name=fynix-postgres",
                "--format", "{{.Names}}"
            ]
            
            result = subprocess.run(check_cmd, capture_output=True, text=True)
            
            if "fynix-postgres" in result.stdout:
                logger.info("📦 PostgreSQL container exists, starting...")
                start_result = subprocess.run(
                    ["docker", "start", "fynix-postgres"],
                    capture_output=True, text=True
                )
                if start_result.returncode == 0:
                    logger.info("✅ PostgreSQL container started")
                    return True
            else:
                # Create new container
                logger.info("📦 Creating new PostgreSQL container...")
                
                create_cmd = [
                    "docker", "run", "-d",
                    "--name", "fynix-postgres",
                    "-e", "POSTGRES_DB=fynix",
                    "-e", "POSTGRES_USER=fynix",
                    "-e", "POSTGRES_PASSWORD=fynix_dev_password",
                    "-p", "5432:5432",
                    "-v", "fynix_postgres_data:/var/lib/postgresql/data",
                    "postgres:15-alpine"
                ]
                
                create_result = subprocess.run(create_cmd, capture_output=True, text=True)
                
                if create_result.returncode == 0:
                    logger.info("✅ PostgreSQL container created and started")
                    
                    # Wait for PostgreSQL to be ready
                    logger.info("⏳ Waiting for PostgreSQL to be ready...")
                    import time
                    for i in range(30):  # Wait up to 30 seconds
                        try:
                            test_cmd = [
                                "docker", "exec", "fynix-postgres",
                                "pg_isready", "-U", "fynix", "-d", "fynix"
                            ]
                            test_result = subprocess.run(test_cmd, capture_output=True)
                            if test_result.returncode == 0:
                                logger.info("✅ PostgreSQL is ready!")
                                return True
                        except (subprocess.SubprocessError, FileNotFoundError):
                            pass
                        time.sleep(1)
                    
                    logger.warning("⚠️  PostgreSQL container started but readiness check failed")
                    return True  # Container is running, assume it will be ready soon
                
        except Exception as e:
            logger.error(f"❌ Failed to start PostgreSQL Docker: {e}")
        
        return False
    
    def update_env_file(self, database_url: str):
        """Update .env file with database configuration"""
        env_content = []
        database_url_set = False
        
        # Read existing .env file
        if self.env_file.exists():
            with open(self.env_file) as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('DATABASE_URL='):
                        env_content.append(f"DATABASE_URL={database_url}")
                        database_url_set = True
                    else:
                        env_content.append(line)
        
        # Add DATABASE_URL if not found
        if not database_url_set:
            env_content.append(f"DATABASE_URL={database_url}")
        
        # Add archival settings if not present
        archival_settings = [
            "ENABLE_DATA_ARCHIVAL=true",
            "ARCHIVE_THRESHOLD_DAYS=365",
            "DELETE_THRESHOLD_DAYS=2555"
        ]
        
        for setting in archival_settings:
            key = setting.split('=')[0]
            if not any(line.startswith(f"{key}=") for line in env_content):
                env_content.append(setting)
        
        # Write updated .env file
        with open(self.env_file, 'w') as f:
            f.write('\n'.join(env_content))
            f.write('\n')
        
        logger.info(f"✅ Updated {self.env_file}")
    
    def setup_database_config(self) -> str:
        """Setup database configuration based on available options"""
        
        # Option 1: Try Docker PostgreSQL (recommended)
        if self.check_docker_available():
            if self.start_postgres_docker():
                database_url = "postgresql+asyncpg://fynix:fynix_dev_password@localhost:5432/fynix"
                logger.info("✅ Using Docker PostgreSQL")
                return database_url
        
        # Option 2: Try local PostgreSQL
        if self.check_postgresql_available():
            database_url = "postgresql+asyncpg://postgres:postgres@localhost:5432/fynix"
            logger.info("✅ Using local PostgreSQL")
            logger.warning("⚠️  Make sure PostgreSQL is running and 'fynix' database exists")
            return database_url
        
        # Option 3: Fall back to SQLite (with warning)
        logger.warning("⚠️  No PostgreSQL available, using SQLite")
        logger.info("💡 For production, consider:")
        logger.info("   - Install Docker and rerun this script")
        logger.info("   - Install PostgreSQL locally")
        logger.info("   - Use cloud PostgreSQL (Supabase, AWS RDS, etc.)")
        
        database_url = "sqlite+aiosqlite:///./data/fynix.sqlite"
        return database_url
    
    async def test_database_connection(self, database_url: str) -> bool:
        """Test database connection"""
        try:
            if database_url.startswith("postgresql"):
                import asyncpg
                # Parse connection URL
                if "localhost:5432" in database_url:
                    if "fynix:" in database_url:
                        # Docker setup
                        db_password = os.getenv("POSTGRES_PASSWORD", "fynix_dev_password")
                        conn = await asyncpg.connect(
                            host="localhost",
                            port=5432,
                            user="fynix", 
                            password=db_password,
                            database="fynix"
                        )
                    else:
                        # Local PostgreSQL
                        conn = await asyncpg.connect(database_url.replace("postgresql+asyncpg://", "postgresql://"))
                    
                    # Test query
                    result = await conn.fetchval("SELECT 1")
                    await conn.close()
                    
                    if result == 1:
                        logger.info("✅ PostgreSQL connection successful")
                        return True
                        
            elif database_url.startswith("sqlite"):
                import aiosqlite
                # Ensure data directory exists
                self.data_dir.mkdir(exist_ok=True)
                
                # Test SQLite connection
                async with aiosqlite.connect(self.data_dir / "fynix.sqlite") as db:
                    await db.execute("SELECT 1")
                
                logger.info("✅ SQLite connection successful")
                return True
        
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False
        
        # If no condition matched, return False
        return False
    
    async def run_database_migration(self):
        """Run Alembic database migration"""
        try:
            logger.info("🔄 Running database migrations...")
            
            # Run alembic upgrade
            result = subprocess.run(
                ["alembic", "upgrade", "head"],
                cwd=self.backend_dir,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                logger.info("✅ Database migrations completed")
                return True
            else:
                logger.error(f"❌ Migration failed: {result.stderr}")
                return False
        
        except Exception as e:
            logger.error(f"❌ Migration error: {e}")
            return False
    
    async def setup_complete_database(self) -> bool:
        """Complete database setup process"""
        logger.info("🚀 Starting database setup...")
        
        # 1. Configure database
        database_url = self.setup_database_config()
        
        # 2. Update .env file
        self.update_env_file(database_url)
        
        # 3. Test connection
        logger.info("🔌 Testing database connection...")
        connection_ok = await self.test_database_connection(database_url)
        
        if not connection_ok:
            logger.error("❌ Database connection failed")
            return False
        
        # 4. Run migrations
        migration_ok = await self.run_database_migration()
        
        if not migration_ok:
            logger.error("❌ Database migration failed")
            return False
        
        logger.info("🎉 Database setup completed successfully!")
        logger.info(f"📊 Database URL: {database_url}")
        
        return True

class CloudMigrationGuide:
    """Provides guidance for cloud migration"""
    
    @staticmethod
    def print_cloud_options():
        """Print available cloud migration options"""
        
        print("\n🌟 CLOUD MIGRATION OPTIONS")
        print("=" * 50)
        
        print("\n💚 RECOMMENDED FREE TIERS:")
        
        print("\n1. Supabase (PostgreSQL)")
        print("   - ✅ 500MB database free")
        print("   - ✅ 50,000 monthly active users")
        print("   - ✅ 2GB bandwidth/month")
        print("   - ✅ Real-time subscriptions")
        print("   - 💰 $25/month after limits")
        print("   - 🔗 https://supabase.com")
        
        print("\n2. PlanetScale (MySQL - but highly scalable)")
        print("   - ✅ 5GB storage free")
        print("   - ✅ 1 billion row reads/month")
        print("   - ✅ Branching for database schemas")
        print("   - 💰 $39/month for production")
        print("   - 🔗 https://planetscale.com")
        
        print("\n3. Neon (PostgreSQL)")
        print("   - ✅ 512MB free")
        print("   - ✅ Serverless PostgreSQL")
        print("   - ✅ Branching and time travel")
        print("   - 💰 $19/month after limits")
        print("   - 🔗 https://neon.tech")
        
        print("\n📦 FILE STORAGE:")
        
        print("\n1. Cloudflare R2 (Recommended)")
        print("   - ✅ 10GB free storage")
        print("   - ✅ No egress fees")
        print("   - ✅ S3-compatible API")
        print("   - 💰 $0.015/GB after free tier")
        print("   - 🔗 https://cloudflare.com/products/r2")
        
        print("\n2. AWS S3 (Industry Standard)")
        print("   - ✅ 5GB free for 12 months")
        print("   - ✅ Mature ecosystem")
        print("   - 💰 ~$0.023/GB + egress fees")
        print("   - 🔗 https://aws.amazon.com/s3")
        
        print("\n⚡ REDIS/CACHING:")
        
        print("\n1. Upstash Redis")
        print("   - ✅ 10,000 requests/day free")
        print("   - ✅ Serverless Redis")
        print("   - 💰 $0.2 per 100K requests")
        print("   - 🔗 https://upstash.com")
        
        print("\n2. Redis Cloud")
        print("   - ✅ 30MB free")
        print("   - ✅ Enterprise features")
        print("   - 💰 $5/month after free tier")
        print("   - 🔗 https://redis.com/redis-enterprise-cloud")
        
        print("\n📈 MIGRATION TIMELINE:")
        print("📅 Month 1-3: Local setup with archival")
        print("📅 Month 4-6: Migrate to free cloud tiers")
        print("📅 Month 6+: Scale to paid tiers as needed")
        
        print("\n🔧 EASY MIGRATION:")
        print("All services provide simple connection string changes!")
        print("Your app code remains the same - just update .env file")

def main():
    """Main setup function"""
    
    print("🚀 FYNIX CLOUD-READY STORAGE SETUP")
    print("=" * 50)
    
    setup = DatabaseSetup()
    
    # Show cloud options first
    CloudMigrationGuide.print_cloud_options()
    
    print("\n" + "=" * 50)
    print("🔧 SETTING UP LOCAL DEVELOPMENT ENVIRONMENT")
    print("=" * 50)
    
    try:
        # Run async database setup
        success = asyncio.run(setup.setup_complete_database())
        
        if success:
            print("\n🎉 SUCCESS! Your database is ready!")
            print("\n📋 NEXT STEPS:")
            print("1. Test the management CLI: python manage_db.py info")
            print("2. Check storage metrics: python manage_db.py metrics") 
            print("3. Start your server: python -m uvicorn app.main:app --reload")
            print("4. When ready for cloud: Update DATABASE_URL in .env")
            
        else:
            print("\n❌ Setup failed. Check the logs above.")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ Setup error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()