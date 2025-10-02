# 🌐 Browser Testing Plan

**Generated**: Current Session
**Purpose**: Manual browser testing to identify UI interaction failures
**URL**: http://localhost:3000

---

## ✅ Pre-Test Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] Redis running on port 6379
- [ ] Browser DevTools open (F12)
- [ ] Console tab visible
- [ ] Network tab monitoring

---

## 🧪 Test Procedures

### Test #1: Drawing Tools Click Response

**Steps**:

1. Open http://localhost:3000
2. Open DevTools Console (F12 → Console tab)
3. Locate DrawingToolbar (left side or top of chart)
4. Click on "Line" tool button
5. **Observe**: Does button highlight/change state?
6. **Check Console**: Any errors?
7. Click on chart area
8. **Observe**: Can you draw a line?

**Expected Behavior**:

- ✅ Button should show active state (different color/border)
- ✅ Cursor should change when hovering over chart
- ✅ Click + drag should draw a line
- ✅ No console errors

**Actual Behavior** (to be filled):

- ❓ Button state: ******\_\_\_******
- ❓ Console errors: ******\_\_\_******
- ❓ Drawing works: YES / NO

**React DevTools Check**:

```javascript
// In console, check state
window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
// Or use React DevTools extension to inspect DrawingToolbar component state
```

---

### Test #2: Symbol Search Functionality

**Steps**:

1. Locate EnhancedSymbolPicker (top-left, shows current symbol like "AAPL")
2. Click on the symbol picker button
3. **Observe**: Does dropdown open?
4. If dropdown opens, check Network tab
5. Type "MSFT" in search box
6. **Check Network**: Is `/api/v1/symbols/search?q=MSFT` called?
7. **Check Response**: Status code? Response data?
8. **Observe**: Do search results appear?

**Expected Behavior**:

- ✅ Dropdown opens with popular symbols
- ✅ API call made after typing (with 300ms debounce)
- ✅ API returns 200 OK with symbol data
- ✅ Search results displayed in dropdown
- ✅ Clicking result changes active symbol

**Actual Behavior** (to be filled):

- ❓ Dropdown opens: YES / NO
- ❓ API called: YES / NO / N/A
- ❓ API status: ******\_\_\_******
- ❓ Results shown: YES / NO
- ❓ Console errors: ******\_\_\_******

**API Endpoint Check**:

```bash
# Test API directly in terminal
curl http://localhost:8000/api/v1/symbols/search?q=AAPL
curl http://localhost:8000/api/v1/symbols/popular?limit=20
```

**Fallback Data Check**:

- EnhancedSymbolPicker has hardcoded fallback data
- Should show: AAPL, MSFT, BTCUSD, EURUSD, SPY
- If these appear → API failing, fallback working

---

### Test #3: Page Navigation

**Steps**:

1. Look for navigation links (if any visible)
2. Try to access these URLs directly:
   - http://localhost:3000/login
   - http://localhost:3000/profile
   - http://localhost:3000/portfolio
3. **Observe**: Do pages load?
4. **Check Console**: Any routing errors?
5. Check Network tab for failed requests

**Expected Behavior**:

- ✅ Pages load and render
- ✅ No 404 errors
- ✅ No console errors

**Actual Behavior** (to be filled):

- ❓ /login loads: YES / NO
- ❓ /profile loads: YES / NO
- ❓ /portfolio loads: YES / NO
- ❓ Errors: ******\_\_\_******

---

### Test #4: General Click Handler Check

**Browser Console Test**:

```javascript
// Test if React event system is working
document.addEventListener("click", (e) => {
  console.log("Global click detected:", e.target);
});

// Check if buttons have click handlers
const buttons = document.querySelectorAll("button");
console.log(`Found ${buttons.length} buttons`);

// Check z-index issues
const picker = document.querySelector('[class*="EnhancedSymbol"]');
if (picker) {
  console.log("Picker z-index:", window.getComputedStyle(picker).zIndex);
}
```

**What to Check**:

- Are click events firing at all?
- Are clicks being captured but not handled?
- Are there z-index overlays blocking clicks?
- Are pointer-events: none applied anywhere?

---

## 🔍 Diagnostic Commands

### Check React Component Rendering

```javascript
// In browser console
// Check if DrawingToolbar is mounted
console.log(
  "DrawingToolbar instances:",
  document.querySelectorAll(
    '[class*="drawing-toolbar"], [class*="DrawingToolbar"]'
  )
);

// Check for duplicate components
const allButtons = Array.from(document.querySelectorAll("button"));
const drawingButtons = allButtons.filter(
  (b) =>
    b.textContent.includes("Line") ||
    b.textContent.includes("Trend") ||
    b.title?.includes("Line")
);
console.log("Drawing tool buttons found:", drawingButtons.length);
```

### Check State Management

```javascript
// If zustand-devtools is available
// Check current drawing store state
// (This requires zustand devtools to be configured)
```

### Check CSS Blocking Interactions

```javascript
// Check for pointer-events: none
const allElements = document.querySelectorAll("*");
const blockedElements = Array.from(allElements).filter(
  (el) => window.getComputedStyle(el).pointerEvents === "none"
);
console.log("Elements with pointer-events:none:", blockedElements.length);
```

### Check for JavaScript Errors

```javascript
// Monitor for any uncaught errors
window.addEventListener("error", (e) => {
  console.error("Uncaught error:", e.message, e.filename, e.lineno);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e.reason);
});
```

---

## 📊 Test Results Template

### Issue #1: Drawing Tools

- **Reproduced**: YES / NO
- **Root Cause**: ******\_\_\_******
- **Console Errors**: ******\_\_\_******
- **Network Issues**: ******\_\_\_******
- **State Issues**: ******\_\_\_******

### Issue #2: Symbol Search

- **Reproduced**: YES / NO
- **Dropdown Opens**: YES / NO
- **API Response**: OK / ERROR / NO_CALL
- **Root Cause**: ******\_\_\_******
- **Console Errors**: ******\_\_\_******

### Issue #3: Page Navigation

- **Reproduced**: YES / NO
- **Pages Load**: YES / NO / PARTIAL
- **Root Cause**: ******\_\_\_******
- **Console Errors**: ******\_\_\_******

### Issue #4: General Clicks

- **Reproduced**: YES / NO
- **Events Firing**: YES / NO
- **Root Cause**: ******\_\_\_******

---

## 🎯 Next Steps After Testing

Based on test results:

### If API calls fail:

1. Check backend logs: `docker logs lokifi-backend` or terminal output
2. Verify API routes exist in backend
3. Check CORS settings
4. Test API directly with curl

### If components don't respond:

1. Check React DevTools component tree
2. Verify components are actually mounted
3. Check for duplicate components rendering
4. Inspect element styles (z-index, pointer-events)

### If state doesn't update:

1. Add console.logs to store actions
2. Check if multiple stores conflict
3. Verify store subscriptions work
4. Test store in isolation

### If no errors but still broken:

1. Check for silent failures (try/catch swallowing errors)
2. Verify event handlers are attached
3. Check for event.preventDefault() blocking actions
4. Inspect React event pooling issues

---

## 📝 Documentation

After completing tests, update:

1. `CURRENT_ISSUES.md` - Mark which issues are reproduced
2. `UI_DIAGNOSTICS.md` - Add root cause findings
3. Create fix implementation plan
