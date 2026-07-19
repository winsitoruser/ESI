#!/usr/bin/env node
/**
 * Wave-48 unit: payroll soft auth-gate expanded (bpjs/slip/thr/… full module set).
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-48 unit');

const e2ePath = path.join(__dirname, '../e2e/humanify-payroll-ui.spec.ts');
if (fs.existsSync(e2ePath)) ok('present humanify-payroll-ui.spec.ts');
else fail('missing humanify-payroll-ui.spec.ts');

const e2e = fs.readFileSync(e2ePath, 'utf8');
const required = [
  'bpjs',
  'slip-gaji',
  'thr',
  'bonus',
  'lembur',
  'laporan',
  'disbursement',
  'cash-advance',
  'loan',
  'PAYROLL_GATED',
];
for (const r of required) {
  if (e2e.includes(r)) ok(`payroll gate ${r}`);
  else fail(`payroll gate ${r}`);
}

if (/do not submit login/i.test(e2e) && /Wave-48|Wave-47/.test(e2e)) ok('soft auth-gate note');
else fail('soft auth-gate note');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave48/.test(pkg) && /test:e2e:humanify:payroll:prod/.test(pkg)) ok('package scripts');
else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
