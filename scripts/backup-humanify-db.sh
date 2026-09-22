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

# Prefer postgres superuser so FORCE RLS tables (e.g. company_regulations) dump cleanly.
DUMP_OK=0
if sudo -u postgres pg_dump -d "$DB_NAME" --no-owner --no-acl --format=plain 2>/tmp/humanify-pgdump.err | gzip -c > "$DUMP_FILE"; then
  if [[ -s "$DUMP_FILE" ]]; then
    DUMP_OK=1
  fi
fi

if [[ "$DUMP_OK" -ne 1 ]]; then
  echo "[!!] postgres dump failed — fallback as ${DB_USER} (may hit RLS)"
  cat /tmp/humanify-pgdump.err 2>/dev/null | tail -5 || true
  export PGPASSWORD="${DB_PASSWORD:-${POSTGRES_PASSWORD:-}}"
  PGOPTIONS='-c row_security=off' pg_dump \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-acl --format=plain \
    | gzip -c > "$DUMP_FILE"
fi

SIZE="$(du -h "$DUMP_FILE" | awk '{print $1}')"
ln -sfn "$DUMP_FILE" "$LATEST_LINK"
echo "[OK] Dump ${SIZE}: $DUMP_FILE"

# SEC-DAT-005 — optional at-rest encryption (GPG symmetric)
# Set BACKUP_GPG_PASSPHRASE in env / secrets manager. Encrypted file: *.sql.gz.gpg
if [[ -n "${BACKUP_GPG_PASSPHRASE:-}" ]]; then
  if command -v gpg >/dev/null 2>&1; then
    ENC_FILE="${DUMP_FILE}.gpg"
    echo "$BACKUP_GPG_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 \
      --symmetric --cipher-algo AES256 -o "$ENC_FILE" "$DUMP_FILE"
    shred -u "$DUMP_FILE" 2>/dev/null || rm -f "$DUMP_FILE"
    ln -sfn "$ENC_FILE" "${BACKUP_DIR}/latest.sql.gz.gpg"
    DUMP_FILE="$ENC_FILE"
    echo "[OK] Encrypted dump (AES256): $ENC_FILE"
  else
    echo "[!!] BACKUP_GPG_PASSPHRASE set but gpg missing — dump left unencrypted"
  fi
fi

# Retention
find "$BACKUP_DIR" -name 'humanify-*.sql.gz*' -type f -mtime "+${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null || true
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
