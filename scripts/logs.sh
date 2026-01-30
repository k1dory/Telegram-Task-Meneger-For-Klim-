#!/bin/bash
#
# Log Viewer Script for Telegram Task Manager
# Provides easy access to various application logs
#
# Usage: ./logs.sh [service] [options]
# Examples:
#   ./logs.sh              # All services
#   ./logs.sh backend      # Backend only
#   ./logs.sh nginx -f     # Follow nginx logs
#

set -e

APP_DIR="/opt/taskmanager"
COMPOSE_FILE="docker-compose.prod.yml"
SERVICE="${1:-}"
shift 2>/dev/null || true

cd "$APP_DIR"

case "$SERVICE" in
    backend|be|api)
        docker compose -f "$COMPOSE_FILE" logs backend "$@"
        ;;
    frontend|fe|web)
        docker compose -f "$COMPOSE_FILE" logs frontend "$@"
        ;;
    nginx|proxy)
        docker compose -f "$COMPOSE_FILE" logs nginx "$@"
        ;;
    postgres|db|database)
        docker compose -f "$COMPOSE_FILE" logs postgres "$@"
        ;;
    all|"")
        docker compose -f "$COMPOSE_FILE" logs "$@"
        ;;
    -f|--follow)
        docker compose -f "$COMPOSE_FILE" logs -f
        ;;
    -h|--help)
        echo "Usage: $0 [service] [options]"
        echo ""
        echo "Services:"
        echo "  backend, be, api      - Backend Go server"
        echo "  frontend, fe, web     - Frontend React app"
        echo "  nginx, proxy          - Nginx reverse proxy"
        echo "  postgres, db          - PostgreSQL database"
        echo "  all                   - All services (default)"
        echo ""
        echo "Options (passed to docker compose logs):"
        echo "  -f, --follow          - Follow log output"
        echo "  --tail N              - Number of lines to show"
        echo "  --since TIME          - Show logs since timestamp"
        echo ""
        echo "Examples:"
        echo "  $0 backend -f              # Follow backend logs"
        echo "  $0 nginx --tail 100        # Last 100 nginx lines"
        echo "  $0 all --since 1h          # All logs from last hour"
        ;;
    *)
        echo "Unknown service: $SERVICE"
        echo "Use '$0 --help' for usage"
        exit 1
        ;;
esac
