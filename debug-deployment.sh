#!/bin/bash

# Debug script for deployment issues
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

COMPOSE_FILE="docker-compose.yml"

log_info "=== Deployment Debug Script ==="
log_info "Checking Docker and Docker Compose status..."

# Check Docker status
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed"
    exit 1
fi

log_info "Docker and Docker Compose are available"

# Check if .env file exists
if [ ! -f ".env" ]; then
    log_warn ".env file not found"
    if [ -f "docker.env.example" ]; then
        log_info "Copying docker.env.example to .env"
        cp docker.env.example .env
    else
        log_error "No environment file found"
        exit 1
    fi
fi

# Check container status
log_info "=== Container Status ==="
docker-compose -f "$COMPOSE_FILE" ps

# Check if container is running
if docker-compose -f "$COMPOSE_FILE" ps api | grep -q "Up"; then
    log_info "Container is running"
    
    # Check container logs
    log_info "=== Container Logs (last 50 lines) ==="
    docker-compose -f "$COMPOSE_FILE" logs --tail=50 api
    
    # Try to connect to container
    log_info "=== Testing Container Connection ==="
    if docker-compose -f "$COMPOSE_FILE" exec -T api node -e "console.log('Container is accessible')" 2>/dev/null; then
        log_info "Container is accessible"
    else
        log_error "Container is not accessible"
    fi
    
    # Check health endpoint
    log_info "=== Testing Health Endpoint ==="
    if docker-compose -f "$COMPOSE_FILE" exec -T api node -e "require('http').get('http://localhost:4000/health', (res) => { console.log('Health check:', res.statusCode); process.exit(res.statusCode === 200 ? 0 : 1) })" 2>/dev/null; then
        log_info "Health endpoint is responding"
    else
        log_error "Health endpoint is not responding"
    fi
    
    # Check database
    log_info "=== Testing Database Connection ==="
    if docker-compose -f "$COMPOSE_FILE" exec -T api npx prisma db push --accept-data-loss 2>/dev/null; then
        log_info "Database connection is working"
    else
        log_error "Database connection failed"
    fi
    
else
    log_error "Container is not running"
    log_info "=== Container Logs ==="
    docker-compose -f "$COMPOSE_FILE" logs api
fi

log_info "=== Debug Complete ==="
