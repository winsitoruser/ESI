#!/usr/bin/env bash
# Wave-85 — enable strict RLS on prod ONLY with dual flag + confirmation.
# Usage:
#   HUMANIFY_RLS_FORCE_PROD=true CONFIRM_STRICT_PROD=YES bash scripts/enable-humanify-rls-strict-prod.sh
set -euo pipefail
if [ "${HUMANIFY_RLS_FORCE_PROD:-}" != "true" ] || [ "${CONFIRM_STRICT_PROD:-}" != "YES" ]; then
  echo "Refusing: set HUMANIFY_RLS_FORCE_PROD=true and CONFIRM_STRICT_PROD=YES"
  echo "See docs/humanify-wave85-track-b.md"
  exit 2
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "Applying strict RLS policies…"
npm run db:humanify-rls:strict
echo "Done. Set HUMANIFY_RLS_MODE=strict in .env and restart PM2."
echo "Verify: npm run smoke:rls-lab && npm run smoke:rls-job-chaos"
