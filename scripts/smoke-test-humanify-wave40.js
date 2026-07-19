#!/usr/bin/env node
/**
 * Wave-40 unit: careers Daftar, reset login cue, verify welcome, llms careers,
 * tenant-isolation aliases.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-40 unit');

const files = [
  '../pages/careers/index.tsx',
  '../pages/humanify/reset-password.tsx',
  '../pages/humanify/verify-email.tsx',
  '../public/llms.txt',
  '../e2e/humanify-careers-ui.spec.ts',
  '../e2e/humanify-reset-password-ui.spec.ts',
  '../e2e/humanify-verify-email-ui.spec.ts',
  '../e2e/humanify-seo-public-ui.spec.ts',
  '../scripts/smoke-test-saas-tenant-isolation.js',
  '../scripts/smoke-test-saas-tenant-empty-state.js',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const careers = fs.readFileSync(path.join(__dirname, '../pages/careers/index.tsx'), 'utf8');
if (/signupPath/.test(careers) && /Daftar trial/.test(careers)) ok('careers Daftar cue');
else fail('careers Daftar cue');

const careersE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-careers-ui.spec.ts'), 'utf8');
if (/\/humanify\/signup/.test(careersE2e) && /Daftar/i.test(careersE2e)) ok('careers signup soft');
else fail('careers signup soft');

const reset = fs.readFileSync(path.join(__dirname, '../pages/humanify/reset-password.tsx'), 'utf8');
if (/noToken/.test(reset) && /Kembali ke login/.test(reset)) ok('reset login cue');
else fail('reset login cue');

const resetE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-reset-password-ui.spec.ts'), 'utf8');
if (/\/humanify\/login/.test(resetE2e) && /Kembali ke login/i.test(resetE2e)) ok('reset login soft');
else fail('reset login soft');

const verify = fs.readFileSync(path.join(__dirname, '../pages/humanify/verify-email.tsx'), 'utf8');
if (/welcomePath/.test(verify) && /Pelajari Humanify/.test(verify)) ok('verify welcome cue');
else fail('verify welcome cue');

const verifyE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-verify-email-ui.spec.ts'), 'utf8');
if (/\/humanify\/welcome/.test(verifyE2e) && /Pelajari Humanify/i.test(verifyE2e)) {
  ok('verify welcome soft');
} else fail('verify welcome soft');

const llms = fs.readFileSync(path.join(__dirname, '../public/llms.txt'), 'utf8');
if (/humanify\.id\/careers/.test(llms) && /Careers help/i.test(llms)) ok('llms careers');
else fail('llms careers');

const seo = fs.readFileSync(path.join(__dirname, '../e2e/humanify-seo-public-ui.spec.ts'), 'utf8');
if (/Allow:\\s\*\\\/careers/i.test(seo) && /humanify\\.id\\\/careers/i.test(seo)) ok('seo careers soft');
else fail('seo careers soft');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave40/.test(pkg) && /smoke:tenant-isolation/.test(pkg)
  && /smoke:tenant-empty-state/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
