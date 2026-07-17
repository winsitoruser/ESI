#!/usr/bin/env bash
# Ensure Sentry optional dependency is documented in .env (does not require DSN).
# Usage: ENV_FILE=/root/humanify/.env bash scripts/ensure-humanify-sentry.sh
set -euo pipefail
ENV_FILE="${ENV_FILE:-.env}"
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
echo "  → Install @sentry/node on deploy; set SENTRY_DSN from Sentry project settings"
echo "  → Verify: platform observability shows sentry=true after restart"
