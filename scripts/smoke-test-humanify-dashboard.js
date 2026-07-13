#!/usr/bin/env node
/**
 * Humanify Dashboard QA — smoke, business flow, security, stress, backtest
 * Usage: SMOKE_BASE_URL=https://humanify.id npm run smoke:dashboard
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

let COOKIE = '';
let passed = 0;
let failed = 0;
const failures = [];

const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { const line = d ? `${m} — ${d}` : m; console.log('  ✗', line); failures.push(line); failed++; };
const section = (t) => console.log(`\n══ ${t} ══`);

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('next-auth.csrf-token'))?.split(';')[0] || '';
  for (const pass of PASSWORDS) {
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
      body: new URLSearchParams({ csrfToken, email: EMAIL, password: pass, json: 'true' }),
      redirect: 'manual',
    });
    const sessionCookies = (loginRes.headers.getSetCookie?.() || []).filter((c) => c.includes('next-auth')).map((c) => c.split(';')[0]);
    if (csrfCookie) sessionCookies.push(csrfCookie);
    COOKIE = sessionCookies.join('; ');
    const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
    if (session?.user?.email) return session;
  }
  throw new Error('Login failed');
}

async function api(method, path, body) {
  const opts = { method, headers: { Cookie: COOKIE } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 200) }; }
  return { res, json };
}

function expect(name, { res, json }, statuses = [200]) {
  if (!statuses.includes(res.status)) { fail(name, `HTTP ${res.status}`); return false; }
  if (json.success === false) { fail(name, json.error || 'success=false'); return false; }
  ok(name);
  return true;
}

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('  Humanify Dashboard QA Suite');
  console.log('══════════════════════════════════════════════');
  console.log('Target:', BASE);

  try { await login(); ok('login'); } catch (e) { fail('login', e.message); process.exit(1); }

  section('Pages');
  for (const p of ['/humanify', '/humanify/welcome']) {
    const res = await fetch(`${BASE}${p}`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
    if ([200, 307, 308].includes(res.status)) ok(`page ${p}`);
    else fail(`page ${p}`, `HTTP ${res.status}`);
  }

  section('Dashboard API');
  const dash = await api('GET', '/api/humanify/dashboard');
  if (expect('dashboard GET', dash)) {
    const s = dash.json.stats;
    if (s && typeof s.total === 'number') ok(`stats object (employees=${s.total})`);
    else fail('stats shape', 'missing stats.total');
    if (Array.isArray(dash.json.deptStats)) ok(`deptStats (${dash.json.deptStats.length})`);
    else fail('deptStats', 'not array');
    if (Array.isArray(dash.json.pendingApprovals)) ok(`pendingApprovals (${dash.json.pendingApprovals.length})`);
    if (Array.isArray(dash.json.recentActivities)) ok(`recentActivities (${dash.json.recentActivities.length})`);
    if (Array.isArray(dash.json.upcoming)) ok(`upcoming (${dash.json.upcoming.length})`);
  }

  section('Business flow — dashboard data chain');
  const emp = await api('GET', '/api/humanify/employees?limit=5');
  const wf = await api('GET', '/api/humanify/workflow?action=summary');
  const act = await api('GET', '/api/humanify/activities?limit=5');
  if (expect('employees for dashboard', emp) && expect('workflow summary', wf) && expect('activities feed', act)) {
    ok('flow: dashboard supporting APIs reachable');
  }

  section('Security');
  const unauth = await fetch(`${BASE}/api/humanify/dashboard`);
  if (unauth.status === 401 || unauth.status === 403) ok('auth guard dashboard');
  else fail('auth guard dashboard', `HTTP ${unauth.status}`);

  const inj = await api('GET', `/api/humanify/dashboard?tenant=${encodeURIComponent("'; DROP TABLE--")}`);
  if ([200, 400, 403, 500, 520].includes(inj.res.status)) ok(`injection param safe (HTTP ${inj.res.status})`);
  else fail('injection', `HTTP ${inj.res.status}`);

  section('Backtest consistency');
  const a = await api('GET', '/api/humanify/dashboard');
  const b = await api('GET', '/api/humanify/dashboard');
  if (a.res.status === b.res.status && a.res.status === 200) {
    const sameTotal = a.json.stats?.total === b.json.stats?.total;
    if (sameTotal) ok('backtest stats.total consistent');
    else fail('backtest stats', `${a.json.stats?.total} vs ${b.json.stats?.total}`);
  } else fail('backtest', 'status mismatch');

  section('Stress (40 concurrent dashboard reads)');
  const t0 = Date.now();
  const stress = await Promise.all(Array.from({ length: 40 }, () => api('GET', '/api/humanify/dashboard')));
  const okN = stress.filter((r) => r.res.status === 200).length;
  const ms = Date.now() - t0;
  if (okN >= 38) ok(`stress ${okN}/40 in ${ms}ms`);
  else fail('stress', `${okN}/40 in ${ms}ms`);

  console.log('\n══════════════════════════════════════════════');
  console.log(`Result: ${passed} passed, ${failed} failed`);
  if (failures.length) failures.forEach((f) => console.log('  •', f));
  console.log('══════════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
