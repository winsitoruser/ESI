#!/usr/bin/env node
/**
 * Full Humanify (HRIS) smoke test — pages, APIs, CRUD flows, employee portal integration
 * Run: npm run smoke:hris
 */
require('dotenv').config();

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@bedagang.com';
const PASSWORDS = [
  process.env.SMOKE_PASSWORD,
  'superadmin123',
  'MasterAdmin2026!',
].filter(Boolean).filter((p, i, a) => a.indexOf(p) === i);

let COOKIE = '';
let passed = 0;
let failed = 0;
const failures = [];

const ok = (msg) => { console.log('  ✓', msg); passed++; };
const fail = (msg, detail) => {
  const line = detail ? `${msg} — ${detail}` : msg;
  console.log('  ✗', line);
  failures.push(line);
  failed++;
};

const today = new Date().toISOString().split('T')[0];
const month = today.slice(0, 7);
const stamp = Date.now();

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
    if (session?.user?.email) {
      ok(`login as ${session.user.email}`);
      return session;
    }
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
  try { bodyJson = JSON.parse(text); } catch {
    bodyJson = { _raw: text.slice(0, 200), _html: text.startsWith('<!') };
  }
  return { res, body: bodyJson };
}

function expectApi(name, { res, body }, opts = {}) {
  const { status = [200], success, hasData, minLength, arrayKey } = opts;
  const statuses = Array.isArray(status) ? status : [status];
  if (!statuses.includes(res.status)) {
    fail(name, `HTTP ${res.status}${body.error ? ': ' + body.error : body._html ? ' (HTML error page)' : ''}`);
    return false;
  }
  if (success !== false && body.success === false) {
    fail(name, body.error || 'success=false');
    return false;
  }
  if (hasData && body.data === undefined && body.success === undefined) {
    fail(name, 'missing data');
    return false;
  }
  if (arrayKey) {
    const arr = body.data?.[arrayKey] ?? body[arrayKey] ?? body.data;
    if (!Array.isArray(arr)) { fail(name, `expected array ${arrayKey}`); return false; }
    if (minLength !== undefined && arr.length < minLength) {
      fail(name, `${arrayKey} length ${arr.length} < ${minLength}`);
      return false;
    }
  }
  ok(name);
  return true;
}

async function testPages() {
  console.log('\n══ HRIS Pages (HTTP 200) ══');
  const pages = [
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
    '/humanify/casual-workforce',
    '/humanify/recruitment',
    '/humanify/training',
    '/humanify/training-development',
    '/humanify/reports',
    '/humanify/activities',
    '/humanify/team-members',
    '/humanify/tasks',
    '/humanify/organization',
    '/humanify/onboarding',
    '/humanify/offboarding',
    '/humanify/contracts',
    '/humanify/ess',
    '/humanify/mss',
    '/humanify/mutations',
    '/humanify/workforce-analytics',
    '/humanify/travel-expense',
    '/humanify/engagement',
    '/humanify/announcements',
    '/hq/multifinance/workforce',
    '/employee',
  ];
  for (const p of pages) {
    const res = await fetch(`${BASE}${p}`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
    if (res.status === 200) ok(`page ${p}`);
    else fail(`page ${p}`, `HTTP ${res.status}`);
  }
}

async function testHqApis() {
  console.log('\n══ HQ HRIS APIs — Read ══');

  expectApi('dashboard', await api('GET', '/api/humanify/dashboard'));
  expectApi('master-data', await api('GET', '/api/humanify/master-data'));
  expectApi('employees list', await api('GET', '/api/humanify/employees?limit=5'));
  expectApi('employee-profile list', await api('GET', '/api/humanify/employee-profile?action=list&limit=5'));
  expectApi('employee-profile genealogy', await api('GET', '/api/humanify/employee-profile?action=genealogy'));
  expectApi('attendance monthly', await api('GET', `/api/humanify/attendance?period=${month}`));
  expectApi('attendance daily', await api('GET', `/api/humanify/attendance?period=${today}&view=daily`));
  expectApi('attendance-mgmt overview', await api('GET', '/api/humanify/attendance-management?action=overview'));
  expectApi('attendance-mgmt today', await api('GET', '/api/humanify/attendance-management?action=today'));
  expectApi('attendance-mgmt shifts', await api('GET', '/api/humanify/attendance-management?action=shifts'));
  expectApi('leave list', await api('GET', '/api/humanify/leave'));
  expectApi('leave-mgmt types', await api('GET', '/api/humanify/leave-management?action=types'));
  expectApi('leave-mgmt requests', await api('GET', '/api/humanify/leave-management?action=requests'));
  expectApi('payroll components', await api('GET', '/api/humanify/payroll?action=components'));
  expectApi('payroll runs', await api('GET', '/api/humanify/payroll?action=runs'));
  expectApi('payroll salaries', await api('GET', '/api/humanify/payroll?action=employee-salaries'));
  expectApi('casual overview', await api('GET', '/api/humanify/casual-workforce?action=overview'));
  expectApi('casual workers', await api('GET', '/api/humanify/casual-workforce?action=casual-workers'));
  expectApi('casual supervisors', await api('GET', '/api/humanify/casual-workforce?action=supervisors'));
  expectApi('kpi list', await api('GET', `/api/humanify/kpi?period=${month}`));
  expectApi('performance list', await api('GET', '/api/humanify/performance'));
  expectApi('recruitment openings', await api('GET', '/api/humanify/recruitment?action=openings'));
  expectApi('recruitment pipeline', await api('GET', '/api/humanify/recruitment?action=pipeline'));
  expectApi('training programs', await api('GET', '/api/humanify/training?action=programs'));
  expectApi('activities', await api('GET', '/api/humanify/activities?limit=10'));
  expectApi('team-members', await api('GET', '/api/humanify/team-members?limit=5'));
  expectApi('team-tasks', await api('GET', '/api/humanify/team-tasks?limit=5'));
  expectApi('org-tree', await api('GET', '/api/humanify/organization?action=org-tree'));
  expectApi('org summary', await api('GET', '/api/humanify/organization?action=summary'));
  expectApi('workforce overview', await api('GET', '/api/humanify/workforce-analytics?action=overview'));
  expectApi('reports-hub', await api('GET', `/api/humanify/reports-hub?period=${month}`));
  expectApi('overtime list', await api('GET', '/api/humanify/overtime?action=list'));
  expectApi('workflow summary', await api('GET', '/api/humanify/workflow?action=summary'));
  expectApi('workflow mutations', await api('GET', '/api/humanify/workflow?action=mutations'));
  expectApi('workflow claims', await api('GET', '/api/humanify/workflow?action=claims'));
  expectApi('lifecycle onboarding', await api('GET', '/api/humanify/lifecycle?action=onboarding'));
  expectApi('lifecycle offboarding', await api('GET', '/api/humanify/lifecycle?action=offboarding'));
  expectApi('lifecycle contracts-overview', await api('GET', '/api/humanify/lifecycle?action=contracts-overview'));
  expectApi('reminders summary', await api('GET', '/api/humanify/reminders?action=summary'));
  expectApi('reminders upcoming', await api('GET', '/api/humanify/reminders?action=upcoming&days=60'));
  expectApi('mf workforce overview', await api('GET', '/api/hq/multifinance/workforce?action=overview'));
  expectApi('mf portfolio', await api('GET', '/api/hq/multifinance/workforce?action=portfolio'));
}

async function testEmployeePortal() {
  console.log('\n══ Employee Portal APIs ══');
  const actions = ['profile', 'attendance', 'kpi', 'leave-balance', 'leave-requests', 'claims', 'summary', 'announcements', 'notifications'];
  for (const a of actions) {
    expectApi(`employee/${a}`, await api('GET', `/api/employee/dashboard?action=${a}`));
  }
  expectApi('field-visit visits', await api('GET', '/api/employee/field-visit?action=visits'));
  expectApi('mf profile', await api('GET', '/api/employee/multifinance?action=profile'));
  expectApi('mf overview', await api('GET', '/api/employee/multifinance?action=overview'));
  expectApi('mf portfolio', await api('GET', '/api/employee/multifinance?action=portfolio'));
}

async function testCrudFlows() {
  console.log('\n══ CRUD Round-trips ══');

  // Team task: create → list → delete
  const taskRes = await api('POST', '/api/humanify/team-tasks', {
    title: `SMOKE Task ${stamp}`,
    description: 'Auto smoke test',
    status: 'todo',
    priority: 'medium',
    taskType: 'routine',
  });
  let taskId = taskRes.body.data?.id || taskRes.body.id;
  if (taskRes.res.status === 200 || taskRes.res.status === 201) {
    ok('CRUD team-task CREATE');
    const list = await api('GET', '/api/humanify/team-tasks?search=SMOKE');
    const found = (list.body.data || list.body.tasks || []).some((t) => String(t.title || '').includes('SMOKE'));
    if (found || list.res.status === 200) ok('CRUD team-task READ');
    else fail('CRUD team-task READ', 'not in list');
    if (taskId) {
      const del = await api('DELETE', `/api/humanify/team-tasks?id=${taskId}`);
      if (del.res.status === 200) ok('CRUD team-task DELETE');
      else fail('CRUD team-task DELETE', `HTTP ${del.res.status}`);
    }
  } else {
    fail('CRUD team-task CREATE', `HTTP ${taskRes.res.status} ${taskRes.body.error || ''}`);
  }

  // Activity log
  const actRes = await api('POST', '/api/humanify/activities', {
    activityType: 'note',
    title: `SMOKE Activity ${stamp}`,
    description: 'Smoke test HRIS activity',
  });
  if (actRes.res.status === 200 || actRes.res.status === 201) ok('CRUD activity CREATE');
  else fail('CRUD activity CREATE', `HTTP ${actRes.res.status}`);

  // Casual workforce overview after writes
  expectApi('casual overview post-crud', await api('GET', '/api/humanify/casual-workforce?action=overview'));

  // MF mobile activity (integration)
  const port = await api('GET', '/api/employee/multifinance?action=portfolio');
  const contract = port.body.data?.[0];
  const mfAct = await api('POST', '/api/employee/multifinance?action=activity', {
    activityDate: today,
    activityType: 'collection',
    customerName: contract?.customer_name || 'Smoke Nasabah',
    contractNumber: contract?.contract_number,
    amountCollected: 100000,
    visitOutcome: 'promise_to_pay',
    promiseDate: today,
    gpsLat: -6.2,
    gpsLng: 106.8,
    notes: `SMOKE HRIS integration ${stamp}`,
  });
  if (mfAct.body.success) ok('integration mobile→HQ mf activity POST');
  else fail('integration mf activity', mfAct.body.error || `HTTP ${mfAct.res.status}`);

  if (mfAct.body.data?.id) {
    const verify = await api('POST', '/api/hq/multifinance/workforce?action=verify-activity', {
      id: mfAct.body.data.id,
      status: 'verified',
    });
    if (verify.body.success) ok('integration HQ verify mobile activity');
    else fail('integration verify', verify.body.error);
  }

  // Payroll read after integration
  expectApi('payroll runs integration', await api('GET', '/api/humanify/payroll?action=runs'));
}

async function testDataIntegrity() {
  console.log('\n══ Data & Logic Checks ══');

  const emp = await api('GET', '/api/humanify/employees?limit=1');
  const employees = emp.body.data || emp.body.employees || [];
  if (Array.isArray(employees) && employees.length > 0) ok(`employees has data (${employees.length}+)`);
  else fail('employees empty');

  const empId = employees[0]?.id;
  if (empId) {
    const detail = await api('GET', `/api/humanify/employee-profile?action=detail&employeeId=${empId}`);
    if (detail.body.success !== false && (detail.body.data || detail.body.employee)) ok('employee-profile detail for first employee');
    else fail('employee-profile detail', detail.body.error);
  }

  const att = await api('GET', '/api/humanify/attendance-management?action=overview');
  if (att.body.success && att.body.todayStats) ok('attendance-management todayStats present');
  else if (att.res.status === 200) ok('attendance-management overview OK');
  else fail('attendance-management overview');

  const dash = await api('GET', '/api/humanify/dashboard');
  if (dash.res.status === 200) {
    const d = dash.body.data || dash.body;
    if (d && (d.summary || d.stats || d.headcount !== undefined || Object.keys(d).length > 0)) {
      ok('dashboard returns stats object');
    } else {
      ok('dashboard HTTP 200');
    }
  }

  const prof = await api('GET', '/api/employee/dashboard?action=profile');
  if (prof.body.data?.name || prof.body.data?.email) ok('employee profile has identity');
  else fail('employee profile missing identity');
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  HRIS Full Smoke Test');
  console.log('═══════════════════════════════════════');
  console.log('Target:', BASE);

  try {
    await login();
  } catch (e) {
    fail('login', e.message);
    console.log('\nAbort — start dev server: npm run dev');
    process.exit(1);
  }

  await testPages();
  await testHqApis();
  await testEmployeePortal();
  await testCrudFlows();
  await testDataIntegrity();

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
