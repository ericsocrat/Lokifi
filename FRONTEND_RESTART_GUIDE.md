# Frontend Restart & Testing Guide

**Date**: October 6, 2025  
**Purpose**: Restart frontend to apply universal search fix and verify all search functionality

---

## Step 1: Restart Frontend Server

### **Option A: VS Code Task (Recommended)**
1. Press `Ctrl+Shift+P` (Command Palette)
2. Type "Tasks: Run Task"
3. Select "🎨 Start Frontend Server"
4. Wait for "Ready on http://localhost:3000"

### **Option B: Manual Restart**
```powershell
# Stop current frontend (Ctrl+C in terminal)
cd frontend
npm run dev
```

### **Option C: Kill and Restart**
```powershell
# Find and kill process on port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force

# Start fresh
cd frontend
npm run dev
```

---

## Step 2: Clear Browser Cache

**Important**: Browser may cache old JavaScript files

### **Hard Refresh:**
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

### **Full Cache Clear:**
1. Open DevTools (F12)
2. Right-click Refresh button
3. Select "Empty Cache and Hard Reload"

---

## Step 3: Test Universal Search

### **Test 1: Basic Search**
1. Open `http://localhost:3000`
2. Look for search bar in header (center)
3. Click inside search box
4. Type "bitcoin"

**Expected Result:**
- ✅ Dropdown appears below search box
- ✅ Shows loading spinner briefly
- ✅ Displays ~25 Bitcoin-related results
- ✅ Each result shows:
  - Icon, name, symbol
  - Market cap rank
  - Current price
  - 24h change (green/red)

### **Test 2: Result Navigation**
1. Click on any result (e.g., "Bitcoin BTC")

**Expected Result:**
- ✅ Navigates to `/asset/BTC`
- ✅ Search dropdown closes
- ✅ Search input clears

### **Test 3: Clear Button**
1. Type "eth" in search
2. Click X button (right side of input)

**Expected Result:**
- ✅ Search query clears
- ✅ Dropdown closes

### **Test 4: Click Outside**
1. Type "btc" in search
2. Click anywhere outside the search area

**Expected Result:**
- ✅ Dropdown closes
- ✅ Search query remains (doesn't clear)

### **Test 5: Minimum Length**
1. Type just "a" (1 character)

**Expected Result:**
- ✅ Dropdown does NOT appear (needs 2+ chars)

### **Test 6: No Results**
1. Type "zzzzzzz" (non-existent)

**Expected Result:**
- ✅ Shows "No results found for 'zzzzzzz'"

---

## Step 4: Test Markets Page Search

### **Navigate to Markets Page**
```
http://localhost:3000/markets
```

### **Test Markets Search:**
1. Find search box on markets page (top right)
2. Type "ethereum"

**Expected Result:**
- ✅ List filters to show only Ethereum-related cryptos
- ✅ Search is debounced (300ms delay)
- ✅ Loading indicator appears briefly
- ✅ Results update in real-time

### **Clear Markets Search:**
1. Clear the search input

**Expected Result:**
- ✅ Full list of 300 cryptos reappears

---

## Step 5: Verify Backend Connection

### **Check API Calls in DevTools:**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Type "bitcoin" in universal search

**Expected Requests:**
- ✅ `GET /api/v1/prices/crypto/search?q=bitcoin`
- ✅ Status: `200 OK`
- ✅ Response: JSON with results array

### **Check Console for Errors:**
- ❌ No 404 errors
- ❌ No CORS errors
- ❌ No TypeScript errors

---

## Troubleshooting

### **Issue: Search dropdown not appearing**

**Solutions:**
1. Hard refresh: `Ctrl+Shift+R`
2. Check browser console for errors
3. Verify frontend restarted successfully
4. Check DevTools Network tab for API call

### **Issue: 404 errors on API calls**

**Check `.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Verify:**
```bash
curl http://localhost:8000/api/v1/prices/health
# Should return: {"status":"healthy"}
```

**If still 404:**
1. Restart backend server
2. Restart frontend server
3. Hard refresh browser

### **Issue: Search results show old/wrong data**

**Solutions:**
1. Hard refresh browser
2. Clear browser cache completely
3. Check backend is running latest code
4. Verify API endpoint returns correct data:
   ```bash
   curl "http://localhost:8000/api/v1/prices/crypto/search?q=bitcoin"
   ```

### **Issue: Images not loading in results**

**Check:**
1. CoinGecko image URLs in API response
2. Next.js Image component errors in console
3. Network tab for blocked image requests
4. CORS policy (shouldn't block images)

### **Issue: Markets page search not working**

**Solutions:**
1. Navigate directly: `http://localhost:3000/markets`
2. Hard refresh on markets page
3. Check search input exists (top right)
4. Type at least 2 characters
5. Wait 300ms (debounce delay)

---

## Success Checklist

After restart and testing, verify:

- ✅ Frontend running on port 3000
- ✅ Backend running on port 8000
- ✅ Universal search bar visible in header
- ✅ Typing "bitcoin" shows results
- ✅ Clicking result navigates to asset page
- ✅ Clear button (X) works
- ✅ Click outside closes dropdown
- ✅ Markets page search filters list
- ✅ No console errors
- ✅ No 404 API errors

---

## Performance Verification

### **Search Speed:**
- ⚡ Debounce: 300ms after last keystroke
- ⚡ API Response: <100ms
- ⚡ Total Time: <500ms from typing to results

### **Network Efficiency:**
- ✅ Only 1 API call per search (after debounce)
- ✅ No duplicate requests
- ✅ Images lazy loaded
- ✅ Results cached in React state

---

## Next Steps

### **After Successful Testing:**

1. ✅ Universal search working
2. ✅ Markets page search working
3. ⏳ **Ready for stocks/indices implementation**

### **Optional: Mobile Search**
- Current: Hidden on mobile (<1024px)
- Future: Add mobile search modal
- Trigger: Search icon in mobile header

---

## Current Status Summary

### **Working Features:**
- ✅ Universal search bar (header)
- ✅ Markets page search
- ✅ Backend crypto search endpoint
- ✅ Asset detail pages
- ✅ WebSocket live prices
- ✅ Historical price charts

### **Known Limitations:**
- ⚠️ Crypto only (no stocks/indices yet)
- ⚠️ Mobile search hidden (desktop only)
- ⚠️ Single asset type search

### **Next Implementation:**
- 🔜 Stock discovery endpoints
- 🔜 Indices listing
- 🔜 Separate pages: /markets/stocks, /markets/indices
- 🔜 Multi-asset unified search

---

## Support

If issues persist after following all steps:

1. **Check Documentation:**
   - `UNIVERSAL_SEARCH_IMPLEMENTATION.md`
   - `AUTH_OPTIMIZATION_COMPLETE.md`
   - `.env.local` configuration

2. **Verify Services:**
   ```bash
   # Backend health
   curl http://localhost:8000/api/v1/prices/health
   
   # Frontend running
   Get-NetTCPConnection -LocalPort 3000
   ```

3. **Review Recent Changes:**
   ```bash
   git log --oneline -5
   git diff HEAD~1
   ```

---

**Status**: Ready for restart and testing! 🚀
