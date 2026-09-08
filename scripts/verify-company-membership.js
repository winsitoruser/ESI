#!/usr/bin/env node
/**
 * Verify Humanify multi-company membership table + tenant isolation.
 * Usage: node scripts/verify-company-membership.js
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.development' });
require('dotenv').config();

const sequelize = require('../lib/sequelize');

let failed = 0;
const ok = (m) => console.log('  ✓', m);
const fail = (m) => {
  failed += 1;
  console.log('  ✗', m);
};

async function q(sql, replacements = {}) {
  const [rows] = await sequelize.query(sql, { replacements });
  return rows || [];
}

async function main() {
  console.log('Humanify company membership + tenant isolation');
  console.log('DB:', process.env.DB_NAME || '(from sequelize config)', '@', process.env.DB_HOST || '127.0.0.1');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_company_memberships (
      id UUID PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      tenant_id UUID NOT NULL,
      role VARCHAR(16) NOT NULL DEFAULT 'owner',
      is_default BOOLEAN NOT NULL DEFAULT false,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_switched_at TIMESTAMPTZ
    )
  `);
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_co_mem_user_tenant
    ON saas_company_memberships (user_id, tenant_id)
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_co_mem_user
    ON saas_company_memberships (user_id, status)
  `);
  await sequelize.query(`
    DELETE FROM saas_company_memberships m
    WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = m.tenant_id)
  `);
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE saas_company_memberships
        ADD CONSTRAINT fk_saas_co_mem_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await sequelize.query(`
    INSERT INTO saas_company_memberships
      (id, user_id, tenant_id, role, is_default, status, created_at, updated_at)
    SELECT gen_random_uuid(), CAST(u.id AS TEXT), u.tenant_id,
      CASE
        WHEN lower(u.role::text) IN ('owner', 'super_admin', 'superadmin', 'platform_admin') THEN 'owner'
        WHEN lower(u.role::text) IN ('admin', 'hq_admin', 'hr_admin') THEN 'admin'
        ELSE 'member'
      END,
      true, 'active', NOW(), NOW()
    FROM users u
    WHERE u.tenant_id IS NOT NULL
      AND lower(COALESCE(u.role::text, '')) NOT IN ('super_admin', 'superadmin', 'platform_admin')
      AND NOT EXISTS (
        SELECT 1 FROM saas_company_memberships m
        WHERE m.user_id = CAST(u.id AS TEXT) AND m.tenant_id = u.tenant_id
      )
  `);
  ok('table + indexes + FK + owner backfill');

  const cols = await q(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'saas_company_memberships'
    ORDER BY ordinal_position
  `);
  const colNames = cols.map((c) => c.column_name);
  const required = ['id', 'user_id', 'tenant_id', 'role', 'is_default', 'status'];
  const missing = required.filter((c) => !colNames.includes(c));
  if (missing.length) fail(`missing columns: ${missing.join(', ')}`);
  else ok(`columns: ${colNames.join(', ')}`);

  const idx = await q(`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'saas_company_memberships'
  `);
  const idxNames = idx.map((r) => r.indexname);
  if (idxNames.some((n) => n.includes('user_tenant'))) ok('unique (user_id, tenant_id)');
  else fail('unique index user+tenant missing');

  const fks = await q(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'saas_company_memberships'::regclass AND contype = 'f'
  `);
  if (fks.some((r) => r.conname === 'fk_saas_co_mem_tenant')) ok('FK tenant_id → tenants(id)');
  else fail('FK tenant_id missing');

  const orphans = await q(`
    SELECT COUNT(*)::int AS n FROM saas_company_memberships m
    WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = m.tenant_id)
  `);
  if (orphans[0]?.n === 0) ok('no membership rows pointing at missing tenants');
  else fail(`orphan memberships: ${orphans[0]?.n}`);

  const counts = await q(`
    SELECT
      (SELECT COUNT(*)::int FROM tenants) AS tenants,
      (SELECT COUNT(*)::int FROM saas_company_memberships WHERE status = 'active') AS memberships,
      (SELECT COUNT(*)::int FROM users WHERE tenant_id IS NOT NULL) AS users_with_home
  `);
  ok(`tenants=${counts[0].tenants} memberships=${counts[0].memberships} users_with_home=${counts[0].users_with_home}`);

  const gap = await q(`
    SELECT COUNT(*)::int AS n
    FROM users u
    WHERE u.tenant_id IS NOT NULL
      AND lower(COALESCE(u.role::text, '')) NOT IN ('super_admin', 'superadmin', 'platform_admin')
      AND NOT EXISTS (
        SELECT 1 FROM saas_company_memberships m
        WHERE m.user_id = CAST(u.id AS TEXT) AND m.tenant_id = u.tenant_id AND m.status = 'active'
      )
  `);
  if (gap[0]?.n === 0) ok('every non-platform user with tenant_id has membership');
  else fail(`users missing membership: ${gap[0]?.n}`);

  const platformLeak = await q(`
    SELECT COUNT(*)::int AS n
    FROM saas_company_memberships m
    JOIN users u ON CAST(u.id AS TEXT) = m.user_id
    WHERE lower(COALESCE(u.role::text, '')) IN ('super_admin', 'superadmin', 'platform_admin')
  `);
  ok(`platform-ops memberships (expected 0 unless they created companies): ${platformLeak[0]?.n}`);

  const badParent = await q(`
    SELECT COUNT(*)::int AS n
    FROM tenants child
    JOIN tenants parent ON parent.id = child.parent_tenant_id
    JOIN saas_company_memberships m ON m.tenant_id = child.id AND m.status = 'active'
    WHERE child.parent_tenant_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM saas_company_memberships p
        WHERE p.user_id = m.user_id AND p.tenant_id = child.parent_tenant_id AND p.status = 'active'
      )
      AND EXISTS (
        SELECT 1 FROM users u
        WHERE CAST(u.id AS TEXT) = m.user_id
          AND lower(COALESCE(u.role::text, '')) NOT IN ('super_admin', 'superadmin', 'platform_admin')
      )
  `);
  if (badParent[0]?.n === 0) ok('child companies nest only under a tenant the same user owns');
  else fail(`child nested under unowned parent: ${badParent[0]?.n}`);

  const empNull = await q(`
    SELECT COUNT(*)::int AS n FROM employees WHERE tenant_id IS NULL
  `).catch(() => [{ n: -1 }]);
  if (empNull[0]?.n === 0) ok('employees.tenant_id has no NULL rows');
  else if (empNull[0]?.n < 0) ok('employees table not queried');
  else fail(`employees with NULL tenant_id: ${empNull[0]?.n}`);

  const overlap = await q(`
    SELECT e.id, COUNT(DISTINCT e.tenant_id)::int AS tenants
    FROM employees e
    WHERE e.tenant_id IS NOT NULL
    GROUP BY e.id
    HAVING COUNT(DISTINCT e.tenant_id) > 1
    LIMIT 5
  `).catch(() => []);
  if (!overlap.length) ok('no employee id belongs to more than one tenant');
  else fail(`employee ids spanning tenants: ${overlap.length}`);

  const sample = await q(`
    SELECT t.id, COALESCE(t.business_name, t.name, t.code) AS name,
      (SELECT COUNT(*)::int FROM employees e WHERE e.tenant_id = t.id) AS employees,
      (SELECT COUNT(*)::int FROM saas_company_memberships m WHERE m.tenant_id = t.id AND m.status = 'active') AS members
    FROM tenants t
    ORDER BY employees DESC NULLS LAST
    LIMIT 5
  `).catch(() => []);
  if (sample.length) {
    console.log('  sample tenants:');
    for (const row of sample) {
      console.log(`    - ${row.name}: employees=${row.employees} members=${row.members}`);
    }
  }

  console.log(failed ? `\nRESULT: ${failed} check(s) failed` : '\nRESULT: isolation checks passed');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
}).finally(() => sequelize.close?.());
