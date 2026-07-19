#!/usr/bin/env node
/**
 * Wave-22 unit: pm2 startup fix, soft-deactivate chip, lead status filter, MFA soft e2e.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-22 unit');

const files = [
  '../lib/saas/soft-deactivate-last.ts',
  '../scripts/deploy-humanify-vps.sh',
  '../e2e/humanify-invite-docs-ui.spec.ts',
  '../pages/platform/observability.tsx',
  '../pages/platform/index.tsx',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const deploy = fs.readFileSync(path.join(__dirname, '../scripts/deploy-humanify-vps.sh'), 'utf8');
if (/_PM2_STARTUP/.test(deploy) && /sed/.test(deploy) && /pm2 startup/.test(deploy)) {
  ok('pm2 startup $ strip');
} else fail('pm2 startup $ strip');

if (/<<'REMOTE_DEMO'/.test(deploy)) ok('REMOTE_DEMO quoted heredoc');
else fail('REMOTE_DEMO quoted heredoc');

const softLib = fs.readFileSync(path.join(__dirname, '../lib/saas/soft-deactivate-last.ts'), 'utf8');
if (/getSoftDeactivateLastRun/.test(softLib) && /writeSoftDeactivateLast/.test(softLib)) ok('soft-deactivate last helper');
else fail('soft-deactivate last helper');

const softScript = fs.readFileSync(path.join(__dirname, '../scripts/run-humanify-doc-expiry-soft-deactivate.js'), 'utf8');
if (/writeSoftDeactivateLast|soft-deactivate-last\.json/.test(softScript)) ok('soft-deactivate writes last-run');
else fail('soft-deactivate writes last-run');

const obs = fs.readFileSync(path.join(__dirname, '../pages/api/platform/observability.ts'), 'utf8');
if (/getSoftDeactivateLastRun/.test(obs) && /docExpirySoft/.test(obs)) ok('observability docExpirySoft');
else fail('observability docExpirySoft');

const obsUi = fs.readFileSync(path.join(__dirname, '../pages/platform/observability.tsx'), 'utf8');
if (/Doc soft-deactivate/.test(obsUi)) ok('soft-deactivate chip UI');
else fail('soft-deactivate chip UI');

const ui = fs.readFileSync(path.join(__dirname, '../pages/platform/index.tsx'), 'utf8');
if (/leadStatus/.test(ui) && /partner-leads-export.*status/.test(ui.replace(/\n/g, ' '))) ok('lead status filter UI');
else if (/leadStatus/.test(ui) && /Semua status/.test(ui)) ok('lead status filter UI');
else fail('lead status filter UI');

const e2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-invite-docs-ui.spec.ts'), 'utf8');
if (/security page MFA enrollment cues soft/.test(e2e) && /Aktifkan 2FA/.test(e2e)) ok('MFA soft e2e cues');
else fail('MFA soft e2e cues');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave22/.test(pkg)) ok('package smoke:wave22');
else fail('package smoke:wave22');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
