#!/usr/bin/env bash
# Ensure Sentry env keys; validate DSN shape (empty key ≠ configured).
# Usage: ENV_FILE=/root/humanify/.env APP_URL=https://humanify.id bash scripts/ensure-humanify-sentry.sh
set -euo pipefail
ENV_FILE="${ENV_FILE:-.env}"
APP_URL="${APP_URL:-https://humanify.id}"
touch "$ENV_FILE"

ensure_kv() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    echo "  ✓ $key key present"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
    echo "  + $key added (empty — set DSN to activate)"
  fi
}

echo "Ensure Humanify Sentry — $ENV_FILE"
ensure_kv "SENTRY_DSN" ""
ensure_kv "SENTRY_TRACES_SAMPLE_RATE" "0"

dsn="$(grep '^SENTRY_DSN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
dsn="$(echo -n "$dsn" | xargs || true)"

if [ -z "$dsn" ]; then
  if [ "${HUMANIFY_SENTRY_INTERNAL:-}" = "true" ] || [ "${SENTRY_MODE:-}" = "internal" ]; then
    internal_dsn="https://humanify@internal.humanify.local/1"
    if grep -q '^SENTRY_DSN=' "$ENV_FILE"; then
      sed -i.bak "s|^SENTRY_DSN=.*|SENTRY_DSN=${internal_dsn}|" "$ENV_FILE" || true
    else
      echo "SENTRY_DSN=${internal_dsn}" >> "$ENV_FILE"
    fi
    if grep -q '^SENTRY_MODE=' "$ENV_FILE"; then
      sed -i.bak 's|^SENTRY_MODE=.*|SENTRY_MODE=internal|' "$ENV_FILE" || true
    else
      echo "SENTRY_MODE=internal" >> "$ENV_FILE"
    fi
    echo "  ✓ SENTRY_DSN auto-set to internal transport (HUMANIFY_SENTRY_INTERNAL)"
  else
    echo "  ✗ SENTRY_DSN is empty — observability.sentry will stay false"
    echo "  → Paste DSN from https://sentry.io → Project Settings → Client Keys (DSN)"
    echo "  → Or: HUMANIFY_SENTRY_INTERNAL=true bash scripts/ensure-humanify-sentry.sh"
    echo "  → Then: pm2 restart humanify --update-env"
    echo "  → Verify: POST ${APP_URL}/api/platform/sentry-probe (platform ops)"
  fi
elif echo "$dsn" | grep -qE '^https://[^@]+@[^/]+/'; then
  echo "  ✓ SENTRY_DSN looks valid (https://…@…/…)"
  echo "  → After deploy, POST ${APP_URL}/api/platform/sentry-probe to verify ingest"
else
  echo "  ✗ SENTRY_DSN present but shape invalid (expect https://<key>@<host>/<project>)"
  echo "  → Fix DSN then: pm2 restart humanify --update-env"
fi
echo "  → Platform observability shows sentry=true only when DSN is non-empty"
