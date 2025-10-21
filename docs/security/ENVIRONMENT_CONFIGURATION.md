# 🔐 Environment Configuration Guide

> **Central reference for all environment variables and `.env` file configuration**

**Last Updated:** October 20, 2025

## 📋 Overview

This guide provides comprehensive documentation for all environment variables used across the Lokifi application, including security best practices and configuration examples.

## 🗂️ Environment Files Structure

```env
lokifi/
├── backend/
│   ├── .env                 # Backend environment variables (gitignored)
│   └── .env.example         # Template with safe defaults
└── frontend/
    ├── .env.local           # Frontend environment variables (gitignored)
    └── .env.example         # Template with safe defaults
```env

## 🔑 Required Environment Variables

### Backend Configuration (`backend/.env`)

#### Database Configuration
```bash
# PostgreSQL Connection
DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/lokifi

# Example for development
DATABASE_URL=postgresql+asyncpg://lokifi:lokifi123@localhost:5432/lokifi

# Example for production (use strong credentials)
DATABASE_URL=postgresql+asyncpg://prod_user:STRONG_PASSWORD@db-host:5432/lokifi_prod
```bash

#### Redis Configuration
```bash
# Redis Connection
REDIS_URL=redis://:password@localhost:6379/0

# Example for development
REDIS_URL=redis://:23233@localhost:6379/0

# Example for production
REDIS_URL=redis://:STRONG_REDIS_PASSWORD@redis-host:6379/0
```bash

#### Authentication & Security
```bash
# JWT Secret (MUST be strong in production)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API Keys (if using external services)
API_KEY=your-api-key-here
API_SECRET=your-api-secret-here
```bash

#### Application Settings
```bash
# Environment mode
ENVIRONMENT=development  # Options: development, staging, production

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Debug mode
DEBUG=True  # Set to False in production
```bash

### Frontend Configuration (`frontend/.env.local`)

#### API Configuration
```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# API Version
NEXT_PUBLIC_API_VERSION=v1
```bash

#### Feature Flags
```bash
# Enable/disable features
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG=true
```bash

## 🛡️ Security Best Practices

### 1. Never Commit Real Credentials
```bash
# ❌ BAD - Real credentials in code
DATABASE_URL=postgresql://admin:admin123@prod-db:5432/lokifi

# ✅ GOOD - Use .env files (gitignored)
# Store in backend/.env, never commit
```bash

### 2. Use Strong Passwords
```bash
# ❌ BAD
JWT_SECRET=secret
REDIS_URL=redis://:password@localhost:6379/0

# ✅ GOOD
JWT_SECRET=9k#mP2$vL8@nR4&qW7!xZ6^tY5*hB3
REDIS_URL=redis://:Kd8#mL2$vP9@nR6&qW!xZ7^tY4*hB@localhost:6379/0
```bash

### 3. Environment-Specific Configuration
```bash
# Development
DEBUG=True
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://lokifi:lokifi123@localhost:5432/lokifi

# Production
DEBUG=False
ENVIRONMENT=production
DATABASE_URL=postgresql+asyncpg://prod_user:STRONG_PASSWORD@prod-db:5432/lokifi_prod
```bash

### 4. Validate Required Variables
```python
# Backend validation example
import os

required_vars = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET']
missing_vars = [var for var in required_vars if not os.getenv(var)]

if missing_vars:
    raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
```python

```typescript
// Frontend validation example
const requiredEnvVars = ['NEXT_PUBLIC_API_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}
```typescript

## 📝 Setup Instructions

### First-Time Setup

1. **Copy example files:**
   ```powershell
   # Backend
   cd backend
   copy .env.example .env

   # Frontend
   cd frontend
   copy .env.example .env.local
   ```

2. **Update with your values:**
   - Edit `backend/.env` with your database and Redis credentials
   - Edit `frontend/.env.local` with your API URL

3. **Verify configuration:**
   ```powershell
   # Backend - check environment loads correctly
   cd backend
   python -c "from app.core.config import settings; import logging; logger = logging.getLogger(__name__); logger.info(settings.DATABASE_URL)"
   ```

### Docker Setup

When using Docker, environment variables can be set in `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/lokifi
      - REDIS_URL=redis://:password@redis:6379/0
      - JWT_SECRET=${JWT_SECRET}
    env_file:
      - ./backend/.env
```yaml

## 🔍 Reference by Service

### PostgreSQL Setup
For detailed PostgreSQL configuration, see:
- [PostgreSQL Setup Guide](../guides/POSTGRESQL_SETUP_GUIDE.md)

**Required variables:**
- `DATABASE_URL` - PostgreSQL connection string

### Redis Setup
For detailed Redis configuration, see:
- [Redis Docker Setup Guide](../guides/REDIS_DOCKER_SETUP.md)

**Required variables:**
- `REDIS_URL` - Redis connection string with authentication

### Authentication Setup
For detailed authentication configuration, see:
- [Enhanced Security Setup](./ENHANCED_SECURITY_SETUP.md)

**Required variables:**
- `JWT_SECRET` - Secret key for JWT token signing
- `JWT_ALGORITHM` - Algorithm for JWT (typically HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration time

## 🐛 Troubleshooting

### Module not found / Import errors
```powershell
# Check if environment is activated
# Backend
cd backend
.\venv\Scripts\Activate.ps1

# Verify environment variables loaded
python -c "import os; import logging; logger = logging.getLogger(__name__); logger.info(os.getenv('DATABASE_URL'))"
```powershell

### Connection refused errors
```bash
# Check DATABASE_URL format
# Should be: postgresql+asyncpg://user:pass@host:port/dbname
DATABASE_URL=postgresql+asyncpg://lokifi:lokifi123@localhost:5432/lokifi

# Check REDIS_URL format
# Should be: redis://:password@host:port/db
REDIS_URL=redis://:23233@localhost:6379/0
```bash

### Environment variables not loading
1. Verify `.env` file exists in correct location
2. Check file is named exactly `.env` (not `.env.txt`)
3. Ensure no spaces around `=` in variable assignments
4. Restart application after changing environment variables

## 📚 Additional Resources

- [Security README](./README.md) - Security overview and best practices
- [Quick Start Guide](../QUICK_START.md) - Initial project setup
- [Developer Workflow](../guides/DEVELOPER_WORKFLOW.md) - Development environment setup

## ⚠️ Important Notes

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use `.env.example`** - Commit these as templates (with placeholder values)
3. **Rotate credentials regularly** - Especially for production environments
4. **Use different credentials** - For development, staging, and production
5. **Validate on startup** - Ensure all required variables are set before running

---

**For environment-specific configuration issues, always refer to this guide first.**