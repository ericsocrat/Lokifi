# One-Time Scripts Cleanup Analysis
**Date:** October 22, 2025
**Purpose:** Identify and remove temporary/one-time scripts that are no longer needed

## 🔍 Found Scripts to Delete

### 📁 Root Directory (4 files)
These are temporary analysis scripts that were used for one-time tasks:

```
api-examples-analysis.js     (5.7 KB) - Analyzed API documentation patterns
check-headings.js            (837 B)  - Validated markdown heading hierarchy
quick-analysis.js            (3.3 KB) - Scanned for installation instructions
test-regex.js                (508 B)  - Tested regex patterns for markdown parsing
test-todos.tmp               (325 B)  - Test file for TODO detection (should be gitignored)
```

**Action:** ✅ DELETE ALL - These were analysis/test scripts, no longer needed

---

### 📁 tools/scripts/ (2 files)
Empty files that serve no purpose:

```
fix-code-block-tags.ps1      (3 B)   - Empty file
fix-code-block-tags-v2.ps1   (3 B)   - Empty file
```

**Action:** ✅ DELETE - Empty files with no content

---

### 📁 tools/scripts/legacy/ (9 files)
All scripts in this folder are legacy one-time fixes:

```
analyze-and-optimize.ps1      - One-time analysis
cleanup-repo.ps1              - One-time cleanup (17 KB)
cleanup-scripts.ps1           - One-time cleanup (5.8 KB)
fix-all-implicit-any.ps1      - One-time TypeScript fix (11 KB)
fix-implicit-any-alerts.ps1   - One-time TypeScript fix (1.8 KB)
fix-zustand-proper.ps1        - One-time Zustand fix (1.8 KB)
manage-redis.ps1              - Superseded by docker-compose
start-servers.ps1             - Superseded by VS Code tasks
test-api.ps1                  - One-time API test (3.4 KB)
```

**Action:** ✅ DELETE ENTIRE FOLDER - All legacy, already archived elsewhere

---

### 📁 tools/scripts/utilities/ (1 file)
Empty utility file:

```
check-theme.ps1              (0 B)   - Empty file
```

**Action:** ✅ DELETE - No content

---

### 📁 tools/scripts/archive/ (Multiple folders)
Archive folders that can be cleaned up:

```
consolidated-fix-scripts-20251008-101839/  - Contains duplicates of legacy scripts
obsolete-scripts-backup-20251008-100828/   - Old script backups
old-startup-scripts-20251008-130046/       - Old startup script backups (empty files)
obsolete-ci-cd-2025-10-19/                 - Obsolete CI/CD configs
domain-research/                            - May contain useful research (KEEP for review)
```

**Action:** ✅ DELETE (except domain-research - review first)

---

### 📁 tools/ (1 file)
Old report that should be in docs:

```
cicd-optimization-report.md  (1.3 KB) - Old CI/CD report
```

**Action:** ⚠️ MOVE to `docs/ci-cd/archive/` or DELETE if no longer relevant

---

## 📊 Summary

| Category | Count | Total Size | Action |
|----------|-------|------------|--------|
| Root JS/tmp files | 5 | ~11 KB | DELETE |
| Empty .ps1 files | 3 | ~0 B | DELETE |
| Legacy scripts | 9 | ~53 KB | DELETE |
| Archive folders | 4 | Unknown | DELETE |
| Reports to move | 1 | 1.3 KB | MOVE or DELETE |
| **TOTAL** | **~22 files + 4 folders** | **~65+ KB** | **CLEANUP** |

---

## 🚀 Recommended Cleanup Commands

### Option 1: Safe Cleanup (Manual Review)
```powershell
# 1. Delete root analysis scripts
Remove-Item api-examples-analysis.js, check-headings.js, quick-analysis.js, test-regex.js, test-todos.tmp -Force

# 2. Delete empty files
Remove-Item tools/scripts/fix-code-block-tags.ps1, tools/scripts/fix-code-block-tags-v2.ps1 -Force
Remove-Item tools/scripts/utilities/check-theme.ps1 -Force

# 3. Delete legacy folder
Remove-Item tools/scripts/legacy -Recurse -Force

# 4. Delete archive folders (except domain-research)
Remove-Item tools/scripts/archive/consolidated-fix-scripts-20251008-101839 -Recurse -Force
Remove-Item tools/scripts/archive/obsolete-scripts-backup-20251008-100828 -Recurse -Force
Remove-Item tools/scripts/archive/old-startup-scripts-20251008-130046 -Recurse -Force
Remove-Item tools/scripts/archive/obsolete-ci-cd-2025-10-19 -Recurse -Force

# 5. Handle report (review content first, then decide)
# Move-Item tools/cicd-optimization-report.md docs/ci-cd/archive/
# OR
# Remove-Item tools/cicd-optimization-report.md -Force
```

### Option 2: Automated Cleanup Script
Create and run: `tools/scripts/cleanup/cleanup-one-time-scripts.ps1`

---

## ✅ Benefits

1. **Reduced clutter** - Remove ~22+ unnecessary files
2. **Better organization** - Clear workspace for active development
3. **Git history** - Files are preserved in Git history if needed
4. **Disk space** - Free up ~65+ KB (small but clean)

---

## ⚠️ Important Notes

1. **Already in Git history** - All files are committed, so can be recovered if needed
2. **Backups exist** - Many scripts already have backups in archive folders
3. **No active dependencies** - None of these scripts are referenced in package.json, tasks.json, or workflows
4. **Review domain-research** - May contain useful research notes

---

## 🎯 Next Steps

1. Review this report
2. Run cleanup commands or script
3. Verify nothing breaks
4. Commit cleanup with message: `chore: Remove one-time analysis and legacy scripts`
5. Push to remote
