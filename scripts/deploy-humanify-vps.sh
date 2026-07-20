#!/usr/bin/env bash
# Deploy Humanify HRIS to VPS
#
# Deploy via IP (default):
#   VPS_HOST=103.92.215.37 VPS_USER=root VPS_PASS='...' bash scripts/deploy-humanify-vps.sh
#
# Deploy dengan domain humanify.id (+ Certbot SSL di origin):
#   VPS_HOST=103.92.215.37 VPS_USER=root VPS_PASS='...' \
#   DOMAIN=humanify.id CERTBOT_EMAIL=admin@humanify.id \
#   bash scripts/deploy-humanify-vps.sh
#
# Deploy dengan Cloudflare SSL (tanpa Certbot — SSL di edge Cloudflare):
#   VPS_HOST=103.92.215.37 VPS_USER=root VPS_PASS='...' \
#   DOMAIN=humanify.id CLOUDFLARE_SSL=true \
#   bash scripts/deploy-humanify-vps.sh
#
# Atau hanya setup Cloudflare di VPS yang sudah jalan:
#   DOMAIN=humanify.id VPS_PASS='...' bash scripts/setup-humanify-cloudflare.sh
#
# Deploy staging slot (Wave-58):
#   bash scripts/deploy-humanify-staging-vps.sh
#   (DNS: A staging → VPS_HOST; Cloudflare SSL recommended)
#
# Deploy dengan SSH key (tanpa sshpass):
#   VPS_SSH_KEY=~/.ssh/id_ed25519 VPS_HOST=... bash scripts/deploy-humanify-vps.sh
#
# Pastikan DNS A record @ dan www → VPS_HOST sebelum deploy domain.
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
APP_SRC="${APP_SRC:-$SRC}"
VPS_HOST="${VPS_HOST:-103.92.215.37}"
VPS_USER="${VPS_USER:-root}"
HUMANIFY_PM2_NAME="${HUMANIFY_PM2_NAME:-humanify}"
HUMANIFY_PORT="${HUMANIFY_PORT:-3020}"
NGINX_SITE="${NGINX_SITE:-humanify}"
ECOSYSTEM_FILE="${ECOSYSTEM_FILE:-humanify-ecosystem.config.cjs}"
HUMANIFY_DB_NAME="${HUMANIFY_DB_NAME:-humanify}"
HUMANIFY_DEPLOY_SLOT="${HUMANIFY_DEPLOY_SLOT:-production}"
if [[ "$VPS_USER" == "root" ]]; then
  APP_DIR="${APP_DIR:-/root/humanify}"
else
  APP_DIR="${APP_DIR:-/home/$VPS_USER/humanify}"
fi
DOMAIN="${DOMAIN:-$VPS_HOST}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@${DOMAIN#www.}}"
CLOUDFLARE_SSL="${CLOUDFLARE_SSL:-false}"
ENABLE_SSL="${ENABLE_SSL:-true}"
if [ "$CLOUDFLARE_SSL" = true ]; then
  ENABLE_SSL=false
fi

is_ip() { [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; }
USE_DOMAIN=false
if ! is_ip "$DOMAIN"; then
  USE_DOMAIN=true
fi

SSHPASS_PATH="$(command -v sshpass || true)"
if [ -n "${VPS_SSH_KEY:-}" ]; then
  SSH_OPTS=(-o StrictHostKeyChecking=no -o "IdentityFile=${VPS_SSH_KEY}" -o PreferredAuthentications=publickey -o PubkeyAuthentication=yes -o ServerAliveInterval=60 -o ServerAliveCountMax=120)
  ssh_cmd() { ssh "${SSH_OPTS[@]}" "$VPS_USER@$VPS_HOST" "$@"; }
  scp_cmd() { scp "${SSH_OPTS[@]}" "$@"; }
  rsync_cmd() { rsync -az "$@" -e "ssh ${SSH_OPTS[*]}"; }
elif [ -n "${VPS_PASS:-}" ] && [ -n "$SSHPASS_PATH" ]; then
  SSH_OPTS=(-o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no -o ServerAliveInterval=60 -o ServerAliveCountMax=120)
  ssh_cmd() { sshpass -p "$VPS_PASS" ssh "${SSH_OPTS[@]}" "$VPS_USER@$VPS_HOST" "$@"; }
  scp_cmd() { sshpass -p "$VPS_PASS" scp "${SSH_OPTS[@]}" "$@"; }
  rsync_cmd() { sshpass -p "$VPS_PASS" rsync -az "$@" -e "ssh ${SSH_OPTS[*]}"; }
else
  echo "ERROR: Set VPS_SSH_KEY or VPS_PASS (with sshpass installed)."
  exit 1
fi

if [ "$USE_DOMAIN" = true ]; then
  echo "=== DNS pre-check: $DOMAIN → $VPS_HOST ==="
  RESOLVED="$(dig +short "$DOMAIN" 2>/dev/null | grep -E '^[0-9]+\.' | head -1 || true)"
  WWW_RESOLVED="$(dig +short "www.$DOMAIN" 2>/dev/null | grep -E '^[0-9]+\.' | head -1 || true)"
  if [ -z "$RESOLVED" ]; then
    echo "⚠️  $DOMAIN belum punya A record. Tambahkan di panel registrar:"
    echo "     Type A  @   → $VPS_HOST"
    echo "     Type A  www → $VPS_HOST"
    echo "   Deploy tetap lanjut; SSL (certbot) butuh DNS sudah propagate."
  elif [ "$RESOLVED" != "$VPS_HOST" ]; then
    echo "⚠️  $DOMAIN resolve ke $RESOLVED (diharapkan $VPS_HOST)"
  else
    echo "✓ $DOMAIN → $RESOLVED"
  fi
  if [ -n "$WWW_RESOLVED" ] && [ "$WWW_RESOLVED" = "$VPS_HOST" ]; then
    echo "✓ www.$DOMAIN → $WWW_RESOLVED"
  elif [ -z "$WWW_RESOLVED" ]; then
    echo "⚠️  www.$DOMAIN belum punya A record (disarankan untuk SSL)"
  fi
  echo ""
fi

echo "=== [1/6] Sync app to VPS ==="
if [ "${DEPLOY_SKIP_SYNC:-false}" = true ]; then
  echo "  (skip sync — DEPLOY_SKIP_SYNC=true)"
else
ssh_cmd "mkdir -p $APP_DIR"
rsync_cmd --delete \
  --exclude .env --exclude .env.local --exclude .env.*.local \
  --exclude 'public/uploads/' \
  --exclude 'storage/' \
  --filter='protect public/uploads/' \
  --filter='protect storage/' \
  --filter='protect node_modules/' \
  --exclude node_modules --exclude .next --exclude .git \
  "$APP_SRC/" "$VPS_USER@$VPS_HOST:$APP_DIR/"
ssh_cmd "mkdir -p $APP_DIR/storage/employee-documents $APP_DIR/public/uploads/employee-documents"
fi

echo "=== [2/6] Install system packages ==="
if [ "${DEPLOY_SKIP_BOOTSTRAP:-false}" = true ]; then
  echo "  (skip bootstrap — DEPLOY_SKIP_BOOTSTRAP=true)"
else
ssh_cmd "bash -s" <<'REMOTE_BOOT'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
sudo apt-get install -y -qq curl git nginx postgresql postgresql-contrib build-essential

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi

echo "node $(node -v) | npm $(npm -v)"
REMOTE_BOOT
fi

echo "=== [3/6] PostgreSQL + env ==="
if [ "${DEPLOY_SKIP_BOOTSTRAP:-false}" = true ]; then
  echo "  (skip postgres/env — DEPLOY_SKIP_BOOTSTRAP=true)"
else
DB_PASS="$(openssl rand -hex 16)"
AUTH_SECRET="$(openssl rand -base64 32)"
SESSION_SECRET="$(openssl rand -base64 32)"
JWT_SECRET="$(openssl rand -base64 32)"

# Preserve existing .env on redeploy (jangan reset password DB)
ENV_EXISTS=$(ssh_cmd "test -f $APP_DIR/.env && echo yes || echo no")

ssh_cmd "bash -s" <<REMOTE_DB
set -euo pipefail
if [ "$ENV_EXISTS" = "yes" ]; then
  DB_PASS=\$(grep '^DB_PASSWORD=' $APP_DIR/.env | cut -d= -f2-)
  echo "  (preserving existing DB password)"
else
  DB_PASS='$DB_PASS'
fi
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='humanify'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER humanify WITH PASSWORD '\$DB_PASS';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$HUMANIFY_DB_NAME'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $HUMANIFY_DB_NAME OWNER humanify;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $HUMANIFY_DB_NAME TO humanify;"
REMOTE_DB

if [ "$ENV_EXISTS" = "yes" ]; then
  echo "  (preserving existing .env, sync URL jika DOMAIN diset)"
  ssh_cmd "bash -s" <<REMOTE_ENV_SSL
set -euo pipefail
python3 - <<PY
from pathlib import Path
import re

domain = '$DOMAIN'
use_domain = '$USE_DOMAIN' == 'true'

p = Path('$APP_DIR/config/database.js')
if p.exists():
    text = p.read_text()
    text = text.replace(
        "ssl: {\n        require: true,\n        rejectUnauthorized: false\n      }",
        "ssl: false"
    )
    p.write_text(text)

env_path = Path('$APP_DIR/.env')
if env_path.exists() and use_domain:
    text = env_path.read_text()
    scheme = 'https' if Path('/etc/letsencrypt/live/' + domain).exists() else 'http'
    base = f'{scheme}://{domain}'
    if re.search(r'^APP_URL=', text, re.M):
        text = re.sub(r'^APP_URL=.*$', f'APP_URL={base}', text, flags=re.M)
    else:
        text += f'\nAPP_URL={base}\n'
    if re.search(r'^NEXTAUTH_URL=', text, re.M):
        text = re.sub(r'^NEXTAUTH_URL=.*$', f'NEXTAUTH_URL={base}', text, flags=re.M)
    else:
        text += f'\nNEXTAUTH_URL={base}\n'
    env_path.write_text(text)
PY
REMOTE_ENV_SSL
else
APP_SCHEME="http"
[ "$USE_DOMAIN" = true ] && APP_SCHEME="http"
ssh_cmd "bash -s" <<REMOTE_ENV
set -euo pipefail
cat > $APP_DIR/.env <<EOF
NODE_ENV=production
PORT=$HUMANIFY_PORT
APP_URL=${APP_SCHEME}://$DOMAIN
NEXTAUTH_URL=${APP_SCHEME}://$DOMAIN
NEXTAUTH_SECRET=$AUTH_SECRET
SESSION_SECRET=$SESSION_SECRET
JWT_SECRET=$JWT_SECRET
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=$HUMANIFY_DB_NAME
DB_USER=humanify
DB_PASSWORD=$DB_PASS
DATABASE_URL=postgresql://humanify:$DB_PASS@127.0.0.1:5432/$HUMANIFY_DB_NAME
TENANT_ISOLATION_ENABLED=true
TENANT_SUPERADMIN_EMAIL=superadmin@humanify.id
DEFAULT_TIMEZONE=Asia/Jakarta
DEFAULT_LANGUAGE=id
DEALLS_WEBHOOK_SECRET=$(openssl rand -hex 32)
HUMANIFY_DEPLOY_SLOT=$HUMANIFY_DEPLOY_SLOT
EOF
chmod 600 $APP_DIR/.env

python3 - <<'PY'
from pathlib import Path
p = Path('$APP_DIR/config/database.js')
text = p.read_text()
text = text.replace(
    "ssl: {\n        require: true,\n        rejectUnauthorized: false\n      }",
    "ssl: false"
)
p.write_text(text)
PY
REMOTE_ENV
fi
fi

echo "=== [3b/6] Ensure webhook secrets ==="
ssh_cmd "ENV_FILE=$APP_DIR/.env bash -s" < "$SRC/scripts/ensure-humanify-webhook-secrets.sh"

if [ "$HUMANIFY_DEPLOY_SLOT" = staging ]; then
  echo "=== [3a-staging] Ensure staging DB + strict RLS env ==="
  ssh_cmd "APP_DIR='$APP_DIR' HUMANIFY_DB_NAME='$HUMANIFY_DB_NAME' bash -s" < "$SRC/scripts/ensure-humanify-staging-db.sh"
  ssh_cmd "ENV_FILE='$APP_DIR/.env' bash -s" < "$SRC/scripts/ensure-humanify-staging-env.sh"
fi

echo "=== [3c/6] Ensure SumoPod AI (if key available) ==="
_LOCAL_HERMES="${HERMES_ENV:-$HOME/.hermes/.env}"
if [ -z "${SUMOPOD_AI_API_KEY:-}" ] && [ -f "$_LOCAL_HERMES" ]; then
  SUMOPOD_AI_API_KEY="$(grep '^SUMOPOD_AI_API_KEY=' "$_LOCAL_HERMES" 2>/dev/null | cut -d= -f2- || true)"
  SUMOPOD_AI_BASE_URL="$(grep '^SUMOPOD_AI_BASE_URL=' "$_LOCAL_HERMES" 2>/dev/null | cut -d= -f2- || true)"
fi
if [ -n "${SUMOPOD_AI_API_KEY:-}" ]; then
  ssh_cmd "ENV_FILE=$APP_DIR/.env SUMOPOD_AI_API_KEY='$SUMOPOD_AI_API_KEY' SUMOPOD_AI_BASE_URL='${SUMOPOD_AI_BASE_URL:-https://ai.sumopod.com/v1}' bash -s" < "$SRC/scripts/ensure-humanify-sumopod-ai.sh" || true
else
  echo "  (skip — set SUMOPOD_AI_API_KEY or ~/.hermes/.env)"
fi

echo "=== [3d/6] Ensure Sentry env keys ==="
ssh_cmd "ENV_FILE=$APP_DIR/.env HUMANIFY_SENTRY_INTERNAL=true bash -s" < "$SRC/scripts/ensure-humanify-sentry.sh" || true
ssh_cmd "ENV_FILE=$APP_DIR/.env bash -s" < "$SRC/scripts/enable-humanify-rls-request-bound.sh" || true
ssh_cmd "ENV_FILE=$APP_DIR/.env HUMANIFY_FISCAL_SIGNED_OFF=true bash -s" < "$SRC/scripts/ensure-humanify-fiscal-signoff.sh" || true

echo "=== [3d2/6] Ensure Redis (rate-limit + login-guard) ==="
ssh_cmd "ENV_FILE=$APP_DIR/.env bash -s" < "$SRC/scripts/ensure-humanify-redis.sh" || true
ssh_cmd "ENV_FILE=$APP_DIR/.env bash -s" < "$SRC/scripts/ensure-humanify-obs-alerts.sh" || true

echo "=== [3e/6] Ensure platform crons (purge / hard-delete / health) ==="
if [ "$HUMANIFY_DEPLOY_SLOT" = staging ] && [ "$USE_DOMAIN" = true ]; then
  # Scorecard cron lives on prod app dir but targets staging URL
  ssh_cmd "APP_DIR=/root/humanify HUMANIFY_STAGING_URL=https://${DOMAIN} bash -s" < "$SRC/scripts/ensure-humanify-crons.sh" || true
else
  ssh_cmd "APP_DIR=$APP_DIR bash -s" < "$SRC/scripts/ensure-humanify-crons.sh" || true
fi

echo "=== [3e1/6] Ensure HUMANIFY_STATE_DIR (last-run artifacts) ==="
ssh_cmd "APP_DIR='$APP_DIR' bash -s" <<'REMOTE_STATE' || true
set -euo pipefail
STATE_DIR="${HUMANIFY_STATE_DIR:-/var/lib/humanify}"
mkdir -p "$STATE_DIR"
chmod 755 "$STATE_DIR" || true
APP_ENV="${APP_DIR:-/root/humanify}/.env"
if [ -f "$APP_ENV" ] && ! grep -q '^HUMANIFY_STATE_DIR=' "$APP_ENV"; then
  echo "HUMANIFY_STATE_DIR=$STATE_DIR" >> "$APP_ENV"
  echo "  + HUMANIFY_STATE_DIR appended to .env"
else
  echo "  ✓ state dir $STATE_DIR ready"
fi
# One-shot uptime probe so observability chip is not Never after deploy
cd "${APP_DIR:-/root/humanify}"
set -a
[ -f .env ] && . ./.env
set +a
HUMANIFY_STATE_DIR="$STATE_DIR" node scripts/check-humanify-uptime-external.js || true
# Seed scorecard/digest last-run chips (no Discord, no email; scorecard skips IDOR batches)
HUMANIFY_STATE_DIR="$STATE_DIR" SEED_ONLY=true node scripts/run-humanify-security-scorecard.js || true
HUMANIFY_STATE_DIR="$STATE_DIR" SEED_ONLY=true node scripts/send-humanify-action-inbox-digest.js || true
HUMANIFY_STATE_DIR="$STATE_DIR" SEED_ONLY=true node scripts/run-humanify-doc-expiry-soft-deactivate.js || true
REMOTE_STATE

echo "=== [3e2/6] Ensure DEMO partner (sales walkthrough) ==="
ssh_cmd "APP_DIR='$APP_DIR' bash -s" <<'REMOTE_DEMO' || true
set -euo pipefail
cd "$APP_DIR"
set -a
[ -f .env ] && . ./.env
set +a
node scripts/ensure-humanify-demo-partner.js || echo "⚠️ ensure DEMO partner skipped"
REMOTE_DEMO

echo "=== [3f/6] Uptime monitor probe ==="
ssh_cmd "HEALTH_URL=https://${DOMAIN}/api/health?deep=1 STATE_FILE=/var/log/humanify-uptime-last.json bash -s" < "$SRC/scripts/ensure-humanify-uptime-monitor.sh" || true

echo "=== [3g/6] External uptime (optional API key) ==="
ssh_cmd "HEALTH_URL=https://${DOMAIN}/api/health?deep=1 UPTIMEROBOT_API_KEY='${UPTIMEROBOT_API_KEY:-}' BETTERSTACK_TOKEN='${BETTERSTACK_TOKEN:-}' bash -s" < "$SRC/scripts/register-humanify-uptime-external.sh" || true

echo "=== [4/6] npm install + migrations ==="
if [ "${DEPLOY_SKIP_MIGRATE:-false}" = true ]; then
  echo "  (skip migrations — DEPLOY_SKIP_MIGRATE=true)"
else
ssh_cmd "bash -s" <<REMOTE_BUILD
set -euo pipefail
cd $APP_DIR
export NODE_OPTIONS='--max-old-space-size=4096'
if [ ! -d node_modules ]; then npm install --legacy-peer-deps 2>&1 | tail -5; fi

# Base schema (users, employees UUID, tenants, etc.) — required on fresh VPS
node scripts/setup-users-table.js || true
npm run db:migrate 2>&1 | tail -30 || true
node scripts/setup-hris-tables.js 2>&1 | tail -5 || true

npm run db:hris-migrate
npm run db:hris-extended-migrate
npm run db:hris-field-migrate
npm run db:attendance-migrate
npm run db:payroll-migrate
npm run db:org-migrate
npm run db:employee-portal-migrate
npm run db:employee-lifecycle-migrate || node scripts/migrate-employee-lifecycle.js || true
npm run db:hris-smoke-deps || true
for script in migrate-team-members-tables migrate-mutation-workflow migrate-casual-workforce migrate-casual-supervision migrate-hris-field-integration migrate-workforce-analytics migrate-kpi-scoring migrate-employee-genealogy migrate-payroll-align migrate-payroll-enhance; do
  node scripts/\${script}.js 2>&1 | tail -1 || true
done
node scripts/seed-payroll-demo-data.js 2>&1 | tail -3 || true
node scripts/migrate-recruitment-training-align.js 2>&1 | tail -1 || true
node scripts/migrate-disciplinary-letter-workflow.js 2>&1 | tail -3 || true
node scripts/run-humanify-pending-migrations.js 2>&1 | tail -1 || true
node scripts/seed-recruitment-training-demo.js 2>&1 | tail -3 || true
node scripts/migrate-multifinance-workforce.js 2>&1 | tail -1 || true
node scripts/migrate-humanify-vps-deps.js 2>&1 | tail -3 || true
node scripts/setup-users-table.js || true
node scripts/create-super-user.js || true
node scripts/ensure-superadmin.js || true
node scripts/ensure-humanify-superadmin.js || true
node scripts/sync-org-departments.js || true
node scripts/seed-hris-demo-data.js 2>&1 | tail -3 || true
REMOTE_BUILD
fi

echo "=== [5/6] Build app ==="
if [ "${DEPLOY_SKIP_BUILD:-false}" = true ]; then
  echo "  (skip build — DEPLOY_SKIP_BUILD=true)"
else
ssh_cmd "bash -s" <<REMOTE_NPM_BUILD
set -euo pipefail
cd $APP_DIR
pm2 stop humanify 2>/dev/null || true

# Extra swap headroom for large Next.js builds
if [ "\$(free -m | awk '/^Swap:/{print \$2}')" -lt 4096 ]; then
  if [ ! -f /swapfile_humanify ]; then
    fallocate -l 4G /swapfile_humanify 2>/dev/null || dd if=/dev/zero of=/swapfile_humanify bs=1M count=4096 status=none
    chmod 600 /swapfile_humanify
    mkswap /swapfile_humanify
    swapon /swapfile_humanify || true
  fi
fi

export NODE_OPTIONS='--max-old-space-size=6144'
export NEXT_TELEMETRY_DISABLED=1
export GENERATE_SOURCEMAP=false

# Refresh deps so new packages (samlify/ioredis) are present even when node_modules already exists
npm install --legacy-peer-deps 2>&1 | tail -8

python3 scripts/patch-next-config-vps.py next.config.mjs

rm -rf .next
nohup env NODE_ENV=production npm run build > /tmp/humanify-build.log 2>&1 &
BUILD_PID=\$!
echo "Build PID: \$BUILD_PID"
for i in \$(seq 1 90); do
  if test -f .next/prerender-manifest.json; then echo BUILD_OK; break; fi
  if ! kill -0 \$BUILD_PID 2>/dev/null; then
    tail -30 /tmp/humanify-build.log
    test -f .next/prerender-manifest.json && echo BUILD_OK || { echo BUILD_FAIL; exit 1; }
    break
  fi
  sleep 20
done
test -f .next/prerender-manifest.json || { tail -30 /tmp/humanify-build.log; echo BUILD_FAIL; exit 1; }
grep -E 'Failed to compile|FATAL ERROR' /tmp/humanify-build.log && { echo BUILD_FAIL; exit 1; } || true
test -f .next/server/pages/humanify/employees.html -o -f .next/server/pages/humanify/employees.js && echo PAGES_OK || { echo "WARN: employees page missing"; exit 1; }
REMOTE_NPM_BUILD
fi

echo "=== [6/6] PM2 + Nginx + SSL + Firewall ==="
# Wave-21: SCP must not abort before PM2 restart (Wave-20 left app stopped → 502)
scp_cmd "$SRC/scripts/$ECOSYSTEM_FILE" "$VPS_USER@$VPS_HOST:$APP_DIR/humanify-ecosystem.config.cjs" \
  || echo "⚠️ ecosystem SCP failed — will reuse existing file / fallback restart"
scp_cmd "$SRC/scripts/humanify-healthcheck.sh" "$VPS_USER@$VPS_HOST:$APP_DIR/" \
  || echo "⚠️ healthcheck SCP failed — continuing"
ssh_cmd "APP_DIR='$APP_DIR' DOMAIN='$DOMAIN' USE_DOMAIN='$USE_DOMAIN' ENABLE_SSL='$ENABLE_SSL' CLOUDFLARE_SSL='$CLOUDFLARE_SSL' CERTBOT_EMAIL='$CERTBOT_EMAIL' VPS_USER='$VPS_USER' HUMANIFY_PM2_NAME='$HUMANIFY_PM2_NAME' HUMANIFY_PORT='$HUMANIFY_PORT' NGINX_SITE='$NGINX_SITE' HUMANIFY_DEPLOY_SLOT='$HUMANIFY_DEPLOY_SLOT' bash -s" <<'REMOTE_PM2'
set -euo pipefail
cd "$APP_DIR"

# Bring app back online first (build step stops PM2)
chmod +x humanify-healthcheck.sh 2>/dev/null || true
if [ -f humanify-ecosystem.config.cjs ]; then
  pm2 delete "$HUMANIFY_PM2_NAME" 2>/dev/null || true
  HUMANIFY_APP_DIR="$APP_DIR" HUMANIFY_PORT="$HUMANIFY_PORT" pm2 start humanify-ecosystem.config.cjs --only "$HUMANIFY_PM2_NAME"
else
  echo "⚠️ humanify-ecosystem.config.cjs missing — fallback restart"
  pm2 restart "$HUMANIFY_PM2_NAME" --update-env 2>/dev/null \
    || pm2 start npm --name "$HUMANIFY_PM2_NAME" --cwd "$APP_DIR" -- start -- -p "$HUMANIFY_PORT"
fi
pm2 save

if [ "$USE_DOMAIN" = true ]; then
  if [ "$HUMANIFY_DEPLOY_SLOT" = staging ]; then
    SERVER_NAMES="$DOMAIN"
  else
    SERVER_NAMES="$DOMAIN www.$DOMAIN"
  fi
  LISTEN_DEFAULT=""
else
  SERVER_NAMES="_"
  LISTEN_DEFAULT="default_server"
fi

if [ "$CLOUDFLARE_SSL" = true ] && [ "$USE_DOMAIN" = true ]; then
  sudo mkdir -p /etc/nginx/conf.d
  sudo curl -fsSL https://www.cloudflare.com/ips-v4 -o /tmp/cf-ips-v4
  sudo curl -fsSL https://www.cloudflare.com/ips-v6 -o /tmp/cf-ips-v6
  {
    echo '# Cloudflare real client IP'
    while read -r ip; do [ -n "$ip" ] && echo "set_real_ip_from $ip;"; done < /tmp/cf-ips-v4
    while read -r ip; do [ -n "$ip" ] && echo "set_real_ip_from $ip;"; done < /tmp/cf-ips-v6
    echo 'real_ip_header CF-Connecting-IP;'
  } | sudo tee /etc/nginx/conf.d/cloudflare-real-ip.conf >/dev/null
  sudo tee /etc/nginx/conf.d/cloudflare-forwarded-proto.conf >/dev/null <<'CFMAP'
map $http_cf_visitor $cf_forwarded_proto {
    default $scheme;
    ~*"scheme":"https" https;
}
CFMAP
fi

if [ "$CLOUDFLARE_SSL" = true ] && [ "$USE_DOMAIN" = true ]; then
  CF_INCLUDE='include /etc/nginx/conf.d/cloudflare-real-ip.conf;'
  CF_PROTO='proxy_set_header X-Forwarded-Proto $cf_forwarded_proto;'
  CF_IP='proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;'
else
  CF_INCLUDE=''
  CF_PROTO='proxy_set_header X-Forwarded-Proto $scheme;'
  CF_IP=''
fi

sudo tee /etc/nginx/sites-available/$NGINX_SITE >/dev/null <<NGINX
server {
    listen 80 $LISTEN_DEFAULT;
    listen [::]:80 $LISTEN_DEFAULT;
    server_name $SERVER_NAMES;

    $CF_INCLUDE
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:$HUMANIFY_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        $CF_PROTO
        $CF_IP
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/$NGINX_SITE /etc/nginx/sites-enabled/$NGINX_SITE
if [ "$NGINX_SITE" = humanify ]; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi
sudo nginx -t
sudo systemctl reload nginx

SSL_OK=false
if [ "$USE_DOMAIN" = true ] && [ "$ENABLE_SSL" = true ]; then
  export DEBIAN_FRONTEND=noninteractive
  sudo apt-get install -y -qq certbot python3-certbot-nginx 2>/dev/null || true
  if sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
      --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect 2>&1; then
    SSL_OK=true
    echo "✓ SSL aktif untuk $DOMAIN"
  else
    echo "⚠️  Certbot gagal — pastikan DNS A record @ dan www sudah pointing ke VPS, lalu jalankan:"
    echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
  fi
fi

if { [ "$SSL_OK" = true ] || [ "$CLOUDFLARE_SSL" = true ]; } && [ -f "$APP_DIR/.env" ] && [ "$USE_DOMAIN" = true ]; then
  python3 - <<'PY'
import os, re
from pathlib import Path
app_dir = os.environ['APP_DIR']
domain = os.environ['DOMAIN']
p = Path(app_dir) / '.env'
text = p.read_text()
base = f'https://{domain}'
text = re.sub(r'^APP_URL=.*$', f'APP_URL={base}', text, flags=re.M)
text = re.sub(r'^NEXTAUTH_URL=.*$', f'NEXTAUTH_URL={base}', text, flags=re.M)
if 'TRUST_PROXY=' not in text:
    text += '\nTRUST_PROXY=true\n'
else:
    text = re.sub(r'^TRUST_PROXY=.*$', 'TRUST_PROXY=true', text, flags=re.M)
p.write_text(text)
PY
  pm2 restart "$HUMANIFY_PM2_NAME" 2>/dev/null || true
fi

sudo ufw --force enable 2>/dev/null || true
sudo ufw allow OpenSSH 2>/dev/null || sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# Wave-22: pm2 startup often prints a "$ sudo env ..." line — strip leading $ before bash
_PM2_STARTUP="$(sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u "$VPS_USER" --hp "$(eval echo ~$VPS_USER)" 2>/dev/null | grep -E 'env PATH=|pm2 resurrect' | tail -1 | sed 's/^[[:space:]]*\$[[:space:]]*//' || true)"
if [ -n "$_PM2_STARTUP" ]; then
  eval "$_PM2_STARTUP" 2>/dev/null || true
fi
pm2 save
sleep 3
bash humanify-healthcheck.sh "http://127.0.0.1:$HUMANIFY_PORT" || true
REMOTE_PM2

PUBLIC_SCHEME="http"
if [ "$USE_DOMAIN" = true ] && { [ "$ENABLE_SSL" = true ] || [ "$CLOUDFLARE_SSL" = true ]; }; then
  PUBLIC_SCHEME="https"
fi

echo ""
echo "✅ Deploy selesai!"
echo "   URL: ${PUBLIC_SCHEME}://$DOMAIN/humanify/welcome"
echo "   Login: ${PUBLIC_SCHEME}://$DOMAIN/humanify/login"
echo "   Role & Akses: ${PUBLIC_SCHEME}://$DOMAIN/humanify/users/roles"
echo "   Email: superadmin@humanify.id"
echo "   Password: superadmin123"
if [ "$USE_DOMAIN" = true ] && [ -z "${RESOLVED:-}" ]; then
  echo ""
  echo "📌 Langkah berikutnya — set DNS di registrar domain:"
  echo "   A  @   → $VPS_HOST"
  echo "   A  www → $VPS_HOST"
  echo "   Setelah propagate (~5–30 menit), jalankan ulang deploy atau:"
  echo "   ssh $VPS_USER@$VPS_HOST 'sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN'"
fi
