#!/usr/bin/env bash
# Ensure recruitment webhook secrets exist in Humanify .env (idempotent).
# Usage: ENV_FILE=/root/humanify/.env bash scripts/ensure-humanify-webhook-secrets.sh
set -euo pipefail

ENV_FILE="${ENV_FILE:-/root/humanify/.env}"
GENERATED=0

ensure_key() {
  local key="$1"
  if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  $ENV_FILE not found — skip"
    return 0
  fi
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    echo "  ✓ $key already set"
    return 0
  fi
  local val
  val="$(openssl rand -hex 32)"
  echo "${key}=${val}" >> "$ENV_FILE"
  echo "  + $key generated"
  GENERATED=1
}

echo "Ensure Humanify webhook secrets — $ENV_FILE"
ensure_key "DEALLS_WEBHOOK_SECRET"
ensure_key "LINKEDIN_WEBHOOK_SECRET"
ensure_key "INDEED_WEBHOOK_SECRET"
ensure_key "JOBSTREET_WEBHOOK_SECRET"
ensure_key "KALIBRR_WEBHOOK_SECRET"
ensure_key "GLINTS_WEBHOOK_SECRET"
ensure_key "GOOGLE_JOBS_WEBHOOK_SECRET"

if [ "$GENERATED" = 1 ]; then
  echo "  → Restart PM2 humanify to load new env vars"
fi
