# 🔧 Quick Fix: Restart Frontend Server

## Why You're Still Seeing the Issue

The fix has been applied to the code, but **Next.js dev server is running with the old code**. You need to restart the frontend server to pick up the changes.

## Solution: Restart Frontend

### Option 1: Quick Restart (Recommended)
1. **Stop the frontend server**:
   - Find the terminal running "🎨 Start Frontend Server"
   - Press `Ctrl+C` to stop it

2. **Start it again**:
   ```powershell
   cd frontend
   npm run dev
   ```

3. **Wait for it to compile** (you'll see "✓ Ready")

4. **Clear your browser cookies**:
   - Press `F12` (opens Developer Tools)
   - Go to `Application` tab
   - Click `Cookies` → `http://localhost:3000`
   - Right-click → `Clear`

5. **Refresh the page** (`F5`)

6. **Try logging in again**:
   - Email: `hello@lokifi.com`
   - Password: (your password)

### Option 2: Use the Task (Easier)
If you have VS Code tasks set up:

1. In VS Code, press `Ctrl+Shift+P`
2. Type: `Tasks: Run Task`
3. Select: `🎨 Start Frontend Server`
4. This will restart the frontend with the new code

### Option 3: Restart Everything
If you want to restart all servers:

```powershell
# From the project root
.\start-servers.ps1
```

This will restart Redis, Backend, and Frontend.

## After Restart: Test Login

1. **Open** http://localhost:3000/portfolio
2. You'll see "Authentication Required" message
3. **Click** "Login / Sign Up" button (top-right)
4. **Click** "Login" tab
5. **Enter**:
   - Email: `hello@lokifi.com`
   - Password: (your password)
6. **Click** "Log In"

### Expected Result After Fix:
- ✅ Modal closes
- ✅ Navbar shows your name (not "Login / Sign Up")
- ✅ Portfolio page loads with content
- ✅ No "Authentication Required" message

## What the Fix Does

### Before (Old Code):
```typescript
const res = await fetch(`${API_BASE}${input}`, { ...init, headers });
// ❌ No credentials = cookies ignored
```

### After (New Code):
```typescript
const res = await fetch(`${API_BASE}${input}`, { 
  ...init, 
  headers,
  credentials: 'include' // ✅ Cookies now working!
});
```

## If It Still Doesn't Work

### Check 1: Is the Frontend Using New Code?
1. Open browser Developer Tools (F12)
2. Go to `Console` tab
3. Type: `fetch('http://localhost:8000/api/auth/me', {credentials: 'include'})`
4. Press Enter
5. If you see user data → cookies working!
6. If you see 401 error → need to log in

### Check 2: Clear Everything
```powershell
# Clear all browser data
1. Open browser
2. Press Ctrl+Shift+Delete
3. Select "Cookies and other site data"
4. Select "Cached images and files"
5. Time range: "All time"
6. Click "Clear data"

# Or just use Incognito/Private mode to test
```

### Check 3: Verify Backend is Working
```powershell
# Test backend endpoint directly
curl http://localhost:8000/api/auth/check
```

Should return something (even if not authenticated).

## Why This Happened

**Next.js Hot Module Replacement (HMR)** doesn't always pick up certain types of changes, especially:
- Changes to utility files like `apiFetch.ts`
- Changes to API call configurations
- Changes to fetch options

**Solution**: Always restart the dev server after changing API-related files.

## Prevention for Next Time

When you change files in:
- `src/lib/` folder
- API configuration files
- Fetch utilities

**Always restart the frontend server!**

Quick command:
```powershell
# Kill and restart frontend
# Terminal 1: Press Ctrl+C
# Then: npm run dev
```

---

## TL;DR

**Problem**: Code fixed but server running old code  
**Solution**: Restart frontend server + clear cookies  
**Time**: 30 seconds  

**Steps**:
1. Stop frontend (`Ctrl+C`)
2. Start frontend (`npm run dev`)
3. Clear cookies (F12 → Application → Cookies → Clear)
4. Try login again

**Then it will work!** ✅
