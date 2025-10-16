#!/bin/sh
set -e

echo "🚀 Starting Lokifi Backend (CI Mode)"
echo "=================================="

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
max_attempts=30
attempt=0
until pg_isready -h postgres -p 5432 -U lokifi > /dev/null 2>&1; do
  attempt=$((attempt+1))
  if [ $attempt -ge $max_attempts ]; then
    echo "❌ PostgreSQL not ready after $max_attempts attempts"
    exit 1
  fi
  echo "PostgreSQL is unavailable (attempt $attempt/$max_attempts) - sleeping"
  sleep 2
done
echo "✅ PostgreSQL is ready"

# Wait for Redis
echo "⏳ Waiting for Redis..."
attempt=0
until redis-cli -h redis -p 6379 -a 23233 ping > /dev/null 2>&1; do
  attempt=$((attempt+1))
  if [ $attempt -ge $max_attempts ]; then
    echo "❌ Redis not ready after $max_attempts attempts"
    exit 1
  fi
  echo "Redis is unavailable (attempt $attempt/$max_attempts) - sleeping"
  sleep 2
done
echo "✅ Redis is ready"

echo "🎯 Starting Uvicorn server (database will auto-initialize)..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
