#!/usr/bin/env node
/**
 * Phase 4 — Humanify billing smoke (manual path when Midtrans unset)
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase4-billing.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function login(email = EMAIL, passwords = PASSWORDS) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
  for (const pass of passwords) {
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
      body: new URLSearchParams({ csrfToken, email, password: pass, json: 'true' }),
      redirect: 'manual',
    });
    const cookies = (loginRes.headers.getSetCookie?.() || []).filter((c) => c.includes('next-auth')).map((c) => c.split(';')[0]);
    if (csrfCookie) cookies.push(csrfCookie);
    COOKIE = cookies.join('; ');
    const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
    if (session?.user?.email) return session;
  }
  throw new Error('login failed');
}

async function api(method, path, body) {
  const opts = { method, headers: { Cookie: COOKIE } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  console.log('SaaS Phase 4 — Billing smoke');
  console.log('Target:', BASE);

  const page = await fetch(`${BASE}/humanify/billing`, { redirect: 'manual' });
  if ([200, 307, 308].includes(page.status)) ok(`billing page → ${page.status}`);
  else fail('billing page', String(page.status));

  // Create tenant owner
  const stamp = Date.now().toString(36);
  const email = `bill-${stamp}@humanify.test`;
  const password = 'BillingTest1!';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Bill Tester', email, password, companyName: `Bill Co ${stamp}` }),
  });
  const regJ = await reg.json();
  if (!reg.ok || !regJ.success) {
    fail('signup', regJ.error || String(reg.status));
    process.exit(1);
  }
  ok(`signup ${regJ.data.slug}`);

  await login(email, [password]);
  ok('owner login');

  const plans = await api('GET', '/api/humanify/billing?action=plans');
  if (plans.json?.success && plans.json.data?.plans?.length >= 3) ok(`plans=${plans.json.data.plans.length}`);
  else fail('plans list');

  const cur = await api('GET', '/api/humanify/billing?action=current');
  if (cur.json?.success) ok(`current plan=${cur.json.data?.plan}`);
  else fail('current');

  const checkout = await api('POST', '/api/humanify/billing?action=checkout', {
    plan: 'starter',
    interval: 'monthly',
    forceManual: true,
  });
  if (checkout.json?.success && checkout.json.data?.orderCode) {
    ok(`checkout ${checkout.json.data.provider} ${checkout.json.data.orderCode} amount=${checkout.json.data.amountIdr}`);
  } else {
    fail('checkout', checkout.json?.error || String(checkout.status));
    process.exit(1);
  }

  const conf = await api('POST', '/api/humanify/billing?action=confirm-manual', {
    orderCode: checkout.json.data.orderCode,
  });
  if (conf.json?.success) ok('confirm-manual activated');
  else fail('confirm-manual', conf.json?.error);

  const cur2 = await api('GET', '/api/humanify/billing?action=current');
  if (cur2.json?.data?.plan === 'starter') ok('plan now starter');
  else fail('plan after pay', cur2.json?.data?.plan);

  // Webhook endpoint rejects bad payload gracefully
  const wh = await fetch(`${BASE}/api/humanify/billing/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: 'x' }),
  });
  if ([200, 400].includes(wh.status)) ok(`webhook endpoint → ${wh.status}`);
  else fail('webhook', String(wh.status));

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
