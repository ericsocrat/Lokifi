#!/bin/bash

# Lokifi Trading Platform Deployment Script
# Usage: ./deploy.sh [environment] [version]
# Environments: staging, production
# Version: optional, defaults to latest git commit

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
VERSION=${2:-$(git rev-parse --short HEAD)}
PROJECT_NAME="lokifi"
REGISTRY="ghcr.io"
COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}Error: Environment must be 'staging' or 'production'${NC}"
    exit 1
fi

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking deployment requirements..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check if docker-compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if compose file exists
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        log_error "Compose file $COMPOSE_FILE not found"
        exit 1
    fi
    
    log_success "All requirements met"
}

backup_database() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_info "Creating database backup..."
        
        # Create backup directory if it doesn't exist
        mkdir -p backups
        
        # Generate backup filename
        BACKUP_FILE="backups/${PROJECT_NAME}-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).sql"
        
        # Create database backup
        docker-compose -f "$COMPOSE_FILE" exec postgres pg_dump -U postgres lokifi > "$BACKUP_FILE"
        
        if [[ $? -eq 0 ]]; then
            log_success "Database backup created: $BACKUP_FILE"
        else
            log_error "Database backup failed"
            exit 1
        fi
        
        # Keep only last 5 backups
        ls -t backups/${PROJECT_NAME}-${ENVIRONMENT}-*.sql | tail -n +6 | xargs -r rm
    fi
}

build_images() {
    log_info "Building Docker images..."
    
    # Build frontend image
    log_info "Building frontend image..."
    docker build -t "${REGISTRY}/${PROJECT_NAME}/frontend:${VERSION}" -f frontend/Dockerfile.prod frontend/
    
    # Build backend image
    log_info "Building backend image..."
    docker build -t "${REGISTRY}/${PROJECT_NAME}/backend:${VERSION}" -f backend/Dockerfile.prod backend/
    
    # Tag as latest for the environment
    docker tag "${REGISTRY}/${PROJECT_NAME}/frontend:${VERSION}" "${REGISTRY}/${PROJECT_NAME}/frontend:${ENVIRONMENT}-latest"
    docker tag "${REGISTRY}/${PROJECT_NAME}/backend:${VERSION}" "${REGISTRY}/${PROJECT_NAME}/backend:${ENVIRONMENT}-latest"
    
    log_success "Docker images built successfully"
}

run_tests() {
    log_info "Running tests..."
    
    # Run frontend tests
    log_info "Running frontend tests..."
    cd frontend
    npm run test:ci
    cd ..
    
    # Run backend tests
    log_info "Running backend tests..."
    cd backend
    python -m pytest tests/ -v --cov=app --cov-report=term-missing
    cd ..
    
    log_success "All tests passed"
}

deploy_services() {
    log_info "Deploying services to $ENVIRONMENT..."
    
    # Set version in environment
    export IMAGE_VERSION="$VERSION"
    
    # Deploy with docker-compose
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans
    docker-compose -f "$COMPOSE_FILE" up -d
    
    log_success "Services deployed"
}

wait_for_services() {
    log_info "Waiting for services to be healthy..."
    
    # Wait for backend
    BACKEND_URL="http://localhost:8000"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        BACKEND_URL="https://api.lokifi.example.com"
    fi
    
    local retries=30
    while [[ $retries -gt 0 ]]; do
        if curl -f -s "$BACKEND_URL/api/health" > /dev/null; then
            log_success "Backend is healthy"
            break
        fi
        
        log_info "Waiting for backend... ($retries retries left)"
        sleep 10
        ((retries--))
    done
    
    if [[ $retries -eq 0 ]]; then
        log_error "Backend failed to become healthy"
        return 1
    fi
    
    # Wait for frontend
    FRONTEND_URL="http://localhost:3000"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        FRONTEND_URL="https://lokifi.example.com"
    fi
    
    retries=30
    while [[ $retries -gt 0 ]]; do
        if curl -f -s "$FRONTEND_URL" > /dev/null; then
            log_success "Frontend is healthy"
            break
        fi
        
        log_info "Waiting for frontend... ($retries retries left)"
        sleep 10
        ((retries--))
    done
    
    if [[ $retries -eq 0 ]]; then
        log_error "Frontend failed to become healthy"
        return 1
    fi
}

run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # Basic health checks
    BACKEND_URL="http://localhost:8000"
    FRONTEND_URL="http://localhost:3000"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        BACKEND_URL="https://api.lokifi.example.com"
        FRONTEND_URL="https://lokifi.example.com"
    fi
    
    # Test backend endpoints
    curl -f -s "$BACKEND_URL/api/health" | jq .status | grep -q "healthy"
    curl -f -s "$BACKEND_URL/api/v1/symbols" | jq .symbols | jq length | grep -q "[0-9]"
    
    # Test frontend
    curl -f -s "$FRONTEND_URL" | grep -q "Lokifi"
    
    log_success "Smoke tests passed"
}

cleanup_old_images() {
    log_info "Cleaning up old Docker images..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove old tagged images (keep last 3 versions)
    docker images "${REGISTRY}/${PROJECT_NAME}/frontend" --format "table {{.Tag}}" | tail -n +2 | grep -v latest | sort -V | head -n -3 | xargs -r docker rmi "${REGISTRY}/${PROJECT_NAME}/frontend:" 2>/dev/null || true
    docker images "${REGISTRY}/${PROJECT_NAME}/backend" --format "table {{.Tag}}" | tail -n +2 | grep -v latest | sort -V | head -n -3 | xargs -r docker rmi "${REGISTRY}/${PROJECT_NAME}/backend:" 2>/dev/null || true
    
    log_success "Cleanup completed"
}

send_notifications() {
    local status=$1
    local message="Lokifi deployment to $ENVIRONMENT"
    
    if [[ "$status" == "success" ]]; then
        message="✅ $message succeeded (version: $VERSION)"
    else
        message="❌ $message failed (version: $VERSION)"
    fi
    
    log_info "$message"
    
    # Here you would typically send notifications to Slack, email, etc.
    # Example for Slack:
    # curl -X POST -H 'Content-type: application/json' \
    #   --data "{\"text\":\"$message\"}" \
    #   "$SLACK_WEBHOOK_URL"
}

rollback() {
    log_warning "Rolling back deployment..."
    
    # Get previous version from git
    PREVIOUS_VERSION=$(git rev-parse --short HEAD~1)
    
    # Use previous images
    export IMAGE_VERSION="$PREVIOUS_VERSION"
    
    # Redeploy with previous version
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans
    docker-compose -f "$COMPOSE_FILE" up -d
    
    log_info "Rollback completed to version: $PREVIOUS_VERSION"
}

# Main deployment flow
main() {
    log_info "Starting deployment of $PROJECT_NAME to $ENVIRONMENT (version: $VERSION)"
    
    # Pre-deployment checks
    check_requirements
    
    # Backup database for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        backup_database
    fi
    
    # Build and test (skip for staging if images already exist)
    if [[ "$ENVIRONMENT" == "production" || ! -z "$REBUILD" ]]; then
        build_images
        run_tests
    fi
    
    # Deploy
    deploy_services
    
    # Wait for services to be ready
    if ! wait_for_services; then
        log_error "Services failed to become healthy, initiating rollback..."
        rollback
        send_notifications "failed"
        exit 1
    fi
    
    # Smoke tests
    if ! run_smoke_tests; then
        log_error "Smoke tests failed, initiating rollback..."
        rollback
        send_notifications "failed"
        exit 1
    fi
    
    # Cleanup
    cleanup_old_images
    
    # Success notification
    send_notifications "success"
    
    log_success "Deployment completed successfully!"
    log_info "Frontend URL: $([ "$ENVIRONMENT" == "production" ] && echo "https://lokifi.example.com" || echo "http://localhost:3000")"
    log_info "Backend URL: $([ "$ENVIRONMENT" == "production" ] && echo "https://api.lokifi.example.com" || echo "http://localhost:8000")"
}

# Handle script interruption
trap 'log_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"