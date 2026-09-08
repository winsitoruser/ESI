#!/usr/bin/env bash
# Ensure SMTP keys exist on Humanify VPS .env (do not invent credentials).
# If SMTP_HOST/USER/PASSWORD are passed in the environment, upsert them.
# Usage: ENV_FILE=/root/humanify/.env bash scripts/ensure-humanify-smtp.sh
set -euo pipefail
ENV_FILE="${ENV_FILE:-.env}"
touch "$ENV_FILE"

set_kv() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    local esc
    esc="$(printf '%s' "$val" | sed 's/[&|]/\\&/g')"
    sed -i.bak "s|^${key}=.*|${key}=${esc}|" "$ENV_FILE" || true
    echo "  ✓ $key updated"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
    echo "  + $key added"
  fi
}

echo "Ensure Humanify SMTP — $ENV_FILE"

if [ -n "${SMTP_HOST:-}" ] && [ -n "${SMTP_USER:-}" ] && [ -n "${SMTP_PASSWORD:-}" ]; then
  set_kv SMTP_HOST "$SMTP_HOST"
  set_kv SMTP_PORT "${SMTP_PORT:-465}"
  set_kv SMTP_SECURE "${SMTP_SECURE:-true}"
  set_kv SMTP_USER "$SMTP_USER"
  set_kv SMTP_PASSWORD "$SMTP_PASSWORD"
  set_kv SMTP_FROM "${SMTP_FROM:-noreply@humanify.id}"
  set_kv SMTP_FROM_NAME "${SMTP_FROM_NAME:-Humanify}"
fi

missing=0
for k in SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASSWORD SMTP_FROM; do
  if ! grep -q "^${k}=" "$ENV_FILE" 2>/dev/null; then
    echo "  ✗ $k missing"
    missing=1
  elif [ -z "$(grep "^${k}=" "$ENV_FILE" | cut -d= -f2- | tr -d "\"'" | xargs || true)" ]; then
    echo "  ✗ $k empty"
    missing=1
  else
    echo "  ✓ $k present"
  fi
done

if [ "$missing" -eq 1 ]; then
  echo "⚠️  SMTP incomplete — signup verification / password-reset / invites will NOT send."
  echo "    Set SMTP_HOST USER PASSWORD on the VPS .env (SumoPod smtp.sumopod.com:465 SSL)."
  exit 0
fi

echo "  ✓ SMTP keys present (values not printed)"
