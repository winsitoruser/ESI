#!/usr/bin/env bash
# PR-034 — record a light capacity baseline into artifacts/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${SMOKE_BASE_URL:-https://humanify.id}"
SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo nosha)"
OUT="${HUMANIFY_GATE_OUT:-$ROOT/artifacts/capacity-${SHA}}"
mkdir -p "$OUT"
TARGET="${1:-$BASE/api/health}"
{
  echo "base=$BASE"
  echo "target=$TARGET"
  echo "sha=$SHA"
  echo "started=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$OUT/capacity.txt"
if command -v npx >/dev/null; then
  npx --yes autocannon -c 10 -d 8 "$TARGET" | tee -a "$OUT/capacity.txt" || echo "autocannon failed" | tee -a "$OUT/capacity.txt"
else
  echo "npx unavailable — curl sample" | tee -a "$OUT/capacity.txt"
  curl -sS -o /dev/null -w "health_http=%{http_code} time=%{time_total}\n" "$TARGET" | tee -a "$OUT/capacity.txt"
fi
echo "See docs/humanify-capacity-baseline.md" | tee -a "$OUT/capacity.txt"
