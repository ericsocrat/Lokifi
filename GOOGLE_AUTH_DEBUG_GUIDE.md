# 🔍 Debugging "Failed to Fetch" Error

## Current Status
- ✅ Database: All tables created successfully
- ✅ Backend: Running on http://localhost:8000 and responding
- ✅ Frontend: Running on http://localhost:3000
- ✅ CORS: Properly configured for localhost:3000
- ❌ Google OAuth: Still showing "Failed to fetch" error

## What We Know

### Backend is Working ✅
```bash
# Test shows backend is accessible:
curl http://localhost:8000/api/auth/google -X POST \
  -H "Content-Type: application/json" \
  -d '{"token":"test"}'

# Response: {"detail":"Google token verification failed: Invalid Value"}
# This is CORRECT - backend is working, just rejecting fake token
```

### CORS is Working ✅
```bash
# CORS headers are properly set:
access-control-allow-origin: http://localhost:3000
access-control-allow-credentials: true
access-control-allow-methods: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT
```

### Environment Variables are Set ✅
```bash
docker exec lokifi-frontend printenv | grep NEXT_PUBLIC

# Output:
NEXT_PUBLIC_API_BASE=http://localhost:8000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=851935422649-...
```

## Possible Causes

### 1. Browser Network Issue
The "Failed to fetch" error typically occurs when:
- The browser can't reach the server (network block)
- CORS preflight fails (but we verified CORS works)
- The fetch happens before the server is ready

### 2. Environment Variable Not Read in Browser
The frontend might not be picking up `NEXT_PUBLIC_API_BASE` in the browser context. This can happen if:
- The page was cached before environment variables were set
- The build needs to be refreshed
- The variable isn't available in the browser at runtime

### 3. Google OAuth Token Issue
The Google credential might be:
- Invalid format
- Expired immediately
- Not matching the expected audience

## Next Steps to Debug

### 1. Check Browser Console Logs
After restarting the frontend, try signing in with Google again and check for these logs:
```
🔍 Google Auth: API_BASE = http://localhost:8000/api
🔍 Google Auth: Sending credential to backend...
✅ Google Auth: Response received, status: XXX
```

**If you don't see these logs:**
- The code isn't reaching the fetch call
- Google OAuth popup might be failing before sending the credential

**If you see logs but status is not shown:**
- The fetch is failing (network error)
- Check browser Network tab for the actual request

### 2. Check Browser Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try Google sign-in
4. Look for request to `http://localhost:8000/api/auth/google`

**Check:**
- Is the request being made?
- What's the status code?
- What's the response?
- Are there any CORS errors?

### 3. Hard Refresh the Page
Sometimes cached code causes issues:
- Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or clear browser cache and refresh

### 4. Try Direct Access
Test if you can access the backend from your browser directly:
1. Open http://localhost:8000/api/auth/me
2. Should see: `{"detail":"Could not validate credentials"}`
3. This confirms browser → backend communication works

## Code Changes Made

### Added Logging to AuthModal.tsx
```typescript
// Before sending to backend
console.log('🔍 Google Auth: API_BASE =', API_BASE);
console.log('🔍 Google Auth: Sending credential to backend...');

// After receiving response
console.log('✅ Google Auth: Response received, status:', response.status);
```

This will help us see:
- What URL the frontend is trying to reach
- Whether the fetch is actually happening
- What response (if any) is received

## Common Solutions

### Solution 1: Hard Refresh
```
Press: Ctrl + Shift + R
```
This clears the cache and reloads with fresh code.

### Solution 2: Clear Browser Cache
```
Chrome: Settings → Privacy → Clear browsing data → Cached images and files
Firefox: Options → Privacy → Clear Data → Cached Web Content
```

### Solution 3: Restart All Containers
```bash
docker-compose -f docker-compose.dev.yml restart
```

### Solution 4: Check Browser Console for Actual Error
The error might not be "Failed to fetch" but something else. Check:
- Console tab for JavaScript errors
- Network tab for failed requests
- Any CORS or security warnings

## Testing Checklist

After trying Google sign-in, check:

- [ ] Browser console shows the new debug logs
- [ ] Can access http://localhost:8000/api/auth/me directly in browser
- [ ] Can access http://localhost:3000 and see the frontend
- [ ] Network tab shows request to `/api/auth/google`
- [ ] No CORS errors in console
- [ ] No JavaScript errors before clicking sign-in button

## Expected Behavior

When Google OAuth works correctly:
1. Click "Sign in with Google" button
2. Google popup opens
3. User authorizes the app
4. Popup closes
5. Console shows: `🔍 Google Auth: Sending credential to backend...`
6. Backend validates the token
7. If valid: User is logged in and modal closes
8. If invalid: Specific error message is shown (not "Cannot connect to server")

## Current Issue

The error "Cannot connect to server" suggests the fetch is failing at the network level. But we've confirmed:
- Backend is accessible from host
- CORS is configured correctly
- Environment variables are set

**Most likely cause:** The page needs a hard refresh to pick up the new environment variables or the latest code changes.

**Action Required:** Please try the Google sign-in again and share:
1. Browser console output (look for the 🔍 emoji logs)
2. Network tab screenshot showing the request to `/api/auth/google`
3. Any other errors or warnings in the console

This will help us pinpoint the exact issue!
