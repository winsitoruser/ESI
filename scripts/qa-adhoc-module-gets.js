#!/usr/bin/env node
/** Ad-hoc: random module GET sweep (no 5xx) */
const BASE = process.env.SMOKE_BASE_URL || 'https://humanify.id';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASS = process.env.SMOKE_PASSWORD || 'superadmin123';
const paths = [
  '/api/humanify/dashboard',
  '/api/humanify/payroll',
  '/api/humanify/attendance-management?action=overview',
  '/api/humanify/leave',
  '/api/humanify/recruitment',
  '/api/humanify/performance',
  '/api/humanify/organization',
  '/api/humanify/billing',
  '/api/humanify/industrial-relations?action=overview',
  '/api/humanify/training',
  '/api/humanify/lifecycle?action=contracts',
  '/api/humanify/workflow?action=claims',
];

(async () => {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASS, json: 'true' }),
    redirect: 'manual',
  });
  const cookies = (loginRes.headers.getSetCookie?.() || []).filter((c) => c.includes('next-auth')).map((c) => c.split(';')[0]);
  if (csrfCookie) cookies.push(csrfCookie);
  const COOKIE = cookies.join('; ');
  let bad = 0;
  for (const p of paths) {
    const res = await fetch(`${BASE}${p}`, { headers: { Cookie: COOKIE } });
    if (res.status >= 500) {
      console.error('5xx', p, res.status);
      bad++;
    } else console.log('ok', p, res.status);
  }
  if (bad) process.exit(1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
