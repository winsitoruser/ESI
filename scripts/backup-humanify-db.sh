#!/usr/bin/env bash
# =============================================================================
# Humanify — Daily PostgreSQL backup (+ optional restore dry-run)
# =============================================================================
# Usage (on VPS):
#   cd /root/humanify && bash scripts/backup-humanify-db.sh
#   RESTORE_TEST=true bash scripts/backup-humanify-db.sh
#
# Cron (via ensure-humanify-crons.sh): daily 02:30 UTC
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/humanify}"
TIMESTAMP="$(date -u '+%Y%m%dT%H%M%SZ')"
DATE_PART="$(date -u '+%Y-%m-%d')"

if [[ -f "$APP_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$APP_DIR/.env"
  set +a
fi

DB_NAME="${DB_NAME:-humanify}"
DB_USER="${DB_USER:-humanify}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
RESTORE_TEST="${RESTORE_TEST:-false}"

DUMP_FILE="${BACKUP_DIR}/humanify-${TIMESTAMP}.sql.gz"
LATEST_LINK="${BACKUP_DIR}/latest.sql.gz"

mkdir -p "$BACKUP_DIR"
export PGPASSWORD="${DB_PASSWORD:-${POSTGRES_PASSWORD:-}}"

echo "[i] Humanify DB backup ${TIMESTAMP} → ${DB_NAME}@${DB_HOST}"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "[XX] pg_dump not found"
  exit 1
fi

pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --no-owner --no-acl --format=plain \
  | gzip -c > "$DUMP_FILE"

SIZE="$(du -h "$DUMP_FILE" | awk '{print $1}')"
ln -sfn "$DUMP_FILE" "$LATEST_LINK"
echo "[OK] Dump ${SIZE}: $DUMP_FILE"

# Retention
find "$BACKUP_DIR" -name 'humanify-*.sql.gz' -type f -mtime "+${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null || true
echo "[OK] Retention ${BACKUP_RETENTION_DAYS}d applied"

if [[ "$RESTORE_TEST" == "true" ]]; then
  TEST_DB="humanify_restore_test_$$"
  echo "[i] Restore dry-run → ${TEST_DB}"
  if createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$TEST_DB" 2>/dev/null; then
    if gunzip -c "$DUMP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB" -v ON_ERROR_STOP=1 -q; then
      echo "[OK] Restore test PASSED"
    else
      echo "[XX] Restore test FAILED"
      dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$TEST_DB" 2>/dev/null || true
      exit 1
    fi
    dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$TEST_DB" 2>/dev/null || true
  else
    # Try as postgres superuser
    if sudo -u postgres createdb "$TEST_DB" 2>/dev/null; then
      if gunzip -c "$DUMP_FILE" | sudo -u postgres psql -d "$TEST_DB" -v ON_ERROR_STOP=1 -q; then
        echo "[OK] Restore test PASSED (postgres)"
      else
        echo "[XX] Restore test FAILED"
        sudo -u postgres dropdb "$TEST_DB" 2>/dev/null || true
        exit 1
      fi
      sudo -u postgres dropdb "$TEST_DB" 2>/dev/null || true
    else
      echo "[!!] Cannot create test DB — skip restore test"
    fi
  fi
fi

echo "[OK] Backup complete"
