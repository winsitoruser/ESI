#!/usr/bin/env node
/**
 * Wave-54 / Maturity Sprint-4 unit smoke.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

console.log('Humanify wave-54 maturity-S4 unit');

const decisions = read('.hermes/DECISIONS.md');
const pkg = read('package.json');

// SEC-S4-1 — lab smoke + no prod flip
if (exists('scripts/smoke-test-humanify-rls-strict-lab.js')
  && /smoke:rls-lab/.test(pkg)
  && /D-013/.test(decisions)
  && /Do \*\*not\*\* flip prod|Do not flip prod/i.test(read('docs/humanify-rls-strict-staging.md'))) {
  ok('SEC-S4-1 RLS lab + no-prod-flip (D-013)');
} else fail('SEC-S4-1 RLS lab + no-prod-flip');

// SEC-S4-2
const helper = read('lib/saas/run-with-tenant-db-context.ts');
const digest = read('scripts/send-humanify-action-inbox-digest.js');
if (/runWithTenantDbContext/.test(helper)
  && /set_config\('app\.current_tenant'/.test(digest)
  && exists('scripts/smoke-test-humanify-rls-job-chaos.js')
  && /smoke:rls-job-chaos/.test(pkg)) {
  ok('SEC-S4-2 job tenant context + chaos smoke');
} else fail('SEC-S4-2 job tenant context + chaos smoke');

// HR-S4-1
const devices = read('pages/api/humanify/attendance/devices.ts');
const zkteco = read('lib/hris/device-adapters/zkteco.ts');
if (/withHQAuth\(handler/.test(devices)
  && /tenant_id = :tid/.test(zkteco)) {
  ok('HR-S4-1 devices withHQAuth + zkteco tenant filter');
} else fail('HR-S4-1 devices withHQAuth + zkteco tenant filter');

// CP-S4-1
if (exists('e2e/humanify-payroll-hard.spec.ts')
  && /HUMANIFY_E2E_HARD/.test(read('e2e/humanify-payroll-hard.spec.ts'))
  && /D-014/.test(decisions)) {
  ok('CP-S4-1 hard payroll skeleton + D-014');
} else fail('CP-S4-1 hard payroll skeleton + D-014');

// CP-S4-2
if (/D-015/.test(decisions) && /payout ledger deferred|won't-do.*payout|Partner payout ledger deferred/i.test(decisions)) {
  ok('CP-S4-2 partner payout ADR D-015');
} else fail('CP-S4-2 partner payout ADR D-015');

// CP-S4-3
if (/D-012 addendum|synthetic ACS|smoke:sso-acs/i.test(decisions)) {
  ok('CP-S4-3 SAML QC via D-012 addendum');
} else fail('CP-S4-3 SAML QC via D-012 addendum');

// CP-S4-4
if (/D-017/.test(decisions) && /humanify-core/.test(decisions)) {
  ok('CP-S4-4 packages/humanify-core wont-do D-017');
} else fail('CP-S4-4 packages/humanify-core wont-do D-017');

// ESS-S4-1
const sw = read('public/sw-employee.js');
if (/humanify-employee-v3/.test(sw)
  && /online-first|D-016/.test(sw)
  && /D-016/.test(decisions)) {
  ok('ESS-S4-1 SW online-first v3 + D-016');
} else fail('ESS-S4-1 SW online-first v3 + D-016');

// UX-S4-1
const authPages = ['forgot-password', 'reset-password', 'verify-email', 'join']
  .map((n) => read(`pages/humanify/${n}.tsx`));
const residual = authPages.some((s) => /indigo-|violet-/.test(s));
if (!residual) ok('UX-S4-1 auth pages no indigo/violet');
else fail('UX-S4-1 auth pages no indigo/violet');

if (/smoke:wave54/.test(pkg)) ok('package smoke:wave54');
else fail('package smoke:wave54');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
