#!/usr/bin/env bash
# Ensure HUMANIFY_FISCAL_SIGNED_OFF on Humanify VPS .env (Wave-55 / L0-2).
# Usage: bash scripts/ensure-humanify-fiscal-signoff.sh [/path/to/.env]
set -euo pipefail
ENV_FILE="${1:-${ENV_FILE:-/root/humanify/.env}}"
KEY=HUMANIFY_FISCAL_SIGNED_OFF
VAL="${HUMANIFY_FISCAL_SIGNED_OFF:-true}"

echo "Ensure Humanify fiscal sign-off — $ENV_FILE"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "  ⚠️  .env missing — skip"
  exit 0
fi

if grep -q "^${KEY}=" "$ENV_FILE" 2>/dev/null; then
  sed -i.bak "s|^${KEY}=.*|${KEY}=${VAL}|" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
  echo "  ↻ ${KEY}=${VAL}"
else
  echo "${KEY}=${VAL}" >> "$ENV_FILE"
  echo "  ✓ ${KEY}=${VAL} added"
fi
echo "  → Checklist: docs/humanify-payroll-fiscal-signoff.md (D-018)"
