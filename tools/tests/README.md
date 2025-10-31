# Tools Tests & Examples

This directory contains test suites and example implementations for Lokifi's development tools.

## 📁 Contents

### Test Files

- **test-common-functions.ps1** - Comprehensive test suite for shared utilities
  - Tests all 6 functions in `lib/Common-Functions.ps1`
  - 9 tests covering success, error, and edge cases
  - Run with: `.\tools\tests\test-common-functions.ps1`
  - Expected: 9/9 tests pass (100% success rate)

### Example Files

- **example-tool.ps1** - Reference implementation demonstrating best practices
  - Shows how to use common functions library
  - Demonstrates CI/CD mode (`-CIMode`) with JSON output
  - Demonstrates dry run mode (`-DryRun`) for preview
  - Retry logic for flaky operations
  - Configuration loading from `tools/tools.config.json`
  - Error handling patterns
  - Standardized progress reporting and messaging
  - Proper exit codes (0=success, 1=error, 2=warnings)

## 🧪 Running Tests

```powershell
# Run common functions test suite
.\tools\tests\test-common-functions.ps1

# Test example tool (analyze operation)
.\tools\tests\example-tool.ps1 -Operation analyze

# Test CI/CD mode (JSON output)
.\tools\tests\example-tool.ps1 -Operation test -CIMode

# Test dry run mode (preview)
.\tools\tests\example-tool.ps1 -Operation report -DryRun
```

## 📚 Example Usage Patterns

### Using Common Functions in Your Tool

```powershell
# Import common functions (from tools root or subdirectory)
$modulePath = Join-Path $PSScriptRoot '..\lib\Common-Functions.ps1'
Import-Module $modulePath -Force

# Load configuration
$config = Get-ToolConfig -ToolName "my-tool" -DefaultConfig @{timeout=300}

# Show progress
Show-ToolProgress -Activity "Processing" -Status "File 5/100" -PercentComplete 5

# Write messages with consistent colors
Write-ToolMessage "Starting..." -Level Info      # Cyan
Write-ToolMessage "Success!" -Level Success       # Green
Write-ToolMessage "Warning!" -Level Warning       # Yellow
Write-ToolMessage "Error!" -Level Error          # Red

# Return CI/CD output
if ($CIMode) {
    $output = New-CIModeOutput -ToolName "my-tool" -Success $true -Results @{...}
    $output | ConvertTo-Json | Write-Host
    exit $output.exit_code
}
```

## 🎯 Purpose

These files serve as:

1. **Quality Assurance** - Ensure common functions work correctly
2. **Documentation** - Show how to use shared utilities
3. **Templates** - Starting point for new tool development
4. **Validation** - Verify enhancements don't break existing functionality

## 🔗 Related Files

- **Production Tools**: `../test-runner.ps1`, `../codebase-analyzer.ps1`, etc.
- **Shared Library**: `../lib/Common-Functions.ps1`
- **Configuration**: `../tools.config.json`
- **Main README**: `../README.md`

---

**Note**: These are test and example files, not production tools. Use the scripts in `tools/` root for daily development tasks.
