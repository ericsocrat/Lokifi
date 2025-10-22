# PostgreSQL Setup Guide for Lokifi

## Current Status
- ❌ PostgreSQL not installed
- ✅ Backend designed for PostgreSQL
- ✅ SQLite database exists but incompatible with UUID types

## Why PostgreSQL?
Your backend models use PostgreSQL-specific features:
- Native UUID type support
- Better performance for production
- JSONB support
- Full-text search capabilities
- Proper relationship handling

## Installation Options

### Option 1: Chocolatey (Recommended - Fastest)
```powershell
# Install Chocolatey if not already installed
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install PostgreSQL
choco install postgresql14 -y

# Refresh environment
refreshenv
```

### Option 2: Official Installer (Manual)
1. Download from: https://www.postgresql.org/download/windows/
2. Run the installer (postgresql-16.x-windows-x64.exe)
3. During installation:
   - Port: 5432 (default)
   - Password: Choose a secure password (e.g., "lokifi123")
   - Locale: Default
   - **IMPORTANT**: Remember your postgres password!

### Option 3: Docker (Easiest for Development)
```powershell
# Create PostgreSQL container
docker run -d `
  --name lokifi-postgres `
  -e POSTGRES_DB=lokifi `
  -e POSTGRES_USER=lokifi `
  -e POSTGRES_PASSWORD=lokifi123 `
  -p 5432:5432 `
  --restart unless-stopped `
  postgres:16-alpine

# Verify it's running
docker ps | Select-String "lokifi-postgres"
```

## After Installation

### 1. Create Lokifi Database
```powershell
# If using Docker (no password needed, already created)
docker exec -it lokifi-postgres psql -U lokifi -d lokifi

# If using native PostgreSQL
psql -U postgres

# Then run:
CREATE DATABASE lokifi;
CREATE USER lokifi WITH PASSWORD 'lokifi123';
GRANT ALL PRIVILEGES ON DATABASE lokifi TO lokifi;
\q
```

### 2. Update Backend Configuration

**📖 For complete environment configuration:**
- See [Environment Configuration Guide](../security/ENVIRONMENT_CONFIGURATION.md#database-configuration) for `DATABASE_URL` setup and examples

The `DATABASE_URL` environment variable will be set in `backend/.env`.

### 3. Run Database Migrations
```powershell
python -m alembic upgrade head
```

**📖 For directory navigation:** See [`../QUICK_START.md`](../QUICK_START.md) for complete backend setup workflows

## Quick Start Commands

After PostgreSQL is running:
```powershell
# Test connection
psql -U lokifi -d lokifi -h localhost

# View tables
\dt

# View specific table
\d users

# Exit
\q
```

## Troubleshooting

### "psql: command not found"
Add PostgreSQL to PATH:
```
C:\Program Files\PostgreSQL\16\bin
```

### Connection refused
Check if PostgreSQL service is running:
```powershell
Get-Service -Name postgresql*
# Or for Docker:
docker ps | Select-String postgres
```

### "password authentication failed"
Double-check the password you set during installation.

## Next Steps
1. Choose an installation method above
2. Install PostgreSQL
3. Create the lokifi database
4. Run the setup script I'll create
5. Test authentication!
