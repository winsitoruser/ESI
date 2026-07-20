#!/usr/bin/env bash
# Staging-only env flags — strict RLS lab, separate from prod soft RLS.
set -euo pipefail

ENV_FILE="${ENV_FILE:-/root/humanify-staging/.env}"
if [ ! -f "$ENV_FILE" ]; then
  echo "  ✗ $ENV_FILE missing"
  exit 1
fi

set_kv() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

set_kv HUMANIFY_DEPLOY_SLOT staging
set_kv HUMANIFY_RLS_REQUEST_BOUND true
set_kv HUMANIFY_RLS_MODE strict
set_kv PORT 3021
set_kv HUMANIFY_STAGING_URL "https://staging.humanify.id"

echo "  ✓ staging env: HUMANIFY_RLS_MODE=strict · PORT=3021"
