# 🔧 Scripts Directory

**Purpose**: Contains all automation scripts organized by category for easy maintenance and execution.

---

## 📂 **Directory Structure**

```
scripts/
├── 📊 analysis/          # Code analysis and quality tools
├── 🧹 cleanup/           # Cleanup and maintenance scripts
├── 📦 data/              # Data fetching and processing
└── 🔒 security/          # Security scanning and protection
```

---

## � **Analysis Scripts** (`analysis/`)

**Purpose**: Codebase metrics, project estimates, and technical documentation.

### Available Scripts:
- `codebase-analyzer.ps1` - Comprehensive codebase analysis with project estimates (1570 lines, 84 KB, v2.0)
  - Project metrics and technical debt analysis
  - Cost estimates with region-based pricing (US, EU, Asia, Remote)
  - Git history insights (commits, contributors, churn)
  - Multiple export formats (Markdown, JSON, CSV, HTML)
  - Maintenance cost projections (1/3/5 years)

### Usage:
```powershell
# Full codebase analysis with estimates
.\scripts\analysis\codebase-analyzer.ps1

# Export to JSON for CI/CD integration
.\scripts\analysis\codebase-analyzer.ps1 -OutputFormat json

# Region-specific cost estimates
.\scripts\analysis\codebase-analyzer.ps1 -Region eu -Detailed
```

**Note**: For ad-hoc code analysis (TypeScript types, console.log scanning, dependency checks), use **GitHub Copilot** with `@workspace` context or run `npm outdated`, `npm audit` directly.

---

## 🧹 **Cleanup Scripts** (`cleanup/`)

**Purpose**: Repository cleanup, maintenance, and optimization.

### Available Scripts:
- `cleanup-master.ps1` - Comprehensive cleanup utility
  - Documentation consolidation and archiving
  - Old Git branches cleanup
  - Scripts and cache cleanup
  - Deep optimization modes

### Usage:
```powershell
# Documentation cleanup (default)
.\scripts\cleanup\cleanup-master.ps1 -Scope Docs

# Clean old branches
.\scripts\cleanup\cleanup-master.ps1 -Scope Branches

# Deep cache cleanup
.\scripts\cleanup\cleanup-master.ps1 -Scope Deep

# Full cleanup with optimization
.\scripts\cleanup\cleanup-master.ps1 -Scope All -Optimize
```

---

## 📦 **Data Scripts** (`data/`)

**Purpose**: Asset data fetching and processing (consolidated 19 scripts into one!).

### Available Scripts:
- `universal-fetcher.js` - Universal asset fetching tool
  - Cryptocurrencies (CoinGecko API)
  - US & International stocks
  - Commodities & Indexes
  - Smart caching & rate limiting

### Usage:
```bash
# Fetch all assets
node .\scripts\data\universal-fetcher.js --all

# Top 500 cryptocurrencies
node .\scripts\data\universal-fetcher.js --crypto --limit 500

# US stocks only
node .\scripts\data\universal-fetcher.js --stocks --market us
```

---

##  **Security Scripts** (`security/`)

**Purpose**: Security scanning, secret generation, and vulnerability protection.

### Available Scripts:
- `generate_secrets.py` - Secure secret generation for production
- `security-scanner.ps1` - Comprehensive security scanner (moved from root)
  - Dependency vulnerability scanning
  - Code pattern analysis
  - Security score calculation

### Usage:
```powershell
# Generate production secrets
python .\scripts\security\generate_secrets.py

# Quick security scan (root level)
.\security-scanner.ps1 -Quick

# Deep security analysis (root level)
.\security-scanner.ps1 -Deep
```

**Note**: `security-scanner.ps1` is located at `tools/scripts/security-scanner.ps1` (root scripts folder).

---

## 📋 **Root Level Scripts**

### Available Scripts:
- `test-runner.ps1` - Comprehensive test runner (consolidates coverage, protection dashboards)
- `security-scanner.ps1` - Security scanning (see Security Scripts section above)

### Usage:
```powershell
# Run all tests with coverage
.\test-runner.ps1

# Security scan
.\security-scanner.ps1
```

**Note on Removed Tools**:
- **Documentation Generation**: Use GitHub Copilot with `@workspace` context
- **TypeScript Fixes**: Use Copilot Edits with `@workspace` for context-aware type fixing
- **Coverage Dashboards**: Integrated into `test-runner.ps1`
- **Protection Dashboards**: Integrated into `test-runner.ps1`
- **Dependency Protection**: Integrated into `security-scanner.ps1`
- **Bypass Hooks**: Integrated into `setup-precommit-hooks.ps1`

---

## 📋 **Script Standards**

### **Naming Conventions**
- Use descriptive, action-oriented names
- PowerShell scripts: `.ps1` extension
- Python scripts: `.py` extension
- Batch scripts: `.bat` extension
- Shell scripts: `.sh` extension

### **Documentation Requirements**
- Each script should have a header comment explaining purpose
- Include usage examples and parameter descriptions
- Document dependencies and prerequisites

### **Error Handling**
- Implement proper error handling and logging
- Provide meaningful error messages
- Include rollback procedures where applicable

---

## 🔄 **Maintenance**

### **Regular Tasks**
- Review script performance and optimization opportunities
- Update documentation for any script changes
- Test scripts in development environment before deployment
- Archive or remove obsolete scripts

### **Security Considerations**
- Regularly audit scripts for security vulnerabilities
- Ensure proper permission handling
- Validate input parameters and sanitize data
- Use secure methods for credential handling

---

*Last Updated: October 22, 2025*
*Active Scripts: 7 ultra-lean automation tools*
*Categories: 4 functional areas*
