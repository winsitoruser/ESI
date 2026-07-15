#!/usr/bin/env node
/**
 * Phase 10 — self-serve plan change / downgrade smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase10-plan-change.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  \u2713', m); passed++; };
const fail = (m, d) => { console.log('  \u2717', d ? `${m} \u2014 ${d}` : m); failed++; };

async function login(email, passwords) {
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
  console.log('SaaS Phase 10 — Plan change / downgrade smoke');
  console.log('Target:', BASE);

  const stamp = Date.now().toString(36);
  const email = `planchg-${stamp}@humanify.test`;
  const password = 'PlanChg1!';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Plan Tester', email, password, companyName: `Plan Co ${stamp}` }),
  });
  const regJ = await reg.json();
  if (!reg.ok || !regJ.success) { fail('signup', regJ.error); process.exit(1); }
  ok(`signup ${regJ.data.slug}`);

  await login(email, [password]);

  // Upgrade preview → requiresCheckout
  const prevUp = await api('GET', '/api/humanify/billing?action=plan-change-preview&plan=growth');
  if (prevUp.json?.success && prevUp.json.data?.direction === 'upgrade' && prevUp.json.data?.requiresCheckout) {
    ok('upgrade preview requires checkout');
  } else {
    fail('upgrade preview', JSON.stringify(prevUp.json?.data));
  }

  // Attempt change-plan upgrade → blocked with requiresCheckout
  const chgUp = await api('POST', '/api/humanify/billing?action=change-plan', { plan: 'growth' });
  if (chgUp.status === 409 && chgUp.json?.data?.requiresCheckout) {
    ok('change-plan upgrade routed to checkout (409)');
  } else {
    fail('change-plan upgrade guard', `${chgUp.status} ${JSON.stringify(chgUp.json?.data)}`);
  }

  // Upgrade to growth via manual checkout+confirm
  const co = await api('POST', '/api/humanify/billing?action=checkout', { plan: 'growth', interval: 'monthly', forceManual: true });
  const orderCode = co.json?.data?.orderCode;
  if (co.json?.data?.provider === 'manual' && orderCode) {
    const conf = await api('POST', '/api/humanify/billing?action=confirm-manual', { orderCode });
    if (conf.json?.success) ok('upgraded to growth (manual confirm)');
    else fail('manual confirm', conf.json?.error);
  } else {
    fail('manual checkout unavailable (Midtrans-only env?)', JSON.stringify(co.json?.data));
  }

  const cur1 = await api('GET', '/api/humanify/billing?action=current');
  if (cur1.json?.data?.plan === 'growth') ok('current plan = growth'); else fail('plan after upgrade', cur1.json?.data?.plan);

  // Downgrade preview starter → fits, no checkout
  const prevDown = await api('GET', '/api/humanify/billing?action=plan-change-preview&plan=starter');
  if (prevDown.json?.data?.direction === 'downgrade' && prevDown.json.data?.fits && !prevDown.json.data?.requiresCheckout) {
    ok('downgrade preview fits without checkout');
  } else {
    fail('downgrade preview', JSON.stringify(prevDown.json?.data));
  }

  // Apply downgrade
  const chgDown = await api('POST', '/api/humanify/billing?action=change-plan', { plan: 'starter' });
  if (chgDown.status === 200 && chgDown.json?.success && chgDown.json.data?.applied) {
    ok('downgrade to starter applied');
  } else {
    fail('downgrade apply', `${chgDown.status} ${JSON.stringify(chgDown.json?.data)}`);
  }

  const cur2 = await api('GET', '/api/humanify/billing?action=current');
  if (cur2.json?.data?.plan === 'starter') ok('current plan = starter'); else fail('plan after downgrade', cur2.json?.data?.plan);

  // Downgrade to trial blocked
  const chgTrial = await api('POST', '/api/humanify/billing?action=change-plan', { plan: 'trial' });
  if (!chgTrial.json?.success && (chgTrial.json?.data?.blockers || []).length > 0) {
    ok('downgrade to trial blocked');
  } else {
    fail('trial downgrade should be blocked', JSON.stringify(chgTrial.json?.data));
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
