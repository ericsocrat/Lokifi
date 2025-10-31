# Lint Logs

**Purpose**: ESLint output tracking for Sprint 5 quality campaign and ongoing lint monitoring.

## Common Files

- `lint-output-session*.txt` - Sprint 5 session tracking
- `lint-output.txt` - Latest lint run (general purpose)
- `lint-diff-*.txt` - Comparison between lint runs

## Example Usage

```powershell
# Sprint session lint tracking
npm run lint > logs/lint/lint-output-session59.txt

# Compare between sessions
diff logs/lint/lint-output-session58.txt logs/lint/lint-output-session59.txt
```

## Current Files (Sprint 5)

- `lint-output-session56a.txt` - After img warnings fix (299 → 295 warnings)
- `lint-output-session56b.txt` - After medium stores documentation (295 warnings)
- `lint-output-session56c.txt` - After small stores work (295 → 292 warnings)
- `lint-output.txt` - Latest baseline (292 warnings after Session 58)
