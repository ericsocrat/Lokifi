#!/bin/bash
set -e

echo "🚀 Starting Lokifi Backend (CI Mode)"
echo "=================================="

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
until pg_isready -h postgres -p 5432 -U lokifi; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "✅ PostgreSQL is ready"

# Wait for Redis
echo "⏳ Waiting for Redis..."
until redis-cli -h redis -p 6379 -a 23233 ping; do
  echo "Redis is unavailable - sleeping"
  sleep 2
done
echo "✅ Redis is ready"

# Initialize database (run migrations)
echo "🗄️ Initializing database..."
python -c "
import asyncio
from app.db.db_manager import db_manager

async def init():
    try:
        await db_manager.initialize()
        print('✅ Database initialized')
    except Exception as e:
        print(f'⚠️ Database initialization warning: {e}')
        # Don't fail if tables already exist

asyncio.run(init())
"

echo "🎯 Starting Uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
