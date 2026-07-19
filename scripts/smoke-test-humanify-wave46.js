#!/usr/bin/env node
/**
 * Wave-46 unit: soft-hardening series close-out (waves 43–45 + runners present).
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-46 unit');

const waves = [43, 44, 45, 46];
for (const n of waves) {
  const f = path.join(__dirname, `smoke-test-humanify-wave${n}.js`);
  if (fs.existsSync(f)) ok(`present wave${n}`);
  else fail(`missing wave${n}`);
}

const handoff = fs.readFileSync(path.join(__dirname, '../.hermes/HANDOFF.md'), 'utf8');
if (/Wave-46/.test(handoff) && /soft-hardening series|Soft-hardening series/i.test(handoff)) {
  ok('HANDOFF close-out');
} else fail('HANDOFF close-out');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave43/.test(pkg) && /smoke:wave44/.test(pkg) && /smoke:wave45/.test(pkg)
  && /smoke:wave46/.test(pkg) && /smoke:idor/.test(pkg) && /soft-public/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

const runners = [
  '../scripts/run-humanify-idor-smokes.sh',
  '../scripts/run-humanify-saas-hardening.sh',
];
for (const f of runners) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`runner ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
