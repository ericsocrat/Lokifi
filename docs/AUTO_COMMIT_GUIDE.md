# 🤖 Lokifi Auto-Commit System

Complete automation for generating AI-powered commit messages.

---

## ✨ Features

### 1. **Pre-commit Hook** (Automatic)

- Automatically generates commit messages when you run `git commit`
- Detects change types and categorizes files
- Creates structured commit messages following conventional commits

### 2. **Git Alias** (Command Line)

- Use `git smart-commit` for instant AI-generated messages
- Runs the message generator and opens your editor

### 3. **dev.ps1 Command** (PowerShell)

- Use `.\dev.ps1 commit` for interactive AI commits
- Options: `-Detailed` for categorized file lists, `-AutoPush` to push after commit

---

## 🚀 Usage

### Method 1: Automatic (Pre-commit Hook)

Just commit as normal - the message is auto-generated:

```bash
git add .
git commit
# Message is pre-filled! Edit if needed, or save as-is
```

### Method 2: Git Alias

```bash
git add .
git smart-commit
# Generates message and opens editor
```

### Method 3: PowerShell Script (Recommended)

```powershell
# Stage your changes
git add .

# Basic commit with AI message
.\dev.ps1 commit

# Detailed commit with categorized files
.\dev.ps1 commit -Detailed

# Commit and auto-push
.\dev.ps1 commit -AutoPush

# Both options together
.\dev.ps1 commit -Detailed -AutoPush
```

---

## 📋 How It Works

### Message Generation

The system analyzes:

- **File types**: Frontend, backend, docs, config, styles, scripts, tests
- **Change statistics**: Lines added/removed, files modified
- **Commit type detection**: feat, fix, docs, style, chore, test

### Generated Message Format

```
feat(frontend): update frontend components

📦 Changes Summary:
- Files modified: 15
- Lines added: 250
- Lines removed: 45

📝 Modified Files:
- frontend/components/ChartHeader.tsx
- frontend/components/Navigation.tsx
... (continues)

✨ Auto-generated commit message
```

### Detailed Mode

With `-Detailed` flag, files are categorized:

```
feat(fullstack): update frontend and backend

📦 Changes Summary:
- Files modified: 27
- Lines added: 7846
- Lines removed: 979

🎨 Frontend Changes:
- frontend/components/ChartHeader.tsx
- frontend/lib/theme.ts

⚙️ Backend Changes:
- backend/app/main.py
- backend/app/services/data_service.py

📚 Documentation:
- docs/THEME_DOCUMENTATION.md
- docs/LOGO_IMPLEMENTATION.md

✨ Auto-generated commit message
```

---

## 🎯 Commit Type Detection

The system automatically detects commit types based on files:

| Files Changed      | Type    | Scope       | Description                 |
| ------------------ | ------- | ----------- | --------------------------- |
| Contains "theme"   | `feat`  | `theme`     | update theme system         |
| Contains "logo"    | `feat`  | `branding`  | update logo assets          |
| Only docs/         | `docs`  | -           | update documentation        |
| Frontend + Backend | `feat`  | `fullstack` | update frontend and backend |
| Only frontend/     | `feat`  | `frontend`  | update frontend components  |
| Only backend/      | `feat`  | `backend`   | update backend services     |
| Test files         | `test`  | -           | add/update tests            |
| .css/.scss files   | `style` | -           | update styles               |
| .json/.yaml files  | `chore` | `config`    | update configuration        |

---

## 🔧 Configuration

### Pre-commit Hook Location

```
.git/hooks/prepare-commit-msg
```

### Message Generator Script

```
scripts/utilities/generate-commit-message.ps1
```

### Git Alias

```bash
# View current alias
git config --local --get alias.smart-commit

# Modify alias
git config --local alias.smart-commit '!pwsh -File "scripts/utilities/generate-commit-message.ps1"'
```

---

## 💡 Tips

### Best Practices

1. **Stage Related Changes**: Group related files together for better categorization
2. **Use Detailed Mode**: For large commits, use `-Detailed` to see categorized files
3. **Edit When Needed**: The message is a starting point - customize it!
4. **AutoPush Carefully**: Only use `-AutoPush` when you're sure about the changes

### Example Workflow

```powershell
# Make changes to multiple files
# ...

# Stage all changes
git add .

# Generate detailed commit message
.\dev.ps1 commit -Detailed

# Review the message
# Choose: Y (use as-is), E (edit), N (cancel)

# If you chose E, VS Code opens
# Edit the message, save, and close

# Commit is created automatically
# Optionally push: git push
```

### Quick Commit Workflow

```powershell
# For small, obvious changes
git add .
.\dev.ps1 commit -AutoPush
# Done! Committed and pushed in one step
```

---

## 🔍 Troubleshooting

### "No staged changes found"

**Solution**: Use `git add <files>` or `git add .` first

### "Failed to generate commit message"

**Solution**: Check that you're in the git repository root

### Pre-commit hook not working

**Solution**: On Windows, the hook should work automatically. If not, check that the file exists at `.git/hooks/prepare-commit-msg`

### Message generator not found

**Solution**: Ensure `scripts/utilities/generate-commit-message.ps1` exists

---

## 📚 Examples

### Example 1: Theme System Commit

```powershell
git add frontend/lib/theme.ts frontend/styles/globals.css docs/THEME_DOCUMENTATION.md
.\dev.ps1 commit -Detailed
```

**Generated**:

```
feat(theme): update theme system

📦 Changes Summary:
- Files modified: 3
- Lines added: 1200
- Lines removed: 50

🎨 Frontend Changes:
- frontend/lib/theme.ts
- frontend/styles/globals.css

📚 Documentation:
- docs/THEME_DOCUMENTATION.md

✨ Auto-generated commit message
```

### Example 2: Bug Fix

```powershell
git add frontend/components/DrawingChart.tsx
.\dev.ps1 commit
```

**Generated**:

```
feat(frontend): update frontend components

📦 Changes Summary:
- Files modified: 1
- Lines added: 45
- Lines removed: 12

📝 Modified Files:
- frontend/components/DrawingChart.tsx

✨ Auto-generated commit message
```

### Example 3: Documentation Only

```powershell
git add docs/
.\dev.ps1 commit
```

**Generated**:

```
docs: update documentation

📦 Changes Summary:
- Files modified: 5
- Lines added: 300
- Lines removed: 20

📝 Modified Files:
- docs/THEME_DOCUMENTATION.md
- docs/LOGO_IMPLEMENTATION.md
- docs/QUICK_START.md

✨ Auto-generated commit message
```

---

## 🎉 Benefits

✅ **Save Time**: No more writing commit messages manually
✅ **Consistency**: All commits follow the same structured format
✅ **Context**: Automatic file categorization and statistics
✅ **Flexibility**: Edit messages when needed
✅ **Automation**: Works with your existing git workflow

---

## 📖 Further Reading

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [Semantic Versioning](https://semver.org/)

---

**Created**: October 2, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
