#!/usr/bin/env node
/**
 * Wave-24 unit: billing partnerCode link, DEMO preview button, forgot soft e2e, uptime last.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-24 unit');

const files = [
  '../lib/saas/uptime-last.ts',
  '../e2e/humanify-forgot-password-ui.spec.ts',
  '../pages/platform/index.tsx',
  '../pages/platform/observability.tsx',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const ui = fs.readFileSync(path.join(__dirname, '../pages/platform/index.tsx'), 'utf8');
if (/billing-orders&status=paid/.test(ui) && /partnerCode=\$\{encodeURIComponent/.test(ui)) {
  ok('billing-orders partnerCode link');
} else fail('billing-orders partnerCode link');

if (/previewDemoCommission/.test(ui) && /Preview DEMO · Rp1jt/.test(ui)) {
  ok('DEMO commission-preview button');
} else fail('DEMO commission-preview button');

const e2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-forgot-password-ui.spec.ts'), 'utf8');
if (/Lupa password/.test(e2e) && /Does NOT submit/.test(e2e) && /Kirim tautan reset/.test(e2e)) {
  ok('forgot-password soft e2e');
} else fail('forgot-password soft e2e');

const uptimeLib = fs.readFileSync(path.join(__dirname, '../lib/saas/uptime-last.ts'), 'utf8');
if (/getUptimeLastRun/.test(uptimeLib) && /writeUptimeLast/.test(uptimeLib)) ok('uptime last helper');
else fail('uptime last helper');

const uptimeScript = fs.readFileSync(path.join(__dirname, '../scripts/check-humanify-uptime-external.js'), 'utf8');
if (/writeUptimeLast|uptime-last\.json/.test(uptimeScript)) ok('uptime writes last-run');
else fail('uptime writes last-run');

const obs = fs.readFileSync(path.join(__dirname, '../pages/api/platform/observability.ts'), 'utf8');
if (/getUptimeLastRun/.test(obs) && /lastRun/.test(obs)) ok('observability uptime lastRun');
else fail('observability uptime lastRun');

const obsUi = fs.readFileSync(path.join(__dirname, '../pages/platform/observability.tsx'), 'utf8');
if (/lastRun/.test(obsUi) && /Probe:/.test(obsUi)) ok('uptime probe chip UI');
else fail('uptime probe chip UI');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave24/.test(pkg) && /forgot-password/.test(pkg)) ok('package scripts');
else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
