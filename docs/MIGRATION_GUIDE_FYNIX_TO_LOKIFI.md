# Migration Guide: Fynix → Lokifi Rebranding

**Created**: January 2025
**Status**: BREAKING CHANGES - ACTION REQUIRED
**Impact**: High - All deployments and users affected

---

## 🚨 Critical Breaking Changes

### 1. Environment Variables (Backend) - **IMMEDIATE ACTION REQUIRED**

All environment variables have been renamed from `FYNIX_*` to `LOKIFI_*`:

| Old Name | New Name | Required | Default |
|----------|----------|----------|---------|
| `FYNIX_JWT_SECRET` | `LOKIFI_JWT_SECRET` | ✅ YES | None |
| `FYNIX_JWT_TTL_MIN` | `LOKIFI_JWT_TTL_MIN` | ❌ No | 60 |
| `FYNIX_DB_PATH` | `LOKIFI_DB_PATH` | ❌ No | `lokifi.sqlite` |
| `FYNIX_ALERTS_PATH` | `LOKIFI_ALERTS_PATH` | ❌ No | `logs/alerts` |
| `FYNIX_ALERTS_INTERVAL` | `LOKIFI_ALERTS_INTERVAL` | ❌ No | 300 |

#### Action Required:

**Update your `.env` file:**
```bash
# Old (WILL NOT WORK)
FYNIX_JWT_SECRET=your-secret-key

# New (REQUIRED)
LOKIFI_JWT_SECRET=your-secret-key
```

**Generate new secrets (recommended):**
```bash
# Use the secret generator script
python tools/scripts/security/generate_secrets.py

# Or generate manually
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

**Update deployment configurations:**
- Docker Compose: Update environment variables in all compose files
- Kubernetes: Update ConfigMaps and Secrets
- Cloud services: Update environment variable settings (AWS ECS, Azure App Service, etc.)

⚠️ **CRITICAL**: Backend will fail to start without `LOKIFI_JWT_SECRET` set!

---

### 2. User Authentication (Frontend) - **USERS MUST RE-LOGIN**

The localStorage key for authentication tokens has changed:

| Old Key | New Key |
|---------|---------|
| `fynix_token` | `lokifi_token` |

#### Impact:
- All users will be automatically logged out
- Users must log in again with their credentials
- No data loss - only session tokens are affected

#### Communication Template:
```
Subject: System Maintenance - Re-login Required

Hi [User],

We've completed a system upgrade. Please log in again to continue using the platform.

- Your account and data are safe
- No passwords were changed
- This is a one-time requirement

Thank you for your patience!
```

---

### 3. Database Files (Backend)

Default database filename has changed:

| Old Name | New Name |
|----------|----------|
| `fynix.sqlite` | `lokifi.sqlite` |

#### Migration Options:

**Option A: Rename existing database (recommended)**
```bash
cd apps/backend
mv fynix.sqlite lokifi.sqlite
```

**Option B: Set custom database path**
```bash
# In .env file
LOKIFI_DB_PATH=fynix.sqlite  # Keep old name
```

**Option C: Fresh start (development only)**
```bash
cd apps/backend
rm fynix.sqlite
python init_db.py
```

---

### 4. Celery Task Names (Backend)

Celery application name has changed:

| Old Name | New Name |
|----------|----------|
| `fynix_maintenance` | `lokifi_maintenance` |

#### Action Required:
- Restart all Celery workers
- Clear any pending tasks in Redis
- Update monitoring dashboards

```bash
# Clear Redis task queue
redis-cli FLUSHDB

# Restart Celery workers
make celery-restart
```

---

### 5. Internal Code Identifiers

#### Frontend (51 files updated)
- Window APIs: `__fynixChart` → `__lokifiChart`, `__fynixCandle` → `__lokifiCandle`, etc.
- Type definitions: `FynixWindow` → `LokifiWindow`, `FynixPlugin` → `LokifiPlugin`
- Test data: `fynix_test` → `lokifi_test`, `fynix_backup` → `lokifi_backup`

#### Backend (8 files updated)
- Config properties: `settings.fynix_jwt_secret` → `settings.lokifi_jwt_secret`
- Alert paths: `FYNIX_ALERTS_PATH` → `LOKIFI_ALERTS_PATH`

**No action required** - these are internal changes handled by the codebase update.

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Review all environment variables in `.env` files
- [ ] Generate new `LOKIFI_JWT_SECRET` using generate_secrets.py
- [ ] Update Docker Compose files with new environment variables
- [ ] Update CI/CD pipelines with new environment variables
- [ ] Plan user communication about re-login requirement
- [ ] Backup existing database files
- [ ] Test deployment in staging environment

### Deployment
- [ ] Stop all running services (backend, Celery, frontend)
- [ ] Rename `fynix.sqlite` to `lokifi.sqlite` (or set LOKIFI_DB_PATH)
- [ ] Update environment variables in production
- [ ] Deploy new backend code
- [ ] Clear Redis task queue
- [ ] Restart Celery workers
- [ ] Deploy new frontend code
- [ ] Verify health checks pass

### Post-Deployment
- [ ] Verify backend starts successfully
- [ ] Test user login flow
- [ ] Check Celery tasks are running
- [ ] Monitor error logs for any issues
- [ ] Send user communication about re-login
- [ ] Update documentation and runbooks

---

## 🧪 Testing Checklist

### Backend Testing
```bash
cd apps/backend

# Test configuration loads correctly
python -c "from app.core.config import settings; print(settings.lokifi_jwt_secret)"

# Run full test suite
make test

# Check type errors
make type-check-all
```

### Frontend Testing
```bash
cd apps/frontend

# Build and check for errors
npm run build

# Run test suite
npm test

# Check localStorage migration
# Open browser console and check for 'lokifi_token' key
```

### Integration Testing
- [ ] User registration works
- [ ] User login works (new token stored as 'lokifi_token')
- [ ] Chart plugins load correctly
- [ ] WebSocket connections establish
- [ ] Background tasks execute
- [ ] API endpoints respond correctly

---

## 🔍 Troubleshooting

### Backend won't start
**Error**: `ValidationError: LOKIFI_JWT_SECRET is required`
**Solution**: Set `LOKIFI_JWT_SECRET` in your `.env` file

### Database not found
**Error**: `Could not find database at lokifi.sqlite`
**Solution**: Rename `fynix.sqlite` to `lokifi.sqlite` or set `LOKIFI_DB_PATH=fynix.sqlite`

### Users can't login
**Symptom**: "Invalid token" or "Token expired" errors
**Solution**: This is expected - users must log in again with their credentials

### Celery tasks not running
**Symptom**: No background tasks executing
**Solution**: Restart Celery workers and clear Redis queue

### Frontend build errors
**Error**: Type errors after strict typing update
**Solution**: See `docs/development/STRICT_TYPING_GUIDE.md` for fixes

---

## 📊 Rollback Plan

If critical issues occur, you can rollback:

### 1. Revert Environment Variables
```bash
# In .env file - change back to:
FYNIX_JWT_SECRET=your-secret-key
```

### 2. Revert Code
```bash
# Find the commit before rebranding
git log --oneline | grep -i fynix

# Revert to that commit
git revert <commit-hash>
git push origin main
```

### 3. Restore Database
```bash
cd apps/backend
mv lokifi.sqlite lokifi.sqlite.backup
mv fynix.sqlite.backup fynix.sqlite
```

---

## 🎯 Related Commits

- `60543a2a` - User-facing branding (9 files)
- `32c13596` - Frontend internal identifiers (51 files)
- `2441fe14` - Backend internal identifiers (8 files)
- `a4657a1d` - Strict typing implementation (5 files)

---

## 📚 Additional Resources

- [Strict Typing Guide](./development/STRICT_TYPING_GUIDE.md) - New type checking configuration
- [README.md](../README.md) - Updated setup instructions with new env vars
- [Secret Generator](../tools/scripts/security/generate_secrets.py) - Generate secure secrets
- [Testing Report](./testing/TESTING_SESSION_REPORT.md) - Previous migration testing

---

## 💡 Questions?

If you encounter issues during migration:

1. Check the troubleshooting section above
2. Review error logs in `infra/logs/`
3. Check GitHub Issues for known problems
4. Contact the development team

---

**Last Updated**: January 2025
**Next Review**: After production deployment
