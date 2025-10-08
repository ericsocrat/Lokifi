# 🚀 Lokifi

**Market + Social + AI Super-App**

A comprehensive financial platform combining advanced market analysis with social features and AI-powered insights.

---

## ✨ **Core Features**

- 📈 **Advanced Charts & Indicators**: Lightweight yet powerful trading tools
- 🌐 **Social Integration**: Community feeds, follows, and asset discussions
- 🔔 **Smart Alerts**: Price, news, and market dominance notifications
- 💼 **Portfolio Management**: Comprehensive investment tracking
- 🤖 **AI Research**: Deep analysis integration with automated summaries

---

## 📂 **Project Structure**

This project follows a well-organized, enterprise-ready structure:

```
lokifi/
├── 📚 docs/
│   ├── guides/               # Setup and reference guides
│   ├── optimization-reports/ # Performance optimization reports
│   ├── development/          # Development documentation
│   ├── project-management/   # Project planning and tracking
│   └── security/             # Security documentation
├── 🔧 scripts/
│   ├── analysis/            # Code quality and health analysis
│   ├── cleanup/             # Repository maintenance tools
│   ├── fixes/               # Automated code fixes
│   ├── development/         # Development automation
│   ├── deployment/          # Deployment scripts
│   ├── testing/             # Testing automation
│   └── security/            # Security tools
├── 🏗️ infrastructure/       # Docker, nginx, monitoring configs
├── 🚀 frontend/             # Next.js React application
├── ⚙️ backend/              # FastAPI Python backend
├── 📊 monitoring/           # System monitoring and observability
├── � security/             # Security configs and audit tools
├── 📦 redis/                # Redis configuration
└── 🧪 performance-tests/    # Performance testing suite
```

### 📖 **Navigation Guide**
- **👩‍💻 New Developers**: Start with [`START_HERE.md`](START_HERE.md) then [`docs/guides/`](docs/guides/)
- **🔧 Setup**: Use [`docs/guides/QUICK_START_GUIDE.md`](docs/guides/QUICK_START_GUIDE.md)
- **� Reference**: See [`docs/guides/QUICK_REFERENCE_GUIDE.md`](docs/guides/QUICK_REFERENCE_GUIDE.md)
- **� Code Quality**: Run [`scripts/analysis/analyze-and-optimize.ps1`](scripts/analysis/analyze-and-optimize.ps1)
- **� Deployment**: Follow [`docs/guides/DEPLOYMENT_GUIDE.md`](docs/guides/DEPLOYMENT_GUIDE.md)

---

## 🚀 **Quick Start**

### Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ericsocrat/Lokifi.git
   cd Lokifi
   ```

2. **Set up environment variables:**
   ```bash
   cp security/configs/.env.example security/configs/.env
   # Edit .env with your configuration (see Feature Flags section)
   ```

3. **Run with Docker Compose:**
   ```bash
   docker-compose -f infrastructure/docker/docker-compose.yml up
   ```

   This will start:
   - Backend API at http://localhost:8000
   - Frontend at http://localhost:3000
   - Redis cache at localhost:6379

   The services include health checks and will automatically restart if unhealthy.

### Alternative: Local Development

**Backend:**
```bash
cd backend
make setup  # Creates venv and installs dependencies
make dev    # Starts development server
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Feature Flags

Lokifi uses a comprehensive feature flag system for safe rollouts. All Part G enhancements are **OFF by default**.

### Available Flags

| Flag | Description | Default |
|------|-------------|---------|
| `NEXT_PUBLIC_FLAG_MULTI_CHART` | Multi-chart layouts with linking | OFF |
| `NEXT_PUBLIC_FLAG_WATCHLIST` | Watchlists and screener | OFF |
| `NEXT_PUBLIC_FLAG_SCREENER` | Basic stock screener | OFF |
| `NEXT_PUBLIC_FLAG_CORP_ACTIONS` | Corporate actions & sessions | OFF |
| `NEXT_PUBLIC_FLAG_TEMPLATES` | Chart templates & export | OFF |
| `NEXT_PUBLIC_FLAG_IMG_EXPORT` | Image export functionality | OFF |
| `NEXT_PUBLIC_FLAG_ALERTS_V2` | Enhanced alerts system | OFF |
| `NEXT_PUBLIC_FLAG_BACKTESTER` | Strategy backtesting | OFF |
| `NEXT_PUBLIC_FLAG_PROVIDER_RELIABILITY` | Enhanced provider resilience | OFF |
| `NEXT_PUBLIC_FLAG_SOCIAL` | Social features | OFF |
| `NEXT_PUBLIC_FLAG_PAPER_TRADING` | Paper trading & portfolio | OFF |
| `NEXT_PUBLIC_FLAG_OTEL` | OpenTelemetry observability | OFF |
| `NEXT_PUBLIC_FLAG_VISUAL_REGRESSION` | Visual regression testing | OFF |
| `NEXT_PUBLIC_FLAG_FIRST_RUN_TOUR` | Onboarding tour | OFF |

### Enabling Features

**Environment Variables (.env):**
```bash
NEXT_PUBLIC_FLAG_MULTI_CHART=1
NEXT_PUBLIC_FLAG_WATCHLIST=1
```

**Development Debug Page:**
Visit `/dev/flags` (development only) to toggle flags live.

### Multi-Chart Example

Enable multi-chart layouts:
```bash
NEXT_PUBLIC_FLAG_MULTI_CHART=1
```

Features:
- 1×1, 1×2, 2×2 grid layouts
- Symbol/timeframe/cursor linking
- Per-user persistence with schema versioning

## Architecture

### Backend (FastAPI)
- **Versioned APIs** with OpenAPI contracts
- **Provider abstraction** with failover and rate limiting
- **Plugin SDK** for indicators and drawing tools
- **Observability** with OpenTelemetry (when enabled)

### Frontend (Next.js)
- **Typed API clients** with zod validation
- **Feature-flagged components** with graceful degradation
- **Versioned state migrations** for client persistence
- **Web Workers** for heavy computations
- **Comprehensive testing** (unit/integration/e2e/visual)

### Infrastructure
- **Redis** for caching and remote config
- **Docker** containerization with health checks
- **CI/CD** with contract testing and feature flag gates
npm run dev
```

## Testing

### Frontend Tests
```bash
cd frontend
npm run typecheck    # TypeScript type checking
npm run test         # Run tests with Vitest
npm run test:ci      # Run tests in CI mode
```

### Backend Tests
```bash
cd backend
pytest               # Run all tests
pytest -v            # Verbose output
```

### Integration Tests
```bash
docker compose up --build    # Build and start all services
# Services will be healthy when health endpoints return 200 OK
```

## Health Endpoints

The application provides health check endpoints for monitoring:

- **Backend Health:**
  - `GET /api/health` - Main health endpoint
  - `GET /health` - Alternative health endpoint
  - Returns: `{"ok": true}`

- **Frontend Health:**
  - `GET /api/health` - Next.js API route
  - Returns: `{"ok": true}`

These endpoints are used by Docker health checks and can be integrated with monitoring systems.

## Environment Variables

### Required Variables

Copy `.env.example` to `.env` and configure:

```bash
# JWT Configuration (Required in Production)
FYNIX_JWT_SECRET=your-secret-key-here

# Frontend Configuration
FRONTEND_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Optional API Keys

Configure external data sources by adding API keys to your `.env`:

```bash
# Market Data
POLYGON_KEY=your-polygon-key
ALPHAVANTAGE_KEY=your-alphavantage-key
FINNHUB_KEY=your-finnhub-key
FMP_KEY=your-financial-modeling-prep-key

# Crypto Data
COINGECKO_KEY=your-coingecko-key
CMC_KEY=your-coinmarketcap-key

# News APIs
NEWSAPI_KEY=your-newsapi-key
MARKETAUX_KEY=your-marketaux-key

# AI/LLM Integration
OPENAI_API_KEY=your-openai-key
```

### Environment Configuration Files

- **`.env.example`** - Template with all available environment variables
- **`.env`** - Your local configuration (not committed to git)
- **`.env.local`** - Next.js local overrides (frontend-specific)

## Production Deployment

### Production Configuration

1. **Update environment variables:**
   ```bash
   FRONTEND_ORIGIN=https://your-domain.com
   CORS_ORIGINS=["https://your-domain.com"]
   NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
   FYNIX_JWT_SECRET=secure-random-string-here
   ```

2. **Use production Docker Compose:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

### Monitoring & Health Checks

- Health checks are configured in `docker-compose.yml`
- Unhealthy containers will automatically restart
- Frontend waits for backend to be healthy before starting
- All services include health check endpoints for external monitoring

### Multi-stage Builds

The Docker images use multi-stage builds to optimize size:
- Frontend: `deps` → `build` → `prod` stages
- Backend: Minimal Python image with only required dependencies

## CI/CD

GitHub Actions workflows:

- **Frontend CI** (`.github/workflows/frontend-ci.yml`): TypeScript, linting, tests
- **Backend CI** (`.github/workflows/backend-ci.yml`): Python linting (ruff/black), pytest
- **Integration CI** (`.github/workflows/integration-ci.yml`): Full docker-compose stack with health checks

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │     Redis       │
│   (Next.js)     │───▶│   (FastAPI)     │───▶│    (Cache)      │
│   Port 3000     │    │   Port 8000     │    │   Port 6379     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

- **Frontend**: React/Next.js with TypeScript
- **Backend**: Python FastAPI with async/await
- **Cache**: Redis for session storage and pub/sub
- **Charts**: Lightweight Charts library with custom indicators
- **State**: Zustand for client-side state management

## Development

- **Do NOT commit `.env` secrets**
- Use `npm run typecheck` before commits
- Run tests with `npm test` (frontend) and `pytest` (backend)
- Health endpoints should always be accessible for monitoring
