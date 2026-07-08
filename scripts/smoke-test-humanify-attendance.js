#!/usr/bin/env node
/**
 * Comprehensive smoke + light stress test for Humanify Kehadiran & Cuti module
 * Run: node scripts/smoke-test-humanify-attendance.js
 */
require('dotenv').config();

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@bedagang.com';
const PASSWORD = process.env.SMOKE_PASSWORD || 'superadmin123';

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

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || [])
    .find((c) => c.includes('next-auth.csrf-token'))?.split(';')[0] || '';

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD, json: 'true' }),
    redirect: 'manual',
  });

  const sessionCookies = (loginRes.headers.getSetCookie?.() || [])
    .filter((c) => c.includes('next-auth'))
    .map((c) => c.split(';')[0]);
  if (csrfCookie) sessionCookies.push(csrfCookie);
  COOKIE = sessionCookies.join('; ');

  const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
  if (!session?.user?.email) throw new Error('Login failed');
  ok(`authenticated as ${session.user.email} (${session.user.role})`);
  return session;
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

function isMock(body) {
  return body?._mock === true || body?.data?._mock === true;
}

function hasMockNames(arr, field = 'employeeName') {
  if (!Array.isArray(arr)) return false;
  return arr.some((r) => r[field] === 'Ahmad Wijaya' && String(r.employeeId) === '1');
}

async function testAttendanceApis(today, month) {
  console.log('\n── Attendance APIs ──');

  const mgmt = await api('GET', '/api/humanify/attendance-management');
  if (mgmt.res.status === 200 && (mgmt.json.success !== false)) {
    ok('GET attendance-management overview');
    if (isMock(mgmt.json)) fail('attendance-management returns _mock flag');
    else ok('attendance-management uses DB (no _mock)');
    const records = mgmt.json.todayRecords || mgmt.json.data?.todayRecords || [];
    ok(`live today: ${records.length} record(s)`);
  } else {
    fail('GET attendance-management', `HTTP ${mgmt.res.status}`);
  }

  for (const action of ['shifts', 'geofences', 'rotations', 'settings', 'today']) {
    const r = await api('GET', `/api/humanify/attendance-management?action=${action}`);
    if (r.res.status === 200) ok(`GET action=${action}`);
    else fail(`GET action=${action}`, `HTTP ${r.res.status}`);
  }

  const daily = await api('GET', `/api/humanify/attendance?period=${today}&view=daily`);
  if (daily.res.status === 200) {
    const payload = daily.json.data || daily.json;
    const records = payload.dailyRecords || [];
    if (Array.isArray(records)) ok(`daily view: ${records.length} record(s)`);
    else fail('daily view missing dailyRecords');
    if (hasMockNames(records)) fail('daily returns legacy mock Ahmad Wijaya');
    else if (records.length) ok('daily uses real data');
  } else {
    fail('GET daily attendance', `HTTP ${daily.res.status}`);
  }

  const monthly = await api('GET', `/api/humanify/attendance?period=${month}`);
  if (monthly.res.status === 200) {
    const payload = monthly.json.data || monthly.json;
    const att = payload.attendance || [];
    if (Array.isArray(att)) ok(`monthly view: ${att.length} employee(s)`);
    else fail('monthly missing attendance array');
    if (Array.isArray(payload.branchSummary)) ok(`branch summary: ${payload.branchSummary.length}`);
    if (hasMockNames(att)) fail('monthly returns legacy mock');
    else if (att.length) ok('monthly uses real data');
  } else {
    fail('GET monthly attendance', `HTTP ${monthly.res.status}`);
  }

  const settings = await api('GET', '/api/humanify/attendance/settings');
  if (settings.res.status === 200 && settings.json.success) {
    ok('GET attendance/settings');
    const d = settings.json.data;
    if (d?.lateGraceMinutes !== undefined) ok(`settings lateGraceMinutes=${d.lateGraceMinutes}`);
    else fail('settings missing lateGraceMinutes');
  } else {
    fail('GET attendance/settings', `HTTP ${settings.res.status}`);
  }

  const devices = await api('GET', '/api/humanify/attendance/devices');
  if (devices.res.status === 200 && devices.json.success) {
    ok(`GET devices: ${(devices.json.data || []).length} device(s)`);
    if (isMock(devices.json)) console.log('    (note: devices using mock fallback — table may be empty)');
  } else {
    fail('GET attendance/devices', `HTTP ${devices.res.status}`);
  }

  const dash = await api('GET', '/api/humanify/dashboard');
  if (dash.res.status === 200) ok('GET dashboard (attendance widget)');
  else fail('GET dashboard', `HTTP ${dash.res.status}`);

  const reports = await api('GET', '/api/humanify/reports-hub');
  if (reports.res.status === 200) ok('GET reports-hub');
  else fail('GET reports-hub', `HTTP ${reports.res.status}`);
}

async function testLeaveApis() {
  console.log('\n── Leave APIs ──');

  const overview = await api('GET', '/api/humanify/leave-management');
  if (overview.res.status === 200) {
    ok('GET leave-management overview');
    const types = overview.json.leaveTypes || overview.json.data?.leaveTypes || [];
    ok(`leave types: ${types.length}`);
  } else {
    fail('GET leave-management', `HTTP ${overview.res.status}`);
  }

  for (const action of ['types', 'balances', 'approval-configs', 'requests', 'pending-approvals']) {
    const r = await api('GET', `/api/humanify/leave-management?action=${action}`);
    if (r.res.status === 200) ok(`GET leave action=${action}`);
    else fail(`GET leave action=${action}`, `HTTP ${r.res.status}`);
  }
}

async function testExportApis(month) {
  console.log('\n── Export APIs ──');

  const exp = await api('GET', `/api/humanify/export?type=attendance&period=${month}`);
  if (exp.res.status === 200 && exp.json.success) {
    const data = exp.json.data || [];
    ok(`export attendance: ${data.length} row(s)`);
    const mock = exp.json.meta?.fallback === true;
    if (mock) fail('export attendance returns hardcoded mock fallback');
    else if (data.length) ok('export attendance uses DB data');
  } else {
    fail('GET export attendance', `HTTP ${exp.res.status} ${exp.json.error || ''}`);
  }

  const rt = await api('GET', `/api/humanify/realtime?period=${month}`);
  if (rt.res.status === 200) {
    const employees = rt.json.data?.employees || rt.json.employees || [];
    ok(`realtime: ${employees.length} employee metric(s)`);
  } else {
    fail('GET realtime', `HTTP ${rt.res.status}`);
  }
}

async function testCrudFlows(today) {
  console.log('\n── CRUD Flows ──');

  // Settings PUT
  const settingsPut = await api('PUT', '/api/humanify/attendance/settings', {
    lateGraceMinutes: 20,
    geoFenceRadius: 150,
    workStartTime: '08:00:00',
    workEndTime: '17:00:00',
  });
  if (settingsPut.res.status === 200 && settingsPut.json.success) {
    ok('PUT attendance/settings');
    const verify = await api('GET', '/api/humanify/attendance/settings');
    const grace = verify.json.data?.lateGraceMinutes;
    if (grace === 20) ok('settings persisted lateGraceMinutes=20');
    else fail('settings not persisted', `got ${grace}`);
  } else {
    fail('PUT attendance/settings', `HTTP ${settingsPut.res.status}`);
  }

  // Shift CRUD
  const shiftName = `Smoke Shift ${Date.now()}`;
  const shiftCreate = await api('POST', '/api/humanify/attendance-management?action=shift', {
    name: shiftName,
    startTime: '09:00',
    endTime: '18:00',
    breakMinutes: 60,
    color: '#3B82F6',
    isActive: true,
  });
  let shiftId = shiftCreate.json.data?.id || shiftCreate.json.id;
  if ((shiftCreate.res.status === 200 || shiftCreate.res.status === 201) && shiftCreate.json.success && shiftId) {
    ok(`POST shift created id=${shiftId}`);
  } else {
    fail('POST shift', shiftCreate.json.error || `HTTP ${shiftCreate.res.status}`);
  }

  if (shiftId) {
    const shiftUpdate = await api('PUT', `/api/humanify/attendance-management?action=shift&id=${shiftId}`, {
      name: shiftName + ' Updated',
      startTime: '09:00',
      endTime: '18:00',
      breakMinutes: 60,
      color: '#EF4444',
      isActive: true,
    });
    if (shiftUpdate.res.status === 200 && shiftUpdate.json.success) ok('PUT shift');
    else fail('PUT shift', `HTTP ${shiftUpdate.res.status}`);

    const shiftDel = await api('DELETE', `/api/humanify/attendance-management?action=shift&id=${shiftId}`);
    if (shiftDel.res.status === 200 && shiftDel.json.success) ok('DELETE shift');
    else fail('DELETE shift', `HTTP ${shiftDel.res.status}`);
  }

  // Geofence CRUD
  const geoName = `Smoke Geo ${Date.now()}`;
  const geoCreate = await api('POST', '/api/humanify/attendance-management?action=geofence', {
    name: geoName,
    latitude: -6.2088,
    longitude: 106.8456,
    radiusMeters: 100,
    isActive: true,
  });
  let geoId = geoCreate.json.data?.id || geoCreate.json.id;
  if ((geoCreate.res.status === 200 || geoCreate.res.status === 201) && geoCreate.json.success && geoId) {
    ok(`POST geofence id=${geoId}`);
    const geoDel = await api('DELETE', `/api/humanify/attendance-management?action=geofence&id=${geoId}`);
    if (geoDel.res.status === 200 && geoDel.json.success) ok('DELETE geofence');
    else fail('DELETE geofence', `HTTP ${geoDel.res.status}`);
  } else {
    fail('POST geofence', geoCreate.json.error || `HTTP ${geoCreate.res.status}`);
  }

  // Manual attendance POST
  const emps = await api('GET', '/api/humanify/employees?limit=1');
  const emp = (emps.json.data || emps.json.employees || [])[0];
  if (emp?.id) {
    const attPost = await api('POST', '/api/humanify/attendance', {
      employeeId: emp.id,
      date: today,
      clockIn: `${today}T08:00:00+07:00`,
      clockOut: `${today}T17:00:00+07:00`,
      status: 'present',
    });
    if (attPost.res.status === 200 || attPost.res.status === 201) {
      ok(`POST manual attendance for ${emp.name || emp.id}`);
    } else {
      fail('POST manual attendance', `HTTP ${attPost.res.status} ${attPost.json.error || ''}`);
    }
  } else {
    fail('POST manual attendance', 'no employee found');
  }
}

async function testBulkImport(today) {
  console.log('\n── Bulk Import ──');

  const emps = await api('GET', '/api/humanify/employees?limit=2');
  const list = emps.json.data || emps.json.employees || [];
  if (list.length === 0) {
    fail('bulk import', 'no employees');
    return;
  }

  const records = list.slice(0, 2).map((e, i) => ({
    employeeCode: e.employeeId || e.employee_code || e.employeeCode || e.id,
    date: today,
    clockIn: i === 0 ? '08:00' : '08:30',
    clockOut: '17:00',
    status: i === 0 ? 'present' : 'late',
    source: 'manual',
    notes: 'smoke-test import',
  }));

  const imp = await api('POST', '/api/humanify/attendance-bulk?action=import', { records });
  if (imp.res.status === 200 && imp.json.success) {
    ok(`bulk import: ${imp.json.imported} ok, ${imp.json.failed} failed`);
    if (imp.json.imported > 0) ok('bulk import persisted records');
    else fail('bulk import', '0 imported — ' + (imp.json.errors || []).join('; '));
  } else {
    fail('bulk import', `HTTP ${imp.res.status} ${imp.json.error || ''}`);
  }
}

async function stressTest(month) {
  console.log('\n── Light Stress Test (20 concurrent reads) ──');
  const paths = [
    `/api/humanify/attendance?period=${month}`,
    '/api/humanify/attendance-management',
    '/api/humanify/leave-management',
    '/api/humanify/attendance/settings',
    '/api/humanify/attendance/devices',
  ];

  const start = Date.now();
  const tasks = [];
  for (let i = 0; i < 20; i++) {
    const path = paths[i % paths.length];
    tasks.push(api('GET', path));
  }
  const results = await Promise.all(tasks);
  const elapsed = Date.now() - start;
  const errors = results.filter((r) => r.res.status >= 500);
  const okCount = results.filter((r) => r.res.status === 200).length;
  if (errors.length === 0) ok(`20 concurrent requests: ${okCount}/20 OK in ${elapsed}ms`);
  else fail(`stress test: ${errors.length} server errors in ${elapsed}ms`);
}

async function main() {
  console.log('Smoke + Stress Test: Humanify Kehadiran & Cuti\n');
  console.log('Target:', BASE);

  try {
    await login();
  } catch (e) {
    fail('login', e.message);
    process.exit(1);
  }

  const today = new Date().toISOString().split('T')[0];
  const month = today.slice(0, 7);

  await testAttendanceApis(today, month);
  await testLeaveApis();
  await testExportApis(month);
  await testCrudFlows(today);
  await testBulkImport(today);
  await stressTest(month);

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Result: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log('  -', f));
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
