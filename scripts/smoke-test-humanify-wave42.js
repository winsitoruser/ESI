#!/usr/bin/env node
/**
 * Wave-42 unit: partners ROI, employee lupa password, sitemap employee,
 * employee-hardening / lms / idor aliases.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-42 unit');

const files = [
  '../pages/humanify/partners.tsx',
  '../components/humanify/EmployeePortalLoginForm.tsx',
  '../e2e/humanify-partners-ui.spec.ts',
  '../e2e/humanify-employee-login-ui.spec.ts',
  '../e2e/humanify-seo-public-ui.spec.ts',
  '../scripts/smoke-test-saas-employee-hardening.js',
  '../scripts/smoke-test-saas-lms-lab-gate.js',
  '../scripts/smoke-test-saas-idor-hr-modules.js',
  '../scripts/smoke-test-saas-idor-batch5.js',
  '../scripts/smoke-test-saas-idor-batch11.js',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const partners = fs.readFileSync(path.join(__dirname, '../pages/humanify/partners.tsx'), 'utf8');
if (/roiCalculatorPath/.test(partners) && />\s*ROI\s*</.test(partners)) ok('partners ROI cue');
else fail('partners ROI cue');

const partnersE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-partners-ui.spec.ts'), 'utf8');
if (/roi-calculator/.test(partnersE2e) && /ROI|kalkulator/i.test(partnersE2e)) ok('partners ROI soft');
else fail('partners ROI soft');

const emp = fs.readFileSync(path.join(__dirname, '../components/humanify/EmployeePortalLoginForm.tsx'), 'utf8');
if (/forgot-password/.test(emp) && /Lupa password/.test(emp)) ok('employee lupa cue');
else fail('employee lupa cue');

const empE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-employee-login-ui.spec.ts'), 'utf8');
if (/forgot-password/.test(empE2e) && /Lupa password/i.test(empE2e)) ok('employee lupa soft');
else fail('employee lupa soft');

const seo = fs.readFileSync(path.join(__dirname, '../e2e/humanify-seo-public-ui.spec.ts'), 'utf8');
if (/employee\\\/login/.test(seo)) ok('sitemap employee soft');
else fail('sitemap employee soft');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave42/.test(pkg) && /smoke:employee-hardening/.test(pkg)
  && /smoke:lms-lab-gate/.test(pkg) && /smoke:idor-hr-modules/.test(pkg)
  && /smoke:idor-batch5/.test(pkg) && /smoke:idor-batch11/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
