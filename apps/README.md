# 🚀 Applications

This directory contains all application code for the Lokifi platform.

---

## 📱 Current Applications

### 1. **Backend** (`backend/`)
- **Type**: REST API + WebSocket Server
- **Technology**: FastAPI (Python 3.11+)
- **Purpose**: Core business logic, data management, real-time updates
- **Port**: 8000
- **Status**: ✅ Production Ready

**Key Features:**
- User authentication & authorization
- Real-time market data aggregation
- Portfolio management
- AI-powered chatbot
- Social features (follow, messaging)
- WebSocket price streaming

**Quick Start:**
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

### 2. **Frontend** (`frontend/`)
- **Type**: Web Application
- **Technology**: Next.js 14 + React 18 + TypeScript
- **Purpose**: User interface for trading platform
- **Port**: 3000
- **Status**: ✅ Production Ready

**Key Features:**
- Advanced charting (TradingView-style)
- Real-time price updates
- Portfolio dashboard
- Social feed
- AI chat assistant
- Alert management

**Quick Start:**
```bash
cd frontend
npm install
npm run dev
```

---

## 🔮 Planned Applications

### 3. **Admin Panel** (`admin/`) - Coming Soon
- **Type**: Internal Admin Dashboard
- **Technology**: Next.js + React Admin
- **Purpose**: Platform administration, user management, analytics
- **Status**: 📋 Planned for Phase 4

**Planned Features:**
- User account management
- Platform analytics & metrics
- Content moderation
- System health monitoring
- Feature flag management
- API key management

**Directory Structure:**
```
admin/
├── src/
│   ├── pages/
│   ├── components/
│   └── lib/
├── package.json
└── README.md
```

---

### 4. **Mobile App** (`mobile/`) - Coming Soon
- **Type**: Cross-Platform Mobile App
- **Technology**: React Native + Expo
- **Purpose**: Mobile trading experience
- **Status**: 📋 Planned for Phase 5

**Planned Features:**
- Native mobile UI/UX
- Push notifications
- Biometric authentication
- Offline portfolio tracking
- Quick trade execution
- Mobile-optimized charts

**Directory Structure:**
```
mobile/
├── src/
│   ├── screens/
│   ├── components/
│   └── navigation/
├── ios/
├── android/
├── app.json
└── package.json
```

---

### 5. **Desktop App** (`desktop/`) - Future Consideration
- **Type**: Native Desktop Application
- **Technology**: Electron or Tauri
- **Purpose**: High-performance desktop trading
- **Status**: 💭 Under Consideration

**Potential Features:**
- Multi-monitor support
- Advanced keyboard shortcuts
- System tray integration
- Local data caching
- Hardware acceleration

---

### 6. **CLI Tool** (`cli/`) - Future Consideration
- **Type**: Command-Line Interface
- **Technology**: Python Click or Node.js Commander
- **Purpose**: Automation, scripting, power users
- **Status**: 💭 Under Consideration

**Potential Features:**
- Portfolio management from terminal
- Price alerts
- Market data queries
- Bulk operations
- Script automation

---

## 🏗️ Architecture

### Multi-App Strategy
All applications share:
- **Common Backend API** (apps/backend)
- **Unified Auth System** (JWT tokens)
- **Shared Redis Cache** (infra/redis)
- **Common Database** (PostgreSQL)

### Communication
```
┌─────────────┐
│   Frontend  │──────┐
└─────────────┘      │
                     ├──► Backend API ──► Database
┌─────────────┐      │         │
│   Mobile    │──────┘         └──► Redis Cache
└─────────────┘                │
                               └──► External APIs
┌─────────────┐
│    Admin    │──────────────► Backend API
└─────────────┘
```

---

## 🚀 Running Applications

### Development Mode (All Apps)
From project root:
```bash
# Using Lokifi manager
..\tools\lokifi.ps1 servers

# Or using Docker Compose
cd apps
docker-compose up -d
```

### Individual Apps
```bash
# Backend only
cd apps/backend
python -m uvicorn app.main:app --reload

# Frontend only
cd apps/frontend
npm run dev

# Admin (when available)
cd apps/admin
npm run dev

# Mobile (when available)
cd apps/mobile
npx expo start
```

---

## 📦 Dependencies

### Shared Dependencies
- **Authentication**: JWT tokens via backend API
- **Real-time Updates**: WebSocket connections
- **State Management**: React Query (frontend/admin), React Native async storage (mobile)
- **Styling**: Tailwind CSS (web), React Native (mobile)

### Environment Variables
Each app maintains its own `.env` file:
- `apps/backend/.env` - Backend configuration
- `apps/frontend/.env.local` - Frontend configuration
- `apps/admin/.env.local` - Admin configuration (future)
- `apps/mobile/.env` - Mobile configuration (future)

---

## 🧪 Testing

### Test Strategy
- **Backend**: pytest, coverage reports
- **Frontend**: Jest, React Testing Library, Playwright
- **Admin**: Jest, React Testing Library (future)
- **Mobile**: Jest, Detox (future)

### Running Tests
```bash
# Backend tests
cd apps/backend
pytest

# Frontend tests
cd apps/frontend
npm test

# E2E tests
cd apps/frontend
npm run test:e2e
```

---

## 📊 Monitoring

All applications report metrics to:
- **Application Performance**: Sentry
- **Infrastructure Metrics**: Prometheus (via infra/monitoring)
- **Log Aggregation**: Centralized logging (infra/monitoring)

---

## 🔒 Security

### Security Measures
- **API Authentication**: JWT with refresh tokens
- **Rate Limiting**: Per-endpoint rate limits
- **Input Validation**: Pydantic (backend), Zod (frontend)
- **CORS**: Configured per environment
- **Secret Management**: Environment variables, never committed

### Security Scanning
See `infra/security/` for security tooling and policies.

---

## 📚 Documentation

- **Backend API**: See `apps/backend/README.md` and API docs at `/docs`
- **Frontend**: See `apps/frontend/README.md`
- **Architecture**: See root `/docs/ARCHITECTURE.md`

---

## 🎯 Adding a New Application

1. **Create directory**: `apps/your-app-name/`
2. **Initialize project**: Use appropriate scaffolding tool
3. **Add README**: Document purpose, setup, and usage
4. **Update this file**: Add section for new app
5. **Configure CI/CD**: Add build/test pipelines
6. **Update docker-compose**: Add service definition if needed

---

## 🤝 Contributing

When working on applications:
1. Follow the established architecture patterns
2. Maintain consistent code style per app
3. Write tests for new features
4. Update relevant documentation
5. Use feature flags for experimental features

---

**Status**: 2 apps live, 4 planned  
**Last Updated**: October 8, 2025
