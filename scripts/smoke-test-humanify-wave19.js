#!/usr/bin/env node
/**
 * Wave-19 unit: scorecard batches, partner filter/export, backup chip, soft cron, digest policy.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-19 unit');

const files = [
  '../lib/saas/backup-freshness.ts',
  '../scripts/run-humanify-security-scorecard.js',
  '../scripts/ensure-humanify-crons.sh',
  '../scripts/send-humanify-action-inbox-digest.js',
  '../pages/api/platform/observability.ts',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const score = fs.readFileSync(path.join(__dirname, '../scripts/run-humanify-security-scorecard.js'), 'utf8');
if (/idor-batch11/.test(score) && /phase17-login-lockout/.test(score)) ok('scorecard batches expanded');
else fail('scorecard batches expanded');

const platform = fs.readFileSync(path.join(__dirname, '../pages/api/platform/index.ts'), 'utf8');
if (/partnerCode/.test(platform) && /partner-commission-export/.test(platform) && /statusFilter/.test(platform)) {
  ok('billing partner filter + commission CSV');
} else fail('billing partner filter + commission CSV');

const backupLib = fs.readFileSync(path.join(__dirname, '../lib/saas/backup-freshness.ts'), 'utf8');
if (/getBackupFreshness/.test(backupLib) && /ageHours/.test(backupLib)) ok('backup freshness helper');
else fail('backup freshness helper');

const obsApi = fs.readFileSync(path.join(__dirname, '../pages/api/platform/observability.ts'), 'utf8');
if (/getBackupFreshness/.test(obsApi) && /backup:/.test(obsApi)) ok('observability backup field');
else fail('observability backup field');

const obsUi = fs.readFileSync(path.join(__dirname, '../pages/platform/observability.tsx'), 'utf8');
if (/DB backup freshness/.test(obsUi) && /ageHours/.test(obsUi)) ok('observability backup chip');
else fail('observability backup chip');

const cron = fs.readFileSync(path.join(__dirname, '../scripts/ensure-humanify-crons.sh'), 'utf8');
if (/doc-expiry-soft/.test(cron) && /run-humanify-doc-expiry-soft-deactivate/.test(cron)) ok('soft-deactivate cron');
else fail('soft-deactivate cron');

const digest = fs.readFileSync(path.join(__dirname, '../scripts/send-humanify-action-inbox-digest.js'), 'utf8');
if (/policyAck/.test(digest) && /Policy ack pending/.test(digest)) ok('digest policy ack');
else fail('digest policy ack');

const ui = fs.readFileSync(path.join(__dirname, '../pages/platform/index.tsx'), 'utf8');
if (/partner-commission-export/.test(ui) && /Unduh CSV komisi/.test(ui)) ok('platform commission CSV link');
else fail('platform commission CSV link');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
