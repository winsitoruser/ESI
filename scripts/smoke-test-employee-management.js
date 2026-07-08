#!/usr/bin/env node
/**
 * Employee Management smoke test — master data, org, lifecycle, ESS/MSS
 * Run: npm run smoke:employee-mgmt
 */
require('dotenv').config();

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@bedagang.com';
const PASSWORDS = [process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean);

let COOKIE = '';
let passed = 0;
let failed = 0;
const failures = [];
const stamp = Date.now();

const ok = (msg) => { console.log('  ✓', msg); passed++; };
const fail = (msg, detail) => {
  const line = detail ? `${msg} — ${detail}` : msg;
  console.log('  ✗', line);
  failures.push(line);
  failed++;
};

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || [])
    .find((c) => c.includes('next-auth.csrf-token'))?.split(';')[0] || '';

  for (const pass of PASSWORDS) {
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
      body: new URLSearchParams({ csrfToken, email: EMAIL, password: pass, json: 'true' }),
      redirect: 'manual',
    });
    const sessionCookies = (loginRes.headers.getSetCookie?.() || [])
      .filter((c) => c.includes('next-auth'))
      .map((c) => c.split(';')[0]);
    if (csrfCookie) sessionCookies.push(csrfCookie);
    COOKIE = sessionCookies.join('; ');
    const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
    if (session?.user?.email) { ok(`login as ${session.user.email}`); return session; }
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
  let bodyJson = {};
  const text = await res.text();
  try { bodyJson = JSON.parse(text); } catch { bodyJson = { _raw: text.slice(0, 200) }; }
  return { res, body: bodyJson };
}

function expectOk(name, { res, body }) {
  if (res.status !== 200) { fail(name, `HTTP ${res.status} ${body.error || body._raw || ''}`); return false; }
  if (body.success === false) { fail(name, body.error || 'success=false'); return false; }
  ok(name);
  return true;
}

async function testPages() {
  console.log('\n══ Employee Management Pages ══');
  for (const p of [
    '/humanify/employees', '/humanify/organization', '/humanify/onboarding',
    '/humanify/offboarding', '/humanify/contracts', '/humanify/ess', '/humanify/mss',
  ]) {
    const res = await fetch(`${BASE}${p}`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
    if (res.status === 200) ok(`page ${p}`);
    else fail(`page ${p}`, `HTTP ${res.status}`);
  }
}

async function testReadApis() {
  console.log('\n══ Read APIs ══');
  const reads = [
    '/api/humanify/employee-profile?action=list&limit=5',
    '/api/humanify/master-data',
    '/api/humanify/organization?action=org-tree',
    '/api/humanify/organization?action=job-grades',
    '/api/humanify/organization?action=summary',
    '/api/humanify/lifecycle?action=onboarding',
    '/api/humanify/lifecycle?action=offboarding',
    '/api/humanify/lifecycle?action=contracts-overview',
    '/api/humanify/lifecycle?action=onboarding-candidates',
    '/api/humanify/lifecycle?action=templates',
    '/api/humanify/reminders?action=summary',
    '/api/humanify/reminders?action=upcoming&days=60',
    '/api/humanify/workflow?action=summary',
    '/api/humanify/workflow?action=claims',
    '/api/humanify/workflow?action=mutations',
  ];
  for (const path of reads) expectOk(path.split('?')[0].split('/').pop() + '…', await api('GET', path));
}

async function testLifecycleCrud() {
  console.log('\n══ Lifecycle CRUD ══');

  const empRes = await api('GET', '/api/humanify/employee-profile?action=list&limit=1');
  const emp = empRes.body.data?.[0];
  if (!emp?.id) { fail('lifecycle CRUD', 'no employee for test'); return; }
  ok(`employee fixture: ${emp.name || emp.id}`);

  // Onboarding create
  const onb = await api('POST', '/api/humanify/lifecycle?action=onboarding', {
    employeeId: emp.id,
    employeeName: emp.name || 'Test',
    position: emp.position,
    department: emp.department,
  });
  if (!expectOk('onboarding CREATE', onb)) return;
  const onbId = onb.body.data?.id;
  if (!onbId) { fail('onboarding CREATE', 'no id'); return; }

  // Task toggle
  const task = await api('PUT', `/api/humanify/lifecycle?action=onboarding-task&id=${onbId}`, {
    taskKey: 'doc_kontrak', completed: true,
  });
  expectOk('onboarding-task UPDATE', task);

  // List persistence
  const list = await api('GET', '/api/humanify/lifecycle?action=onboarding');
  const found = (list.body.data || []).some((x) => x.id === onbId);
  if (found) ok('onboarding READ persisted');
  else fail('onboarding READ', 'entry not found after create');

  // Offboarding create
  const off = await api('POST', '/api/humanify/lifecycle?action=offboarding', {
    employeeId: emp.id,
    employeeName: emp.name || 'Test',
    reason: `Smoke test ${stamp}`,
    reasonCategory: 'resignation',
  });
  if (!expectOk('offboarding CREATE', off)) return;
  const offId = off.body.data?.id;

  // Contract create (if employee exists)
  const contract = await api('POST', '/api/humanify/lifecycle?action=contract', {
    employeeId: emp.id,
    contractType: 'PKWT',
    contractNumber: `SMOKE-${stamp}`,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    status: 'active',
    position: emp.position,
    department: emp.department,
  });
  if (contract.res.status === 200) ok('contract CREATE');
  else fail('contract CREATE', `HTTP ${contract.res.status}`);

  // Cleanup
  if (onbId) {
    const del = await api('DELETE', `/api/humanify/lifecycle?action=onboarding&id=${onbId}`);
    if (del.res.status === 200) ok('onboarding DELETE');
    else fail('onboarding DELETE', `HTTP ${del.res.status}`);
  }
  if (offId) {
    const del = await api('DELETE', `/api/humanify/lifecycle?action=offboarding&id=${offId}`);
    if (del.res.status === 200) ok('offboarding DELETE');
    else fail('offboarding DELETE', `HTTP ${del.res.status}`);
  }

  // Reminders generate
  const gen = await api('POST', '/api/humanify/reminders?action=generate');
  if (gen.res.status === 200) ok('reminders generate');
  else fail('reminders generate', `HTTP ${gen.res.status}`);
}

async function testOrgCrud() {
  console.log('\n══ Organization CRUD ══');
  const create = await api('POST', '/api/humanify/organization?action=org', {
    name: `Smoke Unit ${stamp}`,
    code: `SMK${String(stamp).slice(-4)}`,
    level: 1,
    sort_order: 99,
  });
  if (create.res.status !== 200) { fail('org CREATE', `HTTP ${create.res.status}`); return; }
  ok('org CREATE');
  const orgId = create.body.data?.id;
  if (orgId) {
    const del = await api('DELETE', `/api/humanify/organization?action=org&id=${orgId}`);
    if (del.res.status === 200) ok('org DELETE');
    else fail('org DELETE', `HTTP ${del.res.status}`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Employee Management Smoke Test');
  console.log('═══════════════════════════════════════');
  console.log('Target:', BASE);

  try { await login(); } catch (e) {
    fail('login', e.message);
    process.exit(1);
  }

  await testPages();
  await testReadApis();
  await testLifecycleCrud();
  await testOrgCrud();

  console.log('\n═══════════════════════════════════════');
  console.log(`Result: ${passed} passed, ${failed} failed`);
  if (failures.length) failures.forEach((f) => console.log('  •', f));
  console.log('═══════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
