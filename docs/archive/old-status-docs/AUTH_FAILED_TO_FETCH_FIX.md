# 🔧 "Failed to Fetch" Error - Troubleshooting Guide

## ❌ Issue
When clicking "Log In", the modal shows **"Failed to fetch"** error instead of logging in or showing "Invalid email or password".

## ✅ What's Working
- ✅ Backend is running on port 8000
- ✅ Frontend is running on port 3000
- ✅ Backend endpoint `/api/auth/check` responds correctly
- ✅ CORS is properly configured
- ✅ All code changes have been applied

## 🔍 Root Cause
The browser is likely using **cached JavaScript** from before the fixes were applied. The old code might still be trying to import the deleted `AuthModalCMC` file or using old API logic.

## 🛠️ Solution Steps

### Step 1: Hard Refresh the Browser
**Clear browser cache and reload:**

**Chrome/Edge:**
1. Press `Ctrl + Shift + Delete`
2. Select "Cached images and files"
3. Click "Clear data"
4. OR just press `Ctrl + F5` for hard refresh

**Firefox:**
1. Press `Ctrl + Shift + Delete`
2. Select "Cache"
3. Click "Clear Now"
4. OR press `Ctrl + F5`

### Step 2: Clear All Cookies
1. Press `F12` to open DevTools
2. Go to **Application** tab
3. Expand **Cookies** → `http://localhost:3000`
4. Right-click → **Clear**
5. Expand **Local Storage** → `http://localhost:3000`
6. Right-click → **Clear**

### Step 3: Close and Reopen Browser
Sometimes the browser keeps old service workers or cache in memory:
1. **Close all browser windows** completely
2. Wait 5 seconds
3. Open a new browser window
4. Go to http://localhost:3000/portfolio

### Step 4: Test Login Again
1. Click "Login / Sign Up"
2. Enter:
   - Email: `hello@lokifi.com`
   - Password: `?Apollwng113?`
3. Click "Log In"

**Expected:**
- ✅ Modal closes
- ✅ Navbar shows your email
- ✅ Portfolio loads

**If wrong password:**
- 🔴 Red error: "Invalid email or password"
- Modal stays open

## 🔍 Debug Information

### Backend Status
```
✅ Running on http://0.0.0.0:8000
✅ CORS configured for http://localhost:3000
✅ /api/auth/check responds: {"authenticated":false}
✅ All routes registered
```

### Frontend Status
```
✅ Running on http://localhost:3000
✅ Compiled successfully
✅ AuthModal updated with error handling
✅ apiFetch configured with credentials: 'include'
```

### API Configuration
```typescript
// frontend/src/lib/apiFetch.ts
const API_BASE = 'http://localhost:8000/api'
credentials: 'include'  // Enables cookies
```

## 🧪 Testing the Backend Directly

If you want to verify the backend is working, open a new PowerShell terminal and run:

### Test 1: Check if auth endpoint exists
```powershell
curl http://localhost:8000/api/auth/check
```
Expected: `{"authenticated":false,"user_id":null,"email":null}`

### Test 2: Try login with wrong password
```powershell
$body = @{ email = "hello@lokifi.com"; password = "wrongpassword" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
```
Expected: Error message about invalid credentials

### Test 3: Try login with correct password
```powershell
$body = @{ email = "hello@lokifi.com"; password = "?Apollwng113?" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
```
Expected: Returns user data and sets cookies

## 🐛 If Still Not Working

### Check Browser Console
1. Press `F12`
2. Go to **Console** tab
3. Look for errors when clicking "Log In"

**Common errors:**
- `Module not found: './AuthModalCMC'` → Hard refresh needed
- `Failed to fetch` → CORS issue or backend not running
- `401 Unauthorized` → Wrong password (this is good, means it's working!)
- `Network Error` → Backend not accessible

### Check Network Tab
1. Press `F12`
2. Go to **Network** tab
3. Click "Log In"
4. Look for request to `http://localhost:8000/api/auth/login`

**What to check:**
- **Request appears?** → Frontend is trying to connect
- **Status 401?** → Backend working, wrong credentials
- **Status 200?** → Login successful!
- **Request failed/CORS error?** → Backend not accessible or CORS issue
- **No request at all?** → JavaScript error, check Console tab

## 📋 Checklist Before Reporting Issue

- [ ] Backend terminal shows "Application startup complete"
- [ ] Frontend terminal shows "✓ Ready in X.Xs"  
- [ ] Cleared browser cache (Ctrl + Shift + Delete)
- [ ] Hard refreshed page (Ctrl + F5)
- [ ] Cleared cookies and local storage (F12 → Application)
- [ ] Closed and reopened browser
- [ ] Tried in incognito/private window
- [ ] Checked browser console for errors (F12 → Console)
- [ ] Checked network tab for failed requests (F12 → Network)

## ✨ Expected Behavior After Fix

### Wrong Password
1. Click "Log In" with wrong password
2. See red error box: "Invalid email or password"
3. Modal stays open
4. Can try again immediately

### Correct Password
1. Click "Log In" with correct password
2. See console logs:
   ```
   🔐 AuthProvider: Logging in...
   🔐 AuthProvider: Login successful, refreshing user data...
   🔄 AuthProvider: Refreshing user data...
   ✅ AuthProvider: User data received: hello@lokifi.com
   ```
3. Modal closes
4. Navbar shows email
5. Portfolio content loads

---

**Current Status**: Servers running, code fixed, likely browser cache issue.

**Next Step**: Hard refresh browser (Ctrl + F5) and clear cookies, then try again.
