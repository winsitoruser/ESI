#!/usr/bin/env bash
# Idempotently install Humanify platform cron jobs on the VPS (root crontab).
# Usage: APP_DIR=/root/humanify bash scripts/ensure-humanify-crons.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/root/humanify}"
LOG_DIR="${LOG_DIR:-/var/log}"
HEALTH_URL="${HEALTH_URL:-https://humanify.id/api/health?deep=1}"
MARKER="humanify-platform-cron"

ensure_line() {
  local tag="$1"
  local schedule="$2"
  local cmd="$3"
  local full="${schedule} cd ${APP_DIR} && ${cmd} # ${MARKER}:${tag}"
  if crontab -l 2>/dev/null | grep -Fq "${MARKER}:${tag}"; then
    echo "  ✓ cron ${tag} already installed"
  else
    (crontab -l 2>/dev/null || true; echo "$full") | crontab -
    echo "  + cron ${tag} added"
  fi
}

echo "Ensure Humanify crons — APP_DIR=$APP_DIR"

# Soft-purge offboarded tenants — daily 04:00 WIB (21:00 UTC)
ensure_line "purge" "0 21 * * *" \
  "node scripts/purge-offboarded-tenants.js >> ${LOG_DIR}/humanify-offboard-purge.log 2>&1"

# Hard-delete archived tenants past retention — weekly Sun 05:30 WIB (22:30 UTC Sun)
ensure_line "hard-delete" "30 22 * * 0" \
  "HARD_DELETE_CONFIRM=true node scripts/hard-delete-purged-tenants.js >> ${LOG_DIR}/humanify-hard-delete.log 2>&1"

# Lightweight external health probe log (curl fail → append FAIL line)
ensure_line "health" "*/5 * * * *" \
  "curl -fsS -m 10 '${HEALTH_URL}' -o /dev/null >> ${LOG_DIR}/humanify-health.log 2>&1 || echo \"\$(date -Iseconds) health FAIL\" >> ${LOG_DIR}/humanify-health.log"

# Internal observability alert (error spike → webhook/email)
ensure_line "obs-alert" "*/10 * * * *" \
  "node scripts/check-humanify-obs-alerts.js >> ${LOG_DIR}/humanify-obs-alert.log 2>&1"

echo "Done — verify with: crontab -l | grep ${MARKER}"
