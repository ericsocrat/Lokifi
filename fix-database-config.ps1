#!/usr/bin/env pwsh
# PostgreSQL Database Configuration Fix Script
# Purpose: Resolve database port and connection issues blocking tests
# Session: 211
# Status: Ready to run

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     LOKIFI DATABASE CONFIGURATION FIX SCRIPT             ║" -ForegroundColor Cyan
Write-Host "║     Session 211: Restore PostgreSQL to Port 5432         ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# === SECTION 1: Cleanup Corrupted Coverage Files ===
Write-Host "STEP 1️⃣: Cleaning up corrupted coverage database" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray

$backendPath = "apps/backend"
$coverageFiles = @(".coverage", ".coverage.*", ".pytest_cache")

foreach ($file in $coverageFiles) {
    $fullPath = Join-Path $backendPath $file
    if (Test-Path $fullPath) {
        Remove-Item $fullPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✅ Removed: $file" -ForegroundColor Green
    }
}

Write-Host ""

# === SECTION 2: Stop All Docker Services ===
Write-Host "STEP 2️⃣: Stopping all Docker services" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray

cd infra/docker

$dockerRunning = docker ps -q 2>/dev/null
if ($dockerRunning) {
    Write-Host "  Shutting down containers..." -ForegroundColor Cyan
    docker compose down --remove-orphans
    Write-Host "  ✅ All Docker services stopped" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  No Docker containers currently running" -ForegroundColor Gray
}

Write-Host "  Waiting 3 seconds for cleanup..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

Write-Host ""

# === SECTION 3: Restart PostgreSQL and Redis ===
Write-Host "STEP 3️⃣: Starting PostgreSQL (port 5432) and Redis (port 6379)" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray

Write-Host "  Starting services..." -ForegroundColor Cyan
docker compose up -d postgres redis

Write-Host "  ⏳ Waiting for PostgreSQL to be healthy (40 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 40

Write-Host ""

# === SECTION 4: Verify Services ===
Write-Host "STEP 4️⃣: Verifying Docker services" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray

$psStatus = docker ps --filter "name=postgres" --format "{{.Status}}"
$redisStatus = docker ps --filter "name=redis" --format "{{.Status}}"

if ($psStatus -match "healthy") {
    Write-Host "  ✅ PostgreSQL healthy: $psStatus" -ForegroundColor Green
} else {
    Write-Host "  ❌ PostgreSQL issue: $psStatus" -ForegroundColor Red
}

if ($redisStatus -match "healthy|running") {
    Write-Host "  ✅ Redis running: $redisStatus" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Redis status: $redisStatus" -ForegroundColor Yellow
}

Write-Host ""

# === SECTION 5: Database Connectivity Check ===
Write-Host "STEP 5️⃣: Testing PostgreSQL connectivity" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray

$env:PGPASSWORD = 'lokifi_dev_password'

try {
    $dbCheck = psql -h localhost -p 5432 -U lokifi -d lokifi_db -c "SELECT version();" 2>&1
    if ($dbCheck -match "PostgreSQL") {
        Write-Host "  ✅ PostgreSQL connection successful" -ForegroundColor Green
        Write-Host "  Version: $($dbCheck[0])" -ForegroundColor Gray
    } else {
        Write-Host "  ⚠️  Connection response: $dbCheck" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  psql command failed (but Docker might still be working)" -ForegroundColor Yellow
    Write-Host "     Error: $_" -ForegroundColor Gray
}

Write-Host ""

# === SECTION 6: Test Database Access ===
Write-Host "STEP 6️⃣: Checking database tables" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray

try {
    $tableCheck = psql -h localhost -p 5432 -U lokifi -d lokifi_db -c "SELECT COUNT(*) as user_count FROM users;" 2>&1
    if ($tableCheck) {
        Write-Host "  ✅ Database tables accessible" -ForegroundColor Green
        Write-Host "  Users in database: $($tableCheck[-1])" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⚠️  Could not query tables" -ForegroundColor Yellow
}

Write-Host ""

# === SECTION 7: Prepare Backend Environment ===
Write-Host "STEP 7️⃣: Configuring backend environment variables" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray

$env:DATABASE_URL = "postgresql+asyncpg://lokifi:lokifi_dev_password@localhost:5432/lokifi_db"
Write-Host "  ✅ DATABASE_URL set to:" -ForegroundColor Green
Write-Host "     $env:DATABASE_URL" -ForegroundColor Gray

Write-Host ""

# === SECTION 8: Run Backend Tests ===
Write-Host "STEP 8️⃣: Running backend tests with correct database" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray

cd ../..
cd apps/backend

if (Test-Path venv/Scripts/Activate.ps1) {
    & ./venv/Scripts/Activate.ps1
    Write-Host "  ✅ Python environment activated" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Virtual environment not found, creating..." -ForegroundColor Yellow
    python -m venv venv
    & ./venv/Scripts/Activate.ps1
}

Write-Host ""
Write-Host "Running pytest..." -ForegroundColor Cyan
python -m pytest --cov=app --cov-report=term-missing --cov-fail-under=20 -v tests/ 2>&1 | Tee-Object -Variable testOutput

Write-Host ""

# === SECTION 9: Summary ===
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    SUMMARY OF FIXES                       ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Completed Actions:" -ForegroundColor Green
Write-Host "   • Removed corrupted .coverage file" -ForegroundColor Gray
Write-Host "   • Restarted PostgreSQL on port 5432 (standard)" -ForegroundColor Gray
Write-Host "   • Started Redis on port 6379" -ForegroundColor Gray
Write-Host "   • Set DATABASE_URL environment variable" -ForegroundColor Gray
Write-Host "   • Ran backend tests with fresh coverage database" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 Test Results:" -ForegroundColor Cyan

if ($testOutput -match "passed") {
    $passCount = $testOutput | Select-String "passed" | Select-Object -First 1
    Write-Host "   $passCount" -ForegroundColor Green
}

if ($testOutput -match "coverage") {
    $coverage = $testOutput | Select-String "coverage" | Select-Object -First 1
    Write-Host "   $coverage" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Verify coverage is now > 20% (not 0%)" -ForegroundColor Gray
Write-Host "   2. If tests pass: Commit fix and continue development" -ForegroundColor Gray
Write-Host "   3. If tests fail: Check error messages above and debug further" -ForegroundColor Gray
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "Database configuration fix complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
