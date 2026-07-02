#!/bin/bash
# =============================================================================
# Bedagang ERP — Automated Database Backup Script
# =============================================================================
# Purpose:  Daily pg_dump of bedagang_prod to local + S3-compatible storage
# Schedule: Run via cron (usually 03:00 WIB / 20:00 UTC)
#
# Usage:
#   sudo -u bedagang bash scripts/backup-db.sh                  # local only
#   S3_ENABLED=true bash scripts/backup-db.sh                   # local + S3
#   S3_ENABLED=true RESTORE_TEST=true bash scripts/backup-db.sh # + restore test
#
# Environment variables (.env or cron ENV):
#   DB_NAME, DB_USER, DB_PASSWORD        — PostgreSQL credentials
#   S3_ENABLED                           — set 'true' to push to S3
#   S3_ENDPOINT, S3_BUCKET, S3_REGION   — S3-compatible storage config
#   S3_ACCESS_KEY, S3_SECRET_KEY        — S3 credentials
#   BACKUP_RETENTION_DAYS                — local retention (default: 7)
#   S3_RETENTION_DAYS                    — S3 retention (default: 30)
# =============================================================================

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/bedagang}"
TIMESTAMP="$(date -u '+%Y%m%dT%H%M%SZ')"
DATE_PART="$(date -u '+%Y-%m-%d')"

# Load environment if available
if [[ -f "$APP_DIR/.env" ]]; then
  set -a
  source "$APP_DIR/.env"
  set +a
fi

# Fallback defaults
DB_NAME="${DB_NAME:-bedagang_prod}"
DB_USER="${DB_USER:-bedagang}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
S3_RETENTION_DAYS="${S3_RETENTION_DAYS:-30}"
S3_ENABLED="${S3_ENABLED:-false}"

# Backup filenames
DUMP_FILE="${BACKUP_DIR}/bedagang-${TIMESTAMP}.sql.gz"
DUMP_LOG="${BACKUP_DIR}/bedagang-${TIMESTAMP}.log"
LATEST_LINK="${BACKUP_DIR}/latest.sql.gz"
LATEST_LOG_LINK="${BACKUP_DIR}/latest.log"

# ─────────────────────────────────────────────────────────────────────────────
# Color helpers
# ─────────────────────────────────────────────────────────────────────────────
TEXT_GREEN='\033[0;32m'
TEXT_YELLOW='\033[1;33m'
TEXT_RED='\033[0;31m'
TEXT_CYAN='\033[0;36m'
TEXT_RESET='\033[0m'

log()   { echo -e "${TEXT_GREEN}[OK]${TEXT_RESET} $1"; }
warn()  { echo -e "${TEXT_YELLOW}[!!]${TEXT_RESET} $1"; }
err()   { echo -e "${TEXT_RED}[XX]${TEXT_RESET} $1"; }
info()  { echo -e "${TEXT_CYAN}[i]${TEXT_RESET} $1"; }

# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Pre-flight checks
# ─────────────────────────────────────────────────────────────────────────────
info "=== Bedagang DB Backup: $TIMESTAMP ==="
info "Target database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"

mkdir -p "$BACKUP_DIR"

if ! command -v pg_dump &>/dev/null; then
  err "pg_dump not found. Install postgresql-client."
  exit 1
fi

if ! command -v gzip &>/dev/null; then
  err "gzip not found."
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Dump database
# ─────────────────────────────────────────────────────────────────────────────
info "[1/4] Dumping database ${DB_NAME}..."

# Build connection string (prefer PGPASSWORD for non-interactive)
export PGPASSWORD="${DB_PASSWORD}"

pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=custom \
  --verbose \
  --no-owner \
  --no-privileges \
  2> "$DUMP_LOG" | gzip > "$DUMP_FILE"

DUMP_EXIT_CODE="${PIPESTATUS[0]}"

if [[ "$DUMP_EXIT_CODE" -ne 0 ]]; then
  err "pg_dump failed with exit code $DUMP_EXIT_CODE"
  cat "$DUMP_LOG"
  rm -f "$DUMP_FILE"
  exit 1
fi

# Verify dump integrity
gunzip -t "$DUMP_FILE" 2>/dev/null || {
  err "Dump file is corrupted (gunzip -t failed)"
  rm -f "$DUMP_FILE"
  exit 1
}

DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
log "Dump created: $DUMP_FILE ($DUMP_SIZE)"

# Update latest symlink
ln -sf "$DUMP_FILE" "$LATEST_LINK"
ln -sf "$DUMP_LOG" "$LATEST_LOG_LINK"

# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Cleanup old local backups
# ─────────────────────────────────────────────────────────────────────────────
info "[2/4] Cleaning backups older than ${BACKUP_RETENTION_DAYS} days..."

find "$BACKUP_DIR" -name 'bedagang-*.sql.gz' -type f -mtime "+${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null
find "$BACKUP_DIR" -name 'bedagang-*.log' -type f -mtime "+${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null

log "Old local backups cleaned."

# ─────────────────────────────────────────────────────────────────────────────
# Step 3b: Push to S3-compatible storage (optional)
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$S3_ENABLED" == "true" ]]; then
  info "[3/4] Uploading to S3-compatible storage..."

  # Verify S3 config
  if [[ -z "${S3_ENDPOINT:-}" || -z "${S3_BUCKET:-}" ]]; then
    warn "S3_ENABLED=true but S3_ENDPOINT or S3_BUCKET not set. Skipping S3 upload."
  else
    # Use s3cmd or aws-cli (prefer s3cmd for generic S3-compatible)
    if command -v s3cmd &>/dev/null; then
      s3cmd --host="$S3_ENDPOINT" \
            --host-bucket="${S3_BUCKET}.${S3_ENDPOINT}" \
            --access_key="$S3_ACCESS_KEY" \
            --secret_key="$S3_SECRET_KEY" \
            --region="${S3_REGION:-ap-southeast-1}" \
            put "$DUMP_FILE" "s3://${S3_BUCKET}/bedagang-db-backups/${DATE_PART}/" \
        && log "S3 upload complete (s3cmd)" \
        || warn "S3 upload failed (s3cmd)"
    elif command -v aws &>/dev/null; then
      AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" \
      AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
      aws s3 --endpoint-url="$S3_ENDPOINT" \
             --region="${S3_REGION:-ap-southeast-1}" \
             cp "$DUMP_FILE" "s3://${S3_BUCKET}/bedagang-db-backups/${DATE_PART}/" \
        && log "S3 upload complete (aws cli)" \
        || warn "S3 upload failed (aws cli)"
    else
      # Pure curl-based upload (S3-compatible via presigned PUT)
      warn "Neither s3cmd nor aws-cli found. Attempting curl-based upload..."
      S3_KEY="bedagang-db-backups/${DATE_PART}/$(basename "$DUMP_FILE")"
      CONTENT_TYPE="application/gzip"
      DATE_S3="$(date -u '+%a, %d %b %Y %H:%M:%S GMT')"
      STRING_TO_SIGN="PUT\n\n${CONTENT_TYPE}\n${DATE_S3}\n/${S3_BUCKET}/${S3_KEY}"
      SIGNATURE=$(echo -en "$STRING_TO_SIGN" | openssl sha1 -hmac "$S3_SECRET_KEY" -binary | base64)
      curl -sf -X PUT \
        -T "$DUMP_FILE" \
        -H "Host: ${S3_BUCKET}.${S3_ENDPOINT}" \
        -H "Date: ${DATE_S3}" \
        -H "Content-Type: ${CONTENT_TYPE}" \
        -H "Authorization: AWS ${S3_ACCESS_KEY}:${SIGNATURE}" \
        "https://${S3_BUCKET}.${S3_ENDPOINT}/${S3_KEY}" \
        && log "S3 upload complete (curl)" \
        || warn "S3 upload failed (curl)"
    fi

    # Cleanup old S3 backups
    info "  Cleaning S3 backups older than ${S3_RETENTION_DAYS} days..."
    if command -v s3cmd &>/dev/null; then
      CUTOFF_DATE=$(date -u -d "-${S3_RETENTION_DAYS} days" '+%Y-%m-%d')
      s3cmd --host="$S3_ENDPOINT" \
            --access_key="$S3_ACCESS_KEY" \
            --secret_key="$S3_SECRET_KEY" \
            ls "s3://${S3_BUCKET}/bedagang-db-backups/" 2>/dev/null \
        | while read -r line; do
            file_date=$(echo "$line" | awk '{print $1}')
            file_path=$(echo "$line" | awk '{$1=$2=""; print $0}' | xargs)
            if [[ "$file_date" < "${CUTOFF_DATE}T00:00:00Z" ]]; then
              s3cmd --host="$S3_ENDPOINT" \
                    --access_key="$S3_ACCESS_KEY" \
                    --secret_key="$S3_SECRET_KEY" \
                    del "$file_path" 2>/dev/null && \
                echo "  Deleted: $(basename "$file_path")"
            fi
          done
    fi
  fi
else
  info "[3/4] S3 upload disabled. Set S3_ENABLED=true to enable."
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 4: Integrity validation (optional restore test)
# ─────────────────────────────────────────────────────────────────────────────
if [[ "${RESTORE_TEST:-false}" == "true" ]]; then
  info "[4/4] Running restore test..."
  TEST_DB="bedagang_backup_test_$(date '+%s')"
  createdb "$TEST_DB" 2>/dev/null || {
    warn "Cannot create test database. Skipping restore test."
    RESTORE_TEST=false
  }

  if [[ "$RESTORE_TEST" == "true" ]]; then
    gunzip -c "$DUMP_FILE" | pg_restore \
      -d "$TEST_DB" \
      --no-owner \
      --no-privileges \
      --verbose 2>&1 | tail -5

    if [[ $? -eq 0 ]]; then
      dropdb "$TEST_DB" 2>/dev/null
      log "Restore test PASSED -- backup is valid."
    else
      dropdb "$TEST_DB" 2>/dev/null
      err "Restore test FAILED -- backup may be corrupt. Check $DUMP_LOG"
    fi
  fi
else
  info "[4/4] Restore test skipped. Set RESTORE_TEST=true to enable."
fi

log "Backup complete: $(basename "$DUMP_FILE") ($DUMP_SIZE)"
unset PGPASSWORD
echo ""
echo "========================================================"
echo "  Backup Complete -- Bedagang ERP"
echo "  File:   $(basename "$DUMP_FILE")"
echo "  Size:   $DUMP_SIZE"
echo "  Path:   $DUMP_FILE"
echo "  Log:    $DUMP_LOG"
echo "========================================================"
