#!/usr/bin/env bash
# Soft RLS + request-bound is the production standard (CTO/DevOps Jul 2026).
# Strict RLS remains opt-in and must NOT be enabled on shared pools until all
# cron/job paths set app.current_tenant.
#
# Usage: ENV_FILE=/root/humanify/.env bash scripts/enable-humanify-rls-request-bound.sh
set -euo pipefail
ENV_FILE="${ENV_FILE:-.env}"
touch "$ENV_FILE"

if grep -q '^HUMANIFY_RLS_REQUEST_BOUND=' "$ENV_FILE"; then
  sed -i.bak 's|^HUMANIFY_RLS_REQUEST_BOUND=.*|HUMANIFY_RLS_REQUEST_BOUND=true|' "$ENV_FILE"
else
  echo "HUMANIFY_RLS_REQUEST_BOUND=true" >> "$ENV_FILE"
fi

# Soft is the only supported prod mode unless explicitly overridden
if grep -q '^HUMANIFY_RLS_MODE=' "$ENV_FILE"; then
  cur="$(grep '^HUMANIFY_RLS_MODE=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs || true)"
  if [ "$cur" = "strict" ]; then
    echo "⚠ HUMANIFY_RLS_MODE=strict present — leaving as-is (ops override)"
  else
    sed -i.bak 's|^HUMANIFY_RLS_MODE=.*|HUMANIFY_RLS_MODE=soft|' "$ENV_FILE"
  fi
else
  echo "HUMANIFY_RLS_MODE=soft" >> "$ENV_FILE"
fi

echo "✓ HUMANIFY_RLS_REQUEST_BOUND=true"
echo "✓ HUMANIFY_RLS_MODE=soft (prod standard)"
echo "→ Apply policies: npm run db:humanify-rls"
echo "→ Strict blocked for prod pools: npm run db:humanify-rls:strict (staging only after smoke)"
