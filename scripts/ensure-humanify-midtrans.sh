#!/usr/bin/env bash
# Ensure Midtrans env for Humanify Snap billing (idempotent).
# Usage:
#   MIDTRANS_SERVER_KEY=SB-Mid-server-… MIDTRANS_CLIENT_KEY=SB-Mid-client-… \
#   ENV_FILE=/root/humanify/.env bash scripts/ensure-humanify-midtrans.sh
set -euo pipefail

ENV_FILE="${ENV_FILE:-/root/humanify/.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️  $ENV_FILE not found — skip Midtrans"
  exit 0
fi

set_var() {
  local key="$1" val="$2"
  [ -n "$val" ] || return 0
  python3 - "$ENV_FILE" "$key" "$val" <<'PY'
import sys, re
path, key, val = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(path).read()
pat = re.compile(rf'^{re.escape(key)}=.*$', re.M)
line = f'{key}={val}'
text = pat.sub(line, text) if pat.search(text) else text.rstrip() + '\n' + line + '\n'
open(path, 'w').write(text)
PY
  echo "  ↻ $key updated"
}

echo "Ensure Humanify Midtrans — $ENV_FILE"
if [ -n "${MIDTRANS_SERVER_KEY:-}" ]; then
  set_var "MIDTRANS_SERVER_KEY" "$MIDTRANS_SERVER_KEY"
  set_var "MIDTRANS_CLIENT_KEY" "${MIDTRANS_CLIENT_KEY:-}"
  set_var "MIDTRANS_IS_PRODUCTION" "${MIDTRANS_IS_PRODUCTION:-false}"
  echo "  ✓ Midtrans keys written"
else
  existing="$(grep '^MIDTRANS_SERVER_KEY=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)"
  if [ -n "$existing" ]; then
    echo "  ✓ MIDTRANS_SERVER_KEY already present"
  else
    echo "  ⚠️  MIDTRANS_SERVER_KEY kosong — Snap tetap manual sampai key diisi"
  fi
fi
echo "  → Payment Notification URL: https://humanify.id/api/humanify/billing/webhook"
echo "  → Finish redirect: https://humanify.id/humanify/billing?paid=1"
