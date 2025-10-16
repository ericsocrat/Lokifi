#!/bin/sh
set -e

echo "Starting Lokifi Backend (CI Mode)"
echo "=================================="

# Wait for PostgreSQL (simple loop without arithmetic)
echo "Waiting for PostgreSQL..."
count=0
while ! pg_isready -h postgres -p 5432 -U lokifi > /dev/null 2>&1; do
  count=`expr $count + 1`
  if [ $count -gt 30 ]; then
    echo "ERROR: PostgreSQL not ready after 30 attempts"
    exit 1
  fi
  echo "PostgreSQL unavailable (attempt $count/30)"
  sleep 2
done
echo "PostgreSQL is ready"

# Wait for Redis  
echo "Waiting for Redis..."
count=0
while ! redis-cli -h redis -p 6379 -a 23233 ping > /dev/null 2>&1; do
  count=`expr $count + 1`
  if [ $count -gt 30 ]; then
    echo "ERROR: Redis not ready after 30 attempts"
    exit 1
  fi
  echo "Redis unavailable (attempt $count/30)"
  sleep 2
done
echo "Redis is ready"

echo "Starting Uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
