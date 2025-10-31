# Performance Logs

**Purpose**: Performance profiling, Lighthouse reports, React DevTools profiler data, and benchmarks.

## Common Files

- `lighthouse-report-*.json` - Lighthouse CI reports
- `profiler-*.json` - React DevTools profiler exports
- `performance-baseline.json` - Performance baselines
- `bundle-size-history.csv` - Bundle size tracking over time
- `render-performance-*.log` - Component render performance data

## Example Usage

```powershell
# Lighthouse performance audit
lighthouse http://localhost:3000 --output json --output-path logs/performance/lighthouse-report.json

# React DevTools profiler
# 1. Record profile in DevTools
# 2. Export profiler.json
# 3. Save to logs/performance/profiler-feature-name.json
```

## Benchmarking

Use this directory to track:

- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Total Blocking Time (TBT)
- Cumulative Layout Shift (CLS)
