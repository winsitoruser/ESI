#!/usr/bin/env node
/**
 * Wave-32 unit: partners soft links, auth csrf soft, humans.txt, phase13/20 aliases.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-32 unit');

const files = [
  '../public/humans.txt',
  '../e2e/humanify-partners-ui.spec.ts',
  '../e2e/humanify-health-ui.spec.ts',
  '../e2e/humanify-seo-public-ui.spec.ts',
  '../scripts/smoke-test-saas-phase13-sso.js',
  '../scripts/smoke-test-saas-phase20-employee-import.js',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const partners = fs.readFileSync(path.join(__dirname, '../e2e/humanify-partners-ui.spec.ts'), 'utf8');
if (/Jenis mitra/.test(partners) && /\/humanify\/login/.test(partners) && /do not submit/i.test(partners)) {
  ok('partners soft Masuk + jenis mitra');
} else fail('partners soft Masuk + jenis mitra');

const health = fs.readFileSync(path.join(__dirname, '../e2e/humanify-health-ui.spec.ts'), 'utf8');
if (/\/api\/auth\/csrf/.test(health) && /csrfToken/.test(health) && /providers/.test(health)) {
  ok('auth csrf/providers soft');
} else fail('auth csrf/providers soft');

const humans = fs.readFileSync(path.join(__dirname, '../public/humans.txt'), 'utf8');
if (/TEAM/.test(humans) && /ops@humanify\.id/.test(humans) && /Naincode/.test(humans)) {
  ok('humans.txt content');
} else fail('humans.txt content');

const mw = fs.readFileSync(path.join(__dirname, '../middleware.ts'), 'utf8');
if (/humans\.txt/.test(mw)) ok('middleware humans.txt public');
else fail('middleware humans.txt public');

const robots = fs.readFileSync(path.join(__dirname, '../public/robots.txt'), 'utf8');
if (/Allow:\s*\/humans\.txt/.test(robots)) ok('robots Allow humans.txt');
else fail('robots Allow humans.txt');

const seo = fs.readFileSync(path.join(__dirname, '../e2e/humanify-seo-public-ui.spec.ts'), 'utf8');
if (/humans\.txt/.test(seo) && /TEAM|Naincode/.test(seo)) ok('SEO soft humans.txt');
else fail('SEO soft humans.txt');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave32/.test(pkg) && /smoke:phase13-sso/.test(pkg) && /smoke:phase20-employee-import/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
