#!/usr/bin/env node
/**
 * Wave-37 unit: ROI Partner nav, employee welcome-back soft, PWA icon soft,
 * phase1/7/10 aliases.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-37 unit');

const files = [
  '../components/humanify/HumanifyRoiCalculatorPage.tsx',
  '../e2e/humanify-roi-calculator-ui.spec.ts',
  '../e2e/humanify-employee-login-ui.spec.ts',
  '../e2e/humanify-health-ui.spec.ts',
  '../e2e/humanify-seo-public-ui.spec.ts',
  '../scripts/smoke-test-saas-phase1-signup.js',
  '../scripts/smoke-test-saas-phase7-golive.js',
  '../scripts/smoke-test-saas-phase10-plan-change.js',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const roiPage = fs.readFileSync(path.join(__dirname, '../components/humanify/HumanifyRoiCalculatorPage.tsx'), 'utf8');
if (/partnersPath/.test(roiPage) && />\s*Partner\s*</.test(roiPage)) ok('ROI Partner nav');
else fail('ROI Partner nav');

const roiE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-roi-calculator-ui.spec.ts'), 'utf8');
if (/\/humanify\/partners/.test(roiE2e)) ok('ROI partners soft');
else fail('ROI partners soft');

const emp = fs.readFileSync(path.join(__dirname, '../e2e/humanify-employee-login-ui.spec.ts'), 'utf8');
if (/Kembali ke beranda|beranda Humanify/.test(emp) && /\/humanify\/welcome/.test(emp)) {
  ok('employee welcome-back soft');
} else fail('employee welcome-back soft');

const health = fs.readFileSync(path.join(__dirname, '../e2e/humanify-health-ui.spec.ts'), 'utf8');
if (/\/icons\/credit-card\.png/.test(health)) ok('PWA icon soft');
else fail('PWA icon soft');

const seo = fs.readFileSync(path.join(__dirname, '../e2e/humanify-seo-public-ui.spec.ts'), 'utf8');
if (/well-known\/security\.txt/.test(seo)) ok('SEO soft security in llms');
else fail('SEO soft security in llms');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave37/.test(pkg) && /smoke:phase1-signup/.test(pkg)
  && /smoke:phase7-golive/.test(pkg) && /smoke:phase10-plan-change/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
