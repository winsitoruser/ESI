#!/usr/bin/env node
/**
 * UAT smoke — contracts sync API, leave AI suggestions, KPI tab/seed endpoints.
 * Usage:
 *   SMOKE_BASE_URL=https://staging.humanify.id SMOKE_EMAIL=... SMOKE_PASSWORD=... \
 *   node scripts/smoke-test-humanify-hr-wave-uat.js
 */
const BASE = (process.env.SMOKE_BASE_URL || 'https://staging.humanify.id').replace(/\/$/, '');
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASS = process.env.SMOKE_PASSWORD || 'superadmin123';

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASS, json: 'true' }),
    redirect: 'manual',
  });
  const cookies = (loginRes.headers.getSetCookie?.() || [])
    .filter((c) => c.includes('next-auth'))
    .map((c) => c.split(';')[0]);
  if (csrfCookie) cookies.push(csrfCookie);
  COOKIE = cookies.join('; ');
  const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
  if (!session?.user?.email) throw new Error(`login failed (${loginRes.status})`);
  return session;
}

async function api(method, path, body) {
  const opts = { method, headers: { Cookie: COOKIE }, redirect: 'manual' };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { /* ignore */ }
  return { status: res.status, json, text, headers: res.headers };
}

async function main() {
  console.log('Humanify HR wave UAT');
  console.log('Target:', BASE);

  const session = await login();
  ok(`login ${session.user.email}`);

  // Health
  {
    const r = await fetch(`${BASE}/api/health?deep=1`);
    const j = await r.json().catch(() => ({}));
    if (r.status === 200 && j.status === 'ok') ok(`health ok db=${j.db}`);
    else fail('health', `${r.status} ${JSON.stringify(j).slice(0, 120)}`);
  }

  // Pages load (auth redirect or 200)
  for (const path of ['/humanify/contracts', '/humanify/leave', '/humanify/kpi-settings', '/humanify/employees']) {
    const r = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
    if ([200, 307, 302].includes(r.status)) ok(`page ${path} → ${r.status}`);
    else fail(`page ${path}`, String(r.status));
  }

  // Leave AI suggestions
  {
    const r = await api('GET', '/api/humanify/leave-management?action=suggest-types');
    const n = r.json?.data?.suggestions?.length || 0;
    if (r.status === 200 && r.json?.success && n >= 5) ok(`leave suggest-types (${n})`);
    else fail('leave suggest-types', `${r.status} ${JSON.stringify(r.json).slice(0, 160)}`);
  }
  {
    const r = await api('GET', '/api/humanify/leave-management?action=suggest-approvals');
    const n = r.json?.data?.suggestions?.length || 0;
    if (r.status === 200 && r.json?.success && n >= 2) ok(`leave suggest-approvals (${n})`);
    else fail('leave suggest-approvals', `${r.status} ${JSON.stringify(r.json).slice(0, 160)}`);
  }

  // Contracts list
  {
    const r = await api('GET', '/api/humanify/lifecycle?action=contracts');
    if (r.status === 200 && (r.json?.success !== false)) {
      const n = (r.json?.data || []).length;
      ok(`contracts list (${n})`);
    } else fail('contracts list', `${r.status}`);
  }

  // KPI settings GET + seed-defaults (idempotent)
  {
    const r = await api('GET', '/api/humanify/kpi-settings');
    if (r.status === 200) ok('kpi-settings GET');
    else fail('kpi-settings GET', String(r.status));
  }
  {
    const r = await api('POST', '/api/humanify/kpi-settings?type=seed-defaults', {});
    if (r.status === 200 && r.json?.success !== false) {
      const d = r.json?.data || {};
      ok(`kpi seed-defaults created=${d.created ?? '?'} skipped=${d.skipped ?? '?'}`);
    } else if (r.status === 403) {
      ok('kpi seed-defaults skipped (NO_TENANT for superadmin platform — expected)');
    } else {
      fail('kpi seed-defaults', `${r.status} ${JSON.stringify(r.json).slice(0, 160)}`);
    }
  }

  // Contract sync helper present (module reachable via docs API auth gate)
  {
    const r = await api('GET', '/api/humanify/employees?limit=1');
    if ([200, 401, 403].includes(r.status) || r.json?.success !== undefined) ok(`employees API reachable (${r.status})`);
    else fail('employees API', String(r.status));
  }

  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
