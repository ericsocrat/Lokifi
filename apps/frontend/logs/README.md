# Frontend Logs Directory

**Purpose**: Organized storage for build artifacts, test outputs, and analysis logs.

## Directory Structure

```
logs/
├── lint/           # ESLint output files (lint-output*.txt)
├── coverage/       # Test coverage reports (coverage-output.log, htmlcov/)
├── build/          # Build logs and bundle analysis
├── test/           # Test execution logs (Vitest, Playwright)
├── performance/    # Performance profiling and benchmarks
└── security/       # Security scan reports (npm audit, dependency checks)
```

## Usage Patterns

### Lint Outputs (Sprint 5 Pattern)

```powershell
# Save lint output with session identifier
cd apps/frontend
npm run lint > logs/lint/lint-output-session59.txt

# Compare between sessions
diff logs/lint/lint-output-session58.txt logs/lint/lint-output-session59.txt
```

### Coverage Reports

```powershell
# Generate coverage with log
npm run test:coverage > logs/coverage/coverage-output-session59.log

# HTML coverage reports auto-generated to htmlcov/
```

### Build Logs

```powershell
# Capture build output
npm run build > logs/build/build-output-$(Get-Date -Format 'yyyyMMdd-HHmmss').log 2>&1

# Bundle analysis
npm run build -- --analyze > logs/build/bundle-analysis.txt
```

### Test Logs

```powershell
# Vitest test runs
npm test > logs/test/vitest-$(Get-Date -Format 'yyyyMMdd').log

# Playwright E2E tests
npm run test:e2e > logs/test/playwright-$(Get-Date -Format 'yyyyMMdd').log
```

### Performance Profiling

```powershell
# Lighthouse reports
lighthouse http://localhost:3000 --output json --output-path logs/performance/lighthouse-report.json

# React DevTools profiler exports
# Save profiler.json from DevTools to logs/performance/
```

### Security Scans

```powershell
# Dependency audit
npm audit > logs/security/npm-audit-$(Get-Date -Format 'yyyyMMdd').log

# TypeScript security patterns
npm run typecheck > logs/security/typecheck-$(Get-Date -Format 'yyyyMMdd').log
```

## File Naming Conventions

**Session-based** (Sprint work):

- `lint-output-session{N}.txt` - Sprint 5 lint tracking
- `coverage-output-session{N}.log` - Coverage evolution

**Timestamp-based** (Daily/CI):

- `build-output-yyyyMMdd-HHmmss.log` - Build logs
- `npm-audit-yyyyMMdd.log` - Daily security scans

**Feature-based** (Specific analysis):

- `bundle-analysis-feature-name.txt` - Feature impact analysis
- `performance-baseline.json` - Performance baselines

## Retention Policy

**Keep**:

- Latest 5 session files per category (Sprint tracking)
- Latest 7 daily logs (weekly rotation)
- All baseline and benchmark files (historical reference)

**Archive**:

- Older session files → `.archive/` subdirectory
- Quarterly performance reports

**Delete**:

- Build logs older than 30 days (unless tagged as significant)
- Test logs older than 14 days

## .gitignore Integration

All log files are automatically gitignored via:

```
logs/
*.log
lint-output*.txt
coverage-output.log
```

Baseline files and reports for documentation should be explicitly committed if needed.

## Best Practices

1. **Consistent naming**: Use session IDs or timestamps
2. **Context preservation**: Include git commit hash in log filenames when relevant
3. **Compression**: Compress old logs with `Compress-Archive` (PowerShell) or `gzip`
4. **Documentation**: Reference log files in commit messages for sprint work
5. **Automation**: Add log generation to `package.json` scripts

## Examples from Sprint 5

**Session 58 - Unescaped Entities**:

```powershell
# Before fix
npm run lint > logs/lint/lint-output-session58-before.txt  # 294 warnings

# After fix
npm run lint > logs/lint/lint-output-session58-after.txt   # 292 warnings
```

**Session 57 - Utility Files**:

```powershell
# Assessment phase
npm run lint > logs/lint/lint-output-session57-assessment.txt

# Post-fix validation
npm run lint > logs/lint/lint-output-session57-complete.txt
```

---

**Last Updated**: October 31, 2025 (Session 57)
**Maintainer**: Sprint 5 - ESLint Quality Campaign
