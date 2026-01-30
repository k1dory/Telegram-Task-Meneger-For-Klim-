#!/bin/bash
#
# Rollback Script for Telegram Task Manager
# Restores to a previous version and optionally restores database
#
# Usage: ./rollback.sh [options]
# Options:
#   -v, --version VERSION   Version/commit to rollback to
#   -b, --backup FILE       Restore database from backup file
#   -f, --force             Skip confirmation prompts
#   -h, --help              Show help
#

set -e

# Configuration
APP_DIR="/opt/taskmanager"
BACKUP_DIR="$APP_DIR/backups"
COMPOSE_FILE="docker-compose.prod.yml"
VERSION=""
BACKUP_FILE=""
FORCE=false

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

show_help() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -v, --version VERSION   Version/commit SHA to rollback to"
    echo "  -b, --backup FILE       Restore database from backup file"
    echo "  -f, --force             Skip confirmation prompts"
    echo "  -h, --help              Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 -v abc123def                    # Rollback to specific version"
    echo "  $0 -b db_20240115_120000.sql.gz   # Restore database backup"
    echo "  $0 -v abc123def -b latest          # Rollback code and restore latest backup"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -b|--backup)
            BACKUP_FILE="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

cd "$APP_DIR"

echo "=============================================="
echo "  Telegram Task Manager - Rollback"
echo "=============================================="
echo ""

# ===========================================
# Show available versions
# ===========================================
if [ -z "$VERSION" ] && [ -z "$BACKUP_FILE" ]; then
    log_info "No version specified. Available images:"
    echo ""
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}" | grep taskmanager || true
    echo ""
    log_info "Available backups:"
    ls -la "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No backups found"
    echo ""
    log_warning "Please specify a version with -v or backup with -b"
    exit 1
fi

# ===========================================
# Confirmation
# ===========================================
if ! $FORCE; then
    echo ""
    log_warning "This will rollback the application:"
    [ -n "$VERSION" ] && echo "  - Version: $VERSION"
    [ -n "$BACKUP_FILE" ] && echo "  - Database: $BACKUP_FILE"
    echo ""
    read -p "Are you sure you want to continue? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi
fi

# ===========================================
# Create backup before rollback
# ===========================================
log_info "Creating backup before rollback..."
./scripts/backup.sh || log_warning "Backup failed, continuing..."

# ===========================================
# Rollback application version
# ===========================================
if [ -n "$VERSION" ]; then
    log_info "Rolling back to version: $VERSION"

    # Update .env with rollback version
    sed -i "s/^VERSION=.*/VERSION=$VERSION/" .env

    # Pull specific version
    docker compose -f "$COMPOSE_FILE" pull

    # Stop current containers
    docker compose -f "$COMPOSE_FILE" down

    # Start with rollback version
    docker compose -f "$COMPOSE_FILE" up -d

    log_success "Application rolled back to version: $VERSION"
fi

# ===========================================
# Restore database backup
# ===========================================
if [ -n "$BACKUP_FILE" ]; then
    # Handle "latest" keyword
    if [ "$BACKUP_FILE" = "latest" ]; then
        BACKUP_FILE=$(ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | head -n1)
        if [ -z "$BACKUP_FILE" ]; then
            log_error "No backup files found!"
            exit 1
        fi
        log_info "Using latest backup: $BACKUP_FILE"
    elif [[ ! "$BACKUP_FILE" = /* ]]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    fi

    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    log_info "Restoring database from: $BACKUP_FILE"

    # Get database credentials
    source .env

    # Stop backend to prevent connections
    docker compose -f "$COMPOSE_FILE" stop backend

    # Restore database
    gunzip -c "$BACKUP_FILE" | docker exec -i taskmanager-postgres \
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

    # Restart backend
    docker compose -f "$COMPOSE_FILE" start backend

    log_success "Database restored from: $BACKUP_FILE"
fi

# ===========================================
# Health check
# ===========================================
log_info "Running health checks..."
sleep 10

if curl -sf http://localhost:8080/api/health > /dev/null 2>&1; then
    log_success "Application is healthy after rollback"
else
    log_error "Health check failed after rollback!"
    exit 1
fi

# ===========================================
# Summary
# ===========================================
echo ""
echo "=============================================="
echo "  Rollback Complete"
echo "=============================================="
docker compose -f "$COMPOSE_FILE" ps
echo ""
log_success "Rollback completed successfully!"
