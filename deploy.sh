#!/bin/bash

# ===========================================
# Microservices Platform Deployment Script
# ===========================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ===========================================
# Helper Functions
# ===========================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is required but not installed."
        exit 1
    fi
}

# ===========================================
# Pre-flight Checks
# ===========================================

preflight_checks() {
    log_info "Running pre-flight checks..."

    # Check required commands
    check_command docker
    check_command docker

    # Check Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi

    # Check for .env.production
    if [ ! -f ".env.production" ]; then
        log_error ".env.production not found!"
        log_info "Copy .env.production.example to .env.production and fill in your values:"
        echo "  cp .env.production.example .env.production"
        echo "  nano .env.production"
        exit 1
    fi

    # Check for Caddyfile
    if [ ! -f "Caddyfile" ]; then
        log_error "Caddyfile not found!"
        exit 1
    fi

    log_success "Pre-flight checks passed"
}

# ===========================================
# Deployment Commands
# ===========================================

pull_images() {
    log_info "Pulling latest Docker images..."
    docker compose -f docker-compose.prod.yml --env-file .env.production pull
    log_success "Images pulled successfully"
}

start_services() {
    log_info "Starting services..."
    docker compose -f docker-compose.prod.yml --env-file .env.production up -d
    log_success "Services started"
}

stop_services() {
    log_info "Stopping services..."
    docker compose -f docker-compose.prod.yml --env-file .env.production down
    log_success "Services stopped"
}

restart_services() {
    log_info "Restarting services..."
    docker compose -f docker-compose.prod.yml --env-file .env.production restart
    log_success "Services restarted"
}

show_status() {
    log_info "Service status:"
    docker compose -f docker-compose.prod.yml --env-file .env.production ps
}

show_logs() {
    local service=${1:-}
    if [ -n "$service" ]; then
        docker compose -f docker-compose.prod.yml --env-file .env.production logs -f "$service"
    else
        docker compose -f docker-compose.prod.yml --env-file .env.production logs -f
    fi
}

health_check() {
    log_info "Running health checks..."

    local services=("auth-service:3001" "analytics-service:3005")
    local all_healthy=true

    for service_port in "${services[@]}"; do
        IFS=':' read -r service port <<< "$service_port"

        # Check if container is running
        if docker compose -f docker-compose.prod.yml --env-file .env.production ps "$service" | grep -q "Up"; then
            # Try health endpoint inside container network
            if docker compose -f docker-compose.prod.yml --env-file .env.production exec -T "$service" \
                node -e "require('http').get('http://localhost:$port/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })" 2>/dev/null; then
                log_success "$service is healthy"
            else
                log_warn "$service container is up but health check failed"
                all_healthy=false
            fi
        else
            log_error "$service is not running"
            all_healthy=false
        fi
    done

    if $all_healthy; then
        log_success "All services are healthy!"
    else
        log_warn "Some services are unhealthy. Check logs with: $0 logs <service>"
    fi
}

cleanup() {
    log_info "Cleaning up unused Docker resources..."
    docker system prune -f
    log_success "Cleanup complete"
}

backup_volumes() {
    local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"

    log_info "Backing up data volumes to $backup_dir..."

    # List of volumes to backup
    local volumes=("mongodb_data" "redis_data" "influxdb_data")

    for vol in "${volumes[@]}"; do
        local full_vol_name="microservices-platform_${vol}"
        if docker volume inspect "$full_vol_name" &>/dev/null; then
            log_info "Backing up $vol..."
            docker run --rm \
                -v "${full_vol_name}:/data:ro" \
                -v "$(pwd)/$backup_dir:/backup" \
                alpine tar czf "/backup/${vol}.tar.gz" -C /data .
            log_success "Backed up $vol"
        else
            log_warn "Volume $full_vol_name not found, skipping"
        fi
    done

    log_success "Backup complete: $backup_dir"
}

# ===========================================
# Initial Setup (First-time deployment)
# ===========================================

initial_setup() {
    log_info "Running initial setup..."

    # Create necessary directories
    mkdir -p backups logs

    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        log_info "Creating .env.production from template..."
        cp .env.production.example .env.production
        log_warn "Please edit .env.production with your values before deploying!"
        log_info "  nano .env.production"
        exit 0
    fi

    log_success "Initial setup complete"
}

# ===========================================
# Full Deploy (Pull + Restart)
# ===========================================

deploy() {
    preflight_checks
    pull_images

    log_info "Stopping existing services..."
    docker compose -f docker-compose.prod.yml --env-file .env.production down --remove-orphans 2>/dev/null || true

    start_services

    log_info "Waiting for services to be ready..."
    sleep 10

    health_check

    log_success "Deployment complete!"
    echo ""
    log_info "Your API is available at: https://\$DOMAIN"
    log_info "View logs with: $0 logs"
    log_info "Check status with: $0 status"
}

# ===========================================
# Usage
# ===========================================

usage() {
    echo "Microservices Platform Deployment Script"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  deploy      Full deployment (pull images + restart services)"
    echo "  start       Start all services"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  status      Show service status"
    echo "  logs [svc]  Show logs (optionally for specific service)"
    echo "  health      Run health checks"
    echo "  pull        Pull latest images"
    echo "  backup      Backup data volumes"
    echo "  cleanup     Remove unused Docker resources"
    echo "  setup       Initial setup (first-time only)"
    echo ""
    echo "Examples:"
    echo "  $0 deploy              # Full deployment"
    echo "  $0 logs auth-service   # View auth-service logs"
    echo "  $0 status              # Check all services"
}

# ===========================================
# Main
# ===========================================

case "${1:-}" in
    deploy)
        deploy
        ;;
    start)
        preflight_checks
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "${2:-}"
        ;;
    health)
        health_check
        ;;
    pull)
        pull_images
        ;;
    backup)
        backup_volumes
        ;;
    cleanup)
        cleanup
        ;;
    setup)
        initial_setup
        ;;
    *)
        usage
        exit 1
        ;;
esac
