#!/usr/bin/env bash
# Ensure SumoPod AI env vars in Humanify .env (idempotent).
# Usage:
#   SUMOPOD_AI_API_KEY=sk-... bash scripts/ensure-humanify-sumopod-ai.sh
#   # or reads from ~/.hermes/.env if SUMOPOD_AI_API_KEY not set:
#   bash scripts/ensure-humanify-sumopod-ai.sh
set -euo pipefail

ENV_FILE="${ENV_FILE:-/root/humanify/.env}"
HERMES_ENV="${HERMES_ENV:-$HOME/.hermes/.env}"

read_key() {
  if [ -n "${SUMOPOD_AI_API_KEY:-}" ]; then
    echo "$SUMOPOD_AI_API_KEY"
    return
  fi
  if [ -f "$HERMES_ENV" ]; then
    grep '^SUMOPOD_AI_API_KEY=' "$HERMES_ENV" 2>/dev/null | cut -d= -f2- || true
  fi
}

read_url() {
  if [ -n "${SUMOPOD_AI_BASE_URL:-}" ]; then
    echo "$SUMOPOD_AI_BASE_URL"
    return
  fi
  if [ -f "$HERMES_ENV" ]; then
    grep '^SUMOPOD_AI_BASE_URL=' "$HERMES_ENV" 2>/dev/null | cut -d= -f2- || true
  fi
}

API_KEY="$(read_key)"
BASE_URL="$(read_url)"
BASE_URL="${BASE_URL:-https://ai.sumopod.com/v1}"
MODEL="${HRIS_AI_MODEL:-deepseek-v4-flash}"

if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️  $ENV_FILE not found — skip"
  exit 0
fi

if [ -z "$API_KEY" ]; then
  echo "⚠️  SUMOPOD_AI_API_KEY not set — skip SumoPod AI setup"
  exit 0
fi

set_var() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    # portable in-place replace
    python3 - "$ENV_FILE" "$key" "$val" <<'PY'
import sys, re
path, key, val = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(path).read()
pat = re.compile(rf'^{re.escape(key)}=.*$', re.M)
line = f'{key}={val}'
text = pat.sub(line, text) if pat.search(text) else text.rstrip() + '\n' + line + '\n'
open(path, 'w').write(text)
PY
    echo "  ↻ $key updated"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
    echo "  + $key added"
  fi
}

echo "Ensure Humanify SumoPod AI — $ENV_FILE"
set_var "HRIS_AI_LLM" "true"
set_var "SUMOPOD_API_KEY" "$API_KEY"
set_var "SUMOPOD_AI_API_KEY" "$API_KEY"
set_var "SUMOPOD_BASE_URL" "$BASE_URL"
set_var "SUMOPOD_AI_BASE_URL" "$BASE_URL"
set_var "HRIS_AI_MODEL" "$MODEL"
set_var "HRIS_AI_VISION_MODEL" "${HRIS_AI_VISION_MODEL:-$MODEL}"

echo "  ✓ SumoPod AI configured (model: $MODEL)"
echo "  → Restart PM2: pm2 restart humanify --update-env"
