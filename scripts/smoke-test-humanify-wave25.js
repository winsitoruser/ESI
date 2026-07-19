#!/usr/bin/env node
/**
 * Wave-25 unit: reset-password soft e2e, uptime cron, state dir deploy, careers soft e2e.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-25 unit');

const files = [
  '../e2e/humanify-reset-password-ui.spec.ts',
  '../e2e/humanify-careers-ui.spec.ts',
  '../scripts/ensure-humanify-crons.sh',
  '../scripts/deploy-humanify-vps.sh',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const reset = fs.readFileSync(path.join(__dirname, '../e2e/humanify-reset-password-ui.spec.ts'), 'utf8');
if (/Tautan tidak lengkap/.test(reset) && /not-a-real-token/.test(reset) && /Simpan password baru/.test(reset)) {
  ok('reset-password soft e2e');
} else fail('reset-password soft e2e');

const careers = fs.readFileSync(path.join(__dirname, '../e2e/humanify-careers-ui.spec.ts'), 'utf8');
if (/\/c\/demo\/careers/.test(careers) && /Portal karir/.test(careers)) ok('careers soft e2e');
else fail('careers soft e2e');

const crons = fs.readFileSync(path.join(__dirname, '../scripts/ensure-humanify-crons.sh'), 'utf8');
if (/uptime-external/.test(crons) && /check-humanify-uptime-external/.test(crons)) {
  ok('uptime-external cron');
} else fail('uptime-external cron');

const deploy = fs.readFileSync(path.join(__dirname, '../scripts/deploy-humanify-vps.sh'), 'utf8');
if (/HUMANIFY_STATE_DIR|\/var\/lib\/humanify/.test(deploy) && /Ensure HUMANIFY_STATE_DIR/.test(deploy)) {
  ok('deploy state dir');
} else fail('deploy state dir');

if (/check-humanify-uptime-external/.test(deploy)) ok('deploy one-shot uptime probe');
else fail('deploy one-shot uptime probe');

const page = fs.readFileSync(path.join(__dirname, '../pages/humanify/reset-password.tsx'), 'utf8');
if (/Tautan tidak lengkap/.test(page) && /Buat password baru/.test(page)) ok('reset-password page cues');
else fail('reset-password page cues');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave25/.test(pkg) && /reset-password/.test(pkg) && /careers/.test(pkg)) ok('package scripts');
else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
