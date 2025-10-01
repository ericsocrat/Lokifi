# 🚀 Quick Start: Implementing Priority Test Automation

**Time Required:** 1-2 weeks
**Developer:** 1 Senior Full-Stack Developer
**ROI:** 6.8x first year return

---

## Day 1-2: API Contract Tests (Critical)

### Setup
```bash
cd frontend
npm install --save-dev supertest @pact-foundation/pact
```

### Create Test Structure
```bash
mkdir -p tests/api/contracts
touch tests/api/contracts/auth.contract.test.ts
touch tests/api/contracts/ohlc.contract.test.ts
touch tests/api/contracts/users.contract.test.ts
```

### Example Implementation
```typescript
// tests/api/contracts/auth.contract.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:8000';

describe('Authentication API Contract', () => {
  it('POST /api/auth/login - success', async () => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123'
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    // Contract assertions
    expect(data).toHaveProperty('access_token');
    expect(data).toHaveProperty('refresh_token');
    expect(data).toHaveProperty('token_type', 'bearer');
    expect(typeof data.access_token).toBe('string');
    expect(data.access_token.length).toBeGreaterThan(20);
  });

  it('POST /api/auth/login - validation error', async () => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '' })
    });

    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data).toHaveProperty('detail');
  });
});
```

### Add to CI
```yaml
# .github/workflows/api-contracts.yml
name: API Contract Tests

on: [push, pull_request]

jobs:
  api-contracts:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Start Backend
        working-directory: ./backend
        run: |
          pip install -r requirements.txt
          uvicorn app.main:app --host 0.0.0.0 --port 8000 &
          sleep 10
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/lokifi
          REDIS_URL: redis://localhost:6379

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install Frontend Dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run Contract Tests
        working-directory: ./frontend
        run: npm run test:contracts
        env:
          API_URL: http://localhost:8000
```

---

## Day 3-4: Performance Tests (Critical)

### Setup K6
```bash
# Install K6 (macOS)
brew install k6

# Install K6 (Windows)
choco install k6

# Install K6 (Linux)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Create Load Test
```bash
mkdir -p performance-tests
touch performance-tests/api-load.js
```

```javascript
// performance-tests/api-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm up
    { duration: '1m', target: 50 },    // Ramp up
    { duration: '3m', target: 50 },    // Stay at 50 users
    { duration: '1m', target: 100 },   // Spike test
    { duration: '3m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'],                  // <1% failures
    errors: ['rate<0.1'],                            // <10% error rate
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8000';

export default function () {
  // Test health endpoint
  let response = http.get(`${BASE_URL}/api/health`);
  check(response, {
    'health status is 200': (r) => r.status === 200,
    'health response < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);

  sleep(1);

  // Test OHLC endpoint
  response = http.get(`${BASE_URL}/api/ohlc/BTCUSDT/1h?limit=100`);
  check(response, {
    'ohlc status is 200': (r) => r.status === 200,
    'ohlc response < 500ms': (r) => r.timings.duration < 500,
    'ohlc returns array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.candles);
      } catch (e) {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'performance-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
```

### Run Locally
```bash
k6 run performance-tests/api-load.js
```

### Add to CI
```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  performance:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Start services
        run: |
          docker-compose -f docker-compose.test.yml up -d
          sleep 30

      - name: Install K6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz -L | tar xvz
          sudo mv k6-v0.48.0-linux-amd64/k6 /usr/local/bin

      - name: Run performance tests
        run: k6 run performance-tests/api-load.js
        env:
          API_URL: http://localhost:8000

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: performance-results
          path: performance-results.json

      - name: Check performance thresholds
        run: |
          if grep -q '"failed".*true' performance-results.json; then
            echo "❌ Performance thresholds not met"
            exit 1
          fi
```

---

## Day 5-6: Security Tests (Critical)

### Setup
```bash
cd frontend
npm install --save-dev helmet-csp-middleware @zap/zap-webdriver
```

### Create Security Tests
```bash
mkdir -p tests/security
touch tests/security/auth-security.test.ts
touch tests/security/input-validation.test.ts
touch tests/security/rate-limiting.test.ts
```

```typescript
// tests/security/auth-security.test.ts
import { describe, it, expect } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:8000';

describe('Security: Authentication', () => {
  it('rejects SQL injection in login', async () => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: "admin' OR '1'='1' --",
        password: "anything"
      })
    });

    expect(response.status).toBe(422); // Validation error, not 200
  });

  it('rejects weak passwords', async () => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'newuser',
        email: 'user@example.com',
        password: '123' // Too weak
      })
    });

    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.detail).toContain('password');
  });

  it('prevents brute force attacks', async () => {
    // Try 10 failed logins rapidly
    const attempts = Array(10).fill(null).map(() =>
      fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'test',
          password: 'wrong'
        })
      })
    );

    const responses = await Promise.all(attempts);
    const rateLimited = responses.filter(r => r.status === 429).length;

    // Should get rate limited after too many attempts
    expect(rateLimited).toBeGreaterThan(0);
  });

  it('invalidates tokens on logout', async () => {
    // Login
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123'
      })
    });

    const { access_token } = await loginResponse.json();

    // Logout
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    // Try to use token after logout
    const protectedResponse = await fetch(`${API_URL}/api/users/me`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    expect(protectedResponse.status).toBe(401);
  });
});
```

```typescript
// tests/security/input-validation.test.ts
import { describe, it, expect } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:8000';

describe('Security: Input Validation', () => {
  it('sanitizes XSS in user profile', async () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert("xss")>',
      'javascript:alert("xss")',
      '<iframe src="javascript:alert(\'xss\')"></iframe>',
    ];

    for (const payload of xssPayloads) {
      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test_token'
        },
        body: JSON.stringify({ name: payload })
      });

      if (response.ok) {
        const data = await response.json();
        // Should not contain script tags
        expect(data.name).not.toContain('<script>');
        expect(data.name).not.toContain('onerror=');
        expect(data.name).not.toContain('javascript:');
      }
    }
  });

  it('validates email format', async () => {
    const invalidEmails = [
      'not-an-email',
      '@example.com',
      'user@',
      'user @example.com',
    ];

    for (const email of invalidEmails) {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'test',
          email,
          password: 'StrongPass123!'
        })
      });

      expect(response.status).toBe(422);
    }
  });

  it('limits request payload size', async () => {
    const largePayload = 'x'.repeat(11 * 1024 * 1024); // 11MB

    const response = await fetch(`${API_URL}/api/users/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: largePayload
    });

    expect(response.status).toBe(413); // Payload Too Large
  });
});
```

### Add Security Scan to CI
```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  schedule:
    - cron: '0 3 * * 0' # Weekly on Sunday
  workflow_dispatch:

jobs:
  dependency-check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run Snyk Security Scan
        uses: snyk/actions/python@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Run npm audit
        working-directory: ./frontend
        run: |
          npm audit --audit-level=high

  security-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Start services
        run: docker-compose up -d

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run security tests
        working-directory: ./frontend
        run: npm test tests/security/ -- --run
        env:
          API_URL: http://localhost:8000
```

---

## Day 7: Component Test Fixes

### Fix Vitest Config
```typescript
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './setupTests.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/state': path.resolve(__dirname, './src/state'),
      '@/types': path.resolve(__dirname, './src/types'),
    },
  },
});
```

### Update Test Imports
```bash
# Run this to fix all test imports automatically
cd frontend
find tests -name "*.test.ts*" -exec sed -i "s|from '@/|from '../src/|g" {} \;
```

### Run Tests
```bash
npm test -- --run
```

---

## Day 8-10: Visual Regression & Accessibility

### Setup Visual Tests
```bash
cd frontend
npm install --save-dev @axe-core/playwright
```

### Create Visual Tests
```bash
mkdir -p tests/visual
touch tests/visual/chart-appearance.spec.ts
```

```typescript
// tests/visual/chart-appearance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('Chart default appearance', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 5000 });
    await page.waitForTimeout(2000); // Let chart fully render

    await expect(page).toHaveScreenshot('chart-default.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });

  test('Dark mode', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="theme-toggle"]');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('chart-dark.png');
  });
});
```

### Create Accessibility Tests
```typescript
// tests/a11y/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('Homepage meets WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab through elements
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });
});
```

---

## Summary: First Week Results

### What You'll Have
✅ API contract tests preventing breaking changes
✅ Performance tests ensuring scalability
✅ Security tests protecting against vulnerabilities
✅ Visual regression catching UI changes
✅ Accessibility tests ensuring WCAG compliance
✅ Component tests achieving 80%+ coverage

### CI/CD Status
✅ All tests running automatically on PR
✅ Security scans running weekly
✅ Performance benchmarks running daily
✅ Visual regression on every UI change

### Metrics
- **Test Coverage:** 75% → 90%+
- **CI/CD Time:** <15 minutes
- **Confidence:** High for deployments
- **Bug Detection:** 70% earlier

---

## Quick Commands Reference

```bash
# Run all tests
npm test -- --run

# Run specific test suite
npm run test:contracts
npm run test:e2e
npm run test:visual
npm run test:a11y

# Run performance tests
k6 run performance-tests/api-load.js

# Update visual snapshots
npm run test:visual -- --update-snapshots

# Check test coverage
npm test -- --coverage

# Run security scan
npm audit
```

---

**Ready to start?** Follow Day 1-2 first, then proceed sequentially. Each day builds on the previous, creating a robust test automation foundation.

**Need help?** Reference the full `TEST_AUTOMATION_RECOMMENDATIONS.md` for detailed explanations and examples.
