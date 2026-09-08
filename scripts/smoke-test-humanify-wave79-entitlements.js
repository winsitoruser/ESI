#!/usr/bin/env node
/**
 * Wave-79 unit: entitlements + ROI price book + webhook fail-closed + Midtrans signature.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('Humanify wave-79 entitlements / price book');

const ent = read('lib/saas/plan-entitlements.ts');
if (/starter:\s*499_000/.test(ent) && /growth:\s*1_499_000/.test(ent) && /enterprise:\s*4_999_000/.test(ent)) {
  ok('Canonical list prices 499k / 1.499M / 4.999M');
} else fail('Canonical list prices');
if (/priceMonthlyIdr:\s*HUMANIFY_CANONICAL_PRICES_IDR\.starter/.test(ent)) ok('Starter list price from canonical book');
else fail('Starter list price');
if (/priceMonthlyIdr:\s*HUMANIFY_CANONICAL_PRICES_IDR\.growth/.test(ent)) ok('Growth list price from canonical book');
else fail('Growth list price');
if (/priceMonthlyIdr:\s*HUMANIFY_CANONICAL_PRICES_IDR\.enterprise/.test(ent)) ok('Enterprise list price from canonical book');
else fail('Enterprise list price');
if (/travel-expense/.test(ent) && /feature: 'payroll'/.test(ent)) ok('travel-expense gated payroll');
else fail('travel-expense gate');
if (/api\/humanify\/overtime/.test(ent) || /api\\\/humanify\\\/overtime/.test(ent)) ok('overtime API gated payroll');
else fail('overtime API gate');

const wf = read('pages/api/humanify/workflow.ts');
if (/claimActions/.test(wf) && /feature: 'payroll'/.test(wf)) ok('workflow claim* assert payroll');
else fail('workflow claim payroll assert');

const roi = read('lib/humanify/roi-calculator.ts');
if (/HUMANIFY_PLANS/.test(roi) && !/1_800_000/.test(roi)) ok('ROI tiers from HUMANIFY_PLANS');
else fail('ROI tiers aligned');

const ai = read('pages/api/humanify/ai-hub.ts');
if (/gatherBatchContext\(period,\s*tenantId\)/.test(ai) && /WHERE tenant_id = :tid/.test(ai)) {
  ok('AI hub aggregates tenant-scoped');
} else fail('AI hub tenant scope');

const wh = read('lib/hris/webhook-security.ts');
if (/isHumanifyWebhookFailClosed/.test(wh)) ok('webhook-security helper present');
else fail('webhook-security helper');

const privy = read('lib/hris/privy-webhook.ts');
const cand = read('lib/hris/webhook-candidate-sync.ts');
if (/isHumanifyWebhookFailClosed/.test(privy) && /isHumanifyWebhookFailClosed/.test(cand)) {
  ok('privy + recruitment use fail-closed helper');
} else fail('webhook fail-closed wiring');

const sales = read('docs/humanify-sales-feature-status.md');
if (/GA vs Partial vs Hidden/i.test(sales) && /Rp499\.000/.test(sales)) ok('sales one-pager present');
else fail('sales one-pager');

if (/1_800_000|9_500_000/.test(roi)) fail('legacy ROI prices still present');
else ok('no legacy ROI list prices');

const billing = read('lib/saas/humanify-billing.ts');
if (/MIDTRANS_SIGNATURE_REQUIRED/.test(billing) && /HUMANIFY_MIDTRANS_ALLOW_UNSIGNED/.test(billing)) {
  ok('Midtrans missing signature rejected in prod');
} else fail('Midtrans signature harden');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
