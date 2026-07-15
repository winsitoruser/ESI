#!/usr/bin/env node
/**
 * Phase 17 — login lockout / brute-force guard smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase17-login-lockout.js
 *
 * Proof: a fresh account logs in fine (control); after 9 wrong-password attempts
 * the SAME account is locked so that even the CORRECT password is refused.
 * Uses throwaway emails so only those (email|ip) pairs are affected.
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function signup(email, password, company) {
  const r = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Lockout Tester', email, password, companyName: company }),
  });
  return r.json();
}

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
  console.log('SaaS Phase 17 — Login lockout smoke');
  console.log('Target:', BASE);

  const stamp = Date.now().toString(36);

  // Control: fresh account logs in with correct password
  const ctrlEmail = `lock-ctrl-${stamp}@humanify.test`;
  const ctrlPass = 'CtrlPass123!';
  const cs = await signup(ctrlEmail, ctrlPass, `Lock Ctrl ${stamp}`);
  if (!cs?.success) { fail('control signup', cs?.error); process.exit(1); }
  const ctrlLogin = await tryLogin(ctrlEmail, ctrlPass);
  if (ctrlLogin === ctrlEmail) ok('control: correct password logs in');
  else fail('control login failed (login broken?)', String(ctrlLogin));

  // Victim: fresh account, hammer wrong password then try correct
  const vEmail = `lock-victim-${stamp}@humanify.test`;
  const vPass = 'VictimPass123!';
  const vs = await signup(vEmail, vPass, `Lock Victim ${stamp}`);
  if (!vs?.success) { fail('victim signup', vs?.error); process.exit(1); }

  for (let i = 0; i < 9; i++) {
    const r = await tryLogin(vEmail, 'WrongPassword!!' + i);
    if (r === vEmail) { fail('wrong password unexpectedly logged in'); process.exit(1); }
  }
  ok('9 wrong-password attempts all rejected');

  // Now correct password should be blocked by the lockout
  const blocked = await tryLogin(vEmail, vPass);
  if (blocked !== vEmail) ok('correct password BLOCKED after lockout threshold');
  else fail('account not locked (correct password still logs in)');

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
