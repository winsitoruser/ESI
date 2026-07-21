#!/usr/bin/env bash
# Humanify QA Matrix — maps formal test types → runnable suites.
#
# Usage:
#   SMOKE_BASE_URL=https://staging.humanify.id \
#   SMOKE_EMAIL=… SMOKE_PASSWORD=… \
#   VPS_PASS='…' \
#   bash scripts/run-humanify-qa-matrix.sh
#
# Types: Smoke, Sanity, Regression, Retest, E2E, API, UI, Database, Exploratory, AdHoc
set -uo pipefail

BASE="${SMOKE_BASE_URL:-https://staging.humanify.id}"
export SMOKE_BASE_URL="$BASE"
export SMOKE_EMAIL="${SMOKE_EMAIL:-superadmin@humanify.id}"
export SMOKE_PASSWORD="${SMOKE_PASSWORD:-superadmin123}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-$BASE}"
export HUMANIFY_E2E_EMAIL="${HUMANIFY_E2E_EMAIL:-$SMOKE_EMAIL}"
export HUMANIFY_E2E_PASSWORD="${HUMANIFY_E2E_PASSWORD:-$SMOKE_PASSWORD}"
export HUMANIFY_E2E_HARD="${HUMANIFY_E2E_HARD:-1}"
export HUMANIFY_EMAIL_VERIFY_RETURN_TOKEN=true
export HUMANIFY_INVITE_RETURN_TOKEN=true
export HUMANIFY_PASSWORD_RESET_RETURN_TOKEN=true

if [ -n "${VPS_PASS:-}" ] && [ -z "${SSHPASS:-}" ]; then
  export SSHPASS="$VPS_PASS"
fi
if [[ "$BASE" == *"humanify.id"* ]] && [[ "$BASE" != *"staging"* ]]; then
  export HUMANIFY_E2E_ALLOW_PROD="${HUMANIFY_E2E_ALLOW_PROD:-1}"
fi
export HUMANIFY_E2E_ALLOW_LOOPBACK="${HUMANIFY_E2E_ALLOW_LOOPBACK:-0}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
REPORT="${HUMANIFY_QA_REPORT:-/tmp/humanify-qa-matrix-report.jsonl}"
: > "$REPORT"

echo "════════════════════════════════════════════════════════"
echo " Humanify QA Matrix — $BASE"
echo " Report: $REPORT"
echo "════════════════════════════════════════════════════════"

pass=0; fail=0
run() {
  local type="$1" label="$2" cmd="$3"
  echo ""
  echo "── [$type] $label ──"
  local start end status="PASS" exitc=0
  start=$(date +%s)
  if eval "$cmd" > "/tmp/hf-qa-${type}-${label//[^a-zA-Z0-9]/_}.log" 2>&1; then
    echo "  [ PASS ] $type · $label"
    pass=$((pass + 1))
  else
    exitc=$?
    status="FAIL"
    echo "  [ FAIL ] $type · $label (exit $exitc)"
    fail=$((fail + 1))
    tail -8 "/tmp/hf-qa-${type}-${label//[^a-zA-Z0-9]/_}.log" | sed 's/^/    /'
  fi
  end=$(date +%s)
  printf '{"type":"%s","label":"%s","status":"%s","exit":%s,"seconds":%s,"at":"%s"}\n' \
    "$type" "$label" "$status" "$exitc" "$((end - start))" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$REPORT"
}

# ─── Smoke ───
run Smoke health "curl -fsS -m 15 \"$BASE/api/health?deep=1\" | grep -q '\"status\":\"ok\"'"
run Smoke page-crawl "node scripts/smoke-test-humanify-page-crawl.js"
run Smoke module-pages "node scripts/smoke-test-humanify-module-pages.js"
run Smoke dashboard "node scripts/smoke-test-humanify-dashboard.js"
run Smoke scorecard "npm run security:scorecard"

# ─── Sanity ───
run Sanity payroll-golden "npm run smoke:payroll-golden"
run Sanity payroll-module "node scripts/smoke-test-humanify-payroll.js"
run Sanity attendance "node scripts/smoke-test-humanify-attendance.js"
run Sanity employees-create "node scripts/qa-sanity-employee-create.js"

# ─── Regression ───
run Regression full-qa "bash scripts/run-humanify-full-qa.sh"
run Regression hris-full "node scripts/smoke-test-hris-full.js"
run Regression vps-comprehensive "node scripts/smoke-test-humanify-vps.js"
run Regression kpi "node scripts/smoke-test-humanify-kpi-performance-engagement.js"
run Regression recruitment "node scripts/smoke-test-humanify-recruitment-training.js"
run Regression ops-hr "node scripts/smoke-test-humanify-ops-hr.js"

# ─── Retest ───
run Retest leave-create "node scripts/qa-retest-leave-create.js"
run Retest ir-incident "node scripts/smoke-test-ir-disciplinary-integration.js"
run Retest employee-portal "node scripts/smoke-test-employee-portal-full.js"
run Retest org-summary-keys "node scripts/qa-retest-org-summary.js"

# ─── E2E / UI ───
run E2E soft-ui "npx playwright test e2e/humanify-welcome-login.spec.ts e2e/humanify-signup-ui.spec.ts e2e/humanify-payroll-ui.spec.ts e2e/humanify-hr-auth-gate-ui.spec.ts e2e/humanify-ops-auth-gate-ui.spec.ts --reporter=line"
run E2E hard-payroll "npx playwright test e2e/humanify-payroll-hard.spec.ts --reporter=line"
run UI auth-pages-buttons "npx playwright test e2e/humanify-authenticated-ui-smoke.spec.ts --reporter=line"
run UI module-pages "npx playwright test e2e/humanify-module-pages-ui.spec.ts --reporter=line"

# ─── API ───
run API payroll-depth "node scripts/smoke-test-saas-payroll-depth.js"
run API idor-batch10 "node scripts/smoke-test-saas-idor-batch10.js"
run API mock-guard "npm run smoke:mock-guard"

# ─── Database ───
run Database rls-lab-unit "npm run smoke:rls-lab"
run Database db-probe "node scripts/qa-db-probe.js"

# ─── Exploratory / Ad-hoc ───
run Exploratory enterprise "node scripts/smoke-test-humanify-enterprise.js"
run AdHoc random-module-gets "node scripts/qa-adhoc-module-gets.js"

echo ""
echo "════════════════════════════════════════════════════════"
echo " QA MATRIX DONE — $pass passed / $fail failed"
echo " Report JSONL: $REPORT"
echo "════════════════════════════════════════════════════════"
exit "$([ "$fail" = "0" ] && echo 0 || echo 1)"
