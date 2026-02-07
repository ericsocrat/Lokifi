#!/bin/bash
set -e

echo "🚀 Starting Lokifi Backend..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "postgres" -U "lokifi" -d "lokifi_db" -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "✅ PostgreSQL is ready!"

# Run database migrations
echo "📊 Running database migrations..."
alembic upgrade head

echo "✅ Migrations complete!"

# Start the application
if [ "$#" -gt 0 ]; then
    echo "▶️  Running custom command: $@"
    exec "$@"
else
    echo "🎯 Starting FastAPI server..."
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
fi
