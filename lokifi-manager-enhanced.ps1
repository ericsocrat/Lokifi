#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Lokifi Ultimate Manager - Phase 2B Development Integration Complete
    
.DESCRIPTION
    Master control script consolidating all Lokifi development, server management, 
    and validation operations into one comprehensive tool.
    
    PHASE 2B INTEGRATION:
    - dev.ps1 (344 lines) → Integrated development workflow
    - pre-commit-checks.ps1 (184 lines) → Integrated validation system  
    - launch.ps1 (179 lines) → Integrated interactive launcher
    
.NOTES
    Author: GitHub Copilot + User
    Created: October 8, 2025 (Phase 1)
    Enhanced: October 2025 (Phase 2B - Development Integration)
    
    CONSOLIDATION HISTORY:
    ✓ Phase 1: 5 root scripts → lokifi-manager.ps1 (749 lines)
    ✓ Phase 2B: +3 development scripts → Enhanced (1,200+ lines)
    
    ELIMINATED SCRIPTS:
    - start-servers.ps1 → -Action servers
    - manage-redis.ps1 → -Action redis  
    - test-api.ps1 → -Action test
    - setup-postgres.ps1 → -Action postgres
    - organize-repository.ps1 → -Action organize
    - dev.ps1 → -Action dev [NEW]
    - pre-commit-checks.ps1 → -Action validate [NEW]
    - launch.ps1 → -Action launch [NEW]
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet('servers', 'redis', 'postgres', 'test', 'organize', 'health', 'stop', 'clean', 'status', 
                 'dev', 'launch', 'validate', 'format', 'lint', 'setup', 'install', 'upgrade', 'docs', 
                 'analyze', 'fix', 'help')]
    [string]$Action = 'help',
    
    [ValidateSet('interactive', 'auto', 'force', 'verbose', 'quiet')]
    [string]$Mode = 'interactive',
    
    [ValidateSet('redis', 'backend', 'frontend', 'postgres', 'all', 'be', 'fe', 'both', 'organize', 'ts', 'cleanup')]
    [string]$Component = 'all',
    
    # Development-specific parameters
    [string]$DevCommand = "",
    [string]$Package = "",
    [string]$Version = "",
    [switch]$SkipTypeCheck,
    [switch]$SkipAnalysis,
    [switch]$Quick,
    [switch]$Force
)

# ============================================
# GLOBAL CONFIGURATION
# ============================================
$Global:LokifiConfig = @{
    ProjectRoot = $PSScriptRoot
    BackendDir = Join-Path $PSScriptRoot "backend"
    FrontendDir = Join-Path $PSScriptRoot "frontend"
    Redis = @{
        ContainerName = "lokifi-redis"
        Port = 6379
        Password = "23233"
    }
    PostgreSQL = @{
        ContainerName = "lokifi-postgres"
        Port = 5432
        Database = "lokifi"
        User = "lokifi"
        Password = "lokifi2025"
    }
    Backend = @{
        ContainerName = "lokifi-backend"
        Port = 8000
        DockerImage = "python:3.11-slim"
    }
    Frontend = @{
        ContainerName = "lokifi-frontend"
        Port = 3000
        DockerImage = "node:18-alpine"
    }
    API = @{
        BackendUrl = "http://localhost:8000"
        FrontendUrl = "http://localhost:3000"
    }
    Colors = @{
        Red     = "Red"
        Green   = "Green" 
        Yellow  = "Yellow"
        Blue    = "Blue"
        Cyan    = "Cyan"
        Magenta = "Magenta"
        White   = "White"
    }
}

# ============================================
# UTILITY FUNCTIONS
# ============================================
function Write-LokifiHeader {
    param([string]$Title, [string]$Color = "Cyan")
    
    Clear-Host
    Write-Host ""
    Write-Host "🚀 Lokifi Ultimate Manager - $Title" -ForegroundColor $Color
    Write-Host "=" * (60 + $Title.Length) -ForegroundColor Green
    Write-Host ""
}

function Write-Step {
    param([string]$Step, [string]$Message, [string]$Color = "Yellow")
    Write-Host "$Step $Message" -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-Host "   ✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "   ⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "   ❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "   ℹ️  $Message" -ForegroundColor Cyan
}

function Write-ColoredText {
    param([string]$Text, [string]$Color = "White")
    Write-Host $Text -ForegroundColor $Global:LokifiConfig.Colors[$Color]
}

function Test-DockerAvailable {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        return $false
    }
    
    try {
        docker ps 2>$null | Out-Null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Test-ServiceRunning {
    param([string]$Url, [int]$TimeoutSeconds = 5)
    
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSeconds -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# ============================================
# REDIS MANAGEMENT (FROM ORIGINAL)
# ============================================
function Start-RedisContainer {
    Write-Step "🔴" "Managing Redis Container..."
    
    if (-not (Test-DockerAvailable)) {
        Write-Warning "Docker not available - Redis will be skipped"
        return $false
    }
    
    $containerName = $Global:LokifiConfig.Redis.ContainerName
    $password = $Global:LokifiConfig.Redis.Password
    $port = $Global:LokifiConfig.Redis.Port
    
    # Check if container exists
    $existingContainer = docker ps -a --filter "name=$containerName" --format "{{.Names}}" 2>$null
    
    if ($existingContainer -eq $containerName) {
        Write-Info "Found existing Redis container"
        
        # Check if running
        $runningContainer = docker ps --filter "name=$containerName" --format "{{.Names}}" 2>$null
        
        if ($runningContainer -eq $containerName) {
            Write-Success "Redis container already running"
        } else {
            Write-Step "   ▶️" "Starting existing container..."
            docker start $containerName | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Redis container started"
            } else {
                Write-Error "Failed to start Redis container"
                return $false
            }
        }
    } else {
        Write-Step "   🚀" "Creating new Redis container..."
        docker run -d --name $containerName -p "${port}:6379" -e REDIS_PASSWORD=$password --restart unless-stopped redis:latest redis-server --requirepass $password | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Redis container created and started"
        } else {
            Write-Error "Failed to create Redis container"
            return $false
        }
    }
    
    Write-Info "Connection: redis://:$password@localhost:$port/0"
    return $true
}

function Stop-RedisContainer {
    $containerName = $Global:LokifiConfig.Redis.ContainerName
    
    if (Test-DockerAvailable) {
        $runningContainer = docker ps --filter "name=$containerName" --format "{{.Names}}" 2>$null
        if ($runningContainer -eq $containerName) {
            docker stop $containerName | Out-Null
            Write-Success "Redis container stopped"
        }
    }
}

# ============================================
# POSTGRESQL MANAGEMENT (FROM ORIGINAL)  
# ============================================
function Start-PostgreSQLContainer {
    Write-Step "🐘" "Managing PostgreSQL Container..."
    
    if (-not (Test-DockerAvailable)) {
        Write-Warning "Docker not available - PostgreSQL setup skipped"
        return $false
    }
    
    $config = $Global:LokifiConfig.PostgreSQL
    
    # Check if container exists
    $existingContainer = docker ps -a --filter "name=$($config.ContainerName)" --format "{{.Names}}" 2>$null
    
    if ($existingContainer -eq $config.ContainerName) {
        $runningContainer = docker ps --filter "name=$($config.ContainerName)" --format "{{.Names}}" 2>$null
        
        if ($runningContainer -eq $config.ContainerName) {
            Write-Success "PostgreSQL container already running"
        } else {
            Write-Step "   ▶️" "Starting existing PostgreSQL container..."
            docker start $config.ContainerName | Out-Null
            Write-Success "PostgreSQL started"
        }
    } else {
        Write-Step "   🚀" "Creating PostgreSQL container..."
        
        docker run -d --name $config.ContainerName -e POSTGRES_USER=$config.User -e POSTGRES_PASSWORD=$config.Password -e POSTGRES_DB=$config.Database -p "$($config.Port):5432" --restart unless-stopped postgres:16-alpine | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "PostgreSQL created and started"
            Write-Info "Waiting for PostgreSQL to be ready..."
            Start-Sleep -Seconds 5
        } else {
            Write-Error "Failed to create PostgreSQL container"
            return $false
        }
    }
    
    Write-Info "Connection: postgresql://$($config.User):$($config.Password)@localhost:$($config.Port)/$($config.Database)"
    return $true
}

function Stop-PostgreSQLContainer {
    $containerName = $Global:LokifiConfig.PostgreSQL.ContainerName
    
    if (Test-DockerAvailable) {
        $runningContainer = docker ps --filter "name=$containerName" --format "{{.Names}}" 2>$null
        if ($runningContainer -eq $containerName) {
            docker stop $containerName | Out-Null
            Write-Success "PostgreSQL container stopped"
        }
    }
}

# ============================================
# DOCKER COMPOSE MANAGEMENT
# ============================================
function Start-DockerComposeStack {
    Write-Step "🐳" "Starting Docker Compose Stack..."
    
    if (-not (Test-DockerAvailable)) {
        Write-Warning "Docker not available - Cannot start containerized stack"
        return $false
    }
    
    if (-not (Test-Path "docker-compose.yml")) {
        Write-Warning "docker-compose.yml not found - Cannot start containerized stack"
        return $false
    }
    
    try {
        Write-Step "   🚀" "Starting all services with Docker Compose..."
        docker-compose up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker Compose stack started successfully"
            
            # Wait a moment for services to initialize
            Start-Sleep -Seconds 3
            
            # Show running services
            Write-Step "   📊" "Services status:"
            docker-compose ps
            
            return $true
        } else {
            Write-Error "Failed to start Docker Compose stack"
            return $false
        }
    } catch {
        Write-Error "Error starting Docker Compose: $_"
        return $false
    }
}

function Stop-DockerComposeStack {
    Write-Step "🐳" "Stopping Docker Compose Stack..."
    
    if (-not (Test-DockerAvailable)) {
        Write-Warning "Docker not available"
        return
    }
    
    if (-not (Test-Path "docker-compose.yml")) {
        Write-Warning "docker-compose.yml not found"
        return
    }
    
    try {
        docker-compose down
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker Compose stack stopped successfully"
        } else {
            Write-Warning "Some issues stopping Docker Compose stack"
        }
    } catch {
        Write-Error "Error stopping Docker Compose: $_"
    }
}

function Get-DockerComposeStatus {
    if (-not (Test-DockerAvailable)) {
        return @{
            Available = $false
            Services = @()
        }
    }
    
    if (-not (Test-Path "docker-compose.yml")) {
        return @{
            Available = $false
            Services = @()
        }
    }
    
    try {
        $services = docker-compose ps --format json 2>$null | ConvertFrom-Json
        return @{
            Available = $true
            Services = $services
        }
    } catch {
        return @{
            Available = $false
            Services = @()
        }
    }
}

# ============================================
# LEGACY CONTAINER MANAGEMENT (KEPT FOR COMPATIBILITY)
# ============================================
function Start-BackendContainer {
    Write-Step "🔧" "Managing Backend Docker Container..."
    
    if (-not (Test-DockerAvailable)) {
        Write-Warning "Docker not available - Backend will run locally"
        return $false
    }
    
    $config = $Global:LokifiConfig.Backend
    $backendDir = $Global:LokifiConfig.BackendDir
    
    # Check if container exists
    $existingContainer = docker ps -a --filter "name=$($config.ContainerName)" --format "{{.Names}}" 2>$null
    
    if ($existingContainer -eq $config.ContainerName) {
        $runningContainer = docker ps --filter "name=$($config.ContainerName)" --format "{{.Names}}" 2>$null
        
        if ($runningContainer -eq $config.ContainerName) {
            Write-Success "Backend container already running"
        } else {
            Write-Step "   ▶️" "Starting existing Backend container..."
            docker start $config.ContainerName | Out-Null
            Write-Success "Backend container started"
        }
    } else {
        Write-Step "   🚀" "Creating Backend Docker container..."
        
        # Create Dockerfile for backend if it doesn't exist
        $dockerfilePath = Join-Path $backendDir "Dockerfile"
        if (-not (Test-Path $dockerfilePath)) {
            $dockerfileContent = @"
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Start command
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
"@
            Set-Content -Path $dockerfilePath -Value $dockerfileContent
            Write-Info "Created Dockerfile for backend"
        }
        
        # Build and run container
        Push-Location $backendDir
        try {
            Write-Step "   🔨" "Building Backend Docker image..."
            docker build -t lokifi-backend . | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Step "   🚀" "Starting Backend container..."
                docker run -d --name $config.ContainerName -p "$($config.Port):8000" --restart unless-stopped lokifi-backend | Out-Null
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Backend container created and started"
                } else {
                    Write-Error "Failed to start Backend container"
                    return $false
                }
            } else {
                Write-Error "Failed to build Backend Docker image"
                return $false
            }
        } finally {
            Pop-Location
        }
    }
    
    Write-Info "Backend API: http://localhost:$($config.Port)"
    return $true
}

function Stop-BackendContainer {
    $containerName = $Global:LokifiConfig.Backend.ContainerName
    
    if (Test-DockerAvailable) {
        $runningContainer = docker ps --filter "name=$containerName" --format "{{.Names}}" 2>$null
        if ($runningContainer -eq $containerName) {
            docker stop $containerName | Out-Null
            Write-Success "Backend container stopped"
        }
    }
}

# ============================================
# FRONTEND DOCKER MANAGEMENT
# ============================================
function Start-FrontendContainer {
    Write-Step "🎨" "Managing Frontend Docker Container..."
    
    if (-not (Test-DockerAvailable)) {
        Write-Warning "Docker not available - Frontend will run locally"
        return $false
    }
    
    $config = $Global:LokifiConfig.Frontend
    $frontendDir = $Global:LokifiConfig.FrontendDir
    
    # Check if container exists
    $existingContainer = docker ps -a --filter "name=$($config.ContainerName)" --format "{{.Names}}" 2>$null
    
    if ($existingContainer -eq $config.ContainerName) {
        $runningContainer = docker ps --filter "name=$($config.ContainerName)" --format "{{.Names}}" 2>$null
        
        if ($runningContainer -eq $config.ContainerName) {
            Write-Success "Frontend container already running"
        } else {
            Write-Step "   ▶️" "Starting existing Frontend container..."
            docker start $config.ContainerName | Out-Null
            Write-Success "Frontend container started"
        }
    } else {
        Write-Step "   🚀" "Creating Frontend Docker container..."
        
        # Create Dockerfile for frontend if it doesn't exist
        $dockerfilePath = Join-Path $frontendDir "Dockerfile"
        if (-not (Test-Path $dockerfilePath)) {
            $dockerfileContent = @"
FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
"@
            Set-Content -Path $dockerfilePath -Value $dockerfileContent
            Write-Info "Created Dockerfile for frontend"
        }
        
        # Build and run container
        Push-Location $frontendDir
        try {
            Write-Step "   🔨" "Building Frontend Docker image..."
            docker build -t lokifi-frontend . | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Step "   🚀" "Starting Frontend container..."
                docker run -d --name $config.ContainerName -p "$($config.Port):3000" --restart unless-stopped lokifi-frontend | Out-Null
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Frontend container created and started"
                } else {
                    Write-Error "Failed to start Frontend container"
                    return $false
                }
            } else {
                Write-Error "Failed to build Frontend Docker image"
                return $false
            }
        } finally {
            Pop-Location
        }
    }
    
    Write-Info "Frontend App: http://localhost:$($config.Port)"
    return $true
}

function Stop-FrontendContainer {
    $containerName = $Global:LokifiConfig.Frontend.ContainerName
    
    if (Test-DockerAvailable) {
        $runningContainer = docker ps --filter "name=$containerName" --format "{{.Names}}" 2>$null
        if ($runningContainer -eq $containerName) {
            docker stop $containerName | Out-Null
            Write-Success "Frontend container stopped"
        }
    }
}

# ============================================
# DEVELOPMENT ENVIRONMENT SETUP (FROM dev.ps1)
# ============================================
function Setup-DevelopmentEnvironment {
    Write-Step "📦" "Setting up Lokifi development environment..."
    
    # Backend setup
    Write-Step "   🔧" "Setting up backend..."
    Push-Location $Global:LokifiConfig.BackendDir
    try {
        if (!(Test-Path "venv")) {
            python -m venv venv
        }
        & .\venv\Scripts\pip.exe install --upgrade pip setuptools wheel
        & .\venv\Scripts\pip.exe install -r requirements.txt
        Write-Success "Backend environment ready"
    } finally {
        Pop-Location
    }
    
    # Frontend setup
    Write-Step "   🌐" "Setting up frontend..."
    Push-Location $Global:LokifiConfig.FrontendDir
    try {
        npm install
        Write-Success "Frontend dependencies installed"
    } finally {
        Pop-Location
    }
    
    Write-Success "Development environment setup complete!"
}

# ============================================
# BACKEND MANAGEMENT (ENHANCED FROM ORIGINAL)
# ============================================
function Start-BackendServer {
    Write-Step "🔧" "Starting Backend Server..."
    
    # Try Docker first if available
    if (Test-DockerAvailable) {
        Write-Info "Docker available - starting Backend in container..."
        if (Start-BackendContainer) {
            return $true
        } else {
            Write-Warning "Docker container failed, falling back to local development..."
        }
    } else {
        Write-Info "Docker not available - starting Backend locally..."
    }
    
    # Local development fallback
    $backendDir = $Global:LokifiConfig.BackendDir
    
    if (-not (Test-Path $backendDir)) {
        Write-Error "Backend directory not found: $backendDir"
        return $false
    }
    
    Push-Location $backendDir
    
    try {
        # Check/create virtual environment
        if (-not (Test-Path "venv/Scripts/Activate.ps1")) {
            Write-Step "   📦" "Creating Python virtual environment..."
            python -m venv venv
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Failed to create virtual environment"
                return $false
            }
        }
        
        # Activate virtual environment
        Write-Step "   🔌" "Activating virtual environment..."
        & "./venv/Scripts/Activate.ps1"
        
        # Install requirements
        if (Test-Path "requirements.txt") {
            Write-Step "   📥" "Installing Python dependencies..."
            pip install -r requirements.txt --quiet
        }
        
        # Set Python path and start server
        $env:PYTHONPATH = (Get-Location).Path
        Write-Success "Backend starting locally on http://localhost:8000"
        Write-Info "Use Ctrl+C to stop the server"
        
        if ($Mode -eq "auto") {
            Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000" -WindowStyle Hidden
            Start-Sleep -Seconds 3
        } else {
            python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
        }
        
    } finally {
        Pop-Location
    }
    
    return $true
}

# ============================================
# FRONTEND MANAGEMENT (ENHANCED FROM ORIGINAL)
# ============================================
function Start-FrontendServer {
    Write-Step "🎨" "Starting Frontend Server..."
    
    # Try Docker first if available
    if (Test-DockerAvailable) {
        Write-Info "Docker available - starting Frontend in container..."
        if (Start-FrontendContainer) {
            return $true
        } else {
            Write-Warning "Docker container failed, falling back to local development..."
        }
    } else {
        Write-Info "Docker not available - starting Frontend locally..."
    }
    
    # Local development fallback
    $frontendDir = $Global:LokifiConfig.FrontendDir
    
    if (-not (Test-Path $frontendDir)) {
        Write-Error "Frontend directory not found: $frontendDir"
        return $false
    }
    
    Push-Location $frontendDir
    
    try {
        # Install dependencies if needed
        if (-not (Test-Path "node_modules")) {
            Write-Step "   📦" "Installing Node.js dependencies..."
            npm install
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Failed to install dependencies"
                return $false
            }
        }
        
        Write-Success "Frontend starting locally on http://localhost:3000"
        Write-Info "Use Ctrl+C to stop the server"
        
        if ($Mode -eq "auto") {
            Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Hidden
            Start-Sleep -Seconds 3
        } else {
            npm run dev
        }
        
    } finally {
        Pop-Location
    }
    
    return $true
}

# ============================================
# DEVELOPMENT WORKFLOW (FROM dev.ps1)
# ============================================
function Start-DevelopmentWorkflow {
    param([string]$SubCommand = "both")
    
    switch ($SubCommand.ToLower()) {
        "both" {
            Write-ColoredText "🔥 Starting Lokifi development environment..." "Cyan"
            
            # Start backend in background
            Write-ColoredText "Starting backend server..." "Yellow"
            $backendJob = Start-Job -ScriptBlock {
                Set-Location $using:PWD
                Set-Location backend
                $env:PYTHONPATH = $PWD.Path
                & .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
            }
            
            Start-Sleep -Seconds 3
            
            # Start frontend in background
            Write-ColoredText "Starting frontend server..." "Yellow"
            $frontendJob = Start-Job -ScriptBlock {
                Set-Location $using:PWD
                Set-Location frontend
                npm run dev
            }
            
            Write-ColoredText "✅ Both servers starting..." "Green"
            Write-ColoredText "🌐 Frontend: http://localhost:3000" "Blue"
            Write-ColoredText "🔧 Backend:  http://localhost:8000" "Blue"
            Write-ColoredText "Press Ctrl+C to stop..." "Yellow"
            
            # Wait for user interrupt
            try {
                Wait-Job -Job $backendJob, $frontendJob
            }
            finally {
                Stop-Job -Job $backendJob, $frontendJob
                Remove-Job -Job $backendJob, $frontendJob
            }
        }
        "be" { Start-BackendServer }
        "fe" { Start-FrontendServer }
        default { 
            Write-Warning "Unknown dev command: $SubCommand"
            Write-Info "Available: both, be, fe"
        }
    }
}

function Run-DevelopmentTests {
    param([string]$Type = "all")
    
    switch ($Type) {
        "all" {
            Write-ColoredText "🧪 Running all tests..." "Cyan"
            Run-DevelopmentTests "backend"
            Run-DevelopmentTests "frontend"
        }
        "backend" {
            Write-ColoredText "🧪 Running backend tests..." "Cyan"
            Push-Location $Global:LokifiConfig.BackendDir
            try {
                $env:PYTHONPATH = $PWD.Path
                & .\venv\Scripts\python.exe -m pytest tests/ -v --tb=short
            } finally {
                Pop-Location
            }
        }
        "frontend" {
            Write-ColoredText "🧪 Running frontend tests..." "Cyan"
            Push-Location $Global:LokifiConfig.FrontendDir
            try {
                npm run test:ci
            } finally {
                Pop-Location
            }
        }
    }
}

function Format-DevelopmentCode {
    Write-ColoredText "🎨 Formatting code..." "Cyan"
    
    # Backend formatting
    Write-ColoredText "Formatting backend..." "Yellow"
    Push-Location $Global:LokifiConfig.BackendDir
    try {
        $env:PYTHONPATH = $PWD.Path
        & .\venv\Scripts\python.exe -m black .
        & .\venv\Scripts\python.exe -m ruff check . --fix
    } finally {
        Pop-Location
    }
    
    # Frontend formatting  
    Write-ColoredText "Formatting frontend..." "Yellow"
    Push-Location $Global:LokifiConfig.FrontendDir
    try {
        npm run lint -- --fix 2>$null
    } finally {
        Pop-Location
    }
    
    Write-ColoredText "✅ Code formatted!" "Green"
}

function Clean-DevelopmentCache {
    Write-ColoredText "🧹 Cleaning cache files..." "Cyan"
    
    # Backend cleanup
    Get-ChildItem -Path "backend" -Recurse -Name "__pycache__" -ErrorAction SilentlyContinue | ForEach-Object { 
        Remove-Item "backend\$_" -Recurse -Force -ErrorAction SilentlyContinue 
    }
    Get-ChildItem -Path "backend" -Recurse -Name "*.pyc" -ErrorAction SilentlyContinue | ForEach-Object { 
        Remove-Item "backend\$_" -Force -ErrorAction SilentlyContinue 
    }
    
    # Frontend cleanup
    if (Test-Path "frontend\.next") { Remove-Item "frontend\.next" -Recurse -Force -ErrorAction SilentlyContinue }
    if (Test-Path "frontend\node_modules\.cache") { Remove-Item "frontend\node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue }
    
    Write-ColoredText "✅ Cache cleaned!" "Green"
}

function Upgrade-DevelopmentDependencies {
    Write-ColoredText "⬆️ Upgrading all dependencies..." "Cyan"
    
    # Backend upgrade
    Write-ColoredText "Upgrading backend dependencies..." "Yellow"
    Push-Location $Global:LokifiConfig.BackendDir
    try {
        & .\venv\Scripts\pip.exe install --upgrade -r requirements.txt
    } finally {
        Pop-Location
    }
    
    # Frontend upgrade
    Write-ColoredText "Upgrading frontend dependencies..." "Yellow"
    Push-Location $Global:LokifiConfig.FrontendDir
    try {
        npm update
        npm audit fix --force 2>$null
    } finally {
        Pop-Location
    }
    
    Write-ColoredText "✅ All dependencies upgraded!" "Green"
}

# ============================================
# PRE-COMMIT VALIDATION (FROM pre-commit-checks.ps1)
# ============================================
function Invoke-PreCommitValidation {
    Write-LokifiHeader "Pre-Commit Validation"
    
    $allPassed = $true
    
    # Check 1: TypeScript Type Check (unless skipped)
    if (-not $SkipTypeCheck -and -not $Quick) {
        Write-Host "📘 TypeScript Type Check..." -ForegroundColor Yellow
        Push-Location $Global:LokifiConfig.FrontendDir
        try {
            $result = npm run typecheck 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ TypeScript check passed" -ForegroundColor Green
            } else {
                Write-Host "  ❌ TypeScript errors found" -ForegroundColor Red
                Write-Host $result | Out-String
                $allPassed = $false
            }
        } catch {
            Write-Host "  ⚠️  TypeScript check failed to run" -ForegroundColor Yellow
            $allPassed = $false
        } finally {
            Pop-Location
        }
        Write-Host ""
    }
    
    # Check 2: Lint Staged Files (always)
    Write-Host "🧹 Linting Staged Files..." -ForegroundColor Yellow
    Push-Location $Global:LokifiConfig.FrontendDir
    try {
        $result = npx lint-staged 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Linting passed" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Linting errors found" -ForegroundColor Red
            $allPassed = $false
        }
    } catch {
        Write-Host "  ⚠️  Linting failed to run" -ForegroundColor Yellow
    } finally {
        Pop-Location
    }
    Write-Host ""
    
    # Check 3: Security Scan for Sensitive Data (always)
    Write-Host "🔒 Security Scan..." -ForegroundColor Yellow
    $stagedFiles = git diff --cached --name-only 2>$null
    $securityIssues = @()
    
    if ($stagedFiles) {
        foreach ($file in $stagedFiles) {
            if (Test-Path $file) {
                $content = Get-Content $file -Raw -ErrorAction SilentlyContinue
                if ($content) {
                    # Check for common secrets
                    if ($content -match '(?i)(api[_-]?key|secret[_-]?key|password|token|auth[_-]?token)\s*[:=]\s*[''"]?[a-zA-Z0-9_\-]{20,}') {
                        $securityIssues += "  ⚠️  Potential secret in: $file"
                    }
                    # Check for hardcoded IPs
                    if ($content -match '\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}' -and $file -notmatch '\.md$') {
                        $securityIssues += "  ⚠️  Hardcoded IP in: $file"
                    }
                }
            }
        }
    }
    
    if ($securityIssues.Count -gt 0) {
        Write-Host "  ❌ Security issues detected:" -ForegroundColor Red
        $securityIssues | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
        $allPassed = $false
    } else {
        Write-Host "  ✅ No security issues detected" -ForegroundColor Green
    }
    Write-Host ""
    
    # Check 4: TODO Tracking (informational only)
    if (-not $Quick) {
        Write-Host "📝 TODO Tracking..." -ForegroundColor Yellow
        $todoCount = 0
        if ($stagedFiles) {
            foreach ($file in $stagedFiles) {
                if (Test-Path $file -and $file -match '\.(ts|tsx|py|js|jsx)$') {
                    $todos = Select-String -Path $file -Pattern "TODO|FIXME|XXX|HACK" -ErrorAction SilentlyContinue
                    if ($todos) {
                        $todoCount += $todos.Count
                    }
                }
            }
        }
        
        if ($todoCount -gt 0) {
            Write-Host "  📋 Found $todoCount TODO comments in staged files" -ForegroundColor Yellow
            Write-Host "  💡 Consider addressing before commit or adding to backlog" -ForegroundColor Gray
        } else {
            Write-Host "  ✅ No TODO comments in staged files" -ForegroundColor Green
        }
        Write-Host ""
    }
    
    # Check 5: Quick Analysis (if not skipped)
    if (-not $SkipAnalysis -and -not $Quick) {
        Write-Host "📊 Quick Code Analysis..." -ForegroundColor Yellow
        
        # Check for console.log in staged TypeScript files
        $consoleLogFiles = @()
        if ($stagedFiles) {
            foreach ($file in $stagedFiles) {
                if ($file -match '\.tsx?$' -and $file -notmatch 'logger\.ts' -and (Test-Path $file)) {
                    $hasConsoleLog = Select-String -Path $file -Pattern 'console\.(log|debug|info|warn|error)' -Quiet
                    if ($hasConsoleLog) {
                        $consoleLogFiles += $file
                    }
                }
            }
        }
        
        if ($consoleLogFiles.Count -gt 0) {
            Write-Host "  ⚠️  console.log found in:" -ForegroundColor Yellow
            $consoleLogFiles | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
            Write-Host "  💡 Consider using logger utility instead" -ForegroundColor Gray
        } else {
            Write-Host "  ✅ No console.log statements" -ForegroundColor Green
        }
        Write-Host ""
    }
    
    # Summary
    Write-Host "=" * 50 -ForegroundColor Gray
    if ($allPassed) {
        Write-Host "✅ All validation checks passed! Ready to commit." -ForegroundColor Green
        Write-Host ""
        return $true
    } else {
        Write-Host "❌ Some validation checks failed. Please fix issues before committing." -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 To skip checks (not recommended):" -ForegroundColor Yellow
        Write-Host "   git commit --no-verify" -ForegroundColor Gray
        Write-Host ""
        return $false
    }
}

# ============================================
# INTERACTIVE LAUNCHER (FROM launch.ps1)
# ============================================
function Show-InteractiveLauncher {
    function Show-Banner {
        Clear-Host
        Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
        Write-Host "║          🚀 LOKIFI ULTIMATE LAUNCHER         ║" -ForegroundColor Cyan  
        Write-Host "║        Complete Development Control          ║" -ForegroundColor Cyan
        Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
        Write-Host ""
    }
    
    function Show-LauncherMenu {
        Show-Banner
        Write-Host "Choose an option:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host " 1. 🔧 Start Backend (FastAPI)" -ForegroundColor Green
        Write-Host " 2. 🌐 Start Frontend (Next.js)" -ForegroundColor Green  
        Write-Host " 3. 🚀 Start Both Servers" -ForegroundColor Green
        Write-Host " 4. 🧪 Run Tests" -ForegroundColor Blue
        Write-Host " 5. 📊 System Status" -ForegroundColor Blue
        Write-Host " 6. 🔍 Pre-Commit Validation" -ForegroundColor Blue
        Write-Host " 7. 🎨 Format Code" -ForegroundColor Yellow
        Write-Host " 8. 🧹 Clean Cache" -ForegroundColor Yellow
        Write-Host " 9. 📦 Setup Environment" -ForegroundColor Magenta
        Write-Host "10. ⬆️  Upgrade Dependencies" -ForegroundColor Magenta
        Write-Host "11. 🗂️  Organize Documents" -ForegroundColor Blue
        Write-Host "12. ❓ Help & Commands" -ForegroundColor Magenta
        Write-Host "13. 🚪 Exit" -ForegroundColor Red
        Write-Host ""
        
        do {
            $choice = Read-Host "Enter your choice (1-13)"
            switch ($choice) {
                "1" { Start-BackendServer; break }
                "2" { Start-FrontendServer; break } 
                "3" { Start-DevelopmentWorkflow "both"; break }
                "4" { Run-DevelopmentTests; break }
                "5" { Get-ServiceStatus; break }
                "6" { Invoke-PreCommitValidation; break }
                "7" { Format-DevelopmentCode; break }
                "8" { Clean-DevelopmentCache; break }
                "9" { Setup-DevelopmentEnvironment; break }
                "10" { Upgrade-DevelopmentDependencies; break }
                "11" { 
                    Invoke-UltimateDocumentOrganization "status"
                    break 
                }
                "12" { Show-EnhancedHelp; break }
                "13" { Write-Host "Goodbye! 👋" -ForegroundColor Green; exit }
                default { Write-Host "Invalid choice. Please enter 1-13." -ForegroundColor Red }
            }
            
            if ($choice -ne "13") {
                Read-Host "`nPress Enter to return to menu"
                Show-LauncherMenu
            }
        } while ($true)
    }
    
    Show-LauncherMenu
}

# ============================================
# API TESTING (FROM ORIGINAL)
# ============================================
function Test-LokifiAPI {
    Write-Step "🧪" "Testing Lokifi Backend API..."
    
    $baseUrl = $Global:LokifiConfig.API.BackendUrl
    $tests = @()
    
    # Test 1: Health Check
    Write-Step "1️⃣" "Testing Health Endpoint..."
    try {
        $health = Invoke-WebRequest -Uri "$baseUrl/health" -TimeoutSec 10 -ErrorAction Stop
        if ($health.StatusCode -eq 200) {
            Write-Success "Health check passed"
            $tests += @{ Name = "Health Check"; Status = "PASS"; Details = "Status 200" }
        }
    } catch {
        Write-Error "Health check failed: $_"
        $tests += @{ Name = "Health Check"; Status = "FAIL"; Details = $_.Exception.Message }
        Write-Warning "Make sure backend is running: .\lokifi-manager-enhanced.ps1 dev be"
        return $tests
    }
    
    # Test 2: Crypto Discovery
    Write-Step "2️⃣" "Testing Crypto Discovery..."
    try {
        $cryptos = Invoke-RestMethod -Uri "$baseUrl/api/v1/prices/crypto/top?limit=5" -TimeoutSec 10 -ErrorAction Stop
        if ($cryptos.success) {
            Write-Success "Got $($cryptos.count) cryptocurrencies"
            Write-Info "Top 3:"
            $cryptos.cryptos | Select-Object -First 3 | ForEach-Object {
                Write-Host "      $($_.symbol): $($_.name) - `$$($_.current_price)" -ForegroundColor White
            }
            $tests += @{ Name = "Crypto Discovery"; Status = "PASS"; Details = "$($cryptos.count) cryptos" }
        }
    } catch {
        Write-Error "Crypto discovery failed: $_"
        $tests += @{ Name = "Crypto Discovery"; Status = "FAIL"; Details = $_.Exception.Message }
    }
    
    # Test 3: Batch Price
    Write-Step "3️⃣" "Testing Batch Price API..."
    try {
        $body = @{ symbols = @("BTC", "ETH", "SOL") } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/prices/batch" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10 -ErrorAction Stop
        
        if ($response.success) {
            Write-Success "Batch request successful"
            Write-Info "Prices retrieved:"
            $response.data.PSObject.Properties | ForEach-Object {
                Write-Host "      $($_.Name): `$$($_.Value.price) from $($_.Value.source)" -ForegroundColor White
            }
            $tests += @{ Name = "Batch Price"; Status = "PASS"; Details = "$($response.data.PSObject.Properties.Count) prices" }
        }
    } catch {
        Write-Warning "Batch price test skipped (endpoint may not be available)"
        $tests += @{ Name = "Batch Price"; Status = "SKIP"; Details = "Endpoint unavailable" }
    }
    
    # Test 4: Frontend Connection
    Write-Step "4️⃣" "Testing Frontend Connection..."
    if (Test-ServiceRunning -Url $Global:LokifiConfig.API.FrontendUrl) {
        Write-Success "Frontend is running and accessible"
        $tests += @{ Name = "Frontend"; Status = "PASS"; Details = "Accessible on port 3000" }
    } else {
        Write-Warning "Frontend not accessible"
        $tests += @{ Name = "Frontend"; Status = "FAIL"; Details = "Not accessible on port 3000" }
    }
    
    # Summary
    Write-Host ""
    Write-Step "📊" "Test Summary:"
    $passCount = ($tests | Where-Object { $_.Status -eq "PASS" }).Count
    $failCount = ($tests | Where-Object { $_.Status -eq "FAIL" }).Count
    $skipCount = ($tests | Where-Object { $_.Status -eq "SKIP" }).Count
    
    Write-Host "   ✅ Passed: $passCount" -ForegroundColor Green
    Write-Host "   ❌ Failed: $failCount" -ForegroundColor Red
    Write-Host "   ⏭️  Skipped: $skipCount" -ForegroundColor Yellow
    
    return $tests
}

# ============================================
# ULTIMATE DOCUMENT ORGANIZATION (INTEGRATED)
# ============================================
function Invoke-RepositoryOrganization {
    Write-Step "🗂️" "Organizing Repository Files..."
    
    $moveCount = 0
    $projectRoot = $Global:LokifiConfig.ProjectRoot
    
    # Define file movements (key organizational improvements)
    $moves = @{
        # Move scattered markdown files to organized structure
        "OPTIMIZATION_SESSION_*.md" = "docs\optimization-reports\"
        "*_GUIDE.md" = "docs\guides\"
        "*_SETUP.md" = "docs\guides\"
        "API_*.md" = "docs\api\"
        "DATABASE_*.md" = "docs\database\"
        "DEPLOYMENT_*.md" = "docs\deployment\"
    }
    
    foreach ($pattern in $moves.Keys) {
        $targetDir = $moves[$pattern]
        $fullTargetDir = Join-Path $projectRoot $targetDir
        
        # Create target directory if it doesn't exist
        if (-not (Test-Path $fullTargetDir)) {
            New-Item -ItemType Directory -Path $fullTargetDir -Force | Out-Null
        }
        
        # Find and move matching files
        $matchingFiles = Get-ChildItem -Path $projectRoot -Filter $pattern -File -ErrorAction SilentlyContinue
        foreach ($file in $matchingFiles) {
            $targetPath = Join-Path $fullTargetDir $file.Name
            if (-not (Test-Path $targetPath)) {
                Move-Item -Path $file.FullName -Destination $targetPath
                Write-Info "Moved: $($file.Name) → $targetDir"
                $moveCount++
            }
        }
    }
    
    if ($moveCount -gt 0) {
        Write-Success "Organized $moveCount files into proper directories"
    } else {
        Write-Info "Repository already organized"
    }
    
    return $moveCount
}

function Invoke-UltimateDocumentOrganization {
    param([string]$OrgMode = "status")
    
    # Enhanced organization rules from ultimate-doc-organizer
    $organizationRules = @{
        # Status and completion documents
        "PROJECT_STATUS*.md" = "docs\project-management\"
        "*STATUS*.md" = "docs\project-management\"
        "*COMPLETE*.md" = "docs\reports\"
        "*SUCCESS*.md" = "docs\reports\"
        "*REPORT*.md" = "docs\reports\"
        
        # Development and implementation
        "*SETUP*.md" = "docs\guides\"
        "*GUIDE*.md" = "docs\guides\"
        "*IMPLEMENTATION*.md" = "docs\implementation\"
        "*DEVELOPMENT*.md" = "docs\development\"
        
        # Technical documentation
        "API_*.md" = "docs\api\"
        "DATABASE_*.md" = "docs\database\"
        "DEPLOYMENT_*.md" = "docs\deployment\"
        "ARCHITECTURE*.md" = "docs\design\"
        
        # Process and workflow
        "*FIX*.md" = "docs\fixes\"
        "*ERROR*.md" = "docs\fixes\"
        "*OPTIMIZATION*.md" = "docs\optimization-reports\"
        "*SESSION*.md" = "docs\optimization-reports\"
        
        # Planning and analysis
        "*ANALYSIS*.md" = "docs\analysis\"
        "*PLAN*.md" = "docs\plans\" 
        "*STRATEGY*.md" = "docs\plans\"
        
        # Security and audit
        "*SECURITY*.md" = "docs\security\"
        "*AUDIT*.md" = "docs\audit-reports\"
        "*VULNERABILITY*.md" = "docs\security\"
        
        # Testing and validation
        "*TEST*.md" = "docs\testing\"
        "*VALIDATION*.md" = "docs\testing\"
        "*QA*.md" = "docs\testing\"
    }
    
    $protectedFiles = @("README.md", "START_HERE.md", "PROJECT_STATUS_CONSOLIDATED.md")
    
    if ($OrgMode -eq "status") {
        # Show document status
        Write-Step "📁" "Root Directory Analysis"
        $rootMdFiles = Get-ChildItem -Path "." -Filter "*.md" -File
        Write-Host "   📄 Markdown files in root: $($rootMdFiles.Count)" -ForegroundColor Blue
        
        if ($rootMdFiles.Count -gt 0) {
            Write-Host "   📋 Files by category:" -ForegroundColor Blue
            $rootMdFiles | Group-Object { 
                if ($_.Name -like "*STATUS*") { "Status" }
                elseif ($_.Name -like "*COMPLETE*" -or $_.Name -like "*SUCCESS*") { "Completion" }
                elseif ($_.Name -like "*GUIDE*" -or $_.Name -like "*SETUP*") { "Guide" }
                elseif ($_.Name -like "*REPORT*") { "Report" }
                elseif ($_.Name -like "START_HERE*" -or $_.Name -like "README*") { "Navigation" }
                else { "Other" }
            } | ForEach-Object {
                Write-Host "      $($_.Name): $($_.Count) files" -ForegroundColor Gray
            }
        }
        
        Write-Host ""
        Write-Step "📁" "Docs Directory Analysis"
        if (Test-Path "docs") {
            $docsDirs = Get-ChildItem -Path "docs" -Directory
            Write-Host "   📂 Total categories: $($docsDirs.Count)" -ForegroundColor Blue
            
            $totalFiles = 0
            $docsDirs | ForEach-Object {
                $fileCount = (Get-ChildItem $_.FullName -File -Recurse).Count
                $totalFiles += $fileCount
                Write-Host "      $($_.Name): $fileCount files" -ForegroundColor Gray
            }
            
            Write-Host "   📄 Total organized files: $totalFiles" -ForegroundColor Blue
            
            if (Test-Path "docs\archive") {
                $archiveFiles = (Get-ChildItem "docs\archive" -File -Recurse).Count
                Write-Host "   📦 Archived files: $archiveFiles" -ForegroundColor Blue
            }
        }
        
        Write-Host ""
        Write-Step "💡" "Recommendations"
        if ($rootMdFiles.Count -gt 5) {
            Write-Host "   📋 Consider organizing $($rootMdFiles.Count) root files" -ForegroundColor Yellow
            Write-Host "      Run: .\lokifi-manager-enhanced.ps1 docs -Component organize" -ForegroundColor Gray
        } else {
            Write-Host "   ✅ Root directory well organized" -ForegroundColor Green
        }
        
    } else {
        # Organize documents
        Write-Step "📋" "Scanning root directory for documents..."
        
        $rootFiles = Get-ChildItem -Path "." -Filter "*.md" -File | 
            Where-Object { $_.Name -notin $protectedFiles }
        
        if ($rootFiles.Count -eq 0) {
            Write-Step "✅" "No documents to organize" "Success"
            return 0
        }
        
        Write-Host "   📊 Found $($rootFiles.Count) documents to process" -ForegroundColor Blue
        Write-Host ""
        
        $organizedCount = 0
        foreach ($file in $rootFiles) {
            $fileName = $file.Name
            
            foreach ($pattern in $organizationRules.Keys) {
                if ($fileName -like $pattern) {
                    $targetDir = $organizationRules[$pattern]
                    $fullTargetDir = Join-Path $Global:LokifiConfig.ProjectRoot $targetDir
                    $targetPath = Join-Path $fullTargetDir $fileName
                    
                    if (Test-Path $targetPath) {
                        Write-Host "   ⏭️  Skipping: $fileName (already exists in $targetDir)" -ForegroundColor Gray
                        break
                    }
                    
                    # Create directory if needed
                    if (-not (Test-Path $fullTargetDir)) {
                        New-Item -ItemType Directory -Path $fullTargetDir -Force | Out-Null
                    }
                    
                    # Move file
                    Move-Item -Path $file.FullName -Destination $targetPath -Force
                    Write-Host "   ✅ Organized: $fileName → $targetDir" -ForegroundColor Green
                    $organizedCount++
                    break
                }
            }
        }
        
        Write-Host ""
        Write-Step "📊" "Organization completed: $organizedCount files moved"
        return $organizedCount
    }
}

# ============================================
# SERVICE STATUS (FROM ORIGINAL + ENHANCED)
# ============================================
function Get-ServiceStatus {
    Write-Step "📊" "Checking Service Status..."
    
    $status = @{
        Docker = Test-DockerAvailable
        DockerCompose = @{
            Available = $false
            Services = @()
        }
        Redis = $false
        PostgreSQL = $false
        BackendContainer = $false
        FrontendContainer = $false
        Backend = Test-ServiceRunning -Url "$($Global:LokifiConfig.API.BackendUrl)/health"
        Frontend = Test-ServiceRunning -Url $Global:LokifiConfig.API.FrontendUrl
    }
    
    # Check Docker Compose status first (RECOMMENDED APPROACH)
    if ($status.Docker -and (Test-Path "docker-compose.yml")) {
        $status.DockerCompose = Get-DockerComposeStatus
    }
    
    if ($status.Docker) {
        # Check individual containers (for fallback/legacy mode)
        $redisRunning = docker ps --filter "name=$($Global:LokifiConfig.Redis.ContainerName)" --format "{{.Names}}" 2>$null
        $status.Redis = $redisRunning -eq $Global:LokifiConfig.Redis.ContainerName
        
        $pgRunning = docker ps --filter "name=$($Global:LokifiConfig.PostgreSQL.ContainerName)" --format "{{.Names}}" 2>$null
        $status.PostgreSQL = $pgRunning -eq $Global:LokifiConfig.PostgreSQL.ContainerName
        
        $backendRunning = docker ps --filter "name=$($Global:LokifiConfig.Backend.ContainerName)" --format "{{.Names}}" 2>$null
        $status.BackendContainer = $backendRunning -eq $Global:LokifiConfig.Backend.ContainerName
        
        $frontendRunning = docker ps --filter "name=$($Global:LokifiConfig.Frontend.ContainerName)" --format "{{.Names}}" 2>$null
        $status.FrontendContainer = $frontendRunning -eq $Global:LokifiConfig.Frontend.ContainerName
        
        # Also check for Docker Compose containers
        $composeRedis = docker ps --filter "name=lokifi-redis-dev" --format "{{.Names}}" 2>$null
        $composePostgres = docker ps --filter "name=lokifi-postgres-dev" --format "{{.Names}}" 2>$null
        $composeBackend = docker ps --filter "name=lokifi-backend-dev" --format "{{.Names}}" 2>$null
        $composeFrontend = docker ps --filter "name=lokifi-frontend-dev" --format "{{.Names}}" 2>$null
        
        # Update status if Docker Compose containers are running
        if ($composeRedis) { $status.Redis = $true }
        if ($composePostgres) { $status.PostgreSQL = $true }
        if ($composeBackend) { $status.BackendContainer = $true }
        if ($composeFrontend) { $status.FrontendContainer = $true }
    }
    
    # Display status
    Write-Host ""
    Write-Host "🐳 Docker:      " -NoNewline
    if ($status.Docker) { Write-Host "✅ Running" -ForegroundColor Green } else { Write-Host "❌ Not Available" -ForegroundColor Red }
    
    Write-Host ""
    Write-Host "� CONTAINERS:" -ForegroundColor Cyan
    Write-Host "�🔴 Redis:       " -NoNewline
    if ($status.Redis) { Write-Host "✅ Running (Container)" -ForegroundColor Green } else { Write-Host "❌ Stopped" -ForegroundColor Red }
    
    Write-Host "🐘 PostgreSQL:  " -NoNewline
    if ($status.PostgreSQL) { Write-Host "✅ Running (Container)" -ForegroundColor Green } else { Write-Host "❌ Stopped" -ForegroundColor Red }
    
    Write-Host "🔧 Backend:     " -NoNewline
    if ($status.BackendContainer) { 
        Write-Host "✅ Running (Container)" -ForegroundColor Green 
    } elseif ($status.Backend) { 
        Write-Host "✅ Running (Local)" -ForegroundColor Yellow 
    } else { 
        Write-Host "❌ Stopped" -ForegroundColor Red 
    }
    
    Write-Host "🎨 Frontend:    " -NoNewline
    if ($status.FrontendContainer) { 
        Write-Host "✅ Running (Container)" -ForegroundColor Green 
    } elseif ($status.Frontend) { 
        Write-Host "✅ Running (Local)" -ForegroundColor Yellow 
    } else { 
        Write-Host "❌ Stopped" -ForegroundColor Red 
    }
    
    return $status
}

# ============================================
# CLEANUP OPERATIONS (FROM ORIGINAL + ENHANCED)
# ============================================
function Invoke-CleanupOperation {
    Write-Step "🧹" "Cleaning Development Files..."
    
    $cleanedItems = 0
    $projectRoot = $Global:LokifiConfig.ProjectRoot
    
    # Clean common development artifacts
    $cleanupPaths = @(
        "node_modules\.cache",
        ".next\cache",
        "backend\__pycache__",
        "backend\.pytest_cache",
        "logs\*.log",
        "*.tmp",
        "*.temp",
        "frontend\.next",
        "backend\**\__pycache__"
    )
    
    foreach ($path in $cleanupPaths) {
        $fullPath = Join-Path $projectRoot $path
        if (Test-Path $fullPath) {
            if ($Mode -eq "force" -or $Force -or (Read-Host "Clean $path? (y/N)") -eq "y") {
                Remove-Item -Path $fullPath -Recurse -Force -ErrorAction SilentlyContinue
                Write-Info "Cleaned: $path"
                $cleanedItems++
            }
        }
    }
    
    Write-Success "Cleaned $cleanedItems items"
    return $cleanedItems
}

# ============================================
# MAIN ACTIONS
# ============================================
function Start-AllServers {
    Write-LokifiHeader "Starting All Servers (Docker Compose Stack)"
    
    $success = $true
    $isFullLaunch = ($Component -eq "all")
    
    # For full launch, try Docker Compose first (RECOMMENDED APPROACH)
    if ($isFullLaunch) {
        Write-Step "🐳" "Attempting Docker Compose stack startup (RECOMMENDED)..."
        
        if (Start-DockerComposeStack) {
            Write-Host ""
            Write-Success "🚀 Complete Docker Compose stack launched successfully!"
            Write-Info "All services running in optimized containers:"
            Write-Info "  🔴 Redis: redis://:23233@localhost:6379/0"
            Write-Info "  🐘 PostgreSQL: postgresql://lokifi:lokifi_dev_password@localhost:5432/lokifi_db"
            Write-Info "  🔧 Backend API: http://localhost:8000"
            Write-Info "  🎨 Frontend App: http://localhost:3000"
            Write-Host ""
            Write-Info "💡 Docker Compose provides the best development experience!"
            Write-Info "💡 Use '.\lokifi-manager-enhanced.ps1 stop' to stop all services"
            Write-Info "💡 Use 'docker-compose logs -f' to view all service logs"
            return
        } else {
            Write-Warning "Docker Compose failed, falling back to individual container management..."
            Write-Host ""
        }
    }
    
    # Fallback to individual container management for component-specific or Docker Compose failure
    Write-Info "Using individual container management (fallback mode)..."
    Write-Host ""
    
    # Start Redis - always when doing full launch or when specifically requested
    if ($isFullLaunch -or $Component -eq "redis") {
        Write-Step "🔴" "Starting Redis Server..."
        if (Test-DockerAvailable) {
            $success = (Start-RedisContainer) -and $success
        } else {
            Write-Warning "Redis requires Docker - Install Docker Desktop to enable Redis"
        }
        Write-Host ""
    }
    
    # Start PostgreSQL - always when doing full launch or when specifically requested  
    if ($isFullLaunch -or $Component -eq "postgres") {
        Write-Step "🐘" "Starting PostgreSQL Server..."
        if (Test-DockerAvailable) {
            Start-PostgreSQLContainer | Out-Null
            Write-Success "PostgreSQL setup initiated"
        } else {
            Write-Warning "PostgreSQL requires Docker - Install Docker Desktop to enable database"
        }
        Write-Host ""
    }
    
    # Start Backend
    if ($isFullLaunch -or $Component -eq "backend" -or $Component -eq "be") {
        Write-Step "🔧" "Starting Backend Server..."
        if ($Mode -eq "auto") {
            # Start backend in background for auto mode
            Start-Job -ScriptBlock { 
                param($BackendDir)
                Set-Location $BackendDir
                if (Test-Path "venv/Scripts/Activate.ps1") {
                    & "./venv/Scripts/Activate.ps1"
                    $env:PYTHONPATH = (Get-Location).Path
                    python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
                }
            } -ArgumentList $Global:LokifiConfig.BackendDir | Out-Null
            Write-Success "Backend server starting in background on http://localhost:8000"
        } else {
            Write-Info "Backend will start in foreground. Use Ctrl+C to stop."
            Write-Info "For background mode, use: -Mode auto"
            Read-Host "Press Enter to start backend"
            Start-BackendServer
        }
        Write-Host ""
    }
    
    # Start Frontend
    if ($isFullLaunch -or $Component -eq "frontend" -or $Component -eq "fe") {
        Write-Step "🎨" "Starting Frontend Server..."
        if ($Mode -eq "auto") {
            # Start frontend in new PowerShell window for auto mode
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$($Global:LokifiConfig.ProjectRoot)'; Push-Location frontend; npm run dev"
            Write-Success "Frontend server starting in new window on http://localhost:3000"
        } else {
            Write-Info "Frontend will be started in a new window"
            Write-Info "For current window mode, use: .\lokifi-manager-enhanced.ps1 -Action dev -Component fe"
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$($Global:LokifiConfig.ProjectRoot)'; Push-Location frontend; npm run dev"
            Write-Success "Frontend server starting in new window"
        }
        Write-Host ""
    }
    
    Write-Host ""
    Write-Success "🚀 All Lokifi servers have been launched!"
    Write-Info "Services available at:"
    Write-Info "  🔴 Redis: redis://:23233@localhost:6379/0"
    Write-Info "  🐘 PostgreSQL: postgresql://lokifi:lokifi2025@localhost:5432/lokifi"  
    Write-Info "  🔧 Backend API: http://localhost:8000"
    Write-Info "  🎨 Frontend App: http://localhost:3000"
    Write-Host ""
    if (Test-DockerAvailable) {
        Write-Info "🐳 Running in Docker containers where possible (with local fallback)"
    } else {
        Write-Info "💻 Running locally (Docker not available)"
    }
    Write-Info "💡 Use 'servers -Mode auto' for fully automated background startup"
    Write-Info "💡 Use '.\lokifi-manager-enhanced.ps1 stop' to stop all services"
    Write-Info "💡 Use '.\lokifi-manager-enhanced.ps1 status' to see container vs local status"
}

function Stop-AllServices {
    Write-LokifiHeader "Stopping All Services"
    
    # Try Docker Compose first (RECOMMENDED)
    if (Test-Path "docker-compose.yml" -and (Test-DockerAvailable)) {
        Write-Step "🐳" "Stopping Docker Compose stack..."
        Stop-DockerComposeStack
        Write-Host ""
    }
    
    # Stop individual Docker containers (fallback/cleanup)
    Write-Step "🧹" "Cleaning up individual containers..."
    Stop-RedisContainer
    Stop-PostgreSQLContainer
    Stop-BackendContainer
    Stop-FrontendContainer
    
    # Stop any running local processes
    Write-Step "💻" "Stopping local processes..."
    # Stop any running Node.js processes (Frontend)
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq "node" }
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Info "Stopped local Node.js processes"
    }
    
    # Stop any running Python processes (Backend)
    $pythonProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*uvicorn*" }
    if ($pythonProcesses) {
        $pythonProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Info "Stopped local Python processes"
    }
    
    Write-Host ""
    Write-Success "All services stopped (Docker Compose + containers + local processes)"
}

# ============================================
# QUICK ANALYSIS & FIXES (NEW)
# ============================================
function Invoke-QuickAnalysis {
    Write-Step "🔍" "Running Quick Health Check..."
    
    $analysisResults = @{
        TypeScriptErrors = 0
        ConsoleLogs = 0  
        OutdatedPackages = 0
        DockerStatus = "Unknown"
        ServicesRunning = 0
    }
    
    try {
        # Check TypeScript errors (frontend)
        if (Test-Path "frontend/tsconfig.json") {
            Write-Step "   📝" "Checking TypeScript errors..."
            $tsCheck = Start-Process -FilePath "npx" -ArgumentList @("tsc", "--noEmit", "--project", "frontend/tsconfig.json") -Wait -PassThru -WindowStyle Hidden -RedirectStandardError "ts-errors.tmp" -RedirectStandardOutput "ts-output.tmp"
            if (Test-Path "ts-errors.tmp") {
                $tsErrors = Get-Content "ts-errors.tmp" -ErrorAction SilentlyContinue
                $analysisResults.TypeScriptErrors = ($tsErrors | Where-Object { $_ -match "error TS" }).Count
                Remove-Item "ts-errors.tmp", "ts-output.tmp" -ErrorAction SilentlyContinue
            }
        }
        
        # Check console.log usage
        Write-Step "   🖥️" "Checking console.log usage..."
        $consoleUsage = Get-ChildItem -Path "frontend" -Recurse -Include "*.ts","*.tsx","*.js","*.jsx" -ErrorAction SilentlyContinue | 
                       Select-String "console\." -ErrorAction SilentlyContinue
        $analysisResults.ConsoleLogs = ($consoleUsage | Measure-Object).Count
        
        # Check Docker status
        Write-Step "   🐳" "Checking Docker status..."
        $analysisResults.DockerStatus = if (Test-DockerAvailable) { "Available" } else { "Not Available" }
        
        # Check running services
        Write-Step "   🚀" "Checking running services..."
        if (Test-DockerAvailable -and (Test-Path "docker-compose.yml")) {
            $composeStatus = docker-compose ps --format json 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
            $analysisResults.ServicesRunning = ($composeStatus | Where-Object { $_.State -eq "running" }).Count
        }
        
        # Check outdated npm packages
        Write-Step "   📦" "Checking outdated packages..."
        if (Test-Path "frontend/package.json") {
            $outdatedCheck = Start-Process -FilePath "npm" -ArgumentList @("outdated", "--json") -WorkingDirectory "frontend" -Wait -PassThru -WindowStyle Hidden -RedirectStandardOutput "outdated.tmp" -RedirectStandardError $null
            if (Test-Path "outdated.tmp") {
                $outdatedContent = Get-Content "outdated.tmp" -Raw -ErrorAction SilentlyContinue
                if ($outdatedContent -and $outdatedContent.Trim() -ne "") {
                    try {
                        $outdated = $outdatedContent | ConvertFrom-Json -ErrorAction SilentlyContinue
                        $analysisResults.OutdatedPackages = ($outdated.PSObject.Properties).Count
                    } catch {
                        $analysisResults.OutdatedPackages = 0
                    }
                }
                Remove-Item "outdated.tmp" -ErrorAction SilentlyContinue
            }
        }
        
    } catch {
        Write-Warning "Analysis encountered some issues: $($_.Message)"
    }
    
    # Display results
    Write-Host ""
    Write-Host "📊 Analysis Results:" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "   TypeScript errors: $($analysisResults.TypeScriptErrors)" -ForegroundColor $(if($analysisResults.TypeScriptErrors -gt 0){'Red'}else{'Green'})
    Write-Host "   Console.log usage: $($analysisResults.ConsoleLogs)" -ForegroundColor $(if($analysisResults.ConsoleLogs -gt 10){'Yellow'}else{'Green'})
    Write-Host "   Outdated packages: $($analysisResults.OutdatedPackages)" -ForegroundColor $(if($analysisResults.OutdatedPackages -gt 0){'Yellow'}else{'Green'})
    Write-Host "   Docker status: $($analysisResults.DockerStatus)" -ForegroundColor $(if($analysisResults.DockerStatus -eq 'Available'){'Green'}else{'Yellow'})
    Write-Host "   Services running: $($analysisResults.ServicesRunning)" -ForegroundColor $(if($analysisResults.ServicesRunning -ge 3){'Green'}else{'Yellow'})
    
    Write-Host ""
    if ($analysisResults.TypeScriptErrors -gt 0 -or $analysisResults.ConsoleLogs -gt 10) {
        Write-Host "💡 Recommendations:" -ForegroundColor Yellow
        if ($analysisResults.TypeScriptErrors -gt 0) {
            Write-Host "   - Run: .\lokifi-manager-enhanced.ps1 fix ts" -ForegroundColor Gray
        }
        if ($analysisResults.ConsoleLogs -gt 10) {
            Write-Host "   - Consider removing excessive console.log statements" -ForegroundColor Gray
        }
        if ($analysisResults.OutdatedPackages -gt 0) {
            Write-Host "   - Run: npm update (in frontend directory)" -ForegroundColor Gray
        }
    } else {
        Write-Success "Everything looks healthy! 🎉"
    }
}

function Invoke-QuickFix {
    param(
        [switch]$TypeScript,
        [switch]$Cleanup, 
        [switch]$All
    )
    
    if ($TypeScript -or $All) {
        Write-Step "🔧" "Fixing TypeScript issues..."
        
        if (Test-Path "scripts/fixes/universal-fixer.ps1") {
            try {
                Write-Info "Running TypeScript fixer with backup..."
                & "scripts/fixes/universal-fixer.ps1" -Target Any -Backup -Scope "frontend"
                Write-Success "TypeScript fixes completed"
            } catch {
                Write-Warning "TypeScript fixer encountered issues: $($_.Message)"
                Write-Info "You can run the fixer manually: .\scripts\fixes\universal-fixer.ps1 -Target Any"
            }
        } else {
            Write-Warning "Universal fixer not found. Attempting basic TypeScript fixes..."
            
            # Basic TypeScript fix - replace common 'any' types
            $tsFiles = Get-ChildItem -Path "frontend" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue
            $fixCount = 0
            
            foreach ($file in $tsFiles) {
                try {
                    $content = Get-Content $file.FullName -Raw
                    $originalContent = $content
                    
                    # Simple fixes for common patterns
                    $content = $content -replace ': any\[\]', ': unknown[]'
                    $content = $content -replace ': any\s*=', ': unknown ='
                    $content = $content -replace '\(.*?: any\)', '(...args: unknown[])'
                    
                    if ($content -ne $originalContent) {
                        Set-Content -Path $file.FullName -Value $content -NoNewline
                        $fixCount++
                    }
                } catch {
                    Write-Warning "Could not fix file: $($file.Name)"
                }
            }
            
            Write-Info "Applied basic TypeScript fixes to $fixCount files"
        }
    }
    
    if ($Cleanup -or $All) {
        Write-Step "🧹" "Running cleanup..."
        
        if (Test-Path "scripts/cleanup/cleanup-master.ps1") {
            try {
                Write-Info "Running repository cleanup..."
                & "scripts/cleanup/cleanup-master.ps1" -Scope Cache -Force
                Write-Success "Cleanup completed"
            } catch {
                Write-Warning "Cleanup script encountered issues: $($_.Message)"
                Write-Info "You can run cleanup manually: .\scripts\cleanup\cleanup-master.ps1"
            }
        } else {
            Write-Warning "Cleanup master not found. Running basic cleanup..."
            
            # Basic cleanup operations
            $cleanupItems = @(
                "frontend/.next",
                "frontend/node_modules/.cache", 
                "backend/__pycache__",
                "backend/.pytest_cache"
            )
            
            foreach ($item in $cleanupItems) {
                if (Test-Path $item) {
                    try {
                        Remove-Item $item -Recurse -Force -ErrorAction SilentlyContinue
                        Write-Info "Cleaned: $item"
                    } catch {
                        Write-Warning "Could not clean: $item"
                    }
                }
            }
        }
    }
    
    if (-not $TypeScript -and -not $Cleanup -and -not $All) {
        Write-Info "No specific fix target specified. Use -TypeScript, -Cleanup, or -All"
        Write-Info "Example: .\lokifi-manager-enhanced.ps1 fix ts"
    }
}

# ============================================
# ENHANCED HELP SYSTEM
# ============================================
function Show-EnhancedHelp {
    Write-LokifiHeader "Ultimate Help & Usage Guide"
    
    Write-Host @"
🚀 LOKIFI ULTIMATE MANAGER - Phase 2B Enhanced

USAGE:
    .\lokifi-manager-enhanced.ps1 [ACTION] [-Mode MODE] [-Component COMPONENT] [OPTIONS]

🔥 MAIN ACTIONS:
    servers     Start ALL servers (Full Docker stack with local fallback)
    redis       Manage Redis container only  
    postgres    Setup PostgreSQL container
    test        Run comprehensive API tests
    organize    Organize repository files
    health      Full system health check
    stop        Stop all running services
    clean       Clean development artifacts
    status      Show service status

🔍 ANALYSIS & FIXES (NEW):
    analyze     Quick health check and repository analysis
    fix         Run common fixes (ts/cleanup/all)
    fix ts      Fix TypeScript issues with backup
    fix cleanup Clean repository artifacts

🚀 DEVELOPMENT ACTIONS (NEW):
    dev         Development workflow (be/fe/both)
    launch      Interactive launcher menu
    validate    Pre-commit validation checks
    format      Format all code (Python + TypeScript)
    lint        Lint code files
    setup       Setup development environment
    install     Install/update dependencies
    upgrade     Upgrade all dependencies
    docs        Ultimate document organization system

📋 MODES:
    interactive Default mode with prompts (default)
    auto        Automated mode, minimal prompts
    force       Force operations without confirmation
    verbose     Detailed output and logging
    quiet       Minimal output

🎯 COMPONENTS:
    all         All components (default)
    redis       Redis container only
    backend/be  Backend server only
    frontend/fe Frontend server only
    postgres    PostgreSQL container only
    both        Frontend + Backend

🔧 DEVELOPMENT EXAMPLES:
    .\lokifi-manager-enhanced.ps1 dev -Component be
        Start backend development server

    .\lokifi-manager-enhanced.ps1 dev -Component both
        Start both frontend and backend servers

    .\lokifi-manager-enhanced.ps1 validate -Quick
        Quick pre-commit validation

    .\lokifi-manager-enhanced.ps1 format
        Format all code (Python + TypeScript)

    .\lokifi-manager-enhanced.ps1 launch
        Open interactive development menu

    .\lokifi-manager-enhanced.ps1 docs
        Ultimate document organization system

    .\lokifi-manager-enhanced.ps1 analyze
        Run quick health check and analysis

    .\lokifi-manager-enhanced.ps1 fix
        Run all common fixes (TypeScript + cleanup)

    .\lokifi-manager-enhanced.ps1 fix ts
        Fix TypeScript issues only

    .\lokifi-manager-enhanced.ps1 fix cleanup
        Run repository cleanup only

🏗️ SERVER EXAMPLES:
    .\lokifi-manager-enhanced.ps1 servers
        Start ALL servers (Full Docker stack with intelligent local fallback)

    .\lokifi-manager-enhanced.ps1 servers -Mode auto
        Start all servers automatically (Docker containers preferred, local fallback)

    .\lokifi-manager-enhanced.ps1 -Action test -Mode verbose
        Run API tests with detailed output

    .\lokifi-manager-enhanced.ps1 -Action servers -Component backend
        Start only backend server

    .\lokifi-manager-enhanced.ps1 status
        Check status of all services

🛡️ VALIDATION OPTIONS:
    -SkipTypeCheck      Skip TypeScript type checking
    -SkipAnalysis       Skip code quality analysis
    -Quick              Quick validation (skip detailed checks)
    -Force              Force operations without prompts

📦 PHASE 2B CONSOLIDATION:
    ✓ dev.ps1 (344 lines)             → -Action dev
    ✓ pre-commit-checks.ps1 (184 lines) → -Action validate
    ✓ launch.ps1 (179 lines)          → -Action launch
    ✓ Original lokifi-manager.ps1      → Enhanced with 8 new actions

🗑️ ELIMINATED SCRIPTS (Phase 1 + 2B):
    ✓ start-servers.ps1        → -Action servers
    ✓ manage-redis.ps1         → -Action redis  
    ✓ test-api.ps1             → -Action test
    ✓ setup-postgres.ps1       → -Action postgres
    ✓ organize-repository.ps1  → -Action organize
    ✓ dev.ps1 [NEW]            → -Action dev
    ✓ pre-commit-checks.ps1 [NEW] → -Action validate
    ✓ launch.ps1 [NEW]         → -Action launch

📈 TOTAL CONSOLIDATION:
    8 individual scripts → 1 enhanced ultimate manager
    Lines consolidated: 1,400+ → Single enhanced tool
    New capabilities: 15+ actions, enterprise-grade features

For more information, visit: https://github.com/your-repo/lokifi
"@
}

# ============================================
# MAIN EXECUTION DISPATCHER
# ============================================
switch ($Action.ToLower()) {
    # Original actions
    'servers' { Start-AllServers }
    'redis' { 
        Write-LokifiHeader "Redis Management"
        Start-RedisContainer | Out-Null
    }
    'postgres' {
        Write-LokifiHeader "PostgreSQL Setup"
        Start-PostgreSQLContainer | Out-Null
    }
    'test' {
        Write-LokifiHeader "API Testing"
        Test-LokifiAPI | Out-Null
    }
    'organize' {
        Write-LokifiHeader "Repository Organization"
        Invoke-RepositoryOrganization | Out-Null
    }
    'health' {
        Write-LokifiHeader "System Health Check"
        Get-ServiceStatus | Out-Null
        Write-Host ""
        Test-LokifiAPI | Out-Null
    }
    'stop' { Stop-AllServices }
    'clean' {
        Write-LokifiHeader "Cleanup Operations"
        Invoke-CleanupOperation | Out-Null
    }
    'status' {
        Write-LokifiHeader "Service Status"
        Get-ServiceStatus | Out-Null
    }
    
    # NEW Phase 2B Development Actions
    'dev' {
        Write-LokifiHeader "Development Workflow"
        if ($DevCommand) {
            Start-DevelopmentWorkflow $DevCommand
        } elseif ($Component -eq "be" -or $Component -eq "backend") {
            Start-DevelopmentWorkflow "be"
        } elseif ($Component -eq "fe" -or $Component -eq "frontend") {
            Start-DevelopmentWorkflow "fe" 
        } else {
            Start-DevelopmentWorkflow "both"
        }
    }
    'launch' {
        Show-InteractiveLauncher
    }
    'validate' {
        Invoke-PreCommitValidation | Out-Null
    }
    'format' {  
        Write-LokifiHeader "Code Formatting"
        Format-DevelopmentCode
    }
    'lint' {
        Write-LokifiHeader "Code Linting"
        Write-Info "Running comprehensive linting..."
        Format-DevelopmentCode
    }
    'setup' {
        Write-LokifiHeader "Development Environment Setup"
        Setup-DevelopmentEnvironment
    }
    'install' {
        Write-LokifiHeader "Dependency Installation"
        Setup-DevelopmentEnvironment
    }
    'upgrade' {
        Write-LokifiHeader "Dependency Upgrade"
        Upgrade-DevelopmentDependencies
    }
    'analyze' {
        Write-LokifiHeader "Quick Analysis"
        Invoke-QuickAnalysis
    }
    'fix' {
        Write-LokifiHeader "Quick Fixes"
        if ($Component -eq "ts") {
            Invoke-QuickFix -TypeScript
        } elseif ($Component -eq "cleanup") {
            Invoke-QuickFix -Cleanup
        } else {
            Invoke-QuickFix -All
        }
    }
    'docs' {
        Write-LokifiHeader "Ultimate Document Organization"
        if ($Component -eq "organize") {
            Invoke-UltimateDocumentOrganization "organize"
        } else {
            Invoke-UltimateDocumentOrganization "status"
        }
    }
    'help' { Show-EnhancedHelp }
    default { Show-EnhancedHelp }
}

Write-Host ""
Write-Host "🎉 Lokifi Ultimate Manager Phase 2B operation completed!" -ForegroundColor Green
Write-Host "   For help: .\lokifi-manager-enhanced.ps1 help" -ForegroundColor Gray
Write-Host "   📦 Phase 2B: 8 scripts consolidated → 1 ultimate tool" -ForegroundColor Cyan
Write-Host ""