#!/usr/bin/env node
/**
 * Humanify RLS — enable Postgres row-level security on core HR tables.
 *
 * Modes (HUMANIFY_RLS_MODE):
 * - soft (default): empty app.current_tenant → allow (safe with connection pools;
 *   app-level scopedWhere remains primary isolation)
 * - strict: empty context → deny (requires session-level set_config on the same
 *   pooled connection before every query; only enable after verifying smoke)
 *
 * Session vars: withHQAuth + ensureTenantDbContext (session-level, cleared after request).
 *
 * Usage:
 *   DATABASE_URL=... node scripts/migrate-humanify-rls.js
 *   HUMANIFY_RLS_MODE=strict DATABASE_URL=... node scripts/migrate-humanify-rls.js
 */
require('dotenv').config({ path: process.env.DOTENV_PATH || '.env' });
try { require('dotenv').config({ path: '.env.local', override: false }); } catch (_) {}

const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const MODE = String(process.env.HUMANIFY_RLS_MODE || 'soft').toLowerCase() === 'strict' ? 'strict' : 'soft';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions:
    DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
      ? {}
      : { ssl: { require: true, rejectUnauthorized: false } },
});

const TABLES = [
  'employees',
  'leave_requests',
  'leave_balances',
  'leave_types',
  'leave_approval_configs',
  'work_shifts',
  'shift_schedules',
  'shift_rotations',
  'geofence_locations',
  'employee_attendance',
  'employee_claims',
  'overtime_requests',
  'employee_mutations',
  'surveys',
  'survey_responses',
  'recognitions',
  'hris_announcements',
  'employee_contracts',
  'employee_onboarding_processes',
  'employee_offboarding_processes',
  'company_regulations',
  'ir_cases',
  'termination_requests',
  'compliance_checklists',
  'warning_letters',
  'payroll_runs',
  'employee_salaries',
  'payroll_components',
];

const USING_SOFT = `
  COALESCE(current_setting('app.is_super_admin', true), 'false') = 'true'
  OR NULLIF(current_setting('app.current_tenant', true), '') IS NULL
  OR tenant_id::text = current_setting('app.current_tenant', true)
`;

const USING_STRICT = `
  COALESCE(current_setting('app.is_super_admin', true), 'false') = 'true'
  OR (
    NULLIF(current_setting('app.current_tenant', true), '') IS NOT NULL
    AND tenant_id::text = current_setting('app.current_tenant', true)
  )
`;

const USING = MODE === 'strict' ? USING_STRICT : USING_SOFT;

async function tableExists(name) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = :name`,
    { replacements: { name } },
  );
  return rows.length > 0;
}

async function hasTenantId(name) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = :name AND column_name = 'tenant_id'`,
    { replacements: { name } },
  );
  return rows.length > 0;
}

async function enableRls(table) {
  const policy = `${table}_tenant_isolation`;
  await sequelize.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
  await sequelize.query(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
  await sequelize.query(`DROP POLICY IF EXISTS "${policy}" ON "${table}"`);
  await sequelize.query(`
    CREATE POLICY "${policy}" ON "${table}"
    FOR ALL
    USING (${USING})
    WITH CHECK (${USING})
  `);
}

async function run() {
  await sequelize.authenticate();
  console.log(`Humanify RLS migration (mode=${MODE})`);

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const table of TABLES) {
    try {
      if (!(await tableExists(table))) {
        console.log(`  · skip ${table} (missing)`);
        skip++;
        continue;
      }
      if (!(await hasTenantId(table))) {
        console.log(`  · skip ${table} (no tenant_id)`);
        skip++;
        continue;
      }
      await enableRls(table);
      console.log(`  ✓ RLS ${table}`);
      ok++;
    } catch (e) {
      console.warn(`  ✗ ${table}:`, e.message);
      fail++;
    }
  }

  console.log(`Done — enabled=${ok} skipped=${skip} failed=${fail} mode=${MODE}`);
  if (MODE === 'strict') {
    console.log('⚠ strict: empty tenant context denies rows — keep soft on multi-conn pools until request-bound connection lands');
  }
  await sequelize.close();
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
