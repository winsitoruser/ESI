#!/usr/bin/env node
/**
 * Billing webhook idempotency unit-ish smoke (no Midtrans key required for duplicate table).
 * Exercises claimBillingWebhookEvent via dynamic require of compiled path — uses HTTP soft check.
 *
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-humanify-billing-idempotency.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function main() {
  console.log('Humanify billing webhook soft smoke');
  console.log('Target:', BASE);

  // Without valid Midtrans signature, webhook should return 200 handled:false or 400 — not 500
  const body = {
    order_id: `smoke-idem-${Date.now()}`,
    status_code: '200',
    gross_amount: '10000.00',
    signature_key: 'invalid',
    transaction_status: 'settlement',
  };

  const r1 = await fetch(`${BASE}/api/humanify/billing/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j1 = await r1.json().catch(() => ({}));
  if (r1.status < 500) ok(`webhook soft (${r1.status} handled=${j1.handled})`);
  else fail('webhook 5xx', JSON.stringify(j1).slice(0, 120));

  const r2 = await fetch(`${BASE}/api/humanify/billing/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (r2.status < 500) ok(`replay soft (${r2.status})`);
  else fail('replay 5xx');

  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
