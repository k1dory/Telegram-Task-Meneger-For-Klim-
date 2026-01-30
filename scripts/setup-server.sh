#!/bin/bash
#
# Server Setup Script for Telegram Task Manager
# Run this script on a fresh Ubuntu 22.04+ VPS
#
# Usage: sudo bash setup-server.sh [domain]
# Example: sudo bash setup-server.sh taskmanager.example.com
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/opt/taskmanager"
APP_USER="taskmanager"
DOMAIN="${1:-localhost}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run this script as root (use sudo)"
    exit 1
fi

echo "=============================================="
echo "  Telegram Task Manager - Server Setup"
echo "=============================================="
echo ""
log_info "Domain: $DOMAIN"
log_info "App directory: $APP_DIR"
echo ""

# ===========================================
# 1. System Update
# ===========================================
log_info "Updating system packages..."
apt-get update
apt-get upgrade -y
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    net-tools \
    ufw \
    fail2ban \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release

log_success "System packages updated"

# ===========================================
# 2. Create App User
# ===========================================
log_info "Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -s /bin/bash -d "$APP_DIR" "$APP_USER"
    log_success "User '$APP_USER' created"
else
    log_warning "User '$APP_USER' already exists"
fi

# ===========================================
# 3. Install Docker
# ===========================================
log_info "Installing Docker..."
if ! command -v docker &>/dev/null; then
    # Remove old versions
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Set up repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Enable and start Docker
    systemctl enable docker
    systemctl start docker

    # Add app user to docker group
    usermod -aG docker "$APP_USER"

    log_success "Docker installed"
else
    log_warning "Docker already installed"
fi

# Verify Docker
docker --version
docker compose version

# ===========================================
# 4. Configure Firewall
# ===========================================
log_info "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (important! Don't lock yourself out)
ufw allow ssh
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw --force enable
log_success "Firewall configured"

# ===========================================
# 5. Configure Fail2ban
# ===========================================
log_info "Configuring Fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
ignoreip = 127.0.0.1/8

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400
EOF

systemctl enable fail2ban
systemctl restart fail2ban
log_success "Fail2ban configured"

# ===========================================
# 6. Create Application Directory
# ===========================================
log_info "Creating application directory..."
mkdir -p "$APP_DIR"/{nginx,scripts,backups,logs}
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
chmod 750 "$APP_DIR"
log_success "Application directory created"

# ===========================================
# 7. Create Environment File
# ===========================================
log_info "Creating environment configuration..."
if [ ! -f "$APP_DIR/.env" ]; then
    # Generate secure secrets
    JWT_SECRET=$(openssl rand -hex 32)
    POSTGRES_PASSWORD=$(openssl rand -hex 16)

    cat > "$APP_DIR/.env" << EOF
# ===========================================
# Telegram Task Manager - Production Config
# Generated: $(date)
# ===========================================

# Domain
DOMAIN=${DOMAIN}

# PostgreSQL
POSTGRES_USER=taskmanager
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=taskmanager
DATABASE_URL=postgres://taskmanager:${POSTGRES_PASSWORD}@postgres:5432/taskmanager?sslmode=disable

# Application
JWT_SECRET=${JWT_SECRET}
GIN_MODE=release
API_PORT=8080

# Telegram (MUST BE FILLED MANUALLY)
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE

# Docker Registry
DOCKER_REGISTRY=ghcr.io/YOUR_GITHUB_USERNAME
VERSION=latest

# Notifications
NOTIFICATION_CHECK_INTERVAL=30m
EOF

    chmod 600 "$APP_DIR/.env"
    chown "$APP_USER":"$APP_USER" "$APP_DIR/.env"
    log_success "Environment file created"
else
    log_warning ".env file already exists, skipping"
fi

# ===========================================
# 8. Create Systemd Service
# ===========================================
log_info "Creating systemd service..."
cat > /etc/systemd/system/taskmanager.service << EOF
[Unit]
Description=Telegram Task Manager
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
ExecReload=/usr/bin/docker compose -f docker-compose.prod.yml restart
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable taskmanager.service
log_success "Systemd service created"

# ===========================================
# 9. Setup Log Rotation
# ===========================================
log_info "Configuring log rotation..."
cat > /etc/logrotate.d/taskmanager << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 640 $APP_USER $APP_USER
    sharedscripts
    postrotate
        docker compose -f $APP_DIR/docker-compose.prod.yml exec -T nginx nginx -s reload > /dev/null 2>&1 || true
    endscript
}
EOF
log_success "Log rotation configured"

# ===========================================
# 10. Setup Backup Cron Job
# ===========================================
log_info "Setting up backup cron job..."
cat > /etc/cron.d/taskmanager-backup << EOF
# Daily backup at 3:00 AM
0 3 * * * $APP_USER $APP_DIR/scripts/backup.sh >> $APP_DIR/logs/backup.log 2>&1
EOF

chmod 644 /etc/cron.d/taskmanager-backup
log_success "Backup cron job configured"

# ===========================================
# 11. Install SSL Certificate (Let's Encrypt)
# ===========================================
if [ "$DOMAIN" != "localhost" ]; then
    log_info "Setting up SSL certificate..."

    # Create temporary nginx for certbot
    mkdir -p "$APP_DIR/certbot"

    # Install certbot
    apt-get install -y certbot

    log_warning "SSL certificate setup requires manual steps:"
    echo ""
    echo "After copying docker-compose.prod.yml and nginx configs, run:"
    echo ""
    echo "  1. Start nginx without SSL first:"
    echo "     docker compose -f docker-compose.prod.yml up -d nginx"
    echo ""
    echo "  2. Obtain certificate:"
    echo "     certbot certonly --webroot -w /var/lib/docker/volumes/taskmanager_certbot_webroot/_data -d $DOMAIN"
    echo ""
    echo "  3. Update nginx config with SSL and restart:"
    echo "     docker compose -f docker-compose.prod.yml restart nginx"
    echo ""
fi

# ===========================================
# 12. Security Hardening
# ===========================================
log_info "Applying security hardening..."

# Disable root SSH login (be careful with this!)
# Uncomment the following lines after setting up SSH keys
# sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
# sed -i 's/^#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
# systemctl restart sshd

# Kernel hardening
cat > /etc/sysctl.d/99-security.conf << EOF
# IP Spoofing protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Ignore ICMP broadcast requests
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Disable source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Ignore send redirects
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Block SYN attacks
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# Log Martians
net.ipv4.conf.all.log_martians = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
EOF

sysctl -p /etc/sysctl.d/99-security.conf
log_success "Security hardening applied"

# ===========================================
# Print Summary
# ===========================================
echo ""
echo "=============================================="
echo "  Setup Complete!"
echo "=============================================="
echo ""
log_success "Server has been configured successfully"
echo ""
echo "Next steps:"
echo ""
echo "  1. Edit the environment file:"
echo "     ${YELLOW}nano $APP_DIR/.env${NC}"
echo "     - Set TELEGRAM_BOT_TOKEN"
echo "     - Set DOCKER_REGISTRY to your GitHub username"
echo ""
echo "  2. Copy configuration files to the server:"
echo "     - docker-compose.prod.yml"
echo "     - nginx/nginx.prod.conf"
echo "     - scripts/backup.sh"
echo ""
echo "  3. Login to GitHub Container Registry:"
echo "     ${YELLOW}docker login ghcr.io -u YOUR_USERNAME${NC}"
echo ""
echo "  4. Start the application:"
echo "     ${YELLOW}cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d${NC}"
echo ""
echo "  5. Check status:"
echo "     ${YELLOW}docker compose -f docker-compose.prod.yml ps${NC}"
echo "     ${YELLOW}docker compose -f docker-compose.prod.yml logs -f${NC}"
echo ""

if [ "$DOMAIN" != "localhost" ]; then
    echo "  6. Setup SSL certificate (see instructions above)"
    echo ""
fi

echo "Useful commands:"
echo "  - View logs:     docker compose -f docker-compose.prod.yml logs -f"
echo "  - Restart:       systemctl restart taskmanager"
echo "  - Manual backup: $APP_DIR/scripts/backup.sh"
echo ""
log_info "Server IP: $(curl -s ifconfig.me 2>/dev/null || echo 'unable to detect')"
echo ""
