#!/usr/bin/env bash
# Register Humanify health check on UptimeRobot if API key present; else print checklist.
# Usage:
#   UPTIMEROBOT_API_KEY=u123... bash scripts/register-humanify-uptime-external.sh
#   BETTERSTACK_TOKEN=... bash scripts/register-humanify-uptime-external.sh   # prints BetterStack steps
set -euo pipefail
URL="${HEALTH_URL:-https://humanify.id/api/health?deep=1}"
NAME="${MONITOR_NAME:-Humanify health}"

echo "=== External uptime registration ==="
echo "Target: $URL"
echo ""

if [ -n "${UPTIMEROBOT_API_KEY:-}" ]; then
  echo "→ UptimeRobot API…"
  # List existing to avoid duplicates
  existing=$(curl -sS -X POST https://api.uptimerobot.com/v2/getMonitors \
    -d "api_key=${UPTIMEROBOT_API_KEY}&format=json&search=humanify" || true)
  if echo "$existing" | grep -qi 'humanify.id/api/health'; then
    echo "✓ Monitor already exists (search hit)"
    echo "$existing" | head -c 400; echo
    exit 0
  fi
  resp=$(curl -sS -X POST https://api.uptimerobot.com/v2/newMonitor \
    -d "api_key=${UPTIMEROBOT_API_KEY}&format=json&type=1&url=${URL}&friendly_name=${NAME}&interval=300&keyword_type=2&keyword_value=status\":\"ok")
  echo "$resp"
  if echo "$resp" | grep -q '"stat":"ok"'; then
    echo "✓ UptimeRobot monitor created"
    exit 0
  fi
  echo "⚠ API response not ok — check key / plan limits"
  exit 1
fi

if [ -n "${BETTERSTACK_TOKEN:-}" ]; then
  echo "BetterStack: create HTTP monitor via dashboard or API:"
  echo "  POST https://uptime.betterstack.com/api/v2/monitors"
  echo "  Authorization: Bearer \$BETTERSTACK_TOKEN"
  echo "  {\"url\":\"$URL\",\"pronounceable_name\":\"$NAME\",\"monitor_type\":\"status\",\"check_frequency\":180}"
  exit 0
fi

echo "No UPTIMEROBOT_API_KEY / BETTERSTACK_TOKEN — manual checklist:"
echo "  1. Open UptimeRobot / BetterStack / Pingdom"
echo "  2. Type: HTTP(S)"
echo "  3. URL: $URL"
echo "  4. Interval: 1–5 minutes"
echo "  5. Expect: HTTP 200 + body contains \"status\":\"ok\""
echo "  6. Alert: email/Slack on 2 consecutive failures"
echo ""
echo "Local probe already runs on each deploy (ensure-humanify-uptime-monitor.sh)."
exit 0
