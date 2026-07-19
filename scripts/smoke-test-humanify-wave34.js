#!/usr/bin/env node
/**
 * Wave-34 unit: demo careers soft, reset forgot link, verify Kirim ulang cue,
 * phase12/23 npm aliases.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-34 unit');

const files = [
  '../e2e/humanify-careers-ui.spec.ts',
  '../e2e/humanify-reset-password-ui.spec.ts',
  '../e2e/humanify-verify-email-ui.spec.ts',
  '../scripts/smoke-test-saas-phase12-digest.js',
  '../scripts/smoke-test-saas-phase23-invitations.js',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const careers = fs.readFileSync(path.join(__dirname, '../e2e/humanify-careers-ui.spec.ts'), 'utf8');
if (/\/c\/demo\/careers/.test(careers) && /Masuk HR/.test(careers) && /Lamar langsung|Belum ada lowongan/.test(careers)
  && /do not open apply/i.test(careers)) {
  ok('demo careers soft cues');
} else fail('demo careers soft cues');

const reset = fs.readFileSync(path.join(__dirname, '../e2e/humanify-reset-password-ui.spec.ts'), 'utf8');
if (/forgot-password/.test(reset) && /Minta tautan reset/.test(reset)) ok('reset forgot soft link');
else fail('reset forgot soft link');

const verify = fs.readFileSync(path.join(__dirname, '../e2e/humanify-verify-email-ui.spec.ts'), 'utf8');
if (/Kirim ulang/.test(verify) && /do not click/i.test(verify)) ok('verify Kirim ulang soft');
else fail('verify Kirim ulang soft');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave34/.test(pkg) && /smoke:phase12-digest/.test(pkg) && /smoke:phase23-invitations/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
