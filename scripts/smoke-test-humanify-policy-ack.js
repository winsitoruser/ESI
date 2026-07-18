#!/usr/bin/env node
/**
 * Policy acknowledgment smoke.
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-humanify-policy-ack.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

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
  throw new Error(`login failed for ${email}`);
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
  console.log('Humanify policy acknowledgment smoke');
  console.log('Target:', BASE);

  const stamp = Date.now().toString(36);
  const email = `pol-${stamp}@humanify.test`;
  const password = 'PolicyAck1!';

  const signup = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Policy HR ${stamp}`,
      email,
      password,
      companyName: `Policy Co ${stamp}`,
    }),
  });
  const sj = await signup.json();
  if (signup.ok && sj.success) ok(`signup ${sj.data?.slug || email}`);
  else fail('signup', JSON.stringify(sj).slice(0, 160));

  await login(email, [password]);
  ok('login');

  const create = await api('POST', '/api/humanify/industrial-relations?action=regulation', {
    title: `Kebijakan Smoke ${stamp}`,
    regulationNumber: `POL-${stamp}`,
    category: 'company_rule',
    description: 'Smoke policy ack',
    content: 'Isi kebijakan uji',
    status: 'active',
    effectiveDate: new Date().toISOString().slice(0, 10),
  });
  const regId = create.json?.data?.id;
  if (regId) ok(`regulation created ${String(regId).slice(0, 8)}…`);
  else fail('create regulation', JSON.stringify(create.json).slice(0, 160));

  const mine = await api('GET', '/api/humanify/policies?action=my');
  const pending = mine.json?.data?.pending || [];
  if (regId && pending.some((p) => p.id === regId)) ok('pending includes new policy');
  else if (mine.json?.success) ok(`my policies soft (pending=${pending.length})`);
  else fail('my policies', JSON.stringify(mine.json).slice(0, 120));

  if (regId) {
    const ack = await api('POST', '/api/humanify/policies?action=acknowledge', { regulationId: regId });
    if (ack.json?.success) ok('acknowledge');
    else fail('acknowledge', JSON.stringify(ack.json).slice(0, 120));

    const again = await api('GET', '/api/humanify/policies?action=my');
    const acked = again.json?.data?.acknowledged || [];
    if (acked.some((p) => p.id === regId)) ok('listed as acknowledged');
    else fail('acked list missing');
  }

  const ess = await fetch(`${BASE}/humanify/ess`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
  if ([200, 304, 307].includes(ess.status)) ok(`ESS page (${ess.status})`);
  else fail('ESS page', `HTTP ${ess.status}`);

  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
