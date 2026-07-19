#!/usr/bin/env node
/**
 * SEC-S4-2 — job tenant chaos unit.
 * Offline: asserts helper + cron docs.
 * Live (HUMANIFY_RLS_LAB=1): empty tenant context on strict lab → 0 rows from employees.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify RLS job chaos (unit)');

const helper = fs.readFileSync(path.join(__dirname, '../lib/saas/run-with-tenant-db-context.ts'), 'utf8');
const slug = fs.readFileSync(path.join(__dirname, '../lib/saas/tenant-slug.ts'), 'utf8');
const doc = fs.readFileSync(path.join(__dirname, '../docs/humanify-rls-strict-staging.md'), 'utf8');

if (/runWithTenantDbContext/.test(helper) && /forEachTenantWithDbContext/.test(helper)) {
  ok('run-with-tenant-db-context helper');
} else fail('run-with-tenant-db-context helper');

if (/setDbTenantContext/.test(helper) && /clearDbTenantContext/.test(helper)) {
  ok('helper uses set/clear context');
} else fail('helper uses set/clear context');

if (/set_config\('app\.current_tenant'/.test(slug)) ok('setDbTenantContext set_config');
else fail('setDbTenantContext set_config');

if (/Background job without set_config|job without set_config|SEC-S4-2/i.test(doc)
  || /Chaos/.test(doc)) {
  ok('runbook chaos expectation');
} else fail('runbook chaos expectation');

async function optionalLive() {
  if (process.env.HUMANIFY_RLS_LAB !== '1') {
    ok('live chaos skipped (set HUMANIFY_RLS_LAB=1 + lab DATABASE_URL)');
    return;
  }
  const url = process.env.DATABASE_URL || '';
  if (!url || (/prod|humanify\.id/i.test(url) && !/lab|staging|rls_lab/i.test(url))) {
    fail('live chaos refused — DATABASE_URL must be lab/staging');
    return;
  }
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: url });
    await client.connect();
    await client.query(`SELECT set_config('app.current_tenant', '', true)`);
    await client.query(`SELECT set_config('app.is_super_admin', 'false', true)`);
    // Under STRICT RLS deny-empty: count should be 0. Soft RLS may return rows — note only.
    const mode = String(process.env.HUMANIFY_RLS_MODE || '').toLowerCase();
    const r = await client.query(`SELECT COUNT(*)::int AS c FROM employees`);
    const c = r.rows?.[0]?.c ?? -1;
    if (mode === 'strict') {
      if (c === 0) ok(`strict lab empty-context employees=0`);
      else fail(`strict lab leak? employees=${c}`);
    } else {
      ok(`live probe employees=${c} (mode=${mode || 'unknown'} — strict asserts 0)`);
    }
    await client.end();
  } catch (e) {
    // Missing table / connection is fail
    fail(`live chaos: ${String(e.message || e).slice(0, 120)}`);
  }
}

optionalLive().then(() => {
  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed ? 1 : 0);
});
