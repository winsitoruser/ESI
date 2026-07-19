#!/usr/bin/env node
/**
 * Wave-21 unit: deploy PM2 resilience, digest last-run, DEMO partner, commission CSV dates.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-21 unit');

const files = [
  '../lib/saas/digest-last.ts',
  '../scripts/ensure-humanify-demo-partner.js',
  '../scripts/deploy-humanify-vps.sh',
  '../pages/platform/observability.tsx',
  '../pages/platform/index.tsx',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const deploy = fs.readFileSync(path.join(__dirname, '../scripts/deploy-humanify-vps.sh'), 'utf8');
if (/ecosystem SCP failed|fallback restart|ensure-humanify-demo-partner/.test(deploy)) {
  ok('deploy PM2 resilience + DEMO ensure');
} else fail('deploy PM2 resilience + DEMO ensure');

const digestLib = fs.readFileSync(path.join(__dirname, '../lib/saas/digest-last.ts'), 'utf8');
if (/getDigestLastRun/.test(digestLib) && /writeDigestLast/.test(digestLib)) ok('digest last helper');
else fail('digest last helper');

const digestScript = fs.readFileSync(path.join(__dirname, '../scripts/send-humanify-action-inbox-digest.js'), 'utf8');
if (/writeDigestLast|action-digest-last\.json/.test(digestScript)) ok('digest writes last-run');
else fail('digest writes last-run');

const obs = fs.readFileSync(path.join(__dirname, '../pages/api/platform/observability.ts'), 'utf8');
if (/getDigestLastRun/.test(obs) && /actionDigest/.test(obs)) ok('observability actionDigest');
else fail('observability actionDigest');

const obsUi = fs.readFileSync(path.join(__dirname, '../pages/platform/observability.tsx'), 'utf8');
if (/Action Inbox digest/.test(obsUi)) ok('digest chip UI');
else fail('digest chip UI');

const partners = fs.readFileSync(path.join(__dirname, '../lib/saas/partners.ts'), 'utf8');
if (/ensureDemoPartner/.test(partners) && /DEMO/.test(partners)) ok('ensureDemoPartner');
else fail('ensureDemoPartner');

const demoScript = fs.readFileSync(path.join(__dirname, '../scripts/ensure-humanify-demo-partner.js'), 'utf8');
if (/code = 'DEMO'/.test(demoScript) && /saas_partners/.test(demoScript)) ok('DEMO partner script');
else fail('DEMO partner script');

const api = fs.readFileSync(path.join(__dirname, '../pages/api/platform/index.ts'), 'utf8');
if (/partner-commission-export/.test(api) && /fromTs/.test(api) && /toTs/.test(api) && /paid_at >=/.test(api)) {
  ok('commission CSV from/to');
} else fail('commission CSV from/to');

const ui = fs.readFileSync(path.join(__dirname, '../pages/platform/index.tsx'), 'utf8');
if (/commissionFrom/.test(ui) && /from=\$\{encodeURIComponent/.test(ui)) ok('platform CSV date UI');
else fail('platform CSV date UI');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave21/.test(pkg) && /ensure:demo-partner/.test(pkg)) ok('package scripts');
else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
