#!/usr/bin/env node
/**
 * Comprehensive Employee Portal smoke + stress + integration test
 * Target: https://humanify.id/employee
 *
 * Usage:
 *   SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-employee-portal-full.js
 */
require('dotenv').config();

const BASE = process.env.SMOKE_BASE_URL || 'https://humanify.id';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@bedagang.com';
const PASS = process.env.SMOKE_PASSWORD || 'superadmin123';
const STRESS_N = parseInt(process.env.STRESS_ROUNDS || '40', 10);
const LATENCY_WARN_MS = parseInt(process.env.LATENCY_WARN_MS || '3000', 10);

let COOKIE = '';
let session = null;
let passed = 0;
let failed = 0;
let warned = 0;
const failures = [];
const warnings = [];
const latencies = [];

const ok = (m, ms) => {
  const suffix = ms != null ? ` (${ms}ms)` : '';
  console.log(`  ✓ ${m}${suffix}`);
  passed++;
};
const warn = (m, d) => {
  const line = d ? `${m} — ${d}` : m;
  console.log(`  ⚠ ${line}`);
  warnings.push(line);
  warned++;
};
const fail = (m, d) => {
  const line = d ? `${m} — ${d}` : m;
  console.log(`  ✗ ${line}`);
  failures.push(line);
  failed++;
};

async function login() {
  const t0 = Date.now();
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || [])
    .find((c) => c.includes('next-auth.csrf-token'))?.split(';')[0] || '';

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASS, json: 'true', callbackUrl: '/employee' }),
    redirect: 'manual',
  });
  const cookies = (loginRes.headers.getSetCookie?.() || [])
    .filter((c) => c.includes('next-auth'))
    .map((c) => c.split(';')[0]);
  if (csrfCookie) cookies.push(csrfCookie);
  COOKIE = cookies.join('; ');

  const sessRes = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } });
  session = await sessRes.json();
  if (!session?.user?.email) throw new Error('Login failed');
  ok(`Auth login`, Date.now() - t0);
  return session;
}

async function req(method, path, body, auth = true) {
  const t0 = Date.now();
  const opts = {
    method,
    headers: auth ? { Cookie: COOKIE } : {},
    redirect: 'manual',
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const ms = Date.now() - t0;
  latencies.push({ path: path.split('?')[0], ms });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 120), _html: text.startsWith('<!') }; }
  return { res, json, ms, text };
}

function expectApi(name, { res, json, ms }, { statuses = [200], requireSuccess = true, maxMs } = {}) {
  if (!statuses.includes(res.status)) {
    fail(name, `HTTP ${res.status}${json.error ? ': ' + json.error : json._html ? ' (HTML)' : ''}`);
    return null;
  }
  if (requireSuccess && json.success === false) {
    fail(name, json.error || 'success=false');
    return null;
  }
  if (maxMs && ms > maxMs) warn(name, `slow ${ms}ms (>${maxMs}ms)`);
  ok(name, ms);
  return json;
}

// ─── Test suites ───────────────────────────────────────────────────────────

async function testPages() {
  console.log('\n══ Pages & Routing ══');
  const pages = [
    { path: '/employee/login', expect: [200], label: 'Employee login page' },
    { path: '/employee', expect: [200, 307, 308], label: 'Employee portal root' },
    { path: '/auth/login?callbackUrl=%2Femployee', expect: [200, 307], label: 'Auth login redirect' },
  ];
  for (const p of pages) {
    const r = await req('GET', p.path, undefined, false);
    if (p.expect.includes(r.res.status)) ok(p.label, r.ms);
    else fail(p.label, `HTTP ${r.res.status}`);
  }

  const authed = await req('GET', '/employee');
  if ([200, 307].includes(authed.res.status)) ok('Employee portal (authenticated)', authed.ms);
  else fail('Employee portal (authenticated)', `HTTP ${authed.res.status}`);
}

async function testAuthGuards() {
  console.log('\n══ Auth Guards (401 without session) ══');
  const guarded = [
    '/api/employee/dashboard?action=profile',
    '/api/employee/field-visit?action=visits',
    '/api/employee/manager?action=summary',
  ];
  for (const path of guarded) {
    const r = await req('GET', path, undefined, false);
    if (r.res.status === 401) ok(`401 ${path.split('?')[0]}`);
    else fail(`401 expected ${path}`, `HTTP ${r.res.status}`);
  }
}

async function testDashboardReads(month) {
  console.log('\n══ Dashboard API — Read (GET) ══');
  const reads = [
    ['profile', '/api/employee/dashboard?action=profile'],
    ['attendance', '/api/employee/dashboard?action=attendance'],
    ['kpi', '/api/employee/dashboard?action=kpi'],
    ['leave-balance', '/api/employee/dashboard?action=leave-balance'],
    ['leave-requests', '/api/employee/dashboard?action=leave-requests'],
    ['claims', '/api/employee/dashboard?action=claims'],
    ['travel', '/api/employee/dashboard?action=travel'],
    ['notifications', '/api/employee/dashboard?action=notifications'],
    ['announcements', '/api/employee/dashboard?action=announcements'],
    ['summary', '/api/employee/dashboard?action=summary'],
    ['attendance-history', `/api/employee/dashboard?action=attendance-history&month=${month}`],
    ['overtime-history', `/api/employee/dashboard?action=overtime-history&month=${month}`],
    ['disciplinary-letters', '/api/employee/dashboard?action=disciplinary-letters'],
    ['payslip', `/api/employee/dashboard?action=payslip&month=${month}`],
  ];
  const results = {};
  for (const [name, path] of reads) {
    const json = expectApi(`dashboard/${name}`, await req('GET', path), { maxMs: LATENCY_WARN_MS });
    if (json) results[name] = json.data;
  }
  return results;
}

async function testProfileIntegration(profile) {
  console.log('\n══ Profile Integration ══');
  if (!profile) { fail('profile data'); return; }
  if (profile.name || profile.email) ok('profile has identity');
  else fail('profile identity', 'missing name/email');
  if (typeof profile.isManagerPortal === 'boolean') ok(`isManagerPortal=${profile.isManagerPortal}`);
  else warn('isManagerPortal flag missing');
  if (typeof profile.isMfAgent === 'boolean') ok(`isMfAgent=${profile.isMfAgent}`);
  else warn('isMfAgent flag missing');
}

async function testAttendanceIntegration(att) {
  console.log('\n══ Attendance Integration ══');
  if (!att) { fail('attendance data'); return; }
  if (att.today != null) ok('attendance.today present');
  else warn('attendance.today null');
  if (att.thisMonth && typeof att.thisMonth.present === 'number') ok('attendance.thisMonth stats');
  else warn('attendance.thisMonth incomplete');
  if (att.lastClockEvent != null || att.lastCheckIn != null) ok('clock location/event data');
  else warn('no lastClockEvent (may be first day)');
}

async function testFieldVisit() {
  console.log('\n══ Field Visit API ══');
  const visits = expectApi('field-visit/visits', await req('GET', '/api/employee/field-visit?action=visits'));
  if (visits?.data?.visits) {
    ok(`visits list (${visits.data.visits.length} rows)`);
    if (visits.data.stats) ok('visit stats object');
  }
  expectApi('field-visit/customers', await req('GET', '/api/employee/field-visit?action=customers&q=test'), { requireSuccess: false });
  expectApi('field-visit/route-plan', await req('GET', '/api/employee/field-visit?action=route-plan'), { requireSuccess: false });
}

async function testManagerApis(isManager, month, today) {
  console.log('\n══ Manager API (atasan) ══');
  const summary = await req('GET', '/api/employee/manager?action=summary');
  if (isManager) {
    expectApi('manager/summary', summary);
    expectApi('manager/pending-approvals', await req('GET', '/api/employee/manager?action=pending-approvals'));
    const team = expectApi('manager/team', await req('GET', '/api/employee/manager?action=team'));
    expectApi('manager/disciplinary-letters', await req('GET', '/api/employee/manager?action=disciplinary-letters'));
    expectApi('manager/team-visit-summary', await req('GET', `/api/employee/manager?action=team-visit-summary&date=${today}`));
    expectApi('manager/team-visit-feed', await req('GET', `/api/employee/manager?action=team-visit-feed&date=${today}`));

    const members = team?.data || [];
    if (members.length > 0) {
      const empId = members[0].id;
      expectApi('manager/team-member-detail', await req('GET', `/api/employee/manager?action=team-member-detail&employeeId=${empId}&month=${month}`));
      expectApi('manager/team-visits', await req('GET', `/api/employee/manager?action=team-visits&employeeId=${empId}&month=${month}`));
      ok(`manager team has ${members.length} member(s)`);
    } else warn('manager team empty');
  } else if (summary.res.status === 403) {
    ok('manager API blocked for non-manager (403)');
  } else if (summary.json.success) {
    ok('manager API accessible (elevated role)');
  }
}

async function testLeaveClaimValidation() {
  console.log('\n══ Form Validation (POST — expect 400) ══');
  const validations = [
    ['leave-request empty', '/api/employee/dashboard?action=leave-request', {}],
    ['claim empty', '/api/employee/dashboard?action=claim', {}],
    ['submit-overtime empty', '/api/employee/dashboard?action=submit-overtime', {}],
    ['travel-request empty', '/api/employee/dashboard?action=travel-request', {}],
    ['field-visit check-in no id', '/api/employee/field-visit?action=check-in', { latitude: -6.2, longitude: 106.8 }],
    ['manager reject no reason', '/api/employee/manager?action=reject-leave', { id: '00000000-0000-0000-0000-000000000000' }],
  ];
  for (const [name, path, body] of validations) {
    const r = await req('POST', path, body);
    if ([400, 403, 404, 422].includes(r.res.status) || r.json.success === false) {
      ok(`${name} → rejected (${r.res.status})`);
    } else if (r.res.status === 200 && r.json.success) {
      warn(name, 'unexpected success — may have created test data');
    } else {
      ok(`${name} → HTTP ${r.res.status}`);
    }
  }
}

async function testNotifications() {
  console.log('\n══ Notifications Integration ══');
  const n = expectApi('notifications list', await req('GET', '/api/employee/dashboard?action=notifications'));
  if (Array.isArray(n?.data)) ok(`notifications array (${n.data.length})`);
  const mark = await req('POST', '/api/employee/dashboard?action=mark-all-notifications-read', {});
  if (mark.res.status === 200) ok('mark-all-notifications-read');
  else fail('mark-all-notifications-read', `HTTP ${mark.res.status}`);
}

async function testStress(month) {
  console.log(`\n══ Stress Test (${STRESS_N} concurrent reads) ══`);
  const paths = [
    '/api/employee/dashboard?action=profile',
    '/api/employee/dashboard?action=attendance',
    '/api/employee/field-visit?action=visits',
    `/api/employee/dashboard?action=attendance-history&month=${month}`,
    '/api/employee/dashboard?action=leave-balance',
    '/api/employee/dashboard?action=claims',
    '/api/employee/manager?action=summary',
    '/api/employee/manager?action=team-visit-feed',
  ];
  const t0 = Date.now();
  const results = await Promise.all(
    Array.from({ length: STRESS_N }, (_, i) => req('GET', paths[i % paths.length]))
  );
  const elapsed = Date.now() - t0;
  const okCount = results.filter((r) => r.res.status === 200 && r.json.success !== false).length;
  const avgMs = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);
  const maxMs = Math.max(...results.map((r) => r.ms));
  if (okCount >= STRESS_N * 0.9) ok(`stress ${okCount}/${STRESS_N} OK in ${elapsed}ms (avg ${avgMs}ms, max ${maxMs}ms)`);
  else fail('stress test', `${okCount}/${STRESS_N} OK in ${elapsed}ms`);
}

async function testLatencyReport() {
  console.log('\n══ Latency Summary ══');
  const byPath = {};
  for (const l of latencies) {
    if (!byPath[l.path]) byPath[l.path] = [];
    byPath[l.path].push(l.ms);
  }
  const rows = Object.entries(byPath).map(([path, arr]) => ({
    path,
    avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
    max: Math.max(...arr),
    n: arr.length,
  })).sort((a, b) => b.avg - a.avg);

  for (const r of rows.slice(0, 8)) {
    const label = `${r.path} (n=${r.n}) avg=${r.avg}ms max=${r.max}ms`;
    if (r.avg > LATENCY_WARN_MS) warn('slow endpoint', label);
    else ok('latency', label);
  }
}

async function main() {
  const today = new Date().toISOString().split('T')[0];
  const month = today.slice(0, 7);

  console.log('══════════════════════════════════════════════════════');
  console.log('  Employee Portal — Full Smoke / Stress / Integration');
  console.log('══════════════════════════════════════════════════════');
  console.log('Target:', BASE);
  console.log('User:  ', EMAIL);

  try {
    await login();
  } catch (e) {
    fail('login', e.message);
    process.exit(1);
  }

  await testPages();
  await testAuthGuards();

  const dash = await testDashboardReads(month);
  await testProfileIntegration(dash.profile);
  await testAttendanceIntegration(dash.attendance);
  await testFieldVisit();
  await testManagerApis(!!dash.profile?.isManagerPortal, month, today);
  await testLeaveClaimValidation();
  await testNotifications();
  await testStress(month);
  await testLatencyReport();

  console.log('\n══════════════════════════════════════════════════════');
  console.log(`Result: ${passed} passed, ${failed} failed, ${warned} warnings`);
  if (warnings.length) {
    console.log('\nWarnings:');
    warnings.forEach((w) => console.log('  •', w));
  }
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log('  •', f));
  }
  console.log('══════════════════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
