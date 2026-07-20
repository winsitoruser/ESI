#!/usr/bin/env node
/**
 * Wave-64 — Payroll depth: approve→paid audit + hard e2e THR/BPJS/lembur
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

console.log('Humanify wave-64 payroll depth unit');

const golden = read('scripts/smoke-test-payroll-golden.js');
if (/action=approve/.test(golden)
  && /run-status/.test(golden)
  && /status:\s*'paid'/.test(golden)
  && /payroll-audit/.test(golden)
  && /audit event: approved/.test(golden)
  && /audit event: paid/.test(golden)) {
  ok('QA-1 golden approve→paid + audit');
} else fail('QA-1 golden approve/paid/audit');

const hard = read('e2e/humanify-payroll-hard.spec.ts');
if (/\/humanify\/payroll\/thr/.test(hard)
  && /\/humanify\/payroll\/bpjs/.test(hard)
  && /\/humanify\/payroll\/lembur/.test(hard)) {
  ok('QA-2 hard e2e THR/BPJS/lembur');
} else fail('QA-2 hard e2e pages');

if (/D-027/.test(read('.hermes/DECISIONS.md'))) ok('D-027 Wave-64 ADR');
else fail('D-027 ADR');

const pkg = read('package.json');
const gate = read('.github/workflows/humanify-saas-gate.yml');
if (/smoke:wave64/.test(pkg) && /smoke:wave64/.test(gate)) ok('CI + package smoke:wave64');
else fail('CI/package wave64');

if (/Wave-64/.test(read('.hermes/HANDOFF.md'))) ok('HANDOFF Wave-64');
else fail('HANDOFF Wave-64');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
