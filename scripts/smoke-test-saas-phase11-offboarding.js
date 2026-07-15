#!/usr/bin/env node
/**
 * Phase 11 — tenant offboarding + export-on-delete smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase11-offboarding.js
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
  console.log('SaaS Phase 11 — Offboarding + export smoke');
  console.log('Target:', BASE);

  const stamp = Date.now().toString(36);
  const email = `offb-${stamp}@humanify.test`;
  const password = 'OffbTest1!';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Offb Tester', email, password, companyName: `Offb Co ${stamp}` }),
  });
  const regJ = await reg.json();
  if (!reg.ok || !regJ.success) { fail('signup', regJ.error); process.exit(1); }
  ok(`signup ${regJ.data.slug}`);

  await login(email, [password]);

  // Initial status = active
  const s0 = await api('GET', '/api/humanify/account?action=offboarding-status');
  if (s0.json?.success && s0.json.data?.status === 'active') ok('initial offboarding status active');
  else fail('initial status', JSON.stringify(s0.json?.data));

  // Export bundle
  const exp = await api('GET', '/api/humanify/account?action=export');
  if (exp.json?.success && exp.json.data?.tenant && exp.json.data?.employees) {
    ok(`export bundle (employees=${exp.json.data.employees.count})`);
  } else {
    fail('export bundle', JSON.stringify(exp.json?.error));
  }

  // Request offboarding
  const req = await api('POST', '/api/humanify/account?action=request-offboarding', { reason: 'smoke test' });
  if (req.json?.success && req.json.data?.status === 'requested' && req.json.data?.graceUntil) {
    ok('offboarding requested with grace window');
  } else {
    fail('request offboarding', JSON.stringify(req.json?.data));
  }

  // Status now requested
  const s1 = await api('GET', '/api/humanify/account?action=offboarding-status');
  if (s1.json?.data?.status === 'requested') ok('status = requested'); else fail('status after request', JSON.stringify(s1.json?.data));

  // Cancel
  const cancel = await api('POST', '/api/humanify/account?action=cancel-offboarding');
  if (cancel.json?.success && cancel.json.data?.status === 'active') ok('offboarding cancelled');
  else fail('cancel offboarding', JSON.stringify(cancel.json?.data));

  const s2 = await api('GET', '/api/humanify/account?action=offboarding-status');
  if (s2.json?.data?.status === 'active') ok('status back to active'); else fail('status after cancel', JSON.stringify(s2.json?.data));

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
