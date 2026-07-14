#!/usr/bin/env node
/**
 * Phase 3 — platform MRR / health smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase3-metrics.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
  for (const pass of PASSWORDS) {
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
      body: new URLSearchParams({ csrfToken, email: EMAIL, password: pass, json: 'true' }),
      redirect: 'manual',
    });
    const cookies = (loginRes.headers.getSetCookie?.() || []).filter((c) => c.includes('next-auth')).map((c) => c.split(';')[0]);
    if (csrfCookie) cookies.push(csrfCookie);
    COOKIE = cookies.join('; ');
    const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
    if (session?.user?.email) return session;
  }
  throw new Error('login failed');
}

async function api(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE } });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  console.log('SaaS Phase 3 — Metrics smoke');
  console.log('Target:', BASE);
  await login();
  ok('login');

  const page = await fetch(`${BASE}/platform`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
  if ([200, 307, 308].includes(page.status)) ok(`platform page → ${page.status}`);
  else fail('platform page', String(page.status));

  const ov = await api('/api/platform?action=overview');
  if (!ov.json?.success) {
    fail('overview', ov.json?.error || String(ov.status));
    process.exit(1);
  }
  const m = ov.json.data?.metrics;
  if (m && typeof m.mrrIdr === 'number' && typeof m.arrIdr === 'number') {
    ok(`MRR=${m.mrrFormatted} ARR=${m.arrFormatted} paying=${m.payingTenants}`);
  } else fail('metrics shape');

  if (Array.isArray(m?.byPlan) && m.byPlan.length >= 3) ok(`byPlan rows=${m.byPlan.length}`);
  else fail('byPlan');

  if (m?.health && typeof m.health.healthy === 'number') {
    ok(`health healthy=${m.health.healthy} watch=${m.health.watch} risk=${m.health.at_risk}`);
  } else fail('health dist');

  if (typeof ov.json.data?.summary?.signups7 === 'number') ok(`signups7=${ov.json.data.summary.signups7}`);
  else fail('signups7');

  const tn = await api('/api/platform?action=tenants');
  const list = tn.json?.data?.tenants || [];
  if (list.length && list[0].health?.score != null) ok(`tenant health score=${list[0].health.score} (${list[0].health.label})`);
  else fail('tenant health field');

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
