# Test Logs

**Purpose**: Unit test, integration test, and E2E test execution logs.

## Common Files

- `vitest-*.log` - Vitest unit/integration test runs
- `playwright-*.log` - Playwright E2E test runs
- `test-summary-*.json` - Machine-readable test results
- `test-failures-*.log` - Failed test details for debugging

## Example Usage

```powershell
# Vitest test runs with output
npm test > logs/test/vitest-$(Get-Date -Format 'yyyyMMdd').log

# Playwright E2E tests
npm run test:e2e > logs/test/playwright-$(Get-Date -Format 'yyyyMMdd').log

# Watch mode (don't log, use for development)
npm test -- --watch
```

## Test Categories

- **Unit Tests**: Component and utility function tests (Vitest)
- **Integration Tests**: API integration, store integration (Vitest)
- **E2E Tests**: Full user flow testing (Playwright)
- **Contract Tests**: API contract validation
