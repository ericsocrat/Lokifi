param([switch]$Test, [switch]$Migrate, [switch]$Check)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot
if (-not $env:LOKIFI_DATABASE_URL) {
    $databaseConfig = Get-Content -LiteralPath '.local/database.json' -Raw | ConvertFrom-Json
    $dbName = if ($Test) { 'lokifi_rebuild_test' } else { 'lokifi_rebuild' }
    $env:LOKIFI_DATABASE_URL = "postgresql+psycopg://lokifi:$($databaseConfig.password)@127.0.0.1:$($databaseConfig.port)/$dbName"
}
$env:LOKIFI_ENVIRONMENT = if ($Test) { 'test' } else { 'local' }
$env:LOKIFI_WEB_ORIGIN = 'http://127.0.0.1:13100'
if ($Test) {
    $env:LOKIFI_TEST_DATABASE_URL = $env:LOKIFI_DATABASE_URL
    uv run --project . --directory apps/api pytest
} elseif ($Check) {
    uv run --project . --directory apps/api ruff check .
} elseif ($Migrate) {
    uv run --project . --directory apps/api alembic upgrade head
} else {
    uv run --project . --directory apps/api uvicorn lokifi.main:app --host 127.0.0.1 --port 18100
}
exit $LASTEXITCODE
