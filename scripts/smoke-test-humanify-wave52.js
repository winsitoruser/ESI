#!/usr/bin/env node
/**
 * Wave-52 / Maturity Sprint-2 unit smoke.
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

console.log('Humanify wave-52 maturity-S2 unit');

// SEC-S2-1
const devices = read('pages/api/humanify/attendance/devices.ts');
if (/allowHrMockFallback\(\)/.test(devices) && /503/.test(devices) && /dataSource:\s*'empty'/.test(devices)) {
  ok('SEC-S2-1 devices mock gated');
} else fail('SEC-S2-1 devices mock gated');

const mockGuard = read('scripts/smoke-test-humanify-mock-guard.js');
if (/devices\.ts every _mock/.test(mockGuard)) ok('SEC-S2-1 mock-guard extended');
else fail('SEC-S2-1 mock-guard extended');

// HR-S2-1
const att = read('pages/humanify/attendance.tsx');
if (/attendance-bulk\?action=correct/.test(att) && /action=undo/.test(att) && /selectedIds/.test(att)) {
  ok('HR-S2-1 bulk correct+undo UI');
} else fail('HR-S2-1 bulk correct+undo UI');

// HR-S2-2
const leaveSvc = read('lib/hris/leave-request-service.ts');
const leaveApi = read('pages/api/humanify/leave-management.ts');
const leavePage = read('pages/humanify/leave.tsx');
if (/resolveLeaveApproverId/.test(leaveSvc) && /approver_id/.test(leaveSvc)
  && /scope=me|scope === 'me'/.test(leaveApi) && /Menunggu saya/.test(leavePage)) {
  ok('HR-S2-2 supervisor_id approval');
} else fail('HR-S2-2 supervisor_id approval');

// ESS-S2-1
if (exists('components/employee/payslip-print.ts')
  && /printPayslipHtml/.test(read('components/employee/PayslipTab.tsx'))
  && /Cetak \/ Unduh PDF/.test(read('components/employee/PayslipTab.tsx'))) {
  ok('ESS-S2-1 payslip print/PDF');
} else fail('ESS-S2-1 payslip print/PDF');

// ESS-S2-2
const emp = read('pages/employee/index.tsx');
const dash = read('pages/api/employee/dashboard.ts');
if (/leaveFile/.test(emp) && /attachments/.test(emp)
  && /attachmentUrl/.test(dash) && /attachment_url/.test(leaveSvc)) {
  ok('ESS-S2-2 leave attachment');
} else fail('ESS-S2-2 leave attachment');

// UX-S2-1 — ops pages ≈ 0 literal violet-/indigo- (excl marketing/auth)
const { execSync } = require('child_process');
try {
  const out = execSync(
    "rg -l 'violet-|indigo-' pages/humanify pages/platform --glob '*.tsx' | rg -v 'partners|welcome|join|forgot|reset|verify|login|signup|pricing' || true",
    { cwd: root, encoding: 'utf8' },
  ).trim();
  const files = out ? out.split('\n').filter(Boolean) : [];
  if (files.length === 0) ok('UX-S2-1 ops violet/indigo ≈ 0');
  else fail(`UX-S2-1 residual files: ${files.slice(0, 5).join(', ')}`);
} catch (e) {
  fail('UX-S2-1 rg check failed');
}

// UX-S2-2
if (exists('components/humanify/HumanifyMarketingShell.tsx')
  && /HumanifyMarketingShell/.test(read('pages/humanify/partners.tsx'))
  && /D-HF-TWO-SURFACE/.test(read('.hermes/DECISIONS.md'))) {
  ok('UX-S2-2 marketing shell + ADR');
} else fail('UX-S2-2 marketing shell + ADR');

// CP-S2-1
const plat = ['pages/platform/index.tsx', 'pages/platform/observability.tsx', 'pages/platform/email-preview.tsx', 'pages/platform/tenants/[id].tsx'];
if (plat.every((p) => /HumanifyLayout/.test(read(p)) && !/from '@\/components\/hq\/HQLayout'/.test(read(p)))) {
  ok('CP-S2-1 platform HumanifyLayout');
} else fail('CP-S2-1 platform HumanifyLayout');

const pkg = read('package.json');
if (/smoke:wave52/.test(pkg)) ok('package smoke:wave52');
else fail('package smoke:wave52');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
