#!/usr/bin/env node
/**
 * Wave-45 unit: smoke:idor + smoke:saas-hardening runners, soft-public signup-ref.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-45 unit');

const files = [
  '../scripts/run-humanify-idor-smokes.sh',
  '../scripts/run-humanify-saas-hardening.sh',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const idor = fs.readFileSync(path.join(__dirname, '../scripts/run-humanify-idor-smokes.sh'), 'utf8');
if (/idor-batch5/.test(idor) && /idor-batch11/.test(idor) && /idor-hr-modules/.test(idor)) {
  ok('idor runner coverage');
} else fail('idor runner coverage');

const hard = fs.readFileSync(path.join(__dirname, '../scripts/run-humanify-saas-hardening.sh'), 'utf8');
if (/employee-hardening/.test(hard) && /lms-lab-gate/.test(hard)) ok('hardening runner');
else fail('hardening runner');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave45/.test(pkg) && /"smoke:idor"/.test(pkg) && /smoke:saas-hardening/.test(pkg)
  && /humanify-signup-ref-ui\.spec\.ts/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
