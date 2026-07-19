#!/usr/bin/env node
/**
 * Wave-49 unit: HR soft auth-gate (employees/attendance/leave/…).
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-49 unit');

const e2ePath = path.join(__dirname, '../e2e/humanify-hr-auth-gate-ui.spec.ts');
if (fs.existsSync(e2ePath)) ok('present humanify-hr-auth-gate-ui.spec.ts');
else fail('missing humanify-hr-auth-gate-ui.spec.ts');

const e2e = fs.readFileSync(e2ePath, 'utf8');
const required = [
  'HR_GATED',
  'employees',
  'employees-import',
  'attendance',
  'attendance-management',
  'leave',
  'recruitment',
  'onboarding',
  'offboarding',
  'reimbursement',
  'performance',
  'organization',
];
for (const r of required) {
  if (e2e.includes(r)) ok(`hr gate ${r}`);
  else fail(`hr gate ${r}`);
}

if (/do not submit login/i.test(e2e) && /Wave-49/.test(e2e)) ok('soft auth-gate note');
else fail('soft auth-gate note');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave49/.test(pkg) && /test:e2e:humanify:hr-auth-gate/.test(pkg)
  && /test:e2e:humanify:hr-auth-gate:prod/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
