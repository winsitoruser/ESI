#!/usr/bin/env node
/**
 * Kasbon integration smoke — create → approve → calculate includes CASH_ADV → approve decrements remaining
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-humanify-kasbon.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

const today = new Date();
const periodStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
  for (const pass of PASSWORDS) {
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
      body: new URLSearchParams({ csrfToken, email: EMAIL, password: pass, json: 'true' }),
      redirect: 'manual',
    });
    const cookies = (loginRes.headers.getSetCookie?.() || []).filter((c) => c.includes('next-auth')).map((c) => c.split(';')[0]);
    if (csrfCookie) cookies.push(csrfCookie);
    COOKIE = cookies.join('; ');
    const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
    if (session?.user?.email) return session;
  }
  throw new Error('login failed');
}

async function api(method, path, body) {
  const opts = { method, headers: { Cookie: COOKIE } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function parseLines(row, key) {
  let v = row?.[key];
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch { v = []; }
  }
  if (Array.isArray(v)) return v;
  let comps = row?.components;
  if (typeof comps === 'string') {
    try { comps = JSON.parse(comps); } catch { comps = {}; }
  }
  return comps?.[key] || [];
}

async function main() {
  console.log('Kasbon integration smoke');
  console.log('Target:', BASE);
  await login();
  ok('login');

  const stamp = Date.now().toString(36);
  const KASBON = 1_200_000;
  const MONTHS = 2;
  const INSTALL = Math.round(KASBON / MONTHS);

  const emp = await api('POST', '/api/humanify/employees', {
    name: `Kasbon Emp ${stamp}`,
    email: `kasbon-${stamp}@contoh.test`,
    position: 'Staff',
    department: 'Finance',
  });
  const empId = emp.json?.data?.id;
  if (!empId) {
    fail('create employee', JSON.stringify(emp.json).slice(0, 160));
    process.exit(1);
  }
  ok(`employee ${empId}`);

  await api('POST', '/api/humanify/payroll?action=employee-salary', {
    employeeId: empId,
    baseSalary: 8_000_000,
    payType: 'monthly',
    taxStatus: 'TK/0',
  });
  ok('salary upsert');

  const create = await api('POST', '/api/humanify/payroll-inputs', {
    type: 'cash_advance',
    employeeId: empId,
    employeeName: `Kasbon Emp ${stamp}`,
    department: 'Finance',
    amount: KASBON,
    remainingAmount: KASBON,
    installmentMonths: MONTHS,
    installmentAmount: INSTALL,
    reason: `Smoke kasbon ${stamp}`,
    category: 'emergency',
    status: 'pending',
  });
  const inputId = create.json?.data?.id;
  if (!inputId) {
    fail('create kasbon', create.json?.error || `HTTP ${create.status}`);
    process.exit(1);
  }
  ok(`kasbon pending ${inputId}`);

  const approve = await api('PUT', `/api/humanify/payroll-inputs?id=${inputId}`, { status: 'approved' });
  if (approve.json?.success === false) fail('approve kasbon', approve.json?.error);
  else ok(`kasbon status=${approve.json?.data?.status}`);

  const summary = await api('GET', '/api/humanify/payroll-inputs?action=summary');
  if (summary.json?.data?.cashAdvance != null) ok('summary cashAdvance present');
  else fail('summary');

  const run = await api('POST', '/api/humanify/payroll?action=run', {
    periodStart,
    periodEnd,
    payDate: periodEnd,
    payType: 'monthly',
    name: `Kasbon Run ${stamp}`,
  });
  const runId = run.json?.data?.id;
  if (!runId) {
    fail('create run', run.json?.error);
    process.exit(1);
  }
  ok(`run ${runId}`);

  const calc = await api('POST', '/api/humanify/payroll?action=calculate', { runId });
  if (calc.status !== 200 || calc.json?.success === false) {
    fail('calculate', calc.json?.error || `HTTP ${calc.status}`);
  } else ok('calculate');

  const slips = await api('GET', `/api/humanify/payroll?action=payslip&runId=${runId}`);
  const rows = slips.json?.data || slips.json?.payslips || [];
  const list = Array.isArray(rows) ? rows : (rows.items || []);
  const mine = list.find((r) => String(r.employee_id || r.employeeId) === String(empId));
  if (!mine) {
    fail('payslip row missing');
  } else {
    const deductions = parseLines(mine, 'deductions');
    const cashLine = deductions.find((d) => d.code === 'CASH_ADV' || String(d.inputId) === String(inputId));
    if (cashLine && Math.abs(Number(cashLine.amount) - INSTALL) <= 1) {
      ok(`CASH_ADV deduction = ${cashLine.amount}`);
    } else {
      fail('CASH_ADV line', JSON.stringify(deductions).slice(0, 200));
    }
  }

  const appr = await api('POST', '/api/humanify/payroll?action=approve', { runId });
  if (appr.json?.success === false && appr.status >= 400) {
    fail('approve run', appr.json?.error || `HTTP ${appr.status}`);
  } else ok('approve run');

  const after = await api('GET', `/api/humanify/payroll-inputs?type=cash_advance`);
  const row = (after.json?.data || []).find((r) => r.id === inputId);
  if (!row) fail('reload kasbon');
  else {
    const rem = Number(row.remainingAmount ?? row.remaining_amount);
    const expected = KASBON - INSTALL;
    if (Math.abs(rem - expected) <= 1) ok(`remaining after approve = ${rem}`);
    else fail('remaining', `got ${rem} expected ${expected} status=${row.status}`);
  }

  const page = await fetch(`${BASE}/humanify/payroll/cash-advance`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
  if ([200, 307, 308].includes(page.status)) ok('kasbon page');
  else fail('kasbon page', `HTTP ${page.status}`);

  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
