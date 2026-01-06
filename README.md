# 🚀 Lokifi

[![CI - Fast Feedback](https://github.com/ericsocrat/Lokifi/actions/workflows/ci.yml/badge.svg)](https://github.com/ericsocrat/Lokifi/actions/workflows/ci.yml)
[![Coverage Tracking](https://github.com/ericsocrat/Lokifi/actions/workflows/coverage.yml/badge.svg)](https://github.com/ericsocrat/Lokifi/actions/workflows/coverage.yml)
[![Integration Tests](https://github.com/ericsocrat/Lokifi/actions/workflows/integration.yml/badge.svg)](https://github.com/ericsocrat/Lokifi/actions/workflows/integration.yml)
[![E2E Tests](https://github.com/ericsocrat/Lokifi/actions/workflows/e2e.yml/badge.svg)](https://github.com/ericsocrat/Lokifi/actions/workflows/e2e.yml)
[![Security Analysis](https://github.com/ericsocrat/Lokifi/actions/workflows/security.yml/badge.svg)](https://github.com/ericsocrat/Lokifi/actions/workflows/security.yml)

**Market + Social + AI-Powered Financial Intelligence Platform**

A comprehensive financial platform combining advanced market analysis with social features and AI-powered insights.

> 🔐 **Security Status**: CodeQL scanning enabled | Renovate bot active | Branch protection configured
>
> ✅ **Test Coverage**: Frontend 11.61% | Backend 51.09% | Overall 31.35% | **6,368 tests passing**
>
> ⚡ **CI/CD**: 91.3% pass rate (42/46 workflows) | Optimized pipeline saves 11-16 min/PR | 30 automated checks

---

## ✨ **Core Features**

- 📈 **Advanced Charts & Indicators**: Lightweight yet powerful trading tools
- 🌐 **Social Integration**: Community feeds, follows, and asset discussions
- 🔔 **Smart Alerts**: Price, news, and market dominance notifications
- 💼 **Portfolio Management**: Comprehensive investment tracking
- 🤖 **AI Research**: Deep analysis integration with automated summaries

---

## 📂 **Project Structure**

This project follows industry-standard monorepo architecture for scalability:

```
lokifi/
├── 🎯 apps/                 # All applications
│   ├── backend/            # FastAPI Python API
│   ├── frontend/           # Next.js React app
│   ├── admin/              # Admin panel (Phase 4)
│   ├── mobile/             # React Native app (Phase 5)
│   ├── desktop/            # Desktop app (future)
│   ├── cli/                # CLI tool (future)
│   └── docker-compose*.yml # Service orchestration
│
├── 🏗️ infra/                # Infrastructure & Platform
│   ├── docker/             # Docker configurations & Traefik
│   ├── monitoring/         # Observability stack (Prometheus, Grafana)
│   ├── security/           # Security tooling & dependency protection
│   ├── logs/               # Infrastructure logs
│   ├── performance-tests/  # Load testing
│   ├── kubernetes/         # K8s manifests (Phase 4)
│   └── terraform/          # IaC (Phase 4)
│
├── 🛠️ tools/                # Development Tools
│   └── scripts/            # Utility scripts
│
├── 📚 docs/                 # Documentation
│   ├── guides/             # Setup guides
│   ├── development/        # Dev documentation
│   └── architecture/       # System architecture
│   ├── testing/             # Testing automation
│   └── security/            # Security tools
├── 🏗️ infrastructure/       # Docker, Traefik, monitoring configs
├── 🚀 frontend/             # Next.js React application
├── ⚙️ backend/              # FastAPI Python backend
├── 📊 monitoring/           # System monitoring and observability
├── 🔒 security/             # Security tooling and dependency protection
└── 🧪 performance-tests/    # Performance testing suite
```

### 📖 **Navigation Guide**
- **👩‍💻 New Developers**: Start with [`START_HERE.md`](START_HERE.md) then [`docs/guides/`](docs/guides/)
- **🔧 Setup**: Use [`docs/guides/quick-start.md`](docs/guides/quick-start.md)
- **📚 Reference**: See [`docs/guides/QUICK_REFERENCE_GUIDE.md`](docs/guides/QUICK_REFERENCE_GUIDE.md)
- **🔍 Code Quality**: Run [`tools/codebase-analyzer.ps1`](tools/codebase-analyzer.ps1) or [`tools/test-runner.ps1`](tools/test-runner.ps1)
- **🚀 Deployment**: Follow [`docs/guides/DEPLOYMENT_GUIDE.md`](docs/guides/DEPLOYMENT_GUIDE.md)

---

## 🚀 **Quick Start**

### Prerequisites

**Node.js Version Management:**

This project uses **Node.js v22** (specified in `.nvmrc`). We recommend using [NVM (Node Version Manager)](https://github.com/nvm-sh/nvm) for automatic version switching.

```bash
# Install NVM (if not already installed)
# Windows: https://github.com/coreybutler/nvm-windows
# macOS/Linux: https://github.com/nvm-sh/nvm

# Automatic version switching (recommended)
nvm use  # Reads .nvmrc and switches to Node.js v22

# Or install Node.js v22 manually
nvm install 22
nvm use 22

# Verify version
node --version  # Should show v22.x.x
```

**Why Node.js v22?**
- ✅ Latest LTS (Long Term Support) with best performance
- ✅ Required for Next.js 16 optimal compatibility
- ✅ Ensures consistency across team and CI/CD environments
- ✅ Prevents "works on my machine" issues

### Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ericsocrat/Lokifi.git
   cd Lokifi
   ```

2. **Set up Node.js version:**
   ```bash
   nvm use  # Automatically uses Node.js v22 from .nvmrc
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

4. **Run with Docker Compose:**
   ```bash
   cd infra/docker && docker compose up
   ```

   This will start:
   - Backend API at http://localhost:8000
   - Frontend at http://localhost:3000
   - Redis cache at localhost:6379

   The services include health checks and will automatically restart if unhealthy.

### Development Setup:
```bash
cd backend
make setup  # Creates venv and installs dependencies
make dev    # Starts development server
```

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

## 🧪 Testing

**Status:** ✅ Production Ready
**Frontend:** 4,588 tests passing (11.61% line coverage, 88.7% branch coverage)
**Backend:** 1,780 tests passing (51.09% line coverage)
**Documentation:** [docs/testing/](docs/testing/)

### Quick Commands

```bash
# Frontend Tests
cd apps/frontend
npm run test              # Run all tests
npm run test:coverage     # Run with coverage report
npm run test:watch        # Run in watch mode
npm run test:ci           # Run in CI mode

# Backend Tests
cd apps/backend
pytest                    # Run all tests
pytest -v                 # Verbose output
pytest --cov              # With coverage

# E2E Tests (Playwright)
cd apps/frontend
npx playwright test       # Run E2E tests
```

### 📚 Testing Documentation

**Start here:**
- 📄 [Testing Quick Reference](docs/testing/TESTING_QUICK_REFERENCE.md) - Cheat sheet (5 min)
- 📄 [Master Testing Index](docs/testing/MASTER_TESTING_INDEX.md) - Complete guide (10 min)
- 📄 [Test Improvement Journey](docs/testing/FRONTEND_TEST_IMPROVEMENT_COMPLETE.md) - Full story (30 min)

**Current Metrics:**
- ✅ **6,368 tests passing** (4,588 frontend + 1,780 backend)
- ✅ 51.09% backend coverage (exceeds 20% threshold)
- ✅ 88.7% frontend branch coverage (excellent)
- ✅ 0 test failures
- ✅ ~135s frontend / ~216s backend test runtime

**Test Infrastructure:**
- MSW (Mock Service Worker) for API mocking
- Component mocks (Charts, Motion, Toaster)
- Vitest for unit/integration tests
- Playwright for E2E tests (separate pipeline)

For detailed testing information, see [docs/testing/README.md](docs/testing/README.md)

## � Security & Quality

### Security Features

**Active Security Measures** (Sessions 8-9):
- ✅ **CodeQL Security Scanning**: Weekly automated scans for JavaScript/TypeScript and Python
  - SQL injection, XSS, command injection detection
  - Hardcoded credentials and sensitive data exposure checks
  - Results in GitHub Security tab
- ✅ **Renovate Bot**: Intelligent dependency management
  - Smart grouping by ecosystem (React, Testing, Security)
  - Auto-merge with 3-day stability checks
  - Native lock file sync (solves Dependabot issues)
  - Monorepo-aware (frontend/backend separation)
- ✅ **Branch Protection**: Main branch requires PR approval + passing CI
- ✅ **Standardized Services**: PostgreSQL 16-alpine + Redis 7-alpine across all workflows

**Security Documentation**:
- [Session 8-9 Security & CI Resolution](docs/SESSION_8_9_SECURITY_AND_CI_RESOLUTION.md)
- [Security Guides](docs/security/)

### CI/CD Pipeline

**Status**: 🎯 91.3% pass rate (42/46 workflows) | 30 automated checks per PR

**Performance Metrics**:
- ⚡ **11-16 minutes saved per PR** - Optimized workflow execution
- 📅 **106-154 hours/year saved** - Projected annual time savings
- 💰 **53% storage cost reduction** - Optimized artifact retention
- 📉 **110+ lines removed** - Cleaner, more maintainable workflows

**Pipeline Coverage**:
- ✅ **Fast Feedback**: Linting + type checking (< 2 min)
- ✅ **Test Coverage**: Frontend + Backend unit tests
- ✅ **Integration**: API contracts + database migrations
- ✅ **E2E**: Playwright across 3 browsers × 2 shards
- ✅ **Security**: CodeQL analysis on every PR
- ✅ **Quality**: Accessibility + performance benchmarks

**Recent Optimizations** (Session 10 Extended):
- ✅ Security workflow consolidation (5-7 min savings per run)
- ✅ E2E composite action (73% line reduction, 6-9 min savings)
- ✅ Path filter optimization (4 workflows skip unnecessary runs)
- ✅ Rollup fix centralization (automatic on npm install)
- ✅ Concurrency controls (prevent redundant workflow runs)
- ✅ Artifact retention reduction (14 days instead of 30)

**Documentation**:
- [Complete Workflow Optimization Summary](docs/ci-cd/optimization.md) - 380-line comprehensive guide
- [Session 10 Extended Journey](docs/ci-cd/SESSION_10_EXTENDED_SUMMARY.md) - Complete optimization story
- [Session 8-9 Security & CI Resolution](docs/SESSION_8_9_SECURITY_AND_CI_RESOLUTION.md) - Foundation work

## �📊 Coverage Management

**Status:** ✅ Fully Automated - Zero Manual Work Required

Lokifi uses a **fully automatic coverage tracking system** integrated into CI/CD. Coverage metrics are extracted, documented, and synchronized automatically after every test run.

### 🤖 How It Works

1. **Tests Run** → CI/CD executes frontend and backend tests
2. **Coverage Extracted** → Metrics automatically pulled from test reports
3. **Config Updated** → `config/coverage.config.json` updated with latest numbers
4. **Docs Synced** → All documentation files updated automatically
5. **Auto-Committed** → Changes committed to repository with `[skip ci]` tag

**Result:** Coverage is always up-to-date across all files with zero manual intervention!

### 📈 Current Coverage

| Component | Coverage | Status | Threshold |
|-----------|----------|--------|-----------|
| **Frontend** | 11.61% | ✅ Passing | 10% |
| **Backend** | 51.09% | ✅ Passing | 20% |
| **Overall** | 31.35% | ✅ Passing | 20% |

> 📊 **Total:** 6,368 passing tests (4,588 frontend + 1,780 backend) | Last updated: January 2026

### 🔍 Local Verification

```bash
# Verify coverage is in sync (rarely needed)
npm run coverage:verify

# Manual sync if working offline
npm run coverage:sync

# Preview sync changes without applying
npm run coverage:sync:dryrun
```

### 📚 Coverage Documentation

- **Master Config:** [`config/coverage.config.json`](config/coverage.config.json) - Single source of truth
- **Coverage Baseline:** [`docs/guides/coverage.md`](docs/guides/coverage.md)
- **Automation:** Coverage tracking fully integrated in CI/CD workflows

### 🎯 Coverage Goals

- **Short-term (1-2 weeks):** Frontend 30%, Backend 40%
- **Medium-term (1 month):** Frontend 50%, Backend 60%
- **Long-term (3 months):** Frontend 70%, Backend 80%

> 💡 **Note:** You don't need to update coverage metrics manually. The CI/CD pipeline handles everything automatically!

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
LOKIFI_JWT_SECRET=your-secret-key-here

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
   LOKIFI_JWT_SECRET=secure-random-string-here
   ```

2. **Use production Docker Compose:**
   ```bash
   # Cloud deployment (managed database)
   docker compose -f infra/docker/docker-compose.prod-minimal.yml up -d

   # Self-hosted with full monitoring
   docker compose -f infra/docker/docker-compose.production.yml up -d
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
