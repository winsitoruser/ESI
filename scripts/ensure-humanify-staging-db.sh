#!/usr/bin/env bash
# Create isolated Postgres DB for Humanify staging slot (idempotent).
# Fresh / broken staging DBs are seeded from prod `humanify` (schema + data).
set -euo pipefail

APP_DIR="${APP_DIR:-/root/humanify-staging}"
HUMANIFY_DB_NAME="${HUMANIFY_DB_NAME:-humanify_staging}"
HUMANIFY_PROD_DB_NAME="${HUMANIFY_PROD_DB_NAME:-humanify}"
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

schema_ok() {
  sudo -u postgres psql -d "$HUMANIFY_DB_NAME" -tAc \
    "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='team_members'" \
    | grep -q 1
}

if ! schema_ok; then
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$HUMANIFY_PROD_DB_NAME'" | grep -q 1; then
    echo "  ✗ prod DB $HUMANIFY_PROD_DB_NAME missing — cannot clone staging schema"
    exit 1
  fi
  echo "  ⚠ staging schema incomplete — cloning $HUMANIFY_PROD_DB_NAME → $HUMANIFY_DB_NAME"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$HUMANIFY_DB_NAME' AND pid <> pg_backend_pid();" \
    || true
  sudo -u postgres dropdb "$HUMANIFY_DB_NAME"
  sudo -u postgres createdb -O "$DB_USER" "$HUMANIFY_DB_NAME"
  sudo -u postgres pg_dump -d "$HUMANIFY_PROD_DB_NAME" --no-owner --no-acl \
    | sudo -u postgres psql -d "$HUMANIFY_DB_NAME" -v ON_ERROR_STOP=1
  echo "  ✓ cloned prod schema + data into $HUMANIFY_DB_NAME"
elif [ "${HUMANIFY_STAGING_FORCE_CLONE:-false}" = true ]; then
  echo "  ↻ HUMANIFY_STAGING_FORCE_CLONE=true — refreshing from $HUMANIFY_PROD_DB_NAME"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$HUMANIFY_DB_NAME' AND pid <> pg_backend_pid();" \
    || true
  sudo -u postgres dropdb "$HUMANIFY_DB_NAME"
  sudo -u postgres createdb -O "$DB_USER" "$HUMANIFY_DB_NAME"
  sudo -u postgres pg_dump -d "$HUMANIFY_PROD_DB_NAME" --no-owner --no-acl \
    | sudo -u postgres psql -d "$HUMANIFY_DB_NAME" -v ON_ERROR_STOP=1
  echo "  ✓ staging DB refreshed from prod"
else
  echo "  ✓ staging schema looks complete (team_members present)"
fi

# pg_dump --no-acl strips grants — always re-grant to app role (fixes login: permission denied for table users)
echo "  → granting $DB_USER on $HUMANIFY_DB_NAME"
sudo -u postgres psql -d "$HUMANIFY_DB_NAME" -v ON_ERROR_STOP=1 <<SQL
GRANT CONNECT ON DATABASE $HUMANIFY_DB_NAME TO $DB_USER;
GRANT USAGE, CREATE ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
DO \$\$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO $DB_USER', r.tablename);
  END LOOP;
  FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public' LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO $DB_USER', r.sequence_name);
  END LOOP;
END
\$\$;
SQL
echo "  ✓ grants restored for $DB_USER"
