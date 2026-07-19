#!/usr/bin/env bash
# Run all Humanify SaaS IDOR smoke scripts (batch5–11 + hr-modules).
# Usage: SMOKE_BASE_URL=https://humanify.id bash scripts/run-humanify-idor-smokes.sh
set -uo pipefail
BASE="${SMOKE_BASE_URL:?SMOKE_BASE_URL required}"
export SMOKE_BASE_URL="$BASE"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SCRIPTS=(
  smoke-test-saas-idor-hr-modules.js
  smoke-test-saas-idor-batch5.js
  smoke-test-saas-idor-batch6.js
  smoke-test-saas-idor-batch7.js
  smoke-test-saas-idor-batch8.js
  smoke-test-saas-idor-batch9.js
  smoke-test-saas-idor-batch10.js
  smoke-test-saas-idor-batch11.js
)

fail=0
echo "Humanify IDOR smokes — $BASE"
for f in "${SCRIPTS[@]}"; do
  s="${f#smoke-test-saas-}"
  s="${s%.js}"
  out="$(node "scripts/$f" 2>&1 || true)"
  res="$(printf '%s\n' "$out" | grep -E 'RESULT:' | tail -1)"
  fl="$(printf '%s' "$res" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' || true)"
  fl="${fl:-1}"
  if [ "$fl" != "0" ] || [ -z "$res" ]; then
    echo "  [FAIL] $s — ${res:-NO RESULT}"
    fail=1
  else
    echo "  [ OK ] $s — $res"
  fi
done

if [ "$fail" = "1" ]; then
  echo "IDOR smokes FAILED"
  exit 1
fi
echo "IDOR smokes OK"
exit 0
