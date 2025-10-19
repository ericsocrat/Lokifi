# Quick Start Backend for Testing
# Sets minimal required environment variables

# Set JWT secret for testing
$env:JWT_SECRET_KEY = "test_jwt_secret_key_for_development_only_change_in_production"
$env:LOKIFI_JWT_SECRET = "test_jwt_secret_key_for_development_only_change_in_production"

# Database URL (adjust if needed)
$env:DATABASE_URL = "postgresql+asyncpg://lokifi:lokifi@localhost:5432/lokifi"

# Redis URL (optional)
$env:REDIS_URL = "redis://localhost:6379/0"

# Environment
$env:ENVIRONMENT = "development"

# Optional: Disable database pooling for testing
$env:SQL_DISABLE_POOL = "false"

Write-Host "🚀 Starting Lokifi Backend..." -ForegroundColor Green
Write-Host "Environment: development" -ForegroundColor Cyan
Write-Host "Port: 8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start uvicorn
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
