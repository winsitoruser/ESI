#!/usr/bin/env node
/**
 * Wave-80 static checks: Finance SoD, invite Finance, plan default, go-live items, MSS labels.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };
const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('Humanify wave-80 SoD / MSS / go-live');

const sod = read('lib/saas/payroll-finance-sod.ts');
if (/finance_staff/.test(sod) && /FINANCE_SOD_REQUIRED/.test(sod)) ok('payroll finance SoD helper');
else fail('payroll finance SoD helper');

const payroll = read('pages/api/humanify/payroll.ts');
if (/canPayrollFinanceAction/.test(payroll) && /payrollFinanceDeniedPayload/.test(payroll)) {
  ok('payroll approve/paid SoD wired');
} else fail('payroll SoD wired');

const inv = read('lib/saas/invitations.ts');
if (/finance_staff/.test(inv) && /label: 'Finance'/.test(inv)) ok('INVITE_ROLES includes Finance');
else fail('INVITE_ROLES Finance');

const plan = read('lib/saas/plan-entitlements.ts');
if (/if \(!raw\) return 'starter'/.test(plan)) ok('null plan → starter');
else fail('null plan default');
if (/humanify\\\/kpi/.test(plan) && /feature: 'analytics'/.test(plan)) ok('KPI gated analytics');
else fail('KPI analytics gate');

const golive = read('lib/saas/go-live.ts');
if (/attendance_ready/.test(golive) && /leave_ready/.test(golive) && /payroll_ready/.test(golive)) {
  ok('go-live Day-1 items');
} else fail('go-live Day-1 items');

const mgr = read('pages/api/employee/manager.ts');
if (/assertPendingOnTeam/.test(mgr)) ok('manager claim/OT team scope on approve');
else fail('manager team scope');

const mss = read('pages/humanify/mss.tsx');
if (/tenant-wide/.test(mss)) ok('MSS scope banner');
else fail('MSS scope banner');

const hub = read('components/employee/ManagerHubTab.tsx');
if (/tim saja|tim langsung/.test(hub)) ok('ESS Manager Hub scope banner');
else fail('ESS Manager Hub banner');

const side = read('config/humanify-sidebar.config.ts');
if (/AIMAN · Confirm/.test(side)) ok('AIMAN confirm label');
else fail('AIMAN confirm label');

const dash = read('pages/humanify/index.tsx');
if (!/href: '\/humanify\/engagement'/.test(dash)) ok('dashboard engagement CTA removed');
else fail('dashboard engagement still linked');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
