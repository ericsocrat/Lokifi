# Start Lokifi Backend Server
Write-Host "🚀 Starting Lokifi Backend..." -ForegroundColor Green

# Activate virtual environment
& .\venv\Scripts\Activate.ps1

# Set JWT secret
$env:LOKIFI_JWT_SECRET = "KJlAjdLJAWgwND2c9bOxhuoc9ZfM0tMeTnDu8viMvH+lvGDGr9tMlFYLb4Sl4t5lVwcH+W8hRSSha9gZ2otcXg=="

Write-Host "✅ Environment configured" -ForegroundColor Green
Write-Host "🌐 Starting server on http://localhost:8000" -ForegroundColor Cyan
Write-Host "📚 API docs will be at http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""

# Start uvicorn
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
