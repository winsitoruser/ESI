#!/usr/bin/env bash
# Add Cloudflare DNS A record for admin.humanify.id → VPS (proxied)
# Admin Total = platform superadmin control plane (same as ops.humanify.id)
#
# Usage:
#   VPS_PASS='...' CLOUDFLARE_API_TOKEN='...' bash scripts/setup-humanify-admin-subdomain.sh
#
# Token needs Zone:DNS:Edit on humanify.id
set -euo pipefail

VPS_HOST="${VPS_HOST:-103.92.215.37}"
VPS_USER="${VPS_USER:-root}"
VPS_PASS="${VPS_PASS:?Set VPS_PASS}"
DOMAIN="${DOMAIN:-humanify.id}"
ADMIN_HOST="${ADMIN_HOST:-admin.$DOMAIN}"
APP_DIR="${APP_DIR:-/root/humanify}"
CF_TOKEN="${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}"

SSH_OPTS=(-o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no -o ServerAliveInterval=60)
export SSHPASS="$VPS_PASS"
ssh_cmd() { sshpass -e ssh "${SSH_OPTS[@]}" "$VPS_USER@$VPS_HOST" "$@"; }

echo "=== Admin portal subdomain setup: $ADMIN_HOST → $VPS_HOST ==="

if [[ -n "$CF_TOKEN" ]]; then
  ZONE_ID=$(curl -sS -H "Authorization: Bearer $CF_TOKEN" \
    "https://api.cloudflare.com/client/v4/zones?name=$DOMAIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['id'] if d.get('result') else '')")
  if [[ -z "$ZONE_ID" ]]; then
    echo "⚠ Cloudflare zone $DOMAIN not found — create DNS A $ADMIN_HOST manually"
  else
    EXISTING=$(curl -sS -H "Authorization: Bearer $CF_TOKEN" \
      "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=A&name=$ADMIN_HOST")
    REC_ID=$(echo "$EXISTING" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('result') or []; print(r[0]['id'] if r else '')")
    BODY=$(python3 -c "import json; print(json.dumps({'type':'A','name':'$ADMIN_HOST','content':'$VPS_HOST','ttl':1,'proxied':True}))")
    if [[ -n "$REC_ID" ]]; then
      curl -sS -X PUT -H "Authorization: Bearer $CF_TOKEN" -H 'Content-Type: application/json' \
        --data "$BODY" \
        "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$REC_ID" >/tmp/cf-admin.json
      echo "✓ Updated Cloudflare A $ADMIN_HOST"
    else
      curl -sS -X POST -H "Authorization: Bearer $CF_TOKEN" -H 'Content-Type: application/json' \
        --data "$BODY" \
        "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" >/tmp/cf-admin.json
      echo "✓ Created Cloudflare A $ADMIN_HOST (proxied)"
    fi
  fi
else
  echo "⚠ CLOUDFLARE_API_TOKEN not set — create DNS manually:"
  echo "   A  $ADMIN_HOST  →  $VPS_HOST  (Proxied ON)"
fi

ssh_cmd "bash -s" <<REMOTE
set -euo pipefail
DOMAIN='$DOMAIN'
ADMIN_HOST='$ADMIN_HOST'
APP_DIR='$APP_DIR'
NGINX=/etc/nginx/sites-available/humanify
if [[ -f "\$NGINX" ]]; then
  if grep -q "\$ADMIN_HOST" "\$NGINX"; then
    echo "✓ nginx already has \$ADMIN_HOST"
  else
    sudo python3 - <<'PY'
from pathlib import Path
import re
p = Path('/etc/nginx/sites-available/humanify')
text = p.read_text()
admin = '$ADMIN_HOST'
def repl(m):
    line = m.group(0)
    if admin in line:
        return line
    return line.rstrip(';') + f' {admin};'
text2, n = re.subn(r'(?m)^\s*server_name\s+[^;]+;', repl, text, count=1)
if n == 0:
    block = f'''
server {{
    listen 80;
    listen [::]:80;
    server_name {admin};
    include /etc/nginx/conf.d/cloudflare-real-ip.conf;
    client_max_body_size 50M;
    location / {{
        proxy_pass http://127.0.0.1:3020;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$cf_forwarded_proto;
        proxy_set_header CF-Connecting-IP \$http_cf_connecting_ip;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }}
}}
'''
    text2 = text.rstrip() + '\n' + block
p.write_text(text2)
print('✓ nginx server_name updated for', admin)
PY
    sudo nginx -t
    sudo systemctl reload nginx
  fi
else
  echo "⚠ \$NGINX missing — run setup-humanify-cloudflare.sh first"
fi

if [[ -f "\$APP_DIR/.env" ]]; then
  python3 - <<PY
from pathlib import Path
import re
p = Path('\$APP_DIR/.env')
text = p.read_text()
admin = 'https://\$ADMIN_HOST'
def upsert(key, val):
    global text
    if re.search(rf'^{key}=', text, re.M):
        text = re.sub(rf'^{key}=.*\$', f'{key}={val}', text, flags=re.M)
    else:
        text += f'\n{key}={val}\n'
upsert('HUMANIFY_ADMIN_HOST', '\$ADMIN_HOST')
upsert('NEXT_PUBLIC_HUMANIFY_ADMIN_HOST', '\$ADMIN_HOST')
upsert('NEXT_PUBLIC_HUMANIFY_ADMIN_URL', admin)
p.write_text(text)
print('✓ .env admin keys set')
PY
fi
REMOTE

echo ""
echo "✅ Admin Total subdomain wiring done"
echo "   Login:  https://$ADMIN_HOST/login"
echo "   Hub:    https://$ADMIN_HOST/platform"
echo "   Superadmin only — tenant HR stays on https://$DOMAIN/humanify"
