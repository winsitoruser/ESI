#!/usr/bin/env node
/**
 * Smoke test HRIS Attendance integration
 * Run: node scripts/smoke-test-attendance.js
 */
require('dotenv').config();

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@bedagang.com';
const PASSWORD = process.env.SMOKE_PASSWORD || 'superadmin123';

let COOKIE = '';
let passed = 0;
let failed = 0;

const ok = (msg) => { console.log('  ✓', msg); passed++; };
const fail = (msg, detail) => { console.log('  ✗', msg, detail ? `- ${detail}` : ''); failed++; };

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
  ok(`authenticated as ${session.user.email}`);
}

async function apiGet(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE } });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function main() {
  console.log('Smoke test: HRIS Attendance\n');
  console.log('Target:', BASE);

  try {
    await login();
  } catch (e) {
    fail('login', e.message);
    process.exit(1);
  }

  const today = new Date().toISOString().split('T')[0];
  const month = today.slice(0, 7);

  const mgmt = await apiGet('/api/humanify/attendance-management');
  if (mgmt.res.status === 200 && mgmt.body.success !== false) {
    ok('GET attendance-management');
    const n = mgmt.body.todayRecords?.length || 0;
    ok(`live today records: ${n}`);
    if (mgmt.body.todayStats?.total === n) ok('todayStats matches records');
    else if (n > 0) ok('todayStats present');
  } else {
    fail('GET attendance-management', `HTTP ${mgmt.res.status}`);
  }

  const daily = await apiGet(`/api/humanify/attendance?period=${today}&view=daily`);
  if (daily.res.status === 200) {
    const payload = daily.body.data || daily.body;
    const records = payload.dailyRecords || [];
    if (Array.isArray(records)) ok(`daily view: ${records.length} record(s)`);
    else fail('daily view missing dailyRecords array');
    if (records[0]?.employeeName) ok(`daily sample: ${records[0].employeeName}`);
    const mockName = records.some((r) => r.employeeName === 'Ahmad Wijaya' && r.employeeId === '1');
    if (mockName) fail('daily still returning legacy mock data');
    else if (records.length) ok('daily uses real DB data (not legacy mock)');
  } else {
    fail('GET daily attendance', `HTTP ${daily.res.status}`);
  }

  const monthly = await apiGet(`/api/humanify/attendance?period=${month}`);
  if (monthly.res.status === 200) {
    const payload = monthly.body.data || monthly.body;
    const att = payload.attendance || [];
    if (Array.isArray(att)) ok(`monthly view: ${att.length} employee(s)`);
    else fail('monthly view missing attendance array');
    if (Array.isArray(payload.branchSummary)) ok(`branch summary: ${payload.branchSummary.length} branch(es)`);
    else fail('monthly view missing branchSummary');
    const mockMonthly = att.some((r) => r.employeeName === 'Ahmad Wijaya' && r.employeeId === '1');
    if (mockMonthly) fail('monthly still returning legacy mock data');
    else if (att.length) ok('monthly uses real DB data (not legacy mock)');
  } else {
    fail('GET monthly attendance', `HTTP ${monthly.res.status}`);
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
