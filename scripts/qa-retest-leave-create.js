#!/usr/bin/env node
/** Retest: leave create via employee dashboard */
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
  const d = new Date();
  d.setDate(d.getDate() + (d.getDay() === 5 ? 3 : d.getDay() === 6 ? 2 : 1));
  const start = d.toISOString().slice(0, 10);
  d.setDate(d.getDate() + 1);
  const end = d.toISOString().slice(0, 10);
  const res = await fetch(`${BASE}/api/employee/dashboard?action=leave-request`, {
    method: 'POST',
    headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
    body: JSON.stringify({ leaveType: 'annual', startDate: start, endDate: end, reason: 'QA retest leave' }),
  });
  const j = await res.json();
  if (!(res.status < 300 && j.success)) throw new Error(`${j.error || ''} ${j.details || ''} HTTP ${res.status}`);
  console.log('leave ok', j.message);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
