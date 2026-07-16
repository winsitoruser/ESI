#!/usr/bin/env node
/**
 * Smoke: fresh tenant must see EMPTY module data (no dummy / cross-tenant leak).
 * Roles catalog may be non-empty (system defaults) — allowed.
 *
 * Usage:
 *   SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-tenant-empty-state.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

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
  const cookies = (loginRes.headers.getSetCookie?.() || [])
    .filter((c) => c.includes('next-auth'))
    .map((c) => c.split(';')[0]);
  if (csrfCookie) cookies.push(csrfCookie);
  COOKIE = cookies.join('; ');
  const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
  if (!session?.user?.email) throw new Error(`login failed for ${email}`);
  return session;
}

async function api(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE } });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.flat)) return v.flat;
  if (Array.isArray(v?.components)) return v.components;
  if (Array.isArray(v?.runs)) return v.runs;
  if (Array.isArray(v?.roles)) return v.roles;
  return null;
}

function expectEmpty(label, payload, { allowZeroObject = false } = {}) {
  const arr = asArray(payload);
  if (arr) {
    if (arr.length === 0) ok(`${label} empty list`);
    else fail(`${label} not empty`, `len=${arr.length} sample=${JSON.stringify(arr[0]).slice(0, 120)}`);
    return;
  }
  // overview/stats objects — all numeric counts should be 0
  const data = payload?.data ?? payload?.stats ?? payload;
  if (data && typeof data === 'object') {
    const nums = Object.entries(data).filter(([, v]) => typeof v === 'number');
    const nonzero = nums.filter(([, v]) => v !== 0);
    const mocky = JSON.stringify(data).match(/MacBook|Naincode|ThinkPad|Andi Saputra|dummy|demo-/i);
    if (mocky) fail(`${label} contains demo markers`, mocky[0]);
    else if (nonzero.length && !allowZeroObject) fail(`${label} nonzero stats`, nonzero.map(([k, v]) => `${k}=${v}`).join(','));
    else ok(`${label} empty/zero`);
    return;
  }
  ok(`${label} empty-ish (${typeof payload})`);
}

async function signup() {
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const email = `empty-qa-${stamp}@humanify.test`;
  const password = 'EmptyQaTest1!';
  const r = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Empty QA',
      email,
      password,
      companyName: `Empty QA Co ${stamp}`,
    }),
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(`signup failed: ${JSON.stringify(j)}`);
  return { email, password, tenantId: j.data.tenantId, slug: j.data.slug };
}

async function main() {
  console.log('SaaS fresh-tenant empty-state smoke');
  console.log('Target:', BASE);

  const t = await signup();
  ok(`signup ${t.slug}`);
  await login(t.email, t.password);
  ok('login');

  // Assets — must not return MacBook demos
  {
    const r = await api('/api/humanify/assets');
    const rows = r.json?.data || [];
    if (rows.length === 0) ok('assets empty');
    else fail('assets not empty', JSON.stringify(rows[0]).slice(0, 140));
    if (String(JSON.stringify(rows)).includes('MacBook')) fail('assets still mock MacBook');
  }

  // Organization — must not auto-seed Naincode tree
  {
    const r = await api('/api/humanify/organization?action=org-tree');
    const flat = r.json?.flat || r.json?.data || [];
    const flatArr = Array.isArray(flat) ? flat : [];
    if (flatArr.length === 0) ok('org-tree empty');
    else {
      const names = flatArr.map((x) => x.name || x.code).join(',');
      if (/Naincode|NAINCODE-GROUP/i.test(names)) fail('org-tree seeded Naincode', names.slice(0, 160));
      else fail('org-tree not empty', `len=${flatArr.length} ${names.slice(0, 160)}`);
    }
  }

  // Engagement / announcements
  expectEmpty('announcements', (await api('/api/humanify/engagement?action=announcements')).json);
  expectEmpty('surveys', (await api('/api/humanify/engagement?action=surveys')).json);
  expectEmpty('recognitions', (await api('/api/humanify/engagement?action=recognitions')).json);

  // Workforce analytics overview — zeros
  {
    const r = await api('/api/humanify/workforce-analytics?action=overview');
    const d = r.json?.data || {};
    if ((d.totalEmployees || 0) === 0 && (d.activeEmployees || 0) === 0) ok('workforce-analytics zero headcount');
    else fail('workforce-analytics leak', `total=${d.totalEmployees} active=${d.activeEmployees}`);
  }

  // Payroll overview stats
  {
    const r = await api('/api/humanify/payroll');
    const s = r.json?.stats || {};
    if ((s.totalEmployees || 0) === 0 && (s.monthlyPayroll || 0) === 0) ok('payroll stats zero');
    else fail('payroll stats leak', JSON.stringify(s));
  }

  // Certificates / performance / projects / IR / leave / kpi / assets summary
  expectEmpty('certificates', (await api('/api/humanify/certificates')).json);
  expectEmpty('performance', (await api('/api/humanify/performance')).json);
  expectEmpty('projects', (await api('/api/humanify/project-management')).json);
  expectEmpty('industrial-relations overview', (await api('/api/humanify/industrial-relations?action=overview')).json, { allowZeroObject: true });
  expectEmpty('leave types (tenant-owned)', (await api('/api/humanify/leave-management?action=types')).json);
  expectEmpty('kpi settings', (await api('/api/humanify/kpi-settings')).json);

  // Org settings counts
  {
    const r = await api('/api/humanify/integrations?action=org-settings');
    const d = r.json?.data || r.json || {};
    const blob = JSON.stringify(d);
    if (/Naincode/i.test(blob)) fail('org-settings mentions Naincode');
    else ok('org-settings no Naincode');
  }

  // Public careers for this slug — empty jobs OK
  {
    const r = await fetch(`${BASE}/api/public/careers?tenantSlug=${encodeURIComponent(t.slug)}`);
    const j = await r.json().catch(() => ({}));
    const jobs = j.data || j.jobs || j.openings || [];
    if (Array.isArray(jobs) && jobs.length === 0) ok('public careers empty for new slug');
    else if (!Array.isArray(jobs)) ok('public careers empty-ish response');
    else fail('public careers not empty', `len=${jobs.length}`);
  }

  // Roles — MAY be non-empty (system defaults allowed)
  {
    const r = await api('/api/humanify/roles');
    const roles = r.json?.roles || r.json?.data || [];
    if (Array.isArray(roles) && roles.length >= 0) ok(`roles catalog present (n=${roles.length}, system defaults OK)`);
    else ok('roles endpoint reachable');
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
