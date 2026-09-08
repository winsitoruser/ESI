#!/usr/bin/env node
/**
 * Wave-85 Track B — product-truth edition (PR-004 / PR-005).
 * Lab modules stay hidden unless explicitly opted in. Partner payout + FE chrome remain.
 */
const fs = require('fs');
const path = require('path');
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };
const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('Humanify wave-85 Track B (GA-safe IA)');

const side = read('config/humanify-sidebar.config.ts');
if (/id: 'humanify-esign'/.test(side) && /ESIGN_UI_ENABLED/.test(side) && /!== 'true'/.test(side)) {
  ok('E-Sign sidebar hidden unless opt-in');
} else fail('E-Sign sidebar gate');
if (/id: 'humanify-engagement'/.test(side) && /humanify-engagement[\s\S]{0,220}hidden:\s*true/.test(side)) ok('Engagement hidden from GA IA');
else fail('Engagement hidden');
if (/lms\/proctoring/.test(side) && /HUMANIFY_LMS_LAB/.test(side)) ok('LMS advanced IA lab-gated');
else fail('LMS advanced IA');
if (/id: 'humanify-project'/.test(side) && /humanify-project[\s\S]{0,220}hidden:\s*true/.test(side)) ok('HR Projects hidden from GA IA');
else fail('HR Projects hidden');

const esign = read('pages/humanify/esign.tsx');
if (/NEXT_PUBLIC_ESIGN_UI_ENABLED/.test(esign) && /=== 'true'/.test(esign)) ok('E-Sign UI opt-in (default hidden)');
else fail('E-Sign UI gate');

const pay = read('lib/saas/partner-payouts.ts');
if (/queuePartnerPayoutDisbursement/.test(pay) && /HUMANIFY_PARTNER_AUTO_PAYOUT/.test(pay)) {
  ok('Partner auto-payout queue');
} else fail('Partner auto-payout');

const plat = read('pages/api/platform/index.ts');
if (/partner-payout-disburse/.test(plat)) ok('Platform disburse action');
else fail('Platform disburse');

const obs = read('lib/observability/index.ts');
if (/HUMANIFY_SENTRY_EXTERNAL/.test(obs)) ok('Sentry.io opt-in path present');
else fail('Sentry opt-in');

const rls = read('docs/humanify-wave85-track-b.md');
if (/HUMANIFY_RLS_MODE/.test(rls) && /FORCE/.test(rls)) ok('Wave-85 RLS flip doc');
else fail('RLS flip doc');

const fePages = [
  'pages/humanify/payroll/index.tsx',
  'pages/humanify/leave.tsx',
  'pages/humanify/employees.tsx',
  'pages/humanify/attendance.tsx',
  'pages/humanify/reimbursement.tsx',
  'pages/humanify/payroll/lembur.tsx',
  'pages/humanify/mss.tsx',
];
const CHROME_RE = /EnterprisePageHeader|PayrollShell|PlatformAccessShell|OpsPageHero/;
let feOk = 0;
for (const p of fePages) {
  if (CHROME_RE.test(read(p))) feOk++;
}
if (feOk === fePages.length) ok(`FE chrome on ${feOk} GA pages`);
else fail(`FE chrome only ${feOk}/${fePages.length}`);

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
