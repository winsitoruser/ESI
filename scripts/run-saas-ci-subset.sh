#!/usr/bin/env bash
# Critical SaaS regression subset for CI (when SMOKE_BASE_URL is set).
# Usage: SMOKE_BASE_URL=https://humanify.id bash scripts/run-saas-ci-subset.sh
set -uo pipefail
BASE="${SMOKE_BASE_URL:?SMOKE_BASE_URL required}"
export SMOKE_BASE_URL="$BASE"
export HUMANIFY_EMAIL_VERIFY_RETURN_TOKEN="${HUMANIFY_EMAIL_VERIFY_RETURN_TOKEN:-true}"

SCRIPTS=(
  "scripts/smoke-test-saas-tenant-isolation.js|tenant-isolation"
  "scripts/smoke-test-saas-phase2-entitlement.js|entitlement"
  "scripts/smoke-test-saas-phase18-observability.js|observability"
  "scripts/smoke-test-saas-idor-batch11.js|idor-batch11"
  "scripts/smoke-test-saas-payroll-depth.js|payroll-depth"
  "scripts/smoke-test-saas-sso-acs-e2e.js|sso-acs-e2e"
)

fail=0
for entry in "${SCRIPTS[@]}"; do
  f="${entry%%|*}"
  s="${entry##*|}"
  out="$(node "$f" 2>&1 || true)"
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
  echo "CI subset FAILED"
  exit 1
fi
echo "CI subset GREEN"
