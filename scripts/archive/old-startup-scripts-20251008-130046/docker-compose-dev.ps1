# Lokifi Docker Development Manager
# Run all services (backend, frontend, postgres, redis) in Docker

param(
    [Parameter(Position=0)]
    [ValidateSet("up", "down", "restart", "logs", "status", "clean")]
    [string]$Action = "up"
)

$ComposeFile = "docker-compose.dev.yml"

function Write-Header {
    param([string]$Text)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " $Text" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}

switch ($Action) {
    "up" {
        Write-Header "Starting Lokifi Development Environment"
        Write-Host "🔧 Backend:  http://localhost:8000" -ForegroundColor Blue
        Write-Host "🎨 Frontend: http://localhost:3000" -ForegroundColor Magenta
        Write-Host "🗄️  Postgres: localhost:5432" -ForegroundColor Green
        Write-Host "🔴 Redis:    localhost:6379" -ForegroundColor Red
        Write-Host ""
        docker-compose -f $ComposeFile up -d --build
        Write-Host "`n✅ All services started!" -ForegroundColor Green
        Write-Host "💡 Use 'docker-compose-dev.ps1 logs' to view logs" -ForegroundColor Gray
    }
    
    "down" {
        Write-Header "Stopping Lokifi Development Environment"
        docker-compose -f $ComposeFile down
        Write-Host "✅ All services stopped!" -ForegroundColor Green
    }
    
    "restart" {
        Write-Header "Restarting Lokifi Development Environment"
        docker-compose -f $ComposeFile restart
        Write-Host "✅ All services restarted!" -ForegroundColor Green
    }
    
    "logs" {
        Write-Header "Viewing Logs (Ctrl+C to exit)"
        docker-compose -f $ComposeFile logs -f
    }
    
    "status" {
        Write-Header "Service Status"
        docker-compose -f $ComposeFile ps
    }
    
    "clean" {
        Write-Header "Cleaning Up (Removing containers and volumes)"
        Write-Warning "This will delete all data in PostgreSQL and Redis!"
        $confirm = Read-Host "Are you sure? (yes/no)"
        if ($confirm -eq "yes") {
            docker-compose -f $ComposeFile down -v
            Write-Host "✅ Cleanup complete!" -ForegroundColor Green
        } else {
            Write-Host "❌ Cancelled" -ForegroundColor Red
        }
    }
    
    default {
        Write-Host "Usage: .\docker-compose-dev.ps1 [up|down|restart|logs|status|clean]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor Cyan
        Write-Host "  up       - Start all services" -ForegroundColor White
        Write-Host "  down     - Stop all services" -ForegroundColor White
        Write-Host "  restart  - Restart all services" -ForegroundColor White
        Write-Host "  logs     - View logs (real-time)" -ForegroundColor White
        Write-Host "  status   - Check service status" -ForegroundColor White
        Write-Host "  clean    - Stop and remove volumes (⚠️  deletes data)" -ForegroundColor White
    }
}
