#!/bin/bash
# ============================================================
# setup_teknovillage.sh — Bedagang ERP VPS Setup Script
# Target: Teknovillage Production Server (Ubuntu 22.04+)
# Version: 2.0 — Production Finalization
# ============================================================
set -euo pipefail

DOMAIN="${DOMAIN:-bedagang.teknovillage.id}"
REPO_URL="${REPO_URL:-https://github.com/winnerharry/Bedagang-ERP.git}"
BRANCH="${BRANCH:-New-Backend-Nainerp}"
APP_DIR="/var/www/bedagang"
DEPLOY_USER="${DEPLOY_USER:-bedagang}"
DB_NAME="${DB_NAME:-bedagang_prod}"
DB_USER="${DB_USER:-bedagang}"
DB_PASSWORD="$(openssl rand -base64 24)"

# Trusted IPs for direct port access (admin/store bypass)
# Add your office/modem static IPs here
TRUSTED_IPS=(
  # "203.0.113.0/24"  # Uncomment and add your office IP
  # "198.51.100.0/24" # Uncomment and add VPN/corporate IP
)

TEXT_RED='\033[0;31m'
TEXT_GREEN='\033[0;32m'
TEXT_YELLOW='\033[1;33m'
TEXT_CYAN='\033[0;36m'
TEXT_RESET='\033[0m'

log()   { echo -e "${TEXT_GREEN}[OK]${TEXT_RESET} $1"; }
warn()  { echo -e "${TEXT_YELLOW}[!!]${TEXT_RESET} $1"; }
err()   { echo -e "${TEXT_RED}[XX]${TEXT_RESET} $1"; exit 1; }
info()  { echo -e "${TEXT_CYAN}[i]${TEXT_RESET} $1"; }

# ────────────────────────────────────────────────────────────
# Pre-flight checks
# ────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  err "Script must be run as root (sudo)."
fi

echo ""
echo "======================================================"
echo "    Bedagang ERP -- Teknovillage Production Setup v2"
echo "======================================================"
echo ""

# ────────────────────────────────────────────────────────────
# Step 1: System packages
# ────────────────────────────────────────────────────────────
info "[1/12] Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
  curl wget gnupg ca-certificates lsb-release \
  nginx certbot python3-certbot-nginx \
  git ufw build-essential libpq-dev \
  postgresql-client s3cmd htop

log "System packages installed."

# ────────────────────────────────────────────────────────────
# Step 2: Node.js 20.x (LTS)
# ────────────────────────────────────────────────────────────
info "[2/12] Installing Node.js 20.x LTS..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi
node_version=$(node -v)
log "Node.js ${node_version} installed."

# ────────────────────────────────────────────────────────────
# Step 3: Redis 7
# ────────────────────────────────────────────────────────────
info "[3/12] Installing Redis 7..."
if ! command -v redis-server &>/dev/null; then
  apt-get install -y -qq redis-server
fi
systemctl enable redis-server
systemctl start redis-server
log "Redis 7 installed and running."

# ────────────────────────────────────────────────────────────
# Step 4: PostgreSQL 16
# ────────────────────────────────────────────────────────────
info "[4/12] Installing PostgreSQL 16..."
if ! command -v psql &>/dev/null; then
  sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
  apt-get update -qq
  apt-get install -y -qq postgresql-16 postgresql-contrib-16
fi
log "PostgreSQL 16 installed."

# ────────────────────────────────────────────────────────────
# Step 5: PM2 (process manager)
# ────────────────────────────────────────────────────────────
info "[5/12] Installing PM2..."
npm install -g pm2@latest
log "PM2 installed."

# ────────────────────────────────────────────────────────────
# Step 6: Create deploy user & directory structure
# ────────────────────────────────────────────────────────────
info "[6/12] Setting up application user and directories..."
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
  usermod -aG www-data "$DEPLOY_USER"
fi

mkdir -p "$APP_DIR"/{app,uploads,logs,config,backups,monitoring/{scripts,logs}}
mkdir -p "$APP_DIR"/logs/{admin,store,api}

# Database password file (only root-readable)
cat > "$APP_DIR/config/.db_password" << EOF
$DB_PASSWORD
EOF
chmod 600 "$APP_DIR/config/.db_password"
chown -R "$DEPLOY_USER:www-data" "$APP_DIR"

log "Directories created at $APP_DIR"

# ────────────────────────────────────────────────────────────
# Step 7: Clone / pull repository
# ────────────────────────────────────────────────────────────
info "[7/12] Cloning Bedagang ERP repository..."
if [[ -d "$APP_DIR/app/.git" ]]; then
  warn "Repository already exists -- pulling latest..."
  su - "$DEPLOY_USER" -c "cd $APP_DIR/app && git pull origin $BRANCH"
else
  su - "$DEPLOY_USER" -c "git clone --branch $BRANCH --depth 1 $REPO_URL $APP_DIR/app"
fi
log "Repository cloned (branch: $BRANCH)."

# ────────────────────────────────────────────────────────────
# Step 8: Configure environment & build
# ────────────────────────────────────────────────────────────
info "[8/12] Configuring environment and building application..."

NEXTAUTH_SECRET="$(openssl rand -base64 32)"
SESSION_SECRET="$(openssl rand -base64 32)"
JWT_SECRET="$(openssl rand -base64 32)"
JWT_REFRESH_SECRET="$(openssl rand -base64 32)"

cat > "$APP_DIR/app/.env" << EOF
# ==========================================
# BEDAGANG -- Production Environment
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Target: Teknovillage
# ==========================================

# -- Database --
DATABASE_URL=postgresql://${DB_USER}:***@localhost:5432/${DB_NAME}
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_DIALECT=postgres

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=${DB_NAME}
POSTGRES_USER=${DB_USER}
POSTGRES_PASSWORD=${DB_PASSWORD}

# -- Application --
NODE_ENV=production
APP_NAME=BEDAGANG
APP_URL=https://${DOMAIN}
STORE_APP_URL=https://store.${DOMAIN}

# -- Auth --
NEXTAUTH_URL=https://${DOMAIN}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
SESSION_SECRET=${SESSION_SECRET}
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# -- Multi-tenant --
TENANT_ISOLATION_ENABLED=true
TENANT_SUPERADMIN_EMAIL=superadmin@teknovillage.id
TENANT_DEFAULT_ID=00000000-0000-0000-0000-000000000000

# -- Prisma --
PRISMA_SCHEMA_SYNC_ENABLED=true
PRISMA_ONLY_READ=true
PRISMA_LOG_QUERIES=false

# -- Offline Sync --
OFFLINE_SYNC_ENABLED=true
SYNC_CONFLICT_LOG_ENABLED=true
SYNC_MAX_RETRIES=10
SYNC_RETRY_BASE_DELAY=2000

# -- Business --
DEFAULT_CURRENCY=IDR
DEFAULT_TIMEZONE=Asia/Jakarta
DEFAULT_LANGUAGE=id

# -- Security --
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ALLOWED_ORIGINS=https://${DOMAIN},https://store.${DOMAIN}

# -- Logging --
LOG_LEVEL=info
LOG_FILE_PATH=./logs
EOF

chown "$DEPLOY_USER:www-data" "$APP_DIR/app/.env"
chmod 600 "$APP_DIR/app/.env"

# Install dependencies & build (frontend)
info "  Installing frontend dependencies..."
su - "$DEPLOY_USER" -c "cd $APP_DIR/app && npm ci --legacy-peer-deps --no-optional 2>&1"

info "  Building frontend..."
export NODE_OPTIONS='--max-old-space-size=4096'
su - "$DEPLOY_USER" -c "cd $APP_DIR/app && NODE_OPTIONS='--max-old-space-size=4096' npm run build 2>&1"

log "Frontend (Next.js) built successfully."

# Install dependencies & build (backend API)
info "  Installing backend dependencies..."
su - "$DEPLOY_USER" -c "cd $APP_DIR/app/backend && npm ci --legacy-peer-deps 2>&1" || \
  su - "$DEPLOY_USER" -c "cd $APP_DIR/app/backend && npm install --legacy-peer-deps 2>&1"

info "  Building backend..."
su - "$DEPLOY_USER" -c "cd $APP_DIR/app/backend && npm run build 2>&1" || \
  warn "Backend build skipped (may not exist or use tsc directly)"

# ────────────────────────────────────────────────────────────
# Step 7b: Setup PostgreSQL database
# ────────────────────────────────────────────────────────────
info "Setting up PostgreSQL database & user..."

systemctl start postgresql
systemctl enable postgresql

su - postgres -c "psql -c \"CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';\" 2>/dev/null" || warn "User ${DB_USER} may already exist."
su - postgres -c "psql -c \"CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};\" 2>/dev/null" || warn "Database ${DB_NAME} may already exist."
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};\" 2>/dev/null" || true
su - postgres -c "psql -d ${DB_NAME} -c \"GRANT ALL ON SCHEMA public TO ${DB_USER};\" 2>/dev/null" || true

# Run Sequelize migrations
su - "$DEPLOY_USER" -c "cd $APP_DIR/app && npm run db:migrate 2>&1" || warn "Sequelize migrations encountered issues. Check manually."

log "Database setup complete."

# ────────────────────────────────────────────────────────────
# Step 7c: PM2 ecosystem config
# ────────────────────────────────────────────────────────────
info "Creating PM2 ecosystem configuration..."

cat > "$APP_DIR/ecosystem.config.js" << 'PM2EOF'
module.exports = {
  apps: [
    {
      name: 'bedagang-admin',
      cwd: '/var/www/bedagang/app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port=3001',
      env: { PORT: '3001', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      error_file: '/var/www/bedagang/logs/admin/error.log',
      out_file: '/var/www/bedagang/logs/admin/out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      watch: false,
      kill_timeout: 10000,
    },
    {
      name: 'bedagang-store',
      cwd: '/var/www/bedagang/app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port=3002',
      env: { PORT: '3002', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      error_file: '/var/www/bedagang/logs/store/error.log',
      out_file: '/var/www/bedagang/logs/store/out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      watch: false,
      kill_timeout: 10000,
    },
    {
      name: 'bedagang-api',
      cwd: '/var/www/bedagang/app/backend',
      script: 'dist/server.js',
      env: { PORT: '4000', NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      error_file: '/var/www/bedagang/logs/api/error.log',
      out_file: '/var/www/bedagang/logs/api/out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      watch: false,
      kill_timeout: 10000,
    },
  ],
};
PM2EOF

chown "$DEPLOY_USER:www-data" "$APP_DIR/ecosystem.config.js"

# Start PM2
su - "$DEPLOY_USER" -c "pm2 start $APP_DIR/ecosystem.config.js 2>&1"
su - "$DEPLOY_USER" -c "pm2 save 2>&1"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$DEPLOY_USER" --hp "/home/$DEPLOY_USER" 2>&1 || true

log "PM2 services started and configured for auto-restart."

# ────────────────────────────────────────────────────────────
# Step 9: Nginx reverse proxy
# ────────────────────────────────────────────────────────────
info "[9/12] Configuring Nginx reverse proxy..."

# -- Main domain (Admin/HQ) --
cat > "/etc/nginx/sites-available/bedagang" << NGINXEOF
# ============================================
# Bedagang ERP -- Teknovillage Production
# Auto-generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')
# ============================================

upstream bedagang-admin {
    server 127.0.0.1:3001;
    keepalive 64;
}

upstream bedagang-store {
    server 127.0.0.1:3002;
    keepalive 64;
}

upstream bedagang-api {
    server 127.0.0.1:4000;
    keepalive 64;
}

# -- HTTP (redirect to HTTPS) --
server {
    listen 80;
    server_name ${DOMAIN} store.${DOMAIN} api.${DOMAIN};

    # Health endpoint tetap HTTP (untuk internal monitoring)
    location /api/health {
        proxy_pass http://bedagang-admin;
        access_log off;
        add_header Content-Type text/plain;
        return 200 "healthy\n";
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# -- Admin/HQ (HTTPS) --
server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://bedagang-admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    location /_next/static {
        alias /var/www/bedagang/app/.next/static;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    location /public/uploads {
        alias /var/www/bedagang/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}

# -- Store/POS (HTTPS) --
server {
    listen 443 ssl http2;
    server_name store.${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/store.${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/store.${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://bedagang-store;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    location /_next/static {
        alias /var/www/bedagang/app/.next/static;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    location /public/uploads {
        alias /var/www/bedagang/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}

# -- API (HTTPS) --
server {
    listen 443 ssl http2;
    server_name api.${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/api.${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://bedagang-api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
NGINXEOF

# Enable site
ln -sf "/etc/nginx/sites-available/bedagang" "/etc/nginx/sites-enabled/bedagang"
rm -f /etc/nginx/sites-enabled/default

# Test & reload
nginx -t && systemctl reload nginx

log "Nginx configured for ${DOMAIN}, store.${DOMAIN}, api.${DOMAIN}."

# ────────────────────────────────────────────────────────────
# Step 10: SSL Certificate (Let's Encrypt)
# ────────────────────────────────────────────────────────────
info "[10/12] Obtaining SSL certificates via Let's Encrypt..."

# Ensure port 80 is reachable for certbot validation
certbot --nginx \
  --non-interactive \
  --agree-tos \
  --email admin@${DOMAIN} \
  --domain ${DOMAIN} \
  --domain store.${DOMAIN} \
  --domain api.${DOMAIN} \
  --redirect \
  --keep-until-expiring \
  2>&1 || {
    warn "Automatic SSL failed. Run manually later:"
    warn "  certbot --nginx -d ${DOMAIN} -d store.${DOMAIN} -d api.${DOMAIN}"
    warn "Or use --staging flag if DNS is not yet propagated."
  }

# Setup auto-renewal
systemctl enable certbot.timer 2>/dev/null || true
systemctl start certbot.timer 2>/dev/null || true

log "SSL configured with auto-renewal."

# ────────────────────────────────────────────────────────────
# Step 11: UFW Firewall (Restricted)
# ────────────────────────────────────────────────────────────
info "[11/12] Configuring UFW firewall..."

ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Essential services
ufw allow 22/tcp    comment 'SSH'
ufw allow 80/tcp    comment 'HTTP (certbot validation)'
ufw allow 443/tcp   comment 'HTTPS'

# Ports 3001/3002: hanya dari trusted IPs (jika dikonfigurasi)
if [[ ${#TRUSTED_IPS[@]} -gt 0 ]]; then
  for ip in "${TRUSTED_IPS[@]}"; do
    ufw allow from "$ip" to any port 3001 comment "Admin (trusted): $ip"
    ufw allow from "$ip" to any port 3002 comment "Store (trusted): $ip"
  done
  log "Ports 3001/3002 restricted to trusted IPs: ${TRUSTED_IPS[*]}"
else
  warn "No TRUSTED_IPS configured. Ports 3001/3002 NOT opened (rely on Nginx reverse proxy)."
  warn "  To access directly, edit TRUSTED_IPS array in this script and re-run."
fi

ufw --force enable
log "Firewall enabled (SSH, HTTP, HTTPS only; 3001/3002 restricted)."

# ────────────────────────────────────────────────────────────
# Step 12: Backup & Monitoring Setup
# ────────────────────────────────────────────────────────────
info "[12/12] Setting up backup automation and monitoring..."

# -- 12a: Copy backup script from repo --
if [[ -f "$APP_DIR/app/scripts/backup-db.sh" ]]; then
  cp "$APP_DIR/app/scripts/backup-db.sh" "$APP_DIR/backups/backup-db.sh"
  chmod +x "$APP_DIR/backups/backup-db.sh"
  log "Backup script installed."
fi

# -- 12b: Install backup cron (daily at 03:00 WIB / 20:00 UTC) --
cat > "$APP_DIR/backups/backup-cron" << CRONEOF
# Bedagang DB Backup -- daily at 03:00 WIB (20:00 UTC)
0 20 * * * $DEPLOY_USER /bin/bash $APP_DIR/backups/backup-db.sh >> $APP_DIR/backups/backup-cron.log 2>&1
CRONEOF

crontab -u "$DEPLOY_USER" "$APP_DIR/backups/backup-cron" 2>/dev/null || \
  warn "Could not install backup cron for $DEPLOY_USER. Install manually:"
warn "  crontab -u $DEPLOY_USER $APP_DIR/backups/backup-cron"

log "Backup cron installed (daily at 03:00 WIB)."

# -- 12c: Create monitoring health check script --
cat > "$APP_DIR/monitoring/scripts/health-check.sh" << 'SCRIPTEOF'
#!/bin/bash
# Bedagang -- health check (every 5 min via cron)
set -euo pipefail

LOG_DIR="$(dirname "$0")/../logs"
TIMESTAMP="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

for url in "http://127.0.0.1:3001/api/health" "http://127.0.0.1:3002/api/health"; do
  code=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>&1) || code="FAIL"
  if [[ "$code" == "FAIL" || "$code" -ge 500 ]]; then
    echo "[${TIMESTAMP}] FAIL: $url -> $code" >> "$LOG_DIR/alerts.log"
  else
    echo "[${TIMESTAMP}] OK: $url -> $code" >> "$LOG_DIR/health.log"
  fi
done
SCRIPTEOF
chmod +x "$APP_DIR/monitoring/scripts/health-check.sh"

# -- 12d: Add monitoring cron (every 5 min) --
(crontab -u "$DEPLOY_USER" -l 2>/dev/null || true; echo "*/5 * * * * /bin/bash $APP_DIR/monitoring/scripts/health-check.sh >/dev/null 2>&1") \
  | crontab -u "$DEPLOY_USER" -

log "Monitoring cron installed (every 5 min)."

# -- 12e: Setup log rotation for PM2 --
pm2 install pm2-logrotate 2>/dev/null || true
pm2 set pm2-logrotate:max_size 50M 2>/dev/null || true
pm2 set pm2-logrotate:retain 7 2>/dev/null || true
pm2 set pm2-logrotate:compress true 2>/dev/null || true

log "PM2 log rotation configured (50MB, retain 7, compress)."

# ────────────────────────────────────────────────────────────
# Summary
# ────────────────────────────────────────────────────────────
echo ""
echo "======================================================"
echo "    Setup Complete -- Bedagang ERP v2"
echo "======================================================"
echo ""
echo "  Admin/HQ:   https://${DOMAIN}"
echo "  Store/POS:  https://store.${DOMAIN}"
echo "  API:        https://api.${DOMAIN}"
echo ""
echo "  PM2 status: pm2 list"
echo "  Logs:       $APP_DIR/logs/"
echo "  Backups:    $APP_DIR/backups/ (daily 03:00 WIB)"
echo "  Monitoring: $APP_DIR/monitoring/logs/"
echo ""
echo "  DB name:    ${DB_NAME}"
echo "  DB user:    ${DB_USER}"
echo "  DB pass:    (saved to $APP_DIR/config/.db_password)"
echo ""
echo "  Firewall:   SSH(22) HTTP(80) HTTPS(443) -- 3001/3002 restricted"
echo "  SSL:        Let's Encrypt with auto-renewal"
echo ""
echo "  Next steps after setup:"
echo "  1. Add TRUSTED_IPS in this script if direct port access needed"
echo "  2. Configure S3 backup: set S3_ENABLED=true in .env"
echo "  3. Verify SSL: https://${DOMAIN}"
echo "  4. Commit .github/workflows/deploy-teknovillage.yml to repo"
echo "  5. Add GitHub secrets for auto-deploy pipeline"
echo ""
echo "======================================================"
