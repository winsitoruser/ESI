#!/usr/bin/env bash
# Gated prod FORCE strict RLS flip. Refuses without CONFIRM_PROD_RLS_STRICT=YES.
# See docs/humanify-rls-prod-flip.md
set -euo pipefail

APP_DIR="${APP_DIR:-/root/humanify}"
CONFIRM="${CONFIRM_PROD_RLS_STRICT:-}"

if [[ "$CONFIRM" != "YES" ]]; then
  echo "REFUSED: set CONFIRM_PROD_RLS_STRICT=YES to flip prod FORCE strict RLS"
  echo "Read docs/humanify-rls-prod-flip.md first."
  exit 2
fi

if [[ ! -d "$APP_DIR" ]]; then
  echo "REFUSED: APP_DIR=$APP_DIR missing"
  exit 2
fi

if [[ "$APP_DIR" == *staging* ]]; then
  echo "REFUSED: this script is for prod APP_DIR only (got $APP_DIR)"
  exit 2
fi

cd "$APP_DIR"
set -a
# shellcheck disable=SC1091
source .env
set +a

echo "=== Preflight ==="
echo "APP_DIR=$APP_DIR"
echo "Current HUMANIFY_RLS_MODE=${HUMANIFY_RLS_MODE:-unset}"
echo "REQUEST_BOUND=${HUMANIFY_RLS_REQUEST_BOUND:-unset}"

if [[ "${HUMANIFY_RLS_REQUEST_BOUND:-}" != "true" ]]; then
  echo "REFUSED: HUMANIFY_RLS_REQUEST_BOUND must be true before strict flip"
  exit 2
fi

echo "=== 1) Apply strict policies ==="
HUMANIFY_RLS_MODE=strict node scripts/migrate-humanify-rls.js

echo "=== 2) Patch .env ==="
if grep -q '^HUMANIFY_RLS_MODE=' .env; then
  sed -i.bak 's/^HUMANIFY_RLS_MODE=.*/HUMANIFY_RLS_MODE=strict/' .env
else
  echo 'HUMANIFY_RLS_MODE=strict' >> .env
fi

echo "=== 3) Restart PM2 ==="
pm2 restart humanify --update-env

echo "=== 4) Empty-context probe ==="
node <<'JS'
const { Sequelize } = require('sequelize');
require('dotenv').config();
const url = process.env.DATABASE_URL;
const s = new Sequelize(url, {
  dialect: 'postgres', logging: false,
  dialectOptions: (url.includes('localhost') || url.includes('127.0.0.1'))
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});
(async () => {
  await s.query("SELECT set_config('app.current_tenant', '', true)");
  await s.query("SELECT set_config('app.is_super_admin', 'false', true)");
  const [e] = await s.query('SELECT COUNT(*)::int AS c FROM employees');
  console.log('EMPTY_CONTEXT_EMPLOYEES=' + e[0].c);
  await s.close();
  if (e[0].c !== 0) {
    console.error('FAIL: empty context still leaks — rolling back soft policies recommended');
    process.exit(3);
  }
  console.log('LIVE_CHAOS_OK');
})().catch((e) => { console.error(e); process.exit(1); });
JS

echo "=== Done — prod HUMANIFY_RLS_MODE=strict ==="
echo "Verify: curl -sS https://humanify.id/api/health?deep=1"
echo "Rollback: HUMANIFY_RLS_MODE=soft node scripts/migrate-humanify-rls.js && sed -i 's/^HUMANIFY_RLS_MODE=.*/HUMANIFY_RLS_MODE=soft/' .env && pm2 restart humanify --update-env"
