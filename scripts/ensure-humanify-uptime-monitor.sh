#!/usr/bin/env bash
# Print uptime monitor setup instructions + quick health probe.
# Usage: HEALTH_URL=https://humanify.id/api/health?deep=1 bash scripts/ensure-humanify-uptime-monitor.sh
set -euo pipefail
URL="${HEALTH_URL:-https://humanify.id/api/health?deep=1}"

echo "=== Humanify uptime monitor ==="
echo "Target URL: $URL"
echo ""
echo "Recommended (UptimeRobot / BetterStack / Pingdom):"
echo "  - Type: HTTP(S) monitor"
echo "  - Interval: 1–5 minutes"
echo "  - Expected: HTTP 200, body contains \"status\":\"ok\""
echo "  - Alert: email/Slack on 2 consecutive failures"
echo ""

code=$(curl -sS -o /tmp/hfy-health.json -w "%{http_code}" "$URL" || echo "000")
echo "Probe now: HTTP $code"
head -c 400 /tmp/hfy-health.json 2>/dev/null; echo

if [ "$code" = "200" ]; then
  echo "✓ Health endpoint OK — safe to register external monitor"
else
  echo "⚠ Health probe failed — fix before registering monitor"
  exit 1
fi
