# Build Logs

**Purpose**: Build output logs, webpack/vite bundle analysis, and compilation artifacts.

## Common Files

- `build-output-*.log` - Next.js/Vite build logs
- `bundle-analysis.txt` - Bundle size analysis
- `build-errors-*.log` - Compilation error logs
- `treemap.html` - Visual bundle size treemap (from webpack-bundle-analyzer)

## Example Usage

```powershell
# Capture full build output
npm run build > logs/build/build-output-$(Get-Date -Format 'yyyyMMdd-HHmmss').log 2>&1

# Bundle analysis
npm run build -- --analyze > logs/build/bundle-analysis.txt
```
