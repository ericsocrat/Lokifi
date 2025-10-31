# Security Logs

**Purpose**: Security scans, dependency audits, vulnerability reports, and TypeScript security patterns.

## Common Files

- `npm-audit-*.log` - npm dependency vulnerability scans
- `snyk-report-*.json` - Snyk security reports (if using Snyk)
- `typecheck-security-*.log` - TypeScript type safety validation
- `dependency-check-*.txt` - Dependency license and security checks

## Example Usage

```powershell
# npm audit
npm audit > logs/security/npm-audit-$(Get-Date -Format 'yyyyMMdd').log

# npm audit with fix suggestions
npm audit --json > logs/security/npm-audit-detailed-$(Get-Date -Format 'yyyyMMdd').json

# TypeScript security (type safety)
npm run typecheck > logs/security/typecheck-$(Get-Date -Format 'yyyyMMdd').log
```

## Security Tracking

Monitor for:

- High/Critical vulnerabilities in dependencies
- Deprecated packages
- Type safety violations
- XSS/injection vulnerabilities
- Exposed secrets or API keys
