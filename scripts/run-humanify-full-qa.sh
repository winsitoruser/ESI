#!/usr/bin/env bash
# Full Humanify QA suite — smoke / security / fiscal / docs / page crawl.
# Usage: SMOKE_BASE_URL=https://humanify.id bash scripts/run-humanify-full-qa.sh
set -uo pipefail
BASE="${SMOKE_BASE_URL:-https://humanify.id}"
export SMOKE_BASE_URL="$BASE"
export SMOKE_EMAIL="${SMOKE_EMAIL:-superadmin@humanify.id}"
export HUMANIFY_EMAIL_VERIFY_RETURN_TOKEN="${HUMANIFY_EMAIL_VERIFY_RETURN_TOKEN:-true}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "══════════════════════════════════════════════════"
echo " Humanify Full QA — $BASE"
echo "══════════════════════════════════════════════════"

fail=0
run() {
  local label="$1"
  local cmd="$2"
  echo ""
  echo "── $label ──"
  if eval "$cmd"; then
    echo "  [ OK ] $label"
  else
    echo "  [FAIL] $label"
    fail=1
  fi
}

run "health" "curl -fsS -m 15 '$BASE/api/health?deep=1' | grep -q '\"status\":\"ok\"'"
run "ci-subset" "bash scripts/run-saas-ci-subset.sh"
run "employee-documents" "node scripts/smoke-test-employee-documents.js"
run "employee-mgmt" "node scripts/smoke-test-employee-management.js"
run "page-crawl" "node scripts/smoke-test-humanify-page-crawl.js"
run "idor-batch5" "node scripts/smoke-test-saas-idor-batch5.js"
run "idor-batch6" "node scripts/smoke-test-saas-idor-batch6.js"
run "idor-batch7" "node scripts/smoke-test-saas-idor-batch7.js"
run "idor-batch8" "node scripts/smoke-test-saas-idor-batch8.js"
run "idor-batch9" "node scripts/smoke-test-saas-idor-batch9.js"
run "idor-batch10" "node scripts/smoke-test-saas-idor-batch10.js"
run "phase16-health" "node scripts/smoke-test-saas-phase16-health.js"
run "phase14-ratelimit" "node scripts/smoke-test-saas-phase14-ratelimit.js"
run "payroll-fiscal" "node scripts/smoke-test-saas-payroll-fiscal.js"
run "email-dns" "DOMAIN=humanify.id bash scripts/check-humanify-email-dns.sh"

echo ""
echo "══════════════════════════════════════════════════"
if [ "$fail" = "0" ]; then
  echo "FULL QA GREEN"
  exit 0
fi
echo "FULL QA HAD FAILURES"
exit 1
