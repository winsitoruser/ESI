#!/usr/bin/env bash
# Force Humanify internal monitoring (no Sentry.io).
# Usage: ENV_FILE=/root/humanify/.env bash scripts/ensure-humanify-sentry.sh
set -euo pipefail
ENV_FILE="${ENV_FILE:-.env}"
APP_URL="${APP_URL:-https://humanify.id}"
touch "$ENV_FILE"

set_kv() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE" || true
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

echo "Ensure Humanify internal monitoring — $ENV_FILE"

# CTO decision (Jul 2026): external Sentry deferred. Always wire internal transport.
INTERNAL_DSN="https://humanify@internal.humanify.local/1"
set_kv "SENTRY_DSN" "$INTERNAL_DSN"
set_kv "SENTRY_MODE" "internal"
set_kv "SENTRY_TRACES_SAMPLE_RATE" "0"

# Explicitly do NOT enable external unless ops opts in later
if ! grep -q '^HUMANIFY_SENTRY_EXTERNAL=' "$ENV_FILE" 2>/dev/null; then
  echo "HUMANIFY_SENTRY_EXTERNAL=false" >> "$ENV_FILE"
fi

echo "  ✓ SENTRY_MODE=internal (no Sentry.io)"
echo "  ✓ Events → ring buffer + humanify_obs_events + /platform/observability"
echo "  → Verify: POST ${APP_URL}/api/platform/sentry-probe"
echo "  → UI: ${APP_URL}/platform/observability"
echo "  → Re-enable Sentry.io later: HUMANIFY_SENTRY_EXTERNAL=true SENTRY_MODE=external + real DSN"
