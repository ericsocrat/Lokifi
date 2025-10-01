# Lokifi Backend

FastAPI-based trading platform backend with multi-provider data aggregation, Redis caching, and comprehensive symbol directory.

## 🚀 Quick Start

### Option 1: Using Makefile (Recommended)
```bash
make setup    # Create venv and install dependencies
make run      # Start development server
```

### Option 2: PowerShell Script (Windows)
```powershell
./setup_backend.ps1
```

### Option 3: Manual Setup
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# OR
.\.venv\Scripts\Activate.ps1  # Windows

pip install -r requirements.txt
```

## 🛠 Development Commands

| Command | Description |
|---------|-------------|
| `make run` | Start FastAPI dev server (auto-reload) |
| `make test` | Run all tests |
| `make test-cov` | Run tests with coverage report |
| `make lint` | Check code with ruff |
| `make format` | Format code with black + ruff |
| `make type-check` | Run mypy type checking |
| `make check` | Run all checks (lint + type + test) |
| `make clean` | Remove cache files |
| `make version` | Show dependency versions |

## 📁 Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry
│   ├── api/                 # API route handlers
│   ├── core/                # Core configuration
│   ├── db/                  # Database models/migrations
│   ├── routers/             # API route definitions
│   ├── services/            # Business logic
│   │   └── data_service.py  # Market data aggregation
│   └── utils/               # Utility functions
├── tests/                   # Test suites
├── requirements.txt         # Python dependencies
├── Makefile                # Development commands
├── .python-version         # Python version (pyenv)
└── setup_backend.ps1       # Windows setup script
```

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:

```env
# API Keys (optional - will use mock data if missing)
ALPHA_VANTAGE_API_KEY=your_key_here
FINNHUB_API_KEY=your_key_here
POLYGON_API_KEY=your_key_here

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Application Settings
ENVIRONMENT=development
SECRET_KEY=your-secret-key-here
DEBUG=true
```

### Automatic Environment Activation

**With pyenv (recommended):**
```bash
# Install pyenv, then:
pyenv install 3.12.4
cd backend  # Auto-activates Python 3.12.4
```

**With direnv:**
Create `.envrc`:
```bash
source .venv/bin/activate
```
Then: `direnv allow`

## 📊 API Endpoints

### Health Check
```
GET /api/health
```

### Symbol Directory
```
GET /api/v1/symbols                    # All symbols
GET /api/v1/symbols?search=AAPL        # Search symbols  
GET /api/v1/symbols?type=stock         # Filter by type
```

### OHLC Market Data
```
GET /api/v1/ohlc/{symbol}                      # Latest data
GET /api/v1/ohlc/{symbol}?timeframe=1D         # Daily data
GET /api/v1/ohlc/{symbol}?limit=100            # Limit results
GET /api/v1/ohlc/AAPL?timeframe=1h&limit=50    # Hourly, 50 bars
```

**Supported Timeframes:**
- `1m`, `5m`, `15m`, `30m` (intraday)
- `1h` (hourly)
- `1D` (daily, default)
- `1W` (weekly)
- `1M` (monthly)

## 🔄 Data Providers

The backend aggregates data from multiple providers with automatic failover:

1. **Alpha Vantage** (priority 1) - Free tier: 5 calls/min
2. **Finnhub** (priority 2) - Free tier: 60 calls/min  
3. **Yahoo Finance** (priority 3) - No API key required
4. **Mock Data** - Realistic fallback if all providers fail

## 🗃 Symbol Directory

Pre-configured with 25+ symbols across asset classes:

- **Stocks:** AAPL, MSFT, GOOGL, TSLA, AMZN, META, NFLX, NVDA
- **ETFs:** SPY, QQQ, DIA
- **Crypto:** BTCUSD, ETHUSD, ADAUSD, SOLUSD, DOGEUSDT
- **Forex:** EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD
- **Commodities:** GOLD, SILVER, OIL

## 🧪 Testing

```bash
# Run all tests
make test

# Run with coverage
make test-cov

# Run specific test file
python -m pytest tests/test_api.py -v

# Run specific test
python -m pytest tests/test_api.py::TestSymbolsAPI::test_get_symbols -v
```

### Test Structure
- `test_api.py` - API endpoint tests
- `test_health.py` - Health check tests
- Add new tests following pytest conventions

## 🐳 Docker Support

### Development
```bash
make docker-dev
# OR
docker-compose up --build
```

### Production
```bash
make prod-build
make prod-run
```

## 🚀 Production Deployment

### Build Production Image
```bash
docker build -t lokifi-backend:prod -f Dockerfile.prod .
```

### Run with Environment
```bash
docker run -p 8000:8000 --env-file .env lokifi-backend:prod
```

### Docker Compose Production
```bash
docker-compose -f docker-compose.production.yml up -d
```

## 🔍 Code Quality

### Linting & Formatting
- **Ruff** - Fast Python linter and formatter
- **Black** - Code formatter
- **MyPy** - Static type checker

```bash
make lint      # Check code
make format    # Format code  
make type-check # Type checking
make check     # Run all checks
```

### Pre-commit Hooks (Optional)
```bash
pip install pre-commit
pre-commit install
```

## 📈 Performance & Monitoring

### Built-in Features
- **Redis caching** with 5-minute TTL
- **Async HTTP client** connection pooling
- **Request/response** timing middleware
- **Error tracking** and structured logging

### Monitoring Endpoints
```
GET /api/health     # Health status
GET /api/metrics    # Prometheus metrics (if enabled)
```

## 🛡 Security

### Best Practices Implemented
- Input validation with Pydantic models
- SQL injection protection
- Rate limiting ready (configurable)
- CORS configuration
- Environment-based secrets management

### API Key Management
Store API keys in `.env` file (never commit):
```env
ALPHA_VANTAGE_API_KEY=your_actual_key
FINNHUB_API_KEY=your_actual_key
```

## 🔧 Troubleshooting

### Common Issues

**Import "aiohttp" could not be resolved:**
1. Ensure virtual environment is activated
2. Run `make setup` to install dependencies
3. In VS Code: `Ctrl+Shift+P` → "Python: Select Interpreter" → Choose `.venv`

**Port 8000 already in use:**
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :8000   # Windows (find PID, then taskkill /PID xxxx)
```

**Redis connection failed:**
```bash
# Start Redis locally
redis-server
# OR with Docker
docker run -p 6379:6379 redis:7-alpine
```

**Mock data only (no real market data):**
- Check API keys in `.env` file
- Verify internet connection
- Check provider rate limits

### Debug Mode
```bash
# Enable detailed logging
export DEBUG=true
make run
```

## 📋 Development Workflow

1. **Setup:** `make setup`
2. **Code:** Write features in `app/`
3. **Test:** `make test` 
4. **Check:** `make check` (lint + type + test)
5. **Run:** `make run` (verify locally)
6. **Commit:** Git commit with descriptive message

## 🔄 Dependency Updates

```bash
# Update to latest versions
make deps-update

# Install updated dependencies  
make deps-sync

# Verify everything works
make check
```

## 📚 API Documentation

With the server running (`make run`), visit:
- **Interactive docs:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **OpenAPI JSON:** http://localhost:8000/openapi.json

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Run tests: `make check`
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open Pull Request

---

**Built with ❤️ using FastAPI, Python 3.12, and modern async patterns.**