# API Keys Testing Script
# Tests all configured API keys to ensure they're working

$baseUrl = "http://localhost:8000/api/v1"
$headers = @{
    'User-Agent' = 'Mozilla/5.0'
    'Accept' = 'application/json'
}

Write-Host "`n🔑 API Keys Testing Script" -ForegroundColor Cyan
Write-Host "=" * 60

# Function to test an endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$ApiKeyName = "Unknown"
    )
    
    try {
        Write-Host "`n📡 Testing $Name..." -ForegroundColor Yellow
        Write-Host "   URL: $Url" -ForegroundColor Gray
        Write-Host "   API Key: $ApiKeyName" -ForegroundColor Gray
        
        $response = Invoke-RestMethod -Uri $Url -Headers $headers -Method Get -ErrorAction Stop
        
        if ($response) {
            Write-Host "   ✅ SUCCESS" -ForegroundColor Green
            
            # Show some response data
            if ($response.Count -gt 0) {
                Write-Host "   📊 Returned: $($response.Count) items" -ForegroundColor Gray
            } elseif ($response.candles) {
                Write-Host "   📊 Returned: $($response.candles.Count) candles" -ForegroundColor Gray
            } elseif ($response.articles) {
                Write-Host "   📊 Returned: $($response.articles.Count) articles" -ForegroundColor Gray
            } elseif ($response.data) {
                Write-Host "   📊 Has data property" -ForegroundColor Gray
            }
            
            return $true
        }
    }
    catch {
        $errorMsg = $_.Exception.Message
        if ($errorMsg -match "Forbidden") {
            Write-Host "   🔒 BLOCKED (Security filter)" -ForegroundColor Magenta
        } elseif ($errorMsg -match "401|Unauthorized") {
            Write-Host "   ❌ FAILED (Invalid API key)" -ForegroundColor Red
        } elseif ($errorMsg -match "404") {
            Write-Host "   ⚠️  ENDPOINT NOT FOUND" -ForegroundColor Yellow
        } elseif ($errorMsg -match "429|Rate limit") {
            Write-Host "   ⏸️  RATE LIMITED" -ForegroundColor Yellow
        } else {
            Write-Host "   ❌ ERROR: $errorMsg" -ForegroundColor Red
        }
        return $false
    }
}

# Check if backend is running
Write-Host "`n🔍 Checking if backend is running..." -ForegroundColor Cyan
$backendRunning = $false
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/../health" -Headers $headers -Method Get -ErrorAction Stop
    Write-Host "✅ Backend is running" -ForegroundColor Green
    $backendRunning = $true
}
catch {
    Write-Host "❌ Backend is not running on port 8000" -ForegroundColor Red
    Write-Host "Please start the backend first: cd backend; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n" + "=" * 60
Write-Host "📋 Testing API Endpoints by Service" -ForegroundColor Cyan
Write-Host "=" * 60

$results = @{
    Success = 0
    Failed = 0
    Blocked = 0
}

# 1. Test Symbols (No API key required - internal data)
Write-Host "`n1️⃣ SYMBOLS API (Internal - No API key)" -ForegroundColor Cyan
if (Test-Endpoint "Popular Symbols" "$baseUrl/symbols/popular?limit=5" "None") {
    $results.Success++
} else {
    $results.Failed++
}

if (Test-Endpoint "Search Symbols" "$baseUrl/symbols/search?query=AAPL" "None") {
    $results.Success++
} else {
    $results.Failed++
}

# 2. Test Market Data (Polygon, Alpha Vantage, Finnhub)
Write-Host "`n2️⃣ MARKET DATA APIs" -ForegroundColor Cyan
if (Test-Endpoint "OHLC/Candles Data" "$baseUrl/ohlc/AAPL?timeframe=1D&limit=5" "POLYGON_API_KEY / ALPHAVANTAGE_API_KEY") {
    $results.Success++
} else {
    $results.Failed++
}

if (Test-Endpoint "Market Overview" "$baseUrl/market/overview" "Multiple APIs") {
    $results.Success++
} else {
    $results.Failed++
}

# 3. Test Crypto APIs (CoinGecko, CMC)
Write-Host "`n3️⃣ CRYPTO APIs" -ForegroundColor Cyan
if (Test-Endpoint "CoinGecko Prices" "$baseUrl/crypto/prices?symbols=bitcoin,ethereum" "COINGECKO_API_KEY") {
    $results.Success++
} else {
    $results.Failed++
}

if (Test-Endpoint "CMC Data" "$baseUrl/crypto/cmc?symbol=BTC&limit=10" "CMC_KEY") {
    $results.Success++
} else {
    $results.Failed++
}

# 4. Test News APIs (NewsAPI, MarketAux)
Write-Host "`n4️⃣ NEWS APIs" -ForegroundColor Cyan
if (Test-Endpoint "News for Symbol" "$baseUrl/news/AAPL?limit=5" "NEWSAPI_KEY / MARKETAUX_KEY") {
    $results.Success++
} else {
    $results.Failed++
}

# 5. Test AI APIs (OpenRouter, Hugging Face, Ollama)
Write-Host "`n5️⃣ AI APIs" -ForegroundColor Cyan
if (Test-Endpoint "AI Providers List" "$baseUrl/ai/providers" "OPENROUTER_API_KEY / HUGGING_FACE_API_KEY") {
    $results.Success++
} else {
    $results.Failed++
}

# 6. Test FMP (Financial Modeling Prep)
Write-Host "`n6️⃣ FINANCIAL MODELING PREP API" -ForegroundColor Cyan
if (Test-Endpoint "FMP Company Profile" "$baseUrl/fmp/profile/AAPL" "FMP_KEY") {
    $results.Success++
} else {
    $results.Failed++
}

# Summary
Write-Host "`n" + "=" * 60
Write-Host "📊 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 60
Write-Host "✅ Successful: $($results.Success)" -ForegroundColor Green
Write-Host "❌ Failed: $($results.Failed)" -ForegroundColor Red
Write-Host "🔒 Blocked: $($results.Blocked)" -ForegroundColor Magenta
Write-Host ""

# Check .env file for missing keys
Write-Host "`n" + "=" * 60
Write-Host "🔍 CHECKING .ENV FILE" -ForegroundColor Cyan
Write-Host "=" * 60

$envFile = "backend\.env"
if (Test-Path $envFile) {
    Write-Host "✅ Found .env file" -ForegroundColor Green
    
    $apiKeys = @{
        "OPENAI_API_KEY" = $false
        "POLYGON_API_KEY" = $false
        "ALPHAVANTAGE_API_KEY" = $false
        "FINNHUB_API_KEY" = $false
        "COINGECKO_API_KEY" = $false
        "CMC_KEY" = $false
        "NEWSAPI_KEY" = $false
        "MARKETAUX_API_KEY" = $false
        "FMP_KEY" = $false
        "OPENROUTER_API_KEY" = $false
        "HUGGING_FACE_API_KEY" = $false
    }
    
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and !$line.StartsWith("#")) {
            foreach ($key in $apiKeys.Keys) {
                if ($line.StartsWith("$key=")) {
                    $value = $line.Substring($key.Length + 1).Trim()
                    if ($value) {
                        $apiKeys[$key] = $true
                    }
                }
            }
        }
    }
    
    Write-Host "`n📋 API Keys Status:" -ForegroundColor Cyan
    foreach ($key in $apiKeys.Keys | Sort-Object) {
        if ($apiKeys[$key]) {
            Write-Host "   ✅ $key = [SET]" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  $key = [NOT SET]" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ .env file not found at $envFile" -ForegroundColor Red
}

Write-Host "`n" + "=" * 60
Write-Host "✨ Testing complete!" -ForegroundColor Cyan
Write-Host "=" * 60
Write-Host ""
