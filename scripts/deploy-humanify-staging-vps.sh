#!/usr/bin/env bash
# Deploy Humanify staging slot → staging.humanify.id (Wave-58)
#
# Prerequisites:
#   - DNS A record staging.humanify.id → VPS_HOST (Cloudflare proxy OK)
#   - VPS_SSH_KEY or VPS_PASS
#
# Usage:
#   VPS_PASS='...' bash scripts/deploy-humanify-staging-vps.sh
#   VPS_SSH_KEY=~/.ssh/id_ed25519 bash scripts/deploy-humanify-staging-vps.sh
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

export APP_DIR="${APP_DIR:-/root/humanify-staging}"
export HUMANIFY_PM2_NAME="${HUMANIFY_PM2_NAME:-humanify-staging}"
export HUMANIFY_PORT="${HUMANIFY_PORT:-3021}"
export NGINX_SITE="${NGINX_SITE:-humanify-staging}"
export DOMAIN="${DOMAIN:-staging.humanify.id}"
export HUMANIFY_DB_NAME="${HUMANIFY_DB_NAME:-humanify_staging}"
export HUMANIFY_DEPLOY_SLOT="${HUMANIFY_DEPLOY_SLOT:-staging}"
export ECOSYSTEM_FILE="${ECOSYSTEM_FILE:-humanify-ecosystem.staging.config.cjs}"
export CLOUDFLARE_SSL="${CLOUDFLARE_SSL:-true}"
export DEPLOY_SKIP_BOOTSTRAP="${DEPLOY_SKIP_BOOTSTRAP:-false}"

echo "=== Humanify STAGING deploy → $DOMAIN (PM2 $HUMANIFY_PM2_NAME :$HUMANIFY_PORT) ==="
exec bash "$SCRIPT_DIR/deploy-humanify-vps.sh" "$@"
