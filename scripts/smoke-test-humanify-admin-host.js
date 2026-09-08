#!/usr/bin/env node
/**
 * Smoke: Admin Total host (admin.humanify.id) — platform superadmin control plane
 *
 *   SMOKE_ADMIN_URL=https://admin.humanify.id SMOKE_BASE_URL=https://humanify.id \
 *     node scripts/smoke-test-humanify-admin-host.js
 */
const APEX = (process.env.SMOKE_BASE_URL || 'https://humanify.id').replace(/\/$/, '');
const ADMIN = (process.env.SMOKE_ADMIN_URL || process.env.NEXT_PUBLIC_HUMANIFY_ADMIN_URL || 'https://admin.humanify.id').replace(/\/$/, '');
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORD = process.env.SMOKE_PASSWORD || 'superadmin123';

let passed = 0;
let failed = 0;
const failures = [];
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { const line = d ? `${m} — ${d}` : m; console.log('  ✗', line); failures.push(line); failed++; };

async function loginOn(base) {
  const csrfRes = await fetch(`${base}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
  const loginRes = await fetch(`${base}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD, json: 'true' }),
    redirect: 'manual',
  });
  const cookies = (loginRes.headers.getSetCookie?.() || [])
    .filter((c) => c.includes('next-auth') || c.includes('session-token'))
    .map((c) => c.split(';')[0]);
  if (csrfCookie) cookies.push(csrfCookie);
  return cookies.join('; ');
}

async function main() {
  console.log(`\nAdmin Total host\n  apex=${APEX}\n  admin=${ADMIN}\n`);

  const loginPage = await fetch(`${ADMIN}/login`, { redirect: 'manual' });
  if (loginPage.status === 200) ok('admin /login 200');
  else fail('admin /login', `status=${loginPage.status}`);

  const html = await loginPage.text().catch(() => '');
  if (/Admin Total|super_admin|operator/i.test(html)) ok('admin login is platform control plane');
  else fail('admin login copy', html.slice(0, 160));

  const root = await fetch(`${ADMIN}/`, { redirect: 'manual' });
  if ([302, 307, 308].includes(root.status)) {
    const loc = root.headers.get('location') || '';
    if (/\/login/i.test(loc)) ok('admin / unauth → login');
    else fail('admin / unauth redirect', loc);
  } else fail('admin / unauth', `status=${root.status}`);

  const hris = await fetch(`${ADMIN}/humanify`, { redirect: 'manual' });
  const hrisLoc = hris.headers.get('location') || '';
  if ([301, 302, 307, 308].includes(hris.status) && /\/platform/i.test(hrisLoc)) {
    ok('admin /humanify blocked → platform');
  } else {
    fail('admin /humanify isolation', `status=${hris.status} loc=${hrisLoc}`);
  }

  const unauthPlat = await fetch(`${ADMIN}/platform`, { redirect: 'manual' });
  if ([302, 307, 308].includes(unauthPlat.status)) {
    const loc = unauthPlat.headers.get('location') || '';
    if (/\/login/i.test(loc)) ok('admin /platform unauth → login');
    else fail('admin /platform unauth redirect', loc);
  } else if (unauthPlat.status === 200) {
    ok('admin /platform responded (auth in HTML)');
  } else fail('admin /platform unauth', `status=${unauthPlat.status}`);

  let cookie = '';
  try {
    cookie = await loginOn(ADMIN);
    if (!cookie.includes('session') && !cookie.includes('next-auth')) fail('admin login cookie missing');
    else ok('admin login session cookie');
  } catch (e) {
    fail('admin login', String(e.message || e));
  }

  if (cookie) {
    const ov = await fetch(`${ADMIN}/api/platform?action=overview`, { headers: { Cookie: cookie } });
    const j = await ov.json().catch(() => ({}));
    if (ov.status === 200 && j.success) ok('admin platform overview 200');
    else fail('admin overview', `status=${ov.status} ${JSON.stringify(j).slice(0, 140)}`);

    const csrfRes = await fetch(`${ADMIN}/api/auth/csrf`);
    const setCookies = csrfRes.headers.getSetCookie?.() || [];
    const scopedToParent = setCookies.some((c) => /domain=\.?humanify\.id/i.test(c));
    if (scopedToParent) fail('auth cookie uses Domain=.humanify.id (breaks host isolation)');
    else ok('auth cookies are host-only (no Domain=.humanify.id)');
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failures.length) failures.forEach((f) => console.log('  -', f));
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
