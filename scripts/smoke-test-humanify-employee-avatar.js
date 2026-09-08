#!/usr/bin/env node
/**
 * Static smoke — EmployeeAvatar + photo_url on approval JOINs (Wave-76).
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify employee avatar smoke (Wave-76)');

const avatar = read('components/humanify/EmployeeAvatar.tsx');
if (/AvatarImage/.test(avatar) && /photo_url/.test(avatar) && /rounded-full|Avatar/.test(avatar)) {
  ok('EmployeeAvatar photo + initials');
} else fail('EmployeeAvatar');

const checks = [
  ['pages/api/humanify/workflow.ts', /e\.photo_url/],
  ['pages/api/humanify/leave-management.ts', /e\.photo_url/],
  ['pages/api/humanify/overtime.ts', /e\.photo_url/],
  ['pages/api/employee/manager.ts', /e\.photo_url/],
  ['pages/api/humanify/disciplinary-letters.ts', /e\.photo_url/],
  ['pages/humanify/mss.tsx', /EmployeeAvatar/],
  ['pages/humanify/leave.tsx', /EmployeeAvatar/],
  ['pages/humanify/reimbursement.tsx', /EmployeeAvatar/],
  ['pages/humanify/employees.tsx', /EmployeeAvatar/],
  ['pages/humanify/mutations.tsx', /EmployeeAvatar/],
  ['pages/humanify/index.tsx', /EmployeeAvatar/],
  ['pages/api/humanify/dashboard.ts', /photo_url:/],
  ['components/employee/ManagerHubTab.tsx', /EmployeeAvatar/],
  ['components/humanify/EmployeePicker.tsx', /EmployeeAvatar/],
];

for (const [file, re] of checks) {
  const src = read(file);
  if (re.test(src)) ok(file);
  else fail(file);
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
