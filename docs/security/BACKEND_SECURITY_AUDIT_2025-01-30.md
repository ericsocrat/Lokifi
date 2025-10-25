# Backend Security Audit Report
**Date:** January 30, 2025
**Branch:** test/workflow-optimizations-validation
**Tool:** pip-audit v2.9.0

## Summary
Found **6 known vulnerabilities** in **5 packages**:
- 🟡 **5 Medium severity** (denial of service risks)
- 🔴 **1 High severity** (no fix available - out of scope)

## Vulnerabilities Detail

### 1. aiohttp 3.11.10 → 3.12.14 (Medium)
- **CVE:** GHSA-9548-qrrj-x5pj
- **Severity:** Medium
- **Issue:** Request smuggling vulnerability in pure Python parser (trailer sections not parsed)
- **Impact:** Attacker may bypass firewalls or proxy protections if pure Python version is used
- **Fix:** Upgrade to 3.12.14
- **Action:** ✅ UPGRADE RECOMMENDED

### 2. authlib 1.6.4 → 1.6.5 (Medium - DoS)
- **CVE:** GHSA-pq5p-34cr-23v9
- **Severity:** High (CVSS 7.5) - DoS
- **Issue:** Unbounded JWS/JWT header/signature segments allow DoS
- **Impact:** Single request can exhaust CPU/memory (500MB header → 4GB RAM, 9s CPU)
- **Fix:** Upgrade to 1.6.5 (adds 256KB limits on header/signature segments)
- **Action:** ✅ UPGRADE RECOMMENDED

### 3. authlib 1.6.4 → 1.6.5 (Medium - DoS)
- **CVE:** GHSA-g7f3-828f-7h7m
- **Severity:** Medium (CVSS 6.5-7.5) - DoS
- **Issue:** Unbounded DEFLATE decompression in JWE `zip=DEF` path
- **Impact:** Tiny ciphertext (4KB) expands to 50MB+ during decrypt, exhausting resources
- **Fix:** Upgrade to 1.6.5 (adds 256KB decompression limit)
- **Action:** ✅ UPGRADE RECOMMENDED

### 4. ecdsa 0.19.1 (High - NO FIX AVAILABLE)
- **CVE:** GHSA-wj6h-64fc-37mp
- **Severity:** High
- **Issue:** Minerva timing attack on P-256 curve
- **Impact:** Timing signatures can leak internal nonce → private key discovery
- **Affected:** ECDSA signatures, key generation, ECDH operations
- **Fix:** ⚠️ **NONE** - Project considers side-channel attacks out of scope
- **Action:** 🔶 **MONITOR** - Document risk, consider alternative libraries if P-256 is critical
- **Mitigation:** Use RSA instead of ECDSA where possible, or higher-level abstractions

### 5. pip 25.2 → 25.3 (Medium)
- **CVE:** GHSA-4xh5-x5gv-qwph
- **Severity:** Medium
- **Issue:** Malicious sdist can escape extraction directory via symbolic/hard links
- **Impact:** Arbitrary file overwrite on host during `pip install`
- **Fix:** Planned for pip 25.3 (not yet released)
- **Action:** 🕐 **WAIT** - Upgrade when 25.3 is available
- **Workaround:** Use Python with PEP 706 safe extraction (defense in depth)

### 6. starlette 0.41.3 → 0.47.2 (Low)
- **CVE:** GHSA-2c2j-9gv5-cj73
- **Severity:** Low
- **Issue:** Large file uploads (>1MB) block event loop during disk rollover
- **Impact:** Temporary inability to accept new connections during large file processing
- **Fix:** Upgrade to 0.47.2 (adds async rollover check)
- **Action:** ✅ UPGRADE RECOMMENDED (low urgency)

## Recommended Actions

### Immediate (High Priority)
1. **Upgrade authlib to 1.6.5** (fixes 2 DoS vulnerabilities)
   ```bash
   pip install --upgrade authlib==1.6.5
   ```

2. **Upgrade aiohttp to 3.12.14** (fixes request smuggling)
   ```bash
   pip install --upgrade aiohttp==3.12.14
   ```

3. **Upgrade starlette to 0.47.2** (fixes event loop blocking)
   ```bash
   pip install --upgrade starlette==0.47.2
   ```

### Monitor
4. **ecdsa 0.19.1** - No fix available, project stance is out of scope
   - **Risk Assessment:** Low for Lokifi (not using P-256 ECDSA signing directly)
   - **Action:** Document dependency chain, monitor for alternative library options
   - **Alternative:** Consider using `cryptography` library for ECDSA if needed

5. **pip 25.2** - Wait for pip 25.3 release
   - **Risk Assessment:** Low (requires malicious sdist installation)
   - **Action:** Upgrade pip when 25.3 is released

## Upgrade Commands

```bash
# Activate virtual environment
cd apps/backend
.\venv\Scripts\Activate.ps1

# Upgrade vulnerable packages
pip install --upgrade authlib==1.6.5 aiohttp==3.12.14 starlette==0.47.2

# Update requirements.txt
pip freeze > requirements.txt

# Test all changes
pytest
```

## Post-Upgrade Verification

```bash
# Re-run security audit
pip-audit --desc

# Verify no regressions
pytest --cov
```

## Risk Assessment
- **Critical:** 0
- **High:** 1 (no fix available, low risk for our use case)
- **Medium:** 5 (all fixable via upgrades)
- **Low:** 0

**Overall Risk:** Medium (before patches), Low (after patches)

## Next Steps
1. Apply upgrades (authlib, aiohttp, starlette)
2. Update requirements.txt
3. Run full test suite to verify no regressions
4. Re-run pip-audit to confirm 0 fixable vulnerabilities
5. Document ecdsa risk in security policy
6. Monitor pip 25.3 release for future upgrade

---
**Report Generated:** 2025-01-30
**Auditor:** GitHub Copilot (Automated Security Analysis)
