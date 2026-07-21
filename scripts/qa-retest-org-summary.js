#!/usr/bin/env node
/** Retest: organization summary card keys are aligned */
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
  const j = await (await fetch(`${BASE}/api/humanify/organization?action=summary`, { headers: { Cookie: COOKIE } })).json();
  if (!j.success || !j.data) throw new Error('summary failed');
  for (const k of ['totalUnits', 'totalGrades', 'totalEmployees', 'totalDepartments']) {
    if (j.data[k] == null) throw new Error(`missing key ${k} got ${Object.keys(j.data)}`);
  }
  console.log('org summary keys ok', j.data.totalUnits, j.data.totalGrades, j.data.totalEmployees, j.data.totalDepartments);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
