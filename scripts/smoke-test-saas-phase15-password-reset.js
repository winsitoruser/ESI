#!/usr/bin/env node
/**
 * Phase 15 — Self-service password reset smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase15-password-reset.js
 *
 * End-to-end: signup → request reset → confirm with token → login w/ NEW password
 * works, login w/ OLD password fails, unknown-email request stays non-enumerating.
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

/** Attempt a NextAuth credentials login; returns the authenticated email or null. */
async function tryLogin(email, password) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
    body: new URLSearchParams({ csrfToken, email, password, json: 'true' }),
    redirect: 'manual',
  });
  const cookies = (loginRes.headers.getSetCookie?.() || []).filter((c) => c.includes('next-auth')).map((c) => c.split(';')[0]);
  if (csrfCookie) cookies.push(csrfCookie);
  const cookie = cookies.join('; ');
  const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookie } })).json();
  return session?.user?.email || null;
}

async function main() {
  console.log('SaaS Phase 15 — Password reset smoke');
  console.log('Target:', BASE);

  // Public pages reachable
  for (const p of ['/humanify/forgot-password', '/humanify/reset-password']) {
    const page = await fetch(`${BASE}${p}`, { redirect: 'manual' });
    if ([200, 307, 308].includes(page.status)) ok(`page ${p} → ${page.status}`);
    else fail(`page ${p}`, String(page.status));
  }

  // Fresh tenant/owner
  const stamp = Date.now().toString(36);
  const email = `reset-${stamp}@humanify.test`;
  const oldPassword = 'OldPass123!';
  const newPassword = 'NewPass456!';
  const reg = await post('/api/humanify/signup', {
    name: 'Reset Tester',
    email,
    password: oldPassword,
    companyName: `Reset Co ${stamp}`,
  });
  if (!reg.json?.success) { fail('signup', reg.json?.error); process.exit(1); }
  ok(`signup ${reg.json.data.slug}`);

  // Old password works before reset
  const before = await tryLogin(email, oldPassword);
  if (before === email) ok('login with old password (pre-reset)');
  else fail('pre-reset login', String(before));

  // Request reset — token exposed in dev / when email not sent
  const rq = await post('/api/humanify/password-reset?action=request', { email });
  const token = rq.json?.data?.token || (rq.json?.data?.resetUrl ? new URL(rq.json.data.resetUrl).searchParams.get('token') : null);
  if (rq.json?.success) ok('reset request accepted');
  else fail('reset request', rq.json?.error);
  if (token) ok('reset token issued');
  else if (rq.json?.data?.emailed) ok('reset emailed (prod SMTP — confirm flow skipped in smoke)');
  else { fail('reset token missing (SMTP on? set HUMANIFY_PASSWORD_RESET_RETURN_TOKEN=true)'); process.exit(1); }

  if (token) {
  // Confirm reset
  const cf = await post('/api/humanify/password-reset?action=confirm', { token, password: newPassword });
  if (cf.json?.success) ok('reset confirmed');
  else fail('reset confirm', cf.json?.error);

  // Token is single-use
  const cf2 = await post('/api/humanify/password-reset?action=confirm', { token, password: newPassword });
  if (!cf2.json?.success) ok('token single-use (reuse rejected)');
  else fail('token reuse should fail');

  // New password works, old one no longer
  const afterNew = await tryLogin(email, newPassword);
  if (afterNew === email) ok('login with NEW password');
  else fail('post-reset new login', String(afterNew));

  const afterOld = await tryLogin(email, oldPassword);
  if (afterOld !== email) ok('old password rejected after reset');
  else fail('old password still works (should not)');
  }

  // Non-enumeration: unknown email still succeeds, without a token
  const unknown = await post('/api/humanify/password-reset?action=request', { email: `ghost-${stamp}@humanify.test` });
  if (unknown.json?.success && !unknown.json?.data?.token) ok('unknown email → generic success, no token');
  else fail('enumeration guard', JSON.stringify(unknown.json?.data));

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
