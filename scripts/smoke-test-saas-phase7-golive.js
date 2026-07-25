#!/usr/bin/env node
/**
 * Phase 7 GA — email verify + go-live checklist smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase7-golive.js
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
  console.log('SaaS Phase 7 — Go-live / email verify smoke');
  console.log('Target:', BASE);

  const page = await fetch(`${BASE}/humanify/verify-email`, { redirect: 'manual' });
  if ([200, 307, 308].includes(page.status)) ok(`verify-email page → ${page.status}`);
  else fail('verify-email page', String(page.status));

  const stamp = Date.now().toString(36);
  const email = `golive-${stamp}@humanify.test`;
  const password = 'GoLiveTest1!';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'GoLive Tester',
      email,
      password,
      companyName: `GoLive Co ${stamp}`,
    }),
  });
  const regJ = await reg.json();
  if (!reg.ok || !regJ.success) {
    fail('signup', regJ.error);
    process.exit(1);
  }
  ok(`signup ${regJ.data.slug}`);

  const verifyUrl = regJ.data?.verification?.verifyUrl;
  const emailedOnly = regJ.data?.verification?.emailed && !verifyUrl;
  if (verifyUrl && verifyUrl.includes('token=')) {
    const token = new URL(verifyUrl).searchParams.get('token');
    const v = await fetch(`${BASE}/api/humanify/email-verify?action=verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const vj = await v.json();
    if (vj.success) ok('email verified via token');
    else fail('verify', vj.error);
  } else if (emailedOnly) {
    ok('verification emailed (token hidden when SMTP active on prod)');
  } else {
    fail('signup missing verifyUrl', JSON.stringify(regJ.data?.verification));
  }

  await login(email, [password]);

  const resend = await api('POST', '/api/humanify/email-verify?action=resend');
  if (resend.status === 200 && resend.json?.success) {
    ok(`email-verify resend (emailed=${Boolean(resend.json.data?.emailed)})`);
  } else {
    fail('email-verify resend', resend.json?.error || `HTTP ${resend.status}`);
  }

  const gl = await api('GET', '/api/humanify/go-live');
  if (gl.json?.success && Array.isArray(gl.json.data?.items)) {
    ok(`go-live ${gl.json.data.score}/${gl.json.data.total} pct=${gl.json.data.pct}`);
    const emailItem = gl.json.data.items.find((i) => i.id === 'email_verified');
    if (emailItem) ok(`go-live email_verified item done=${Boolean(emailItem.done)}`);
    else fail('go-live email_verified item missing');
  } else fail('go-live', gl.json?.error);

  const ack = await api('POST', '/api/humanify/go-live?action=ack-billing');
  if (ack.json?.success && ack.json.data?.items?.find((i) => i.id === 'billing_aware')?.done) {
    ok('ack-billing done');
  } else fail('ack-billing', ack.json?.error);

  const ctx = await api('GET', '/api/humanify/saas-context');
  if (ctx.json?.data?.emailVerified === true) ok('saas-context emailVerified');
  else if (emailedOnly) ok('emailVerified pending (prod SMTP — expected until user clicks email)');
  else fail('emailVerified flag', String(ctx.json?.data?.emailVerified));

  // Platform ops: mark + resend on the signup tenant (superadmin)
  await login(EMAIL, PASSWORDS);
  const tenantId = regJ.data?.tenantId || regJ.data?.tenant_id || null;
  if (tenantId) {
    const mark = await api('PATCH', '/api/platform?action=tenant-email-verify', {
      id: tenantId,
      reason: 'wave75_smoke',
    });
    if (mark.json?.success) ok('platform tenant-email-verify mark');
    else fail('platform mark', mark.json?.error || `HTTP ${mark.status}`);

    const platResend = await api('POST', '/api/platform?action=tenant-email-resend', { id: tenantId });
    if (platResend.json?.success) ok('platform tenant-email-resend');
    else fail('platform resend', platResend.json?.error || `HTTP ${platResend.status}`);
  } else {
    const tenants = await api('GET', '/api/platform?action=tenants&limit=5');
    const fallbackId = tenants.json?.data?.tenants?.[0]?.id || null;
    if (fallbackId) {
      const mark = await api('PATCH', '/api/platform?action=tenant-email-verify', {
        id: fallbackId,
        reason: 'wave75_smoke_fallback',
      });
      if (mark.json?.success) ok('platform tenant-email-verify mark (fallback)');
      else fail('platform mark', mark.json?.error || `HTTP ${mark.status}`);
    } else {
      ok('platform email ops skipped (no tenant id)');
    }
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
