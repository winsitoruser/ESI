#!/usr/bin/env bash
# Setup Nginx + env untuk Humanify di belakang Cloudflare SSL
#
# Cloudflare dashboard (lakukan dulu):
#   1. Add site humanify.id ke Cloudflare
#   2. Ganti nameserver domain ke Cloudflare (ganti ns1/ns2.sumopod.com)
#   3. DNS: A @ → VPS IP (Proxied/orange cloud ON)
#   4. DNS: A www → VPS IP (Proxied ON)
#   5. SSL/TLS → Overview → Flexible (atau Full jika origin sudah punya cert)
#
# Jalankan script ini setelah DNS Cloudflare aktif:
#   VPS_HOST=103.92.215.37 VPS_USER=root VPS_PASS='...' \
#   DOMAIN=humanify.id bash scripts/setup-humanify-cloudflare.sh
set -euo pipefail

VPS_HOST="${VPS_HOST:-103.92.215.37}"
VPS_USER="${VPS_USER:-root}"
VPS_PASS="${VPS_PASS:?Set VPS_PASS}"
DOMAIN="${DOMAIN:-humanify.id}"
if [[ "$VPS_USER" == "root" ]]; then
  APP_DIR="${APP_DIR:-/root/humanify}"
else
  APP_DIR="${APP_DIR:-/home/$VPS_USER/humanify}"
fi

SSH_OPTS=(-o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no -o ServerAliveInterval=60)
ssh_cmd() { sshpass -p "$VPS_PASS" ssh "${SSH_OPTS[@]}" "$VPS_USER@$VPS_HOST" "$@"; }

echo "=== Cloudflare SSL setup: $DOMAIN on $VPS_HOST ==="
ssh_cmd "bash -s" <<REMOTE
set -euo pipefail
DOMAIN='$DOMAIN'
APP_DIR='$APP_DIR'

sudo mkdir -p /etc/nginx/conf.d
sudo curl -fsSL https://www.cloudflare.com/ips-v4 -o /tmp/cf-ips-v4
sudo curl -fsSL https://www.cloudflare.com/ips-v6 -o /tmp/cf-ips-v6
{
  echo '# Cloudflare real client IP — auto-generated'
  while read -r ip; do [ -n "\$ip" ] && echo "set_real_ip_from \$ip;"; done < /tmp/cf-ips-v4
  while read -r ip; do [ -n "\$ip" ] && echo "set_real_ip_from \$ip;"; done < /tmp/cf-ips-v6
  echo 'real_ip_header CF-Connecting-IP;'
} | sudo tee /etc/nginx/conf.d/cloudflare-real-ip.conf >/dev/null

sudo tee /etc/nginx/conf.d/cloudflare-forwarded-proto.conf >/dev/null <<'MAP'
map \$http_cf_visitor \$cf_forwarded_proto {
    default \$scheme;
    ~*"scheme":"https" https;
}
MAP

sudo tee /etc/nginx/sites-available/humanify >/dev/null <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    include /etc/nginx/conf.d/cloudflare-real-ip.conf;
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3020;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$cf_forwarded_proto;
        proxy_set_header CF-Connecting-IP \\\$http_cf_connecting_ip;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_read_timeout 300s;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/humanify /etc/nginx/sites-enabled/humanify
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

if [ -f "\$APP_DIR/.env" ]; then
  python3 - <<PY
import re
from pathlib import Path
p = Path('\$APP_DIR/.env')
text = p.read_text()
base = 'https://$DOMAIN'
text = re.sub(r'^APP_URL=.*\$', f'APP_URL={base}', text, flags=re.M)
text = re.sub(r'^NEXTAUTH_URL=.*\$', f'NEXTAUTH_URL={base}', text, flags=re.M)
if 'TRUST_PROXY=' not in text:
    text += '\\nTRUST_PROXY=true\\n'
else:
    text = re.sub(r'^TRUST_PROXY=.*\$', 'TRUST_PROXY=true', text, flags=re.M)
p.write_text(text)
PY
  cd "\$APP_DIR" && pm2 restart humanify 2>/dev/null || true
fi

sudo ufw allow 80/tcp 2>/dev/null || true
sudo ufw allow 443/tcp 2>/dev/null || true
echo "✓ Nginx Cloudflare + env https://\$DOMAIN siap"
REMOTE

echo ""
echo "✅ VPS siap untuk Cloudflare SSL"
echo "   Pastikan di Cloudflare Dashboard:"
echo "   • DNS A @ dan www → $VPS_HOST (Proxied / orange cloud)"
echo "   • SSL/TLS → Flexible (recommended) atau Full"
echo "   • SSL/TLS → Edge Certificates → Always Use HTTPS: ON"
echo ""
echo "   Test: https://$DOMAIN/humanify/login"
