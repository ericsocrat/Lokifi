# 🎨 LOKIFI → LOKIFI REBRANDING CHECKLIST

**Date:** October 2, 2025
**New Brand:** Lokifi
**Domain:** lokifi.com

---

## ✅ AUTOMATED REBRANDING (Run Script First!)

### **Step 1: Run the Rebranding Script**

```powershell
# From project root (C:\Users\USER\Desktop\lokifi)

# First, do a dry run to see what will change
python rebrand_to_lokifi.py --dry-run

# If everything looks good, run for real
python rebrand_to_lokifi.py

# The script will:
# ✅ Replace all "Lokifi" with "Lokifi" in code
# ✅ Replace all "lokifi" with "lokifi" in code
# ✅ Replace all "LOKIFI" with "LOKIFI" in code
# ✅ Rename files containing "lokifi" in their names
# ✅ Rename directories containing "lokifi" in their names
```

**The script processes:**

- Python files (.py)
- JavaScript/TypeScript files (.js, .jsx, .ts, .tsx)
- Config files (.json, .yml, .yaml, .toml, .ini)
- Documentation (.md, .txt)
- Scripts (.sh, .bat, .ps1)
- HTML/CSS (.html, .css, .scss)
- Environment templates (.env.example)

**The script skips:**

- node_modules/
- venv/
- .git/
- **pycache**/
- uploads/
- logs/
- domain_research/ (historical documentation)
- .sqlite files
- .db files

---

## 📋 MANUAL CHANGES (Do After Script)

### **1. Project Folder Name**

```powershell
# Rename the main project folder
cd C:\Users\USER\Desktop
Rename-Item -Path "lokifi" -NewName "lokifi"
cd lokifi

# Update any absolute paths in your IDE/editor
# - VS Code workspace settings
# - PyCharm project settings
# - Git remote if using SSH with absolute paths
```

### **2. Frontend Package Files**

**Check and update these manually:**

#### **frontend/package.json**

```json
{
  "name": "lokifi-frontend", // Change from lokifi-frontend
  "description": "Lokifi - AI-powered fintech platform",
  "homepage": "https://lokifi.com",
  "repository": {
    "url": "https://github.com/ericsocrat/lokifi" // Update if needed
  }
}
```

#### **frontend/package-lock.json**

```json
{
  "name": "lokifi-frontend", // Should auto-update on next npm install
  "packages": {
    "": {
      "name": "lokifi-frontend"
    }
  }
}
```

### **3. Backend Package Files**

#### **backend/setup.py** (if exists)

```python
setup(
    name='lokifi',  # Change from lokifi
    description='Lokifi - AI-powered fintech platform',
    url='https://lokifi.com',
    # ... rest of config
)
```

#### **backend/pyproject.toml** (if exists)

```toml
[project]
name = "lokifi"  # Change from lokifi
description = "Lokifi - AI-powered fintech platform"
```

### **4. README Files**

Update the main README.md:

```markdown
# 🚀 Lokifi

AI-powered fintech platform for [your value proposition]

## About Lokifi

Lokifi is a modern financial technology platform...

## Website

https://lokifi.com

## Social Media

- Twitter: [@lokifi_official](https://twitter.com/lokifi_official)
- Instagram: [@lokifi_official](https://instagram.com/lokifi_official)
- Discord: lokifi_official
```

### **5. Environment Files**

#### **.env.example** and **.env.template**

```env
# Lokifi Configuration

PROJECT_NAME=Lokifi
DOMAIN=lokifi.com

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/lokifi_production

# JWT
LOKIFI_JWT_SECRET=your-secret-here
LOKIFI_JWT_TTL_MIN=1440

# CORS
CORS_ORIGINS=https://lokifi.com,https://www.lokifi.com

# Email
EMAIL_FROM=noreply@lokifi.com
```

#### **Your actual .env file** (⚠️ IMPORTANT)

```powershell
# Update your actual .env file manually
# The script skips .env files for safety
notepad backend\.env
# or
notepad .env
```

### **6. Docker Files**

#### **docker-compose.yml**

```yaml
services:
  lokifi-backend: # Change from lokifi-backend
    container_name: lokifi-backend
    image: lokifi/backend:latest

  lokifi-frontend: # Change from lokifi-frontend
    container_name: lokifi-frontend
    image: lokifi/frontend:latest

  lokifi-db: # Change from lokifi-db
    container_name: lokifi-db

networks:
  lokifi-network: # Change from lokifi-network
```

#### **Dockerfile**

```dockerfile
# Should be handled by script, but double-check:
LABEL maintainer="Lokifi Team"
ENV APP_NAME=lokifi
```

### **7. Database**

#### **Database Name**

```sql
-- If using PostgreSQL, rename database:
ALTER DATABASE lokifi RENAME TO lokifi;
-- or
ALTER DATABASE fynix_production RENAME TO lokifi_production;

-- Update connection strings everywhere!
```

#### **SQLite Files**

```powershell
# Rename SQLite database files
Rename-Item -Path "backend\lokifi.sqlite" -NewName "lokifi.sqlite"
Rename-Item -Path "backend\fynix_production.db" -NewName "lokifi_production.db"

# Update all references in code (should be handled by script)
```

### **8. Git Configuration**

#### **Update Git Remote (if repository renamed)**

```powershell
# If you renamed the GitHub repo from lokifi to lokifi:
git remote set-url origin https://github.com/ericsocrat/lokifi.git

# Verify
git remote -v
```

#### **Update .gitignore**

```gitignore
# Old (if any lokifi-specific patterns)
lokifi.sqlite
fynix_*.db

# New
lokifi.sqlite
lokifi_*.db
```

### **9. Monitoring & Logs**

#### **Prometheus Config** (monitoring/prometheus.yml)

```yaml
scrape_configs:
  - job_name: "lokifi-backend" # Change from lokifi-backend
    static_configs:
      - targets: ["localhost:8000"]

  - job_name: "lokifi-frontend" # Change from lokifi-frontend
    static_configs:
      - targets: ["localhost:3000"]
```

#### **Log Directories**

```powershell
# Rename log directories if they exist
Rename-Item -Path "logs\lokifi" -NewName "logs\lokifi"
Rename-Item -Path "C:\fynix_logs" -NewName "C:\lokifi_logs"
```

### **10. Backup Scripts**

#### **Backup paths**

```bash
# In backup scripts, update:
BACKUP_DIR="/var/backups/lokifi"  → "/var/backups/lokifi"
BACKUP_DIR="C:\fynix_backups"    → "C:\lokifi_backups"

# Database backup files
fynix_*.sqlite → lokifi_*.sqlite
```

### **11. CI/CD Configuration**

#### **.github/workflows/\*.yml**

```yaml
name: Lokifi CI/CD Pipeline # Change from Lokifi

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Build Lokifi Backend # Update names

env:
  IMAGE_NAME: lokifi # Change from lokifi
```

#### **Update GitHub Secrets**

```
Old secret names → New secret names:
FYNIX_JWT_SECRET → LOKIFI_JWT_SECRET
FYNIX_API_KEY   → LOKIFI_API_KEY
```

### **12. Deployment Scripts**

#### **Update deployment scripts**

```bash
# In scripts/deployment/*.sh
APP_NAME="lokifi" → APP_NAME="lokifi"
CONTAINER_NAME="lokifi-app" → CONTAINER_NAME="lokifi-app"
```

### **13. Kubernetes/Cloud Config** (if applicable)

#### **k8s manifests**

```yaml
metadata:
  name: lokifi-backend # Change from lokifi-backend
  namespace: lokifi # Change from lokifi
  labels:
    app: lokifi
```

### **14. SSL Certificates**

```bash
# If you have self-signed certs with lokifi in the name:
/etc/ssl/certs/lokifi.crt → /etc/ssl/certs/lokifi.crt
/etc/ssl/private/lokifi.key → /etc/ssl/private/lokifi.key

# Update Nginx/Apache configs to reference new cert names
```

### **15. Frontend Meta Tags**

#### **frontend/public/index.html** or **app/layout.tsx**

```html
<title>Lokifi - AI-Powered Fintech Platform</title>
<meta name="description" content="Lokifi is..." />
<meta property="og:title" content="Lokifi" />
<meta property="og:site_name" content="Lokifi" />
<meta property="og:url" content="https://lokifi.com" />
```

### **16. Favicon & Assets**

```powershell
# Update favicon and app icons
# These usually have generic names but check:
frontend\public\favicon.ico
frontend\public\logo.svg
frontend\public\apple-touch-icon.png
```

### **17. Error Messages & UI Text**

Search for hardcoded text in frontend:

```javascript
// Old
"Welcome to Lokifi";
"Lokifi Dashboard";
"© 2025 Lokifi";

// New
"Welcome to Lokifi";
"Lokifi Dashboard";
"© 2025 Lokifi";
```

### **18. Email Templates**

Update email templates:

```html
<!-- backend/templates/email/*.html -->
<h1>Welcome to Lokifi</h1>
<p>The Lokifi Team</p>
<a href="https://lokifi.com">Visit Lokifi</a>
```

### **19. API Documentation**

#### **OpenAPI/Swagger configs**

```python
# backend/main.py or similar
app = FastAPI(
    title="Lokifi API",  # Change from Lokifi API
    description="Lokifi backend services",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)
```

### **20. Test Files**

Update test descriptions:

```python
# tests/*.py
def test_lokifi_authentication():  # Change from test_fynix_authentication
    """Test Lokifi auth system"""  # Change from Lokifi
    pass

class TestLokifiAPI(TestCase):  # Change from TestFynixAPI
    """Test suite for Lokifi API"""
```

---

## 🔍 VERIFICATION CHECKLIST

After running the script and making manual changes:

### **Code Verification**

```powershell
# 1. Search for any remaining "lokifi" references
rg -i "lokifi" --type py --type js --type ts --type json

# 2. Search in specific important files
rg -i "lokifi" package.json package-lock.json
rg -i "lokifi" backend/requirements.txt backend/setup.py
rg -i "lokifi" .env.example .env.template
rg -i "lokifi" docker-compose.yml Dockerfile
rg -i "lokifi" README.md

# 3. Check for old database references
rg -i "lokifi.sqlite" --type py
rg -i "fynix_production" --type py

# 4. Check environment variables
rg -i "FYNIX_" --type py --type js --type env
```

### **File/Folder Names**

```powershell
# Check for any remaining lokifi in filenames
Get-ChildItem -Recurse -Filter "*lokifi*" | Select-Object FullName

# Check for any remaining lokifi in folder names
Get-ChildItem -Recurse -Directory -Filter "*lokifi*" | Select-Object FullName
```

### **Git Status**

```powershell
# See all changed files
git status

# See specific changes
git diff

# See renamed files
git status | Select-String "renamed:"
```

### **Database Verification**

```sql
-- Check database name
SELECT current_database();

-- Check table names (shouldn't have lokifi prefix usually)
\dt

-- Check for any lokifi in data (if applicable)
SELECT * FROM your_table WHERE column_name LIKE '%lokifi%';
```

### **Test Everything**

```powershell
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test

# Run the application
npm run dev  # Frontend
python main.py  # Backend

# Check for runtime errors mentioning "lokifi"
```

---

## ⚠️ COMMON ISSUES & FIXES

### **Issue 1: Import Errors**

**Problem:** `ModuleNotFoundError: No module named 'lokifi'`

**Fix:**

```python
# Update imports
from lokifi.utils import helper  →  from lokifi.utils import helper
from lokifi import config  →  from lokifi import config
```

### **Issue 2: Database Connection Fails**

**Problem:** Can't connect to database

**Fix:**

```python
# Check DATABASE_URL in .env
DATABASE_URL=postgresql://user:pass@localhost:5432/lokifi_production

# Or rename database
ALTER DATABASE lokifi RENAME TO lokifi;
```

### **Issue 3: Environment Variables Not Found**

**Problem:** `KeyError: 'FYNIX_JWT_SECRET'`

**Fix:**

```python
# Update in code
os.getenv('FYNIX_JWT_SECRET')  →  os.getenv('LOKIFI_JWT_SECRET')

# Update in .env
FYNIX_JWT_SECRET=xxx  →  LOKIFI_JWT_SECRET=xxx
```

### **Issue 4: Static Files 404**

**Problem:** Frontend can't load assets

**Fix:**

```javascript
// Check public URL in Next.js config
module.exports = {
  basePath: "",
  assetPrefix: "",
};
```

### **Issue 5: Docker Build Fails**

**Problem:** Docker can't find files

**Fix:**

```dockerfile
# Update COPY commands
COPY lokifi/ /app/  →  COPY lokifi/ /app/
```

---

## 📊 FINAL VERIFICATION

Before committing, run this complete check:

```powershell
# 1. Code compiles/builds
cd frontend && npm run build
cd backend && python -m py_compile **/*.py

# 2. Tests pass
cd frontend && npm test
cd backend && pytest

# 3. App runs
# Start backend
cd backend && python main.py
# Start frontend
cd frontend && npm run dev
# Visit: http://localhost:3000

# 4. No "lokifi" references in logs
# Check terminal output for any mentions of "lokifi"

# 5. Git diff review
git diff | Select-String "lokifi" -Context 2
```

---

## ✅ COMMIT CHANGES

Once everything is verified:

```powershell
# Stage all changes
git add -A

# Commit with clear message
git commit -m "🎨 Rebrand from Lokifi to Lokifi

- Updated all code references from Lokifi/lokifi to Lokifi/lokifi
- Renamed files and directories
- Updated documentation and README
- Updated package.json and configuration files
- Updated database names and connection strings
- Updated environment variables
- Updated Docker and deployment configs

New brand: Lokifi
Domain: lokifi.com
Social: @lokifi_official"

# Push to remote
git push origin main
```

---

## 🎉 POST-REBRANDING TASKS

After successful rebranding:

- [ ] Update GitHub repository name (Settings → Rename)
- [ ] Update GitHub description and topics
- [ ] Update GitHub repository URL in package.json
- [ ] Deploy to Vercel/Railway with new name
- [ ] Update deployment URLs
- [ ] Update monitoring dashboards
- [ ] Notify team members (if any)
- [ ] Update documentation site (if any)
- [ ] Update API documentation
- [ ] Send announcement (if you had users)

---

## 📞 NEED HELP?

If you encounter issues:

1. **Check this checklist** - Most issues are covered here
2. **Review git diff** - See exactly what changed
3. **Check logs** - Backend and frontend logs for errors
4. **Test in isolation** - Test backend and frontend separately
5. **Rollback if needed** - `git reset --hard HEAD~1`

---

**Last Updated:** October 2, 2025
**Status:** Ready to execute
**Estimated Time:** 30-60 minutes

🚀 **Good luck with the rebranding!**
