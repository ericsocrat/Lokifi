# PostgreSQL Setup Guide for Lokifi

## Why PostgreSQL?

Your backend was designed for PostgreSQL with:
- Native UUID support
- JSON column types
- Advanced indexing
- Better performance for production

SQLite is great for simple apps, but Lokifi needs PostgreSQL's features.

## Installation Steps

### Option 1: PostgreSQL Installer (Recommended)

1. **Download PostgreSQL**
   - Go to: https://www.postgresql.org/download/windows/
   - Download PostgreSQL 16 (latest stable)
   - Or direct link: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

2. **Run Installer**
   - Double-click the downloaded `.exe`
   - Click "Next" through setup
   - **Set a password** (remember this! Suggest: `lokifi2025`)
   - **Port**: 5432 (default - keep it)
   - Click "Next" until installed

3. **Verify Installation**
   ```powershell
   # Open PowerShell and run:
   psql --version
   # Should show: psql (PostgreSQL) 16.x
   ```

### Option 2: Docker PostgreSQL (Easier, Recommended)

If you already have Docker (you're using it for Redis):

```powershell
# Create PostgreSQL container
docker run -d `
  --name lokifi-postgres `
  -e POSTGRES_USER=lokifi `
  -e POSTGRES_PASSWORD=lokifi2025 `
  -e POSTGRES_DB=lokifi `
  -p 5432:5432 `
  --restart unless-stopped `
  postgres:16-alpine

# Check it's running
docker ps | Select-String lokifi-postgres
```

**Docker Benefits:**
- ✅ No Windows installation needed
- ✅ Easy to remove/reset
- ✅ Same as your Redis setup
- ✅ Can be in your start-servers script

## After Installation

### 1. Create Database (If using Installer method)

```powershell
# Connect to PostgreSQL
psql -U postgres

# In psql prompt:
CREATE DATABASE lokifi;
CREATE USER lokifi WITH PASSWORD 'lokifi2025';
GRANT ALL PRIVILEGES ON DATABASE lokifi TO lokifi;
\q
```

### 2. Update Backend Configuration

I'll create a `.env` file with the correct settings:

```env
# Database
DATABASE_URL=postgresql+asyncpg://lokifi:lokifi2025@localhost:5432/lokifi

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=23233
```

### 3. Run Migrations

```powershell
cd C:\Users\USER\Desktop\lokifi\backend
python -m alembic upgrade head
```

This will create all tables properly for PostgreSQL.

### 4. Test Registration

```powershell
python C:\Users\USER\Desktop\lokifi\test_register.py
```

## Quick Start Commands

### Start PostgreSQL (Docker)
```powershell
docker start lokifi-postgres
```

### Stop PostgreSQL (Docker)
```powershell
docker stop lokifi-postgres
```

### Connect to Database
```powershell
# Docker method
docker exec -it lokifi-postgres psql -U lokifi -d lokifi

# Installer method
psql -U lokifi -d lokifi -h localhost
```

### Reset Database
```powershell
# Docker - complete reset
docker stop lokifi-postgres
docker rm lokifi-postgres
# Then run the docker run command again

# Or just drop/recreate tables
docker exec -it lokifi-postgres psql -U lokifi -d lokifi -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

## Troubleshooting

**"psql: command not found"**
- Add PostgreSQL to PATH: `C:\Program Files\PostgreSQL\16\bin`
- Or use full path: `"C:\Program Files\PostgreSQL\16\bin\psql"`

**"Connection refused"**
- Check PostgreSQL is running:
  - Docker: `docker ps`
  - Service: `Get-Service -Name postgresql*`

**"Password authentication failed"**
- Check password in DATABASE_URL matches what you set during install
- Default Docker credentials: `lokifi:lokifi2025`

## Next Steps

1. Choose your installation method (Docker recommended)
2. Let me know when PostgreSQL is running
3. I'll configure the backend and run migrations
4. Test authentication!

---

**Recommendation**: Use Docker if you can. It's cleaner, easier to manage, and matches your Redis setup.
