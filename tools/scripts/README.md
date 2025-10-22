# 🔧 Scripts Directory

**Purpose**: Contains all automation scripts organized by category for easy maintenance and execution.

---

## 📂 **Directory Structure**

```
scripts/
├── � analysis/          # Code analysis and quality tools
├── � cleanup/           # Cleanup and maintenance scripts
├── � data/              # Data fetching and processing
├── � fixes/             # Automated fix scripts
└── � security/          # Security scanning and protection
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

**Purpose**: Repository cleanup and maintenance automation.

### Available Scripts:
- `cleanup-master.ps1` - Master cleanup utility for project maintenance

### Usage:
```powershell
# Run master cleanup
.\scripts\cleanup\cleanup-master.ps1
```

---

## 📦 **Data Scripts** (`data/`)

**Purpose**: Data fetching and processing utilities.

### Available Scripts:
- `universal-fetcher.js` - Universal data fetching tool

### Usage:
```bash
# Fetch data
node .\scripts\data\universal-fetcher.js
```

---

## 🔧 **Fix Scripts** (`fixes/`)

**Purpose**: Automated code fixes and corrections.

### Available Scripts:
- `universal-fixer.ps1` - Automated fix tool for common issues

### Usage:
```powershell
# Run automated fixes
.\scripts\fixes\universal-fixer.ps1
```

---

## 🔒 **Security Scripts** (`security/`)

**Purpose**: Security automation, dependency protection, and secret management.

### Available Scripts:
- `dependency_protection.ps1` - Dependency vulnerability protection
- `generate_secrets.py` - Secure secret generation

### Usage:
```powershell
# Run dependency protection
.\scripts\security\dependency_protection.ps1

# Generate secure secrets
python .\scripts\security\generate_secrets.py
```

---

## 📋 **Root Level Scripts**

### Available Scripts:
- `coverage-dashboard.ps1` - Coverage visualization and reporting
- `doc-generator.ps1` - Documentation generation (test/API/component docs)
- `security-scanner.ps1` - Comprehensive security scanning

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
*Active Scripts: 12 automation tools*
*Categories: 5 functional areas*
