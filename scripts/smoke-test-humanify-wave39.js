#!/usr/bin/env node
/**
 * Wave-39 unit: login Partner cue, forgot signup cue, sitemap ROI soft,
 * phase5/5b aliases.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-39 unit');

const files = [
  '../components/humanify/HumanifyLoginForm.tsx',
  '../pages/humanify/forgot-password.tsx',
  '../e2e/humanify-welcome-login.spec.ts',
  '../e2e/humanify-forgot-password-ui.spec.ts',
  '../e2e/humanify-seo-public-ui.spec.ts',
  '../scripts/smoke-test-saas-phase5-enterprise.js',
  '../scripts/smoke-test-saas-phase5b-support.js',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const login = fs.readFileSync(path.join(__dirname, '../components/humanify/HumanifyLoginForm.tsx'), 'utf8');
if (/partnersPath/.test(login) && />\s*Partner\s*</.test(login)) ok('login Partner cue');
else fail('login Partner cue');

const loginE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-welcome-login.spec.ts'), 'utf8');
if (/\/humanify\/partners/.test(loginE2e) && /Partner/i.test(loginE2e)) ok('login partners soft');
else fail('login partners soft');

const forgot = fs.readFileSync(path.join(__dirname, '../pages/humanify/forgot-password.tsx'), 'utf8');
if (/signupPath/.test(forgot) && /Daftar trial/.test(forgot)) ok('forgot signup cue');
else fail('forgot signup cue');

const forgotE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-forgot-password-ui.spec.ts'), 'utf8');
if (/\/humanify\/signup/.test(forgotE2e) && /Daftar trial|Belum punya akun/i.test(forgotE2e)) {
  ok('forgot signup soft');
} else fail('forgot signup soft');

const seo = fs.readFileSync(path.join(__dirname, '../e2e/humanify-seo-public-ui.spec.ts'), 'utf8');
if (/pricing\\\/roi-calculator/.test(seo) && /humanify\\\/signup/.test(seo)) ok('sitemap ROI soft');
else fail('sitemap ROI soft');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave39/.test(pkg) && /smoke:phase5-enterprise/.test(pkg) && /smoke:phase5b-support/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
