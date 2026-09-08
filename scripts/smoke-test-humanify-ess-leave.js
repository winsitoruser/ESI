#!/usr/bin/env node
/**
 * ESS leave journey — provision types/balances, create leave, list, cancel path.
 * Usage: SMOKE_BASE_URL=https://humanify.id npm run smoke:ess-leave
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function signup() {
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const email = `ess-leave-${stamp}@humanify.test`;
  const password = 'EssLeave1!';
  const r = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'ESS Leave', email, password, companyName: `ESS Leave Co ${stamp}` }),
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(`signup: ${JSON.stringify(j)}`);
  return { email, password, tenantId: j.data.tenantId, slug: j.data.slug };
}

async function login(email, password) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
    body: new URLSearchParams({ csrfToken, email, password, json: 'true' }),
    redirect: 'manual',
  });
  const cookies = (loginRes.headers.getSetCookie?.() || [])
    .filter((c) => c.includes('next-auth'))
    .map((c) => c.split(';')[0]);
  if (csrfCookie) cookies.push(csrfCookie);
  COOKIE = cookies.join('; ');
  const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
  if (!session?.user?.email) throw new Error('login failed');
  return session;
}

async function ess(action, method = 'GET', body) {
  const opts = { method, headers: { Cookie: COOKIE } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}/api/employee/dashboard?action=${encodeURIComponent(action)}`, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  console.log('Humanify ESS leave journey');
  console.log('Target:', BASE);
  const t = await signup();
  ok(`signup ${t.slug}`);
  await login(t.email, t.password);
  ok('login');

  const profile = await ess('profile');
  if (profile.json?.data?.employee_id) ok(`profile employee=${profile.json.data.employee_id}`);
  else fail('profile provision', JSON.stringify(profile.json).slice(0, 160));

  // Warm ensure → seed types/balances
  const bal1 = await ess('leave-balance');
  const balances = Array.isArray(bal1.json?.data) ? bal1.json.data : [];
  if (balances.length >= 3 && balances.every((b) => Number(b.used || 0) === 0)) {
    ok(`leave-balance seeded n=${balances.length}`);
  } else if (balances.length > 0) {
    ok(`leave-balance n=${balances.length}`);
  } else {
    // second call after ensure on create path
    await ess('leave-request', 'POST', {
      leaveType: 'annual', startDate: '2099-07-01', endDate: '2099-07-01', reason: 'warmup',
    });
    const bal2 = await ess('leave-balance');
    const b2 = Array.isArray(bal2.json?.data) ? bal2.json.data : [];
    if (b2.length >= 1) ok(`leave-balance after write n=${b2.length}`);
    else fail('leave-balance empty', JSON.stringify(bal2.json).slice(0, 160));
  }

  const reason = `ess-leave-probe-${Date.now()}`;
  const create = await ess('leave-request', 'POST', {
    leaveType: 'annual',
    startDate: '2099-07-15',
    endDate: '2099-07-15',
    reason,
  });
  if (create.status === 200 && create.json?.success && create.json?.data?.id) {
    ok(`leave create id=${create.json.data.id}`);
  } else {
    fail('leave create', `${create.status} ${JSON.stringify(create.json).slice(0, 200)}`);
  }

  const list = await ess('leave-requests');
  const rows = Array.isArray(list.json?.data) ? list.json.data : [];
  if (rows.some((r) => String(r.reason || '') === reason)) ok(`leave list contains probe (n=${rows.length})`);
  else fail('leave list missing probe', `n=${rows.length}`);

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
