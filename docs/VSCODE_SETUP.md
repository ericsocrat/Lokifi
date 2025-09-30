# VS Code Setup Guide

## 📦 Required Extensions

Install these extensions for the best development experience:

### Essential
1. **Prettier - Code formatter** (`esbenp.prettier-vscode`)
   - Auto-formats code on save
   - Enforces consistent style across the codebase

2. **ESLint** (`dbaeumer.vscode-eslint`)
   - Real-time linting for TypeScript/JavaScript
   - Auto-fixes issues on save

### Python Development
3. **Python** (`ms-python.python`)
4. **Pylance** (`ms-python.vscode-pylance`)
5. **Black Formatter** (`ms-python.black-formatter`)

### Recommended
6. **GitLens** (`eamodio.gitlens`) - Enhanced Git integration
7. **Docker** (`ms-azuretools.vscode-docker`) - Docker support
8. **Markdown All in One** (`yzhang.markdown-all-in-one`) - Better markdown editing
9. **Pretty TypeScript Errors** (`YoavBls.pretty-ts-errors`) - Better error messages

## 🚀 Quick Setup

### Option 1: Auto-Install (Recommended)
```bash
# Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
# Type: Extensions: Install Recommended Extensions
```

### Option 2: Manual Install
```bash
# Run in terminal
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
code --install-extension ms-python.black-formatter
```

## ⚙️ Settings Overview

The workspace settings (`.vscode/settings.json`) include:

### Code Quality
- ✅ **Format on Save** - Auto-format with Prettier
- ✅ **ESLint Auto-Fix** - Fix linting errors on save
- ✅ **Organize Imports** - Sort imports automatically
- ✅ **Trim Trailing Whitespace** - Clean up whitespace
- ✅ **Insert Final Newline** - Ensure files end with newline

### Python
- ✅ Black formatter (line length: 100)
- ✅ Type checking (basic mode)
- ✅ Linting (flake8, mypy)
- ✅ Test discovery (pytest)

### TypeScript/JavaScript
- ✅ Workspace TypeScript version
- ✅ Auto-update imports on file move
- ✅ ESLint integration
- ✅ Prettier formatting

## 🔍 Verification

After installing extensions:

1. **Test Prettier:**
   ```bash
   cd frontend
   npx prettier --check "src/**/*.{ts,tsx}"
   ```

2. **Test ESLint:**
   ```bash
   cd frontend
   npm run lint
   ```

3. **Test Pre-commit Hooks:**
   ```bash
   cd frontend
   # Make a change to any .ts file
   git add .
   git commit -m "test: pre-commit hooks"
   # Should auto-fix and format before committing
   ```

## 🎯 What Happens on Save?

When you save a file:

1. **TypeScript/JavaScript Files (.ts, .tsx, .js, .jsx):**
   - ESLint fixes issues automatically
   - Prettier formats the code
   - Imports are organized
   - Trailing whitespace removed

2. **Python Files (.py):**
   - Black formats the code
   - Imports are organized
   - Trailing whitespace removed

3. **JSON/Markdown Files:**
   - Prettier formats the code
   - Trailing whitespace removed

## 🎨 Code Style

All formatting rules are defined in:
- `.prettierrc.json` - Prettier configuration
- `frontend/.eslintrc.json` - ESLint rules
- `.vscode/settings.json` - Editor settings

## 🛠️ Troubleshooting

### Prettier not formatting?
1. Check extension is installed: `esbenp.prettier-vscode`
2. Check file is included in Prettier config
3. Check `.prettierignore` doesn't exclude your file
4. Try: Command Palette → "Format Document"

### ESLint not working?
1. Check extension is installed: `dbaeumer.vscode-eslint`
2. Ensure you're in the `frontend` directory
3. Check ESLint output panel: View → Output → ESLint

### Pre-commit hooks not running?
1. Check Husky is installed: `npx husky --version`
2. Check `.husky/pre-commit` exists
3. Ensure Git hooks are enabled: `git config core.hooksPath`

## 📚 Related Documentation

- [Coding Standards](./CODING_STANDARDS.md)
- [Type Patterns](./TYPE_PATTERNS.md)
- [Code Quality Automation](./CODE_QUALITY_AUTOMATION.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
