# 🔍 Sentry Error Tracking - Setup Complete

## 📅 Date: October 6, 2025

---

## ✅ What Was Implemented

### **Backend (FastAPI)**
- ✅ Sentry SDK installed (`sentry-sdk`)
- ✅ FastAPI integration configured
- ✅ Logging integration for automatic error capture
- ✅ Performance monitoring (100% trace sampling)
- ✅ Request body capture (medium size)
- ✅ Error-only reporting (filters out info/warning)
- ✅ Startup health check message

### **Frontend (Next.js)**
- ✅ Sentry Next.js SDK installed (`@sentry/nextjs`)
- ✅ Client-side error tracking
- ✅ Server-side error tracking (API routes, SSR)
- ✅ Edge runtime error tracking (middleware)
- ✅ Session replay (10% of sessions, 100% on errors)
- ✅ Browser performance tracking
- ✅ Automatic error filtering (network errors, etc.)

### **Configuration Files Created**
1. `frontend/sentry.client.config.ts` - Browser-side tracking
2. `frontend/sentry.server.config.ts` - Server-side tracking
3. `frontend/sentry.edge.config.ts` - Edge runtime tracking
4. Updated `backend/app/core/config.py` - Added Sentry settings
5. Updated `backend/app/main.py` - Integrated Sentry initialization

---

## 🚀 How to Enable Sentry

### **Step 1: Create a Sentry Account**
1. Go to https://sentry.io/signup/
2. Create a free account (100k errors/month free)
3. Create a new project for "Lokifi"
4. Choose "FastAPI" for backend
5. Choose "Next.js" for frontend
6. Copy your DSN (Data Source Name)

### **Step 2: Configure Backend**
Add to `backend/.env`:
```bash
# Sentry Error Tracking
ENABLE_SENTRY=true
SENTRY_DSN=https://your-sentry-dsn-here@o123456.ingest.sentry.io/7890123
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=1.0
```

### **Step 3: Configure Frontend**
Add to `frontend/.env.local`:
```bash
# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn-here@o123456.ingest.sentry.io/7890123
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
```

### **Step 4: Test It!**
**Backend Test:**
```bash
curl http://localhost:8000/api/v1/test-error
```

**Frontend Test:**
```javascript
// Add this to any page temporarily
throw new Error("Test Sentry integration!");
```

---

## 📊 What Gets Tracked

### **Backend**
✅ **All Python Exceptions**
- API endpoint errors
- Database errors
- External API failures
- Authentication errors
- Validation errors

✅ **Performance Metrics**
- Request duration
- Database query times
- External API response times
- Cache hit/miss rates

✅ **Context Information**
- Request headers
- Query parameters
- Request body (sanitized)
- User agent
- Environment variables (safe ones)

### **Frontend**
✅ **JavaScript Errors**
- Component errors
- API call failures
- Routing errors
- React rendering errors
- Event handler errors

✅ **Performance Metrics**
- Page load times
- Component render times
- API call durations
- Bundle sizes
- Core Web Vitals

✅ **User Actions** (Session Replay)
- 10% of all sessions recorded
- 100% of error sessions recorded
- Click events, navigation, form submissions
- Privacy: All text masked, all media blocked

---

## 🎯 Benefits

### **1. Instant Error Notifications**
- Get alerted when errors occur
- Slack, email, or Discord notifications
- Real-time dashboard

### **2. Detailed Stack Traces**
- See exact line of code causing error
- Full context of what user was doing
- Source maps for production code

### **3. Performance Monitoring**
- Identify slow API endpoints
- Track frontend performance
- Optimize based on real user data

### **4. Release Tracking**
- Compare error rates across releases
- Identify regressions
- Roll back problematic releases

### **5. User Impact**
- See how many users affected
- Prioritize critical issues
- Track error resolution

---

## 🔧 Configuration Options

### **Backend Settings**
```python
# backend/app/core/config.py
ENABLE_SENTRY: bool = False  # Enable/disable Sentry
SENTRY_DSN: str | None = None  # Your Sentry DSN
SENTRY_ENVIRONMENT: str = "development"  # Environment name
SENTRY_TRACES_SAMPLE_RATE: float = 1.0  # % of transactions to track
```

### **Frontend Settings**
```typescript
// Adjust in sentry.client.config.ts
tracesSampleRate: 1.0,  // 100% in dev, reduce to 0.1 in prod
replaysSessionSampleRate: 0.1,  // 10% of sessions
replaysOnErrorSampleRate: 1.0,  // 100% when errors occur
```

---

## 📈 Production Recommendations

### **Before Deploying:**
1. **Set Environment to Production**
   ```bash
   SENTRY_ENVIRONMENT=production
   NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
   ```

2. **Reduce Trace Sample Rate** (save costs)
   ```bash
   # Backend
   SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of requests
   
   # Frontend (in config)
   tracesSampleRate: 0.1
   ```

3. **Enable Source Maps**
   - Sentry needs source maps to show readable stack traces
   - Next.js automatically uploads source maps
   - Configure in `next.config.mjs`

4. **Set Up Alerts**
   - Configure Slack/email notifications
   - Set thresholds for critical errors
   - Create on-call rotations

5. **Release Tracking**
   ```bash
   # Set release version
   SENTRY_RELEASE=1.0.0
   ```

---

## 🔍 Monitoring Dashboard

### **Key Metrics to Watch:**
1. **Error Rate** - Errors per minute
2. **Affected Users** - Unique users hitting errors
3. **Response Time** - API endpoint performance
4. **Crash Free Rate** - % of sessions without crashes
5. **Most Common Errors** - Top 10 errors

### **Sentry Features:**
- ✅ Issues dashboard with grouping
- ✅ Performance monitoring
- ✅ Release health tracking
- ✅ User feedback
- ✅ Source code integration (GitHub)
- ✅ Custom alerts and notifications
- ✅ Team collaboration

---

## 💰 Pricing

### **Free Tier (Includes):**
- 5,000 errors/month
- 10,000 performance transactions/month
- 50 replays/month
- 1 project
- 7-day data retention

### **Paid Plans:**
- **Developer**: $26/month
  - 50k errors/month
  - 100k transactions/month
  - 500 replays/month
  - Unlimited projects

- **Team**: $80/month (scales with usage)

**For Lokifi:** Start with free tier, upgrade when needed

---

## 🧪 Testing Checklist

### **Backend Tests**
- [ ] Test error capture (throw exception)
- [ ] Test performance tracking (slow endpoint)
- [ ] Test context capture (user data)
- [ ] Test environment tag (dev/staging/prod)
- [ ] Test release tag (version number)

### **Frontend Tests**
- [ ] Test React error boundary
- [ ] Test API call failures
- [ ] Test navigation errors
- [ ] Test session replay
- [ ] Test performance tracking

---

## 📚 Resources

### **Documentation**
- Sentry Docs: https://docs.sentry.io/
- FastAPI Integration: https://docs.sentry.io/platforms/python/guides/fastapi/
- Next.js Integration: https://docs.sentry.io/platforms/javascript/guides/nextjs/

### **Best Practices**
- https://docs.sentry.io/product/sentry-basics/guides/
- https://docs.sentry.io/platforms/python/guides/fastapi/performance/
- https://docs.sentry.io/platforms/javascript/guides/nextjs/session-replay/

---

## ✅ Summary

**Sentry is now configured but DISABLED by default.**

To enable:
1. Create Sentry account (free)
2. Get DSN from project settings
3. Add DSN to `.env` files
4. Set `ENABLE_SENTRY=true` (backend)
5. Restart servers

**Benefits:**
- 🔍 Automatic error tracking
- 📊 Performance monitoring
- 📹 Session replay
- 🔔 Real-time alerts
- 📈 Production insights

**Cost:** FREE for development (5k errors/month)

---

**Document:** `SENTRY_SETUP_COMPLETE.md`  
**Backend Config:** `backend/app/core/config.py`  
**Frontend Config:** `frontend/sentry.*.config.ts`  
**Status:** ✅ Ready to enable with DSN
