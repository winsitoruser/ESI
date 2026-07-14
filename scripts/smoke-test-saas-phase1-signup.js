#!/usr/bin/env node
/**
 * Phase 1 SaaS — signup + setup wizard smoke test
 * Usage:
 *   SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase1-signup.js
 *   SMOKE_CREATE_ACCOUNT=true node scripts/smoke-test-saas-phase1-signup.js  # creates test tenant
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const CREATE = process.env.SMOKE_CREATE_ACCOUNT === 'true';

let passed = 0;
let failed = 0;
const failures = [];
let COOKIE = '';

const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => {
  const line = d ? `${m} — ${d}` : m;
  console.log('  ✗', line);
  failures.push(line);
  failed++;
};

async function login(email, password) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || [])
    .find((c) => c.includes('next-auth.csrf-token'))?.split(';')[0] || '';

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
    body: new URLSearchParams({ csrfToken, email, password, json: 'true' }),
    redirect: 'manual',
  });
  const sessionCookies = (loginRes.headers.getSetCookie?.() || [])
    .filter((c) => c.includes('next-auth'))
    .map((c) => c.split(';')[0]);
  if (csrfCookie) sessionCookies.push(csrfCookie);
  COOKIE = sessionCookies.join('; ');
  const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
  return session?.user || null;
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  SaaS Phase 1 — Signup & Setup Smoke         ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('Target:', BASE);

  const signupPage = await fetch(`${BASE}/humanify/signup`);
  if (signupPage.status === 200) ok('signup page → 200');
  else fail('signup page', String(signupPage.status));

  const setupPage = await fetch(`${BASE}/humanify/setup`);
  if ([200, 307, 308].includes(setupPage.status)) ok(`setup page → ${setupPage.status} (auth gate ok)`);
  else fail('setup page', String(setupPage.status));

  if (!CREATE) {
    console.log('\n  (skip account creation — set SMOKE_CREATE_ACCOUNT=true to run full flow)');
    console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }

  const stamp = Date.now().toString(36);
  const email = `smoke-p1-${stamp}@humanify.test`;
  const password = 'SmokeTest1!';
  const company = `Smoke Co ${stamp}`;

  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Smoke Tester',
      email,
      password,
      companyName: company,
      industry: 'software_house',
      employeeRange: '1-50',
    }),
  });
  const regJ = await reg.json();
  if (reg.ok && regJ.success && regJ.data?.slug) {
    ok(`signup API → tenant slug=${regJ.data.slug}`);
  } else {
    fail('signup API', `${reg.status} ${regJ.error || ''}`);
    console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
    process.exit(1);
  }

  const user = await login(email, password);
  if (user?.email === email) ok(`auto-login as owner ${email}`);
  else fail('login after signup', user?.email || 'no session');

  const statusRes = await fetch(`${BASE}/api/humanify/saas-onboarding`, {
    headers: { Cookie: COOKIE },
  });
  const statusJ = await statusRes.json();
  if (statusJ.success && !statusJ.data?.completed) ok('onboarding status → incomplete');
  else fail('onboarding status', statusJ.error || 'unexpected');

  const steps = ['company', 'organization', 'policies'];
  for (const step of steps) {
    const save = await fetch(`${BASE}/api/humanify/saas-onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
      body: JSON.stringify({
        action: 'save',
        step,
        data: step === 'company'
          ? { city: 'Jakarta', province: 'DKI' }
          : step === 'organization'
            ? { departments: ['HR', 'IT'] }
            : { workDays: [1, 2, 3, 4, 5], defaultShift: '09:00-18:00' },
      }),
    });
    const saveJ = await save.json();
    if (saveJ.success) ok(`save step ${step}`);
    else fail(`save step ${step}`, saveJ.error);
  }

  const done = await fetch(`${BASE}/api/humanify/saas-onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
    body: JSON.stringify({ action: 'complete' }),
  });
  const doneJ = await done.json();
  if (doneJ.success && doneJ.data?.completed) ok('complete onboarding');
  else fail('complete onboarding', doneJ.error);

  const careers = await fetch(`${BASE}/api/public/careers?tenant=${regJ.data.slug}`);
  const careersJ = await careers.json();
  if (careers.ok && careersJ.tenant?.slug === regJ.data.slug) {
    ok(`careers scoped to new tenant`);
  } else {
    fail('careers tenant scope', careersJ.error || String(careers.status));
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(' -', f));
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
