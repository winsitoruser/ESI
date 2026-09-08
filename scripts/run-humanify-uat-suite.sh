#!/usr/bin/env bash
# Humanify — Smoke + QA + UAT + FE/BE suite (prod-focused)
# Usage:
#   SMOKE_BASE_URL=https://humanify.id bash scripts/run-humanify-uat-suite.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
BASE="${SMOKE_BASE_URL:-https://humanify.id}"
SHA="$(git rev-parse --short HEAD 2>/dev/null || echo nosha)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${HUMANIFY_UAT_OUT:-$ROOT/artifacts/uat-${SHA}-${STAMP}}"
mkdir -p "$OUT"
export SMOKE_BASE_URL="$BASE"
export PLAYWRIGHT_BASE_URL="$BASE"

log() { echo "[uat] $*"; }
iso_now() { date -u +%Y-%m-%dT%H:%M:%SZ; }

PASS=0
FAIL=0
SKIP=0

run() {
  local name="$1"; shift
  log ">>> $name"
  if "$@" >"$OUT/${name}.log" 2>&1; then
    echo "PASS $name" | tee -a "$OUT/SUMMARY.txt"
    PASS=$((PASS + 1))
    return 0
  else
    echo "FAIL $name" | tee -a "$OUT/SUMMARY.txt"
    FAIL=$((FAIL + 1))
    # keep going — collect all results
    return 0
  fi
}

{
  echo "Humanify UAT / QA Suite"
  echo "base=$BASE"
  echo "sha=$SHA"
  echo "started=$(iso_now)"
  echo ""
} | tee "$OUT/SUMMARY.txt"

# ── A. Health / smoke ──────────────────────────────────────────
if curl -sS -o "$OUT/health.json" -w "%{http_code}" "$BASE/api/health" | tee "$OUT/health.code" | grep -q '^200$'; then
  echo "PASS A-health" | tee -a "$OUT/SUMMARY.txt"
  PASS=$((PASS + 1))
else
  echo "FAIL A-health" | tee -a "$OUT/SUMMARY.txt"
  FAIL=$((FAIL + 1))
fi

run "A-sidebar-persona" npm run smoke:sidebar-persona
run "A-ops-host" env SMOKE_BASE_URL="$BASE" SMOKE_OPS_URL="${SMOKE_OPS_URL:-https://ops.humanify.id}" npm run smoke:ops-host
run "A-admin-host" env SMOKE_BASE_URL="$BASE" SMOKE_ADMIN_URL="${SMOKE_ADMIN_URL:-https://admin.humanify.id}" npm run smoke:admin-host

# ── B. Backend / integration ───────────────────────────────────
run "B-lms-integration" env SMOKE_BASE_URL="$BASE" node scripts/smoke-test-humanify-lms-integration.js
run "B-lms-lab-gate" env SMOKE_BASE_URL="$BASE" npm run smoke:lms-lab-gate
run "B-functional-crud" env SMOKE_BASE_URL="$BASE" npm run smoke:functional-crud
run "B-billing-idempotency" env SMOKE_BASE_URL="$BASE" npm run smoke:billing-idempotency
run "B-phase4-billing" env SMOKE_BASE_URL="$BASE" npm run smoke:phase4-billing
run "B-module-pages" env SMOKE_BASE_URL="$BASE" npm run smoke:module-pages

# ── C. QA / multi-role / GA ────────────────────────────────────
run "C-ga-journey" env SMOKE_BASE_URL="$BASE" npm run smoke:ga-journey
run "C-multi-role" env SMOKE_BASE_URL="$BASE" npm run smoke:multi-role
run "C-hr-wave-uat" env SMOKE_BASE_URL="$BASE" npm run smoke:hr-wave-uat
run "C-prod-readiness" env SMOKE_BASE_URL="$BASE" npm run smoke:prod-readiness

# ── D. Frontend E2E (Playwright) ───────────────────────────────
if command -v npx >/dev/null 2>&1; then
  run "D-e2e-health" npx playwright test e2e/humanify-health-ui.spec.ts --reporter=line
  run "D-e2e-hr-auth-gate" npx playwright test e2e/humanify-hr-auth-gate-ui.spec.ts --reporter=line
  run "D-e2e-modules" npx playwright test e2e/humanify-module-pages-ui.spec.ts --reporter=line
else
  echo "SKIP D-playwright (npx missing)" | tee -a "$OUT/SUMMARY.txt"
  SKIP=$((SKIP + 1))
fi

# ── E. Local static gates ──────────────────────────────────────
run "E-wave79" npm run smoke:wave79-entitlements
run "E-wave80" npm run smoke:wave80
run "E-wave81" npm run smoke:wave81

{
  echo ""
  echo "finished=$(iso_now)"
  echo "pass=$PASS fail=$FAIL skip=$SKIP"
  echo "artifacts=$OUT"
} | tee -a "$OUT/SUMMARY.txt"

log "Done — pass=$PASS fail=$FAIL skip=$SKIP"
log "Artifacts: $OUT"
exit "$FAIL"
