# Phase 1.5.6: Security Automation - Implementation Plan

**Status:** 🚀 IN PROGRESS
**Estimated Time:** 30 minutes
**Started:** October 14, 2025, 09:25 AM

---

## Objectives

Build automated security testing and vulnerability scanning:

1. **Security Test Generator** - Auto-generate security tests for critical files
2. **Vulnerability Scanner** - Scan dependencies for known vulnerabilities
3. **Security Baseline** - Track security metrics over time
4. **OWASP Compliance** - Check for common security issues
5. **Security Report** - Generate comprehensive security report

---

## Implementation Plan

### Step 1: Security Scanner Script (15 min)

**Goal:** Create PowerShell script for security analysis

**Features:**

1. **Dependency Scanning** - Check npm packages for vulnerabilities
2. **Code Pattern Detection** - Find security anti-patterns
3. **Authentication Analysis** - Verify auth implementation
4. **Input Validation** - Check for XSS/injection vulnerabilities
5. **Secret Detection** - Find hardcoded secrets/keys

**Functions to Implement:**

```powershell
Test-Dependencies          # Scan npm packages
Test-SecurityPatterns      # Find anti-patterns in code
Test-AuthenticationSecurity # Verify auth implementation
Test-InputValidation       # Check validation logic
Find-HardcodedSecrets      # Detect secrets in code
New-SecurityReport         # Generate comprehensive report
```

### Step 2: Security Test Generator (10 min)

**Goal:** Auto-generate security tests for critical files

**Features:**

1. **Auth Test Generation** - Generate authentication tests
2. **XSS Prevention Tests** - Generate XSS protection tests
3. **CSRF Protection Tests** - Generate CSRF tests
4. **Rate Limiting Tests** - Generate rate limit tests
5. **Access Control Tests** - Generate authorization tests

**Test Templates:**

- Authentication tests (login, logout, token validation)
- Authorization tests (role-based access)
- Input validation tests (XSS, SQL injection)
- Session management tests
- CORS configuration tests

### Step 3: Integration with Lokifi Bot (5 min)

**Goal:** Add security commands to lokifi.ps1

**Commands:**

```powershell
.\lokifi.ps1 security-scan          # Full security scan
.\lokifi.ps1 security-test          # Generate security tests
.\lokifi.ps1 security-report        # Generate report
.\lokifi.ps1 security-baseline      # Track security baseline
```

**Options:**

- `-Quick`: Fast scan (dependencies only)
- `-Deep`: Deep scan (code analysis + dependencies)
- `-Fix`: Auto-fix vulnerabilities where possible
- `-Report`: Generate HTML report

---

## Security Checks

### 1. Dependency Vulnerabilities

**Tool:** `npm audit`

**Checks:**

- Known vulnerabilities in dependencies
- Outdated packages with security fixes
- Severity levels (low, moderate, high, critical)
- Suggested fixes

**Output:**

```
📦 Dependency Security Scan
   Critical: 0
   High:     2
   Moderate: 5
   Low:      10

   🔴 HIGH: lodash@4.17.15 (Prototype Pollution)
   🔴 HIGH: axios@0.19.0 (Server-Side Request Forgery)
```

### 2. Code Security Patterns

**Checks:**

- `eval()` usage
- `innerHTML` without sanitization
- Hardcoded credentials/API keys
- Weak cryptography (MD5, SHA1)
- SQL string concatenation
- Unvalidated redirects
- Missing CSRF tokens

**Patterns to Detect:**

```javascript
// Dangerous patterns
eval(userInput);
element.innerHTML = userInput;
const API_KEY = 'sk-1234567890';
crypto.createHash('md5');
query = 'SELECT * FROM users WHERE id=' + userId;
window.location = userInput;
```

### 3. Authentication Security

**Checks:**

- Password storage (bcrypt/argon2)
- Token expiration
- Secure session management
- Rate limiting on auth endpoints
- Password complexity requirements
- Multi-factor authentication support

### 4. Input Validation

**Checks:**

- XSS prevention (sanitization)
- SQL injection prevention (parameterized queries)
- Path traversal prevention
- Command injection prevention
- File upload validation

### 5. Configuration Security

**Checks:**

- HTTPS enforcement
- Secure headers (CSP, HSTS, X-Frame-Options)
- CORS configuration
- Cookie security (HttpOnly, Secure, SameSite)
- Environment variable usage

---

## Security Test Templates

### Authentication Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '@/lib/api/auth';

describe('Security: Authentication', () => {
  describe('Login Security', () => {
    it('should prevent brute force attacks with rate limiting', async () => {
      // Attempt 10 rapid login requests
      const attempts = Array(10)
        .fill(null)
        .map(() => authService.login('user@test.com', 'wrongpassword'));

      const results = await Promise.allSettled(attempts);
      const rateLimited = results.filter(
        (r) => r.status === 'rejected' && r.reason.code === 'RATE_LIMITED'
      );

      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should not leak user existence in error messages', async () => {
      const result = await authService.login('nonexistent@test.com', 'password');

      // Should return generic error, not "user not found"
      expect(result.error).not.toContain('user');
      expect(result.error).not.toContain('email');
      expect(result.error).toBe('Invalid credentials');
    });

    it('should enforce password complexity requirements', async () => {
      const weakPasswords = ['123456', 'password', 'abc123'];

      for (const password of weakPasswords) {
        const result = await authService.register('user@test.com', password);
        expect(result.success).toBe(false);
        expect(result.error).toContain('password complexity');
      }
    });

    it('should invalidate tokens after logout', async () => {
      const { token } = await authService.login('user@test.com', 'password');
      await authService.logout(token);

      const result = await authService.validateToken(token);
      expect(result.valid).toBe(false);
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize user input before display', () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      const sanitized = sanitizeInput(maliciousInput);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('javascript:');
    });

    it('should escape HTML in user-generated content', () => {
      const userInput = '<img src=x onerror="alert(1)">';
      const escaped = escapeHtml(userInput);

      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
      expect(escaped).not.toContain('<img');
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing requests', async () => {
      const result = await fetch('/api/portfolio/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        // Missing CSRF token
      });

      expect(result.status).toBe(403);
      expect(result.error).toContain('CSRF');
    });

    it('should validate CSRF token matches session', async () => {
      const result = await fetch('/api/portfolio/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'invalid-token',
        },
      });

      expect(result.status).toBe(403);
    });
  });
});
```

---

## Security Baseline Tracking

### Metrics to Track

```json
{
  "timestamp": "2025-10-14T09:25:00Z",
  "commit": "4d05f2de",
  "vulnerabilities": {
    "critical": 0,
    "high": 2,
    "moderate": 5,
    "low": 10,
    "total": 17
  },
  "codePatterns": {
    "eval": 0,
    "innerHTML": 3,
    "hardcodedSecrets": 0,
    "weakCrypto": 0,
    "sqlConcatenation": 0
  },
  "authentication": {
    "passwordHashing": "bcrypt",
    "tokenExpiration": true,
    "rateLimiting": true,
    "mfa": false
  },
  "headers": {
    "csp": true,
    "hsts": true,
    "xFrameOptions": true,
    "xContentTypeOptions": true
  },
  "score": 85
}
```

### Security Score Calculation

```
Score = 100 - (penalties)

Penalties:
- Critical vulnerability: -20 points each
- High vulnerability: -10 points each
- Moderate vulnerability: -5 points each
- Low vulnerability: -2 points each
- Dangerous code pattern: -5 points each
- Missing security header: -3 points each
- Weak authentication: -10 points
```

---

## File Structure

```
tools/
├── lokifi.ps1                           # Updated with security commands
└── scripts/
    ├── test-intelligence.ps1            # Existing
    ├── coverage-dashboard.ps1           # Existing
    └── security-scanner.ps1             # NEW

apps/frontend/
├── .security-baseline/                  # NEW
│   ├── YYYY-MM-DD-HHMM.json
│   └── latest.json
└── tests/
    └── security/                        # NEW
        ├── auth.security.test.ts
        ├── xss.security.test.ts
        ├── csrf.security.test.ts
        └── validation.security.test.ts
```

---

## Expected Outcomes

### Before Phase 1.5.6

❌ Manual security review (30 min)
❌ No dependency vulnerability tracking
❌ No security test automation
❌ No security baseline
❌ Manual OWASP checklist

### After Phase 1.5.6

✅ Automated security scanning (<2 min)
✅ Dependency vulnerability detection
✅ Auto-generated security tests
✅ Security baseline tracking
✅ OWASP compliance checking
✅ Security score calculation

---

## Success Metrics

### Functionality

- [ ] Security scanner detects vulnerabilities
- [ ] Dependency scanner works
- [ ] Code pattern detection accurate
- [ ] Security tests generate correctly
- [ ] Baseline tracking operational
- [ ] Security report generated

### Performance

- [ ] Quick scan <30s
- [ ] Deep scan <2 min
- [ ] Test generation <10s

### Accuracy

- [ ] Zero false positives in test project
- [ ] Detects known vulnerable packages
- [ ] Finds common security anti-patterns

---

## Testing Plan

### Manual Testing

1. **Test Dependency Scanning:**

   ```bash
   .\lokifi.ps1 security-scan -Quick

   # Should show npm audit results
   ```

2. **Test Code Pattern Detection:**

   ```bash
   .\lokifi.ps1 security-scan -Deep

   # Should find innerHTML usage, etc.
   ```

3. **Test Security Test Generation:**

   ```bash
   .\lokifi.ps1 security-test

   # Should generate security tests
   ```

4. **Test Baseline Tracking:**

   ```bash
   .\lokifi.ps1 security-baseline

   # Should create baseline snapshot
   ```

---

## ROI Analysis

### Time Investment

- Planning: 5 min
- Security scanner: 15 min
- Test generator: 10 min
- Integration: 5 min
- Testing: 5 min
  **Total: 40 minutes**

### Time Saved

- Manual security review: 30 min/week
- Dependency checks: 10 min/week
- Security test writing: 2 hours/project
  **Monthly savings: ~3 hours/developer**

### Value

- Prevent security incidents: Priceless
- Compliance automation: $500/month
- Developer time saved: $150/month
  **ROI: ∞** (security incident prevention)

---

## Next Steps After Completion

1. ✅ Complete Phase 1.5.6 (this phase)
2. 🔜 Phase 1.5.7: Auto-Documentation
3. 🔜 Phase 1.5.8: CI/CD Integration

---

**Let's build it!** 🔒✨
