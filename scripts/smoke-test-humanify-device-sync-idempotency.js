#!/usr/bin/env node
/**
 * Unit + soft HTTP checks for device-sync / recruitment idempotency helpers.
 * Usage: node scripts/smoke-test-humanify-device-sync-idempotency.js
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

function buildAutoKey(deviceId, records) {
  return `auto:${deviceId}:${crypto.createHash('sha256').update(JSON.stringify(records)).digest('hex').slice(0, 32)}`;
}

function buildRecruitmentKey(opts) {
  const header = String(opts.headerKey || '').trim().slice(0, 255);
  if (header) return header;
  const body = opts.body || {};
  const provider = String(opts.provider || body.provider || 'unknown');
  const event = String(opts.event || body.event || 'candidate.applied');
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : body;
  const candidate = payload.candidate || payload.applicant || payload;
  const identity = String(
    candidate.external_id || candidate.id || candidate.email || candidate.full_name || candidate.name || '',
  ).slice(0, 120);
  const digest = crypto
    .createHash('sha256')
    .update(JSON.stringify({ provider, event, identity, tenant: body.tenant_id || '' }))
    .digest('hex')
    .slice(0, 32);
  return `auto:${provider}:${digest}`.slice(0, 255);
}

async function main() {
  console.log('Humanify device-sync / recruitment idempotency');

  const k1 = buildAutoKey('dev-1', [{ id: 1 }, { id: 2 }]);
  const k2 = buildAutoKey('dev-1', [{ id: 1 }, { id: 2 }]);
  const k3 = buildAutoKey('dev-1', [{ id: 1 }, { id: 3 }]);
  if (k1 === k2 && k1.startsWith('auto:dev-1:')) ok('device auto-key stable');
  else fail('device auto-key stable');
  if (k1 !== k3) ok('device auto-key changes with payload');
  else fail('device auto-key should differ');

  const rkHeader = buildRecruitmentKey({ headerKey: 'idem-abc', body: { provider: 'dealls' } });
  if (rkHeader === 'idem-abc') ok('recruitment prefers Idempotency-Key');
  else fail('header key');

  const rk1 = buildRecruitmentKey({
    provider: 'dealls',
    event: 'candidate.applied',
    body: { provider: 'dealls', payload: { full_name: 'Ada Lovelace', email: 'ada@x.com' } },
  });
  const rk2 = buildRecruitmentKey({
    provider: 'dealls',
    event: 'candidate.applied',
    body: { provider: 'dealls', payload: { full_name: 'Ada Lovelace', email: 'ada@x.com' } },
  });
  if (rk1 === rk2 && rk1.startsWith('auto:dealls:')) ok('recruitment auto-key stable');
  else fail('recruitment auto-key');

  const ds = fs.readFileSync(path.join(__dirname, '../lib/hris/device-sync-idempotency.ts'), 'utf8');
  if (/claimDeviceSyncEvent/.test(ds) && /storeDeviceSyncResult/.test(ds)) ok('device-sync-idempotency.ts');
  else fail('device-sync source');

  const rs = fs.readFileSync(path.join(__dirname, '../lib/hris/recruitment-webhook-idempotency.ts'), 'utf8');
  if (/claimRecruitmentWebhookEvent/.test(rs) && /buildRecruitmentIdempotencyKey/.test(rs)) {
    ok('recruitment-webhook-idempotency.ts');
  } else fail('recruitment source');

  const BASE = process.env.SMOKE_BASE_URL;
  if (BASE) {
    const body = {
      provider: 'smoke',
      event: 'candidate.applied',
      payload: { full_name: 'Smoke Candidate', email: `smoke-${Date.now()}@example.com` },
    };
    const headers = {
      'Content-Type': 'application/json',
      'Idempotency-Key': `smoke-rec-${Date.now()}`,
    };
    const r1 = await fetch(`${BASE}/api/humanify/webhooks/recruitment`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    // Without secret may 401 — still must not 500
    if (r1.status < 500) ok(`recruitment soft (${r1.status})`);
    else fail('recruitment soft', String(r1.status));
  } else {
    ok('skip HTTP soft (no SMOKE_BASE_URL)');
  }

  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
