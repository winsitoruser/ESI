#!/usr/bin/env node
/**
 * Wave-30 unit: partners sitemap, robots security Allow, welcome/employee soft CTAs,
 * phase19-mfa npm alias.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-30 unit');

const files = [
  '../lib/humanify/seo.ts',
  '../public/robots.txt',
  '../e2e/humanify-welcome-login.spec.ts',
  '../e2e/humanify-employee-login-ui.spec.ts',
  '../e2e/humanify-seo-public-ui.spec.ts',
  '../scripts/smoke-test-saas-phase19-mfa.js',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const seo = fs.readFileSync(path.join(__dirname, '../lib/humanify/seo.ts'), 'utf8');
if (/\/humanify\/partners/.test(seo) && /Partner Channel/.test(seo)) ok('sitemap partners route');
else fail('sitemap partners route');

const robots = fs.readFileSync(path.join(__dirname, '../public/robots.txt'), 'utf8');
if (/Allow:\s*\/\.well-known\/security\.txt/.test(robots) && /Allow:\s*\/humanify\/partners/.test(robots)) {
  ok('robots Allow partners + security.txt');
} else fail('robots Allow partners + security.txt');

const seoE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-seo-public-ui.spec.ts'), 'utf8');
if (/well-known\/security\.txt/.test(seoE2e) && /partners/.test(seoE2e)) ok('SEO soft partners+security');
else fail('SEO soft partners+security');

const emp = fs.readFileSync(path.join(__dirname, '../e2e/humanify-employee-login-ui.spec.ts'), 'utf8');
if (/Login HR/.test(emp) && /\/humanify\/login/.test(emp)) ok('employee HR Admin soft cue');
else fail('employee HR Admin soft cue');

const welcome = fs.readFileSync(path.join(__dirname, '../e2e/humanify-welcome-login.spec.ts'), 'utf8');
if (/roi-calculator/.test(welcome) && /\/employee\/login/.test(welcome) && /signup/.test(welcome)) {
  ok('welcome ROI/portal soft CTAs');
} else fail('welcome ROI/portal soft CTAs');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave30/.test(pkg) && /smoke:phase19-mfa/.test(pkg)) ok('package scripts');
else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
