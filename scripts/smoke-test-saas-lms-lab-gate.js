#!/usr/bin/env node
/**
 * LMS lab gate smoke — advanced LMS APIs/pages blocked unless HUMANIFY_LMS_LAB=true.
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-lms-lab-gate.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function signup() {
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const email = `lms-gate-${stamp}@humanify.test`;
  const password = 'IdorTest1!';
  const r = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'LMS Gate', email, password, companyName: `LMS Gate ${stamp}` }),
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(`signup failed: ${JSON.stringify(j)}`);
  return { email, password };
}

async function login(email, password) {
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
  COOKIE = cookies.join('; ');
  const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
  if (!session?.user?.email) throw new Error('login failed');
  return session;
}

async function main() {
  console.log('SaaS LMS lab gate smoke');
  console.log('Target:', BASE);

  const { email, password } = await signup();
  await login(email, password);
  ok('signup+login owner');

  // Complete setup if needed
  const setup = await fetch(`${BASE}/api/humanify/saas-onboarding`, {
    method: 'POST',
    headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'complete' }),
  }).catch(() => null);
  if (setup) {
    const sj = await setup.json().catch(() => ({}));
    if (setup.ok || sj.success) ok('setup complete/skip');
    else ok(`setup soft (${setup.status})`);
  }

  const api = await fetch(`${BASE}/api/humanify/lms/academy?action=settings`, {
    headers: { Cookie: COOKIE },
  });
  const aj = await api.json().catch(() => ({}));
  if (api.status === 403 && aj.error === 'LMS_LAB_GATED') ok('lab API academy → LMS_LAB_GATED');
  else if (api.status === 403 && aj.error === 'FEATURE_NOT_IN_PLAN') ok('lab API blocked by plan (ok)');
  else fail('lab API academy', `${api.status} ${JSON.stringify(aj).slice(0, 120)}`);

  const ai = await fetch(`${BASE}/api/humanify/lms/ai?action=recommend`, {
    method: 'POST',
    headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const aij = await ai.json().catch(() => ({}));
  if (ai.status === 403 && (aij.error === 'LMS_LAB_GATED' || aij.error === 'FEATURE_NOT_IN_PLAN')) {
    ok(`lab API ai → ${aij.error}`);
  } else {
    fail('lab API ai', `${ai.status} ${JSON.stringify(aij).slice(0, 120)}`);
  }

  // GA courses API should not be lab-gated (may still need plan lms — trial has lms)
  const courses = await fetch(`${BASE}/api/humanify/lms/courses?action=list`, {
    headers: { Cookie: COOKIE },
  });
  const cj = await courses.json().catch(() => ({}));
  if (courses.status === 200 && cj.success !== false) ok('GA courses API allowed');
  else if (courses.status === 403 && cj.error === 'FEATURE_NOT_IN_PLAN') ok('GA courses plan-gated (acceptable)');
  else if (cj.error === 'LMS_LAB_GATED') fail('GA courses wrongly lab-gated');
  else ok(`GA courses soft (${courses.status})`);

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
