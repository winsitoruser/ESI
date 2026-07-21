#!/usr/bin/env node
/**
 * Wave-68 — cron tenant-context readiness for eventual prod FORCE strict RLS
 * Does NOT flip prod.
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

console.log('Humanify wave-68 cron RLS readiness (no prod flip)');

if (exists('scripts/lib/tenant-db-context.js')
  && /withTenantContext|withSuperAdminContext/.test(read('scripts/lib/tenant-db-context.js'))) {
  ok('tenant-db-context helper');
} else fail('tenant-db-context helper');

const digest = read('scripts/send-humanify-doc-expiry-digest.js');
if (/withTenantContext|tenant-db-context/.test(digest)) ok('doc-expiry digest binds tenant');
else fail('doc-expiry digest binds tenant');

const soft = read('scripts/run-humanify-doc-expiry-soft-deactivate.js');
if (/withSuperAdminContext|withTenantContext/.test(soft)) ok('soft-deactivate binds context');
else fail('soft-deactivate binds context');

const hard = read('scripts/hard-delete-purged-tenants.js');
if (/withTenantContext|tenant-db-context/.test(hard)) ok('hard-delete binds tenant');
else fail('hard-delete binds tenant');

const inbox = read('scripts/send-humanify-action-inbox-digest.js');
if (/set_config\('app\.current_tenant'/.test(inbox)
  && !/SELECT COUNT\(\*\)::int FROM leave_requests lr WHERE lr\.tenant_id = t\.id/.test(inbox)) {
  ok('action-inbox digest no unscoped leave subquery');
} else fail('action-inbox digest no unscoped leave subquery');

const migrate = read('scripts/migrate-humanify-rls.js');
if (/employee_documents/.test(migrate)) ok('migrate includes employee_documents');
else fail('migrate includes employee_documents');

if (exists('docs/humanify-rls-prod-flip.md')
  && /CONFIRM_PROD_RLS_STRICT/.test(read('docs/humanify-rls-prod-flip.md'))) {
  ok('prod flip runbook gated');
} else fail('prod flip runbook gated');

if (exists('scripts/flip-humanify-prod-rls-strict.sh')
  && /CONFIRM_PROD_RLS_STRICT=YES/.test(read('scripts/flip-humanify-prod-rls-strict.sh'))) {
  ok('flip script requires confirm');
} else fail('flip script requires confirm');

const handoff = read('.hermes/HANDOFF.md');
if (/Wave-68/.test(handoff)) ok('HANDOFF Wave-68');
else fail('HANDOFF Wave-68');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
