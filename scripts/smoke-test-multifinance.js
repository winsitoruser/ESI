#!/usr/bin/env node
/**
 * Smoke test: Multifinance mobile + HQ integration
 * Run: npm run smoke:multifinance
 * Requires: dev server on :3010, migrations + db:mf-demo-seed
 */
require('dotenv').config();

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@bedagang.com';
const PASSWORD = process.env.SMOKE_PASSWORD || 'MasterAdmin2026!';

let COOKIE = '';
let passed = 0;
let failed = 0;
let activityId = null;
let employeeId = null;

const ok = (msg) => { console.log('  ✓', msg); passed++; };
const fail = (msg, detail) => { console.log('  ✗', msg, detail ? `- ${detail}` : ''); failed++; };

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || [])
    .find((c) => c.includes('next-auth.csrf-token'))?.split(';')[0] || '';

  const tryPasswords = [PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter((p, i, a) => a.indexOf(p) === i);

  for (const pass of tryPasswords) {
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
      ok(`authenticated as ${session.user.email}`);
      return;
    }
  }
  throw new Error('Login failed');
}

async function apiGet(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE } });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function apiPost(path, data) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function main() {
  console.log('Smoke test: Multifinance Integration\n');
  console.log('Target:', BASE, '\n');

  try {
    await login();
  } catch (e) {
    fail('login', e.message);
    process.exit(1);
  }

  // ── Employee mobile API ──
  console.log('\n[Employee Mobile API]');

  const prof = await apiGet('/api/employee/multifinance?action=profile');
  if (prof.res.status === 200 && prof.body.success) {
    ok('GET employee/multifinance profile');
    if (prof.body.data?.isMfAgent) ok('isMfAgent=true');
    else fail('isMfAgent', 'false — run npm run db:mf-demo-seed');
    employeeId = prof.body.data?.employeeId;
    if (prof.body.data?.employeeName) ok(`employeeName: ${prof.body.data.employeeName}`);
  } else fail('GET profile', `HTTP ${prof.res.status}`);

  const dashProf = await apiGet('/api/employee/dashboard?action=profile');
  if (dashProf.body.success && dashProf.body.data?.isMfAgent !== undefined) {
    ok('dashboard profile includes isMfAgent');
  } else {
    fail('dashboard profile missing isMfAgent flag');
  }

  const ov = await apiGet('/api/employee/multifinance?action=overview');
  if (ov.res.status === 200 && ov.body.success && ov.body.data) {
    ok(`overview: ${ov.body.data.todayActivities ?? 0} aktivitas hari ini`);
  } else fail('GET overview');

  const port = await apiGet('/api/employee/multifinance?action=portfolio');
  if (port.res.status === 200 && Array.isArray(port.body.data)) {
    ok(`portfolio: ${port.body.data.length} kontrak`);
    if (port.body.data.length > 0) ok(`sample contract: ${port.body.data[0].contract_number}`);
    else fail('portfolio empty', 'run db:mf-portfolio-migrate');
  } else fail('GET portfolio');

  const today = new Date().toISOString().split('T')[0];
  const contract = port.body.data?.[0];

  const postAct = await apiPost('/api/employee/multifinance?action=activity', {
    activityDate: today,
    activityType: 'collection',
    productType: contract?.product_type || 'motor',
    customerName: contract?.customer_name || 'Smoke Test Nasabah',
    contractNumber: contract?.contract_number || 'MF-SMOKE-001',
    installmentAmount: contract?.installment_amount || 500000,
    amountCollected: 500000,
    dpdDays: contract?.dpd_days || 0,
    visitOutcome: 'paid_full',
    gpsLat: -6.2088,
    gpsLng: 106.8456,
    notes: 'Smoke test aktivitas mobile',
  });

  if (postAct.res.status === 200 && postAct.body.success) {
    ok('POST activity (mobile + GPS)');
    activityId = postAct.body.data?.id;
    if (postAct.body.data?.commission_amount > 0) ok(`commission calculated: Rp ${postAct.body.data.commission_amount}`);
  } else {
    fail('POST activity', postAct.body.error || `HTTP ${postAct.res.status}`);
  }

  const acts = await apiGet(`/api/employee/multifinance?action=activities&date_from=${today}&date_to=${today}`);
  if (acts.body.success && Array.isArray(acts.body.data) && acts.body.data.length > 0) {
    ok(`activities today: ${acts.body.data.length}`);
  } else fail('activities not listed after POST');

  // ── HQ API ──
  console.log('\n[HQ Backoffice API]');

  const hqOv = await apiGet('/api/hq/multifinance/workforce?action=overview');
  if (hqOv.res.status === 200 && hqOv.body.success) ok('HQ overview');
  else fail('HQ overview', `HTTP ${hqOv.res.status}`);

  const hqPort = await apiGet('/api/hq/multifinance/workforce?action=portfolio');
  if (hqPort.body.success && Array.isArray(hqPort.body.data)) {
    ok(`HQ portfolio: ${hqPort.body.data.length} kontrak`);
  } else fail('HQ portfolio');

  const hqActs = await apiGet('/api/hq/multifinance/workforce?action=activities');
  if (hqActs.body.success) {
    const pending = (hqActs.body.data || []).filter((a) => a.status === 'pending');
    ok(`HQ activities: ${hqActs.body.data?.length || 0} (${pending.length} pending)`);
  } else fail('HQ activities');

  if (activityId) {
    const verify = await apiPost('/api/hq/multifinance/workforce?action=verify-activity', { id: activityId, status: 'verified' });
    if (verify.body.success) ok('HQ verify-activity → commission created');
    else fail('verify-activity', verify.body.error);

    const hqComm = await apiGet(`/api/hq/multifinance/workforce?action=commissions&period_month=${today.slice(0, 7)}`);
    if (hqComm.body.success && (hqComm.body.data || []).length > 0) ok('commission record exists after verify');
    else fail('commission missing after verify');
  }

  // ── Pages reachable ──
  console.log('\n[Pages]');
  for (const path of ['/employee', '/hq/multifinance/workforce']) {
    const page = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
    if (page.status === 200) ok(`GET ${path} → 200`);
    else fail(`GET ${path}`, `HTTP ${page.status}`);
  }

  console.log('\n─────────────────────────────');
  console.log(`Result: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
