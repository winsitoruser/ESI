#!/usr/bin/env node
/**
 * Wave-38 unit: demo careers job soft, partners Daftar, signup partners cue,
 * phase3/4/6 aliases.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-38 unit');

const files = [
  '../e2e/humanify-careers-ui.spec.ts',
  '../e2e/humanify-partners-ui.spec.ts',
  '../e2e/humanify-signup-ui.spec.ts',
  '../pages/humanify/partners.tsx',
  '../components/humanify/HumanifySignupForm.tsx',
  '../scripts/smoke-test-saas-phase3-metrics.js',
  '../scripts/smoke-test-saas-phase4-billing.js',
  '../scripts/smoke-test-saas-phase6-seats.js',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const careers = fs.readFileSync(path.join(__dirname, '../e2e/humanify-careers-ui.spec.ts'), 'utf8');
if (/job detail soft/.test(careers) && /do not submit Kirim Lamaran/i.test(careers)) {
  ok('demo careers job soft');
} else fail('demo careers job soft');

const partnersPage = fs.readFileSync(path.join(__dirname, '../pages/humanify/partners.tsx'), 'utf8');
if (/signupPath/.test(partnersPage) && />\s*Daftar\s*</.test(partnersPage)) ok('partners Daftar link');
else fail('partners Daftar link');

const partnersE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-partners-ui.spec.ts'), 'utf8');
if (/\/humanify\/signup/.test(partnersE2e)) ok('partners signup soft');
else fail('partners signup soft');

const signupForm = fs.readFileSync(path.join(__dirname, '../components/humanify/HumanifySignupForm.tsx'), 'utf8');
if (/partnersPath/.test(signupForm) && /Channel partner/.test(signupForm)) ok('signup partners cue');
else fail('signup partners cue');

const signupE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-signup-ui.spec.ts'), 'utf8');
if (/\/humanify\/partners/.test(signupE2e) && /Channel partner|partner/i.test(signupE2e)) {
  ok('signup partners soft');
} else fail('signup partners soft');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave38/.test(pkg) && /smoke:phase3-metrics/.test(pkg)
  && /smoke:phase4-billing/.test(pkg) && /smoke:phase6-seats/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
