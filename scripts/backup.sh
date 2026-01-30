#!/bin/bash
#
# Backup Script for Telegram Task Manager
# Creates PostgreSQL database backups and manages retention
#
# Usage: ./backup.sh [options]
# Options:
#   -d, --directory DIR    Backup directory (default: /opt/taskmanager/backups)
#   -r, --retention DAYS   Days to keep backups (default: 7)
#   -c, --container NAME   PostgreSQL container name (default: taskmanager-postgres)
#   -v, --verbose          Enable verbose output
#   -h, --help             Show this help message
#

set -e

# Default configuration
BACKUP_DIR="/opt/taskmanager/backups"
RETENTION_DAYS=7
POSTGRES_CONTAINER="taskmanager-postgres"
VERBOSE=false
DATE=$(date +%Y%m%d_%H%M%S)
HOSTNAME=$(hostname)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level in
        INFO)
            $VERBOSE && echo -e "${BLUE}[$timestamp]${NC} [INFO] $message"
            ;;
        SUCCESS)
            echo -e "${GREEN}[$timestamp]${NC} [SUCCESS] $message"
            ;;
        WARNING)
            echo -e "${YELLOW}[$timestamp]${NC} [WARNING] $message"
            ;;
        ERROR)
            echo -e "${RED}[$timestamp]${NC} [ERROR] $message"
            ;;
    esac
}

show_help() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -d, --directory DIR    Backup directory (default: $BACKUP_DIR)"
    echo "  -r, --retention DAYS   Days to keep backups (default: $RETENTION_DAYS)"
    echo "  -c, --container NAME   PostgreSQL container name (default: $POSTGRES_CONTAINER)"
    echo "  -v, --verbose          Enable verbose output"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                           # Run with defaults"
    echo "  $0 -v -r 14                  # Verbose mode, keep 14 days"
    echo "  $0 -d /custom/backup/path    # Custom backup directory"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--directory)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -r|--retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        -c|--container)
            POSTGRES_CONTAINER="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Start backup process
log INFO "Starting backup process..."
log INFO "Backup directory: $BACKUP_DIR"
log INFO "Retention: $RETENTION_DAYS days"

# ===========================================
# Pre-flight checks
# ===========================================

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log ERROR "Docker is not running!"
    exit 1
fi

# Check if PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
    log ERROR "PostgreSQL container '$POSTGRES_CONTAINER' is not running!"
    log INFO "Available containers:"
    docker ps --format '{{.Names}}'
    exit 1
fi

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    log INFO "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# ===========================================
# Database Backup
# ===========================================

BACKUP_FILE="$BACKUP_DIR/db_${DATE}.sql.gz"
BACKUP_FILE_LATEST="$BACKUP_DIR/db_latest.sql.gz"

log INFO "Creating database backup..."

# Get database credentials from container environment
DB_USER=$(docker exec "$POSTGRES_CONTAINER" printenv POSTGRES_USER 2>/dev/null || echo "taskmanager")
DB_NAME=$(docker exec "$POSTGRES_CONTAINER" printenv POSTGRES_DB 2>/dev/null || echo "taskmanager")

log INFO "Database: $DB_NAME, User: $DB_USER"

# Create backup using pg_dump
if docker exec "$POSTGRES_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" 2>/dev/null | gzip > "$BACKUP_FILE"; then
    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log SUCCESS "Database backup created: $BACKUP_FILE ($BACKUP_SIZE)"

    # Create/update latest symlink
    ln -sf "$BACKUP_FILE" "$BACKUP_FILE_LATEST"
    log INFO "Updated latest backup link"
else
    log ERROR "Database backup failed!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Verify backup integrity
log INFO "Verifying backup integrity..."
if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    log SUCCESS "Backup integrity verified"
else
    log ERROR "Backup integrity check failed!"
    exit 1
fi

# ===========================================
# Cleanup Old Backups
# ===========================================

log INFO "Cleaning up backups older than $RETENTION_DAYS days..."

# Count files before cleanup
BEFORE_COUNT=$(find "$BACKUP_DIR" -name "db_*.sql.gz" -type f ! -name "db_latest.sql.gz" | wc -l)

# Remove old backups
find "$BACKUP_DIR" -name "db_*.sql.gz" -type f ! -name "db_latest.sql.gz" -mtime +$RETENTION_DAYS -delete

# Count files after cleanup
AFTER_COUNT=$(find "$BACKUP_DIR" -name "db_*.sql.gz" -type f ! -name "db_latest.sql.gz" | wc -l)

DELETED_COUNT=$((BEFORE_COUNT - AFTER_COUNT))
if [ $DELETED_COUNT -gt 0 ]; then
    log INFO "Removed $DELETED_COUNT old backup(s)"
fi

# ===========================================
# Backup Statistics
# ===========================================

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "db_*.sql.gz" -type f ! -name "db_latest.sql.gz" | wc -l)

log INFO "Backup statistics:"
log INFO "  - Total backups: $BACKUP_COUNT"
log INFO "  - Total size: $TOTAL_SIZE"
log INFO "  - Latest backup: $BACKUP_FILE"

# ===========================================
# Optional: Upload to Remote Storage
# ===========================================

# Uncomment and configure for S3 backup
# if command -v aws &> /dev/null; then
#     log INFO "Uploading backup to S3..."
#     S3_BUCKET="your-backup-bucket"
#     S3_PATH="taskmanager/backups"
#     aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/${S3_PATH}/"
#     log SUCCESS "Backup uploaded to S3"
# fi

# Uncomment and configure for rsync to remote server
# REMOTE_SERVER="backup@backup-server.com"
# REMOTE_PATH="/backups/taskmanager"
# rsync -avz "$BACKUP_FILE" "${REMOTE_SERVER}:${REMOTE_PATH}/"

# ===========================================
# Notification (Optional)
# ===========================================

# Send notification via Telegram (if configured)
send_telegram_notification() {
    local message="$1"
    local bot_token="${TELEGRAM_NOTIFY_BOT_TOKEN:-}"
    local chat_id="${TELEGRAM_NOTIFY_CHAT_ID:-}"

    if [ -n "$bot_token" ] && [ -n "$chat_id" ]; then
        curl -s -X POST "https://api.telegram.org/bot${bot_token}/sendMessage" \
            -d "chat_id=${chat_id}" \
            -d "text=${message}" \
            -d "parse_mode=HTML" > /dev/null
        log INFO "Telegram notification sent"
    fi
}

# Send success notification
# send_telegram_notification "Backup completed on ${HOSTNAME}
# Database: ${DB_NAME}
# Size: ${BACKUP_SIZE}
# Time: $(date '+%Y-%m-%d %H:%M:%S')"

# ===========================================
# Final Summary
# ===========================================

echo ""
echo "=============================================="
echo "  Backup Summary"
echo "=============================================="
echo "  Status:      SUCCESS"
echo "  Database:    $DB_NAME"
echo "  File:        $BACKUP_FILE"
echo "  Size:        $BACKUP_SIZE"
echo "  Timestamp:   $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="
echo ""

log SUCCESS "Backup process completed successfully!"
exit 0
