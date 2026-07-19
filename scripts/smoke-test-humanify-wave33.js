#!/usr/bin/env node
/**
 * Wave-33 unit: ROI soft CTAs, forgot Kembali login, signup Masuk link,
 * phase21/22 npm aliases.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-33 unit');

const files = [
  '../e2e/humanify-roi-calculator-ui.spec.ts',
  '../e2e/humanify-forgot-password-ui.spec.ts',
  '../e2e/humanify-signup-ui.spec.ts',
  '../scripts/smoke-test-saas-phase21-notifications.js',
  '../scripts/smoke-test-saas-phase22-search.js',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const roi = fs.readFileSync(path.join(__dirname, '../e2e/humanify-roi-calculator-ui.spec.ts'), 'utf8');
if (/\/humanify\/login/.test(roi) && /\/humanify\/welcome/.test(roi) && /type="range"/.test(roi) && /do not drive/i.test(roi)) {
  ok('ROI soft CTAs + range');
} else fail('ROI soft CTAs + range');

const forgot = fs.readFileSync(path.join(__dirname, '../e2e/humanify-forgot-password-ui.spec.ts'), 'utf8');
if (/Kembali ke login/.test(forgot) && /do not submit/i.test(forgot)) ok('forgot Kembali soft');
else fail('forgot Kembali soft');

const signup = fs.readFileSync(path.join(__dirname, '../e2e/humanify-signup-ui.spec.ts'), 'utf8');
if (/Masuk di sini|Sudah punya akun/.test(signup) && /\/humanify\/login/.test(signup)) {
  ok('signup Masuk soft');
} else fail('signup Masuk soft');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave33/.test(pkg) && /smoke:phase21-notifications/.test(pkg) && /smoke:phase22-search/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
