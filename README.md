# Fynix

Market + Social + AI Super-App

- Lightweight/advanced charts + indicators  
- Social feed, follows, per-asset discussions  
- Alerts (price/news/BTC dominance), portfolios  
- Deep Research integration for analysis & summaries

## Quick Start

### Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ericsocrat/Fynix.git
   cd Fynix
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (see Environment Variables section)
   ```

3. **Run with Docker Compose:**
   ```bash
   docker compose up
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
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install --legacy-peer-deps
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
