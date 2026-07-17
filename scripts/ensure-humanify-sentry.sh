#!/usr/bin/env bash
# Ensure Sentry optional dependency is documented in .env (does not require DSN).
# Usage: ENV_FILE=/root/humanify/.env APP_URL=https://humanify.id bash scripts/ensure-humanify-sentry.sh
set -euo pipefail
ENV_FILE="${ENV_FILE:-.env}"
APP_URL="${APP_URL:-https://humanify.id}"
touch "$ENV_FILE"

ensure_kv() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    echo "  ✓ $key already set"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
    echo "  + $key added (empty — set DSN to activate)"
  fi
}

echo "Ensure Humanify Sentry — $ENV_FILE"
ensure_kv "SENTRY_DSN" ""
ensure_kv "SENTRY_TRACES_SAMPLE_RATE" "0"

dsn="$(grep '^SENTRY_DSN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)"
if [ -n "$dsn" ]; then
  echo "  → SENTRY_DSN is set — after deploy, POST ${APP_URL}/api/platform/sentry-probe (platform ops) to verify"
else
  echo "  → Set SENTRY_DSN from Sentry project settings, then: pm2 restart humanify --update-env"
fi
echo "  → Platform observability shows sentry=true when DSN is set"
