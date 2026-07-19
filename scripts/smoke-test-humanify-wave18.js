#!/usr/bin/env node
/**
 * Wave-18 unit: billing commission snapshot, lead CSV, soft-deactivate, policy-ack pending.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-18 unit');

const files = [
  '../lib/saas/humanify-billing.ts',
  '../lib/hris/partner-leads.ts',
  '../lib/hris/policy-ack.ts',
  '../scripts/run-humanify-doc-expiry-soft-deactivate.js',
  '../pages/platform/tenants/[id].tsx',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const bill = fs.readFileSync(path.join(__dirname, '../lib/saas/humanify-billing.ts'), 'utf8');
if (/commission_idr/.test(bill) && /partner_code/.test(bill) && /estimatePartnerCommission/.test(bill)) {
  ok('billing commission snapshot');
} else fail('billing commission snapshot');

const leads = fs.readFileSync(path.join(__dirname, '../lib/hris/partner-leads.ts'), 'utf8');
if (/exportPartnerLeadsCsv/.test(leads) && /csvEscape/.test(leads)) ok('lead CSV export');
else fail('lead CSV export');

const platform = fs.readFileSync(path.join(__dirname, '../pages/api/platform/index.ts'), 'utf8');
if (/partner-leads-export/.test(platform) && /partnerCommission/.test(platform) && /commission_idr/.test(platform)) {
  ok('platform export + commission fields');
} else fail('platform export + commission fields');

const soft = fs.readFileSync(path.join(__dirname, '../scripts/run-humanify-doc-expiry-soft-deactivate.js'), 'utf8');
if (/APPLY/.test(soft) && /is_active = false/.test(soft) && !/unlinkSync|DeleteObject/.test(soft)) {
  ok('soft-deactivate no hard-delete');
} else fail('soft-deactivate no hard-delete');

const ack = fs.readFileSync(path.join(__dirname, '../lib/hris/policy-ack.ts'), 'utf8');
if (/countTenantPolicyAckPending/.test(ack)) ok('policy ack pending count');
else fail('policy ack pending count');

const irApi = fs.readFileSync(path.join(__dirname, '../pages/api/humanify/industrial-relations.ts'), 'utf8');
if (/pendingPolicyAcks/.test(irApi) && /countTenantPolicyAckPending/.test(irApi)) ok('IR overview pendingPolicyAcks');
else fail('IR overview pendingPolicyAcks');

const irUi = fs.readFileSync(path.join(__dirname, '../pages/humanify/industrial-relations.tsx'), 'utf8');
if (/Menunggu Tanda Terima/.test(irUi) && /pendingPolicyAcks/.test(irUi)) ok('IR KPI pending ack');
else fail('IR KPI pending ack');

const tenantUi = fs.readFileSync(path.join(__dirname, '../pages/platform/tenants/[id].tsx'), 'utf8');
if (/Komisi \(est\.\)/.test(tenantUi) && /partnerCommission/.test(tenantUi)) ok('tenant detail commission UI');
else fail('tenant detail commission UI');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
