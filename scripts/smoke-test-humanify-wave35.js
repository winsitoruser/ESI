#!/usr/bin/env node
/**
 * Wave-35 unit: join/signup-ref soft, PWA manifest public, phase11/24 aliases.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-35 unit');

const files = [
  '../middleware.ts',
  '../e2e/humanify-join-ui.spec.ts',
  '../e2e/humanify-signup-ref-ui.spec.ts',
  '../e2e/humanify-health-ui.spec.ts',
  '../public/manifest-employee.json',
  '../scripts/smoke-test-saas-phase11-offboarding.js',
  '../scripts/smoke-test-saas-phase24-v1-write.js',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const mw = fs.readFileSync(path.join(__dirname, '../middleware.ts'), 'utf8');
if (/manifest-employee\.json/.test(mw) && /icons\//.test(mw)) ok('middleware PWA public');
else fail('middleware PWA public');

const join = fs.readFileSync(path.join(__dirname, '../e2e/humanify-join-ui.spec.ts'), 'utf8');
if (/not-a-real-token/.test(join) && /\/humanify\/login/.test(join) && /no accept form submit/i.test(join)) {
  ok('join invalid token login soft');
} else fail('join invalid token login soft');

const ref = fs.readFileSync(path.join(__dirname, '../e2e/humanify-signup-ref-ui.spec.ts'), 'utf8');
if (/ref=DEMO/.test(ref) && /Masuk di sini|Sudah punya akun/.test(ref) && /do not submit/i.test(ref)) {
  ok('signup-ref Masuk soft');
} else fail('signup-ref Masuk soft');

const health = fs.readFileSync(path.join(__dirname, '../e2e/humanify-health-ui.spec.ts'), 'utf8');
if (/manifest-employee\.json/.test(health) && /favicon\.ico/.test(health) && /Humanify/.test(health)) {
  ok('favicon/manifest soft');
} else fail('favicon/manifest soft');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave35/.test(pkg) && /smoke:phase11-offboarding/.test(pkg) && /smoke:phase24-v1-write/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
