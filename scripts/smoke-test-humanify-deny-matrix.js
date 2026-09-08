#!/usr/bin/env node
/**
 * Persona deny-matrix (static Wave-82) — staff must not get payroll/billing routes as core.
 * Live E2E remains Playwright secret-gated; this asserts entitlement + sidebar rules.
 */
const fs = require('fs');
const path = require('path');
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };
const root = path.join(__dirname, '..');
const ent = fs.readFileSync(path.join(root, 'lib/saas/plan-entitlements.ts'), 'utf8');
const side = fs.readFileSync(path.join(root, 'config/humanify-sidebar.config.ts'), 'utf8');
const sod = fs.readFileSync(path.join(root, 'lib/saas/payroll-finance-sod.ts'), 'utf8');
const mgr = fs.readFileSync(path.join(root, 'pages/api/employee/manager.ts'), 'utf8');

console.log('Humanify deny-matrix (static)');

if (/feature: 'payroll'/.test(ent) && /travel-expense/.test(ent)) ok('payroll routes gated');
else fail('payroll routes');
if (/feature: 'analytics'/.test(ent) && /kpi/.test(ent)) ok('KPI analytics-gated (Starter deny)');
else fail('KPI gate');
if (/finance_staff/.test(sod)) ok('Finance SoD roles defined');
else fail('Finance SoD');
if (/assertPendingOnTeam/.test(mgr)) ok('Manager cannot approve off-team claims');
else fail('Manager team deny');
if (/humanify-esign/.test(side) && /ESIGN_UI_ENABLED/.test(side) && /!== 'true'/.test(side)) {
  ok('E-sign IA hidden unless opt-in (PR-005)');
} else fail('E-sign lab gate');

const inv = fs.readFileSync(path.join(root, 'lib/saas/invitations.ts'), 'utf8');
if (/finance_staff/.test(inv)) ok('Finance inviteable');
else fail('Finance invite');

const dash = fs.readFileSync(path.join(root, 'pages/api/employee/dashboard.ts'), 'utf8');
if (/requireEssPayrollFeature/.test(dash)) ok('ESS claim/OT/payslip plan-gated');
else fail('ESS plan gate');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
