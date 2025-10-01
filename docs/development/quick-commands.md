# ⚡ Quick Command Reference for Lokifi

## 🔥 Super Quick Commands

```bash
# Start everything (most common)
make start          # Setup + start both backend & frontend

# Development shortcuts  
make s              # Start dev servers (super short!)
make be             # Backend only
make fe             # Frontend only
make t              # Run tests
make l              # Lint code
make f              # Format code
```

## 🎯 Most Used Commands

### Development
- `make dev` - Start both servers
- `make be` or `make api` - Backend only (FastAPI on :8000)
- `make fe` or `make web` - Frontend only (Next.js on :3000)

### Testing
- `make test` - All tests
- `make test-be` - Backend tests only
- `make test-fe` - Frontend tests only
- `make test-e2e` - End-to-end tests

### Code Quality
- `make lint` - Lint everything
- `make format` - Format everything
- `make check` - Lint + test everything

### Setup & Maintenance
- `make setup` - Initial setup
- `make install` - Update dependencies
- `make clean` - Clear caches
- `make reset` - Full reset

## 🐳 Docker Commands

```bash
make docker         # Build & run containers
make docker-dev     # Development containers
make docker-prod    # Production deployment
```

## 📊 Monitoring & Health

```bash
make status         # System health check
make logs           # View recent logs
make monitor        # Start monitoring services
make redis          # Start Redis server
```

## 🏗️ Production

```bash
make build          # Build production assets
make deploy         # Deploy to production
```

## 💡 Pro Tips

1. **Quick Start**: `make start` sets up everything and starts both servers
2. **Backend Only**: `make be` for API development
3. **Frontend Only**: `make fe` for UI development
4. **Test Everything**: `make check` runs all quality checks
5. **Clean Slate**: `make reset` for a fresh start

## 🪟 Windows Users

All commands work with:
- **PowerShell** (recommended)
- **Command Prompt**
- **Git Bash**
- **WSL**

Make sure you have `make` installed:
```powershell
# Install via Chocolatey
choco install make

# Or use GNU Make for Windows
winget install GnuWin32.Make
```

## 🔧 Backend-Only Commands (cd backend)

```bash
make dev            # Start FastAPI server
make test           # Run Python tests
make lint-fix       # Auto-fix linting issues
make db-init        # Initialize database
make shell          # Python shell with app context
```

## 🌐 Frontend-Only Commands (cd frontend)

```bash
npm run dev         # Start Next.js server
npm run build       # Build for production
npm run test        # Run tests
npm run lint        # Lint TypeScript/React
```

## 🚨 Troubleshooting

If commands fail:
1. `make setup` - Ensure environments are set up
2. `make clean` - Clear caches
3. `make reset` - Nuclear option (full reset)
4. Check you're in the right directory
5. Ensure Node.js and Python are installed