#!/usr/bin/env node
/**
 * Wave-47 unit: payroll soft auth-gate e2e, npm aliases, RLS lab still no-prod-flip.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-47 unit');

const files = [
  '../e2e/humanify-payroll-ui.spec.ts',
  '../scripts/smoke-test-humanify-rls-strict-lab.js',
  '../docs/humanify-rls-strict-staging.md',
  '../scripts/smoke-test-saas-payroll-fiscal.js',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const e2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-payroll-ui.spec.ts'), 'utf8');
if (/soft auth-gate/.test(e2e) && /\/humanify\/payroll/.test(e2e)
  && /do not submit login/i.test(e2e) && /pph21/.test(e2e)) {
  ok('payroll auth-gate soft');
} else fail('payroll auth-gate soft');

const doc = fs.readFileSync(path.join(__dirname, '../docs/humanify-rls-strict-staging.md'), 'utf8');
if (/Do \*\*not\*\* flip prod|staging only/i.test(doc) && /payroll soft/i.test(doc)) {
  ok('RLS lab payroll soft path');
} else fail('RLS lab payroll soft path');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave47/.test(pkg) && /test:e2e:humanify:payroll/.test(pkg)
  && /test:e2e:humanify:payroll:prod/.test(pkg) && /smoke:rls-lab/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
