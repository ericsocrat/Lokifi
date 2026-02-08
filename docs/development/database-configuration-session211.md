# Database Configuration Issue - Session 211

**Status**: CRITICAL BLOCKER FOR TESTING  
**Root Cause**: PostgreSQL port configuration mismatch  
**Impact**: Tests showing 0% code coverage despite 26 tests passing  
**Last Updated**: February 8, 2026

## Problem Analysis

### The Issue
- Backend expects PostgreSQL on **port 5432** (default)
- In recent sessions (209-210), PostgreSQL was restarted on **port 5433**
- Tests execute but cannot connect to database → connection silently fails → 0% coverage reported
- This masks actual test results and prevents accurate metric tracking

### Evidence
```python
# apps/backend/app/db/database.py line 23-26
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://lokifi:lokifi_dev_password@localhost:5432/lokifi_db",  # ← Expects port 5432
)
```

### Test Output
```
26 passed in 3.10s  ← Tests ARE running
❌ Required test coverage of 20% not reached. Total coverage: 0.00%  ← But database connection failed
```

## Solution

### Option A: Reset PostgreSQL to Port 5432 (RECOMMENDED)

**Step 1: Stop Docker services**
```powershell
cd c:\Users\ericsocrat\Desktop\lokifi\infra\docker
docker compose down
```

**Step 2: Start PostgreSQL on port 5432 (default)**
```powershell
docker compose up -d postgres redis
```

**Step 3: Wait for PostgreSQL to be healthy**
```powershell
Start-Sleep -Seconds 40
docker compose ps  # Verify status says "healthy"
```

**Step 4: Verify connection**
```powershell
$env:PGPASSWORD='lokifi_dev_password'
psql -h localhost -p 5432 -U lokifi -d lokifi_db -c "SELECT COUNT(*) FROM users;"
```

**Step 5: Run tests with correct DATABASE_URL**
```powershell
cd c:\Users\ericsocrat\Desktop\lokifi\apps\backend
./venv/Scripts/Activate.ps1
$env:DATABASE_URL = "postgresql+asyncpg://lokifi:lokifi_dev_password@localhost:5432/lokifi_db"
python -m pytest --cov -v
```

### Option B: Set DATABASE_URL for Port 5433 (IF USING THAT PORT)

If PostgreSQL must stay on port 5433, set environment variable before running tests:

```powershell
$env:DATABASE_URL = "postgresql+asyncpg://lokifi:lokifi_dev_password@localhost:5433/lokifi_db"
cd c:\Users\ericsocrat\Desktop\lokifi\apps\backend
./venv/Scripts/Activate.ps1
python -m pytest --cov -v
```

## Verification Checklist

- [ ] Docker PostgreSQL container running (`docker ps | grep postgres`)
- [ ] PostgreSQL responds to health check (`SELECT 1;`)
- [ ] DATABASE_URL environment variable set correctly
- [ ] Backend tests run and show coverage > 20%
- [ ] Test output shows actual coverage percentage (not 0%)

## Root Cause Analysis

**Why did this happen?**
1. Session 209: Manually restarted PostgreSQL on port 5433 for testing
2. Session 210: Security fixes focused on code quality (cyclic imports)
3. Session 211: Code quality fixes (Ruff import sorting)
4. **Gap**: No one noticed docker-compose.yml configured port 5432 while actual service was on 5433

**Prevention**:
- Always verify `docker compose ps` after restarting services
- Check `docker logs lokifi-postgres-dev` for port information
- Run quick database health check: `psql ... -c "SELECT 1;"`

## Next Steps

1. **Immediate**: Fix database port configuration (use Option A above)
2. **Follow-up**: Run complete test suite with correct DATABASE_URL
3. **Validation**: Verify coverage metrics are accurate (should be >20%)
4. **Documentation**: Update local development guide if port changes are needed

---

**Session 211 Blocker**: This issue prevents accurate test coverage reporting and needs to be resolved before the session can be considered complete.
