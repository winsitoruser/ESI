#!/usr/bin/env node
/** Sanity: create one employee via employee-profile API */
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
  const stamp = Date.now().toString(36);
  const res = await fetch(`${BASE}/api/humanify/employee-profile?action=create`, {
    method: 'POST',
    headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Sanity ${stamp}`,
      email: `sanity-${stamp}@contoh.test`,
      department: 'Finance',
      position: 'Staff',
      work_location: 'ADMIN_OFFICE',
    }),
  });
  const j = await res.json();
  if (res.status !== 201 || !j.success) throw new Error(j.error || `HTTP ${res.status}`);
  console.log('ok', j.message);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
