#!/usr/bin/env node
/**
 * Wave-83 static: NPS pulse, commercial pack, hire-to-retire, partner payout honesty.
 */
const fs = require('fs');
const path = require('path');
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };
const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

console.log('Humanify wave-83 commercial / NPS');

if (exists('lib/saas/satisfaction.ts') && /humanify_satisfaction_responses/.test(read('lib/saas/satisfaction.ts'))) {
  ok('satisfaction store');
} else fail('satisfaction store');

if (exists('pages/api/humanify/satisfaction.ts')) ok('satisfaction API');
else fail('satisfaction API');

const home = read('components/employee/tabs/HomeTab.tsx');
if (/SatisfactionPulse/.test(home)) ok('ESS home mounts NPS pulse');
else fail('ESS NPS mount');

if (exists('docs/humanify-commercial-pack-template.md')) ok('commercial pack template');
else fail('commercial pack');

if (exists('docs/humanify-hire-to-retire-status.md') && /Hidden/.test(read('docs/humanify-hire-to-retire-status.md'))) {
  ok('hire-to-retire status');
} else fail('hire-to-retire');

const partner = read('docs/humanify-partner-channel.md');
if (/manual mark-paid/.test(partner) && /D-015/.test(partner)) ok('partner payout honesty KB');
else fail('partner payout KB');

const statusUi = read('pages/humanify/partners/status.tsx');
if (/manual mark-paid|D-015/.test(statusUi)) ok('partner status UI honesty banner');
else fail('partner status banner');

const qa = read('docs/humanify-quality-assurance.md');
if (/Satisfaction|NPS/.test(qa) && /Gate D/.test(qa)) ok('Gate D satisfaction note');
else fail('Gate D satisfaction');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
