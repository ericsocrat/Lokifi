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
until redis-cli -h redis -p 6379 -a 23233 ping 2>/dev/null; do
  echo "Redis is unavailable - sleeping"
  sleep 2
done
echo "✅ Redis is ready"

echo "🎯 Starting Uvicorn server (database will auto-initialize)..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
