# Session 91 - Manual Testing Checklist

**Purpose:** Validate keyboard shortcuts, accessibility, and user experience for Indicator Controls Panel
**Status:** Ready for Manual Testing
**Estimated Time:** 20-30 minutes

---

## Pre-Testing Setup

### 1. Start Development Server
```powershell
# Option 1: Use VS Code Task
Tasks: Run Task → 🚀 Start All Servers

# Option 2: Manual start
cd apps/frontend
npm run dev
```

**Verify:** Navigate to http://localhost:3000

### 2. Open Developer Tools
- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+I`
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** `Cmd+Option+I` (Mac)

**Check Console:** No errors on page load

---

## Test Category 1: Keyboard Shortcuts

### Test 1.1: Ctrl/Cmd+I - Toggle Panel
- [ ] **Initial State:** Panel should be hidden (default)
- [ ] **Press Ctrl+I (Windows/Linux) or Cmd+I (Mac)**
- [ ] **Expected:** Panel appears in top-right corner (floating, w-80)
- [ ] **Press Ctrl/Cmd+I again**
- [ ] **Expected:** Panel disappears
- [ ] **Verify:** No browser conflicts (e.g., browser developer tools NOT opening)

### Test 1.2: Ctrl/Cmd+R - Reset All Settings
- [ ] **Setup:** Open panel (Ctrl/Cmd+I)
- [ ] **Modify Settings:** Change RSI period to 21, enable MACD
- [ ] **Press Ctrl+R (Windows/Linux) or Cmd+R (Mac)**
- [ ] **Expected:** Confirmation dialog appears ("Reset all indicator settings?")
- [ ] **Click "Cancel"**
- [ ] **Expected:** Settings unchanged
- [ ] **Press Ctrl/Cmd+R again**
- [ ] **Click "Reset"**
- [ ] **Expected:** All settings reset to defaults (RSI=14, MACD off)
- [ ] **Verify:** No browser page reload (preventDefault working)

### Test 1.3: Ctrl/Cmd+S - Apply Preset
- [ ] **Setup:** Open panel (Ctrl/Cmd+I)
- [ ] **No Preset Selected:** Press Ctrl/S (Windows/Linux) or Cmd+S (Mac)
- [ ] **Expected:** Nothing happens (shortcut disabled when no preset)
- [ ] **Select "Day Trading" Preset:** Click dropdown
- [ ] **Press Ctrl/Cmd+S**
- [ ] **Expected:** Confirmation dialog appears ("Apply 'Day Trading' preset?")
- [ ] **Click "Cancel"**
- [ ] **Expected:** Current settings unchanged
- [ ] **Press Ctrl/Cmd+S again**
- [ ] **Click "Apply"**
- [ ] **Expected:** Settings change to Day Trading preset (RSI=9, MACD on, BB on, etc.)
- [ ] **Verify:** No browser "Save Page" dialog (preventDefault working)

### Test 1.4: Esc - Close Dialogs
- [ ] **Open Confirmation Dialog:** Press Ctrl/Cmd+R
- [ ] **Press Esc**
- [ ] **Expected:** Dialog closes without action
- [ ] **Verify:** Panel remains open (only dialog closed)

---

## Test Category 2: Visual UI Elements

### Test 2.1: Keyboard Shortcuts Help Section
- [ ] **Open Panel:** Ctrl/Cmd+I
- [ ] **Scroll to Bottom:** Visual shortcuts help should be visible
- [ ] **Verify Elements:**
  - [ ] Section header: "⌨️ Keyboard Shortcuts"
  - [ ] 4 shortcuts listed (Reset All, Apply Preset, Toggle Panel, Close Dialogs)
  - [ ] `<kbd>` elements styled (rounded bg-white/10 font-mono)
  - [ ] Shortcuts show "Ctrl/Cmd+" prefix
- [ ] **Readability:** Text opacity-70, not too dark

### Test 2.2: Tooltip Hints
- [ ] **Hover over "Reset All" button**
- [ ] **Expected:** Tooltip shows "Reset all settings to defaults (Ctrl/Cmd+R)"
- [ ] **Hover over "Apply" button (no preset selected)**
- [ ] **Expected:** Tooltip shows "Select a preset first"
- [ ] **Select Preset:** Choose "Swing Trading"
- [ ] **Hover over "Apply" button**
- [ ] **Expected:** Tooltip shows "Apply selected preset (Ctrl/Cmd+S)"
- [ ] **Hover over Preset Selector**
- [ ] **Expected:** Tooltip shows "Select a trading strategy preset"

---

## Test Category 3: Accessibility

### Test 3.1: Keyboard Navigation
- [ ] **Start with Panel Closed**
- [ ] **Press Tab:** Focus should move through page elements
- [ ] **Press Ctrl/Cmd+I:** Panel opens
- [ ] **Press Tab:** Focus should move into panel (first focusable element)
- [ ] **Continue Tabbing:** Verify all interactive elements are reachable
  - [ ] Preset selector
  - [ ] Apply button
  - [ ] Reset All button
  - [ ] Individual indicator controls
- [ ] **Press Shift+Tab:** Focus moves backward correctly
- [ ] **Verify:** Focus indicators visible (outline or border)

### Test 3.2: Screen Reader Compatibility (Optional)
- [ ] **Enable Screen Reader:** (Windows Narrator, macOS VoiceOver, NVDA)
- [ ] **Navigate Panel:** Verify labels are read correctly
- [ ] **Activate Shortcuts:** Verify dialog announcements

### Test 3.3: Focus States
- [ ] **Tab Through Panel:** All buttons/inputs show visible focus
- [ ] **Verify:** Focus outline color contrasts with background
- [ ] **Check:** Focus not hidden by other elements

---

## Test Category 4: Confirmation Dialogs

### Test 4.1: Reset Confirmation Dialog
- [ ] **Trigger:** Click "Reset All" button or press Ctrl/Cmd+R
- [ ] **Verify Dialog Content:**
  - [ ] Title: "Reset all indicator settings?"
  - [ ] Message: "This will reset all indicators to their default values"
  - [ ] Checkbox: "Don't ask again"
  - [ ] Buttons: "Cancel" and "Reset"
- [ ] **Test Cancel:** Click "Cancel" or Esc
- [ ] **Expected:** Settings unchanged
- [ ] **Test Reset:** Click "Reset"
- [ ] **Expected:** All settings reset to defaults

### Test 4.2: Preset Confirmation Dialog
- [ ] **Select Preset:** Choose any preset (Day/Swing/Position Trading)
- [ ] **Trigger:** Click "Apply" button or press Ctrl/Cmd+S
- [ ] **Verify Dialog Content:**
  - [ ] Title: "Apply '[Preset Name]' preset?"
  - [ ] Message: "This will change multiple indicator settings"
  - [ ] Checkbox: "Don't ask again"
  - [ ] Buttons: "Cancel" and "Apply"
- [ ] **Test Cancel:** Click "Cancel" or Esc
- [ ] **Expected:** Settings unchanged
- [ ] **Test Apply:** Click "Apply"
- [ ] **Expected:** Settings change to preset values

### Test 4.3: localStorage Preferences
- [ ] **Open Confirmation Dialog:** Press Ctrl/Cmd+R
- [ ] **Check "Don't ask again"**
- [ ] **Click "Reset"**
- [ ] **Press Ctrl/Cmd+R again**
- [ ] **Expected:** Settings reset immediately (no dialog)
- [ ] **Clear Preference:** Open browser DevTools → Application → Local Storage
- [ ] **Delete:** `confirmReset` key
- [ ] **Press Ctrl/Cmd+R**
- [ ] **Expected:** Confirmation dialog appears again

---

## Test Category 5: Cross-Browser Testing

### Test 5.1: Chrome/Edge
- [ ] **Open:** http://localhost:3000 in Chrome/Edge
- [ ] **Test All Keyboard Shortcuts:** Ctrl+I, Ctrl+R, Ctrl+S
- [ ] **Verify:** No conflicts, all shortcuts work
- [ ] **Check Console:** No errors

### Test 5.2: Firefox
- [ ] **Open:** http://localhost:3000 in Firefox
- [ ] **Test All Keyboard Shortcuts:** Ctrl+I, Ctrl+R, Ctrl+S
- [ ] **Verify:** No conflicts, all shortcuts work
- [ ] **Check Console:** No errors

### Test 5.3: Safari (Mac only)
- [ ] **Open:** http://localhost:3000 in Safari
- [ ] **Test All Keyboard Shortcuts:** Cmd+I, Cmd+R, Cmd+S
- [ ] **Verify:** No conflicts, all shortcuts work
- [ ] **Check Console:** No errors

### Test 5.4: Edge (Additional)
- [ ] **Open:** http://localhost:3000 in Edge
- [ ] **Test All Keyboard Shortcuts:** Ctrl+I, Ctrl+R, Ctrl+S
- [ ] **Verify:** No conflicts, all shortcuts work
- [ ] **Check Console:** No errors

---

## Test Category 6: Integration Testing

### Test 6.1: Multi-Indicator Interaction
- [ ] **Enable Multiple Indicators:** RSI, MACD, Bollinger Bands
- [ ] **Change Settings:** Modify periods for each
- [ ] **Apply Preset:** Select "Day Trading"
- [ ] **Verify:** All indicators update to preset values
- [ ] **Reset All:** Press Ctrl/Cmd+R
- [ ] **Verify:** All indicators reset to defaults

### Test 6.2: Panel Persistence
- [ ] **Open Panel:** Ctrl/Cmd+I
- [ ] **Enable Indicators:** RSI, MACD
- [ ] **Close Panel:** Ctrl/Cmd+I
- [ ] **Refresh Page:** F5
- [ ] **Expected:** Indicator settings persist (localStorage)
- [ ] **Open Panel:** Ctrl/Cmd+I
- [ ] **Verify:** Settings same as before refresh

### Test 6.3: Preset + Manual Changes
- [ ] **Apply Preset:** "Swing Trading"
- [ ] **Manual Change:** Modify RSI period to 18
- [ ] **Apply Different Preset:** "Day Trading"
- [ ] **Verify:** Manual change overwritten by preset
- [ ] **Expected Behavior:** Presets override all settings

---

## Test Category 7: Error Scenarios

### Test 7.1: Rapid Key Presses
- [ ] **Rapidly Press Ctrl/Cmd+I:** 10+ times quickly
- [ ] **Expected:** Panel toggles smoothly, no errors
- [ ] **Check Console:** No duplicate listeners or errors

### Test 7.2: Conflicting Actions
- [ ] **Open Confirmation Dialog:** Press Ctrl/Cmd+R
- [ ] **Press Ctrl/Cmd+I:** While dialog open
- [ ] **Expected:** Dialog stays open, panel doesn't toggle
- [ ] **Close Dialog:** Esc
- [ ] **Press Ctrl/Cmd+I:** Panel toggles correctly

### Test 7.3: Invalid State
- [ ] **Open Panel:** Ctrl/Cmd+I
- [ ] **Modify localStorage:** DevTools → Application → Local Storage
- [ ] **Set Invalid Value:** `{ "rsiPeriod": "invalid" }`
- [ ] **Refresh Page:** F5
- [ ] **Expected:** App recovers gracefully (defaults used)

---

## Success Criteria

### ✅ All Tests Pass If:
1. **Keyboard Shortcuts:**
   - [ ] All 3 shortcuts work (Ctrl/Cmd+I/R/S)
   - [ ] No browser conflicts (preventDefault working)
   - [ ] Conditional execution correct (Ctrl+S only with preset)

2. **Visual Elements:**
   - [ ] Shortcuts help section visible and readable
   - [ ] Tooltips show correct hints
   - [ ] Panel styling correct (floating, z-50, w-80)

3. **Accessibility:**
   - [ ] All elements keyboard-navigable
   - [ ] Focus states visible
   - [ ] Screen reader compatible (optional)

4. **Confirmation Dialogs:**
   - [ ] Appear when expected
   - [ ] Respect Cancel/Esc
   - [ ] Apply changes correctly
   - [ ] localStorage preferences work

5. **Cross-Browser:**
   - [ ] Works in Chrome, Firefox, Edge
   - [ ] Works on Mac (Safari, Cmd key)
   - [ ] No console errors

6. **Integration:**
   - [ ] Multi-indicator support
   - [ ] Settings persist across refreshes
   - [ ] Presets override manual changes

7. **Error Handling:**
   - [ ] No crashes on rapid input
   - [ ] Graceful recovery from invalid state
   - [ ] Conflicting actions handled

---

## Reporting Issues

If you find bugs during testing:

1. **Document Issue:**
   - Browser + version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Console errors (screenshot)

2. **Add to Todo List:**
   ```markdown
   - [ ] Bug: [Brief description]
     - Browser: [Chrome/Firefox/Edge/Safari]
     - OS: [Windows/Mac/Linux]
     - Steps: [1. 2. 3.]
     - Error: [Console message or behavior]
   ```

3. **Priority:**
   - **Critical:** Keyboard shortcuts don't work
   - **High:** Accessibility issues
   - **Medium:** UI polish (tooltips, styling)
   - **Low:** Edge cases, rare scenarios

---

## Completion Checklist

- [ ] All 7 test categories completed
- [ ] All success criteria met
- [ ] Issues documented (if any)
- [ ] Ready to proceed to Phase 6 (Documentation)

**Time Spent:** _____ minutes
**Issues Found:** _____ (list in todo)
**Status:** ✅ PASSED / ⚠️ NEEDS FIXES
