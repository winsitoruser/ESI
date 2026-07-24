#!/usr/bin/env node
/**
 * CI lint: Humanify APIs must use withHQAuth (Wave-56…60).
 * Bare getServerSession without withHQAuth fails unless allowlisted.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const apiDir = path.join(root, 'pages/api/humanify');

/** Hybrid / public auth — intentionally bare (Wave-60). */
const ALLOW_BARE = new Set([
  'claim-file.ts', // HMAC signed OR session
  'email-verify.ts', // public token verify
]);

/** Priority mutate / payroll-adjacent (Wave-56/59) — must always pass. */
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
  'assets.ts',
  'go-live.ts',
  'leave-management.ts',
  'attendance/devices.ts',
];

let failed = 0;
let passed = 0;

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (ent.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

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

console.log('Humanify withHQAuth full-tree scan');
const all = walk(apiDir);
let bareCount = 0;
for (const full of all) {
  const rel = path.relative(apiDir, full).replace(/\\/g, '/');
  const base = path.basename(full);
  const src = fs.readFileSync(full, 'utf8');
  const hasWrap = /withHQAuth\s*\(/.test(src);
  const hasSession = /getServerSession\s*\(/.test(src);
  if (hasSession && !hasWrap) {
    if (ALLOW_BARE.has(base) || ALLOW_BARE.has(rel)) {
      console.log('  ✓ allow bare', rel);
      passed++;
    } else {
      console.log('  ✗ bare session', rel);
      failed++;
      bareCount++;
    }
  }
}
if (bareCount === 0) {
  console.log('  ✓ no unexpected bare getServerSession');
  passed++;
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
