# Backend Test Logs

**Purpose**: Pytest execution logs, test failure details, and test session outputs.

## Common Files

- `pytest-*.log` - Test execution logs
- `pytest-failures-*.log` - Failed test details for debugging
- `test-summary-*.json` - Machine-readable test results

## Usage

```bash
# Run all tests with output log
pytest -v > logs/test/pytest-$(date +%Y%m%d).log 2>&1

# Run with verbose output
pytest -vv > logs/test/pytest-verbose-$(date +%Y%m%d).log 2>&1

# Run specific test module
pytest tests/test_auth.py -v > logs/test/pytest-auth.log

# Run with failure details
pytest --tb=short > logs/test/pytest-failures-$(date +%Y%m%d).log 2>&1

# Run with JSON report
pytest --json-report --json-report-file=logs/test/test-summary.json
```

## Test Categories

### Unit Tests
```bash
pytest tests/unit/ -v > logs/test/pytest-unit-$(date +%Y%m%d).log
```

### Integration Tests
```bash
pytest tests/integration/ -v > logs/test/pytest-integration-$(date +%Y%m%d).log
```

### E2E Tests
```bash
pytest tests/e2e/ -v > logs/test/pytest-e2e-$(date +%Y%m%d).log
```

## Debugging Failed Tests

1. Review failure log: `pytest-failures-*.log`
2. Run specific test with verbose: `pytest tests/test_file.py::test_name -vv`
3. Use pdb debugger: `pytest tests/test_file.py::test_name --pdb`
4. Check test summary JSON for patterns

## Best Practices

1. **Log before commits**: Capture test status before pushing
2. **Failure triage**: Investigate failures immediately
3. **Flaky tests**: Document recurring intermittent failures
4. **CI/CD integration**: Use JSON reports for automated analysis
