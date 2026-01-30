# DevOps & Infrastructure Plan

## Docker Setup

### Container Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         NGINX                                │
│                    (Reverse Proxy + SSL)                     │
│                        Port 80/443                           │
└────────────────┬────────────────────┬───────────────────────┘
                 │                    │
                 ▼                    ▼
┌────────────────────────┐  ┌────────────────────────┐
│       Frontend         │  │        Backend         │
│    (React + Nginx)     │  │      (Go + Gin)        │
│       Port 80          │  │       Port 8080        │
└────────────────────────┘  └───────────┬────────────┘
                                        │
                                        ▼
                            ┌────────────────────────┐
                            │      PostgreSQL        │
                            │       Port 5432        │
                            └────────────────────────┘
```

---

## Dockerfiles

### Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Backend Dockerfile

```dockerfile
# backend/Dockerfile
# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

# Production stage
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /server .
COPY migrations ./migrations

EXPOSE 8080

CMD ["./server"]
```

---

## Docker Compose

### Development (docker-compose.yml)

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:8080/api
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    volumes:
      - ./backend:/app
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://taskmanager:devpassword@postgres:5432/taskmanager?sslmode=disable
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - JWT_SECRET=${JWT_SECRET}
      - GIN_MODE=debug
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: taskmanager
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: taskmanager
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U taskmanager"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Production (docker-compose.prod.yml)

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - certbot_data:/var/www/certbot:ro
    depends_on:
      - frontend
      - backend
    restart: always

  frontend:
    image: ${DOCKER_REGISTRY}/taskmanager-frontend:${VERSION:-latest}
    restart: always

  backend:
    image: ${DOCKER_REGISTRY}/taskmanager-backend:${VERSION:-latest}
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - JWT_SECRET=${JWT_SECRET}
      - GIN_MODE=release
    depends_on:
      postgres:
        condition: service_healthy
    restart: always

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always

  certbot:
    image: certbot/certbot
    volumes:
      - certbot_data:/var/www/certbot
      - ./nginx/ssl:/etc/letsencrypt

volumes:
  postgres_data:
  certbot_data:
```

---

## Nginx Configuration

### Production (nginx/nginx.prod.conf)

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # Upstream servers
    upstream backend {
        server backend:8080;
    }

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name your-domain.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/live/your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/live/your-domain.com/privkey.pem;

        # SSL settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;

        # Frontend
        location / {
            proxy_pass http://frontend:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # API
        location /api {
            limit_req zone=api burst=20 nodelay;

            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket (if needed)
        location /ws {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
```

---

## CI/CD Pipeline

### GitHub Actions (.github/workflows/deploy.yml)

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  DOCKER_REGISTRY: ghcr.io/${{ github.repository_owner }}

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Run tests
        working-directory: ./backend
        run: |
          go mod download
          go test -v ./...

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install and test
        working-directory: ./frontend
        run: |
          npm ci
          npm run lint
          npm run test -- --run

  build-and-push:
    needs: [test-backend, test-frontend]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ${{ env.DOCKER_REGISTRY }}/taskmanager-backend:latest
            ${{ env.DOCKER_REGISTRY }}/taskmanager-backend:${{ github.sha }}

      - name: Build and push Frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: |
            ${{ env.DOCKER_REGISTRY }}/taskmanager-frontend:latest
            ${{ env.DOCKER_REGISTRY }}/taskmanager-frontend:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/taskmanager

            # Pull latest images
            docker compose -f docker-compose.prod.yml pull

            # Restart services with zero downtime
            docker compose -f docker-compose.prod.yml up -d --remove-orphans

            # Clean up old images
            docker image prune -f

            # Health check
            sleep 10
            curl -f http://localhost/api/health || exit 1
```

---

## Server Setup Script

### scripts/setup-server.sh

```bash
#!/bin/bash
set -e

echo "=== Setting up VPS for Task Manager ==="

# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /opt/taskmanager
cd /opt/taskmanager

# Create .env file
cat > .env << 'EOF'
POSTGRES_USER=taskmanager
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=taskmanager
DATABASE_URL=postgres://taskmanager:CHANGE_ME@postgres:5432/taskmanager?sslmode=disable
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
JWT_SECRET=YOUR_JWT_SECRET
DOCKER_REGISTRY=ghcr.io/YOUR_USERNAME
EOF

echo "=== Setup complete ==="
echo "1. Edit /opt/taskmanager/.env with your secrets"
echo "2. Copy docker-compose.prod.yml and nginx configs"
echo "3. Run: docker compose -f docker-compose.prod.yml up -d"
```

---

## Backup Strategy

### scripts/backup.sh

```bash
#!/bin/bash
BACKUP_DIR="/opt/taskmanager/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
docker exec taskmanager-postgres-1 pg_dump -U taskmanager taskmanager | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Keep only last 7 days
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete

echo "Backup completed: db_$DATE.sql.gz"
```

### Cron job
```
0 3 * * * /opt/taskmanager/scripts/backup.sh >> /var/log/taskmanager-backup.log 2>&1
```

---

## Monitoring

### Health Check Endpoint

```go
// backend/internal/handler/health.go
func (h *Handler) Health(c *gin.Context) {
    // Check database
    if err := h.db.Ping(); err != nil {
        c.JSON(503, gin.H{"status": "unhealthy", "db": "down"})
        return
    }

    c.JSON(200, gin.H{
        "status": "healthy",
        "version": version,
        "uptime": time.Since(startTime).String(),
    })
}
```

### Suggested Tools
- **Metrics**: Prometheus + Grafana
- **Logs**: Loki or simple Docker logs
- **Uptime**: UptimeRobot (free tier)
- **Alerts**: Telegram bot notifications on errors
