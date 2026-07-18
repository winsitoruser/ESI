#!/usr/bin/env bash
# Ensure Redis for Humanify rate-limit + login-guard (multi-instance safe).
# Usage: ENV_FILE=/root/humanify/.env bash scripts/ensure-humanify-redis.sh
set -euo pipefail
ENV_FILE="${ENV_FILE:-.env}"
DEFAULT_URL="${HUMANIFY_REDIS_URL:-redis://127.0.0.1:6379}"
touch "$ENV_FILE"

echo "Ensure Humanify Redis — $ENV_FILE"

# Prefer local redis-server if present
if command -v redis-cli >/dev/null 2>&1; then
  if redis-cli ping >/dev/null 2>&1; then
    echo "  ✓ redis-cli PONG"
  elif command -v systemctl >/dev/null 2>&1; then
    systemctl start redis-server 2>/dev/null || systemctl start redis 2>/dev/null || true
    sleep 1
    if redis-cli ping >/dev/null 2>&1; then
      echo "  ✓ redis started"
    else
      echo "  ⚠ redis-cli present but not responding — set REDIS_URL manually"
    fi
  fi
fi

if grep -q '^REDIS_URL=' "$ENV_FILE" 2>/dev/null; then
  cur="$(grep '^REDIS_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs || true)"
  if [ -n "$cur" ]; then
    echo "  ✓ REDIS_URL already set"
  else
    sed -i.bak "s|^REDIS_URL=.*|REDIS_URL=${DEFAULT_URL}|" "$ENV_FILE" || true
    echo "  ✓ REDIS_URL filled → ${DEFAULT_URL}"
  fi
else
  echo "REDIS_URL=${DEFAULT_URL}" >> "$ENV_FILE"
  echo "  + REDIS_URL=${DEFAULT_URL}"
fi

# Document ops assumption
if ! grep -q '^HUMANIFY_REDIS_REQUIRED=' "$ENV_FILE" 2>/dev/null; then
  echo "HUMANIFY_REDIS_REQUIRED=true" >> "$ENV_FILE"
fi

echo "  → Login lockout + API rate-limit use Redis when REDIS_URL is set"
echo "  → PM2 must stay fork (single) OR Redis must be shared across instances"
echo "  → Verify: GET /api/platform/observability → redis.ok=true"
