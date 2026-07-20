#!/usr/bin/env node
/**
 * Wave-57 — Product + UX + QA (post Wave-56 security honesty)
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

console.log('Humanify wave-57 product-ux-qa unit');

const decisions = read('.hermes/DECISIONS.md');
const pkg = read('package.json');
const gate = exists('.github/workflows/humanify-saas-gate.yml')
  ? read('.github/workflows/humanify-saas-gate.yml')
  : '';

// FE-1 ESS split
if (exists('components/employee/EmployeePortal.tsx')
  && /initialTab/.test(read('components/employee/EmployeePortal.tsx'))
  && /EmployeePortal initialTab="leave"/.test(read('pages/employee/leave.tsx'))
  && /EmployeePortal initialTab="payslip"/.test(read('pages/employee/payslip.tsx'))
  && /EmployeePortal initialTab="attendance"/.test(read('pages/employee/attendance.tsx'))
  && read('pages/employee/index.tsx').length < 500) {
  ok('FE-1 EmployeePortal split + real route shells');
} else fail('FE-1 ESS split');

// UX-1 / D-020 two-surface brand
const tokens = read('styles/humanify-tokens.css');
const portalUi = read('components/employee/portal-ui.tsx');
if (/D-020/.test(decisions) && /--ep-accent/.test(tokens)
  && /from-teal-600 to-emerald-700/.test(portalUi)
  && /--hf-brand:\s*#5b21b6/.test(tokens)) {
  ok('UX-1/D-020 two-surface brand tokens');
} else fail('UX-1/D-020 brand');

// UX-2 / FE-2 ESS teal (no violet CTA in portal)
const ep = read('components/employee/EmployeePortal.tsx');
if (!/bg-violet-600|from-violet-600|text-violet-700/.test(ep)
  && /bg-teal-600|text-teal-700/.test(ep)) {
  ok('UX-2 ESS nav teal (no violet CTA)');
} else fail('UX-2 ESS violet residual');

// UX-3 sidebar dedupe
const side = read('config/humanify-sidebar.config.ts');
if (/humanify-welcome.*hidden:\s*true/.test(side.replace(/\n/g, ' '))
  && !/humanify-about-naincode/.test(side)) {
  ok('UX-3 sidebar welcome dedupe');
} else fail('UX-3 sidebar dedupe');

// QA-1 ESS e2e
if (exists('e2e/humanify-ess-journey.spec.ts')
  && /employee\/leave|employee\/payslip/.test(read('e2e/humanify-ess-journey.spec.ts'))) {
  ok('QA-1 ESS journey e2e');
} else fail('QA-1 ESS e2e');

// Training pages teal
const tr = read('pages/employee/training/index.tsx');
if (/bg-teal-600/.test(tr) && !/bg-indigo-600/.test(tr)) ok('FE-2 training pages teal');
else fail('FE-2 training pages');

if (/smoke:wave57/.test(pkg) && /smoke:wave57/.test(gate)) ok('CI + package smoke:wave57');
else fail('CI/package smoke:wave57');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
