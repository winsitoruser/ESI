#!/usr/bin/env bash
# Set OBS_ALERT_WEBHOOK_URL on Humanify .env (Slack Incoming Webhook / Discord / generic).
# Usage:
#   OBS_ALERT_WEBHOOK_URL='https://hooks.slack.com/services/...' ENV_FILE=.env bash scripts/set-humanify-obs-webhook.sh
#   # On VPS after set: pm2 restart humanify --update-env
set -euo pipefail
ENV_FILE="${ENV_FILE:-.env}"
URL="${OBS_ALERT_WEBHOOK_URL:-}"

if [ -z "$URL" ]; then
  echo "Usage: OBS_ALERT_WEBHOOK_URL='https://hooks.slack.com/services/XXX/YYY/ZZZ' bash $0"
  echo ""
  echo "Slack: Incoming Webhooks → Create → copy URL"
  echo "Discord: Channel → Integrations → Webhooks → copy URL (JSON {content|text} supported via text field)"
  echo "Docs: docs/humanify-ops-alerts.md"
  exit 1
fi

touch "$ENV_FILE"
if grep -q '^OBS_ALERT_WEBHOOK_URL=' "$ENV_FILE" 2>/dev/null; then
  # Escape & for sed
  esc="$(printf '%s' "$URL" | sed 's/[&|]/\\&/g')"
  sed -i.bak "s|^OBS_ALERT_WEBHOOK_URL=.*|OBS_ALERT_WEBHOOK_URL=${esc}|" "$ENV_FILE"
  echo "✓ OBS_ALERT_WEBHOOK_URL updated"
else
  echo "OBS_ALERT_WEBHOOK_URL=${URL}" >> "$ENV_FILE"
  echo "+ OBS_ALERT_WEBHOOK_URL added"
fi

echo "→ Restart app to pick up env: pm2 restart humanify --update-env"
echo "→ Test: POST /api/platform/obs-alerts (ops session) after forcing a spike, or wait for cron"
echo "→ Dry probe: node scripts/probe-humanify-obs-webhook.js"
