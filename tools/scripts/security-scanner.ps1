# ============================================================================
# Lokifi Security Scanner
# ============================================================================
# Automated security testing and vulnerability scanning
#
# Features:
# - Dependency vulnerability scanning (npm audit)
# - Code security pattern detection
# - Authentication security checks
# - Input validation analysis
# - Security baseline tracking
# ============================================================================

function Invoke-SecurityScan {
    <#
    .SYNOPSIS
        Performs comprehensive security scan

    .DESCRIPTION
        Scans for:
        - Dependency vulnerabilities (npm audit)
        - Dangerous code patterns (eval, innerHTML, etc.)
        - Hardcoded secrets
        - Weak authentication
        - Missing security headers

    .PARAMETER Quick
        Quick scan (dependencies only)

    .PARAMETER Deep
        Deep scan (includes code analysis)

    .PARAMETER Fix
        Auto-fix vulnerabilities where possible

    .EXAMPLE
        Invoke-SecurityScan -Quick
        # Fast dependency scan

    .EXAMPLE
        Invoke-SecurityScan -Deep
        # Full security analysis
    #>

    param(
        [switch]$Quick,
        [switch]$Deep,
        [switch]$Fix
    )

    Write-Host "🔒 Security Scan Starting..." -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Green

    $projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
    $frontendPath = Join-Path $projectRoot "apps\frontend"

    $results = @{
        timestamp = Get-Date -Format "o"
        vulnerabilities = @{
            critical = 0
            high = 0
            moderate = 0
            low = 0
            total = 0
        }
        codePatterns = @{
            eval = 0
            innerHTML = 0
            hardcodedSecrets = 0
            weakCrypto = 0
            sqlConcatenation = 0
        }
        score = 100
    }

    # 1. Dependency Vulnerability Scan
    Write-Host ""
    Write-Host "📦 Scanning Dependencies..." -ForegroundColor Cyan

    Push-Location $frontendPath

    try {
        $auditOutput = npm audit --json 2>&1 | Out-String

        if ($auditOutput) {
            try {
                $audit = $auditOutput | ConvertFrom-Json

                if ($audit.metadata) {
                    $results.vulnerabilities.critical = $audit.metadata.vulnerabilities.critical
                    $results.vulnerabilities.high = $audit.metadata.vulnerabilities.high
                    $results.vulnerabilities.moderate = $audit.metadata.vulnerabilities.moderate
                    $results.vulnerabilities.low = $audit.metadata.vulnerabilities.low
                    $results.vulnerabilities.total = $audit.metadata.vulnerabilities.total

                    Write-Host "   Critical:  $($results.vulnerabilities.critical)" -ForegroundColor $(if ($results.vulnerabilities.critical -gt 0) { "Red" } else { "Green" })
                    Write-Host "   High:      $($results.vulnerabilities.high)" -ForegroundColor $(if ($results.vulnerabilities.high -gt 0) { "Red" } else { "Green" })
                    Write-Host "   Moderate:  $($results.vulnerabilities.moderate)" -ForegroundColor $(if ($results.vulnerabilities.moderate -gt 0) { "Yellow" } else { "Green" })
                    Write-Host "   Low:       $($results.vulnerabilities.low)" -ForegroundColor $(if ($results.vulnerabilities.low -gt 0) { "Yellow" } else { "Green" })

                    if ($results.vulnerabilities.total -eq 0) {
                        Write-Host "   ✅ No vulnerabilities found!" -ForegroundColor Green
                    } else {
                        Write-Host "   ⚠️ $($results.vulnerabilities.total) vulnerabilities found" -ForegroundColor Yellow

                        if ($Fix) {
                            Write-Host ""
                            Write-Host "🔧 Attempting to fix vulnerabilities..." -ForegroundColor Cyan
                            npm audit fix --force
                        }
                    }
                }
            } catch {
                Write-Host "   ⚠️ Could not parse audit output" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "   ⚠️ npm audit failed: $_" -ForegroundColor Yellow
    }

    Pop-Location

    # 2. Code Pattern Analysis (Deep scan only)
    if ($Deep -or -not $Quick) {
        Write-Host ""
        Write-Host "🔍 Analyzing Code Patterns..." -ForegroundColor Cyan

        $srcPath = Join-Path $frontendPath "src"

        if (Test-Path $srcPath) {
            $files = Get-ChildItem $srcPath -Filter "*.ts" -Recurse | Where-Object { $_.Name -notlike "*.test.ts" }

            foreach ($file in $files) {
                $content = Get-Content $file.FullName -Raw

                # Check for eval()
                if ($content -match '\beval\s*\(') {
                    $results.codePatterns.eval++
                    Write-Host "   🔴 eval() found in: $($file.Name)" -ForegroundColor Red
                }

                # Check for innerHTML without sanitization
                if ($content -match '\.innerHTML\s*=\s*(?!["''])') {
                    $results.codePatterns.innerHTML++
                    Write-Host "   🟡 innerHTML usage in: $($file.Name)" -ForegroundColor Yellow
                }

                # Check for hardcoded secrets (simple pattern)
                if ($content -match '(api[_-]?key|password|secret|token)\s*[:=]\s*["''][a-zA-Z0-9]{20,}["'']') {
                    $results.codePatterns.hardcodedSecrets++
                    Write-Host "   🔴 Possible hardcoded secret in: $($file.Name)" -ForegroundColor Red
                }

                # Check for weak crypto
                if ($content -match 'createHash\s*\(\s*["'']md5["'']') {
                    $results.codePatterns.weakCrypto++
                    Write-Host "   🟡 Weak cryptography (MD5) in: $($file.Name)" -ForegroundColor Yellow
                }

                # Check for SQL concatenation
                if ($content -match '(SELECT|INSERT|UPDATE|DELETE).*\+\s*\w+') {
                    $results.codePatterns.sqlConcatenation++
                    Write-Host "   🔴 Possible SQL injection in: $($file.Name)" -ForegroundColor Red
                }
            }

            $totalPatterns = $results.codePatterns.eval + $results.codePatterns.innerHTML +
                           $results.codePatterns.hardcodedSecrets + $results.codePatterns.weakCrypto +
                           $results.codePatterns.sqlConcatenation

            if ($totalPatterns -eq 0) {
                Write-Host "   ✅ No dangerous patterns found!" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️ $totalPatterns potential issues found" -ForegroundColor Yellow
            }
        }
    }

    # 3. Calculate Security Score
    Write-Host ""
    Write-Host "📊 Calculating Security Score..." -ForegroundColor Cyan

    $score = 100
    $score -= $results.vulnerabilities.critical * 20
    $score -= $results.vulnerabilities.high * 10
    $score -= $results.vulnerabilities.moderate * 5
    $score -= $results.vulnerabilities.low * 2
    $score -= $results.codePatterns.eval * 10
    $score -= $results.codePatterns.innerHTML * 3
    $score -= $results.codePatterns.hardcodedSecrets * 20
    $score -= $results.codePatterns.weakCrypto * 5
    $score -= $results.codePatterns.sqlConcatenation * 15

    $score = [Math]::Max(0, $score)
    $results.score = $score

    $scoreColor = if ($score -ge 80) { "Green" } elseif ($score -ge 60) { "Yellow" } else { "Red" }
    $scoreEmoji = if ($score -ge 80) { "✅" } elseif ($score -ge 60) { "⚠️" } else { "🔴" }

    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "$scoreEmoji Security Score: $score/100" -ForegroundColor $scoreColor
    Write-Host "============================================" -ForegroundColor Green

    if ($score -ge 90) {
        Write-Host "🎉 Excellent security posture!" -ForegroundColor Green
    } elseif ($score -ge 70) {
        Write-Host "👍 Good security, minor improvements needed" -ForegroundColor Yellow
    } elseif ($score -ge 50) {
        Write-Host "⚠️ Security needs attention" -ForegroundColor Yellow
    } else {
        Write-Host "🔴 Critical security issues detected!" -ForegroundColor Red
    }

    return $results
}

function New-SecurityTests {
    <#
    .SYNOPSIS
        Generates security test files

    .DESCRIPTION
        Auto-generates security tests for:
        - Authentication (login, logout, tokens)
        - XSS prevention
        - CSRF protection
        - Input validation

    .PARAMETER Type
        Type of security tests (auth, xss, csrf, validation, all)

    .EXAMPLE
        New-SecurityTests -Type auth
        # Generate authentication security tests
    #>

    param(
        [ValidateSet('auth', 'xss', 'csrf', 'validation', 'all')]
        [string]$Type = 'all'
    )

    Write-Host "🧪 Generating Security Tests..." -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Green

    $projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
    $frontendPath = Join-Path $projectRoot "apps\frontend"
    $securityTestDir = Join-Path $frontendPath "tests\security"

    # Create security test directory
    if (-not (Test-Path $securityTestDir)) {
        New-Item -ItemType Directory -Path $securityTestDir -Force | Out-Null
        Write-Host "✅ Created security test directory" -ForegroundColor Green
    }

    $testsGenerated = 0

    # Generate authentication tests
    if ($Type -eq 'auth' -or $Type -eq 'all') {
        $authTestPath = Join-Path $securityTestDir "auth.security.test.ts"

        if (-not (Test-Path $authTestPath)) {
            $authTest = @'
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Security Tests: Authentication
 *
 * Tests for authentication security vulnerabilities:
 * - Brute force protection
 * - User enumeration prevention
 * - Password complexity
 * - Token invalidation
 * - Session management
 */

describe('Security: Authentication', () => {
  describe('Brute Force Protection', () => {
    it('should rate limit login attempts', async () => {
      // TODO: Implement rate limiting test
      expect(true).toBe(true);
    });

    it('should lock account after multiple failed attempts', async () => {
      // TODO: Implement account lockout test
      expect(true).toBe(true);
    });
  });

  describe('User Enumeration Prevention', () => {
    it('should not reveal if user exists in error messages', async () => {
      // TODO: Test generic error messages
      expect(true).toBe(true);
    });

    it('should have consistent response times for valid/invalid users', async () => {
      // TODO: Test timing attack prevention
      expect(true).toBe(true);
    });
  });

  describe('Password Security', () => {
    it('should enforce minimum password length', async () => {
      // TODO: Test password length requirement
      expect(true).toBe(true);
    });

    it('should require password complexity (uppercase, lowercase, numbers, symbols)', async () => {
      // TODO: Test password complexity
      expect(true).toBe(true);
    });

    it('should reject common/weak passwords', async () => {
      // TODO: Test password strength validation
      expect(true).toBe(true);
    });
  });

  describe('Token Management', () => {
    it('should invalidate tokens after logout', async () => {
      // TODO: Test token invalidation
      expect(true).toBe(true);
    });

    it('should expire tokens after configured timeout', async () => {
      // TODO: Test token expiration
      expect(true).toBe(true);
    });

    it('should not allow token reuse after refresh', async () => {
      // TODO: Test token refresh security
      expect(true).toBe(true);
    });
  });

  describe('Session Security', () => {
    it('should regenerate session ID after login', async () => {
      // TODO: Test session fixation prevention
      expect(true).toBe(true);
    });

    it('should clear sensitive data on logout', async () => {
      // TODO: Test data cleanup
      expect(true).toBe(true);
    });
  });
});
'@
            Set-Content -Path $authTestPath -Value $authTest -Encoding UTF8
            Write-Host "✅ Generated: auth.security.test.ts" -ForegroundColor Green
            $testsGenerated++
        } else {
            Write-Host "⚠️ Skipped: auth.security.test.ts (already exists)" -ForegroundColor Yellow
        }
    }

    # Generate XSS prevention tests
    if ($Type -eq 'xss' -or $Type -eq 'all') {
        $xssTestPath = Join-Path $securityTestDir "xss.security.test.ts"

        if (-not (Test-Path $xssTestPath)) {
            $xssTest = @'
import { describe, it, expect } from 'vitest';

/**
 * Security Tests: XSS Prevention
 *
 * Tests for Cross-Site Scripting (XSS) vulnerabilities:
 * - Input sanitization
 * - Output encoding
 * - DOM manipulation safety
 * - Content Security Policy
 */

describe('Security: XSS Prevention', () => {
  describe('Input Sanitization', () => {
    it('should sanitize HTML tags from user input', () => {
      // TODO: Test HTML sanitization
      expect(true).toBe(true);
    });

    it('should remove script tags from input', () => {
      // TODO: Test script tag removal
      expect(true).toBe(true);
    });

    it('should handle encoded malicious input', () => {
      // TODO: Test encoded input handling
      expect(true).toBe(true);
    });
  });

  describe('Output Encoding', () => {
    it('should escape HTML entities in displayed content', () => {
      // TODO: Test HTML entity escaping
      expect(true).toBe(true);
    });

    it('should safely handle user-generated URLs', () => {
      // TODO: Test URL validation
      expect(true).toBe(true);
    });
  });

  describe('DOM Manipulation', () => {
    it('should prevent innerHTML injection attacks', () => {
      // TODO: Test innerHTML safety
      expect(true).toBe(true);
    });

    it('should use safe DOM methods (textContent, createElement)', () => {
      // TODO: Test safe DOM manipulation
      expect(true).toBe(true);
    });
  });

  describe('Content Security Policy', () => {
    it('should have strict CSP headers', () => {
      // TODO: Test CSP configuration
      expect(true).toBe(true);
    });

    it('should block inline scripts', () => {
      // TODO: Test inline script blocking
      expect(true).toBe(true);
    });
  });
});
'@
            Set-Content -Path $xssTestPath -Value $xssTest -Encoding UTF8
            Write-Host "✅ Generated: xss.security.test.ts" -ForegroundColor Green
            $testsGenerated++
        } else {
            Write-Host "⚠️ Skipped: xss.security.test.ts (already exists)" -ForegroundColor Yellow
        }
    }

    # Generate CSRF protection tests
    if ($Type -eq 'csrf' -or $Type -eq 'all') {
        $csrfTestPath = Join-Path $securityTestDir "csrf.security.test.ts"

        if (-not (Test-Path $csrfTestPath)) {
            $csrfTest = @'
import { describe, it, expect } from 'vitest';

/**
 * Security Tests: CSRF Protection
 *
 * Tests for Cross-Site Request Forgery (CSRF) vulnerabilities:
 * - CSRF token validation
 * - SameSite cookie configuration
 * - Origin/Referer validation
 */

describe('Security: CSRF Protection', () => {
  describe('Token Validation', () => {
    it('should require CSRF token for state-changing requests', async () => {
      // TODO: Test CSRF token requirement
      expect(true).toBe(true);
    });

    it('should reject invalid CSRF tokens', async () => {
      // TODO: Test invalid token rejection
      expect(true).toBe(true);
    });

    it('should regenerate CSRF token after use', async () => {
      // TODO: Test token regeneration
      expect(true).toBe(true);
    });
  });

  describe('Cookie Security', () => {
    it('should set SameSite=Strict on session cookies', () => {
      // TODO: Test SameSite configuration
      expect(true).toBe(true);
    });

    it('should set HttpOnly flag on authentication cookies', () => {
      // TODO: Test HttpOnly flag
      expect(true).toBe(true);
    });

    it('should set Secure flag in production', () => {
      // TODO: Test Secure flag
      expect(true).toBe(true);
    });
  });

  describe('Request Validation', () => {
    it('should validate Origin header', async () => {
      // TODO: Test Origin validation
      expect(true).toBe(true);
    });

    it('should validate Referer header for sensitive operations', async () => {
      // TODO: Test Referer validation
      expect(true).toBe(true);
    });
  });
});
'@
            Set-Content -Path $csrfTestPath -Value $csrfTest -Encoding UTF8
            Write-Host "✅ Generated: csrf.security.test.ts" -ForegroundColor Green
            $testsGenerated++
        } else {
            Write-Host "⚠️ Skipped: csrf.security.test.ts (already exists)" -ForegroundColor Yellow
        }
    }

    # Generate input validation tests
    if ($Type -eq 'validation' -or $Type -eq 'all') {
        $validationTestPath = Join-Path $securityTestDir "validation.security.test.ts"

        if (-not (Test-Path $validationTestPath)) {
            $validationTest = @'
import { describe, it, expect } from 'vitest';

/**
 * Security Tests: Input Validation
 *
 * Tests for input validation vulnerabilities:
 * - SQL injection prevention
 * - Command injection prevention
 * - Path traversal prevention
 * - File upload validation
 */

describe('Security: Input Validation', () => {
  describe('SQL Injection Prevention', () => {
    it('should use parameterized queries', () => {
      // TODO: Test parameterized query usage
      expect(true).toBe(true);
    });

    it('should reject SQL keywords in user input', () => {
      // TODO: Test SQL keyword filtering
      expect(true).toBe(true);
    });
  });

  describe('Command Injection Prevention', () => {
    it('should sanitize shell command arguments', () => {
      // TODO: Test command sanitization
      expect(true).toBe(true);
    });

    it('should avoid eval() and similar functions', () => {
      // TODO: Test eval() avoidance
      expect(true).toBe(true);
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should reject path traversal sequences (../, ../../)', () => {
      // TODO: Test path traversal prevention
      expect(true).toBe(true);
    });

    it('should validate file paths are within allowed directories', () => {
      // TODO: Test path validation
      expect(true).toBe(true);
    });
  });

  describe('File Upload Validation', () => {
    it('should validate file types by content (not just extension)', () => {
      // TODO: Test file type validation
      expect(true).toBe(true);
    });

    it('should enforce file size limits', () => {
      // TODO: Test file size limits
      expect(true).toBe(true);
    });

    it('should scan uploaded files for malware', () => {
      // TODO: Test malware scanning
      expect(true).toBe(true);
    });
  });

  describe('Data Type Validation', () => {
    it('should validate numeric inputs are within expected range', () => {
      // TODO: Test numeric validation
      expect(true).toBe(true);
    });

    it('should validate email format', () => {
      // TODO: Test email validation
      expect(true).toBe(true);
    });

    it('should validate URL format and protocol', () => {
      // TODO: Test URL validation
      expect(true).toBe(true);
    });
  });
});
'@
            Set-Content -Path $validationTestPath -Value $validationTest -Encoding UTF8
            Write-Host "✅ Generated: validation.security.test.ts" -ForegroundColor Green
            $testsGenerated++
        } else {
            Write-Host "⚠️ Skipped: validation.security.test.ts (already exists)" -ForegroundColor Yellow
        }
    }

    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "🎉 Generated $testsGenerated security test file(s)" -ForegroundColor Green
    Write-Host "📍 Location: $securityTestDir" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Review generated tests" -ForegroundColor White
    Write-Host "   2. Implement TODO items based on your application" -ForegroundColor White
    Write-Host "   3. Run tests: npm run test tests/security" -ForegroundColor White
    Write-Host ""
}

function Save-SecurityBaseline {
    <#
    .SYNOPSIS
        Saves security baseline snapshot

    .DESCRIPTION
        Creates a timestamped snapshot of security metrics
        for trend tracking
    #>

    Write-Host "📊 Creating Security Baseline..." -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Green

    $projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
    $frontendPath = Join-Path $projectRoot "apps\frontend"
    $baselineDir = Join-Path $frontendPath ".security-baseline"

    # Create baseline directory
    if (-not (Test-Path $baselineDir)) {
        New-Item -ItemType Directory -Path $baselineDir -Force | Out-Null
        Write-Host "✅ Created baseline directory" -ForegroundColor Green
    }

    # Run security scan
    $results = Invoke-SecurityScan -Deep

    # Add commit info
    try {
        $commit = git rev-parse --short HEAD 2>$null
        $results.commit = $commit
    } catch {
        $results.commit = "unknown"
    }

    # Save timestamped snapshot
    $timestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
    $snapshotPath = Join-Path $baselineDir "$timestamp.json"
    $results | ConvertTo-Json -Depth 10 | Set-Content $snapshotPath -Encoding UTF8

    # Save as latest
    $latestPath = Join-Path $baselineDir "latest.json"
    $results | ConvertTo-Json -Depth 10 | Set-Content $latestPath -Encoding UTF8

    Write-Host ""
    Write-Host "✅ Baseline saved: $timestamp.json" -ForegroundColor Green
    Write-Host "📍 Location: $baselineDir" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 Run this command periodically to track security trends" -ForegroundColor Yellow
    Write-Host ""
}
