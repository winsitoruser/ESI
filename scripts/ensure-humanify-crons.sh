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
    # Replace existing line for this tag (keeps schedule/cmd updates idempotent)
    local tmp
    tmp="$(mktemp)"
    crontab -l 2>/dev/null | grep -Fv "${MARKER}:${tag}" > "$tmp" || true
    echo "$full" >> "$tmp"
    crontab "$tmp"
    rm -f "$tmp"
    echo "  ✓ cron ${tag} refreshed"
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

# Health probe → Discord on FAIL (cooldown 30m); also append log
ensure_line "health" "*/5 * * * *" \
  "HEALTH_URL='${HEALTH_URL}' node scripts/check-humanify-health-alert.js >> ${LOG_DIR}/humanify-health.log 2>&1 || true"

# Internal observability alert (error spike → Discord/email)
ensure_line "obs-alert" "*/10 * * * *" \
  "node scripts/check-humanify-obs-alerts.js >> ${LOG_DIR}/humanify-obs-alert.log 2>&1"

# Daily DB backup 02:30 UTC (09:30 WIB)
ensure_line "db-backup" "30 2 * * *" \
  "bash scripts/backup-humanify-db.sh >> ${LOG_DIR}/humanify-db-backup.log 2>&1"

# Weekly Action Inbox digest — Mon 01:00 UTC (08:00 WIB)
ensure_line "action-digest" "0 1 * * 1" \
  "node scripts/send-humanify-action-inbox-digest.js >> ${LOG_DIR}/humanify-action-digest.log 2>&1"

# Weekly doc-expiry digest — Mon 01:30 UTC (08:30 WIB)
ensure_line "doc-expiry-digest" "30 1 * * 1" \
  "node scripts/send-humanify-doc-expiry-digest.js >> ${LOG_DIR}/humanify-doc-expiry-digest.log 2>&1"

# Weekly soft-deactivate expired docs (dry-run) — Mon 02:00 UTC
# To apply: edit crontab APPLY=true or run APPLY=true npm run report:doc-expiry:soft
ensure_line "doc-expiry-soft" "0 2 * * 1" \
  "APPLY=false node scripts/run-humanify-doc-expiry-soft-deactivate.js >> ${LOG_DIR}/humanify-doc-expiry-soft.log 2>&1 || true"

# Weekly IDOR security scorecard — Sun 23:00 UTC (Mon 06:00 WIB)
ensure_line "security-scorecard" "0 23 * * 0" \
  "SMOKE_BASE_URL='https://humanify.id' node scripts/run-humanify-security-scorecard.js >> ${LOG_DIR}/humanify-security-scorecard.log 2>&1 || true"

echo "Done — verify with: crontab -l | grep ${MARKER}"
