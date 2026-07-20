#!/usr/bin/env node
/**
 * Wave-58 — Staging track (infra + scorecard target)
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

console.log('Humanify wave-58 staging-track unit');

const decisions = read('.hermes/DECISIONS.md');
const pkg = read('package.json');
const gate = exists('.github/workflows/humanify-saas-gate.yml')
  ? read('.github/workflows/humanify-saas-gate.yml')
  : '';
const deploy = read('scripts/deploy-humanify-vps.sh');

if (exists('scripts/deploy-humanify-staging-vps.sh')
  && /humanify-staging/.test(read('scripts/deploy-humanify-staging-vps.sh'))
  && /staging\.humanify\.id/.test(read('scripts/deploy-humanify-staging-vps.sh'))) {
  ok('DO-1 staging deploy wrapper');
} else fail('DO-1 staging deploy wrapper');

if (/VPS_SSH_KEY/.test(deploy) && /rsync_cmd/.test(deploy)
  && /HUMANIFY_PORT/.test(deploy) && /NGINX_SITE/.test(deploy)) {
  ok('DO-2 deploy SSH key + slot vars');
} else fail('DO-2 deploy SSH key + slot vars');

if (exists('scripts/humanify-ecosystem.staging.config.cjs')
  && /3021/.test(read('scripts/humanify-ecosystem.staging.config.cjs'))
  && /HUMANIFY_PORT/.test(read('scripts/humanify-ecosystem.config.cjs'))) {
  ok('DO-3 PM2 staging ecosystem port 3021');
} else fail('DO-3 PM2 staging ecosystem');

if (exists('scripts/ensure-humanify-staging-db.sh')
  && exists('scripts/ensure-humanify-staging-env.sh')
  && /HUMANIFY_RLS_MODE=strict/.test(read('scripts/ensure-humanify-staging-env.sh'))) {
  ok('SEC-1 staging DB + strict RLS env');
} else fail('SEC-1 staging strict RLS');

if (/HUMANIFY_STAGING_URL/.test(read('scripts/ensure-humanify-crons.sh'))
  && /SCORECARD_BASE/.test(read('scripts/ensure-humanify-crons.sh'))) {
  ok('SEC-2 scorecard cron staging URL hook');
} else fail('SEC-2 scorecard staging');

if (exists('docs/humanify-staging-deploy.md')
  && /staging\.humanify\.id/.test(read('docs/humanify-staging-deploy.md'))) {
  ok('DO-4 staging deploy runbook');
} else fail('DO-4 staging runbook');

if (/D-021/.test(decisions)) ok('D-021 Wave-58 ADR');
else fail('D-021 ADR');

if (/smoke:wave58/.test(pkg) && /smoke:wave58/.test(gate)) ok('CI + package smoke:wave58');
else fail('CI/package smoke:wave58');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
