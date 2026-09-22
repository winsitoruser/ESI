#!/usr/bin/env node
/**
 * Wave 8 — secure deletion helper (SEC-DAT-009)
 * Soft-deleted rows past retention → hard delete (tenant-scoped).
 *
 * Usage (ops):
 *   DRY_RUN=1 TENANT_ID=… node scripts/humanify-secure-deletion.js
 *   TENANT_ID=… RETENTION_DAYS=365 CONFIRM=YES node scripts/humanify-secure-deletion.js
 */
require('dotenv').config({ path: '.env.production' });
require('dotenv').config({ path: '.env' });

const DRY = String(process.env.DRY_RUN || '1') !== '0';
const CONFIRM = String(process.env.CONFIRM || '') === 'YES';
const TENANT_ID = String(process.env.TENANT_ID || '').trim();
const DAYS = Math.max(30, Number(process.env.RETENTION_DAYS || 365));

async function main() {
  if (!TENANT_ID) {
    console.error('TENANT_ID required');
    process.exit(1);
  }
  if (!DRY && !CONFIRM) {
    console.error('Set CONFIRM=YES for destructive run');
    process.exit(1);
  }

  const { Sequelize } = require('sequelize');
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }
  const s = new Sequelize(url, { dialect: 'postgres', logging: false });

  const tables = [
    { table: 'employee_documents', col: 'deleted_at' },
  ];

  console.log(`[secure-deletion] tenant=${TENANT_ID} days=${DAYS} dryRun=${DRY}`);
  for (const t of tables) {
    try {
      const [cnt] = await s.query(`
        SELECT COUNT(*)::int AS c FROM ${t.table}
        WHERE tenant_id = :tid
          AND ${t.col} IS NOT NULL
          AND ${t.col} < NOW() - (:days || ' days')::interval
      `, { replacements: { tid: TENANT_ID, days: String(DAYS) } });
      const n = cnt?.[0]?.c || 0;
      console.log(`  ${t.table}: ${n} candidates`);
      if (!DRY && n > 0) {
        await s.query(`
          DELETE FROM ${t.table}
          WHERE tenant_id = :tid
            AND ${t.col} IS NOT NULL
            AND ${t.col} < NOW() - (:days || ' days')::interval
        `, { replacements: { tid: TENANT_ID, days: String(DAYS) } });
        console.log(`  deleted ${n}`);
      }
    } catch (e) {
      console.warn(`  skip ${t.table}:`, e.message);
    }
  }
  await s.close();
  console.log('[secure-deletion] done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
