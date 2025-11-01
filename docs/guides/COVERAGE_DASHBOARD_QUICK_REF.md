# 📊 Coverage Dashboard - Quick Reference Card

## 🎯 One-Command Setup

**Start Everything (Recommended):**
```
VS Code → Ctrl+Shift+P → Tasks: Run Task → 🚀 Start All Servers
```

**What Starts:**
1. 🔴 Redis (Docker) - Port 6379
2. 🗃️ PostgreSQL (Docker) - Port 5432
3. 🔧 Backend (FastAPI) - Port 8000
4. 🎨 Frontend (Next.js) - Port 3000
5. 📊 **Coverage Dashboard** - **Port 3002** ⭐

---

## 🌐 Service URLs

| Service | URL | Status |
|---------|-----|--------|
| Frontend | http://localhost:3000 | Main app |
| Backend API | http://localhost:8000 | REST API |
| API Docs | http://localhost:8000/docs | Swagger UI |
| **Coverage Dashboard** | **http://localhost:3002** | **Live metrics** ⭐ |

---

## 📊 Coverage Dashboard Features

✅ **Overall Coverage %** - Frontend test coverage  
✅ **Trend Analysis** - Coverage over time  
✅ **File Breakdown** - Per-file/directory metrics  
✅ **Protected Thresholds** - Prevents regressions  
✅ **Visual Reports** - Line-by-line coverage  

---

## 🔄 Update Coverage

```bash
cd apps/frontend
npm run test:coverage
```

Then refresh http://localhost:3002

---

## 🛑 Stop Everything

**VS Code:**
```
Tasks: Run Task → 🛑 Stop All Servers
```

**Manual:**
- Close terminal tabs (Backend, Frontend, Dashboard)
- Stop Docker: `docker stop lokifi-redis lokifi-postgres`

---

## 💡 Quick Tips

**Bookmark:** http://localhost:3002 for instant access  
**Auto-Update:** Coverage refreshes on every test run  
**Lightweight:** No performance impact on dev servers  
**Always On:** Keep dashboard running during development  

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| No coverage data | `npm run test:coverage` |
| Port 3002 busy | Change port in `.vscode/tasks.json` |
| Dashboard not updating | Hard refresh: `Ctrl+Shift+R` |
| Docker not starting | Ensure Docker Desktop is running |

---

## 📚 Full Documentation

📖 **[Complete Guide](./COVERAGE_DASHBOARD_INTEGRATION.md)** - Detailed setup & features  
🧪 **[Coverage Guide](./testing/coverage.md)** - Coverage standards & best practices  
🛠️ **[Test Runner](../../tools/README.md)** - Testing tools & automation  

---

## ✅ Success Checklist

When everything works correctly:

- [ ] 5 terminal tabs visible in VS Code
- [ ] http://localhost:3000 loads (Frontend)
- [ ] http://localhost:8000/docs loads (API)
- [ ] http://localhost:3002 loads (Dashboard) ⭐
- [ ] All terminals show green status
- [ ] No error messages

---

**🌟 Remember:** The coverage dashboard runs automatically - no extra commands needed!

**Last Updated:** November 1, 2025
