# Makefile for Telegram Task Manager
# Common development and deployment commands

.PHONY: help dev dev-up dev-down dev-logs prod prod-up prod-down prod-logs \
        build test lint clean backup deploy rollback ssl-setup

# Default target
help:
	@echo "Telegram Task Manager - Available Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development environment"
	@echo "  make dev-down     - Stop development environment"
	@echo "  make dev-logs     - View development logs"
	@echo "  make dev-shell    - Open shell in backend container"
	@echo ""
	@echo "Production:"
	@echo "  make prod         - Start production environment"
	@echo "  make prod-down    - Stop production environment"
	@echo "  make prod-logs    - View production logs"
	@echo ""
	@echo "Build & Test:"
	@echo "  make build        - Build Docker images"
	@echo "  make test         - Run all tests"
	@echo "  make test-be      - Run backend tests"
	@echo "  make test-fe      - Run frontend tests"
	@echo "  make lint         - Run linters"
	@echo ""
	@echo "Operations:"
	@echo "  make backup       - Create database backup"
	@echo "  make deploy       - Deploy to production"
	@echo "  make rollback     - Rollback to previous version"
	@echo "  make ssl-setup    - Setup SSL certificate"
	@echo "  make clean        - Clean Docker resources"

# ===========================================
# Development Commands
# ===========================================

dev: dev-up
	@echo "Development environment is running"
	@echo "Frontend: http://localhost:5173"
	@echo "Backend:  http://localhost:8080"
	@echo "Adminer:  http://localhost:8081"

dev-up:
	docker compose up -d
	@echo "Waiting for services to start..."
	@sleep 5
	docker compose ps

dev-down:
	docker compose down

dev-logs:
	docker compose logs -f

dev-shell:
	docker compose exec backend sh

dev-db:
	docker compose exec postgres psql -U taskmanager -d taskmanager

dev-restart:
	docker compose restart

dev-rebuild:
	docker compose up -d --build

# ===========================================
# Production Commands
# ===========================================

prod: prod-up

prod-up:
	docker compose -f docker-compose.prod.yml up -d
	@sleep 5
	docker compose -f docker-compose.prod.yml ps

prod-down:
	docker compose -f docker-compose.prod.yml down

prod-logs:
	docker compose -f docker-compose.prod.yml logs -f

prod-restart:
	docker compose -f docker-compose.prod.yml restart

# ===========================================
# Build Commands
# ===========================================

build:
	docker compose build

build-backend:
	docker build -t taskmanager-backend ./backend

build-frontend:
	docker build -t taskmanager-frontend ./frontend

build-prod:
	docker compose -f docker-compose.prod.yml build

# ===========================================
# Test Commands
# ===========================================

test: test-be test-fe

test-be:
	cd backend && go test -v -race ./...

test-fe:
	cd frontend && npm run test -- --run

test-coverage:
	cd backend && go test -v -race -coverprofile=coverage.out ./...
	cd backend && go tool cover -html=coverage.out -o coverage.html

# ===========================================
# Lint Commands
# ===========================================

lint: lint-be lint-fe

lint-be:
	cd backend && go vet ./...
	cd backend && golangci-lint run || true

lint-fe:
	cd frontend && npm run lint

# ===========================================
# Operations Commands
# ===========================================

backup:
	./scripts/backup.sh -v

deploy:
	./scripts/deploy.sh

rollback:
	./scripts/rollback.sh

ssl-setup:
	@read -p "Enter domain: " domain; \
	read -p "Enter email (optional): " email; \
	sudo ./scripts/ssl-setup.sh $$domain $$email

# ===========================================
# Utility Commands
# ===========================================

clean:
	docker compose down -v
	docker system prune -f
	docker volume prune -f

clean-all:
	docker compose down -v --rmi all
	docker system prune -af
	docker volume prune -f

status:
	docker compose ps
	@echo ""
	docker compose -f docker-compose.prod.yml ps 2>/dev/null || true

health:
	@echo "Checking health..."
	@curl -sf http://localhost:8080/api/health && echo " Backend: OK" || echo " Backend: FAIL"
	@curl -sf http://localhost:5173/ > /dev/null && echo " Frontend: OK" || echo " Frontend: FAIL"

# ===========================================
# Database Commands
# ===========================================

db-migrate:
	docker compose exec backend ./server migrate up

db-rollback:
	docker compose exec backend ./server migrate down

db-seed:
	docker compose exec backend ./server seed

db-reset:
	docker compose down -v postgres
	docker compose up -d postgres
	@sleep 5
	$(MAKE) db-migrate
