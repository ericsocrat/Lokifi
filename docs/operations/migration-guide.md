# Migration Guide

## Overview

Lokifi v2.0 introduces comprehensive enhancements (Part G) and seamless upgrade foundations (Part H). All new features are **feature-flagged and OFF by default** for safe deployment.

## Breaking Changes

### None for Default Configuration

When all feature flags are OFF (default), the application functions identically to v1.x with no breaking changes.

## Client State Migrations

### Schema Versioning

All persisted client state now includes `schemaVersion`. The migration system handles upgrades automatically:

```typescript
// Before (v1)
localStorage.setItem('pane-storage', JSON.stringify({
  panes: [...]
}));

// After (v2) 
localStorage.setItem('pane-storage', JSON.stringify({
  schemaVersion: 1,
  data: {
    panes: [...]
  }
}));
```

### Automatic Migration

The system detects and migrates legacy state on first load:

1. **Detection**: Missing `schemaVersion` → treated as v0
2. **Migration**: `migrateAll()` upgrades to current version
3. **Fallback**: Invalid migrations preserve original state with warnings

### Manual State Reset

Users can reset all client state via Settings → Advanced → "Reset All Data" if migrations fail.

## API Changes

### Backwards Compatible

All existing API endpoints remain functional. New endpoints are additive:

- `/api/symbols` - Enhanced with filtering (backwards compatible)
- `/api/ohlc` - Added quality validation (backwards compatible) 
- `/api/health` - Enhanced with dependency status
- `/api/templates` - New (behind flag)
- `/api/alerts` - New (behind flag)
- `/api/social/*` - New (behind flag)

### Type Safety

Generated TypeScript types from OpenAPI schema ensure contract compliance:

```bash
# CI automatically checks for type drift
npm run typecheck  # Must pass
npm run test:contracts  # Validates API responses
```

## Feature Enablement

### Environment Variables

Enable features by setting flags to `1`:

```bash
# .env
NEXT_PUBLIC_FLAG_MULTI_CHART=1
NEXT_PUBLIC_FLAG_WATCHLIST=1
```

### Development

Use the debug page for live testing:

```bash
npm run dev
# Visit http://localhost:3000/dev/flags
```

### Production Rollout

Recommended gradual rollout:

1. **Staging**: Enable all flags, run full test suite
2. **Canary**: Enable single flag (e.g., `multiChart`)
3. **Production**: Gradual flag enablement with monitoring

## Database Migrations

### Redis Schema

New Redis keys (only created when flags enabled):

```
lokifi:templates:{userId}  # Chart templates
lokifi:watchlist:{userId}  # Watchlists  
lokifi:alerts:{userId}     # Alerts
lokifi:portfolio:{userId}  # Paper trading
lokifi:social:threads:{symbol}  # Social threads
```

### Cleanup

Unused data can be cleaned up:

```bash
# Remove all template data
redis-cli --scan --pattern "lokifi:templates:*" | xargs redis-cli del

# Remove all social data  
redis-cli --scan --pattern "lokifi:social:*" | xargs redis-cli del
```

## Performance Considerations

### Web Workers

Heavy computations now run in Web Workers (when supported):

- **Indicators**: RSI, MACD calculations
- **Backtesting**: Strategy execution
- **Screener**: Symbol filtering

### Memory Usage

New features increase memory footprint:

- **Multi-chart**: ~2-4x base memory (per chart)
- **Social**: ~10MB for threads cache
- **Templates**: ~1MB for template storage

### Network

Additional API calls when features enabled:

- **Watchlist**: Periodic symbol updates
- **Alerts**: Real-time condition checking
- **Social**: Thread polling

## Testing

### Feature Flag Testing

All new features have comprehensive test coverage:

```bash
# Unit tests
npm test

# E2E tests (with flags enabled)
NEXT_PUBLIC_FLAG_MULTI_CHART=1 npm run test:e2e

# Visual regression (when enabled)
NEXT_PUBLIC_FLAG_VISUAL_REGRESSION=1 npm run test:visual
```

### CI Integration

CI runs tests with flags ON and OFF to ensure both modes work:

```yaml
# .github/workflows/test.yml
test-without-flags:
  # All flags OFF (default)
  
test-with-flags: 
  env:
    NEXT_PUBLIC_FLAG_MULTI_CHART: 1
    NEXT_PUBLIC_FLAG_WATCHLIST: 1
    # ... other flags
```

## Rollback Plan

### Emergency Rollback

If issues arise, immediately disable flags:

```bash
# Emergency disable all enhancements
export NEXT_PUBLIC_FLAG_MULTI_CHART=0
export NEXT_PUBLIC_FLAG_WATCHLIST=0
# ... set all to 0

# Redeploy
```

### Data Preservation

Client state remains intact during rollbacks. Re-enabling flags restores functionality.

### Version Rollback

If needed, rollback to v1.x:

1. Deploy previous container version
2. Client state migrations are forward-compatible
3. New Redis keys are ignored by v1.x

## Support

### Debugging

Debug information available:

- **Flags**: `/dev/flags` (development)
- **Migrations**: Console logs show migration paths
- **Performance**: TTI metrics in console (when enabled)
- **Errors**: Structured error codes in API responses

### Monitoring

Key metrics to monitor:

- **Feature adoption**: Flag usage rates
- **Performance**: TTI with/without features
- **Errors**: Migration failures, API errors
- **Memory**: Browser memory usage by feature

### Documentation

- **API**: OpenAPI docs at `/docs` (when enabled)
- **Features**: In-app help tooltips
- **Migration**: This guide and console warnings