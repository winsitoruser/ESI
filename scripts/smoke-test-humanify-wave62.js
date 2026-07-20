#!/usr/bin/env node
/**
 * Wave-62 — Staging ops hardening: e2e host rule, verify chain, clone grant regression
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

console.log('Humanify wave-62 staging ops hardening unit');

const db = read('scripts/ensure-humanify-staging-db.sh');
if (/pg_dump --no-acl strips grants|always re-grant/.test(db)
  && /GRANT ALL PRIVILEGES ON ALL TABLES/.test(db)
  && /grants restored/.test(db)) {
  ok('DO-1 staging DB re-grant after clone');
} else fail('DO-1 staging DB re-grant');

const hard = read('e2e/humanify-payroll-hard.spec.ts');
if (/HUMANIFY_E2E_ALLOW_LOOPBACK/.test(hard)
  && /looksLoopback/.test(hard)
  && /NEXTAUTH_URL|cookie mismatch/.test(hard)) {
  ok('QA-1 hard payroll refuses loopback by default');
} else fail('QA-1 hard payroll loopback guard');

if (exists('scripts/run-humanify-staging-verify.sh')
  && /Refuse loopback/.test(read('scripts/run-humanify-staging-verify.sh'))
  && /run-humanify-security-scorecard/.test(read('scripts/run-humanify-staging-verify.sh'))
  && /humanify-payroll-hard/.test(read('scripts/run-humanify-staging-verify.sh'))) {
  ok('DO-2 staging verify chain script');
} else fail('DO-2 staging verify script');

const docs = read('docs/humanify-staging-deploy.md');
if (/Wave-62|127\.0\.0\.1|NEXTAUTH|cookie mismatch|staging-verify/.test(docs)
  && /PLAYWRIGHT_BASE_URL=https:\/\/staging\.humanify\.id/.test(docs)) {
  ok('DO-3 staging deploy docs e2e host rule');
} else fail('DO-3 staging docs');

if (/D-025/.test(read('.hermes/DECISIONS.md'))) ok('D-025 Wave-62 ADR');
else fail('D-025 ADR');

const pkg = read('package.json');
const gate = read('.github/workflows/humanify-saas-gate.yml');
if (/smoke:wave62/.test(pkg) && /smoke:wave62/.test(gate)
  && /verify:humanify:staging/.test(pkg)) {
  ok('CI + package smoke:wave62 / verify:staging');
} else fail('CI/package wave62');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
