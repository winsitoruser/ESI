#!/usr/bin/env bash
# Probe health endpoint + persist last result for ops dashboards.
# Usage: HEALTH_URL=https://humanify.id/api/health?deep=1 STATE_FILE=/var/log/humanify-uptime-last.json bash scripts/ensure-humanify-uptime-monitor.sh
set -euo pipefail
URL="${HEALTH_URL:-https://humanify.id/api/health?deep=1}"
STATE_FILE="${STATE_FILE:-/var/log/humanify-uptime-last.json}"

echo "=== Humanify uptime monitor ==="
echo "Target URL: $URL"
echo ""

code=$(curl -sS -o /tmp/hfy-health.json -w "%{http_code}" "$URL" || echo "000")
body=$(head -c 800 /tmp/hfy-health.json 2>/dev/null || true)
now="$(date -Iseconds)"

mkdir -p "$(dirname "$STATE_FILE")" 2>/dev/null || true
printf '{"at":"%s","url":"%s","httpCode":%s,"body":%s}\n' \
  "$now" "$URL" "$code" "$(printf '%s' "$body" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo '""')" \
  > "$STATE_FILE" 2>/dev/null || true

echo "Probe now: HTTP $code"
echo "$body"
echo ""

if [ "$code" = "200" ] && echo "$body" | grep -q '"status":"ok"'; then
  echo "✓ Health endpoint OK"
  echo ""
  echo "Register external monitor (UptimeRobot / BetterStack / Pingdom):"
  echo "  - Type: HTTP(S)"
  echo "  - URL: $URL"
  echo "  - Interval: 1–5 minutes"
  echo "  - Expected: HTTP 200 + body contains \"status\":\"ok\""
  echo "  - Alert: email/Slack on 2 consecutive failures"
  echo ""
  echo "State written: $STATE_FILE"
  exit 0
fi

echo "⚠ Health probe failed — fix before registering external monitor"
exit 1
