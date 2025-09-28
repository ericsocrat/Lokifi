Param(
  [switch]$Force
)

Write-Host '=== Fynix Backend Environment Setup ==='

$ErrorActionPreference = 'Stop'

if (!(Test-Path '.venv') -or $Force) {
  Write-Host 'Creating virtual environment (.venv)...'
  python -m venv .venv
} else {
  Write-Host 'Virtual environment already exists. Use -Force to recreate.'
}

Write-Host 'Activating virtual environment...'
. .\.venv\Scripts\Activate.ps1

Write-Host 'Upgrading pip...'
python -m pip install --upgrade pip

Write-Host 'Installing backend dependencies from requirements.txt...'
pip install -r requirements.txt

Write-Host 'Verifying core imports...'
$pyCode = @"
import sys
try:
    import aiohttp, fastapi
    print(f"aiohttp {aiohttp.__version__}")
    print(f"fastapi {fastapi.__version__}")
    print("All imports successful")
except Exception as e:
    print(f"Import verification failed: {e}")
    sys.exit(1)
"@
python -c $pyCodeWrite-Host 'Writing .env if missing (from .env.example)...'
if (-not (Test-Path '.env') -and (Test-Path '.env.example')) {
  Copy-Item .env.example .env
  Write-Host 'Created .env from template.'
}

Write-Host 'All done! In VS Code: Ctrl+Shift+P -> Python: Select Interpreter -> choose .venv'
