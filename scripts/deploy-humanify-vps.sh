#!/usr/bin/env bash
# Deploy Humanify HRIS to VPS
# Usage: VPS_HOST=103.92.215.37 VPS_USER=root VPS_PASS='...' bash scripts/deploy-humanify-vps.sh
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
APP_SRC="${APP_SRC:-$SRC}"
VPS_HOST="${VPS_HOST:-103.92.215.37}"
VPS_USER="${VPS_USER:-root}"
VPS_PASS="${VPS_PASS:?Set VPS_PASS}"
if [[ "$VPS_USER" == "root" ]]; then
  APP_DIR="${APP_DIR:-/root/humanify}"
else
  APP_DIR="${APP_DIR:-/home/$VPS_USER/humanify}"
fi
DOMAIN="${DOMAIN:-$VPS_HOST}"

SSH_OPTS=(-o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no -o ServerAliveInterval=60 -o ServerAliveCountMax=120)
ssh_cmd() { sshpass -p "$VPS_PASS" ssh "${SSH_OPTS[@]}" "$VPS_USER@$VPS_HOST" "$@"; }
scp_cmd() { sshpass -p "$VPS_PASS" scp "${SSH_OPTS[@]}" "$@"; }

echo "=== [1/6] Sync app to VPS ==="
ssh_cmd "mkdir -p $APP_DIR"
sshpass -p "$VPS_PASS" rsync -az --delete \
  --exclude .env --exclude .env.local --exclude .env.*.local \
  --filter='protect node_modules/' \
  --exclude node_modules --exclude .next --exclude .git \
  -e "ssh ${SSH_OPTS[*]}" \
  "$APP_SRC/" "$VPS_USER@$VPS_HOST:$APP_DIR/"

echo "=== [2/6] Install system packages ==="
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

echo "=== [3/6] PostgreSQL + env ==="
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
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='humanify'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE humanify OWNER humanify;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE humanify TO humanify;"
REMOTE_DB

if [ "$ENV_EXISTS" = "yes" ]; then
  echo "  (preserving existing .env)"
  ssh_cmd "bash -s" <<REMOTE_ENV_SSL
set -euo pipefail
python3 - <<PY
from pathlib import Path
p = Path('$APP_DIR/config/database.js')
if p.exists():
    text = p.read_text()
    text = text.replace(
        "ssl: {\n        require: true,\n        rejectUnauthorized: false\n      }",
        "ssl: false"
    )
    p.write_text(text)
PY
REMOTE_ENV_SSL
else
ssh_cmd "bash -s" <<REMOTE_ENV
set -euo pipefail
cat > $APP_DIR/.env <<EOF
NODE_ENV=production
PORT=3020
APP_URL=http://$DOMAIN
NEXTAUTH_URL=http://$DOMAIN
NEXTAUTH_SECRET=$AUTH_SECRET
SESSION_SECRET=$SESSION_SECRET
JWT_SECRET=$JWT_SECRET
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=humanify
DB_USER=humanify
DB_PASSWORD=$DB_PASS
DATABASE_URL=postgresql://humanify:$DB_PASS@127.0.0.1:5432/humanify
TENANT_ISOLATION_ENABLED=true
TENANT_SUPERADMIN_EMAIL=superadmin@bedagang.com
DEFAULT_TIMEZONE=Asia/Jakarta
DEFAULT_LANGUAGE=id
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

echo "=== [4/6] npm install + migrations ==="
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

echo "=== [5/6] Build app ==="
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

python3 - <<'PY'
import re
from pathlib import Path
p = Path('$APP_DIR/next.config.mjs')
text = p.read_text()
if 'cpus: 1' not in text:
    text = text.replace('const nextConfig = {', 'const nextConfig = {\n  experimental: { workerThreads: false, cpus: 1 },')
text = re.sub(
    r"\.\.\.\(process\.env\.NODE_ENV === ['\"]production['\"] \? \{ output: ['\"]standalone['\"] \} : \{\}\),",
    '// standalone disabled for VPS (use next start)',
    text
)
p.write_text(text)
PY

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

echo "=== [6/6] PM2 + Nginx + Firewall ==="
scp_cmd "$SRC/scripts/humanify-ecosystem.config.cjs" "$VPS_USER@$VPS_HOST:$APP_DIR/"
scp_cmd "$SRC/scripts/humanify-healthcheck.sh" "$VPS_USER@$VPS_HOST:$APP_DIR/"
ssh_cmd "bash -s" <<REMOTE_PM2
set -euo pipefail
cd $APP_DIR
chmod +x humanify-healthcheck.sh
pm2 delete humanify 2>/dev/null || true
HUMANIFY_APP_DIR=$APP_DIR pm2 start humanify-ecosystem.config.cjs
pm2 save
sudo tee /etc/nginx/sites-available/humanify >/dev/null <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3020;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/humanify /etc/nginx/sites-enabled/humanify
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
sudo ufw --force enable 2>/dev/null || true
sudo ufw allow OpenSSH 2>/dev/null || sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u $VPS_USER --hp \$(eval echo ~$VPS_USER) 2>/dev/null | tail -1 | sudo bash || true
pm2 save
sleep 3
bash humanify-healthcheck.sh http://127.0.0.1:3020 || true
REMOTE_PM2

echo ""
echo "✅ Deploy selesai!"
echo "   URL: http://$DOMAIN/humanify/welcome"
echo "   Login: http://$DOMAIN/humanify/login"
echo "   Role & Akses: http://$DOMAIN/humanify/users/roles"
echo "   Email: superadmin@bedagang.com"
echo "   Password: superadmin123"
