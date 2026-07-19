#!/usr/bin/env node
/**
 * Wave-53 / Maturity Sprint-3 unit smoke.
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

console.log('Humanify wave-53 maturity-S3 unit');

// SEC-S3-1
const auth = read('pages/api/auth/[...nextauth].ts');
if (/checkLimit/.test(auth) && /RateLimitTier\.AUTH/.test(auth) && /rl:login:/.test(auth)) {
  ok('SEC-S3-1 NextAuth checkLimit AUTH');
} else fail('SEC-S3-1 NextAuth checkLimit AUTH');

// SEC-S3-2
if (exists('scripts/smoke-test-saas-redis-shared.js')
  && /smoke:redis-shared/.test(read('package.json'))) {
  ok('SEC-S3-2 redis-shared smoke script');
} else fail('SEC-S3-2 redis-shared smoke script');

// SEC-S3-3
const stagingDoc = read('docs/humanify-rls-strict-staging.md');
const decisions = read('.hermes/DECISIONS.md');
if (/prod proxy accepted|smoke:idor/.test(stagingDoc)
  && /Lab backup\/restore/.test(stagingDoc)
  && /D-013/.test(decisions)
  && stagingDoc.includes('[x] No cross-tenant')
  && stagingDoc.includes('[x] Backup/restore')
  && stagingDoc.includes('[x] Written decision')) {
  ok('SEC-S3-3 staging exit criteria closed');
} else fail('SEC-S3-3 staging exit criteria closed');

// HR-S3-1
if (exists('lib/hris/leave-bulk-cancel.ts')
  && exists('pages/api/humanify/leave-bulk.ts')
  && /leave-bulk\?action=cancel-pending/.test(read('pages/humanify/leave.tsx'))) {
  ok('HR-S3-1 leave bulk cancel+undo');
} else fail('HR-S3-1 leave bulk cancel+undo');

// ESS-S3-1
if (exists('pages/employee/leave.tsx')
  && exists('pages/employee/payslip.tsx')
  && exists('pages/employee/attendance.tsx')
  && /tab=leave/.test(read('pages/employee/leave.tsx'))) {
  ok('ESS-S3-1 employee route split');
} else fail('ESS-S3-1 employee route split');

// ESS-S3-2
const mgr = read('pages/api/employee/manager.ts');
const authz = read('lib/hris/leave-approver-auth.ts');
if (/assertCanApproveLeaveStep/.test(mgr)
  && /myPendingLeaveStepClause/.test(mgr)
  && /assertCanApproveLeaveStep/.test(authz)) {
  ok('ESS-S3-2 manager leave approver auth');
} else fail('ESS-S3-2 manager leave approver auth');

// CP-S3-1
const plat = read('pages/api/platform/index.ts');
const tenantUi = read('pages/platform/tenants/[id].tsx');
if (/getSeatUsage/.test(plat)
  && /tenant-mfa-policy/.test(plat)
  && /seats\.users/.test(tenantUi)
  && /Paksa MFA|requireMfa/.test(tenantUi)) {
  ok('CP-S3-1 tenant seats + MFA panels');
} else fail('CP-S3-1 tenant seats + MFA panels');

// CP-S3-2
if (/D-010/.test(decisions) && /SENTRY_MODE=internal|monitoring internal|Internal monitoring/i.test(decisions)) {
  ok('CP-S3-2 Sentry internal ADR (D-010)');
} else fail('CP-S3-2 Sentry internal ADR');

if (/smoke:wave53/.test(read('package.json'))) ok('package smoke:wave53');
else fail('package smoke:wave53');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
