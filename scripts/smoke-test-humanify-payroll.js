#!/usr/bin/env node
/**
 * Humanify Payroll — comprehensive smoke & regression test
 * Usage: SMOKE_BASE_URL=http://localhost:3010 node scripts/smoke-test-humanify-payroll.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

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

const today = new Date();
const periodStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
const month = periodStart.slice(0, 7);

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

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 200) }; }
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
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 200) }; }
  return { res, json, text };
}

function expectPage(path, { res }) {
  if ([200, 307, 308].includes(res.status)) ok(`page ${path}`);
  else fail(`page ${path}`, `HTTP ${res.status}`);
}

function expectApi(name, { res, json }, statuses = [200]) {
  if (!statuses.includes(res.status)) {
    fail(name, `HTTP ${res.status}${json.error ? ': ' + json.error : ''}`);
    return false;
  }
  if (json.success === false) {
    fail(name, json.error || 'success=false');
    return false;
  }
  ok(name);
  return true;
}

function expectCsv(name, { res, text }) {
  if (res.status !== 200) {
    fail(name, `HTTP ${res.status}`);
    return false;
  }
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('csv') && !text.startsWith('\uFEFF') && !text.includes(',')) {
    fail(name, 'not CSV response');
    return false;
  }
  ok(name);
  return true;
}

const PAGES = [
  '/humanify/payroll',
  '/humanify/payroll/main',
  '/humanify/payroll/slip-gaji',
  '/humanify/payroll/thr',
  '/humanify/payroll/pph21',
  '/humanify/payroll/bpjs',
  '/humanify/payroll/laporan',
  '/humanify/payroll/lembur',
];

const API_READS = [
  ['overview', '/api/humanify/payroll'],
  ['components', '/api/humanify/payroll?action=components'],
  ['runs', '/api/humanify/payroll?action=runs'],
  ['salaries', '/api/humanify/payroll?action=employee-salaries'],
  ['payslip', '/api/humanify/payroll?action=payslip'],
  ['thr', `/api/humanify/payroll?action=thr&year=${today.getFullYear()}`],
  ['bpjs', '/api/humanify/payroll?action=bpjs'],
  ['pph21', '/api/humanify/payroll?action=pph21'],
  ['lembur', `/api/humanify/payroll?action=lembur&period=${month}`],
  ['laporan', '/api/humanify/payroll?action=laporan'],
  ['attendance-summary', `/api/humanify/payroll?action=attendance-summary&periodStart=${periodStart}&periodEnd=${periodEnd}`],
  ['bulk employees', '/api/humanify/payroll-bulk?action=employees'],
];

const EXPORTS = [
  ['export payslip CSV', `/api/humanify/payroll?action=export&type=payslip`],
  ['export thr CSV', `/api/humanify/payroll?action=export&type=thr&year=${today.getFullYear()}`],
  ['export bpjs CSV', '/api/humanify/payroll?action=export&type=bpjs'],
  ['export pph21 CSV', '/api/humanify/payroll?action=export&type=pph21'],
  ['export salaries CSV', '/api/humanify/payroll?action=export&type=salaries'],
  ['template CSV', '/api/humanify/payroll-bulk?action=template-csv'],
  ['template Excel', '/api/humanify/payroll-bulk?action=template-excel'],
];

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Humanify Payroll Smoke & Regression Test');
  console.log('═══════════════════════════════════════════');
  console.log('Target:', BASE);

  try {
    await login();
  } catch (e) {
    fail('login', e.message);
    process.exit(1);
  }

  console.log('\n══ Payroll Pages ══');
  for (const p of PAGES) expectPage(p, await get(p));

  console.log('\n══ Payroll API (GET) ══');
  for (const [name, path] of API_READS) {
    expectApi(name, await api('GET', path));
  }

  console.log('\n══ Export / Download ══');
  for (const [name, path] of EXPORTS) {
    const r = await get(path);
    if (path.includes('template-excel')) {
      if (r.res.status === 200) ok(name);
      else fail(name, `HTTP ${r.res.status}`);
    } else if (path.includes('export') || path.includes('template-csv')) {
      expectCsv(name, r);
    }
  }

  console.log('\n══ CRUD: Payroll Component ══');
  const stamp = Date.now();
  const compCode = `SMOKE_${stamp}`;
  const createComp = await api('POST', '/api/humanify/payroll?action=component', {
    code: compCode,
    name: `Smoke Test ${stamp}`,
    type: 'earning',
    category: 'fixed',
    calculationType: 'fixed',
    defaultAmount: 100000,
    isTaxable: false,
    isMandatory: false,
    isActive: true,
    sortOrder: 99,
  });
  const compId = createComp.json?.data?.id;
  if ([200, 201].includes(createComp.res.status)) {
    ok('POST component create');
    if (compId) {
      const updateComp = await api('PUT', '/api/humanify/payroll?action=component', {
        id: compId, name: `Smoke Updated ${stamp}`, defaultAmount: 150000,
      });
      if (updateComp.res.status === 200 && updateComp.json?.success !== false) ok('PUT component update');
      else fail('PUT component update', `HTTP ${updateComp.res.status}`);

      const delComp = await api('DELETE', `/api/humanify/payroll?action=component&id=${compId}`);
      if (delComp.res.status === 200 && delComp.json?.success !== false) ok('DELETE component');
      else fail('DELETE component', `HTTP ${delComp.res.status}`);
    }
  } else {
    fail('POST component create', `HTTP ${createComp.res.status} ${createComp.json?.error || ''}`);
  }

  console.log('\n══ CRUD: Payroll Run ══');
  const createRun = await api('POST', '/api/humanify/payroll?action=run', {
    periodStart, periodEnd, payDate: periodEnd,
    payType: 'monthly', name: `Smoke Run ${stamp}`,
  });
  const runId = createRun.json?.data?.id;
  if ([200, 201].includes(createRun.res.status) && runId) {
    ok('POST payroll run create');

    const calc = await api('POST', '/api/humanify/payroll?action=calculate', { runId });
    if (calc.res.status === 200 && calc.json?.success !== false) ok('POST payroll calculate');
    else fail('POST payroll calculate', calc.json?.error || `HTTP ${calc.res.status}`);

    const approve = await api('POST', '/api/humanify/payroll?action=approve', { runId });
    if (approve.res.status === 200 && approve.json?.success !== false) ok('POST payroll approve');
    else fail('POST payroll approve', approve.json?.error || `HTTP ${approve.res.status}`);

    const statusUp = await api('PUT', '/api/humanify/payroll?action=run-status', { runId, status: 'paid' });
    if (statusUp.res.status === 200 && statusUp.json?.success !== false) ok('PUT run status paid');
    else fail('PUT run status', statusUp.json?.error || `HTTP ${statusUp.res.status}`);

    const payslipRun = await api('GET', `/api/humanify/payroll?action=payslip&runId=${runId}`);
    if (payslipRun.res.status === 200) ok('GET payslip by runId');
    else fail('GET payslip by runId', `HTTP ${payslipRun.res.status}`);
  } else {
    fail('POST payroll run create', createRun.json?.error || `HTTP ${createRun.res.status}`);
  }

  console.log('\n══ Bulk Import API ══');
  const bulkSave = await api('POST', '/api/humanify/payroll-bulk?action=save', {
    rows: [{ employee_id_code: 'NONEXIST_EMP', pay_type: 'monthly', base_salary: 5000000, tax_status: 'TK/0' }],
  });
  if (bulkSave.res.status === 200) ok('POST bulk save (validation path)');
  else fail('POST bulk save', `HTTP ${bulkSave.res.status}`);

  console.log('\n═══════════════════════════════════════════');
  console.log(`Result: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log('  •', f));
  }
  console.log('═══════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
