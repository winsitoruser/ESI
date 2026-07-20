#!/usr/bin/env node
/**
 * Wave-56 — Security honesty (post multi-role audit / Wave-55)
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

console.log('Humanify wave-56 security-honesty unit');

const decisions = read('.hermes/DECISIONS.md');
const pkg = read('package.json');
const gate = exists('.github/workflows/humanify-saas-gate.yml')
  ? read('.github/workflows/humanify-saas-gate.yml')
  : '';

// BE-1 claim private storage
if (exists('lib/hris/claim-storage.ts')
  && /persistClaimUpload|buildSignedClaimUrl/.test(read('lib/hris/claim-storage.ts'))
  && /withHQAuth/.test(read('pages/api/humanify/upload-claim.ts'))
  && !/join\(process\.cwd\(\),\s*['"]public['"],\s*['"]uploads['"],\s*['"]claims['"]/.test(read('pages/api/humanify/upload-claim.ts'))
  && exists('pages/api/humanify/claim-file.ts')) {
  ok('BE-1 claim private + signed GET');
} else fail('BE-1 claim private storage');

// BE-2 / CTO-1 priority withHQAuth
const must = [
  'overtime.ts', 'leave.ts', 'payroll.ts', 'payroll-bulk.ts', 'payroll-inputs.ts',
  'disbursement.ts', 'export.ts', 'compliance-export.ts', 'travel-expense.ts',
];
const allWrapped = must.every((f) => /withHQAuth\s*\(/.test(read(`pages/api/humanify/${f}`)));
if (allWrapped && /lint:humanify-hq-auth|lint-humanify-hq-auth/.test(pkg)) {
  ok('BE-2/CTO-1 withHQAuth batch + lint script');
} else fail('BE-2/CTO-1 withHQAuth batch');

// BE-3 performance-360
const p360 = read('pages/api/humanify/performance-360.ts');
if (!/isMock:\s*true/.test(p360) && /dataSource:\s*'empty'/.test(p360)
  && /e\.tenant_id = f\.tenant_id/.test(p360)) {
  ok('BE-3 performance-360 empty + JOIN tenant');
} else fail('BE-3 performance-360');

// PM-2 Privy Simulasi
if (/Simulasi/.test(read('pages/humanify/esign.tsx'))
  && /E-Sign · Simulasi/.test(read('config/humanify-sidebar.config.ts'))) {
  ok('PM-2 e-sign Simulasi label');
} else fail('PM-2 e-sign Simulasi');

// CTO-3 / PM-1 lab honesty
const side = read('config/humanify-sidebar.config.ts');
if (/hidden:\s*true/.test(side) && /AI & Otomasi \(Lab\)/.test(side)
  && /!item\.hidden/.test(read('config/sidebar.config.ts'))) {
  ok('CTO-3 sidebar lab hide + hidden filter');
} else fail('CTO-3 sidebar lab');

// FE-2 ESS purple residual (quick actions / manager)
const ess = read('pages/employee/index.tsx');
if (!/from-violet-600 to-fuchsia-600/.test(ess)
  && !/from-indigo-500 to-violet-600/.test(ess)
  && /from-teal-700 to-emerald-700|from-teal-600 to-emerald-700/.test(ess)) {
  ok('FE-2 ESS quick-action teal (no violet CTA)');
} else fail('FE-2 ESS purple residual');

// QA-1 ESS journey skeleton
if (exists('e2e/humanify-ess-journey.spec.ts')
  && /HUMANIFY_E2E_HARD/.test(read('e2e/humanify-ess-journey.spec.ts'))) {
  ok('QA-1 ESS journey Playwright skeleton');
} else fail('QA-1 ESS e2e skeleton');

// ADR
if (/D-019/.test(decisions)) ok('D-019 Wave-56 ADR');
else fail('D-019 Wave-56 ADR');

if (/smoke:wave56/.test(pkg) && /smoke:wave56/.test(gate)) ok('CI + package smoke:wave56');
else fail('CI/package smoke:wave56');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
