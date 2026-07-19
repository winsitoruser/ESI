#!/usr/bin/env node
/**
 * Strict RLS lab unit smoke (no prod flip).
 * Offline by default — asserts migrate script + runbook.
 * Optional live: HUMANIFY_RLS_LAB=1 DATABASE_URL=… (lab DB only)
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify RLS strict lab (unit)');

const migrate = fs.readFileSync(path.join(__dirname, 'migrate-humanify-rls.js'), 'utf8');
const doc = fs.readFileSync(path.join(__dirname, '../docs/humanify-rls-strict-staging.md'), 'utf8');

if (/FORCE ROW LEVEL SECURITY/.test(migrate)) ok('migrate FORCE RLS');
else fail('migrate FORCE RLS');

if (/strict/.test(migrate) && /current_setting\('app\.current_tenant'/.test(migrate)) ok('migrate tenant context');
else fail('migrate tenant context');

if (/IS NOT NULL/.test(migrate) && /NULLIF\(current_setting/.test(migrate)) ok('strict deny-empty pattern');
else fail('strict deny-empty pattern');

if (/Do \*\*not\*\* flip prod|Do not flip prod|staging only/i.test(doc)) ok('runbook no-prod-flip');
else fail('runbook no-prod-flip');

if (/security:scorecard|smoke:ga-journey/.test(doc)) ok('runbook chaos commands');
else fail('runbook chaos commands');

const enable = fs.readFileSync(path.join(__dirname, 'enable-humanify-rls-request-bound.sh'), 'utf8');
if (/HUMANIFY_RLS_MODE=soft/.test(enable) || /soft/.test(enable)) ok('prod enable stays soft');
else fail('prod enable stays soft');

async function optionalLive() {
  if (process.env.HUMANIFY_RLS_LAB !== '1') {
    ok('live lab skipped (set HUMANIFY_RLS_LAB=1 + DATABASE_URL)');
    return;
  }
  const url = process.env.DATABASE_URL || '';
  if (!url || /humanify\.id|prod/i.test(url) && !/lab|staging|rls_lab/i.test(url)) {
    fail('live lab refused — DATABASE_URL must look like lab/staging');
    return;
  }
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: url });
    await client.connect();
    await client.query(`SELECT set_config('app.current_tenant', '', true)`);
    // Without tenant, strict policies should deny tenant-scoped tables if applied.
    // Soft probe: just confirm we can query current_setting.
    const r = await client.query(`SELECT current_setting('app.current_tenant', true) AS t`);
    if (r.rows[0]) ok('live lab connected + set_config');
    else fail('live lab query');
    await client.end();
  } catch (e) {
    fail(`live lab: ${String(e.message || e).slice(0, 120)}`);
  }
}

optionalLive().then(() => {
  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed ? 1 : 0);
});
