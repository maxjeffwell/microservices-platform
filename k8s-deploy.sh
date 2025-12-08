#!/bin/bash

# ===========================================
# Vertex Platform - Kubernetes Deployment Script
# For k3s on single-node VPS
# ===========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="$SCRIPT_DIR/k8s"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check kubectl is available
check_prereqs() {
    log_info "Checking prerequisites..."

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. For k3s, try: export KUBECONFIG=/etc/rancher/k3s/k3s.yaml"
        exit 1
    fi

    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        log_info "For k3s, try: export KUBECONFIG=/etc/rancher/k3s/k3s.yaml"
        exit 1
    fi

    log_success "Prerequisites OK"
}

# Deploy base resources (namespace, secrets, configmap)
deploy_base() {
    log_info "Deploying base resources..."

    kubectl apply -f "$K8S_DIR/base/namespace.yaml"
    kubectl apply -f "$K8S_DIR/base/configmap.yaml"
    kubectl apply -f "$K8S_DIR/base/secrets.yaml"

    log_success "Base resources deployed"
}

# Deploy infrastructure (redis, mongodb, influxdb, kafka)
deploy_infrastructure() {
    log_info "Deploying infrastructure services..."

    kubectl apply -f "$K8S_DIR/infrastructure/redis.yaml"
    kubectl apply -f "$K8S_DIR/infrastructure/mongodb.yaml"
    kubectl apply -f "$K8S_DIR/infrastructure/influxdb.yaml"
    kubectl apply -f "$K8S_DIR/infrastructure/kafka.yaml"

    log_info "Waiting for infrastructure to be ready..."

    kubectl -n vertex-platform wait --for=condition=ready pod -l app=redis --timeout=120s || true
    kubectl -n vertex-platform wait --for=condition=ready pod -l app=zookeeper --timeout=120s || true
    kubectl -n vertex-platform wait --for=condition=ready pod -l app=kafka --timeout=180s || true
    kubectl -n vertex-platform wait --for=condition=ready pod -l app=influxdb --timeout=120s || true

    log_success "Infrastructure services deployed"
}

# Deploy platform services (auth, analytics)
deploy_services() {
    log_info "Deploying platform services..."

    kubectl apply -f "$K8S_DIR/services/auth-service.yaml"
    kubectl apply -f "$K8S_DIR/services/analytics-service.yaml"

    log_info "Waiting for services to be ready..."

    kubectl -n vertex-platform wait --for=condition=ready pod -l app=auth-service --timeout=120s || true
    kubectl -n vertex-platform wait --for=condition=ready pod -l app=analytics-service --timeout=120s || true

    log_success "Platform services deployed"
}

# Deploy ingress
deploy_ingress() {
    log_info "Deploying ingress..."

    kubectl apply -f "$K8S_DIR/base/ingress.yaml"

    log_success "Ingress deployed"
}

# Full deployment
deploy_all() {
    check_prereqs
    deploy_base
    deploy_infrastructure
    deploy_services
    deploy_ingress

    echo ""
    log_success "Deployment complete!"
    echo ""
    log_info "Check status with: $0 status"
    log_info "View logs with: $0 logs <service>"
    echo ""
    log_info "Your API should be available at: http://86.48.29.183/"
}

# Show status
show_status() {
    log_info "Namespace: vertex-platform"
    echo ""

    log_info "Pods:"
    kubectl -n vertex-platform get pods -o wide
    echo ""

    log_info "Services:"
    kubectl -n vertex-platform get services
    echo ""

    log_info "Ingress:"
    kubectl -n vertex-platform get ingress 2>/dev/null || true
    kubectl -n vertex-platform get ingressroute 2>/dev/null || true
}

# Show logs
show_logs() {
    local service=${1:-}
    if [ -z "$service" ]; then
        log_error "Usage: $0 logs <service>"
        log_info "Services: auth-service, analytics-service, redis, mongodb, influxdb, kafka, zookeeper"
        exit 1
    fi

    kubectl -n vertex-platform logs -f -l app="$service" --all-containers
}

# Restart a service
restart_service() {
    local service=${1:-}
    if [ -z "$service" ]; then
        log_error "Usage: $0 restart <service>"
        exit 1
    fi

    log_info "Restarting $service..."
    kubectl -n vertex-platform rollout restart deployment "$service"
    kubectl -n vertex-platform rollout status deployment "$service"
    log_success "$service restarted"
}

# Delete everything
destroy() {
    log_warn "This will delete ALL vertex-platform resources!"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" = "yes" ]; then
        log_info "Deleting all resources..."
        kubectl delete namespace vertex-platform --ignore-not-found
        log_success "All resources deleted"
    else
        log_info "Cancelled"
    fi
}

# Update images (pull latest)
update_images() {
    log_info "Updating service images..."

    kubectl -n vertex-platform rollout restart deployment auth-service
    kubectl -n vertex-platform rollout restart deployment analytics-service

    kubectl -n vertex-platform rollout status deployment auth-service
    kubectl -n vertex-platform rollout status deployment analytics-service

    log_success "Images updated"
}

# Usage
usage() {
    echo "Vertex Platform - Kubernetes Deployment"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  deploy      Deploy all resources"
    echo "  status      Show deployment status"
    echo "  logs <svc>  Show logs for a service"
    echo "  restart <s> Restart a service"
    echo "  update      Pull latest images and restart services"
    echo "  destroy     Delete all resources"
    echo ""
    echo "Examples:"
    echo "  $0 deploy"
    echo "  $0 logs auth-service"
    echo "  $0 restart auth-service"
}

# Main
case "${1:-}" in
    deploy)
        deploy_all
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "${2:-}"
        ;;
    restart)
        restart_service "${2:-}"
        ;;
    update)
        update_images
        ;;
    destroy)
        destroy
        ;;
    *)
        usage
        exit 1
        ;;
esac
