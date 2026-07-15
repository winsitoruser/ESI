#!/usr/bin/env node
/**
 * Phase 12 — alert digest smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase12-digest.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const OP_EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const OP_PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

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
  console.log('SaaS Phase 12 — Alert digest smoke');
  console.log('Target:', BASE);

  // Fresh tenant guarantees at least one actionable (email_unverified) alert
  const stamp = Date.now().toString(36);
  const email = `digest-${stamp}@humanify.test`;
  const password = 'Digest1!';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Digest Tester', email, password, companyName: `Digest Co ${stamp}` }),
  });
  const regJ = await reg.json();
  if (!reg.ok || !regJ.success) { fail('signup', regJ.error); process.exit(1); }
  ok(`signup ${regJ.data.slug}`);

  // Non-platform user is forbidden
  await login(email, [password]);
  const forbidden = await api('GET', '/api/humanify/alert-digest?limit=10');
  if (forbidden.status === 403) ok('non-platform user forbidden (403)');
  else fail('digest should be platform-only', String(forbidden.status));

  // Platform operator preview
  await login(OP_EMAIL, OP_PASSWORDS);
  const prev = await api('GET', '/api/humanify/alert-digest?limit=100');
  if (prev.json?.success && typeof prev.json.data?.scanned === 'number') {
    ok(`digest preview scanned=${prev.json.data.scanned} withAlerts=${prev.json.data.withAlerts} smtp=${prev.json.data.smtpConfigured}`);
  } else {
    fail('digest preview', JSON.stringify(prev.json?.error));
  }

  if ((prev.json?.data?.withAlerts || 0) >= 1) ok('at least one tenant has actionable alerts');
  else fail('expected >=1 tenant with alerts', String(prev.json?.data?.withAlerts));

  // Preview must not send email
  if (prev.json?.data?.sent === false && prev.json?.data?.emailed === 0) ok('preview did not send email');
  else fail('preview should not send', JSON.stringify({ sent: prev.json?.data?.sent, emailed: prev.json?.data?.emailed }));

  // Digest entries carry owner-facing structure
  const first = (prev.json?.data?.tenants || [])[0];
  if (first && Array.isArray(first.alerts) && first.counts) ok('digest entries include alerts + counts');
  else fail('digest entry shape', JSON.stringify(first));

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
