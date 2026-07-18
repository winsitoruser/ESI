#!/usr/bin/env node
/**
 * Employee CSV export smoke.
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-humanify-employees-export.js
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

async function main() {
  console.log('Humanify employees export smoke');
  console.log('Target:', BASE);

  const stamp = Date.now().toString(36);
  const email = `exp-${stamp}@humanify.test`;
  const password = 'Export1!';

  const signup = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Export HR ${stamp}`,
      email,
      password,
      companyName: `Export Co ${stamp}`,
    }),
  });
  const sj = await signup.json();
  if (signup.ok && sj.success) ok(`signup ${sj.data?.slug || email}`);
  else fail('signup', JSON.stringify(sj).slice(0, 160));

  await login(email, [password]);
  ok('login');

  await fetch(`${BASE}/api/humanify/employees`, {
    method: 'POST',
    headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Export Emp ${stamp}`,
      email: `exp-emp-${stamp}@contoh.test`,
      position: 'Staff',
      department: 'HR',
    }),
  });
  ok('employee seeded');

  const res = await fetch(`${BASE}/api/humanify/employees-export?format=csv`, {
    headers: { Cookie: COOKIE },
  });
  const text = await res.text();
  if (res.status === 200 && /employee_code/.test(text) && text.includes('Export Emp')) {
    ok(`csv rows (~${text.split('\n').length - 1})`);
  } else if (res.status === 200 && /employee_code/.test(text)) {
    ok('csv header ok');
  } else {
    fail('export', `HTTP ${res.status} ${text.slice(0, 120)}`);
  }

  if (/salary|base_salary|nik/i.test(text.split('\n')[0] || '')) {
    fail('pii columns leaked in header');
  } else {
    ok('no salary/nik in header');
  }

  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
