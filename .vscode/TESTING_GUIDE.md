# 🧪 Testing Extensions - Quick Start Guide

## 📦 Installed Testing Extensions

### 1. **Vitest Explorer** (`vitest.explorer`)
Run and debug your Vitest tests directly from VS Code.

**How to use:**
- Open the Testing sidebar (beaker icon) or press `Ctrl+Shift+T`
- Your test files will appear in a tree view
- Click the play button next to any test to run it
- Click the debug icon to debug with breakpoints
- Watch mode is enabled by default

**Keyboard Shortcuts:**
- `Ctrl+Shift+T` - Open Test Explorer
- Right-click test → "Run Test" or "Debug Test"

---

### 2. **Playwright Test for VS Code** (`ms-playwright.playwright`)
Run E2E, visual, and accessibility tests with ease.

**How to use:**
- Install Playwright browsers: `npx playwright install`
- Tests appear in the Testing sidebar under "Playwright"
- Click "Pick Locator" to visually select elements
- View trace files by clicking on failed test results
- Run tests in headed mode for debugging

**Quick Commands:**
```bash
# Run all E2E tests
npm run test:e2e

# Run visual regression tests
npm run test:visual

# Run accessibility tests
npm run test:a11y

# Open Playwright UI
npx playwright test --ui
```

---

### 3. **Coverage Gutters** (`ryanluker.vscode-coverage-gutters`)
See test coverage directly in your editor.

**How to use:**
1. Generate coverage: `npm run test:coverage`
2. Press `Ctrl+Shift+P` → "Coverage Gutters: Display Coverage"
3. Green gutters = covered lines
4. Red gutters = uncovered lines
5. Click "Watch" in status bar to auto-refresh

**Keyboard Shortcuts:**
- `Ctrl+Shift+7` - Toggle coverage display
- `Ctrl+Shift+8` - Watch coverage file

**Coverage files:**
- Frontend: `apps/frontend/coverage/lcov.info`
- Backend: `apps/backend/coverage/coverage.xml`

---

### 4. **Console Ninja** (`wallabyjs.console-ninja`)
See console.log output inline in your editor.

**How to use:**
- Just add `console.log()` in your code
- Output appears as inline comments
- Works with Next.js dev server
- Shows async operation results
- No configuration needed!

**Features:**
- ✅ Real-time console output
- ✅ Object inspection inline
- ✅ Async/Promise tracking
- ✅ Performance timings

---

### 5. **Import Cost** (`wix.vscode-import-cost`)
See the bundle size of your imports.

**How to use:**
- Package sizes appear inline next to imports
- Color-coded by size:
  - 🔵 Small (<50KB)
  - 🟡 Medium (50-100KB)
  - 🔴 Large (>100KB)

**Example:**
```typescript
import React from 'react'; // 2.5KB (gzipped)
import lodash from 'lodash'; // 70KB 🟡 WARNING
import { debounce } from 'lodash'; // 2KB 🔵 GOOD
```

---

## 🚀 Quick Testing Workflow

### Running Tests

**Unit Tests (Vitest):**
```bash
# Watch mode (recommended for development)
npm test

# Run once (CI mode)
npm run test:ci

# With coverage
npm run test:coverage
```

**E2E Tests (Playwright):**
```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/chart-reliability.spec.ts

# Debug mode (headed browser)
npx playwright test --debug

# UI mode (best for local development)
npx playwright test --ui
```

**All Tests:**
```bash
# Type check + Unit + E2E
npm run test:all
```

---

## 🎯 Testing Sidebar Usage

### Test Explorer View
1. Click the beaker icon 🧪 in the Activity Bar
2. You'll see two sections:
   - **Vitest** - Unit/integration tests
   - **Playwright** - E2E tests

### Running Individual Tests
- ▶️ Click play icon next to test name
- 🐛 Click debug icon to debug with breakpoints
- ♻️ Click refresh to reload tests

### Filtering Tests
- Use search box at top of Test Explorer
- Filter by test name, file, or status
- Click funnel icon for advanced filters

---

## 📊 Coverage Workflow

### Generate Coverage Report
```bash
cd apps/frontend
npm run test:coverage
```

### View Coverage in VS Code
1. Press `Ctrl+Shift+P`
2. Type "Coverage Gutters: Display Coverage"
3. Green = covered, Red = uncovered
4. Click "Watch" in status bar for auto-refresh

### Coverage Thresholds
Current settings (vitest.config.ts):
```typescript
coverage: {
  threshold: {
    branches: 17.5,
    functions: 17.5,
    lines: 17.5,
    statements: 17.5
  }
}
```

---

## 🐛 Debugging Tests

### Vitest (Unit Tests)
1. Set breakpoints in test file
2. Click debug icon next to test in Test Explorer
3. Debugger will pause at breakpoints
4. Use Debug Console to inspect variables

### Playwright (E2E Tests)
**Option 1: VS Code Debugger**
1. Set breakpoints in `.spec.ts` file
2. Click debug icon in Test Explorer
3. Browser opens in debug mode

**Option 2: Playwright UI**
```bash
npx playwright test --ui
```
- Time-travel debugging
- Network inspection
- Screenshot comparison
- Trace viewer

**Option 3: Headed Mode**
```bash
npx playwright test --headed --debug
```

---

## ⚙️ Configuration Files

### Vitest Configuration
- **File**: `apps/frontend/vitest.config.ts`
- **Test setup**: `apps/frontend/src/test/setup.ts`
- **Coverage**: Configured with thresholds

### Playwright Configuration
- **File**: `apps/frontend/playwright.config.ts`
- **Test directory**: `apps/frontend/tests/e2e`
- **Browsers**: Chromium by default

### VS Code Settings
- **File**: `.vscode/settings.json`
- **Vitest**: Auto-discovery enabled
- **Playwright**: Reuse browser enabled
- **Coverage**: Auto-detect coverage files

---

## 🎨 Console Ninja Tips

### View Logs Inline
```typescript
const data = await fetchData();
console.log(data); // Output appears here →
```

### Debug Async Operations
```typescript
async function loadData() {
  const response = await fetch('/api/data');
  console.log('Response:', response); // ← Status shows inline
  const json = await response.json();
  console.log('Data:', json); // ← Data preview inline
  return json;
}
```

### Performance Tracking
```typescript
console.time('operation');
// ... your code ...
console.timeEnd('operation'); // ← Duration shows inline
```

---

## 📦 Import Cost Tips

### Optimize Bundle Size
```typescript
// ❌ BAD - Imports entire library (70KB)
import _ from 'lodash';

// ✅ GOOD - Imports only what you need (2KB)
import { debounce } from 'lodash';

// ✅ BETTER - Use lodash-es for tree-shaking
import debounce from 'lodash-es/debounce';
```

### Monitor Heavy Imports
Look for red warnings (>100KB) and consider:
1. Code splitting with dynamic imports
2. Replacing with lighter alternatives
3. Lazy loading components

---

## 🔥 Keyboard Shortcuts Cheat Sheet

| Action | Shortcut |
|--------|----------|
| Open Test Explorer | `Ctrl+Shift+T` |
| Toggle Coverage | `Ctrl+Shift+7` |
| Watch Coverage | `Ctrl+Shift+8` |
| Run Test at Cursor | Right-click → Run Test |
| Debug Test | Right-click → Debug Test |
| Open Command Palette | `Ctrl+Shift+P` |

---

## 📚 Additional Resources

### Vitest
- Docs: https://vitest.dev
- Extension: https://marketplace.visualstudio.com/items?itemName=vitest.explorer

### Playwright
- Docs: https://playwright.dev
- Extension: https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright
- Trace Viewer: https://playwright.dev/docs/trace-viewer

### Coverage
- Istanbul/NYC: https://istanbul.js.org
- Coverage Gutters: https://marketplace.visualstudio.com/items?itemName=ryanluker.vscode-coverage-gutters

---

## 🎯 Next Steps

1. ✅ **Run your first test**: Open Test Explorer and click play
2. ✅ **Generate coverage**: `npm run test:coverage` then display gutters
3. ✅ **Try Playwright UI**: `npx playwright test --ui`
4. ✅ **Debug a test**: Set a breakpoint and click debug icon
5. ✅ **Monitor bundle size**: Check Import Cost warnings

---

## 🆘 Troubleshooting

### Tests Not Appearing in Explorer
1. Reload Window: `Ctrl+Shift+P` → "Reload Window"
2. Check test file naming: `*.test.ts` or `*.spec.ts`
3. Verify vitest.enable is true in settings

### Coverage Not Showing
1. Generate coverage first: `npm run test:coverage`
2. Check coverage file exists: `apps/frontend/coverage/lcov.info`
3. Press `Ctrl+Shift+7` to toggle coverage display

### Console Ninja Not Working
1. Restart Next.js dev server: `npm run dev`
2. Check Console Ninja is enabled in status bar
3. Clear browser cache and reload

### Playwright Tests Failing
1. Install browsers: `npx playwright install`
2. Start dev servers (backend + frontend)
3. Check baseURL in `playwright.config.ts`

---

**Happy Testing! 🎉**

For more help, check the docs or ask GitHub Copilot Chat.
