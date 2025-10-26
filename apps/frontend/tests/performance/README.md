# 🚀 Frontend Performance Testing Guide

> **Related**: H4 (Create Actual Performance Tests) - Phase 4, Workflow Optimization

## Overview

This directory contains performance tests for Lokifi's frontend application. We use **Playwright** for runtime performance metrics and **Lighthouse CI** for comprehensive performance audits.

---

## 🎯 What We Test

### 1. **Page Load Performance** (`critical-pages.spec.ts`)

Tests performance metrics for critical user journeys:

- **Homepage** (`/`)
- **Markets** (`/markets`)
- **Chart/Trading** (`/chart`)
- **Dashboard** (`/dashboard`)
- **Portfolio** (`/portfolio`)

**Metrics Measured**:

- DOM Content Loaded (< 2s)
- Full Page Load (< 3s)
- Response Time (< 1.5s)
- First Contentful Paint (< 2s)

### 2. **Resource Loading**

- **JavaScript Bundle Size**: Total JS < 2MB, individual files < 500KB
- **Image Optimization**: Individual images < 200KB
- **CSS Bundle Size**: Checked indirectly via load times

### 3. **Core Web Vitals**

- **First Contentful Paint (FCP)**: < 2s
- **Largest Contentful Paint (LCP)**: < 3s
- **Cumulative Layout Shift (CLS)**: Measured but not enforced (future)
- **Total Blocking Time (TBT)**: Measured via Lighthouse

---

## 🚀 Running Tests

### Local Development

```bash
# Run all performance tests
npm run test:performance

# Run performance tests in UI mode (debug)
npx playwright test tests/performance --ui

# Run performance tests in headed mode (see browser)
npx playwright test tests/performance --headed

# Run specific test file
npx playwright test tests/performance/critical-pages.spec.ts
```

### Lighthouse CI

```bash
# Run Lighthouse CI audit (requires build)
npm run test:performance:lhci

# Build first, then run
npm run build
npm run start &
npx lhci autorun
```

---

## 📊 Performance Budgets

### Page Load Budgets (Playwright)

| Metric                 | Threshold | Description                                  |
| ---------------------- | --------- | -------------------------------------------- |
| DOM Content Loaded     | < 2s      | Initial HTML parsed and DOM ready            |
| Full Page Load         | < 3s      | All resources loaded (images, scripts, etc.) |
| Response Time          | < 1.5s    | Time from request to first byte              |
| First Contentful Paint | < 2s      | First visual element painted                 |

### Lighthouse Budgets (LHCI)

| Category       | Minimum Score | Description                |
| -------------- | ------------- | -------------------------- |
| Performance    | 80%           | Overall performance score  |
| Accessibility  | 90%           | A11y compliance            |
| Best Practices | 85%           | Web best practices         |
| SEO            | 85%           | Search engine optimization |

### Core Web Vitals Budgets

| Metric                         | Threshold | Category |
| ------------------------------ | --------- | -------- |
| FCP (First Contentful Paint)   | < 2s      | Good     |
| LCP (Largest Contentful Paint) | < 3s      | Good     |
| CLS (Cumulative Layout Shift)  | < 0.1     | Good     |
| TBT (Total Blocking Time)      | < 300ms   | Good     |
| Speed Index                    | < 3.5s    | Good     |
| Time to Interactive            | < 4s      | Good     |

---

## 🏗️ Test Structure

```
tests/performance/
├── critical-pages.spec.ts    # Page load performance tests
├── README.md                  # This file
└── (future)
    ├── api-performance.spec.ts       # API response time tests
    ├── interaction-performance.spec.ts # UI interaction tests
    └── memory-leaks.spec.ts          # Memory leak detection
```

---

## 🔧 Configuration

### Playwright Configuration (`playwright.config.ts`)

Performance tests use the default Playwright configuration with:

- **Timeout**: 30s per test
- **Retries**: 2 on CI, 0 locally
- **Workers**: 1 on CI (serial), 4 locally (parallel)
- **Base URL**: `http://localhost:3000`

### Lighthouse CI Configuration (`.lighthouserc.json`)

Located at project root, configures:

- **Number of runs**: 3 (median used)
- **URLs tested**: 5 critical pages
- **Preset**: Desktop performance
- **Assertions**: Category scores + Core Web Vitals
- **Upload**: Temporary public storage

---

## 📈 CI/CD Integration

### GitHub Actions Workflow (`e2e.yml`)

Performance tests run in the `e2e-performance` job:

**Triggers**:

- Manual trigger (workflow_dispatch)
- Main branch pushes
- PRs with `performance` label

**Steps**:

1. Checkout repository
2. Setup E2E environment (Node.js, npm, Playwright)
3. Run performance tests
4. Upload performance report artifact (14 days retention)

**Timeout**: 10 minutes

---

## 🐛 Troubleshooting

### Test Failures

**Problem**: Performance test fails with timeout

```
Error: page.goto: Timeout 30000ms exceeded
```

**Solutions**:

- Check if dev server is running (`npm run dev`)
- Increase timeout in `playwright.config.ts` for performance tests
- Check network conditions (VPN, firewall)

**Problem**: Performance threshold exceeded

```
expect(loadTime).toBeLessThan(3000)
Expected: < 3000
Received: 3456
```

**Solutions**:

- Run tests multiple times (performance varies)
- Check system load (CPU, memory)
- Profile slow page with Lighthouse
- Consider adjusting threshold if consistently exceeded

### Lighthouse CI Failures

**Problem**: LHCI fails to connect to server

```
Error: Failed to connect to http://localhost:3000
```

**Solutions**:

- Build app first: `npm run build`
- Start production server: `npm run start`
- Wait for "ready on" message before running LHCI

**Problem**: Performance score below threshold

```
Assertion failed: categories:performance
Expected: >= 0.8
Received: 0.73
```

**Solutions**:

- Analyze Lighthouse report HTML
- Check for unoptimized images, large JS bundles
- Review network requests
- Consider relaxing threshold temporarily

---

## 📝 Best Practices

### Writing Performance Tests

✅ **DO**:

- Test critical user journeys only
- Use realistic test data
- Wait for `networkidle` before measuring
- Run tests multiple times (flakiness)
- Log warnings for soft limits (images, JS size)

❌ **DON'T**:

- Test every single page (too slow)
- Use unrealistic thresholds (< 1s load time)
- Fail on soft limits (image size warnings)
- Run performance tests in parallel (affects metrics)
- Measure performance on first load only

### Maintaining Performance Budgets

1. **Start Conservative**: Set achievable thresholds (80% performance score)
2. **Improve Gradually**: Increase thresholds as optimizations land
3. **Monitor Trends**: Track performance over time
4. **Alert on Regressions**: Fail CI on significant degradation (> 20%)

### Performance Optimization Tips

- **Code Splitting**: Use Next.js dynamic imports
- **Image Optimization**: Use Next.js Image component
- **Bundle Analysis**: Run `npm run build` and check bundle size
- **Lazy Loading**: Load non-critical components on demand
- **Caching**: Use proper cache headers for static assets

---

## 🔗 Related Documentation

- [Playwright Performance Guide](https://playwright.dev/docs/api/class-performance)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md)
- [Core Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)

---

## 🚀 Future Enhancements

**Planned Improvements**:

- [ ] API response time tests
- [ ] UI interaction performance (button clicks, form submissions)
- [ ] Memory leak detection
- [ ] Performance regression tracking (compare against baseline)
- [ ] Mobile performance tests
- [ ] Performance budgets per route

---

## 📞 Questions?

- **Workflow optimization**: See `docs/ci-cd/WORKFLOW_ACTION_PLAN.md`
- **E2E testing**: See `tests/e2e/README.md`
- **General testing**: See `tests/README.md`

---

**Last Updated**: October 26, 2025
**Version**: 1.0 (Initial implementation - H4)
