#!/usr/bin/env node
/**
 * CI lint: priority Humanify mutate/payroll-adjacent APIs must use withHQAuth
 * (Wave-56 / CTO-1 · BE-2). Bare getServerSession without withHQAuth fails the gate.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const apiDir = path.join(root, 'pages/api/humanify');

/** Must be wrapped with withHQAuth (security-sensitive / payroll-adjacent). */
const MUST_HQ_AUTH = [
  'overtime.ts',
  'leave.ts',
  'payroll.ts',
  'payroll-bulk.ts',
  'payroll-inputs.ts',
  'disbursement.ts',
  'export.ts',
  'compliance-export.ts',
  'travel-expense.ts',
  'upload-claim.ts',
  'performance-360.ts',
];

let failed = 0;
let passed = 0;

console.log('Humanify withHQAuth priority lint');

for (const file of MUST_HQ_AUTH) {
  const full = path.join(apiDir, file);
  if (!fs.existsSync(full)) {
    console.log('  ✗ missing', file);
    failed++;
    continue;
  }
  const src = fs.readFileSync(full, 'utf8');
  const hasWrap = /withHQAuth\s*\(/.test(src);
  const bareSession = /getServerSession\s*\(/.test(src) && !hasWrap;
  if (hasWrap && !bareSession) {
    console.log('  ✓', file);
    passed++;
  } else {
    console.log('  ✗', file, hasWrap ? '(still calls bare getServerSession as primary?)' : '(missing withHQAuth)');
    failed++;
  }
}

// Claim storage must not write into public/
const claimUpload = fs.readFileSync(path.join(apiDir, 'upload-claim.ts'), 'utf8');
if (/public['"`].*uploads.*claims|uploads['"`].*claims.*public|join\(process\.cwd\(\),\s*['"]public['"]/.test(claimUpload)
  && !/claim-storage|getClaimStorageRoot|persistClaimUpload/.test(claimUpload)) {
  console.log('  ✗ upload-claim still targets public/');
  failed++;
} else if (/persistClaimUpload|claim-storage/.test(claimUpload)) {
  console.log('  ✓ upload-claim private storage');
  passed++;
} else {
  console.log('  ✗ upload-claim missing private storage helper');
  failed++;
}

const claimFile = path.join(apiDir, 'claim-file.ts');
if (fs.existsSync(claimFile) && /verifyClaimSignature/.test(fs.readFileSync(claimFile, 'utf8'))) {
  console.log('  ✓ claim-file signed GET');
  passed++;
} else {
  console.log('  ✗ claim-file missing');
  failed++;
}

const p360 = fs.readFileSync(path.join(apiDir, 'performance-360.ts'), 'utf8');
if (/isMock:\s*true/.test(p360)) {
  console.log('  ✗ performance-360 still sets isMock:true');
  failed++;
} else {
  console.log('  ✓ performance-360 no isMock:true');
  passed++;
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
