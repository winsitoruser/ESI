#!/usr/bin/env node
/**
 * Phase 9 — account health & lifecycle alerts smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase9-alerts.js
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
  console.log('SaaS Phase 9 \u2014 Account alerts smoke');
  console.log('Target:', BASE);

  const stamp = Date.now().toString(36);
  const email = `alerts-${stamp}@humanify.test`;
  const password = 'AlertTest1!';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Alert Tester', email, password, companyName: `Alert Co ${stamp}` }),
  });
  const regJ = await reg.json();
  if (!reg.ok || !regJ.success) { fail('signup', regJ.error); process.exit(1); }
  ok(`signup ${regJ.data.slug}`);

  await login(email, [password]);

  // Fresh trial tenant: unverified email + incomplete go-live expected
  const a1 = await api('GET', '/api/humanify/alerts');
  if (a1.json?.success && Array.isArray(a1.json.data?.alerts)) {
    ok(`alerts endpoint returns ${a1.json.data.alerts.length} (counts crit=${a1.json.data.counts.critical} warn=${a1.json.data.counts.warning} info=${a1.json.data.counts.info})`);
  } else {
    fail('alerts endpoint', a1.json?.error);
  }

  const ids = (a1.json?.data?.alerts || []).map((x) => x.id);
  if (ids.includes('email_unverified')) ok('email_unverified alert present for fresh tenant');
  else fail('email_unverified alert', ids.join(','));

  if (ids.includes('go_live_incomplete')) ok('go_live_incomplete alert present');
  else fail('go_live_incomplete alert', ids.join(','));

  // Alerts must be severity-sorted (critical < warning < info)
  const rank = { critical: 0, warning: 1, info: 2 };
  const sevs = (a1.json?.data?.alerts || []).map((x) => rank[x.severity]);
  const sorted = sevs.every((v, i) => i === 0 || sevs[i - 1] <= v);
  if (sorted) ok('alerts sorted by severity'); else fail('alerts sort order', sevs.join(','));

  // saas-context now embeds alerts + counts
  const ctx = await api('GET', '/api/humanify/saas-context');
  if (Array.isArray(ctx.json?.data?.alerts) && ctx.json?.data?.alertCounts) {
    ok(`saas-context embeds alerts (${ctx.json.data.alerts.length})`);
  } else {
    fail('saas-context alerts', JSON.stringify(ctx.json?.data?.alertCounts));
  }

  // Verify email → email_unverified should disappear
  const verifyUrl = regJ.data?.verification?.verifyUrl;
  const emailedOnly = regJ.data?.verification?.emailed && !verifyUrl;
  if (verifyUrl && verifyUrl.includes('token=')) {
    const token = new URL(verifyUrl).searchParams.get('token');
    await fetch(`${BASE}/api/humanify/email-verify?action=verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const a2 = await api('GET', '/api/humanify/alerts');
    const ids2 = (a2.json?.data?.alerts || []).map((x) => x.id);
    if (!ids2.includes('email_unverified')) ok('email_unverified cleared after verification');
    else fail('email_unverified still present after verify', ids2.join(','));
  } else if (emailedOnly) {
    ok('verification emailed (prod SMTP — skip auto-verify in smoke)');
  } else {
    fail('signup missing verifyUrl', JSON.stringify(regJ.data?.verification));
  }

  // Platform operator sees no tenant alerts
  await login(OP_EMAIL, OP_PASSWORDS);
  const opA = await api('GET', '/api/humanify/alerts');
  if (opA.json?.success && Array.isArray(opA.json.data?.alerts) && opA.json.data.alerts.length === 0) {
    ok('platform operator gets empty alerts');
  } else {
    fail('platform operator alerts not empty', JSON.stringify(opA.json?.data?.counts));
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
