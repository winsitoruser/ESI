#!/usr/bin/env node
/**
 * Wave-82 static: Gate A–E runner + deny-matrix + QC template + CI harden.
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

console.log('Humanify wave-82 Gate A–E / QA');

if (exists('scripts/run-humanify-gate-ae.sh') && /Gate A–E/.test(read('scripts/run-humanify-gate-ae.sh'))) {
  ok('Gate A–E runner script');
} else fail('Gate A–E runner');

if (exists('docs/releases/QC-SIGNOFF-TEMPLATE.md')) ok('QC sign-off template');
else fail('QC sign-off template');

if (exists('docs/humanify-owasp-trivy-waiver.md')) ok('OWASP/Trivy waiver documented');
else fail('OWASP waiver');

const pkg = read('package.json');
if (/smoke:deny-matrix/.test(pkg) && /gate:ae/.test(pkg)) ok('package.json deny-matrix + gate:ae');
else fail('package.json scripts');

const ci = read('.github/workflows/ci.yml');
if (/lint:humanify-hq-auth/.test(ci) && !/lint \|\| true/.test(ci)) ok('CI lint fail-closed for HQ auth');
else fail('CI lint harden');
if (/smoke:deny-matrix/.test(ci) && /smoke:wave81/.test(ci)) ok('CI runs wave81 + deny-matrix');
else fail('CI smoke gates');

const deny = read('scripts/smoke-test-humanify-deny-matrix.js');
if (/Finance SoD|assertPendingOnTeam|payroll/.test(deny)) ok('deny-matrix smoke present');
else fail('deny-matrix smoke');

const multi = read('scripts/smoke-test-humanify-multi-role.js');
if (/finance_staff/.test(multi)) ok('multi-role covers Finance');
else fail('multi-role Finance');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
