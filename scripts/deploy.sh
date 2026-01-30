#!/bin/bash
#
# Manual Deployment Script for Telegram Task Manager
# Use this for manual deployments or rollbacks
#
# Usage: ./deploy.sh [version]
# Example: ./deploy.sh latest
# Example: ./deploy.sh abc123def (specific commit SHA)
#

set -e

# Configuration
APP_DIR="/opt/taskmanager"
COMPOSE_FILE="docker-compose.prod.yml"
VERSION="${1:-latest}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

cd "$APP_DIR"

echo "=============================================="
echo "  Telegram Task Manager - Manual Deploy"
echo "=============================================="
echo ""
log_info "Deploying version: $VERSION"
echo ""

# ===========================================
# Pre-deployment checks
# ===========================================
log_info "Running pre-deployment checks..."

# Check Docker
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running!"
    exit 1
fi

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "Compose file not found: $COMPOSE_FILE"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    log_error ".env file not found!"
    exit 1
fi

# ===========================================
# Create backup before deployment
# ===========================================
log_info "Creating pre-deployment backup..."
./scripts/backup.sh -v || log_warning "Backup failed, continuing anyway..."

# ===========================================
# Update version in .env
# ===========================================
log_info "Updating version to: $VERSION"
sed -i "s/^VERSION=.*/VERSION=$VERSION/" .env

# ===========================================
# Pull new images
# ===========================================
log_info "Pulling new images..."
docker compose -f "$COMPOSE_FILE" pull

# ===========================================
# Zero-downtime deployment
# ===========================================
log_info "Starting zero-downtime deployment..."

# Get current backend container ID
CURRENT_BACKEND=$(docker compose -f "$COMPOSE_FILE" ps -q backend 2>/dev/null || echo "")

if [ -n "$CURRENT_BACKEND" ]; then
    log_info "Scaling up backend to 2 instances..."
    docker compose -f "$COMPOSE_FILE" up -d --no-deps --scale backend=2 backend

    log_info "Waiting for new instance to be healthy..."
    sleep 15

    # Health check
    if curl -sf http://localhost:8080/api/health > /dev/null 2>&1; then
        log_success "New backend instance is healthy"

        log_info "Scaling down to single instance..."
        docker compose -f "$COMPOSE_FILE" up -d --no-deps --scale backend=1 backend
    else
        log_error "Health check failed! Rolling back..."
        docker compose -f "$COMPOSE_FILE" up -d --no-deps --scale backend=1 backend
        exit 1
    fi
else
    log_info "No existing backend, starting fresh..."
fi

# ===========================================
# Update all services
# ===========================================
log_info "Updating all services..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# ===========================================
# Final health check
# ===========================================
log_info "Running final health checks..."
sleep 10

HEALTH_OK=true

# Check backend
if curl -sf http://localhost:8080/api/health > /dev/null 2>&1; then
    log_success "Backend: healthy"
else
    log_error "Backend: unhealthy"
    HEALTH_OK=false
fi

# Check frontend
if curl -sf http://localhost/ > /dev/null 2>&1; then
    log_success "Frontend: healthy"
else
    log_error "Frontend: unhealthy"
    HEALTH_OK=false
fi

# ===========================================
# Cleanup
# ===========================================
log_info "Cleaning up old images..."
docker image prune -f

# ===========================================
# Summary
# ===========================================
echo ""
echo "=============================================="
echo "  Deployment Summary"
echo "=============================================="

docker compose -f "$COMPOSE_FILE" ps

echo ""
if $HEALTH_OK; then
    log_success "Deployment completed successfully!"
else
    log_error "Deployment completed with warnings. Check service health!"
    exit 1
fi
