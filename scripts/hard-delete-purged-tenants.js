#!/usr/bin/env node
/**
 * Hard-delete tenants that were soft-purged (archived) and past retention.
 *
 * Safety defaults:
 *   - DRY_RUN=true (no deletes) unless HARD_DELETE_CONFIRM=true
 *   - Only tenants with status=archived AND offboarding.status=purged
 *   - purgedAt older than HARD_DELETE_DAYS (default 30)
 *
 * Usage:
 *   DRY_RUN=true node scripts/hard-delete-purged-tenants.js
 *   HARD_DELETE_CONFIRM=true node scripts/hard-delete-purged-tenants.js
 *
 * Cron (weekly, after soft-purge):
 *   30 22 * * 0 cd /root/humanify && set -a && . ./.env && set +a && HARD_DELETE_CONFIRM=true node scripts/hard-delete-purged-tenants.js >> /var/log/humanify-hard-delete.log 2>&1
 */
const { Sequelize } = require('sequelize');

const HARD_DELETE_DAYS = Number(process.env.HARD_DELETE_DAYS || 30);
const CONFIRM = String(process.env.HARD_DELETE_CONFIRM || '').toLowerCase() === 'true';
const DRY_RUN = !CONFIRM;

function buildSequelize() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) return new Sequelize(url, { logging: false, dialect: 'postgres' });
  return new Sequelize(
    process.env.DB_NAME || 'humanify',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 5432),
      dialect: 'postgres',
      logging: false,
    },
  );
}

async function tableExists(sequelize, name) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=:name LIMIT 1`,
    { replacements: { name } },
  );
  return Boolean(rows?.length);
}

async function hasTenantId(sequelize, table) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=:table AND column_name='tenant_id' LIMIT 1`,
    { replacements: { table } },
  );
  return Boolean(rows?.length);
}

/** Tenant-scoped tables to clear before deleting the tenant row (order matters for FKs). */
const TENANT_TABLES = [
  'saas_notifications',
  'saas_invitations',
  'saas_api_keys',
  'saas_outbound_webhooks',
  'saas_admin_audit',
  'leave_requests',
  'employees',
  'users',
];

async function main() {
  const sequelize = buildSequelize();
  try {
    const [rows] = await sequelize.query(`
      SELECT id, slug, settings
      FROM tenants
      WHERE COALESCE(status::text, '') = 'archived'
        AND settings IS NOT NULL
        AND COALESCE((settings::jsonb)->'offboarding'->>'status', '') = 'purged'
        AND NULLIF((settings::jsonb)->'offboarding'->>'purgedAt', '') IS NOT NULL
        AND ((settings::jsonb)->'offboarding'->>'purgedAt')::timestamptz
            < NOW() - (:days || ' days')::interval
      ORDER BY ((settings::jsonb)->'offboarding'->>'purgedAt')::timestamptz ASC
      LIMIT 50
    `, { replacements: { days: String(HARD_DELETE_DAYS) } });

    const results = [];
    for (const row of rows || []) {
      const entry = { id: row.id, slug: row.slug, deleted: {} };
      if (DRY_RUN) {
        entry.dryRun = true;
        results.push(entry);
        continue;
      }

      for (const table of TENANT_TABLES) {
        if (!(await tableExists(sequelize, table))) continue;
        if (!(await hasTenantId(sequelize, table))) continue;
        try {
          const [r] = await sequelize.query(
            `DELETE FROM ${table} WHERE tenant_id = :tid RETURNING id`,
            { replacements: { tid: row.id } },
          );
          entry.deleted[table] = (r || []).length;
        } catch (e) {
          entry.deleted[table] = `error:${e.message}`;
        }
      }

      // Soft-null role_id then delete orphaned users already covered; finally remove tenant
      await sequelize.query(`DELETE FROM tenants WHERE id = :tid`, {
        replacements: { tid: row.id },
      });
      entry.tenantDeleted = true;
      results.push(entry);
    }

    console.log(JSON.stringify({
      ok: true,
      at: new Date().toISOString(),
      dryRun: DRY_RUN,
      retentionDays: HARD_DELETE_DAYS,
      matched: (rows || []).length,
      results,
      hint: DRY_RUN ? 'Set HARD_DELETE_CONFIRM=true to execute' : undefined,
    }, null, 2));
  } finally {
    await sequelize.close();
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e?.message || String(e) }));
  process.exit(1);
});
