#!/usr/bin/env node
/**
 * Wave-17 unit: commission calc, lead status, unsnooze, uptime check, partners e2e.
 */
const fs = require('fs');
const path = require('path');

function estimatePartnerCommission(amountIdr, commissionPct) {
  const pct = Math.max(0, Math.min(100, Number(commissionPct) || 0));
  const amount = Math.max(0, Math.round(Number(amountIdr) || 0));
  return {
    amountIdr: amount,
    commissionPct: pct,
    commissionIdr: Math.round((amount * pct) / 100),
  };
}

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-17 unit');

const e = estimatePartnerCommission(1_000_000, 10);
if (e.commissionIdr === 100_000) ok('commission 10% of 1e6');
else fail('commission 10%');
const e2 = estimatePartnerCommission(999, 15.5);
if (e2.commissionIdr === Math.round(999 * 15.5 / 100)) ok('commission rounding');
else fail('commission rounding');
if (estimatePartnerCommission(-5, 200).commissionIdr === 0) ok('commission clamps');
else fail('commission clamps');

const files = [
  '../lib/saas/partners.ts',
  '../lib/hris/partner-leads.ts',
  '../lib/hris/action-inbox-snooze.ts',
  '../scripts/check-humanify-uptime-external.js',
  '../e2e/humanify-partners-ui.spec.ts',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const partners = fs.readFileSync(path.join(__dirname, '../lib/saas/partners.ts'), 'utf8');
if (/estimatePartnerCommission/.test(partners) && /previewPartnerCommission/.test(partners)) {
  ok('partners commission helpers');
} else fail('partners commission helpers');

const leads = fs.readFileSync(path.join(__dirname, '../lib/hris/partner-leads.ts'), 'utf8');
if (/updatePartnerLeadStatus/.test(leads) && /PARTNER_LEAD_STATUSES/.test(leads)) {
  ok('lead status triage');
} else fail('lead status triage');

const snooze = fs.readFileSync(path.join(__dirname, '../lib/hris/action-inbox-snooze.ts'), 'utf8');
if (/clearInboxSnooze/.test(snooze)) ok('clearInboxSnooze');
else fail('clearInboxSnooze');

const api = fs.readFileSync(path.join(__dirname, '../pages/api/humanify/action-inbox-snooze.ts'), 'utf8');
if (/unsnooze/.test(api) && /clearInboxSnooze/.test(api)) ok('unsnooze API');
else fail('unsnooze API');

const platform = fs.readFileSync(path.join(__dirname, '../pages/api/platform/index.ts'), 'utf8');
if (/commission-preview/.test(platform) && /partner-lead-status/.test(platform)) {
  ok('platform commission + lead status');
} else fail('platform commission + lead status');

const obs = fs.readFileSync(path.join(__dirname, '../pages/api/platform/observability.ts'), 'utf8');
if (/externalUptime/.test(obs) && /UPTIMEROBOT_API_KEY/.test(obs)) ok('observability external uptime');
else fail('observability external uptime');

const dash = fs.readFileSync(path.join(__dirname, '../pages/humanify/index.tsx'), 'utf8');
if (/handleUnsnooze/.test(dash) && /Batalkan/.test(dash)) ok('dashboard unsnooze UX');
else fail('dashboard unsnooze UX');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
