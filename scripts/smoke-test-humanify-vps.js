#!/usr/bin/env node
/**
 * Comprehensive Humanify VPS smoke test — all pages + APIs
 * Usage: SMOKE_BASE_URL=http://43.157.243.54 node scripts/smoke-test-humanify-vps.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../humanify-repo/.env') });

const BASE = process.env.SMOKE_BASE_URL || 'http://43.157.243.54';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@bedagang.com';
const PASSWORDS = [process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean);
const UNIQUE = [...new Set(PASSWORDS)];

let COOKIE = '';
let passed = 0;
let failed = 0;
const failures = [];

const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => {
  const line = d ? `${m} — ${d}` : m;
  console.log('  ✗', line);
  failures.push(line);
  failed++;
};

const today = new Date().toISOString().split('T')[0];
const month = today.slice(0, 7);

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || [])
    .find((c) => c.includes('next-auth.csrf-token'))?.split(';')[0] || '';

  for (const pass of UNIQUE) {
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
    if (session?.user?.email) {
      ok(`login as ${session.user.email}`);
      return session;
    }
  }
  throw new Error('Login failed');
}

async function get(path, auth = true) {
  const res = await fetch(`${BASE}${path}`, {
    headers: auth ? { Cookie: COOKIE } : {},
    redirect: 'manual',
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 150) }; }
  return { res, json, text };
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
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 150), _html: text.startsWith('<!') }; }
  return { res, json };
}

function expectPage(path, { res }) {
  if ([200, 307, 308].includes(res.status)) ok(`page ${path}`);
  else fail(`page ${path}`, `HTTP ${res.status}`);
}

function expectApi(name, { res, json }, statuses = [200]) {
  if (!statuses.includes(res.status)) {
    fail(name, `HTTP ${res.status}${json.error ? ': ' + json.error : json._html ? ' (HTML)' : ''}`);
    return false;
  }
  if (json.success === false) {
    fail(name, json.error || 'success=false');
    return false;
  }
  ok(name);
  return true;
}

const PUBLIC_PAGES = [
  '/',
  '/humanify/welcome',
  '/humanify/login',
];

const AUTH_PAGES = [
  '/humanify',
  '/humanify/employees',
  '/humanify/attendance',
  '/humanify/attendance/daily',
  '/humanify/attendance/devices',
  '/humanify/attendance/settings',
  '/humanify/attendance-management',
  '/humanify/leave',
  '/humanify/kpi',
  '/humanify/kpi-settings',
  '/humanify/performance',
  '/humanify/payroll',
  '/humanify/payroll/main',
  '/humanify/payroll/bpjs',
  '/humanify/payroll/thr',
  '/humanify/payroll/laporan',
  '/humanify/payroll/lembur',
  '/humanify/payroll/pph21',
  '/humanify/payroll/slip-gaji',
  '/humanify/casual-workforce',
  '/humanify/recruitment',
  '/humanify/training',
  '/humanify/training-development',
  '/humanify/training-scoring',
  '/humanify/reports',
  '/humanify/activities',
  '/humanify/team-members',
  '/humanify/tasks',
  '/humanify/organization',
  '/humanify/mutations',
  '/humanify/workforce-analytics',
  '/humanify/travel-expense',
  '/humanify/engagement',
  '/humanify/announcements',
  '/humanify/onboarding',
  '/humanify/offboarding',
  '/humanify/contracts',
  '/humanify/industrial-relations',
  '/humanify/disciplinary-letters',
  '/humanify/project-management',
  '/humanify/ess',
  '/humanify/mss',
  '/humanify/calendar',
  '/employee',
];

const API_READS = [
  ['dashboard', 'GET', '/api/humanify/dashboard'],
  ['master-data', 'GET', '/api/humanify/master-data'],
  ['employees', 'GET', '/api/humanify/employees?limit=5'],
  ['employee-profile list', 'GET', '/api/humanify/employee-profile?action=list&limit=5'],
  ['employee-profile genealogy', 'GET', '/api/humanify/employee-profile?action=genealogy'],
  ['attendance monthly', 'GET', `/api/humanify/attendance?period=${month}`],
  ['attendance daily', 'GET', `/api/humanify/attendance?period=${today}&view=daily`],
  ['attendance-mgmt overview', 'GET', '/api/humanify/attendance-management?action=overview'],
  ['attendance-mgmt today', 'GET', '/api/humanify/attendance-management?action=today'],
  ['attendance-mgmt shifts', 'GET', '/api/humanify/attendance-management?action=shifts'],
  ['attendance devices', 'GET', '/api/humanify/attendance/devices'],
  ['attendance settings', 'GET', '/api/humanify/attendance/settings'],
  ['leave list', 'GET', '/api/humanify/leave'],
  ['leave-mgmt types', 'GET', '/api/humanify/leave-management?action=types'],
  ['leave-mgmt requests', 'GET', '/api/humanify/leave-management?action=requests'],
  ['payroll components', 'GET', '/api/humanify/payroll?action=components'],
  ['payroll runs', 'GET', '/api/humanify/payroll?action=runs'],
  ['payroll salaries', 'GET', '/api/humanify/payroll?action=employee-salaries'],
  ['casual overview', 'GET', '/api/humanify/casual-workforce?action=overview'],
  ['casual workers', 'GET', '/api/humanify/casual-workforce?action=casual-workers'],
  ['kpi list', 'GET', `/api/humanify/kpi?period=${month}`],
  ['kpi-settings', 'GET', '/api/humanify/kpi-settings'],
  ['kpi-templates', 'GET', '/api/humanify/kpi-templates'],
  ['performance', 'GET', '/api/humanify/performance'],
  ['performance-360', 'GET', '/api/humanify/performance-360'],
  ['recruitment openings', 'GET', '/api/humanify/recruitment?action=openings'],
  ['recruitment pipeline', 'GET', '/api/humanify/recruitment?action=pipeline'],
  ['training programs', 'GET', '/api/humanify/training?action=programs'],
  ['training-development', 'GET', '/api/humanify/training-development?action=dashboard'],
  ['training-scoring', 'GET', '/api/humanify/training-scoring?action=configs'],
  ['activities', 'GET', '/api/humanify/activities?limit=10'],
  ['team-members', 'GET', '/api/humanify/team-members?limit=5'],
  ['team-tasks', 'GET', '/api/humanify/team-tasks?limit=5'],
  ['org-tree', 'GET', '/api/humanify/organization?action=org-tree'],
  ['org summary', 'GET', '/api/humanify/organization?action=summary'],
  ['workforce overview', 'GET', '/api/humanify/workforce-analytics?action=overview'],
  ['reports-hub', 'GET', `/api/humanify/reports-hub?period=${month}`],
  ['overtime list', 'GET', '/api/humanify/overtime?action=list'],
  ['workflow summary', 'GET', '/api/humanify/workflow?action=summary'],
  ['workflow mutations', 'GET', '/api/humanify/workflow?action=mutations'],
  ['workflow claims', 'GET', '/api/humanify/workflow?action=claims'],
  ['lifecycle', 'GET', '/api/humanify/lifecycle?action=contracts-overview'],
  ['engagement', 'GET', '/api/humanify/engagement?action=overview'],
  ['industrial-relations', 'GET', '/api/humanify/industrial-relations?action=overview'],
  ['travel-expense', 'GET', '/api/humanify/travel-expense?action=overview'],
  ['project-management', 'GET', '/api/humanify/project-management?action=overview'],
  ['reminders', 'GET', '/api/humanify/reminders?action=list'],
  ['realtime', 'GET', '/api/humanify/realtime'],
];

const EMPLOYEE_APIS = [
  ['profile', '/api/employee/dashboard?action=profile'],
  ['attendance', '/api/employee/dashboard?action=attendance'],
  ['kpi', '/api/employee/dashboard?action=kpi'],
  ['leave-balance', '/api/employee/dashboard?action=leave-balance'],
  ['leave-requests', '/api/employee/dashboard?action=leave-requests'],
  ['claims', '/api/employee/dashboard?action=claims'],
  ['summary', '/api/employee/dashboard?action=summary'],
  ['announcements', '/api/employee/dashboard?action=announcements'],
  ['notifications', '/api/employee/dashboard?action=notifications'],
  ['field-visit', '/api/employee/field-visit?action=visits'],
];

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Humanify VPS Comprehensive Smoke Test');
  console.log('═══════════════════════════════════════');
  console.log('Target:', BASE);

  try {
    await login();
  } catch (e) {
    fail('login', e.message);
    process.exit(1);
  }

  console.log('\n══ Public pages ══');
  for (const p of PUBLIC_PAGES) {
    const r = await get(p, false);
    if ([200, 307, 308].includes(r.res.status)) ok(`public ${p}`);
    else fail(`public ${p}`, `HTTP ${r.res.status}`);
  }

  console.log('\n══ Authenticated pages ══');
  for (const p of AUTH_PAGES) {
    expectPage(p, await get(p));
  }

  console.log('\n══ Humanify APIs ══');
  for (const [name, method, path] of API_READS) {
    expectApi(name, await api(method, path));
  }

  console.log('\n══ Employee portal APIs ══');
  for (const [name, path] of EMPLOYEE_APIS) {
    expectApi(`employee/${name}`, await api('GET', path));
  }

  console.log('\n══ Auth session ══');
  const sess = await get('/api/auth/session');
  if (sess.json?.user?.email) ok('session has user');
  else fail('session', 'no user');

  console.log('\n══ CRUD smoke ══');
  const stamp = Date.now();
  const task = await api('POST', '/api/humanify/team-tasks', {
    title: `SMOKE ${stamp}`,
    status: 'todo',
    priority: 'medium',
    taskType: 'routine',
  });
  const taskId = task.json.data?.id || task.json.id;
  if ([200, 201].includes(task.res.status) && taskId) {
    ok('CRUD team-task create');
    const del = await api('DELETE', `/api/humanify/team-tasks?id=${taskId}`);
    if (del.res.status === 200) ok('CRUD team-task delete');
    else fail('CRUD team-task delete', `HTTP ${del.res.status}`);
  } else {
    fail('CRUD team-task create', `HTTP ${task.res.status}`);
  }

  const act = await api('POST', '/api/humanify/activities', {
    activityType: 'note',
    title: `SMOKE ${stamp}`,
    description: 'VPS smoke',
  });
  if ([200, 201].includes(act.res.status)) ok('CRUD activity create');
  else fail('CRUD activity create', `HTTP ${act.res.status}`);

  console.log('\n═══════════════════════════════════════');
  console.log(`Result: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log('  •', f));
  }
  console.log('═══════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
