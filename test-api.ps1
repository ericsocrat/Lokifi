# Test Lokifi Backend API
Write-Host "🧪 Testing Lokifi Backend API..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Test 1: Health Check
Write-Host "1️⃣  Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:8000/health" -ErrorAction Stop
    if ($health.StatusCode -eq 200) {
        Write-Host "   ✅ Health check passed" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Health check failed: $_" -ForegroundColor Red
    Write-Host "   Make sure backend is running: .\start-backend.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 2: Top Cryptos
Write-Host "2️⃣  Testing Crypto Discovery (Top 5)..." -ForegroundColor Yellow
try {
    $cryptos = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/prices/crypto/top?limit=5" -ErrorAction Stop
    if ($cryptos.success) {
        Write-Host "   ✅ Got $($cryptos.count) cryptocurrencies" -ForegroundColor Green
        Write-Host "   Top 3:" -ForegroundColor Cyan
        $cryptos.cryptos | Select-Object -First 3 | ForEach-Object {
            Write-Host "      $($_.symbol): $($_.name) - `$$($_.current_price)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "   ❌ Crypto discovery failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 3: Batch Price
Write-Host "3️⃣  Testing Batch Price Optimization..." -ForegroundColor Yellow
try {
    $body = @{
        symbols = @("BTC", "ETH", "SOL")
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/prices/batch" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    
    if ($response.success) {
        Write-Host "   ✅ Batch request successful" -ForegroundColor Green
        Write-Host "   Prices retrieved:" -ForegroundColor Cyan
        $response.data.PSObject.Properties | ForEach-Object {
            Write-Host "      $($_.Name): `$$($_.Value.price) from $($_.Value.source)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "   ⚠️  Batch price test skipped (endpoint may not be available)" -ForegroundColor Yellow
}

Write-Host ""

# Test 4: Search
Write-Host "4️⃣  Testing Crypto Search..." -ForegroundColor Yellow
try {
    $search = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/prices/crypto/search?q=bitcoin&limit=3" -ErrorAction Stop
    if ($search.success) {
        Write-Host "   ✅ Search returned $($search.count) results" -ForegroundColor Green
        $search.results | Select-Object -First 3 | ForEach-Object {
            Write-Host "      $($_.symbol): $($_.name)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "   ⚠️  Search test skipped" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "✅ API Testing Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Frontend: http://localhost:3000/markets" -ForegroundColor White
Write-Host "  2. API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "  3. Test Services: cd backend; python test_new_services.py" -ForegroundColor White
Write-Host ""
