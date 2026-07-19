#!/usr/bin/env node
/**
 * Wave-20 unit: fiscal e2e cues, commission summary, scorecard last, MFA UX, Privy health.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-20 unit');

const files = [
  '../lib/saas/scorecard-last.ts',
  '../lib/hris/privy-webhook.ts',
  '../e2e/humanify-invite-docs-ui.spec.ts',
  '../pages/humanify/security.tsx',
  '../pages/platform/observability.tsx',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const e2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-invite-docs-ui.spec.ts'), 'utf8');
if (/Fiscal engine|Checklist sign-off/.test(e2e) && /payroll page fiscal banner soft/.test(e2e)) {
  ok('fiscal soft e2e cues');
} else fail('fiscal soft e2e cues');

const platform = fs.readFileSync(path.join(__dirname, '../pages/api/platform/index.ts'), 'utf8');
if (/partner-commission-summary/.test(platform) && /SUM\(commission_idr\)/.test(platform)) {
  ok('commission monthly summary');
} else fail('commission monthly summary');

const scoreLib = fs.readFileSync(path.join(__dirname, '../lib/saas/scorecard-last.ts'), 'utf8');
if (/getScorecardLastRun/.test(scoreLib) && /writeScorecardLast/.test(scoreLib)) ok('scorecard last helper');
else fail('scorecard last helper');

const scoreScript = fs.readFileSync(path.join(__dirname, '../scripts/run-humanify-security-scorecard.js'), 'utf8');
if (/writeLastRun|scorecard-last\.json/.test(scoreScript)) ok('scorecard writes last-run');
else fail('scorecard writes last-run');

const obs = fs.readFileSync(path.join(__dirname, '../pages/api/platform/observability.ts'), 'utf8');
if (/getScorecardLastRun/.test(obs) && /getPrivyWebhookHealth/.test(obs)) ok('observability scorecard+privy');
else fail('observability scorecard+privy');

const obsUi = fs.readFileSync(path.join(__dirname, '../pages/platform/observability.tsx'), 'utf8');
if (/Security scorecard/.test(obsUi) && /Privy webhook/.test(obsUi)) ok('observability chips UI');
else fail('observability chips UI');

const mfa = fs.readFileSync(path.join(__dirname, '../pages/humanify/security.tsx'), 'utf8');
if (/regenCode/.test(mfa) && /Salin semua/.test(mfa) && /Unduh \.txt/.test(mfa) && !/window\.prompt/.test(mfa)) {
  ok('MFA recovery UX');
} else fail('MFA recovery UX');

const privy = fs.readFileSync(path.join(__dirname, '../lib/hris/privy-webhook.ts'), 'utf8');
if (/getPrivyWebhookHealth/.test(privy) && /events24h/.test(privy)) ok('privy webhook health');
else fail('privy webhook health');

const ui = fs.readFileSync(path.join(__dirname, '../pages/platform/index.tsx'), 'utf8');
if (/commissionMonths/.test(ui) && /Komisi paid/.test(ui)) ok('platform commission summary UI');
else fail('platform commission summary UI');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
