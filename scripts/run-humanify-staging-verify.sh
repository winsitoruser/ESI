#!/usr/bin/env bash
# Wave-62 — Sequential staging verify: scorecard → (optional) hard payroll e2e.
# Always use the public staging host so NextAuth cookies match NEXTAUTH_URL.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE="${HUMANIFY_STAGING_URL:-${SMOKE_BASE_URL:-https://staging.humanify.id}}"
BASE="${BASE%/}"

if [[ "$BASE" =~ 127\.0\.0\.1|/localhost(:|/|$)|://localhost ]]; then
  echo "✗ Refuse loopback BASE=$BASE"
  echo "  Hard payroll / scorecard must use https://staging.humanify.id"
  echo "  (NEXTAUTH_URL cookie mismatch on 127.0.0.1 → stuck at /auth/login)"
  exit 1
fi

export SMOKE_BASE_URL="$BASE"
export PLAYWRIGHT_BASE_URL="$BASE"

echo "=== [1/2] Security scorecard → $SMOKE_BASE_URL ==="
node scripts/run-humanify-security-scorecard.js

if [[ "${HUMANIFY_E2E_HARD:-}" == "1" ]]; then
  if [[ -z "${HUMANIFY_E2E_EMAIL:-}" || -z "${HUMANIFY_E2E_PASSWORD:-}" ]]; then
    echo "✗ HUMANIFY_E2E_HARD=1 requires HUMANIFY_E2E_EMAIL + HUMANIFY_E2E_PASSWORD"
    exit 1
  fi
  echo "=== [2/2] Hard payroll Playwright → $PLAYWRIGHT_BASE_URL ==="
  npx playwright test e2e/humanify-payroll-hard.spec.ts --reporter=line
else
  echo "=== [2/2] Hard payroll skipped (set HUMANIFY_E2E_HARD=1 to enable) ==="
fi

echo "✓ Staging verify complete @ $BASE"
