# Lokifi Quick Launcher
# Just double-click this file or run: .\launch.ps1

param(
    [Parameter(Position = 0)]
    [ValidateSet("backend", "frontend", "both", "test", "help")]
    [string]$Mode = "help"
)

# Set the console title
$Host.UI.RawUI.WindowTitle = "Lokifi Development Launcher"

function Show-Banner {
    Clear-Host
    Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║              🚀 LOKIFI LAUNCHER              ║" -ForegroundColor Cyan  
    Write-Host "║         Quick Development Commands           ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Menu {
    Show-Banner
    Write-Host "Choose an option:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. 🔧 Start Backend (FastAPI)" -ForegroundColor Green
    Write-Host "2. 🌐 Start Frontend (Next.js)" -ForegroundColor Green  
    Write-Host "3. 🚀 Start Both Servers" -ForegroundColor Green
    Write-Host "4. 🧪 Run Tests" -ForegroundColor Blue
    Write-Host "5. 📊 System Status" -ForegroundColor Blue
    Write-Host "6. 🧹 Clean Cache" -ForegroundColor Yellow
    Write-Host "7. ❓ Help & Commands" -ForegroundColor Magenta
    Write-Host "8. 🚪 Exit" -ForegroundColor Red
    Write-Host ""
    
    do {
        $choice = Read-Host "Enter your choice (1-8)"
        switch ($choice) {
            "1" { Start-Backend; break }
            "2" { Start-Frontend; break } 
            "3" { Start-Both; break }
            "4" { Run-Tests; break }
            "5" { Show-Status; break }
            "6" { Clean-Cache; break }
            "7" { Show-Help; break }
            "8" { Write-Host "Goodbye! 👋" -ForegroundColor Green; exit }
            default { Write-Host "Invalid choice. Please enter 1-8." -ForegroundColor Red }
        }
    } while ($true)
}

function Start-Backend {
    Show-Banner
    Write-Host "🔧 Starting Lokifi Backend Server..." -ForegroundColor Cyan
    Write-Host "📍 URL: http://localhost:8000" -ForegroundColor Blue
    Write-Host "📖 API Docs: http://localhost:8000/docs" -ForegroundColor Blue
    Write-Host "⏹️  Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    Set-Location backend
    $env:PYTHONPATH = $PWD.Path
    & .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
    Set-Location ..
    
    Read-Host "`nPress Enter to return to menu"
    Show-Menu
}

function Start-Frontend {
    Show-Banner
    Write-Host "🌐 Starting Lokifi Frontend Server..." -ForegroundColor Cyan
    Write-Host "📍 URL: http://localhost:3000" -ForegroundColor Blue
    Write-Host "⏹️  Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    Set-Location frontend
    npm run dev
    Set-Location ..
    
    Read-Host "`nPress Enter to return to menu"
    Show-Menu
}

function Start-Both {
    Show-Banner
    Write-Host "🚀 Starting Both Servers..." -ForegroundColor Cyan
    Write-Host "🔧 Backend:  http://localhost:8000" -ForegroundColor Blue
    Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Blue
    Write-Host "⏹️  Press Ctrl+C to stop both" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "Starting backend..." -ForegroundColor Yellow
    $backendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        Set-Location backend
        $env:PYTHONPATH = $PWD.Path
        & .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
    }
    
    Start-Sleep -Seconds 3
    Write-Host "Starting frontend..." -ForegroundColor Yellow
    
    Set-Location frontend
    npm run dev
    Set-Location ..
    
    # Cleanup background job
    Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob -ErrorAction SilentlyContinue
    
    Read-Host "`nPress Enter to return to menu"
    Show-Menu
}

function Run-Tests {
    Show-Banner
    Write-Host "🧪 Running Lokifi Tests..." -ForegroundColor Cyan
    
    & .\dev.ps1 test
    
    Read-Host "`nPress Enter to return to menu"
    Show-Menu
}

function Show-Status {
    Show-Banner
    Write-Host "📊 Lokifi System Status..." -ForegroundColor Cyan
    
    & .\dev.ps1 status
    
    Read-Host "`nPress Enter to return to menu"  
    Show-Menu
}

function Clean-Cache {
    Show-Banner
    Write-Host "🧹 Cleaning Cache Files..." -ForegroundColor Cyan
    
    & .\dev.ps1 clean
    
    Read-Host "`nCache cleaned! Press Enter to return to menu"
    Show-Menu
}

function Show-Help {
    Show-Banner
    Write-Host "❓ Lokifi Development Help" -ForegroundColor Cyan
    Write-Host "════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔧 Backend Commands:" -ForegroundColor Yellow
    Write-Host "   .\dev.ps1 be          - Start backend only" -ForegroundColor White
    Write-Host "   .\dev.ps1 test-be     - Run backend tests" -ForegroundColor White
    Write-Host ""
    Write-Host "🌐 Frontend Commands:" -ForegroundColor Yellow  
    Write-Host "   .\dev.ps1 fe          - Start frontend only" -ForegroundColor White
    Write-Host "   .\dev.ps1 test-fe     - Run frontend tests" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 Full Stack:" -ForegroundColor Yellow
    Write-Host "   .\dev.ps1 dev         - Start both servers" -ForegroundColor White
    Write-Host "   .\dev.ps1 test        - Run all tests" -ForegroundColor White
    Write-Host ""
    Write-Host "📚 More Info:" -ForegroundColor Yellow
    Write-Host "   See EASY_COMMANDS.md for copy-paste commands" -ForegroundColor White
    Write-Host "   See QUICK_COMMANDS.md for reference" -ForegroundColor White
    Write-Host ""
    
    Read-Host "Press Enter to return to menu"
    Show-Menu
}

# Handle command line arguments
switch ($Mode) {
    "backend" { Start-Backend }
    "frontend" { Start-Frontend }
    "both" { Start-Both }
    "test" { Run-Tests }
    "help" { Show-Help }
    default { Show-Menu }
}