#!/usr/bin/env bash
# Ensure observability alert env for Humanify (cron + email/webhook).
# Usage: ENV_FILE=/root/humanify/.env bash scripts/ensure-humanify-obs-alerts.sh
set -euo pipefail
ENV_FILE="${ENV_FILE:-.env}"
touch "$ENV_FILE"

set_kv_if_empty() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    cur="$(grep "^${key}=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs || true)"
    if [ -z "$cur" ]; then
      sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE" || true
      echo "  ✓ $key filled"
    else
      echo "  ✓ $key already set"
    fi
  else
    echo "${key}=${val}" >> "$ENV_FILE"
    echo "  + $key added"
  fi
}

echo "Ensure Humanify obs alerts — $ENV_FILE"

# Cron must hit local Next (PM2 :3020), not Cloudflare edge
set_kv_if_empty "OBS_ALERT_CHECK_URL" "http://127.0.0.1:3020"

# Shared cron secret (also used by other platform crons)
if ! grep -q '^CRON_SECRET=' "$ENV_FILE" 2>/dev/null || [ -z "$(grep '^CRON_SECRET=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | xargs || true)" ]; then
  secret="$(openssl rand -hex 24 2>/dev/null || head -c 48 /dev/urandom | xxd -p | head -c 48)"
  if grep -q '^CRON_SECRET=' "$ENV_FILE" 2>/dev/null; then
    sed -i.bak "s|^CRON_SECRET=.*|CRON_SECRET=${secret}|" "$ENV_FILE" || true
  else
    echo "CRON_SECRET=${secret}" >> "$ENV_FILE"
  fi
  echo "  + CRON_SECRET generated"
else
  echo "  ✓ CRON_SECRET already set"
fi

set_kv_if_empty "OBS_ALERT_CRON_SECRET" ""
# Mirror CRON_SECRET into OBS_ALERT_CRON_SECRET if empty
if grep -q '^OBS_ALERT_CRON_SECRET=$' "$ENV_FILE" 2>/dev/null || ! grep -q '^OBS_ALERT_CRON_SECRET=' "$ENV_FILE" 2>/dev/null; then
  cron_val="$(grep '^CRON_SECRET=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs || true)"
  if [ -n "$cron_val" ]; then
    if grep -q '^OBS_ALERT_CRON_SECRET=' "$ENV_FILE" 2>/dev/null; then
      sed -i.bak "s|^OBS_ALERT_CRON_SECRET=.*|OBS_ALERT_CRON_SECRET=${cron_val}|" "$ENV_FILE" || true
    else
      echo "OBS_ALERT_CRON_SECRET=${cron_val}" >> "$ENV_FILE"
    fi
    echo "  ✓ OBS_ALERT_CRON_SECRET = CRON_SECRET"
  fi
fi

set_kv_if_empty "OBS_ALERT_ERROR_THRESHOLD" "10"
set_kv_if_empty "OBS_ALERT_WINDOW_MIN" "15"

# Optional webhook from deploy env (do not invent URL)
if [ -n "${OBS_ALERT_WEBHOOK_URL:-}" ]; then
  if grep -q '^OBS_ALERT_WEBHOOK_URL=' "$ENV_FILE" 2>/dev/null; then
    esc="$(printf '%s' "$OBS_ALERT_WEBHOOK_URL" | sed 's/[&|]/\\&/g')"
    sed -i.bak "s|^OBS_ALERT_WEBHOOK_URL=.*|OBS_ALERT_WEBHOOK_URL=${esc}|" "$ENV_FILE" || true
    echo "  ✓ OBS_ALERT_WEBHOOK_URL from deploy env"
  else
    echo "OBS_ALERT_WEBHOOK_URL=${OBS_ALERT_WEBHOOK_URL}" >> "$ENV_FILE"
    echo "  + OBS_ALERT_WEBHOOK_URL added from deploy env"
  fi
fi

# Default alert email to SMTP_FROM / ops mailbox if unset
if ! grep -q '^OBS_ALERT_EMAIL=' "$ENV_FILE" 2>/dev/null || [ -z "$(grep '^OBS_ALERT_EMAIL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | xargs || true)" ]; then
  from="$(grep '^SMTP_FROM=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs || true)"
  # Prefer ops inbox over noreply
  email="${OBS_ALERT_EMAIL_DEFAULT:-ops@humanify.id}"
  if [ -n "$from" ] && [[ "$from" != noreply@* ]]; then
    email="$from"
  fi
  if grep -q '^OBS_ALERT_EMAIL=' "$ENV_FILE" 2>/dev/null; then
    sed -i.bak "s|^OBS_ALERT_EMAIL=.*|OBS_ALERT_EMAIL=${email}|" "$ENV_FILE" || true
  else
    echo "OBS_ALERT_EMAIL=${email}" >> "$ENV_FILE"
  fi
  echo "  ✓ OBS_ALERT_EMAIL=${email}"
else
  echo "  ✓ OBS_ALERT_EMAIL already set"
fi

echo "  → Optional: OBS_ALERT_WEBHOOK_URL=https://hooks.slack.com/..."
echo "  → Set webhook: bash scripts/set-humanify-obs-webhook.sh"
echo "  → Docs: docs/humanify-ops-alerts.md"
echo "  → Cron: */10 * * * * node scripts/check-humanify-obs-alerts.js"
echo "  → UI: /platform/observability"
