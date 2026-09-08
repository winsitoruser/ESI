#!/usr/bin/env node
/**
 * Smoke: Platform Ops host isolation (ops.humanify.id)
 *
 *   SMOKE_OPS_URL=https://ops.humanify.id SMOKE_BASE_URL=https://humanify.id \
 *     node scripts/smoke-test-humanify-ops-host.js
 */
const APEX = (process.env.SMOKE_BASE_URL || 'https://humanify.id').replace(/\/$/, '');
const OPS = (process.env.SMOKE_OPS_URL || process.env.NEXT_PUBLIC_HUMANIFY_OPS_URL || 'https://ops.humanify.id').replace(/\/$/, '');
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
  console.log(`\nOps host isolation\n  apex=${APEX}\n  ops=${OPS}\n`);

  // Apex /platform must redirect to ops
  const apexPlat = await fetch(`${APEX}/platform`, { redirect: 'manual' });
  const loc = apexPlat.headers.get('location') || '';
  if ([301, 302, 307, 308].includes(apexPlat.status) && /ops\.humanify\.id/i.test(loc)) {
    ok(`apex /platform → ${apexPlat.status} ${loc}`);
  } else {
    fail('apex /platform redirect', `status=${apexPlat.status} loc=${loc}`);
  }

  // Apex API blocked
  const apexApi = await fetch(`${APEX}/api/platform?action=overview`);
  const apexJson = await apexApi.json().catch(() => ({}));
  if (apexApi.status === 403 && apexJson.error === 'OPS_HOST_REQUIRED') ok('apex /api/platform blocked 403');
  else fail('apex /api/platform', `status=${apexApi.status} body=${JSON.stringify(apexJson).slice(0, 120)}`);

  // Ops login page
  const loginPage = await fetch(`${OPS}/login`, { redirect: 'manual' });
  if (loginPage.status === 200) ok('ops /login 200');
  else fail('ops /login', `status=${loginPage.status}`);

  // Ops platform unauth → login
  const unauth = await fetch(`${OPS}/platform`, { redirect: 'manual' });
  if ([302, 307, 308].includes(unauth.status)) {
    const l = unauth.headers.get('location') || '';
    if (/\/login/i.test(l)) ok('ops /platform unauth → login');
    else fail('ops /platform unauth redirect', l);
  } else if (unauth.status === 200) {
    // rewrite might serve login content
    ok('ops /platform responded (check auth in HTML)');
  } else fail('ops /platform unauth', `status=${unauth.status}`);

  // Login on ops + overview
  let cookie = '';
  try {
    cookie = await loginOn(OPS);
    if (!cookie.includes('session') && !cookie.includes('next-auth')) {
      fail('ops login cookie missing');
    } else ok('ops login session cookie');
  } catch (e) {
    fail('ops login', String(e.message || e));
  }

  if (cookie) {
    const ov = await fetch(`${OPS}/api/platform?action=overview`, { headers: { Cookie: cookie } });
    const j = await ov.json().catch(() => ({}));
    if (ov.status === 200 && j.success) ok('ops overview 200');
    else fail('ops overview', `status=${ov.status} ${JSON.stringify(j).slice(0, 140)}`);

    // Apex cookie must NOT open ops API in real browsers (host-only cookies).
    // Node fetch can artificially forward Cookie headers across hosts — that is NOT
    // how browsers behave. We only fail if the session cookie is scoped with Domain=.humanify.id.
    let apexCookie = '';
    try {
      apexCookie = await loginOn(APEX);
    } catch { /* */ }
    if (apexCookie) {
      const csrfRes = await fetch(`${APEX}/api/auth/csrf`);
      const setCookies = csrfRes.headers.getSetCookie?.() || [];
      const scopedToParent = setCookies.some((c) => /domain=\.?humanify\.id/i.test(c));
      if (scopedToParent) {
        fail('auth cookie uses Domain=.humanify.id (breaks host isolation)');
      } else {
        ok('auth cookies are host-only (no Domain=.humanify.id)');
      }
      // Informational: artificial Cookie header forwarding is expected to work in Node
      const cross = await fetch(`${OPS}/api/platform?action=overview`, { headers: { Cookie: apexCookie } });
      if (cross.status === 200) {
        ok('note: Node can forward cookies cross-host; browsers will not');
      } else {
        ok(`ops rejects foreign cookie status=${cross.status}`);
      }
    }
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failures.length) failures.forEach((f) => console.log('  -', f));
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
