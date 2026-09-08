#!/usr/bin/env node
/**
 * Wave-84 static: a11y/ops docs, ESS plan gate, audit Track A close.
 */
const fs = require('fs');
const path = require('path');
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };
const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

console.log('Humanify wave-84 polish / Track A close');

if (exists('docs/humanify-deploy-runbook.md')) ok('deploy runbook');
else fail('deploy runbook');

if (exists('docs/humanify-a11y-browser-notes.md')) ok('a11y / browser notes');
else fail('a11y notes');

if (exists('docs/humanify-capacity-baseline.md')) ok('capacity baseline');
else fail('capacity baseline');

const dash = read('pages/api/employee/dashboard.ts');
if (/requireEssPayrollFeature/.test(dash) && /assertHumanifyFeature/.test(dash)) {
  ok('ESS payroll plan gate');
} else fail('ESS plan gate');

const mgr = read('pages/api/employee/manager.ts');
if (/requireManagerPayrollFeature/.test(mgr)) ok('MSS claim/OT payroll gate');
else fail('MSS payroll gate');

const audit = read('docs/humanify-multi-role-system-audit.md');
if (/Version:\*\*\s*1\.\d+|Version:\s*1\.\d+/.test(audit) && /Track A/.test(audit)) {
  ok('audit Track A (v1.x)');
} else fail('audit Track A');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
