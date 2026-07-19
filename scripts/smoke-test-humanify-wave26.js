#!/usr/bin/env node
/**
 * Wave-26 unit: ROI soft e2e, careers global, join soft e2e, state continuity.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-26 unit');

const files = [
  '../e2e/humanify-roi-calculator-ui.spec.ts',
  '../e2e/humanify-join-ui.spec.ts',
  '../e2e/humanify-careers-ui.spec.ts',
  '../middleware.ts',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const mw = fs.readFileSync(path.join(__dirname, '../middleware.ts'), 'utf8');
if (/roi-calculator/.test(mw) && /\/humanify\/pricing\//.test(mw)) ok('ROI public whitelist');
else fail('ROI public whitelist');

const roi = fs.readFileSync(path.join(__dirname, '../e2e/humanify-roi-calculator-ui.spec.ts'), 'utf8');
if (/Kalkulator ROI/.test(roi) && /Does NOT submit/.test(roi)) ok('ROI soft e2e');
else fail('ROI soft e2e');

const careers = fs.readFileSync(path.join(__dirname, '../e2e/humanify-careers-ui.spec.ts'), 'utf8');
if (/global \/careers/.test(careers) && /Portal karir per perusahaan/.test(careers)) ok('careers global soft e2e');
else fail('careers global soft e2e');

const join = fs.readFileSync(path.join(__dirname, '../e2e/humanify-join-ui.spec.ts'), 'utf8');
if (/Bergabung ke tim/.test(join) && /not-a-real-token/.test(join) && /Does NOT POST/.test(join)) {
  ok('join soft e2e');
} else fail('join soft e2e');

const score = fs.readFileSync(path.join(__dirname, '../scripts/run-humanify-security-scorecard.js'), 'utf8');
if (/SEED_ONLY/.test(score)) ok('scorecard SEED_ONLY');
else fail('scorecard SEED_ONLY');

const deploy = fs.readFileSync(path.join(__dirname, '../scripts/deploy-humanify-vps.sh'), 'utf8');
if (/SEED_ONLY=true/.test(deploy) && /DRY_RUN=true.*action-inbox-digest|send-humanify-action-inbox-digest/.test(deploy)) {
  ok('deploy seed scorecard+digest');
} else if (/SEED_ONLY=true/.test(deploy) && /send-humanify-action-inbox-digest/.test(deploy)) {
  ok('deploy seed scorecard+digest');
} else fail('deploy seed scorecard+digest');

const envEx = fs.readFileSync(path.join(__dirname, '../.env.example'), 'utf8');
if (/HUMANIFY_STATE_DIR/.test(envEx)) ok('.env.example STATE_DIR');
else fail('.env.example STATE_DIR');

const envProd = fs.readFileSync(path.join(__dirname, '../.env.production.template'), 'utf8');
if (/HUMANIFY_STATE_DIR/.test(envProd)) ok('.env.production.template STATE_DIR');
else fail('.env.production.template STATE_DIR');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave26/.test(pkg) && /roi/.test(pkg) && /join/.test(pkg)) ok('package scripts');
else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
