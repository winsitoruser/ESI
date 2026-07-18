#!/usr/bin/env node
/**
 * Multi-role invite → accept → login → session role + page access.
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-humanify-multi-role.js
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

function tokenFromInvite(data) {
  if (data?.token) return data.token;
  const url = data?.inviteUrl || '';
  try {
    const u = new URL(url, BASE);
    return u.searchParams.get('token');
  } catch {
    return null;
  }
}

async function main() {
  console.log('Humanify multi-role invite smoke');
  console.log('Target:', BASE);

  const stamp = Date.now().toString(36);
  const ownerEmail = `mr-owner-${stamp}@humanify.test`;
  const ownerPass = 'MultiRole1!';
  const mgrEmail = `mr-mgr-${stamp}@humanify.test`;
  const staffEmail = `mr-staff-${stamp}@humanify.test`;
  const memberPass = 'MultiRole1!';

  const signup = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `MR Owner ${stamp}`,
      email: ownerEmail,
      password: ownerPass,
      companyName: `MR Co ${stamp}`,
    }),
  });
  const sj = await signup.json();
  if (signup.ok && sj.success) ok(`signup owner ${sj.data?.slug || ownerEmail}`);
  else fail('signup', JSON.stringify(sj).slice(0, 160));

  const ownerSession = await login(ownerEmail, [ownerPass]);
  if (ownerSession?.user?.email) ok(`login owner role=${ownerSession.user.role || '?'}`);
  else fail('login owner');

  const roles = [
    { email: mgrEmail, role: 'manager', name: `MR Manager ${stamp}`, expectRole: 'manager' },
    { email: staffEmail, role: 'staff', name: `MR Staff ${stamp}`, expectRole: 'staff' },
  ];

  const accepted = [];
  for (const r of roles) {
    const inv = await api('POST', '/api/humanify/invitations?action=create', {
      email: r.email,
      role: r.role,
      name: r.name,
    });
    const token = tokenFromInvite(inv.json?.data);
    if (inv.status === 201 && token) {
      ok(`invite ${r.role} (token ok)`);
    } else if (inv.status === 201 && !token) {
      fail(`invite ${r.role}`, 'inviteUrl/token hidden — set HUMANIFY_INVITE_RETURN_TOKEN=true');
      continue;
    } else {
      fail(`invite ${r.role}`, JSON.stringify(inv.json).slice(0, 160));
      continue;
    }

    const acc = await fetch(`${BASE}/api/humanify/invitations-accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name: r.name, password: memberPass }),
    });
    const aj = await acc.json().catch(() => ({}));
    if (acc.status === 201 && aj.success) {
      ok(`accept ${r.role}`);
      accepted.push(r);
    } else {
      fail(`accept ${r.role}`, JSON.stringify(aj).slice(0, 160));
    }
  }

  for (const r of accepted) {
    const sess = await login(r.email, [memberPass]);
    const role = String(sess?.user?.role || '').toLowerCase();
    if (role === r.expectRole) ok(`login ${r.role} session.role=${role}`);
    else fail(`login ${r.role}`, `role=${role} want ${r.expectRole}`);

    // Soft page checks — staff should still reach ESS; manager MSS
    const path = r.role === 'manager' ? '/humanify/mss' : '/humanify/ess';
    const page = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
    if ([200, 304, 307].includes(page.status)) ok(`${r.role} page ${path} (${page.status})`);
    else fail(`${r.role} page ${path}`, `HTTP ${page.status}`);

    // Billing / SSO should not be hard-blocked for authenticated (page may 200 with empty IA);
    // assert payroll API is reachable for manager/staff at least without 500
    const pay = await api('GET', '/api/humanify/payroll?action=fiscal-signoff');
    if (pay.status < 500) ok(`${r.role} payroll API soft (${pay.status})`);
    else fail(`${r.role} payroll API`, `HTTP ${pay.status}`);
  }

  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
