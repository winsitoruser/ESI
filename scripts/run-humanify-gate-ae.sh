#!/usr/bin/env bash
# Gate A–E artifact runner (Wave-82 QA-82-4)
# Usage:
#   SMOKE_BASE_URL=https://humanify.id bash scripts/run-humanify-gate-ae.sh
#   bash scripts/run-humanify-gate-ae.sh   # defaults to https://humanify.id
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
BASE="${SMOKE_BASE_URL:-https://humanify.id}"
SHA="$(git rev-parse --short HEAD 2>/dev/null || echo nosha)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${HUMANIFY_GATE_OUT:-$ROOT/artifacts/release-${SHA}-${STAMP}}"
mkdir -p "$OUT"
export SMOKE_BASE_URL="$BASE"

log() { echo "[gate] $*"; }
iso_now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
run_gate() {
  local name="$1"; shift
  log ">>> $name"
  if "$@" >"$OUT/${name}.log" 2>&1; then
    echo "PASS $name" | tee -a "$OUT/SUMMARY.txt"
    return 0
  else
    echo "FAIL $name" | tee -a "$OUT/SUMMARY.txt"
    return 1
  fi
}

{
  echo "Humanify Gate A–E"
  echo "base=$BASE"
  echo "sha=$SHA"
  echo "started=$(iso_now)"
} | tee "$OUT/SUMMARY.txt"

FAILS=0

# A — health
if curl -sS -o "$OUT/health.json" -w "%{http_code}" "$BASE/api/health" | tee "$OUT/health.code" | grep -q '^200$'; then
  echo "PASS A-health" | tee -a "$OUT/SUMMARY.txt"
else
  echo "FAIL A-health" | tee -a "$OUT/SUMMARY.txt"
  FAILS=$((FAILS + 1))
fi

# Local static gates (always)
run_gate "B-hq-auth-lint" npm run lint:humanify-hq-auth || FAILS=$((FAILS + 1))
run_gate "B-wave81" npm run smoke:wave81 || FAILS=$((FAILS + 1))
run_gate "C-wave79" npm run smoke:wave79-entitlements || FAILS=$((FAILS + 1))
run_gate "C-wave80" npm run smoke:wave80 || FAILS=$((FAILS + 1))
run_gate "D-sidebar-persona" npm run smoke:sidebar-persona || FAILS=$((FAILS + 1))

# Network smokes (may need secrets — record skip vs fail)
if [ "${HUMANIFY_GATE_NETWORK:-true}" = true ]; then
  run_gate "C-payroll-golden" env SMOKE_BASE_URL="$BASE" npm run smoke:payroll-golden || FAILS=$((FAILS + 1))
  run_gate "C-claim-proof" env SMOKE_BASE_URL="$BASE" npm run smoke:claim-proof || FAILS=$((FAILS + 1))
  run_gate "D-ga-journey" env SMOKE_BASE_URL="$BASE" npm run smoke:ga-journey || FAILS=$((FAILS + 1))
fi

# E — ops evidence (must not stub-pass)
run_gate "E-backup-freshness" npm run check:backup-freshness || FAILS=$((FAILS + 1))
{
  echo "# Gate E — ops"
  echo "- SHA: $SHA"
  echo "- Backup freshness: see E-backup-freshness.log"
  echo "- Health: see health.json / health.code"
  echo "- Rollback: prior BUILD_ID from PM2 / artifacts folder"
  echo "- Artifacts folder: $OUT"
  echo "- finished: $(iso_now)"
} > "$OUT/E-ops-checklist.md"
if [ "$FAILS" -eq 0 ]; then
  echo "PASS E-ops" | tee -a "$OUT/SUMMARY.txt"
else
  echo "FAIL E-ops (see SUMMARY)" | tee -a "$OUT/SUMMARY.txt"
fi

echo "finished=$(iso_now) fails=$FAILS" | tee -a "$OUT/SUMMARY.txt"
echo "Artifacts: $OUT"
exit "$FAILS"
