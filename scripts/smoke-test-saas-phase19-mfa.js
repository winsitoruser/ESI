#!/usr/bin/env node
/**
 * Phase 19 — MFA/2FA (TOTP) smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase19-mfa.js
 *
 * signup → enroll → confirm (TOTP computed locally) → login blocked w/o code,
 * login OK w/ code → disable → login OK again.
 */
const crypto = require('crypto');
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

// ── TOTP (mirror of lib/saas/mfa.ts) ─────────────────────────────────────────
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Decode(str) {
  const clean = str.replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
  let bits = 0, value = 0; const out = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(out);
}
function totpNow(secret, atMs = Date.now()) {
  const counter = Math.floor(atMs / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const bin = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(bin % 1000000).padStart(6, '0');
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
let COOKIE = '';
async function loginCookie(email, password, totp) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
  const body = { csrfToken, email, password, json: 'true' };
  if (totp) body.totp = totp;
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
    body: new URLSearchParams(body),
    redirect: 'manual',
  });
  const cookies = (loginRes.headers.getSetCookie?.() || []).filter((c) => c.includes('next-auth')).map((c) => c.split(';')[0]);
  if (csrfCookie) cookies.push(csrfCookie);
  const cookie = cookies.join('; ');
  const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookie } })).json();
  return { email: session?.user?.email || null, cookie };
}

async function api(method, path, body) {
  const opts = { method, headers: { Cookie: COOKIE } };
  if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(`${BASE}${path}`, opts);
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function main() {
  console.log('SaaS Phase 19 — MFA/2FA smoke');
  console.log('Target:', BASE);

  const stamp = Date.now().toString(36);
  const email = `mfa-${stamp}@humanify.test`;
  const password = 'MfaPass123!';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'MFA Tester', email, password, companyName: `MFA Co ${stamp}` }),
  }).then((r) => r.json());
  if (!reg?.success) { fail('signup', reg?.error); process.exit(1); }
  ok(`signup ${reg.data.slug}`);

  // Public security page reachable (redirects to login when unauth)
  const page = await fetch(`${BASE}/humanify/security`, { redirect: 'manual' });
  if ([200, 302, 307, 308].includes(page.status)) ok(`security page → ${page.status}`);
  else fail('security page', String(page.status));

  const first = await loginCookie(email, password);
  if (first.email !== email) { fail('initial login', String(first.email)); process.exit(1); }
  COOKIE = first.cookie;
  ok('login before MFA works');

  const st0 = await api('GET', '/api/humanify/mfa?action=status');
  if (st0.json?.data?.enabled === false) ok('status: MFA disabled initially');
  else fail('status0', JSON.stringify(st0.json));

  const enr = await api('POST', '/api/humanify/mfa?action=enroll');
  const secret = enr.json?.data?.secret;
  if (secret && enr.json?.data?.otpauthUrl?.startsWith('otpauth://')) ok('enroll returns secret + otpauth URL');
  else { fail('enroll', JSON.stringify(enr.json)); process.exit(1); }

  // Confirm with a valid TOTP
  const conf = await api('POST', '/api/humanify/mfa?action=confirm', { code: totpNow(secret) });
  if (conf.json?.success) ok('confirm enables MFA');
  else fail('confirm', conf.json?.error);

  const st1 = await api('GET', '/api/humanify/mfa?action=status');
  if (st1.json?.data?.enabled === true) ok('status: MFA enabled');
  else fail('status1', JSON.stringify(st1.json));

  // Login WITHOUT totp → blocked
  const noCode = await loginCookie(email, password);
  if (noCode.email !== email) ok('login WITHOUT 2FA code is blocked');
  else fail('login without code should fail');

  // Login WITH totp → success
  const withCode = await loginCookie(email, password, totpNow(secret));
  if (withCode.email === email) ok('login WITH 2FA code succeeds');
  else fail('login with code failed', String(withCode.email));

  // Disable (needs valid code), using an authenticated cookie
  COOKIE = withCode.cookie;
  const dis = await api('POST', '/api/humanify/mfa?action=disable', { code: totpNow(secret) });
  if (dis.json?.success) ok('disable with valid code');
  else fail('disable', dis.json?.error);

  // After disable, login without code works again
  const after = await loginCookie(email, password);
  if (after.email === email) ok('login without code works after disable');
  else fail('post-disable login', String(after.email));

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
