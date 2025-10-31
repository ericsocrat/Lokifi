# Coverage Logs

**Purpose**: Test coverage reports, coverage evolution tracking, and HTML reports.

## Common Files

- `coverage-output-session*.log` - Sprint session coverage logs
- `coverage-summary.json` - Machine-readable coverage summary
- `coverage-delta.txt` - Coverage comparison between sessions

## Example Usage

```powershell
# Generate coverage report with log
npm run test:coverage > logs/coverage/coverage-output-session59.log

# HTML reports are auto-generated to htmlcov/
# Open htmlcov/index.html for visual coverage report
```

## Current Files

- `coverage-output.log` - Latest coverage run output
