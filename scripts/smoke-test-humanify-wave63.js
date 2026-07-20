#!/usr/bin/env node
/**
 * Wave-63 — Payroll/attendance depth: tenant-scope + golden attendance bridge
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

console.log('Humanify wave-63 payroll/attendance depth unit');

const payroll = read('pages/api/humanify/payroll.ts');
if (/getAttendanceSummary[\s\S]{0,400}NO_TENANT/.test(payroll)
  && /e\.tenant_id = :tenantId/.test(payroll)
  && /generatePayrollFromAttendance[\s\S]{0,500}NO_TENANT/.test(payroll)
  && /WHERE id = :runId AND tenant_id = :tenantId/.test(payroll)) {
  ok('BE-1 attendance-summary + generate-from-attendance tenant-scoped');
} else fail('BE-1 tenant scope');

const bulk = read('pages/api/humanify/attendance-bulk.ts');
if (/overtimeMinutes/.test(bulk) && /overtime_minutes/.test(bulk) && /late_minutes/.test(bulk)) {
  ok('BE-2 attendance-bulk import OT/late minutes');
} else fail('BE-2 bulk OT/late');

const golden = read('scripts/smoke-test-payroll-golden.js');
if (/generate-from-attendance/.test(golden)
  && /attendance-summary/.test(golden)
  && /OVERTIME/.test(golden)
  && /Wave-63/.test(golden)) {
  ok('QA-1 payroll-golden attendance bridge');
} else fail('QA-1 golden bridge');

if (/D-026/.test(read('.hermes/DECISIONS.md'))) ok('D-026 Wave-63 ADR');
else fail('D-026 ADR');

const pkg = read('package.json');
const gate = read('.github/workflows/humanify-saas-gate.yml');
if (/smoke:wave63/.test(pkg) && /smoke:wave63/.test(gate)) ok('CI + package smoke:wave63');
else fail('CI/package wave63');

if (/Wave-63/.test(read('.hermes/HANDOFF.md'))) ok('HANDOFF Wave-63');
else fail('HANDOFF Wave-63');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
