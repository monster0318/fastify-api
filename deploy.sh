#!/bin/bash

# Simplified Docker deployment script for Capital Marketplace Backend
# This script handles building, deploying, and managing the application with SQLite

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
-    echo -e "${YELLOW}[WARN]${NC} $1"
+    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        log_warn "Environment file $ENV_FILE not found. Creating from example..."
        if [ -f "docker.env.example" ]; then
            cp docker.env.example "$ENV_FILE"
            log_warn "Please update $ENV_FILE with your production values before continuing."
            exit 1
        else
            log_error "No environment file found. Please create $ENV_FILE"
            exit 1
        fi
    fi
    
    log_info "Requirements check passed!"
}


build_images() {
    log_info "Building Docker image..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    log_info "Image built successfully!"
}

start_services() {
    log_info "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    log_info "Services started!"
}

stop_services() {
    log_info "Stopping services..."
    docker-compose -f "$COMPOSE_FILE" down
    log_info "Services stopped!"
}

restart_services() {
    log_info "Restarting services..."
    docker-compose -f "$COMPOSE_FILE" restart
    log_info "Services restarted!"
}

seed_database() {
    log_info "Seeding database..."
    
    # Wait for container to be ready
    log_info "Waiting for container to be healthy for seeding..."
    local max_wait=120
    local wait_time=0
    
    while [ $wait_time -lt $max_wait ]; do
        if docker-compose -f "$COMPOSE_FILE" ps api | grep -q "healthy"; then
            log_info "Container is healthy. Ready for seeding!"
            break
        fi
        log_info "Waiting for container to be healthy... (${wait_time}s/${max_wait}s)"
        sleep 10
        wait_time=$((wait_time + 10))
    done
    
    if [ $wait_time -ge $max_wait ]; then
        log_error "Container did not become healthy within ${max_wait} seconds"
        log_error "Container logs:"
        docker-compose -f "$COMPOSE_FILE" logs api
        return 1
    fi

    # Run seeding with retry logic
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "Seeding attempt $attempt/$max_attempts..."
        if docker-compose -f "$COMPOSE_FILE" exec -T --user fastify api npx prisma db seed; then
            log_info "Database seeded!"
            return 0
        else
            log_warn "Seeding attempt $attempt failed. Retrying in 10 seconds..."
            log_warn "Container logs:"
            docker-compose -f "$COMPOSE_FILE" logs --tail=20 api
            sleep 10
            ((attempt++))
        fi
    done
    
    log_error "All seeding attempts failed!"
    return 1
}

show_logs() {
    log_info "Showing logs..."
    docker-compose -f "$COMPOSE_FILE" logs -f
}

show_status() {
    log_info "Service status:"
    docker-compose -f "$COMPOSE_FILE" ps
}

backup_database() {
    log_info "Creating database backup..."
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).db"
    docker-compose -f "$COMPOSE_FILE" exec api cp /app/data/prod.db "/app/uploads/$BACKUP_FILE"
    docker cp $(docker-compose -f "$COMPOSE_FILE" ps -q api):/app/uploads/"$BACKUP_FILE" .
    log_info "Database backup created: $BACKUP_FILE"
}

cleanup() {
    log_info "Cleaning up unused Docker resources..."
    docker system prune -f
    docker volume prune -f
    log_info "Cleanup completed!"
}

# Main script logic
case "${1:-help}" in
    "build")
        check_requirements
        build_images
        ;;
    "start")
        check_requirements
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "deploy")
        check_requirements
        build_images
        stop_services
        start_services
        seed_database
        log_info "Deployment completed successfully!"
        ;;
    "migrate")
        log_warn "Migrations are now run automatically by the docker-entrypoint.sh script."
        log_warn "Run 'deploy' to perform migrations."
        ;;
    "seed")
        seed_database
        ;;
    "logs")
        show_logs
        ;;
    "status")
        show_status
        ;;
    "backup")
        backup_database
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|*)
        echo "Capital Marketplace Backend - Simplified Docker Deployment Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  build     - Build Docker image"
        echo "  start     - Start the service"
        echo "  stop      - Stop the service"
        echo "  restart   - Restart the service"
        echo "  deploy    - Full deployment (build, start, seed)"
        echo "  migrate   - Migrations are now automated during deploy."
        echo "  seed      - Seed the database"
        echo "  logs      - Show service logs"
        echo "  status    - Show service status"
        echo "  backup    - Create database backup"
        echo "  cleanup   - Clean up unused Docker resources"
        echo "  help      - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 deploy    # Full deployment"
        echo "  $0 logs      # View logs"
        echo "  $0 status    # Check service status"
        ;;
esac
