#!/usr/bin/env node
/**
 * Wave-55 / Literal 100% (post Wave-54) unit smoke.
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

console.log('Humanify wave-55 literal-100 unit');

const decisions = read('.hermes/DECISIONS.md');
const pkg = read('package.json');
const gate = exists('.github/workflows/humanify-saas-gate.yml')
  ? read('.github/workflows/humanify-saas-gate.yml')
  : '';

// L0
if (/D-018/.test(decisions) && exists('scripts/ensure-humanify-fiscal-signoff.sh')) {
  ok('L0-2 fiscal sign-off ensure + D-018');
} else fail('L0-2 fiscal sign-off');

if (/D-013b/.test(decisions) && /SMOKE_BASE_URL|staging/i.test(read('docs/humanify-rls-strict-staging.md'))) {
  ok('L0-3 staging/IDOR docs + D-013b');
} else fail('L0-3 staging/IDOR docs');

if (/D-015b/.test(decisions) && /saas_partner_payouts/.test(read('lib/saas/partner-payouts.ts'))) {
  ok('L0-4 / CP-L4-1 payout ledger D-015b');
} else fail('L0-4 payout ledger');

if (/SumoPod email Verify/.test(read('docs/humanify-ops-alerts.md'))) {
  ok('L0-1 SumoPod verify runbook');
} else fail('L0-1 SumoPod verify runbook');

// L1 UX
const wf = read('pages/humanify/workforce-analytics.tsx');
const hr = read('pages/humanify/hr-analytics.tsx');
if (!/#4F46E5|#6366f1/.test(wf + hr) && /#7c3aed/.test(wf)) ok('UX-L1-1 chart brand palette');
else fail('UX-L1-1 chart brand palette');

if (exists('pages/platform/demo-checklist.tsx')) ok('MKT-L1-1 demo checklist');
else fail('MKT-L1-1 demo checklist');

if (/HumanifySeoHead/.test(read('pages/humanify/partners.tsx'))) ok('MKT-L1-2 partners SEO');
else fail('MKT-L1-2 partners SEO');

if (/platform\/observability/.test(read('pages/settings/backup.tsx'))) ok('OBS-L1-1 backup → observability');
else fail('OBS-L1-1 backup unify');

if (/smoke:wave54/.test(gate) && /hr-auth-gate/.test(gate)) ok('HR-L1-1 CI wave54 + hr-auth-gate');
else fail('HR-L1-1 CI wave54 + hr-auth-gate');

// L2
if (/slip-gaji/.test(read('e2e/humanify-payroll-hard.spec.ts'))
  && /D-014 amend/.test(decisions)) {
  ok('PAY-L2-1/2 hard payroll + D-014 amend');
} else fail('PAY-L2 hard payroll');

if (/PKP 60M exactly/.test(read('scripts/smoke-test-saas-payroll-fiscal.js'))) {
  ok('PAY-L2-3 fiscal bracket edges');
} else fail('PAY-L2-3 fiscal edges');

if (/smoke:payslip-gate/.test(pkg)) ok('PAY-L2-4 payslip-gate script');
else fail('PAY-L2-4 payslip-gate');

// L3
if (/D-013b/.test(decisions) && /security-scorecard/.test(read('scripts/ensure-humanify-crons.sh'))) {
  ok('SEC-L3 D-013b + weekly scorecard cron');
} else fail('SEC-L3 scorecard');

// L4
if (exists('pages/humanify/partners/status.tsx')
  && exists('pages/api/humanify/partners/status.ts')) {
  ok('MKT-L4-1 partner status portal');
} else fail('MKT-L4-1 partner status portal');

if (/D-010b/.test(decisions)) ok('OBS-L4-1 D-010b Obs ceiling');
else fail('OBS-L4-1 D-010b');

if (/\?ref=/.test(read('lib/observability/alerts.ts'))
  && /refHighlight/.test(read('pages/platform/observability.tsx'))) {
  ok('OBS-L4-2 request-id deep link');
} else fail('OBS-L4-2 request-id deep link');

if (/D-012b/.test(decisions)) ok('CP-L4-2 IdP QC D-012b');
else fail('CP-L4-2 IdP QC');

if (/partner-payout-mark-paid/.test(read('pages/api/platform/index.ts'))) {
  ok('CP-L4-1 platform payout actions');
} else fail('CP-L4-1 platform payout actions');

if (/smoke:wave55/.test(pkg)) ok('package smoke:wave55');
else fail('package smoke:wave55');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
