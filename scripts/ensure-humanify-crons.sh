#!/usr/bin/env bash
# Idempotently install Humanify platform cron jobs on the VPS (root crontab).
#
# Usage:
#   APP_DIR=/root/humanify bash scripts/ensure-humanify-crons.sh
#   bash scripts/ensure-humanify-crons.sh --check   # list expected tags only (no crontab write)
#
# Timezone note — cron schedules below are UTC (VPS typically UTC).
# WIB = UTC+7. Example: mutation-apply-due "15 1 * * *" = 01:15 UTC = 08:15 WIB.
# When documenting ops runbooks, always state both UTC and WIB.
#
# Log rotation hint — cron appends to /var/log/humanify-*.log without rotation.
# On VPS, configure logrotate (size or weekly) e.g.:
#   /var/log/humanify-*.log {
#     weekly
#     rotate 8
#     maxsize 50M
#     compress
#     missingok
#     notifempty
#     copytruncate
#   }
# Or: truncate oversized files manually before they fill the disk.
set -euo pipefail

APP_DIR="${APP_DIR:-/root/humanify}"
LOG_DIR="${LOG_DIR:-/var/log}"
HEALTH_URL="${HEALTH_URL:-https://humanify.id/api/health?deep=1}"
SCORECARD_BASE="${HUMANIFY_STAGING_URL:-https://humanify.id}"
MARKER="humanify-platform-cron"

# Expected cron tags (schedule comment · UTC → WIB where helpful)
EXPECTED_TAGS=(
  "purge|0 21 * * *|daily soft-purge offboarded · 21:00 UTC = 04:00 WIB"
  "hard-delete|30 22 * * 0|weekly hard-delete · Sun 22:30 UTC = Mon 05:30 WIB"
  "health|*/5 * * * *|health probe every 5m"
  "obs-alert|*/10 * * * *|obs alert every 10m"
  "db-backup|30 2 * * *|DB backup 02:30 UTC = 09:30 WIB"
  "hr-automation-scan|15 */6 * * *|HR automation every 6h"
  "leave-escalation|20 * * * *|leave SLA escalate hourly"
  "mutation-apply-due|15 1 * * *|deferred mutation apply · 01:15 UTC = 08:15 WIB"
  "action-digest|0 1 * * 1|Action Inbox digest Mon 01:00 UTC = 08:00 WIB"
  "doc-expiry-digest|30 1 * * 1|doc-expiry digest Mon 01:30 UTC = 08:30 WIB"
  "doc-expiry-soft|0 2 * * 1|doc soft-deactivate dry-run Mon 02:00 UTC"
  "security-scorecard|0 23 * * 0|IDOR scorecard Sun 23:00 UTC = Mon 06:00 WIB"
  "redis-alert|*/10 * * * *|Redis down alert every 10m"
  "uptime-external|15 */6 * * *|external uptime probe every 6h"
)

if [[ "${1:-}" == "--check" ]]; then
  echo "Humanify cron expected tags (check-only — no crontab write)"
  echo "MARKER=${MARKER}  APP_DIR=${APP_DIR}  LOG_DIR=${LOG_DIR}"
  echo ""
  printf "%-22s %-14s %s\n" "TAG" "SCHEDULE(UTC)" "NOTES"
  printf "%-22s %-14s %s\n" "---" "-------------" "-----"
  for entry in "${EXPECTED_TAGS[@]}"; do
    IFS='|' read -r tag schedule notes <<< "$entry"
    printf "%-22s %-14s %s\n" "${MARKER}:${tag}" "$schedule" "$notes"
  done
  echo ""
  echo "Installed lines (if any):"
  if crontab -l 2>/dev/null | grep -F "${MARKER}:" ; then
    :
  else
    echo "  (none — run without --check to install)"
  fi
  exit 0
fi

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

# HR automation rule scan — every 6h (in-app alerts + email when SMTP set)
ensure_line "hr-automation-scan" "15 */6 * * *" \
  "node scripts/run-humanify-hr-automation-scan.js >> ${LOG_DIR}/humanify-hr-automation.log 2>&1 || true"

# Leave approval SLA escalation — hourly (notify only, never auto-approve)
ensure_line "leave-escalation" "20 * * * *" \
  "node scripts/run-humanify-leave-escalation-scan.js >> ${LOG_DIR}/humanify-leave-escalation.log 2>&1 || true"

# Deferred mutation apply — daily 01:15 UTC (08:15 WIB)
# Cron schedule is UTC; apply uses DB CURRENT_DATE (server TZ — keep VPS UTC).
ensure_line "mutation-apply-due" "15 1 * * *" \
  "node scripts/run-humanify-mutation-apply-due-scan.js >> ${LOG_DIR}/humanify-mutation-apply-due.log 2>&1 || true"

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
  "SMOKE_BASE_URL='${SCORECARD_BASE}' node scripts/run-humanify-security-scorecard-cron.js >> ${LOG_DIR}/humanify-security-scorecard.log 2>&1 || true"

# Redis down alert (fail-open rate-limit) — every 10 min
ensure_line "redis-alert" "*/10 * * * *" \
  "node scripts/check-humanify-redis-alert.js >> ${LOG_DIR}/humanify-redis-alert.log 2>&1 || true"

# External uptime probe last-run (Wave-25) — every 6h; writes /var/lib/humanify/uptime-last.json
ensure_line "uptime-external" "15 */6 * * *" \
  "node scripts/check-humanify-uptime-external.js >> ${LOG_DIR}/humanify-uptime-external.log 2>&1 || true"

echo "Done — verify with: crontab -l | grep ${MARKER}"
echo "Check-only: bash scripts/ensure-humanify-crons.sh --check"
