#!/usr/bin/env node
/**
 * Wave-81 static: ESS GUC wrapper, MFA API lock, claim-file, withHQAuth fail-closed.
 * Midtrans missing-sig still deferred (admin).
 */
const fs = require('fs');
const path = require('path');
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };
const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('Humanify wave-81 isolation');

const wrap = read('lib/middleware/withEmployeeAuth.ts');
if (/setDbTenantContext/.test(wrap) && /MFA_SETUP_REQUIRED/.test(wrap)) ok('withEmployeeAuth GUC + MFA');
else fail('withEmployeeAuth');

const empDir = path.join(root, 'pages/api/employee');
const empFiles = fs.readdirSync(empDir).filter((f) => f.endsWith('.ts'));
let allWrapped = true;
for (const f of empFiles) {
  const t = fs.readFileSync(path.join(empDir, f), 'utf8');
  if (!/withEmployeeAuth\(handler\)/.test(t)) {
    allWrapped = false;
    fail(`ESS wrap missing: ${f}`);
  }
}
if (allWrapped) ok(`all ${empFiles.length} ESS APIs wrapped`);

const claim = read('pages/api/humanify/claim-file.ts');
if (!/role === 'owner'/.test(claim) && /platform_admin/.test(claim)) ok('claim-file owner not cross-tenant super');
else fail('claim-file owner privilege');

const storage = read('lib/hris/claim-storage.ts');
if (/CLAIM_SIGN_SECRET_MISSING/.test(storage) && /NODE_ENV === 'production'/.test(storage)) {
  ok('claim HMAC no weak fallback in prod');
} else fail('claim HMAC harden');

const hq = read('lib/middleware/withHQAuth.ts');
if (/MODULE_CHECK_UNAVAILABLE/.test(hq) && /ENTITLEMENT_CHECK_UNAVAILABLE/.test(hq)) {
  ok('withHQAuth fail-closed in production');
} else fail('withHQAuth fail-closed');
if (/MFA_SETUP_REQUIRED/.test(hq)) ok('withHQAuth MFA gate');
else fail('withHQAuth MFA gate');

const mw = read('middleware.ts');
if (/MFA_SETUP_REQUIRED/.test(mw) && /mfaApiAllow|mfaSetupRequired/.test(mw)) ok('middleware API MFA lock');
else fail('middleware API MFA lock');

const faq = read('docs/humanify-tenant-isolation-faq.md');
if (/Track A Security 100/.test(faq) && /withEmployeeAuth/.test(faq)) ok('Soft RLS FAQ Track A');
else fail('Soft RLS FAQ');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
