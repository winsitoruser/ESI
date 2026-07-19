#!/usr/bin/env node
/**
 * Wave-29 unit: digest SEED_ONLY, security.txt, employee-login soft,
 * phase17/18 npm aliases.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-29 unit');

const files = [
  '../scripts/send-humanify-action-inbox-digest.js',
  '../lib/saas/digest-last.ts',
  '../public/.well-known/security.txt',
  '../e2e/humanify-employee-login-ui.spec.ts',
  '../e2e/humanify-seo-public-ui.spec.ts',
  '../scripts/smoke-test-saas-phase17-login-lockout.js',
  '../scripts/smoke-test-saas-phase18-observability.js',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const digest = fs.readFileSync(path.join(__dirname, '../scripts/send-humanify-action-inbox-digest.js'), 'utf8');
if (/SEED_ONLY/.test(digest) && /seed: true/.test(digest) && /without DB/.test(digest)) {
  ok('digest SEED_ONLY');
} else fail('digest SEED_ONLY');

const digestLib = fs.readFileSync(path.join(__dirname, '../lib/saas/digest-last.ts'), 'utf8');
if (/seed: boolean/.test(digestLib) && /raw\.seed/.test(digestLib)) {
  ok('digest-last seed field');
} else fail('digest-last seed field');

const deploy = fs.readFileSync(path.join(__dirname, '../scripts/deploy-humanify-vps.sh'), 'utf8');
if (/SEED_ONLY=true.*action-inbox-digest|send-humanify-action-inbox-digest/.test(deploy.replace(/\n/g, ' '))
  && /SEED_ONLY=true node scripts\/send-humanify-action-inbox-digest/.test(deploy)) {
  ok('deploy digest seed');
} else fail('deploy digest seed');

const api = fs.readFileSync(path.join(__dirname, '../pages/api/platform/observability.ts'), 'utf8');
if (/seed: digest\.seed/.test(api)) ok('observability API digest seed');
else fail('observability API digest seed');

const ui = fs.readFileSync(path.join(__dirname, '../pages/platform/observability.tsx'), 'utf8');
if (/actionDigest\.seed/.test(ui) && /Seed/.test(ui)) ok('observability UI digest Seed');
else fail('observability UI digest Seed');

const sec = fs.readFileSync(path.join(__dirname, '../public/.well-known/security.txt'), 'utf8');
if (/Contact:\s*mailto:ops@humanify\.id/.test(sec) && /Expires:/.test(sec) && /Canonical:/.test(sec)) {
  ok('security.txt fields');
} else fail('security.txt fields');

const seo = fs.readFileSync(path.join(__dirname, '../e2e/humanify-seo-public-ui.spec.ts'), 'utf8');
if (/security\.txt/.test(seo) && /ops@humanify/.test(seo)) ok('SEO soft security.txt');
else fail('SEO soft security.txt');

const emp = fs.readFileSync(path.join(__dirname, '../e2e/humanify-employee-login-ui.spec.ts'), 'utf8');
if (/\/employee\/login/.test(emp) && /Portal Karyawan/.test(emp) && /do not submit/i.test(emp)) {
  ok('employee-login soft e2e');
} else fail('employee-login soft e2e');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave29/.test(pkg) && /smoke:phase17-login-lockout/.test(pkg)
  && /smoke:phase18-observability/.test(pkg) && /employee-login/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
