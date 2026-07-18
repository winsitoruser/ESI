#!/usr/bin/env bash
# Enable request-bound RLS session vars on VPS (keeps soft policy; safe with pool).
# Usage: ENV_FILE=/root/humanify/.env bash scripts/enable-humanify-rls-request-bound.sh
set -euo pipefail
ENV_FILE="${ENV_FILE:-/root/humanify/.env}"
touch "$ENV_FILE"
if grep -q '^HUMANIFY_RLS_REQUEST_BOUND=' "$ENV_FILE"; then
  sed -i.bak 's|^HUMANIFY_RLS_REQUEST_BOUND=.*|HUMANIFY_RLS_REQUEST_BOUND=true|' "$ENV_FILE"
else
  echo "HUMANIFY_RLS_REQUEST_BOUND=true" >> "$ENV_FILE"
fi
echo "✓ HUMANIFY_RLS_REQUEST_BOUND=true"
echo "→ Soft RLS remains default. Strict: npm run db:humanify-rls:strict (after smoke)."
echo "→ pm2 restart humanify --update-env"
