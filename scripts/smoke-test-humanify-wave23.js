#!/usr/bin/env node
/**
 * Wave-23 unit: commission partnerCode UI, signup soft e2e, DEMO chip, CSV partnerCode.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-23 unit');

const files = [
  '../pages/platform/index.tsx',
  '../e2e/humanify-signup-ref-ui.spec.ts',
  '../docs/humanify-sales-demo-15min.md',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const ui = fs.readFileSync(path.join(__dirname, '../pages/platform/index.tsx'), 'utf8');
if (/commissionPartnerCode/.test(ui) && /summaryQ\.set\('partnerCode'/.test(ui)) {
  ok('commission summary partnerCode filter');
} else fail('commission summary partnerCode filter');

if (/DEMO walkthrough/.test(ui) && /present/.test(ui) && /missing/.test(ui)) {
  ok('DEMO walkthrough chip');
} else fail('DEMO walkthrough chip');

if (/partner-commission-export/.test(ui) && /partnerCode=\$\{encodeURIComponent/.test(ui)) {
  ok('CSV export partnerCode');
} else fail('CSV export partnerCode');

const e2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-signup-ref-ui.spec.ts'), 'utf8');
if (/signup \?ref=DEMO/.test(e2e) && /Kode partner/.test(e2e) && /Does NOT submit/.test(e2e)) {
  ok('signup soft e2e cues');
} else fail('signup soft e2e cues');

const signup = fs.readFileSync(path.join(__dirname, '../components/humanify/HumanifySignupForm.tsx'), 'utf8');
if (/router\.query\.ref/.test(signup) && /partnerCode/.test(signup)) ok('signup ref prefill');
else fail('signup ref prefill');

const docs = fs.readFileSync(path.join(__dirname, '../docs/humanify-sales-demo-15min.md'), 'utf8');
if (/DEMO walkthrough: present/.test(docs) && /signup-ref:prod/.test(docs)) ok('sales demo docs');
else fail('sales demo docs');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave23/.test(pkg) && /test:e2e:humanify:signup-ref/.test(pkg)) ok('package scripts');
else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
