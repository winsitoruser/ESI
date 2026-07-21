#!/usr/bin/env node
/** Database probe: health deep + employees list */
const BASE = process.env.SMOKE_BASE_URL || 'https://humanify.id';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASS = process.env.SMOKE_PASSWORD || 'superadmin123';

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
  const health = await (await fetch(`${BASE}/api/health?deep=1`)).json();
  if (health.status !== 'ok') throw new Error('health not ok');
  const emp = await (await fetch(`${BASE}/api/humanify/employee-profile?action=list&limit=5`, { headers: { Cookie: COOKIE } })).json();
  if (!Array.isArray(emp.data)) throw new Error('employees list not array');
  console.log('db-ok employees', emp.data.length, 'health', health.status, 'db', health.db);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
