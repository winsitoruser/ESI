#!/usr/bin/env node
/**
 * Phase 6 — seats + dunning/trial ops smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase6-seats.js
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
  console.log('SaaS Phase 6 — Seats + dunning smoke');
  console.log('Target:', BASE);

  const stamp = Date.now().toString(36);
  const email = `seat-${stamp}@humanify.test`;
  const password = 'SeatTest1!';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Seat Tester', email, password, companyName: `Seat Co ${stamp}` }),
  });
  const regJ = await reg.json();
  if (!reg.ok || !regJ.success) {
    fail('signup', regJ.error);
    process.exit(1);
  }
  ok(`signup ${regJ.data.slug}`);

  await login(email, [password]);
  const ctx = await api('GET', '/api/humanify/saas-context');
  if (ctx.json?.success && ctx.json.data?.seats) {
    const s = ctx.json.data.seats;
    ok(`seats users=${s.users}/${s.maxUsers} emp=${s.employees}/${s.maxEmployees}`);
  } else fail('saas-context seats', ctx.json?.error);

  await login(EMAIL, PASSWORDS);
  ok('ops login');

  const exp = await api('GET', '/api/platform?action=expiring-trials&days=7');
  if (exp.json?.success && Array.isArray(exp.json.data)) ok(`expiring-trials=${exp.json.data.length}`);
  else fail('expiring-trials', exp.json?.error);

  const dun = await api('POST', '/api/platform?action=dunning-scan');
  if (dun.json?.success) {
    ok(`dunning suspended=${dun.json.data?.suspended} trialsExpired=${dun.json.data?.trialsExpired}`);
  } else fail('dunning', dun.json?.error);

  const billExp = await api('GET', '/api/humanify/billing?action=expiring-trials&days=7');
  if (billExp.json?.success) ok('billing expiring-trials alias');
  else fail('billing expiring', billExp.json?.error);

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
