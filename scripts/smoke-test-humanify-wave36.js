#!/usr/bin/env node
/**
 * Wave-36 unit: employee SW public, welcome Partner link, llms humans, phase8/9.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-36 unit');

const files = [
  '../middleware.ts',
  '../public/sw-employee.js',
  '../lib/humanify/branding.ts',
  '../components/humanify/HumanifyWelcomePage.tsx',
  '../e2e/humanify-health-ui.spec.ts',
  '../e2e/humanify-welcome-login.spec.ts',
  '../public/llms.txt',
  '../scripts/smoke-test-saas-phase8-partners.js',
  '../scripts/smoke-test-saas-phase9-alerts.js',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const mw = fs.readFileSync(path.join(__dirname, '../middleware.ts'), 'utf8');
if (/sw-employee\.js/.test(mw) && /service-worker\.js/.test(mw)) ok('middleware SW public');
else fail('middleware SW public');

const health = fs.readFileSync(path.join(__dirname, '../e2e/humanify-health-ui.spec.ts'), 'utf8');
if (/sw-employee\.js/.test(health) && /service worker/i.test(health)) ok('SW soft e2e');
else fail('SW soft e2e');

const brand = fs.readFileSync(path.join(__dirname, '../lib/humanify/branding.ts'), 'utf8');
if (/partnersPath:\s*'\/humanify\/partners'/.test(brand)) ok('partnersPath branding');
else fail('partnersPath branding');

const welcome = fs.readFileSync(path.join(__dirname, '../components/humanify/HumanifyWelcomePage.tsx'), 'utf8');
if (/partnersPath/.test(welcome) && />\s*Partner\s*</.test(welcome)) ok('welcome Partner nav');
else fail('welcome Partner nav');

const welcomeE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-welcome-login.spec.ts'), 'utf8');
if (/\/humanify\/partners/.test(welcomeE2e)) ok('welcome partners soft');
else fail('welcome partners soft');

const llms = fs.readFileSync(path.join(__dirname, '../public/llms.txt'), 'utf8');
if (/humans\.txt/.test(llms)) ok('llms humans cross-link');
else fail('llms humans cross-link');

const seo = fs.readFileSync(path.join(__dirname, '../e2e/humanify-seo-public-ui.spec.ts'), 'utf8');
if (/humans\.txt/.test(seo)) ok('SEO soft humans in llms');
else fail('SEO soft humans in llms');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave36/.test(pkg) && /smoke:phase8-partners/.test(pkg) && /smoke:phase9-alerts/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
