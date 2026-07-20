#!/usr/bin/env bash
# Create isolated Postgres DB for Humanify staging slot (idempotent).
set -euo pipefail

APP_DIR="${APP_DIR:-/root/humanify-staging}"
HUMANIFY_DB_NAME="${HUMANIFY_DB_NAME:-humanify_staging}"
DB_USER="${DB_USER:-humanify}"

ENV_FILE="$APP_DIR/.env"
DB_PASS="humanify_staging_pass"
if [ -f "$ENV_FILE" ]; then
  DB_PASS="$(grep '^DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2- || echo humanify_staging_pass)"
fi

echo "Ensure staging DB: $HUMANIFY_DB_NAME (user $DB_USER)"

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';
  END IF;
END
\$\$;
SQL

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$HUMANIFY_DB_NAME'" | grep -q 1; then
  sudo -u postgres createdb -O "$DB_USER" "$HUMANIFY_DB_NAME"
  echo "  + created database $HUMANIFY_DB_NAME"
else
  echo "  ✓ database $HUMANIFY_DB_NAME exists"
fi

sudo -u postgres psql -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE $HUMANIFY_DB_NAME TO $DB_USER;" || true
