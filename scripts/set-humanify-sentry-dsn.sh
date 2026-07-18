#!/usr/bin/env bash
# Set / activate Humanify Sentry on VPS .env
# Usage:
#   # Internal mode (no external Sentry account) — recommended default until real DSN available
#   MODE=internal bash scripts/set-humanify-sentry-dsn.sh
#   # External DSN
#   SENTRY_DSN='https://key@o0.ingest.sentry.io/1' bash scripts/set-humanify-sentry-dsn.sh
set -euo pipefail
ENV_FILE="${ENV_FILE:-/root/humanify/.env}"
MODE="${SENTRY_MODE:-${MODE:-}}"
DSN="${SENTRY_DSN:-}"

if [ -z "$DSN" ] && [ "${MODE}" = "internal" ]; then
  DSN="https://humanify@internal.humanify.local/1"
  MODE=internal
fi

if [ -z "$DSN" ]; then
  echo "Usage: SENTRY_DSN=https://...@.../... bash $0"
  echo "   or: MODE=internal bash $0"
  exit 1
fi

touch "$ENV_FILE"
if grep -q '^SENTRY_DSN=' "$ENV_FILE"; then
  sed -i.bak "s|^SENTRY_DSN=.*|SENTRY_DSN=${DSN}|" "$ENV_FILE"
else
  echo "SENTRY_DSN=${DSN}" >> "$ENV_FILE"
fi

if [ -n "$MODE" ]; then
  if grep -q '^SENTRY_MODE=' "$ENV_FILE"; then
    sed -i.bak "s|^SENTRY_MODE=.*|SENTRY_MODE=${MODE}|" "$ENV_FILE"
  else
    echo "SENTRY_MODE=${MODE}" >> "$ENV_FILE"
  fi
fi

if ! grep -q '^SENTRY_TRACES_SAMPLE_RATE=' "$ENV_FILE"; then
  echo "SENTRY_TRACES_SAMPLE_RATE=0" >> "$ENV_FILE"
fi

echo "✓ SENTRY_DSN set (mode=${MODE:-external})"
echo "→ pm2 restart humanify --update-env"
echo "→ POST /api/platform/sentry-probe (platform ops)"
