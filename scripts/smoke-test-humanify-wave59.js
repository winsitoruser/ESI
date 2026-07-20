#!/usr/bin/env node
/**
 * Wave-59 — Auth batch-2 + ESS tab split + Redis/scorecard ops
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

console.log('Humanify wave-59 auth + ESS + ops unit');

const lint = read('scripts/lint-humanify-hq-auth.js');
const batch2 = [
  'attendance-management.ts',
  'kpi.ts',
  'lifecycle.ts',
  'recruitment.ts',
  'performance.ts',
  'organization.ts',
  'disciplinary-letters.ts',
  'industrial-relations.ts',
  'training.ts',
  'workflow.ts',
  'reminders.ts',
  'esign.ts',
];

for (const file of batch2) {
  if (lint.includes(`'${file}'`)) ok(`BE-2 lint includes ${file}`);
  else fail(`BE-2 lint includes ${file}`);
  const rel = `pages/api/humanify/${file}`;
  if (exists(rel) && /withHQAuth\s*\(/.test(read(rel))) {
    ok(`BE-2 withHQAuth ${file}`);
  } else fail(`BE-2 withHQAuth ${file}`);
}

if (exists('components/employee/tabs/LeaveTab.tsx')
  && exists('components/employee/tabs/AttendanceTab.tsx')
  && /tabs\/LeaveTab/.test(read('components/employee/EmployeePortal.tsx'))
  && /tabs\/AttendanceTab/.test(read('components/employee/EmployeePortal.tsx'))) {
  ok('FE-3 ESS LeaveTab + AttendanceTab split');
} else fail('FE-3 ESS tab split');

if (exists('scripts/check-humanify-redis-alert.js')
  && /redis-alert/.test(read('scripts/ensure-humanify-crons.sh'))) {
  ok('DO-2 Redis down alert cron');
} else fail('DO-2 Redis alert');

if (exists('scripts/run-humanify-security-scorecard-cron.js')
  && /run-humanify-security-scorecard-cron/.test(read('scripts/ensure-humanify-crons.sh'))) {
  ok('DO-5 scorecard cron wrapper');
} else fail('DO-5 scorecard wrapper');

if (exists('e2e/humanify-rbac-personas.spec.ts')) ok('QA-2 RBAC persona e2e skeleton');
else fail('QA-2 RBAC e2e');

if (/D-022/.test(read('.hermes/DECISIONS.md'))) ok('D-022 Wave-59 ADR');
else fail('D-022 ADR');

const pkg = read('package.json');
const gate = exists('.github/workflows/humanify-saas-gate.yml')
  ? read('.github/workflows/humanify-saas-gate.yml')
  : '';
if (/smoke:wave59/.test(pkg) && /smoke:wave59/.test(gate)) ok('CI + package smoke:wave59');
else fail('CI/package smoke:wave59');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
