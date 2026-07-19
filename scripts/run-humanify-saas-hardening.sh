#!/usr/bin/env bash
# Employee hardening + LMS lab gate (fast security gate pair).
# Usage: SMOKE_BASE_URL=https://humanify.id bash scripts/run-humanify-saas-hardening.sh
set -uo pipefail
BASE="${SMOKE_BASE_URL:?SMOKE_BASE_URL required}"
export SMOKE_BASE_URL="$BASE"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail=0
for entry in \
  "smoke-test-saas-employee-hardening.js|employee-hardening" \
  "smoke-test-saas-lms-lab-gate.js|lms-lab-gate"
do
  f="${entry%%|*}"
  s="${entry##*|}"
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
  echo "SaaS hardening FAILED"
  exit 1
fi
echo "SaaS hardening OK"
exit 0
