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
  '/humanify/calendar',
  '/humanify/announcements',
  '/humanify/employees',
  '/humanify/organization',
  '/humanify/onboarding',
  '/humanify/offboarding',
  '/humanify/contracts',
  '/humanify/assets',
  '/humanify/esign',
  '/humanify/org-settings',
  '/humanify/ess',
  '/humanify/mss',
  '/humanify/attendance',
  '/humanify/attendance-management',
  '/humanify/attendance/daily',
  '/humanify/attendance/devices',
  '/humanify/attendance/settings',
  '/humanify/leave',
  '/humanify/okr',
  '/humanify/kpi',
  '/humanify/kpi-settings',
  '/humanify/performance',
  '/humanify/engagement',
  '/humanify/payroll',
  '/humanify/payroll/main',
  '/humanify/payroll/slip-gaji',
  '/humanify/payroll/thr',
  '/humanify/payroll/pph21',
  '/humanify/payroll/bpjs',
  '/humanify/payroll/lembur',
  '/humanify/payroll/bonus',
  '/humanify/payroll/cash-advance',
  '/humanify/payroll/loan',
  '/humanify/payroll/laporan',
  '/humanify/payroll/disbursement',
  '/humanify/reimbursement',
  '/humanify/casual-workforce',
  '/humanify/recruitment',
  '/humanify/training',
  '/humanify/training-development',
  '/humanify/training-scoring',
  '/humanify/certificates',
  '/humanify/team-members',
  '/humanify/tasks',
  '/humanify/activities',
  '/humanify/mutations',
  '/humanify/travel-expense',
  '/humanify/project-management',
  '/humanify/industrial-relations',
  '/humanify/disciplinary-letters',
  '/humanify/reports',
  '/humanify/workforce-analytics',
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
  ['reminders summary', 'GET', '/api/humanify/reminders?action=summary'],
  ['reminders upcoming', 'GET', '/api/humanify/reminders?action=upcoming&days=60'],
  ['lifecycle onboarding', 'GET', '/api/humanify/lifecycle?action=onboarding'],
  ['lifecycle offboarding', 'GET', '/api/humanify/lifecycle?action=offboarding'],
  ['lifecycle contracts', 'GET', '/api/humanify/lifecycle?action=contracts'],
  ['employee-documents', 'GET', '/api/humanify/employee-documents?action=completeness&employee_id=__EMP__'],
  ['nine-box', 'GET', '/api/humanify/nine-box'],
  ['okr', 'GET', '/api/humanify/okr?action=overview'],
  ['assets', 'GET', '/api/humanify/assets?action=overview'],
  ['reimbursement expenses', 'GET', '/api/humanify/travel-expense?action=expenses'],
  ['certificates', 'GET', '/api/humanify/certificates?action=list'],
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
  const empList = await api('GET', '/api/humanify/employee-profile?action=list&limit=1');
  const firstEmpId = empList.json?.data?.[0]?.id || '';
  for (const [name, method, path] of API_READS) {
    const resolved = path.replace('__EMP__', firstEmpId || '00000000-0000-0000-0000-000000000001');
    if (path.includes('__EMP__') && !firstEmpId) {
      fail(name, 'no employee for document test');
      continue;
    }
    expectApi(name, await api(method, resolved));
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

  // Org CRUD
  const org = await api('POST', '/api/humanify/organization?action=org', {
    name: `SMOKE ORG ${stamp}`,
    code: `SMK${String(stamp).slice(-4)}`,
    level: 1,
    sort_order: 99,
  });
  const orgId = org.json.data?.id;
  if (org.res.status === 200 && orgId) {
    ok('CRUD org create');
    const delOrg = await api('DELETE', `/api/humanify/organization?action=org&id=${orgId}`);
    if (delOrg.res.status === 200) ok('CRUD org delete');
    else fail('CRUD org delete', `HTTP ${delOrg.res.status}`);
  } else {
    fail('CRUD org create', `HTTP ${org.res.status}`);
  }

  // Reminders generate
  const gen = await api('POST', '/api/humanify/reminders?action=generate');
  if (gen.res.status === 200) ok('CRUD reminders generate');
  else fail('CRUD reminders generate', `HTTP ${gen.res.status}`);

  console.log('\n══ Stress test (30 concurrent reads) ══');
  const stressPaths = [
    '/api/humanify/dashboard',
    '/api/humanify/employees?limit=5',
    '/api/humanify/organization?action=org-tree',
    '/api/humanify/lifecycle?action=contracts-overview',
    '/api/humanify/payroll?action=runs',
    '/api/humanify/attendance?period=' + month,
  ];
  const stressStart = Date.now();
  const stressResults = await Promise.all(
    Array.from({ length: 30 }, (_, i) => api('GET', stressPaths[i % stressPaths.length]))
  );
  const stressOk = stressResults.filter((r) => r.res.status === 200).length;
  const stressMs = Date.now() - stressStart;
  if (stressOk === 30) ok(`Stress ${stressOk}/30 in ${stressMs}ms`);
  else fail('Stress test', `${stressOk}/30 OK in ${stressMs}ms`);

  console.log('\n══ DevOps / System ══');
  const healthPaths = [
    ['auth csrf', '/api/auth/csrf', false],
    ['auth providers', '/api/auth/providers', false],
    ['login page', '/humanify/login', false],
  ];
  for (const [name, path, auth] of healthPaths) {
    const r = await get(path, auth);
    if ([200, 307, 308].includes(r.res.status)) ok(`devops ${name}`);
    else fail(`devops ${name}`, `HTTP ${r.res.status}`);
  }
  const t0 = Date.now();
  const dash = await api('GET', '/api/humanify/dashboard');
  const dashMs = Date.now() - t0;
  if (dash.res.status === 200 && dashMs < 5000) ok(`latency dashboard ${dashMs}ms`);
  else if (dash.res.status === 200) fail('latency dashboard', `${dashMs}ms (>5s)`);
  else fail('latency dashboard', `HTTP ${dash.res.status}`);

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
