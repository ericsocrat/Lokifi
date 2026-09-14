# Lokifi Security Analysis MCP Server

**Version**: 1.0.0  
**Status**: ✅ Production-Ready  
**Tools**: 6

---

## Overview

The **Lokifi Security Analysis MCP Server** provides centralized security analysis and alert management for GitHub Copilot. It integrates with GitHub CodeQL, Dependabot, and performs local secret scanning to provide comprehensive security insights.

### Key Features

- ✅ Unified view of CodeQL + Dependabot alerts
- ✅ Automated false positive dismissal with tracking
- ✅ Historical security trends and MTTR analysis
- ✅ Pattern-based secret detection in codebase
- ✅ CVE-scored dependency risk assessment
- ✅ Prioritized update recommendations

---

## Installation

### Prerequisites

- Node.js >= 18.0.0
- GitHub CLI (`gh`) authenticated with repo access
- @modelcontextprotocol/sdk >= 0.5.0

### Setup

```bash
# 1. Ensure dependencies are installed
cd tools
npm install @modelcontextprotocol/sdk

# 2. Authenticate GitHub CLI (if not already)
gh auth login

# 3. Verify access to repository
gh api /repos/ericsocrat/Lokifi/code-scanning/alerts --jq 'length'

# 4. Test the server
node mcp-security-server.js  # Should output: "Lokifi Security Analysis MCP Server running on stdio"
```

### VS Code Configuration

Add to `.vscode/settings.json`:

```json
{
  "github.copilot.chat.mcpServers": {
    "lokifi-security": {
      "command": "node",
      "args": ["${workspaceFolder}/tools/mcp-security-server.js"]
    }
  }
}
```

**Restart VS Code** after configuration to activate the MCP server.

---

## Tool Reference

### Tool 1: list_security_alerts

**Purpose**: List all open security alerts from CodeQL and Dependabot with filtering options.

**Input Parameters**:
- `type` (optional): "all" | "codeql" | "dependabot" (default: "all")
- `severity` (optional): "all" | "critical" | "high" | "medium" | "low" (default: "all")
- `limit` (optional): number (default: 50) - Max alerts per type

**Output**:
```json
{
  "success": true,
  "alerts": {
    "codeql": [
      {
        "number": 47,
        "rule": "js/sql-injection",
        "severity": "high",
        "description": "Database query built from user-controlled sources",
        "location": "apps/backend/app/api/routes/user.py:145",
        "created_at": "2026-01-10T14:23:00Z",
        "state": "open",
        "url": "https://github.com/..."
      }
    ],
    "dependabot": [
      {
        "number": 23,
        "package": "fastapi",
        "severity": "high",
        "summary": "Improper Input Validation",
        "cve": "CVE-2024-12345",
        "vulnerable_version": "<0.128.0",
        "patched_version": "0.128.0",
        "created_at": "2026-01-08T10:15:00Z",
        "state": "open",
        "url": "https://github.com/..."
      }
    ],
    "summary": {
      "total": 7,
      "byType": { "codeql": 5, "dependabot": 2 },
      "bySeverity": { "critical": 1, "high": 3, "medium": 2, "low": 1 },
      "critical": 1,
      "high": 3,
      "medium": 2,
      "low": 1
    }
  },
  "message": "Found 7 open security alerts (CodeQL: 5, Dependabot: 2)"
}
```

**Example Queries**:
- "List all security alerts"
- "Show me high severity CodeQL alerts"
- "Get critical Dependabot vulnerabilities"

---

### Tool 2: get_alert_details

**Purpose**: Get comprehensive details about a specific alert including remediation guidance.

**Input Parameters** (required):
- `type`: "codeql" | "dependabot"
- `alert_number`: number - Alert ID from GitHub

**Output (CodeQL)**:
```json
{
  "success": true,
  "alert": {
    "number": 47,
    "rule": {
      "id": "js/sql-injection",
      "name": "Database query built from user-controlled sources",
      "severity": "error",
      "security_severity_level": "8.8",
      "description": "...",
      "help": "To avoid SQL injection, use parameterized queries...",
      "tags": ["security", "external/cwe/cwe-089"]
    },
    "location": {
      "path": "apps/backend/app/api/routes/user.py",
      "start_line": 145,
      "end_line": 147,
      "message": "This query depends on a user-provided value."
    },
    "state": "open",
    "created_at": "2026-01-10T14:23:00Z",
    "updated_at": "2026-01-10T14:23:00Z",
    "url": "https://github.com/...",
    "instances": "https://api.github.com/..."
  }
}
```

**Output (Dependabot)**:
```json
{
  "success": true,
  "alert": {
    "number": 23,
    "package": {
      "ecosystem": "pip",
      "name": "fastapi"
    },
    "severity": "high",
    "summary": "Improper Input Validation in FastAPI",
    "description": "FastAPI versions before 0.128.0 allow...",
    "cve": {
      "id": "CVE-2024-12345",
      "cvss_score": "8.6",
      "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
    },
    "vulnerable_version": "<0.128.0",
    "patched_version": "0.128.0",
    "references": [
      { "url": "https://nvd.nist.gov/vuln/detail/CVE-2024-12345" }
    ],
    "state": "open",
    "created_at": "2026-01-08T10:15:00Z",
    "updated_at": "2026-01-08T10:15:00Z",
    "url": "https://github.com/..."
  }
}
```

**Example Queries**:
- "Get details for CodeQL alert #47"
- "Show me Dependabot alert #23 information"
- "What's the remediation for alert #12?"

---

### Tool 3: dismiss_false_positive

**Purpose**: Dismiss a CodeQL alert as false positive with documented reason.

**Input Parameters** (required):
- `alert_number`: number - CodeQL alert ID
- `reason`: "false positive" | "won't fix" | "used in tests"
- `comment`: string - Explanation for dismissal

**Output**:
```json
{
  "success": true,
  "message": "Alert #47 dismissed as 'false positive' with comment: This is validated server-side before database query execution."
}
```

**Example Queries**:
- "Dismiss CodeQL alert #47 as false positive because it's validated server-side"
- "Mark alert #12 as won't fix - legacy code scheduled for removal in Q2"
- "Dismiss alert #34 as used in tests only"

**Note**: Only works for CodeQL alerts. Dependabot alerts must be dismissed via GitHub UI.

---

### Tool 4: get_security_trends

**Purpose**: Analyze historical security trends, resolution rates, and Mean Time To Resolution (MTTR).

**Input Parameters**:
- `days` (optional): number (default: 30) - Analysis period in days

**Output**:
```json
{
  "success": true,
  "trends": {
    "period": "30 days",
    "codeql": {
      "total": 45,
      "open": 5,
      "closed": 40,
      "created_in_period": 12,
      "closed_in_period": 15
    },
    "dependabot": {
      "total": 28,
      "open": 2,
      "closed": 26,
      "created_in_period": 8,
      "closed_in_period": 10
    },
    "mttr": {
      "codeql_days": "3.45",
      "dependabot_days": "2.12",
      "overall_days": "2.79"
    }
  },
  "message": "Security trends for the last 30 days analyzed successfully."
}
```

**Metrics Explained**:
- **total**: All alerts ever created (open + closed)
- **open**: Currently open alerts
- **closed**: Resolved (dismissed or fixed) alerts
- **created_in_period**: New alerts created in specified period
- **closed_in_period**: Alerts resolved in specified period
- **mttr**: Average days from alert creation to resolution

**Example Queries**:
- "Show security trends for the last 30 days"
- "What's our MTTR for security alerts?"
- "How many alerts did we resolve last month?"
- "Get security trends for the last 90 days"

---

### Tool 5: scan_for_secrets

**Purpose**: Scan codebase for potential hardcoded secrets using pattern matching.

**Input Parameters**:
- `paths` (optional): string[] (default: ["apps/", "infra/"]) - Paths to scan
- `exclude_patterns` (optional): string[] (default: [".env.example", "test", "mock", ".md"]) - Patterns to exclude

**Detected Secret Types**:
| Type | Pattern | Severity |
|------|---------|----------|
| AWS Access Key | `AKIA[0-9A-Z]{16}` | high |
| GitHub Token | `gh[pousr]_[A-Za-z0-9_]{36,255}` | high |
| API Key | `api[_-]?key[\s]*[=:]+...` | medium |
| Private Key | `-----BEGIN PRIVATE KEY-----` | critical |
| Password | `password[\s]*[=:]+...` | medium |
| JWT Token | `eyJ[A-Za-z0-9_-]*...` | high |
| Database URL | `postgres://...`, `mongodb://...` | high |

**Output**:
```json
{
  "success": true,
  "findings": [
    {
      "severity": "critical",
      "type": "Private Key",
      "file": "infra/docker/secrets/old_key.pem",
      "line": 1,
      "content": "-----BEGIN RSA PRIVATE KEY-----..."
    },
    {
      "severity": "high",
      "type": "API Key",
      "file": "apps/backend/app/config.py",
      "line": 47,
      "content": "api_key = 'sk_live_abc123xyz789'"
    }
  ],
  "summary": {
    "critical": 1,
    "high": 5,
    "medium": 3,
    "total": 9
  },
  "message": "Scanned apps/, infra/ - Found 9 potential secrets (1 critical, 5 high, 3 medium)"
}
```

**Example Queries**:
- "Scan for hardcoded secrets"
- "Find API keys in the codebase"
- "Scan apps/ and infra/ for passwords"
- "Check for secrets excluding test files"

**Notes**:
- Results are sorted by severity (critical → high → medium → low)
- Automatically excludes: node_modules, .git, venv, __pycache__, dist, build
- Only scans text files: .js, .ts, .tsx, .py, .env, .yml, .yaml, .json, .sh
- False positives possible - review each finding manually

---

### Tool 6: analyze_dependency_risk

**Purpose**: Analyze dependency vulnerabilities with CVE scores and prioritized update recommendations.

**Input Parameters**:
- `ecosystem` (optional): "all" | "npm" | "pip" | "docker" (default: "all") - Filter by package ecosystem

**Output**:
```json
{
  "success": true,
  "analysis": {
    "total_vulnerabilities": 7,
    "by_ecosystem": {
      "pip": 5,
      "npm": 2
    },
    "by_severity": {
      "critical": 1,
      "high": 3,
      "medium": 2,
      "low": 1
    },
    "high_risk_packages": [
      {
        "package": "starlette",
        "ecosystem": "pip",
        "severity": "high",
        "cve": "CVE-2024-54321",
        "cvss_score": "8.6",
        "vulnerable_version": "0.51.0",
        "patched_version": "0.52.0",
        "summary": "Server-side request forgery vulnerability"
      }
    ],
    "update_recommendations": [
      {
        "action": "upgrade",
        "package": "starlette",
        "from": "0.51.0",
        "to": "0.52.0",
        "priority": "HIGH",
        "reason": "Server-side request forgery vulnerability"
      },
      {
        "action": "investigate",
        "package": "old-legacy-package",
        "priority": "HIGH",
        "reason": "No patched version available - consider alternative package or mitigation"
      }
    ]
  },
  "message": "Analyzed 7 dependency vulnerabilities. 4 high-risk packages found."
}
```

**Action Types**:
- **upgrade**: Patched version available → Upgrade immediately
- **investigate**: No patch available → Find alternative or mitigation

**Priority Levels**:
- **URGENT**: Critical severity vulnerabilities
- **HIGH**: High severity or no patch available

**Example Queries**:
- "Analyze dependency vulnerabilities"
- "Show me high-risk npm packages"
- "Get CVE scores for Python dependencies"
- "Which dependencies need urgent updates?"

---

## Usage Patterns

### Daily Security Triage Workflow

```plaintext
1. Morning Check:
   "List all security alerts" → Get overview

2. Prioritize:
   "Show me critical and high severity alerts" → Focus on urgent items

3. Investigate:
   "Get details for alert #47" → Understand context

4. Action:
   - If valid: Fix code, open PR
   - If false positive: "Dismiss alert #47 as false positive because..."

5. Verify:
   "Get security trends for the last 7 days" → Track progress
```

### Sprint Planning

```plaintext
1. Risk Assessment:
   "Analyze dependency vulnerabilities" → Identify high-risk packages

2. Prioritization:
   Sort by priority: URGENT → HIGH → MEDIUM

3. Sprint Tasks:
   Create tickets for "upgrade" actions (quick wins)
   Research tickets for "investigate" actions (complex)

4. Secret Audit (Monthly):
   "Scan for hardcoded secrets" → Validate no new leaks
```

### Security Review Process

```plaintext
Before Merge:
1. "Scan for secrets in apps/new-feature/" → No new hardcoded secrets
2. "List all security alerts" → No new critical/high alerts introduced

After Merge:
3. "Get security trends" → MTTR staying low?
4. "Analyze dependency risk" → New vulnerabilities from dependency updates?
```

---

## Integration Examples

### With Copilot Chat

```
You: "What security issues do we have?"
Copilot: *Uses list_security_alerts* → "7 open alerts: 1 critical, 3 high, 2 medium, 1 low"

You: "Show me the critical one"
Copilot: *Uses get_alert_details* → Full context with remediation

You: "Can you fix it?"
Copilot: *Suggests code fix* → You review and apply

You: "Dismiss alert #23 as false positive - this endpoint requires authentication"
Copilot: *Uses dismiss_false_positive* → Alert dismissed with comment
```

### With Other MCP Servers

**Security + Coverage MCP**:
```
"Which untested files have security alerts?"
→ Combines lokifi-security + lokifi-coverage data
→ Prioritizes files with low coverage + high security risk
```

**Security + Codebase MCP**:
```
"What's the blast radius of fixing alert #47?"
→ Uses get_alert_details (location) + get_dependency_impact
→ Shows which files import the vulnerable module
```

**Security + Git MCP**:
```
"Who introduced the code that caused alert #47?"
→ Uses get_alert_details (file + line) + git_blame
→ Shows commit history and author
```

---

## Troubleshooting

### Common Issues

**Issue**: "GitHub CLI error: HTTP 403"  
**Solution**:
```bash
gh auth refresh --scopes repo,security_events
gh auth status
```

**Issue**: "Cannot find path: apps/"  
**Solution**: Run from repository root, not subdirectory
```bash
cd c:\Users\ericsocrat\Desktop\lokifi
```

**Issue**: "No alerts found" but GitHub UI shows alerts  
**Solution**: Check organization/repository access:
```bash
gh api /user/repos | jq '.[] | select(.name=="Lokifi")'
```

**Issue**: Secret scanner finds too many false positives  
**Solution**: Add exclusions:
```
"Scan for secrets excluding test, mock, example, .md files"
```

### Debugging

**Enable verbose logging**:
```bash
# Add to mcp-security-server.js before tool execution:
console.error(`[DEBUG] Tool: ${name}, Args:`, JSON.stringify(args));
```

**Test GitHub API access**:
```bash
gh api /repos/ericsocrat/Lokifi/code-scanning/alerts --jq 'length'
gh api /repos/ericsocrat/Lokifi/dependabot/alerts --jq 'length'
```

**Verify MCP server is running**:
- Check VS Code Output panel → "GitHub Copilot Chat"
- Look for: "Lokifi Security Analysis MCP Server running on stdio"
- If missing, restart VS Code

---

## Roadmap

### Version 1.1 (Q1 2026)

- [ ] **SARIF Export**: Export alerts in SARIF format for CI integration
- [ ] **Custom Secret Patterns**: User-defined regex patterns via config file
- [ ] **Webhook Integration**: Slack/email notifications for new critical alerts
- [ ] **Remediation Templates**: Auto-generate PRs with security fixes

### Version 1.2 (Q2 2026)

- [ ] **SAST Integration**: Integrate additional SAST tools (Semgrep, Bandit)
- [ ] **Compliance Reporting**: Generate SOC2/ISO27001 compliance reports
- [ ] **False Positive Learning**: ML-based false positive detection
- [ ] **Security Metrics Dashboard**: Real-time security posture visualization

---

## Success Metrics

**Time Savings** (Phase 3 Estimate):
- **Before**: ~30 min/day manually checking GitHub UI, parsing gh CLI output
- **After**: ~5 min/day via natural language queries to Copilot
- **Savings**: 25 min/day × 250 work days = **104 hours/year**

**Improved Security Posture**:
- ✅ MTTR reduced from unknown → tracked and optimized
- ✅ 100% visibility into all alerts (no missed critical issues)
- ✅ Systematic triage process (no ad-hoc checking)
- ✅ Historical trends enable data-driven security decisions

**ROI Calculation**:
- Engineer hourly rate: $150/hour
- Annual time saved: 104 hours
- **Annual ROI**: $15,600 in time savings
- **Plus**: Reduced security incident risk (immeasurable value)

---

## Security Best Practices

### Alert Triage Priority

1. **Critical**: Fix immediately (within 24 hours)
2. **High**: Fix within sprint (1-2 weeks)
3. **Medium**: Schedule for next quarter
4. **Low**: Address during refactoring or close if accepted risk

### Dismissal Guidelines

**Valid reasons to dismiss**:
- ✅ False positive with technical explanation
- ✅ Won't fix with documented risk acceptance (require security review)
- ✅ Used in tests only (isolated environment)

**Invalid reasons** (don't dismiss):
- ❌ "Will fix later" → Create ticket instead
- ❌ "Low priority" → Use severity filter, don't dismiss
- ❌ "Not sure" → Get second opinion before dismissing

### Secret Scanning Best Practices

**Prevention**:
- Use `.env` files (gitignored) for all secrets
- Use `.env.example` templates (safe to commit)
- Pre-commit hooks to block secrets (Lokifi has this configured)

**Remediation**:
- Rotate compromised secrets immediately
- Update all environments (dev, staging, prod)
- Review git history - if committed, consider repository as compromised

---

## References

- [GitHub Code Scanning API](https://docs.github.com/en/rest/code-scanning)
- [GitHub Dependabot Alerts API](https://docs.github.com/en/rest/dependabot/alerts)
- [CVSS Score Calculator](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)

---

**Documentation Version**: 1.0.0  
**Last Updated**: 2026-01-14  
**Author**: Staff-Level Engineer (Autonomous Session)
