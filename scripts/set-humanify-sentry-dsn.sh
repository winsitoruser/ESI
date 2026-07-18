#!/usr/bin/env bash
# Humanify monitoring env — defaults to internal (no Sentry.io).
# Usage:
#   MODE=internal bash scripts/set-humanify-sentry-dsn.sh
#   # External (opt-in only — also set HUMANIFY_SENTRY_EXTERNAL=true)
#   HUMANIFY_SENTRY_EXTERNAL=true SENTRY_MODE=external SENTRY_DSN='https://key@o0.ingest.sentry.io/1' bash scripts/set-humanify-sentry-dsn.sh
set -euo pipefail
ENV_FILE="${ENV_FILE:-/root/humanify/.env}"
MODE="${SENTRY_MODE:-${MODE:-internal}}"
DSN="${SENTRY_DSN:-}"

if [ -z "$DSN" ] || [ "${MODE}" = "internal" ]; then
  DSN="https://humanify@internal.humanify.local/1"
  MODE=internal
fi

touch "$ENV_FILE"
if grep -q '^SENTRY_DSN=' "$ENV_FILE"; then
  sed -i.bak "s|^SENTRY_DSN=.*|SENTRY_DSN=${DSN}|" "$ENV_FILE"
else
  echo "SENTRY_DSN=${DSN}" >> "$ENV_FILE"
fi

if grep -q '^SENTRY_MODE=' "$ENV_FILE"; then
  sed -i.bak "s|^SENTRY_MODE=.*|SENTRY_MODE=${MODE}|" "$ENV_FILE"
else
  echo "SENTRY_MODE=${MODE}" >> "$ENV_FILE"
fi

if ! grep -q '^SENTRY_TRACES_SAMPLE_RATE=' "$ENV_FILE"; then
  echo "SENTRY_TRACES_SAMPLE_RATE=0" >> "$ENV_FILE"
fi

if ! grep -q '^HUMANIFY_SENTRY_EXTERNAL=' "$ENV_FILE"; then
  echo "HUMANIFY_SENTRY_EXTERNAL=false" >> "$ENV_FILE"
fi

echo "✓ Monitoring mode=${MODE}"
echo "→ pm2 restart humanify --update-env"
echo "→ POST /api/platform/sentry-probe · UI /platform/observability"
