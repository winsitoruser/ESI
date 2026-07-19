#!/usr/bin/env node
/**
 * Wave-27 unit: verify-email soft e2e, soft-deactivate SEED_ONLY, SEO soft, signup no-ref.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-27 unit');

const files = [
  '../e2e/humanify-verify-email-ui.spec.ts',
  '../e2e/humanify-seo-public-ui.spec.ts',
  '../e2e/humanify-signup-ui.spec.ts',
  '../scripts/run-humanify-doc-expiry-soft-deactivate.js',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const verify = fs.readFileSync(path.join(__dirname, '../e2e/humanify-verify-email-ui.spec.ts'), 'utf8');
if (/Verifikasi email/.test(verify) && /not-a-real-token/.test(verify) && /Kirim ulang/.test(verify)) {
  ok('verify-email soft e2e');
} else fail('verify-email soft e2e');

const soft = fs.readFileSync(path.join(__dirname, '../scripts/run-humanify-doc-expiry-soft-deactivate.js'), 'utf8');
if (/SEED_ONLY/.test(soft) && /seed: true/.test(soft)) ok('soft-deactivate SEED_ONLY');
else fail('soft-deactivate SEED_ONLY');

const deploy = fs.readFileSync(path.join(__dirname, '../scripts/deploy-humanify-vps.sh'), 'utf8');
if (/SEED_ONLY=true.*doc-expiry-soft|run-humanify-doc-expiry-soft-deactivate/.test(deploy.replace(/\n/g, ' '))) {
  ok('deploy soft-deactivate seed');
} else if (/run-humanify-doc-expiry-soft-deactivate/.test(deploy) && /SEED_ONLY=true/.test(deploy)) {
  ok('deploy soft-deactivate seed');
} else fail('deploy soft-deactivate seed');

const seo = fs.readFileSync(path.join(__dirname, '../e2e/humanify-seo-public-ui.spec.ts'), 'utf8');
if (/robots\.txt/.test(seo) && /sitemap\.xml/.test(seo) && /Disallow/.test(seo) && /api/.test(seo) && /urlset|welcome/.test(seo)) {
  ok('SEO soft e2e');
} else fail('SEO soft e2e');

const signup = fs.readFileSync(path.join(__dirname, '../e2e/humanify-signup-ui.spec.ts'), 'utf8');
if (/\/humanify\/signup'/.test(signup) && /Does NOT submit/.test(signup) && /Kode partner/.test(signup)) {
  ok('signup no-ref soft e2e');
} else fail('signup no-ref soft e2e');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave27/.test(pkg) && /verify-email/.test(pkg) && /seo-public/.test(pkg)) ok('package scripts');
else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
