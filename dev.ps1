#!/usr/bin/env pwsh
# Lokifi Development Automation Script
# Run common operations without manual approval

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'test', 'build', 'fix-ui', 'clean', 'restart', 'cleanup', 'check', 'commit', 'smart-commit')]
    [string]$Action = 'dev',

    [Parameter(Mandatory=$false)]
    [switch]$Detailed,

    [Parameter(Mandatory=$false)]
    [switch]$AutoPush
)

function Start-Frontend {
    Write-Host "🚀 Starting Frontend (Next.js)..." -ForegroundColor Cyan
    Set-Location frontend
    npm run dev
}

function Start-Backend {
    Write-Host "🚀 Starting Backend (FastAPI)..." -ForegroundColor Cyan
    Set-Location backend
    & .\start-backend.ps1
}

function Restart-Dev {
    Write-Host "♻️ Restarting development servers..." -ForegroundColor Yellow

    # Kill existing processes
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next*" } | Stop-Process -Force
    Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*uvicorn*" } | Stop-Process -Force

    Start-Sleep -Seconds 2

    # Start fresh
    Start-Job -Name "Backend" -ScriptBlock {
        Set-Location $using:PWD\backend
        python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    }

    Start-Job -Name "Frontend" -ScriptBlock {
        Set-Location $using:PWD\frontend
        npm run dev
    }

    Write-Host "✅ Servers restarted!" -ForegroundColor Green
    Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
}

function Fix-UIIssues {
    Write-Host "🔧 Applying UI fixes and restarting..." -ForegroundColor Yellow

    # Clear Next.js cache
    Remove-Item -Path "frontend\.next" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "frontend\node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue

    # Restart
    Restart-Dev
}

function Start-Tests {
    Write-Host "🧪 Running tests..." -ForegroundColor Cyan
    Set-Location backend
    pytest tests/ -v
}

function Clean-Project {
    Write-Host "🧹 Cleaning project..." -ForegroundColor Yellow

    # Clean build artifacts
    Remove-Item -Path "frontend\.next" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "frontend\out" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "backend\__pycache__" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "backend\.pytest_cache" -Recurse -Force -ErrorAction SilentlyContinue

    # Clean logs
    Get-ChildItem -Path "." -Recurse -Filter "*.log" | Remove-Item -Force

    Write-Host "✅ Project cleaned!" -ForegroundColor Green
}

function Run-AutoCleanup {
    Write-Host "🧹 Running automated cleanup..." -ForegroundColor Cyan
    & ".\scripts\auto-cleanup.ps1"
}

function Check-Cleanup {
    Write-Host "🔍 Checking for files that need cleanup..." -ForegroundColor Cyan
    & ".\scripts\auto-cleanup.ps1" -DryRun
    Write-Host "`n💡 Run '.\dev.ps1 cleanup' to clean these files." -ForegroundColor Yellow
}

function Smart-Commit {
    param(
        [switch]$Detailed,
        [switch]$AutoPush
    )

    Write-Host "🤖 Smart Commit - AI-Generated Messages" -ForegroundColor Cyan
    Write-Host ""

    # Check for staged changes
    $stagedFiles = git diff --cached --name-only 2>&1
    if ($LASTEXITCODE -ne 0 -or !$stagedFiles) {
        Write-Host "❌ No staged changes found." -ForegroundColor Red
        Write-Host "💡 Use 'git add <files>' or 'git add .' to stage changes first." -ForegroundColor Yellow
        return
    }

    # Generate commit message
    Write-Host "📝 Generating AI commit message..." -ForegroundColor Cyan
    $tempFile = [System.IO.Path]::GetTempFileName()

    if ($Detailed) {
        & ".\scripts\utilities\generate-commit-message.ps1" -Detailed -Output $tempFile
    } else {
        & ".\scripts\utilities\generate-commit-message.ps1" -Output $tempFile
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to generate commit message" -ForegroundColor Red
        return
    }

    # Show the generated message
    Write-Host ""
    Write-Host "📋 Generated commit message:" -ForegroundColor Green
    Write-Host ""
    Get-Content $tempFile | Write-Host
    Write-Host ""

    # Ask for confirmation
    $response = Read-Host "Would you like to use this message? (Y/n/e=edit)"

    if ($response -eq 'e' -or $response -eq 'E') {
        # Open in editor
        Write-Host "✏️ Opening editor..." -ForegroundColor Cyan
        & code $tempFile --wait
        Write-Host "✓ Message updated" -ForegroundColor Green
    } elseif ($response -eq 'n' -or $response -eq 'N') {
        Write-Host "❌ Commit cancelled" -ForegroundColor Yellow
        Remove-Item $tempFile
        return
    }

    # Commit with the generated message
    Write-Host "💾 Creating commit..." -ForegroundColor Cyan
    git commit -F $tempFile

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Commit created successfully!" -ForegroundColor Green

        # Show commit hash
        $commitHash = git rev-parse --short HEAD
        Write-Host "Commit: $commitHash" -ForegroundColor Cyan

        # Auto-push if requested
        if ($AutoPush) {
            Write-Host ""
            Write-Host "🚀 Pushing to remote..." -ForegroundColor Cyan
            git push

            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Pushed successfully!" -ForegroundColor Green
            } else {
                Write-Host "⚠️ Push failed - you may need to pull first" -ForegroundColor Yellow
            }
        } else {
            Write-Host "💡 Use '.\dev.ps1 commit -AutoPush' to push automatically" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Commit failed" -ForegroundColor Red
    }

    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

# Execute action
switch ($Action) {
    'dev' { Start-Frontend }
    'test' { Start-Tests }
    'fix-ui' { Fix-UIIssues }
    'clean' { Clean-Project }
    'restart' { Restart-Dev }
    'cleanup' { Run-AutoCleanup }
    'check' { Check-Cleanup }
    'commit' { Smart-Commit -Detailed:$Detailed -AutoPush:$AutoPush }
    'smart-commit' { Smart-Commit -Detailed:$Detailed -AutoPush:$AutoPush }
    default { Start-Frontend }
}
