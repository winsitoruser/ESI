#!/usr/bin/env bash
# Run the full SaaS smoke regression suite against a target base URL.
# Usage: SMOKE_BASE_URL=https://humanify.id bash scripts/run-saas-regression.sh
set -uo pipefail

SCRIPTS=(
  phase1-signup phase2-entitlement phase3-metrics phase4-billing
  phase5-enterprise phase5b-support phase6-seats phase7-golive
  phase8-partners phase9-alerts phase10-plan-change phase11-offboarding
  phase12-digest phase13-sso phase14-ratelimit phase15-password-reset
  phase16-health phase17-login-lockout phase18-observability phase19-mfa
  phase20-employee-import phase21-notifications phase22-search
  phase23-invitations tenant-isolation
)

total_pass=0
total_fail=0
failed_scripts=""

for s in "${SCRIPTS[@]}"; do
  f="scripts/smoke-test-saas-${s}.js"
  out="$(node "$f" 2>&1 || true)"
  res="$(printf '%s\n' "$out" | grep -E 'RESULT:' | tail -1)"
  p="$(printf '%s' "$res" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || true)"
  fl="$(printf '%s' "$res" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' || true)"
  p="${p:-0}"; fl="${fl:-0}"
  total_pass=$((total_pass + p))
  total_fail=$((total_fail + fl))
  if [ "$fl" != "0" ] || [ -z "$res" ]; then
    failed_scripts="${failed_scripts} ${s}"
    printf '  [FAIL] %-24s %s\n' "$s" "${res:-NO RESULT — $(printf '%s' "$out" | tail -1)}"
  else
    printf '  [ OK ] %-24s %s\n' "$s" "$res"
  fi
done

echo "----"
echo "TOTAL: ${total_pass} passed, ${total_fail} failed"
if [ -n "$failed_scripts" ]; then
  echo "FAILED SCRIPTS:${failed_scripts}"
  exit 1
fi
echo "ALL SCRIPTS GREEN"
