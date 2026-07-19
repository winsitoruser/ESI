#!/usr/bin/env node
/**
 * Wave-31 unit: login portal cue, careers links, llms.txt, phase14/15 aliases.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-31 unit');

const files = [
  '../public/llms.txt',
  '../e2e/humanify-welcome-login.spec.ts',
  '../e2e/humanify-careers-ui.spec.ts',
  '../e2e/humanify-seo-public-ui.spec.ts',
  '../scripts/smoke-test-saas-phase14-ratelimit.js',
  '../scripts/smoke-test-saas-phase15-password-reset.js',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const login = fs.readFileSync(path.join(__dirname, '../e2e/humanify-welcome-login.spec.ts'), 'utf8');
if (/Portal Karyawan/.test(login) && /\/employee\/login/.test(login)) ok('login Portal Karyawan soft');
else fail('login Portal Karyawan soft');

const careers = fs.readFileSync(path.join(__dirname, '../e2e/humanify-careers-ui.spec.ts'), 'utf8');
if (/Masuk HR/.test(careers) && /\/humanify\/welcome/.test(careers)) ok('careers Masuk HR soft');
else fail('careers Masuk HR soft');

const llms = fs.readFileSync(path.join(__dirname, '../public/llms.txt'), 'utf8');
if (/Humanify/.test(llms) && /humanify\/welcome/.test(llms) && /sitemap\.xml/.test(llms)) {
  ok('llms.txt content');
} else fail('llms.txt content');

const mw = fs.readFileSync(path.join(__dirname, '../middleware.ts'), 'utf8');
if (/llms\.txt/.test(mw)) ok('middleware llms.txt public');
else fail('middleware llms.txt public');

const robots = fs.readFileSync(path.join(__dirname, '../public/robots.txt'), 'utf8');
if (/Allow:\s*\/llms\.txt/.test(robots)) ok('robots Allow llms.txt');
else fail('robots Allow llms.txt');

const seo = fs.readFileSync(path.join(__dirname, '../e2e/humanify-seo-public-ui.spec.ts'), 'utf8');
if (/llms\.txt/.test(seo) && /Humanify/.test(seo)) ok('SEO soft llms.txt');
else fail('SEO soft llms.txt');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave31/.test(pkg) && /smoke:phase14-ratelimit/.test(pkg) && /smoke:phase15-password-reset/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
