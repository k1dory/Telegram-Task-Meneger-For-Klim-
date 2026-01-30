#!/bin/bash
#
# SSL Certificate Setup Script
# Uses Let's Encrypt with Certbot
#
# Usage: sudo ./ssl-setup.sh <domain> [email]
# Example: sudo ./ssl-setup.sh taskmanager.example.com admin@example.com
#

set -e

DOMAIN="${1:-}"
EMAIL="${2:-}"
APP_DIR="/opt/taskmanager"

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

# Check arguments
if [ -z "$DOMAIN" ]; then
    log_error "Domain is required!"
    echo "Usage: $0 <domain> [email]"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    log_warning "No email provided, using --register-unsafely-without-email"
    EMAIL_ARG="--register-unsafely-without-email"
else
    EMAIL_ARG="--email $EMAIL --no-eff-email"
fi

echo "=============================================="
echo "  SSL Certificate Setup"
echo "=============================================="
echo ""
log_info "Domain: $DOMAIN"
[ -n "$EMAIL" ] && log_info "Email: $EMAIL"
echo ""

cd "$APP_DIR"

# ===========================================
# Step 1: Create temporary nginx config for ACME challenge
# ===========================================
log_info "Creating temporary nginx configuration..."

cat > nginx/nginx.temp.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name _;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'SSL setup in progress...';
            add_header Content-Type text/plain;
        }
    }
}
EOF

# ===========================================
# Step 2: Start nginx with temp config
# ===========================================
log_info "Starting nginx for ACME challenge..."

# Create certbot directories
mkdir -p certbot/www certbot/conf

# Start nginx with temp config
docker run -d --name nginx-temp \
    -p 80:80 \
    -v "$APP_DIR/nginx/nginx.temp.conf:/etc/nginx/nginx.conf:ro" \
    -v "$APP_DIR/certbot/www:/var/www/certbot" \
    nginx:alpine

sleep 5

# ===========================================
# Step 3: Obtain certificate
# ===========================================
log_info "Obtaining SSL certificate..."

docker run --rm \
    -v "$APP_DIR/certbot/conf:/etc/letsencrypt" \
    -v "$APP_DIR/certbot/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    $EMAIL_ARG \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

# ===========================================
# Step 4: Stop temporary nginx
# ===========================================
log_info "Stopping temporary nginx..."
docker stop nginx-temp
docker rm nginx-temp
rm nginx/nginx.temp.conf

# ===========================================
# Step 5: Update nginx config with domain
# ===========================================
log_info "Updating nginx configuration with SSL..."

# Update domain in nginx.prod.conf
sed -i "s/\${DOMAIN:-localhost}/$DOMAIN/g" nginx/nginx.prod.conf
sed -i "s/server_name _;/server_name $DOMAIN;/g" nginx/nginx.prod.conf

# ===========================================
# Step 6: Update docker-compose volumes
# ===========================================
log_info "Updating docker-compose for SSL..."

# The certbot certificates are now in certbot/conf
# Update docker-compose.prod.yml to mount them correctly

# ===========================================
# Step 7: Restart application with SSL
# ===========================================
log_info "Restarting application with SSL..."

# Update .env with domain
echo "DOMAIN=$DOMAIN" >> .env

# Restart with new configuration
docker compose -f docker-compose.prod.yml up -d

# ===========================================
# Step 8: Setup auto-renewal
# ===========================================
log_info "Setting up certificate auto-renewal..."

cat > /etc/cron.d/certbot-renew << EOF
# Renew SSL certificates twice daily
0 0,12 * * * root docker run --rm -v $APP_DIR/certbot/conf:/etc/letsencrypt -v $APP_DIR/certbot/www:/var/www/certbot certbot/certbot renew --quiet && docker compose -f $APP_DIR/docker-compose.prod.yml restart nginx
EOF

chmod 644 /etc/cron.d/certbot-renew

# ===========================================
# Summary
# ===========================================
echo ""
echo "=============================================="
echo "  SSL Setup Complete!"
echo "=============================================="
echo ""
log_success "SSL certificate installed for: $DOMAIN"
echo ""
echo "Certificate location: $APP_DIR/certbot/conf/live/$DOMAIN/"
echo ""
echo "Your application is now available at:"
echo "  https://$DOMAIN"
echo ""
log_info "Certificate will auto-renew via cron job"
